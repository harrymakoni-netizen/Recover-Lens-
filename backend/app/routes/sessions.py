from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..alerts import rerun_session_alerts
from ..db import get_db
from ..models import ExerciseSession, Patient
from ..schemas import SessionIn, alert_out, session_out, to_utc

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("")
def upsert_session(body: SessionIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Upsert by client-generated id, then run the alert check. Returns the alerts created."""
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    data = body.model_dump()
    data["started_at"] = to_utc(body.started_at)
    data["correct_reps"] = min(body.correct_reps, body.reps)

    existing = db.get(ExerciseSession, body.id)
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        session = existing
    else:
        session = ExerciseSession(**data)
    db.add(session)
    db.flush()
    alerts = rerun_session_alerts(db, session)
    db.commit()
    db.refresh(session)
    return {
        "session": session_out(session),
        "alerts": [alert_out(a, patient.name) for a in alerts],
    }
