// Loads the self-hosted MediaPipe PoseLandmarker once for the whole app (SPEC §2).
// GPU delegate first; falls back to CPU automatically (iOS Safari GPU can fail, SPEC §16).
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

export type Delegate = 'GPU' | 'CPU';

export interface LoadedLandmarker {
  landmarker: PoseLandmarker;
  delegate: Delegate;
}

const BASE = import.meta.env.BASE_URL;
let loading: Promise<LoadedLandmarker> | null = null;
let loaded: LoadedLandmarker | null = null;

async function create(delegate: Delegate): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}mediapipe`);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `${BASE}models/pose_landmarker_lite.task`, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

/** Start loading the model. Safe to call many times (Home calls it to preload, SPEC §16). */
export function loadPoseLandmarker(): Promise<LoadedLandmarker> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= (async () => {
    try {
      loaded = { landmarker: await create('GPU'), delegate: 'GPU' };
    } catch {
      loaded = { landmarker: await create('CPU'), delegate: 'CPU' };
    }
    return loaded;
  })().catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

/** Called when GPU detection throws at runtime: rebuild on the CPU. */
export async function fallbackToCpu(): Promise<LoadedLandmarker> {
  if (loaded?.delegate === 'CPU') return loaded;
  try {
    loaded?.landmarker.close();
  } catch {
    // ignore
  }
  loaded = { landmarker: await create('CPU'), delegate: 'CPU' };
  loading = Promise.resolve(loaded);
  return loaded;
}

export function usePoseLandmarker() {
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    model: LoadedLandmarker | null;
    error: string | null;
  }>(() => (loaded ? { status: 'ready', model: loaded, error: null } : { status: 'loading', model: null, error: null }));

  useEffect(() => {
    if (state.status === 'ready') return;
    let cancelled = false;
    loadPoseLandmarker()
      .then((model) => !cancelled && setState({ status: 'ready', model, error: null }))
      .catch((err: unknown) =>
        !cancelled && setState({ status: 'error', model: null, error: err instanceof Error ? err.message : String(err) }),
      );
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  return {
    ...state,
    replace: (model: LoadedLandmarker) => setState({ status: 'ready', model, error: null }),
  };
}
