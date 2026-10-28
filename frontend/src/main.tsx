import { createRoot } from 'react-dom/client';
import { startSyncLoop } from './api/offlineQueue';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import App from './App';
import './index.css';

startSyncLoop();

// Offline app shell + model files (production only; dev uses Vite's live server).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(<App />);
