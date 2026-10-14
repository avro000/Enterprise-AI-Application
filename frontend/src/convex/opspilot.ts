import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { ROLES } from "./schema";

/* ------------------------------------------------------------------ */
/* RBAC helpers (FRONTEND_SPEC §4 — Admin / Manager / Operator)        */
/* ------------------------------------------------------------------ */

type OpsRole = "admin" | "manager" | "operator";

function effectiveRole(role: string | undefined): OpsRole {
  if (role === ROLES.ADMIN) return "admin";
  if (role === ROLES.OPERATOR) return "operator";
  // manager, user, member and unset users all behave as managers so a fresh
  // demo session can drive the full approve/investigate loop.
  return "manager";
}

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Not authenticated");
  return { userId, user };
}

async function requireActor(ctx: QueryCtx | MutationCtx) {
  const { userId, user } = await requireUser(ctx);
  const actor = user.name ?? user.email ?? "Signed-in user";
  return { userId, user, role: effectiveRole(user.role), actor };
}

async function requireOpsAccess(ctx: MutationCtx) {
  const { user, role, actor } = await requireActor(ctx);
  if (role === "operator") {
    throw new Error("You don't have permission to perform this action.");
  }
  return { user, role, actor };
}

/* ------------------------------------------------------------------ */
/* Demo seed data (mock ERP/CRM + document repository)                 */
/* ------------------------------------------------------------------ */

const CUSTOMERS = [
  { name: "Apex Manufacturing", tier: "premium" as const },
  { name: "Northwind Industrial", tier: "enterprise" as const },
  { name: "Cascade Field Services", tier: "standard" as const },
  { name: "Helios Components", tier: "premium" as const },
  { name: "Ridgeline Supply Co.", tier: "standard" as const },
  { name: "BlueRock Distribution", tier: "enterprise" as const },
  { name: "Vertex Repair Group", tier: "standard" as const },
  { name: "Sterling Parts Ltd.", tier: "premium" as const },
];

const SEVERITIES: Array<
  "critical" | "high" | "medium" | "low"
> = [
  "critical",
  "high",
  "medium",
  "low",
  "high",
  "medium",
  "low",
  "medium",
  "high",
  "low",
  "critical",
  "high",
];

const DETECTED_IDX = [0, 1, 3, 4, 6, 7, 10, 14, 18, 24, 30, 36];
const RECOMMENDATION_IDX = [2, 8, 12, 20, 28];
const APPROVED_IDX = [5, 16, 33];
const REJECTED_IDX = [22];

type Ctx = {
  caseNumber: string;
  customer: string;
  tier: "standard" | "premium" | "enterprise";
  orderId: string;
  i: number;
};

type TypeSpec = {
  key: string;
  label: string;
  summary: (c: Ctx) => string;
  rootCause: (c: Ctx) => string;
  impact: (c: Ctx) => string;
  recommendation: (c: Ctx) => string;
  sources: (c: Ctx) => Array<{
    type: "document" | "database";
    name?: string;
    page?: number;
    relevance?: number;
    table?: string;
    detail?: string;
  }>;
  actions: Array<{ description: (c: Ctx) => string; risk: "low" | "medium" | "high"; auto: boolean }>;
};

const TYPES: TypeSpec[] = [
  {
    key: "delayed_order",
    label: "Delayed Order",
    summary: (c) => `${c.orderId} is projected to miss its promised delivery date.`,
    rootCause: () =>
      "Supplier inventory shortage — primary SKU backordered at SupplyCo with a revised ship date 6 days out. The ERP allocation check passed at order entry, so the shortage only surfaced after the warehouse wave was released.",
    impact: (c) =>
      c.tier === "standard"
        ? `Standard-tier order ${c.orderId} will miss the promised delivery window by 3–4 days, risking a late-delivery credit and a follow-up support contact.`
        : `${c.tier === "enterprise" ? "Enterprise" : "Premium"} account ${c.customer} is projected to miss SLA by 4 days. Contract terms allow a service credit after 48 hours without escalation.`,
    recommendation: (c) =>
      `Offer the approved alternative SKU (in stock, ships in 24h) and notify the account manager. Per the premium escalation SOP, ${c.customer} must receive an escalation notice within 48 hours of detection.`,
    sources: (c) => [
      { type: "document", name: "sla_policy.pdf", page: 3, relevance: 0.93 },
      { type: "document", name: "premium_escalation_sop.pdf", page: 2, relevance: 0.88 },
      { type: "database", table: "orders", detail: c.orderId },
      { type: "database", table: "inventory", detail: "SKU-2847 (available: 0)" },
      { type: "database", table: "suppliers", detail: "SupplyCo — revised ETA +6d" },
    ],
    actions: [
      {
        description: (c) =>
          `Create an internal operations task: re-source ${c.orderId} from alternate stock and confirm the new ship date.`,
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Draft and stage a customer notification to ${c.customer} offering the approved alternative SKU (requires account manager approval).`,
        risk: "medium",
        auto: false,
      },
    ],
  },
  {
    key: "sla_risk",
    label: "SLA Breach Risk",
    summary: (c) => `Response SLA for ${c.customer} is at risk of breach within 12 hours.`,
    rootCause: () =>
      "Support queue backlog after a firmware recall generated 3× normal ticket volume; two engineers were out, and the escalation playbook was never triggered because no ticket crossed the priority-1 threshold.",
    impact: (c) =>
      `${c.customer} is a ${c.tier} account with a 4-hour first-response commitment. A breach triggers a contractual service credit and counts toward the quarterly scorecard reviewed in the QBR.`,
    recommendation: () =>
      "Trigger the escalation playbook: reassign two tickets to the on-call engineer, send the holding response from the approved template, and log the backlog root cause for the weekly ops review.",
    sources: (c) => [
      { type: "document", name: "sla_policy.pdf", page: 5, relevance: 0.9 },
      { type: "database", table: "tickets", detail: "14 open — 3 near SLA" },
      { type: "database", table: "accounts", detail: `${c.customer} (${c.tier})` },
    ],
    actions: [
      {
        description: () =>
          "Reassign the 3 near-SLA tickets to the on-call engineer and add an internal note with the escalation context.",
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Send ${c.customer} the approved SLA holding response and log the escalation in the CRM.`,
        risk: "medium",
        auto: false,
      },
    ],
  },
  {
    key: "billing_dispute",
    label: "Billing Dispute",
    summary: (c) => `Invoice dispute open on ${c.customer}'s latest statement.`,
    rootCause: () =>
      "Promotional discount was applied in the CRM opportunity but never synced to the ERP invoice record — a known gap in the nightly order-to-cash integration job.",
    impact: (c) =>
      `Disputed amount is $12,480. Collections on ${c.customer}'s account are paused, pushing DSO out by an average of 18 days for this segment.`,
    recommendation: () =>
      "Issue the approved goodwill adjustment for the discount delta, add a reconciliation note to the invoice, and file an integration defect so the CRM→ERP sync gap is tracked.",
    sources: () => [
      { type: "document", name: "billing_dispute_policy.pdf", page: 2, relevance: 0.91 },
      { type: "database", table: "invoices", detail: "INV-77431 — disputed" },
      { type: "database", table: "opportunities", detail: "Discount 12% (CRM only)" },
    ],
    actions: [
      {
        description: () =>
          "Add an internal reconciliation note to invoice INV-77431 and open a defect ticket for the CRM→ERP sync failure.",
        risk: "low",
        auto: true,
      },
      {
        description: () =>
          "Issue the approved $1,497.60 goodwill adjustment for the discount delta (financial action — approval required).",
        risk: "high",
        auto: false,
      },
    ],
  },
  {
    key: "overdue_payment",
    label: "Overdue Payment",
    summary: (c) => `Payment 31 days overdue on account ${c.customer}.`,
    rootCause: () =>
      "The customer's AP contact changed in March and invoices have been routing to a decommissioned mailbox; no payment run has been issued since the PO for the previous period closed.",
    impact: (c) =>
      `$46,200 outstanding against ${c.customer}. At day 45 the account moves to collections hold, which blocks the next release order worth ~$88K.`,
    recommendation: () =>
      "Update the AP contact from the account record, resend the overdue statement with remittance instructions, and set a 7-day payment follow-up task before the collections hold threshold.",
    sources: (c) => [
      { type: "document", name: "collections_playbook.docx", page: 4, relevance: 0.87 },
      { type: "database", table: "invoices", detail: "INV-77102 — 31 days overdue" },
      { type: "database", table: "accounts", detail: `${c.customer} — AP contact stale` },
    ],
    actions: [
      {
        description: () =>
          "Update the AP contact on the account record and create a 7-day payment follow-up task for collections.",
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Resend the overdue statement to ${c.customer}'s verified AP contact with remittance instructions (customer communication — approval required).`,
        risk: "medium",
        auto: false,
      },
    ],
  },
  {
    key: "supplier_late",
    label: "Late Supplier Delivery",
    summary: (c) => `Supplier shipment for work order ${c.orderId} arrived 5 days late.`,
    rootCause: () =>
      "Carrier customs hold at the border plus an incomplete HTS classification on two line items — the supplier's paperwork was filed without the updated tariff codes.",
    impact: () =>
      "Production schedule for the week loses 1.5 days of buffer; two downstream customer orders inherit the slip if expediting is not approved.",
    recommendation: () =>
      "Approve air-freight expediting for the held line items, request corrected HTS documentation from the supplier, and rebalance the production wave to protect the two downstream orders.",
    sources: () => [
      { type: "document", name: "supplier_framework_contract.pdf", page: 7, relevance: 0.84 },
      { type: "database", table: "purchase_orders", detail: "PO-30118 — in transit hold" },
      { type: "database", table: "suppliers", detail: "SupplyCo — OTD 82%" },
    ],
    actions: [
      {
        description: () =>
          "Add a supplier performance note and flag PO-30118 for the weekly procurement review.",
        risk: "low",
        auto: true,
      },
      {
        description: () =>
          "Approve $2,150 air-freight expediting on the held line items (spend above threshold — approval required).",
        risk: "high",
        auto: false,
      },
    ],
  },
  {
    key: "ticket_aging",
    label: "Aging Service Ticket",
    summary: (c) => `Service ticket for ${c.customer} has aged 6 days without owner action.`,
    rootCause: () =>
      "The ticket was routed to a deprecated queue when the regional team reorganized; no owner picked it up and the SLA timer kept running in the background.",
    impact: (c) =>
      `${c.customer} has opened a second ticket about the same issue — repeat-contact rate for this site is now 2 in 30 days, an early churn signal for a ${c.tier} account.`,
    recommendation: () =>
      "Assign the ticket to the regional field team with priority raised, send the customer an acknowledgment from the approved template, and close the duplicate with a cross-reference.",
    sources: (c) => [
      { type: "document", name: "order_fulfillment_playbook.docx", page: 11, relevance: 0.82 },
      { type: "database", table: "tickets", detail: "TK-90112 — 6 days aged" },
      { type: "database", table: "accounts", detail: `${c.customer} — repeat contact` },
    ],
    actions: [
      {
        description: () =>
          "Reassign TK-90112 to the regional field queue, raise priority, and cross-close the duplicate ticket.",
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Send ${c.customer} the approved acknowledgment with a named owner and ETA (customer communication — approval required).`,
        risk: "medium",
        auto: false,
      },
    ],
  },
  {
    key: "inventory_low",
    label: "Inventory Below Threshold",
    summary: () => "Stock on a stocked line item dropped below the safety threshold.",
    rootCause: () =>
      "Demand ran 40% above forecast for three consecutive weeks while the replenishment trigger stayed at the pre-forecast level — no one re-baselined the min/max after the promo launched.",
    impact: (c) =>
      `Two open orders for ${c.customer} draw from the same SKU. Stockout within 4 days would convert both to backorders and add ~$14K in expedite cost.`,
    recommendation: () =>
      "Raise the replenishment trigger to the forecast-adjusted level, place an expedited PO with the secondary supplier, and reserve available units against the two open orders.",
    sources: () => [
      { type: "document", name: "order_fulfillment_playbook.docx", page: 6, relevance: 0.86 },
      { type: "database", table: "inventory", detail: "SKU-1142 — 18 units (min 60)" },
      { type: "database", table: "replenishment", detail: "Trigger at stale baseline" },
    ],
    actions: [
      {
        description: () =>
          "Reserve remaining units against the two open orders and raise the replenishment trigger to the forecast-adjusted level.",
        risk: "low",
        auto: true,
      },
      {
        description: () =>
          "Place an expedited purchase order with the secondary supplier ($9,800 — approval required).",
        risk: "high",
        auto: false,
      },
    ],
  },
  {
    key: "contract_violation",
    label: "Contract Term Violated",
    summary: (c) => `Fulfillment practice on ${c.customer} deviates from contracted terms.`,
    rootCause: () =>
      "The contract requires lot-level traceability documentation with every shipment; the current pick-pack process only attaches packing slips for this product family.",
    impact: (c) =>
      `Non-compliance with §7.2 of the master agreement gives ${c.customer} grounds for chargebacks of up to 5% per non-conforming shipment and blocks the renewal upsell.`,
    recommendation: () =>
      "Attach lot-traceability certificates to the last 3 shipments, update the pack-list template so it prints automatically, and notify compliance for a one-time corrective action record.",
    sources: (c) => [
      { type: "document", name: "supplier_framework_contract.pdf", page: 12, relevance: 0.95 },
      { type: "database", table: "shipments", detail: "3 shipments missing COA" },
      { type: "database", table: "contracts", detail: `${c.customer} — §7.2 traceability` },
    ],
    actions: [
      {
        description: () =>
          "Update the pack-list template to print lot-traceability certificates and file a corrective action record.",
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Send ${c.customer} the compliance notice with corrected documentation for the 3 affected shipments (customer communication — approval required).`,
        risk: "medium",
        auto: false,
      },
    ],
  },
  {
    key: "complaint_escalated",
    label: "Escalated Complaint",
    summary: (c) => `Complaint from ${c.customer} escalated to executive channel.`,
    rootCause: () =>
      "Three failed service visits on the same asset — the first two work orders were closed with the wrong part number, so the van stock never carried the replacement.",
    impact: (c) =>
      `Executive sponsor at ${c.customer} flagged the case after the third missed visit. Churn risk on a ${c.tier} relationship worth $310K ARR if unresolved this week.`,
    recommendation: () =>
      "Schedule the guaranteed fourth visit with a pre-picked verified part, assign a named service manager as single point of contact, and offer the service-credit gesture defined in the recovery playbook.",
    sources: (c) => [
      { type: "document", name: "premium_escalation_sop.pdf", page: 4, relevance: 0.92 },
      { type: "database", table: "work_orders", detail: "WO-5521/5538/5547" },
      { type: "database", table: "accounts", detail: `${c.customer} — sponsor engaged` },
    ],
    actions: [
      {
        description: () =>
          "Assign a named service manager, verify the part on the truck, and lock the guaranteed fourth visit slot.",
        risk: "low",
        auto: true,
      },
      {
        description: (c) =>
          `Offer ${c.customer} the service-credit gesture from the recovery playbook and send the executive response (financial concession — approval required).`,
        risk: "high",
        auto: false,
      },
    ],
  },
];

function seedStatusFor(i: number): "detected" | "recommendation_ready" | "approved" | "rejected" | "resolved" {
  if (DETECTED_IDX.includes(i)) return "detected";
  if (RECOMMENDATION_IDX.includes(i)) return "recommendation_ready";
  if (APPROVED_IDX.includes(i)) return "approved";
  if (REJECTED_IDX.includes(i)) return "rejected";
  return "resolved";
}

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exceptions").take(1);
    if (existing.length > 0) return { seeded: false };

    const now = Date.now();
    const HOUR = 3_600_000;
    const DAY = 24 * HOUR;

    for (let i = 0; i < 42; i++) {
      const type = TYPES[i % TYPES.length];
      const customer = CUSTOMERS[i % CUSTOMERS.length];
      const caseNumber = i === 0 ? "EX-20381" : `EX-${20401 + i * 3}`;
      const orderId = i === 0 ? "ORD-48321" : `ORD-${47000 + i * 17}`;
      const c: Ctx = {
        caseNumber,
        customer: customer.name,
        tier: customer.tier,
        orderId,
        i,
      };

      // First five were detected today (dashboard "detected today" = 5),
      // the rest fan out across the previous ten days.
      const detectedAt =
        i < 5 ? now - (2 + i * 1.5) * HOUR : now - ((i % 10) + 1) * DAY - (i % 9) * HOUR;

      const severity = SEVERITIES[i % SEVERITIES.length];
      const status = seedStatusFor(i);
      const resolutionMinutes = 30 + ((i * 11) % 31); // 30–60, avg ≈ 45

      const investigationDone = status !== "detected";
      const exceptionId = await ctx.db.insert("exceptions", {
        caseNumber,
        exceptionType: type.key,
        severity,
        status,
        customer: customer.name,
        customerTier: customer.tier,
        orderId,
        detectedAt,
        investigationSummary: investigationDone ? type.summary(c) : undefined,
        rootCause: investigationDone ? type.rootCause(c) : undefined,
        businessImpact: investigationDone ? type.impact(c) : undefined,
        recommendedAction: investigationDone ? type.recommendation(c) : undefined,
        confidenceScore: investigationDone
          ? Math.min(0.97, 0.78 + ((i * 7) % 20) / 100)
          : undefined,
        sourcesUsed: investigationDone ? type.sources(c) : undefined,
        assignedTo:
          status === "resolved" || status === "approved"
            ? "Dana Whitfield"
            : status === "rejected"
              ? "Priya Nair"
              : undefined,
        resolvedAt:
          status === "resolved" ? detectedAt + resolutionMinutes * 60_000 : undefined,
        resolutionMinutes: status === "resolved" ? resolutionMinutes : undefined,
      });

      // --- audit trail -------------------------------------------------
      await ctx.db.insert("auditEvents", {
        exceptionId,
        event: `Exception detected — ${type.label} for ${customer.name}`,
        actor: "OpsPilot AI",
        at: detectedAt,
        kind: "detect",
      });

      if (investigationDone) {
        await ctx.db.insert("auditEvents", {
          exceptionId,
          event: "AI investigation completed — context gathered from 5 sources",
          actor: "OpsPilot AI",
          at: detectedAt + 3 * 60_000,
          kind: "investigate",
        });
        await ctx.db.insert("auditEvents", {
          exceptionId,
          event: "Recommendation generated — actions staged in Action Center",
          actor: "OpsPilot AI",
          at: detectedAt + 4 * 60_000,
          kind: "recommend",
        });

        // --- staged actions --------------------------------------------
        for (const action of type.actions) {
          const auto = action.auto;
          const actionId = await ctx.db.insert("exceptionActions", {
            exceptionId,
            description: action.description(c),
            riskTier: action.risk,
            autoExecute: auto,
            status: auto ? "executed" : "pending",
            decidedBy: auto ? "OpsPilot AI" : undefined,
            decidedAt: auto ? detectedAt + 5 * 60_000 : undefined,
          });
          void actionId;
          if (auto) continue;

          if (status === "approved" || status === "resolved") {
            await ctx.db.patch(actionId, {
              status: "approved",
              decidedBy: "Dana Whitfield",
              decidedAt: detectedAt + 35 * 60_000,
            });
            await ctx.db.insert("auditEvents", {
              exceptionId,
              event: "Action approved by Dana Whitfield (Ops Manager)",
              actor: "Dana Whitfield",
              at: detectedAt + 35 * 60_000,
              kind: "approve",
            });
          } else if (status === "rejected") {
            await ctx.db.patch(actionId, {
              status: "rejected",
              decidedBy: "Priya Nair",
              decidedAt: detectedAt + 28 * 60_000,
              rejectReason:
                "Customer already contacted by the account team — hold the automated communication and handle manually.",
            });
            await ctx.db.insert("auditEvents", {
              exceptionId,
              event: "Action rejected by Priya Nair — reason recorded",
              actor: "Priya Nair",
              at: detectedAt + 28 * 60_000,
              kind: "reject",
            });
          }
        }
      }

      if (status === "resolved") {
        await ctx.db.insert("auditEvents", {
          exceptionId,
          event: `Exception resolved and verified in source systems (${resolutionMinutes} min)`,
          actor: "Dana Whitfield",
          at: detectedAt + resolutionMinutes * 60_000,
          kind: "resolve",
        });
      }
    }

    // --- knowledge base documents --------------------------------------
    const docs: Array<[string, "pdf" | "txt" | "docx", number, number]> = [
      ["sla_policy.pdf", "pdf", 34, 12],
      ["premium_escalation_sop.pdf", "pdf", 12, 1],
      ["supplier_framework_contract.pdf", "pdf", 27, 3],
      ["order_fulfillment_playbook.docx", "docx", 41, 5],
      ["billing_dispute_policy.txt", "txt", 28, 8],
    ];
    for (const [filename, fileType, totalChunks, daysAgo] of docs) {
      await ctx.db.insert("documents", {
        filename,
        fileType,
        totalChunks,
        status: "indexed",
        uploadedAt: now - daysAgo * DAY,
        uploadedBy: "Dana Whitfield",
      });
    }

    return { seeded: true };
  },
});

/* ------------------------------------------------------------------ */
/* RBAC mutations                                                      */
/* ------------------------------------------------------------------ */

export const ensureUserRole = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);
    const role = user.role;
    if (role !== ROLES.ADMIN && role !== ROLES.MANAGER && role !== ROLES.OPERATOR) {
      await ctx.db.patch(userId, { role: ROLES.MANAGER });
      return { role: ROLES.MANAGER };
    }
    return { role };
  },
});

export const setRole = mutation({
  args: { role: v.union(v.literal("admin"), v.literal("manager"), v.literal("operator")) },
  handler: async (ctx, { role }) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, { role });
    return { role };
  },
});

/** Admin area — list every account in the workspace (admin only). */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const { role } = await requireActor(ctx);
    if (role !== "admin") {
      throw new Error("You don't have permission to perform this action.");
    }
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        role: u.role ?? null,
        isAnonymous: u.isAnonymous ?? false,
        joinedAt: u._creationTime,
      }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
  },
});

/** Admin area — change another user's role (admin only, not yourself). */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("operator")),
  },
  handler: async (ctx, { userId, role }) => {
    const { userId: myId, role: myRole } = await requireActor(ctx);
    if (myRole !== "admin") {
      throw new Error("You don't have permission to perform this action.");
    }
    if (userId === myId) {
      throw new Error("You can't change your own role.");
    }
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("Resource not found.");
    await ctx.db.patch(userId, { role });
    return { ok: true };
  },
});

/* ------------------------------------------------------------------ */
/* Dashboard (Module A — Operations Command Center)                    */
/* ------------------------------------------------------------------ */

export const metrics = query({
  args: {},
  handler: async (ctx) => {
    await requireActor(ctx);
    const exceptions = await ctx.db.query("exceptions").collect();
    const documents = await ctx.db.query("documents").collect();
    const actions = await ctx.db.query("exceptionActions").collect();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayStart = startOfDay.getTime();

    const openStatuses = new Set(["detected", "investigating", "recommendation_ready", "approved"]);
    const open = exceptions.filter((e) => openStatuses.has(e.status));

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const e of open) bySeverity[e.severity] += 1;

    const resolved = exceptions.filter((e) => e.status === "resolved" && e.resolutionMinutes);
    const avgResolutionMinutes = resolved.length
      ? Math.round(
          resolved.reduce((sum, e) => sum + (e.resolutionMinutes ?? 0), 0) / resolved.length,
        )
      : 0;

    const decided = actions.filter((a) => a.status === "approved" || a.status === "rejected");
    const approved = decided.filter((a) => a.status === "approved");

    const indexedDocs = documents.filter((d) => d.status === "indexed");

    return {
      exceptions_detected_today: exceptions.filter((e) => e.detectedAt >= dayStart).length,
      exceptions_open: open.length,
      exceptions_resolved_today: exceptions.filter(
        (e) => e.status === "resolved" && (e.resolvedAt ?? 0) >= dayStart,
      ).length,
      exceptions_by_severity: bySeverity,
      documents_indexed: indexedDocs.length,
      total_chunks: indexedDocs.reduce((sum, d) => sum + d.totalChunks, 0),
      avg_resolution_minutes: avgResolutionMinutes,
      approval_rate: decided.length ? approved.length / decided.length : 0,
      pending_approvals: actions.filter((a) => a.status === "pending").length,
    };
  },
});

/* ------------------------------------------------------------------ */
/* Exceptions (Module B)                                               */
/* ------------------------------------------------------------------ */

export const listExceptions = query({
  args: {
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { status, severity, search, limit = 20, offset = 0 }) => {
    await requireActor(ctx);
    let items = await ctx.db
      .query("exceptions")
      .withIndex("by_detectedAt")
      .order("desc")
      .collect();

    if (status && status !== "all") items = items.filter((e) => e.status === status);
    if (severity && severity !== "all") items = items.filter((e) => e.severity === severity);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (e) =>
          e.caseNumber.toLowerCase().includes(q) ||
          e.customer.toLowerCase().includes(q) ||
          (e.orderId ?? "").toLowerCase().includes(q),
      );
    }

    const total = items.length;
    const page = items.slice(offset, offset + limit);
    return {
      total,
      items: page.map((e) => ({
        id: e._id,
        caseNumber: e.caseNumber,
        exceptionType: e.exceptionType,
        severity: e.severity,
        status: e.status,
        customer: e.customer,
        customerTier: e.customerTier,
        orderId: e.orderId,
        detectedAt: e.detectedAt,
      })),
    };
  },
});

export const getException = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireActor(ctx);
    const exceptionId = ctx.db.normalizeId("exceptions", id);
    if (!exceptionId) return null;
    const exception = await ctx.db.get(exceptionId);
    if (!exception) return null;

    const actions = await ctx.db
      .query("exceptionActions")
      .withIndex("by_exception", (q) => q.eq("exceptionId", exceptionId))
      .collect();

    const audit = await ctx.db
      .query("auditEvents")
      .withIndex("by_exception", (q) => q.eq("exceptionId", exceptionId))
      .collect();
    audit.sort((a, b) => a.at - b.at);

    return {
      ...exception,
      actions: actions.sort((a, b) => Number(b.autoExecute) - Number(a.autoExecute)),
      audit: audit.map(({ event, actor, at, kind }) => ({ event, actor, at, kind })),
    };
  },
});

export const recentExceptions = query({
  args: {},
  handler: async (ctx) => {
    await requireActor(ctx);
    const items = await ctx.db
      .query("exceptions")
      .withIndex("by_detectedAt")
      .order("desc")
      .take(5);
    return items.map((e) => ({
      id: e._id,
      caseNumber: e.caseNumber,
      exceptionType: e.exceptionType,
      severity: e.severity,
      status: e.status,
      customer: e.customer,
      detectedAt: e.detectedAt,
    }));
  },
});

export const investigate = mutation({
  args: { id: v.id("exceptions") },
  handler: async (ctx, { id }) => {
    const { actor } = await requireOpsAccess(ctx);
    const exception = await ctx.db.get(id);
    if (!exception) throw new Error("Resource not found.");
    if (exception.status !== "detected") {
      throw new Error("This exception has already been investigated.");
    }

    await ctx.db.patch(id, { status: "investigating", assignedTo: actor });
    await ctx.db.insert("auditEvents", {
      exceptionId: id,
      event: "Investigation started — gathering ERP, CRM and policy context",
      actor,
      at: Date.now(),
      kind: "investigate",
    });

    // Simulated multi-system investigation, then stage approved actions.
    await ctx.scheduler.runAfter(3200, internal.opspilot.finalizeInvestigation, {
      id,
    });
    return { ok: true };
  },
});

export const finalizeInvestigation = internalMutation({
  args: { id: v.id("exceptions") },
  handler: async (ctx, { id }) => {
    const exception = await ctx.db.get(id);
    if (!exception || exception.status !== "investigating") return;

    const now = Date.now();
    const i = Math.abs(
      parseInt(exception.caseNumber.replace(/\D/g, ""), 10) % (TYPES.length * 42),
    );
    const type = TYPES.find((t) => t.key === exception.exceptionType) ?? TYPES[0];
    const c: Ctx = {
      caseNumber: exception.caseNumber,
      customer: exception.customer,
      tier: exception.customerTier,
      orderId: exception.orderId ?? "ORD-00000",
      i,
    };

    const hasInvestigation = Boolean(exception.rootCause);
    await ctx.db.patch(id, {
      status: "recommendation_ready",
      investigationSummary: hasInvestigation ? exception.investigationSummary : type.summary(c),
      rootCause: hasInvestigation ? exception.rootCause : type.rootCause(c),
      businessImpact: hasInvestigation ? exception.businessImpact : type.impact(c),
      recommendedAction: hasInvestigation ? exception.recommendedAction : type.recommendation(c),
      confidenceScore: exception.confidenceScore ?? 0.86,
      sourcesUsed: exception.sourcesUsed ?? type.sources(c),
    });

    const existing = await ctx.db
      .query("exceptionActions")
      .withIndex("by_exception", (q) => q.eq("exceptionId", id))
      .collect();

    let pending = 0;
    if (existing.length === 0) {
      for (const action of type.actions) {
        await ctx.db.insert("exceptionActions", {
          exceptionId: id,
          description: action.description(c),
          riskTier: action.risk,
          autoExecute: action.auto,
          status: action.auto ? "executed" : "pending",
          decidedBy: action.auto ? "OpsPilot AI" : undefined,
          decidedAt: action.auto ? now : undefined,
        });
        if (!action.auto) pending += 1;
      }
    } else {
      pending = existing.filter((a) => a.status === "pending").length;
    }

    await ctx.db.insert("auditEvents", {
      exceptionId: id,
      event: "AI investigation completed — root cause and business impact identified",
      actor: "OpsPilot AI",
      at: now,
      kind: "investigate",
    });
    await ctx.db.insert("auditEvents", {
      exceptionId: id,
      event:
        pending > 0
          ? `Recommendation generated — ${pending} action${pending > 1 ? "s" : ""} staged for approval`
          : "Recommendation generated — low-risk actions auto-executed",
      actor: "OpsPilot AI",
      at: now + 1,
      kind: "recommend",
    });
  },
});

export const approveAction = mutation({
  args: { exceptionId: v.id("exceptions"), actionId: v.id("exceptionActions") },
  handler: async (ctx, { exceptionId, actionId }) => {
    const { role, actor } = await requireOpsAccess(ctx);
    const action = await ctx.db.get(actionId);
    if (!action || action.exceptionId !== exceptionId) throw new Error("Resource not found.");
    if (action.status !== "pending") throw new Error("Action has already been decided.");

    const roleMap: Record<string, string> = {
      admin: "System Administrator",
      manager: "Operations Manager",
      operator: "Operations Operator",
    };
    const desig = roleMap[role] || "Operations Manager";
    const cleanActor = actor.replace(/\s*\((?:Manager|Admin|Operator)\)$/i, "").trim();
    const actorDisplay = `${cleanActor} (${desig})`;

    const now = Date.now();
    await ctx.db.patch(actionId, { status: "approved", decidedBy: actorDisplay, decidedAt: now });
    await ctx.db.insert("auditEvents", {
      exceptionId,
      event: `Action approved by ${cleanActor}`,
      actor: actorDisplay,
      at: now,
      kind: "approve",
    });

    await syncExceptionStatus(ctx, exceptionId);
    return { ok: true };
  },
});

export const rejectAction = mutation({
  args: {
    exceptionId: v.id("exceptions"),
    actionId: v.id("exceptionActions"),
    reason: v.string(),
  },
  handler: async (ctx, { exceptionId, actionId, reason }) => {
    const { role, actor } = await requireOpsAccess(ctx);
    const action = await ctx.db.get(actionId);
    if (!action || action.exceptionId !== exceptionId) throw new Error("Resource not found.");
    if (action.status !== "pending") throw new Error("Action has already been decided.");

    const roleMap: Record<string, string> = {
      admin: "System Administrator",
      manager: "Operations Manager",
      operator: "Operations Operator",
    };
    const desig = roleMap[role] || "Operations Manager";
    const cleanActor = actor.replace(/\s*\((?:Manager|Admin|Operator)\)$/i, "").trim();
    const actorDisplay = `${cleanActor} (${desig})`;

    const now = Date.now();
    await ctx.db.patch(actionId, {
      status: "rejected",
      decidedBy: actorDisplay,
      decidedAt: now,
      rejectReason: reason,
    });
    await ctx.db.insert("auditEvents", {
      exceptionId,
      event: `Action rejected by ${cleanActor} — reason recorded`,
      actor: actorDisplay,
      at: now,
      kind: "reject",
    });

    await syncExceptionStatus(ctx, exceptionId);
    return { ok: true };
  },
});

async function syncExceptionStatus(
  ctx: MutationCtx,
  exceptionId: Id<"exceptions">,
) {
  const exception = await ctx.db.get(exceptionId);
  if (!exception || exception.status === "resolved") return;

  const actions = await ctx.db
    .query("exceptionActions")
    .withIndex("by_exception", (q) => q.eq("exceptionId", exceptionId))
    .collect();

  const pending = actions.filter((a) => a.status === "pending");
  if (pending.length > 0) return;

  const anyApproved = actions.some((a) => a.status === "approved");
  await ctx.db.patch(exceptionId, {
    status: anyApproved ? "approved" : "rejected",
  });
}

export const resolveException = mutation({
  args: { id: v.id("exceptions") },
  handler: async (ctx, { id }) => {
    const { actor } = await requireOpsAccess(ctx);
    const exception = await ctx.db.get(id);
    if (!exception) throw new Error("Resource not found.");
    if (exception.status !== "approved") {
      throw new Error("Only approved exceptions can be marked resolved.");
    }

    const now = Date.now();
    const resolutionMinutes = Math.max(1, Math.round((now - exception.detectedAt) / 60_000));
    await ctx.db.patch(id, {
      status: "resolved",
      resolvedAt: now,
      resolutionMinutes,
    });
    await ctx.db.insert("auditEvents", {
      exceptionId: id,
      event: `Exception resolved and verified in source systems (${resolutionMinutes} min)`,
      actor,
      at: now,
      kind: "resolve",
    });
    return { ok: true };
  },
});

/* ------------------------------------------------------------------ */
/* Knowledge Base (Module C)                                           */
/* ------------------------------------------------------------------ */

export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    await requireActor(ctx);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_uploadedAt")
      .order("desc")
      .collect();
    return docs.map((d) => ({
      id: d._id,
      filename: d.filename,
      fileType: d.fileType,
      totalChunks: d.totalChunks,
      status: d.status,
      uploadedAt: d.uploadedAt,
      uploadedBy: d.uploadedBy,
    }));
  },
});

export const uploadDocument = mutation({
  args: {
    filename: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("txt"), v.literal("docx")),
    totalChunks: v.number(),
  },
  handler: async (ctx, { filename, fileType, totalChunks }) => {
    const { actor } = await requireOpsAccess(ctx);
    const id = await ctx.db.insert("documents", {
      filename,
      fileType,
      totalChunks: Math.max(1, totalChunks),
      status: "processing",
      uploadedAt: Date.now(),
      uploadedBy: actor,
    });
    await ctx.scheduler.runAfter(1700, internal.opspilot.finishIndexing, { id });
    return { id };
  },
});

export const finishIndexing = internalMutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.status !== "processing") return;
    await ctx.db.patch(id, { status: "indexed" });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    await requireOpsAccess(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Resource not found.");
    await ctx.db.delete(id);
    return { ok: true };
  },
});
