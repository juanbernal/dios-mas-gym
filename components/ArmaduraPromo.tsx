import React, { useState } from 'react';
import { useOneSignal } from '../services/useOneSignal';

// La Armadura (ropa, proximamente). Antes tenia un formulario de correo que no guardaba nada:
// la persona veia "Reclutamiento exitoso" y el correo se perdia. Ahora el aviso es real:
// notificaciones del sitio o el canal de WhatsApp.
const ArmaduraPromo: React.FC = () => {
  const push = useOneSignal();
  const [msg, setMsg] = useState<string | null>(null);

  const onNotify = async () => {
    if (push.isSubscribed) { setMsg('Ya estás en la lista: te avisamos en cuanto salga.'); return; }
    if (!push.isSupported || push.permission === 'denied') {
      setMsg('Tu navegador no permite avisos aquí. Únete al canal de WhatsApp y te enteras primero.');
      return;
    }
    await push.subscribe();
    setMsg('¡Listo! Te avisamos en cuanto salga La Armadura.');
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-24" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#2563a8,transparent)' }}></div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.18) 0%, transparent 70%)' }}></div>

      <div className="section-container relative z-10">
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10 lg:gap-16">

          {/* Texto */}
          <div className="w-full lg:w-1/2">
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4a90d9]/15 border border-[#4a90d9]/40 label-tag" style={{ color: '#7eb8f7' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4a90d9] animate-pulse"></span>Próximamente · Drop 01
              </span>
            </div>

            <h2 className="h2-display mb-5 text-white">
              La <span className="text-blue-gradient">Armadura</span>
            </h2>

            <p className="mb-8 leading-relaxed" style={{ color: 'rgba(200,205,212,0.65)', maxWidth: '460px', fontSize: '0.95rem' }}>
              Ropa para templar el cuerpo y el espíritu. Playeras y sudaderas de edición limitada con el sello de Puro Señor Jesucristo compa.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {[['fa-gem', 'Edición limitada'], ['fa-shirt', 'Calidad premium'], ['fa-cross', 'Streetwear de fe']].map(([icon, tag]) => (
                <span key={tag} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] text-white/70 bg-white/[0.04] border border-white/10">
                  <i className={`fas ${icon} text-[#4a90d9]`}></i>{tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <button
                type="button"
                onClick={onNotify}
                disabled={push.busy}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-colors ${push.isSubscribed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' : 'bg-[#4a90d9] text-black hover:bg-white'}`}
              >
                <i className={`fas ${push.busy ? 'fa-spinner fa-spin' : push.isSubscribed ? 'fa-check' : 'fa-bell'}`}></i>
                {push.isSubscribed ? 'Ya estás en la lista' : 'Avísame cuando salga'}
              </button>
              <a
                href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black transition-colors"
              >
                <i className="fab fa-whatsapp text-base"></i>Canal WhatsApp
              </a>
            </div>
            {msg && <p role="status" className="mt-4 text-xs text-[#7eb8f7]">{msg}</p>}
          </div>

          {/* Vista previa de la playera */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative group w-[300px] md:w-[400px]">
              <div className="absolute inset-0 blur-[70px] opacity-50 group-hover:opacity-70 transition-opacity duration-700" style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.6) 0%, transparent 65%)' }}></div>
              <svg viewBox="0 0 400 420" className="relative w-full drop-shadow-[0_40px_60px_rgba(0,0,0,0.7)] group-hover:-translate-y-2 transition-transform duration-700" aria-label="Vista previa de la playera La Armadura" role="img">
                <defs>
                  <linearGradient id="armadura-tela" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#14263f" />
                    <stop offset="0.55" stopColor="#0a1628" />
                    <stop offset="1" stopColor="#050c18" />
                  </linearGradient>
                  <linearGradient id="armadura-brillo" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#4a90d9" />
                    <stop offset="0.5" stopColor="#9cc8f5" />
                    <stop offset="1" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
                {/* Playera */}
                <path
                  d="M140 20 C160 42 240 42 260 20 L345 55 L392 140 L330 170 L318 150 L318 405 L82 405 L82 150 L70 170 L8 140 L55 55 Z"
                  fill="url(#armadura-tela)"
                  stroke="rgba(74,144,217,0.45)"
                  strokeWidth="2"
                />
                <path d="M140 20 C160 42 240 42 260 20" fill="none" stroke="rgba(74,144,217,0.6)" strokeWidth="5" />
                {/* Estampado */}
                <image href="/logo-diosmasgym-md.webp" x="150" y="85" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
                <text x="200" y="225" textAnchor="middle" fill="url(#armadura-brillo)" style={{ fontFamily: 'var(--font-gothic)', fontSize: 40 }}>Puro Señor</text>
                <text x="200" y="268" textAnchor="middle" fill="#ffffff" style={{ fontFamily: 'var(--font-gothic)', fontSize: 40 }}>Jesucristo</text>
                <text x="200" y="300" textAnchor="middle" fill="#7eb8f7" style={{ fontFamily: 'var(--font-bold)', fontSize: 15, letterSpacing: 8 }}>COMPA</text>
                <line x1="150" y1="322" x2="250" y2="322" stroke="rgba(74,144,217,0.5)" strokeWidth="1.5" />
                <text x="200" y="345" textAnchor="middle" fill="rgba(200,205,212,0.55)" style={{ fontFamily: 'var(--font-bold)', fontSize: 10, letterSpacing: 5 }}>FE · MÚSCULO · CORRIDO</text>
              </svg>
              <span className="absolute top-6 -right-2 md:right-0 px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rotate-6 shadow-lg">
                Edición limitada
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ArmaduraPromo;
