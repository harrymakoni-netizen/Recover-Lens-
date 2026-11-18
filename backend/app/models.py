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


class DemoState(SQLModel, table=True):
    """When the demo data was last created (SPEC §9.5): shown beside the reset button, and used to
    stop the public reset being pressed over and over."""

    id: str = Field(default="demo", primary_key=True)
    seeded_at: datetime
    source: str = "start"  # start | button | nightly


class Patient(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    contact: str = ""
    condition: str
    clinician_id: str = Field(foreign_key="clinician.id")
    created_at: datetime = Field(default_factory=utcnow)
    # Set by the physiotherapist (SPEC §17.3). None or True: the AI coach may be used; False: rules only.
    coach_ai_allowed: Optional[bool] = None


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
    # Fatigue signs measured on the device from the session's own reps (frontend pose/fatigue.ts).
    fatigue_level: Optional[str] = None  # none | slight | clear
    fatigue_slower_pct: Optional[int] = None
    fatigue_shorter_pct: Optional[int] = None
    fatigue_form_points: Optional[int] = None
    # Weight held in the hand and the joint-load estimate (frontend pose/effort.ts), N·m.
    load_kg: Optional[float] = None
    peak_torque_nm: Optional[float] = None
    # How well the camera could follow the session, and what a person should look at (SPEC §17.12).
    tracking_coverage: Optional[int] = None  # % of the active time the needed joints were in view
    review_flags: Optional[str] = None  # comma list: tracking_gaps, arms_used
    arms_used_reps: Optional[int] = None  # chair stand: stands in which a wrist left the chest
    reach_target_pct: Optional[float] = None  # seated reach: target, % of torso length
    reach_peak_pct: Optional[float] = None  # seated reach: mean furthest reach per rep
    reach_hold_s: Optional[float] = None
    trunk_lean_max_deg: Optional[float] = None  # seated reach: most the trunk leaned beyond its start


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


class CoachEvent(SQLModel, table=True):
    """Audit log of every coach model call (SPEC §17.3): what was sent, what came back, which model.

    patient_id is not a foreign key: a check-in can come from a device not yet linked to a patient.
    """

    id: str = Field(primary_key=True)
    patient_id: Optional[str] = Field(default=None, index=True)
    kind: str  # extract | plan
    created_at: datetime = Field(default_factory=utcnow)
    model: Optional[str] = None
    ok: bool = True
    latency_ms: int = 0
    input_json: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    output_json: Optional[Any] = Field(default=None, sa_column=Column(JSON))
    error: Optional[str] = None


class SharedHabitDay(SQLModel, table=True):
    """A day of habit values the patient chose to share with their physiotherapist (SPEC §17.10).

    Only habits switched to "share" ever arrive here; the patient's device sends its full shared set
    each time, so turning sharing off (or deleting habit data) removes it here too.
    """

    id: str = Field(primary_key=True)  # f"{patient_id}:{day}"
    patient_id: str = Field(index=True)
    day: str  # YYYY-MM-DD in the patient's time zone
    values_json: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=utcnow)
