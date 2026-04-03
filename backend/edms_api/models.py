"""
LDO-2 EDMS - Django Models
Core data models for the document management system
"""

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django_fsm import FSMField, transition
import uuid

class Document(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('In Review', 'In Review'),
        ('Approved', 'Approved'),
        ('Obsolete', 'Obsolete'),
    ]
    
    TYPE_CHOICES = [
        ('PDF', 'PDF'),
        ('TIFF', 'TIFF'),
        ('PRT', 'PRT'),
        ('Word', 'Word'),
        ('Excel', 'Excel'),
        ('Image', 'Image'),
        ('Other', 'Other'),
    ]
    
    OCR_STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('Processing', 'Processing'),
        ('Completed', 'Completed'),
        ('Failed', 'Failed'),
    ]

    SOURCE_SYSTEM_CHOICES = [
        ('UPLOAD', 'Upload'),
        ('FILE_SHARE', 'File Share'),
        ('NETWORK_SHARE', 'Network Share'),
        ('SCANNER', 'Scanner'),
        ('EMAIL', 'Email'),
        ('IMPORT', 'Import'),
    ]

    DUPLICATE_STATUS_CHOICES = [
        ('UNIQUE', 'Unique'),
        ('MASTER', 'Master'),
        ('DUPLICATE', 'Duplicate'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='PDF')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    
    # File & Storage
    file = models.FileField(upload_to='documents/')
    size = models.BigIntegerField(default=0)  # In bytes
    file_hash = models.CharField(max_length=64, blank=True, null=True)  # SHA-256
    source_system = models.CharField(max_length=20, choices=SOURCE_SYSTEM_CHOICES, default='UPLOAD')
    external_file_path = models.TextField(blank=True, null=True)
    source_created_at = models.DateTimeField(blank=True, null=True)
    source_modified_at = models.DateTimeField(blank=True, null=True)
    fingerprint_3x64k = models.CharField(max_length=64, blank=True, null=True)
    hash_algo = models.CharField(max_length=50, default='sha256')
    hash_version = models.PositiveSmallIntegerField(default=1)
    hash_indexed_at = models.DateTimeField(blank=True, null=True)
    content_index = models.ForeignKey(
        'DocumentContentIndex',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents',
    )
    duplicate_status = models.CharField(max_length=20, choices=DUPLICATE_STATUS_CHOICES, default='UNIQUE')
    duplicate_group_key = models.CharField(max_length=255, blank=True, null=True)
    document_family_key = models.CharField(max_length=255, blank=True, null=True)
    duplicate_of = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicate_children',
    )
    duplicate_marked_at = models.DateTimeField(blank=True, null=True)
    
    # OCR
    ocr_status = models.CharField(max_length=20, choices=OCR_STATUS_CHOICES, default='Not Started')
    ocr_confidence = models.FloatField(default=0.0)  # 0-100
    extracted_text = models.TextField(blank=True, null=True)
    search_text = models.TextField(blank=True, default='')
    search_metadata = models.JSONField(default=dict, blank=True)
    search_indexed_at = models.DateTimeField(blank=True, null=True)
    
    # Linking
    linked_pl = models.CharField(max_length=100, blank=True, null=True)  # PL reference
    category = models.CharField(max_length=100, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Audit
    revision = models.IntegerField(default=1)
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['author']),
            models.Index(fields=['ocr_status']),
            models.Index(fields=['search_indexed_at']),
            models.Index(fields=['source_system']),
            models.Index(fields=['source_system', 'duplicate_status']),
            models.Index(fields=['source_system', 'created_at']),
            models.Index(fields=['duplicate_status']),
            models.Index(fields=['duplicate_group_key']),
            models.Index(fields=['document_family_key']),
            models.Index(fields=['category']),
            models.Index(fields=['linked_pl']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['linked_pl', 'created_at']),
            models.Index(fields=['size', 'fingerprint_3x64k']),
            models.Index(fields=['file_hash']),
        ]
    
    def __str__(self):
        return f"{self.name} (v{self.revision})"
    
    def create_version(self, file, user):
        """Create a new version of this document"""
        self.revision += 1
        self.file = file
        self.size = getattr(file, 'size', self.size)
        self.author = user
        self.updated_at = timezone.now()
        self.save()
        version, _ = DocumentVersion.objects.update_or_create(
            document=self,
            revision=self.revision,
            defaults={
                'file': self.file,
                'size': self.size,
                'author': user,
            }
        )
        return version

class DocumentVersion(models.Model):
    """Track document revision history"""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    revision = models.IntegerField()
    file = models.FileField(upload_to='documents/versions/')
    size = models.BigIntegerField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    change_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-revision']
        unique_together = ['document', 'revision']
    
    def __str__(self):
        return f"{self.document.name} v{self.revision}"


class DocumentContentIndex(models.Model):
    content_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    size_bytes = models.BigIntegerField()
    fingerprint_3x64k = models.CharField(max_length=64)
    full_hash_sha256 = models.CharField(max_length=64, blank=True, null=True)
    hash_algo = models.CharField(max_length=50, default='sha256')
    hash_version = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_seen_at']
        unique_together = ['size_bytes', 'fingerprint_3x64k', 'hash_version']
        indexes = [
            models.Index(fields=['size_bytes', 'fingerprint_3x64k']),
            models.Index(fields=['full_hash_sha256']),
        ]

    def __str__(self):
        return f"{self.size_bytes}:{self.fingerprint_3x64k}"

class WorkRecord(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('SUBMITTED', 'Submitted'),
        ('VERIFIED', 'Verified'),
        ('CLOSED', 'Closed'),
        ('Open', 'Open (Legacy)'),
        ('In Progress', 'In Progress (Legacy)'),
        ('Completed', 'Completed (Legacy)'),
        ('Closed', 'Closed (Legacy)'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    description = models.TextField()
    work_category = models.CharField(max_length=50)
    work_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    
    # Work Details
    date = models.DateField()
    completion_date = models.DateField(blank=True, null=True)
    closing_date = models.DateField(blank=True, null=True)
    closed_date = models.DateField(blank=True, null=True)
    dispatch_date = models.DateField(blank=True, null=True)
    pl_number = models.CharField(max_length=100, blank=True, null=True)
    eoffice_number = models.CharField(max_length=100, blank=True, null=True)
    drawing_number = models.CharField(max_length=100, blank=True, null=True)
    tender_number = models.CharField(max_length=100, blank=True, null=True)
    section_type = models.CharField(max_length=100, blank=True, null=True)
    concerned_officer = models.CharField(max_length=255, blank=True, null=True)
    consent_given = models.CharField(max_length=50, blank=True, null=True)
    user_section = models.CharField(max_length=100, blank=True, null=True)
    
    # Tracking
    days_taken = models.IntegerField(default=0)
    target_days = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    verification_date = models.DateField(blank=True, null=True)
    
    # Responsibility
    user_name = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='work_records')
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_records')
    
    # Notes
    remarks = models.TextField(blank=True, null=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['user_name']),
            models.Index(fields=['date']),
            models.Index(fields=['status', 'date']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.pl_number} - {self.work_category} ({self.status})"

class PlItem(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('UNDER_REVIEW', 'Under Review'),
        ('OBSOLETE', 'Obsolete'),
    ]
    VENDOR_TYPE_CHOICES = [
        ('VD', 'Vendor Directory'),
        ('NVD', 'Non-Vendor Directory'),
    ]
    SAFETY_CLASSIFICATION_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    pl_number_validator = RegexValidator(
        regex=r'^\d{8}$',
        message='PL number must be exactly 8 digits.',
    )

    id = models.CharField(max_length=8, primary_key=True, validators=[pl_number_validator])
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    part_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Metadata
    category = models.CharField(max_length=100, blank=True, null=True)
    controlling_agency = models.CharField(max_length=100, blank=True, null=True)
    safety_critical = models.BooleanField(default=False)
    safety_classification = models.CharField(
        max_length=20,
        choices=SAFETY_CLASSIFICATION_CHOICES,
        blank=True,
        null=True,
    )
    severity_of_failure = models.CharField(max_length=255, blank=True, null=True)
    consequences = models.TextField(blank=True, null=True)
    functionality = models.TextField(blank=True, null=True)
    application_area = models.CharField(max_length=255, blank=True, null=True)
    used_in = models.JSONField(default=list, blank=True)
    drawing_numbers = models.JSONField(default=list, blank=True)
    spec_numbers = models.JSONField(default=list, blank=True)
    mother_part = models.CharField(max_length=100, blank=True, null=True)
    uvam_item_id = models.CharField(max_length=100, blank=True, null=True)
    str_number = models.CharField(max_length=100, blank=True, null=True)
    eligibility_criteria = models.TextField(blank=True, null=True)
    procurement_conditions = models.TextField(blank=True, null=True)
    design_supervisor = models.CharField(max_length=255, blank=True, null=True)
    concerned_supervisor = models.CharField(max_length=255, blank=True, null=True)
    eoffice_file = models.CharField(max_length=255, blank=True, null=True)
    vendor_type = models.CharField(max_length=10, choices=VENDOR_TYPE_CHOICES, blank=True, null=True)
    recent_activity = models.JSONField(default=list, blank=True)
    engineering_changes = models.JSONField(default=list, blank=True)
    linked_work_ids = models.JSONField(default=list, blank=True)
    linked_case_ids = models.JSONField(default=list, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    specifications = models.JSONField(default=dict, blank=True)
    current_released_baseline = models.ForeignKey(
        'Baseline',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='released_for_pl_items',
    )
    
    # Audit
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return self.name

    def clean(self):
        if self.vendor_type == 'VD' and not (self.uvam_item_id or '').strip():
            raise ValidationError({'uvam_item_id': 'UVAM item ID is required for vendor directory items.'})

    def save(self, *args, **kwargs):
        if not self.part_number:
            self.part_number = self.id
        self.full_clean()
        super().save(*args, **kwargs)


class PlDocumentLink(models.Model):
    ROLE_CHOICES = [
        ('GENERAL', 'General'),
        ('DRAWING', 'Drawing'),
        ('TECHNICAL_EVALUATION', 'Technical Evaluation'),
        ('ELIGIBILITY', 'Eligibility'),
        ('PROCUREMENT', 'Procurement'),
        ('SPECIFICATION', 'Specification'),
        ('CERTIFICATE', 'Certificate'),
        ('OTHER', 'Other'),
    ]

    pl_item = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='document_links')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='pl_links')
    link_role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='GENERAL')
    notes = models.TextField(blank=True, null=True)
    linked_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-linked_at']
        unique_together = ['pl_item', 'document']

    def __str__(self):
        return f"{self.pl_item_id} -> {self.document_id} ({self.link_role})"


class SupervisorDocumentReview(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('BYPASSED', 'Bypassed'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    pl_item = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='document_reviews')
    latest_document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='latest_document_reviews')
    previous_document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='previous_document_reviews',
    )
    latest_revision = models.IntegerField(default=1)
    previous_revision = models.IntegerField(null=True, blank=True)
    document_family_key = models.CharField(max_length=255, db_index=True)
    design_supervisor = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    change_summary = models.TextField(blank=True, null=True)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_document_reviews',
    )
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_document_reviews',
    )
    resolution_notes = models.TextField(blank=True, null=True)
    bypass_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['pl_item', 'status']),
            models.Index(fields=['latest_document', 'status']),
        ]

    def __str__(self):
        return f"{self.pl_item_id} review for {self.latest_document_id} ({self.status})"


class PlBomLine(models.Model):
    parent = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='bom_children')
    child = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='bom_parents')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=1)
    unit_of_measure = models.CharField(max_length=20, default='EA')
    find_number = models.CharField(max_length=50)
    line_order = models.PositiveIntegerField(default=0)
    reference_designator = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['line_order', 'find_number', 'id']
        unique_together = ['parent', 'find_number']

    def __str__(self):
        return f"{self.parent_id} -> {self.child_id} ({self.find_number})"

    def clean(self):
        if self.parent_id == self.child_id:
            raise ValidationError('Parent and child PL numbers cannot be the same.')

        if not self.child_id:
            return

        expected_uom = ''
        if self.child_id and getattr(self.child, 'specifications', None):
            specs = self.child.specifications or {}
            expected_uom = str(specs.get('unit_of_measure') or specs.get('uom') or '').strip().upper()
        if expected_uom and str(self.unit_of_measure or '').strip().upper() != expected_uom:
            raise ValidationError({'unit_of_measure': f'Unit of measure must match child PL expected unit {expected_uom}.'})

        descendants = {self.child_id}
        frontier = [self.child_id]
        while frontier:
            next_frontier = list(
                PlBomLine.objects.filter(parent_id__in=frontier).values_list('child_id', flat=True)
            )
            if self.parent_id in next_frontier:
                raise ValidationError('This BOM relation creates a cycle.')
            frontier = [node for node in next_frontier if node not in descendants]
            descendants.update(frontier)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ChangeRequest(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('IMPLEMENTED', 'Implemented'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    pl_item = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='change_requests')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    impact_summary = models.TextField(blank=True, null=True)
    source_baseline = models.ForeignKey(
        'Baseline',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_change_requests',
    )
    status = FSMField(default='DRAFT', choices=STATUS_CHOICES, protected=True)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_change_requests',
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_change_requests',
    )
    release_notes = models.TextField(blank=True, null=True)
    decision_notes = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['pl_item', 'status']),
            models.Index(fields=['status', 'requested_at']),
        ]

    def __str__(self):
        return f"{self.id} - {self.title} ({self.status})"

    @transition(field=status, source='DRAFT', target='UNDER_REVIEW')
    def submit(self):
        return self

    @transition(field=status, source='UNDER_REVIEW', target='APPROVED')
    def approve(self):
        return self

    @transition(field=status, source='UNDER_REVIEW', target='REJECTED')
    def reject(self):
        return self

    @transition(field=status, source='APPROVED', target='IMPLEMENTED')
    def implement(self):
        return self


class ChangeNotice(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued'),
        ('APPROVED', 'Approved'),
        ('RELEASED', 'Released'),
        ('CLOSED', 'Closed'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    change_request = models.ForeignKey(ChangeRequest, on_delete=models.CASCADE, related_name='change_notices')
    notice_number = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    effectivity_date = models.DateField(null=True, blank=True)
    status = FSMField(default='DRAFT', choices=STATUS_CHOICES, protected=True)
    issued_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_change_notices',
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_change_notices',
    )
    released_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='released_change_notices',
    )
    closed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_change_notices',
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    decision_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['change_request', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.notice_number} ({self.status})"

    @transition(field=status, source='DRAFT', target='ISSUED')
    def issue(self):
        return self

    @transition(field=status, source='ISSUED', target='APPROVED')
    def approve(self):
        return self

    @transition(field=status, source='APPROVED', target='RELEASED')
    def release(self):
        return self

    @transition(field=status, source='RELEASED', target='CLOSED')
    def close(self):
        return self


class Baseline(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('RELEASED', 'Released'),
        ('SUPERSEDED', 'Superseded'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    pl_item = models.ForeignKey(PlItem, on_delete=models.CASCADE, related_name='baselines')
    baseline_number = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    status = FSMField(default='DRAFT', choices=STATUS_CHOICES, protected=True)
    source_change_request = models.ForeignKey(
        ChangeRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baselines',
    )
    source_change_notice = models.ForeignKey(
        ChangeNotice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baselines',
    )
    impact_preview = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_baselines',
    )
    released_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='released_baselines',
    )
    superseded_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supersedes',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    superseded_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['pl_item', 'baseline_number']
        indexes = [
            models.Index(fields=['pl_item', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.pl_item_id} {self.baseline_number} ({self.status})"

    @transition(field=status, source='DRAFT', target='RELEASED')
    def release(self):
        return self

    @transition(field=status, source='RELEASED', target='SUPERSEDED')
    def supersede(self):
        return self


class BaselineItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('PL_ITEM', 'PL Item'),
        ('BOM_LINE', 'BOM Line'),
        ('DOCUMENT', 'Document'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    baseline = models.ForeignKey(Baseline, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    source_object_id = models.CharField(max_length=100, blank=True, null=True)
    parent_pl = models.ForeignKey(
        PlItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baseline_parent_items',
    )
    child_pl = models.ForeignKey(
        PlItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baseline_child_items',
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='baseline_items',
    )
    document_revision = models.IntegerField(null=True, blank=True)
    document_status = models.CharField(max_length=20, blank=True, null=True)
    link_role = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=20, blank=True, null=True)
    find_number = models.CharField(max_length=50, blank=True, null=True)
    line_order = models.PositiveIntegerField(default=0)
    reference_designator = models.CharField(max_length=100, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    snapshot_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['line_order', 'created_at', 'id']
        indexes = [
            models.Index(fields=['baseline', 'item_type']),
            models.Index(fields=['baseline', 'line_order']),
            models.Index(fields=['document', 'item_type']),
        ]

    def __str__(self):
        return f"{self.baseline_id} {self.item_type} {self.source_object_id or self.id}"

class Case(models.Model):
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]
    
    SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    
    # Reference
    pl_reference = models.CharField(max_length=100, blank=True, null=True)
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Dates
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Responsibility
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases')
    
    # Resolution
    resolution = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_cases')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-opened_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['assigned_to']),
        ]
    
    def __str__(self):
        return f"{self.id} - {self.title}"

class OcrJob(models.Model):
    STATUS_CHOICES = [
        ('Queued', 'Queued'),
        ('Processing', 'Processing'),
        ('Completed', 'Completed'),
        ('Failed', 'Failed'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    document = models.OneToOneField(Document, on_delete=models.CASCADE, related_name='ocr_job')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Queued')
    
    # Processing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Result
    extracted_text = models.TextField(blank=True, null=True)
    confidence = models.FloatField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    
    # Audit
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"OCR Job for {self.document.name} ({self.status})"

class Approval(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    
    # Entity reference (polymorphic)
    entity_type = models.CharField(max_length=50)  # 'document', 'case', etc.
    entity_id = models.CharField(max_length=100)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    # Audit
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approval_requests')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approvals_given')
    rejected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approvals_rejected')
    
    # Details
    comment = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Dates
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['requested_by']),
        ]
    
    def __str__(self):
        return f"Approval for {self.entity_type}:{self.entity_id} ({self.status})"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('DOWNLOAD', 'Download'),
        ('EXPORT', 'Export'),
        ('SEARCH', 'Search'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('APPROVE', 'Approve'),
        ('BYPASS', 'Bypass'),
        ('REJECT', 'Reject'),
        ('REVIEW', 'Review'),
        ('OCR', 'OCR'),
    ]
    
    MODULE_CHOICES = [
        ('Document', 'Document'),
        ('WorkRecord', 'WorkRecord'),
        ('Case', 'Case'),
        ('User', 'User'),
        ('System', 'System'),
        ('OCR', 'OCR'),
        ('Approval', 'Approval'),
        ('ConfigMgmt', 'ConfigMgmt'),
    ]
    
    SEVERITY_CHOICES = [
        ('Info', 'Info'),
        ('Warning', 'Warning'),
        ('Error', 'Error'),
        ('Critical', 'Critical'),
    ]

    id = models.CharField(max_length=50, primary_key=True, default=uuid.uuid4)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    entity = models.CharField(max_length=255, blank=True, null=True)  # ID or name of affected entity
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Info')
    details = models.JSONField(default=dict, blank=True)  # Additional context
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action']),
            models.Index(fields=['user']),
            models.Index(fields=['module']),
            models.Index(fields=['severity']),
            models.Index(fields=['created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['module', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.module} by {self.user} at {self.created_at}"
    
    @classmethod
    def log(cls, action, module, user=None, entity=None, severity='Info', details=None, ip_address=None):
        """Convenience method to create audit log entry"""
        return cls.objects.create(
            action=action,
            module=module,
            user=user,
            entity=entity,
            severity=severity,
            details=details or {},
            ip_address=ip_address,
        )
