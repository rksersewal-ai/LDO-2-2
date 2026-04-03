import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from edms_api.throttles import HealthRateThrottle, LoginRateThrottle
from edms_api.models import AuditLog

from .serializers import AuditLogSerializer, ReportJobCreateSerializer, ReportJobSerializer, WorkflowActionSerializer
from .services import AuditService, DashboardService, InboxService, ReportJobService, SearchService, WorkflowActionService
from .api_response import error_response, success_response

logger = logging.getLogger(__name__)


def resolve_user_role(user):
    group_names = list(user.groups.values_list('name', flat=True))
    explicit_role = getattr(user, 'role', None)
    if explicit_role:
        return explicit_role
    if group_names:
        return group_names[0].lower()
    if user.is_superuser or user.is_staff:
        return 'admin'
    return 'viewer'


def serialize_user(user):
    return {
        'id': str(user.id),
        'username': user.username,
        'name': user.get_full_name() or user.username,
        'designation': getattr(user, 'designation', ''),
        'email': user.email,
        'role': resolve_user_role(user),
        'department': getattr(user, 'department', ''),
    }


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return error_response('invalid_credentials', 'Invalid credentials', status_code=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        AuditService.log(
            'LOGIN',
            'System',
            user=user,
            entity=user.username,
            details={'correlation_id': getattr(request, 'correlation_id', '')},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response(
            {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': serialize_user(user)},
            status_code=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        AuditService.log(
            'LOGOUT',
            'System',
            user=request.user,
            entity=request.user.username,
            details={'correlation_id': getattr(request, 'correlation_id', '')},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response({'message': 'Logged out successfully'})


class SearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw_status_filters = request.query_params.getlist('status')
        if not raw_status_filters:
            raw_status = request.query_params.get('status', '')
            raw_status_filters = [part.strip() for part in raw_status.split(',') if part.strip()]

        query = request.query_params.get('q', '').strip()
        scope = request.query_params.get('scope', 'ALL')
        duplicate_filter = request.query_params.get('duplicates', 'include')
        source_filter = request.query_params.get('source')
        class_filter = request.query_params.get('class')
        hash_status = request.query_params.get('hash_status')
        pl_linked = request.query_params.get('pl_linked')
        date_range = request.query_params.get('date_range') or request.query_params.get('date_window')
        if len(query) < 2:
            return error_response('query_too_short', 'Query too short', status_code=status.HTTP_400_BAD_REQUEST)
        AuditService.log(
            'SEARCH',
            'System',
            user=request.user,
            entity=query,
            details={
                'scope': scope,
                'duplicates': duplicate_filter,
                'source': source_filter,
                'class': class_filter,
                'hash_status': hash_status,
                'pl_linked': pl_linked,
                'status': raw_status_filters,
                'date_range': date_range,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return success_response(
            SearchService.search(
                query,
                scope,
                duplicate_filter,
                user=request.user,
                source_filter=source_filter,
                class_filter=class_filter,
                hash_status=hash_status,
                pl_linked=pl_linked,
                status_filters=raw_status_filters,
                date_range=date_range,
            ),
            meta={'query': query, 'scope': scope},
        )


class SearchHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response({'searches': SearchService.history_for_user(request.user)})


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response({'items': InboxService.items_for_user(request.user)})


class WorkflowItemActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, item_id):
        serializer = WorkflowActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = WorkflowActionService.act(
                item_id,
                action=serializer.validated_data['action'],
                user=request.user,
                notes=serializer.validated_data.get('notes', ''),
                comment=serializer.validated_data.get('comment', ''),
                reason=serializer.validated_data.get('reason', ''),
                bypass_reason=serializer.validated_data.get('bypass_reason', ''),
                effectivity_date=serializer.validated_data.get('effectivity_date'),
                request=request,
            )
        except ObjectDoesNotExist as exc:
            return error_response('item_not_found', str(exc), status_code=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            raise ValidationError({'action': [str(exc)]}) from exc
        return success_response(
            {
                'item_id': result['item_id'],
                'status': result['status'],
                'result': result['result'],
                'target': result['target'],
                'payload': result['payload'],
            },
        )


class ReportJobListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = ReportJobService.queryset(
            request.user,
            status_filter=request.query_params.get('status'),
            report_type=request.query_params.get('report_type'),
            export_format=request.query_params.get('export_format') or request.query_params.get('file_format'),
        )
        return success_response(
            {'results': ReportJobSerializer(jobs[:100], many=True).data},
            meta={'total': jobs.count()},
        )

    def post(self, request):
        serializer = ReportJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = ReportJobService.create(
            report_type=serializer.validated_data['report_type'],
            export_format=serializer.validated_data.get('format', 'xlsx'),
            filters=serializer.validated_data.get('filters', {}),
            parameters=serializer.validated_data.get('parameters', {}),
            user=request.user,
        )
        return success_response(ReportJobSerializer(job).data, status_code=status.HTTP_202_ACCEPTED)


class ReportJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(ReportJobService.queryset(request.user), pk=job_id)
        return success_response(ReportJobSerializer(job).data)


class ReportJobRetryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id):
        job = get_object_or_404(ReportJobService.queryset(request.user), pk=job_id)
        if job.status != 'FAILED':
            return error_response(
                'invalid_state',
                'Only failed report jobs can be retried.',
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        job = ReportJobService.retry(job, user=request.user)
        return success_response(ReportJobSerializer(job).data, status_code=status.HTTP_202_ACCEPTED)


class HealthStatusView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [HealthRateThrottle]

    def get(self, request):
        import psutil

        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
            db_status = 'OK'
        except Exception as exc:  # pragma: no cover
            logger.exception('Health check database probe failed')
            db_status = 'ERROR'

        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk_root = settings.BASE_DIR.anchor or str(settings.BASE_DIR)
        disk = psutil.disk_usage(disk_root)
        return success_response(
            {
                'status': 'OK',
                'timestamp': timezone.now(),
                'services': {'database': db_status, 'ocr': 'OK', 'cache': 'OK'},
                'metrics': {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'disk_percent': disk.percent,
                },
            },
        )


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success_response(DashboardService.stats())


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not (self.request.user.is_superuser or self.request.user.is_staff):
            queryset = queryset.filter(user=self.request.user)
        user = self.request.query_params.get('user')
        if user and (self.request.user.is_superuser or self.request.user.is_staff):
            queryset = queryset.filter(user__username=user)
        module = self.request.query_params.get('module')
        if module:
            queryset = queryset.filter(module=module)
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        return queryset.order_by('-created_at')
