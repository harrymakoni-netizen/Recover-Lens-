"""Demo data (SPEC §9.6). `python -m app.seed` resets the database.

- Clinician "Dr. Demo"
- Tariro Moyo: shoulder, improving, 12 sessions
- Liam Ncube: knee, pain went up in the latest session → 1 alert
- Amina Dube: sports return-to-play, high adherence
- 6 athletes across 4 sports with screenings (4 Good, 2 Review)
Sessions are spread over the last 21 days with realistic upward trends.
"""

import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, select

from .alerts import rerun_session_alerts
from .models import Athlete, Clinician, ExerciseSession, Patient, Program, Screening, utcnow

# Copied from docs/exercise_library.json → sports_screening.risk_flag_recommendations
REC_VALGUS = (
    "Consider hip abductor and gluteal strengthening (e.g. FIFA 11+ single-leg stance and squat exercises)."
)
FIFA_VALGUS = "FIFA 11+: Squats (With Toe Raise → One-Leg Squats) and Single-Leg Stance."
FIFA_LANDING = "FIFA 11+: Jumping (Vertical Jumps) focusing on soft, knee-over-toe landings."


def _obs(id_: str, label: str, detail: str, review: bool = False, rec: Optional[str] = None) -> dict[str, Any]:
    return {"id": id_, "label": label, "status": "review" if review else "good", "detail": detail, "recommendation": rec}


def _squat_obs(valgus_left: int = 0) -> list[dict[str, Any]]:
    left_review = valgus_left >= 2
    return [
        _obs(
            "squat_valgus_left", "Left knee alignment",
            f"Left knee drifted inward on {valgus_left} of 5 reps" if valgus_left else "Left knee stayed over the toes",
            left_review, f"{REC_VALGUS} {FIFA_VALGUS}" if left_review else None,
        ),
        _obs("squat_valgus_right", "Right knee alignment", "Right knee stayed over the toes"),
        _obs("squat_symmetry", "Left–right symmetry", "Both sides moved evenly"),
        _obs("squat_torso", "Torso position", "Torso stayed centred"),
        _obs("squat_heels", "Heels", "Heels stayed down"),
    ]


def _screening(sport: str, observations: list[dict[str, Any]], tests: list[dict[str, Any]]) -> dict[str, Any]:
    observations = sorted(observations, key=lambda o: o["status"] != "review")
    return {
        "results": {"observations": observations, "tests": tests},
        "overall": "review" if any(o["status"] == "review" for o in observations) else "good",
    }


SQUAT_TEST = {"id": "squat", "name": "Bodyweight squat ×5", "reps": 5, "score": 86}


def _athletes() -> list[tuple[Athlete, dict[str, Any], int]]:
    balance = [
        _obs("balance_pelvis_left", "Balance on left leg: hips", "Held 20s with hips level"),
        _obs("balance_pelvis_right", "Balance on right leg: hips", "Held 20s with hips level"),
    ]
    return [
        (
            Athlete(id="ath-tendai", name="Tendai Chikwanha", sport="football", team="Harare City U19"),
            _screening("football", _squat_obs(0) + balance, [SQUAT_TEST]),
            6,
        ),
        (
            Athlete(id="ath-farai", name="Farai Mutasa", sport="football", team="Harare City U19"),
            _screening("football", _squat_obs(4) + balance, [SQUAT_TEST]),
            3,
        ),
        (
            Athlete(id="ath-jordan", name="Jordan Lee", sport="basketball", team="Bulawayo Hoops"),
            _screening(
                "basketball",
                _squat_obs(0)
                + [
                    _obs("landing_stiff", "Landing softness", "Landed softly with bent knees"),
                    _obs("landing_valgus", "Knees on landing", "Knees stayed over the toes on landing"),
                ],
                [SQUAT_TEST, {"id": "jump", "name": "Vertical jump landing ×3", "reps": 3, "score": 84}],
            ),
            5,
        ),
        (
            Athlete(id="ath-nyasha", name="Nyasha Sibanda", sport="basketball", team="Bulawayo Hoops"),
            _screening(
                "basketball",
                _squat_obs(0)
                + [
                    _obs(
                        "landing_stiff", "Landing softness", "Stiff landing (knees nearly straight) on 2 of 3 jumps",
                        True, f"{REC_VALGUS}",
                    ),
                    _obs("landing_valgus", "Knees on landing", "Knees stayed over the toes on landing"),
                ],
                [SQUAT_TEST, {"id": "jump", "name": "Vertical jump landing ×3", "reps": 3, "score": 71}],
            ),
            2,
        ),
        (
            Athlete(id="ath-amara", name="Amara Ndlovu", sport="running", team="Mufakose Athletics"),
            _screening(
                "running",
                [
                    _obs("sls_valgus_left", "Left leg squat: knee", "Left knee stayed over the toes"),
                    _obs("sls_valgus_right", "Right leg squat: knee", "Right knee stayed over the toes"),
                    _obs("sls_pelvis_left", "Left leg squat: hips", "Hips stayed level on the left leg"),
                    _obs("sls_pelvis_right", "Right leg squat: hips", "Hips stayed level on the right leg"),
                ],
                [{"id": "sls_left", "name": "Single-leg squat (left leg) ×5", "reps": 5, "score": 88}],
            ),
            4,
        ),
        (
            Athlete(id="ath-thabo", name="Thabo Ncube", sport="general", team=None),
            _screening(
                "general",
                _squat_obs(0) + [_obs("squat_depth", "Squat depth", "Knees bent to about 98° on average")],
                [SQUAT_TEST],
            ),
            1,
        ),
    ]


def _session(
    patient_id: str, exercise_id: str, when: datetime, reps: int, correct: int, score: Optional[float],
    angle: Optional[float], pain_before: int, pain_after: int, fault: Optional[str] = None, mode: str = "self",
) -> ExerciseSession:
    return ExerciseSession(
        id=uuid.uuid4().hex,
        patient_id=patient_id,
        exercise_id=exercise_id,
        mode=mode,
        started_at=when,
        duration_s=reps * 4,
        reps=reps,
        correct_reps=correct,
        avg_top_angle=angle,
        movement_score=score,
        torso_alignment_avg=None if score is None else min(100, score + 4),
        symmetry_avg=None if score is None else min(100, score + 6),
        top_fault=fault,
        pain_before=pain_before,
        pain_after=pain_after,
        pain_confirmed_by_patient=True,
    )


def reset_and_seed(engine: Engine) -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    rng = random.Random(2026)
    now = utcnow().replace(minute=0, second=0, microsecond=0)

    def at(days_ago: float, hour: int = 9) -> datetime:
        return (now - timedelta(days=days_ago)).replace(hour=hour)

    with Session(engine) as db:
        db.add(Clinician(id="dr-demo", name="Dr. Demo"))
        patients = [
            Patient(
                id="tariro", name="Tariro Moyo", contact="+263 77 412 3301",
                condition="Shoulder rehabilitation (rotator cuff repair)", clinician_id="dr-demo",
                created_at=at(24),
            ),
            Patient(
                id="liam", name="Liam Ncube", contact="liam.ncube@example.com",
                condition="Knee rehabilitation (post-ACL reconstruction)", clinician_id="dr-demo",
                created_at=at(22),
            ),
            Patient(
                id="amina", name="Amina Dube", contact="+263 71 908 5520",
                condition="Sports return-to-play (ankle sprain)", clinician_id="dr-demo",
                created_at=at(21),
            ),
        ]
        for p in patients:
            db.add(p)
        db.flush()

        programs = [
            Program(id="prog-tariro-abd", patient_id="tariro", exercise_id="shoulder_abduction", sets=3, reps=10, target_angle=90),
            Program(id="prog-liam-squat", patient_id="liam", exercise_id="mini_squat", sets=3, reps=10, target_angle=135),
            Program(id="prog-amina-squat", patient_id="amina", exercise_id="mini_squat", sets=3, reps=12, target_angle=135),
            Program(id="prog-amina-balance", patient_id="amina", exercise_id="single_leg_balance", sets=2, reps=1, target_angle=None),
        ]
        for pr in programs:
            db.add(pr)
        db.flush()

        sessions: list[ExerciseSession] = []
        # Tariro: 12 shoulder sessions over 21 days, steadily improving.
        tariro_days = [21, 19, 17, 15, 13, 11, 9, 7, 5, 4, 2, 1]
        for i, d in enumerate(tariro_days):
            k = i / (len(tariro_days) - 1)
            score = round(66 + 25 * k + rng.uniform(-1.5, 1.5), 1)
            correct = min(30, round(19 + 10 * k))
            sessions.append(
                _session(
                    "tariro", "shoulder_abduction", at(d, 8 + i % 3), 30, correct, score,
                    round(72 + 20 * k + rng.uniform(-1, 1), 1), 3 if k < 0.5 else 2, 3 if k < 0.4 else 2,
                    "torso_lean" if k < 0.5 else ("asymmetry" if k < 0.8 else None),
                    mode="caregiver" if i in (3, 8) else "self",
                )
            )
        # Liam: 8 knee sessions; pain jumps in the latest one → pain alert.
        liam_days = [20, 17, 14, 11, 8, 6, 3, 0.4]
        for i, d in enumerate(liam_days):
            k = i / (len(liam_days) - 1)
            last = i == len(liam_days) - 1
            sessions.append(
                _session(
                    "liam", "mini_squat", at(d, 17), 30, round(20 + 6 * k), round(70 + 12 * k + rng.uniform(-1, 1), 1),
                    round(142 - 8 * k, 1), 3, 6 if last else 3, "knee_valgus" if k < 0.6 or last else None,
                )
            )
        # Amina: near-daily, both exercises, high adherence.
        for d in range(13, -1, -1):
            if d == 6:
                continue
            k = (13 - d) / 13
            sessions.append(
                _session("amina", "mini_squat", at(d + 0.2, 7), 36, round(30 + 5 * k),
                         round(80 + 12 * k + rng.uniform(-1, 1), 1), round(138 - 4 * k, 1), 1, 1)
            )
            sessions.append(
                _session("amina", "single_leg_balance", at(d + 0.1, 7), 2, 2,
                         round(78 + 14 * k + rng.uniform(-1, 1), 1), None, 1, 1)
            )
        for d in range(20, 13, -2):
            sessions.append(
                _session("amina", "mini_squat", at(d, 7), 36, 28, round(76 + rng.uniform(-1, 1), 1), 136, 2, 2)
            )

        # Insert in time order, running the alert check like the real API does.
        for s in sorted(sessions, key=lambda x: x.started_at):
            db.add(s)
            db.flush()
            rerun_session_alerts(db, s)

        for athlete, screening, days_ago in _athletes():
            db.add(athlete)
            db.flush()
            db.add(
                Screening(
                    id=f"scr-{athlete.id}",
                    athlete_id=athlete.id,
                    sport=athlete.sport,
                    created_at=at(days_ago, 16),
                    results_json=screening["results"],
                    overall=screening["overall"],
                )
            )
        db.commit()


def seed_if_empty(engine: Engine) -> None:
    with Session(engine) as db:
        if db.exec(select(Patient)).first():
            return
    reset_and_seed(engine)


if __name__ == "__main__":
    from .db import make_engine

    from .db import resolve_database_url

    reset_and_seed(make_engine(resolve_database_url()))
    print("Seeded demo data.")
