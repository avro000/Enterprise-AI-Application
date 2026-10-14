import axios, { AxiosInstance } from "axios";

// Determine base API endpoint
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl}/api`;
  }
  return "/api";
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

// Request interceptor: Attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("opspilot_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 & permissions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if checking auth or on login page
      const isAuthCheck = error.config?.url?.includes("/auth/me") || error.config?.url?.includes("/auth/login");
      if (!isAuthCheck) {
        localStorage.removeItem("opspilot_token");
        localStorage.removeItem("opspilot_user");
        if (window.location.pathname !== "/auth" && window.location.pathname !== "/") {
          window.location.href = `/auth?returnTo=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

/* ------------------------------------------------------------------ */
/* Auth API                                                           */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "operator";
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    return res.data;
  },

  register: async (
    email: string,
    name: string,
    password: string,
    role: "admin" | "manager" | "operator" = "operator"
  ): Promise<UserProfile> => {
    const res = await apiClient.post<UserProfile>("/auth/register", {
      email,
      name,
      password,
      role,
    });
    return res.data;
  },

  verifyRegistrationOtp: async (email: string, otp: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/verify-registration-otp", {
      email,
      otp,
    });
    return res.data;
  },

  resendRegistrationOtp: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/resend-registration-otp", {
      email,
    });
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/forgot-password", { email });
    return res.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<{ reset_token: string; message: string }> => {
    const res = await apiClient.post<{ reset_token: string; message: string }>("/auth/verify-otp", {
      email,
      otp,
    });
    return res.data;
  },

  resetPassword: async (
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/auth/reset-password", {
      email,
      reset_token: resetToken,
      new_password: newPassword,
    });
    return res.data;
  },

  me: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>("/auth/me");
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* Users & Roles API                                                  */
/* ------------------------------------------------------------------ */

export const usersApi = {
  list: async (): Promise<UserProfile[]> => {
    const res = await apiClient.get<UserProfile[]>("/users");
    return res.data;
  },

  updateRole: async (userId: string, role: string): Promise<UserProfile> => {
    const res = await apiClient.patch<UserProfile>(`/users/${userId}/role`, { role });
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* Dashboard API                                                      */
/* ------------------------------------------------------------------ */

export interface DashboardMetrics {
  exceptions_detected_today: number;
  exceptions_open: number;
  exceptions_resolved_today: number;
  exceptions_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  documents_indexed: number;
  total_chunks: number;
  avg_resolution_minutes: number;
  approval_rate: number;
  pending_approvals?: number;
}

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const res = await apiClient.get<DashboardMetrics>("/dashboard/metrics");
    return res.data;
  },

  getCommandCenter: async (): Promise<any> => {
    const res = await apiClient.get<any>("/dashboard/command-center");
    return res.data;
  },

  getBusinessValue: async (): Promise<any> => {
    const res = await apiClient.get<any>("/dashboard/business-value");
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* Exceptions API                                                     */
/* ------------------------------------------------------------------ */

export interface ExceptionActionItem {
  id: string;
  exception_id: string;
  action_type: string;
  description: string;
  requires_approval: boolean;
  status: "pending" | "approved" | "rejected" | "executed";
  approved_by?: string;
  approved_by_name?: string;
  approved_by_role?: string;
  approver_name?: string;
  approver_role?: string;
  approver_designation?: string;
  approver_display?: string;
  approved_at?: string;
  executed_at?: string;
  result?: string;
  created_at: string;
}

export interface ExceptionDetail {
  id: string;
  _id?: string;
  case_number: string;
  caseNumber?: string;
  exception_type: string;
  exceptionType?: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "detected" | "investigating" | "recommendation_ready" | "approved" | "rejected" | "resolved" | "escalated";
  related_order_id?: string;
  related_customer_id?: string;
  customer?: string;
  customer_name?: string;
  customerTier?: "standard" | "premium" | "enterprise";
  customer_tier?: string;
  orderId?: string;
  order_number?: string;
  assigned_to?: string;
  assignedTo?: string;
  assignee_name?: string;
  assignee_designation?: string;
  assignee_display?: string;
  investigation_summary?: string;
  root_cause?: string;
  rootCause?: string;
  business_impact?: string;
  businessImpact?: string;
  recommended_action?: string;
  recommendedAction?: string;
  confidence_score?: number;
  confidenceScore?: number;
  sources_used?: Array<{
    type: "document" | "database";
    name?: string;
    page?: number;
    relevance?: number;
    table?: string;
    detail?: string;
  }>;
  sourcesUsed?: any[];
  investigation_steps?: Array<{
    step: string;
    detail?: string;
    status: string;
  }>;
  detected_at: string;
  detectedAt?: string;
  resolved_at?: string;
  resolvedAt?: string;
  resolved_by?: string;
  resolver_name?: string;
  resolver_designation?: string;
  resolver_display?: string;
  actions: ExceptionActionItem[];
}

export interface ListExceptionsResponse {
  items: ExceptionDetail[];
  total: number;
  limit: number;
  offset: number;
}

export const exceptionsApi = {
  list: async (params?: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<ListExceptionsResponse> => {
    const queryParams: Record<string, any> = {};
    if (params?.status && params.status !== "all") queryParams.status = params.status;
    if (params?.severity && params.severity !== "all") queryParams.severity = params.severity;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    const res = await apiClient.get<ListExceptionsResponse>("/exceptions", {
      params: queryParams,
    });
    return res.data;
  },

  get: async (id: string): Promise<ExceptionDetail> => {
    const res = await apiClient.get<ExceptionDetail>(`/exceptions/${id}`);
    return res.data;
  },

  investigate: async (id: string): Promise<any> => {
    const res = await apiClient.post<any>(`/exceptions/${id}/investigate`);
    return res.data;
  },

  approveAction: async (
    exceptionId: string,
    actionId: string,
    comment?: string
  ): Promise<ExceptionActionItem> => {
    const res = await apiClient.post<ExceptionActionItem>(
      `/exceptions/${exceptionId}/actions/${actionId}/approve`,
      { comment }
    );
    return res.data;
  },

  rejectAction: async (
    exceptionId: string,
    actionId: string,
    reason: string
  ): Promise<ExceptionActionItem> => {
    const res = await apiClient.post<ExceptionActionItem>(
      `/exceptions/${exceptionId}/actions/${actionId}/reject`,
      { reason }
    );
    return res.data;
  },

  resolve: async (id: string): Promise<ExceptionDetail> => {
    const res = await apiClient.post<ExceptionDetail>(`/exceptions/${id}/resolve`);
    return res.data;
  },

  triggerDetect: async (): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>("/exceptions/detect");
    return res.data;
  },

  getPendingActions: async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>("/exceptions/actions/pending");
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* Documents API                                                      */
/* ------------------------------------------------------------------ */

export interface KnowledgeDocumentItem {
  id: string;
  filename: string;
  file_type: "pdf" | "txt" | "docx";
  total_chunks: number;
  status: "processing" | "indexed" | "error";
  uploaded_at: string;
}

export interface DocumentChunkItem {
  id: string;
  chunk_index: number;
  page_number?: number;
  token_count?: number;
  content: string;
}

export interface DocumentViewResponse {
  id: string;
  filename: string;
  file_type: "pdf" | "txt" | "docx";
  file_size_bytes?: number;
  total_chunks: number;
  status: "processing" | "indexed" | "error";
  uploaded_at: string;
  full_text: string;
  chunks: DocumentChunkItem[];
}

export const documentsApi = {
  list: async (): Promise<KnowledgeDocumentItem[]> => {
    const res = await apiClient.get<KnowledgeDocumentItem[]>("/documents");
    return res.data;
  },

  view: async (id: string): Promise<DocumentViewResponse> => {
    const res = await apiClient.get<DocumentViewResponse>(`/documents/${id}/view`);
    return res.data;
  },

  download: async (id: string, filename: string): Promise<void> => {
    const res = await apiClient.get(`/documents/${id}/download`, {
      responseType: "blob",
    });
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  upload: async (file: File): Promise<KnowledgeDocumentItem> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<KnowledgeDocumentItem>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/documents/${id}`);
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* Chat API                                                           */
/* ------------------------------------------------------------------ */

export interface ChatResponse {
  answer: string;
  intent: "knowledge_only" | "data_only" | "hybrid" | "exception_investigation";
  sources: Array<{
    type: "document" | "database";
    name?: string;
    page?: number;
    relevance?: number;
    table?: string;
    detail?: string;
  }>;
  confidence: "high" | "medium" | "low";
}

export const chatApi = {
  send: async (question: string): Promise<ChatResponse> => {
    const res = await apiClient.post<ChatResponse>("/chat", { question });
    return res.data;
  },
};

/* ------------------------------------------------------------------ */
/* System Health                                                      */
/* ------------------------------------------------------------------ */

export const healthApi = {
  check: async (): Promise<any> => {
    const res = await apiClient.get("/health");
    return res.data;
  },
};

export default apiClient;
