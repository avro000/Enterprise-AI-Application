"""End-to-End Integration Tests for OpsPilot AI Walking Skeleton."""

import pytest
from sqlalchemy import select
from app.database import async_session_maker
from app.models.audit_log import AuditLog


@pytest.mark.asyncio
async def test_full_walking_skeleton_e2e(client):
    """Executes the complete OpsPilot AI lifecycle:

    1. Operator logs in
    2. Queries Dashboard operational metrics
    3. Uses Context Fusion Chat to check an SLA risk order
    4. Manager logs in and inspects exception cases
    5. Manager triggers AI Exception Investigation
    6. Manager approves recommended actions
    7. Manager marks exception as resolved
    8. Validates audit trail integrity across the database
    """
    # Step 1: Operator logs in
    op_login = await client.post(
        "/api/auth/login",
        json={"email": "operator@opspilot.com", "password": "Operator@123456"},
    )
    assert op_login.status_code == 200
    op_token = op_login.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # Step 2: Query Dashboard metrics
    dash_resp = await client.get("/api/dashboard/metrics", headers=op_headers)
    assert dash_resp.status_code == 200
    metrics = dash_resp.json()
    assert metrics["documents_indexed"] >= 5
    assert metrics["exceptions_open"] > 0

    # Step 3: Context Fusion Chat query
    chat_resp = await client.post(
        "/api/chat",
        json={"question": "Is order ORD-48321 at risk of SLA breach?"},
        headers=op_headers,
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["intent"] == "hybrid"
    assert len(chat_data["sources"]) > 0

    # Step 4: Manager logs in
    mgr_login = await client.post(
        "/api/auth/login",
        json={"email": "manager@opspilot.com", "password": "Manager@123456"},
    )
    assert mgr_login.status_code == 200
    mgr_token = mgr_login.json()["access_token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # Step 5: List exceptions and locate an open case
    exc_list = await client.get("/api/exceptions?limit=10", headers=mgr_headers)
    assert exc_list.status_code == 200
    items = exc_list.json()["items"]
    assert len(items) > 0
    target_case = items[0]
    case_id = target_case["id"]

    # Step 6: Trigger automated AI investigation
    inv_resp = await client.post(f"/api/exceptions/{case_id}/investigate", headers=mgr_headers)
    assert inv_resp.status_code == 200

    detail_resp = await client.get(f"/api/exceptions/{case_id}", headers=mgr_headers)
    assert detail_resp.status_code == 200
    case_detail = detail_resp.json()
    assert case_detail["root_cause"] is not None
    assert len(case_detail["actions"]) > 0
    action_id = case_detail["actions"][0]["id"]

    # Step 7: Manager approves action
    app_resp = await client.post(
        f"/api/exceptions/{case_id}/actions/{action_id}/approve",
        json={"comment": "E2E automated approval test"},
        headers=mgr_headers,
    )
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "approved"

    # Step 8: Manager resolves the exception case
    res_resp = await client.post(f"/api/exceptions/{case_id}/resolve", headers=mgr_headers)
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"

    # Step 9: Verify audit trail
    async with async_session_maker() as session:
        stmt = select(AuditLog.event_type)
        events = (await session.execute(stmt)).scalars().all()
        assert "user_logged_in" in events
        assert "chat_query" in events
        assert "action_approved" in events
        assert "exception_resolved" in events

