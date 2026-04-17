import logging
import uuid

from .request_context import clear_request_context, set_request_context

logger = logging.getLogger(__name__)


PUBLIC_API_PREFIXES = (
    '/api/auth/login/',
    '/api/auth/token/',
    '/api/auth/token/refresh/',
    '/api/health/status/',
    '/api/v1/auth/login/',
    '/api/v1/auth/token/',
    '/api/v1/auth/token/refresh/',
    '/api/v1/health/status/',
)


def _extract_jwt_claims(request):
    """Extract tenant_id and plant_id from the verified JWT token.

    SECURITY: These values MUST come from the JWT (server-signed) rather than
    client-supplied headers.  Client headers like X-Tenant-ID are trivially
    spoofed and must never be trusted for authorization decisions.
    """
    tenant_id = ''
    plant_id = ''
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            validated = JWTAuthentication().get_validated_token(
                auth_header.split(' ', 1)[1].encode()
            )
            tenant_id = validated.get('tenant_id', '') or ''
            plant_id = validated.get('plant_id', '') or ''
        except Exception:
            # Token is invalid or expired — DRF will reject the request later
            pass
    return tenant_id, plant_id


class RequestContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get('X-Correlation-ID') or uuid.uuid4().hex

        # Derive tenant/plant from JWT claims (server-signed), NOT from
        # client headers which are trivially spoofable.
        tenant_id, plant_id = _extract_jwt_claims(request)

        # Log a warning if client sent tenant/plant headers (potential spoof attempt)
        if request.headers.get('X-Tenant-ID') or request.headers.get('X-Plant-ID'):
            logger.warning(
                'Client sent X-Tenant-ID/X-Plant-ID headers — these are ignored '
                'in favor of JWT claims. corr=%s',
                correlation_id,
            )

        tokens = set_request_context(correlation_id, tenant_id, plant_id)
        request.correlation_id = correlation_id
        request.request_scope = {
            'tenant_id': tenant_id,
            'plant_id': plant_id,
            'requires_auth': request.path.startswith('/api/') and not request.path.startswith(PUBLIC_API_PREFIXES),
        }
        try:
            response = self.get_response(request)
        finally:
            clear_request_context(tokens)

        response['X-Correlation-ID'] = correlation_id
        if tenant_id:
            response['X-Tenant-ID'] = tenant_id
        if plant_id:
            response['X-Plant-ID'] = plant_id
        return response

