import json
from unittest.mock import patch, call, MagicMock

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from shared.permissions import PermissionService

from documents.services import DocumentService, OcrApplicationService, DocumentOcrProcessingService
from documents.indexing import DocumentIndexOrchestrator
from edms_api.models import Document, OcrJob

class DocumentServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='password')

    @patch('documents.tasks.index_single_document.delay')
    @patch.object(DocumentIndexOrchestrator, 'index_document')
    def test_ingest_handles_task_delay_exception_and_falls_back_to_inline_indexing(self, mock_index_document, mock_delay):
        mock_delay.side_effect = Exception("Celery is down")

        def side_effect(document, force_hashes=False):
            return document
        mock_index_document.side_effect = side_effect

        file_obj = SimpleUploadedFile('test.txt', b'test content')
        validated_data = {
            'file': file_obj,
            'name': 'Fallback Test Document',
            'category': 'Specification',
            'resolved_file_type': 'TXT',
            'normalized_revision': 1,
            'doc_type': 'Specification',
            'ocr_requested': False
        }

        class MockRequest:
            user = self.user
            META = {'REMOTE_ADDR': '127.0.0.1'}

        request = MockRequest()

        result = DocumentService.ingest.__wrapped__(validated_data, self.user, request)

        self.assertIn(call(result['document'], force_hashes=True), mock_index_document.mock_calls)
        self.assertEqual(result['index_job_mode'], 'inline')
        self.assertEqual(result['document'].name, 'Fallback Test Document')

    @patch('documents.tasks.index_single_document.delay')
    @patch.object(DocumentIndexOrchestrator, 'index_document')
    def test_create_version_handles_task_delay_exception_and_falls_back_to_inline_indexing(self, mock_index_document, mock_delay):
        mock_delay.side_effect = Exception("Celery is down")

        document = Document.objects.create(
            id='DOC-VERSION-001',
            name='Versioned Document',
            type='TXT',
            status='Approved',
            revision=1,
            author=self.user,
            file=SimpleUploadedFile('v1.txt', b'v1 content'),
        )
        # Grant permissions to allow OcrApplicationService.start_job to find the document
        PermissionService.grant_default_object_permissions(document, self.user)

        file_obj = SimpleUploadedFile('v2.txt', b'v2 content')

        class MockRequest:
            user = self.user
            META = {'REMOTE_ADDR': '127.0.0.1'}

        request = MockRequest()

        # create_version is not wrapped with transaction.atomic, so we call it directly
        result = DocumentService.create_version(document, file_obj, self.user, request)

        # Result is the document, let's verify index_document was called on the document
        self.assertIn(call(document, force_hashes=True), mock_index_document.mock_calls)
        self.assertEqual(document.revision, 2)


class OcrApplicationServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='password')
        self.document = Document.objects.create(
            id='DOC-OCR-001',
            name='OCR Document',
            type='TXT',
            status='Approved',
            revision=1,
            author=self.user,
            file=SimpleUploadedFile('test.txt', b'ocr content'),
        )
        PermissionService.grant_default_object_permissions(self.document, self.user)

    @patch('documents.tasks.run_ocr_job.delay')
    @patch.object(DocumentOcrProcessingService, 'process_job')
    def test_start_job_handles_task_delay_exception_and_falls_back_to_inline_processing(self, mock_process_job, mock_delay):
        mock_delay.side_effect = Exception("Celery is down")

        class MockRequest:
            user = self.user
            META = {'REMOTE_ADDR': '127.0.0.1'}

        request = MockRequest()

        job, created = OcrApplicationService.start_job(str(self.document.id), self.user, request)

        # Verify fallback occurred
        mock_process_job.assert_called_once_with(job)
        self.assertTrue(created)
        self.assertEqual(job.document, self.document)
