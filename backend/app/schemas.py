"""Request bodies and JSON serializers (datetimes always go out as UTC with a Z)."""

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .models import Alert, Athlete, ExerciseSession, Program, Screening


def to_utc(dt: datetime) -> datetime:
    """Aware UTC datetime. Naive input is assumed to already be UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    return to_utc(dt).replace(tzinfo=None).isoformat(timespec="seconds") + "Z"


def initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    return "".join(p[0].upper() for p in parts[:2]) or "?"


class ProgramIn(BaseModel):
    exercise_id: str = Field(min_length=1)
    sets: int = Field(ge=1, le=20)
    reps: int = Field(ge=1, le=100)
    target_angle: Optional[float] = None


class PatientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    contact: str = ""
    condition: str = Field(min_length=2, max_length=200)
    programs: list[ProgramIn] = []


class ProgramsIn(BaseModel):
    programs: list[ProgramIn]


class SessionIn(BaseModel):
    id: str = Field(min_length=8, max_length=64)
    patient_id: str
    exercise_id: str
    mode: Literal["self", "caregiver"] = "self"
    started_at: datetime
    duration_s: int = Field(default=0, ge=0)
    reps: int = Field(default=0, ge=0)
    correct_reps: int = Field(default=0, ge=0)
    avg_top_angle: Optional[float] = None
    movement_score: Optional[float] = Field(default=None, ge=0, le=100)
    torso_alignment_avg: Optional[float] = None
    symmetry_avg: Optional[float] = None
    top_fault: Optional[str] = None
    pain_before: Optional[int] = Field(default=None, ge=0, le=10)
    pain_after: Optional[int] = Field(default=None, ge=0, le=10)
    pain_confirmed_by_patient: bool = True
    manual: bool = False


class ScreeningIn(BaseModel):
    id: str = Field(min_length=8, max_length=64)
    athlete_id: str
    athlete_name: Optional[str] = None
    sport: Literal["football", "basketball", "running", "general"]
    created_at: Optional[datetime] = None
    results_json: dict[str, Any]
    overall: Literal["good", "review"]


def program_out(p: Program) -> dict[str, Any]:
    return {
        "id": p.id,
        "patient_id": p.patient_id,
        "exercise_id": p.exercise_id,
        "sets": p.sets,
        "reps": p.reps,
        "target_angle": p.target_angle,
        "active": p.active,
    }


def session_out(s: ExerciseSession) -> dict[str, Any]:
    return {
        "id": s.id,
        "patient_id": s.patient_id,
        "exercise_id": s.exercise_id,
        "mode": s.mode,
        "started_at": iso(s.started_at),
        "duration_s": s.duration_s,
        "reps": s.reps,
        "correct_reps": s.correct_reps,
        "avg_top_angle": s.avg_top_angle,
        "movement_score": s.movement_score,
        "torso_alignment_avg": s.torso_alignment_avg,
        "symmetry_avg": s.symmetry_avg,
        "top_fault": s.top_fault,
        "pain_before": s.pain_before,
        "pain_after": s.pain_after,
        "pain_confirmed_by_patient": s.pain_confirmed_by_patient,
        "manual": s.manual,
    }


def alert_out(a: Alert, patient_name: Optional[str] = None) -> dict[str, Any]:
    return {
        "id": a.id,
        "patient_id": a.patient_id,
        "patient_name": patient_name,
        "session_id": a.session_id,
        "type": a.type,
        "message": a.message,
        "created_at": iso(a.created_at),
        "resolved": a.resolved,
    }


def athlete_out(a: Athlete) -> dict[str, Any]:
    return {"id": a.id, "name": a.name, "sport": a.sport, "team": a.team}


def screening_out(s: Screening, athlete_name: Optional[str]) -> dict[str, Any]:
    return {
        "id": s.id,
        "athlete_id": s.athlete_id,
        "athlete_name": athlete_name,
        "sport": s.sport,
        "created_at": iso(s.created_at),
        "results_json": s.results_json,
        "overall": s.overall,
    }
