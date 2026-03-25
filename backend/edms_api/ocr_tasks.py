"""
OCR Processing Tasks
Async OCR job handling with status updates
"""

import logging
from django.utils import timezone
from .models import Document, OcrJob
from .ocr_service import get_ocr_service

logger = logging.getLogger(__name__)


def process_ocr_job(job_id: str) -> bool:
    """
    Process an OCR job synchronously
    Can be wrapped with Celery for async execution if needed
    
    Returns:
        True if successful, False if failed
    """
    
    try:
        job = OcrJob.objects.get(id=job_id)
        document = job.document
        
        # Update job status
        job.status = 'Processing'
        job.started_at = timezone.now()
        job.save()
        
        logger.info(f"Starting OCR job {job_id} for document {document.id}")
        
        # Get file path
        file_path = document.file.path if hasattr(document.file, 'path') else str(document.file)
        
        # Extract text using OCR service
        ocr_service = get_ocr_service()
        result = ocr_service.extract_text(file_path)
        
        if not result.is_valid():
            # OCR failed
            job.status = 'Failed'
            job.error_message = result.error or 'Text extraction failed'
            job.completed_at = timezone.now()
            job.save()
            
            logger.error(f"OCR failed for {document.id}: {job.error_message}")
            return False
        
        # Update job with results
        job.status = 'Completed'
        job.extracted_text = result.text
        job.confidence = result.confidence
        job.completed_at = timezone.now()
        job.save()
        
        # Update document with OCR results
        document.ocr_status = 'Completed'
        document.ocr_confidence = result.confidence
        document.extracted_text = result.text
        document.save()
        
        logger.info(f"OCR completed for {document.id} using {result.engine} "
                   f"(confidence: {result.confidence:.1%})")
        
        return True
    
    except OcrJob.DoesNotExist:
        logger.error(f"OCR job {job_id} not found")
        return False
    except Document.DoesNotExist:
        logger.error(f"Document for job {job_id} not found")
        return False
    except Exception as e:
        logger.error(f"Unexpected error in OCR job {job_id}: {e}", exc_info=True)
        try:
            job = OcrJob.objects.get(id=job_id)
            job.status = 'Failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
        except:
            pass
        return False


# Celery task wrapper (optional, if using Celery for async jobs)
def setup_celery_tasks():
    """
    Setup Celery tasks if available
    This is optional - OCR can run synchronously without Celery
    """
    try:
        from celery import shared_task
        
        @shared_task
        def async_process_ocr_job(job_id: str):
            """Async OCR task for Celery"""
            return process_ocr_job(job_id)
        
        return async_process_ocr_job
    except ImportError:
        logger.debug("Celery not installed, OCR will run synchronously")
        return None


# Convenience function to start OCR
def start_ocr_for_document(document_id: str, user=None) -> OcrJob:
    """
    Create and start OCR job for a document
    
    Args:
        document_id: Document ID to process
        user: User who requested OCR
    
    Returns:
        OcrJob instance
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        raise ValueError(f"Document {document_id} not found")
    
    # Create job
    job = OcrJob.objects.create(
        document=document,
        status='Queued',
        created_by=user
    )
    
    logger.info(f"Created OCR job {job.id} for document {document_id}")
    
    # Try async first (Celery), fall back to sync
    async_task = setup_celery_tasks()
    if async_task:
        async_task.delay(job.id)
        logger.info(f"Queued OCR job {job.id} for async processing")
    else:
        # Process synchronously
        logger.info(f"Processing OCR job {job.id} synchronously")
        process_ocr_job(job.id)
    
    return job
