from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from django.db import connection
from django.db.models import Case as DBCase, CharField, Count, ExpressionWrapper, F, FloatField, Q, Value, When
from django.utils import timezone
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

from edms_api.models import Approval, AuditLog, Case, ChangeNotice, ChangeRequest, Document, PlItem, SupervisorDocumentReview, WorkRecord
from documents.models import CrawlJob, DocumentMetadataAssertion, DocumentOcrEntity, DuplicateDecision, HashBackfillJob

from .models import DomainEvent, ReportJob
from .permissions import PermissionService
from .request_context import get_correlation_id


class AuditService:
    @staticmethod
    def log(action, module, *, user=None, entity=None, severity='Info', details=None, ip_address=None):
        return AuditLog.log(
            action=action,
            module=module,
            user=user,
            entity=entity,
            severity=severity,
            details=details or {},
            ip_address=ip_address,
        )


class EventService:
    @staticmethod
    def _normalize_payload(value):
        if isinstance(value, dict):
            return {str(key): EventService._normalize_payload(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [EventService._normalize_payload(item) for item in value]
        if isinstance(value, (UUID, Decimal)):
            return str(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value

    @staticmethod
    def publish(event_type, aggregate_type, aggregate_id, payload=None, *, idempotency_key=''):
        return DomainEvent.objects.create(
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=str(aggregate_id),
            payload=EventService._normalize_payload(payload or {}),
            correlation_id=get_correlation_id(),
            idempotency_key=idempotency_key,
        )


class ReportJobService:
    @staticmethod
    def queryset(user, *, status_filter=None, report_type=None, export_format=None):
        queryset = ReportJob.objects.select_related('requested_by').all()
        if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
            scoped = queryset
        elif getattr(user, 'is_authenticated', False):
            scoped = queryset.filter(requested_by=user)
        else:
            scoped = queryset.none()

        if status_filter:
            scoped = scoped.filter(status=status_filter)
        if report_type:
            scoped = scoped.filter(report_type=report_type)
        if export_format:
            scoped = scoped.filter(export_format=export_format)
        return scoped

    @staticmethod
    def create(*, report_type, export_format='xlsx', filters=None, parameters=None, user=None):
        job = ReportJob.objects.create(
            report_type=report_type,
            export_format=export_format,
            filters=filters or {},
            parameters=parameters or {},
            requested_by=user if getattr(user, 'is_authenticated', False) else None,
            correlation_id=get_correlation_id(),
        )
        PermissionService.grant_default_object_permissions(job, user, actions=('view', 'change'))
        AuditService.log('EXPORT', 'Reporting', user=user, entity=str(job.id), details={'report_type': report_type, 'format': export_format})
        EventService.publish(
            'ReportJobQueued',
            'ReportJob',
            job.id,
            {'report_type': report_type, 'format': export_format, 'filters': filters or {}, 'parameters': parameters or {}},
            idempotency_key=f'report-job:{report_type}:{job.id}',
        )
        return job

    @staticmethod
    def mark_processing(job):
        if job.status != 'PROCESSING':
            job.status = 'PROCESSING'
            job.started_at = timezone.now()
            job.error_message = ''
            job.save(update_fields=['status', 'started_at', 'error_message', 'updated_at'])
            EventService.publish(
                'ReportJobStarted',
                'ReportJob',
                job.id,
                {'report_type': job.report_type},
                idempotency_key=f'report-job-started:{job.id}',
            )
        return job

    @staticmethod
    def mark_completed(job, *, file_key='', result_summary=None):
        job.status = 'COMPLETED'
        if not job.started_at:
            job.started_at = timezone.now()
        job.completed_at = timezone.now()
        job.file_key = file_key or job.file_key
        job.result_summary = result_summary or {}
        job.error_message = ''
        job.save(update_fields=['status', 'started_at', 'completed_at', 'file_key', 'result_summary', 'error_message', 'updated_at'])
        EventService.publish(
            'ReportJobCompleted',
            'ReportJob',
            job.id,
            {'report_type': job.report_type, 'file_key': job.file_key, 'result_summary': job.result_summary},
            idempotency_key=f'report-job-completed:{job.id}',
        )
        return job

    @staticmethod
    def mark_failed(job, *, error_message):
        job.status = 'FAILED'
        if not job.started_at:
            job.started_at = timezone.now()
        job.completed_at = timezone.now()
        job.error_message = error_message
        job.save(update_fields=['status', 'started_at', 'completed_at', 'error_message', 'updated_at'])
        EventService.publish(
            'ReportJobFailed',
            'ReportJob',
            job.id,
            {'report_type': job.report_type, 'error_message': error_message},
            idempotency_key=f'report-job-failed:{job.id}',
        )
        return job

    @staticmethod
    def retry(job, *, user=None):
        job.status = 'QUEUED'
        job.started_at = None
        job.completed_at = None
        job.file_key = ''
        job.result_summary = {}
        job.error_message = ''
        job.save(update_fields=['status', 'started_at', 'completed_at', 'file_key', 'result_summary', 'error_message', 'updated_at'])
        AuditService.log(
            'RETRY',
            'Reporting',
            user=user,
            entity=str(job.id),
            details={'report_type': job.report_type, 'format': job.export_format},
        )
        EventService.publish(
            'ReportJobRetried',
            'ReportJob',
            job.id,
            {'report_type': job.report_type, 'format': job.export_format},
            idempotency_key=f'report-job-retried:{job.id}:{timezone.now().isoformat()}',
        )
        return job


class WorkflowActionService:
    @staticmethod
    def act(item_id: str, *, action: str, user, notes='', comment='', reason='', bypass_reason='', effectivity_date=None, request=None):
        from config_mgmt.services import ChangeNoticeService, ChangeRequestService, SupervisorDocumentReviewService
        from documents.services import DuplicateDecisionService
        from work.services import ApprovalService

        normalized = (action or '').strip().lower()

        if item_id.startswith('approval:'):
            approval = Approval.objects.get(pk=item_id.split(':', 1)[1])
            if normalized == 'approve':
                return {
                    'item_id': item_id,
                    'status': 'completed',
                    'result': 'approved',
                    'payload': {'approval_id': approval.id},
                    'target': f'/approvals?id={approval.id}',
                    'object': ApprovalService.approve(approval, request, comment or notes),
                }
            if normalized == 'reject':
                return {
                    'item_id': item_id,
                    'status': 'completed',
                    'result': 'rejected',
                    'payload': {'approval_id': approval.id},
                    'target': f'/approvals?id={approval.id}',
                    'object': ApprovalService.reject(approval, request, reason or notes),
                }

        if item_id.startswith('supervisor-review:'):
            review = SupervisorDocumentReview.objects.get(pk=item_id.split(':', 1)[1])
            if normalized == 'approve':
                obj = SupervisorDocumentReviewService.approve(review, user=user, notes=notes or comment, request=request)
                return {
                    'item_id': item_id,
                    'status': 'completed',
                    'result': 'approved',
                    'payload': {'review_id': str(review.id)},
                    'target': f'/pl/{review.pl_item_id}?tab=crossrefs&doc={review.latest_document_id}',
                    'object': obj,
                }
            if normalized == 'bypass':
                obj = SupervisorDocumentReviewService.bypass(
                    review,
                    user=user,
                    notes=notes or comment,
                    bypass_reason=bypass_reason or reason or notes or 'Bypassed from workflow action',
                    request=request,
                )
                return {
                    'item_id': item_id,
                    'status': 'completed',
                    'result': 'bypassed',
                    'payload': {'review_id': str(review.id)},
                    'target': f'/pl/{review.pl_item_id}?tab=crossrefs&doc={review.latest_document_id}',
                    'object': obj,
                }

        if item_id.startswith('dedup:'):
            decision_record = DuplicateDecision.objects.get(pk=item_id.split(':', 1)[1])
            decision = 'IGNORE' if normalized in {'ignore', 'reject'} else (decision_record.decision or 'MERGE')
            obj = DuplicateDecisionService.apply_decision(
                decision_record.group_key,
                master_document_id=decision_record.master_document_id,
                decision=decision,
                notes=notes or decision_record.notes,
                user=user,
            )
            return {
                'item_id': item_id,
                'status': 'completed',
                'result': decision.lower(),
                'payload': {'group_key': decision_record.group_key},
                'target': '/admin/deduplication',
                'object': obj,
            }

        if item_id.startswith('change-request:'):
            change_request = ChangeRequest.objects.get(pk=item_id.split(':', 1)[1])
            if normalized == 'submit':
                obj = ChangeRequestService.submit(change_request, request)
            elif normalized == 'approve':
                obj = ChangeRequestService.approve(change_request, request, notes=notes or comment)
            elif normalized == 'reject':
                obj = ChangeRequestService.reject(change_request, request, notes=reason or notes)
            elif normalized == 'implement':
                obj = ChangeRequestService.implement(change_request, request)
            else:
                raise ValueError(f'Unsupported action "{action}" for {item_id}')
            return {
                'item_id': item_id,
                'status': 'completed',
                'result': normalized,
                'payload': {'change_request_id': str(change_request.id)},
                'target': f'/pl/{change_request.pl_item_id}?tab=changes',
                'object': obj,
            }

        if item_id.startswith('change-notice:'):
            change_notice = ChangeNotice.objects.get(pk=item_id.split(':', 1)[1])
            if normalized == 'approve':
                obj = ChangeNoticeService.approve(change_notice, request, notes=notes or comment)
            elif normalized == 'release':
                obj = ChangeNoticeService.release(change_notice, request, notes=notes or comment, effectivity_date=effectivity_date)
            elif normalized == 'close':
                obj = ChangeNoticeService.close(change_notice, request, notes=notes or comment)
            else:
                raise ValueError(f'Unsupported action "{action}" for {item_id}')
            return {
                'item_id': item_id,
                'status': 'completed',
                'result': normalized,
                'payload': {'change_notice_id': str(change_notice.id)},
                'target': f'/pl/{change_notice.change_request.pl_item_id}?tab=changes',
                'object': obj,
            }

        raise ValueError(f'Unsupported workflow item "{item_id}"')


class SearchService:
    BUCKET_LIMIT = 20
    DATE_WINDOW_DAYS = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
    }

    @staticmethod
    def _is_postgres() -> bool:
        return connection.vendor == 'postgresql'

    @staticmethod
    def _apply_duplicate_filter(queryset, duplicate_filter: str):
        normalized = (duplicate_filter or 'include').lower()
        if normalized == 'exclude':
            return queryset.exclude(duplicate_status='DUPLICATE')
        if normalized == 'only':
            return queryset.filter(duplicate_status='DUPLICATE')
        return queryset

    @staticmethod
    def _normalize_status_filters(status_filters):
        normalized = []
        for value in status_filters or []:
            candidate = str(value or '').strip()
            if candidate:
                normalized.append(candidate)
        return normalized

    @classmethod
    def _apply_status_filter(cls, queryset, status_filters):
        normalized = cls._normalize_status_filters(status_filters)
        if not normalized:
            return queryset

        variants = set()
        for value in normalized:
            variants.update({value, value.upper(), value.title()})
        return queryset.filter(status__in=sorted(variants))

    @classmethod
    def _apply_date_filter(cls, queryset, field_name: str, date_range: str | None):
        days = cls.DATE_WINDOW_DAYS.get((date_range or '').lower())
        if not days:
            return queryset

        cutoff = timezone.now() - timedelta(days=days)
        return queryset.filter(**{f'{field_name}__gte': cutoff})

    @staticmethod
    def _document_rank_bonus(query: str):
        normalized_query = (query or '').strip()
        return (
            DBCase(
                When(id__iexact=normalized_query, then=Value(3.0)),
                When(name__iexact=normalized_query, then=Value(2.25)),
                When(linked_pl__iexact=normalized_query, then=Value(2.75)),
                default=Value(0.0),
                output_field=FloatField(),
            )
            + DBCase(
                When(status__in=['Approved', 'APPROVED'], then=Value(0.2)),
                When(status__in=['Obsolete', 'OBSOLETE'], then=Value(-0.2)),
                default=Value(0.0),
                output_field=FloatField(),
            )
            + DBCase(
                When(duplicate_status='MASTER', then=Value(0.25)),
                When(duplicate_status='DUPLICATE', then=Value(-0.25)),
                default=Value(0.05),
                output_field=FloatField(),
            )
            + DBCase(
                When(linked_pl__isnull=False, linked_pl__gt='', then=Value(0.1)),
                default=Value(0.0),
                output_field=FloatField(),
            )
        )

    @staticmethod
    def _apply_document_filters(queryset, *, source_filter=None, class_filter=None, hash_status=None, pl_linked=None):
        if source_filter:
            queryset = queryset.filter(source_system=source_filter)
        if class_filter:
            queryset = queryset.filter(category__iexact=class_filter)
        normalized_hash_status = (hash_status or '').lower()
        if normalized_hash_status == 'present':
            queryset = queryset.exclude(fingerprint_3x64k__isnull=True).exclude(fingerprint_3x64k='')
        elif normalized_hash_status == 'full':
            queryset = queryset.exclude(file_hash__isnull=True).exclude(file_hash='')
        elif normalized_hash_status == 'missing':
            queryset = queryset.filter(Q(fingerprint_3x64k__isnull=True) | Q(fingerprint_3x64k=''))
        normalized_pl_linked = (pl_linked or '').lower()
        if normalized_pl_linked in {'true', 'linked', 'yes'}:
            queryset = queryset.exclude(linked_pl__isnull=True).exclude(linked_pl='')
        elif normalized_pl_linked in {'false', 'unlinked', 'no'}:
            queryset = queryset.filter(Q(linked_pl__isnull=True) | Q(linked_pl=''))
        return queryset

    @classmethod
    def _document_queryset(
        cls,
        query: str,
        duplicate_filter: str = 'include',
        *,
        user=None,
        source_filter=None,
        class_filter=None,
        hash_status=None,
        pl_linked=None,
        status_filters=None,
        date_range=None,
    ):
        queryset = PermissionService.scope_queryset(Document.objects.all(), user, 'view_document')
        queryset = cls._apply_document_filters(
            queryset,
            source_filter=source_filter,
            class_filter=class_filter,
            hash_status=hash_status,
            pl_linked=pl_linked,
        )
        queryset = cls._apply_status_filter(queryset, status_filters)
        queryset = cls._apply_date_filter(queryset, 'updated_at', date_range)
        if cls._is_postgres():
            search_query = SearchQuery(query, config='simple', search_type='websearch')
            vector = (
                SearchVector('id', weight='A', config='simple')
                + SearchVector('name', weight='A', config='simple')
                + SearchVector('linked_pl', weight='A', config='simple')
                + SearchVector('category', weight='B', config='simple')
                + SearchVector('type', weight='B', config='simple')
                + SearchVector('description', weight='B', config='simple')
                + SearchVector('search_text', weight='A', config='simple')
                + SearchVector('extracted_text', weight='C', config='simple')
            )
            queryset = (
                queryset
                .annotate(
                    search_rank=SearchRank(vector, search_query),
                    exact_match_score=cls._document_rank_bonus(query),
                )
                .annotate(
                    combined_rank=ExpressionWrapper(
                        F('search_rank') + F('exact_match_score'),
                        output_field=FloatField(),
                    )
                )
                .filter(
                    Q(combined_rank__gte=0.05)
                    | Q(id__icontains=query)
                    | Q(name__icontains=query)
                    | Q(linked_pl__icontains=query)
                    | Q(search_text__icontains=query)
                    | Q(extracted_text__icontains=query)
                    | Q(external_file_path__icontains=query)
                    | Q(metadata_assertions__normalized_value__icontains=query, metadata_assertions__status='APPROVED')
                    | Q(metadata_assertions__value__icontains=query, metadata_assertions__status='APPROVED')
                    | Q(ocr_entities__normalized_value__icontains=query)
                    | Q(ocr_entities__entity_value__icontains=query)
                )
                .distinct()
                .order_by('-combined_rank', '-updated_at')
            )
            return cls._apply_duplicate_filter(queryset, duplicate_filter)

        queryset = queryset.filter(
            Q(name__icontains=query)
            | Q(id__icontains=query)
            | Q(description__icontains=query)
            | Q(category__icontains=query)
            | Q(linked_pl__icontains=query)
            | Q(type__icontains=query)
            | Q(search_text__icontains=query)
            | Q(extracted_text__icontains=query)
            | Q(external_file_path__icontains=query)
            | Q(metadata_assertions__normalized_value__icontains=query, metadata_assertions__status='APPROVED')
            | Q(metadata_assertions__value__icontains=query, metadata_assertions__status='APPROVED')
            | Q(ocr_entities__normalized_value__icontains=query)
            | Q(ocr_entities__entity_value__icontains=query)
        ).annotate(
            exact_match_score=cls._document_rank_bonus(query)
        ).distinct().order_by('-exact_match_score', '-updated_at')
        return cls._apply_duplicate_filter(queryset, duplicate_filter)

    @staticmethod
    def _document_match_context(query: str, document_ids: list[str]) -> dict[str, dict]:
        if not query or not document_ids:
            return {}
        normalized_query = query.strip().upper()
        assertions = (
            DocumentMetadataAssertion.objects
            .filter(document_id__in=document_ids, status='APPROVED')
            .filter(Q(normalized_value__icontains=normalized_query) | Q(value__icontains=query))
            .values('document_id', 'field_key', 'value', 'normalized_value')
        )
        entities = (
            DocumentOcrEntity.objects
            .filter(document_id__in=document_ids)
            .exclude(review_status='REJECTED')
            .filter(Q(normalized_value__icontains=normalized_query) | Q(entity_value__icontains=query))
            .values('document_id', 'entity_type', 'entity_value', 'normalized_value', 'review_status')
        )
        context: dict[str, dict] = {}
        for row in assertions:
            bucket = context.setdefault(str(row['document_id']), {'match_reasons': [], 'matched_assertions': [], 'matched_entities': []})
            if 'approved_assertion' not in bucket['match_reasons']:
                bucket['match_reasons'].append('approved_assertion')
            bucket['matched_assertions'].append(
                {
                    'field_key': row['field_key'],
                    'value': row['value'],
                    'normalized_value': row['normalized_value'],
                }
            )
        for row in entities:
            bucket = context.setdefault(str(row['document_id']), {'match_reasons': [], 'matched_assertions': [], 'matched_entities': []})
            if 'extracted_entity' not in bucket['match_reasons']:
                bucket['match_reasons'].append('extracted_entity')
            bucket['matched_entities'].append(
                {
                    'entity_type': row['entity_type'],
                    'value': row['entity_value'],
                    'normalized_value': row['normalized_value'],
                    'review_status': row['review_status'],
                }
            )
        return context

    @staticmethod
    def _document_facets(queryset):
        def bucket(field_name):
            return list(
                queryset.values(field_name)
                .annotate(count=Count('id'))
                .order_by(field_name)
            )

        hash_status_queryset = queryset.annotate(
            hash_state=DBCase(
                When(file_hash__isnull=False, then=Value('full')),
                When(fingerprint_3x64k__isnull=False, then=Value('present')),
                default=Value('missing'),
                output_field=CharField(),
            )
        )
        return {
            'source_system': bucket('source_system'),
            'category': bucket('category'),
            'duplicate_status': bucket('duplicate_status'),
            'ocr_status': bucket('ocr_status'),
            'hash_status': list(
                hash_status_queryset.values('hash_state')
                .annotate(count=Count('id'))
                .order_by('hash_state')
            ),
            'pl_linked': [
                {'value': 'linked', 'count': queryset.exclude(linked_pl__isnull=True).exclude(linked_pl='').count()},
                {'value': 'unlinked', 'count': queryset.filter(Q(linked_pl__isnull=True) | Q(linked_pl='')).count()},
            ],
        }

    @classmethod
    def _work_queryset(cls, query: str, *, user=None, status_filters=None, date_range=None):
        queryset = PermissionService.scope_queryset(WorkRecord.objects.all(), user, 'view_workrecord')
        queryset = cls._apply_status_filter(queryset, status_filters)
        queryset = cls._apply_date_filter(queryset, 'updated_at', date_range)
        if cls._is_postgres():
            search_query = SearchQuery(query, config='simple', search_type='websearch')
            vector = (
                SearchVector('id', weight='A', config='simple')
                + SearchVector('description', weight='A', config='simple')
                + SearchVector('pl_number', weight='A', config='simple')
                + SearchVector('eoffice_number', weight='A', config='simple')
                + SearchVector('concerned_officer', weight='B', config='simple')
                + SearchVector('work_type', weight='B', config='simple')
                + SearchVector('remarks', weight='C', config='simple')
            )
            return (
                queryset
                .annotate(search_rank=SearchRank(vector, search_query))
                .filter(
                    Q(search_rank__gte=0.05)
                    | Q(id__icontains=query)
                    | Q(description__icontains=query)
                    | Q(pl_number__icontains=query)
                    | Q(eoffice_number__icontains=query)
                )
                .order_by('-search_rank', '-updated_at')
            )

        return queryset.filter(
            Q(description__icontains=query)
            | Q(id__icontains=query)
            | Q(pl_number__icontains=query)
            | Q(eoffice_number__icontains=query)
            | Q(concerned_officer__icontains=query)
            | Q(work_type__icontains=query)
            | Q(remarks__icontains=query)
        ).order_by('-updated_at')

    @classmethod
    def _pl_queryset(cls, query: str, *, user=None, status_filters=None, date_range=None):
        queryset = PermissionService.scope_queryset(PlItem.objects.all(), user, 'view_plitem')
        queryset = cls._apply_status_filter(queryset, status_filters)
        queryset = cls._apply_date_filter(queryset, 'last_updated', date_range)
        if cls._is_postgres():
            search_query = SearchQuery(query, config='simple', search_type='websearch')
            vector = (
                SearchVector('id', weight='A', config='simple')
                + SearchVector('name', weight='A', config='simple')
                + SearchVector('part_number', weight='A', config='simple')
                + SearchVector('description', weight='B', config='simple')
                + SearchVector('category', weight='B', config='simple')
                + SearchVector('uvam_item_id', weight='A', config='simple')
                + SearchVector('eligibility_criteria', weight='C', config='simple')
                + SearchVector('procurement_conditions', weight='C', config='simple')
                + SearchVector('design_supervisor', weight='B', config='simple')
                + SearchVector('concerned_supervisor', weight='B', config='simple')
            )
            return (
                queryset
                .annotate(search_rank=SearchRank(vector, search_query))
                .filter(
                    Q(search_rank__gte=0.05)
                    | Q(id__icontains=query)
                    | Q(name__icontains=query)
                    | Q(part_number__icontains=query)
                    | Q(uvam_item_id__icontains=query)
                )
                .order_by('-search_rank', '-last_updated')
            )

        return queryset.filter(
            Q(id__icontains=query)
            | Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(uvam_item_id__icontains=query)
            | Q(eligibility_criteria__icontains=query)
            | Q(procurement_conditions__icontains=query)
            | Q(part_number__icontains=query)
            | Q(category__icontains=query)
        ).order_by('-last_updated')

    @classmethod
    def _case_queryset(cls, query: str, *, user=None, status_filters=None, date_range=None):
        queryset = PermissionService.scope_queryset(Case.objects.all(), user, 'view_case')
        queryset = cls._apply_status_filter(queryset, status_filters)
        queryset = cls._apply_date_filter(queryset, 'opened_at', date_range)
        if cls._is_postgres():
            search_query = SearchQuery(query, config='simple', search_type='websearch')
            vector = (
                SearchVector('id', weight='A', config='simple')
                + SearchVector('title', weight='A', config='simple')
                + SearchVector('description', weight='B', config='simple')
                + SearchVector('pl_reference', weight='A', config='simple')
                + SearchVector('resolution', weight='C', config='simple')
            )
            return (
                queryset
                .annotate(search_rank=SearchRank(vector, search_query))
                .filter(
                    Q(search_rank__gte=0.05)
                    | Q(id__icontains=query)
                    | Q(title__icontains=query)
                    | Q(pl_reference__icontains=query)
                )
                .order_by('-search_rank', '-opened_at')
            )

        return queryset.filter(
            Q(title__icontains=query)
            | Q(id__icontains=query)
            | Q(description__icontains=query)
            | Q(pl_reference__icontains=query)
            | Q(resolution__icontains=query)
        ).order_by('-opened_at')

    @classmethod
    def search(
        cls,
        query: str,
        scope: str = 'ALL',
        duplicate_filter: str = 'include',
        *,
        user=None,
        source_filter=None,
        class_filter=None,
        hash_status=None,
        pl_linked=None,
        status_filters=None,
        date_range=None,
    ):
        from config_mgmt.serializers import PlItemSerializer
        from documents.serializers import DocumentSerializer
        from work.serializers import CaseSerializer, WorkRecordSerializer

        results = {
            'documents': [],
            'work_records': [],
            'pl_items': [],
            'cases': [],
            'total': 0,
            'facets': {'documents': {'source_system': [], 'category': [], 'duplicate_status': [], 'ocr_status': [], 'hash_status': [], 'pl_linked': []}},
        }

        if scope in ['ALL', 'DOCUMENTS']:
            document_queryset = cls._document_queryset(
                query,
                duplicate_filter=duplicate_filter,
                user=user,
                source_filter=source_filter,
                class_filter=class_filter,
                hash_status=hash_status,
                pl_linked=pl_linked,
                status_filters=status_filters,
                date_range=date_range,
            )
            results['facets'] = {
                'documents': cls._document_facets(document_queryset),
            }
            document_batch = list(document_queryset[: cls.BUCKET_LIMIT])
            serialized_documents = DocumentSerializer(document_batch, many=True).data
            match_context = cls._document_match_context(query, [str(document.id) for document in document_batch])
            for document in serialized_documents:
                document.update(match_context.get(str(document['id']), {'match_reasons': [], 'matched_assertions': [], 'matched_entities': []}))
            results['documents'] = serialized_documents

        if scope in ['ALL', 'WORK']:
            results['work_records'] = WorkRecordSerializer(
                cls._work_queryset(
                    query,
                    user=user,
                    status_filters=status_filters,
                    date_range=date_range,
                )[: cls.BUCKET_LIMIT],
                many=True,
            ).data

        if scope in ['ALL', 'PL']:
            results['pl_items'] = PlItemSerializer(
                cls._pl_queryset(
                    query,
                    user=user,
                    status_filters=status_filters,
                    date_range=date_range,
                )[: cls.BUCKET_LIMIT],
                many=True,
            ).data

        if scope in ['ALL', 'CASES']:
            results['cases'] = CaseSerializer(
                cls._case_queryset(
                    query,
                    user=user,
                    status_filters=status_filters,
                    date_range=date_range,
                )[: cls.BUCKET_LIMIT],
                many=True,
            ).data

        results['total'] = (
            len(results['documents'])
            + len(results['work_records'])
            + len(results['pl_items'])
            + len(results['cases'])
        )
        results['engine'] = 'postgres_full_text' if SearchService._is_postgres() else 'local_sqlite_fallback'
        results['filters'] = {
            'duplicates': duplicate_filter,
            'source': source_filter or '',
            'class': class_filter or '',
            'hash_status': hash_status or '',
            'pl_linked': pl_linked or '',
            'status': cls._normalize_status_filters(status_filters),
            'date_range': date_range or '',
        }
        return results

    @staticmethod
    def history_for_user(user):
        history = (
            AuditLog.objects.filter(user=user, action='SEARCH')
            .order_by('-created_at')
            .values_list('entity', flat=True)[:20]
        )
        return [entry for entry in history if entry]


class DashboardService:
    @staticmethod
    def stats():
        from django.db.models import Count, Q

        doc_stats = Document.objects.aggregate(
            total=Count('id'),
            approved=Count('id', filter=Q(status__in=['Approved', 'APPROVED'])),
            in_review=Count('id', filter=Q(status__in=['In Review', 'UNDER_REVIEW'])),
            draft=Count('id', filter=Q(status__in=['Draft', 'DRAFT']))
        )
        work_stats = WorkRecord.objects.aggregate(
            total=Count('id'),
            open=Count('id', filter=Q(status__in=['Open', 'OPEN'])),
            in_progress=Count('id', filter=Q(status__in=['In Progress', 'SUBMITTED'])),
            completed=Count('id', filter=Q(status__in=['Completed', 'VERIFIED']))
        )
        approval_stats = Approval.objects.aggregate(
            pending=Count('id', filter=Q(status='Pending')),
            approved=Count('id', filter=Q(status='Approved')),
            rejected=Count('id', filter=Q(status='Rejected'))
        )
        case_stats = Case.objects.aggregate(
            open=Count('id', filter=Q(status__in=['Open', 'OPEN', 'In Progress', 'IN_PROGRESS'])),
            closed=Count('id', filter=Q(status__in=['Closed', 'CLOSED', 'Resolved']))
        )

        return {
            'documents': doc_stats,
            'work_records': work_stats,
            'approvals': approval_stats,
            'cases': case_stats,
            'timestamp': timezone.now(),
        }


class InboxService:
    @staticmethod
    def _document_preview_payload(document):
        if not document:
            return {}
        return {
            'preview_document_id': document.id,
            'preview_document_name': document.name,
        }

    @staticmethod
    def _latest_linked_document(pl_item):
        if not pl_item:
            return None
        link = (
            pl_item.document_links.select_related('document')
            .order_by('-document__updated_at', '-document__revision', '-updated_at')
            .first()
        )
        return getattr(link, 'document', None)

    @staticmethod
    def items_for_user(user):
        from config_mgmt.serializers import SupervisorDocumentReviewSerializer
        from documents.serializers import DuplicateDecisionSerializer

        approvals = list(
            Approval.objects.filter(status='Pending')
            .select_related('requested_by')
            .order_by('-requested_at')[:20]
        )
        reviews = list(
            SupervisorDocumentReview.objects.filter(status='PENDING')
            .select_related('pl_item', 'latest_document', 'previous_document')
            .order_by('-created_at')[:20]
        )
        dedup_records = list(
            DuplicateDecision.objects.filter(status='PENDING')
            .select_related('master_document', 'decided_by')
            .order_by('-decided_at')[:20]
        )
        crawl_failures = list(
            CrawlJob.objects.filter(status='FAILED').select_related('source').order_by('-created_at')[:10]
        )
        hash_failures = list(
            HashBackfillJob.objects.filter(status='FAILED').select_related('source').order_by('-created_at')[:10]
        )
        change_requests = list(
            ChangeRequest.objects.filter(status='UNDER_REVIEW')
            .select_related('pl_item', 'requested_by', 'reviewed_by')
            .order_by('-requested_at')[:20]
        )
        change_notices = list(
            ChangeNotice.objects.filter(status__in=['ISSUED', 'APPROVED'])
            .select_related('change_request', 'change_request__pl_item', 'issued_by', 'approved_by')
            .order_by('-created_at')[:20]
        )

        # ⚡ Bolt: Prevent N+1 queries by bulk-fetching document previews for approvals and dedup records
        document_ids_to_fetch = set()
        for approval in approvals:
            if approval.entity_type == 'document':
                document_ids_to_fetch.add(approval.entity_id)

        for decision in dedup_records:
            if not decision.master_document and decision.candidate_documents:
                document_ids_to_fetch.add(decision.candidate_documents[0])

        preview_documents_by_id = {}
        if document_ids_to_fetch:
            for doc in Document.objects.filter(pk__in=document_ids_to_fetch).only('id', 'name'):
                preview_documents_by_id[doc.id] = doc

        items: list[dict] = []
        for approval in approvals:
            preview_document = None
            if approval.entity_type == 'document':
                preview_document = preview_documents_by_id.get(approval.entity_id)
            items.append(
                {
                    'id': f'approval:{approval.id}',
                    'type': 'approval',
                    'title': f'Approval pending for {approval.entity_type}:{approval.entity_id}',
                    'subtitle': approval.comment or '',
                    'status': approval.status,
                    'target': f'/approvals?id={approval.id}',
                    'created_at': approval.requested_at,
                    'payload': {
                        'approval_id': approval.id,
                        'entity_type': approval.entity_type,
                        'entity_id': approval.entity_id,
                        **InboxService._document_preview_payload(preview_document),
                    },
                }
            )

        for review in reviews:
            review_payload = SupervisorDocumentReviewSerializer(review).data
            items.append(
                {
                    'id': f'supervisor-review:{review.id}',
                    'type': 'supervisor_review',
                    'title': f'Document review for PL {review.pl_item_id}',
                    'subtitle': review.change_summary or '',
                    'status': review.status,
                    'target': f'/pl/{review.pl_item_id}?tab=crossrefs&doc={review.latest_document_id}',
                    'created_at': review.created_at,
                    'payload': {
                        **review_payload,
                        **InboxService._document_preview_payload(review.latest_document),
                    },
                }
            )

        for decision in dedup_records:
            preview_document = decision.master_document
            if not preview_document and decision.candidate_documents:
                candidate_id = decision.candidate_documents[0]
                preview_document = preview_documents_by_id.get(candidate_id)
            items.append(
                {
                    'id': f'dedup:{decision.id}',
                    'type': 'dedup_review',
                    'title': f'Dedup group review {decision.group_key}',
                    'subtitle': decision.notes or '',
                    'status': decision.status,
                    'target': '/admin/deduplication',
                    'created_at': decision.decided_at,
                    'payload': {
                        **DuplicateDecisionSerializer(decision).data,
                        **InboxService._document_preview_payload(preview_document),
                    },
                }
            )

        for job in crawl_failures:
            items.append(
                {
                    'id': f'crawl-job:{job.id}',
                    'type': 'indexing_failure',
                    'title': f'Crawl job failed for {job.source.name if job.source else "unknown source"}',
                    'subtitle': job.error_message,
                    'status': job.status,
                    'target': '/admin/deduplication',
                    'created_at': job.created_at,
                    'payload': {'job_id': str(job.id), 'job_type': 'CRAWL'},
                }
            )

        for job in hash_failures:
            items.append(
                {
                    'id': f'hash-backfill:{job.id}',
                    'type': 'indexing_failure',
                    'title': 'Hash backfill job failed',
                    'subtitle': job.error_message,
                    'status': job.status,
                    'target': '/admin/deduplication',
                    'created_at': job.created_at,
                    'payload': {'job_id': str(job.id), 'job_type': 'HASH_BACKFILL'},
                }
            )

        for change_request in change_requests:
            preview_document = InboxService._latest_linked_document(change_request.pl_item)
            items.append(
                {
                    'id': f'change-request:{change_request.id}',
                    'type': 'change_request',
                    'title': f'Change request review for PL {change_request.pl_item_id}',
                    'subtitle': change_request.title,
                    'status': change_request.status,
                    'target': f'/pl/{change_request.pl_item_id}?tab=changes',
                    'created_at': change_request.requested_at,
                    'payload': {
                        'change_request_id': str(change_request.id),
                        'pl_item': change_request.pl_item_id,
                        **InboxService._document_preview_payload(preview_document),
                    },
                }
            )

        for change_notice in change_notices:
            preview_document = InboxService._latest_linked_document(change_notice.change_request.pl_item)
            items.append(
                {
                    'id': f'change-notice:{change_notice.id}',
                    'type': 'change_notice',
                    'title': f'Change notice {change_notice.notice_number}',
                    'subtitle': change_notice.title,
                    'status': change_notice.status,
                    'target': f'/pl/{change_notice.change_request.pl_item_id}?tab=changes',
                    'created_at': change_notice.created_at,
                    'payload': {
                        'change_notice_id': str(change_notice.id),
                        'change_request': str(change_notice.change_request_id),
                        **InboxService._document_preview_payload(preview_document),
                    },
                }
            )

        items.sort(key=lambda item: item['created_at'], reverse=True)
        return items[:50]
