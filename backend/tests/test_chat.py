"""Chat API tests covering Knowledge, Data, Hybrid, and Refusal behavior."""

import pytest


@pytest.mark.asyncio
async def test_chat_knowledge_query(client, operator_headers):
    """Knowledge question returns policy answer with document source citations."""
    resp = await client.post(
        "/api/chat",
        json={"question": "What is our SLA policy for premium customers?"},
        headers=operator_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "knowledge_only"
    assert len(data["sources"]) > 0
    doc_sources = [s for s in data["sources"] if s.get("type") == "document"]
    assert len(doc_sources) > 0
    assert any("sla_policy" in s.get("name", "") for s in doc_sources)


@pytest.mark.asyncio
async def test_chat_data_query(client, operator_headers):
    """Live operational data lookup returns entity details with database sources."""
    resp = await client.post(
        "/api/chat",
        json={"question": "Show me order ORD-48321 status"},
        headers=operator_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "data_only"
    assert len(data["sources"]) > 0
    db_sources = [s for s in data["sources"] if s.get("type") == "database"]
    assert len(db_sources) > 0


@pytest.mark.asyncio
async def test_chat_hybrid_query(client, operator_headers):
    """Hybrid query merges live SQL data with policy documents."""
    resp = await client.post(
        "/api/chat",
        json={"question": "Is order ORD-48321 at risk of SLA breach?"},
        headers=operator_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "hybrid"
    sources = data["sources"]
    types = {s.get("type") for s in sources}
    assert "database" in types
    assert "document" in types


@pytest.mark.asyncio
async def test_chat_unknown_question_refusal(client, operator_headers):
    """Irrelevant or ungrounded questions produce polite refusals without hallucinating."""
    resp = await client.post(
        "/api/chat",
        json={"question": "What is the CEO's favorite color?"},
        headers=operator_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "don't have enough information" in data["answer"].lower()

