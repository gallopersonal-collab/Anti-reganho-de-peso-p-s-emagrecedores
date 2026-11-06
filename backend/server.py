from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Literal, Optional
import uuid
import httpx
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM provider (any OpenAI-compatible endpoint).
# Default points at a local FreeLLMAPI router for testing; switch to a paid API
# (OpenAI, OpenRouter, etc.) by changing only these env vars.
LLM_BASE_URL = os.environ.get('LLM_BASE_URL', 'http://localhost:3001/v1').rstrip('/')
LLM_API_KEY = os.environ.get('LLM_API_KEY', '')
LLM_MODEL = os.environ.get('LLM_MODEL', 'auto')
LLM_TIMEOUT = float(os.environ.get('LLM_TIMEOUT', '60'))

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class LLMMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)

class LLMChatCreate(BaseModel):
    messages: List[LLMMessage] = Field(min_length=1)
    model: Optional[str] = None  # overrides LLM_MODEL for this call
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, gt=0)

class LLMChat(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    model: str  # model actually served by the provider
    usage: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LLMConfig(BaseModel):
    base_url: str
    model: str
    api_key_configured: bool

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.get("/llm/config", response_model=LLMConfig)
async def get_llm_config():
    # Never expose the key itself, only whether it is set.
    return LLMConfig(base_url=LLM_BASE_URL, model=LLM_MODEL, api_key_configured=bool(LLM_API_KEY))

@api_router.post("/llm/chat", response_model=LLMChat)
async def llm_chat(input: LLMChatCreate):
    payload = {
        "model": input.model or LLM_MODEL,
        "messages": [m.model_dump() for m in input.messages],
    }
    if input.temperature is not None:
        payload["temperature"] = input.temperature
    if input.max_tokens is not None:
        payload["max_tokens"] = input.max_tokens

    headers = {"Authorization": f"Bearer {LLM_API_KEY}"} if LLM_API_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as http:
            resp = await http.post(f"{LLM_BASE_URL}/chat/completions", json=payload, headers=headers)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="LLM provider timed out")
    except httpx.HTTPError as e:
        logger.error("LLM provider unreachable at %s: %s", LLM_BASE_URL, e)
        raise HTTPException(status_code=503, detail="LLM provider unreachable")

    if resp.status_code != 200:
        logger.error("LLM provider error %s: %s", resp.status_code, resp.text[:500])
        raise HTTPException(status_code=502, detail=f"LLM provider returned {resp.status_code}")

    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Invalid response from LLM provider")

    return LLMChat(content=content, model=data.get("model") or payload["model"], usage=data.get("usage"))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()