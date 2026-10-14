"""Enrichment script for OpsPilot AI Enterprise Demo Data.

Aligns the database with PRODUCT_VISION.md Modules A through G:
- Populates flagship exception case ORD-48321 with Section 8.3 investigation data
- Creates overdue invoice exception case EX-10492 for multi-type exception management
- Stages pending governance actions in the Action Center (Module E)
- Assigns case owners (Module B)
- Adds historical resolved cases to power Business Value ROI metrics (Module G)
"""

import asyncio
from datetime import datetime, timedelta, timezone
import logging
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal, init_db
from app.models.customer import Customer
from app.models.exception_action import ExceptionAction
from app.models.exception_case import ExceptionCase
from app.models.order import Order
from app.models.user import User
from app.models.audit_log import AuditLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("enrich_demo")


async def enrich():
    await init_db()
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        # 1. Fetch Users
        users = (await session.execute(select(User))).scalars().all()
        user_map = {u.email: u for u in users}
        admin = user_map.get("admin@opspilot.com")
        manager = user_map.get("manager@opspilot.com")
        operator = user_map.get("operator@opspilot.com")

        if not admin:
            logger.info("No seeded users found. Proceeding with unassigned case governance.")

        # 2. Flagship Case: ORD-48321 (Apex Manufacturing - Premium Tier SLA Risk)
        stmt_ord = select(Order).where(Order.order_number == "ORD-48321")
        ord_flagship = (await session.execute(stmt_ord)).scalars().first()

        if ord_flagship:
            stmt_case = (
                select(ExceptionCase)
                .options(selectinload(ExceptionCase.actions))
                .where(ExceptionCase.related_order_id == ord_flagship.id)
            )
            case_flagship = (await session.execute(stmt_case)).scalars().first()

            if not case_flagship:
                case_flagship = ExceptionCase(
                    case_number="EX-48321",
                    exception_type="sla_risk",
                    severity="critical",
                    status="recommendation_ready",
                    related_order_id=ord_flagship.id,
                    related_customer_id=ord_flagship.customer_id,
                    assigned_to=manager.id if manager else None,
                    detected_at=now - timedelta(hours=4),
                )
                session.add(case_flagship)
                await session.flush()

            # Update investigation fields matching Section 8.3 of PRODUCT_VISION.md
            case_flagship.status = "recommendation_ready"
            case_flagship.severity = "critical"
            case_flagship.assigned_to = manager.id if manager else None
            case_flagship.root_cause = (
                "Primary supplier SupplyCo International has delayed shipment of SKU-2847 "
                "(Industrial High-Pressure Hydraulic Valve 25mm) due to raw material shortages. "
                "Warehouse currently has 0 available units."
            )
            case_flagship.business_impact = (
                "Apex Manufacturing is a Premium tier account with a contracted 48-hour SLA. "
                "Order is projected to miss delivery deadline by 4 days without intervention, "
                "incurring a 15% SLA rebate penalty and jeopardizing contract renewal ($240K ARR)."
            )
            case_flagship.recommended_action = (
                "1. Offer approved alternative product SKU-2848 (Standard Hydraulic Actuator 12V) "
                "per Premium Customer Policy at zero additional surcharge.\n"
                "2. Escalate procurement order with secondary supplier Titan Heavy Logistics.\n"
                "3. Draft proactive delivery update for customer account executive Elena Rostova.\n"
                "4. Register internal operations tracking task for warehouse verification."
            )
            case_flagship.confidence_score = 0.95
            case_flagship.investigation_summary = (
                "Root Cause: Supplier inventory shortage on SKU-2847.\n\n"
                "Impact: Premium customer order projected to miss SLA by 4 days.\n\n"
                "Recommended Action: Offer approved alternative SKU-2848 and notify account manager."
            )
            case_flagship.sources_used = [
                {"type": "database", "table": "orders", "detail": "Order ORD-48321 ($2,455.00)"},
                {"type": "database", "table": "inventory", "detail": "SKU-2847 (0 in stock)"},
                {"type": "database", "table": "suppliers", "detail": "SupplyCo International (Status: DELAYED)"},
                {"type": "database", "table": "customers", "detail": "Apex Manufacturing (Tier: PREMIUM, 48h SLA)"},
                {"type": "document", "name": "premium_customer_policy.pdf", "page": 1, "relevance": 0.92},
                {"type": "document", "name": "sla_policy.pdf", "page": 2, "relevance": 0.88},
            ]
            case_flagship.investigation_steps = [
                {"step": "ERP Order Context", "detail": "Retrieved order ORD-48321 ($2,455.00, Status: processing, Due in 20h)", "status": "completed"},
                {"step": "Inventory & Supplier Verification", "detail": "Audited SKU-2847 (0 stock) - Primary supplier SupplyCo is DELAYED", "status": "completed"},
                {"step": "Customer SLA & Contract Terms", "detail": "Apex Manufacturing (Premium Tier, 48h SLA penalty: 15% rebate)", "status": "completed"},
                {"step": "Knowledge Base Policy Retrieval", "detail": "Retrieved substitution guidelines from premium_customer_policy.pdf", "status": "completed"},
                {"step": "AI Root Cause & Resolution Synthesis", "detail": "Synthesized resolution recommendations with 95% confidence", "status": "completed"},
            ]

            # Clear and create actions for flagship case
            for a in list(case_flagship.actions):
                await session.delete(a)

            # High-risk actions staged for approval in Action Center (Module E)
            act1 = ExceptionAction(
                exception_id=case_flagship.id,
                action_type="offer_alternative",
                description="Offer approved alternative product SKU-2848 to Apex Manufacturing at zero surcharge.",
                requires_approval=True,
                status="pending",
            )
            act2 = ExceptionAction(
                exception_id=case_flagship.id,
                action_type="escalate_supplier",
                description="Escalate emergency purchase order with Titan Heavy Logistics for expedited valve delivery.",
                requires_approval=True,
                status="pending",
            )
            act3 = ExceptionAction(
                exception_id=case_flagship.id,
                action_type="draft_email",
                description="Send customer notification email to Elena Rostova (erostova@apexmanufacturing.example.com).",
                requires_approval=True,
                status="pending",
            )
            # Human-in-the-loop review actions (Module E)
            act4 = ExceptionAction(
                exception_id=case_flagship.id,
                action_type="create_task",
                description="Register warehouse floor reservation for alternative actuator SKU-2848.",
                requires_approval=True,
                status="pending",
            )
            session.add_all([act1, act2, act3, act4])

        # 3. Create Overdue Invoice Exception Case (EX-10492)
        stmt_cust = select(Customer).where(Customer.company_name == "Acme Tool & Die")
        acme_cust = (await session.execute(stmt_cust)).scalars().first()

        stmt_inv_case = select(ExceptionCase).where(ExceptionCase.case_number == "EX-10492")
        case_invoice = (await session.execute(stmt_inv_case)).scalars().first()

        if not case_invoice and acme_cust:
            case_invoice = ExceptionCase(
                case_number="EX-10492",
                exception_type="overdue_invoice",
                severity="medium",
                status="recommendation_ready",
                related_customer_id=acme_cust.id,
                assigned_to=operator.id if operator else None,
                detected_at=now - timedelta(hours=8),
                root_cause="Customer withheld payment on Invoice INV-9021 ($6,450.00) pending resolution of restocking fee waiver from prior return.",
                business_impact="Accounts Receivable 45 days past due; payment dispute pauses fulfillment of new standard orders.",
                recommended_action="1. Issue 10% restocking fee waiver credit ($645.00) per Commercial Returns Policy.\n2. Email reconciled statement to Bill Henderson.\n3. Create operations follow-up task.",
                confidence_score=0.92,
                investigation_summary="Root Cause: Disputed $645.00 restocking fee on return RET-4401.\n\nImpact: AR 45 days overdue; standard fulfillment paused.\n\nRecommended Action: Apply restocking fee waiver and dispatch reconciled billing statement.",
                sources_used=[
                    {"type": "database", "table": "invoices", "detail": "Invoice INV-9021 ($6,450.00 - 45 days overdue)"},
                    {"type": "database", "table": "customers", "detail": "Acme Tool & Die (Contact: Bill Henderson)"},
                    {"type": "document", "name": "returns_and_refunds.pdf", "page": 2, "relevance": 0.91},
                ],
                investigation_steps=[
                    {"step": "ERP Invoicing & AR Ledger", "detail": "Invoice INV-9021 ($6,450.00) 45 days past net-30 terms", "status": "completed"},
                    {"step": "Cross-System Return Reconciliation", "detail": "Return RET-4401 tied to SLA breach on order ORD-48101", "status": "completed"},
                    {"step": "Commercial Policy Verification", "detail": "returns_and_refunds.pdf confirms 100% restocking fee waiver on SLA breach returns", "status": "completed"},
                    {"step": "AI Resolution Synthesis", "detail": "Generated credit memo recommendation and invoice reconciliation statement", "status": "completed"},
                ],
            )
            session.add(case_invoice)
            await session.flush()

            inv_act1 = ExceptionAction(
                exception_id=case_invoice.id,
                action_type="offer_alternative",
                description="Apply authorized $645.00 restocking fee credit memo to Invoice INV-9021.",
                requires_approval=True,
                status="pending",
            )
            inv_act2 = ExceptionAction(
                exception_id=case_invoice.id,
                action_type="draft_email",
                description="Email reconciled invoice statement and credit memo to bhenderson@acmetool.example.com.",
                requires_approval=True,
                status="pending",
            )
            inv_act3 = ExceptionAction(
                exception_id=case_invoice.id,
                action_type="create_task",
                description="Create finance ledger adjustment verification task in operations queue.",
                requires_approval=True,
                status="pending",
            )
            session.add_all([inv_act1, inv_act2, inv_act3])

        # 4. Create Historical Resolved Cases (to power Business Value ROI metrics in Module G)
        stmt_hist1 = select(ExceptionCase).where(ExceptionCase.case_number == "EX-38291")
        if not (await session.execute(stmt_hist1)).scalars().first():
            stmt_ord_hist1 = select(Order).where(Order.order_number == "ORD-48101")
            ord_h1 = (await session.execute(stmt_ord_hist1)).scalars().first()
            if ord_h1:
                hist1 = ExceptionCase(
                    case_number="EX-38291",
                    exception_type="delayed_order",
                    severity="high",
                    status="resolved",
                    related_order_id=ord_h1.id,
                    related_customer_id=ord_h1.customer_id,
                    assigned_to=operator.id if operator else None,
                    detected_at=now - timedelta(days=2),
                    resolved_at=now - timedelta(days=2, hours=-1),
                    resolved_by=manager.id if manager else None,
                    root_cause="Courier transit delay resolved via expedited courier re-routing.",
                    business_impact="Order delivered within acceptable grace window, avoiding $32.50 breach rebate.",
                    recommended_action="Re-route package via priority air freight and notify client.",
                    confidence_score=0.88,
                    investigation_summary="Resolved via priority carrier re-route.",
                )
                session.add(hist1)
                await session.flush()

                h_act = ExceptionAction(
                    exception_id=hist1.id,
                    action_type="escalate_supplier",
                    description="Re-routed shipment via priority express logistics.",
                    requires_approval=True,
                    status="approved",
                    approved_by=manager.id if manager else None,
                    approved_at=now - timedelta(days=2),
                    executed_at=now - timedelta(days=2),
                    result="Carrier re-routing confirmed. Tracking updated.",
                )
                session.add(h_act)

        # 5. Commit all enrichments
        await session.commit()
        logger.info("Demo data enrichment complete! All Product Vision modules (A through G) are now live.")


if __name__ == "__main__":
    asyncio.run(enrich())
