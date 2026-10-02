"""Backend tests (SPEC §12): upsert idempotency, pain alert, seeded patients, and more."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture()
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(app) as c:
        yield c


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def session_body(patient_id="tariro", **overrides):
    body = {
        "id": uuid.uuid4().hex,
        "patient_id": patient_id,
        "exercise_id": "shoulder_abduction",
        "mode": "self",
        "started_at": iso(datetime.now(timezone.utc)),
        "duration_s": 120,
        "reps": 10,
        "correct_reps": 9,
        "avg_top_angle": 92.0,
        "movement_score": 91.0,
        "torso_alignment_avg": 95.0,
        "symmetry_avg": 96.0,
        "top_fault": None,
        "pain_before": 2,
        "pain_after": 2,
        "pain_confirmed_by_patient": True,
    }
    body.update(overrides)
    return body


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_patients_endpoint_returns_seeded_data(client):
    patients = client.get("/api/patients").json()
    names = {p["name"] for p in patients}
    assert {"Tariro Moyo", "Liam Ncube", "Amina Dube"} <= names
    tariro = next(p for p in patients if p["id"] == "tariro")
    assert tariro["session_count"] == 12
    assert tariro["latest_score"] > 85
    assert tariro["programs"][0]["exercise_id"] == "shoulder_abduction"
    amina = next(p for p in patients if p["id"] == "amina")
    assert amina["adherence"] >= 85


def test_seed_has_exactly_one_alert_for_liam(client):
    alerts = client.get("/api/alerts?resolved=false").json()
    assert len(alerts) == 1
    assert alerts[0]["patient_name"] == "Liam Ncube"
    assert alerts[0]["message"] == "Pain increased to 6/10 compared with recent baseline."


def test_seeded_athletes_and_screenings(client):
    athletes = client.get("/api/athletes").json()
    assert len(athletes) == 6
    assert len({a["sport"] for a in athletes}) == 4
    screenings = client.get("/api/screenings").json()
    assert sorted(s["overall"] for s in screenings).count("good") == 4
    assert sorted(s["overall"] for s in screenings).count("review") == 2
    assert all(s["athlete_name"] for s in screenings)
    football = client.get("/api/screenings?sport=football").json()
    assert {s["sport"] for s in football} == {"football"}


def test_session_upsert_is_idempotent(client):
    body = session_body()
    first = client.post("/api/sessions", json=body)
    assert first.status_code == 200
    second = client.post("/api/sessions", json=body)
    assert second.status_code == 200
    detail = client.get("/api/patients/tariro").json()
    assert detail["session_count"] == 13
    assert sum(1 for s in detail["sessions"] if s["id"] == body["id"]) == 1
    # An update with new values replaces the old ones.
    client.post("/api/sessions", json={**body, "pain_after": 3})
    detail = client.get("/api/patients/tariro").json()
    assert next(s for s in detail["sessions"] if s["id"] == body["id"])["pain_after"] == 3
    assert detail["session_count"] == 13


def test_alert_created_when_pain_rises_by_2(client):
    res = client.post("/api/sessions", json=session_body(pain_after=4)).json()
    assert [a["type"] for a in res["alerts"]] == ["Pain increase"]
    assert res["alerts"][0]["message"] == "Pain increased to 4/10 compared with recent baseline."


def test_no_alert_when_pain_rises_by_1(client):
    res = client.post("/api/sessions", json=session_body(pain_after=3)).json()
    assert res["alerts"] == []


def test_resending_a_session_does_not_duplicate_alerts(client):
    body = session_body(pain_after=5)
    client.post("/api/sessions", json=body)
    client.post("/api/sessions", json=body)
    alerts = [a for a in client.get("/api/alerts?resolved=false").json() if a["patient_id"] == "tariro"]
    assert len(alerts) == 1


def test_score_and_range_drop_alerts(client):
    res = client.post("/api/sessions", json=session_body(movement_score=70.0, avg_top_angle=75.0)).json()
    types = sorted(a["type"] for a in res["alerts"])
    assert types == ["Range of motion", "Score drop"]
    msgs = " ".join(a["message"] for a in res["alerts"])
    assert "Movement score dropped from" in msgs
    assert "Range of motion decreased" in msgs


def test_deeper_squat_is_not_a_range_drop(client):
    # Liam's squats have reached ~134°; going deeper (smaller angle) is progress, shallower is a drop.
    deeper = client.post(
        "/api/sessions", json=session_body("liam", exercise_id="mini_squat", avg_top_angle=120.0, movement_score=84.0, pain_after=3)
    ).json()
    assert [a["type"] for a in deeper["alerts"]] == []
    shallower = client.post(
        "/api/sessions", json=session_body("liam", exercise_id="mini_squat", avg_top_angle=160.0, movement_score=84.0, pain_after=3)
    ).json()
    assert [a["type"] for a in shallower["alerts"]] == ["Range of motion"]


def test_resolve_alert(client):
    alert = client.get("/api/alerts?resolved=false").json()[0]
    assert client.post(f"/api/alerts/{alert['id']}/resolve").json()["resolved"] is True
    assert client.get("/api/alerts?resolved=false").json() == []


def test_add_patient_appears_with_no_sessions(client):
    res = client.post(
        "/api/patients",
        json={
            "name": "Rudo Chikore",
            "contact": "rudo@example.com",
            "condition": "Shoulder rehabilitation",
            "programs": [{"exercise_id": "shoulder_abduction", "sets": 3, "reps": 10, "target_angle": 90}],
        },
    )
    assert res.status_code == 201
    p = res.json()
    assert p["initials"] == "RC"
    assert p["session_count"] == 0
    assert any(x["id"] == p["id"] for x in client.get("/api/patients").json())


def test_replace_programs(client):
    res = client.put(
        "/api/patients/tariro/programs",
        json={"programs": [{"exercise_id": "shoulder_flexion", "sets": 2, "reps": 8}]},
    ).json()
    active = [p for p in res["programs"] if p["active"]]
    assert [p["exercise_id"] for p in active] == ["shoulder_flexion"]


def test_adherence_alert_raised_on_roster_load(client):
    created = client.post(
        "/api/patients",
        json={"name": "Old Patient", "condition": "Knee", "programs": [{"exercise_id": "mini_squat", "sets": 3, "reps": 10}]},
    ).json()
    # Session 5 days ago, nothing since.
    client.post(
        "/api/sessions",
        json=session_body(created["id"], exercise_id="mini_squat", started_at=iso(datetime.now(timezone.utc) - timedelta(days=5))),
    )
    client.get("/api/patients")
    client.get("/api/patients")  # loading twice must not duplicate the alert
    alerts = [a for a in client.get("/api/alerts?resolved=false").json() if a["patient_id"] == created["id"]]
    assert len(alerts) == 1
    assert alerts[0]["type"] == "Adherence"


def test_screening_upsert_creates_athlete(client):
    body = {
        "id": uuid.uuid4().hex,
        "athlete_id": uuid.uuid4().hex,
        "athlete_name": "New Athlete",
        "sport": "football",
        "results_json": {"observations": [], "tests": []},
        "overall": "good",
    }
    assert client.post("/api/screenings", json=body).status_code == 200
    assert client.post("/api/screenings", json=body).status_code == 200
    assert sum(1 for s in client.get("/api/screenings").json() if s["id"] == body["id"]) == 1
    assert any(a["name"] == "New Athlete" for a in client.get("/api/athletes").json())


def test_unknown_patient_session_is_rejected(client):
    assert client.post("/api/sessions", json=session_body("nobody")).status_code == 404


def test_datetimes_are_utc_with_z(client):
    detail = client.get("/api/patients/tariro").json()
    assert detail["sessions"][0]["started_at"].endswith("Z")


def test_seed_endpoint_resets(client):
    client.post("/api/sessions", json=session_body())
    assert client.post("/api/seed").json() == {"status": "seeded"}
    assert client.get("/api/patients/tariro").json()["session_count"] == 12
