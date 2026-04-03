import os
import random
from locust import HttpUser, between, task

API_PREFIX = os.getenv("LOCUST_API_PREFIX", "/api/v1")


def _with_prefix(path: str) -> str:
    return f"{API_PREFIX}{path}"


class BaseEdmsUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        # Token bootstrap is optional so the script can run in anonymous smoke mode.
        username = os.getenv("LOCUST_USERNAME")
        password = os.getenv("LOCUST_PASSWORD")
        if not username or not password:
            return
        resp = self.client.post(
            _with_prefix("/auth/token/"),
            json={"username": username, "password": password},
            name="auth/token",
        )
        if resp.status_code == 200:
            token = resp.json().get("access")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})


class DocumentViewerUser(BaseEdmsUser):
    weight = 40

    @task(4)
    def browse_documents(self):
        params = {
            "page": random.randint(1, 20),
            "ordering": random.choice(["-created_at", "doc_number", "title"]),
        }
        self.client.get(_with_prefix("/documents/"), params=params, name="documents/list")

    @task(3)
    def search_documents(self):
        query = random.choice(["pump", "valve", "assembly", "iso", "revision"])
        self.client.get(
            _with_prefix("/search/"),
            params={"q": query, "page": 1},
            name="documents/search",
        )

    @task(2)
    def preview_document(self):
        doc_id = random.randint(1, 2000)
        self.client.get(_with_prefix(f"/documents/{doc_id}/"), name="documents/detail")


class PlUser(BaseEdmsUser):
    weight = 20

    @task(3)
    def open_pl_hub(self):
        self.client.get(_with_prefix("/pl-items/"), params={"page": 1}, name="pl/items")

    @task(2)
    def link_unlink_document(self):
        payload = {
            "pl_item": random.randint(1, 250),
            "document": random.randint(1, 2000),
            "is_active": random.choice([True, False]),
        }
        self.client.post(_with_prefix("/pl-document-links/"), json=payload, name="pl/document-link")


class UploadUser(BaseEdmsUser):
    weight = 10

    @task
    def upload_document(self):
        content = b"synthetic-load-test-content"
        files = {"file": ("load-test.txt", content, "text/plain")}
        data = {
            "title": f"Load Test {random.randint(1000, 9999)}",
            "doc_number": f"LT-{random.randint(100000, 999999)}",
            "document_type": "drawing",
        }
        self.client.post(_with_prefix("/documents/"), files=files, data=data, name="documents/upload")


class WorkLedgerUser(BaseEdmsUser):
    weight = 10

    @task(2)
    def add_work_record(self):
        payload = {
            "file_number": f"WL-{random.randint(1000, 9999)}",
            "description": "Load test update",
        }
        self.client.post(_with_prefix("/work-records/"), json=payload, name="work-records/create")

    @task(1)
    def list_work_records(self):
        self.client.get(_with_prefix("/work-records/"), params={"page": 1}, name="work-records/list")


class ApproverUser(BaseEdmsUser):
    weight = 10

    @task(2)
    def list_approvals(self):
        self.client.get(_with_prefix("/approvals/"), params={"page": 1}, name="approvals/list")

    @task(1)
    def act_workflow(self):
        workflow_id = random.randint(1, 2000)
        payload = {"action": random.choice(["approve", "reject"]), "comment": "locust action"}
        self.client.post(
            _with_prefix(f"/workflow-items/{workflow_id}/act/"),
            json=payload,
            name="workflow/act",
        )


class AdminUser(BaseEdmsUser):
    weight = 5

    @task(2)
    def audit_log(self):
        self.client.get(_with_prefix("/audit/log/"), params={"page": 1}, name="admin/audit-log")

    @task(1)
    def ocr_monitor(self):
        self.client.get(_with_prefix("/ocr/jobs/"), params={"page": 1}, name="admin/ocr-jobs")

    @task(1)
    def settings_health(self):
        self.client.get(_with_prefix("/health/status/"), name="admin/health")


class ReportUser(BaseEdmsUser):
    weight = 5

    @task(3)
    def dashboard(self):
        self.client.get(_with_prefix("/dashboard/stats/"), name="reports/dashboard")

    @task(1)
    def create_report_export(self):
        payload = {
            "report_type": "work_ledger",
            "filters": {"from": "2025-01-01", "to": "2026-01-01"},
        }
        self.client.post(_with_prefix("/report-jobs/"), json=payload, name="reports/export-create")
