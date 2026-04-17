"""
S3 Integration Service
Handles document storage via AWS S3 (or S3-compatible APIs like LocalStack/MinIO).
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import boto3
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3 not installed — S3 integration disabled")


def _get_client():
    """Build an S3 client from environment settings."""
    if not BOTO3_AVAILABLE:
        raise RuntimeError("boto3 is required for S3 integration: pip install boto3")

    kwargs = dict(
        region_name=os.getenv("AWS_S3_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url  # LocalStack / MinIO

    return boto3.client("s3", **kwargs)


BUCKET = os.getenv("AWS_S3_BUCKET_NAME", "edms-documents")


class S3Integration:
    """Upload, download, and delete documents from S3."""

    @staticmethod
    def upload(
        file_content: bytes,
        s3_key: str,
        content_type: str = "application/octet-stream",
        metadata: Optional[dict] = None,
    ) -> str:
        """Upload a file and return its S3 URL."""
        try:
            client = _get_client()
            extra_args = {"ContentType": content_type}
            if metadata:
                extra_args["Metadata"] = {k: str(v) for k, v in metadata.items()}

            client.put_object(
                Bucket=BUCKET,
                Key=s3_key,
                Body=file_content,
                **extra_args,
            )
            logger.info("S3 upload success: s3://%s/%s", BUCKET, s3_key)
            return f"s3://{BUCKET}/{s3_key}"
        except Exception as exc:
            logger.error("S3 upload failed for key=%s: %s", s3_key, exc)
            raise

    @staticmethod
    def download(s3_key: str) -> bytes:
        """Download a file and return its bytes."""
        try:
            client = _get_client()
            response = client.get_object(Bucket=BUCKET, Key=s3_key)
            return response["Body"].read()
        except Exception as exc:
            logger.error("S3 download failed for key=%s: %s", s3_key, exc)
            raise

    @staticmethod
    def delete(s3_key: str) -> bool:
        """Soft-delete (move to /deleted/ prefix) rather than hard delete."""
        try:
            client = _get_client()
            deleted_key = f"deleted/{s3_key}"
            client.copy_object(
                Bucket=BUCKET,
                CopySource={"Bucket": BUCKET, "Key": s3_key},
                Key=deleted_key,
            )
            client.delete_object(Bucket=BUCKET, Key=s3_key)
            logger.info("S3 soft-delete: %s → %s", s3_key, deleted_key)
            return True
        except Exception as exc:
            logger.error("S3 delete failed for key=%s: %s", s3_key, exc)
            return False

    @staticmethod
    def generate_presigned_url(s3_key: str, expiry_seconds: int = 3600) -> str:
        """Generate a presigned download URL."""
        client = _get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )

    @staticmethod
    def health_check() -> dict:
        """Check S3 connectivity."""
        try:
            _get_client().head_bucket(Bucket=BUCKET)
            return {"status": "ok", "bucket": BUCKET}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}
