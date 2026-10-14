"""Comprehensive Database Seed Script for OpsPilot AI."""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.database import AsyncSessionLocal, Base, engine
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order, OrderItem
from app.models.supplier import Supplier
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


async def seed_data(session: AsyncSession) -> None:
    logger.info("Checking if database already has seed data...")

    # Check if users already exist
    existing_user = (await session.execute(select(User))).scalars().first()
    if existing_user:
        logger.info("Database already seeded. Skipping initialization.")
        return

    logger.info("Creating initial database seed data...")
    now = datetime.now(timezone.utc)

    # 1. Users
    admin_user = User(
        email="admin@opspilot.com",
        name="Sarah Connor (Admin)",
        password_hash=get_password_hash("Admin@123456"),
        role="admin",
        is_active=True,
        is_verified=True,
    )
    manager_user = User(
        email="manager@opspilot.com",
        name="Alex Rivera (Manager)",
        password_hash=get_password_hash("Manager@123456"),
        role="manager",
        is_active=True,
        is_verified=True,
    )
    operator_user = User(
        email="operator@opspilot.com",
        name="James Vance (Operator)",
        password_hash=get_password_hash("Operator@123456"),
        role="operator",
        is_active=True,
        is_verified=True,
    )
    session.add_all([admin_user, manager_user, operator_user])
    await session.flush()

    # 2. Suppliers
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

    # 3. Customers
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

    # 4. Inventory (20 items)
    inventory_map = {}
    inventory_data = [
        # (sku, name, quantity, reorder_threshold, unit_cost, supplier_name)
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

    # 5. Orders & Order Items (25 orders)
    # Order 1: ORD-48321 (FLAGSHIP EXCEPTION: Apex Manufacturing, Premium, due in 20 hours, 0 stock SKU-2847)
    ord_flagship = Order(
        order_number="ORD-48321",
        customer_id=customer_map["Apex Manufacturing"].id,
        status="processing",
        total_amount=2455.00,
        order_date=now - timedelta(hours=28),
        expected_delivery_date=now + timedelta(hours=20),  # In 20 hours! SLA risk!
        notes="Urgent assembly line replacement parts. Customer has premium SLA contract.",
    )
    session.add(ord_flagship)
    await session.flush()
    session.add(OrderItem(order_id=ord_flagship.id, sku="SKU-2847", quantity=10, unit_price=245.50))

    # Order 2: ORD-48500 (SECOND EXCEPTION: GlobalTech Corp, Enterprise, due in 10 hours)
    ord_enterprise = Order(
        order_number="ORD-48500",
        customer_id=customer_map["GlobalTech Corp"].id,
        status="processing",
        total_amount=1295.00,
        order_date=now - timedelta(hours=14),
        expected_delivery_date=now + timedelta(hours=10),  # In 10 hours! Enterprise 24h SLA!
        notes="Cleanroom automation controller update.",
    )
    session.add(ord_enterprise)
    await session.flush()
    session.add(OrderItem(order_id=ord_enterprise.id, sku="SKU-1093", quantity=5, unit_price=140.00))
    session.add(OrderItem(order_id=ord_enterprise.id, sku="SKU-6602", quantity=5, unit_price=115.00))

    # Additional 23 orders
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

    # Commit relational seed data to Neon before processing documents
    await session.commit()
    logger.info("Relational enterprise data successfully committed to database.")

    # 6. Ingest Sample Enterprise PDFs if not already indexed
    import os
    from app.models.document import KnowledgeDocument
    from app.services.exception_detector import ExceptionDetectorService
    from app.services.rag_service import RAGService

    docs_dir = os.path.join(os.path.dirname(__file__), "sample_documents")
    if os.path.exists(docs_dir):
        logger.info("Ingesting sample enterprise PDFs into knowledge base...")
        for fname in sorted(os.listdir(docs_dir)):
            fpath = os.path.join(docs_dir, fname)
            if os.path.isfile(fpath) and fname.lower().endswith(".pdf"):
                stmt = select(KnowledgeDocument).where(KnowledgeDocument.filename == fname)
                existing = (await session.execute(stmt)).scalars().first()
                if not existing:
                    with open(fpath, "rb") as f:
                        file_bytes = f.read()
                    try:
                        await RAGService.ingest_document(
                            session, file_bytes, fname, user_id=admin_user.id
                        )
                        await session.commit()
                        logger.info(f"Ingested sample document: {fname}")
                    except Exception as e:
                        await session.rollback()
                        logger.error(f"Failed to ingest {fname}: {e}")

    # 7. Run initial exception detection for SLA risks
    logger.info("Running initial exception detection scan...")
    detected = await ExceptionDetectorService.detect_exceptions(session)
    await session.commit()
    logger.info(f"Initial detection created {len(detected)} exception cases.")

    # 8. Enrich demo data with Product Vision modules (flagship investigation, overdue invoices, Action Center actions)
    from data.enrich_demo import enrich
    await enrich()

    logger.info("Seed data creation completed successfully!")


async def main():
    # Ensure database schema is created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_data(session)


if __name__ == "__main__":
    asyncio.run(main())

