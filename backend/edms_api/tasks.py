"""
Celery task definitions for edms_api.

Tasks are registered here at module level (not inside a function)
to avoid duplicate registration on repeated imports.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    soft_time_limit=240,
    time_limit=300,
    queue='ocr',
)
def async_process_ocr_job(self, job_id: str) -> bool:
    """
    Async OCR task for Celery.

    Retries up to 2 times on transient failures (with 30s backoff).
    Hard-killed after 300s; soft-timeout raises SoftTimeLimitExceeded at 240s.
    """
    from .ocr_tasks import process_ocr_job

    try:
        return process_ocr_job(job_id)
    except Exception as exc:
        logger.warning('OCR job %s failed (attempt %d/%d): %s',
                       job_id, self.request.retries + 1, self.max_retries + 1, exc)
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            logger.error('OCR job %s exhausted retries', job_id)
            from .models import OcrJob
            try:
                job = OcrJob.objects.get(id=job_id)
                job.status = 'Failed'
                job.error_message = f'Retries exhausted: {exc}'
                job.save(update_fields=['status', 'error_message', 'updated_at'])
            except Exception:
                logger.error('Failed to mark OCR job %s as failed after retries', job_id)
            raise
