# QEA Agentic AI Hub — Architecture & File Reference

A map of the codebase: every significant file, what it does, and **who calls what**.

> ⚠️ **Which copy is live:** the running app is `Desktop\projects\agentic_hub\agent-dashboard`.
> There are other copies on disk (`Desktop\projects\agent-dashboard`, `agentic_hub\assistant-export`) that are **not** what the browser runs. Always edit the `agentic_hub` copy.

---

## 1. Services & ports

| Service | Tech | Port | Started by |
|---|---|---|---|
| MongoDB (local, portable) | mongod 8.0 | 27017 | `start-mongo.ps1` / `start-all.ps1` |
| Hub API | Node + Express | 5000 | `server/` (`node --watch server.js`) |
| Hub frontend | React + Vite | 5173 | `client/` (`npm run dev`) → proxies `/api` → :5000 |
| ARA evaluation service | Python stdlib | 8200 | `integrations/eval-service/app.py` |
| AgentBench (benchmarking) | FastAPI + React | 8001 (planned) | not integrated yet (blocked on PyPI access) |

Bring the whole stack up with **`start-all.ps1`**.

---

## 2. Top-level layout

```
agent-dashboard/
├── client/            React + Vite frontend (the UI)
├── server/            Express API + MongoDB models
├── integrations/      external agents wired in
│   ├── ara/            git submodule → agent-readiness-analyzer (evaluation)
│   ├── eval-service/   our tiny HTTP wrapper around ARA (:8200)
│   └── agentbench/     git submodule → AgentBench (benchmarking; not wired yet)
├── docs/              this file + AGENT_ASSISTANT.md
├── start-all.ps1      start the whole stack
├── sync-agents.ps1    pull latest submodule code + restart the eval service
└── start-mongo.ps1    start local MongoDB
```

---

## 3. Request flow (the big picture)

```
Browser (React :5173)
  └─ src/api.js  (fetch to "/api/…")
       └─ Vite dev proxy  →  Express (:5000)  [server/server.js]
            ├─ middleware/auth.js   (verifies JWT, sets req.admin = {id,username,role})
            ├─ routes/*.js          (endpoint logic)
            │     └─ models/*.js     (Mongoose)  →  MongoDB (:27017)
            │     └─ utils/gridfs.js (file up/download)  →  GridFS (in MongoDB)
            └─ routes/evaluation.js →  ARA eval service (:8200)  →  ara.analyze()
```

---

## 4. Backend (`server/`)

### Core
| File | Role |
|---|---|
| `server.js` | App entry. Sets up CORS + JSON, defines `/api/config` & `/api/health`, **mounts all route modules**, global error handler, connects DB, listens on :5000. |
| `config/db.js` | Connects Mongoose to `MONGODB_URI`; exposes the **GridFS bucket** (`getBucket()`) used for videos & attachments. |
| `middleware/auth.js` | `requireRoles(...)` factory → verifies the `Bearer` JWT and checks role. Exports `requireAdmin` (admin), `requireStaff` (admin+associate), `requireAuth` (any logged-in user). Sets `req.admin = { id, username, role }`. |
| `utils/gridfs.js` | Helpers to store/read/delete files in GridFS (`uploadBuffer`, `findFile`, `deleteFile`). |
| `constants.js` | Shared enums: `CATEGORY_CODES`, `STAGES`, `STATUSES`. |

### Models (`server/models/`) → MongoDB collections
| Model | What it stores |
|---|---|
| `Admin.js` | Admin accounts (username + bcrypt hash + role). |
| `User.js` | Self-registered users (email + bcrypt hash, role `user`). |
| `Associate.js` | Associate **grants** (an email promoted to associate access). |
| `AccessRequest.js` | A user's request for associate access (pending/approved/rejected). |
| `Agent.js` | A published agent (name, description, keyBenefits, techStacks, status, videoFileId, attachments, rating, …). |
| `AgentRequest.js` | A submission/idea (`type`, agentName, description, keyBenefits, attachments, repoUrl, status, `evaluation` report, `publishedAgent`). |
| `Feedback.js` | A star rating + comment for an agent. |

### Routes (`server/routes/`) — mounted in `server.js`
| Mount | File | Key endpoints (auth) | Purpose |
|---|---|---|---|
| `/api/auth` | `auth.js` | `POST /login`, `POST /register` | Sign in (Admin + registered User + built-in directory accounts; associate grant upgrades role). Register creates a `User`. |
| `/api/agents` | `agents.js` | `GET /`, `GET /:id` (public); `POST/PUT/DELETE` (admin); `GET/POST /:id/feedback` | Agent catalog CRUD (+ video upload to GridFS) and ratings/feedback. |
| `/api/videos` | `videos.js` | `GET /:id` (public) | Streams a GridFS demo video (HTTP Range/seek). |
| `/api/requests` | `requests.js` | `POST /` (any user), `GET /` (staff), `GET /attachment/:id`, `PATCH /:id` (staff), `POST /:id/publish` (admin), `DELETE /:id` (admin) | Submissions. **User → `idea`** (text only); **associate/admin → `submission`** (md/video/code → GridFS). Publish turns a submission into a live `Agent`. |
| `/api/assistant` | `assistant.js` | `POST /` (public) | Grounded chatbot: greeting, **count/analysis** (platform-wide), **single-agent analysis** ("what is/analysis of X"), and **recommendation** ("which agent for a task"). Read-only over the agent list. |
| `/api/evaluation` | `evaluation.js` | `POST /run` (admin) | Builds a spec from a request's **uploaded `.md` files** (fallback: typed fields) → calls the **ARA eval service (:8200)** → caches the readiness report on the `AgentRequest`. |
| `/api/access` | `access.js` | `GET /me`, `POST /request`, `GET /requests`, `PATCH /requests/:id`, `GET/POST/DELETE /associates` | Associate access requests + admin management of associates. |

### One-off scripts
| File | Purpose |
|---|---|
| `seed.js` | Seeds the admin account + sample agents (from `sampleAgents.js`). |
| `sampleAgents.js` | The sample agent data used by seeding. |
| `backfill.mjs` | One-time: adds key-benefits/etc. to existing sample agents. |
| `smoke-test.mjs` | Legacy end-to-end API smoke test. |

---

## 5. Frontend (`client/src/`)

### Core
| File | Role |
|---|---|
| `main.jsx` | Mounts `<App>` inside `<BrowserRouter>` + `<AuthProvider>`; imports `theme.css`. |
| `App.jsx` | Routes: `/` → **Landing**, `/login` → **AuthPage**, `/hub` → **Hub** (auth), `/admin` → **Admin** (admin only). `RequireAuth` guards redirect to `/login`. |
| `api.js` | The single fetch wrapper for **all** API calls (adds the Bearer token, handles 401 → logout). Also `videoUrl()` / `attachmentUrl()`. |
| `constants.js` | `CATEGORY_CODES`, `STAGES`, `STATUSES`, `categoryMeta()`. |
| `context/AuthContext.jsx` | Holds the logged-in `user`/`role`; `login()`, `register()`, `logout()`; persists token in localStorage; listens for `cz-unauthorized`. |
| `theme.css` | All global styles. |

### Pages (`client/src/pages/`) — the 4 routed screens
| Page | What it is | Renders / calls |
|---|---|---|
| `Landing.jsx` | Public marketing page (hero, "How it works" timeline, "The future"). | `CognizantLogo`; `api.listAgents()` for the count. |
| `AuthPage.jsx` | Sign-in / **Register** toggle. | `useAuth().login/register`. |
| `Hub.jsx` | Authenticated portal (sidebar: Dashboard / Agents / Request / Review). | `AgentGrid`, `RequestForm`, `RequestsInbox` (inline), `AgentAssistant`; `api.listAgents/listRequests/…`. |
| `Admin.jsx` | Admin console (tabs: Agents / Requests / Access). Requests tab = clickable rows → **RequestDetail modal** with the **Evaluation** panel + Approve & publish. | `AgentForm`, `AgentGrid`, `AgentAssistant`; `api.*` incl. `evaluateRequest`, `publishRequest`. |

### Components (`client/src/components/`)
| Component | Used by | Role |
|---|---|---|
| `AgentGrid.jsx` | Hub, Admin | Fetches + renders the agent card grid with search/status filters; opens `AgentModal`. |
| `AgentCard.jsx` | AgentGrid | One agent card (icon tile, status badge, tagline). |
| `AgentModal.jsx` | AgentGrid | Agent detail pop-up: video, about, benefits, tech, **ratings + feedback** (`getFeedback`/`submitFeedback`). |
| `AgentForm.jsx` | Admin | Add/edit an agent (with video upload). |
| `RequestForm.jsx` | Hub | Submit form — **role-aware** (user = idea; associate = full docs incl. md/video/code). |
| `AgentAssistant.jsx` | Hub, Admin | Floating chat widget → `POST /api/assistant`. |
| `BrandMark.jsx` | Hub/Admin sidebars | The "QE Agentic Hub" product mark. |
| `CognizantLogo.jsx` | Landing | The official Cognizant logo image (`/public/cognizant-logo.png`). |

> **Legacy / not in the current routing** (superseded by Landing + Hub): `pages/Home.jsx`, `components/Header.jsx`, `Hero.jsx`, `HeroVisual.jsx`, `Footer.jsx`. They're only referenced by the unused `Home.jsx`. Safe to ignore (or delete later).

---

## 6. Integrations (`integrations/`)

| Path | What | Sync |
|---|---|---|
| `ara/` | **git submodule** → `ahona-bar59/agent-readiness-analyzer` — the evaluation agent (LangGraph, scores an agent's `.md` docs). Unmodified upstream code. | Pinned to a commit; `sync-agents.ps1` pulls latest + restarts. |
| `eval-service/app.py` | **Our** dependency-free HTTP wrapper (:8200): `POST /evaluate {spec}` → `ara.graph.analyze()` → JSON report. | — |
| `agentbench/` | **git submodule** → `mprangshu/AgentBench` — benchmarking (FastAPI + React). **Not wired up yet** (backend needs pip packages currently blocked by the corporate network). | Same submodule pattern once enabled. |

**Evaluation call chain:** `Admin.jsx (Send for evaluation)` → `api.evaluateRequest(id)` → `POST /api/evaluation/run` → `evaluation.js` reads the request's `.md` attachments from GridFS → `POST :8200/evaluate` → `ara.analyze()` → report cached on `AgentRequest.evaluation` → shown in the RequestDetail Evaluation panel.

---

## 7. Key end-to-end flows

**Register / sign in**
`AuthPage` → `AuthContext.register/login` → `api` → `POST /api/auth/{register,login}` → `User`/`Admin` → JWT back → stored → routed to `/hub` (or `/admin`).

**Browse + rate an agent**
`Hub/Admin` → `AgentGrid` → `GET /api/agents` → cards → `AgentModal` → video via `GET /api/videos/:id`; feedback via `GET/POST /api/agents/:id/feedback`.

**Ask the assistant**
`AgentAssistant` → `POST /api/assistant` → `assistant.js` classifies intent (greeting / analysis / single-agent / recommendation) over the agent list → reply (+ agent cards for recommendations only).

**Submission → review → evaluate → publish**
1. Associate: `RequestForm` (Hub) → `POST /api/requests` (multipart, md/video/code → GridFS) → `AgentRequest` (`type: submission`).
2. Admin: `Admin.jsx` Requests tab → open row → **RequestDetail modal**.
3. **Send for evaluation** → `POST /api/evaluation/run` → ARA scores the `.md` docs → report cached + shown.
4. **Approve & publish** → `POST /api/requests/:id/publish` → creates a live `Agent`.

**Associate access**
User: `RequestAccessCard` (Hub) → `POST /api/access/request`. Admin: Access tab → `PATCH /api/access/requests/:id` (approve) → `Associate` grant → the user's next login is upgraded to `associate`.

---

## 8. Ops scripts
| Script | Does |
|---|---|
| `start-all.ps1` | Starts MongoDB, ARA eval service, hub API, hub frontend (idempotent). |
| `sync-agents.ps1` | `git submodule update --remote` for the agent submodules + restarts the eval service. |
| `start-mongo.ps1` | Starts the local portable MongoDB only. |

Secrets live in `server/.env` (git-ignored): `MONGODB_URI`, `JWT_SECRET`, `ADMIN_*`, and (optional) `EVAL_SERVICE_URL`, LLM keys.
