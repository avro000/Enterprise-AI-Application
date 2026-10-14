"""Exception detection, investigation, and approval tests."""

import pytest


@pytest.mark.asyncio
async def test_list_exceptions_and_pagination(client, operator_headers):
    """Authenticated users can query exceptions with status/severity filters."""
    # List all
    resp = await client.get("/api/exceptions", headers=operator_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["total"] > 0
    assert len(data["items"]) > 0

    # Filter by severity
    crit_resp = await client.get("/api/exceptions?severity=critical", headers=operator_headers)
    assert crit_resp.status_code == 200
    crit_data = crit_resp.json()
    for item in crit_data["items"]:
        assert item["severity"] == "critical"


@pytest.mark.asyncio
async def test_investigation_and_approval_flow(client, manager_headers, operator_headers):
    """Test full cycle: investigate case, generate recommendations, approve action, resolve case."""
    # 1. Fetch an open exception
    list_resp = await client.get("/api/exceptions", headers=manager_headers)
    assert list_resp.status_code == 200
    items = list_resp.json()["items"]
    case_id = items[0]["id"]

    # 2. Trigger investigation as manager
    inv_resp = await client.post(f"/api/exceptions/{case_id}/investigate", headers=manager_headers)
    assert inv_resp.status_code == 200
    assert inv_resp.json()["status"] == "recommendation_ready"

    # 3. Verify details updated
    detail_resp = await client.get(f"/api/exceptions/{case_id}", headers=manager_headers)
    assert detail_resp.status_code == 200
    case_detail = detail_resp.json()
    assert case_detail["root_cause"] is not None
    assert case_detail["business_impact"] is not None
    assert case_detail["confidence_score"] is not None
    assert len(case_detail["actions"]) > 0

    action_id = case_detail["actions"][0]["id"]

    # 4. Operator cannot approve (403 Forbidden)
    op_app = await client.post(
        f"/api/exceptions/{case_id}/actions/{action_id}/approve",
        json={"comment": "Operator trying to approve"},
        headers=operator_headers,
    )
    assert op_app.status_code == 403

    # 5. Manager approves action
    mgr_app = await client.post(
        f"/api/exceptions/{case_id}/actions/{action_id}/approve",
        json={"comment": "Approved alternative shipment per customer agreement"},
        headers=manager_headers,
    )
    assert mgr_app.status_code == 200
    app_data = mgr_app.json()
    assert app_data["status"] == "approved"
    assert app_data["approved_by"] is not None

    # 6. Resolve exception case
    res_resp = await client.post(f"/api/exceptions/{case_id}/resolve", headers=manager_headers)
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_reject_action_flow(client, manager_headers):
    """Test rejecting an action with required reason."""
    # Find or detect a case with pending actions
    list_resp = await client.get("/api/exceptions", headers=manager_headers)
    items = list_resp.json()["items"]
    target_case = None
    for it in items:
        if it["status"] != "resolved":
            target_case = it
            break

    assert target_case is not None
    case_id = target_case["id"]

    # Ensure investigated
    await client.post(f"/api/exceptions/{case_id}/investigate", headers=manager_headers)
    detail_resp = await client.get(f"/api/exceptions/{case_id}", headers=manager_headers)
    actions = detail_resp.json()["actions"]
    assert len(actions) > 0
    action_id = actions[0]["id"]

    # Reject without reason fails validation
    bad_rej = await client.post(
        f"/api/exceptions/{case_id}/actions/{action_id}/reject",
        json={},
        headers=manager_headers,
    )
    assert bad_rej.status_code == 422

    # Reject with reason succeeds
    rej_resp = await client.post(
        f"/api/exceptions/{case_id}/actions/{action_id}/reject",
        json={"reason": "Warehouse confirms primary supplier arrived early."},
        headers=manager_headers,
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["status"] == "rejected"

