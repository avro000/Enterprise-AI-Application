"""Script to clean the database and re-seed operational data without creating any users.

Preserves existing Knowledge Base documents and chunks intact.
Cleans the user table and does NOT create any users after cleaning.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, Base, engine
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.document import KnowledgeDocument
from app.models.document_chunk import DocumentChunk
from app.models.exception_action import ExceptionAction
from app.models.exception_case import ExceptionCase
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem
from app.models.otp_code import OTPCode
from app.models.supplier import Supplier
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clean_and_seed")


async def clean_database(session: AsyncSession) -> None:
    logger.info("Starting database cleaning...")

    # 1. Nullify uploaded_by on knowledge_documents so users can be deleted without FK conflict
    await session.execute(update(KnowledgeDocument).values(uploaded_by=None))
    await session.flush()
    logger.info("Preserved knowledge_documents and unlinked uploaded_by.")

    # 2. Delete in reverse dependency order
    await session.execute(delete(AuditLog))
    await session.execute(delete(OTPCode))
    await session.execute(delete(ExceptionAction))
    await session.execute(delete(ExceptionCase))
    await session.execute(delete(OrderItem))
    await session.execute(delete(Order))
    await session.execute(delete(Inventory))
    await session.execute(delete(Customer))
    await session.execute(delete(Supplier))

    # 3. Clean user table
    await session.execute(delete(User))
    await session.commit()
    logger.info("Database cleaned successfully! Users table emptied. Knowledge documents untouched.")


async def seed_operational_data(session: AsyncSession) -> None:
    logger.info("Seeding operational data (WITHOUT creating any users)...")
    now = datetime.now(timezone.utc)

    # 1. Suppliers
    supplier_map = {}
    suppliers_data = [
        ("SupplyCo International", "contact@supplyco.example.com", 14, 0.72, "delayed"),
        ("Precision Fasteners Ltd", "orders@precisionfast.example.com", 5, 0.98, "active"),
        ("Titan Heavy Logistics", "dispatch@titanlogistics.example.com", 3, 0.95, "active"),
        ("Apex Raw Materials", "sales@apexraw.example.com", 7, 0.91, "active"),
        ("Global Hydraulics Inc", "support@globalhydraulics.example.com", 10, 0.65, "inactive"),
    ]
    for name, email, lead_time, reliability, status in suppliers_data:
        supp = Supplier(
            name=name,
            contact_email=email,
            lead_time_days=lead_time,
            reliability_score=reliability,
            status=status,
        )
        session.add(supp)
        supplier_map[name] = supp
    await session.flush()
    logger.info("Seeded 5 suppliers.")

    # 2. Customers
    customer_map = {}
    customers_data = [
        ("Apex Manufacturing", "Elena Rostova", "erostova@apexmanufacturing.example.com", "premium", "Midwest", 48),
        ("GlobalTech Corp", "Marcus Chen", "mchen@globaltech.example.com", "enterprise", "West Coast", 24),
        ("Acme Tool & Die", "Bill Henderson", "bhenderson@acmetool.example.com", "standard", "Northeast", 72),
        ("Pioneer Robotics", "Priya Sharma", "psharma@pioneerrobotics.example.com", "enterprise", "Southwest", 24),
        ("Midland Assembly", "Tom Bradley", "tbradley@midlandassembly.example.com", "premium", "Midwest", 48),
        ("Vanguard Dynamics", "Sophia Vance", "svance@vanguarddyn.example.com", "standard", "Southeast", 72),
        ("Summit Energy Systems", "David Ross", "dross@summitenergy.example.com", "premium", "Northwest", 48),
        ("Omega Fabrication", "Rachel Green", "rgreen@omegafab.example.com", "standard", "Central", 72),
    ]
    for company, contact, email, tier, region, sla in customers_data:
        cust = Customer(
            company_name=company,
            contact_name=contact,
            contact_email=email,
            tier=tier,
            region=region,
            sla_hours=sla,
        )
        session.add(cust)
        customer_map[company] = cust
    await session.flush()
    logger.info("Seeded 8 customers.")

    # 3. Inventory (20 items)
    inventory_map = {}
    inventory_data = [
        ("SKU-2847", "Industrial High-Pressure Hydraulic Valve 25mm", 0, 15, 245.50, "SupplyCo International"),
        ("SKU-2848", "Standard Hydraulic Actuator 12V", 45, 10, 185.00, "Precision Fasteners Ltd"),
        ("SKU-1092", "High-Torque Stepper Motor 2.8A", 8, 20, 89.90, "Titan Heavy Logistics"),
        ("SKU-1093", "Brushless DC Motor Controller 48V", 120, 25, 140.00, "Titan Heavy Logistics"),
        ("SKU-5501", "Precision Carbide End Mill Set 6pc", 35, 10, 65.00, "Precision Fasteners Ltd"),
        ("SKU-5502", "Titanium Coated Drill Bit Index", 4, 15, 110.00, "Precision Fasteners Ltd"),
        ("SKU-7721", "Optical Rotary Encoder 1000 CPR", 0, 8, 74.25, "SupplyCo International"),
        ("SKU-7722", "Magnetic Limit Switch N.O. 24V", 80, 20, 18.50, "SupplyCo International"),
        ("SKU-3310", "Heavy Duty Linear Guide Rail 1200mm", 18, 5, 215.00, "Apex Raw Materials"),
        ("SKU-3311", "Precision Ball Screw Assembly 20mm", 2, 8, 320.00, "Apex Raw Materials"),
        ("SKU-9901", "EPDM High-Temperature Gasket Kit", 250, 50, 12.00, "Precision Fasteners Ltd"),
        ("SKU-9902", "Fluoroelastomer O-Ring Assortment", 310, 100, 22.50, "Precision Fasteners Ltd"),
        ("SKU-4401", "Pneumatic Cylinder 50mm Bore 200mm Stroke", 14, 10, 165.00, "Global Hydraulics Inc"),
        ("SKU-4402", "Solenoid Directional Air Valve 5/2 Way", 6, 12, 95.00, "Global Hydraulics Inc"),
        ("SKU-6601", "Solid State Relay 3-Phase 40A", 52, 15, 58.00, "Titan Heavy Logistics"),
        ("SKU-6602", "Digital PID Temperature Controller", 22, 10, 115.00, "Titan Heavy Logistics"),
        ("SKU-8810", "Industrial Ethernet Switch 8-Port DIN", 40, 8, 230.00, "Titan Heavy Logistics"),
        ("SKU-8811", "Shielded Industrial Cat6 Cable Reel 305m", 15, 5, 195.00, "Apex Raw Materials"),
        ("SKU-2001", "Reinforced Polyurethane Timing Belt 5M", 75, 20, 28.00, "Precision Fasteners Ltd"),
        ("SKU-2002", "Cast Iron V-Belt Pulley 2-Groove", 30, 10, 48.00, "Precision Fasteners Ltd"),
    ]
    for sku, pname, qty, reorder, cost, sname in inventory_data:
        inv = Inventory(
            sku=sku,
            product_name=pname,
            quantity_available=qty,
            reorder_threshold=reorder,
            unit_cost=cost,
            supplier_id=supplier_map[sname].id if sname in supplier_map else None,
        )
        session.add(inv)
        inventory_map[sku] = inv
    await session.flush()
    logger.info("Seeded 20 inventory items.")

    # 4. Orders & Items (25 orders)
    ord_flagship = Order(
        order_number="ORD-48321",
        customer_id=customer_map["Apex Manufacturing"].id,
        status="processing",
        total_amount=2455.00,
        order_date=now - timedelta(hours=28),
        expected_delivery_date=now + timedelta(hours=20),
        notes="Urgent assembly line replacement parts. Customer has premium SLA contract.",
    )
    session.add(ord_flagship)
    await session.flush()
    session.add(OrderItem(order_id=ord_flagship.id, sku="SKU-2847", quantity=10, unit_price=245.50))

    ord_enterprise = Order(
        order_number="ORD-48500",
        customer_id=customer_map["GlobalTech Corp"].id,
        status="processing",
        total_amount=1295.00,
        order_date=now - timedelta(hours=14),
        expected_delivery_date=now + timedelta(hours=10),
        notes="Cleanroom automation controller update.",
    )
    session.add(ord_enterprise)
    await session.flush()
    session.add(OrderItem(order_id=ord_enterprise.id, sku="SKU-1093", quantity=5, unit_price=140.00))
    session.add(OrderItem(order_id=ord_enterprise.id, sku="SKU-6602", quantity=5, unit_price=115.00))

    order_samples = [
        ("ORD-48101", "Acme Tool & Die", "delivered", 650.00, -72, -10, [("SKU-5501", 10, 65.00)]),
        ("ORD-48102", "Pioneer Robotics", "delivered", 3200.00, -48, -20, [("SKU-3311", 10, 320.00)]),
        ("ORD-48103", "Midland Assembly", "delivered", 1850.00, -96, -30, [("SKU-2848", 10, 185.00)]),
        ("ORD-48104", "Vanguard Dynamics", "delivered", 440.00, -60, -12, [("SKU-9902", 20, 22.00)]),
        ("ORD-48105", "Summit Energy Systems", "delivered", 1150.00, -40, -5, [("SKU-6602", 10, 115.00)]),
        ("ORD-48201", "Apex Manufacturing", "shipped", 1840.00, -20, 24, [("SKU-8810", 8, 230.00)]),
        ("ORD-48202", "GlobalTech Corp", "shipped", 3200.00, -15, 30, [("SKU-3311", 10, 320.00)]),
        ("ORD-48203", "Acme Tool & Die", "shipped", 550.00, -10, 40, [("SKU-5501", 8, 65.00)]),
        ("ORD-48204", "Pioneer Robotics", "processing", 1400.00, -5, 60, [("SKU-1093", 10, 140.00)]),
        ("ORD-48205", "Midland Assembly", "processing", 1850.00, -4, 65, [("SKU-2848", 10, 185.00)]),
        ("ORD-48206", "Vanguard Dynamics", "confirmed", 720.00, -3, 68, [("SKU-2001", 25, 28.00)]),
        ("ORD-48207", "Summit Energy Systems", "confirmed", 2150.00, -2, 70, [("SKU-3310", 10, 215.00)]),
        ("ORD-48208", "Omega Fabrication", "pending", 899.00, -1, 71, [("SKU-1092", 10, 89.90)]),
        ("ORD-48209", "Apex Manufacturing", "pending", 1200.00, 0, 72, [("SKU-9901", 100, 12.00)]),
        ("ORD-48210", "GlobalTech Corp", "confirmed", 1950.00, -2, 22, [("SKU-8811", 10, 195.00)]),
        ("ORD-48211", "Acme Tool & Die", "processing", 480.00, -8, 64, [("SKU-2002", 10, 48.00)]),
        ("ORD-48212", "Pioneer Robotics", "processing", 950.00, -6, 18, [("SKU-4402", 10, 95.00)]),
        ("ORD-48213", "Midland Assembly", "shipped", 2300.00, -24, 24, [("SKU-8810", 10, 230.00)]),
        ("ORD-48214", "Vanguard Dynamics", "delivered", 650.00, -80, -20, [("SKU-5501", 10, 65.00)]),
        ("ORD-48215", "Summit Energy Systems", "delayed", 1650.00, -48, -4, [("SKU-4401", 10, 165.00)]),
        ("ORD-48216", "Omega Fabrication", "delivered", 480.00, -90, -30, [("SKU-2002", 10, 48.00)]),
        ("ORD-48217", "Apex Manufacturing", "confirmed", 1400.00, -3, 45, [("SKU-1093", 10, 140.00)]),
        ("ORD-48218", "GlobalTech Corp", "delivered", 2455.00, -70, -15, [("SKU-2847", 10, 245.50)]),
    ]
    for onum, cname, ostatus, ototal, order_offset_h, delivery_offset_h, items in order_samples:
        ord_obj = Order(
            order_number=onum,
            customer_id=customer_map[cname].id,
            status=ostatus,
            total_amount=ototal,
            order_date=now + timedelta(hours=order_offset_h),
            expected_delivery_date=now + timedelta(hours=delivery_offset_h),
        )
        session.add(ord_obj)
        await session.flush()
        for isku, iqty, iprice in items:
            session.add(OrderItem(order_id=ord_obj.id, sku=isku, quantity=iqty, unit_price=iprice))

    await session.commit()
    logger.info("Seeded 25 orders and items.")

    # 5. Run Exception Detection
    from app.services.exception_detector import ExceptionDetectorService
    logger.info("Scanning for operational exceptions...")
    detected = await ExceptionDetectorService.detect_exceptions(session)
    await session.commit()
    logger.info(f"Exception detector registered {len(detected)} cases.")

    # 6. Enrich with Flagship & Governance Demo Data
    from data.enrich_demo import enrich
    logger.info("Enriching demo data (flagship case, invoice case, ROI cases)...")
    await enrich()

    # 7. Verification summary
    user_count = await session.scalar(select(func.count(User.id)))
    doc_count = await session.scalar(select(func.count(KnowledgeDocument.id)))
    chunk_count = await session.scalar(select(func.count(DocumentChunk.id)))
    order_count = await session.scalar(select(func.count(Order.id)))
    item_count = await session.scalar(select(func.count(Inventory.id)))
    cust_count = await session.scalar(select(func.count(Customer.id)))
    supp_count = await session.scalar(select(func.count(Supplier.id)))
    case_count = await session.scalar(select(func.count(ExceptionCase.id)))
    action_count = await session.scalar(select(func.count(ExceptionAction.id)))

    logger.info("=== VERIFICATION SUMMARY ===")
    logger.info(f"Users in database: {user_count} (Expected: 0)")
    logger.info(f"Knowledge Documents: {doc_count} (Preserved)")
    logger.info(f"Document Chunks: {chunk_count} (Preserved)")
    logger.info(f"Suppliers: {supp_count}")
    logger.info(f"Customers: {cust_count}")
    logger.info(f"Inventory: {item_count}")
    logger.info(f"Orders: {order_count}")
    logger.info(f"Exception Cases: {case_count}")
    logger.info(f"Actions in Action Center: {action_count}")
    logger.info("============================")


async def main():
    async with AsyncSessionLocal() as session:
        await clean_database(session)
        await seed_operational_data(session)


if __name__ == "__main__":
    asyncio.run(main())
