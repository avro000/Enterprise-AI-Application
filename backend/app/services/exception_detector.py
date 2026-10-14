"""Exception Detection Service (Scheduled SQL analysis)."""

import logging
import random
from datetime import datetime, timedelta, timezone
from typing import List
from sqlalchemy import not_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.exception_case import ExceptionCase
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem

logger = logging.getLogger("exception_detector")


class ExceptionDetectorService:
    """Executes scheduled database queries to detect SLA breach risks and delayed orders."""

    SEVERITY_BUMP = {
        "low": "medium",
        "medium": "high",
        "high": "critical",
        "critical": "critical",
    }

    @classmethod
    def calculate_severity(cls, hours_remaining: float, customer_tier: str) -> str:
        """Computes exception severity based on hours remaining and customer tier."""
        if hours_remaining < 0:
            base_severity = "critical"
        elif hours_remaining < 12:
            base_severity = "high"
        elif hours_remaining < 24:
            base_severity = "medium"
        else:
            base_severity = "low"

        # Premium and enterprise tiers get severity bumped up one tier
        if customer_tier.lower() in ("premium", "enterprise"):
            return cls.SEVERITY_BUMP.get(base_severity, base_severity)
        return base_severity

    @classmethod
    async def _generate_unique_case_number(cls, db: AsyncSession) -> str:
        """Generates a unique case number e.g. EX-20381."""
        for _ in range(20):
            case_num = f"EX-{random.randint(10000, 99999)}"
            stmt = select(ExceptionCase.id).where(ExceptionCase.case_number == case_num)
            existing = (await db.execute(stmt)).scalars().first()
            if not existing:
                return case_num
        return f"EX-{int(datetime.now().timestamp()) % 100000:05d}"

    @classmethod
    async def detect_exceptions(cls, db: AsyncSession) -> List[ExceptionCase]:
        """Scans pending orders approaching or exceeding expected delivery dates and generates exception cases."""
        now = datetime.now(timezone.utc)
        horizon = now + timedelta(hours=48)

        # 1. Query candidate orders with expected delivery within 48 hours not already resolved/escalated
        # Exclude delivered and cancelled orders
        stmt = (
            select(Order)
            .options(
                selectinload(Order.customer),
                selectinload(Order.items).selectinload(OrderItem.inventory_item).selectinload(Inventory.supplier),
            )
            .where(
                not_(Order.status.in_(["delivered", "cancelled"])),
                Order.expected_delivery_date <= horizon,
            )
            .order_by(Order.expected_delivery_date.asc())
        )

        result = await db.execute(stmt)
        orders = result.scalars().all()

        new_cases: List[ExceptionCase] = []

        for order in orders:
            # Check if an active exception case already exists for this order
            active_case_stmt = select(ExceptionCase).where(
                ExceptionCase.related_order_id == order.id,
                not_(ExceptionCase.status.in_(["resolved", "escalated"])),
            )
            existing_case = (await db.execute(active_case_stmt)).scalars().first()
            if existing_case:
                continue

            # Ensure delivery date is timezone aware
            exp_date = order.expected_delivery_date
            if exp_date.tzinfo is None:
                exp_date = exp_date.replace(tzinfo=timezone.utc)

            hours_remaining = (exp_date - now).total_seconds() / 3600.0
            customer_tier = order.customer.tier if order.customer else "standard"
            severity = cls.calculate_severity(hours_remaining, customer_tier)

            # Classify diverse operational exception types based on operational factors
            inv_items = order.items if order.items else []
            has_zero_stock = any(it.inventory_item and it.inventory_item.quantity_available <= 0 for it in inv_items)
            has_delayed_supplier = any(
                it.inventory_item and it.inventory_item.supplier and it.inventory_item.supplier.status == "delayed"
                for it in inv_items
            )

            if order.status == "delayed" or hours_remaining < 0:
                exception_type = "delayed_order"
            elif has_delayed_supplier:
                exception_type = "supplier_late"
            elif has_zero_stock:
                exception_type = "inventory_low"
            elif customer_tier in ("premium", "enterprise") and hours_remaining < 24:
                exception_type = "sla_risk"
            else:
                exception_type = "delayed_order"

            case_number = await cls._generate_unique_case_number(db)

            case = ExceptionCase(
                case_number=case_number,
                exception_type=exception_type,
                severity=severity,
                status="detected",
                related_order_id=order.id,
                related_customer_id=order.customer_id,
                detected_at=now,
            )
            db.add(case)
            await db.flush()

            # Create audit log
            audit = AuditLog(
                event_type="exception_detected",
                actor_type="system",
                entity_type="exception",
                entity_id=case.id,
                details={
                    "case_number": case.case_number,
                    "order_number": order.order_number,
                    "severity": severity,
                    "hours_remaining": round(hours_remaining, 1),
                    "customer_tier": customer_tier,
                },
            )
            db.add(audit)
            new_cases.append(case)

        if new_cases:
            await db.commit()
            for case in new_cases:
                await db.refresh(case)
            logger.info(f"Exception detector created {len(new_cases)} new exception cases.")

        return new_cases
