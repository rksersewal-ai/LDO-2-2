"""
Standardized API response helpers.

All API responses follow a consistent envelope:
  Success: { "status": "success", "data": ..., "meta": { "correlation_id": ... } }
  Error:   { "status": "error",   "error": { "code": ..., "message": ..., "details": ... } }

The error envelope is already handled by shared/exceptions.py.
This module provides helpers for success responses.
"""

from rest_framework.response import Response

from .request_context import get_correlation_id


def success_response(data, *, status=200, meta=None, correlation_id=None):
    """Return a standardized success response envelope.

    Args:
        data: The response payload (dict, list, etc.)
        status: HTTP status code (default 200)
        meta: Optional metadata dict (correlation_id auto-included)
        correlation_id: Override correlation ID (auto-detected if omitted)

    Usage in views:
        return success_response(serializer.data, status=201)
    """
    corr_id = correlation_id or get_correlation_id() or ''
    response_meta = {'correlation_id': corr_id}
    if meta:
        response_meta.update(meta)

    return Response(
        {
            'status': 'success',
            'data': data,
            'meta': response_meta,
        },
        status=status,
    )


def success_paginated(paginated_data, *, meta=None, correlation_id=None):
    """Return a standardized paginated success response.

    Wraps the paginated data from StandardResultsSetPagination.

    Args:
        paginated_data: The response.data from the paginator
        meta: Optional metadata dict
        correlation_id: Override correlation ID
    """
    corr_id = correlation_id or get_correlation_id() or ''
    response_meta = {'correlation_id': corr_id}
    if meta:
        response_meta.update(meta)

    return Response(
        {
            'status': 'success',
            'data': paginated_data.get('results', paginated_data),
            'meta': {
                **response_meta,
                'pagination': {
                    'total': paginated_data.get('total', 0),
                    'page': paginated_data.get('page', 1),
                    'pageSize': paginated_data.get('pageSize', 20),
                    'next': paginated_data.get('next'),
                    'previous': paginated_data.get('previous'),
                },
            },
        },
    )


def accepted_response(data=None, *, message=None, correlation_id=None):
    """Return a 202 Accepted response for async operations.

    Args:
        data: Optional payload (e.g., job ID)
        message: Human-readable status message
        correlation_id: Override correlation ID
    """
    corr_id = correlation_id or get_correlation_id() or ''
    payload = {
        'status': 'accepted',
        'data': data or {},
        'meta': {
            'correlation_id': corr_id,
            'message': message or 'Request accepted for processing.',
        },
    }
    return Response(payload, status=202)