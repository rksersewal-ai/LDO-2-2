from datetime import datetime

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from edms_api.models import Approval, Case, WorkRecord
from shared.permissions import PermissionService
from shared.request_context import get_correlation_id
from shared.services import AuditService, EventService

from .models import WorkRecordExportJob


def _canonical_status(status_value):
    mapping = {
        'Open': 'OPEN',
        'In Progress': 'SUBMITTED',
        'Completed': 'VERIFIED',
        'Closed': 'CLOSED',
    }
    return mapping.get(status_value, status_value or 'OPEN')


def _as_date(value):
    if value in [None, '']:
        return None
    if hasattr(value, 'year'):
        return value
    return datetime.fromisoformat(str(value)).date()


def _days_between(start, end):
    if not start or not end:
        return None
    return max((end - start).days, 0)


class WorkRecordService:
    @staticmethod
    def queryset(params, user=None):
        queryset = PermissionService.scope_queryset(
            WorkRecord.objects.select_related('user_name', 'verified_by').all(),
            user,
            'view_workrecord',
        )
        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=_canonical_status(status_filter))
        user_id = params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_name_id=user_id)
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search)
                | Q(description__icontains=search)
                | Q(pl_number__icontains=search)
                | Q(eoffice_number__icontains=search)
                | Q(tender_number__icontains=search)
                | Q(concerned_officer__icontains=search)
                | Q(work_type__icontains=search)
            )
        ordering = params.get('ordering') or '-created_at'
        return queryset.order_by(ordering)

    @staticmethod
    def create(validated_data, request):
        user = request.user if request.user.is_authenticated else None
        start_date = _as_date(validated_data.get('date'))
        closing_date = _as_date(validated_data.get('closingDate') or validated_data.get('completionDate'))
        verification_date = _as_date(validated_data.get('verificationDate'))
        days_taken = validated_data.get('daysTaken')
        if days_taken is None:
            days_taken = _days_between(start_date, closing_date)

        record = WorkRecord.objects.create(
            description=validated_data['description'],
            work_category=validated_data['workCategory'],
            work_type=validated_data['workType'],
            status=_canonical_status(validated_data.get('status')),
            date=start_date,
            completion_date=closing_date,
            closing_date=closing_date,
            days_taken=days_taken or 0,
            target_days=validated_data.get('targetDays') or 0,
            pl_number=validated_data.get('plNumber'),
            eoffice_number=validated_data.get('eOfficeNumber'),
            drawing_number=validated_data.get('drawingNumber'),
            tender_number=validated_data.get('tenderNumber'),
            section_type=validated_data.get('sectionType'),
            concerned_officer=validated_data.get('concernedOfficer'),
            consent_given=validated_data.get('consentGiven'),
            user_section=validated_data.get('userSection'),
            remarks=validated_data.get('remarks'),
            user_name=user,
            verified_by=user if _canonical_status(validated_data.get('status')) in ['VERIFIED', 'CLOSED'] else None,
            verification_date=verification_date,
            is_locked=validated_data.get('isLocked', _canonical_status(validated_data.get('status')) in ['VERIFIED', 'CLOSED']),
        )
        PermissionService.grant_default_object_permissions(record, user)
        AuditService.log('CREATE', 'WorkRecord', user=user, entity=record.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'WorkRecordLogged',
            'WorkRecord',
            record.id,
            {'pl_number': record.pl_number, 'work_type': record.work_type, 'status': record.status},
            idempotency_key=f'work-record-create:{record.id}',
        )
        return record

    @staticmethod
    def update(instance, validated_data, request):
        PermissionService.require_permission(request.user, instance, 'change_workrecord')
        if 'description' in validated_data:
            instance.description = validated_data['description']
        if 'workCategory' in validated_data:
            instance.work_category = validated_data['workCategory']
        if 'workType' in validated_data:
            instance.work_type = validated_data['workType']
        if 'status' in validated_data:
            instance.status = _canonical_status(validated_data['status'])
        if 'date' in validated_data:
            instance.date = _as_date(validated_data['date'])
        if 'closingDate' in validated_data or 'completionDate' in validated_data:
            resolved_closing = _as_date(validated_data.get('closingDate') or validated_data.get('completionDate'))
            instance.closing_date = resolved_closing
            instance.completion_date = resolved_closing
        if 'plNumber' in validated_data:
            instance.pl_number = validated_data.get('plNumber')
        if 'eOfficeNumber' in validated_data:
            instance.eoffice_number = validated_data.get('eOfficeNumber')
        if 'drawingNumber' in validated_data:
            instance.drawing_number = validated_data.get('drawingNumber')
        if 'tenderNumber' in validated_data:
            instance.tender_number = validated_data.get('tenderNumber')
        if 'sectionType' in validated_data:
            instance.section_type = validated_data.get('sectionType')
        if 'concernedOfficer' in validated_data:
            instance.concerned_officer = validated_data.get('concernedOfficer')
        if 'consentGiven' in validated_data:
            instance.consent_given = validated_data.get('consentGiven')
        if 'userSection' in validated_data:
            instance.user_section = validated_data.get('userSection')
        if 'remarks' in validated_data:
            instance.remarks = validated_data.get('remarks')
        if 'targetDays' in validated_data:
            instance.target_days = validated_data.get('targetDays') or 0
        if 'isLocked' in validated_data:
            instance.is_locked = validated_data['isLocked']
        if 'verificationDate' in validated_data:
            instance.verification_date = _as_date(validated_data.get('verificationDate'))
        if 'daysTaken' in validated_data and validated_data.get('daysTaken') is not None:
            instance.days_taken = validated_data['daysTaken']
        else:
            instance.days_taken = _days_between(instance.date, instance.closing_date or instance.completion_date) or instance.days_taken
        if instance.status in ['VERIFIED', 'CLOSED'] and not instance.verified_by and request.user.is_authenticated:
            instance.verified_by = request.user
        instance.save()
        AuditService.log('UPDATE', 'WorkRecord', user=request.user, entity=instance.id, ip_address=request.META.get('REMOTE_ADDR'))
        return instance

    @staticmethod
    def create_export_job(request, export_format, filters):
        PermissionService.require_permission(request.user, WorkRecord, 'view_workrecord')
        job, _ = WorkRecordExportJob.objects.get_or_create(
            requested_by=request.user if request.user.is_authenticated else None,
            status='QUEUED',
            export_format=export_format,
            filters=filters or {},
            defaults={'correlation_id': getattr(request, 'correlation_id', '') or get_correlation_id()},
        )
        PermissionService.grant_default_object_permissions(job, request.user, actions=('view', 'change'))
        AuditService.log('EXPORT', 'WorkRecord', user=request.user, entity=str(job.id), ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'WorkRecordExportRequested',
            'WorkRecordExportJob',
            job.id,
            {'format': export_format, 'filters': filters or {}},
            idempotency_key=f'work-export:{request.user.id if request.user.is_authenticated else "anon"}:{export_format}:{job.id}',
        )
        return job


class ApprovalService:
    @staticmethod
    def queryset(user=None):
        return PermissionService.scope_queryset(
            Approval.objects.select_related('requested_by', 'approved_by', 'rejected_by').all(),
            user,
            'view_approval',
        ).order_by('-requested_at')

    @staticmethod
    def available_actions(approval, user):
        can_change = PermissionService.has_permission(user, approval, 'change_approval')
        pending = approval.status == 'Pending'
        return [
            {
                'key': 'approve',
                'label': 'Approve',
                'enabled': can_change and pending,
                'reason': '' if can_change and pending else ('Approval has already been decided.' if not pending else 'Change permission required.'),
            },
            {
                'key': 'reject',
                'label': 'Reject',
                'enabled': can_change and pending,
                'reason': '' if can_change and pending else ('Approval has already been decided.' if not pending else 'Change permission required.'),
            },
        ]

    @staticmethod
    def approve(approval, request, comment=''):
        PermissionService.require_permission(request.user, approval, 'change_approval')
        # Re-fetch with row lock to prevent concurrent state transitions
        approval = Approval.objects.select_for_update().get(pk=approval.pk)
        if approval.status != 'Pending':
            raise ValidationError({'status': 'Only pending approvals can be approved.'})
        approval.status = 'Approved'
        approval.comment = comment
        approval.approved_by = request.user if request.user.is_authenticated else None
        approval.approved_at = timezone.now()
        approval.save()
        AuditService.log('APPROVE', 'Approval', user=request.user, entity=approval.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'ApprovalGranted',
            'Approval',
            approval.id,
            {'entity_type': approval.entity_type, 'entity_id': approval.entity_id},
            idempotency_key=f'approval-granted:{approval.id}',
        )
        return approval

    @staticmethod
    def reject(approval, request, reason=''):
        PermissionService.require_permission(request.user, approval, 'change_approval')
        # Re-fetch with row lock to prevent concurrent state transitions
        approval = Approval.objects.select_for_update().get(pk=approval.pk)
        if approval.status != 'Pending':
            raise ValidationError({'status': 'Only pending approvals can be rejected.'})
        approval.status = 'Rejected'
        approval.rejection_reason = reason
        approval.rejected_by = request.user if request.user.is_authenticated else None
        approval.rejected_at = timezone.now()
        approval.save()
        AuditService.log('REJECT', 'Approval', user=request.user, entity=approval.id, ip_address=request.META.get('REMOTE_ADDR'))
        return approval


class CaseService:
    @staticmethod
    def queryset(user=None):
        return PermissionService.scope_queryset(
            Case.objects.select_related('document', 'assigned_to', 'resolved_by').all(),
            user,
            'view_case',
        ).order_by('-opened_at')

    @staticmethod
    def available_actions(case, user):
        can_change = PermissionService.has_permission(user, case, 'change_case')
        open_case = case.status not in {'Closed', 'Resolved'}
        return [
            {
                'key': 'close',
                'label': 'Close case',
                'enabled': can_change and open_case,
                'reason': '' if can_change and open_case else ('Case is already closed.' if not open_case else 'Change permission required.'),
            }
        ]

    @staticmethod
    def close(case, request, resolution):
        PermissionService.require_permission(request.user, case, 'change_case')
        # Re-fetch with row lock to prevent concurrent state transitions
        case = Case.objects.select_for_update().get(pk=case.pk)
        if case.status in {'Closed', 'Resolved'}:
            raise ValidationError({'status': 'Only open cases can be closed.'})
        case.status = 'Closed'
        case.resolution = resolution
        case.closed_at = timezone.now()
        case.resolved_by = request.user if request.user.is_authenticated else None
        case.resolved_at = timezone.now()
        case.save()
        AuditService.log('UPDATE', 'Case', user=request.user, entity=case.id, ip_address=request.META.get('REMOTE_ADDR'))
        return case
