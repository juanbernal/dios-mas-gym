import React, { useState, useEffect } from 'react';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const wasDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    if (wasDismissed) return;

    // Check if running as standalone (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after a short delay
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!show || installed || dismissed) return null;

  return (
    <div
      className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[9000] animate-fade-in-up"
      style={{ animationDuration: '0.4s' }}
    >
      <div
        style={{
          background: 'rgba(8,24,48,0.95)',
          border: '1px solid rgba(37,99,168,0.35)',
          borderTop: '2px solid #4a90d9',
          borderRadius: '4px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(37,99,168,0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(37,99,168,0.15)' }}>
          <div className="flex items-center gap-3">
            <img
              src="/logo-diosmasgym.png"
              alt="Dios Más Gym"
              className="w-9 h-9 object-cover"
              style={{ borderRadius: '6px', border: '1px solid rgba(37,99,168,0.3)' }}
            />
            <div>
              <p className="label-tag" style={{ color: '#4a90d9', fontSize: '0.45rem' }}>
                Instalar App
              </p>
              <p className="text-white font-bold" style={{ fontFamily: 'var(--font-gothic)', fontSize: '0.95rem' }}>
                Dios Más Gym
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,205,212,0.4)', padding: '4px' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p style={{ color: 'rgba(200,205,212,0.6)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            Instala la app para acceder al arsenal completo de música sin abrir el navegador.
          </p>

          {/* Features */}
          <div className="space-y-2 mb-5">
            {[
              { icon: 'fa-bolt', text: 'Acceso instantáneo sin navegador' },
              { icon: 'fa-music', text: 'Música disponible siempre' },
              { icon: 'fa-cross', text: 'Versículos diarios' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-2">
                <i className={`fas ${f.icon} text-xs`} style={{ color: '#4a90d9', width: '14px' }} />
                <span style={{ color: 'rgba(200,205,212,0.5)', fontSize: '0.75rem' }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="btn-primary flex-1"
              style={{ clipPath: 'none', borderRadius: '3px', padding: '0.65rem', fontSize: '0.55rem' }}
            >
              <i className="fas fa-download mr-1.5" />
              Instalar Gratis
            </button>
            <button
              onClick={handleDismiss}
              className="btn-secondary"
              style={{ clipPath: 'none', borderRadius: '3px', padding: '0.65rem 1rem', fontSize: '0.55rem' }}
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
