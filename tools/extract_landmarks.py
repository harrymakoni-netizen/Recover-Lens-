#!/usr/bin/env python3
"""Turn an exercise video into a RecoverLens landmark recording.

Runs the same MediaPipe pose model the app uses (frontend/public/models/pose_landmarker_lite.task)
on every frame and writes JSON in the format of the Mirror debug panel's "Record landmarks"
button, so it can be replayed through the real counting engine:

    pip install mediapipe opencv-python-headless
    python tools/extract_landmarks.py squats.mp4 --exercise mini_squat --reps 5
    cd frontend && npm run eval -- ../squats.landmarks.json

To add it as a regression test, save it as
frontend/src/pose/__tests__/fixtures/recorded_<exercise>_<N>reps.json (N = reps really done).
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = ROOT / "frontend" / "public" / "models" / "pose_landmarker_lite.task"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--exercise", required=True, help="exercise id, e.g. shoulder_abduction, mini_squat")
    ap.add_argument("--reps", type=int, help="reps actually performed (names the output for the test suite)")
    ap.add_argument("--out", type=Path, help="output JSON (default: <video>.landmarks.json)")
    ap.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    ap.add_argument("--fps", type=float, default=30, help="max frames per second to process (default 30)")
    ap.add_argument("--rotate", type=int, choices=[0, 90, 180, 270], default=0, help="extra rotation, if needed")
    args = ap.parse_args()

    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision

    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        print(f"Could not open {args.video}", file=sys.stderr)
        return 1
    detector = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(args.model)),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    )
    rot = {90: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180, 270: cv2.ROTATE_90_COUNTERCLOCKWISE}.get(args.rotate)

    frames = []
    width = height = 0
    last_t = -1e9
    min_gap = 1000 / args.fps
    detected = 0
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        t = cap.get(cv2.CAP_PROP_POS_MSEC)
        if t - last_t < min_gap - 1:
            continue
        last_t = t
        if rot is not None:
            bgr = cv2.rotate(bgr, rot)
        height, width = bgr.shape[:2]
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        result = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(t))
        if result.pose_landmarks:
            detected += 1
            lm = [[round(p.x, 4), round(p.y, 4), round(p.z, 4), round(p.visibility, 2)] for p in result.pose_landmarks[0]]
            w = [[round(p.x, 4), round(p.y, 4), round(p.z, 4)] for p in result.pose_world_landmarks[0]]
            frames.append({"t": round(t), "lm": lm, "w": w})
        else:
            frames.append({"t": round(t), "lm": None, "w": None})

    cap.release()
    detector.close()
    if not frames:
        print("No frames read from the video.", file=sys.stderr)
        return 1
    out = args.out or args.video.with_suffix(".landmarks.json")
    if args.reps is not None and args.out is None:
        out = args.video.with_name(f"recorded_{args.exercise}_{args.reps}reps.json")
    recording = {
        "version": 1,
        "exerciseId": args.exercise,
        "source": "recorded",
        "width": width,
        "height": height,
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "frames": frames,
    }
    out.write_text(json.dumps(recording, separators=(",", ":")))
    secs = frames[-1]["t"] / 1000
    print(f"{len(frames)} frames ({secs:.1f}s, {width}x{height}); person detected in {detected} ({detected / len(frames):.0%})")
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
