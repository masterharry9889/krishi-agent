# Krishi Agent (कृषि एजेंट) 🌾

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An autonomous **Multi-Agent AI Agricultural Advisory and Farm Decision Platform** designed for smallholder Indian farmers. Krishi Agent integrates real-time agronomic data, Open-Meteo weather forecasts, Agmarknet mandi market intelligence, and Groq multimodal vision models to deliver personalized, hyper-local farm decisions and disease diagnostics in regional languages.

---

## 🚀 Key Features

- **🌾 Targeted Farm Decision Engine ("Analyze My Farm")**:
  - High-performance, latency-optimized orchestration executing the 6 essential decision agents:
    1. `soil`: Soil texture, NPK balance, organic carbon, and crop suitability factors.
    2. `weather`: 7-day weather outlook, precipitation risk alerts, and temperature trends via Open-Meteo.
    3. `market_intel`: Real-time mandi modal prices, arrival volumes, and price forecasts.
    4. `crop_recommendation`: Top recommended crops with projected ROI, duration, and variety guidance.
    5. `resource_irrigation`: Tailored irrigation schedules and water resource management.
    6. `budget_estimator`: Per-acre cost breakdown, gross revenue, and estimated net profit.
- **🔬 Multimodal Crop Disease Detection & Research**:
  - Direct leaf/crop photo upload analyzed by Groq vision models (`qwen/qwen3.6-27b`).
  - Zero-overhead reasoning (`reasoning_effort="none"`) preventing token exhaustion on on-demand limits.
  - Automatically paired with **ICAR / KVK IPM Protocols**:
    - Organic/biological controls prioritized (e.g., *Trichoderma*, *Pseudomonas*, neem extracts).
    - Regulated chemical options with exact dosages, protective gear warnings, and pre-harvest intervals (PHI).
- **🏛️ Government Schemes & Subsidy Advisory**:
  - Natural-language query interface matching farmers to relevant national and state schemes (PM-KISAN, PMFBY, KCC, PM-KUSUM, Soil Health Card) based on land size, location, and crop profile.
- **🛡️ Enterprise Security & Hardening**:
  - **Password Security**: PBKDF2/bcrypt-style secure password hashing and verification.
  - **Timing-Safe Auth**: Admin and farmer credentials verified using `secrets.compare_digest`.
  - **JWT Session Protection**: Farmer and administrator sessions authenticated via role-specific JWT Bearer tokens with strict route access control.
  - **Defense-in-Depth**: Rate limiting middleware, strict input sanitization, Pydantic validation, and production HTTP security headers (CSP, HSTS, X-Frame-Options, XSS protection).
- **🗣️ Multi-Language Support**:
  - Localized advisory and diagnostic recommendations in Hindi (`hi`), Marathi (`mr`), Tamil (`ta`), and English (`en`).

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────┐
                               │       Next.js 16 Frontend Client         │
                               │  - Farmer Dashboard (/farmer/dashboard)  │
                               │  - Leaf Photo Disease Scanner            │
                               │  - Admin Console (/admin)                │
                               └────────────────────┬─────────────────────┘
                                                    │ Proxied REST API / JWT
                                                    ▼
                               ┌──────────────────────────────────────────┐
                               │         FastAPI Backend Server           │
                               │  - Auth & Security Middleware            │
                               │  - Rate Limiting & Input Sanitization    │
                               └──────────────┬───────────────────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     ▼                        ▼                        ▼
           ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
           │  MongoDB Storage  │    │ AgentOrchestrator │    │ LangGraph Engine  │
           │  - Farmers        │    │ (Fast Dashboard   │    │ (Complex Workflow │
           │  - Seasons        │    │  Analysis Flow)   │    │  & Diagnostics)   │
           │  - Feedback       │    └─────────┬─────────┘    └─────────┬─────────┘
           └───────────────────┘              │                        │
                                              ▼                        ▼
                                    ┌──────────────────┐     ┌──────────────────┐
                                    │ 6 Core Agents:   │     │ Specialized:     │
                                    │ • Soil           │     │ • Disease Detect │
                                    │ • Weather        │     │ • Disease Res.   │
                                    │ • Market Intel   │     │ • Govt Schemes   │
                                    │ • Crop Rec.      │     │ • Validation     │
                                    │ • Irrigation     │     └──────────────────┘
                                    │ • Budget         │
                                    └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons |
| **Backend** | FastAPI (Python 3.11+), LangGraph, Pydantic v2, Motor / PyMongo |
| **AI / LLM Engine** | Groq Cloud API (`openai/gpt-oss-20b` for text reasoning, `qwen/qwen3.6-27b` for multimodal vision) |
| **Data Sources** | Open-Meteo API (Weather), Agmarknet (Mandi Market Prices), ICAR / KVK IPM Knowledgebases |
| **Database** | MongoDB 6.0+ |
| **Testing** | Pytest, AnyIO, ESLint, TypeScript Compiler (`tsc`) |

---

## 📁 Repository Structure

```
krishi-agent/
├── backend/
│   ├── app/
│   │   ├── agents/                  # 15+ specialized agronomic agents
│   │   │   ├── base_agent.py        # Groq LLM & Multimodal Vision client wrapper
│   │   │   ├── disease_detection_agent.py # Vision diagnosis of crop leaves
│   │   │   ├── disease_research_agent.py  # IPM & ICAR treatment protocols
│   │   │   ├── soil_agent.py        # Soil nutrient & pH analysis
│   │   │   ├── weather_agent.py     # Open-Meteo 7-day forecast & alerts
│   │   │   ├── market_intelligence_agent.py # Mandi prices & selling windows
│   │   │   ├── crop_recommendation_agent.py # Crop selection & ROI projections
│   │   │   ├── resource_irrigation_agent.py # Water requirements & irrigation
│   │   │   ├── budget_estimator_agent.py    # Cost & revenue financial modeling
│   │   │   └── government_schemes_agent.py  # Scheme & subsidy eligibility
│   │   ├── context/                 # Farmer state persistence & history
│   │   ├── db/                      # Password hashing, JWT & MongoDB client
│   │   ├── graph/                   # LangGraph state machine, nodes & conditional router
│   │   ├── models/                  # Pydantic validation schemas & request models
│   │   └── services/
│   │       ├── agent_orchestrator.py # Targeted multi-agent orchestration
│   │       └── farmer_insight_service.py # Unified decision summary compiler
│   ├── tests/                       # Comprehensive test suites
│   ├── main.py                      # FastAPI application, middleware & routes
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── admin/                   # Admin authentication & farmer management
│   │   ├── farmer/                  # Farmer login, password setup & decision dashboard
│   │   └── page.tsx                 # Public farmer registration portal
│   ├── components/                  # Reusable UI cards (Weather, Soil, Market, Diagnosis)
│   ├── lib/                         # API client with JWT interceptors
│   ├── proxy.ts                     # Next.js route protection & security
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **MongoDB** running locally or on MongoDB Atlas (`mongodb://localhost:27017/krishi_agent`)
- **Groq API Key** ([console.groq.com](https://console.groq.com))

### 1. Environment Setup

Copy example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Configure `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/krishi_agent
MONGODB_DB_NAME=krishi_agent

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_JWT_SECRET=your-32-char-random-jwt-secret

GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=qwen/qwen3.6-27b
USE_MOCK_TOOLS=false
```

### 2. Backend Installation & Run

```bash
# From repository root
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run FastAPI with Uvicorn
python -m uvicorn backend.main:app --reload --port 8000
```

Verify backend health:
```bash
curl http://localhost:8000/health
# {"status":"ok","version":"0.1.0","mongodb":true}
```

### 3. Frontend Installation & Run

```bash
cd frontend
npm install
npm run dev -- --port 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 API Reference

### 🔐 Authentication & Onboarding
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/onboard` | Register a new farmer profile & initialize season | Public |
| `POST` | `/api/v1/farmer/login` | Farmer login via mobile number & password | Public |
| `POST` | `/api/v1/farmer/setup-password` | First-time password setup for registered farmer | Public |
| `POST` | `/api/v1/admin/login` | Administrator HTTP Basic login $\rightarrow$ returns JWT | HTTP Basic |

### 🌾 Farm Decision Platform & Agents
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/farmers/{farmer_id}/seasons/{season_id}/orchestrate` | Trigger targeted analysis ("Analyze My Farm") across core agents | Farmer JWT |
| `GET` | `/api/v1/farmers/{farmer_id}/insight` | Get aggregated decision insight cards | Farmer JWT |
| `GET` | `/api/v1/farmers/{farmer_id}/context` | Fetch farmer state, historical outputs & profile | Farmer JWT |
| `POST` | `/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/{agent}/run` | Run a specific individual agent | Farmer JWT |
| `POST` | `/api/v1/farmers/{farmer_id}/seasons/{season_id}/disease-detection` | Upload leaf image for multimodal disease diagnosis | Farmer JWT |
| `POST` | `/api/v1/farmers/{farmer_id}/seasons/{season_id}/government-schemes` | Ask question about agricultural schemes and subsidies | Farmer JWT |
| `POST` | `/api/v1/farmers/{farmer_id}/seasons/{season_id}/feedback` | Submit post-harvest farmer feedback & crop outcomes | Farmer JWT |

### 🛡️ Admin Management
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/farmers` | List all registered farmers with pagination & filters | Admin JWT |
| `GET` | `/api/v1/admin/farmers/{farmer_id}` | Retrieve complete farmer profile & season details | Admin JWT |
| `PATCH`| `/api/v1/admin/farmers/{farmer_id}` | Update farmer information | Admin JWT |
| `DELETE`| `/api/v1/admin/farmers/{farmer_id}` | Soft-deactivate a farmer record | Admin JWT |

---

## 🧪 Testing & Verification

### Running Backend Tests
Execute unit and integration test suites:
```bash
python -m pytest backend/tests/test_phase8_decision_platform.py backend/tests/test_phase12_real_farmer_ai.py backend/tests/test_phase13_security_hardening.py -v
```

### Running Frontend Verification
Verify TypeScript typing and code cleanliness:
```bash
cd frontend
npm run lint
npx tsc --noEmit
```

---

## 🔒 Security Best Practices

1. **Production Configuration**: In production (`ENVIRONMENT=production`), the application strictly mandates strong `ADMIN_JWT_SECRET` (min 32 characters) and rejects default passwords on startup.
2. **Rate Limiting**: Critical endpoints are protected by in-memory sliding-window rate limiters to defend against credential brute-forcing.
3. **No Direct DB Access**: The client browser never interfaces with MongoDB directly; all requests flow through authenticated FastAPI endpoints with CORS origin whitelisting.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
