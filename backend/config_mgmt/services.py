from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from edms_api.models import Document, PlBomLine, PlDocumentLink, PlItem, SupervisorDocumentReview
from shared.services import AuditService, EventService


class PlItemService:
    @staticmethod
    def queryset(params):
        queryset = PlItem.objects.all().prefetch_related('document_links__document', 'bom_parents')
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


class BomService:
    @staticmethod
    def create(serializer, request):
        try:
            line = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        AuditService.log('CREATE', 'Document', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
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
        try:
            line = serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages) from exc
        AuditService.log('UPDATE', 'Document', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number},
            idempotency_key=f'bom-update:{line.id}:{line.updated_at.isoformat()}',
        )
        return line

    @staticmethod
    def delete(line, request):
        payload = {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number}
        line_id = line.id
        line.delete()
        AuditService.log('DELETE', 'Document', user=request.user, entity=str(line_id), ip_address=request.META.get('REMOTE_ADDR'))
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
            AuditService.log('UPDATE', 'Document', user=request.user, entity=str(line.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'BomChanged',
            'PlBomLine',
            line.id,
            {'parent': line.parent_id, 'child': line.child_id, 'find_number': line.find_number, 'action': 'move'},
            idempotency_key=f'bom-move:{line.id}:{line.updated_at.isoformat()}',
        )
        return line


class SupervisorDocumentReviewService:
    @staticmethod
    def normalize_family_key(document):
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
    def visible_reviews_for_user(user):
        queryset = SupervisorDocumentReview.objects.select_related(
            'pl_item',
            'latest_document',
            'previous_document',
            'requested_by',
            'resolved_by',
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
