from datetime import datetime
import hashlib
import json
import re
import uuid
from django.conf import settings
from pathlib import Path

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django_celery_beat.models import IntervalSchedule, PeriodicTask
from rest_framework.exceptions import ValidationError

from edms_api.models import Document, OcrJob
from documents.indexing import PATTERN_ENTITY_TYPES, PATTERN_REGISTRY, DocumentDeduplicationService, DocumentFingerprintService, DocumentIndexOrchestrator, DocumentPathResolver
from documents.models import CrawlJob, DocumentMetadataAssertion, DocumentOcrEntity, DocumentOcrPage, DuplicateDecision, HashBackfillJob, IndexedSource, IndexedSourceFileState
from shared.permissions import PermissionService
from shared.services import AuditService, EventService


class DocumentService:
    @staticmethod
    def queryset(params, user=None):
        queryset = PermissionService.scope_queryset(Document.objects.all(), user, 'view_document')
        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        ocr_filter = params.get('ocr_status')
        if ocr_filter:
            queryset = queryset.filter(ocr_status=ocr_filter)
        duplicates_filter = params.get('duplicates', 'include').lower()
        if duplicates_filter == 'exclude':
            queryset = queryset.exclude(duplicate_status='DUPLICATE')
        elif duplicates_filter == 'only':
            queryset = queryset.filter(duplicate_status='DUPLICATE')
        source_filter = params.get('source') or params.get('source_system')
        if source_filter:
            queryset = queryset.filter(source_system=source_filter)
        class_filter = params.get('class') or params.get('category')
        if class_filter:
            queryset = queryset.filter(category__icontains=class_filter)
        hash_status = (params.get('hash_status') or '').lower()
        if hash_status == 'present':
            queryset = queryset.exclude(fingerprint_3x64k__isnull=True).exclude(fingerprint_3x64k='')
        elif hash_status == 'full':
            queryset = queryset.exclude(file_hash__isnull=True).exclude(file_hash='')
        elif hash_status == 'missing':
            queryset = queryset.filter(Q(fingerprint_3x64k__isnull=True) | Q(fingerprint_3x64k=''))
        pl_linked = (params.get('pl_linked') or '').lower()
        if pl_linked in {'true', 'linked', 'yes'}:
            queryset = queryset.exclude(linked_pl__isnull=True).exclude(linked_pl='')
        elif pl_linked in {'false', 'unlinked', 'no'}:
            queryset = queryset.filter(Q(linked_pl__isnull=True) | Q(linked_pl=''))
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(id__icontains=search)
                | Q(linked_pl__icontains=search)
                | Q(category__icontains=search)
                | Q(type__icontains=search)
                | Q(description__icontains=search)
                | Q(search_text__icontains=search)
                | Q(external_file_path__icontains=search)
            )
        return queryset.order_by('-created_at')

    @staticmethod
    def create(serializer, user, request):
        document = serializer.save(author=user)
        PermissionService.grant_default_object_permissions(document, user)
        if document.file:
            document.size = getattr(document.file, 'size', document.size)
            document.save(update_fields=['size'])
        if document.linked_pl:
            from edms_api.models import PlDocumentLink, PlItem
            from config_mgmt.services import SupervisorDocumentReviewService

            pl_item = PlItem.objects.filter(id=document.linked_pl).first()
            if pl_item:
                PlDocumentLink.objects.get_or_create(
                    pl_item=pl_item,
                    document=document,
                    defaults={'link_role': 'GENERAL'},
                )
                SupervisorDocumentReviewService.create_or_refresh_for_link(
                    pl_item,
                    document,
                    requested_by=user,
                )
        AuditService.log('CREATE', 'Document', user=user, entity=document.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'DocumentRegistered',
            'Document',
            document.id,
            {
                'name': document.name,
                'type': document.type,
                'status': document.status,
                'revision': document.revision,
            },
            idempotency_key=f'document-create:{document.id}:{document.revision}',
        )
        return document

    @staticmethod
    @transaction.atomic
    def ingest(validated_data, user, request):
        file_obj = validated_data['file']
        raw_tags = validated_data.get('tags') or []
        template_fields = validated_data.get('template_fields') or {}
        revision_label = (validated_data.get('revision_label') or '').strip() or f"{validated_data['normalized_revision']}"
        doc_type = (validated_data.get('doc_type') or '').strip()
        linked_pl = (validated_data.get('linked_pl') or '').strip()
        metadata_tags = [tag for tag in raw_tags if tag]
        if doc_type and doc_type not in metadata_tags:
            metadata_tags.append(doc_type)
        if validated_data['category'] and validated_data['category'] not in metadata_tags:
            metadata_tags.append(validated_data['category'])

        document = Document.objects.create(
            id=f"DOC-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}",
            name=validated_data['name'].strip(),
            description=(validated_data.get('description') or '').strip(),
            type=validated_data['resolved_file_type'],
            status='In Review',
            file=file_obj,
            size=getattr(file_obj, 'size', 0),
            source_system=validated_data.get('source_system') or 'UPLOAD',
            linked_pl=linked_pl or None,
            category=validated_data['category'].strip(),
            tags=metadata_tags,
            revision=validated_data['normalized_revision'],
            author=user,
            search_metadata={
                'ingest': {
                    'revision_label': revision_label,
                    'document_role': doc_type,
                    'template_id': validated_data.get('template_id') or '',
                    'template_fields': template_fields,
                }
            },
        )
        PermissionService.grant_default_object_permissions(document, user)

        index_job_id = None
        ocr_job_id = None
        index_job_mode = 'queued'
        ocr_job_mode = None

        try:
            from .tasks import index_single_document

            task_result = index_single_document.delay(str(document.id))
            index_job_id = str(task_result.id)
        except Exception:
            index_job_mode = 'inline'
            indexed = DocumentIndexOrchestrator.index_document(document, force_hashes=True)
            document = indexed

        if linked_pl:
            from edms_api.models import PlDocumentLink, PlItem
            from config_mgmt.services import SupervisorDocumentReviewService

            pl_item = PlItem.objects.filter(id=linked_pl).first()
            if pl_item:
                PlDocumentLink.objects.get_or_create(
                    pl_item=pl_item,
                    document=document,
                    defaults={'link_role': 'GENERAL'},
                )
                SupervisorDocumentReviewService.create_or_refresh_for_link(
                    pl_item,
                    document,
                    requested_by=user,
                )

        if validated_data.get('ocr_requested', True):
            ocr_job, _ = OcrApplicationService.start_job(str(document.id), user, request)
            ocr_job_id = str(ocr_job.id)
            ocr_job_mode = 'queued'

        AuditService.log('CREATE', 'Document', user=user, entity=document.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'DocumentRegistered',
            'Document',
            document.id,
            {
                'name': document.name,
                'type': document.type,
                'status': document.status,
                'revision': document.revision,
                'revision_label': revision_label,
                'linked_pl': document.linked_pl or '',
            },
            idempotency_key=f'document-ingest:{document.id}:{document.revision}',
        )

        return {
            'document': document,
            'index_job_id': index_job_id,
            'ocr_job_id': ocr_job_id,
            'index_job_mode': index_job_mode,
            'ocr_job_mode': ocr_job_mode,
            'pl_linked': bool(linked_pl),
            'warnings': [],
        }

    @staticmethod
    def create_version(document, file, user, request):
        previous_revision = document.revision
        version = document.create_version(file, user)
        metadata = dict(document.search_metadata or {})
        metadata.pop('ocr', None)
        document.ocr_status = 'Not Started'
        document.ocr_confidence = 0.0
        document.extracted_text = ''
        document.search_metadata = metadata
        document.save(update_fields=['ocr_status', 'ocr_confidence', 'extracted_text', 'search_metadata', 'updated_at'])
        DocumentOcrPage.objects.filter(document=document).delete()
        DocumentOcrEntity.objects.filter(document=document).delete()
        if document.linked_pl:
            from edms_api.models import PlItem
            from config_mgmt.services import SupervisorDocumentReviewService

            pl_item = PlItem.objects.filter(id=document.linked_pl).first()
            if pl_item:
                SupervisorDocumentReviewService.create_or_refresh_for_link(
                    pl_item,
                    document,
                    requested_by=user,
                    previous_revision=previous_revision,
                )
        try:
            from .tasks import index_single_document

            index_single_document.delay(str(document.id))
        except Exception:
            DocumentIndexOrchestrator.index_document(document, force_hashes=True)

        OcrApplicationService.start_job(str(document.id), user, request)
        AuditService.log('UPDATE', 'Document', user=user, entity=document.id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'DocumentSuperseded',
            'Document',
            document.id,
            {'revision': document.revision},
            idempotency_key=f'document-version:{document.id}:{document.revision}',
        )
        return version


class DocumentMetadataService:
    @staticmethod
    def _document_queryset(user=None):
        return PermissionService.scope_queryset(Document.objects.all(), user, 'view_document')

    @classmethod
    def get_document(cls, document_id, user=None):
        return cls._document_queryset(user).get(id=document_id)

    @classmethod
    def list_entities(cls, document_id, user=None):
        document = cls.get_document(document_id, user)
        return DocumentOcrEntity.objects.filter(document=document).order_by('entity_type', 'entity_value')

    @classmethod
    def list_assertions(cls, document_id, user=None):
        document = cls.get_document(document_id, user)
        return DocumentMetadataAssertion.objects.filter(document=document).order_by('field_key', '-updated_at')

    @staticmethod
    def _set_entity_review(entity: DocumentOcrEntity, *, status_value: str, user=None, notes: str = ''):
        entity.review_status = status_value
        entity.reviewed_by = user if getattr(user, 'is_authenticated', False) else None
        entity.reviewed_at = timezone.now()
        entity.review_notes = notes
        entity.save(update_fields=['review_status', 'reviewed_by', 'reviewed_at', 'review_notes', 'updated_at'])
        return entity

    @classmethod
    def approve_entity(cls, document_id, entity_id, user=None, notes: str = ''):
        document = cls.get_document(document_id, user)
        entity = DocumentOcrEntity.objects.get(document=document, id=entity_id)
        cls._set_entity_review(entity, status_value='CONFIRMED', user=user, notes=notes)
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return entity

    @classmethod
    def reject_entity(cls, document_id, entity_id, user=None, notes: str = ''):
        document = cls.get_document(document_id, user)
        entity = DocumentOcrEntity.objects.get(document=document, id=entity_id)
        cls._set_entity_review(entity, status_value='REJECTED', user=user, notes=notes)
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return entity

    @classmethod
    def promote_entity_to_assertion(cls, document_id, entity_id, field_key: str, user=None, notes: str = ''):
        document = cls.get_document(document_id, user)
        entity = DocumentOcrEntity.objects.get(document=document, id=entity_id)
        cls._set_entity_review(entity, status_value='CONFIRMED', user=user, notes=notes)
        assertion = DocumentMetadataAssertion.objects.create(
            document=document,
            field_key=field_key,
            value=entity.entity_value,
            normalized_value=entity.normalized_value,
            source='manual',
            derived_from_entity=entity,
            status='APPROVED',
            approved_by=user if getattr(user, 'is_authenticated', False) else None,
            approved_at=timezone.now(),
            notes=notes,
        )
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return assertion

    @classmethod
    def create_assertion(cls, document_id, *, field_key: str, value: str, user=None, notes: str = '', status_value: str = 'APPROVED'):
        document = cls.get_document(document_id, user)
        normalized_value = DocumentOcrProcessingService._normalize_entity_value(field_key.upper(), value)
        assertion = DocumentMetadataAssertion.objects.create(
            document=document,
            field_key=field_key,
            value=value,
            normalized_value=normalized_value,
            source='manual',
            status=status_value,
            approved_by=user if status_value == 'APPROVED' and getattr(user, 'is_authenticated', False) else None,
            approved_at=timezone.now() if status_value == 'APPROVED' else None,
            notes=notes,
        )
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return assertion

    @classmethod
    def approve_assertion(cls, document_id, assertion_id, user=None, notes: str = ''):
        document = cls.get_document(document_id, user)
        assertion = DocumentMetadataAssertion.objects.get(document=document, id=assertion_id)
        assertion.status = 'APPROVED'
        assertion.approved_by = user if getattr(user, 'is_authenticated', False) else None
        assertion.approved_at = timezone.now()
        if notes:
            assertion.notes = notes
        assertion.save(update_fields=['status', 'approved_by', 'approved_at', 'notes', 'updated_at'])
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return assertion

    @classmethod
    def reject_assertion(cls, document_id, assertion_id, user=None, notes: str = ''):
        document = cls.get_document(document_id, user)
        assertion = DocumentMetadataAssertion.objects.get(document=document, id=assertion_id)
        assertion.status = 'REJECTED'
        assertion.rejected_by = user if getattr(user, 'is_authenticated', False) else None
        assertion.rejected_at = timezone.now()
        if notes:
            assertion.notes = notes
        assertion.save(update_fields=['status', 'rejected_by', 'rejected_at', 'notes', 'updated_at'])
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)
        return assertion

    @classmethod
    def reindex_metadata(cls, document_id, user=None):
        document = cls.get_document(document_id, user)
        return DocumentIndexOrchestrator.index_document(document, force_hashes=False)


class IndexedSourceService:
    SOURCE_SCHEDULE_PREFIX = 'edms:crawl-source:'
    HASH_BACKFILL_SCHEDULE_NAME = 'edms:hash-backfill'

    @staticmethod
    @transaction.atomic
    def create_or_update(validated_data, request=None):
        source_id = validated_data.get('id')
        defaults = {
            'name': validated_data['name'],
            'root_path': validated_data['root_path'],
            'source_system': validated_data.get('source_system') or 'NETWORK_SHARE',
            'is_active': validated_data.get('is_active', True),
            'watch_enabled': validated_data.get('watch_enabled', True),
            'include_extensions': validated_data.get('include_extensions', []),
            'exclude_patterns': validated_data.get('exclude_patterns', []),
            'scan_interval_minutes': validated_data.get('scan_interval_minutes', 60),
            'created_by': request.user if request and request.user.is_authenticated else None,
        }
        if source_id:
            source, _ = IndexedSource.objects.update_or_create(id=source_id, defaults=defaults)
        else:
            source = IndexedSource.objects.create(**defaults)
        PermissionService.grant_default_object_permissions(
            source,
            request.user if request and request.user.is_authenticated else None,
            actions=('view', 'change'),
        )
        AuditService.log(
            'CREATE',
            'Document',
            user=request.user if request else None,
            entity=str(source.id),
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )
        IndexedSourceService.sync_source_schedule(source)
        return source

    @staticmethod
    def _schedule_or_replace(name: str, task: str, every_minutes: int, args: list[str]):
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=max(int(every_minutes), 1),
            period=IntervalSchedule.MINUTES,
        )
        PeriodicTask.objects.update_or_create(
            name=name,
            defaults={
                'task': task,
                'interval': schedule,
                'args': json.dumps(args),
                'enabled': True,
            },
        )

    @classmethod
    def _source_schedule_name(cls, source_id) -> str:
        return f'{cls.SOURCE_SCHEDULE_PREFIX}{source_id}'

    @classmethod
    def disable_source_schedule(cls, source_or_id):
        source_id = getattr(source_or_id, 'id', source_or_id)
        PeriodicTask.objects.filter(name=cls._source_schedule_name(source_id)).update(enabled=False)

    @classmethod
    def ensure_source_schedule(cls, source: IndexedSource):
        if not source.is_active:
            cls.disable_source_schedule(source)
            return
        cls._schedule_or_replace(
            name=cls._source_schedule_name(source.id),
            task='documents.tasks.queue_indexed_source_crawl',
            every_minutes=source.scan_interval_minutes or 60,
            args=[str(source.id)],
        )

    @classmethod
    def sync_source_schedule(cls, source: IndexedSource):
        if source.is_active:
            cls.ensure_source_schedule(source)
        else:
            cls.disable_source_schedule(source)

    @classmethod
    def ensure_hash_backfill_schedule(cls):
        interval = max(int(getattr(settings, 'EDMS_HASH_BACKFILL_INTERVAL_MINUTES', 0) or 0), 0)
        if interval <= 0:
            PeriodicTask.objects.filter(name=cls.HASH_BACKFILL_SCHEDULE_NAME).update(enabled=False)
            return

        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=interval,
            period=IntervalSchedule.MINUTES,
        )
        PeriodicTask.objects.update_or_create(
            name=cls.HASH_BACKFILL_SCHEDULE_NAME,
            defaults={
                'task': 'documents.tasks.queue_hash_backfill_job',
                'interval': schedule,
                'kwargs': json.dumps(
                    {
                        'batch_size': int(getattr(settings, 'EDMS_HASH_BACKFILL_BATCH_SIZE', 500) or 500),
                        'force_full_hash': bool(getattr(settings, 'EDMS_HASH_BACKFILL_FORCE_FULL_HASH', False)),
                    }
                ),
                'enabled': True,
            },
        )

    @classmethod
    def sync_runtime_schedules(cls):
        for source in IndexedSource.objects.all().only('id', 'is_active', 'scan_interval_minutes'):
            cls.sync_source_schedule(source)
        cls.ensure_hash_backfill_schedule()


class _DocumentIndexingBatchService:
    EXTENSION_TYPE_MAP = {
        '.pdf': 'PDF',
        '.tif': 'TIFF',
        '.tiff': 'TIFF',
        '.prt': 'PRT',
        '.doc': 'Word',
        '.docx': 'Word',
        '.xls': 'Excel',
        '.xlsx': 'Excel',
        '.png': 'Image',
        '.jpg': 'Image',
        '.jpeg': 'Image',
    }

    @staticmethod
    def _allowed_extension(path: Path, source: IndexedSource) -> bool:
        extension = path.suffix.lower()
        if source.include_extensions and extension not in {item.lower() for item in source.include_extensions}:
            return False
        if source.exclude_patterns:
            normalized = str(path).lower()
            for pattern in source.exclude_patterns:
                if re.search(pattern, normalized):
                    return False
        return True

    @staticmethod
    def _generate_document_id(path: Path) -> str:
        stable_hash = hashlib.sha1(str(path).lower().encode('utf-8')).hexdigest()[:12].upper()
        return f"NET-{stable_hash}"

    @classmethod
    def index_path(cls, path: Path, source: IndexedSource, *, force_full_hash: bool = False):
        if not path.is_file() or not cls._allowed_extension(path, source):
            return None

        document_id = cls._generate_document_id(path)
        stat = path.stat()
        defaults = {
            'name': path.stem,
            'description': f'Indexed from source {source.name}',
            'type': cls.EXTENSION_TYPE_MAP.get(path.suffix.lower(), 'Other'),
            'status': 'Approved',
            'source_system': source.source_system,
            'external_file_path': str(path),
            'size': stat.st_size,
            'category': path.parent.name[:100],
            'file': '',
        }
        document, _ = Document.objects.update_or_create(
            external_file_path=str(path),
            defaults=defaults | {'id': document_id},
        )
        indexed = DocumentIndexOrchestrator.index_document(
            document,
            force_hashes=True,
            force_full_hash=force_full_hash,
        )
        return indexed

    @classmethod
    def index_paths_bulk(cls, paths: list[Path], source: IndexedSource, *, force_full_hash: bool = False) -> list[Document]:
        documents_to_create_or_update = []
        document_ids = []
        path_by_id = {}

        for path in paths:
            if not path.is_file() or not cls._allowed_extension(path, source):
                continue

            document_id = cls._generate_document_id(path)
            stat = path.stat()
            defaults = {
                'id': document_id,
                'name': path.stem,
                'description': f'Indexed from source {source.name}',
                'type': cls.EXTENSION_TYPE_MAP.get(path.suffix.lower(), 'Other'),
                'status': 'Approved',
                'source_system': source.source_system,
                'external_file_path': str(path),
                'size': stat.st_size,
                'category': path.parent.name[:100],
                'file': '',
            }
            documents_to_create_or_update.append(Document(**defaults))
            document_ids.append(document_id)
            path_by_id[document_id] = path

        if not documents_to_create_or_update:
            return []

        Document.objects.bulk_create(
            documents_to_create_or_update,
            update_conflicts=True,
            unique_fields=['id'],
            update_fields=['name', 'description', 'type', 'status', 'source_system', 'external_file_path', 'size', 'category']
        )

        documents = list(Document.objects.filter(id__in=document_ids))

        indexed_documents = DocumentIndexOrchestrator.index_documents_bulk(
            documents,
            force_hashes=True,
            force_full_hash=force_full_hash,
        )
        return indexed_documents


class IndexedSourceFileStateService:
    @staticmethod
    def _relative_path(source: IndexedSource, path: Path) -> str:
        try:
            return str(path.relative_to(Path(source.root_path)))
        except ValueError:
            return path.name

    @staticmethod
    def _aware_timestamp(timestamp: float):
        value = datetime.fromtimestamp(timestamp)
        if timezone.is_naive(value):
            return timezone.make_aware(value)
        return value

    @classmethod
    def state_for_relative_path(cls, source: IndexedSource, relative_path: str):
        return IndexedSourceFileState.objects.filter(source=source, relative_path=relative_path).select_related('document').first()

    @classmethod
    def _update_document_source_metadata(cls, document: Document | None, source: IndexedSource, relative_path: str, *, source_state: str, error_message: str = '', missing_since=None, last_indexed_at=None):
        if not document:
            return

        search_metadata = dict(document.search_metadata or {})
        source_index = dict(search_metadata.get('source_index') or {})
        source_index.update(
            {
                'indexed_source_id': str(source.id),
                'indexed_source_name': source.name,
                'relative_path': relative_path,
                'source_state': source_state,
                'last_error': error_message,
                'missing_since': missing_since.isoformat() if missing_since else '',
                'last_indexed_at': last_indexed_at.isoformat() if last_indexed_at else source_index.get('last_indexed_at', ''),
            }
        )
        search_metadata['source_index'] = source_index
        Document.objects.filter(pk=document.pk).update(search_metadata=search_metadata, updated_at=timezone.now())

    @classmethod
    def mark_success(cls, source: IndexedSource, path: Path, document: Document):
        now = timezone.now()
        stat = path.stat()
        relative_path = cls._relative_path(source, path)
        state, _ = IndexedSourceFileState.objects.update_or_create(
            source=source,
            relative_path=relative_path,
            defaults={
                'absolute_path': str(path),
                'document': document,
                'status': 'ACTIVE',
                'size_bytes': stat.st_size,
                'source_modified_at': cls._aware_timestamp(stat.st_mtime),
                'last_seen_at': now,
                'last_indexed_at': now,
                'missing_since': None,
                'failure_count': 0,
                'last_error': '',
            },
        )
        cls._update_document_source_metadata(document, source, relative_path, source_state='ACTIVE', last_indexed_at=now)
        return state

    @classmethod
    def mark_success_bulk(cls, source: IndexedSource, paths: list[Path], documents: list[Document]):
        now = timezone.now()
        states_to_create_or_update = []
        doc_by_path = {doc.external_file_path: doc for doc in documents}

        for path in paths:
            doc = doc_by_path.get(str(path))
            if not doc:
                continue

            stat = path.stat()
            relative_path = cls._relative_path(source, path)

            states_to_create_or_update.append(IndexedSourceFileState(
                source=source,
                relative_path=relative_path,
                absolute_path=str(path),
                document=doc,
                status='ACTIVE',
                size_bytes=stat.st_size,
                source_modified_at=cls._aware_timestamp(stat.st_mtime),
                last_seen_at=now,
                last_indexed_at=now,
                missing_since=None,
                failure_count=0,
                last_error='',
            ))

            cls._update_document_source_metadata(doc, source, relative_path, source_state='ACTIVE', last_indexed_at=now)

        if states_to_create_or_update:
            IndexedSourceFileState.objects.bulk_create(
                states_to_create_or_update,
                update_conflicts=True,
                unique_fields=['source', 'relative_path'],
                update_fields=['absolute_path', 'document', 'status', 'size_bytes', 'source_modified_at', 'last_seen_at', 'last_indexed_at', 'missing_since', 'failure_count', 'last_error', 'updated_at']
            )

    @classmethod
    def mark_failure(cls, source: IndexedSource, path: Path, error_message: str):
        now = timezone.now()
        relative_path = cls._relative_path(source, path)
        state, _ = IndexedSourceFileState.objects.get_or_create(
            source=source,
            relative_path=relative_path,
            defaults={'absolute_path': str(path)},
        )
        state.absolute_path = str(path)
        state.status = 'FAILED'
        state.last_seen_at = now
        state.last_indexed_at = now
        state.missing_since = None
        state.failure_count += 1
        state.last_error = error_message
        state.save(update_fields=['absolute_path', 'status', 'last_seen_at', 'last_indexed_at', 'missing_since', 'failure_count', 'last_error', 'updated_at'])
        cls._update_document_source_metadata(state.document, source, relative_path, source_state='FAILED', error_message=error_message, last_indexed_at=now)
        return state

    @classmethod
    def mark_missing_for_unseen_paths(cls, source: IndexedSource, seen_relative_paths: set[str]):
        now = timezone.now()
        queryset = IndexedSourceFileState.objects.filter(source=source).exclude(relative_path__in=seen_relative_paths)
        updated_states = []
        for state in queryset.select_related('document'):
            if state.status == 'MISSING':
                continue
            state.status = 'MISSING'
            state.missing_since = now
            state.last_error = 'Source file not found during latest crawl.'
            state.save(update_fields=['status', 'missing_since', 'last_error', 'updated_at'])
            cls._update_document_source_metadata(
                state.document,
                source,
                state.relative_path,
                source_state='MISSING',
                error_message=state.last_error,
                missing_since=now,
            )
            updated_states.append(state)
        return updated_states

    @classmethod
    def mark_path_missing(cls, source: IndexedSource, relative_path: str):
        state = cls.state_for_relative_path(source, relative_path)
        if not state:
            return None

        now = timezone.now()
        state.status = 'MISSING'
        state.missing_since = now
        state.last_error = 'Source file not found during path-scoped crawl.'
        state.save(update_fields=['status', 'missing_since', 'last_error', 'updated_at'])
        cls._update_document_source_metadata(
            state.document,
            source,
            relative_path,
            source_state='MISSING',
            error_message=state.last_error,
            missing_since=now,
        )
        return state

    @classmethod
    def relink_moved_path(cls, source: IndexedSource, old_path: str, new_path: str):
        if not old_path or not new_path:
            return None

        new_file = Path(new_path)
        if not new_file.exists() or not new_file.is_file():
            return None

        old_relative = cls._relative_path(source, Path(old_path))
        new_relative = cls._relative_path(source, new_file)
        if old_relative == new_relative:
            return None
        if cls.state_for_relative_path(source, new_relative):
            return None

        state = cls.state_for_relative_path(source, old_relative)
        if not state or not state.document_id:
            return None

        expected_document = state.document
        current_size = new_file.stat().st_size
        if state.size_bytes and current_size != state.size_bytes:
            return None

        _, sparse_hash = DocumentFingerprintService.build_sparse_fingerprint(new_file)
        if expected_document.fingerprint_3x64k and expected_document.fingerprint_3x64k != sparse_hash:
            return None

        state.relative_path = new_relative
        state.absolute_path = str(new_file)
        state.document = expected_document
        state.status = 'ACTIVE'
        state.size_bytes = current_size
        state.source_modified_at = cls._aware_timestamp(new_file.stat().st_mtime)
        state.last_seen_at = timezone.now()
        state.last_indexed_at = timezone.now()
        state.missing_since = None
        state.last_error = ''
        state.failure_count = 0
        state.save()

        expected_document.external_file_path = str(new_file)
        expected_document.source_system = source.source_system
        expected_document.source_modified_at = state.source_modified_at
        expected_document.save(update_fields=['external_file_path', 'source_system', 'source_modified_at', 'updated_at'])
        indexed_document = DocumentIndexOrchestrator.index_document(expected_document, force_hashes=True, force_full_hash=False)
        cls._update_document_source_metadata(indexed_document, source, new_relative, source_state='ACTIVE', last_indexed_at=state.last_indexed_at)
        EventService.publish(
            'IndexedSourcePathRelinked',
            'IndexedSource',
            source.id,
            {'old_path': old_path, 'new_path': new_path, 'document_id': indexed_document.id},
            idempotency_key=f'indexed-source-relink:{source.id}:{old_relative}:{new_relative}',
        )
        return indexed_document


class CrawlJobService:
    @staticmethod
    @transaction.atomic
    def create_job(source: IndexedSource, request=None, parameters=None):
        job = CrawlJob.objects.create(
            source=source,
            requested_by=request.user if request and request.user.is_authenticated else None,
            parameters=parameters or {},
        )
        PermissionService.grant_default_object_permissions(
            job,
            request.user if request and request.user.is_authenticated else None,
            actions=('view', 'change'),
        )
        AuditService.log(
            'CREATE',
            'Document',
            user=request.user if request else None,
            entity=str(job.id),
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )
        IndexedSourceService.ensure_source_schedule(source)
        return job

    @staticmethod
    @transaction.atomic
    def run_job(job: CrawlJob, *, force_full_hash: bool = False):
        source = job.source
        job.start()
        job.save(update_fields=['status', 'started_at', 'error_message', 'updated_at'])

        discovered = indexed = duplicates = failed = 0
        seen_relative_paths: set[str] = set()
        root = Path(source.root_path)
        parameters = job.parameters or {}
        path_targets = [str(item) for item in (parameters.get('paths') or []) if item]
        legacy_path = parameters.get('path')
        if legacy_path and legacy_path not in path_targets:
            path_targets.append(str(legacy_path))
        scan_paths = path_targets or None
        old_path = str(parameters.get('old_path') or '')
        new_path = str(parameters.get('new_path') or '')
        moved_relinked = False
        try:
            if old_path and new_path:
                moved_document = IndexedSourceFileStateService.relink_moved_path(source, old_path, new_path)
                if moved_document is not None:
                    moved_relinked = True
                    indexed += 1
                    discovered += 1
                    seen_relative_paths.add(IndexedSourceFileStateService._relative_path(source, Path(new_path)))
                    if moved_document.duplicate_status == 'DUPLICATE':
                        duplicates += 1

            if scan_paths:
                candidate_paths = [Path(raw_path) for raw_path in scan_paths]
            else:
                candidate_paths = list(root.rglob('*'))

            valid_paths = []
            for path in candidate_paths:
                if not path.is_file():
                    continue
                if not _DocumentIndexingBatchService._allowed_extension(path, source):
                    continue

                if moved_relinked and new_path and Path(new_path) == path:
                    continue

                valid_paths.append(path)

            batch_size = 500
            for i in range(0, len(valid_paths), batch_size):
                batch_paths = valid_paths[i:i + batch_size]

                try:
                    indexed_documents = _DocumentIndexingBatchService.index_paths_bulk(batch_paths, source, force_full_hash=force_full_hash)

                    IndexedSourceFileStateService.mark_success_bulk(source, batch_paths, indexed_documents)

                    for path in batch_paths:
                        discovered += 1
                        seen_relative_paths.add(IndexedSourceFileStateService._relative_path(source, path))

                    for document in indexed_documents:
                        if document:
                            indexed += 1
                            if document.duplicate_status == 'DUPLICATE':
                                duplicates += 1
                except Exception as exc_bulk:  # pragma: no cover
                    # Fallback to sequential on batch failure
                    for path in batch_paths:
                        discovered += 1
                        seen_relative_paths.add(IndexedSourceFileStateService._relative_path(source, path))
                        try:
                            document = _DocumentIndexingBatchService.index_path(path, source, force_full_hash=force_full_hash)
                            if document:
                                indexed += 1
                                IndexedSourceFileStateService.mark_success(source, path, document)
                                if document.duplicate_status == 'DUPLICATE':
                                    duplicates += 1
                        except Exception as exc:
                            failed += 1
                            job.error_message = str(exc)
                            IndexedSourceFileStateService.mark_failure(source, path, str(exc))

            if scan_paths:
                missing_targets = []
                if old_path and not moved_relinked:
                    missing_targets.append(IndexedSourceFileStateService._relative_path(source, Path(old_path)))
                for raw_path in scan_paths:
                    candidate = Path(raw_path)
                    if candidate.exists():
                        continue
                    missing_targets.append(IndexedSourceFileStateService._relative_path(source, candidate))
                for relative_path in set(missing_targets):
                    IndexedSourceFileStateService.mark_path_missing(source, relative_path)
            else:
                IndexedSourceFileStateService.mark_missing_for_unseen_paths(source, seen_relative_paths)
            job.discovered_count = discovered
            job.indexed_count = indexed
            job.duplicate_count = duplicates
            job.failed_count = failed
            source.last_crawled_at = timezone.now()
            source.last_successful_crawl_at = timezone.now() if failed == 0 else source.last_successful_crawl_at
            source.last_error = job.error_message if failed else ''
            source.save(update_fields=['last_crawled_at', 'last_successful_crawl_at', 'last_error', 'updated_at'])
            if failed:
                job.fail(job.error_message)
            else:
                job.complete()
            job.save(update_fields=['status', 'completed_at', 'discovered_count', 'indexed_count', 'duplicate_count', 'failed_count', 'error_message', 'updated_at'])
        except Exception as exc:
            job.error_message = str(exc)
            job.fail(str(exc))
            job.save(update_fields=['status', 'completed_at', 'error_message', 'updated_at'])
            raise
        return job


class HashBackfillJobService:
    @staticmethod
    @transaction.atomic
    def create_job(request=None, parameters=None, *, batch_size=500, source=None):
        job = HashBackfillJob.objects.create(
            source=source,
            requested_by=request.user if request and request.user.is_authenticated else None,
            parameters=parameters or {},
            batch_size=batch_size or (parameters or {}).get('batch_size', 500),
        )
        PermissionService.grant_default_object_permissions(
            job,
            request.user if request and request.user.is_authenticated else None,
            actions=('view', 'change'),
        )
        AuditService.log(
            'CREATE',
            'Document',
            user=request.user if request else None,
            entity=str(job.id),
            ip_address=request.META.get('REMOTE_ADDR') if request else None,
        )
        return job

    @staticmethod
    @transaction.atomic
    def run_job(job: HashBackfillJob, *, force_full_hash: bool = False):
        job.start()
        job.save(update_fields=['status', 'started_at', 'error_message', 'updated_at'])
        scanned = indexed = full_hashes = 0
        try:
            queryset = Document.objects.filter(Q(fingerprint_3x64k__isnull=True) | Q(fingerprint_3x64k='')).order_by('created_at')
            if job.source_id:
                queryset = queryset.filter(source_system=job.source.source_system)
            for document in queryset.iterator(chunk_size=job.batch_size):
                scanned += 1
                indexed_document = DocumentIndexOrchestrator.index_document(
                    document,
                    force_hashes=True,
                    force_full_hash=force_full_hash,
                )
                indexed += 1
                if indexed_document.file_hash:
                    full_hashes += 1
                if scanned >= job.batch_size:
                    break
            job.documents_scanned = scanned
            job.documents_indexed = indexed
            job.full_hashes_computed = full_hashes
            job.complete()
            job.save(update_fields=['status', 'completed_at', 'documents_scanned', 'documents_indexed', 'full_hashes_computed', 'error_message', 'updated_at'])
        except Exception as exc:
            job.error_message = str(exc)
            job.fail(str(exc))
            job.save(update_fields=['status', 'completed_at', 'error_message', 'updated_at'])
            raise
        return job


class DuplicateDecisionService:
    @staticmethod
    def group_documents(params, user=None):
        queryset = DocumentService.queryset(params, user).filter(duplicate_group_key__isnull=False).exclude(duplicate_group_key='')
        if params.get('duplicates', 'include').lower() == 'exclude':
            return []

        groups: dict[str, list[Document]] = {}
        for document in queryset.select_related('duplicate_of').prefetch_related('metadata_assertions', 'ocr_entities').order_by('duplicate_group_key', '-source_modified_at', '-created_at', '-revision', '-id'):
            groups.setdefault(document.duplicate_group_key, []).append(document)

        decisions = {
            decision.group_key: decision
            for decision in DuplicateDecision.objects.filter(group_key__in=groups.keys())
        }

        payload = []
        for group_key, documents in groups.items():
            if len(documents) < 2:
                continue
            decision = decisions.get(group_key)
            total_bytes = sum(int(document.size or 0) for document in documents)
            master_document = next((document for document in documents if document.duplicate_status == 'MASTER'), documents[0])
            revision_labels = sorted(
                {
                    str((document.search_metadata or {}).get('ingest', {}).get('revision_label') or document.revision)
                    for document in documents
                }
            )
            assertion_map: dict[str, set[str]] = {}
            conflicting_entities: dict[str, set[str]] = {}
            for document in documents:
                for assertion in document.metadata_assertions.all():
                    if assertion.status != 'APPROVED':
                        continue
                    assertion_map.setdefault(assertion.field_key, set()).add(assertion.normalized_value or assertion.value)
                for entity in document.ocr_entities.all():
                    if entity.review_status == 'REJECTED':
                        continue
                    conflicting_entities.setdefault(entity.entity_type, set()).add(entity.normalized_value or entity.entity_value)
            payload.append(
                {
                    'group_key': group_key,
                    'family_key': next((document.document_family_key for document in documents if document.document_family_key), ''),
                    'decision_status': decision.status if decision else 'PENDING',
                    'decision': decision.decision if decision else 'MERGE',
                    'master_document_id': master_document.id if master_document else None,
                    'document_count': len(documents),
                    'total_bytes': total_bytes,
                    'potential_savings_bytes': max(total_bytes - int(master_document.size or 0), 0) if master_document else 0,
                    'documents': documents,
                    'source_systems': sorted({document.source_system for document in documents if document.source_system}),
                    'categories': sorted({document.category for document in documents if document.category}),
                    'hash_status': {
                        'present': sum(1 for document in documents if document.file_hash or document.fingerprint_3x64k),
                        'full': sum(1 for document in documents if document.file_hash),
                        'missing': sum(1 for document in documents if not document.fingerprint_3x64k and not document.file_hash),
                    },
                    'risk_flags': {
                        'mixed_revisions': len(revision_labels) > 1,
                    },
                    'revision_labels': revision_labels,
                    'approved_assertions': [
                        {'field_key': field_key, 'values': sorted(values)}
                        for field_key, values in sorted(assertion_map.items())
                        if len(values) == 1
                    ],
                    'conflicting_entities': [
                        {'entity_type': entity_type, 'values': sorted(values)}
                        for entity_type, values in sorted(conflicting_entities.items())
                        if len(values) > 1
                    ],
                    'decision_record': decision,
                }
            )

        return payload

    @staticmethod
    @transaction.atomic
    def apply_decision(group_key, *, master_document_id=None, decision='MERGE', notes='', user=None):
        documents = list(Document.objects.filter(duplicate_group_key=group_key))
        if not documents:
            raise ValidationError({'group_key': 'Duplicate group not found.'})

        if decision == 'IGNORE':
            record, _ = DuplicateDecision.objects.update_or_create(
                group_key=group_key,
                defaults={
                    'status': 'PENDING',
                    'decision': 'IGNORE',
                    'candidate_documents': [document.id for document in documents],
                    'candidate_count': len(documents),
                    'storage_saved_bytes': 0,
                    'notes': notes,
                    'decided_by': user,
                    'decided_at': timezone.now(),
                    'source_system': next((document.source_system for document in documents if document.source_system), ''),
                    'document_class': next((document.category for document in documents if document.category), ''),
                },
            )
            record.ignore()
            record.save(update_fields=['status', 'decision', 'candidate_documents', 'candidate_count', 'storage_saved_bytes', 'notes', 'decided_by', 'decided_at', 'source_system', 'document_class', 'updated_at'])
            Document.objects.filter(pk__in=[document.pk for document in documents]).update(
                duplicate_status='UNIQUE',
                duplicate_of=None,
                duplicate_marked_at=None,
                duplicate_group_key=None,
            )
            AuditService.log('REVIEW', 'Document', user=user, entity=group_key)
            EventService.publish(
                'DuplicateDecisionIgnored',
                'DuplicateDecision',
                group_key,
                {'group_key': group_key, 'decision': 'IGNORE'},
                idempotency_key=f'duplicate-decision-ignore:{group_key}',
            )
            return record

        if master_document_id:
            try:
                master_document = next(document for document in documents if document.id == master_document_id)
            except StopIteration as exc:
                raise ValidationError({'master_document_id': 'Master document must belong to the group.'}) from exc
        else:
            master_document = max(
                documents,
                key=lambda item: (
                    DocumentDeduplicationService._revision_sort_key(item),
                    DocumentDeduplicationService._effective_timestamp(item),
                    item.id,
                ),
            )

        storage_saved_bytes = max(
            sum(int(document.size or 0) for document in documents) - int(master_document.size or 0),
            0,
        )
        record, _ = DuplicateDecision.objects.update_or_create(
            group_key=group_key,
            defaults={
                'status': 'PENDING',
                'decision': 'MERGE',
                'master_document': master_document,
                'candidate_documents': [document.id for document in documents],
                'candidate_count': len(documents),
                'storage_saved_bytes': storage_saved_bytes,
                'notes': notes,
                'decided_by': user,
                'decided_at': timezone.now(),
                'source_system': next((document.source_system for document in documents if document.source_system), ''),
                'document_class': next((document.category for document in documents if document.category), ''),
            },
        )
        record.apply()
        record.save(update_fields=['status', 'decision', 'master_document', 'candidate_documents', 'candidate_count', 'storage_saved_bytes', 'notes', 'decided_by', 'decided_at', 'source_system', 'document_class', 'updated_at'])
        DocumentDeduplicationService.refresh_group(group_key)
        AuditService.log('REVIEW', 'Document', user=user, entity=group_key)
        EventService.publish(
            'DuplicateDecisionApplied',
            'DuplicateDecision',
            group_key,
            {'group_key': group_key, 'decision': 'MERGE', 'master_document_id': master_document.id},
            idempotency_key=f'duplicate-decision-merge:{group_key}',
        )
        return record


class DocumentOcrProcessingService:
    @staticmethod
    def _normalize_entity_value(entity_type: str, value: str) -> str:
        candidate = value.strip().upper()
        if entity_type in {'PL_NUMBER', 'LINKED_PL'}:
            return re.sub(r'\D+', '', candidate)
        return re.sub(r'\s+', ' ', candidate)

    @staticmethod
    def _extract_page_payloads(document: Document, extracted_text: str, confidence: float | None, engine: str) -> list[dict]:
        path = DocumentPathResolver.resolve(document)
        if not path:
            return [{'page_number': 1, 'extracted_text': extracted_text, 'confidence': confidence, 'source_engine': engine}]

        if path.suffix.lower() == '.pdf':
            try:
                import pdfplumber

                pages = []
                with pdfplumber.open(path) as pdf:
                    for index, page in enumerate(pdf.pages, start=1):
                        page_text = (page.extract_text() or '').strip()
                        pages.append(
                            {
                                'page_number': index,
                                'extracted_text': page_text,
                                'confidence': confidence,
                                'source_engine': engine,
                            }
                        )
                if any(page['extracted_text'] for page in pages):
                    return pages
            except Exception:
                pass

        return [{'page_number': 1, 'extracted_text': extracted_text, 'confidence': confidence, 'source_engine': engine}]

    @staticmethod
    def _extract_entities(page_payloads: list[dict], confidence: float | None, engine: str) -> list[dict]:
        entities: list[dict] = []
        for page in page_payloads:
            page_number = page['page_number']
            page_text = page.get('extracted_text') or ''
            if not page_text:
                continue
            for pattern_key, pattern in PATTERN_REGISTRY.items():
                entity_type = PATTERN_ENTITY_TYPES.get(pattern_key, pattern_key.upper())
                seen_values: set[str] = set()
                for match in pattern.finditer(page_text):
                    raw_value = match.group(0).strip()
                    if not raw_value:
                        continue
                    normalized_value = DocumentOcrProcessingService._normalize_entity_value(entity_type, raw_value)
                    key = f'{entity_type}:{normalized_value}'
                    if key in seen_values:
                        continue
                    seen_values.add(key)
                    entities.append(
                        {
                            'entity_type': entity_type,
                            'entity_value': raw_value[:255],
                            'normalized_value': normalized_value[:255],
                            'confidence': confidence,
                            'method': 'ocr_regex',
                            'source_engine': engine,
                            'source_page': page_number,
                            'source_span': {'start': match.start(), 'end': match.end()},
                        }
                    )
        return entities

    @classmethod
    @transaction.atomic
    def process_job(cls, job: OcrJob):
        from edms_api.ocr_service import get_ocr_service

        document = job.document
        path = DocumentPathResolver.resolve(document)
        if not path:
            job.status = 'Failed'
            job.started_at = timezone.now()
            job.completed_at = timezone.now()
            job.error_message = 'Document file is not available for OCR.'
            job.save(update_fields=['status', 'started_at', 'completed_at', 'error_message', 'updated_at'])
            document.ocr_status = 'Failed'
            document.save(update_fields=['ocr_status', 'updated_at'])
            return job

        job.status = 'Processing'
        job.started_at = timezone.now()
        job.error_message = ''
        job.save(update_fields=['status', 'started_at', 'error_message', 'updated_at'])

        document.ocr_status = 'Processing'
        document.save(update_fields=['ocr_status', 'updated_at'])

        ocr_service = get_ocr_service()
        result = ocr_service.extract_text(str(path))
        if not result.is_valid():
            job.status = 'Failed'
            job.error_message = result.error or 'Text extraction failed'
            job.completed_at = timezone.now()
            job.extracted_text = result.text or ''
            job.confidence = result.confidence or 0.0
            job.save(update_fields=['status', 'error_message', 'completed_at', 'extracted_text', 'confidence', 'updated_at'])
            document.ocr_status = 'Failed'
            document.ocr_confidence = result.confidence or 0.0
            document.extracted_text = result.text or ''
            document.save(update_fields=['ocr_status', 'ocr_confidence', 'extracted_text', 'updated_at'])
            EventService.publish(
                'OcrJobFailed',
                'OcrJob',
                job.id,
                {'document_id': document.id, 'error': job.error_message},
                idempotency_key=f'ocr-job-failed:{job.id}:{document.id}',
            )
            return job

        page_payloads = cls._extract_page_payloads(document, result.text, result.confidence, result.engine)
        entity_payloads = cls._extract_entities(page_payloads, result.confidence, result.engine)

        DocumentOcrPage.objects.filter(document=document).delete()
        DocumentOcrEntity.objects.filter(document=document).delete()
        DocumentOcrPage.objects.bulk_create(
            [DocumentOcrPage(document=document, **page) for page in page_payloads]
        )
        DocumentOcrEntity.objects.bulk_create(
            [DocumentOcrEntity(document=document, **entity) for entity in entity_payloads]
        )

        metadata = dict(document.search_metadata or {})
        metadata['ocr'] = {
            'engine': result.engine,
            'page_count': len(page_payloads),
            'entity_count': len(entity_payloads),
            'processed_at': timezone.now().isoformat(),
        }

        job.status = 'Completed'
        job.extracted_text = result.text
        job.confidence = result.confidence
        job.completed_at = timezone.now()
        job.error_message = ''
        job.save(update_fields=['status', 'extracted_text', 'confidence', 'completed_at', 'error_message', 'updated_at'])

        document.ocr_status = 'Completed'
        document.ocr_confidence = result.confidence or 0.0
        document.extracted_text = result.text
        document.search_metadata = metadata
        document.save(update_fields=['ocr_status', 'ocr_confidence', 'extracted_text', 'search_metadata', 'updated_at'])
        DocumentIndexOrchestrator.index_document(document, force_hashes=False)

        EventService.publish(
            'OcrJobCompleted',
            'OcrJob',
            job.id,
            {
                'document_id': document.id,
                'engine': result.engine,
                'page_count': len(page_payloads),
                'entity_count': len(entity_payloads),
            },
            idempotency_key=f'ocr-job-completed:{job.id}:{document.id}',
        )
        return OcrJob.objects.get(pk=job.pk)


class OcrApplicationService:
    @staticmethod
    def start_job(document_id, user, request):
        document = PermissionService.scope_queryset(Document.objects.all(), user, 'view_document').get(id=document_id)
        ocr_job, created = OcrJob.objects.update_or_create(
            document=document,
            defaults={
                'status': 'Queued',
                'created_by': user,
                'error_message': '',
                'started_at': None,
                'completed_at': None,
            },
        )
        document.ocr_status = 'Processing'
        document.save(update_fields=['ocr_status'])
        AuditService.log('OCR', 'OCR', user=user, entity=document_id, ip_address=request.META.get('REMOTE_ADDR'))
        EventService.publish(
            'OcrJobQueued',
            'OcrJob',
            ocr_job.id,
            {'document_id': document_id, 'status': ocr_job.status},
            idempotency_key=f'ocr-job:{document_id}:{ocr_job.id}',
        )
        try:
            from .tasks import run_ocr_job

            run_ocr_job.delay(str(ocr_job.id))
        except Exception:
            DocumentOcrProcessingService.process_job(ocr_job)
        return ocr_job, created

    @staticmethod
    def result_for_document(document_id, user=None):
        document_queryset = PermissionService.scope_queryset(Document.objects.all(), user, 'view_document')
        document = document_queryset.get(id=document_id)
        ocr_result = OcrJob.objects.filter(document=document).first()
        pages = list(
            DocumentOcrPage.objects.filter(document=document).order_by('page_number').values(
                'page_number',
                'extracted_text',
                'confidence',
                'source_engine',
            )
        )
        entities = list(
            DocumentOcrEntity.objects.filter(document=document).order_by('entity_type', 'entity_value').values(
                'entity_type',
                'entity_value',
                'normalized_value',
                'confidence',
                'method',
                'source_page',
                'source_engine',
                'review_status',
            )
        )
        metadata = document.search_metadata or {}
        ocr_meta = metadata.get('ocr') or {}
        return {
            'document_id': document_id,
            'status': ocr_result.status if ocr_result else 'Not Started',
            'text': ocr_result.extracted_text if ocr_result else '',
            'confidence': ocr_result.confidence if ocr_result else None,
            'extracted_at': ocr_result.completed_at if ocr_result else None,
            'engine': ocr_meta.get('engine') or '',
            'pages': pages,
            'entities': entities,
            'page_count': len(pages),
            'entity_count': len(entities),
            'error_message': ocr_result.error_message if ocr_result else '',
        }
