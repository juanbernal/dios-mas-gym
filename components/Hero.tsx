import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  verse: { t: string; r: string };
  catalog?: any[];
  onPlaySong?: (song: any) => void;
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

const Hero: React.FC<HeroProps> = ({ verse: initialVerse, catalog = [], onPlaySong, onEntrenar, onAleatorio }) => {
  const navigate = useNavigate();
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

  // Ultimo estreno real del catalogo (el mas reciente con portada y enlace)
  const latest = React.useMemo(() => {
    const t = (d: string) => { const n = new Date(d || '').getTime(); return isNaN(n) ? 0 : n; };
    return catalog
      .filter(s => s && s.name && s.cover && s.url && t(s.date) <= Date.now())
      .sort((a, b) => t(b.date) - t(a.date))[0];
  }, [catalog]);
  const songCount = catalog.length;

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
                {/* Un solo h1: antes eran cuatro y Google/lectores de pantalla
                    veian cuatro titulos principales en la misma pagina. */}
                <h1 className="h1-gothic leading-none" aria-label="Puro Señor Jesucristo compa">
                  <span aria-hidden="true" className="block" style={{ fontSize: 'clamp(4.5rem, 12vw, 11rem)', color: 'rgba(255,255,255,0.2)', WebkitTextStroke: '1px rgba(126,184,247,0.55)' }}>
                    PURO
                  </span>
                  <span aria-hidden="true" className="block text-blue-gradient" style={{ fontSize: 'clamp(4.5rem, 12vw, 11rem)', marginTop: '-0.15em' }}>
                    SEÑOR
                  </span>
                  <span aria-hidden="true" className="block" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', color: '#fff', marginTop: '-0.1em' }}>
                    JESUCRISTO
                  </span>
                  <span aria-hidden="true" className="block" style={{ fontSize: 'clamp(2.2rem, 5.5vw, 5rem)', color: '#7eb8f7', marginTop: '-0.05em', letterSpacing: '0.12em' }}>
                    COMPA
                  </span>
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
                <button
                  onClick={() => navigate('/buscar')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <i className="fas fa-search text-[#4a90d9]"></i>
                  Buscar Música / Letras
                </button>
                <a
                  href="https://musica.diosmasgym.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary hidden sm:inline-flex"
                >
                  Escuchar Música
                </a>
              </div>

              {/* Artist logos row */}
              <div className="flex items-center gap-6 mt-12 pt-8" style={{ borderTop: '1px solid rgba(37,99,168,0.15)' }}>
                <img src="/logo-diosmasgym-sm.webp" alt="Diosmasgym" loading="lazy" className="w-14 h-14 object-cover rounded-md" style={{ border: '1px solid rgba(37,99,168,0.3)', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ width: '1px', height: '40px', background: 'rgba(37,99,168,0.3)' }}></div>
                <img src="/logo-juan614-v2-sm.webp" alt="Juan 614" loading="lazy" className="w-14 h-14 object-cover rounded-md" style={{ border: '1px solid rgba(37,99,168,0.3)', background: 'rgba(255,255,255,0.05)' }} />
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
                  {/* Los indicadores median 6x6 px y no tenian nombre accesible:
                      ahora llevan etiqueta y un area pulsable de 44 px de alto. */}
                  <div className="flex gap-1">
                    {VERSES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setVerseIndex(i)}
                        aria-label={`Ver versículo ${i + 1} de ${VERSES.length}`}
                        aria-current={i === verseIndex}
                        className="transition-all relative after:content-[''] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:min-w-[24px]"
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

              {/* Ultimo estreno */}
              {latest && (
                <button
                  type="button"
                  onClick={() => onPlaySong && onPlaySong(latest)}
                  className="card-street p-4 flex items-center gap-4 text-left group transition-all hover:border-[#4a90d9]/50"
                  style={{ borderRadius: '2px' }}
                  aria-label={`Escuchar ${latest.name}`}
                >
                  <img src={latest.cover} alt="" className="w-16 h-16 object-cover rounded-md flex-shrink-0" style={{ border: '1px solid rgba(37,99,168,0.4)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="label-tag mb-1" style={{ color: '#4a90d9' }}>Último estreno</p>
                    <p className="text-white font-bold text-sm truncate">{latest.name}</p>
                    <p className="label-tag truncate" style={{ color: 'rgba(200,205,212,0.5)', fontSize: '0.55rem' }}>{latest.artist}</p>
                  </div>
                  <span className="w-11 h-11 rounded-full bg-[#4a90d9] text-black flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <i className="fas fa-play text-sm ml-0.5"></i>
                  </span>
                </button>
              )}

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: 'fa-music', label: 'Canciones', val: songCount > 0 ? songCount.toLocaleString('es-MX') : '—' },
                  { icon: 'fa-users', label: 'Artistas', val: '2' },
                  { icon: 'fa-cross', label: 'Fe', val: '∞' },
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
