import unittest
from unittest.mock import patch, MagicMock
from services.search_indexing import upsert_work_record_index, WorkLedger, EntitySearchIndex

class TestSearchIndexing(unittest.TestCase):
    @patch('services.search_indexing.EntitySearchIndex.objects.update_or_create')
    def test_upsert_work_record_index(self, mock_update_or_create):
        # Setup mock behavior
        mock_index_instance = MagicMock(spec=EntitySearchIndex)
        # update_or_create returns a tuple (obj, created)
        mock_update_or_create.return_value = (mock_index_instance, True)

        # Create dummy record
        record = WorkLedger(work_id="W-1001", work_type="Maintenance")

        # Execute function
        result = upsert_work_record_index(record)

        # Assertions
        mock_update_or_create.assert_called_once_with(
            entity_type='WORK',
            entity_identifier='W-1001',
            defaults={
                'title': 'Maintenance',
            }
        )
        self.assertEqual(result, mock_index_instance)

    @patch('services.search_indexing.EntitySearchIndex.objects.update_or_create')
    def test_upsert_work_record_index_updates_existing(self, mock_update_or_create):
        # Setup mock behavior
        mock_index_instance = MagicMock(spec=EntitySearchIndex)
        # update_or_create returns a tuple (obj, created)
        mock_update_or_create.return_value = (mock_index_instance, False)

        # Create dummy record
        record = WorkLedger(work_id="W-1002", work_type="Repair")

        # Execute function
        result = upsert_work_record_index(record)

        # Assertions
        mock_update_or_create.assert_called_once_with(
            entity_type='WORK',
            entity_identifier='W-1002',
            defaults={
                'title': 'Repair',
            }
        )
        self.assertEqual(result, mock_index_instance)

if __name__ == '__main__':
    unittest.main()
