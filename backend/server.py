from fastapi import FastAPI, APIRouter, Depends, Header, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Literal, Optional
import hmac
import json
import re
import time
from collections import deque
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
# Password for the /api/llm/* routes (sent by the client as X-Access-Password).
# Fail closed: if it is not set, the LLM routes refuse every request.
LLM_ACCESS_PASSWORD = os.environ.get('LLM_ACCESS_PASSWORD', '')
# Brute-force protection for that password: after LLM_MAX_FAILED_ATTEMPTS wrong
# tries from one IP within LLM_LOCKOUT_SECONDS, that IP gets 429 until the window
# passes. LLM_GLOBAL_MAX_FAILED caps wrong tries from all IPs together in the same
# window, so rotating IPs (or a spoofed X-Forwarded-For) cannot bypass the limit.
# Counters live in memory: they reset on restart and are per process.
LLM_MAX_FAILED_ATTEMPTS = int(os.environ.get('LLM_MAX_FAILED_ATTEMPTS', '5'))
LLM_GLOBAL_MAX_FAILED = int(os.environ.get('LLM_GLOBAL_MAX_FAILED', '50'))
LLM_LOCKOUT_SECONDS = int(os.environ.get('LLM_LOCKOUT_SECONDS', '900'))
_failed_by_ip = {}
_failed_global = deque()

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

class CaptionCreate(BaseModel):
    tema: str = Field(min_length=3, max_length=500)
    objetivo: Literal["engajamento", "autoridade", "venda"] = "engajamento"
    tom: Literal["direto", "inspirador", "tecnico"] = "direto"
    quantidade: int = Field(default=3, ge=1, le=5)

class CaptionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    legendas: List[str]
    model: str
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

def _client_ip(request: Request) -> str:
    # Behind the hosting proxy, the last X-Forwarded-For entry is the address the
    # nearest proxy saw; the client cannot overwrite it, only prepend to it.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"

def _prune(attempts: deque, now: float) -> None:
    while attempts and now - attempts[0] >= LLM_LOCKOUT_SECONDS:
        attempts.popleft()

def _retry_after(attempts: deque, now: float) -> int:
    return max(1, int(LLM_LOCKOUT_SECONDS - (now - attempts[0])) + 1)

async def require_llm_access(request: Request, x_access_password: str = Header(default="")):
    if not LLM_ACCESS_PASSWORD:
        raise HTTPException(status_code=503, detail="LLM access password not configured")

    now = time.monotonic()
    ip = _client_ip(request)
    if len(_failed_by_ip) > 1000:
        for key in list(_failed_by_ip):
            _prune(_failed_by_ip[key], now)
            if not _failed_by_ip[key]:
                del _failed_by_ip[key]
    ip_attempts = _failed_by_ip.setdefault(ip, deque())
    _prune(ip_attempts, now)
    _prune(_failed_global, now)

    for attempts, limit in ((ip_attempts, LLM_MAX_FAILED_ATTEMPTS), (_failed_global, LLM_GLOBAL_MAX_FAILED)):
        if len(attempts) >= limit:
            raise HTTPException(
                status_code=429,
                detail="Too many failed password attempts",
                headers={"Retry-After": str(_retry_after(attempts, now))},
            )

    if not hmac.compare_digest(x_access_password.encode(), LLM_ACCESS_PASSWORD.encode()):
        ip_attempts.append(now)
        _failed_global.append(now)
        logger.warning("Failed LLM password attempt from %s (%d in window)", ip, len(ip_attempts))
        raise HTTPException(status_code=401, detail="Invalid access password")

    _failed_by_ip.pop(ip, None)

@api_router.get("/llm/config", response_model=LLMConfig, dependencies=[Depends(require_llm_access)])
async def get_llm_config():
    # Never expose the key itself, only whether it is set.
    return LLMConfig(base_url=LLM_BASE_URL, model=LLM_MODEL, api_key_configured=bool(LLM_API_KEY))

async def call_llm(messages: List[dict], model: Optional[str] = None,
                   temperature: Optional[float] = None, max_tokens: Optional[int] = None):
    """Call the configured OpenAI-compatible provider. Returns (content, served_model, usage)."""
    payload = {"model": model or LLM_MODEL, "messages": messages}
    if temperature is not None:
        payload["temperature"] = temperature
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

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

    return content, data.get("model") or payload["model"], data.get("usage")

@api_router.post("/llm/chat", response_model=LLMChat, dependencies=[Depends(require_llm_access)])
async def llm_chat(input: LLMChatCreate):
    content, model, usage = await call_llm(
        [m.model_dump() for m in input.messages], input.model, input.temperature, input.max_tokens
    )
    return LLMChat(content=content, model=model, usage=usage)

CAPTION_OBJETIVOS = {
    "engajamento": "gerar comentários e salvamentos, terminando com uma pergunta para o público",
    "autoridade": "posicionar o Prof. José Carlos Gallo como referência técnica, com um dado ou conceito de fisiologia",
    "venda": "levar o leitor a clicar no link da bio para o Curso de Especialista em Anti-Reganho de Peso",
}
CAPTION_TONS = {
    "direto": "direto e objetivo, frases curtas",
    "inspirador": "inspirador, sem clichês motivacionais",
    "tecnico": "técnico, com termos de fisiologia explicados de forma simples",
}
CAPTION_SYSTEM = (
    "Você escreve legendas de Instagram em português do Brasil para o Instituto Gallo Personal, "
    "que capacita Personal Trainers e Profissionais de Educação Física. O produto em foco é o Curso de "
    "Especialista em Anti-Reganho de Peso após Ozempic, Wegovy ou Mounjaro, do Prof. José Carlos Gallo. "
    "O público são profissionais de Educação Física, não o paciente final. "
    "Regras: primeira linha é um gancho forte; parágrafos curtos; no máximo 2 emojis; 3 a 5 hashtags no final; "
    "não prometa resultados garantidos nem faça recomendação médica sobre medicamentos. "
    'Responda SOMENTE com JSON no formato {"legendas": ["...", "..."]}.'
)

def parse_captions(content: str, quantidade: int) -> List[str]:
    """Extract captions from the model output: JSON first, '---' separators as fallback."""
    text = content.strip()
    match = re.search(r"\{.*\}|\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            items = parsed.get("legendas") if isinstance(parsed, dict) else parsed
            if isinstance(items, list):
                captions = [str(c).strip() for c in items if str(c).strip()]
                if captions:
                    return captions[:quantidade]
        except ValueError:
            pass
    captions = [c.strip() for c in re.split(r"\n\s*-{3,}\s*\n", text) if c.strip()]
    return captions[:quantidade]

@api_router.post("/llm/legendas", response_model=CaptionResult, dependencies=[Depends(require_llm_access)])
async def generate_captions(input: CaptionCreate):
    user_prompt = (
        f"Tema do post: {input.tema}\n"
        f"Objetivo: {CAPTION_OBJETIVOS[input.objetivo]}.\n"
        f"Tom: {CAPTION_TONS[input.tom]}.\n"
        f"Escreva {input.quantidade} legenda(s) diferentes entre si."
    )
    content, model, _ = await call_llm(
        [{"role": "system", "content": CAPTION_SYSTEM}, {"role": "user", "content": user_prompt}],
        temperature=0.8,
    )
    captions = parse_captions(content, input.quantidade)
    if not captions:
        raise HTTPException(status_code=502, detail="LLM returned no captions")
    return CaptionResult(legendas=captions, model=model)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
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