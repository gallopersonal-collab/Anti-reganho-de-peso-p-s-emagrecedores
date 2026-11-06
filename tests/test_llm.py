import json
import os
import sys
from pathlib import Path

import httpx
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(server.app)
RealAsyncClient = httpx.AsyncClient


def use_upstream(monkeypatch, handler):
    """Route the backend's outbound LLM call to an in-memory fake provider."""
    calls = []

    def wrapped(request):
        calls.append(request)
        return handler(request)

    monkeypatch.setattr(
        server.httpx,
        "AsyncClient",
        lambda **kw: RealAsyncClient(transport=httpx.MockTransport(wrapped), **kw),
    )
    return calls


def ok_handler(request):
    return httpx.Response(200, json={
        "model": "gemini-2.5-flash",
        "choices": [{"message": {"role": "assistant", "content": "Olá!"}}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7},
    })


def test_config_hides_key(monkeypatch):
    monkeypatch.setattr(server, "LLM_API_KEY", "secret-key")
    r = client.get("/api/llm/config")
    assert r.status_code == 200
    body = r.json()
    assert body["api_key_configured"] is True
    assert "secret-key" not in r.text
    assert body["base_url"] == server.LLM_BASE_URL


def test_chat_success_uses_configured_provider(monkeypatch):
    monkeypatch.setattr(server, "LLM_BASE_URL", "http://fake-llm/v1")
    monkeypatch.setattr(server, "LLM_API_KEY", "k1")
    monkeypatch.setattr(server, "LLM_MODEL", "auto")
    calls = use_upstream(monkeypatch, ok_handler)

    r = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "oi"}], "temperature": 0.3})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["content"] == "Olá!"
    assert body["model"] == "gemini-2.5-flash"
    assert body["usage"]["total_tokens"] == 7
    assert body["id"] and body["created_at"]

    req = calls[0]
    assert str(req.url) == "http://fake-llm/v1/chat/completions"
    assert req.headers["authorization"] == "Bearer k1"
    sent = __import__("json").loads(req.content)
    assert sent["model"] == "auto"
    assert sent["temperature"] == 0.3
    assert "max_tokens" not in sent


def test_chat_model_override_and_no_key(monkeypatch):
    monkeypatch.setattr(server, "LLM_API_KEY", "")
    calls = use_upstream(monkeypatch, ok_handler)
    r = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "oi"}], "model": "gpt-x"})
    assert r.status_code == 200
    assert "authorization" not in calls[0].headers
    assert __import__("json").loads(calls[0].content)["model"] == "gpt-x"


@pytest.mark.parametrize("handler,status", [
    (lambda r: httpx.Response(429, json={"error": "rate limited"}), 502),
    (lambda r: httpx.Response(200, json={"choices": []}), 502),
    (lambda r: httpx.Response(200, text="not json"), 502),
])
def test_chat_upstream_errors(monkeypatch, handler, status):
    use_upstream(monkeypatch, handler)
    r = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "oi"}]})
    assert r.status_code == status


def test_chat_upstream_unreachable(monkeypatch):
    def boom(request):
        raise httpx.ConnectError("refused", request=request)
    use_upstream(monkeypatch, boom)
    r = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "oi"}]})
    assert r.status_code == 503


def test_chat_upstream_timeout(monkeypatch):
    def slow(request):
        raise httpx.ReadTimeout("slow", request=request)
    use_upstream(monkeypatch, slow)
    r = client.post("/api/llm/chat", json={"messages": [{"role": "user", "content": "oi"}]})
    assert r.status_code == 504


@pytest.mark.parametrize("payload", [
    {"messages": []},
    {"messages": [{"role": "robot", "content": "x"}]},
    {"messages": [{"role": "user", "content": ""}]},
    {"messages": [{"role": "user", "content": "x"}], "temperature": 5},
])
def test_chat_validation(payload):
    assert client.post("/api/llm/chat", json=payload).status_code == 422


def caption_handler(content):
    return lambda request: httpx.Response(200, json={
        "model": "m1", "choices": [{"message": {"role": "assistant", "content": content}}],
    })


def test_captions_json(monkeypatch):
    calls = use_upstream(monkeypatch, caption_handler('Aqui: {"legendas": ["L1", "L2", "L3", "L4"]}'))
    r = client.post("/api/llm/legendas", json={"tema": "desmame do Ozempic", "objetivo": "venda", "quantidade": 3})
    assert r.status_code == 200, r.text
    assert r.json()["legendas"] == ["L1", "L2", "L3"]
    sent = json.loads(calls[0].content)
    assert sent["messages"][0]["role"] == "system"
    assert "desmame do Ozempic" in sent["messages"][1]["content"]
    assert "link da bio" in sent["messages"][1]["content"]


def test_captions_separator_fallback(monkeypatch):
    use_upstream(monkeypatch, caption_handler("Legenda A\n---\nLegenda B"))
    r = client.post("/api/llm/legendas", json={"tema": "massa magra", "quantidade": 2})
    assert r.json()["legendas"] == ["Legenda A", "Legenda B"]


def test_captions_empty_output(monkeypatch):
    use_upstream(monkeypatch, caption_handler("   "))
    r = client.post("/api/llm/legendas", json={"tema": "massa magra"})
    assert r.status_code == 502


@pytest.mark.parametrize("payload", [
    {"tema": "x"},
    {"tema": "valido", "quantidade": 9},
    {"tema": "valido", "objetivo": "outro"},
])
def test_captions_validation(payload):
    assert client.post("/api/llm/legendas", json=payload).status_code == 422
