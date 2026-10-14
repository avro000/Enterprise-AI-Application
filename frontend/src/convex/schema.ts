import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
  // OpsPilot RBAC roles (FRONTEND_SPEC §4): manager can investigate/approve,
  // operator is read-only on exceptions + knowledge base writes.
  MANAGER: "manager",
  OPERATOR: "operator",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.OPERATOR),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ---- OpsPilot AI (FRONTEND_SPEC §6–§7) --------------------------------

    // Operational exceptions (Module B — AI Exception Manager)
    exceptions: defineTable({
      caseNumber: v.string(), // "EX-20381"
      exceptionType: v.string(), // "delayed_order" (snake_case key)
      severity: v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
      ),
      status: v.union(
        v.literal("detected"),
        v.literal("investigating"),
        v.literal("recommendation_ready"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("resolved"),
      ),
      customer: v.string(),
      customerTier: v.union(
        v.literal("standard"),
        v.literal("premium"),
        v.literal("enterprise"),
      ),
      orderId: v.optional(v.string()),
      detectedAt: v.number(),
      investigationSummary: v.optional(v.string()),
      rootCause: v.optional(v.string()),
      businessImpact: v.optional(v.string()),
      recommendedAction: v.optional(v.string()),
      confidenceScore: v.optional(v.number()), // 0..1
      sourcesUsed: v.optional(
        v.array(
          v.object({
            type: v.union(v.literal("document"), v.literal("database")),
            name: v.optional(v.string()), // filename for documents
            page: v.optional(v.number()),
            relevance: v.optional(v.number()),
            table: v.optional(v.string()), // table for database sources
            detail: v.optional(v.string()),
          }),
        ),
      ),
      assignedTo: v.optional(v.string()),
      resolvedAt: v.optional(v.number()),
      resolutionMinutes: v.optional(v.number()),
    })
      .index("by_status", ["status"])
      .index("by_detectedAt", ["detectedAt"]),

    // Staged AI actions awaiting human approval (Module E — Action Center)
    exceptionActions: defineTable({
      exceptionId: v.id("exceptions"),
      description: v.string(),
      riskTier: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
      autoExecute: v.boolean(), // low-risk tasks run without approval
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("executed"),
      ),
      decidedBy: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
      rejectReason: v.optional(v.string()),
    }).index("by_exception", ["exceptionId"]),

    // Immutable audit trail (FRONTEND_SPEC §12 — full traceability)
    auditEvents: defineTable({
      exceptionId: v.id("exceptions"),
      event: v.string(),
      actor: v.string(),
      at: v.number(),
      kind: v.union(
        v.literal("detect"),
        v.literal("investigate"),
        v.literal("recommend"),
        v.literal("approve"),
        v.literal("reject"),
        v.literal("resolve"),
      ),
    }).index("by_exception", ["exceptionId"]),

    // Enterprise Knowledge Copilot corpus (Module C)
    documents: defineTable({
      filename: v.string(),
      fileType: v.union(
        v.literal("pdf"),
        v.literal("txt"),
        v.literal("docx"),
      ),
      totalChunks: v.number(),
      status: v.union(
        v.literal("processing"),
        v.literal("indexed"),
        v.literal("error"),
      ),
      uploadedAt: v.number(),
      uploadedBy: v.optional(v.string()),
    }).index("by_uploadedAt", ["uploadedAt"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
