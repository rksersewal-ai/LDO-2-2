from django.utils import timezone
from rest_framework import serializers

from edms_api.models import Approval, Case
from .models import WorkRecordExportJob


WORK_RECORD_STATUSES = {'OPEN', 'SUBMITTED', 'VERIFIED', 'CLOSED', 'Open', 'In Progress', 'Completed', 'Closed'}


class WorkRecordSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    userId = serializers.CharField(required=False, allow_blank=True)
    userName = serializers.CharField(required=False, allow_blank=True)
    userSection = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    date = serializers.DateField()
    completionDate = serializers.DateField(required=False, allow_null=True)
    closedDate = serializers.DateField(required=False, allow_null=True)
    dispatchDate = serializers.DateField(required=False, allow_null=True)
    closingDate = serializers.DateField(required=False, allow_null=True)
    daysTaken = serializers.IntegerField(required=False, allow_null=True)
    workCategory = serializers.CharField()
    workType = serializers.CharField()
    referenceNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    plNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    drawingNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specificationNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tenderNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    otherNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    eOfficeNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    eOfficeFileNo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    concernedOfficer = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    sectionType = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    targetDays = serializers.IntegerField(required=False, allow_null=True)
    documentRef = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    consentGiven = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(required=False, allow_blank=True)
    isLocked = serializers.BooleanField(required=False)
    verifiedBy = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    verificationDate = serializers.DateField(required=False, allow_null=True)
    createdAt = serializers.DateTimeField(read_only=True)
    updatedAt = serializers.DateTimeField(read_only=True)

    def validate(self, attrs):
        errors = {}
        if self.instance is None and not attrs.get('date'):
            errors['date'] = ['Start date is required.']
        if self.instance is None and not (attrs.get('closingDate') or attrs.get('completionDate')):
            errors['closingDate'] = ['Closing or completion date is required.']
        if attrs.get('status') and attrs['status'] not in WORK_RECORD_STATUSES:
            errors['status'] = ['Invalid work record status.']
        closing = attrs.get('closingDate') or attrs.get('completionDate')
        if attrs.get('date') and closing and closing < attrs['date']:
            errors['closingDate'] = ['Closing date cannot be before the start date.']
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'userId': str(instance.user_name_id or ''),
            'userName': instance.user_name.get_full_name() or instance.user_name.username if instance.user_name else '',
            'userSection': instance.user_section,
            'date': instance.date,
            'completionDate': instance.completion_date,
            'closedDate': instance.closed_date,
            'dispatchDate': instance.dispatch_date,
            'closingDate': instance.closing_date or instance.completion_date,
            'daysTaken': instance.days_taken,
            'workCategory': instance.work_category,
            'workType': instance.work_type,
            'referenceNumber': None,
            'plNumber': instance.pl_number,
            'drawingNumber': instance.drawing_number,
            'specificationNumber': None,
            'tenderNumber': instance.tender_number,
            'otherNumber': None,
            'description': instance.description,
            'remarks': instance.remarks,
            'eOfficeNumber': instance.eoffice_number,
            'eOfficeFileNo': None,
            'concernedOfficer': instance.concerned_officer,
            'sectionType': instance.section_type,
            'targetDays': instance.target_days,
            'documentRef': None,
            'consentGiven': instance.consent_given,
            'status': instance.status,
            'isLocked': instance.is_locked,
            'verifiedBy': instance.verified_by.get_full_name() or instance.verified_by.username if instance.verified_by else '',
            'verificationDate': instance.verification_date,
            'createdAt': instance.created_at or timezone.now(),
            'updatedAt': instance.updated_at,
        }


class WorkRecordExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkRecordExportJob
        fields = [
            'id',
            'requested_by',
            'status',
            'export_format',
            'filters',
            'file_key',
            'correlation_id',
            'error_message',
            'created_at',
            'updated_at',
            'completed_at',
        ]
        read_only_fields = ['id', 'requested_by', 'status', 'file_key', 'correlation_id', 'error_message', 'created_at', 'updated_at', 'completed_at']


class WorkRecordExportRequestSerializer(serializers.Serializer):
    format = serializers.ChoiceField(choices=['xlsx', 'csv'], default='xlsx')
    filters = serializers.DictField(required=False, default=dict)


class ApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Approval
        fields = [
            'id',
            'entity_type',
            'entity_id',
            'status',
            'requested_by',
            'approved_by',
            'rejected_by',
            'comment',
            'rejection_reason',
            'requested_at',
            'approved_at',
            'rejected_at',
        ]
        read_only_fields = ['id', 'status', 'approved_by', 'rejected_by', 'requested_at', 'approved_at', 'rejected_at']


class CaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            'id',
            'title',
            'description',
            'severity',
            'status',
            'pl_reference',
            'document',
            'opened_at',
            'closed_at',
            'assigned_to',
            'resolution',
            'resolved_by',
            'resolved_at',
        ]
        read_only_fields = ['id', 'opened_at', 'closed_at', 'resolved_at']

