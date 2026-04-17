from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AuditLogViewSet,
    CurrentUserView,
    DashboardStatsView,
    HealthStatusView,
    InboxView,
    LoginView,
    LogoutView,
    ReportJobRetryView,
    ReportJobDetailView,
    ReportJobListCreateView,
    SearchHistoryView,
    SearchView,
    WorkflowItemActionView,
)

router = DefaultRouter()
router.register(r'audit/log', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('search/', SearchView.as_view(), name='search'),
    path('search/history/', SearchHistoryView.as_view(), name='search_history'),
    path('inbox/', InboxView.as_view(), name='inbox'),
    path('workflow-items/<path:item_id>/act/', WorkflowItemActionView.as_view(), name='workflow-item-action'),
    path('report-jobs/', ReportJobListCreateView.as_view(), name='report-jobs'),
    path('report-jobs/<uuid:job_id>/', ReportJobDetailView.as_view(), name='report-job-detail'),
    path('report-jobs/<uuid:job_id>/retry/', ReportJobRetryView.as_view(), name='report-job-retry'),
    path('health/status/', HealthStatusView.as_view(), name='health_status'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
]
