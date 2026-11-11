export const api = {
  opspilot: {
    metrics: "opspilot:metrics",
    recentExceptions: "opspilot:recentExceptions",
    listExceptions: "opspilot:listExceptions",
    getException: "opspilot:getException",
    investigate: "opspilot:investigate",
    approveAction: "opspilot:approveAction",
    rejectAction: "opspilot:rejectAction",
    resolveException: "opspilot:resolveException",
    listDocuments: "opspilot:listDocuments",
    uploadDocument: "opspilot:uploadDocument",
    deleteDocument: "opspilot:deleteDocument",
    setRole: "opspilot:setRole",
    listUsers: "opspilot:listUsers",
    setUserRole: "opspilot:setUserRole",
  },
  users: {
    currentUser: "users:currentUser",
  },
} as const;

export type ApiType = typeof api;
