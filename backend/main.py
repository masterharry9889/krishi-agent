"""
Krishi Agent — Simplified Production Backend
=============================================
Farmer registration → MongoDB → Admin dashboard
"""
import os
import sys
import uuid
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Any

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from jose import jwt, JWTError
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, field_validator

# Ensure repository root is in sys.path so 'backend' module imports resolve correctly
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.models import (
    OnboardRequest,
    OnboardResponse,
    FarmerLoginRequest,
    FarmerLoginResponse,
    FarmerSetupPasswordRequest,
    OrchestrateRequest,
    FarmerFeedbackRequest,
    FarmerFeedbackResponse,
)
from backend.app.db import FarmerService, FarmerInDB

# ─── Logging Setup ───────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("krishi_agent")

# ─── Config ──────────────────────────────────────────────────────
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/krishi_agent")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "krishi_agent")
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme123")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "")
SECRET_KEY = os.environ.get("ADMIN_JWT_SECRET", "dev-secret-key-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
ENABLE_DOCS = os.environ.get("ENABLE_DOCS", "false").lower() in ("true", "1")

# ─── MongoDB client & service (module-level for testability) ─────
from pymongo import MongoClient
mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
farmer_service = FarmerService(mongo_client[MONGODB_DB_NAME])

# ─── App Configuration ───────────────────────────────────────────
docs_url = "/docs" if ENVIRONMENT != "production" or ENABLE_DOCS else None
redoc_url = "/redoc" if ENVIRONMENT != "production" or ENABLE_DOCS else None
openapi_url = "/openapi.json" if ENVIRONMENT != "production" or ENABLE_DOCS else None

app = FastAPI(
    title="Krishi Agent API",
    description="Farmer registration system with MongoDB storage and admin dashboard.",
    version="0.1.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# ─── Security Headers Middleware ─────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─── Rate Limiting Middleware for Sensitive Auth Routes ─────────
import time
from collections import defaultdict
from fastapi.responses import JSONResponse

_RATE_LIMIT_BUCKET: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_PATHS = {
    "/api/v1/farmer/login",
    "/api/v1/admin/login",
    "/api/v1/onboard",
    "/api/v1/farmer/setup-password",
}
_MAX_REQUESTS_PER_MINUTE = 20

@app.middleware("http")
async def rate_limit_auth_endpoints(request: Request, call_next):
    path = request.url.path
    if path in _RATE_LIMIT_PATHS and request.method == "POST":
        client_ip = request.client.host if request.client else "unknown"
        # Skip throttling for test client during automated test runs
        if client_ip != "testclient":
            now = time.time()
            key = f"{client_ip}:{path}"
            timestamps = [t for t in _RATE_LIMIT_BUCKET[key] if now - t < 60]
            if len(timestamps) >= _MAX_REQUESTS_PER_MINUTE:
                logger.warning(f"[RATE LIMIT] Blocked {client_ip} on {path}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Too many requests. Please wait a minute before trying again."},
                    headers={"Retry-After": "60"},
                )
            timestamps.append(now)
            _RATE_LIMIT_BUCKET[key] = timestamps

    return await call_next(request)

# CORS — only allow trusted frontend origins
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://krishiagent.in",
    "https://www.krishiagent.in",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def get_farmer_service() -> FarmerService:
    return farmer_service


def _safe_error_detail(action_name: str, exc: Exception) -> str:
    if ENVIRONMENT == "production":
        return f"{action_name} failed. An internal server error occurred. Please contact support."
    return f"{action_name} failed: {exc}"


# ─── Token helpers ───────────────────────────────────────────────
security = HTTPBasic()


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_farmer_token(farmer_id: str, season_id: str) -> str:
    to_encode = {
        "sub": farmer_id,
        "farmer_id": farmer_id,
        "season_id": season_id,
        "role": "farmer",
    }
    return create_access_token(to_encode)


def verify_admin_credentials(credentials: HTTPBasicCredentials) -> bool:
    user_ok = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    if ADMIN_PASSWORD_HASH:
        pass_ok = verify_password(credentials.password, ADMIN_PASSWORD_HASH)
    else:
        pass_ok = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    return user_ok and pass_ok


def get_bearer_token(request: Request) -> str:
    auth: str = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid Authorization header",
        )
    return auth[7:]


async def get_admin_user(request: Request) -> dict:
    token = get_bearer_token(request)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
        if not username or not secrets.compare_digest(username, ADMIN_USERNAME):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        return {"username": username}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired token",
        )


def get_current_farmer(request: Request) -> dict:
    """Validate farmer bearer token or cookie. Required for protected farmer routes."""
    auth: str = request.headers.get("Authorization", "")
    token = ""
    if auth.startswith("Bearer "):
        token = auth[7:]
    else:
        token = request.cookies.get("farmer_token", "")

    if not token:
        # If no token provided in request, raise 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Farmer login required. Please log in with your registered mobile number.",
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        farmer_id = payload.get("farmer_id") or payload.get("sub")
        season_id = payload.get("season_id")
        if not farmer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid farmer session token.",
            )
        return {
            "farmer_id": farmer_id,
            "season_id": season_id,
            "role": payload.get("role", "farmer"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired farmer session token.",
        )


@app.on_event("startup")
def startup_db():
    """Create MongoDB indexes and enforce production security configuration."""
    if ENVIRONMENT == "production":
        if SECRET_KEY == "dev-secret-key-change-me" or len(SECRET_KEY) < 32:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: In production, ADMIN_JWT_SECRET "
                "must be set to a strong random key (minimum 32 characters). Refusing to start."
            )
        if (not ADMIN_PASSWORD_HASH) and ADMIN_PASSWORD == "changeme123":
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: Default ADMIN_PASSWORD ('changeme123') "
                "cannot be used in production. Set ADMIN_PASSWORD_HASH or a secure ADMIN_PASSWORD."
            )
    try:
        farmer_service.create_indexes()
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.warning("Could not connect to MongoDB on startup (%s). App will start in degraded mode.", e)


# ─── Admin login (HTTP Basic → JWT) ─────────────────────────────
@app.post("/api/v1/admin/login", tags=["admin"])
def admin_login(credentials: HTTPBasicCredentials = Depends(security)) -> dict:
    """Authenticate admin via HTTP Basic auth and return a JWT bearer token."""
    if not verify_admin_credentials(credentials):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic"},
            detail="Invalid credentials",
        )
    token = create_access_token({"sub": credentials.username})
    return {"access_token": token, "token_type": "bearer"}


# ─── Health check ────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
def health():
    """Check backend health and MongoDB connectivity."""
    mongo_ok = True
    try:
        mongo_client.admin.command("ping")
    except Exception:
        mongo_ok = False
    return {
        "status": "ok" if mongo_ok else "degraded",
        "version": "0.1.0",
        "mongodb": mongo_ok,
    }


# ─── Farmer login (phone + password → JWT session) ─────────────────
from backend.app.models import FarmerLoginRequest, FarmerLoginResponse, FarmerSetupPasswordRequest
from backend.app.db import hash_password, verify_password


@app.post("/api/v1/farmer/login", tags=["farmer"], response_model=FarmerLoginResponse)
def farmer_login(
    payload: FarmerLoginRequest,
    fs: FarmerService = Depends(get_farmer_service),
) -> FarmerLoginResponse:
    """Authenticate returning farmer by mobile number and password."""
    if not payload.password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password is required.",
        )

    doc = fs.get_by_phone(payload.phone, sanitize=False)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password.",
        )

    stored_hash = doc.get("password_hash")
    if not stored_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password setup required for this account. Please set up a password before logging in.",
        )

    if not verify_password(payload.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password.",
        )

    token = create_farmer_token(doc["farmer_id"], doc["season_id"])
    logger.info(f"[FARMER LOGIN SUCCESS] phone={payload.phone} | farmer_id={doc['farmer_id']}")
    return FarmerLoginResponse(
        access_token=token,
        token_type="bearer",
        farmer_id=doc["farmer_id"],
        season_id=doc["season_id"],
        name=doc["name"],
        district=doc["district"],
        language=doc.get("language", "hi"),
    )


@app.post("/api/v1/farmer/setup-password", tags=["farmer"], response_model=FarmerLoginResponse)
def setup_farmer_password(
    payload: FarmerSetupPasswordRequest,
    fs: FarmerService = Depends(get_farmer_service),
) -> FarmerLoginResponse:
    """Set up or reset a password for an existing registered farmer account."""
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long.",
        )
    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password and Confirm Password do not match.",
        )

    doc = fs.get_by_phone(payload.phone, sanitize=False)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered farmer profile found for this mobile number.",
        )

    # Prevent account takeover: if a password already exists, require the old password
    if doc.get("password_hash"):
        if not payload.old_password or not verify_password(payload.old_password, doc["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account already has a password. Current password (old_password) is required to update it.",
            )

    pwd_hash = hash_password(payload.password)
    fs.update_farmer(doc["farmer_id"], {"password_hash": pwd_hash})
    token = create_farmer_token(doc["farmer_id"], doc["season_id"])

    logger.info(f"[PASSWORD SETUP SUCCESS] phone={payload.phone} | farmer_id={doc['farmer_id']}")
    return FarmerLoginResponse(
        access_token=token,
        token_type="bearer",
        farmer_id=doc["farmer_id"],
        season_id=doc["season_id"],
        name=doc["name"],
        district=doc["district"],
        language=doc.get("language", "hi"),
    )


# ─── Farmer registration (no LLM, no LangGraph) ───────────────────
@app.post("/api/v1/onboard", tags=["farmer"], response_model=OnboardResponse)
def onboard_farmer(
    payload: OnboardRequest,
    fs: FarmerService = Depends(get_farmer_service),
) -> OnboardResponse:
    """Register a new farmer in MongoDB with hashed password and issue session token."""
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long.",
        )

    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password and Confirm Password do not match.",
        )

    try:
        existing = fs.get_by_phone(payload.phone)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this phone number already exists.",
            )

        pwd_hash = hash_password(payload.password)

        farmer = FarmerInDB(
            name=payload.name,
            phone=payload.phone,
            district=payload.district,
            language=payload.language,
            status="registered",
            password_hash=pwd_hash,
        )
        fs.create_farmer(farmer)
        token = create_farmer_token(farmer.farmer_id, farmer.season_id)

        logger.info(f"[ONBOARD SUCCESS] farmer_id={farmer.farmer_id} | season_id={farmer.season_id} | district={farmer.district}")

        return OnboardResponse(
            farmer_id=farmer.farmer_id,
            season_id=farmer.season_id,
            status="registered",
            access_token=token,
            token_type="bearer",
        )
    except HTTPException:
        raise
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this phone number already exists.",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration is temporarily unavailable. Please try again later.",
        )


# ─── Admin farmer management API ─────────────────────────────────
class FarmerListItem(BaseModel):
    farmer_id: str
    season_id: str
    name: str
    phone: str
    district: str
    language: str
    status: str
    created_at: str
    updated_at: str


class ListResponse(BaseModel):
    farmers: list[FarmerListItem]
    total: int


def _format_dt(dt) -> str:
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _doc_to_list_item(d: dict) -> FarmerListItem:
    return FarmerListItem(
        farmer_id=d["farmer_id"],
        season_id=d["season_id"],
        name=d["name"],
        phone=d["phone"],
        district=d["district"],
        language=d["language"],
        status=d.get("status", "registered"),
        created_at=_format_dt(d["created_at"]),
        updated_at=_format_dt(d["updated_at"]),
    )


@app.get("/api/v1/admin/farmers", tags=["admin"], response_model=ListResponse)
def list_farmers(
    skip: int = 0,
    limit: int = 100,
    district: Optional[str] = None,
    language: Optional[str] = None,
    search: Optional[str] = None,
    _: dict = Depends(get_admin_user),
    fs: FarmerService = Depends(get_farmer_service),
):
    docs = fs.get_all(
        skip=skip, limit=limit, district=district, language=language, search=search
    )
    farmers = [_doc_to_list_item(d) for d in docs]
    return ListResponse(farmers=farmers, total=len(farmers))


@app.get("/api/v1/admin/farmers/{farmer_id}", tags=["admin"], response_model=FarmerListItem)
def get_farmer(
    farmer_id: str,
    _: dict = Depends(get_admin_user),
    fs: FarmerService = Depends(get_farmer_service),
):
    doc = fs.get_by_farmer_id(farmer_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return _doc_to_list_item(doc)


class FarmerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    district: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if "<" in v or ">" in v:
                raise ValueError("Name must not contain HTML or angle brackets.")
        return v

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if "<" in v or ">" in v:
                raise ValueError("District must not contain HTML or angle brackets.")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not re.match(r"^\+?[0-9]{10,15}$", v):
                raise ValueError("Phone number must contain 10-15 digits with optional leading +.")
        return v

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            supported = {"hi", "mr", "ta", "pa", "te", "kn", "gu", "bn", "en"}
            if v not in supported:
                raise ValueError(f"Unsupported language '{v}'.")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().lower()
            allowed = {"registered", "active", "deactivated"}
            if v not in allowed:
                raise ValueError(f"Invalid status '{v}'. Allowed: {allowed}")
        return v


@app.patch("/api/v1/admin/farmers/{farmer_id}", tags=["admin"], response_model=FarmerListItem)
def update_farmer(
    farmer_id: str,
    updates: FarmerUpdate,
    _: dict = Depends(get_admin_user),
    fs: FarmerService = Depends(get_farmer_service),
):
    result = fs.update_farmer(farmer_id, updates.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return _doc_to_list_item(result)


@app.delete("/api/v1/admin/farmers/{farmer_id}", tags=["admin"])
def delete_farmer(
    farmer_id: str,
    _: dict = Depends(get_admin_user),
    fs: FarmerService = Depends(get_farmer_service),
):
    success = fs.delete_farmer(farmer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return {"detail": f"Farmer {farmer_id} deactivated"}


# ─── Shared context retrieval ────────────────────────────────────
from backend.app.context import FarmerContext


class ContextResponse(BaseModel):
    farmer_id: str
    season_id: str
    profile: dict
    phase: str = "onboarding"
    agent_outputs: list = []


@app.get(
    "/api/v1/farmers/{farmer_id}/context",
    tags=["farmer"],
    response_model=ContextResponse,
)
def get_farmer_context(
    farmer_id: str,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot access another farmer's data.")
    """Retrieve the full shared farmer context (profile + agent outputs).

    Used by AI agents to load the registered farmer's state before
    running their analysis. Returns the farmer profile, current
    pipeline phase, and any previously persisted agent outputs.
    """
    doc = fs.get_by_farmer_id(farmer_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Farmer '{farmer_id}' not found")
    return ContextResponse(
        farmer_id=doc["farmer_id"],
        season_id=doc["season_id"],
        profile={
            "name": doc.get("name", ""),
            "phone": doc.get("phone", ""),
            "location": doc.get("district", "India"),
            "district": doc.get("district", ""),
            "language": doc.get("language", "hi"),
            "land_size": doc.get("land_size", 1.0),
            "water_source": doc.get("water_source", "rainfed"),
            "past_crops": doc.get("past_crops", []),
            "budget": doc.get("budget", 0.0),
            "notes": doc.get("notes", ""),
        },
        phase=doc.get("phase", "onboarding"),
        agent_outputs=doc.get("agent_outputs", []),
    )


@app.get(
    "/api/v1/farmers/context",
    tags=["farmer"],
    response_model=ContextResponse,
)
def get_farmer_context_by_season(
    season_id: str,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """Retrieve farmer context by season_id."""
    if current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot access another farmer's season context.")
    doc = fs.get_by_season_id(season_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Farmer not found for season_id '{season_id}'")
    return ContextResponse(
        farmer_id=doc["farmer_id"],
        season_id=doc["season_id"],
        profile={
            "name": doc.get("name", ""),
            "phone": doc.get("phone", ""),
            "location": doc.get("district", "India"),
            "district": doc.get("district", ""),
            "language": doc.get("language", "hi"),
            "land_size": doc.get("land_size", 1.0),
            "water_source": doc.get("water_source", "rainfed"),
            "past_crops": doc.get("past_crops", []),
            "budget": doc.get("budget", 0.0),
            "notes": doc.get("notes", ""),
        },
        phase=doc.get("phase", "onboarding"),
        agent_outputs=doc.get("agent_outputs", []),
    )


# ─── Agent Execution ─────────────────────────────────────────────
from backend.app.agents.registry import (
    AGENT_REGISTRY,
    resolve_agent_key,
    check_dependencies_met,
)
from backend.app.agents.soil_agent import SoilAgent
from backend.app.agents.weather_agent import WeatherAgent
from backend.app.agents.crop_recommendation_agent import CropRecommendationAgent
from backend.app.agents.market_intelligence_agent import MarketIntelligenceAgent
from backend.app.agents.resource_irrigation_agent import ResourceIrrigationAgent
from backend.app.agents.budget_estimator_agent import BudgetEstimatorAgent
from backend.app.agents.input_verification_agent import InputVerificationAgent
from backend.app.agents.scheme_insurance_agent import SchemeInsuranceAgent
from backend.app.agents.credit_agent import CreditAgent
from backend.app.agents.crop_monitoring_agent import CropMonitoringAgent
from backend.app.agents.advisory_agent import AdvisoryAgent
from backend.app.agents.storage_selltiming_agent import StorageSellTimingAgent
from backend.app.agents.direct_market_linkage_agent import DirectMarketLinkageAgent
from backend.app.agents.feedback_agent import FeedbackAgent
from backend.app.agents.validation_agent import ValidationAgent
from backend.app.agents.disease_detection_agent import DiseaseDetectionAgent
from backend.app.agents.disease_research_agent import DiseaseResearchAgent
from backend.app.agents.government_schemes_agent import GovernmentSchemesAgent

# Registry of instantiated agents (all use mock tools by default; no heavy init).
AGENT_INSTANCES = {
    "soil": SoilAgent(),
    "weather": WeatherAgent(),
    "crop_recommendation": CropRecommendationAgent(),
    "market_intelligence": MarketIntelligenceAgent(),
    "irrigation": ResourceIrrigationAgent(),
    "budget_estimator": BudgetEstimatorAgent(),
    "input_verification": InputVerificationAgent(),
    "scheme_insurance": SchemeInsuranceAgent(),
    "credit": CreditAgent(),
    "crop_monitoring": CropMonitoringAgent(),
    "advisory": AdvisoryAgent(),
    "storage_sell_timing": StorageSellTimingAgent(),
    "market_linkage": DirectMarketLinkageAgent(),
    "feedback": FeedbackAgent(),
    "validation": ValidationAgent(),
    "disease_detection": DiseaseDetectionAgent(),
    "disease_research": DiseaseResearchAgent(),
    "government_schemes": GovernmentSchemesAgent(),
}


class AgentRunResponse(BaseModel):
    agent: str
    status: str          # "success" | "coming_soon" | "error" | "blocked"
    output: Any = {}
    message: str = ""
    timestamp: str


@app.get(
    "/api/v1/agents",
    tags=["agents"],
    response_model=dict,
)
def list_agents():
    """Return the centralized agent registry.

    Each entry includes: display_name, description, implemented, phase,
    dependencies, icon_category, and aliases.
    """
    return {agent.key: agent.to_dict() for agent in AGENT_REGISTRY}


@app.get(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/status",
    tags=["agents"],
)
def get_agent_statuses(
    farmer_id: str,
    season_id: str,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """Return the status of every agent for a given farmer+season.

    Reads persisted agent_outputs from MongoDB to determine which agents
    have already been run successfully.  Returns a dict keyed by agent
    key with status and a short message.
    """
    # Authorization: farmer must access only their own data
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only view your own farm data.",
        )
    # Validate farmer + season (same security as run_agent)
    farmer_doc = fs.get_by_farmer_id(farmer_id)
    if farmer_doc is None:
        raise HTTPException(status_code=404, detail=f"Farmer '{farmer_id}' not found.")
    season_doc = fs.get_by_season_id(season_id)
    if season_doc is None:
        raise HTTPException(status_code=404, detail=f"Season '{season_id}' not found.")
    if season_doc["farmer_id"] != farmer_id:
        raise HTTPException(
            status_code=403,
            detail=f"Season '{season_id}' does not belong to farmer '{farmer_id}'.",
        )

    completed_agents = {
        entry.get("agent") for entry in farmer_doc.get("agent_outputs", [])
    }

    statuses = {}
    for agent in AGENT_REGISTRY:
        if not agent.implemented or agent.key == "onboarding":
            # Skip onboarding (no run endpoint) and any unimplemented agents
            if not agent.implemented:
                statuses[agent.key] = {
                    "status": "coming_soon",
                    "message": "This agent is under development and will be available soon.",
                }
            continue

        missing = check_dependencies_met(agent.key, completed_agents)
        if missing:
            missing_names = []
            for dep_key in missing:
                dep = resolve_agent_key(dep_key) or dep_key
                for a in AGENT_REGISTRY:
                    if a.key == dep:
                        missing_names.append(a.display_name)
                        break
                else:
                    missing_names.append(dep_key.title())
            statuses[agent.key] = {
                "status": "blocked",
                "message": f"Complete {', '.join(missing_names)} first.",
            }
        elif agent.key in completed_agents:
            statuses[agent.key] = {
                "status": "success",
                "message": "Analysis complete.",
            }
        else:
            statuses[agent.key] = {
                "status": "idle",
                "message": "Ready to run.",
            }

    return statuses


@app.post(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/agents/{agent_name}/run",
    tags=["agents"],
    response_model=AgentRunResponse,
)
def run_agent(
    farmer_id: str,
    season_id: str,
    agent_name: str,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_farmer["season_id"] and current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Season ID mismatch.")

    now = datetime.now(timezone.utc).isoformat()

    # ── 1. Resolve agent name (may be an alias) ────────────────────
    canonical_key = resolve_agent_key(agent_name)
    if canonical_key is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown agent '{agent_name}'. Known agents: {sorted(a.key for a in AGENT_REGISTRY)}",
        )

    agent_entry = next(a for a in AGENT_REGISTRY if a.key == canonical_key)

    # ── 2. Validate farmer exists ──────────────────────────────────
    farmer_doc = fs.get_by_farmer_id(farmer_id)
    if farmer_doc is None:
        raise HTTPException(status_code=404, detail=f"Farmer '{farmer_id}' not found.")

    # ── 3. Validate season exists and belongs to this farmer ──────
    season_doc = fs.get_by_season_id(season_id)
    if season_doc is None:
        raise HTTPException(status_code=404, detail=f"Season '{season_id}' not found.")
    if season_doc["farmer_id"] != farmer_id:
        raise HTTPException(
            status_code=403,
            detail=f"Season '{season_id}' does not belong to farmer '{farmer_id}'.",
        )

    # ── 4. Dependency check ───────────────────────────────────────
    completed_agents = {
        entry.get("agent") for entry in farmer_doc.get("agent_outputs", [])
    }
    missing = check_dependencies_met(canonical_key, completed_agents)
    if missing:
        missing_names = []
        for dep_key in missing:
            dep = resolve_agent_key(dep_key) or dep_key
            for a in AGENT_REGISTRY:
                if a.key == dep:
                    missing_names.append(a.display_name)
                    break
            else:
                missing_names.append(dep_key.title())
        raise HTTPException(
            status_code=422,
            detail=f"Run {', '.join(missing_names)} first before requesting {agent_entry.display_name}.",
        )

    # ── 5. Load FarmerContext (includes prior agent outputs) ──────
    context = FarmerContext(farmer_id=farmer_id, season_id=season_id, service=fs)
    try:
        state = context.load()
    except LookupError as exc:
        logger.warning(f"[AGENT BLOCKED] Farmer context lookup failed | farmer_id={farmer_id} | error={exc}")
        raise HTTPException(status_code=404, detail=str(exc))

    # ── 6. Dispatch to the correct agent ─────────────────────────
    logger.info(f"[AGENT RUN START] farmer_id={farmer_id} | season_id={season_id} | agent={canonical_key}")
    try:
        agent = AGENT_INSTANCES[canonical_key]
        result = agent.run(state)

        # Extract the output — agents return {field_name: data}
        # We persist under the canonical key
        output_key = canonical_key
        if isinstance(result, dict) and canonical_key in result:
            output = result[canonical_key]
        elif isinstance(result, dict) and len(result) == 1:
            output = list(result.values())[0]
        else:
            output = result

        context.save_agent_output(output_key, output)
        logger.info(f"[AGENT RUN SUCCESS] farmer_id={farmer_id} | season_id={season_id} | agent={canonical_key} | is_estimated={output.get('is_estimated') if isinstance(output, dict) else False}")
        return AgentRunResponse(
            agent=canonical_key,
            status="success",
            output=output,
            timestamp=now,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[AGENT RUN ERROR] farmer_id={farmer_id} | season_id={season_id} | agent={canonical_key} | error={exc}")
        # Agent execution failed — return structured error, not a 500
        return AgentRunResponse(
            agent=canonical_key,
            status="error",
            output={},
            message=str(exc),
            timestamp=now,
        )

# ─── Disease Detection: Image Upload & Analysis ──────────────────────

from fastapi import File, UploadFile, Form
from typing import Optional
import base64


class DiseaseDetectionRequest(BaseModel):
    """Request for disease detection with optional image upload."""
    message: str = Field(default="", description="Optional text message from farmer")
    crop_type: Optional[str] = Field(default=None, description="Crop type if known")
    # image is handled via multipart/form-data


class DiseaseDetectionResponse(BaseModel):
    """Response containing structured diagnosis and treatment research."""
    status: str
    disease_detection: Optional[dict] = None
    disease_research: Optional[dict] = None
    message: str = ""
    timestamp: str


@app.post(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/disease-detection",
    tags=["farmer"],
    response_model=DiseaseDetectionResponse,
)
async def disease_detection_analysis(
    farmer_id: str,
    season_id: str,
    message: str = Form(default=""),
    crop_type: Optional[str] = Form(default=None),
    image: Optional[UploadFile] = File(default=None),
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """
    Analyze crop/leaf image for disease detection and provide treatment recommendations.

    Accepts multipart/form-data with:
    - message: optional text from farmer
    - crop_type: optional crop hint
    - image: image file (JPEG, PNG, WebP) - max 10MB

    Returns structured DiagnosisCard-ready payload with disease_detection and disease_research.
    """
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_farmer["season_id"] and current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Season ID mismatch.")

    # Validate image if provided
    image_base64 = None
    if image:
        # Validate content type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type: {image.content_type}. Allowed: JPEG, PNG, WebP, HEIC"
            )
        # Validate size (10MB max)
        content = await image.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Maximum 10MB.")
        image_base64 = base64.b64encode(content).decode("utf-8")

    now = datetime.now(timezone.utc).isoformat()

    # Load farmer context for profile info
    try:
        context = FarmerContext(farmer_id=farmer_id, season_id=season_id, service=fs)
        state = context.load()
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    # Prepare state for disease detection graph run
    detection_state = {
        **state,
        "farmer_id": farmer_id,
        "season_id": season_id,
        "image_data": image_base64,
        "has_image_attachment": image_base64 is not None,
    }

    # Override crop_type if provided
    if crop_type:
        detection_state["selected_crop"] = crop_type

    # Run the graph - it will route to disease_detection -> disease_research -> validation
    from backend.app.graph.build_graph import build_graph
    from langgraph.checkpoint.memory import MemorySaver
    graph = build_graph(MemorySaver())
    try:
        result = graph.invoke(detection_state, config={"configurable": {"thread_id": f"disease_{farmer_id}_{season_id}"}})
    except Exception as exc:
        logger.error(f"[DISEASE DETECTION ERROR] farmer_id={farmer_id} | error={exc}")
        raise HTTPException(status_code=500, detail=_safe_error_detail("Disease detection", exc))

    # Extract results
    disease_detection = result.get("disease_detection")
    disease_research = result.get("disease_research")

    # Build response message
    if not image_base64:
        message_text = "Please upload a crop/leaf image for disease diagnosis."
    elif disease_detection and disease_detection.get("needs_human_review"):
        message_text = "Image unclear. Please retake with better lighting and focus on affected area."
    elif disease_detection and disease_detection.get("is_healthy"):
        message_text = f"Good news! Your {disease_detection.get('affected_crop', 'crop')} appears healthy."
    elif disease_detection:
        disease_name = disease_detection.get("disease_name", "Unknown")
        confidence = disease_detection.get("confidence", 0)
        message_text = f"Detected: {disease_name} (confidence: {confidence:.0%}). See treatment recommendations below."
    else:
        message_text = "Analysis complete."

    return DiseaseDetectionResponse(
        status="success",
        disease_detection=disease_detection,
        disease_research=disease_research,
        message=message_text,
        timestamp=now,
    )

# ─── Government Schemes: Chat-Driven Scheme/Policy Research ─────────

class GovernmentSchemesRequest(BaseModel):
    """Request for a government schemes / policy question from the farmer."""
    message: str = Field(description="Farmer's free-text question about schemes, subsidies, or policies")


class GovernmentSchemesResponse(BaseModel):
    """Response containing matched schemes and a plain-language summary."""
    status: str
    government_schemes: Optional[dict] = None
    message: str = ""
    timestamp: str


@app.post(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/government-schemes",
    tags=["farmer"],
    response_model=GovernmentSchemesResponse,
)
async def government_schemes_query(
    farmer_id: str,
    season_id: str,
    payload: GovernmentSchemesRequest,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """
    Answer a farmer's question about government farming schemes, subsidies,
    and policies, matched against their profile where available.

    Returns a structured payload the frontend chat can render as a
    scheme-match card (name, category, why it's relevant, how to apply),
    plus a plain-language summary and a standing reminder to confirm
    current eligibility at the official portal.
    """
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_farmer["season_id"] and current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Season ID mismatch.")

    now = datetime.now(timezone.utc).isoformat()

    try:
        context = FarmerContext(farmer_id=farmer_id, season_id=season_id, service=fs)
        state = context.load()
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    query_state = {
        **state,
        "farmer_id": farmer_id,
        "season_id": season_id,
        "message": payload.message,
        "has_image_attachment": False,
        "image_data": None,
    }

    from backend.app.graph.build_graph import build_graph
    from langgraph.checkpoint.memory import MemorySaver

    graph = build_graph(MemorySaver())
    try:
        result = graph.invoke(
            query_state,
            config={"configurable": {"thread_id": f"schemes_{farmer_id}_{season_id}"}},
        )
    except Exception as exc:
        logger.error(f"[GOVERNMENT SCHEMES ERROR] farmer_id={farmer_id} | error={exc}")
        raise HTTPException(status_code=500, detail=_safe_error_detail("Government schemes lookup", exc))

    government_schemes = result.get("government_schemes")
    message_text = (
        government_schemes.get("recommendations", ["Here's what I found."])[0]
        if government_schemes else "I couldn't find scheme information for that question."
    )

    return GovernmentSchemesResponse(
        status="success",
        government_schemes=government_schemes,
        message=message_text,
        timestamp=now,
    )


# ─── Phase 8 Farmer Decision Platform Services ─────────────────────

from backend.app.services.farmer_insight_service import FarmerInsightService
from backend.app.services.agent_orchestrator import AgentOrchestrator


@app.post(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/orchestrate",
    tags=["farmer"],
)
def orchestrate_farm_analysis(
    farmer_id: str,
    season_id: str,
    payload: Optional[OrchestrateRequest] = None,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """Smart Orchestration endpoint: Executes missing/stale agents and builds unified farmer insight."""
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if current_farmer["season_id"] and current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Season ID mismatch.")

    force_refresh = payload.force_refresh if payload else False
    agents_to_run = payload.agents_to_run if payload else None

    orchestrator = AgentOrchestrator(service=fs)
    try:
        result = orchestrator.orchestrate(
            farmer_id=farmer_id,
            season_id=season_id,
            force_refresh=force_refresh,
            agents_to_run=agents_to_run,
        )
        return {
            "status": "success",
            "farmer_id": farmer_id,
            "season_id": season_id,
            "insight": result["insight"],
            "context": result["context"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except Exception as exc:
        logger.error(f"[ORCHESTRATE ERROR] farmer_id={farmer_id} | season_id={season_id} | error={exc}")
        raise HTTPException(status_code=500, detail=_safe_error_detail("Orchestration", exc))


@app.get(
    "/api/v1/farmers/{farmer_id}/insight",
    tags=["farmer"],
)
def get_farmer_insight(
    farmer_id: str,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
):
    """Returns the unified farmer decision summary for a farmer."""
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    farmer = fs.get_by_farmer_id(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail=f"Farmer not found for farmer_id={farmer_id}")

    context = FarmerContext.from_farmer_id(farmer_id, service=fs)
    state = context.load()
    insight = FarmerInsightService.generate_insight(state)

    # Persist latest insight
    fs.update_farmer(farmer_id, {"farmer_insight": insight})

    return {
        "farmer_id": farmer_id,
        "season_id": farmer.get("season_id"),
        "insight": insight,
    }


@app.post(
    "/api/v1/farmers/{farmer_id}/seasons/{season_id}/feedback",
    tags=["farmer"],
    response_model=FarmerFeedbackResponse,
)
def submit_farmer_feedback(
    farmer_id: str,
    season_id: str,
    payload: FarmerFeedbackRequest,
    current_farmer: dict = Depends(get_current_farmer),
    fs: FarmerService = Depends(get_farmer_service),
) -> FarmerFeedbackResponse:
    """Stores farmer feedback into MongoDB without mutating historical outputs."""
    if current_farmer["farmer_id"] != farmer_id:
        raise HTTPException(status_code=403, detail="Access denied: Cannot submit feedback for another farmer.")
    if current_farmer["season_id"] and current_farmer["season_id"] != season_id:
        raise HTTPException(status_code=403, detail="Season ID mismatch.")

    farmer = fs.get_by_farmer_id(farmer_id)
    if not farmer:
        raise HTTPException(status_code=404, detail=f"Farmer not found for farmer_id={farmer_id}")
    if farmer.get("season_id") != season_id:
        raise HTTPException(status_code=403, detail=f"Season ID '{season_id}' does not belong to farmer '{farmer_id}'")

    now = datetime.now(timezone.utc).isoformat()
    fb_entry = {
        "farmer_id": farmer_id,
        "season_id": season_id,
        "rating": payload.rating,
        "used_recommendation": payload.used_recommendation,
        "actual_yield": payload.actual_yield,
        "actual_price": payload.actual_price,
        "actual_cost": payload.actual_cost,
        "notes": payload.notes,
        "created_at": now,
    }

    # Append to farmer_feedback list on farmer document
    fs.collection.update_one(
        {"farmer_id": farmer_id},
        {"$push": {"farmer_feedback": fb_entry}, "$set": {"updated_at": now}}
    )

    logger.info(f"[FARMER FEEDBACK] farmer_id={farmer_id} | rating={payload.rating} | used={payload.used_recommendation}")

    return FarmerFeedbackResponse(
        farmer_id=farmer_id,
        season_id=season_id,
        status="success",
        message="Thank you! Your feedback has been recorded.",
        timestamp=now,
    )
