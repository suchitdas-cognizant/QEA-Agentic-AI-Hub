# Cognizant — Agent Dashboard

A MERN dashboard that showcases the AI agents available in the system. Visitors can
browse agents, open one to see its **description, tech stack and a demo video**, rate
it, and submit a request for a new agent. Admins sign in to **add agents, upload demo
videos, and review requests**.

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | React 18 + Vite + React Router               |
| Backend  | Node.js + Express                            |
| Database | MongoDB (Mongoose)                           |
| Videos   | **MongoDB GridFS** (uploaded & streamed)     |
| Auth     | Admin login with JWT (bcrypt-hashed password)|

---

## Project structure

```
agent-dashboard/
├── server/                 # Express API + MongoDB + GridFS
│   ├── config/db.js        # Mongo connection + GridFS bucket
│   ├── models/             # Agent, Admin, AgentRequest
│   ├── routes/             # auth, agents, videos, requests
│   ├── middleware/auth.js  # JWT guard for admin endpoints
│   ├── utils/gridfs.js     # upload / delete / lookup helpers
│   ├── seed.js             # creates admin + sample agents
│   └── server.js           # entry point
└── client/                 # React + Vite frontend
    └── src/
        ├── components/     # Header, Hero, AgentCard, AgentModal, Footer, ...
        ├── pages/          # Home, Admin
        ├── context/        # AuthContext (admin session)
        └── api.js          # fetch wrapper for the API
```

---

## ▶ Quick start on THIS machine (already set up)

A portable MongoDB 8.0.26 was installed at `%USERPROFILE%\mongodb` because the
corporate network blocks cloud MongoDB (Atlas) connections. `server/.env` points at
the local server. To run everything after a reboot, open **three terminals**:

```powershell
# 1) Database  (leave running)
powershell -ExecutionPolicy Bypass -File start-mongo.ps1

# 2) API
cd server
npm run dev

# 3) Frontend
cd client
npm run dev
```

### Agent Assistant chatbot (Dispatch)

The portal's floating **Agent Assistant** recommends which agent to use. It is
backed by the separate **Dispatch** service (FastAPI, in `../dispatch/agent-recommender`).
Vite proxies `/dispatch/*` to it on port 8000. To run it (a 4th terminal):

```powershell
cd ..\dispatch\agent-recommender
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py index                 # build the vector index (first run only)
uvicorn api:app --port 8000         # leave running
```

It works fully offline (deterministic recommendations). For LLM-written prose,
copy `.env.example` to `.env` and set `GEMINI_API_KEY`. If the service is down,
the Assistant shows a friendly "couldn't reach the recommender" message.

Then open **http://localhost:5173**. Admin console: **http://localhost:5173/admin**
(login `admin` / `admin123`). You can also point **MongoDB Compass** at
`mongodb://127.0.0.1:27017` to browse the data.

> The database only needs seeding once (already done). Re-run `cd server && npm run seed`
> only if you wipe the data folder.

---

## Prerequisites

- **Node.js 18+** (tested on v22)
- **MongoDB** — either:
  - a local install running on `mongodb://localhost:27017`, **or**
  - a free **MongoDB Atlas** cluster (use its `mongodb+srv://…` connection string)

---

## 1. Backend setup

```bash
cd server
npm install
```

Copy the env template and adjust if needed:

```bash
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

Key variables in `server/.env`:

| Variable         | Purpose                                            | Default                                    |
|------------------|----------------------------------------------------|--------------------------------------------|
| `MONGODB_URI`    | MongoDB connection string                          | `mongodb://localhost:27017/cognizant_agents` |
| `PORT`           | API port                                           | `5000`                                     |
| `JWT_SECRET`     | Secret for signing admin tokens (**change this!**) | dev value                                  |
| `QUERIES_EMAIL`  | Email shown in the footer for queries              | `agent-dashboard-queries@cognizant.com`    |
| `CLIENT_ORIGIN`  | Allowed CORS origin (Vite dev server)              | `http://localhost:5173`                    |

Seed the database (creates the admin account + sample agents):

```bash
npm run seed
```

Start the API:

```bash
npm run dev      # auto-restart on change
# or: npm start
```

The API runs at **http://localhost:5000**.

---

## 2. Frontend setup

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend,
so no extra config is needed.

---

## Using the app

- **Dashboard (`/`)** — browse agents, search/filter by category & stage, click a card
  to open the detail drawer (description, tech stack, demo video, star rating, Connect SME).
- **Request form (footer)** — anyone can request a new agent; submissions are stored in
  MongoDB and appear in the admin console. The footer also shows the queries email.
- **Admin (`/admin`)** — sign in with the seeded credentials (`admin` / `admin123`):
  - **Agents tab** — add / edit / delete agents and **upload demo videos** (stored in GridFS)
    or paste an external video URL (YouTube, etc.).
  - **Requests tab** — review submitted requests and update their status.

---

## API reference (summary)

| Method | Endpoint                 | Auth   | Description                          |
|--------|--------------------------|--------|--------------------------------------|
| GET    | `/api/config`            | –      | Categories, stages, queries email    |
| GET    | `/api/agents`            | –      | List agents (`?q=&category=&stage=`)  |
| GET    | `/api/agents/:id`        | –      | Single agent                          |
| POST   | `/api/agents/:id/rate`   | –      | Submit a 1–5 star rating              |
| POST   | `/api/requests`          | –      | Submit a "new agent" request          |
| GET    | `/api/videos/:id`        | –      | Stream a GridFS video (Range support) |
| POST   | `/api/auth/login`        | –      | Admin login → JWT                     |
| POST   | `/api/agents`            | admin  | Create agent (multipart + video)      |
| PUT    | `/api/agents/:id`        | admin  | Update agent (multipart + video)      |
| DELETE | `/api/agents/:id`        | admin  | Delete agent (+ its video)            |
| GET    | `/api/requests`          | admin  | List all requests                     |
| PATCH  | `/api/requests/:id`      | admin  | Update request status                 |
| DELETE | `/api/requests/:id`      | admin  | Delete a request                      |

---

## Notes & next steps

- Videos are capped at **200 MB** per upload (`server/routes/agents.js`).
- For production: set a strong `JWT_SECRET`, change the admin password, and consider
  serving the built frontend (`client/npm run build`) from Express or a CDN.
- Email-on-request was intentionally left out per the chosen setup (requests are stored
  in the DB and reviewed in the admin console). SMTP can be added later in `routes/requests.js`.
