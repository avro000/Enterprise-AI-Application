"""Exception Investigation Service."""

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.prompts import EXCEPTION_INVESTIGATION_PROMPT
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.exception_action import ExceptionAction
from app.models.exception_case import ExceptionCase
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem
from app.models.supplier import Supplier
from app.services.llm_service import LLMService
from app.services.retriever import RetrieverService

logger = logging.getLogger("investigation_service")


class InvestigationService:
    """Gathers cross-system operational evidence, queries company policy docs,

    and drafts AI root-cause analysis and actions.
    """

    @classmethod
    def _parse_llm_investigation(cls, text: str) -> Dict[str, Any]:
        """Extracts structured sections (root cause, business impact, actions, confidence) from LLM output."""
        root_cause = ""
        business_impact = ""
        recommended_action = ""
        confidence_score = 0.85

        rc_pattern = r"(?:^|\n)[#*\s\d\.-]*ROOT\s*CAUSE[:\s*]*(.*?)(?=(?:\n[#*\s\d\.-]*BUSINESS\s*IMPACT)|\Z)"
        bi_pattern = r"(?:^|\n)[#*\s\d\.-]*BUSINESS\s*IMPACT[:\s*]*(.*?)(?=(?:\n[#*\s\d\.-]*RECOMMENDED\s*ACTIONS?)|\Z)"
        ra_pattern = r"(?:^|\n)[#*\s\d\.-]*RECOMMENDED\s*ACTIONS?[:\s*]*(.*?)(?=(?:\n[#*\s\d\.-]*CONFIDENCE)|\Z)"
        conf_pattern = r"CONFIDENCE[:\s*]*([A-Za-z]+)"

        rc_match = re.search(rc_pattern, text, re.DOTALL | re.IGNORECASE)
        if rc_match:
            root_cause = re.sub(r"^[\*\s\n\r]+", "", rc_match.group(1)).strip()

        bi_match = re.search(bi_pattern, text, re.DOTALL | re.IGNORECASE)
        if bi_match:
            business_impact = re.sub(r"^[\*\s\n\r]+", "", bi_match.group(1)).strip()

        ra_match = re.search(ra_pattern, text, re.DOTALL | re.IGNORECASE)
        if ra_match:
            recommended_action = re.sub(r"^[\*\s\n\r]+", "", ra_match.group(1)).strip()

        conf_match = re.search(conf_pattern, text, re.IGNORECASE)
        if conf_match:
            confidence_str = conf_match.group(1).upper()
            if "HIGH" in confidence_str:
                confidence_score = 0.90
            elif "MED" in confidence_str:
                confidence_score = 0.70
            elif "LOW" in confidence_str:
                confidence_score = 0.40

        # Fallback if unformatted text
        if not root_cause:
            root_cause = text.strip()
        if not recommended_action:
            recommended_action = "Review order with customer representative and verify warehouse stock."

        return {
            "root_cause": root_cause,
            "business_impact": business_impact or "Risk of customer dissatisfaction and potential SLA contract penalty.",
            "recommended_action": recommended_action,
            "confidence_score": confidence_score,
        }

    @classmethod
    def _extract_individual_actions(cls, action_text: str) -> List[Dict[str, Any]]:
        """Parses individual action items from recommendation text into list of typed actions with risk classification."""
        lines = [line.strip() for line in action_text.splitlines() if line.strip()]
        actions = []
        seen_descriptions = set()

        for line in lines:
            clean_line = re.sub(r"^\d+[\.\)]\s*|^[-*•]\s*", "", line).strip()
            if not clean_line or len(clean_line) < 5:
                continue

            # Skip introductory preamble headers
            if clean_line.endswith(":") and not ("**" in clean_line and len(clean_line) > 30):
                continue
            if clean_line.lower().startswith("based on") and clean_line.endswith(":"):
                continue

            # Deduplicate identical or near-identical descriptions
            norm_key = re.sub(r"\W+", "", clean_line.lower())
            if norm_key in seen_descriptions:
                continue
            seen_descriptions.add(norm_key)

            lower_line = clean_line.lower()
            # Human-in-the-loop risk tier classification (PRODUCT_VISION.md Section 9)
            if "substitute" in lower_line or "alternative" in lower_line or "sku" in lower_line:
                action_type = "offer_alternative"
                requires_approval = True  # Commercial product change requires approval
            elif "supplier" in lower_line or "vendor" in lower_line or "procurement" in lower_line:
                action_type = "escalate_supplier"
                requires_approval = True  # Supplier contract escalation requires approval
            elif "email" in lower_line or "draft" in lower_line or "customer" in lower_line:
                action_type = "draft_email"
                requires_approval = True  # External customer communication requires approval
            elif "manager" in lower_line or "lead" in lower_line or "notify" in lower_line:
                action_type = "notify_manager"
                requires_approval = False  # Internal notification runs automatically
            else:
                action_type = "create_task"
                requires_approval = False  # Internal workflow task runs automatically

            actions.append({
                "action_type": action_type,
                "description": clean_line,
                "requires_approval": requires_approval,
            })

        if not actions:
            actions.append({
                "action_type": "offer_alternative",
                "description": "Offer alternative SKU substitution and notify account representative.",
                "requires_approval": True,
            })

        # Ensure actions requiring human approval are prioritized first for governance review
        actions.sort(key=lambda a: 0 if a["requires_approval"] else 1)
        return actions

    @classmethod
    async def investigate_case(cls, db: AsyncSession, case_id: UUID) -> ExceptionCase:
        """Executes full operational investigation for an exception case."""
        stmt = (
            select(ExceptionCase)
            .options(
                selectinload(ExceptionCase.order).selectinload(Order.customer),
                selectinload(ExceptionCase.order).selectinload(Order.items).selectinload(OrderItem.inventory_item).selectinload(Inventory.supplier),
                selectinload(ExceptionCase.customer),
                selectinload(ExceptionCase.actions),
            )
            .where(ExceptionCase.id == case_id)
        )
        result = await db.execute(stmt)
        case = result.scalars().first()

        if not case:
            raise ValueError(f"Exception case {case_id} not found")

        case.status = "investigating"
        await db.commit()

        # 1. Gather Structured Evidence
        order = case.order
        customer = case.customer or (order.customer if order else None)
        structured_lines = []
        sources_used = []

        if order:
            sources_used.append({"type": "database", "table": "orders", "detail": f"Order {order.order_number}"})
            structured_lines.append(f"ORDER DETAILS:")
            structured_lines.append(f"  • Order Number: {order.order_number}")
            structured_lines.append(f"  • Status: {order.status}")
            structured_lines.append(f"  • Total Amount: ${order.total_amount:,.2f}")
            structured_lines.append(f"  • Expected Delivery: {order.expected_delivery_date.strftime('%Y-%m-%d %H:%M UTC')}")
            if order.notes:
                structured_lines.append(f"  • Notes: {order.notes}")

            if order.items:
                structured_lines.append("ORDER ITEMS & INVENTORY:")
                for item in order.items:
                    inv = item.inventory_item
                    supp = inv.supplier if inv else None
                    sources_used.append({"type": "database", "table": "inventory", "detail": f"SKU {item.sku} (Qty ordered: {item.quantity})"})
                    if supp:
                        sources_used.append({"type": "database", "table": "suppliers", "detail": f"Supplier {supp.name} (Status: {supp.status})"})

                    stock_str = f"{inv.quantity_available} units in stock" if inv else "Inventory record not found"
                    supp_str = f"Supplier: {supp.name} ({supp.status.upper()}, lead time: {supp.lead_time_days}d)" if supp else "No primary supplier"
                    structured_lines.append(f"  • Item SKU {item.sku}: Qty {item.quantity} | Available: {stock_str} | {supp_str}")

        if customer:
            sources_used.append({"type": "database", "table": "customers", "detail": f"{customer.company_name} ({customer.tier} tier)"})
            structured_lines.append("CUSTOMER INFORMATION:")
            structured_lines.append(f"  • Company: {customer.company_name} (Tier: {customer.tier.upper()})")
            structured_lines.append(f"  • Contact: {customer.contact_name} <{customer.contact_email}>")
            structured_lines.append(f"  • Contracted SLA Window: {customer.sla_hours} hours")
            structured_lines.append(f"  • Region: {customer.region}")

        structured_context = "\n".join(structured_lines)

        # 2. Gather Unstructured Policy Evidence via RAG
        customer_tier = customer.tier if customer else "standard"
        rag_query_1 = f"SLA policy {customer_tier} customers delayed orders escalation"
        rag_query_2 = "alternative product policy substitute"

        chunks_1 = await RetrieverService.retrieve_relevant_chunks(rag_query_1, db, top_k=3, min_score=0.3)
        chunks_2 = await RetrieverService.retrieve_relevant_chunks(rag_query_2, db, top_k=2, min_score=0.3)

        combined_chunks = {c["chunk_id"]: c for c in chunks_1 + chunks_2}.values()
        rag_lines = []
        for c in combined_chunks:
            sources_used.append({
                "type": "document",
                "name": c["document_name"],
                "page": c["page_number"],
                "relevance": c["relevance"],
            })
            rag_lines.append(f"[{c['document_name']} (Page {c['page_number']})]:\n{c['content']}")

        rag_context = "\n\n".join(rag_lines) if rag_lines else "No specific policy guidelines retrieved."

        # 3. Construct Investigation Prompt & Call LLM
        prompt = EXCEPTION_INVESTIGATION_PROMPT.format(
            structured_context=structured_context,
            rag_context_with_sources=rag_context,
            order_number=order.order_number if order else "UNKNOWN",
            company_name=customer.company_name if customer else "Unknown Customer",
            tier=customer_tier.capitalize(),
        )

        llm_output = await LLMService.generate_response(prompt)
        parsed = cls._parse_llm_investigation(llm_output)

        # 4. Generate Structured Investigation Progress Steps (Module D)
        investigation_steps = []
        if order:
            investigation_steps.append({
                "step": "ERP Order Context",
                "detail": f"Retrieved order {order.order_number} (${order.total_amount:,.2f}, Status: {order.status})",
                "status": "completed",
            })
            if order.items:
                skus = ", ".join([f"{it.sku} (Qty {it.quantity})" for it in order.items])
                investigation_steps.append({
                    "step": "Inventory & Supplier Verification",
                    "detail": f"Audited stock and supplier statuses for line items: {skus}",
                    "status": "completed",
                })
        if customer:
            investigation_steps.append({
                "step": "Customer SLA & Contract Terms",
                "detail": f"{customer.company_name} ({customer.tier.capitalize()} Tier, {customer.sla_hours}h SLA commitment)",
                "status": "completed",
            })
        if combined_chunks:
            investigation_steps.append({
                "step": "Knowledge Base Policy Retrieval",
                "detail": f"Retrieved {len(combined_chunks)} relevant operational policy clauses from knowledge library",
                "status": "completed",
            })
        investigation_steps.append({
            "step": "AI Root Cause & Resolution Synthesis",
            "detail": f"Synthesized root cause and action recommendations with {int(parsed['confidence_score'] * 100)}% confidence",
            "status": "completed",
        })

        case.root_cause = parsed["root_cause"]
        case.business_impact = parsed["business_impact"]
        case.recommended_action = parsed["recommended_action"]
        case.confidence_score = parsed["confidence_score"]
        case.investigation_summary = f"Root Cause: {parsed['root_cause']}\n\nImpact: {parsed['business_impact']}"
        case.sources_used = sources_used
        case.investigation_steps = investigation_steps
        case.status = "recommendation_ready"

        # 5. Create Discrete Exception Actions with Human-in-the-Loop Governance (Modules E & F)
        from sqlalchemy import delete
        await db.execute(delete(ExceptionAction).where(ExceptionAction.exception_id == case.id))
        await db.flush()

        now = datetime.now(timezone.utc)
        parsed_actions = cls._extract_individual_actions(parsed["recommended_action"])
        auto_executed_count = 0
        pending_count = 0

        for pa in parsed_actions:
            if not pa["requires_approval"]:
                # Module F: Low-risk tasks execute automatically
                action = ExceptionAction(
                    exception_id=case.id,
                    action_type=pa["action_type"],
                    description=pa["description"],
                    requires_approval=False,
                    status="executed",
                    executed_at=now,
                    result="Automated execution: registered in internal operations workflow.",
                )
                db.add(action)
                auto_executed_count += 1

                # Audit log for automated action
                auto_audit = AuditLog(
                    event_type="action_auto_executed",
                    actor_type="system",
                    entity_type="action",
                    details={
                        "exception_id": str(case.id),
                        "action_type": pa["action_type"],
                        "description": pa["description"],
                    },
                )
                db.add(auto_audit)
            else:
                # Module E: High-risk tasks are staged in Action Center awaiting approval
                action = ExceptionAction(
                    exception_id=case.id,
                    action_type=pa["action_type"],
                    description=pa["description"],
                    requires_approval=True,
                    status="pending",
                )
                db.add(action)
                pending_count += 1

        # 6. Audit Log Entry for Investigation
        audit = AuditLog(
            event_type="recommendation_generated",
            actor_type="ai",
            entity_type="exception",
            entity_id=case.id,
            details={
                "case_number": case.case_number,
                "confidence_score": case.confidence_score,
                "actions_count": len(parsed_actions),
                "auto_executed": auto_executed_count,
                "pending_approval": pending_count,
            },
        )
        db.add(audit)

        await db.commit()
        await db.refresh(case)
        return case

    @classmethod
    async def approve_action(
        cls,
        db: AsyncSession,
        exception_id: UUID,
        action_id: UUID,
        user_id: UUID,
        comment: Optional[str] = None,
    ) -> ExceptionAction:
        """Approves a specific action item and logs simulated execution."""
        stmt = (
            select(ExceptionAction)
            .options(selectinload(ExceptionAction.exception_case).selectinload(ExceptionCase.actions))
            .where(ExceptionAction.id == action_id, ExceptionAction.exception_id == exception_id)
        )
        result = await db.execute(stmt)
        action = result.scalars().first()

        if not action:
            raise ValueError("Action not found for this exception case")

        now = datetime.now(timezone.utc)
        action.status = "approved"
        action.approved_by = user_id
        action.approved_at = now
        action.executed_at = now
        action.result = f"Simulated — action logged. {f'Comment: {comment}' if comment else ''}".strip()

        # Check if all actions on the case are approved
        case = action.exception_case
        all_approved = all(a.status == "approved" or a.id == action.id for a in case.actions)
        if all_approved:
            case.status = "approved"

        audit = AuditLog(
            event_type="action_approved",
            actor_type="user",
            actor_id=user_id,
            entity_type="action",
            entity_id=action.id,
            details={"exception_id": str(exception_id), "action_type": action.action_type, "comment": comment},
        )
        db.add(audit)
        await db.commit()
        refreshed = (
            await db.execute(
                select(ExceptionAction)
                .options(selectinload(ExceptionAction.approver))
                .where(ExceptionAction.id == action.id)
            )
        ).scalars().first()
        return refreshed or action

    @classmethod
    async def reject_action(
        cls,
        db: AsyncSession,
        exception_id: UUID,
        action_id: UUID,
        user_id: UUID,
        reason: str,
    ) -> ExceptionAction:
        """Rejects an action item with justification and marks the exception status as rejected."""
        stmt = (
            select(ExceptionAction)
            .options(selectinload(ExceptionAction.exception_case))
            .where(ExceptionAction.id == action_id, ExceptionAction.exception_id == exception_id)
        )
        result = await db.execute(stmt)
        action = result.scalars().first()

        if not action:
            raise ValueError("Action not found for this exception case")

        now = datetime.now(timezone.utc)
        action.status = "rejected"
        action.approved_by = user_id
        action.approved_at = now
        action.result = f"Rejected by user. Reason: {reason}"

        case = action.exception_case
        case.status = "rejected"

        audit = AuditLog(
            event_type="action_rejected",
            actor_type="user",
            actor_id=user_id,
            entity_type="action",
            entity_id=action.id,
            details={"exception_id": str(exception_id), "reason": reason},
        )
        db.add(audit)
        await db.commit()
        refreshed = (
            await db.execute(
                select(ExceptionAction)
                .options(selectinload(ExceptionAction.approver))
                .where(ExceptionAction.id == action.id)
            )
        ).scalars().first()
        return refreshed or action

    @classmethod
    async def resolve_exception(
        cls,
        db: AsyncSession,
        exception_id: UUID,
        user_id: UUID,
    ) -> ExceptionCase:
        """Marks an exception case as fully resolved by an operator/manager."""
        stmt = select(ExceptionCase).where(ExceptionCase.id == exception_id)
        result = await db.execute(stmt)
        case = result.scalars().first()

        if not case:
            raise ValueError("Exception case not found")

        now = datetime.now(timezone.utc)
        case.status = "resolved"
        case.resolved_at = now
        case.resolved_by = user_id

        audit = AuditLog(
            event_type="exception_resolved",
            actor_type="user",
            actor_id=user_id,
            entity_type="exception",
            entity_id=case.id,
            details={"case_number": case.case_number},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(case)
        return case

    @classmethod
    async def approve_all_actions_for_case(
        cls,
        db: AsyncSession,
        exception_id: UUID,
        user_id: UUID,
        comment: Optional[str] = None,
    ) -> List[ExceptionAction]:
        """Module E Action Center: Approves all pending actions on an exception in a single click."""
        stmt = (
            select(ExceptionCase)
            .options(selectinload(ExceptionCase.actions))
            .where(ExceptionCase.id == exception_id)
        )
        result = await db.execute(stmt)
        case = result.scalars().first()

        if not case:
            raise ValueError("Exception case not found")

        now = datetime.now(timezone.utc)
        approved_actions = []

        for action in case.actions:
            if action.status == "pending":
                action.status = "approved"
                action.approved_by = user_id
                action.approved_at = now
                action.executed_at = now
                action.result = f"Batch approved in Action Center. {f'Comment: {comment}' if comment else ''}".strip()
                approved_actions.append(action)

                audit = AuditLog(
                    event_type="action_approved",
                    actor_type="user",
                    actor_id=user_id,
                    entity_type="action",
                    entity_id=action.id,
                    details={
                        "exception_id": str(exception_id),
                        "action_type": action.action_type,
                        "batch_mode": True,
                        "comment": comment,
                    },
                )
                db.add(audit)

        case.status = "approved"
        await db.commit()
        return approved_actions

    @classmethod
    async def batch_approve_actions(
        cls,
        db: AsyncSession,
        action_ids: List[UUID],
        user_id: UUID,
        comment: Optional[str] = None,
    ) -> List[ExceptionAction]:
        """Module E Action Center: Batch approves multiple actions selected across cases."""
        stmt = (
            select(ExceptionAction)
            .options(selectinload(ExceptionAction.exception_case).selectinload(ExceptionCase.actions))
            .where(ExceptionAction.id.in_(action_ids))
        )
        result = await db.execute(stmt)
        actions = result.scalars().all()

        now = datetime.now(timezone.utc)
        approved_actions = []
        cases_to_check = set()

        for action in actions:
            if action.status == "pending":
                action.status = "approved"
                action.approved_by = user_id
                action.approved_at = now
                action.executed_at = now
                action.result = f"Batch approved in Action Center. {f'Comment: {comment}' if comment else ''}".strip()
                approved_actions.append(action)
                if action.exception_case:
                    cases_to_check.add(action.exception_case)

                audit = AuditLog(
                    event_type="action_approved",
                    actor_type="user",
                    actor_id=user_id,
                    entity_type="action",
                    entity_id=action.id,
                    details={
                        "exception_id": str(action.exception_id),
                        "action_type": action.action_type,
                        "batch_mode": True,
                        "comment": comment,
                    },
                )
                db.add(audit)

        for case in cases_to_check:
            if all(a.status in ("approved", "executed") for a in case.actions):
                case.status = "approved"

        await db.commit()
        return approved_actions

    @classmethod
    async def assign_exception_owner(
        cls,
        db: AsyncSession,
        exception_id: UUID,
        assigned_user_id: UUID,
        assigning_user_id: UUID,
    ) -> ExceptionCase:
        """Module B AI Exception Manager: Assigns an owner to the exception case."""
        stmt = (
            select(ExceptionCase)
            .options(selectinload(ExceptionCase.actions), selectinload(ExceptionCase.assignee))
            .where(ExceptionCase.id == exception_id)
        )
        result = await db.execute(stmt)
        case = result.scalars().first()

        if not case:
            raise ValueError("Exception case not found")

        case.assigned_to = assigned_user_id

        audit = AuditLog(
            event_type="exception_assigned",
            actor_type="user",
            actor_id=assigning_user_id,
            entity_type="exception",
            entity_id=case.id,
            details={"assigned_to": str(assigned_user_id), "case_number": case.case_number},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(case)
        return case
