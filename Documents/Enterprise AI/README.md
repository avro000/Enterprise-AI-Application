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

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, asyncpg, Alembic, FAISS, sentence-transformers, Google Generative AI / OpenAI, Pydantic v2, APScheduler.
- **Frontend**: React 18.3, Vite 5.4, React Router 6.26, Tailwind CSS 3.4, Axios, Lucide React, React Hot Toast.
- **Infrastructure**: PostgreSQL 16, Docker & Docker Compose.

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- Docker & Docker Compose (or local PostgreSQL 16)
- Python 3.10+
- Node.js 18+ and npm

### 2. Environment Configuration
Create environment files from templates:
```bash
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env
```

### 3. Running with Docker Compose
```bash
docker-compose up --build
```
- Backend API: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- Frontend App: `http://localhost:5173`

---

## 👥 Development Workflow

- **Backend (`avro000`)**: Features branch from `backend` → PR to `develop`.
- **Frontend (`Swapniltechyy`)**: Features branch from `frontend` → PR to `develop`.
- **Integration**: Both developers test in `develop` before final release to `main`.
