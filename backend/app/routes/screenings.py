from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from ..db import get_db
from ..models import Athlete, Screening, utcnow
from ..schemas import ScreeningIn, athlete_out, screening_out, to_utc

router = APIRouter(tags=["screenings"])


@router.get("/athletes")
def list_athletes(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [athlete_out(a) for a in db.exec(select(Athlete).order_by(Athlete.name)).all()]


@router.post("/screenings")
def upsert_screening(body: ScreeningIn, db: Session = Depends(get_db)) -> dict[str, Any]:
    athlete = db.get(Athlete, body.athlete_id)
    if not athlete:
        if not body.athlete_name:
            raise HTTPException(400, "Unknown athlete: athlete_name is required to create one")
        athlete = Athlete(id=body.athlete_id, name=body.athlete_name.strip(), sport=body.sport)
        db.add(athlete)
        db.flush()

    data = {
        "athlete_id": athlete.id,
        "sport": body.sport,
        "created_at": to_utc(body.created_at) if body.created_at else utcnow(),
        "results_json": body.results_json,
        "overall": body.overall,
    }
    screening = db.get(Screening, body.id)
    if screening:
        for k, v in data.items():
            setattr(screening, k, v)
    else:
        screening = Screening(id=body.id, **data)
    db.add(screening)
    db.commit()
    db.refresh(screening)
    return screening_out(screening, athlete.name)


@router.get("/screenings")
def list_screenings(sport: Optional[str] = None, db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    q = (
        select(Screening, Athlete)
        .join(Athlete, col(Athlete.id) == Screening.athlete_id)
        .order_by(col(Screening.created_at).desc())
    )
    if sport:
        q = q.where(Screening.sport == sport)
    return [screening_out(s, a.name) for s, a in db.exec(q).all()]
