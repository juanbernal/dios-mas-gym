import React, { useState, useEffect } from 'react';
import { fetchVerse } from '../services/bibleService';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  verse: { t: string; r: string };
  catalog?: any[];
  onPlaySong?: (song: any) => void;
  onEntrenar: () => void;
  onAleatorio: () => void;
}

// Versículo del día: uno por fecha, igual para todos. El texto se pide a la API de la Biblia;
// los 4 primeros llevan respaldo local por si la API no responde.
interface DailyVerse { book: number; ch: number; v: number; r: string; m: string; t?: string }

const DAILY: DailyVerse[] = [
  { book: 6, ch: 1, v: 9, r: 'JOSUÉ 1:9', m: 'Cada repetición, cada gota de sudor, es una prueba de tu valentía.', t: 'MIRA QUE TE MANDO QUE TE ESFUERCES Y SEAS VALIENTE; NO TEMAS NI DESMAYES.' },
  { book: 50, ch: 4, v: 13, r: 'FILIPENSES 4:13', m: "Cuando tu cuerpo diga 'no puedo más', tu fe dirá 'una más'.", t: 'TODO LO PUEDO EN CRISTO QUE ME FORTALECE.' },
  { book: 23, ch: 41, v: 10, r: 'ISAÍAS 41:10', m: 'Tu fuerza no viene solo del músculo, viene del Espíritu.', t: 'NO TEMAS, PORQUE YO ESTOY CONTIGO; NO DESMAYES, PORQUE YO SOY TU DIOS.' },
  { book: 19, ch: 27, v: 1, r: 'SALMOS 27:1', m: 'Ninguna barrera es indestructible cuando caminas en la luz.', t: 'JEHOVÁ ES MI LUZ Y MI SALVACIÓN; ¿DE QUIÉN TEMERÉ?' },
  { book: 23, ch: 40, v: 31, r: 'ISAÍAS 40:31', m: 'El cansancio es temporal; la fuerza que viene de Dios se renueva cada día.' },
  { book: 55, ch: 1, v: 7, r: '2 TIMOTEO 1:7', m: 'No entrenas desde el miedo: entrenas con poder, amor y dominio propio.' },
  { book: 20, ch: 3, v: 5, r: 'PROVERBIOS 3:5', m: 'Confía en el plan, aunque hoy el peso se sienta más pesado.' },
  { book: 45, ch: 8, v: 31, r: 'ROMANOS 8:31', m: 'Si Dios va contigo al frente, ningún día es una batalla perdida.' },
  { book: 49, ch: 6, v: 10, r: 'EFESIOS 6:10', m: 'Fortalécete por dentro: el gimnasio del alma también se entrena.' },
  { book: 46, ch: 16, v: 13, r: '1 CORINTIOS 16:13', m: 'Vela, permanece firme, sé valiente. Ese es el entrenamiento de hoy.' },
  { book: 19, ch: 46, v: 1, r: 'SALMOS 46:1', m: 'Cuando todo tiembla, hay un refugio que no se mueve.' },
  { book: 43, ch: 16, v: 33, r: 'JUAN 16:33', m: 'Habrá aflicción, pero la victoria ya está ganada.' },
  { book: 48, ch: 6, v: 9, r: 'GÁLATAS 6:9', m: 'No te rindas a mitad del camino: la cosecha llega a su tiempo.' },
  { book: 51, ch: 3, v: 23, r: 'COLOSENSES 3:23', m: 'Hazlo todo como para el Señor: en el gym, en casa y en la calle.' },
  { book: 47, ch: 12, v: 9, r: '2 CORINTIOS 12:9', m: 'Tu debilidad no te descalifica: ahí es donde se nota su poder.' },
  { book: 5, ch: 31, v: 6, r: 'DEUTERONOMIO 31:6', m: 'Sé fuerte y valiente: no caminas solo.' },
  { book: 19, ch: 18, v: 32, r: 'SALMOS 18:32', m: 'Dios es quien te arma de fuerza; tú pon el esfuerzo.' },
  { book: 54, ch: 4, v: 8, r: '1 TIMOTEO 4:8', m: 'El ejercicio del cuerpo es bueno, pero la piedad es para todo.' },
  { book: 59, ch: 4, v: 7, r: 'SANTIAGO 4:7', m: 'Someteos a Dios y resistid: la disciplina también es espiritual.' },
  { book: 40, ch: 11, v: 28, r: 'MATEO 11:28', m: 'Descansar en Él también es parte del entrenamiento.' },
];

// Índice estable por día (misma fecha local = mismo versículo para todos)
const dayIndex = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) % DAILY.length;

const scrollToSection = (sectionId: string) => {
  const el = document.querySelector(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const Hero: React.FC<HeroProps> = ({ verse: initialVerse, catalog = [], onPlaySong, onEntrenar, onAleatorio }) => {
  const navigate = useNavigate();
  const today = DAILY[dayIndex()];
  const [apiText, setApiText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setApiText(null);
    if (today.t) return; // ya tiene su texto guardado
    fetchVerse(today.book, today.ch, today.v)
      .then(text => { if (!cancelled && text) setApiText(text); })
      .catch(() => { /* sin API se usa el respaldo local */ });
    return () => { cancelled = true; };
  }, [today.book, today.ch, today.v]);

  // Respaldo local si la API falla y este versículo no lo trae guardado
  const fallback = DAILY.find(d => d.t) as DailyVerse;
  const verse = {
    t: (apiText ? apiText.toUpperCase() : (today.t || fallback.t)) as string,
    r: apiText || today.t ? today.r : fallback.r,
    m: apiText || today.t ? today.m : fallback.m,
  };

  // Ultimo estreno real del catalogo (el mas reciente con portada y enlace)
  const latest = React.useMemo(() => {
    const t = (d: string) => { const n = new Date(d || '').getTime(); return isNaN(n) ? 0 : n; };
    return catalog
      .filter(s => s && s.name && s.cover && s.url && t(s.date) <= Date.now())
      .sort((a, b) => t(b.date) - t(a.date))[0];
  }, [catalog]);
  const songCount = catalog.length;

  // Barras del ecualizador de fondo (alturas y tiempos fijos para que no cambien en cada render)
  const eqBars = React.useMemo(() => Array.from({ length: 72 }, (_, i) => ({
    delay: `${((i * 37) % 17) * 0.09}s`,
    duration: `${0.9 + ((i * 13) % 9) * 0.12}s`,
    peak: 35 + ((i * 29) % 60),
  })), []);

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

      {/* Ecualizador de fondo: da ritmo al hero sin quitar lectura al texto */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 md:h-56 flex items-end justify-center gap-[5px] md:gap-[8px] px-3 pointer-events-none z-0"
        style={{ opacity: 0.22, WebkitMaskImage: 'linear-gradient(to top, #000 10%, transparent)', maskImage: 'linear-gradient(to top, #000 10%, transparent)' }}
        aria-hidden="true"
      >
        {eqBars.map((b, i) => (
          <div
            key={i}
            className="eq-bar flex-1 max-w-[14px] rounded-t-sm"
            style={{ height: `${b.peak}%`, background: 'linear-gradient(to top, rgba(37,99,168,0.15), #4a90d9)', animationDelay: b.delay, animationDuration: b.duration }}
          ></div>
        ))}
      </div>

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

                {/* Reference */}
                <div className="flex items-center justify-between">
                  <span className="label-tag px-4 py-2" style={{ background: 'rgba(37,99,168,0.15)', color: '#7eb8f7', borderRadius: '2px', border: '1px solid rgba(37,99,168,0.3)' }}>
                    {verse.r}
                  </span>
                  <span className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>
                    Versículo de hoy
                  </span>
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
