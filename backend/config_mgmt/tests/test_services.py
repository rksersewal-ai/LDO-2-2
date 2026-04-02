from unittest.mock import Mock

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from config_mgmt.services import ChangeNoticeService, ChangeRequestService


class ChangeRequestServiceTests(SimpleTestCase):
    def test_create_raises_validation_error_with_message_dict(self):
        mock_serializer = Mock()
        err = DjangoValidationError({'field': ['error msg']})
        mock_serializer.save.side_effect = err

        mock_request = Mock()
        mock_request.user = Mock()

        with self.assertRaises(ValidationError) as cm:
            ChangeRequestService.create.__wrapped__(mock_serializer, mock_request)

        self.assertIn('error msg', str(cm.exception.detail['field'][0]))

    def test_create_raises_validation_error_with_messages(self):
        mock_serializer = Mock()
        err = DjangoValidationError(['error msg list'])
        mock_serializer.save.side_effect = err

        mock_request = Mock()
        mock_request.user = Mock()

        with self.assertRaises(ValidationError) as cm:
            ChangeRequestService.create.__wrapped__(mock_serializer, mock_request)

        self.assertIn('error msg list', str(cm.exception.detail[0]))


class ChangeNoticeServiceTests(SimpleTestCase):
    def test_create_raises_validation_error_with_message_dict(self):
        mock_serializer = Mock()
        err = DjangoValidationError({'field': ['error msg']})
        mock_serializer.save.side_effect = err

        mock_request = Mock()
        mock_request.user = Mock()

        with self.assertRaises(ValidationError) as cm:
            ChangeNoticeService.create.__wrapped__(mock_serializer, mock_request)

        self.assertIn('error msg', str(cm.exception.detail['field'][0]))

    def test_create_raises_validation_error_with_messages(self):
        mock_serializer = Mock()
        err = DjangoValidationError(['error msg list'])
        mock_serializer.save.side_effect = err

        mock_request = Mock()
        mock_request.user = Mock()

        with self.assertRaises(ValidationError) as cm:
            ChangeNoticeService.create.__wrapped__(mock_serializer, mock_request)

        self.assertIn('error msg list', str(cm.exception.detail[0]))
