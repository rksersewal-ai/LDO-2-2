"""
Email Notification Service
Sends transactional emails via SMTP with retry support.
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

logger = logging.getLogger(__name__)

# ─── Config from environment ──────────────────────────────────────────────────
SMTP_HOST = os.getenv("EMAIL_HOST", "")
SMTP_PORT = int(os.getenv("EMAIL_PORT", 587))
SMTP_USER = os.getenv("EMAIL_HOST_USER", "")
SMTP_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() == "true"
DEFAULT_FROM = os.getenv("DEFAULT_FROM_EMAIL", "noreply@example.com")


def _is_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER)


class EmailNotificationService:
    """Send email notifications for document events and approvals."""

    @staticmethod
    def send(
        to: List[str],
        subject: str,
        html_body: str,
        plain_body: Optional[str] = None,
        from_address: str = DEFAULT_FROM,
        dry_run: bool = False,
    ) -> bool:
        """Send an HTML email. Logs and skips gracefully when SMTP is not configured."""
        if not _is_configured():
            logger.info(
                "Email not configured — skipping send to %s: %s", to, subject
            )
            return False

        if dry_run:
            logger.info("[DRY RUN] Would send email to %s: %s", to, subject)
            return True

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = ", ".join(to)

        if plain_body:
            msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                if USE_TLS:
                    server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(from_address, to, msg.as_string())
            logger.info("Email sent to %s: %s", to, subject)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to, exc)
            return False

    @staticmethod
    def notify_document_uploaded(to: List[str], document_id: str, filename: str) -> bool:
        subject = f"[EDMS] Document Uploaded: {filename}"
        html = (
            f"<p>A new document has been uploaded to the EDMS system.</p>"
            f"<p><strong>Document ID:</strong> {document_id}<br>"
            f"<strong>Filename:</strong> {filename}</p>"
        )
        return EmailNotificationService.send(to, subject, html)

    @staticmethod
    def notify_approval_required(to: List[str], record_id: str, description: str) -> bool:
        subject = f"[EDMS] Approval Required: {record_id}"
        html = (
            f"<p>A work record requires your approval.</p>"
            f"<p><strong>Record ID:</strong> {record_id}<br>"
            f"<strong>Description:</strong> {description}</p>"
        )
        return EmailNotificationService.send(to, subject, html)

    @staticmethod
    def notify_ocr_complete(to: List[str], document_id: str, status: str) -> bool:
        subject = f"[EDMS] OCR {status.title()}: {document_id}"
        html = (
            f"<p>OCR processing for document <strong>{document_id}</strong> "
            f"has completed with status: <strong>{status}</strong>.</p>"
        )
        return EmailNotificationService.send(to, subject, html)
