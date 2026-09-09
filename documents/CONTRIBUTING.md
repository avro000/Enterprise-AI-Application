# Contributing to OpsPilot AI

## Team Structure

| Developer | GitHub Username | Role |
|---|---|---|
| **Backend Developer** | `avro000` | Python, FastAPI, PostgreSQL, RAG pipeline, AI services, Docker |
| **Frontend Developer** | `Swapniltechyy` | React, Vite, Tailwind CSS, UI/UX design via Freebuff.com |

---

## Branch Structure & Permissions

### All Active Branches

```
main        ← 🔒 PROTECTED — Final production-ready code
backend     ← 🔒 PROTECTED — Backend/AI code (avro000 only)
develop     ← 🟡 OPEN — Integration & testing (both developers)
frontend    ← 🟢 OPEN — Frontend UI code (Swapniltechyy)
```

### Who Can Do What

| Action | `avro000` (owner) | `Swapniltechyy` (collaborator) |
|---|---|---|
| Push directly to `frontend` | ✅ Yes | ✅ Yes |
| Push directly to `develop` | ✅ Yes | ✅ Yes |
| Push directly to `backend` | ❌ No — must use PR | ❌ No — must use PR |
| Push directly to `main` | ❌ No — must use PR | ❌ No — must use PR |
| **Read/pull from ANY branch** | ✅ Yes | ✅ Yes |
| Merge PRs into `main` | ✅ Yes (owner) | ❌ No |
| Merge PRs into `backend` | ✅ Yes (owner) | ❌ No |

> **Key rule:** `main` and `backend` are **protected branches**. No one can directly push to
> them — code only enters through a Pull Request. This prevents accidental overwrites.

> **Read access note:** `Swapniltechyy` can freely **read, browse, and pull** code from ALL
> branches including `backend`. This is important — he needs to see the backend API routes,
> models, and response formats to build the frontend correctly.

---

## How Swapnil Can Pull Backend Code to Stay in Sync

Swapnil should regularly pull the latest backend code so he knows exactly what APIs are
available and what their request/response shapes look like.

```bash
# View backend branch code without switching away from frontend work
git fetch origin backend

# Temporarily switch to read backend code
git checkout backend
git pull origin backend

# Switch back to frontend work
git checkout frontend
```

He can also browse any branch directly on GitHub:
1. Go to [github.com/avro000/Enterprise-AI-Application](https://github.com/avro000/Enterprise-AI-Application)
2. Click the branch dropdown (says `main` by default)
3. Select `backend` — all code is visible

Or refer to [`TECHNICAL_SPEC.md`](TECHNICAL_SPEC.md) (Section 9) and [`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) (Section 9)
which document every API endpoint, request body, and response shape in detail.

---

## Git Workflow — Step by Step

### Big Picture Flow

```
avro000 writes backend code           Swapniltechyy writes frontend code
           │                                        │
   [backend branch]                          [frontend branch]
           │                                        │
           └──────── PR into develop ───────────────┘
                             │
                       [develop branch]
                    (Integration Testing)
                             │
                    (Everything works!)
                             │
                    PR from develop → main
                             │
                      [main branch]
                   (Final production code)
```

---

### Daily Workflow — avro000 (Backend)

```bash
# 1. Start from the backend branch (your home branch)
git checkout backend
git pull origin backend

# 2. Write your Python/FastAPI/DB code...

# 3. Save and upload to GitHub
git add .
git commit -m "feat(backend): add exception detection API"
git push origin backend
# GitHub will say "can't push directly" — but THIS IS YOUR branch, just create a PR or
# push to a feature branch:

# Better: use a feature branch for each feature
git checkout -b backend/exception-detector    # create sub-branch
# ... code ...
git push origin backend/exception-detector
# Then open PR on GitHub: backend/exception-detector → backend
# Then PR from backend → develop when ready
```

---

### Daily Workflow — Swapniltechyy (Frontend)

```bash
# 1. Always start from the frontend branch
git checkout frontend
git pull origin frontend

# 2. Design and build UI using Freebuff.com or local editor...

# 3. Save and upload to GitHub
git add .
git commit -m "feat(frontend): build chat page with source citations"
git push origin frontend
# Done! No PR needed for frontend branch.

# 4. When a feature is ready to integrate, create a PR on GitHub:
#    frontend → develop
```

---

### Integration Testing Workflow (Both Developers)

After both backend and frontend have features ready in `develop`:

```bash
# Both developers pull the combined code
git checkout develop
git pull origin develop

# avro000 starts backend
docker-compose up db backend
# Backend runs at http://localhost:8000

# Swapniltechyy starts frontend
cd frontend && npm run dev
# Frontend runs at http://localhost:5173

# Open browser → http://localhost:5173 → test the feature end-to-end
```

---

### Releasing to `main` (Final Step)

Once all features for a milestone are tested and verified in `develop`:

1. Go to the repo on GitHub: [github.com/avro000/Enterprise-AI-Application/pulls](https://github.com/avro000/Enterprise-AI-Application/pulls)
2. Click **"New pull request"**
3. Set **base:** `main` ← **compare:** `develop`
4. Title: e.g. `"Release v0.1 — Working Login, Dashboard and Chat"`
5. Click **"Create pull request"** → **"Merge pull request"**
6. ✅ `main` is now updated with the tested, working project

---

## Commit Message Convention

```
type(scope): short description

Types:  feat, fix, docs, style, refactor, test, chore
Scopes: backend, frontend, db, docker, docs
```

Examples:
- `feat(backend): add document upload endpoint`
- `feat(frontend): build chat page with source citations`
- `fix(backend): fix FAISS index loading on startup`
- `docs: update FRONTEND_SPEC with new API contract`

---

## Pull Request Checklist

Before creating a PR, make sure:
- [ ] Your feature works correctly on your local machine
- [ ] You have tested the flow end-to-end (if possible)
- [ ] The PR title clearly describes what was changed
- [ ] You have listed what was added/changed in the PR description
- [ ] If you changed an API contract (URL, request/response shape) — notify the other developer first

---

## Shared Contracts — DO NOT CHANGE WITHOUT COMMUNICATION

These are the integration points between frontend and backend. If either developer
needs to change these, they **must** notify the other first:

1. **API endpoint URLs** — defined in `TECHNICAL_SPEC.md` Section 9
2. **Request/Response JSON shapes** — defined in `TECHNICAL_SPEC.md` Section 9
3. **Environment variables** — `VITE_API_URL`, backend CORS origins
4. **Authentication header format** — `Authorization: Bearer <token>`
5. **Error response format** — `{ "detail": "string" }`

---

## Connecting Freebuff.com to This Repo (For Swapniltechyy)

1. Push code to GitHub: `git push origin frontend`
2. Go to [freebuff.com](https://freebuff.com)
3. Sign in with your GitHub account (`Swapniltechyy`)
4. Connect the `avro000/Enterprise-AI-Application` repository
5. Select the **`frontend`** branch
6. Freebuff Cloud IDE opens with a live preview
7. Make changes via AI prompts → changes save to the repo automatically
8. Push back to GitHub when done

---

## Quick Reference — Most Used Commands

| What you want to do | Command |
|---|---|
| See what branch you're on | `git branch` |
| Switch to a branch | `git checkout <branch-name>` |
| Get latest updates from GitHub | `git pull origin <branch-name>` |
| Create a new sub-branch | `git checkout -b <new-name>` |
| Stage all changes | `git add .` |
| Save a checkpoint | `git commit -m "description"` |
| Upload to GitHub | `git push origin <branch-name>` |
| Pull latest backend code (for Swapnil) | `git fetch origin backend` |
