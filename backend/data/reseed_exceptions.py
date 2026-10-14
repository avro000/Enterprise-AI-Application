"""Script to reseed all operational and exception mock data.

Preserves:
- All users (no user deletion or creation)
- All knowledge base documents & chunks intact

Cleans & Reseeds:
- Suppliers
- Customers
- Inventory
- Orders & Order Items
- Exception Cases & Actions
- Audit Logs
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, init_db
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.document import KnowledgeDocument
from app.models.document_chunk import DocumentChunk
from app.models.exception_action import ExceptionAction
from app.models.exception_case import ExceptionCase
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem
from app.models.supplier import Supplier
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reseed_exceptions")


async def reseed():
    await init_db()
    async with AsyncSessionLocal() as session:
        logger.info("Cleaning existing exception cases, actions, and operational records...")

        # 1. Clean exceptions, orders, inventory, customers, suppliers, audit logs
        await session.execute(delete(AuditLog))
        await session.execute(delete(ExceptionAction))
        await session.execute(delete(ExceptionCase))
        await session.execute(delete(OrderItem))
        await session.execute(delete(Order))
        await session.execute(delete(Inventory))
        await session.execute(delete(Customer))
        await session.execute(delete(Supplier))
        await session.commit()

        logger.info("Cleaned operational data. Preserved users and knowledge base documents.")

        # 2. Reseed suppliers, customers, inventory, orders
        from data.clean_and_seed import seed_operational_data
        await seed_operational_data(session)

        # 3. Final verification
        user_count = await session.scalar(select(func.count(User.id)))
        doc_count = await session.scalar(select(func.count(KnowledgeDocument.id)))
        chunk_count = await session.scalar(select(func.count(DocumentChunk.id)))
        order_count = await session.scalar(select(func.count(Order.id)))
        case_count = await session.scalar(select(func.count(ExceptionCase.id)))
        action_count = await session.scalar(select(func.count(ExceptionAction.id)))
        pending_actions = await session.scalar(
            select(func.count(ExceptionAction.id)).where(ExceptionAction.status == "pending")
        )
        approved_actions = await session.scalar(
            select(func.count(ExceptionAction.id)).where(ExceptionAction.status == "approved")
        )

        logger.info("=== RESEED VERIFICATION ===")
        logger.info(f"Users (preserved): {user_count}")
        logger.info(f"Knowledge Documents (preserved): {doc_count}")
        logger.info(f"Document Chunks (preserved): {chunk_count}")
        logger.info(f"Orders: {order_count}")
        logger.info(f"Total Exception Cases: {case_count}")
        logger.info(f"Total Actions: {action_count}")
        logger.info(f"Pending Actions awaiting decision: {pending_actions}")
        logger.info(f"Approved Actions (historical): {approved_actions}")
        logger.info("============================")


if __name__ == "__main__":
    asyncio.run(reseed())
