"""Adaptive coach endpoints (SPEC §17). The answers are proposals: the browser validates them."""

import time
import uuid
from typing import Annotated, Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from .. import coach
from ..db import get_db
from ..models import CoachEvent, Patient

router = APIRouter(prefix="/coach", tags=["coach"])

Language = Literal["en", "sn", "nd"]
BodyArea = Literal["neck", "shoulder", "elbow", "wrist", "back", "hip", "knee", "ankle", "other"]
Barrier = Literal["pain", "time", "motivation", "forgot", "space", "other"]
RedFlag = Literal["severe_pain", "chest_pain", "numbness", "swelling", "fall", "dizziness", "breathless"]


class ExtractIn(BaseModel):
    patient_id: Optional[str] = Field(None, max_length=64)
    text: str = Field(min_length=1, max_length=500)
    language: Language = "en"


class ExtractionIn(BaseModel):
    painLevel: Optional[int] = Field(None, ge=0, le=10)
    bodyAreas: list[BodyArea] = Field(default_factory=list, max_length=9)
    symptoms: list[Annotated[str, Field(max_length=60)]] = Field(default_factory=list, max_length=8)
    energy: Optional[Literal["low", "ok", "high"]] = None
    minutesAvailable: Optional[int] = Field(None, ge=1, le=180)
    barriers: list[Barrier] = Field(default_factory=list, max_length=6)
    redFlags: list[RedFlag] = Field(default_factory=list, max_length=7)


class LibraryItemIn(BaseModel):
    id: str = Field(max_length=64, pattern=r"^[a-z0-9_]+$")
    name: str = Field(max_length=80)
    region: str = Field(max_length=20)
    kind: Literal["reps", "hold", "guided"]
    sets: int = Field(ge=1, le=10)
    reps: int = Field(ge=1, le=50)
    holdSeconds: Optional[int] = Field(None, ge=1, le=300)


class PlanIn(BaseModel):
    patient_id: Optional[str] = Field(None, max_length=64)
    language: Language = "en"
    extraction: ExtractionIn
    library: list[LibraryItemIn] = Field(min_length=1, max_length=20)
    minutes_available: Optional[int] = Field(None, ge=1, le=180)


def _log(db: Session, kind: str, patient_id: Optional[str], started: float, inp: Any, out: Any, model: Optional[str], error: Optional[str]) -> None:
    db.add(
        CoachEvent(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            kind=kind,
            model=model,
            ok=error is None,
            latency_ms=int((time.monotonic() - started) * 1000),
            input_json=inp,
            output_json=out,
            error=error,
        )
    )
    db.commit()


class MessageIn(BaseModel):
    patient_id: Optional[str] = Field(None, max_length=64)
    language: Language = "en"
    nudge: Literal["gentle", "small_step", "progress", "social"] = "gentle"
    barrier: Optional[Barrier] = None
    days_since: int = Field(ge=0, le=3650)
    active_days_28: int = Field(0, ge=0, le=28)
    total_active_days: int = Field(0, ge=0, le=100000)


@router.post("/message")
def message(body: MessageIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """A short, blame-free welcome-back message. The browser checks its length and falls back to a
    translated template when the model is unavailable."""
    _check_allowed(db, body.patient_id)
    started = time.monotonic()
    system, user = coach.message_prompt(body.language, body.nudge, body.barrier, body.days_since, body.active_days_28, body.total_active_days)
    inp = body.model_dump(exclude={"patient_id"})
    try:
        out, model = coach.call_model(system, user, "comeback_message", coach.MESSAGE_SCHEMA)
    except coach.CoachUnavailable as exc:
        _log(db, "message", body.patient_id, started, inp, None, None, str(exc))
        raise _unavailable(str(exc)) from exc
    _log(db, "message", body.patient_id, started, inp, out, model, None)
    return {"message": out.get("message", "") if isinstance(out, dict) else "", "model": model}


@router.get("/status")
def status(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Whether the model is configured and how the last call went. Makes no model call and never
    reveals the key, so it is safe to leave public; the app can use it to say AI is available."""
    last = db.exec(select(CoachEvent).order_by(col(CoachEvent.created_at).desc()).limit(1)).first()
    return {
        "configured": coach.configured(),
        "models": coach.models(),
        "last_call": None
        if last is None
        else {"kind": last.kind, "ok": last.ok, "model": last.model, "at": last.created_at, "error": last.error},
    }


def _check_allowed(db: Session, patient_id: Optional[str]) -> None:
    """A physiotherapist can switch the AI coach off for a patient; then no model is called."""
    if patient_id:
        patient = db.get(Patient, patient_id)
        if patient and patient.coach_ai_allowed is False:
            raise HTTPException(403, {"error": "The AI coach is turned off for this patient", "fallback": "rules"})


@router.get("/events")
def list_events(patient_id: str, limit: int = 20, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    """The audit log for one patient, newest first, for the clinician (SPEC §17.3)."""
    rows = db.exec(
        select(CoachEvent).where(CoachEvent.patient_id == patient_id).order_by(col(CoachEvent.created_at).desc()).limit(max(1, min(limit, 50)))
    ).all()
    return [
        {
            "id": e.id,
            "kind": e.kind,
            "created_at": e.created_at.isoformat().replace("+00:00", "Z") if e.created_at.tzinfo else e.created_at.isoformat() + "Z",
            "model": e.model,
            "ok": e.ok,
            "latency_ms": e.latency_ms,
            "input": e.input_json,
            "output": e.output_json,
            "error": e.error,
        }
        for e in rows
    ]


def _unavailable(reason: str) -> HTTPException:
    return HTTPException(503, {"error": "The coach model is unavailable", "reason": reason, "fallback": "rules"})


@router.post("/extract")
def extract(body: ExtractIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    _check_allowed(db, body.patient_id)
    started = time.monotonic()
    text = coach.redact(body.text)
    system, user = coach.extraction_prompt(text, body.language)
    inp = {"text": text, "language": body.language}
    try:
        out, model = coach.call_model(system, user, "checkin_extraction", coach.EXTRACTION_SCHEMA)
    except coach.CoachUnavailable as exc:
        _log(db, "extract", body.patient_id, started, inp, None, None, str(exc))
        raise _unavailable(str(exc)) from exc
    _log(db, "extract", body.patient_id, started, inp, out, model, None)
    return {"extraction": out, "model": model}


@router.post("/plan")
def plan(body: PlanIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    # Defence in depth: the browser never asks for a plan after a red flag, and neither does this.
    if body.extraction.redFlags:
        raise HTTPException(409, {"error": "A red flag was reported; no plan is made", "red_flag": True})
    _check_allowed(db, body.patient_id)
    started = time.monotonic()
    extraction = body.extraction.model_dump()
    library = [item.model_dump(exclude_none=True) for item in body.library]
    ids = sorted({item["id"] for item in library})
    system, user = coach.plan_prompt(extraction, library, body.minutes_available, body.language)
    inp = {"extraction": extraction, "library_ids": ids, "minutes_available": body.minutes_available, "language": body.language}
    try:
        out, model = coach.call_model(system, user, "session_plan", coach.plan_schema(ids))
    except coach.CoachUnavailable as exc:
        _log(db, "plan", body.patient_id, started, inp, None, None, str(exc))
        raise _unavailable(str(exc)) from exc
    _log(db, "plan", body.patient_id, started, inp, out, model, None)
    return {"plan": out, "model": model}
