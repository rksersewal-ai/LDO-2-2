from celery import shared_task
from django.contrib.auth.models import User

from edms_api.models import Document
from edms_api.models import OcrJob

from documents.indexing import DocumentIndexOrchestrator
from documents.models import CrawlJob, HashBackfillJob, IndexedSource
from documents.services import (
    CrawlJobService,
    DocumentOcrProcessingService,
    HashBackfillJobService,
    InitialRunService,
)


@shared_task(name="documents.tasks.run_indexed_source_crawl", bind=True)
def run_indexed_source_crawl(self, job_or_source_id, force_full_hash=False):
    job = CrawlJob.objects.select_related("source").filter(id=job_or_source_id).first()
    if job is not None:
        return CrawlJobService.run_job(job, force_full_hash=force_full_hash)

    source = IndexedSource.objects.filter(id=job_or_source_id, is_active=True).first()
    if source is None:
        raise CrawlJob.DoesNotExist(
            f"No crawl job or indexed source found for {job_or_source_id}"
        )
    job = CrawlJobService.create_job(
        source,
        parameters={"trigger": "scheduled", "force_full_hash": bool(force_full_hash)},
    )
    return CrawlJobService.run_job(job, force_full_hash=force_full_hash)


@shared_task(name="documents.tasks.queue_indexed_source_crawl", bind=True)
def queue_indexed_source_crawl(self, source_id, force_full_hash=False):
    source = IndexedSource.objects.filter(id=source_id, is_active=True).first()
    if source is None:
        raise IndexedSource.DoesNotExist(
            f"Indexed source not found or inactive: {source_id}"
        )
    job = CrawlJobService.create_job(
        source,
        parameters={"trigger": "scheduled", "force_full_hash": bool(force_full_hash)},
    )
    return CrawlJobService.run_job(job, force_full_hash=force_full_hash)


@shared_task(name="documents.tasks.run_hash_backfill_job", bind=True)
def run_hash_backfill_job(self, job_id, force_full_hash=False):
    job = HashBackfillJob.objects.select_related("source").get(id=job_id)
    return HashBackfillJobService.run_job(job, force_full_hash=force_full_hash)


@shared_task(name="documents.tasks.queue_hash_backfill_job", bind=True)
def queue_hash_backfill_job(
    self, batch_size=500, source_id=None, force_full_hash=False
):
    source = None
    if source_id:
        source = IndexedSource.objects.filter(id=source_id, is_active=True).first()
        if source is None:
            raise IndexedSource.DoesNotExist(
                f"Indexed source not found or inactive: {source_id}"
            )
    job = HashBackfillJobService.create_job(
        parameters={
            "trigger": "scheduled",
            "force_full_hash": bool(force_full_hash),
        },
        batch_size=batch_size,
        source=source,
    )
    return HashBackfillJobService.run_job(job)


@shared_task(name="documents.tasks.index_single_document", bind=True)
def index_single_document(self, document_id, force_full_hash=False):
    document = Document.objects.get(id=document_id)
    return DocumentIndexOrchestrator.index_document(
        document, force_hashes=True, force_full_hash=force_full_hash
    )


@shared_task(name="documents.tasks.run_ocr_job", bind=True)
def run_ocr_job(self, job_id):
    job = OcrJob.objects.select_related("document").get(id=job_id)
    return DocumentOcrProcessingService.process_job(job)


@shared_task(name="documents.tasks.run_initial_dedup_pass", bind=True)
def run_initial_dedup_pass(self, batch_size=None, force_full_hash=False):
    return InitialRunService.run_dedup_backfill(
        batch_size=batch_size,
        force_full_hash=force_full_hash,
    )


@shared_task(name="documents.tasks.queue_pending_ocr_jobs", bind=True)
def queue_pending_ocr_jobs(self, batch_size=None, user_id=None):
    user = User.objects.filter(id=user_id).first() if user_id else None
    return InitialRunService.run_pending_ocr(
        batch_size=batch_size,
        user=user,
    )
