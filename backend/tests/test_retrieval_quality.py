"""Retrieval quality (Recall@K) benchmark tests."""

import pytest
from app.database import async_session_maker
from app.services.retriever import RetrieverService

EVAL_QUERIES = [
    {
        "query": "SLA policy premium customers breach penalties delivery window",
        "expected_doc": "sla_policy.pdf",
    },
    {
        "query": "employee annual leave vacation policy days per year",
        "expected_doc": "employee_handbook.pdf",
    },
    {
        "query": "restocking fees returns and refunds commercial policy 30 days",
        "expected_doc": "returns_and_refunds.pdf",
    },
    {
        "query": "escalation procedures critical severity manager notification",
        "expected_doc": "escalation_procedures.pdf",
    },
    {
        "query": "premium customer proactive notification alternative product substitution",
        "expected_doc": "premium_customer_policy.pdf",
    },
]


@pytest.mark.asyncio
async def test_retrieval_recall_at_5():
    """Validates that semantic search achieves >= 80% Recall@5 over enterprise policies."""
    hits = 0
    total = len(EVAL_QUERIES)

    async with async_session_maker() as session:
        for item in EVAL_QUERIES:
            query = item["query"]
            expected_doc = item["expected_doc"]

            chunks = await RetrieverService.retrieve_relevant_chunks(
                query=query,
                db=session,
                top_k=5,
                min_score=0.1,  # lenient score for recall ranking
            )

            retrieved_docs = [c["document_name"].lower() for c in chunks]
            if any(expected_doc.lower() in d for d in retrieved_docs):
                hits += 1

    recall = hits / total
    assert recall >= 0.80, f"Recall@5 was {recall:.2f} ({hits}/{total}), expected >= 0.80"

