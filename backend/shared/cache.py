"""
Caching utilities for read-heavy API endpoints.

Uses Django's cache framework (Redis in production, LocMem in debug).
Provides:
  - cache_key() for consistent key generation
  - cached_response() for wrapping paginated responses with cache
  - invalidate_cache() for clearing caches on write operations
"""

import hashlib
import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 60 * 5  # 5 minutes


def cache_key(prefix: str, **kwargs) -> str:
    """Generate a deterministic cache key from prefix and keyword arguments.

    Example:
        cache_key('doc-list', user_id=42, page=1, status='APPROVED')
        → 'edms:doc-list:a1b2c3d4'
    """
    parts = [str(v) for v in sorted(kwargs.items())]
    raw = ':'.join(parts)
    digest = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f'edms:{prefix}:{digest}'


def get_cached(key: str):
    """Retrieve a value from cache, or None if missing."""
    return cache.get(key)


def set_cached(key: str, value, timeout=DEFAULT_TIMEOUT):
    """Store a value in cache with the given timeout (seconds)."""
    cache.set(key, value, timeout)
    return value


def invalidate_prefix(prefix: str):
    """Invalidate all keys with the given prefix.

    NOTE: This uses cache.delete_pattern() when available (Redis),
    otherwise it's a no-op. For precise invalidation, use delete(key).
    """
    try:
        # Redis backend supports delete_pattern
        cache.delete_pattern(f'edms:{prefix}:*')
    except (AttributeError, NotImplementedError):
        logger.debug('delete_pattern not supported — skipping prefix invalidation for %s', prefix)


def invalidate_key(key: str):
    """Delete a specific cache key."""
    cache.delete(key)


def cached_view(timeout=DEFAULT_TIMEOUT):
    """Decorator for DRF list views that caches the paginated response.

    The cache key is derived from the URL query params + user ID.
    Cache is automatically invalidated on write operations via
    EventService → invalidate_prefix().

    Usage:
        @cached_view(timeout=120)
        def list(self, request, *args, **kwargs):
            return super().list(request, *args, **kwargs)
    """
    def decorator(func):
        def wrapper(self, request, *args, **kwargs):
            # Don't cache for unauthenticated or superuser requests
            user_id = getattr(request.user, 'id', 'anon')
            if user_id == 'anon':
                return func(self, request, *args, **kwargs)

            query_params = dict(sorted(request.query_params.items()))
            key = cache_key(
                f'{self.__class__.__module__}.{self.__class__.__name__}.{func.__name__}',
                user_id=user_id,
                **query_params,
            )

            cached_data = get_cached(key)
            if cached_data is not None:
                from rest_framework.response import Response
                return Response(cached_data)

            response = func(self, request, *args, **kwargs)

            if response.status_code == 200:
                set_cached(key, response.data, timeout=timeout)

            return response

        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper

    return decorator