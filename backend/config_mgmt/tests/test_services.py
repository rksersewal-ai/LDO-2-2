from django.test import TestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from unittest.mock import Mock, patch
from config_mgmt.services import BomService

class BomServiceTestCase(TestCase):
    def test_create_raises_validation_error_on_django_validation_error(self):
        mock_serializer = Mock()
        mock_serializer.validated_data = {'parent': None}
        mock_serializer.save.side_effect = DjangoValidationError("Validation failed")

        mock_request = Mock()

        with self.assertRaises(ValidationError) as context:
            BomService.create(mock_serializer, mock_request)

        self.assertEqual(context.exception.detail, ["Validation failed"])
