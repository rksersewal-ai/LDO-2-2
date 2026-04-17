from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CrawlJobViewSet,
    DeduplicationGroupDecisionView,
    DeduplicationGroupDetailView,
    DeduplicationGroupIgnoreView,
    DeduplicationGroupListView,
    DocumentViewSet,
    DuplicateDecisionViewSet,
    HashBackfillJobViewSet,
    InitialRunActionView,
    InitialRunSummaryView,
    IndexedSourceViewSet,
    OcrJobViewSet,
    OcrResultView,
)

router = DefaultRouter()
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"ocr/jobs", OcrJobViewSet, basename="ocr-job")
router.register(r"indexing/sources", IndexedSourceViewSet, basename="indexed-source")
router.register(r"indexing/crawl-jobs", CrawlJobViewSet, basename="crawl-job")
router.register(
    r"indexing/hash-backfill-jobs", HashBackfillJobViewSet, basename="hash-backfill-job"
)
router.register(
    r"deduplication/decisions", DuplicateDecisionViewSet, basename="duplicate-decision"
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "admin/initial-run/",
        InitialRunSummaryView.as_view(),
        name="initial-run-summary",
    ),
    path(
        "admin/initial-run/actions/",
        InitialRunActionView.as_view(),
        name="initial-run-action",
    ),
    path("ocr/results/<str:document_id>/", OcrResultView.as_view(), name="ocr_result"),
    path(
        "deduplication/groups/",
        DeduplicationGroupListView.as_view(),
        name="deduplication-group-list",
    ),
    path(
        "deduplication/groups/<path:group_key>/",
        DeduplicationGroupDetailView.as_view(),
        name="deduplication-group-detail",
    ),
    path(
        "deduplication/groups/<path:group_key>/decision/",
        DeduplicationGroupDecisionView.as_view(),
        name="deduplication-group-decision",
    ),
    path(
        "deduplication/groups/<path:group_key>/ignore/",
        DeduplicationGroupIgnoreView.as_view(),
        name="deduplication-group-ignore",
    ),
]
