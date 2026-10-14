"""Generates 5 realistic sample enterprise PDF documents for the OpsPilot AI Knowledge Base."""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "sample_documents")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def build_pdf(filename: str, title: str, sections: list):
    """Utility to render a multi-page styled enterprise policy PDF."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=14,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#374151"),
        spaceAfter=8,
    )

    story = [
        Paragraph(title, title_style),
        Paragraph("<b>Document Classification:</b> Internal Enterprise Policy & Standard Operating Procedure", body_style),
        Paragraph("<b>Effective Date:</b> January 1, 2026 | <b>Version:</b> 2.4", body_style),
        Spacer(1, 10),
    ]

    for heading, text in sections:
        story.append(Paragraph(heading, heading_style))
        story.append(Paragraph(text, body_style))
        story.append(Spacer(1, 4))

    doc.build(story)
    print(f"Generated sample document: {filepath}")


def generate_all_sample_documents():
    # 1. SLA Policy
    build_pdf(
        "sla_policy.pdf",
        "Enterprise Service Level Agreement (SLA) Policy",
        [
            ("1. Policy Overview", "This document defines Acme Industrial Distribution's delivery and support SLAs across customer tiers. All logistics, fulfillment, and operations coordinators must uphold these operational deadlines."),
            ("2. Tier Commitments", "Delivery fulfillment windows are structured as follows: Standard Tier customers receive fulfillment within 72 hours of order confirmation. Premium Tier customers are guaranteed delivery within 48 hours. Enterprise Tier accounts are contracted for priority 24-hour turnaround on all in-stock and scheduled orders."),
            ("3. SLA Breach Penalties", "Fulfillment delays exceeding contracted delivery windows incur severe commercial penalties: A delay beyond 12 hours past the target SLA window requires a 5% billing rebate. Delays past 24 hours trigger an automatic 15% account credit and require immediate management intervention."),
            ("4. At-Risk Warning Horizons", "Any order approaching delivery deadline with less than 48 hours remaining where fulfillment or inventory availability is uncertain must be flagged immediately as an SLA Risk exception."),
        ]
    )

    # 2. Escalation Procedures
    build_pdf(
        "escalation_procedures.pdf",
        "Operational Incident & Delivery Delay Escalation Procedures",
        [
            ("1. Escalation Hierarchy", "Operational delays must be escalated based on severity level. For Low and Medium severity (orders with 24-48 hours remaining), the Logistics Coordinator manages remediation. For High severity (under 12 hours remaining), the Operations Manager must be notified. For Critical severity (breached SLA or under 0 hours remaining), the Operations Director receives direct notification."),
            ("2. Required Communications", "When an order enters High or Critical severity status, operations must notify customer support within 60 minutes. An official delay notification containing root cause summary and estimated revised delivery window must be provided to the account representative."),
            ("3. Supplier Escalations", "If a delivery delay is attributed to supplier stockouts or delayed supplier inbound shipments, the Procurement Team must immediately issue an expedited vendor notice and assess secondary supplier availability."),
        ]
    )

    # 3. Premium Customer Policy
    build_pdf(
        "premium_customer_policy.pdf",
        "Premium & Enterprise Customer Care Standard Operating Procedures",
        [
            ("1. Special Handling Rules", "Premium and Enterprise tier accounts represent critical revenue relationships. Orders from these accounts receive priority pick-and-pack routing and dedicated support oversight."),
            ("2. Alternative Product Substitution Policy", "If an ordered SKU is out of stock or delayed by more than 8 hours for a Premium or Enterprise account, operations is authorized to substitute an equivalent or higher-specification product at zero additional cost to the customer, subject to manager approval."),
            ("3. Proactive Outreach Mandate", "Never allow a Premium or Enterprise customer to discover an order delay on their own. Operations must issue proactive notifications via account managers at least 12 hours prior to any expected delivery variance."),
        ]
    )

    # 4. Returns & Refunds Policy
    build_pdf(
        "returns_and_refunds.pdf",
        "Commercial Returns, Exchanges, and Restocking Policy",
        [
            ("1. Standard Return Window", "Customers may return standard catalog items within 30 days of delivery receipt in original packaging for a full refund or credit."),
            ("2. Restocking Fees", "A standard 10% restocking fee applies to customer-initiated returns of non-defective merchandise. However, if a return or cancellation results from an SLA delivery breach or shipment error caused by Acme Industrial, all restocking fees are waived in full."),
            ("3. Expedited Replacements", "For defective or damaged deliveries, expedited cross-shipment replacement orders must be dispatched within 24 hours of claim verification."),
        ]
    )

    # 5. Employee Handbook
    build_pdf(
        "employee_handbook.pdf",
        "Operations Team Handbook & Workplace Guidelines",
        [
            ("1. Core Values", "Our operations are built on precision, transparency, safety, and accountability. Every operator is empowered to pause a fulfillment line if a quality or safety discrepancy is identified."),
            ("2. Annual Leave & Benefits", "Full-time employees receive 20 days of paid annual vacation leave per calendar year, accrued monthly, in addition to 10 standard enterprise public holidays."),
            ("3. Expense & Travel Policy", "Operational travel and necessary field supplies must be pre-approved by the department manager and submitted via expense software within 14 days of expenditure."),
        ]
    )


if __name__ == "__main__":
    generate_all_sample_documents()
