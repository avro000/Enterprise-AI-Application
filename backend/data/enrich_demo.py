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

        # 4. Create Billing Dispute Exception Case (EX-77431)
        stmt_midland = select(Customer).where(Customer.company_name == "Midland Assembly")
        midland_cust = (await session.execute(stmt_midland)).scalars().first()
        stmt_bill_case = select(ExceptionCase).where(ExceptionCase.case_number == "EX-77431")
        if not (await session.execute(stmt_bill_case)).scalars().first() and midland_cust:
            case_bill = ExceptionCase(
                case_number="EX-77431",
                exception_type="billing_dispute",
                severity="medium",
                status="recommendation_ready",
                related_customer_id=midland_cust.id,
                assigned_to=operator.id if operator else None,
                detected_at=now - timedelta(hours=6),
                root_cause="Promotional discount (12%) was applied in CRM opportunity but never synced to ERP Invoice INV-77431 due to a sync failure.",
                business_impact="Disputed amount is $1,497.60. Automated collections hold placed on account, blocking release of subsequent work orders.",
                recommended_action="1. Issue approved $1,497.60 goodwill credit memo.\n2. Transmit reconciled statement to Tom Bradley.\n3. Open CRM-to-ERP integration defect ticket.",
                confidence_score=0.91,
                investigation_summary="Root Cause: CRM-ERP promotional discount sync failure on INV-77431.\n\nImpact: Disputed $1,497.60; automated release hold placed on account.\n\nRecommended Action: Apply goodwill credit adjustment and send reconciled statement.",
                sources_used=[
                    {"type": "database", "table": "invoices", "detail": "Invoice INV-77431 ($12,480.00 - Disputed)"},
                    {"type": "database", "table": "opportunities", "detail": "Opportunity OPP-2041 (12% promo discount)"},
                    {"type": "document", "name": "billing_dispute_policy.pdf", "page": 2, "relevance": 0.91},
                ],
                investigation_steps=[
                    {"step": "ERP Invoice Ledger Audit", "detail": "Audited Invoice INV-77431 line items and detected missing 12% discount code", "status": "completed"},
                    {"step": "CRM Opportunity Record Sync", "detail": "Verified discount approval by sales director in CRM opportunity record", "status": "completed"},
                    {"step": "Policy Verification", "detail": "billing_dispute_policy.pdf authorizes goodwill credit adjustment within 48h", "status": "completed"},
                    {"step": "Resolution Synthesis", "detail": "Synthesized credit memo adjustment and customer reconciliation email", "status": "completed"},
                ],
            )
            session.add(case_bill)
            await session.flush()

            bill_act1 = ExceptionAction(
                exception_id=case_bill.id,
                action_type="offer_alternative",
                description="Apply authorized $1,497.60 goodwill credit adjustment to Invoice INV-77431.",
                requires_approval=True,
                status="pending",
            )
            bill_act2 = ExceptionAction(
                exception_id=case_bill.id,
                action_type="draft_email",
                description="Send reconciled invoice statement and credit memo to tbradley@midlandassembly.example.com.",
                requires_approval=True,
                status="pending",
            )
            session.add_all([bill_act1, bill_act2])

        # 5. Create Contract Term Violation Exception Case (EX-90112)
        stmt_summit = select(Customer).where(Customer.company_name == "Summit Energy Systems")
        summit_cust = (await session.execute(stmt_summit)).scalars().first()
        stmt_contract_case = select(ExceptionCase).where(ExceptionCase.case_number == "EX-90112")
        if not (await session.execute(stmt_contract_case)).scalars().first() and summit_cust:
            case_contract = ExceptionCase(
                case_number="EX-90112",
                exception_type="contract_violation",
                severity="high",
                status="recommendation_ready",
                related_customer_id=summit_cust.id,
                assigned_to=operator.id if operator else None,
                detected_at=now - timedelta(hours=3),
                root_cause="Fulfillment warehouse dispatched shipment without mandatory lot-level Certificate of Analysis (COA) required under Master Agreement §7.2.",
                business_impact="Contractual 5% non-compliance fee ($4,200.00) applies; QA quarantine holds customer acceptance.",
                recommended_action="1. Obtain supplier lot COA documentation.\n2. Email certificate packet to David Ross.\n3. Update automated pack-list configuration.",
                confidence_score=0.94,
                investigation_summary="Root Cause: Missing lot traceability COA documentation on shipment SHP-8810.\n\nImpact: Contractual 5% non-compliance fee ($4,200.00) and QA acceptance hold.\n\nRecommended Action: Dispatch retroactive certificates and update packing checklist.",
                sources_used=[
                    {"type": "database", "table": "shipments", "detail": "Shipment SHP-8810 (3 line items missing COA)"},
                    {"type": "database", "table": "contracts", "detail": "Master Agreement §7.2 (Mandatory Lot Traceability)"},
                    {"type": "document", "name": "supplier_framework_contract.pdf", "page": 12, "relevance": 0.95},
                ],
                investigation_steps=[
                    {"step": "Contract Agreement Verification", "detail": "Retrieved Section 7.2 traceability requirement from master contract", "status": "completed"},
                    {"step": "Warehouse Pack Audit", "detail": "Identified missing COA attachment at packing station 4", "status": "completed"},
                    {"step": "Supplier Archive Retrieval", "detail": "Retrieved matching batch inspection records from supplier archive", "status": "completed"},
                    {"step": "Resolution Synthesis", "detail": "Prepared compliance documentation packet and corrective procedure", "status": "completed"},
                ],
            )
            session.add(case_contract)
            await session.flush()

            cont_act1 = ExceptionAction(
                exception_id=case_contract.id,
                action_type="draft_email",
                description="Transmit certified lot-traceability packet to dross@summitenergy.example.com with quality guarantee.",
                requires_approval=True,
                status="pending",
            )
            cont_act2 = ExceptionAction(
                exception_id=case_contract.id,
                action_type="create_task",
                description="Reconfigure warehouse packing software to block label generation without scanned COA attachment.",
                requires_approval=True,
                status="pending",
            )
            session.add_all([cont_act1, cont_act2])

        # 6. Create Escalated Complaint Exception Case (EX-66240)
        stmt_vanguard = select(Customer).where(Customer.company_name == "Vanguard Dynamics")
        vanguard_cust = (await session.execute(stmt_vanguard)).scalars().first()
        stmt_complaint_case = select(ExceptionCase).where(ExceptionCase.case_number == "EX-66240")
        if not (await session.execute(stmt_complaint_case)).scalars().first() and vanguard_cust:
            case_complaint = ExceptionCase(
                case_number="EX-66240",
                exception_type="complaint_escalated",
                severity="critical",
                status="recommendation_ready",
                related_customer_id=vanguard_cust.id,
                assigned_to=manager.id if manager else None,
                detected_at=now - timedelta(hours=2),
                root_cause="Repeated field service failures on motor controller assembly caused by truck dispatch carrying superseded hardware revision.",
                business_impact="Executive sponsor Sophia Vance flagged case to account VP. Immediate churn risk on $310K ARR relationship.",
                recommended_action="1. Schedule priority emergency dispatch with verified senior technician.\n2. Transmit executive resolution commitment to Sophia Vance.\n3. Apply service concession credit from Executive Recovery Playbook.",
                confidence_score=0.96,
                investigation_summary="Root Cause: Truck dispatch stock carried superseded hardware revision, failing 2 field repairs.\n\nImpact: Executive sponsor engagement; immediate churn risk on $310K ARR account.\n\nRecommended Action: Dispatch senior lead engineer with pre-verified assembly and offer recovery gesture.",
                sources_used=[
                    {"type": "database", "table": "work_orders", "detail": "WO-5521 & WO-5538 (Repeat repair failure)"},
                    {"type": "database", "table": "accounts", "detail": "Vanguard Dynamics (Executive Sponsor: Sophia Vance)"},
                    {"type": "document", "name": "premium_escalation_sop.pdf", "page": 4, "relevance": 0.94},
                ],
                investigation_steps=[
                    {"step": "Field Dispatch History Audit", "detail": "Correlated repeat failure across two field technician work orders", "status": "completed"},
                    {"step": "Inventory Part Revision Check", "detail": "Identified superseded firmware on warehouse shelf bin B-12", "status": "completed"},
                    {"step": "Executive Escalation Protocol", "detail": "Matched executive complaint playbook criteria from premium_escalation_sop.pdf", "status": "completed"},
                    {"step": "Recovery Action Plan", "detail": "Generated named-owner dispatch plan and VIP executive response letter", "status": "completed"},
                ],
            )
            session.add(case_complaint)
            await session.flush()

            comp_act1 = ExceptionAction(
                exception_id=case_complaint.id,
                action_type="offer_alternative",
                description="Authorize 1-month SLA service concession credit per Executive Recovery Playbook.",
                requires_approval=True,
                status="pending",
            )
            comp_act2 = ExceptionAction(
                exception_id=case_complaint.id,
                action_type="draft_email",
                description="Send executive incident explanation and named manager direct contact to svance@vanguarddyn.example.com.",
                requires_approval=True,
                status="pending",
            )
            comp_act3 = ExceptionAction(
                exception_id=case_complaint.id,
                action_type="create_task",
                description="Schedule senior field systems engineer for guaranteed 8:00 AM on-site hardware swap.",
                requires_approval=True,
                status="pending",
            )
            session.add_all([comp_act1, comp_act2, comp_act3])

        # 7. Create Historical Resolved Cases (to power Business Value ROI metrics in Module G)
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
