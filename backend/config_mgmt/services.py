from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django_fsm import TransitionNotAllowed
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from edms_api.models import (
    Baseline,
    BaselineItem,
    ChangeNotice,
    ChangeRequest,
    Document,
    PlBomLine,
    PlDocumentLink,
    PlItem,
    SupervisorDocumentReview,
)
from shared.permissions import PermissionService
from shared.services import AuditService, EventService


def _run_transition(instance, transition_name: str):
    try:
        getattr(instance, transition_name)()
    except TransitionNotAllowed as exc:
        raise ValidationError(
            {'status': f'Action "{transition_name}" is not allowed while the object is in state "{instance.status}".'}
        ) from exc


class PlItemService:
    @staticmethod
    def queryset(params, user=None):
        queryset = PermissionService.scope_queryset(
            PlItem.objects.all().select_related('current_released_baseline').prefetch_related('document_links__document', 'bom_parents'),
            user,
            'view_plitem',
        )
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(uvam_item_id__icontains=search)
                | Q(eligibility_criteria__icontains=search)
                | Q(procurement_conditions__icontains=search)
                | Q(design_supervisor__icontains=search)
                | Q(concerned_supervisor__icontains=search)
            )
        return queryset.order_by('id')

    @staticmethod
    def linked_documents(pl_item):
        return pl_item.document_links.select_related('document').all()

    @staticmethod
    @transaction.atomic
    def set_documents(pl_item, document_ids, request):
        PermissionService.require_permission(request.user, pl_item, 'change_plitem')
        valid_documents = {document.id: document for document in Document.objects.filter(id__in=document_ids)}
        missing_ids = [doc_id for doc_id in document_ids if doc_id not in valid_documents]
        if missing_ids:
            raise ValidationError({'document_ids': [f'Documents not found: {", ".join(missing_ids)}']})

        current_ids = set(pl_item.document_links.values_list('document_id', flat=True))
        target_ids = set(document_ids)

        for doc_id in current_ids - target_ids:
            PlDocumentLink.objects.filter(pl_item=pl_item, document_id=doc_id).delete()
            if not PlDocumentLink.objects.filter(document_id=doc_id).exists():
                Document.objects.filter(id=doc_id).update(linked_pl=None)

        for doc_id in target_ids - current_ids:
            document = valid_documents[doc_id]
            PlDocumentLink.objects.create(
                pl_item=pl_item,
                document=document,
                link_role='TECHNICAL_EVALUATION'
                if (document.category or '').upper() == 'TECHNICAL_EVALUATION'
                else 'GENERAL',
            )
            document.linked_pl = pl_item.id
            document.save(update_fields=['linked_pl'])
            SupervisorDocumentReviewService.create_or_refresh_for_link(
                pl_item,
                document,
                requested_by=request.user,
            )

        AuditService.log('UPDATE', 'Document', user=request.user, entity=pl_item.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'PlLinkedToDocument',
            'PlItem',
            pl_item.id,
            {'document_ids': document_ids},
            idempotency_key=f'pl-documents-set:{pl_item.id}:{",".join(sorted(target_ids))}',
        )
        return pl_item

    @staticmethod
    @transaction.atomic
    def link_document(pl_item, document_id, link_role, notes, request):
        PermissionService.require_permission(request.user, pl_item, 'change_plitem')
        document = Document.objects.get(id=document_id)
        link, created = PlDocumentLink.objects.get_or_create(
            pl_item=pl_item,
            document=document,
            defaults={'link_role': link_role or 'GENERAL', 'notes': notes or ''},
        )
        if not created:
            link.link_role = link_role or link.link_role
            link.notes = notes if notes is not None else link.notes
            link.save(update_fields=['link_role', 'notes', 'updated_at'])
        PermissionService.grant_default_object_permissions(link, request.user, actions=('view', 'change', 'delete'))
        document.linked_pl = pl_item.id
        document.save(update_fields=['linked_pl'])
        SupervisorDocumentReviewService.create_or_refresh_for_link(
            pl_item,
            document,
            requested_by=request.user,
        )
        AuditService.log('UPDATE', 'Document', user=request.user, entity=pl_item.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'PlLinkedToDocument',
            'PlItem',
            pl_item.id,
            {'document_id': document_id, 'link_role': link.link_role},
            idempotency_key=f'pl-document-link:{pl_item.id}:{document_id}',
        )
        return link

    @staticmethod
    @transaction.atomic
    def unlink_document(link, request):
        PermissionService.require_permission(request.user, link.pl_item, 'change_plitem')
        pl_item_id = link.pl_item_id
        document_id = link.document_id
        link.delete()
        if not PlDocumentLink.objects.filter(document_id=document_id).exists():
            Document.objects.filter(id=document_id).update(linked_pl=None)
        AuditService.log('UPDATE', 'Document', user=request.user, entity=pl_item_id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'PlLinkedToDocument',
            'PlItem',
            pl_item_id,
            {'document_id': document_id, 'action': 'unlink'},
            idempotency_key=f'pl-document-unlink:{pl_item_id}:{document_id}',
        )

    @staticmethod
    def bom_tree(pl_item, max_depth):
        def build_tree(parent, depth, visited):
            if depth > max_depth or parent.id in visited:
                return []
            next_visited = set(visited)
            next_visited.add(parent.id)
            lines = (
                PlBomLine.objects.filter(parent=parent)
                .select_related('child')
                .order_by('line_order', 'find_number', 'id')
            )
            return [
                {
                    'id': str(line.id),
                    'parent': line.parent_id,
                    'child': line.child_id,
                    'child_name': line.child.name,
                    'quantity': str(line.quantity),
                    'unit_of_measure': line.unit_of_measure,
                    'find_number': line.find_number,
                    'line_order': line.line_order,
                    'reference_designator': line.reference_designator,
                    'remarks': line.remarks,
                    'children': build_tree(line.child, depth + 1, next_visited),
                }
                for line in lines
            ]

        return {'pl_item': pl_item.id, 'max_depth': max_depth, 'children': build_tree(pl_item, 1, set())}

    @staticmethod
    def where_used(pl_item):
        parents = PlBomLine.objects.filter(child=pl_item).select_related('parent').order_by('parent__id', 'line_order')
        return [
            {
                'parent_pl': line.parent_id,
                'parent_name': line.parent.name,
                'quantity': str(line.quantity),
                'find_number': line.find_number,
                'unit_of_measure': line.unit_of_measure,
            }
            for line in parents
        ]

    @staticmethod
    def baselines(pl_item):
        return (
            pl_item.baselines.select_related(
                'created_by',
                'released_by',
                'source_change_request',
                'source_change_notice',
            )
            .prefetch_related('items__document', 'items__parent_pl', 'items__child_pl')
            .all()
        )


class BomService:
    @staticmethod
    def _pl_payload(pl_item):
        return {
            'signature': f'PL:{pl_item.id}',
            'item_type': 'PL_ITEM',
            'source_object_id': str(pl_item.id),
            'pl_number': pl_item.id,
            'pl_name': pl_item.name,
            'status': pl_item.status,
            'category': pl_item.category or '',
            'vendor_type': pl_item.vendor_type or '',
            'uvam_item_id': pl_item.uvam_item_id or '',
            'design_supervisor': pl_item.design_supervisor or '',
            'concerned_supervisor': pl_item.concerned_supervisor or '',
        }

    @staticmethod
    def _bom_line_payload(line):
        return {
            'signature': f"BOM:{line.parent_id}:{line.find_number}:{line.child_id}:{line.line_order}",
            'item_type': 'BOM_LINE',
            'source_object_id': str(line.id),
            'parent_pl': line.parent_id,
            'child_pl': line.child_id,
            'quantity': str(line.quantity),
            'unit_of_measure': line.unit_of_measure,
            'find_number': line.find_number,
            'line_order': line.line_order,
            'reference_designator': line.reference_designator or '',
            'remarks': line.remarks or '',
        }

    @staticmethod
    def _document_payload(link):
        document = link.document
        return {
            'signature': f"DOC:{document.id}:{link.link_role}",
            'item_type': 'DOCUMENT',
            'source_object_id': str(link.id),
            'document': document.id,
            'document_revision': document.revision,
            'document_status': document.status,
            'link_role': link.link_role,
            'document_name': document.name,
            'document_category': document.category or '',
            'reference_designator': '',
            'remarks': link.notes or '',
        }

    @staticmethod
    def current_snapshot(pl_item):
        pl_payload = BomService._pl_payload(pl_item)
        bom_lines = [
            BomService._bom_line_payload(line)
            for line in PlBomLine.objects.filter(parent=pl_item).select_related('parent', 'child').order_by('line_order', 'find_number', 'id')
        ]
        documents = [
            BomService._document_payload(link)
            for link in pl_item.document_links.select_related('document').order_by('linked_at', 'id')
        ]
        return [pl_payload] + bom_lines + documents

    @staticmethod
    def create(serializer, request):
        parent = serializer.validated_data.get('parent')
        if parent is not None:
            PermissionService.require_permission(request.user, parent, 'change_plitem')
        try:
            line = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        PermissionService.grant_default_object_permissions(line, request.user)
        AuditService.log('CREATE', 'ConfigMgmt', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number},
            idempotency_key=f'bom-create:{line.id}',
        )
        return line

    @staticmethod
    def update(serializer, request):
        PermissionService.require_permission(request.user, serializer.instance.parent, 'change_plitem')
        try:
            line = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number},
            idempotency_key=f'bom-update:{line.id}:{line.updated_at.isoformat()}',
        )
        return line

    @staticmethod
    def add(parent, child, *, quantity=1, unit_of_measure='EA', find_number, line_order=0, reference_designator=None, remarks=None, request=None):
        if request is not None:
            PermissionService.require_permission(request.user, parent, 'change_plitem')
        line = PlBomLine(
            parent=parent,
            child=child,
            quantity=quantity,
            unit_of_measure=unit_of_measure,
            find_number=find_number,
            line_order=line_order,
            reference_designator=reference_designator,
            remarks=remarks,
        )
        try:
            line.full_clean()
            line.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        if request is not None:
            PermissionService.grant_default_object_permissions(line, request.user)
        if request is not None:
            AuditService.log('CREATE', 'ConfigMgmt', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            BomService._bom_line_payload(line),
            idempotency_key=f'bom-add:{line.id}',
        )
        return line

    @staticmethod
    def replace(line, *, child=None, quantity=None, unit_of_measure=None, reference_designator=None, remarks=None, request=None):
        if request is not None:
            PermissionService.require_permission(request.user, line.parent, 'change_plitem')
        if child is not None:
            line.child = child
        if quantity is not None:
            line.quantity = quantity
        if unit_of_measure is not None:
            line.unit_of_measure = unit_of_measure
        if reference_designator is not None:
            line.reference_designator = reference_designator
        if remarks is not None:
            line.remarks = remarks
        try:
            line.full_clean()
            line.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        if request is not None:
            AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'action': 'replace', **BomService._bom_line_payload(line)},
            idempotency_key=f'bom-replace:{line.id}:{line.updated_at.isoformat()}',
        )
        return line

    @staticmethod
    @transaction.atomic
    def reorder(parent, ordered_items, request=None):
        if request is not None:
            PermissionService.require_permission(request.user, parent, 'change_plitem')
        updated_lines = []
        for item in ordered_items:
            line = PlBomLine.objects.select_for_update().get(parent=parent, id=item['id'])
            if 'line_order' in item:
                line.line_order = item['line_order']
            if 'find_number' in item:
                line.find_number = item['find_number']
            try:
                line.full_clean()
                line.save()
            except DjangoValidationError as exc:
                raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
            updated_lines.append(line)
        if request is not None:
            AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(parent.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlItem',
            parent.id,
            {'action': 'reorder', 'line_ids': [str(line.id) for line in updated_lines]},
            idempotency_key=f'bom-reorder:{parent.id}:{timezone.now().isoformat()}',
        )
        return updated_lines

    @staticmethod
    def delete(line, request):
        PermissionService.require_permission(request.user, line.parent, 'change_plitem')
        payload = BomService._bom_line_payload(line)
        line_id = line.id
        line.delete()
        AuditService.log('DELETE', 'ConfigMgmt', user=request.user, entity=str(line_id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line_id,
            payload | {'action': 'delete'},
            idempotency_key=f'bom-delete:{line_id}',
        )

    @staticmethod
    @transaction.atomic
    def move(line, *, parent=None, line_order=None, find_number=None, request=None):
        if request is not None:
            PermissionService.require_permission(request.user, line.parent, 'change_plitem')
            if parent:
                target_parent = PlItem.objects.get(pk=parent)
                PermissionService.require_permission(request.user, target_parent, 'change_plitem')
        if parent:
            line.parent_id = parent
        if line_order is not None:
            line.line_order = line_order
        if find_number:
            line.find_number = find_number
        try:
            line.full_clean()
            line.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        if request is not None:
            AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number, 'action': 'move'},
            idempotency_key=f'bom-move:{line.id}:{line.updated_at.isoformat()}',
        )
        return line

    @staticmethod
    def compare_baselines(left_baseline, right_baseline):
        return BaselineService.compare(left_baseline, right_baseline)

    @staticmethod
    def impact_preview(pl_item, payload=None, request=None):
        return BaselineService.preview_impact(pl_item, payload or {}, request=request)


class BaselineService:
    @staticmethod
    def snapshot_for_compare(baseline):
        return [
            item.snapshot_payload
            for item in baseline.items.all().order_by('line_order', 'created_at', 'id')
        ]

    @staticmethod
    def current_state_snapshot(pl_item):
        return BomService.current_snapshot(pl_item)

    @staticmethod
    def compare_snapshots(left_items, right_items):
        def by_signature(items):
            mapping = {}
            for item in items:
                mapping[item['signature']] = item
            return mapping

        left_map = by_signature(left_items)
        right_map = by_signature(right_items)
        left_keys = set(left_map)
        right_keys = set(right_map)
        common = left_keys & right_keys

        added = [right_map[key] for key in sorted(right_keys - left_keys)]
        removed = [left_map[key] for key in sorted(left_keys - right_keys)]
        changed = [
            {
                'before': left_map[key],
                'after': right_map[key],
            }
            for key in sorted(common)
            if left_map[key] != right_map[key]
        ]
        unchanged = [right_map[key] for key in sorted(common) if left_map[key] == right_map[key]]

        return {
            'summary': {
                'added': len(added),
                'removed': len(removed),
                'changed': len(changed),
                'unchanged': len(unchanged),
            },
            'added': added,
            'removed': removed,
            'changed': changed,
            'unchanged': unchanged,
        }

    @classmethod
    def preview_impact(cls, pl_item, payload=None, request=None):
        payload = payload or {}
        reference_baseline = None
        if payload.get('baseline'):
            reference_baseline = Baseline.objects.filter(pl_item=pl_item, id=payload['baseline']).first()
        if reference_baseline is None:
            reference_baseline = (
                pl_item.current_released_baseline
                or pl_item.baselines.filter(status='RELEASED').order_by('-released_at', '-created_at').first()
            )

        current_snapshot = cls.current_state_snapshot(pl_item)
        if reference_baseline is None:
            result = {
                'reference_baseline': None,
                'summary': {
                    'added': len(current_snapshot),
                    'removed': 0,
                    'changed': 0,
                    'unchanged': 0,
                },
                'added': current_snapshot,
                'removed': [],
                'changed': [],
                'unchanged': [],
            }
        else:
            baseline_snapshot = cls.snapshot_for_compare(reference_baseline)
            result = cls.compare_snapshots(baseline_snapshot, current_snapshot)
            result['reference_baseline'] = reference_baseline.baseline_number

        if payload.get('child_replacement'):
            result['requested_change'] = {
                'parent': payload.get('parent'),
                'child': payload.get('child'),
                'child_replacement': payload.get('child_replacement'),
                'find_number': payload.get('find_number'),
                'line_order': payload.get('line_order'),
            }

        if request is not None:
            AuditService.log('VIEW', 'ConfigMgmt', user=request.user, entity=pl_item.id, details={'action': 'impact_preview'})
        return result

    @classmethod
    @transaction.atomic
    def create_baseline(cls, pl_item, *, request=None, title=None, summary=None, baseline_number=None, change_request=None, change_notice=None):
        if request is not None:
            PermissionService.require_permission(request.user, pl_item, 'change_plitem')
        baseline_code = baseline_number or f'{pl_item.id}-BL-{pl_item.baselines.count() + 1:03d}'
        baseline = Baseline.objects.create(
            pl_item=pl_item,
            baseline_number=baseline_code,
            title=title or f'{pl_item.name} baseline',
            summary=summary or '',
            source_change_request=change_request,
            source_change_notice=change_notice,
            created_by=getattr(request, 'user', None),
            impact_preview={},
        )
        PermissionService.grant_default_object_permissions(baseline, getattr(request, 'user', None))
        cls.capture_current_state(baseline, pl_item)
        return baseline

    @classmethod
    def capture_current_state(cls, baseline, pl_item):
        BaselineItem.objects.create(
            baseline=baseline,
            item_type='PL_ITEM',
            source_object_id=str(pl_item.id),
            line_order=0,
            snapshot_payload=BomService._pl_payload(pl_item),
        )
        item_order = 0
        for line in PlBomLine.objects.filter(parent=pl_item).select_related('parent', 'child').order_by('line_order', 'find_number', 'id'):
            item_order += 1
            BaselineItem.objects.create(
                baseline=baseline,
                item_type='BOM_LINE',
                source_object_id=str(line.id),
                parent_pl=line.parent,
                child_pl=line.child,
                quantity=line.quantity,
                unit_of_measure=line.unit_of_measure,
                find_number=line.find_number,
                line_order=line.line_order,
                reference_designator=line.reference_designator,
                remarks=line.remarks,
                snapshot_payload=BomService._bom_line_payload(line),
            )

        for link in pl_item.document_links.select_related('document').order_by('linked_at', 'id'):
            item_order += 1
            document = link.document
            BaselineItem.objects.create(
                baseline=baseline,
                item_type='DOCUMENT',
                source_object_id=str(link.id),
                document=document,
                document_revision=document.revision,
                document_status=document.status,
                link_role=link.link_role,
                line_order=item_order,
                remarks=link.notes,
                snapshot_payload=BomService._document_payload(link),
            )

        baseline.impact_preview = cls.preview_impact(pl_item, {'baseline': baseline.id})
        baseline.save(update_fields=['impact_preview', 'updated_at'])

    @classmethod
    @transaction.atomic
    def release(cls, pl_item, *, request=None, title=None, summary=None, baseline_number=None, change_request=None, change_notice=None):
        baseline = cls.create_baseline(
            pl_item,
            request=request,
            title=title,
            summary=summary,
            baseline_number=baseline_number,
            change_request=change_request,
            change_notice=change_notice,
        )
        _run_transition(baseline, 'release')
        baseline.released_by = getattr(request, 'user', None)
        baseline.released_at = timezone.now()
        baseline.save(update_fields=['status', 'released_by', 'released_at', 'impact_preview', 'updated_at'])

        previous_released = (
            pl_item.baselines.filter(status='RELEASED')
            .exclude(id=baseline.id)
            .order_by('-released_at', '-created_at')
            .first()
        )
        if previous_released:
            _run_transition(previous_released, 'supersede')
            previous_released.superseded_by = baseline
            previous_released.superseded_at = timezone.now()
            previous_released.save(update_fields=['status', 'superseded_by', 'superseded_at', 'updated_at'])

        pl_item.current_released_baseline = baseline
        pl_item.save(update_fields=['current_released_baseline', 'last_updated'])

        if change_request is not None:
            if change_request.status == 'DRAFT':
                _run_transition(change_request, 'submit')
            if change_request.status == 'UNDER_REVIEW':
                _run_transition(change_request, 'approve')
            if change_request.status == 'APPROVED':
                _run_transition(change_request, 'implement')
            change_request.reviewed_by = getattr(request, 'user', None)
            change_request.reviewed_at = timezone.now()
            change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

        if change_notice is not None:
            if change_notice.status == 'DRAFT':
                _run_transition(change_notice, 'issue')
            if change_notice.status == 'ISSUED':
                _run_transition(change_notice, 'approve')
            if change_notice.status == 'APPROVED':
                _run_transition(change_notice, 'release')
            change_notice.released_by = getattr(request, 'user', None)
            change_notice.released_at = timezone.now()
            change_notice.save(update_fields=['status', 'released_by', 'released_at', 'updated_at'])

        AuditService.log('CREATE', 'ConfigMgmt', user=getattr(request, 'user', None), entity=baseline.id, details={'action': 'release_baseline', 'pl_item': pl_item.id})
        EventService.publish(
            'BaselineReleased',
            'Baseline',
            baseline.id,
            {
                'pl_item': pl_item.id,
                'baseline_number': baseline.baseline_number,
                'change_request': change_request.id if change_request else None,
                'change_notice': change_notice.id if change_notice else None,
            },
            idempotency_key=f'baseline-release:{pl_item.id}:{baseline.baseline_number}',
        )
        return baseline

    @classmethod
    def compare(cls, left_baseline, right_baseline):
        return cls.compare_snapshots(cls.snapshot_for_compare(left_baseline), cls.snapshot_for_compare(right_baseline))

    @staticmethod
    def baseline_queryset(pl_item):
        return pl_item.baselines.select_related(
            'created_by',
            'released_by',
            'source_change_request',
            'source_change_notice',
            'superseded_by',
        ).prefetch_related('items__document', 'items__parent_pl', 'items__child_pl').all()


class ChangeRequestService:
    @staticmethod
    def queryset(user=None):
        return PermissionService.scope_queryset(
            ChangeRequest.objects.select_related('pl_item', 'requested_by', 'reviewed_by', 'source_baseline').all(),
            user,
            'view_changerequest',
        ).order_by('-requested_at')

    @staticmethod
    def available_actions(change_request, user):
        can_change = PermissionService.has_permission(user, change_request, 'change_changerequest')
        actions = [
            ('submit', 'Submit for review', change_request.status == 'DRAFT'),
            ('approve', 'Approve', change_request.status == 'UNDER_REVIEW'),
            ('reject', 'Reject', change_request.status == 'UNDER_REVIEW'),
            ('implement', 'Implement', change_request.status == 'APPROVED'),
        ]
        return [
            {
                'key': key,
                'label': label,
                'enabled': can_change and enabled,
                'reason': '' if can_change and enabled else ('Action is not valid for the current status.' if not enabled else 'Change permission required.'),
            }
            for key, label, enabled in actions
        ]

    @staticmethod
    @transaction.atomic
    def create(serializer, request):
        try:
            obj = serializer.save(requested_by=request.user)
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        PermissionService.grant_default_object_permissions(obj, request.user)
        AuditService.log('CREATE', 'ConfigMgmt', user=request.user, entity=str(obj.id), details={'action': 'change_request_create', 'pl_item': obj.pl_item_id})
        EventService.publish(
            'ChangeRequestCreated',
            'ChangeRequest',
            obj.id,
            {'pl_item': obj.pl_item_id, 'status': obj.status},
            idempotency_key=f'change-request-create:{obj.id}',
        )
        return obj

    @staticmethod
    @transaction.atomic
    def submit(change_request, request):
        PermissionService.require_permission(request.user, change_request, 'change_changerequest')
        change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
        _run_transition(change_request, 'submit')
        change_request.reviewed_by = request.user
        change_request.reviewed_at = timezone.now()
        change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(change_request.id), details={'action': 'change_request_submit'})
        EventService.publish(
            'ChangeRequestSubmitted',
            'ChangeRequest',
            change_request.id,
            {'pl_item': change_request.pl_item_id, 'status': change_request.status},
            idempotency_key=f'change-request-submit:{change_request.id}',
        )
        return change_request

    @staticmethod
    @transaction.atomic
    def approve(change_request, request, notes=''):
        PermissionService.require_permission(request.user, change_request, 'change_changerequest')
        change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
        _run_transition(change_request, 'approve')
        change_request.reviewed_by = request.user
        change_request.reviewed_at = timezone.now()
        change_request.decision_notes = notes or ''
        change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'decision_notes', 'updated_at'])
        AuditService.log('APPROVE', 'ConfigMgmt', user=request.user, entity=str(change_request.id), details={'action': 'change_request_approve'})
        EventService.publish(
            'ChangeRequestApproved',
            'ChangeRequest',
            change_request.id,
            {'pl_item': change_request.pl_item_id, 'status': change_request.status},
            idempotency_key=f'change-request-approve:{change_request.id}',
        )
        return change_request

    @staticmethod
    @transaction.atomic
    def reject(change_request, request, notes=''):
        PermissionService.require_permission(request.user, change_request, 'change_changerequest')
        change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
        _run_transition(change_request, 'reject')
        change_request.reviewed_by = request.user
        change_request.reviewed_at = timezone.now()
        change_request.decision_notes = notes or ''
        change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'decision_notes', 'updated_at'])
        AuditService.log('REJECT', 'ConfigMgmt', user=request.user, entity=str(change_request.id), details={'action': 'change_request_reject'})
        EventService.publish(
            'ChangeRequestRejected',
            'ChangeRequest',
            change_request.id,
            {'pl_item': change_request.pl_item_id, 'status': change_request.status},
            idempotency_key=f'change-request-reject:{change_request.id}',
        )
        return change_request

    @staticmethod
    @transaction.atomic
    def implement(change_request, request):
        PermissionService.require_permission(request.user, change_request, 'change_changerequest')
        change_request = ChangeRequest.objects.select_for_update().get(pk=change_request.pk)
        _run_transition(change_request, 'implement')
        change_request.reviewed_by = request.user
        change_request.reviewed_at = timezone.now()
        change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(change_request.id), details={'action': 'change_request_implement'})
        EventService.publish(
            'ChangeRequestImplemented',
            'ChangeRequest',
            change_request.id,
            {'pl_item': change_request.pl_item_id, 'status': change_request.status},
            idempotency_key=f'change-request-implement:{change_request.id}',
        )
        return change_request


class ChangeNoticeService:
    @staticmethod
    def queryset(user=None):
        return PermissionService.scope_queryset(
            ChangeNotice.objects.select_related('change_request', 'issued_by', 'approved_by', 'released_by', 'closed_by').all(),
            user,
            'view_changenotice',
        ).order_by('-created_at')

    @staticmethod
    def available_actions(change_notice, user):
        can_change = PermissionService.has_permission(user, change_notice, 'change_changenotice')
        actions = [
            ('approve', 'Approve', change_notice.status == 'ISSUED'),
            ('release', 'Release', change_notice.status == 'APPROVED'),
            ('close', 'Close', change_notice.status == 'RELEASED'),
        ]
        return [
            {
                'key': key,
                'label': label,
                'enabled': can_change and enabled,
                'reason': '' if can_change and enabled else ('Action is not valid for the current status.' if not enabled else 'Change permission required.'),
            }
            for key, label, enabled in actions
        ]

    @staticmethod
    @transaction.atomic
    def create(serializer, request):
        try:
            obj = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        PermissionService.grant_default_object_permissions(obj, request.user)
        AuditService.log('CREATE', 'ConfigMgmt', user=request.user, entity=str(obj.id), details={'action': 'change_notice_create', 'change_request': obj.change_request_id})
        EventService.publish(
            'ChangeNoticeCreated',
            'ChangeNotice',
            obj.id,
            {'change_request': obj.change_request_id, 'status': obj.status},
            idempotency_key=f'change-notice-create:{obj.id}',
        )
        return obj

    @staticmethod
    @transaction.atomic
    def approve(change_notice, request, notes=''):
        PermissionService.require_permission(request.user, change_notice, 'change_changenotice')
        change_notice = ChangeNotice.objects.select_for_update().get(pk=change_notice.pk)
        _run_transition(change_notice, 'approve')
        change_notice.approved_by = request.user
        change_notice.approved_at = timezone.now()
        change_notice.decision_notes = notes or ''
        change_notice.save(update_fields=['status', 'approved_by', 'approved_at', 'decision_notes', 'updated_at'])
        AuditService.log('APPROVE', 'ConfigMgmt', user=request.user, entity=str(change_notice.id), details={'action': 'change_notice_approve'})
        EventService.publish(
            'ChangeNoticeApproved',
            'ChangeNotice',
            change_notice.id,
            {'change_request': change_notice.change_request_id, 'status': change_notice.status},
            idempotency_key=f'change-notice-approve:{change_notice.id}',
        )
        return change_notice

    @staticmethod
    @transaction.atomic
    def release(change_notice, request, notes='', effectivity_date=None):
        PermissionService.require_permission(request.user, change_notice, 'change_changenotice')
        change_notice = ChangeNotice.objects.select_for_update().get(pk=change_notice.pk)
        _run_transition(change_notice, 'release')
        change_notice.released_by = request.user
        change_notice.released_at = timezone.now()
        if notes:
            change_notice.decision_notes = notes
        if effectivity_date is not None:
            change_notice.effectivity_date = effectivity_date
        change_notice.save(update_fields=['status', 'released_by', 'released_at', 'decision_notes', 'effectivity_date', 'updated_at'])
        AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(change_notice.id), details={'action': 'change_notice_release'})
        EventService.publish(
            'ChangeNoticeReleased',
            'ChangeNotice',
            change_notice.id,
            {'change_request': change_notice.change_request_id, 'status': change_notice.status},
            idempotency_key=f'change-notice-release:{change_notice.id}',
        )
        return change_notice

    @staticmethod
    @transaction.atomic
    def close(change_notice, request, notes=''):
        PermissionService.require_permission(request.user, change_notice, 'change_changenotice')
        change_notice = ChangeNotice.objects.select_for_update().get(pk=change_notice.pk)
        _run_transition(change_notice, 'close')
        change_notice.closed_by = request.user
        change_notice.closed_at = timezone.now()
        if notes:
            change_notice.decision_notes = notes
        change_notice.save(update_fields=['status', 'closed_by', 'closed_at', 'decision_notes', 'updated_at'])
        AuditService.log('UPDATE', 'ConfigMgmt', user=request.user, entity=str(change_notice.id), details={'action': 'change_notice_close'})
        EventService.publish(
            'ChangeNoticeClosed',
            'ChangeNotice',
            change_notice.id,
            {'change_request': change_notice.change_request_id, 'status': change_notice.status},
            idempotency_key=f'change-notice-close:{change_notice.id}',
        )
        return change_notice


class SupervisorDocumentReviewService:
    @staticmethod
    def normalize_family_key(document):
        approved_assertions = {
            assertion.field_key: assertion.normalized_value or assertion.value
            for assertion in document.metadata_assertions.filter(status='APPROVED')
        }
        drawing_number = (approved_assertions.get('drawing_number') or '').strip()
        if drawing_number:
            return f'drawing_numbers:{drawing_number}'
        document_number = (approved_assertions.get('document_number') or '').strip()
        if document_number:
            return f'document_numbers:{document_number}'
        linked_pl = (approved_assertions.get('linked_pl') or document.linked_pl or '').strip()
        if linked_pl:
            category = ((document.category or document.type or '')).strip().upper()
            if category:
                return f'pl:{linked_pl}:{category}'
            return f'pl:{linked_pl}'
        family_key = (getattr(document, 'document_family_key', '') or (document.search_metadata or {}).get('document_family_key') or '').strip()
        if family_key:
            return family_key
        return f"{(document.name or '').strip().lower()}::{(document.category or '').strip().lower()}"

    @staticmethod
    def _matches_design_supervisor(user, supervisor_name):
        normalized_supervisor = (supervisor_name or '').strip().lower()
        if not normalized_supervisor:
            return False

        candidates = [
            getattr(user, 'username', ''),
            user.get_full_name() if hasattr(user, 'get_full_name') else '',
            getattr(user, 'first_name', ''),
            getattr(user, 'last_name', ''),
            getattr(user, 'designation', ''),
            getattr(user, 'email', ''),
        ]
        normalized_candidates = [candidate.strip().lower() for candidate in candidates if candidate]
        return any(
            normalized_supervisor in candidate or candidate in normalized_supervisor
            for candidate in normalized_candidates
        )

    @staticmethod
    def _resolve_supervisor_users(supervisor_name):
        normalized_supervisor = (supervisor_name or '').strip()
        if not normalized_supervisor:
            return []
        queryset = User.objects.filter(
            Q(username__iexact=normalized_supervisor)
            | Q(email__iexact=normalized_supervisor)
        )
        if queryset.exists():
            return list(queryset)
        parts = normalized_supervisor.split()
        if len(parts) >= 2:
            queryset = User.objects.filter(
                first_name__iexact=parts[0],
                last_name__iexact=' '.join(parts[1:]),
            )
            if queryset.exists():
                return list(queryset)
        return []

    @staticmethod
    def visible_reviews_for_user(user):
        queryset = PermissionService.scope_queryset(
            SupervisorDocumentReview.objects.select_related(
                'pl_item',
                'latest_document',
                'previous_document',
                'requested_by',
                'resolved_by',
            ).all(),
            user,
            'view_supervisordocumentreview',
        )
        status_filter = getattr(user, 'is_authenticated', False)
        if not status_filter:
            return queryset.none()

        queryset = queryset.filter(status='PENDING')
        if user.is_superuser or user.is_staff:
            return queryset

        ids = [
            review.id
            for review in queryset
            if SupervisorDocumentReviewService._matches_design_supervisor(user, review.design_supervisor)
        ]
        return queryset.filter(id__in=ids)

    @staticmethod
    def available_actions(review, user):
        can_change = PermissionService.has_permission(user, review, 'change_supervisordocumentreview')
        can_review = can_change and (
            user.is_superuser
            or user.is_staff
            or SupervisorDocumentReviewService._matches_design_supervisor(user, review.design_supervisor)
        )
        pending = review.status == 'PENDING'
        return [
            {
                'key': 'approve',
                'label': 'Approve change',
                'enabled': can_review and pending,
                'reason': '' if can_review and pending else ('Review is already resolved.' if not pending else 'Supervisor review permission required.'),
            },
            {
                'key': 'bypass',
                'label': 'Bypass change',
                'enabled': can_review and pending,
                'reason': '' if can_review and pending else ('Review is already resolved.' if not pending else 'Supervisor review permission required.'),
            },
        ]

    @staticmethod
    @transaction.atomic
    def create_or_refresh_for_link(pl_item, latest_document, *, requested_by=None, previous_revision=None):
        if not pl_item.design_supervisor:
            return None

        family_key = SupervisorDocumentReviewService.normalize_family_key(latest_document)
        if not family_key or family_key == '::':
            return None

        candidate_documents = [
            link.document
            for link in pl_item.document_links.select_related('document').all()
            if link.document_id != latest_document.id
            and SupervisorDocumentReviewService.normalize_family_key(link.document) == family_key
        ]
        previous_document = None
        previous_document_revision = previous_revision
        if candidate_documents:
            previous_document = max(
                candidate_documents,
                key=lambda item: (item.revision, item.updated_at or item.created_at, item.id),
            )
            previous_document_revision = previous_document.revision

        if previous_document is None and previous_document_revision is None:
            return None

        if previous_document_revision is not None and latest_document.revision <= previous_document_revision:
            return None

        summary = (
            f"Review document {latest_document.name} rev {latest_document.revision} for PL {pl_item.id}. "
            f"Current linked revision is {previous_document_revision} on {(previous_document.id if previous_document else latest_document.id)}."
        )

        review, created = SupervisorDocumentReview.objects.update_or_create(
            pl_item=pl_item,
            latest_document=latest_document,
            latest_revision=latest_document.revision,
            status='PENDING',
            defaults={
                'previous_document': previous_document,
                'previous_revision': previous_document_revision,
                'document_family_key': family_key,
                'design_supervisor': pl_item.design_supervisor,
                'change_summary': summary,
                'requested_by': requested_by,
                'resolved_by': None,
                'resolution_notes': '',
                'bypass_reason': '',
                'resolved_at': None,
            },
        )
        PermissionService.grant_default_object_permissions(
            review,
            requested_by,
            *SupervisorDocumentReviewService._resolve_supervisor_users(pl_item.design_supervisor),
            actions=('view', 'change'),
        )

        AuditService.log(
            'REVIEW',
            'Approval',
            user=requested_by,
            entity=str(review.id),
            details={
                'pl_item': pl_item.id,
                'latest_document': latest_document.id,
                'latest_revision': latest_document.revision,
                'previous_document': previous_document.id if previous_document else latest_document.id,
                'previous_revision': previous_document_revision,
                'design_supervisor': pl_item.design_supervisor,
                'created': created,
            },
        )
        EventService.publish(
            'DocumentChangeReviewPending',
            'SupervisorDocumentReview',
            review.id,
            {
                'pl_item': pl_item.id,
                'latest_document': latest_document.id,
                'previous_document': previous_document.id if previous_document else latest_document.id,
                'design_supervisor': pl_item.design_supervisor,
            },
            idempotency_key=f'document-review-pending:{pl_item.id}:{latest_document.id}:{latest_document.revision}',
        )
        return review

    @staticmethod
    @transaction.atomic
    def approve(review, *, user, notes='', request=None):
        PermissionService.require_permission(user, review, 'change_supervisordocumentreview')
        if not (user.is_superuser or user.is_staff or SupervisorDocumentReviewService._matches_design_supervisor(user, review.design_supervisor)):
            raise ValidationError({'detail': 'Only the design supervisor can resolve this review.'})
        if review.status != 'PENDING':
            raise ValidationError({'status': 'Only pending reviews can be approved.'})
        review.status = 'APPROVED'
        review.resolved_by = user
        review.resolution_notes = notes or ''
        review.resolved_at = timezone.now()
        review.save(update_fields=['status', 'resolved_by', 'resolution_notes', 'resolved_at', 'updated_at'])

        latest_document = review.latest_document
        previous_document = review.previous_document

        latest_document.linked_pl = review.pl_item_id
        latest_document.save(update_fields=['linked_pl', 'updated_at'])
        PlDocumentLink.objects.get_or_create(
            pl_item=review.pl_item,
            document=latest_document,
            defaults={'link_role': 'GENERAL'},
        )

        if previous_document and previous_document.id != latest_document.id:
            previous_document.status = 'Obsolete'
            previous_document.save(update_fields=['status', 'updated_at'])

        AuditService.log(
            'APPROVE',
            'Approval',
            user=user,
            entity=str(review.id),
            details={
                'pl_item': review.pl_item_id,
                'latest_document': latest_document.id,
                'previous_document': previous_document.id if previous_document else None,
                'notes': notes or '',
            },
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )
        EventService.publish(
            'DesignSupervisorApprovedDocumentChange',
            'SupervisorDocumentReview',
            review.id,
            {
                'pl_item': review.pl_item_id,
                'latest_document': latest_document.id,
                'previous_document': previous_document.id if previous_document else None,
            },
            idempotency_key=f'document-review-approved:{review.id}',
        )
        return review

    @staticmethod
    @transaction.atomic
    def bypass(review, *, user, notes='', bypass_reason='', request=None):
        PermissionService.require_permission(user, review, 'change_supervisordocumentreview')
        if not (user.is_superuser or user.is_staff or SupervisorDocumentReviewService._matches_design_supervisor(user, review.design_supervisor)):
            raise ValidationError({'detail': 'Only the design supervisor can resolve this review.'})
        if review.status != 'PENDING':
            raise ValidationError({'status': 'Only pending reviews can be bypassed.'})
        review.status = 'BYPASSED'
        review.resolved_by = user
        review.resolution_notes = notes or ''
        review.bypass_reason = bypass_reason or notes or ''
        review.resolved_at = timezone.now()
        review.save(
            update_fields=[
                'status',
                'resolved_by',
                'resolution_notes',
                'bypass_reason',
                'resolved_at',
                'updated_at',
            ]
        )

        AuditService.log(
            'BYPASS',
            'Approval',
            user=user,
            entity=str(review.id),
            details={
                'pl_item': review.pl_item_id,
                'latest_document': review.latest_document_id,
                'previous_document': review.previous_document_id,
                'bypass_reason': review.bypass_reason,
                'notes': notes or '',
            },
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )
        EventService.publish(
            'DesignSupervisorBypassedDocumentChange',
            'SupervisorDocumentReview',
            review.id,
            {
                'pl_item': review.pl_item_id,
                'latest_document': review.latest_document_id,
                'previous_document': review.previous_document_id,
                'bypass_reason': review.bypass_reason,
            },
            idempotency_key=f'document-review-bypassed:{review.id}',
        )
        return review
