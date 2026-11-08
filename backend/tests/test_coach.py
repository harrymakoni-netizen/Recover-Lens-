"""Adaptive coach endpoints (SPEC §17). The model is replaced by a stub; no network is used."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import coach
from app.main import create_app
from app.models import CoachEvent

LIBRARY = [
    {"id": "mini_squat", "name": "Mini Squat", "region": "knee", "kind": "reps", "sets": 3, "reps": 10},
    {"id": "single_leg_balance", "name": "Single-Leg Balance", "region": "knee", "kind": "hold", "sets": 2, "reps": 1, "holdSeconds": 30},
]


@pytest.fixture()
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path / 'coach.db'}", seed=False)
    with TestClient(app) as c:
        c.app_state_engine = app.state.engine  # type: ignore[attr-defined]
        yield c


def events(client) -> list[CoachEvent]:
    with Session(client.app_state_engine) as db:
        return list(db.exec(select(CoachEvent)).all())


def test_extract_returns_model_output_and_logs_redacted_input(client, monkeypatch):
    seen = {}

    def fake(system, user, name, schema):
        seen.update(user=user, name=name)
        return {"painLevel": 5, "bodyAreas": ["knee"], "symptoms": ["sore knee"], "energy": "low", "minutesAvailable": 10, "barriers": ["time"], "redFlags": []}, "stub-model"

    monkeypatch.setattr(coach, "call_model", fake)
    r = client.post("/api/coach/extract", json={"text": "knee sore, call 0771234567, only 10 minutes", "language": "sn", "patient_id": "tariro"})
    assert r.status_code == 200
    assert r.json()["model"] == "stub-model"
    assert r.json()["extraction"]["minutesAvailable"] == 10
    assert "0771234567" not in seen["user"] and "[number]" in seen["user"]
    assert "chiShona" in seen["user"]
    (ev,) = events(client)
    assert ev.kind == "extract" and ev.ok and ev.model == "stub-model" and ev.patient_id == "tariro"
    assert "0771234567" not in ev.input_json["text"]


def test_model_unavailable_gives_503_with_rules_fallback(client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.post("/api/coach/extract", json={"text": "tired today"})
    assert r.status_code == 503
    assert r.json()["detail"]["fallback"] == "rules"
    (ev,) = events(client)
    assert not ev.ok and "GEMINI_API_KEY" in ev.error


def test_extract_rejects_empty_and_long_text(client):
    assert client.post("/api/coach/extract", json={"text": ""}).status_code == 422
    assert client.post("/api/coach/extract", json={"text": "a" * 501}).status_code == 422
    assert client.post("/api/coach/extract", json={"text": "ok", "language": "fr"}).status_code == 422


def test_plan_limits_the_model_to_the_library(client, monkeypatch):
    seen = {}

    def fake(system, user, name, schema):
        seen.update(system=system, user=user, schema=schema)
        return {"items": [{"exerciseId": "mini_squat", "sets": 2, "reps": 6, "holdSeconds": None}], "technique": "graded_tasks", "why": "Shorter today."}, "stub-model"

    monkeypatch.setattr(coach, "call_model", fake)
    body = {"language": "nd", "extraction": {"painLevel": 5, "bodyAreas": ["knee"], "minutesAvailable": 10}, "library": LIBRARY, "minutes_available": 8}
    r = client.post("/api/coach/plan", json=body)
    assert r.status_code == 200
    assert r.json()["plan"]["items"][0]["exerciseId"] == "mini_squat"
    ids = seen["schema"]["properties"]["items"]["items"]["properties"]["exerciseId"]["enum"]
    assert ids == ["mini_squat", "single_leg_balance"]
    assert "isiNdebele" in seen["system"]
    assert '"minutesAvailable": 8' in seen["user"]
    (ev,) = events(client)
    assert ev.kind == "plan" and ev.input_json["library_ids"] == ids


def test_plan_refuses_after_a_red_flag_without_calling_the_model(client, monkeypatch):
    def boom(*a, **k):
        raise AssertionError("the model must not be called")

    monkeypatch.setattr(coach, "call_model", boom)
    r = client.post("/api/coach/plan", json={"extraction": {"redFlags": ["chest_pain"]}, "library": LIBRARY})
    assert r.status_code == 409
    assert r.json()["detail"]["red_flag"] is True
    assert events(client) == []


def test_plan_validates_the_library(client):
    bad = [{**LIBRARY[0], "id": "Mini Squat!"}]
    assert client.post("/api/coach/plan", json={"extraction": {}, "library": bad}).status_code == 422
    assert client.post("/api/coach/plan", json={"extraction": {}, "library": []}).status_code == 422
    assert client.post("/api/coach/plan", json={"extraction": {"bodyAreas": ["spleen"]}, "library": LIBRARY}).status_code == 422
    assert client.post("/api/coach/plan", json={"extraction": {"symptoms": ["x" * 61]}, "library": LIBRARY}).status_code == 422


def test_call_model_tries_the_next_model_and_stops_on_a_bad_key(monkeypatch):
    import io
    import json
    import urllib.error

    calls = []

    def fake_urlopen(req, timeout):
        model = json.loads(req.data)["model"]
        calls.append(model)
        if model == "busy":
            raise urllib.error.HTTPError(req.full_url, 503, "busy", {}, io.BytesIO(b""))
        if model == "badkey":
            raise urllib.error.HTTPError(req.full_url, 401, "no", {}, io.BytesIO(b""))
        return io.BytesIO(json.dumps({"choices": [{"message": {"content": '```json\n{"ok": true}\n```'}}]}).encode())

    monkeypatch.setenv("GEMINI_API_KEY", "test")
    monkeypatch.setattr(coach.urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setenv("GEMINI_MODELS", "busy,good")
    assert coach.call_model("s", "u", "n", {}) == ({"ok": True}, "good")
    calls.clear()
    monkeypatch.setenv("GEMINI_MODELS", "badkey,good")
    with pytest.raises(coach.CoachUnavailable, match="401"):
        coach.call_model("s", "u", "n", {})
    assert calls == ["badkey"]


def test_redact_matches_the_frontend_rules():
    assert coach.redact("Call +263 77 123 4567 or tariro@example.com, www.x.com, pain 6") == "Call [number] or [email], [link], pain 6"


def test_status_reports_configuration_and_the_last_call_without_the_key(client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "secret-value")
    monkeypatch.setenv("GEMINI_MODELS", "a,b")
    r = client.get("/api/coach/status")
    assert r.json() == {"configured": True, "models": ["a", "b"], "last_call": None}
    monkeypatch.setattr(coach, "call_model", lambda *a: ({"painLevel": None, "bodyAreas": [], "symptoms": [], "energy": None, "minutesAvailable": None, "barriers": [], "redFlags": []}, "a"))
    client.post("/api/coach/extract", json={"text": "fine today"})
    body = client.get("/api/coach/status").json()
    assert body["last_call"]["ok"] is True and body["last_call"]["model"] == "a"
    assert "secret-value" not in str(body)
    monkeypatch.delenv("GEMINI_API_KEY")
    assert client.get("/api/coach/status").json()["configured"] is False
