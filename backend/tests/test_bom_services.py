from django.test import SimpleTestCase
from unittest.mock import patch, MagicMock
from services.bom import get_bom_children

class TestBomServices(SimpleTestCase):

    @patch('services.bom.BomChangeSet', create=True)
    def test_get_bom_children_empty(self, mock_BomChangeSet):
        # Setup mock to return empty list
        mock_qs = MagicMock()
        mock_qs.filter.return_value.prefetch_related.return_value = []
        mock_BomChangeSet.objects = mock_qs

        result = get_bom_children('assembly_1', 'v1')
        self.assertEqual(result, [])
        mock_qs.filter.assert_called_once_with(assembly_id='assembly_1', source_version_id='v1')

    @patch('services.bom.BomChangeSet', create=True)
    def test_get_bom_children_with_operations(self, mock_BomChangeSet):
        # Setup mock operations and change sets
        mock_op1 = MagicMock()
        mock_op1.child_item = {'id': 'child1', 'qty': 2}

        mock_op2 = MagicMock()
        mock_op2.child_item = {'id': 'child2', 'qty': 1}

        mock_op3 = MagicMock()
        mock_op3.child_item = None # Should not be included or might cause issue depending on implementation. Let's say we handle None.

        mock_change_set1 = MagicMock()
        mock_change_set1.operations.all.return_value = [mock_op1, mock_op3]

        mock_change_set2 = MagicMock()
        mock_change_set2.operations.all.return_value = [mock_op2]

        mock_qs = MagicMock()
        mock_qs.filter.return_value.prefetch_related.return_value = [mock_change_set1, mock_change_set2]
        mock_BomChangeSet.objects = mock_qs

        result = get_bom_children('assembly_1', 'v1')
        self.assertEqual(result, [{'id': 'child1', 'qty': 2}, {'id': 'child2', 'qty': 1}])
