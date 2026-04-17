import logging

from guardian.shortcuts import assign_perm, get_objects_for_user
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)


class PermissionService:
    DEFAULT_OBJECT_ACTIONS = ('view', 'change', 'delete')

    @staticmethod
    def _model_from_target(target):
        if hasattr(target, 'model'):
            return target.model
        if hasattr(target, '_meta'):
            return target._meta.model
        return target

    @classmethod
    def permission_label(cls, target, permission_codename: str | None):
        if not permission_codename:
            return ''
        if '.' in permission_codename:
            return permission_codename
        model = cls._model_from_target(target)
        return f'{model._meta.app_label}.{permission_codename}'

    @classmethod
    def model_permission_label(cls, target, action: str):
        model = cls._model_from_target(target)
        return cls.permission_label(model, f'{action}_{model._meta.model_name}')

    @classmethod
    def has_permission(cls, user, target, permission_codename: str | None):
        if not getattr(user, 'is_authenticated', False):
            return False
        if user.is_superuser:
            return True
        if not permission_codename:
            return True
        permission_label = cls.permission_label(target, permission_codename)
        if hasattr(target, 'model'):
            return user.has_perm(permission_label)
        return user.has_perm(permission_label, target) or user.has_perm(permission_label)

    @classmethod
    def require_permission(cls, user, target, permission_codename: str | None, *, detail: str | None = None):
        if not cls.has_permission(user, target, permission_codename):
            raise PermissionDenied(detail or 'You do not have permission to perform this action.')

    @classmethod
    def grant_default_object_permissions(cls, obj, *users, actions=None):
        granted = []
        object_actions = tuple(actions or cls.DEFAULT_OBJECT_ACTIONS)
        for user in users:
            if not getattr(user, 'is_authenticated', False):
                continue
            for action in object_actions:
                try:
                    permission_label = cls.model_permission_label(obj, action)
                    assign_perm(permission_label, user, obj)
                    granted.append(permission_label)
                except Exception:
                    continue
        return granted

    @classmethod
    def assign_default_object_permissions(cls, user, obj, *, include_delete=True):
        actions = ('view', 'change', 'delete') if include_delete else ('view', 'change')
        cls.grant_default_object_permissions(obj, user, actions=actions)

    @classmethod
    def scope_queryset(cls, queryset, user, permission_codename: str | None = None):
        if not getattr(user, 'is_authenticated', False):
            return queryset.none()
        if user.is_superuser:
            return queryset
        if not permission_codename:
            return queryset

        permission_label = cls.permission_label(queryset, permission_codename)
        if user.has_perm(permission_label):
            return queryset

        try:
            return get_objects_for_user(
                user,
                permission_label,
                klass=queryset,
                accept_global_perms=True,
            )
        except Exception:
            logger.exception(
                'scope_queryset failed for user=%s perm=%s — returning empty qs',
                user,
                permission_label,
            )
            return queryset.none()
