import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PARTES, Lugar, parteDelDia } from '../data/rutinas';

interface Props {
  catalog: any[];
  onPlaySong: (song: any) => void;
}

// Pitido corto al terminar el descanso (sin archivos de audio)
const beep = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach(t => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* sin sonido */ }
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const RutinasView: React.FC<Props> = ({ catalog, onPlaySong }) => {
  const [params, setParams] = useSearchParams();
  const parte = PARTES.find(p => p.id === params.get('parte')) || parteDelDia();
  const lugar: Lugar = params.get('lugar') === 'gym' ? 'gym' : 'casa';
  const rutina = parte[lugar];

  const select = (next: { parte?: string; lugar?: Lugar }) => {
    setParams({ parte: next.parte || parte.id, lugar: next.lugar || lugar }, { replace: true });
  };

  // Series hechas: "indiceEjercicio-indiceSerie"
  const [done, setDone] = useState<Set<string>>(new Set());
  const [rest, setRest] = useState<{ left: number; total: number; label: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setDone(new Set());
    setRest(null);
  }, [parte.id, lugar]);

  useEffect(() => {
    document.title = `Rutina de ${parte.nombre.toLowerCase()} en ${lugar === 'casa' ? 'casa' : 'el gym'} | Diosmasgym`;
  }, [parte.id, lugar]);

  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      beep();
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibracion */ }
      const t = window.setTimeout(() => setRest(null), 1500);
      return () => clearTimeout(t);
    }
    timerRef.current = window.setTimeout(() => setRest(r => r ? { ...r, left: r.left - 1 } : r), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [rest]);

  const totalSets = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
  const progress = totalSets ? done.size / totalSets : 0;
  const finished = done.size === totalSets && totalSets > 0;

  const toggleSet = (ei: number, si: number) => {
    const key = `${ei}-${si}`;
    const ej = rutina.ejercicios[ei];
    const next = new Set(done);
    if (next.has(key)) { next.delete(key); setDone(next); return; }
    next.add(key);
    setDone(next);
    // Al marcar una serie arranca el descanso de ese ejercicio
    if (ej.descanso > 0 && next.size < totalSets) setRest({ left: ej.descanso, total: ej.descanso, label: ej.nombre });
  };

  // Musica para entrenar: canciones con palabras de fuerza/guerra, si no cualquiera
  const playMusic = () => {
    const pool = catalog.filter(s => s && s.name && s.url);
    if (pool.length === 0) return;
    const strong = pool.filter(s => /guerr|fuerz|poder|gym|entren|batalla|guerrero|fuego|victoria|valient|levant/i.test(s.name));
    const src = strong.length > 0 ? strong : pool;
    onPlaySong(src[Math.floor(Math.random() * src.length)]);
  };

  const share = async () => {
    const url = `https://www.diosmasgym.com/rutinas?parte=${parte.id}&lugar=${lugar}`;
    const text = `💪 Rutina de ${parte.nombre.toLowerCase()} ${lugar === 'casa' ? 'en casa' : 'en el gym'} + ${parte.versiculo.cita}. Fe y músculo con Diosmasgym:`;
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Rutina Fe + Gym', text, url }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); alert('Enlace copiado'); } catch { /* nada */ }
  };

  const today = useMemo(() => parteDelDia().id, []);

  return (
    <div className="min-h-screen bg-[#05070a]">
      {/* Encabezado */}
      <header className="relative overflow-hidden pt-10 pb-8 md:pt-16 md:pb-12" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 55%, #0b1929 100%)' }}>
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full bg-[#4a90d9]/15 blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg,#4a90d9 1px,transparent 1px),linear-gradient(90deg,#4a90d9 1px,transparent 1px)', backgroundSize: '60px 60px' }}></div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3"><i className="fas fa-dumbbell mr-2"></i>Fe · Músculo · Disciplina</p>
          <h1 className="font-serif italic text-5xl md:text-8xl text-white leading-none">
            Rutinas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] via-[#9cc8f5] to-white">Fe + Gym</span>
          </h1>
          <p className="text-sm md:text-base text-white/55 mt-4 max-w-xl">Entrena el cuerpo y el espíritu. Elige dónde entrenas y qué parte vas a trabajar; marca cada serie y el descanso corre solo.</p>

          {/* Casa / Gym */}
          <div className="mt-7 inline-flex p-1 rounded-2xl bg-white/5 border border-white/10">
            {([['casa', 'fa-house', 'En casa'], ['gym', 'fa-dumbbell', 'En el gym']] as const).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => select({ lugar: id })}
                aria-pressed={lugar === id}
                className={`px-5 md:px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-colors ${lugar === id ? 'bg-[#4a90d9] text-black shadow-[0_0_25px_rgba(74,144,217,0.5)]' : 'text-white/60 hover:text-white'}`}
              >
                <i className={`fas ${icon} mr-2`}></i>{label}
              </button>
            ))}
          </div>

          {/* Partes del cuerpo */}
          <div className="mt-5 flex gap-2 md:gap-3 overflow-x-auto md:flex-wrap scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 pb-1">
            {PARTES.map(p => (
              <button
                key={p.id}
                onClick={() => select({ parte: p.id })}
                aria-pressed={parte.id === p.id}
                className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] border transition-colors ${parte.id === p.id ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-white/70 border-white/10 hover:border-white/30'}`}
              >
                <i className={`fas ${p.icono}`}></i>{p.nombre}
                {p.id === today && <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] tracking-normal">HOY</span>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 grid lg:grid-cols-[1fr_340px] gap-6 md:gap-8">
        <section>
          {/* Resumen */}
          <div className="rounded-3xl border border-[#4a90d9]/25 bg-gradient-to-br from-[#4a90d9]/[0.12] to-transparent p-5 md:p-7 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7]">{parte.nombre} · {lugar === 'casa' ? 'En casa' : 'En el gym'}</p>
                <h2 className="font-serif italic text-3xl md:text-5xl text-white mt-1">{rutina.titulo}</h2>
                <p className="text-sm text-white/55 mt-2">{parte.frase}</p>
              </div>
              <div className="flex gap-2">
                {[
                  ['fa-clock', `${rutina.minutos} min`],
                  ['fa-signal', rutina.nivel],
                  ['fa-list-check', `${rutina.ejercicios.length} ejercicios`],
                ].map(([icon, t]) => (
                  <span key={t} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-[10px] font-bold text-white/70"><i className={`fas ${icon} text-[#4a90d9]`}></i>{t}</span>
                ))}
              </div>
            </div>
            <div className="sm:hidden flex gap-3 mt-3 text-[11px] font-bold text-white/60">
              <span><i className="fas fa-clock text-[#4a90d9] mr-1"></i>{rutina.minutos} min</span>
              <span><i className="fas fa-signal text-[#4a90d9] mr-1"></i>{rutina.nivel}</span>
              <span><i className="fas fa-list-check text-[#4a90d9] mr-1"></i>{rutina.ejercicios.length}</span>
            </div>

            {/* Progreso */}
            <div className="mt-5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">
                <span>Progreso</span><span className="text-white">{done.size} / {totalSets} series</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2563a8] via-[#4a90d9] to-[#9cc8f5] transition-all duration-500" style={{ width: `${progress * 100}%` }}></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              <button onClick={playMusic} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#4a90d9] text-black text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white transition-colors">
                <i className="fas fa-headphones"></i>Ponle música
              </button>
              <button onClick={share} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-white/80 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white/10 transition-colors">
                <i className="fas fa-share-nodes"></i>Compartir rutina
              </button>
            </div>
          </div>

          {finished && (
            <div className="rounded-3xl p-6 mb-5 text-center border border-emerald-400/40 bg-emerald-500/10 animate-fade-in-up">
              <p className="text-4xl mb-2">💪🙏</p>
              <p className="font-serif italic text-3xl text-white">¡Rutina terminada!</p>
              <p className="text-sm text-white/60 mt-1">"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13</p>
              <button onClick={share} className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-[0.15em]">
                <i className="fas fa-share-nodes"></i>Presúmelo
              </button>
            </div>
          )}

          {/* Ejercicios */}
          <ol className="flex flex-col gap-3">
            {rutina.ejercicios.map((ej, ei) => {
              const hechos = Array.from({ length: ej.series }, (_, si) => done.has(`${ei}-${si}`)).filter(Boolean).length;
              const completo = hechos === ej.series;
              return (
                <li key={ej.nombre} className={`rounded-2xl border p-4 md:p-5 transition-colors ${completo ? 'border-emerald-400/40 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="flex items-start gap-4">
                    <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black ${completo ? 'bg-emerald-500 text-black' : 'bg-[#4a90d9]/15 text-[#7eb8f7]'}`}>
                      {completo ? <i className="fas fa-check"></i> : ei + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white font-bold text-base md:text-lg leading-snug">{ej.nombre}</h3>
                      <p className="text-xs text-white/60 mt-1">
                        <span className="text-white font-bold">{ej.series} × {ej.reps}</span>
                        {ej.descanso > 0 && <> · descanso {ej.descanso >= 60 ? fmt(ej.descanso) : `${ej.descanso} s`}</>}
                      </p>
                      <p className="text-xs text-white/45 mt-2 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{ej.tip}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Array.from({ length: ej.series }, (_, si) => {
                          const isDone = done.has(`${ei}-${si}`);
                          return (
                            <button
                              key={si}
                              onClick={() => toggleSet(ei, si)}
                              aria-pressed={isDone}
                              aria-label={`Serie ${si + 1} de ${ej.nombre}`}
                              className={`min-w-[44px] h-11 px-3 rounded-xl text-xs font-black transition-all ${isDone ? 'bg-emerald-500 text-black scale-95' : 'bg-white/5 text-white/70 border border-white/15 hover:border-[#4a90d9]'}`}
                            >
                              {isDone ? <i className="fas fa-check"></i> : `S${si + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="text-[11px] text-white/35 mt-6 leading-relaxed">
            Calienta 5 minutos antes de empezar. Si tienes alguna lesión o condición de salud, consulta a tu médico. Ajusta el peso para terminar cada serie con buena técnica.
          </p>
        </section>

        {/* Lateral: versiculo y otras rutinas */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-3xl p-6 border-l-4 border-[#2563a8] bg-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-3"><i className="fas fa-bible mr-2"></i>Entrena el espíritu</p>
            <blockquote className="font-serif text-xl md:text-2xl text-white leading-snug">"{parte.versiculo.texto}"</blockquote>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7eb8f7]">{parte.versiculo.cita}</p>
          </div>
          <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.02]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3">Otras rutinas {lugar === 'casa' ? 'en casa' : 'en el gym'}</p>
            <div className="flex flex-col gap-1">
              {PARTES.filter(p => p.id !== parte.id).map(p => (
                <button key={p.id} onClick={() => { select({ parte: p.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors">
                  <span className="w-9 h-9 rounded-lg bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center"><i className={`fas ${p.icono} text-sm`}></i></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">{p.nombre}</span>
                    <span className="block text-[10px] text-white/40">{p[lugar].titulo} · {p[lugar].minutos} min</span>
                  </span>
                  <i className="fas fa-chevron-right text-[10px] text-white/30"></i>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* Cronometro de descanso */}
      {rest && (
        <div role="timer" aria-live="polite" className="fixed left-3 right-3 bottom-[84px] md:left-auto md:right-6 md:bottom-6 md:w-[360px] z-[9500] rounded-3xl border border-[#4a90d9]/50 bg-[#0a1322]/95 backdrop-blur-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={rest.left <= 0 ? '#10b981' : '#4a90d9'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(rest.left / rest.total) * 100.5} 100.5`} style={{ transition: 'stroke-dasharray 1s linear' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm tabular-nums">{rest.left <= 0 ? '¡Ya!' : fmt(rest.left)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7eb8f7]">{rest.left <= 0 ? '¡A darle!' : 'Descansa'}</p>
              <p className="text-sm font-bold text-white truncate">{rest.label}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setRest(r => r ? { ...r, left: r.left + 15, total: r.total + 15 } : r)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-black">+15 s</button>
                <button onClick={() => setRest(null)} className="px-3 py-1.5 rounded-lg bg-[#4a90d9] text-black text-[10px] font-black uppercase">Saltar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RutinasView;
