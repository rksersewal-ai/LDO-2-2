from pathlib import Path
import json

from django.conf import settings
from rest_framework import serializers

from edms_api.models import Document, OcrJob
from documents.models import (
    CrawlJob,
    DocumentMetadataAssertion,
    DocumentOcrEntity,
    DuplicateDecision,
    HashBackfillJob,
    IndexedSource,
)


class DocumentSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="name", read_only=True)
    document_number = serializers.CharField(source="id", read_only=True)
    file_type = serializers.CharField(source="type", read_only=True)
    revision_label = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "document_number",
            "name",
            "title",
            "description",
            "type",
            "file_type",
            "revision_label",
            "status",
            "revision",
            "size",
            "file",
            "file_hash",
            "source_system",
            "external_file_path",
            "source_created_at",
            "source_modified_at",
            "fingerprint_3x64k",
            "hash_algo",
            "hash_version",
            "hash_indexed_at",
            "content_index",
            "duplicate_status",
            "duplicate_group_key",
            "duplicate_of",
            "duplicate_marked_at",
            "ocr_status",
            "ocr_confidence",
            "extracted_text",
            "search_text",
            "search_metadata",
            "search_indexed_at",
            "linked_pl",
            "category",
            "tags",
            "author",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "file_hash",
            "fingerprint_3x64k",
            "hash_algo",
            "hash_version",
            "hash_indexed_at",
            "content_index",
            "duplicate_status",
            "duplicate_group_key",
            "duplicate_of",
            "duplicate_marked_at",
            "search_text",
            "search_metadata",
            "search_indexed_at",
        ]
        extra_kwargs = {"file": {"required": False, "allow_null": True}}

    def get_revision_label(self, obj):
        metadata = obj.search_metadata or {}
        ingest_metadata = metadata.get("ingest") or {}
        return (
            ingest_metadata.get("revision_label")
            or metadata.get("revision_label")
            or str(obj.revision)
        )


class DocumentIngestSerializer(serializers.Serializer):
    file = serializers.FileField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    category = serializers.CharField(max_length=100)
    doc_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    revision_label = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )
    linked_pl = serializers.CharField(max_length=100, required=False, allow_blank=True)
    ocr_requested = serializers.BooleanField(required=False, default=True)
    source_system = serializers.ChoiceField(
        choices=[choice[0] for choice in Document.SOURCE_SYSTEM_CHOICES],
        required=False,
        default="UPLOAD",
    )
    tags = serializers.JSONField(required=False)
    template_id = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    template_fields = serializers.JSONField(required=False)

    DEFAULT_ALLOWED_EXTENSIONS = {
        ".pdf",
        ".tif",
        ".tiff",
        ".prt",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".csv",
        ".png",
        ".jpg",
        ".jpeg",
        ".svg",
        ".txt",
    }

    def validate_tags(self, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError("tags must be valid JSON.") from exc
        if not isinstance(value, list):
            raise serializers.ValidationError("tags must be a list.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_template_fields(self, value):
        if value in (None, ""):
            return {}
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(
                    "template_fields must be valid JSON."
                ) from exc
        if not isinstance(value, dict):
            raise serializers.ValidationError("template_fields must be an object.")
        return {str(key): str(item) for key, item in value.items()}

    def validate(self, attrs):
        file_obj = attrs["file"]
        extension = self.validate_file_security(file_obj)
        attrs["resolved_file_type"] = self._resolve_file_type(extension)
        attrs["normalized_revision"] = self._normalize_revision(
            attrs.get("revision_label")
        )
        return attrs

    @classmethod
    def validate_file_security(cls, file_obj):
        extension = Path(file_obj.name).suffix.lower()
        if not extension:
            raise serializers.ValidationError(
                {"file": "Uploaded file must have an extension."}
            )

        allowed_extensions = getattr(settings, "EDMS_ALLOWED_UPLOAD_EXTENSIONS", None)
        if allowed_extensions:
            normalized_extensions = {
                (item if str(item).startswith(".") else f".{item}").lower()
                for item in allowed_extensions
                if str(item).strip()
            }
        else:
            normalized_extensions = cls.DEFAULT_ALLOWED_EXTENSIONS

        if extension not in normalized_extensions:
            allowed_display = ", ".join(sorted(normalized_extensions))
            raise serializers.ValidationError(
                {
                    "file": f'Unsupported file extension "{extension}". Allowed extensions: {allowed_display}'
                }
            )

        max_size = int(
            getattr(settings, "EDMS_MAX_UPLOAD_SIZE_BYTES", 100 * 1024 * 1024)
        )
        if file_obj.size > max_size:
            raise serializers.ValidationError(
                {"file": f"File too large. Maximum allowed size is {max_size} bytes."}
            )

        return extension

    @staticmethod
    def _resolve_file_type(extension: str) -> str:
        mapping = {
            ".pdf": "PDF",
            ".tif": "TIFF",
            ".tiff": "TIFF",
            ".prt": "PRT",
            ".doc": "Word",
            ".docx": "Word",
            ".xls": "Excel",
            ".xlsx": "Excel",
            ".csv": "Excel",
            ".png": "Image",
            ".jpg": "Image",
            ".jpeg": "Image",
            ".svg": "Image",
        }
        return mapping.get(extension, "Other")

    @staticmethod
    def _normalize_revision(label: str | None) -> int:
        if not label:
            return 1
        digits = "".join(
            character if character.isdigit() else " " for character in label
        ).split()
        if not digits:
            return 1
        try:
            return max(int(digits[0]), 1)
        except ValueError:
            return 1


class OcrJobSerializer(serializers.ModelSerializer):
    document_id = serializers.CharField(source="document.id", read_only=True)
    document_name = serializers.CharField(source="document.name", read_only=True)
    page_count = serializers.SerializerMethodField()
    entity_count = serializers.SerializerMethodField()
    engine = serializers.SerializerMethodField()

    class Meta:
        model = OcrJob
        fields = [
            "id",
            "document",
            "document_id",
            "document_name",
            "status",
            "started_at",
            "completed_at",
            "extracted_text",
            "confidence",
            "error_message",
            "page_count",
            "entity_count",
            "engine",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_page_count(self, obj):
        return (
            obj.document.ocr_pages.count() if hasattr(obj.document, "ocr_pages") else 0
        )

    def get_entity_count(self, obj):
        return (
            obj.document.ocr_entities.count()
            if hasattr(obj.document, "ocr_entities")
            else 0
        )

    def get_engine(self, obj):
        metadata = obj.document.search_metadata or {}
        return (metadata.get("ocr") or {}).get("engine") or ""


class IndexedSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndexedSource
        fields = [
            "id",
            "name",
            "root_path",
            "source_system",
            "is_active",
            "watch_enabled",
            "include_extensions",
            "exclude_patterns",
            "scan_interval_minutes",
            "created_by",
            "last_crawled_at",
            "last_successful_crawl_at",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "last_crawled_at",
            "last_successful_crawl_at",
            "last_error",
            "created_at",
            "updated_at",
        ]


class CrawlJobSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)
    source_root_path = serializers.CharField(source="source.root_path", read_only=True)

    class Meta:
        model = CrawlJob
        fields = [
            "id",
            "source",
            "source_name",
            "source_root_path",
            "requested_by",
            "status",
            "parameters",
            "discovered_count",
            "indexed_count",
            "duplicate_count",
            "failed_count",
            "started_at",
            "completed_at",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "status",
            "discovered_count",
            "indexed_count",
            "duplicate_count",
            "failed_count",
            "started_at",
            "completed_at",
            "error_message",
            "created_at",
            "updated_at",
        ]


class HashBackfillJobSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(
        source="source.name", read_only=True, allow_null=True
    )

    class Meta:
        model = HashBackfillJob
        fields = [
            "id",
            "source",
            "source_name",
            "requested_by",
            "status",
            "parameters",
            "batch_size",
            "documents_scanned",
            "documents_indexed",
            "full_hashes_computed",
            "started_at",
            "completed_at",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "requested_by",
            "status",
            "documents_scanned",
            "documents_indexed",
            "full_hashes_computed",
            "started_at",
            "completed_at",
            "error_message",
            "created_at",
            "updated_at",
        ]


class InitialRunActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "index_sources",
            "backfill_hashes",
            "refresh_deduplication",
            "queue_pending_ocr",
        ]
    )
    batch_size = serializers.IntegerField(required=False, min_value=1)
    skip_indexed = serializers.BooleanField(required=False, default=True)
    force_full_hash = serializers.BooleanField(required=False, default=False)


class DuplicateDecisionSerializer(serializers.ModelSerializer):
    master_document_id = serializers.CharField(
        source="master_document.id", read_only=True, allow_null=True
    )

    class Meta:
        model = DuplicateDecision
        fields = [
            "id",
            "group_key",
            "status",
            "decision",
            "master_document",
            "master_document_id",
            "candidate_documents",
            "candidate_count",
            "storage_saved_bytes",
            "notes",
            "decided_by",
            "decided_at",
            "source_system",
            "document_class",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "candidate_documents",
            "candidate_count",
            "storage_saved_bytes",
            "decided_by",
            "decided_at",
            "created_at",
            "updated_at",
        ]


class DocumentOcrEntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentOcrEntity
        fields = [
            "id",
            "entity_type",
            "entity_value",
            "normalized_value",
            "confidence",
            "method",
            "source_engine",
            "source_page",
            "source_span",
            "review_status",
            "reviewed_by",
            "reviewed_at",
            "review_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class DocumentMetadataAssertionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMetadataAssertion
        fields = [
            "id",
            "field_key",
            "value",
            "normalized_value",
            "source",
            "derived_from_entity",
            "status",
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source",
            "derived_from_entity",
            "approved_by",
            "approved_at",
            "rejected_by",
            "rejected_at",
            "created_at",
            "updated_at",
        ]


class DocumentMetadataAssertionCreateSerializer(serializers.Serializer):
    field_key = serializers.CharField(max_length=80)
    value = serializers.CharField(max_length=255)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.ChoiceField(
        choices=["PROPOSED", "APPROVED"], required=False, default="APPROVED"
    )


class DuplicateGroupSerializer(serializers.Serializer):
    group_key = serializers.CharField()
    family_key = serializers.CharField(
        allow_blank=True, allow_null=True, required=False
    )
    decision_status = serializers.CharField()
    decision = serializers.CharField()
    master_document_id = serializers.CharField(allow_null=True)
    document_count = serializers.IntegerField()
    total_bytes = serializers.IntegerField()
    potential_savings_bytes = serializers.IntegerField()
    source_systems = serializers.ListField(child=serializers.CharField())
    categories = serializers.ListField(child=serializers.CharField())
    hash_status = serializers.DictField()
    risk_flags = serializers.DictField(required=False)
    revision_labels = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    approved_assertions = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    conflicting_entities = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    decision_record = DuplicateDecisionSerializer(allow_null=True)
    documents = DocumentSerializer(many=True)
