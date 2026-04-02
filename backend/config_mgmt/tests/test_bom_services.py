from unittest.mock import patch, MagicMock
from django.test import SimpleTestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from config_mgmt.services import BomService

class TestBomService(SimpleTestCase):
    def test_update_raises_validation_error_with_message_dict(self):
        # Mocking the request and serializer
        mock_request = MagicMock()
        mock_request.user = MagicMock()
        mock_request.META = {'REMOTE_ADDR': '127.0.0.1'}

        mock_serializer = MagicMock()
        mock_serializer.instance.parent = MagicMock()

        # Simulate save raising a DjangoValidationError with message_dict
        mock_serializer.save.side_effect = DjangoValidationError({'field': ['Error message']})

        with patch('config_mgmt.services.PermissionService') as mock_permission_service, \
             patch('config_mgmt.services.AuditService') as mock_audit_service, \
             patch('config_mgmt.services.EventService') as mock_event_service:

            with self.assertRaises(ValidationError) as context:
                BomService.update(mock_serializer, mock_request)

            self.assertEqual(context.exception.detail, {'field': ['Error message']})
            mock_permission_service.require_permission.assert_called_once_with(
                mock_request.user, mock_serializer.instance.parent, 'change_plitem'
            )
            mock_serializer.save.assert_called_once()
            mock_audit_service.log.assert_not_called()
            mock_event_service.publish.assert_not_called()

    def test_update_raises_validation_error_with_messages(self):
        # Mocking the request and serializer
        mock_request = MagicMock()
        mock_request.user = MagicMock()
        mock_request.META = {'REMOTE_ADDR': '127.0.0.1'}

        mock_serializer = MagicMock()
        mock_serializer.instance.parent = MagicMock()

        # Simulate save raising a DjangoValidationError with messages
        mock_serializer.save.side_effect = DjangoValidationError(['Error message'])

        with patch('config_mgmt.services.PermissionService') as mock_permission_service, \
             patch('config_mgmt.services.AuditService') as mock_audit_service, \
             patch('config_mgmt.services.EventService') as mock_event_service:

            with self.assertRaises(ValidationError) as context:
                BomService.update(mock_serializer, mock_request)

            self.assertEqual(context.exception.detail, ['Error message'])
            mock_permission_service.require_permission.assert_called_once_with(
                mock_request.user, mock_serializer.instance.parent, 'change_plitem'
            )
            mock_serializer.save.assert_called_once()
            mock_audit_service.log.assert_not_called()
            mock_event_service.publish.assert_not_called()
