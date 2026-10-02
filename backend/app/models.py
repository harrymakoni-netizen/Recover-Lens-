"""Database models (SPEC §9.1). One SQLite file; swap DATABASE_URL for Postgres later."""

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Clinician(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str


class Patient(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    contact: str = ""
    condition: str
    clinician_id: str = Field(foreign_key="clinician.id")
    created_at: datetime = Field(default_factory=utcnow)


class Program(SQLModel, table=True):
    id: str = Field(primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    exercise_id: str
    sets: int
    reps: int
    target_angle: Optional[float] = None
    active: bool = True


class ExerciseSession(SQLModel, table=True):
    __tablename__ = "sessions"

    # Generated on the client so offline retries never create duplicates.
    id: str = Field(primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    exercise_id: str
    mode: str = "self"  # self | caregiver
    started_at: datetime
    duration_s: int = 0
    reps: int = 0
    correct_reps: int = 0
    avg_top_angle: Optional[float] = None
    movement_score: Optional[float] = None
    torso_alignment_avg: Optional[float] = None
    symmetry_avg: Optional[float] = None
    top_fault: Optional[str] = None
    pain_before: Optional[int] = None
    pain_after: Optional[int] = None
    pain_confirmed_by_patient: bool = True
    manual: bool = False


class Athlete(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    sport: str
    team: Optional[str] = None


class Screening(SQLModel, table=True):
    id: str = Field(primary_key=True)
    athlete_id: str = Field(foreign_key="athlete.id", index=True)
    sport: str
    created_at: datetime = Field(default_factory=utcnow)
    results_json: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    overall: str  # good | review


class Alert(SQLModel, table=True):
    id: str = Field(primary_key=True)
    patient_id: str = Field(foreign_key="patient.id", index=True)
    session_id: Optional[str] = None
    type: str
    message: str
    created_at: datetime = Field(default_factory=utcnow)
    resolved: bool = False
