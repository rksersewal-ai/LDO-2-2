import os
import django
from unittest.mock import patch

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from documents.models import CrawlJob, IndexedSource
from documents.services import CrawlJobService
import tempfile

class TestCrawlJobException(TestCase):
    def test_crawl_job_handles_exception(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            source = IndexedSource.objects.create(
                name='Test Source',
                root_path=temp_dir,
                is_active=True,
                watch_enabled=False,
            )
            job = CrawlJobService.create_job(source)

            with patch('documents.services.IndexedSourceFileStateService.mark_missing_for_unseen_paths') as mock_method:
                mock_method.side_effect = Exception("Test exception")
                with self.assertRaises(Exception) as context:
                    CrawlJobService.run_job(job)

                self.assertEqual(str(context.exception), "Test exception")

            job.refresh_from_db()
            self.assertEqual(job.status, 'FAILED')
            self.assertEqual(job.error_message, "Test exception")

import unittest
if __name__ == '__main__':
    unittest.main()
