import hashlib
import re
from datetime import datetime
from pathlib import Path
from typing import Iterable

from django.utils import timezone

from edms_api.models import Document, DocumentContentIndex
from documents.models import DocumentMetadataAssertion, DocumentOcrEntity, DuplicateDecision


CHUNK_SIZE = 64 * 1024
DEFAULT_HASH_VERSION = 1
HIGH_VALUE_CATEGORIES = {'CONTRACT', 'REGULATORY', 'OEM DRAWINGS', 'DRAWING', 'VENDOR DOCS'}

PATTERN_REGISTRY: dict[str, re.Pattern[str]] = {
    'invoice_numbers': re.compile(r'\b(?:INV|INVOICE)[- /]?[A-Z0-9]{2,}(?:[-/][A-Z0-9]{2,})*\b', re.IGNORECASE),
    'loco_numbers': re.compile(r'\b(?:WAP|WAG|WDM|WDG|WDP|WCAM|WCAG|YDM|YDG|LOCO)[A-Z0-9]{0,2}[- ]?\d{2,6}\b', re.IGNORECASE),
    'pl_numbers': re.compile(r'\b\d{8}\b'),
    'document_numbers': re.compile(r'\bDOC[-/ ]?\d{4}[-/ ]?\d{3,}\b', re.IGNORECASE),
    'drawing_numbers': re.compile(r'\b(?:DRG|DRW|DWG)[-/ ]?[A-Z0-9-]{3,}\b', re.IGNORECASE),
    'tender_numbers': re.compile(r'\b(?:TNDR|TENDER)[-/ ]?[A-Z0-9/-]{3,}\b', re.IGNORECASE),
    'eoffice_refs': re.compile(r'\b(?:E[- ]?OFFICE|EOFFICE|CLW)[-/][A-Z0-9/-]{3,}\b', re.IGNORECASE),
}

PATTERN_ENTITY_TYPES = {
    'invoice_numbers': 'INVOICE_NUMBER',
    'loco_numbers': 'LOCO_NUMBER',
    'pl_numbers': 'PL_NUMBER',
    'document_numbers': 'DOCUMENT_NUMBER',
    'drawing_numbers': 'DRAWING_NUMBER',
    'tender_numbers': 'TENDER_NUMBER',
    'eoffice_refs': 'EOFFICE_REF',
}

ASSERTION_FIELD_MAP = {
    'pl_numbers': 'linked_pl',
    'drawing_numbers': 'drawing_number',
    'document_numbers': 'document_number',
    'invoice_numbers': 'invoice_number',
    'loco_numbers': 'loco_number',
    'tender_numbers': 'tender_number',
    'eoffice_refs': 'eoffice_ref',
}

FAMILY_KEY_ORDER = (
    'drawing_numbers',
    'document_numbers',
    'invoice_numbers',
    'loco_numbers',
)


def _unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for value in values:
        candidate = value.strip()
        if not candidate:
            continue
        key = candidate.upper()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(candidate)
    return normalized


def _normalize_family_fragment(value: str) -> str:
    normalized = re.sub(r'[^A-Z0-9]+', '-', value.strip().upper())
    return normalized.strip('-')


def _normalize_entity_value(entity_type: str, value: str) -> str:
    candidate = value.strip().upper()
    if entity_type == 'PL_NUMBER':
        return re.sub(r'\D+', '', candidate)
    return re.sub(r'\s+', ' ', candidate)


def _derive_document_family_key(document: Document, pattern_hits: dict[str, list[str]]) -> str:
    for key in FAMILY_KEY_ORDER:
        values = pattern_hits.get(key) or []
        if values:
            token = _normalize_family_fragment(values[0])
            if token:
                return f'{key}:{token}'

    linked_pl = _normalize_family_fragment(document.linked_pl or '')
    category = _normalize_family_fragment(document.category or document.type or '')
    if linked_pl:
        if category:
            return f'pl:{linked_pl}:{category}'
        return f'pl:{linked_pl}'

    return ''


class DocumentPathResolver:
    @staticmethod
    def resolve(document: Document) -> Path | None:
        if document.external_file_path:
            path = Path(document.external_file_path)
            return path if path.exists() and path.is_file() else None

        if document.file:
            try:
                path = Path(document.file.path)
            except (NotImplementedError, ValueError, OSError):
                return None
            return path if path.exists() and path.is_file() else None

        return None


class DocumentFingerprintService:
    @staticmethod
    def _aware_datetime(timestamp: float):
        dt = datetime.fromtimestamp(timestamp)
        if timezone.is_naive(dt):
            return timezone.make_aware(dt)
        return dt

    @staticmethod
    def _read_sparse_segments(path: Path) -> tuple[int, bytes, bytes, bytes]:
        size = path.stat().st_size
        with path.open('rb') as handle:
            if size <= CHUNK_SIZE * 3:
                payload = handle.read()
                return size, payload, payload, payload

            start = handle.read(CHUNK_SIZE)
            middle_offset = max((size // 2) - (CHUNK_SIZE // 2), 0)
            handle.seek(middle_offset)
            middle = handle.read(CHUNK_SIZE)
            end_offset = max(size - CHUNK_SIZE, 0)
            handle.seek(end_offset)
            end = handle.read(CHUNK_SIZE)
        return size, start, middle, end

    @classmethod
    def build_sparse_fingerprint(cls, path: Path) -> tuple[int, str]:
        size, start, middle, end = cls._read_sparse_segments(path)
        digest = hashlib.sha256()
        digest.update(start)
        digest.update(middle)
        digest.update(end)
        return size, digest.hexdigest()

    @staticmethod
    def build_full_hash(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def should_confirm_full_hash(document: Document, *, force_full_hash: bool = False) -> bool:
        if force_full_hash:
            return True
        category = (document.category or '').strip().upper()
        return category in HIGH_VALUE_CATEGORIES

    @classmethod
    def ensure_hashes_bulk(cls, documents: list[Document], *, force: bool = False, force_full_hash: bool = False) -> dict[str, dict]:
        updates_by_id = {}
        for document in documents:
            update_fields: dict[str, object] = {}
            path = DocumentPathResolver.resolve(document)

            if not path:
                update_fields.setdefault('hash_algo', 'sha256')
                update_fields.setdefault('hash_version', DEFAULT_HASH_VERSION)
                updates_by_id[document.id] = update_fields
                continue

            payload = cls.ensure_hashes(document, force=force, force_full_hash=force_full_hash)
            updates_by_id[document.id] = payload

        return updates_by_id

    @classmethod
    def ensure_hashes(cls, document: Document, *, force: bool = False, force_full_hash: bool = False) -> dict:
        path = DocumentPathResolver.resolve(document)
        now = timezone.now()
        update_fields: dict[str, object] = {}

        if not path:
            update_fields.setdefault('hash_algo', 'sha256')
            update_fields.setdefault('hash_version', DEFAULT_HASH_VERSION)
            return update_fields

        size_bytes, sparse_hash = cls.build_sparse_fingerprint(path)
        content_index, _ = DocumentContentIndex.objects.get_or_create(
            size_bytes=size_bytes,
            fingerprint_3x64k=sparse_hash,
            hash_version=DEFAULT_HASH_VERSION,
            defaults={'hash_algo': 'sha256'},
        )
        content_index.last_seen_at = now
        content_index.save(update_fields=['last_seen_at'])

        update_fields.update(
            {
                'size': size_bytes,
                'fingerprint_3x64k': sparse_hash,
                'hash_algo': 'sha256',
                'hash_version': DEFAULT_HASH_VERSION,
                'hash_indexed_at': now,
                'content_index': content_index,
                'source_created_at': cls._aware_datetime(path.stat().st_ctime) if not document.source_created_at else document.source_created_at,
                'source_modified_at': cls._aware_datetime(path.stat().st_mtime),
            }
        )

        if content_index.full_hash_sha256:
            update_fields['file_hash'] = content_index.full_hash_sha256
        elif cls.should_confirm_full_hash(document, force_full_hash=force_full_hash) and (force or not document.file_hash):
            full_hash = cls.build_full_hash(path)
            content_index.full_hash_sha256 = full_hash
            content_index.hash_algo = 'sha256'
            content_index.save(update_fields=['full_hash_sha256', 'hash_algo', 'last_seen_at'])
            update_fields['file_hash'] = full_hash

        return update_fields


class DocumentDeduplicationService:
    @staticmethod
    def _effective_timestamp(document: Document):
        return (
            document.source_modified_at
            or document.source_created_at
            or document.updated_at
            or document.created_at
            or timezone.now()
        )

    @staticmethod
    def _revision_sort_key(document: Document):
        ingest_metadata = (document.search_metadata or {}).get('ingest', {})
        revision_label = str(ingest_metadata.get('revision_label') or '').strip().upper()
        if not revision_label:
            return (int(document.revision or 0),)

        parts = []
        for token in re.findall(r'[A-Z]+|\d+', revision_label):
            if token.isdigit():
                parts.append(int(token))
                continue
            alpha_score = 0
            for char in token:
                alpha_score = alpha_score * 27 + (ord(char) - 64)
            parts.append(alpha_score)
        return tuple(parts) or (int(document.revision or 0),)

    @staticmethod
    def duplicate_group_key(document: Document) -> str | None:
        family_key = (document.document_family_key or (document.search_metadata or {}).get('document_family_key') or '').strip()
        if document.file_hash:
            if family_key:
                return f"full:{document.size}:{document.file_hash}:{family_key}"
            return f"full:{document.size}:{document.file_hash}"
        if document.fingerprint_3x64k:
            if family_key:
                return f"sparse:{document.size}:{document.fingerprint_3x64k}:{family_key}"
            return f"sparse:{document.size}:{document.fingerprint_3x64k}"
        return None

    @classmethod
    def refresh_group(cls, group_key: str | None):
        if not group_key:
            return

        documents = list(
            Document.objects.filter(duplicate_group_key=group_key).order_by('-source_modified_at', '-created_at', '-revision', '-id')
        )
        if not documents:
            return

        decision = DuplicateDecision.objects.filter(group_key=group_key).first()
        if decision and decision.status == 'IGNORED':
            Document.objects.filter(pk__in=[document.pk for document in documents]).update(
                duplicate_status='UNIQUE',
                duplicate_of=None,
                duplicate_marked_at=None,
                duplicate_group_key=None,
            )
            return

        if len(documents) == 1:
            document = documents[0]
            Document.objects.filter(pk=document.pk).update(
                duplicate_status='UNIQUE',
                duplicate_of=None,
                duplicate_marked_at=None,
            )
            return

        documents.sort(
            key=lambda item: (cls._revision_sort_key(item), cls._effective_timestamp(item), item.id),
            reverse=True,
        )
        master = documents[0]
        if decision and decision.status == 'APPLIED' and decision.master_document_id:
            selected_master = next((item for item in documents if item.id == decision.master_document_id), None)
            if selected_master:
                master = selected_master
        now = timezone.now()

        Document.objects.filter(pk=master.pk).update(
            duplicate_status='MASTER',
            duplicate_of=None,
            duplicate_marked_at=None,
            duplicate_group_key=group_key,
        )

        duplicate_ids = [document.pk for document in documents[1:]]
        Document.objects.filter(pk__in=duplicate_ids).update(
            duplicate_status='DUPLICATE',
            duplicate_of=master,
            duplicate_marked_at=now,
            duplicate_group_key=group_key,
        )

    @classmethod
    def apply_for_documents_bulk(cls, documents: list[Document]) -> dict[str, dict]:
        results = {}
        for document in documents:
            results[document.id] = cls.apply_for_document(document)
        return results

    @classmethod
    def apply_for_document(cls, document: Document) -> dict:
        group_key = cls.duplicate_group_key(document)
        if not group_key:
            return {
                'duplicate_group_key': None,
                'duplicate_status': 'UNIQUE',
                'duplicate_of': None,
                'duplicate_marked_at': None,
            }

        decision = DuplicateDecision.objects.filter(group_key=group_key).first()
        if decision and decision.status == 'IGNORED':
            return {
                'duplicate_group_key': None,
                'duplicate_status': 'UNIQUE',
                'duplicate_of': None,
                'duplicate_marked_at': None,
            }

        return {
            'duplicate_group_key': group_key,
        }


class DocumentMetadataIndexService:
    @staticmethod
    def source_text(document: Document) -> str:
        path_text = document.external_file_path or ''
        return '\n'.join(
            str(part)
            for part in [
                document.id,
                document.name,
                document.description or '',
                document.category or '',
                document.type or '',
                document.linked_pl or '',
                document.source_system or '',
                path_text,
                ' '.join(document.tags or []),
                document.extracted_text or '',
            ]
            if part
        )

    @classmethod
    def extract_patterns(cls, text: str) -> dict[str, list[str]]:
        pattern_hits: dict[str, list[str]] = {}
        for key, pattern in PATTERN_REGISTRY.items():
            pattern_hits[key] = _unique(match.group(0) for match in pattern.finditer(text))
        return pattern_hits

    @classmethod
    def extract_entities(cls, text: str) -> list[dict]:
        entities: list[dict] = []
        for key, pattern in PATTERN_REGISTRY.items():
            entity_type = PATTERN_ENTITY_TYPES.get(key, key.upper())
            seen: set[str] = set()
            for match in pattern.finditer(text):
                raw_value = match.group(0).strip()
                normalized_value = _normalize_entity_value(entity_type, raw_value)
                dedupe_key = f'{entity_type}:{normalized_value}'
                if not normalized_value or dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                entities.append(
                    {
                        'entity_type': entity_type,
                        'entity_value': raw_value,
                        'normalized_value': normalized_value,
                        'confidence': 0.86,
                        'method': 'regex',
                        'source_engine': 'regex-indexer',
                        'source_page': None,
                        'source_span': {'start': match.start(), 'end': match.end()},
                    }
                )
        return entities

    @classmethod
    def _sync_regex_entities(cls, document: Document, entities: list[dict]) -> list[DocumentOcrEntity]:
        DocumentOcrEntity.objects.filter(document=document, method='regex', source_engine='regex-indexer').delete()
        if not entities:
            return []
        records = [
            DocumentOcrEntity(
                document=document,
                entity_type=entity['entity_type'],
                entity_value=entity['entity_value'],
                normalized_value=entity['normalized_value'],
                confidence=entity['confidence'],
                method=entity['method'],
                source_engine=entity['source_engine'],
                source_page=entity['source_page'],
                source_span=entity['source_span'],
            )
            for entity in entities
        ]
        return DocumentOcrEntity.objects.bulk_create(records)

    @classmethod
    def _sync_regex_entities_bulk(cls, documents_data: list[tuple[Document, list[dict]]]) -> list[DocumentOcrEntity]:
        doc_ids = [doc.id for doc, _ in documents_data]
        if doc_ids:
            DocumentOcrEntity.objects.filter(document_id__in=doc_ids, method='regex', source_engine='regex-indexer').delete()

        records = []
        for document, entities in documents_data:
            for entity in entities:
                records.append(
                    DocumentOcrEntity(
                        document=document,
                        entity_type=entity['entity_type'],
                        entity_value=entity['entity_value'],
                        normalized_value=entity['normalized_value'],
                        confidence=entity['confidence'],
                        method=entity['method'],
                        source_engine=entity['source_engine'],
                        source_page=entity['source_page'],
                        source_span=entity['source_span'],
                    )
                )
        return DocumentOcrEntity.objects.bulk_create(records)

    @classmethod
    def _sync_machine_assertions(cls, document: Document, entities: list[DocumentOcrEntity]) -> list[DocumentMetadataAssertion]:
        DocumentMetadataAssertion.objects.filter(document=document, source='machine').exclude(status='APPROVED').delete()
        created: list[DocumentMetadataAssertion] = []
        seen_fields: set[tuple[str, str]] = set()
        for entity in entities:
            field_key = next(
                (
                    mapped_field
                    for candidate_pattern, mapped_field in ASSERTION_FIELD_MAP.items()
                    if PATTERN_ENTITY_TYPES.get(candidate_pattern) == entity.entity_type
                ),
                '',
            )
            if not field_key:
                continue
            field_signature = (field_key, entity.normalized_value or entity.entity_value.upper())
            if field_signature in seen_fields:
                continue
            seen_fields.add(field_signature)
            assertion = DocumentMetadataAssertion.objects.create(
                document=document,
                field_key=field_key,
                value=entity.entity_value,
                normalized_value=entity.normalized_value,
                source='machine',
                derived_from_entity=entity,
                status='PROPOSED',
            )
            created.append(assertion)
        return created

    @classmethod
    def _sync_machine_assertions_bulk(cls, entities: list[DocumentOcrEntity]):
        doc_ids = list(set([e.document_id for e in entities]))
        if doc_ids:
            DocumentMetadataAssertion.objects.filter(document_id__in=doc_ids, source='machine').exclude(status='APPROVED').delete()

        created_records = []
        seen_fields: set[tuple[str, str, str]] = set() # doc_id, field_key, normalized_value
        for entity in entities:
            field_key = next((mapped_field for candidate_pattern, mapped_field in ASSERTION_FIELD_MAP.items() if PATTERN_ENTITY_TYPES.get(candidate_pattern) == entity.entity_type), '')
            if not field_key:
                continue

            field_signature = (entity.document_id, field_key, entity.normalized_value or entity.entity_value.upper())
            if field_signature in seen_fields:
                continue
            seen_fields.add(field_signature)

            created_records.append(DocumentMetadataAssertion(
                document_id=entity.document_id,
                field_key=field_key,
                value=entity.entity_value,
                normalized_value=entity.normalized_value,
                source='machine',
                derived_from_entity=entity,
                status='PROPOSED',
            ))
        return DocumentMetadataAssertion.objects.bulk_create(created_records)

    @classmethod
    def _approved_assertions(cls, document: Document) -> list[DocumentMetadataAssertion]:
        return list(
            document.metadata_assertions.filter(status='APPROVED').order_by('field_key', '-updated_at')
        )

    @classmethod
    def _confirmed_entities(cls, document: Document) -> list[DocumentOcrEntity]:
        return list(
            document.ocr_entities.exclude(review_status='REJECTED').order_by('entity_type', 'entity_value')
        )

    @classmethod
    def build_index_payload(cls, document: Document) -> dict:
        raw_text = cls.source_text(document)
        pattern_hits = cls.extract_patterns(raw_text)
        regex_entities = cls._sync_regex_entities(document, cls.extract_entities(raw_text))
        cls._sync_machine_assertions(document, regex_entities)
        confirmed_entities = cls._confirmed_entities(document)
        approved_assertions = cls._approved_assertions(document)
        existing_metadata = document.search_metadata or {}

        metadata = {
            'size_bytes': int(document.size or 0),
            'file_type': document.type,
            'category': document.category or '',
            'linked_pl': document.linked_pl or '',
            'revision': int(document.revision or 0),
            'tags': list(document.tags or []),
            'source_system': document.source_system or '',
            'external_file_path': document.external_file_path or '',
            'fingerprint_3x64k': document.fingerprint_3x64k or '',
            'full_hash_present': bool(document.file_hash),
            'duplicate_status': document.duplicate_status or 'UNIQUE',
            'duplicate_group_key': document.duplicate_group_key or '',
            'duplicate_of': document.duplicate_of_id or '',
            'patterns': pattern_hits,
            'approved_assertions': [
                {'field_key': assertion.field_key, 'value': assertion.value, 'normalized_value': assertion.normalized_value}
                for assertion in approved_assertions
            ],
            'confirmed_entities': [
                {
                    'entity_type': entity.entity_type,
                    'value': entity.entity_value,
                    'normalized_value': entity.normalized_value,
                    'review_status': entity.review_status,
                }
                for entity in confirmed_entities
            ],
        }
        document_family_key = _derive_document_family_key(document, pattern_hits)
        for assertion in approved_assertions:
            if assertion.field_key == 'drawing_number' and assertion.normalized_value:
                document_family_key = f'drawing_numbers:{_normalize_family_fragment(assertion.normalized_value)}'
                break
            if assertion.field_key == 'document_number' and assertion.normalized_value:
                document_family_key = f'document_numbers:{_normalize_family_fragment(assertion.normalized_value)}'
                break
        metadata['document_family_key'] = document_family_key
        for key, value in existing_metadata.items():
            if key not in metadata:
                metadata[key] = value

        search_parts = [
            document.id,
            document.name,
            document.description or '',
            document.category or '',
            document.type or '',
            document.linked_pl or '',
            document.source_system or '',
            document.external_file_path or '',
            document.extracted_text or '',
            ' '.join(document.tags or []),
            document.duplicate_status or '',
            document_family_key,
        ]
        for assertion in approved_assertions:
            search_parts.extend([assertion.field_key, assertion.value, assertion.normalized_value])
        for entity in confirmed_entities:
            search_parts.extend([entity.entity_type, entity.entity_value, entity.normalized_value])
        for values in pattern_hits.values():
            search_parts.extend(values)

        search_text = ' '.join(str(part).strip() for part in search_parts if part).strip()

        return {
            'search_text': search_text,
            'search_metadata': metadata,
            'document_family_key': document_family_key or None,
            'search_indexed_at': timezone.now(),
        }


    @classmethod
    def build_index_payload_bulk(cls, documents: list[Document]) -> dict[str, dict]:
        doc_ids = [d.id for d in documents]

        approved_assertions_map = {doc_id: [] for doc_id in doc_ids}
        for assertion in DocumentMetadataAssertion.objects.filter(document_id__in=doc_ids, status='APPROVED').order_by('field_key', '-updated_at'):
            approved_assertions_map[assertion.document_id].append(assertion)

        confirmed_entities_map = {doc_id: [] for doc_id in doc_ids}
        for entity in DocumentOcrEntity.objects.filter(document_id__in=doc_ids).exclude(review_status='REJECTED').order_by('entity_type', 'entity_value'):
            confirmed_entities_map[entity.document_id].append(entity)

        regex_entities_data = []
        raw_texts = {}
        pattern_hits_map = {}

        for document in documents:
            raw_text = cls.source_text(document)
            raw_texts[document.id] = raw_text
            pattern_hits = cls.extract_patterns(raw_text)
            pattern_hits_map[document.id] = pattern_hits
            extracted_entities = cls.extract_entities(raw_text)
            regex_entities_data.append((document, extracted_entities))

        created_entities = cls._sync_regex_entities_bulk(regex_entities_data)
        cls._sync_machine_assertions_bulk(created_entities)

        results = {}
        for document in documents:
            pattern_hits = pattern_hits_map[document.id]
            approved_assertions = approved_assertions_map[document.id]
            confirmed_entities = confirmed_entities_map[document.id]
            existing_metadata = document.search_metadata or {}

            metadata = {
                'size_bytes': int(document.size or 0),
                'file_type': document.type,
                'category': document.category or '',
                'linked_pl': document.linked_pl or '',
                'revision': int(document.revision or 0),
                'tags': list(document.tags or []),
                'source_system': document.source_system or '',
                'external_file_path': document.external_file_path or '',
                'fingerprint_3x64k': document.fingerprint_3x64k or '',
                'full_hash_present': bool(document.file_hash),
                'duplicate_status': document.duplicate_status or 'UNIQUE',
                'duplicate_group_key': document.duplicate_group_key or '',
                'duplicate_of': document.duplicate_of_id or '',
                'patterns': pattern_hits,
                'approved_assertions': [{'field_key': assertion.field_key, 'value': assertion.value, 'normalized_value': assertion.normalized_value} for assertion in approved_assertions],
                'confirmed_entities': [{'entity_type': entity.entity_type, 'value': entity.entity_value, 'normalized_value': entity.normalized_value, 'review_status': entity.review_status} for entity in confirmed_entities],
            }

            document_family_key = _derive_document_family_key(document, pattern_hits)
            for assertion in approved_assertions:
                if assertion.field_key == 'drawing_number' and assertion.normalized_value:
                    document_family_key = f'drawing_numbers:{_normalize_family_fragment(assertion.normalized_value)}'
                    break
                if assertion.field_key == 'document_number' and assertion.normalized_value:
                    document_family_key = f'document_numbers:{_normalize_family_fragment(assertion.normalized_value)}'
                    break
            metadata['document_family_key'] = document_family_key
            for key, value in existing_metadata.items():
                if key not in metadata:
                    metadata[key] = value

            search_parts = [
                document.id, document.name, document.description or '', document.category or '',
                document.type or '', document.linked_pl or '', document.source_system or '',
                document.external_file_path or '', document.extracted_text or '',
                ' '.join(document.tags or []), document.duplicate_status or '', document_family_key,
            ]
            for assertion in approved_assertions:
                search_parts.extend([assertion.field_key, assertion.value, assertion.normalized_value])
            for entity in confirmed_entities:
                search_parts.extend([entity.entity_type, entity.entity_value, entity.normalized_value])
            for values in pattern_hits.values():
                search_parts.extend(values)

            search_text = ' '.join(str(part).strip() for part in search_parts if part).strip()

            results[document.id] = {
                'search_text': search_text,
                'search_metadata': metadata,
                'document_family_key': document_family_key or None,
                'search_indexed_at': timezone.now(),
            }

        return results


class DocumentIndexOrchestrator:
    @classmethod
    def index_document(cls, document: Document, *, force_hashes: bool = False, force_full_hash: bool = False):
        previous_group_key = document.duplicate_group_key
        hash_payload = DocumentFingerprintService.ensure_hashes(
            document,
            force=force_hashes,
            force_full_hash=force_full_hash,
        )
        for key, value in hash_payload.items():
            setattr(document, key, value)

        index_payload = DocumentMetadataIndexService.build_index_payload(document)
        for key, value in index_payload.items():
            setattr(document, key, value)

        dedup_payload = DocumentDeduplicationService.apply_for_document(document)
        for key, value in dedup_payload.items():
            setattr(document, key, value)

        update_payload = hash_payload | index_payload | dedup_payload
        Document.objects.filter(pk=document.pk).update(**update_payload)
        refreshed = Document.objects.get(pk=document.pk)
        if previous_group_key and previous_group_key != refreshed.duplicate_group_key:
            DocumentDeduplicationService.refresh_group(previous_group_key)
        DocumentDeduplicationService.refresh_group(refreshed.duplicate_group_key)
        return refreshed

    @classmethod
    def index_documents_bulk(cls, documents: list[Document], *, force_hashes: bool = False, force_full_hash: bool = False):
        if not documents:
            return []

        previous_group_keys = {doc.id: doc.duplicate_group_key for doc in documents}

        hashes_payloads = DocumentFingerprintService.ensure_hashes_bulk(documents, force=force_hashes, force_full_hash=force_full_hash)
        for doc in documents:
            for key, value in hashes_payloads.get(doc.id, {}).items():
                setattr(doc, key, value)

        index_payloads = DocumentMetadataIndexService.build_index_payload_bulk(documents)
        for doc in documents:
            for key, value in index_payloads.get(doc.id, {}).items():
                setattr(doc, key, value)

        dedup_payloads = DocumentDeduplicationService.apply_for_documents_bulk(documents)
        for doc in documents:
            for key, value in dedup_payloads.get(doc.id, {}).items():
                setattr(doc, key, value)

        fields_to_update = set()
        for payload_dict in [hashes_payloads, index_payloads, dedup_payloads]:
            for payload in payload_dict.values():
                fields_to_update.update(payload.keys())

        fields_to_update = list(fields_to_update)

        if fields_to_update:
            Document.objects.bulk_update(documents, fields_to_update, batch_size=1000)

        refreshed_docs = list(Document.objects.filter(id__in=[d.id for d in documents]))

        groups_to_refresh = set()
        for doc in refreshed_docs:
            prev_key = previous_group_keys.get(doc.id)
            curr_key = doc.duplicate_group_key
            if prev_key and prev_key != curr_key:
                groups_to_refresh.add(prev_key)
            if curr_key:
                groups_to_refresh.add(curr_key)

        for group_key in groups_to_refresh:
            DocumentDeduplicationService.refresh_group(group_key)

        return refreshed_docs
