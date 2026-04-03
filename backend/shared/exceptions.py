import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .request_context import get_correlation_id

logger = logging.getLogger('django')


def _flatten_errors(data):
    if not isinstance(data, dict):
        return {'non_field_errors': data}
    flattened = {}
    for field, value in data.items():
        if field == 'detail':
            continue
        flattened[field] = value
    return flattened


def edms_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get('request')
    correlation_id = getattr(request, 'correlation_id', '') or get_correlation_id() or '-'

    if response is None:
        logger.exception('Unhandled API exception', exc_info=exc)
        return Response(
            {
                'error': {
                    'code': 'internal_error',
                    'message': 'An unexpected error occurred.',
                    'details': None,
                    'correlation_id': correlation_id,
                },
                'status': 'error',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    payload = response.data
    if isinstance(payload, dict) and 'detail' in payload:
        message = str(payload['detail'])
        errors = _flatten_errors(payload) or None
    elif isinstance(payload, dict):
        message = 'Validation failed.'
        errors = _flatten_errors(payload) or None
    else:
        message = 'Validation failed.'
        errors = {'non_field_errors': payload}

    response.data = {
        'error': {
            'code': getattr(exc, 'default_code', 'api_error'),
            'message': message,
            'details': errors,
            'correlation_id': correlation_id,
        },
        'status': 'error',
    }
    return response
