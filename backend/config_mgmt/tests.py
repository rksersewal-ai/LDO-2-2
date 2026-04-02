from django.test import TestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from unittest.mock import MagicMock, patch

from config_mgmt.services import BomService

class BomServiceTest(TestCase):
    def test_bom_update_validation_error(self):
        serializer = MagicMock()
        serializer.save.side_effect = DjangoValidationError({"field": ["Invalid data"]})
        serializer.instance.parent = MagicMock()

        request = MagicMock()
        request.user = MagicMock()

        with patch('config_mgmt.services.PermissionService') as permission_service:
            with self.assertRaises(ValidationError) as context:
                BomService.update(serializer, request)

            self.assertEqual(context.exception.detail, {"field": ["Invalid data"]})
