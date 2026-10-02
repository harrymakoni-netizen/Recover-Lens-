from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from ..db import get_db
from ..models import Alert, Patient
from ..schemas import alert_out

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts(resolved: Optional[bool] = None, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    q = select(Alert, Patient).join(Patient, col(Patient.id) == Alert.patient_id).order_by(col(Alert.created_at).desc())
    if resolved is not None:
        q = q.where(Alert.resolved == resolved)
    return [alert_out(a, p.name) for a, p in db.exec(q).all()]


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.resolved = True
    db.add(alert)
    db.commit()
    db.refresh(alert)
    patient = db.get(Patient, alert.patient_id)
    return alert_out(alert, patient.name if patient else None)
