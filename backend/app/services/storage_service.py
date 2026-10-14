"""Neon S3-Compatible Object Storage Service for cloud document storage."""

import asyncio
import logging
from typing import Any, Dict, Optional
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("storage_service")


class StorageService:
    """Manages document uploads, downloads, presigned URLs, and deletions on Neon Object Storage."""

    _client = None

    @classmethod
    def get_client(cls):
        """Initializes and caches the boto3 S3 client with Neon S3 endpoint."""
        if cls._client is None:
            if not settings.NEON_STORAGE_ENDPOINT or not settings.NEON_STORAGE_ACCESS_KEY_ID:
                logger.warning("Neon storage credentials or endpoint not fully configured.")
                return None

            cls._client = boto3.client(
                "s3",
                endpoint_url=settings.NEON_STORAGE_ENDPOINT,
                aws_access_key_id=settings.NEON_STORAGE_ACCESS_KEY_ID,
                aws_secret_access_key=settings.NEON_STORAGE_SECRET_ACCESS_KEY,
                region_name=settings.NEON_STORAGE_REGION,
                config=Config(
                    s3={"addressing_style": "path"},
                    signature_version="s3v4",
                ),
            )
        return cls._client

    @classmethod
    async def upload_file(
        cls,
        file_bytes: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> Optional[str]:
        """Uploads file bytes to Neon Object Storage bucket asynchronously."""
        client = cls.get_client()
        if client is None:
            logger.warning(f"Storage client not initialized. Skipping upload for key '{key}'.")
            return None

        def _upload():
            client.put_object(
                Bucket=settings.NEON_STORAGE_BUCKET,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            return key

        try:
            return await asyncio.to_thread(_upload)
        except Exception as e:
            logger.error(f"Failed to upload object '{key}' to Neon storage: {e}")
            raise

    @classmethod
    async def download_file(cls, key: str) -> Optional[Dict[str, Any]]:
        """Downloads an object from Neon Object Storage. Returns dict with body, content_type, and content_length."""
        client = cls.get_client()
        if client is None:
            raise RuntimeError("Neon storage client not configured.")

        def _download():
            response = client.get_object(
                Bucket=settings.NEON_STORAGE_BUCKET,
                Key=key,
            )
            body_bytes = response["Body"].read()
            return {
                "body": body_bytes,
                "content_type": response.get("ContentType", "application/octet-stream"),
                "content_length": response.get("ContentLength", len(body_bytes)),
            }

        try:
            return await asyncio.to_thread(_download)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                logger.warning(f"Object '{key}' not found in Neon storage.")
                return None
            logger.error(f"Failed to download object '{key}' from Neon storage: {e}")
            raise
        except Exception as e:
            logger.error(f"Error downloading object '{key}': {e}")
            raise

    @classmethod
    async def delete_file(cls, key: str) -> bool:
        """Deletes an object from Neon Object Storage bucket."""
        client = cls.get_client()
        if client is None:
            return False

        def _delete():
            client.delete_object(
                Bucket=settings.NEON_STORAGE_BUCKET,
                Key=key,
            )
            return True

        try:
            return await asyncio.to_thread(_delete)
        except Exception as e:
            logger.error(f"Failed to delete object '{key}' from Neon storage: {e}")
            return False

    @classmethod
    def generate_presigned_url(cls, key: str, expires_in: int = 3600) -> Optional[str]:
        """Generates a presigned GET URL for direct browser access / download."""
        client = cls.get_client()
        if client is None:
            return None

        try:
            url = client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": settings.NEON_STORAGE_BUCKET,
                    "Key": key,
                },
                ExpiresIn=expires_in,
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for key '{key}': {e}")
            return None
