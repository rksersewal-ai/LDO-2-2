import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from edms_api.models import Document, OcrJob
from documents.models import CrawlJob, DuplicateDecision, HashBackfillJob, IndexedSource
from shared.api_response import success_response
from shared.permissions import PermissionService

from .serializers import (
    CrawlJobSerializer,
    DocumentIngestSerializer,
    DocumentMetadataAssertionCreateSerializer,
    DocumentMetadataAssertionSerializer,
    DocumentOcrEntitySerializer,
    DocumentSerializer,
    DuplicateDecisionSerializer,
    DuplicateGroupSerializer,
    HashBackfillJobSerializer,
    InitialRunActionSerializer,
    IndexedSourceSerializer,
    OcrJobSerializer,
)
from .services import (
    CrawlJobService,
    DocumentMetadataService,
    DocumentService,
    DuplicateDecisionService,
    HashBackfillJobService,
    InitialRunService,
    IndexedSourceService,
    OcrApplicationService,
)

logger = logging.getLogger(__name__)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_queryset(self):
        return DocumentService.queryset(self.request.query_params, self.request.user)

    def perform_create(self, serializer):
        DocumentService.create(serializer, self.request.user, self.request)

    @action(
        detail=False,
        methods=["post"],
        url_path="ingest",
        parser_classes=(MultiPartParser, FormParser),
    )
    def ingest(self, request):
        serializer = DocumentIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = DocumentService.ingest(
            serializer.validated_data, request.user, request
        )
        return Response(
            {
                "document": DocumentSerializer(
                    payload["document"], context={"request": request}
                ).data,
                "index_job_id": payload["index_job_id"],
                "ocr_job_id": payload["ocr_job_id"],
                "index_job_mode": payload["index_job_mode"],
                "ocr_job_mode": payload["ocr_job_mode"],
                "pl_linked": payload["pl_linked"],
                "warnings": payload["warnings"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], parser_classes=(MultiPartParser, FormParser))
    def versions(self, request, pk=None):
        document = self.get_object()
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        DocumentIngestSerializer.validate_file_security(file)
        version = DocumentService.create_version(document, file, request.user, request)
        return Response(
            {
                "id": str(version.id),
                "revision": version.revision,
                "created_at": version.created_at,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="entities")
    def entities(self, request, pk=None):
        queryset = DocumentMetadataService.list_entities(pk, request.user)
        return Response(DocumentOcrEntitySerializer(queryset, many=True).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"entities/(?P<entity_pk>[^/.]+)/approve",
    )
    def approve_entity(self, request, pk=None, entity_pk=None):
        entity = DocumentMetadataService.approve_entity(
            pk,
            entity_pk,
            request.user,
            notes=request.data.get("notes", ""),
        )
        return Response(DocumentOcrEntitySerializer(entity).data)

    @action(
        detail=True, methods=["post"], url_path=r"entities/(?P<entity_pk>[^/.]+)/reject"
    )
    def reject_entity(self, request, pk=None, entity_pk=None):
        entity = DocumentMetadataService.reject_entity(
            pk,
            entity_pk,
            request.user,
            notes=request.data.get("notes", ""),
        )
        return Response(DocumentOcrEntitySerializer(entity).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"entities/(?P<entity_pk>[^/.]+)/promote",
    )
    def promote_entity(self, request, pk=None, entity_pk=None):
        field_key = str(request.data.get("field_key", "")).strip()
        if not field_key:
            return Response(
                {"field_key": ["field_key is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assertion = DocumentMetadataService.promote_entity_to_assertion(
            pk,
            entity_pk,
            field_key,
            request.user,
            notes=request.data.get("notes", ""),
        )
        return Response(
            DocumentMetadataAssertionSerializer(assertion).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="assertions")
    def assertions(self, request, pk=None):
        queryset = DocumentMetadataService.list_assertions(pk, request.user)
        return Response(DocumentMetadataAssertionSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], url_path="assertions")
    def create_assertion(self, request, pk=None):
        serializer = DocumentMetadataAssertionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assertion = DocumentMetadataService.create_assertion(
            pk,
            field_key=serializer.validated_data["field_key"],
            value=serializer.validated_data["value"],
            user=request.user,
            notes=serializer.validated_data.get("notes") or "",
            status_value=serializer.validated_data.get("status", "APPROVED"),
        )
        return Response(
            DocumentMetadataAssertionSerializer(assertion).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"assertions/(?P<assertion_pk>[^/.]+)/approve",
    )
    def approve_assertion(self, request, pk=None, assertion_pk=None):
        assertion = DocumentMetadataService.approve_assertion(
            pk,
            assertion_pk,
            request.user,
            notes=request.data.get("notes", ""),
        )
        return Response(DocumentMetadataAssertionSerializer(assertion).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"assertions/(?P<assertion_pk>[^/.]+)/reject",
    )
    def reject_assertion(self, request, pk=None, assertion_pk=None):
        assertion = DocumentMetadataService.reject_assertion(
            pk,
            assertion_pk,
            request.user,
            notes=request.data.get("notes", ""),
        )
        return Response(DocumentMetadataAssertionSerializer(assertion).data)

    @action(detail=True, methods=["post"], url_path="reindex-metadata")
    def reindex_metadata(self, request, pk=None):
        document = DocumentMetadataService.reindex_metadata(pk, request.user)
        return Response(DocumentSerializer(document, context={"request": request}).data)


class OcrJobViewSet(viewsets.ModelViewSet):
    queryset = OcrJob.objects.select_related("document", "created_by").all()
    serializer_class = OcrJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PermissionService.scope_queryset(
            super().get_queryset(), self.request.user, "view_ocrjob"
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(document__name__icontains=search) | Q(document__id__icontains=search)
            )
        return queryset

    def create(self, request, *args, **kwargs):
        document_id = request.data.get("document_id")
        if not document_id:
            return Response(
                {"detail": "document_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ocr_job, created = OcrApplicationService.start_job(
            document_id, request.user, request
        )
        return Response(
            OcrJobSerializer(ocr_job).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class OcrResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        return Response(
            OcrApplicationService.result_for_document(document_id, request.user)
        )


class IndexedSourceViewSet(viewsets.ModelViewSet):
    queryset = IndexedSource.objects.all()
    serializer_class = IndexedSourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PermissionService.scope_queryset(
            super().get_queryset(), self.request.user, "view_indexedsource"
        )
        source_system = self.request.query_params.get("source_system")
        if source_system:
            queryset = queryset.filter(source_system=source_system)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            normalized = str(is_active).lower()
            if normalized in {"true", "1", "yes"}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {"false", "0", "no"}:
                queryset = queryset.filter(is_active=False)
        return queryset

    def perform_create(self, serializer):
        source = IndexedSourceService.create_or_update(
            serializer.validated_data, self.request
        )
        serializer.instance = source

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        source = IndexedSourceService.create_or_update(
            serializer.validated_data, request
        )
        return Response(
            self.get_serializer(source).data, status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        source = serializer.save()
        IndexedSourceService.sync_source_schedule(source)
        return Response(self.get_serializer(source).data, status=status.HTTP_200_OK)


class CrawlJobViewSet(viewsets.ModelViewSet):
    queryset = CrawlJob.objects.select_related("source", "requested_by").all()
    serializer_class = CrawlJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PermissionService.scope_queryset(
            super().get_queryset(), self.request.user, "view_crawljob"
        )
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source_id=source)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = CrawlJobService.create_job(
            serializer.validated_data["source"],
            request,
            parameters=serializer.validated_data.get("parameters", {}),
        )
        try:
            from .tasks import run_indexed_source_crawl

            run_indexed_source_crawl.delay(str(job.id))
        except Exception as exc:
            logger.warning(
                "Crawl task enqueue failed, running inline job_id=%s error=%s",
                job.id,
                exc,
            )
            CrawlJobService.run_job(job)
        return Response(self.get_serializer(job).data, status=status.HTTP_202_ACCEPTED)


class HashBackfillJobViewSet(viewsets.ModelViewSet):
    queryset = HashBackfillJob.objects.select_related("source", "requested_by").all()
    serializer_class = HashBackfillJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PermissionService.scope_queryset(
            super().get_queryset(), self.request.user, "view_hashbackfilljob"
        )
        source = self.request.query_params.get("source")
        if source:
            queryset = queryset.filter(source_id=source)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = HashBackfillJobService.create_job(
            request,
            parameters=serializer.validated_data.get("parameters", {}),
            batch_size=serializer.validated_data.get("batch_size", 500),
            source=serializer.validated_data.get("source"),
        )
        try:
            from .tasks import run_hash_backfill_job

            run_hash_backfill_job.delay(str(job.id))
        except Exception as exc:
            logger.warning(
                "Hash backfill enqueue failed, running inline job_id=%s error=%s",
                job.id,
                exc,
            )
            HashBackfillJobService.run_job(job)
        return Response(self.get_serializer(job).data, status=status.HTTP_202_ACCEPTED)


class InitialRunSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        return success_response(InitialRunService.summary())


class InitialRunActionView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = InitialRunActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_name = serializer.validated_data["action"]
        batch_size = serializer.validated_data.get("batch_size")
        skip_indexed = serializer.validated_data.get("skip_indexed", True)
        force_full_hash = serializer.validated_data.get("force_full_hash", False)

        if action_name == "index_sources":
            sources = list(
                IndexedSource.objects.filter(is_active=True).order_by("name")
            )
            queued_jobs = 0
            inline_jobs = 0
            jobs = []

            for source in sources:
                job = CrawlJobService.create_job(
                    source,
                    request,
                    parameters={
                        "trigger": "initial_run",
                        "skip_indexed": skip_indexed,
                    },
                )
                try:
                    from .tasks import run_indexed_source_crawl

                    run_indexed_source_crawl.delay(
                        str(job.id), force_full_hash=force_full_hash
                    )
                    queued_jobs += 1
                except Exception as exc:
                    logger.warning(
                        "Initial source indexing enqueue failed for job=%s error=%s",
                        job.id,
                        exc,
                    )
                    CrawlJobService.run_job(job, force_full_hash=force_full_hash)
                    inline_jobs += 1

                jobs.append(CrawlJobSerializer(job).data)

            mode = "noop"
            if queued_jobs and inline_jobs:
                mode = "mixed"
            elif queued_jobs:
                mode = "queued"
            elif inline_jobs:
                mode = "inline"

            status_code = (
                status.HTTP_202_ACCEPTED if queued_jobs else status.HTTP_200_OK
            )
            return success_response(
                {
                    "action": action_name,
                    "mode": mode,
                    "message": f"Initial source indexing launched for {len(sources)} active source(s).",
                    "results": {
                        "requested_sources": len(sources),
                        "queued_jobs": queued_jobs,
                        "inline_jobs": inline_jobs,
                        "skip_indexed": skip_indexed,
                        "jobs": jobs,
                    },
                },
                status_code=status_code,
            )

        if action_name == "backfill_hashes":
            pending_documents = InitialRunService.pending_hash_queryset(
                force_full_hash=force_full_hash,
            ).count()
            effective_batch_size = batch_size or pending_documents or 1
            job = HashBackfillJobService.create_job(
                request,
                parameters={
                    "trigger": "initial_run",
                    "force_full_hash": force_full_hash,
                },
                batch_size=effective_batch_size,
            )

            mode = "queued"
            try:
                from .tasks import run_hash_backfill_job

                run_hash_backfill_job.delay(
                    str(job.id), force_full_hash=force_full_hash
                )
            except Exception as exc:
                logger.warning(
                    "Initial hash backfill enqueue failed for job=%s error=%s",
                    job.id,
                    exc,
                )
                HashBackfillJobService.run_job(job, force_full_hash=force_full_hash)
                mode = "inline"

            return success_response(
                {
                    "action": action_name,
                    "mode": mode,
                    "message": f"Hash backfill launched for {pending_documents} pending document(s).",
                    "results": {
                        "pending_documents": pending_documents,
                        "batch_size": effective_batch_size,
                        "force_full_hash": force_full_hash,
                        "job": HashBackfillJobSerializer(job).data,
                    },
                },
                status_code=status.HTTP_202_ACCEPTED
                if mode == "queued"
                else status.HTTP_200_OK,
            )

        if action_name == "refresh_deduplication":
            pending_documents = InitialRunService.pending_dedup_queryset().count()
            effective_batch_size = batch_size or pending_documents or 1
            mode = "queued"
            results = {
                "pending_documents": pending_documents,
                "batch_size": effective_batch_size,
                "force_full_hash": force_full_hash,
            }
            try:
                from .tasks import run_initial_dedup_pass

                run_initial_dedup_pass.delay(
                    batch_size=effective_batch_size,
                    force_full_hash=force_full_hash,
                )
            except Exception as exc:
                logger.warning("Initial dedup refresh enqueue failed error=%s", exc)
                results |= InitialRunService.run_dedup_backfill(
                    batch_size=effective_batch_size,
                    force_full_hash=force_full_hash,
                )
                mode = "inline"

            return success_response(
                {
                    "action": action_name,
                    "mode": mode,
                    "message": f"Deduplication refresh launched for {pending_documents} document(s).",
                    "results": results,
                },
                status_code=status.HTTP_202_ACCEPTED
                if mode == "queued"
                else status.HTTP_200_OK,
            )

        pending_documents = InitialRunService.pending_ocr_queryset().count()
        effective_batch_size = batch_size or pending_documents or 1
        mode = "queued"
        results = {
            "pending_documents": pending_documents,
            "batch_size": effective_batch_size,
        }
        try:
            from .tasks import queue_pending_ocr_jobs

            queue_pending_ocr_jobs.delay(
                batch_size=effective_batch_size,
                user_id=request.user.id,
            )
        except Exception as exc:
            logger.warning("Pending OCR queue enqueue failed error=%s", exc)
            results |= InitialRunService.run_pending_ocr(
                batch_size=effective_batch_size,
                user=request.user,
                request=request,
            )
            mode = "inline"

        return success_response(
            {
                "action": action_name,
                "mode": mode,
                "message": f"Pending OCR queue launched for {pending_documents} document(s).",
                "results": results,
            },
            status_code=status.HTTP_202_ACCEPTED
            if mode == "queued"
            else status.HTTP_200_OK,
        )


class DuplicateDecisionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DuplicateDecision.objects.select_related(
        "master_document", "decided_by"
    ).all()
    serializer_class = DuplicateDecisionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PermissionService.scope_queryset(
            super().get_queryset(), self.request.user, "view_duplicatedecision"
        )
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        return queryset


class DeduplicationGroupListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = DuplicateDecisionService.group_documents(
            request.query_params, request.user
        )
        return Response(DuplicateGroupSerializer(groups, many=True).data)


class DeduplicationGroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_key):
        groups = DuplicateDecisionService.group_documents(
            request.query_params, request.user
        )
        group = next((item for item in groups if item["group_key"] == group_key), None)
        if not group:
            return Response(
                {"detail": "Duplicate group not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(DuplicateGroupSerializer(group).data)


class DeduplicationGroupDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_key):
        decision = str(request.data.get("decision", "MERGE")).upper()
        master_document_id = request.data.get("master_document_id")
        notes = request.data.get("notes", "")
        record = DuplicateDecisionService.apply_decision(
            group_key,
            master_document_id=master_document_id,
            decision=decision,
            notes=notes,
            user=request.user,
        )
        return Response(
            DuplicateDecisionSerializer(record).data, status=status.HTTP_200_OK
        )


class DeduplicationGroupIgnoreView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_key):
        record = DuplicateDecisionService.apply_decision(
            group_key,
            decision="IGNORE",
            notes=request.data.get("notes", ""),
            user=request.user,
        )
        return Response(
            DuplicateDecisionSerializer(record).data, status=status.HTTP_200_OK
        )
