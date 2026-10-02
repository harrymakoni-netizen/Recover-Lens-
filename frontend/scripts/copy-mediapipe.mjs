// Self-host MediaPipe WASM so the demo never depends on a CDN (SPEC §2).
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = join(root, 'public/mediapipe');
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log('Copied MediaPipe WASM to public/mediapipe');
}
