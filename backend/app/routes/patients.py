import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from ..alerts import adherence, check_adherence
from ..db import get_db
from ..models import Alert, Clinician, ExerciseSession, Patient, Program
from ..schemas import PatientIn, ProgramIn, ProgramsIn, initials, iso, program_out, session_out

router = APIRouter(prefix="/patients", tags=["patients"])

DEFAULT_CLINICIAN_ID = "dr-demo"


def _summary(db: Session, p: Patient, check_alerts: bool = False) -> dict[str, Any]:
    sessions = db.exec(
        select(ExerciseSession)
        .where(ExerciseSession.patient_id == p.id)
        .order_by(col(ExerciseSession.started_at).desc())
    ).all()
    last = sessions[0].started_at if sessions else None
    if check_alerts:
        check_adherence(db, p, last)
    latest_score = next((s.movement_score for s in sessions if s.movement_score is not None), None)
    programs = db.exec(select(Program).where(Program.patient_id == p.id)).all()
    unresolved = db.exec(select(Alert).where(Alert.patient_id == p.id, Alert.resolved == False)).all()  # noqa: E712
    clinician = db.get(Clinician, p.clinician_id)
    return {
        "id": p.id,
        "name": p.name,
        "initials": initials(p.name),
        "contact": p.contact,
        "condition": p.condition,
        "clinician_id": p.clinician_id,
        "clinician_name": clinician.name if clinician else None,
        "created_at": iso(p.created_at),
        "latest_score": latest_score,
        "adherence": adherence(db, p),
        "unresolved_alerts": len(unresolved),
        "last_session_at": iso(last),
        "session_count": len(sessions),
        "programs": [program_out(pr) for pr in programs],
        "_sessions": sessions,
    }


def _public(d: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in d.items() if not k.startswith("_")}


def _add_programs(db: Session, patient_id: str, programs: list[ProgramIn]) -> None:
    for pr in programs:
        db.add(
            Program(
                id=uuid.uuid4().hex,
                patient_id=patient_id,
                exercise_id=pr.exercise_id,
                sets=pr.sets,
                reps=pr.reps,
                target_angle=pr.target_angle,
            )
        )


@router.get("")
def list_patients(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    patients = db.exec(select(Patient).order_by(Patient.name)).all()
    out = [_public(_summary(db, p, check_alerts=True)) for p in patients]
    db.commit()  # persist any adherence alerts raised while loading the roster
    return out


@router.post("", status_code=201)
def create_patient(body: PatientIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    if not db.get(Clinician, DEFAULT_CLINICIAN_ID):
        db.add(Clinician(id=DEFAULT_CLINICIAN_ID, name="Dr. Demo"))
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-")[:24] or "patient"
    patient = Patient(
        id=f"{slug}-{uuid.uuid4().hex[:6]}",
        name=body.name.strip(),
        contact=body.contact.strip(),
        condition=body.condition.strip(),
        clinician_id=DEFAULT_CLINICIAN_ID,
    )
    db.add(patient)
    db.flush()
    _add_programs(db, patient.id, body.programs)
    db.commit()
    db.refresh(patient)
    return _public(_summary(db, patient))


@router.get("/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    d = _summary(db, patient)
    out = _public(d)
    out["sessions"] = [session_out(s) for s in d["_sessions"]]
    return out


@router.put("/{patient_id}/programs")
def replace_programs(patient_id: str, body: ProgramsIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    for old in db.exec(select(Program).where(Program.patient_id == patient_id, Program.active == True)).all():  # noqa: E712
        old.active = False
        db.add(old)
    _add_programs(db, patient_id, body.programs)
    db.commit()
    return get_patient(patient_id, db)
