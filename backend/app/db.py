"""
MongoDB models and service layer for farmer registration.
Uses PyMongo (synchronous) for reliability with Python 3.14.
"""
import os
import uuid as uuid_lib
from datetime import datetime, timezone
import bcrypt

from pymongo import MongoClient
from pydantic import BaseModel, Field


# ─── Config ──────────────────────────────────────────────────────
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/krishi_agent")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "krishi_agent")

# ─── MongoDB client (module-level singleton) ──────────────────────
mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)


def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Verify plaintext password against stored hash."""
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def sanitize_farmer_doc(doc: dict | None) -> dict | None:
    """Strip sensitive fields such as password_hash from doc returned to callers."""
    if not doc:
        return None
    d = dict(doc)
    d.pop("password_hash", None)
    return d


class FarmerInDB(BaseModel):
    """Internal farmer model — stored in MongoDB."""
    farmer_id: str = Field(default_factory=lambda: str(uuid_lib.uuid4()))
    season_id: str = Field(default_factory=lambda: str(uuid_lib.uuid4()))
    name: str
    phone: str
    district: str
    language: str = "hi"
    status: str = "registered"
    password_hash: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()},
        "arbitrary_types_allowed": True,
    }


class FarmerService:
    """Service layer for farmer CRUD operations in MongoDB."""

    def __init__(self, db=None, client=None):
        self.client = client or mongo_client
        if db is not None:
            self.db = db
        else:
            self.db = self.client[MONGODB_DB_NAME]
        self.collection = self.db.farmers

    def create_indexes(self):
        """Create MongoDB indexes for efficient queries."""
        self.collection.create_index("farmer_id", unique=True)
        self.collection.create_index("season_id", unique=True)
        self.collection.create_index("phone", unique=True)
        self.collection.create_index([("created_at", 1)])
        self.collection.create_index([("district", 1)])
        self.collection.create_index([("language", 1)])

    def create_farmer(self, farmer: FarmerInDB) -> FarmerInDB:
        """Insert a new farmer record. Raises DuplicateKeyError if phone exists."""
        doc = farmer.model_dump()
        self.collection.insert_one(doc)
        return farmer

    def get_by_farmer_id(self, farmer_id: str, sanitize: bool = True) -> dict | None:
        """Find a farmer by farmer_id. Returns None if not found."""
        doc = self.collection.find_one({"farmer_id": farmer_id})
        return sanitize_farmer_doc(doc) if sanitize else doc

    def get_by_phone(self, phone: str, sanitize: bool = False) -> dict | None:
        """Find a farmer by phone number. Returns None if not found."""
        doc = self.collection.find_one({"phone": phone})
        return sanitize_farmer_doc(doc) if sanitize else doc

    def get_by_season_id(self, season_id: str, sanitize: bool = True) -> dict | None:
        """Find a farmer by season_id. Returns None if not found."""
        doc = self.collection.find_one({"season_id": season_id})
        return sanitize_farmer_doc(doc) if sanitize else doc

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        district: str | None = None,
        language: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        """Get all farmers with optional filtering (sanitized)."""
        query: dict = {}
        if district:
            query["district"] = district
        if language:
            query["language"] = language
        if search:
            regex = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"name": regex},
                {"phone": regex},
            ]
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        return [sanitize_farmer_doc(doc) for doc in cursor]

    def update_farmer(self, farmer_id: str, updates: dict) -> dict | None:
        """Update a farmer record. Returns the updated document."""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.collection.find_one_and_update(
            {"farmer_id": farmer_id},
            {"$set": updates},
            return_document=True,  # pymongo 4.x
        )
        return result

    def save_agent_output(self, farmer_id: str, agent_name: str, output: dict) -> dict | None:
        """Save an agent's output for a farmer.

        Replaces existing output for the same agent to prevent duplicate
        entries, or appends if this is the first execution for the agent.
        """
        entry = {
            "agent": agent_name,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # First remove any previous output entry for this agent
        self.collection.update_one(
            {"farmer_id": farmer_id},
            {"$pull": {"agent_outputs": {"agent": agent_name}}},
        )
        # Push the updated entry
        result = self.collection.find_one_and_update(
            {"farmer_id": farmer_id},
            {"$push": {"agent_outputs": entry}, "$set": {"updated_at": entry["timestamp"]}},
            return_document=True,
        )
        return result

    def delete_farmer(self, farmer_id: str) -> bool:
        """Soft-delete (deactivate) a farmer by setting status to 'deactivated'."""
        result = self.collection.update_one(
            {"farmer_id": farmer_id},
            {"$set": {"status": "deactivated", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
        return result.matched_count > 0

    def count_documents(self) -> int:
        """Count total farmers in the collection."""
        return self.collection.count_documents({})

    def close(self):
        """Close the MongoDB connection."""
        self.client.close()
