"""Recovery intelligence (SPEC §9.3): regression alerts and adherence."""

import uuid
from datetime import datetime, timedelta
from statistics import mean
from typing import Optional

from sqlmodel import Session, col, select

from .models import Alert, ExerciseSession, Patient, Program, utcnow
from .schemas import to_utc

SCORE_DROP_POINTS = 8
ANGLE_DROP_FRACTION = 0.08
PAIN_RISE_POINTS = 2
ADHERENCE_GAP_DAYS = 3
ADHERENCE_WINDOW_DAYS = 14
BASELINE_SESSIONS = 3

# Exercises where a smaller angle means more range (a deeper squat). For these, range of motion
# is measured as knee flexion = 180° - angle.
DECREASING_ANGLE_EXERCISES = {"mini_squat", "squat_screen", "single_leg_squat"}


def range_of_motion(exercise_id: str, angle: float) -> float:
    return 180 - angle if exercise_id in DECREASING_ANGLE_EXERCISES else angle


def _new_alert(patient_id: str, session_id: Optional[str], type_: str, message: str) -> Alert:
    return Alert(id=uuid.uuid4().hex, patient_id=patient_id, session_id=session_id, type=type_, message=message)


def check_session(db: Session, s: ExerciseSession) -> list[Alert]:
    """Compare a session with the mean of the patient's previous 3 sessions of the same exercise."""
    previous = db.exec(
        select(ExerciseSession)
        .where(
            ExerciseSession.patient_id == s.patient_id,
            ExerciseSession.exercise_id == s.exercise_id,
            ExerciseSession.id != s.id,
            ExerciseSession.started_at < s.started_at,
        )
        .order_by(col(ExerciseSession.started_at).desc())
        .limit(BASELINE_SESSIONS)
    ).all()
    if not previous:
        return []

    alerts: list[Alert] = []
    scores = [p.movement_score for p in previous if p.movement_score is not None]
    if s.movement_score is not None and scores:
        base = mean(scores)
        if base - s.movement_score > SCORE_DROP_POINTS:
            alerts.append(
                _new_alert(
                    s.patient_id, s.id, "Score drop",
                    f"Movement score dropped from {round(base)} to {round(s.movement_score)}.",
                )
            )

    roms = [range_of_motion(p.exercise_id, p.avg_top_angle) for p in previous if p.avg_top_angle is not None]
    if s.avg_top_angle is not None and roms:
        base = mean(roms)
        current = range_of_motion(s.exercise_id, s.avg_top_angle)
        if base > 0 and (base - current) / base > ANGLE_DROP_FRACTION:
            pct = round((base - current) / base * 100)
            alerts.append(_new_alert(s.patient_id, s.id, "Range of motion", f"Range of motion decreased {pct}%."))

    pains = [p.pain_after for p in previous if p.pain_after is not None]
    if s.pain_after is not None and pains:
        if s.pain_after - mean(pains) >= PAIN_RISE_POINTS:
            alerts.append(
                _new_alert(
                    s.patient_id, s.id, "Pain increase",
                    f"Pain increased to {s.pain_after}/10 compared with recent baseline.",
                )
            )
    return alerts


def rerun_session_alerts(db: Session, s: ExerciseSession) -> list[Alert]:
    """Upsert-safe: replace this session's unresolved alerts with a fresh check."""
    for old in db.exec(select(Alert).where(Alert.session_id == s.id, Alert.resolved == False)).all():  # noqa: E712
        db.delete(old)
    alerts = check_session(db, s)
    for a in alerts:
        db.add(a)
    return alerts


def adherence(db: Session, patient: Patient, now: Optional[datetime] = None) -> float:
    """Sessions completed in the last 14 days ÷ sessions prescribed in the last 14 days (daily per program)."""
    now = now or utcnow()
    programs = db.exec(select(Program).where(Program.patient_id == patient.id, Program.active == True)).all()  # noqa: E712
    if not programs:
        return 0.0
    since = now - timedelta(days=ADHERENCE_WINDOW_DAYS)
    days_active = max(1, min(ADHERENCE_WINDOW_DAYS, (now - to_utc(patient.created_at)).days + 1))
    prescribed = days_active * len(programs)
    done = db.exec(
        select(ExerciseSession).where(ExerciseSession.patient_id == patient.id, ExerciseSession.started_at >= since)
    ).all()
    return min(100.0, round(len(done) / prescribed * 100, 1))


def check_adherence(db: Session, patient: Patient, last_session: Optional[datetime], now: Optional[datetime] = None) -> Optional[Alert]:
    """No session in the last 3 days while a program is active → adherence alert (once until reviewed)."""
    now = now or utcnow()
    has_program = db.exec(
        select(Program).where(Program.patient_id == patient.id, Program.active == True)  # noqa: E712
    ).first()
    if not has_program:
        return None
    reference = to_utc(last_session or patient.created_at)
    gap = (now - reference).days
    if gap < ADHERENCE_GAP_DAYS:
        return None
    open_alert = db.exec(
        select(Alert).where(Alert.patient_id == patient.id, Alert.type == "Adherence", Alert.resolved == False)  # noqa: E712
    ).first()
    if open_alert:
        return None
    msg = f"No session in the last {gap} days." if last_session else f"No sessions since being added {gap} days ago."
    alert = _new_alert(patient.id, None, "Adherence", msg)
    db.add(alert)
    return alert
