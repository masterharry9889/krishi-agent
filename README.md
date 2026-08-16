# Krishi Agent

A simple, production-ready farmer registration system with MongoDB backend and admin dashboard.

## Architecture

```
Farmer on website
       ↓
   Registration Form  →  POST /api/v1/onboard
       ↓
    FastAPI Backend   →  MongoDB (farmers collection)
       ↓
Admin Dashboard at /admin  (authenticated via JWT)
```

The multi-agent AI pipeline (LangGraph, LLM agents) remains in the repository as
**future development** but is **NOT** used by the registration flow. Registration
works with zero LLM/Groq/Anthropic calls.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14, React 19, TypeScript, Tailwind CSS v4 |
| Backend   | FastAPI (Python 3.14), PyMongo (sync), JWT auth |
| Database  | MongoDB (async via Motor / sync via PyMongo) |
| Admin Auth| HTTP Basic → JWT bearer token       |
| Dev tooling| pytest, ESLint, TypeScript compiler |

## Quick Start

### Prerequisites
- Python 3.14+
- Node.js 20+
- MongoDB running locally (default: `mongodb://localhost:27017/krishi_agent`)

### 1. Backend

```bash
cd ~/krishi-agent
source venv/bin/activate
# Install deps
pip install -r backend/requirements.txt
# Start server
python3 -m uvicorn backend.main:app --reload --port 8000
# Health check
curl http://localhost:8000/health
```

### 2. Frontend

```bash
cd ~/krishi-agent/frontend
npm install
npm run dev -- --port 3000
```

### 3. Environment

Copy the example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set the admin credentials in `backend/.env`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Kr1sh1@Admin2024
ADMIN_JWT_SECRET=your-secret-key-change-in-production
```

## API Endpoints

### Farmer Registration

```
POST /api/v1/onboard
```

**Request body:**
```json
{
  "name": "Ramesh Patil",
  "phone": "9876543210",
  "district": "Nashik",
  "language": "hi"
}
```

**Response (`200 OK`):**
```json
{
  "farmer_id": "79ed94c9-a5c4-4016-82fd-4c9b17ca91e3",
  "season_id": "e46521ab-0d23-46d8-937e-eaba1cf61d57",
  "status": "registered"
}
```

**Error responses:**
- `409 Conflict` — phone number already registered
- `422 Unprocessable Entity` — validation error
- `503 Service Unavailable` — MongoDB unavailable

### Admin Authentication

```
POST /api/v1/admin/login
```

Uses HTTP Basic auth (`admin:password`). Returns a JWT bearer token.

```bash
curl -u admin:Kr1sh1@Admin2024 -X POST http://localhost:8000/api/v1/admin/login
```

### Admin Farmer Management

All admin endpoints require `Authorization: Bearer <JWT>` header.

| Method   | Endpoint                           | Description                        |
|----------|------------------------------------|------------------------------------|
| GET      | `/api/v1/admin/farmers`            | List all farmers (with filters)     |
| GET      | `/api/v1/admin/farmers/{farmer_id}`| Get farmer details                  |
| PATCH    | `/api/v1/admin/farmers/{farmer_id}`| Update farmer info                  |
| DELETE   | `/api/v1/admin/farmers/{farmer_id}`| Deactivate farmer (soft delete)     |

**List query parameters:** `skip`, `limit`, `district`, `language`, `search`

### Health Check

```
GET /health
```

Returns `{"status": "ok", "version": "0.1.0", "mongodb": true/false}`.

## Frontend

### Registration Page (`/`)

The homepage contains the farmer registration form. After successful submission,
the farmer sees their `farmer_id` and `season_id` as confirmation.

### Admin Dashboard (`/admin`)

- `/admin/login` — admin login form (sends HTTP Basic credentials)
- `/admin` — farmer list with search, district, and language filters
- Unauthenticated users are redirected to `/admin/login`

The admin JWT token is stored in `localStorage` under the key `admin_token`.

The browser connects only to the Next.js frontend (port 3000). All API requests
are proxied through Next.js rewrites to the FastAPI backend (port 8000). MongoDB
is never directly accessible from the browser.

## MongoDB Schema

Collection: `farmers`

```
{
  _id: ObjectId,
  farmer_id: "uuid-string",     # unique index
  season_id: "uuid-string",
  name: "Ramesh Patil",
  phone: "9876543210",          # unique index
  district: "Nashik",
  language: "hi",               # default: "hi" (Hindi)
  status: "registered",         # or "deactivated"
  created_at: "ISO timestamp",
  updated_at: "ISO timestamp"
}
```

Indexes: `farmer_id` (unique), `phone` (unique), `created_at`, `district`, `language`.

## Testing

### Backend Tests

```bash
cd ~/krishi-agent
source venv/bin/activate
python3 -m pytest backend/tests/ -v
```

**51 tests pass, 1 skipped** (the skipped test is the old LangGraph pipeline test
that requires a GROQ_API_KEY — it is NOT needed for the registration flow).

### Frontend Checks

```bash
cd ~/krishi-agent/frontend
npx tsc --noEmit   # TypeScript type checking
npx eslint .       # Linting
```

## Security

- MongoDB URI and credentials are in `backend/.env` (never exposed to frontend)
- Admin credentials are in `backend/.env` (not in frontend source code)
- Admin endpoints require JWT bearer token (403 if missing/invalid)
- Admin password verified with `secrets.compare_digest` (timing-safe)
- Farmer records are not accessible without authentication
- No public `/farmer/{id}` endpoint exists
- CORS is restricted to known frontend origins
- Input validation on both frontend and backend (backend is authoritative)
- Sensitive data (MongoDB credentials) is never logged

## Unused Code (Reserved for Future AI Pipeline)

The following code remains in the repository but is **not invoked** by the
registration flow:

```
backend/app/agents/          — 15 agents (5 LLM + 10 stub)
  ├── farmer_interface_agent.py
  ├── soil_agent.py
  ├── weather_agent.py
  ├── market_intelligence_agent.py
  ├── crop_recommendation_agent.py
  ├── pest_disease_agent.py
  ├── irrigation_agent.py
  ├── monitoring_agent.py
  ├── advisory_agent.py
  ├── storage_selltiming_agent.py
  ├── feedback_agent.py
  ├── credit_agent.py
  ├── yield_prediction_agent.py
  ├── market_linkage_agent.py
  └── seasonal_planning_agent.py

backend/app/graph/           — LangGraph pipeline
  ├── build_graph.py         — 8-phase workflow builder
  ├── router.py              — Phase router
  ├── state.py               — FarmerState TypedDict (23+ keys)
  └── nodes/                 — 23 node files

backend/app/memory/
  └── checkpointer.py        — MemorySaver checkpointer
```

These can be wired up as Phase 2 (AI advisory for registered farmers).
