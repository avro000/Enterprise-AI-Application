# Contributing to OpsPilot AI

## Team Structure
- **Backend Developer (You):** Python, FastAPI, PostgreSQL, RAG pipeline, AI services, database, Docker
- **Frontend Developer (Friend):** React, Vite, Tailwind CSS, UI/UX via Freebuff.com

---

## Git Workflow — Branch Strategy

```
main (production-ready code)
 ├── backend/feature-name    ← Backend developer's feature branches
 ├── frontend                ← Frontend developer's long-lived branch
 │    └── frontend/feature-name  ← Frontend feature branches (optional)
 └── develop                 ← Integration branch (merge before main)
```

### Rules

1. **Never push directly to `main`.** Always use Pull Requests.
2. **Backend developer** creates branches from `main` prefixed with `backend/`:
   - `backend/auth-system`
   - `backend/rag-pipeline`
   - `backend/exception-detector`
3. **Frontend developer** works on the `frontend` branch (long-lived):
   - Creates sub-branches like `frontend/chat-page` if needed
   - Merges back into `frontend` first, then PRs into `main`
4. **Integration via `develop` branch:**
   - Both developers merge into `develop` for integration testing
   - When stable → PR from `develop` into `main`

### Daily Workflow

**Backend Developer:**
```bash
git checkout main
git pull origin main
git checkout -b backend/feature-name
# ... work ...
git add .
git commit -m "feat(backend): add auth service with JWT"
git push origin backend/feature-name
# Create PR → develop (or main)
```

**Frontend Developer:**
```bash
git checkout frontend
git pull origin frontend
# ... work (push from Freebuff or local) ...
git add .
git commit -m "feat(frontend): add dashboard page"
git push origin frontend
# Create PR → develop (or main)
```

### Commit Message Convention
```
type(scope): short description

Types: feat, fix, docs, style, refactor, test, chore
Scope: backend, frontend, db, docker, docs
```

Examples:
- `feat(backend): add document upload endpoint`
- `feat(frontend): build chat page with source citations`
- `fix(backend): fix FAISS index loading on startup`
- `docs: update FRONTEND_SPEC with new API contract`

### Pull Request Process
1. Create PR with clear title and description
2. List what was added/changed
3. Tag the other developer for review if changes affect shared contracts (API shapes, env vars)
4. Merge via "Squash and merge" to keep history clean

---

## Shared Contracts (DO NOT CHANGE WITHOUT COMMUNICATION)

These are the integration points between frontend and backend. If either developer needs to change these, they MUST notify the other:

1. **API endpoint URLs** — defined in `TECHNICAL_SPEC.md` Section 9
2. **Request/Response JSON shapes** — defined in `TECHNICAL_SPEC.md` Section 9
3. **Environment variables** — `VITE_API_URL`, backend CORS origins
4. **Authentication header format** — `Authorization: Bearer <token>`
5. **Error response format** — `{ "detail": "string" }`

---

## Integration Testing

1. Backend developer starts: `docker-compose up db backend`
2. Frontend developer starts: `cd frontend && npm run dev`
3. Frontend connects to `http://localhost:8000`
4. Test the full flow: Login → Dashboard → Chat → Upload → Exceptions → Approve

---

## Connecting Freebuff.com to This Repo

1. Push code to GitHub: `git push origin frontend`
2. Go to [freebuff.com](https://freebuff.com)
3. Sign in with GitHub account
4. Connect the `avro000/minorProject` repository
5. Select the `frontend` branch
6. Freebuff Cloud IDE opens with live preview
7. Make changes via AI prompts → changes save to the repo
8. Push back to GitHub when done
