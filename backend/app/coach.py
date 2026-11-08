"""Adaptive coach: the Gemini client, prompts and output schemas (SPEC §17).

The model only proposes. The browser checks every answer with plain code before a patient sees
it (frontend/src/coach/): red flags first, then the plan validator. This module never sees video,
only short check-in text with contact details removed.

Gemini is called through its OpenAI-compatible endpoint, so another provider can be swapped in by
changing COACH_MODEL_URL, GEMINI_MODELS and the key.
"""

import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any

ENDPOINT = os.environ.get("COACH_MODEL_URL", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
# Tried in order: a busy model (503/429) or a slow one falls through to the next.
DEFAULT_MODELS = "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.6-flash"
# Whole budget for one request across all models; a serverless function must answer in time.
TOTAL_TIMEOUT_S = float(os.environ.get("COACH_TIMEOUT_S", "9"))
# A model that hangs must not use up the whole budget.
PER_MODEL_TIMEOUT_S = float(os.environ.get("COACH_MODEL_TIMEOUT_S", "5"))

LANGUAGES = {"en": "English", "sn": "chiShona", "nd": "isiNdebele (Zimbabwe)"}
BODY_AREAS = ["neck", "shoulder", "elbow", "wrist", "back", "hip", "knee", "ankle", "other"]
ENERGIES = ["low", "ok", "high"]
BARRIERS = ["pain", "time", "motivation", "forgot", "space", "other"]
RED_FLAGS = ["severe_pain", "chest_pain", "numbness", "swelling", "fall", "dizziness", "breathless"]
TECHNIQUES = ["goal_setting", "self_monitoring", "graded_tasks", "action_planning", "social_support"]


class CoachUnavailable(Exception):
    """No model answered usefully; the browser falls back to the rules-only plan."""


def configured() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def models() -> list[str]:
    return [m.strip() for m in os.environ.get("GEMINI_MODELS", DEFAULT_MODELS).split(",") if m.strip()]


_REDACT = [
    (re.compile(r"\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b"), "[email]"),
    (re.compile(r"\b(?:https?://|www\.)[^\s,;)]*[^\s,;).]", re.I), "[link]"),
    (re.compile(r"\+?\d[\d\s.-]{5,}\d"), "[number]"),
]


def redact(text: str) -> str:
    """Same rules as frontend/src/coach/redact.ts, applied again in case a client skipped them."""
    for pattern, label in _REDACT:
        text = pattern.sub(label, text)
    return re.sub(r"\s+", " ", text).strip()[:500]


def _json_from(content: str) -> Any:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content)
    return json.loads(content)


def call_model(system: str, user: str, name: str, schema: dict[str, Any]) -> tuple[Any, str]:
    """Ask each model in turn for JSON matching `schema`. Returns (parsed JSON, model name)."""
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise CoachUnavailable("GEMINI_API_KEY is not set")
    deadline = time.monotonic() + TOTAL_TIMEOUT_S
    last = "no model configured"
    for model in models():
        remaining = deadline - time.monotonic()
        if remaining < 1:
            break
        body = {
            "model": model,
            "temperature": 0.2,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "response_format": {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}},
        }
        req = urllib.request.Request(
            ENDPOINT,
            data=json.dumps(body).encode(),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=min(remaining, PER_MODEL_TIMEOUT_S)) as resp:
                data = json.load(resp)
            return _json_from(data["choices"][0]["message"]["content"]), model
        except urllib.error.HTTPError as exc:
            last = f"{model}: HTTP {exc.code}"
            if exc.code in (401, 403):
                break  # the key is wrong; another model will not help
        except (urllib.error.URLError, TimeoutError, OSError, KeyError, IndexError, TypeError, ValueError) as exc:
            last = f"{model}: {type(exc).__name__}"
    raise CoachUnavailable(last)


# --- Check-in extraction -------------------------------------------------------------------

EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "painLevel": {"type": ["integer", "null"], "minimum": 0, "maximum": 10},
        "bodyAreas": {"type": "array", "items": {"type": "string", "enum": BODY_AREAS}},
        "symptoms": {"type": "array", "items": {"type": "string"}},
        "energy": {"type": ["string", "null"], "enum": [*ENERGIES, None]},
        "minutesAvailable": {"type": ["integer", "null"], "minimum": 1, "maximum": 180},
        "barriers": {"type": "array", "items": {"type": "string", "enum": BARRIERS}},
        "redFlags": {"type": "array", "items": {"type": "string", "enum": RED_FLAGS}},
    },
    "required": ["painLevel", "bodyAreas", "symptoms", "energy", "minutesAvailable", "barriers", "redFlags"],
    "additionalProperties": False,
}

EXTRACTION_SYSTEM = """You read a short check-in written by someone doing home rehabilitation exercises, before a session. It may be in English, chiShona or isiNdebele, or a mix. Return only JSON that matches the schema.

Rules:
- Record only what the text says. Use null or an empty list when it does not say.
- painLevel: 0 to 10. Use a number the person gives. If they only describe pain, estimate: "a little sore" about 3, "sore" about 5, "very sore" about 6, "really bad" about 8. Otherwise null.
- bodyAreas: where it hurts or feels wrong.
- symptoms: up to 5 short phrases in English, such as "stiff knee". No diagnoses.
- energy: low for tired, exhausted or unwell; high for full of energy; ok when they say they feel fine.
- minutesAvailable: the time they say they have today.
- barriers: what is getting in the way: pain, time, motivation, forgot, space (no room to exercise), other.
- redFlags: include every mention of chest pain or tightness, numbness or tingling, new swelling, a fall, dizziness or fainting, breathlessness, or severe pain. If you are unsure whether something is a red flag, include it.
- Never give advice or a diagnosis."""


def extraction_prompt(text: str, language: str) -> tuple[str, str]:
    return EXTRACTION_SYSTEM, f"Language selected in the app: {LANGUAGES.get(language, 'English')}.\nCheck-in: {text}"


# --- Session plan --------------------------------------------------------------------------


def plan_schema(exercise_ids: list[str]) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "exerciseId": {"type": "string", "enum": exercise_ids},
                        "sets": {"type": "integer", "minimum": 1},
                        "reps": {"type": "integer", "minimum": 1},
                        "holdSeconds": {"type": ["integer", "null"], "minimum": 1},
                    },
                    "required": ["exerciseId", "sets", "reps", "holdSeconds"],
                    "additionalProperties": False,
                },
            },
            "technique": {"type": "string", "enum": TECHNIQUES},
            "why": {"type": "string"},
        },
        "required": ["items", "technique", "why"],
        "additionalProperties": False,
    }


PLAN_SYSTEM = """You plan today's home rehabilitation session for one person. Their physiotherapist chose the exercises in the library and the dose for each one. Return only JSON that matches the schema.

Rules:
- Use only exercises from the library, by id. Never invent an exercise.
- Never go above an exercise's sets, reps or holdSeconds in the library. You may go lower.
- Fit the session into the minutes available. About 4 seconds per rep, 30 seconds rest between sets and 30 seconds to set up each exercise.
- If an area hurts, use fewer reps for exercises that load it, or leave them out. Pain of 7 or more in an area: leave out exercises that load it.
- Low energy, low motivation or little time: a shorter, easier session that still gets them moving. A small session done is better than a big one skipped.
- technique: the main behaviour-change technique this plan uses: goal_setting, self_monitoring, graded_tasks (making it smaller to make it doable), action_planning, or social_support.
- why: one or two short, warm sentences in {language}, speaking to the person as "you". Say what changed today and why. Never blame, never use guilt, never diagnose, never promise a medical result.
- holdSeconds: a number for hold exercises, otherwise null."""


def plan_prompt(extraction: dict[str, Any], library: list[dict[str, Any]], minutes: int | None, language: str) -> tuple[str, str]:
    system = PLAN_SYSTEM.replace("{language}", LANGUAGES.get(language, "English"))
    user = json.dumps(
        {"today": extraction, "minutesAvailable": minutes or extraction.get("minutesAvailable"), "library": library},
        ensure_ascii=False,
    )
    return system, user


# --- Re-engagement message -----------------------------------------------------------------

NUDGES = ["gentle", "small_step", "progress", "social"]

MESSAGE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {"message": {"type": "string"}},
    "required": ["message"],
    "additionalProperties": False,
}

MESSAGE_STYLES = {
    "gentle": "Reassure them that missing a few days is normal and that coming back is what counts.",
    "small_step": "Invite them to try one very small session today, just a few minutes.",
    "progress": "Remind them that their progress is kept, using the numbers given (active days in the last 4 weeks, total active days).",
    "social": "Suggest doing today's session with a family member or helper nearby.",
}

MESSAGE_SYSTEM = """You write one short message to welcome someone back to their home rehabilitation exercises after a few days away. Return only JSON that matches the schema.

Rules:
- Write in {language}. At most two short sentences and 220 characters.
- Speak to the person as "you". Warm and plain. No names, no emoji.
- Never blame, never use guilt or pressure, never mention a "streak", never say they failed or fell behind.
- Never diagnose or promise a medical result.
- Style: {style}
- If a barrier is given, acknowledge it kindly in a few words."""


def message_prompt(language: str, nudge: str, barrier: str | None, days_since: int, active_days_28: int, total_active_days: int) -> tuple[str, str]:
    system = MESSAGE_SYSTEM.replace("{language}", LANGUAGES.get(language, "English")).replace("{style}", MESSAGE_STYLES.get(nudge, MESSAGE_STYLES["gentle"]))
    user = json.dumps(
        {"daysSinceLastSession": days_since, "activeDaysLast4Weeks": active_days_28, "totalActiveDays": total_active_days, "barrier": barrier},
        ensure_ascii=False,
    )
    return system, user
