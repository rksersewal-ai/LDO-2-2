from rest_framework.response import Response


def success_response(data=None, *, meta=None, status_code=200):
    return Response(
        {
            'data': data,
            'meta': meta or {},
            'status': 'success',
        },
        status=status_code,
    )


def error_response(code: str, message: str, *, details=None, status_code=400):
    return Response(
        {
            'error': {
                'code': code,
                'message': message,
                'details': details,
            },
            'status': 'error',
        },
        status=status_code,
    )
