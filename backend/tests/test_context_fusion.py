"""Context fusion intent classification and prompt tests."""

import pytest
from app.core.prompts import CONTEXT_FUSION_PROMPT, EXCEPTION_INVESTIGATION_PROMPT
from app.services.context_fusion import ContextFusionService


@pytest.mark.asyncio
async def test_intent_classification_knowledge_only():
    """Questions without specific business entities are classified as knowledge_only."""
    res = await ContextFusionService.classify_intent("What is our SLA policy for premium customers?")
    assert res["intent"] == "knowledge_only"


@pytest.mark.asyncio
async def test_intent_classification_data_only():
    """Specific entity lookups without policy/risk context are classified as data_only."""
    res = await ContextFusionService.classify_intent("Show me order ORD-48321 status")
    assert res["intent"] == "data_only"
    assert res["entities"].get("order_number") == "ORD-48321"


@pytest.mark.asyncio
async def test_intent_classification_hybrid():
    """Entity queries that evaluate SLA policies or risks are classified as hybrid."""
    res = await ContextFusionService.classify_intent("Is order ORD-48321 at risk of SLA breach?")
    assert res["intent"] == "hybrid"
    assert res["entities"].get("order_number") == "ORD-48321"


@pytest.mark.asyncio
async def test_intent_classification_investigation():
    """Explicit investigation queries are classified as exception_investigation."""
    res = await ContextFusionService.classify_intent("Investigate the delay on order ORD-48321")
    assert res["intent"] == "exception_investigation"
    assert res["entities"].get("order_number") == "ORD-48321"


def test_context_fusion_prompt_structure():
    """Verify system prompt contains all required sections."""
    formatted = CONTEXT_FUSION_PROMPT.format(
        structured_context="Order ORD-48321: Processing",
        rag_chunks_with_sources="[sla_policy.pdf]: 48h limit",
        question="Is it delayed?",
    )
    assert "LIVE BUSINESS DATA:" in formatted
    assert "KNOWLEDGE BASE" in formatted
    assert "USER QUESTION:" in formatted
    assert "Order ORD-48321" in formatted


def test_exception_investigation_prompt_structure():
    """Verify investigation prompt contains required operational sections."""
    formatted = EXCEPTION_INVESTIGATION_PROMPT.format(
        structured_context="Order details here",
        rag_context_with_sources="Policy text here",
        order_number="ORD-48321",
        company_name="Acme Corp",
        tier="Premium",
    )
    assert "ROOT CAUSE:" in formatted
    assert "BUSINESS IMPACT:" in formatted
    assert "RECOMMENDED ACTIONS:" in formatted
    assert "ORD-48321" in formatted

