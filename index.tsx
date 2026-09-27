
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import { reloadOnceForNewVersion } from './services/chunkReload';

// Vite lanza este evento cuando falla la carga de un modulo lazy (tipico tras un despliegue)
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

// Avisar al admin (por correo) cuando un visitante tiene un error de JavaScript.
// Cada error distinto se reporta una sola vez por pagina cargada.
// @ts-ignore - import.meta.env es de Vite
if (import.meta.env.PROD) {
  const reported = new Set<string>();
  const report = (kind: string, err: any, fallbackMsg?: string) => {
    const message = String(err?.message || fallbackMsg || err || '').slice(0, 300);
    if (!message || reported.has(message) || reported.size >= 5) return;
    reported.add(message);
    const payload = JSON.stringify({ kind, message, stack: String(err?.stack || '').slice(0, 2000), page: location.href });
    try {
      if (!navigator.sendBeacon?.('/api/analytics?action=client-error', payload)) {
        fetch('/api/analytics?action=client-error', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      }
    } catch {}
  };
  window.addEventListener('error', (e) => report('error', e.error, e.message));
  window.addEventListener('unhandledrejection', (e) => report('promesa', e.reason));
}

// Service worker de assets estaticos (cache real) para todo el sitio.
// Solo en produccion: en dev interferiria con el HMR de Vite.
// @ts-ignore - import.meta.env es de Vite, no esta en los tipos de TS por defecto
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-v3.js', { scope: '/' }).catch(() => {});
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
