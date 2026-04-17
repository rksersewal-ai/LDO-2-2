"""
LDO-2 EDMS — Production Load Test Suite
Target: 100,000 concurrent users on enterprise LAN

User Mix (weights sum to 100):
  - DocumentViewer (40%) — browse, search, preview documents
  - PLUser (20%)          — PL hub, link/unlink documents, BOM tree
  - UploadUser (10%)      — upload documents + ingest
  - WorkLedgerUser (10%)  — create/list/verify work records
  - ApproverUser (10%)    — list/approve/reject approvals + workflow
  - AdminUser (5%)        — audit log, OCR monitor, health
  - ReportUser (5%)       — dashboard stats, report exports

Performance Targets:
  - p95 response time < 500ms for read endpoints
  - p95 response time < 2000ms for write endpoints
  - Error rate < 0.1%
  - Throughput > 5000 RPS at peak

Usage:
  # Basic smoke test (single user)
  locust -f locustfile.py --headless -u 1 -r 1 --run-time 30s

  # Ramp to 1000 users
  locust -f locustfile.py --headless -u 1000 -r 50 --run-time 5m

  # Full 100k target (requires distributed mode)
  locust -f locustfile.py --master
  locust -f locustfile.py --worker --master-host=<master-ip>
"""

import os
import random
import string
from locust import HttpUser, between, task, events, tag

API_PREFIX = os.getenv("LOCUST_API_PREFIX", "/api/v1")

# Multiple test accounts for realistic token distribution
TEST_USERS = [
    {"username": os.getenv("LOCUST_USERNAME", "admin"), "password": os.getenv("LOCUST_PASSWORD", "admin123")},
    {"username": os.getenv("LOCUST_USERNAME_2", "a.kowalski"), "password": os.getenv("LOCUST_PASSWORD_2", "ldo2pass")},
    {"username": os.getenv("LOCUST_USERNAME_3", "m.chen"), "password": os.getenv("LOCUST_PASSWORD_3", "ldo2pass")},
    {"username": os.getenv("LOCUST_USERNAME_4", "s.patel"), "password": os.getenv("LOCUST_PASSWORD_4", "ldo2pass")},
]


def _url(path: str) -> str:
    return f"{API_PREFIX}{path}"


def _random_string(length: int = 8) -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


class BaseEdmsUser(HttpUser):
    abstract = True
    wait_time = between(1, 5)

    def on_start(self):
        creds = random.choice(TEST_USERS)
        resp = self.client.post(
            _url("/auth/token/"),
            json={"username": creds["username"], "password": creds["password"]},
            name="auth/token",
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("access")
            if token:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                self._refresh_token = data.get("refresh")
        else:
            # Fallback: try login endpoint
            resp = self.client.post(
                _url("/auth/login/"),
                json={"username": creds["username"], "password": creds["password"]},
                name="auth/login",
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get("access") or data.get("token")
                if token:
                    self.client.headers.update({"Authorization": f"Bearer {token}"})
                    self._refresh_token = data.get("refresh")


# ─── Document Viewer (40%) ────────────────────────────────────────────────────

class DocumentViewerUser(BaseEdmsUser):
    weight = 40

    @task(5)
    @tag("read", "documents")
    def browse_documents(self):
        page = random.randint(1, 50)
        ordering = random.choice(["-created_at", "doc_number", "title", "-updated_at"])
        self.client.get(
            _url("/documents/"),
            params={"page": page, "page_size": 20, "ordering": ordering},
            name="documents/list",
        )

    @task(3)
    @tag("read", "search")
    def search_documents(self):
        query = random.choice([
            "pump", "valve", "assembly", "iso", "revision",
            "specification", "drawing", "bearing", "shaft", "seal",
        ])
        self.client.get(
            _url("/search/"),
            params={"q": query, "page": 1},
            name="search/query",
        )

    @task(2)
    @tag("read", "documents")
    def view_document_detail(self):
        doc_id = random.randint(1, 2000)
        self.client.get(_url(f"/documents/{doc_id}/"), name="documents/detail")

    @task(1)
    @tag("read", "documents")
    def view_document_versions(self):
        doc_id = random.randint(1, 2000)
        self.client.get(_url(f"/documents/{doc_id}/versions/"), name="documents/versions")

    @task(1)
    @tag("read", "search")
    def search_history(self):
        self.client.get(_url("/search/history/"), name="search/history")


# ─── PL User (20%) ────────────────────────────────────────────────────────────

class PLUser(BaseEdmsUser):
    weight = 20

    @task(4)
    @tag("read", "pl")
    def browse_pl_items(self):
        self.client.get(
            _url("/pl-items/"),
            params={"page": random.randint(1, 10), "page_size": 20},
            name="pl/items/list",
        )

    @task(3)
    @tag("read", "pl")
    def view_pl_detail(self):
        pl_id = random.randint(1, 250)
        self.client.get(_url(f"/pl-items/{pl_id}/"), name="pl/items/detail")

    @task(2)
    @tag("read", "pl")
    def view_bom_tree(self):
        pl_id = random.randint(1, 250)
        self.client.get(_url(f"/pl-items/{pl_id}/bom-tree/"), name="pl/bom-tree")

    @task(1)
    @tag("write", "pl")
    def link_document(self):
        pl_id = random.randint(1, 250)
        self.client.post(
            _url(f"/pl-items/{pl_id}/link-document/"),
            json={"document": random.randint(1, 2000)},
            name="pl/link-document",
        )

    @task(1)
    @tag("read", "pl")
    def view_baselines(self):
        self.client.get(
            _url("/baselines/"),
            params={"page": 1},
            name="pl/baselines/list",
        )


# ─── Upload User (10%) ────────────────────────────────────────────────────────

class UploadUser(BaseEdmsUser):
    weight = 10

    @task(1)
    @tag("write", "documents")
    def upload_document(self):
        content = os.urandom(1024 * random.randint(10, 500))  # 10-500 KB synthetic file
        files = {"file": (f"load-test-{_random_string()}.txt", content, "text/plain")}
        data = {
            "title": f"Load Test Document {_random_string(12)}",
            "doc_number": f"LT-{random.randint(100000, 999999)}",
            "document_type": random.choice(["drawing", "specification", "report", "manual"]),
        }
        self.client.post(_url("/documents/"), files=files, data=data, name="documents/upload")


# ─── Work Ledger User (10%) ───────────────────────────────────────────────────

class WorkLedgerUser(BaseEdmsUser):
    weight = 10

    @task(3)
    @tag("read", "work")
    def list_work_records(self):
        self.client.get(
            _url("/work-records/"),
            params={"page": random.randint(1, 10), "page_size": 20},
            name="work-records/list",
        )

    @task(2)
    @tag("write", "work")
    def create_work_record(self):
        payload = {
            "date": "2026-04-01",
            "closingDate": "2026-04-30",
            "workCategory": random.choice(["Design", "Inspection", "Testing", "Procurement"]),
            "workType": random.choice(["New", "Modification", "Repair"]),
            "description": f"Load test record {_random_string(16)}",
        }
        self.client.post(_url("/work-records/"), json=payload, name="work-records/create")

    @task(1)
    @tag("read", "work")
    def view_inbox(self):
        self.client.get(_url("/inbox/"), name="inbox/list")


# ─── Approver User (10%) ──────────────────────────────────────────────────────

class ApproverUser(BaseEdmsUser):
    weight = 10

    @task(3)
    @tag("read", "approvals")
    def list_approvals(self):
        self.client.get(
            _url("/approvals/"),
            params={"page": 1, "page_size": 20},
            name="approvals/list",
        )

    @task(2)
    @tag("write", "approvals")
    def approve_item(self):
        approval_id = random.randint(1, 500)
        self.client.post(
            _url(f"/approvals/{approval_id}/approve/"),
            json={"comment": "Locust auto-approve"},
            name="approvals/approve",
        )

    @task(1)
    @tag("write", "approvals")
    def workflow_action(self):
        workflow_id = random.randint(1, 2000)
        payload = {"action": random.choice(["approve", "reject"]), "comment": "locust action"}
        self.client.post(
            _url(f"/workflow-items/{workflow_id}/act/"),
            json=payload,
            name="workflow/act",
        )

    @task(2)
    @tag("read", "change-mgmt")
    def list_change_requests(self):
        self.client.get(
            _url("/change-requests/"),
            params={"page": 1},
            name="change-requests/list",
        )


# ─── Admin User (5%) ──────────────────────────────────────────────────────────

class AdminUser(BaseEdmsUser):
    weight = 5

    @task(3)
    @tag("read", "admin")
    def audit_log(self):
        self.client.get(
            _url("/audit/log/"),
            params={"page": random.randint(1, 5)},
            name="admin/audit-log",
        )

    @task(2)
    @tag("read", "admin")
    def ocr_monitor(self):
        self.client.get(
            _url("/ocr-jobs/"),
            params={"page": 1},
            name="admin/ocr-jobs",
        )

    @task(2)
    @tag("read", "admin")
    def health_check(self):
        self.client.get(_url("/health/status/"), name="admin/health")

    @task(1)
    @tag("read", "admin")
    def dedup_groups(self):
        self.client.get(_url("/dedup-groups/"), name="admin/dedup-groups")

    @task(1)
    @tag("read", "admin")
    def indexed_sources(self):
        self.client.get(_url("/indexed-sources/"), name="admin/indexed-sources")


# ─── Report User (5%) ─────────────────────────────────────────────────────────

class ReportUser(BaseEdmsUser):
    weight = 5

    @task(4)
    @tag("read", "reports")
    def dashboard_stats(self):
        self.client.get(_url("/dashboard/stats/"), name="reports/dashboard")

    @task(2)
    @tag("write", "reports")
    def create_report_export(self):
        payload = {
            "report_type": random.choice(["work_ledger", "document_register", "approval_summary"]),
            "format": random.choice(["xlsx", "csv"]),
            "filters": {"from": "2025-01-01", "to": "2026-04-01"},
        }
        self.client.post(_url("/report-jobs/"), json=payload, name="reports/export-create")

    @task(1)
    @tag("read", "reports")
    def list_report_jobs(self):
        self.client.get(_url("/report-jobs/"), name="reports/jobs-list")


# ─── Event Hooks for Monitoring ────────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"""
    ╔══════════════════════════════════════════════════╗
    ║  LDO-2 EDMS Load Test Starting                  ║
    ║  Target: {environment.parsed_options.num_users if hasattr(environment, 'parsed_options') and environment.parsed_options else '?'} concurrent users                    ║
    ║  API: {API_PREFIX}                               ║
    ║  User mix: Doc(40) PL(20) Up(10) WL(10)         ║
    ║           Appr(10) Admin(5) Report(5)            ║
    ╚══════════════════════════════════════════════════╝
    """)
