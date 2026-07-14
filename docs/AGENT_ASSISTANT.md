# Agent Assistant — how it works & where the code is

The floating **Agent Assistant** in the portal recommends which platform agent to
use, reports how many agents exist, and gives a quick analysis. It is grounded
**entirely in this platform's own MongoDB agents** — no external service.

---

## TL;DR technology

| Concern | What it actually uses |
|---|---|
| Data source | **MongoDB** (`Agent` collection) — the same agents shown in the catalog |
| Backend | **Node.js + Express** route (`POST /api/assistant`) |
| Matching | **Deterministic keyword scoring** in plain JavaScript (no ML) |
| Vector DB | **None** — no ChromaDB, no embeddings |
| LLM | **None** — no Gemini/OpenAI/Anthropic calls, no API key needed |
| Frontend | **React** floating chat widget, calls the API via the `/api` proxy |

> **About Chroma:** ChromaDB was used by the separate **Dispatch** repo
> (`dispatch/`, Python + FastAPI + Chroma RAG) that was integrated first. Once the
> Assistant was re-pointed at the platform's own database, Dispatch was **stopped
> and disconnected**. It is no longer part of the running app. Nothing in the live
> Assistant uses Chroma, embeddings, or an LLM.

---

## Where the code lives

| File | Role |
|---|---|
| [`server/routes/assistant.js`](../server/routes/assistant.js) | **The Assistant logic** — intents, keyword scoring, analysis |
| [`server/server.js`](../server/server.js) | Registers the route: `app.use('/api/assistant', assistantRoutes)` |
| [`server/models/Agent.js`](../server/models/Agent.js) | The `Agent` schema it reads (name, tagline, techStacks, industry, …) |
| [`client/src/components/AgentAssistant.jsx`](../client/src/components/AgentAssistant.jsx) | The floating chat **widget** (UI + calls the API) |
| [`client/src/api.js`](../client/src/api.js) | `api.askAssistant(message)` → `POST /api/assistant` |
| [`client/src/theme.css`](../client/src/theme.css) | Widget styles (all `.asst-*` classes) |

The widget is mounted in both portals:
[`client/src/pages/Hub.jsx`](../client/src/pages/Hub.jsx) and
[`client/src/pages/Admin.jsx`](../client/src/pages/Admin.jsx) (`<AgentAssistant />`).

---

## The API

`POST /api/assistant` — public (reads the same agents the public catalog exposes).

Request:
```json
{ "message": "which agent generates test cases?" }
```

Response:
```json
{
  "reply": "Yes — for that, use Test Case Design Agent.",
  "matches": [
    { "id": "…", "name": "Test Case Design Agent", "tagline": "…",
      "stage": "Prototype", "status": "Upcoming", "techStacks": [],
      "rating": 0, "ratingCount": 0, "smeEmail": "", "icon": "🤖" }
  ],
  "meta": { "total": 4, "found": true }
}
```

`matches` are real agent records the widget renders as cards.

---

## How it decides what to answer

All logic is in `server/routes/assistant.js`. On each message it loads all agents
(`Agent.find()`) and picks one of four intents:

1. **Greeting / help** (`hi`, `help`, …) → says how many agents exist and what it can do.
2. **Count / analysis** (matches a regex: `how many`, `total`, `analysis`,
   `overview`, `breakdown`, …) → returns totals plus a breakdown by **status**,
   **stage**, **industry**, and the **top-rated** agents.
3. **Recommendation / existence** (default) → scores every agent against the query
   keywords and returns the best matches (or a "not found → request one" message).
4. **Empty / unclear** → asks the user to describe the task.

### Keyword scoring (the "matching")

The query is tokenized, stopwords are dropped, and each agent gets a score by how
many query words appear in its fields — weighted so the most identifying fields
count most:

| Field | Weight |
|---|---|
| `name` | 6 |
| `tagline` | 4 |
| `techStacks` | 3 |
| `industry` | 3 |
| `description` | 2 |
| `keyBenefits` | 1 |

Agents scoring `> 0` are sorted; the top result plus any within 60% of its score
(max 3) are returned as `matches`. If nothing scores, it tells the user to submit a
request under **Request an agent**.

Because it's deterministic, results are consistent, need no API keys, run offline,
and always reflect the **live database** — as admins add/remove agents, the counts,
analysis, and recommendations update automatically.

---

## If you want smarter/natural answers later

The current design keeps the **database as the source of truth**. To add nicer
phrasing or fuzzy understanding without losing that, options are:

- **LLM layer:** send the matched agents + the question to an LLM (Claude/Gemini)
  to write the reply prose. The DB still decides *which* agents; the LLM only
  phrases the answer. (Requires an API key + a call in `assistant.js`.)
- **Embeddings/semantic search:** generate embeddings for each agent and match by
  vector similarity (this is where a store like Chroma or `pgvector` would come in)
  — better for vague wording, at the cost of an embedding model + index to maintain.

Neither is wired in today; the keyword approach is what runs.
