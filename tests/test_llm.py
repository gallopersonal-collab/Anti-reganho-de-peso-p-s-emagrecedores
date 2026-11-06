import json
import os
import sys
from pathlib import Path

import httpx
import pytest

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "test_db")
os.environ["LLM_ACCESS_PASSWORD"] = "senha-teste"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import server  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(server.app, headers={"X-Access-Password": "senha-teste"})
anon = TestClient(server.app)
RealAsyncClient = httpx.AsyncClient


@pytest.fixture(autouse=True)
def reset_attempts():
    server._failed_by_ip.clear()
    server._failed_global.clear()
    yield
    server._failed_by_ip.clear()
    server._failed_global.clear()


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


@pytest.mark.parametrize("method,path", [
    ("get", "/api/llm/config"),
    ("post", "/api/llm/chat"),
    ("post", "/api/llm/legendas"),
])
def test_password_required(monkeypatch, method, path):
    calls = use_upstream(monkeypatch, ok_handler)
    body = {"messages": [{"role": "user", "content": "oi"}], "tema": "massa magra"}
    kw = {} if method == "get" else {"json": body}
    assert getattr(anon, method)(path, **kw).status_code == 401
    assert getattr(anon, method)(path, headers={"X-Access-Password": "errada"}, **kw).status_code == 401
    assert calls == []


def test_password_not_configured_fails_closed(monkeypatch):
    monkeypatch.setattr(server, "LLM_ACCESS_PASSWORD", "")
    r = client.post("/api/llm/legendas", json={"tema": "massa magra"})
    assert r.status_code == 503


def test_status_routes_stay_public():
    assert anon.get("/api/").status_code == 200


def wrong(ip="1.1.1.1"):
    return anon.get("/api/llm/config", headers={"X-Access-Password": "errada", "X-Forwarded-For": ip})


def test_lockout_after_max_failed_attempts(monkeypatch):
    monkeypatch.setattr(server, "LLM_MAX_FAILED_ATTEMPTS", 3)
    assert [wrong().status_code for _ in range(3)] == [401, 401, 401]
    r = wrong()
    assert r.status_code == 429
    assert 1 <= int(r.headers["retry-after"]) <= server.LLM_LOCKOUT_SECONDS + 1
    # even the right password is refused while locked out
    ok = anon.get("/api/llm/config", headers={"X-Access-Password": "senha-teste", "X-Forwarded-For": "1.1.1.1"})
    assert ok.status_code == 429
    # another IP is not affected
    other = anon.get("/api/llm/config", headers={"X-Access-Password": "senha-teste", "X-Forwarded-For": "2.2.2.2"})
    assert other.status_code == 200


def test_lockout_expires(monkeypatch):
    monkeypatch.setattr(server, "LLM_MAX_FAILED_ATTEMPTS", 2)
    clock = [1000.0]
    monkeypatch.setattr(server.time, "monotonic", lambda: clock[0])
    wrong(); wrong()
    assert wrong().status_code == 429
    clock[0] += server.LLM_LOCKOUT_SECONDS
    assert wrong().status_code == 401


def test_success_resets_ip_counter(monkeypatch):
    monkeypatch.setattr(server, "LLM_MAX_FAILED_ATTEMPTS", 3)
    wrong(); wrong()
    ok = anon.get("/api/llm/config", headers={"X-Access-Password": "senha-teste", "X-Forwarded-For": "1.1.1.1"})
    assert ok.status_code == 200
    assert [wrong().status_code for _ in range(3)] == [401, 401, 401]


def test_global_cap_blocks_ip_rotation(monkeypatch):
    monkeypatch.setattr(server, "LLM_GLOBAL_MAX_FAILED", 4)
    assert [wrong(f"9.9.9.{i}").status_code for i in range(4)] == [401] * 4
    assert wrong("9.9.9.200").status_code == 429


def test_spoofed_forwarded_prefix_is_ignored(monkeypatch):
    monkeypatch.setattr(server, "LLM_MAX_FAILED_ATTEMPTS", 2)
    for fake in ("5.5.5.1", "5.5.5.2", "5.5.5.3"):
        r = wrong(f"{fake}, 1.1.1.1")
    assert r.status_code == 429
