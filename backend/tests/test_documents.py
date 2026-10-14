"""Document upload & indexing tests."""

import io
import pytest


@pytest.mark.asyncio
async def test_list_documents(client, operator_headers):
    """Authenticated user can list indexed knowledge base documents."""
    resp = await client.get("/api/documents", headers=operator_headers)
    assert resp.status_code == 200
    docs = resp.json()
    assert isinstance(docs, list)
    assert len(docs) >= 5  # Seeded documents
    filenames = [d["filename"] for d in docs]
    assert "sla_policy.pdf" in filenames


@pytest.mark.asyncio
async def test_document_upload_rbac_and_ingestion(client, operator_headers, manager_headers, admin_headers):
    """Verify document upload restrictions and full ingestion flow."""
    txt_content = b"Special Procurement Directive: All hydraulic actuators must undergo secondary pressure tests before dispatch."
    file_payload = {"file": ("procurement_directive.txt", io.BytesIO(txt_content), "text/plain")}

    # 1. Operator cannot upload (403 Forbidden)
    op_resp = await client.post("/api/documents/upload", files=file_payload, headers=operator_headers)
    assert op_resp.status_code == 403

    # 2. Manager can upload
    file_payload = {"file": ("procurement_directive.txt", io.BytesIO(txt_content), "text/plain")}
    mgr_resp = await client.post("/api/documents/upload", files=file_payload, headers=manager_headers)
    assert mgr_resp.status_code == 201
    doc_data = mgr_resp.json()
    doc_id = doc_data["id"]
    assert doc_data["status"] == "indexed"

    # 3. Operator cannot delete (403 Forbidden)
    del_op = await client.delete(f"/api/documents/{doc_id}", headers=operator_headers)
    assert del_op.status_code == 403

    # 4. Admin can delete
    del_admin = await client.delete(f"/api/documents/{doc_id}", headers=admin_headers)
    assert del_admin.status_code == 200
    assert "deleted" in del_admin.json()["message"]


@pytest.mark.asyncio
async def test_document_cloud_download_and_presigned_url(client, manager_headers, operator_headers, admin_headers):
    """Verify downloading pristine document from Neon Object Storage and generating presigned URLs."""
    raw_content = b"Neon Cloud Object Storage Verification Document: ISO-9001 quality audit checklist."
    file_payload = {"file": ("quality_checklist.txt", io.BytesIO(raw_content), "text/plain")}

    # 1. Ingest document
    upload_resp = await client.post("/api/documents/upload", files=file_payload, headers=manager_headers)
    assert upload_resp.status_code == 201
    doc_id = upload_resp.json()["id"]

    try:
        # 2. Stream download raw bytes directly
        download_resp = await client.get(f"/api/documents/{doc_id}/download", headers=operator_headers)
        assert download_resp.status_code == 200
        assert download_resp.content == raw_content
        assert "quality_checklist.txt" in download_resp.headers.get("content-disposition", "")

        # 3. Request signed presigned download URL
        url_resp = await client.get(f"/api/documents/{doc_id}/download-url", headers=operator_headers)
        assert url_resp.status_code == 200
        data = url_resp.json()
        assert "download_url" in data
        assert data["download_url"].startswith("https://")
        assert data["filename"] == "quality_checklist.txt"
        assert data["expires_in_seconds"] == 3600
    finally:
        # 4. Clean up
        await client.delete(f"/api/documents/{doc_id}", headers=admin_headers)

