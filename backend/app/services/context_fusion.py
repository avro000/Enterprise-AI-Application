"""Context Fusion Service: Unifies Relational SQL Data with Unstructured Policy Documents."""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.prompts import CONTEXT_FUSION_PROMPT
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem
from app.models.supplier import Supplier
from app.services.llm_service import LLMService
from app.services.retriever import RetrieverService

logger = logging.getLogger("context_fusion")


class ContextFusionService:
    """Classifies user query intent, queries live SQL state, retrieves policy RAG chunks,

    detects operational discrepancies, and synthesizes a grounded response.
    """

    @classmethod
    async def classify_intent(cls, question: str) -> Dict[str, Any]:
        """Fast, zero-latency rule-based classifier saving LLM rate-limit quota for response generation."""
        q_lower = question.lower()
        order_match = re.search(r"ord-\d+", q_lower)
        order_num = order_match.group(0).upper() if order_match else None
        sku_match = re.search(r"sku-\d+", q_lower)
        sku_num = sku_match.group(0).upper() if sku_match else None

        entities = {}
        if order_num:
            entities["order_number"] = order_num
        if sku_num:
            entities["sku"] = sku_num

        # Check for exception investigation intent
        if "investigate" in q_lower or "why" in q_lower or "root cause" in q_lower or "escalat" in q_lower:
            return {
                "intent": "exception_investigation",
                "entities": entities,
                "rag_query": f"escalation policy {question}",
            }
        # Check for hybrid (entity + policy/SLA/risk)
        elif (order_num or sku_num or "order" in q_lower) and (
            "sla" in q_lower
            or "risk" in q_lower
            or "policy" in q_lower
            or "breach" in q_lower
            or "delay" in q_lower
            or "tier" in q_lower
        ):
            return {
                "intent": "hybrid",
                "entities": entities,
                "rag_query": "SLA policy customer delivery windows and tiers",
            }
        # Check for direct database entity lookup
        elif order_num or sku_num or "inventory" in q_lower or "supplier" in q_lower or "stock" in q_lower:
            return {
                "intent": "data_only",
                "entities": entities,
                "rag_query": "",
            }
        # General knowledge / SOP / handbook question
        else:
            return {
                "intent": "knowledge_only",
                "entities": {},
                "rag_query": question,
            }

    @classmethod
    async def gather_structured_data(
        cls,
        entities: Dict[str, Any],
        db: AsyncSession,
        raw_question: str = "",
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Queries relational tables for entities and formats context lines and DB sources."""
        lines = []
        sources = []

        order_num = entities.get("order_number")
        if not order_num:
            match = re.search(r"ord-\d+", raw_question, re.IGNORECASE)
            if match:
                order_num = match.group(0).upper()

        sku_num = entities.get("sku")
        if not sku_num:
            match = re.search(r"sku-\d+", raw_question, re.IGNORECASE)
            if match:
                sku_num = match.group(0).upper()

        # 1. Order details lookup
        if order_num:
            stmt = (
                select(Order)
                .options(selectinload(Order.customer), selectinload(Order.items).selectinload(OrderItem.inventory_item).selectinload(Inventory.supplier))
                .where(Order.order_number == order_num)
            )
            result = await db.execute(stmt)
            order = result.scalars().first()

            if order:
                sources.append({"type": "database", "table": "orders", "detail": f"Order {order.order_number}"})
                sources.append({"type": "database", "table": "customers", "detail": f"{order.customer.company_name} ({order.customer.tier} tier)"})

                lines.append(f"ORDER RECORD:")
                lines.append(f"  • Order Number: {order.order_number}")
                lines.append(f"  • Customer: {order.customer.company_name} (Tier: {order.customer.tier.upper()}, Contracted SLA: {order.customer.sla_hours}h)")
                lines.append(f"  • Order Status: {order.status.upper()}")
                lines.append(f"  • Total Amount: ${order.total_amount:,.2f}")
                lines.append(f"  • Order Date: {order.order_date.strftime('%Y-%m-%d %H:%M UTC')}")
                lines.append(f"  • Expected Delivery Date: {order.expected_delivery_date.strftime('%Y-%m-%d %H:%M UTC')}")
                if order.notes:
                    lines.append(f"  • Order Notes: {order.notes}")

                lines.append(f"ORDER LINE ITEMS & INVENTORY STATUS:")
                for item in order.items:
                    inv = item.inventory_item
                    supp = inv.supplier if inv else None
                    sources.append({"type": "database", "table": "inventory", "detail": f"{item.sku} (Stock: {inv.quantity_available if inv else 0})"})
                    if supp:
                        sources.append({"type": "database", "table": "suppliers", "detail": f"{supp.name} (Status: {supp.status})"})

                    stock_str = f"{inv.quantity_available} units available" if inv else "SKU record missing"
                    supp_str = f"Supplier: {supp.name} (Status: {supp.status.upper()}, Lead Time: {supp.lead_time_days} days, Reliability: {supp.reliability_score})" if supp else "No primary supplier"
                    lines.append(f"  • SKU {item.sku}: Quantity Ordered: {item.quantity} | Current Stock: {stock_str} | {supp_str}")

        # 2. Standalone SKU lookup
        elif sku_num:
            stmt = select(Inventory).options(selectinload(Inventory.supplier)).where(Inventory.sku == sku_num)
            inv = (await db.execute(stmt)).scalars().first()
            if inv:
                sources.append({"type": "database", "table": "inventory", "detail": f"{inv.sku} - {inv.product_name}"})
                lines.append(f"INVENTORY ITEM:")
                lines.append(f"  • SKU: {inv.sku} ({inv.product_name})")
                lines.append(f"  • Quantity Available: {inv.quantity_available}")
                lines.append(f"  • Reorder Threshold: {inv.reorder_threshold}")
                if inv.supplier:
                    sources.append({"type": "database", "table": "suppliers", "detail": f"Supplier {inv.supplier.name}"})
                    lines.append(f"  • Primary Supplier: {inv.supplier.name} (Status: {inv.supplier.status}, Lead Time: {inv.supplier.lead_time_days} days)")

        # 3. Lookup active exception cases / at-risk orders if asking about SLA risk or exceptions
        if not lines and any(w in raw_question.lower() for w in ["at risk", "risk", "breach", "exception", "delayed", "which order", "open case"]):
            from app.models.exception_case import ExceptionCase
            stmt = (
                select(ExceptionCase)
                .options(selectinload(ExceptionCase.order).selectinload(Order.customer))
                .where(ExceptionCase.status.in_(["detected", "investigating", "recommendation_ready"]))
                .order_by(ExceptionCase.detected_at.desc())
                .limit(5)
            )
            cases = (await db.execute(stmt)).scalars().all()
            if cases:
                lines.append("ACTIVE AT-RISK ORDERS & EXCEPTIONS DETECTED IN SYSTEM:")
                for c in cases:
                    order_label = c.order.order_number if c.order else "Unlinked Order"
                    cust_name = c.order.customer.company_name if c.order and c.order.customer else "Unknown Customer"
                    cust_tier = c.order.customer.tier if c.order and c.order.customer else "standard"
                    sources.append({"type": "database", "table": "exceptions", "detail": f"Case {c.case_number} ({order_label})"})
                    lines.append(
                        f"  • Case {c.case_number} | Order: {order_label} | Customer: {cust_name} (Tier: {cust_tier.upper()}) | "
                        f"Severity: {c.severity.upper()} | Type: {c.exception_type} | Status: {c.status.upper()} | "
                        f"Summary: {c.investigation_summary or c.recommended_action or 'SLA breach risk detected'}"
                    )

        # 4. Fallback generic lookups (e.g. supplier status or customer check)
        if not lines and ("supplier" in raw_question.lower() or "supplyco" in raw_question.lower()):
            stmt = select(Supplier)
            suppliers = (await db.execute(stmt)).scalars().all()
            for s in suppliers:
                if s.name.lower() in raw_question.lower() or "supplier" in raw_question.lower():
                    sources.append({"type": "database", "table": "suppliers", "detail": f"Supplier {s.name}"})
                    lines.append(f"SUPPLIER: {s.name} | Status: {s.status.upper()} | Lead Time: {s.lead_time_days} days | Reliability: {s.reliability_score}")

        structured_text = "\n".join(lines) if lines else "No matching structured records found in database."
        return structured_text, sources

    @classmethod
    async def process_chat_query(
        cls,
        question: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """Main entrypoint orchestrating intent classification, SQL gather, RAG search, and response generation."""
        # 1. Classify intent
        classification = await cls.classify_intent(question)
        intent = classification["intent"]

        structured_context = ""
        db_sources = []
        rag_chunks = []
        doc_sources = []

        # 2. Gather structured data if intent warrants it
        if intent in ("data_only", "hybrid", "exception_investigation"):
            structured_context, db_sources = await cls.gather_structured_data(
                entities=classification.get("entities", {}),
                db=db,
                raw_question=question,
            )

        # 3. Retrieve policy chunks if intent warrants it
        if intent in ("knowledge_only", "hybrid", "exception_investigation"):
            rag_query = classification.get("rag_query") or question
            rag_chunks = await RetrieverService.retrieve_relevant_chunks(rag_query, db, top_k=5, min_score=0.3)
            for c in rag_chunks:
                doc_sources.append({
                    "type": "document",
                    "name": c["document_name"],
                    "page": c["page_number"],
                    "relevance": c["relevance"],
                })

        # 4. Handle pure knowledge query shortcut
        if intent == "knowledge_only":
            from app.services.rag_service import RAGService
            res = await RAGService.answer_knowledge_question(db, question)
            res["intent"] = "knowledge_only"
            return res


        # 5. Handle pure data query
        if intent == "data_only":
            if structured_context == "No matching structured records found in database.":
                return {
                    "answer": f"I could not locate any records matching your query in the live operations database.",
                    "intent": intent,
                    "sources": [],
                    "confidence": "low",
                }
            prompt = (
                f"You are OpsPilot AI. Present the following live business data in a comprehensive, well-structured, detailed Markdown report matching enterprise operations standards.\n\n"
                f"Structure your response with:\n"
                f"1. A greeting and order status header with emoji (e.g. ### 📦 Order Summary)\n"
                f"2. Bullet list of key order details (Order Number, Status, Customer, Contracted SLA, Total Amount, Order Date, Expected Delivery Date)\n"
                f"3. A line break and ### 📋 Line Items & Inventory Details with all ordered SKUs, quantities, warehouse stock, and supplier details (supplier name, status, lead time, reliability)\n"
                f"4. A proactive closing offer for real-time tracking or replenishment.\n\n"
                f"LIVE BUSINESS DATA:\n{structured_context}\n\n"
                f"USER QUERY: {question}"
            )
            answer = await LLMService.generate_response(prompt)
            return {
                "answer": answer.strip(),
                "intent": intent,
                "sources": db_sources,
                "confidence": "high",
            }

        # 6. Hybrid & Exception Investigation: Merge Structured + Unstructured
        formatted_rag_chunks = []
        for c in rag_chunks:
            formatted_rag_chunks.append(f"[{c['document_name']} (Page {c['page_number']})]:\n{c['content']}")
        rag_text = "\n\n".join(formatted_rag_chunks) if formatted_rag_chunks else "No relevant policy documents found above threshold."

        merged_prompt = CONTEXT_FUSION_PROMPT.format(
            structured_context=structured_context,
            rag_chunks_with_sources=rag_text,
            question=question,
        )

        answer = await LLMService.generate_response(merged_prompt)
        all_sources = db_sources + doc_sources
        confidence = "high" if db_sources and doc_sources else "medium"

        return {
            "answer": answer.strip(),
            "intent": intent,
            "sources": all_sources,
            "confidence": confidence,
        }
