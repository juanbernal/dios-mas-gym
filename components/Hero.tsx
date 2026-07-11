import React, { useState, useEffect } from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const VERSES = [
  { 
    t: "MIRA QUE TE MANDO QUE TE ESFUERCES Y SEAS VALIENTE; NO TEMAS NI DESMAYES.", 
    r: "JOSUÉ 1:9",
    m: "Cada repetición, cada gota de sudor, es una prueba de tu valentía." 
  },
  { 
    t: "TODO LO PUEDO EN CRISTO QUE ME FORTALECE.", 
    r: "FILIPENSES 4:13",
    m: "Cuando tu cuerpo diga 'no puedo más', tu fe dirá 'una más'." 
  },
  { 
    t: "NO TEMAS, PORQUE YO ESTOY CONTIGO; NO DESMAYES, PORQUE YO SOY TU DIOS.", 
    r: "ISAÍAS 41:10",
    m: "Tu fuerza no viene solo del músculo, viene del Espíritu." 
  },
  { 
    t: "JEHOVÁ ES MI LUZ Y MI SALVACIÓN; ¿DE QUIÉN TEMERÉ?", 
    r: "SALMOS 27:1",
    m: "Ninguna barrera es indestructible cuando caminas en la luz." 
  }
];

const scrollToSection = (sectionId: string) => {
  const el = document.querySelector(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Hero: React.FC<HeroProps> = ({ verse: initialVerse, onEntrenar, onAleatorio }) => {
  const [verseIndex, setVerseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          setVerseIndex(i => (i + 1) % VERSES.length);
          return 0;
        }
        return p + 1.25; // 100/8000ms * 100ms interval
      });
    }, 100);
    return () => clearInterval(interval);
  }, [verseIndex]);

  const verse = VERSES[verseIndex];

  return (
    <header className="relative min-h-screen overflow-hidden cinematic-grain" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 50%, #0b1929 100%)' }}>

      {/* Background elements */}
      <div className="gradient-glow w-[600px] h-[600px] top-[-200px] right-[-100px]" style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.18) 0%, transparent 70%)' }}></div>
      <div className="gradient-glow w-[500px] h-[500px] bottom-[-100px] left-[-100px]" style={{ background: 'radial-gradient(circle, rgba(30,58,95,0.2) 0%, transparent 70%)' }}></div>

      {/* Angled grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(0deg,rgba(74,144,217,1) 1px,transparent 1px),linear-gradient(90deg,rgba(74,144,217,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }}>
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }}></div>

      <div className="section-container relative z-10">
        <div className="min-h-screen flex flex-col">

          {/* === MAIN CONTENT === */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 py-28">

            {/* LEFT: Giant text block */}
            <div className="w-full lg:w-[55%] flex flex-col items-start">

              {/* Top label */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-[2px]" style={{ background: '#2563a8' }}></div>
                <span className="label-tag" style={{ color: '#4a90d9', letterSpacing: '0.4em' }}>✝ Dios Más Gym · 614 ✝</span>
                <div className="w-8 h-[2px]" style={{ background: '#2563a8' }}></div>
              </div>

              {/* Main title — split layout */}
              <div className="mb-4">
                <h1 className="h1-gothic leading-none" style={{ fontSize: 'clamp(4.5rem, 12vw, 11rem)', color: 'rgba(255,255,255,0.12)', WebkitTextStroke: '1px rgba(74,144,217,0.4)' }}>
                  PURO
                </h1>
                <h1 className="h1-gothic leading-none text-blue-gradient" style={{ fontSize: 'clamp(4.5rem, 12vw, 11rem)', marginTop: '-0.15em' }}>
                  SEÑOR
                </h1>
                <h1 className="h1-gothic leading-none" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', color: '#fff' }}>
                  JESUCRISTO
                </h1>
              </div>

              {/* Tagline */}
              <p className="text-sm mb-10 max-w-md" style={{ color: 'rgba(200,205,212,0.55)', fontFamily: 'var(--font-bold)', letterSpacing: '0.1em', lineHeight: 1.8 }}>
                FE · MÚSCULO · CORRIDO
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => { onEntrenar(); scrollToSection('#arsenal-content'); }}
                  className="btn-primary"
                >
                  ▶ Explorar Arsenal
                </button>
                <a
                  href="https://musica.diosmasgym.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Escuchar Música
                </a>
              </div>

              {/* Artist logos row */}
              <div className="flex items-center gap-6 mt-12 pt-8" style={{ borderTop: '1px solid rgba(37,99,168,0.15)' }}>
                <img src="/logo-diosmasgym.png" alt="Diosmasgym" className="w-14 h-14 object-cover rounded-md" style={{ border: '1px solid rgba(37,99,168,0.3)' }} />
                <div style={{ width: '1px', height: '40px', background: 'rgba(37,99,168,0.3)' }}></div>
                <img src="/logo-juan614-v2.jpg" alt="Juan 614" className="w-14 h-14 object-cover rounded-md" style={{ border: '1px solid rgba(37,99,168,0.2)' }} />
                <div>
                  <p className="label-tag" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.5rem' }}>Artistas</p>
                  <p className="label-tag" style={{ color: 'rgba(200,205,212,0.7)', fontSize: '0.55rem' }}>Diosmasgym × Juan 614</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Verse card — new vertical design */}
            <div className="w-full lg:w-[42%] flex flex-col gap-4">

              {/* Verse card */}
              <div
                key={verse.r}
                className="card-street animate-fade-in-up p-8"
                style={{ borderRadius: '2px', borderLeft: '3px solid #2563a8' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <span className="label-tag" style={{ color: '#4a90d9' }}>
                    <i className="fas fa-bible mr-2"></i>Motivación Diaria
                  </span>
                  <span className="label-tag px-3 py-1.5" style={{ color: 'rgba(200,205,212,0.35)', background: 'rgba(255,255,255,0.04)', borderRadius: '2px' }}>
                    Puro Señor Jesucristo
                  </span>
                </div>

                {/* Quote */}
                <blockquote
                  className="mb-6 leading-relaxed"
                  style={{ fontFamily: 'var(--font-gothic)', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}
                >
                  "{verse.t}"
                </blockquote>

                {/* Motivation text */}
                <p className="text-xs mb-6" style={{ color: 'rgba(200,205,212,0.5)', lineHeight: 1.7 }}>
                  {verse.m}
                </p>

                {/* Reference + progress */}
                <div className="flex items-center justify-between">
                  <span className="label-tag px-4 py-2" style={{ background: 'rgba(37,99,168,0.15)', color: '#7eb8f7', borderRadius: '2px', border: '1px solid rgba(37,99,168,0.3)' }}>
                    {verse.r}
                  </span>
                  <div className="flex gap-1">
                    {VERSES.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVerseIndex(i)}
                        className="transition-all"
                        style={{
                          width: i === verseIndex ? '24px' : '6px',
                          height: '6px',
                          borderRadius: '3px',
                          background: i === verseIndex ? '#2563a8' : 'rgba(37,99,168,0.25)',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-[2px] w-full" style={{ background: 'rgba(37,99,168,0.15)' }}>
                  <div
                    className="h-full transition-none"
                    style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2563a8, #4a90d9)' }}
                  />
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: 'fa-dumbbell', label: 'Entrenamientos', val: '∞' },
                  { icon: 'fa-music', label: 'Canciones', val: '100+' },
                  { icon: 'fa-cross', label: 'Versículos', val: '4+' },
                ].map((s) => (
                  <div key={s.label} className="card-street p-4 text-center" style={{ borderRadius: '2px' }}>
                    <i className={`fas ${s.icon} text-xl mb-2`} style={{ color: '#2563a8' }}></i>
                    <div className="label-tag" style={{ color: '#fff', fontSize: '1.1rem', fontFamily: 'var(--font-gothic)' }}>{s.val}</div>
                    <div className="label-tag" style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.5rem', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === BOTTOM SCROLL INDICATOR === */}
          <button
            onClick={() => scrollToSection('#arsenal-content')}
            className="flex flex-col items-center gap-2 mx-auto pb-10 opacity-30 hover:opacity-70 transition-all cursor-pointer"
            style={{ background: 'none', border: 'none' }}
          >
            <span className="label-tag" style={{ color: '#fff' }}>Descubrir</span>
            <div className="w-px h-10 mt-1" style={{ background: 'linear-gradient(to bottom, #4a90d9, transparent)' }}></div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hero;
