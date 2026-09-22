
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
