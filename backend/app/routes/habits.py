"""Habits a patient chose to share with their physiotherapist (SPEC §17.10).

Habit logs live on the patient's phone. Only habits the patient switched to "share" are sent, and the
phone always sends the whole shared set, so this table mirrors the patient's choice exactly.
"""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, col, delete, select

from ..db import get_db
from ..models import Patient, SharedHabitDay, utcnow

router = APIRouter(prefix="/habits", tags=["habits"])

LIMITS = {"sleep": (0, 14), "water": (0, 16), "veg": (0, 10), "walk": (0, 120)}


class HabitDayIn(BaseModel):
    day: str
    values: dict[str, float]

    @field_validator("day")
    @classmethod
    def valid_day(cls, v: str) -> str:
        date.fromisoformat(v)
        return v

    @field_validator("values")
    @classmethod
    def valid_values(cls, v: dict[str, float]) -> dict[str, float]:
        for k, x in v.items():
            if k not in LIMITS:
                raise ValueError(f"unknown habit {k}")
            lo, hi = LIMITS[k]
            if not lo <= x <= hi:
                raise ValueError(f"{k} out of range")
        return v


class SharedIn(BaseModel):
    days: list[HabitDayIn] = Field(max_length=60)


def _patient(db: Session, patient_id: str) -> None:
    if not db.get(Patient, patient_id):
        raise HTTPException(404, "Patient not found")


@router.put("/{patient_id}")
def replace_shared(patient_id: str, body: SharedIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Replace everything shared for this patient with what the phone sends now."""
    _patient(db, patient_id)
    db.exec(delete(SharedHabitDay).where(col(SharedHabitDay.patient_id) == patient_id))
    for d in body.days:
        if d.values:
            db.add(SharedHabitDay(id=f"{patient_id}:{d.day}", patient_id=patient_id, day=d.day, values_json=d.values, updated_at=utcnow()))
    db.commit()
    return {"shared_days": sum(1 for d in body.days if d.values)}


@router.get("/{patient_id}")
def list_shared(patient_id: str, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    _patient(db, patient_id)
    rows = db.exec(select(SharedHabitDay).where(col(SharedHabitDay.patient_id) == patient_id).order_by(col(SharedHabitDay.day))).all()
    return [{"day": r.day, "values": r.values_json} for r in rows]


@router.delete("/{patient_id}")
def delete_shared(patient_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    _patient(db, patient_id)
    db.exec(delete(SharedHabitDay).where(col(SharedHabitDay.patient_id) == patient_id))
    db.commit()
    return {"deleted": True}
