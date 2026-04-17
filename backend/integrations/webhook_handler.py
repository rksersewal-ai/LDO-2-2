"""
Webhook Handler
Dispatches EDMS domain events to external systems via HTTP webhooks.
"""
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# ─── Supported event types ────────────────────────────────────────────────────
DOCUMENT_UPLOADED = "document.uploaded"
DOCUMENT_UPDATED = "document.updated"
DOCUMENT_ARCHIVED = "document.archived"
OCR_COMPLETE = "ocr.complete"
WORK_RECORD_CREATED = "work_record.created"
WORK_RECORD_APPROVED = "work_record.approved"
APPROVAL_REQUESTED = "approval.requested"


def _sign_payload(secret: str, payload: bytes) -> str:
    """HMAC-SHA256 signature for payload verification."""
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


class WebhookHandler:
    """Dispatches events to registered webhook endpoints."""

    MAX_RETRIES = 3
    RETRY_DELAYS = [1, 5, 15]  # seconds

    @staticmethod
    def dispatch(
        event_type: str,
        payload: Dict[str, Any],
        endpoints: Optional[List[str]] = None,
        secret: Optional[str] = None,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Send event to all registered endpoints.
        Returns a summary of success/failure per endpoint.
        """
        if not REQUESTS_AVAILABLE:
            logger.warning("requests library not installed — webhooks disabled")
            return {"status": "skipped", "reason": "requests not installed"}

        # Fall back to env-configured endpoints
        if endpoints is None:
            env_endpoints = os.getenv("WEBHOOK_ENDPOINTS", "")
            endpoints = [e.strip() for e in env_endpoints.split(",") if e.strip()]

        if not endpoints:
            return {"status": "skipped", "reason": "no endpoints configured"}

        body = json.dumps(
            {"event": event_type, "data": payload, "timestamp": int(time.time())},
            default=str,
        ).encode()

        headers = {
            "Content-Type": "application/json",
            "X-EDMS-Event": event_type,
        }
        if secret:
            headers["X-EDMS-Signature"] = _sign_payload(secret, body)

        results: Dict[str, Any] = {}
        for url in endpoints:
            if dry_run:
                logger.info("[DRY RUN] Would POST %s to %s", event_type, url)
                results[url] = "dry_run"
                continue

            success = False
            for attempt, delay in enumerate(WebhookHandler.RETRY_DELAYS):
                try:
                    response = requests.post(
                        url, data=body, headers=headers, timeout=10
                    )
                    if response.ok:
                        logger.info("Webhook dispatched: %s → %s [%s]", event_type, url, response.status_code)
                        success = True
                        break
                    logger.warning(
                        "Webhook %s → %s returned %s (attempt %d)",
                        event_type, url, response.status_code, attempt + 1,
                    )
                except Exception as exc:
                    logger.error(
                        "Webhook %s → %s failed (attempt %d): %s",
                        event_type, url, attempt + 1, exc,
                    )
                if attempt < len(WebhookHandler.RETRY_DELAYS) - 1:
                    time.sleep(delay)

            results[url] = "ok" if success else "failed"

        return {"status": "dispatched", "results": results}
