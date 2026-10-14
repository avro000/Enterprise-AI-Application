# OpsPilot AI — Enterprise Operations Intelligence & Action Platform

OpsPilot AI is an AI-powered enterprise operations assistant that combines RAG-based knowledge retrieval over business documents with live operational data queries to help operations teams detect, investigate, and resolve business exceptions.

---

## 📚 Core Architecture & Documentation

- **[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)**: Full engineering implementation blueprint (schemas, API contracts, RAG pipeline, context fusion algorithm, and tests).
- **[PRODUCT_VISION.md](PRODUCT_VISION.md)**: Product vision, business case, ROI model, and 2026 competitive landscape analysis.
- **[FRONTEND_SPEC.md](FRONTEND_SPEC.md)**: Frontend UI/UX specification, component guidelines, and Freebuff.com prompt templates.
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Git workflow, branch protection rules, and collaboration standards for the 2-person development team.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, asyncpg, Alembic, Neon Serverless PostgreSQL + pgvector, boto3 (Neon S3 Object Storage), sentence-transformers, Google Generative AI / OpenAI, Pydantic v2, APScheduler.
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Radix UI, Framer Motion, Lucide React, Sonner (Toaster), Freebuff Claymorphism UI design, Axios, Input OTP.
- **Cloud Infrastructure**: Neon Serverless Cloud PostgreSQL 18.6 (`mute-moon-34613447`), Neon Native `pgvector` v0.8.6 (HNSW Cosine Indexing), Neon Cloud S3-Compatible Object Storage (`docs` bucket for zero-disk cloud file management, streaming downloads, and presigned URLs).
- **Authentication**: Enterprise authentication with JWT credentials (bcrypt, HS256), 5-minute registration OTP activation loop, 5-minute password recovery OTP, and three-tier RBAC (admin → manager → operator).

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Neon PostgreSQL connection string in `backend/.env`

### 2. Environment Configuration
Create environment files from templates:
```bash
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env
```

### 3. Running Locally

#### Start the Backend (Terminal 1)
```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- Backend API: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)

#### Start the Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
- Frontend App: `http://localhost:5173` (Proxies all `/api` calls directly to the FastAPI backend)

---

## 🔐 Enterprise Authentication Architecture

OpsPilot AI implements an enterprise-grade authentication system designed for operations management:

- **JWT Credentials**: Secure password hashing with bcrypt, timed JWT tokens (HS256) with role claims.
- **Three-Tier RBAC**: Strict role-based access control (`admin` → `manager` → `operator`) with FastAPI dependency-injection enforcement.
- **Real-Time Email Deliverability & Anti-Abuse**: Registration validates active DNS MX records and host availability (rejecting non-existent domains such as `OwaQXzfJVwg0@lxJycmzVbXzSd.pb`) and blocks known temporary/disposable email providers.
- **5-Minute Registration OTP Activation Loop**: On registration, accounts are created with `is_verified: False`. A 6-digit OTP code valid for **5 minutes** is dispatched via SMTP. The user must verify the OTP (`/api/auth/verify-registration-otp`) before login is permitted (unverified login attempts return `403 Forbidden`).
- **5-Minute Password Recovery**: 6-digit OTP dispatched via SMTP valid for **5 minutes** → verified → single-use signed reset token → password updated.
- **Full Audit Trail**: Every authentication and security event (registration, email verification, login, password reset requests) is logged to `audit_log`.

---

## 👥 Development Workflow

- **Backend (`avro000`)**: Features branch from `backend` → PR to `develop`.
- **Frontend (`Swapniltechyy`)**: Features branch from `frontend` → PR to `develop`.
- **Integration**: Both developers test in `develop` before final release to `main`.
