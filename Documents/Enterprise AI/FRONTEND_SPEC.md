# OpsPilot AI — Frontend Specification & Design Guide

> **For:** Frontend Developer (using Freebuff.com for design + code generation)
> **Backend API Base URL:** `http://localhost:8000` (development)
> **Tech Stack:** React 18.3+ · Vite 5.4+ · Tailwind CSS 3.4+ · React Router 6.26+ · Axios 1.7+ · Lucide React (icons) · React Hot Toast (notifications)

---

## Table of Contents

1. [How to Use This Document with Freebuff](#1-how-to-use-this-document-with-freebuff)
2. [Product Context](#2-product-context)
3. [Design System & Visual Identity](#3-design-system--visual-identity)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Application Layout & Navigation](#5-application-layout--navigation)
6. [Routes & Pages](#6-routes--pages)
7. [Page-by-Page Specification](#7-page-by-page-specification)
8. [Reusable Components](#8-reusable-components)
9. [API Integration Guide](#9-api-integration-guide)
10. [State Management](#10-state-management)
11. [Error Handling & Loading States](#11-error-handling--loading-states)
12. [Responsive Design Requirements](#12-responsive-design-requirements)
13. [File Structure](#13-file-structure)
14. [Freebuff Prompt Templates](#14-freebuff-prompt-templates)
15. [Integration Workflow with Backend](#15-integration-workflow-with-backend)

---

## 1. How to Use This Document with Freebuff

Freebuff.com is an AI-powered prompt-to-app builder. Your workflow should be:

### Recommended Build Order (One Prompt Per Step)
1. **Step 1:** Generate the app shell (layout, sidebar, routing, auth context)
2. **Step 2:** Build the Login page + authentication flow
3. **Step 3:** Build the Dashboard page with metric cards
4. **Step 4:** Build the Chat page (the RAG chatbot interface)
5. **Step 5:** Build the Knowledge Base page (file upload + document list)
6. **Step 6:** Build the Exceptions page (table + detail view + approval controls)
7. **Step 7:** Polish — responsive design, loading states, error handling, animations

### Freebuff Input Tips
- Copy the relevant **Page Specification** section from this doc and paste it as your Freebuff prompt
- Use the **Freebuff Prompt Templates** (Section 14) — they're pre-written for you
- Reference the **API contracts** in each page spec so Freebuff generates the correct data shapes
- When iterating, give specific feedback: "Move the sidebar to the left" not "make it better"
- Use Freebuff's `/plan` command first to see a blueprint before generating code

### Design Approach
- Start with Freebuff Web for rapid visual prototyping
- Once satisfied with the design, connect the GitHub repo (`avro000/Enterprise-AI-Application`) to Freebuff Cloud
- Push all code to the `frontend` branch on GitHub
- The backend developer will handle API integration and testing

---

## 2. Product Context

**What is OpsPilot AI?**
An AI-powered operations dashboard that helps mid-market B2B companies detect, investigate, and resolve operational exceptions (delayed orders, SLA breaches, etc.) using AI that combines live business data with company policy documents.

**Who uses it?**
- **Operations Manager** — Sees the dashboard, reviews AI recommendations, approves/rejects actions
- **Operator/Employee** — Uses the chat to ask questions, views exceptions (read-only)
- **Admin** — Full access including document upload and user management

**Core User Story:**
1. Manager opens Dashboard → sees 3 critical exceptions detected today
2. Clicks on an exception → sees AI investigation: root cause, business impact, recommended action
3. Clicks "Approve" → action is logged with full audit trail
4. Alternatively, opens Chat → asks "Is order ORD-48321 at risk?" → gets AI response citing both live data and company SLA policy

---

## 3. Design System & Visual Identity

### Color Palette
| Token | Purpose | Value |
|---|---|---|
| `primary` | Buttons, active states, links | `#2563EB` (Blue 600) |
| `primary-hover` | Button hover | `#1D4ED8` (Blue 700) |
| `success` | Resolved status, positive metrics | `#16A34A` (Green 600) |
| `warning` | Medium severity, pending states | `#F59E0B` (Amber 500) |
| `danger` | Critical severity, errors, reject | `#DC2626` (Red 600) |
| `info` | Low severity, informational badges | `#0EA5E9` (Sky 500) |
| `bg-primary` | Main content background | `#F9FAFB` (Gray 50) |
| `bg-sidebar` | Sidebar background | `#111827` (Gray 900) |
| `bg-card` | Card/panel background | `#FFFFFF` |
| `text-primary` | Main text | `#111827` (Gray 900) |
| `text-secondary` | Secondary/muted text | `#6B7280` (Gray 500) |
| `border` | Card borders, dividers | `#E5E7EB` (Gray 200) |

### Typography
- Font family: `Inter` (via Google Fonts) — fallback: `system-ui, sans-serif`
- Headings: `font-bold`
- Page title: `text-2xl` (24px)
- Section title: `text-lg` (18px)
- Body text: `text-sm` (14px)
- Small/meta: `text-xs` (12px)

### Spacing & Layout
- Page padding: `p-6` (24px)
- Card padding: `p-4` to `p-6`
- Card border radius: `rounded-lg` (8px)
- Card shadow: `shadow-sm`
- Grid gaps: `gap-4` to `gap-6`
- Sidebar width: `w-64` (256px)

### Component Style Guidelines
- **Buttons:** Rounded (`rounded-md`), padding `px-4 py-2`, transition on hover
  - Primary: `bg-primary text-white hover:bg-primary-hover`
  - Success (Approve): `bg-success text-white`
  - Danger (Reject): `bg-danger text-white`
  - Ghost: `bg-transparent text-gray-600 hover:bg-gray-100`
- **Badges/Pills:** `rounded-full px-2.5 py-0.5 text-xs font-medium`
  - Severity: Critical=red, High=orange, Medium=amber, Low=sky
  - Status: Detected=yellow, Investigating=blue, Recommendation Ready=purple, Approved=green, Rejected=red, Resolved=gray
- **Cards:** `bg-white rounded-lg shadow-sm border border-gray-200 p-4`
- **Tables:** Striped rows (`even:bg-gray-50`), `text-sm`, sticky header
- **Inputs:** `border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary`

---

## 4. Authentication & Authorization

### JWT Token Flow
1. User submits email + password on Login page
2. Backend returns: `{ access_token, token_type: "bearer", user: { id, name, role } }`
3. Store `access_token` in `localStorage` as `opspilot_token`
4. Store `user` object in `localStorage` as `opspilot_user`
5. Axios interceptor attaches `Authorization: Bearer <token>` to ALL API requests
6. On 401 response → clear storage → redirect to `/login`
7. On app load → check localStorage for existing token → validate via `GET /api/auth/me`

### Role-Based Access
| Feature | Admin | Manager | Operator |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Knowledge Base (view) | ✅ | ✅ | ✅ |
| Knowledge Base (upload/delete) | ✅ | ✅ | ❌ |
| Exceptions (view) | ✅ | ✅ | ✅ |
| Exceptions (investigate/approve/reject) | ✅ | ✅ | ❌ |

### AuthContext Provider
```
AuthContext provides:
  - user: { id, name, email, role } | null
  - token: string | null
  - login(email, password): Promise<void>
  - logout(): void
  - isAuthenticated: boolean
  - isLoading: boolean (for initial auth check)
```

---

## 5. Application Layout & Navigation

### Layout Structure
```
┌────────────────────────────────────────────────────┐
│  Sidebar (fixed, dark)  │   Top Bar (sticky)       │
│                         │   [Role Badge] [User] [⚙]│
│  [Logo/Name]            ├──────────────────────────│
│                         │                          │
│  📊 Dashboard           │   Main Content Area      │
│  💬 Chat                │   (scrollable)           │
│  📚 Knowledge Base      │                          │
│  ⚠️  Exceptions         │                          │
│                         │                          │
│                         │                          │
│  ─────────────          │                          │
│  [User Name]            │                          │
│  [Logout]               │                          │
└────────────────────────────────────────────────────┘
```

### Sidebar Specs
- Fixed left sidebar, `w-64`, `bg-gray-900`, `text-white`
- Logo/app name at top: "OpsPilot AI" with a small icon
- Navigation items: icon + label, `py-2.5 px-4 rounded-md`
- Active item: `bg-gray-700` or `bg-primary/20` with left border accent
- Hover: `bg-gray-800`
- Bottom section: User name, role badge, logout button
- Collapsible on mobile (hamburger menu)

### Top Bar Specs
- Sticky top, `h-16`, `bg-white border-b border-gray-200`
- Left: Current page title (breadcrumb optional)
- Right: User name, role badge (`rounded-full` pill), notification bell (future), logout icon button

---

## 6. Routes & Pages

| Route | Page Component | Auth Required | Roles |
|---|---|---|---|
| `/login` | LoginPage | ❌ | — |
| `/` | DashboardPage | ✅ | all |
| `/dashboard` | DashboardPage | ✅ | all |
| `/chat` | ChatPage | ✅ | all |
| `/knowledge-base` | KnowledgeBasePage | ✅ | all |
| `/exceptions` | ExceptionsPage | ✅ | all |
| `/exceptions/:id` | ExceptionDetailPage | ✅ | all |
| `*` | NotFoundPage | ❌ | — |

### Route Protection
- `ProtectedRoute` component wraps all authenticated routes
- Checks `isAuthenticated` from AuthContext
- If not authenticated → redirect to `/login`
- If loading (checking token) → show full-page spinner

---

## 7. Page-by-Page Specification

### 7.1 Login Page (`/login`)

**Purpose:** Authenticate the user.

**Layout:**
- Centered card on a subtle gradient background (`bg-gradient-to-br from-blue-50 to-indigo-100`)
- Card width: `max-w-md`
- App logo + "OpsPilot AI" title at top
- Subtitle: "Enterprise Operations Intelligence"

**Form Fields:**
- Email input (`type="email"`, required, placeholder: "you@company.com")
- Password input (`type="password"`, required, placeholder: "••••••••")
- "Sign In" button (full width, primary style)

**Behavior:**
- On submit → `POST /api/auth/login` with `{ email, password }`
- On success → store token + user → redirect to `/dashboard`
- On error → show toast notification with error message
- While loading → button shows spinner + "Signing in..."

**Demo Credentials (show as hint below form):**
```
Admin:    admin@opspilot.com / admin123
Manager:  manager@opspilot.com / manager123
Operator: operator@opspilot.com / operator123
```

---

### 7.2 Dashboard Page (`/dashboard`)

**Purpose:** At-a-glance operational overview with live exception metrics.

**API:** `GET /api/dashboard/metrics`

**Response Shape:**
```json
{
  "exceptions_detected_today": 5,
  "exceptions_open": 12,
  "exceptions_resolved_today": 3,
  "exceptions_by_severity": {"critical": 2, "high": 4, "medium": 3, "low": 3},
  "documents_indexed": 5,
  "total_chunks": 142,
  "avg_resolution_minutes": 45,
  "approval_rate": 0.85
}
```

**Layout — 3 Sections:**

**Section 1: Metric Cards (top row, 4 columns)**
| Card | Value | Icon | Color Accent |
|---|---|---|---|
| Exceptions Today | `exceptions_detected_today` | `AlertTriangle` | Warning |
| Open Exceptions | `exceptions_open` | `AlertCircle` | Danger |
| Resolved Today | `exceptions_resolved_today` | `CheckCircle` | Success |
| Avg Resolution Time | `avg_resolution_minutes` + "min" | `Clock` | Info |

Each card: white background, left color border (`border-l-4`), icon top-right, value in `text-3xl font-bold`, label in `text-sm text-gray-500`

**Section 2: Severity Breakdown (left half)**
- Horizontal bar chart or segmented bar showing exceptions by severity
- Each bar: Critical (red), High (orange), Medium (amber), Low (blue)
- Include count labels

**Section 3: Quick Stats (right half)**
- Documents indexed: `documents_indexed` with `FileText` icon
- Knowledge chunks: `total_chunks`
- Approval rate: `approval_rate` as percentage with a small progress ring or bar
- These can be smaller cards or a list

**Section 4: Recent Exceptions (bottom, full width)**
- Table showing the 5 most recent exceptions
- Columns: Case #, Type, Severity (badge), Status (badge), Customer, Detected At
- Each row is clickable → navigates to `/exceptions/:id`
- "View All" link → navigates to `/exceptions`

---

### 7.3 Chat Page (`/chat`)

**Purpose:** The RAG-powered AI chatbot interface. Users ask questions and get AI-generated answers grounded in company documents and live operational data.

**API:** `POST /api/chat`
**Request:** `{ "question": "string" }`
**Response:**
```json
{
  "answer": "Based on the SLA policy...",
  "intent": "hybrid",
  "sources": [
    {"type": "document", "name": "sla_policy.pdf", "page": 3, "relevance": 0.87},
    {"type": "database", "table": "orders", "detail": "Order ORD-48321"}
  ],
  "confidence": "high"
}
```

**Layout:**
```
┌──────────────────────────────────────────────┐
│  Chat Header: "Knowledge Copilot"            │
│  Subtitle: "Ask about policies, orders..."   │
├──────────────────────────────────────────────┤
│                                              │
│  [Welcome message with suggested questions]  │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ User bubble (right-aligned, blue bg)    │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ AI bubble (left-aligned, white bg)      │ │
│  │                                         │ │
│  │ [Intent badge: "hybrid"]                │ │
│  │ [Confidence badge: "high"]              │ │
│  │                                         │ │
│  │ ┌── Sources ──────────────────────────┐ │ │
│  │ │ 📄 sla_policy.pdf (p.3) — 87%      │ │ │
│  │ │ 🗄️ orders table — ORD-48321        │ │ │
│  │ └────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────┘ │
│                                              │
├──────────────────────────────────────────────┤
│  [Text input]                    [Send btn]  │
└──────────────────────────────────────────────┘
```

**Chat Message Components:**

*User Message:*
- Right-aligned, `bg-blue-600 text-white rounded-lg rounded-br-none p-3`
- Timestamp below in `text-xs text-gray-400`

*AI Message:*
- Left-aligned, `bg-white border border-gray-200 rounded-lg rounded-bl-none p-4`
- AI avatar icon on left
- Answer text with markdown rendering support (use `react-markdown` or similar)
- Intent badge: `knowledge_only` = 📚 green, `data_only` = 🗄️ blue, `hybrid` = 🔀 purple, `exception_investigation` = 🔍 orange
- Confidence badge: high = green, medium = amber, low = red
- Sources section (collapsible): shows source type icon, document name/page/relevance or table/detail

*Loading State:*
- Animated typing indicator (3 bouncing dots) in an AI message bubble
- Input disabled while loading

**Welcome State (no messages yet):**
- OpsPilot AI logo + "How can I help you today?"
- 4 clickable suggestion chips:
  - "What is our SLA policy for premium customers?"
  - "Show me order ORD-48321 status"
  - "Which orders are at risk of SLA breach?"
  - "What is the escalation procedure for delayed orders?"

**Input Bar:**
- Full-width text input at the bottom, fixed/sticky
- Send button (primary color, with arrow icon)
- Submit on Enter key
- Auto-focus on page load
- Disabled when waiting for response

---

### 7.4 Knowledge Base Page (`/knowledge-base`)

**Purpose:** Upload, view, and manage enterprise documents that feed the RAG knowledge base.

**APIs:**
- `GET /api/documents` → list all documents
- `POST /api/documents/upload` → upload a new document (multipart form)
- `DELETE /api/documents/{id}` → delete a document (admin only)

**Document List Response:**
```json
[{
  "id": "uuid",
  "filename": "sla_policy.pdf",
  "file_type": "pdf",
  "total_chunks": 12,
  "status": "indexed",
  "uploaded_at": "2026-09-01T10:30:00Z"
}]
```

**Layout:**

**Top Section: Upload Area (only visible for admin/manager)**
- Drag-and-drop zone with dashed border (`border-dashed border-2 border-gray-300`)
- Icon: `Upload` from Lucide
- Text: "Drag & drop files here or click to browse"
- Subtext: "Supports PDF, TXT, DOCX — Max 20MB"
- File type filter on the file dialog
- On file drop/select → immediately upload via `POST /api/documents/upload`
- Show upload progress bar
- On success → show toast + refresh document list
- On error → show toast with error message

**Bottom Section: Document List**
- Table with columns:
  | Column | Content |
  |---|---|
  | File | Icon (📄 PDF, 📝 TXT, 📃 DOCX) + filename |
  | Status | Badge: `processing` = yellow spinner, `indexed` = green ✓, `error` = red ✗ |
  | Chunks | Number (e.g., "12 chunks") |
  | Uploaded | Relative time (e.g., "2 hours ago") |
  | Actions | Delete button (trash icon, admin/manager only) |

- Delete confirmation: modal dialog "Are you sure you want to delete {filename}? This will remove it from the knowledge base."
- Empty state: "No documents uploaded yet. Upload your first document to start building the knowledge base."

---

### 7.5 Exceptions List Page (`/exceptions`)

**Purpose:** View all detected operational exceptions with filtering.

**API:** `GET /api/exceptions?status=detected&severity=high&limit=20&offset=0`
**Response:**
```json
{
  "items": [{
    "id": "uuid",
    "case_number": "EX-20381",
    "exception_type": "delayed_order",
    "severity": "critical",
    "status": "detected",
    "related_order_id": "uuid",
    "related_customer_id": "uuid",
    "detected_at": "2026-09-09T08:30:00Z"
  }],
  "total": 42
}
```

**Layout:**

**Top Bar:**
- Page title: "Exceptions" with count badge ("42 total")
- Filter controls (horizontal row):
  - Status dropdown: All, Detected, Investigating, Recommendation Ready, Approved, Rejected, Resolved
  - Severity dropdown: All, Critical, High, Medium, Low
  - Search input: search by case number or customer name

**Table:**
| Column | Content | Width |
|---|---|---|
| Case # | `EX-20381` (link to detail) | 120px |
| Type | `Delayed Order` (humanized) | 150px |
| Severity | Badge (colored pill) | 100px |
| Status | Badge (colored pill) | 140px |
| Detected | Relative time + tooltip with absolute | 130px |
| → | Chevron right icon | 40px |

- Rows are clickable → navigate to `/exceptions/:id`
- Critical severity rows have a subtle red left border
- Pagination at bottom: "Showing 1-20 of 42" with Previous/Next buttons

---

### 7.6 Exception Detail Page (`/exceptions/:id`)

**Purpose:** Full investigation view for a single exception — the most important page in the app.

**API:** `GET /api/exceptions/{exception_id}`
**Response:** Full exception detail including investigation_summary, root_cause, business_impact, recommended_action, confidence_score, sources_used, and nested actions.

**Layout — 2 Column on Desktop:**

```
┌────────────────────────────────────┬──────────────────────┐
│  Exception Header                  │  Status Card         │
│  EX-20381 · Delayed Order         │  Status: Detected    │
│  Severity: CRITICAL (red badge)    │  Detected: 2h ago   │
│  Customer: Apex Manufacturing      │  Assigned: —         │
│                                    │  [Investigate] btn   │
├────────────────────────────────────┤                      │
│                                    │  Actions Card        │
│  Investigation Panel               │  ┌────────────────┐ │
│  (only visible after investigation)│  │ Action 1       │ │
│                                    │  │ [Approve][Rej] │ │
│  📋 Root Cause                     │  ├────────────────┤ │
│  "Supplier inventory shortage..."  │  │ Action 2       │ │
│                                    │  │ [Approve][Rej] │ │
│  📊 Business Impact                │  └────────────────┘ │
│  "Premium customer, SLA breach..." │                      │
│                                    │  Audit Trail Card    │
│  💡 Recommended Action             │  • Detected at 8:30  │
│  "Offer alternative product..."    │  • Investigated 8:45 │
│                                    │  • Approved at 9:00  │
│  🎯 Confidence: 87% (HIGH)        │                      │
│                                    │                      │
│  📚 Sources Used                   │                      │
│  • sla_policy.pdf (p.3)           │                      │
│  • orders table (ORD-48321)       │                      │
│  • inventory table (SKU-2847)     │                      │
│  • suppliers table (SupplyCo)     │                      │
└────────────────────────────────────┴──────────────────────┘
```

**Exception Header:**
- Back button (← Exceptions)
- Case number + type
- Severity badge (large)
- Customer name + tier badge (standard/premium/enterprise)

**Status Card (right sidebar):**
- Current status badge
- Detected timestamp
- If `status === 'detected'`: Show "Investigate" button (blue, primary) — only for manager/admin
- If `status === 'recommendation_ready'`: Show action cards
- If `status === 'resolved'`: Show "Resolved" with timestamp and resolver name

**Investigation Panel (left, main area):**
- Only shown when `investigation_summary` exists
- Four expandable sections, each with an icon:
  1. 📋 **Root Cause** — `root_cause` text
  2. 📊 **Business Impact** — `business_impact` text
  3. 💡 **Recommended Action** — `recommended_action` text
  4. 🎯 **Confidence** — progress bar + percentage + HIGH/MEDIUM/LOW label

**Sources Card:**
- List of sources from `sources_used` JSONB
- Icon per type: 📄 document, 🗄️ database
- Document sources show: filename, page number
- Database sources show: table name, detail

**Actions Card (right sidebar, below status):**
- Each action from `exception_actions`:
  - Description text
  - Status badge
  - If `status === 'pending'`:
    - "Approve" button (green) — `POST /api/exceptions/{id}/actions/{action_id}/approve`
    - "Reject" button (red) — opens modal for rejection reason → `POST /api/exceptions/{id}/actions/{action_id}/reject`
  - If approved: Green checkmark + "Approved by {name}" + timestamp
  - If rejected: Red X + "Rejected" + reason

**Audit Trail Card (right sidebar, bottom):**
- Vertical timeline with dots and lines
- Each entry: icon + event description + timestamp + actor name
- Events: "Exception detected", "Investigation started", "Recommendation generated", "Action approved by {name}", etc.

**Investigate Button Behavior:**
- On click → `POST /api/exceptions/{id}/investigate`
- Button changes to spinner + "Investigating..."
- Poll `GET /api/exceptions/{id}` every 3 seconds until status changes from `investigating`
- When done → refresh page to show investigation results

---

## 8. Reusable Components

| Component | Props | Usage |
|---|---|---|
| `Layout` | `children` | App shell with Sidebar + TopBar + content |
| `Sidebar` | `currentPath` | Navigation sidebar |
| `TopBar` | `title`, `user` | Sticky top bar |
| `ProtectedRoute` | `children`, `allowedRoles?` | Route guard |
| `MetricCard` | `title`, `value`, `icon`, `color`, `trend?` | Dashboard metric |
| `SeverityBadge` | `severity` | Colored pill: critical/high/medium/low |
| `StatusBadge` | `status` | Colored pill for exception status |
| `IntentBadge` | `intent` | Chat intent indicator |
| `ConfidenceBadge` | `confidence` | Chat confidence indicator |
| `ChatMessage` | `role`, `content`, `sources?`, `intent?`, `confidence?`, `timestamp` | Single chat message |
| `SourceCard` | `source` | Source citation display |
| `FileUpload` | `onUpload`, `accept`, `maxSize` | Drag-and-drop file upload |
| `DocumentRow` | `document`, `onDelete?` | Single document in table |
| `ExceptionRow` | `exception`, `onClick` | Single exception in table |
| `ApprovalButtons` | `actionId`, `exceptionId`, `onApprove`, `onReject` | Approve/Reject control |
| `AuditTimeline` | `events[]` | Vertical timeline |
| `ConfirmModal` | `title`, `message`, `onConfirm`, `onCancel` | Confirmation dialog |
| `LoadingSpinner` | `size?` | Centered spinner |
| `EmptyState` | `icon`, `title`, `message`, `action?` | Empty data placeholder |
| `Pagination` | `total`, `limit`, `offset`, `onChange` | Page navigation |

---

## 9. API Integration Guide

### Axios Instance Setup (`services/api.js`)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('opspilot_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('opspilot_token');
      localStorage.removeItem('opspilot_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Complete API Endpoints

| Method | Endpoint | Purpose | Auth | Roles |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register user | ❌ | — |
| `POST` | `/api/auth/login` | Login → get JWT | ❌ | — |
| `GET` | `/api/auth/me` | Validate token + get user | ✅ | all |
| `GET` | `/api/health` | System health check | ❌ | — |
| `POST` | `/api/documents/upload` | Upload document (multipart) | ✅ | admin, manager |
| `GET` | `/api/documents` | List all documents | ✅ | all |
| `DELETE` | `/api/documents/{id}` | Delete document | ✅ | admin |
| `POST` | `/api/chat` | Send chat question | ✅ | all |
| `GET` | `/api/exceptions` | List exceptions (with filters) | ✅ | all |
| `GET` | `/api/exceptions/{id}` | Get exception detail | ✅ | all |
| `POST` | `/api/exceptions/{id}/investigate` | Trigger AI investigation | ✅ | manager, admin |
| `POST` | `/api/exceptions/{id}/actions/{aid}/approve` | Approve action | ✅ | manager, admin |
| `POST` | `/api/exceptions/{id}/actions/{aid}/reject` | Reject action | ✅ | manager, admin |
| `POST` | `/api/exceptions/{id}/resolve` | Mark resolved | ✅ | manager, admin |
| `GET` | `/api/dashboard/metrics` | Dashboard metrics | ✅ | all |

---

## 10. State Management

No external state management library needed. Use React's built-in tools:

| State | Where | How |
|---|---|---|
| Auth (user, token) | `AuthContext` | React Context + localStorage |
| Chat messages | `ChatPage` local state | `useState` array, appended on each message |
| Documents list | `KnowledgeBasePage` local state | `useState` + `useEffect` fetch |
| Exceptions list | `ExceptionsPage` local state | `useState` + `useEffect` fetch |
| Exception detail | `ExceptionDetailPage` local state | `useState` + `useEffect` fetch by ID |
| Dashboard metrics | `DashboardPage` local state | `useState` + `useEffect` fetch |
| Filters | Page-level state | `useState` for each filter, pass as query params |
| Modals | Component-level state | `useState(boolean)` |

---

## 11. Error Handling & Loading States

### Loading
- Every data-fetching page: show `LoadingSpinner` component centered while loading
- Chat: show typing indicator (3 animated dots) in AI message bubble
- Button actions: show spinner inside button + disable button
- File upload: show progress bar

### Errors
- API errors: show `react-hot-toast` notification with error message
- Network errors: "Unable to connect to server. Please check your connection."
- 403 errors: "You don't have permission to perform this action."
- 404 errors: "Resource not found."
- Form validation: Inline error messages below input fields in red text

### Empty States
- No documents: illustration + "No documents uploaded yet" + upload button
- No exceptions: illustration + "No exceptions detected. All systems operational! ✅"
- No chat messages: Welcome screen with suggested prompts
- No search results: "No exceptions match your filters"

---

## 12. Responsive Design Requirements

| Breakpoint | Sidebar | Layout |
|---|---|---|
| Desktop (≥1024px) | Visible, fixed left | 2-column where specified |
| Tablet (768–1023px) | Collapsible (hamburger) | Single column |
| Mobile (<768px) | Hidden, overlay on hamburger | Single column, stacked cards |

- All tables become horizontal-scrollable on mobile
- Dashboard metric cards: 4-col → 2-col → 1-col
- Exception detail: 2-col → stacked (investigation on top, sidebar below)
- Chat: full-width, input bar fixed to bottom

---

## 13. File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── MetricCard.jsx
│   │   ├── SeverityBadge.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── IntentBadge.jsx
│   │   ├── ConfidenceBadge.jsx
│   │   ├── ChatMessage.jsx
│   │   ├── SourceCard.jsx
│   │   ├── FileUpload.jsx
│   │   ├── DocumentRow.jsx
│   │   ├── ExceptionRow.jsx
│   │   ├── ApprovalButtons.jsx
│   │   ├── AuditTimeline.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── EmptyState.jsx
│   │   └── Pagination.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── KnowledgeBasePage.jsx
│   │   ├── ExceptionsPage.jsx
│   │   ├── ExceptionDetailPage.jsx
│   │   └── NotFoundPage.jsx
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── context/
│   │   └── AuthContext.jsx
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css           # Tailwind imports
│
├── public/
│   └── favicon.svg
│
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── .env.example             # VITE_API_URL=http://localhost:8000
```

---

## 14. Freebuff Prompt Templates

Copy-paste these into Freebuff.com, one at a time, in order.

### Prompt 1: App Shell + Auth
```
Build a React 18 + Vite 5 + Tailwind CSS 3.4 application.

Create the app shell with:
- A dark sidebar (gray-900) on the left, 256px wide, with navigation items: Dashboard, Chat, Knowledge Base, Exceptions
- A sticky top bar with user name and role badge
- An AuthContext that stores JWT token and user info in localStorage
- Login page with email/password form, centered card on a blue gradient background
- Protected routes that redirect to /login if no token exists
- Axios instance with JWT interceptor that attaches Authorization header
- On 401 response, clear token and redirect to login
- React Router v6 with routes: /login, /, /dashboard, /chat, /knowledge-base, /exceptions, /exceptions/:id

Use Inter font from Google Fonts. Use Lucide React for icons.
The API base URL should come from VITE_API_URL environment variable.
```

### Prompt 2: Dashboard
```
Add a Dashboard page at /dashboard.

It fetches metrics from GET /api/dashboard/metrics and displays:
- Top row: 4 metric cards (Exceptions Today, Open Exceptions, Resolved Today, Avg Resolution Time)
  Each card has a left colored border, large number, small label, and icon
- Middle: Severity breakdown showing exceptions by severity (critical=red, high=orange, medium=amber, low=blue)
- Bottom: A table of recent exceptions with columns: Case #, Type, Severity badge, Status badge, Detected time
  Rows are clickable and navigate to /exceptions/:id

Use Tailwind CSS. Cards are white with shadow-sm and rounded-lg.
```

### Prompt 3: Chat Page
```
Add a Chat page at /chat.

It's a full-height chat interface with:
- Messages area that scrolls, with user messages right-aligned (blue bg) and AI messages left-aligned (white bg with border)
- Each AI message shows: the answer text, an intent badge (knowledge/data/hybrid), a confidence badge (high/medium/low), and a collapsible "Sources" section listing document sources (name + page + relevance) and database sources (table + detail)
- Fixed input bar at the bottom with a text input and send button
- Send on Enter key, disable input while loading, show typing animation (3 bouncing dots) while waiting
- When empty, show a welcome screen with 4 clickable suggestion chips

API: POST /api/chat with { "question": "string" }
Response: { "answer", "intent", "sources": [{ "type", "name", "page", "relevance" }], "confidence" }
```

### Prompt 4: Knowledge Base
```
Add a Knowledge Base page at /knowledge-base.

Top section: Drag-and-drop file upload area with dashed border, Upload icon, "Drag & drop files here" text.
Supports PDF, TXT, DOCX. Max 20MB. Only visible for admin and manager roles.
Upload via POST /api/documents/upload (multipart form data).

Bottom section: Table of uploaded documents from GET /api/documents.
Columns: File (icon + name), Status (processing=yellow, indexed=green, error=red badge), Chunks count, Uploaded time (relative), Delete button (admin only).
Delete requires confirmation modal. DELETE /api/documents/{id}.

Show empty state "No documents uploaded yet" when list is empty.
Use react-hot-toast for success/error notifications.
```

### Prompt 5: Exceptions Pages
```
Add two pages:

1. Exceptions List at /exceptions:
   - Filter bar: Status dropdown, Severity dropdown, Search by case number
   - Table: Case #, Type, Severity badge, Status badge, Detected time, clickable rows → /exceptions/:id
   - Pagination at bottom
   - API: GET /api/exceptions?status=X&severity=X&limit=20&offset=0

2. Exception Detail at /exceptions/:id:
   - Two-column layout on desktop, stacked on mobile
   - Left column: Investigation panel with Root Cause, Business Impact, Recommended Action, Confidence score, Sources list
   - Right column: Status card with Investigate button (POST /api/exceptions/{id}/investigate), Action cards with Approve (green) and Reject (red) buttons, Audit timeline
   - Approve: POST /api/exceptions/{id}/actions/{aid}/approve
   - Reject: opens modal for reason → POST /api/exceptions/{id}/actions/{aid}/reject
   - During investigation: show loading spinner and poll every 3 seconds

Severity badges: critical=red, high=orange, medium=amber, low=blue
Status badges: detected=yellow, investigating=blue, recommendation_ready=purple, approved=green, rejected=red, resolved=gray
```

---

## 15. Integration Workflow with Backend

### Development Setup
1. Backend runs on `http://localhost:8000`
2. Frontend runs on `http://localhost:5173`
3. Set `VITE_API_URL=http://localhost:8000` in frontend `.env`
4. Backend has CORS configured to allow `http://localhost:5173`

### API Contract
- All requests to `/api/*` endpoints
- All requests include `Authorization: Bearer <token>` header (except login/register/health)
- All responses are JSON
- Error responses: `{ "detail": "error message" }`

### Git Workflow
- Backend developer works on `main` and `backend/*` branches
- Frontend developer works on `frontend` branch
- Both merge into `main` via Pull Requests
- See the CONTRIBUTING.md in the repository root for detailed workflow

### Mock Data for Frontend Development
If the backend isn't ready yet, create a `services/mockData.js` file with hardcoded responses matching the API shapes documented above. Toggle between real API and mock data using an environment variable: `VITE_USE_MOCK=true`.
