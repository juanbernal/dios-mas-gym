import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CALENTAMIENTO_GENERAL, Ejercicio, Lugar, NIVELES, Nivel, parteDelDia, rutinaPrincipal, rutinasVisibles } from '../data/rutinas';
import { Entreno, entrenosEstaSemana, getHistorial, racha, registrarEntreno, useRutinas, youtubeId } from '../services/rutinaService';

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
const fmtDescanso = (s: number) => (s >= 60 ? fmt(s) : `${s} s`);
const NIVEL_COLOR: Record<Nivel, string> = { Principiante: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', Intermedio: 'text-amber-300 bg-amber-500/15 border-amber-400/30', Avanzado: 'text-red-300 bg-red-500/15 border-red-400/30' };
const ytSearch = (nombre: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`cómo hacer ${nombre} técnica correcta`)}`;

const RutinasView: React.FC<Props> = ({ catalog, onPlaySong }) => {
  const data = useRutinas();
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => parteDelDia(data).id, [data]);
  const parte = data.partes.find(p => p.id === params.get('parte')) || data.partes.find(p => p.id === today) || data.partes[0];
  const lugar: Lugar = params.get('lugar') === 'gym' ? 'gym' : 'casa';
  const [nivelFiltro, setNivelFiltro] = useState<Nivel | 'todos'>('todos');

  const lista = rutinasVisibles(data, parte.id, lugar);
  const filtradas = nivelFiltro === 'todos' ? lista : lista.filter(r => r.nivel === nivelFiltro);
  const rutina = lista.find(r => r.id === params.get('r')) || (nivelFiltro !== 'todos' ? filtradas[0] : undefined) || rutinaPrincipal(data, parte.id, lugar);

  const select = (next: { parte?: string; lugar?: Lugar; r?: string }) => {
    const p: Record<string, string> = { parte: next.parte || parte.id, lugar: next.lugar || lugar };
    // Cambiar de parte o de lugar vuelve a la rutina principal
    if (next.r) p.r = next.r;
    else if (!next.parte && !next.lugar && rutina) p.r = rutina.id;
    setParams(p, { replace: true });
  };

  // Series hechas: "indiceEjercicio-indiceSerie"
  const [done, setDone] = useState<Set<string>>(new Set());
  const [rest, setRest] = useState<{ left: number; total: number; label: string } | null>(null);
  const [warmOpen, setWarmOpen] = useState(false);
  const [warmDone, setWarmDone] = useState<Set<number>>(new Set());
  const [modo, setModo] = useState(false);
  const [focus, setFocus] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [video, setVideo] = useState<{ id: string; title: string } | null>(null);
  const [hist, setHist] = useState<Entreno[]>(() => getHistorial());
  const registrado = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const carruselRef = useRef<HTMLDivElement>(null);

  // La tarjeta elegida siempre a la vista en el carrusel (sin mover la pagina)
  useEffect(() => {
    const c = carruselRef.current;
    const el = c?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (c && el) c.scrollTo({ left: Math.max(0, el.offsetLeft - c.offsetLeft - 20), behavior: 'smooth' });
  }, [rutina?.id, nivelFiltro]);

  useEffect(() => {
    setDone(new Set());
    setWarmDone(new Set());
    setRest(null);
    setFocus(0);
    registrado.current = null;
  }, [rutina?.id]);

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

  // En modo entreno la pantalla no se apaga (si el navegador lo permite)
  useEffect(() => {
    if (!modo) return;
    let lock: any = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => { /* sin wake lock */ });
    document.body.style.overflow = 'hidden';
    return () => { try { lock?.release?.(); } catch { /* nada */ } document.body.style.overflow = ''; };
  }, [modo]);

  const ejercicios = rutina?.ejercicios || [];
  const totalSets = ejercicios.reduce((a, e) => a + e.series, 0);
  const progress = totalSets ? done.size / totalSets : 0;
  const finished = done.size === totalSets && totalSets > 0;

  useEffect(() => {
    if (finished && rutina && registrado.current !== rutina.id) {
      registrado.current = rutina.id;
      setHist(registrarEntreno(rutina.id, rutina.titulo));
    }
  }, [finished, rutina?.id]);

  const hechosDe = (ei: number) => Array.from({ length: ejercicios[ei]?.series || 0 }, (_, si) => done.has(`${ei}-${si}`)).filter(Boolean).length;

  const toggleSet = (ei: number, si: number) => {
    const key = `${ei}-${si}`;
    const ej = ejercicios[ei];
    const next = new Set(done);
    if (next.has(key)) { next.delete(key); setDone(next); return; }
    next.add(key);
    setDone(next);
    // Al marcar una serie arranca el descanso de ese ejercicio
    if (ej.descanso > 0 && next.size < totalSets) setRest({ left: ej.descanso, total: ej.descanso, label: ej.nombre });
  };

  // Modo entreno: marca la siguiente serie pendiente del ejercicio en pantalla
  const serieHecha = () => {
    const ej = ejercicios[focus];
    if (!ej) return;
    const si = Array.from({ length: ej.series }, (_, i) => i).find(i => !done.has(`${focus}-${i}`));
    if (si === undefined) return;
    toggleSet(focus, si);
    if (si === ej.series - 1) {
      const sig = ejercicios.findIndex((_, i) => i > focus && hechosDe(i) < ejercicios[i].series);
      if (sig >= 0) setFocus(sig);
    }
  };

  const empezarModo = () => {
    const first = ejercicios.findIndex((_, i) => hechosDe(i) < ejercicios[i].series);
    setFocus(first >= 0 ? first : 0);
    setModo(true);
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
    if (!rutina) return;
    const url = `https://www.diosmasgym.com/rutinas?parte=${parte.id}&lugar=${lugar}&r=${rutina.id}`;
    const text = `💪 ${finished ? 'Terminé la rutina' : 'Rutina'} "${rutina.titulo}" (${parte.nombre.toLowerCase()} ${lugar === 'casa' ? 'en casa' : 'en el gym'}) + ${parte.versiculo.cita}. Fe y músculo con Diosmasgym:`;
    try {
      if ((navigator as any).share) { await (navigator as any).share({ title: 'Rutina Fe + Gym', text, url }); return; }
    } catch { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); alert('Enlace copiado'); } catch { /* nada */ }
  };

  const verTecnica = (ej: Ejercicio) => {
    const id = youtubeId(ej.video);
    if (id) setVideo({ id, title: ej.nombre });
    else window.open(ej.video || ytSearch(ej.nombre), '_blank', 'noopener');
  };

  const diasRacha = racha(hist);
  const semana = entrenosEstaSemana(hist);
  const calentamiento = rutina?.calentamiento?.length ? rutina.calentamiento : CALENTAMIENTO_GENERAL;
  const cover = rutina?.imagen || parte.imagen;
  const ejFocus = ejercicios[focus];

  return (
    <div className="min-h-screen bg-[#05070a]">
      {/* Encabezado */}
      <header className="relative overflow-hidden pt-10 pb-8 md:pt-16 md:pb-12" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 55%, #0b1929 100%)' }}>
        <div className="absolute -right-32 -top-32 w-[500px] h-[500px] rounded-full bg-[#4a90d9]/15 blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(0deg,#4a90d9 1px,transparent 1px),linear-gradient(90deg,#4a90d9 1px,transparent 1px)', backgroundSize: '60px 60px' }}></div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3"><i className="fas fa-dumbbell mr-2"></i>Fe · Músculo · Disciplina</p>
              <h1 className="font-serif italic text-5xl md:text-8xl text-white leading-none">
                Rutinas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] via-[#9cc8f5] to-white">Fe + Gym</span>
              </h1>
              <p className="text-sm md:text-base text-white/55 mt-4 max-w-xl">{data.rutinas.filter(r => !r.oculta).length} rutinas para entrenar el cuerpo y el espíritu. Elige dónde entrenas, la parte y tu nivel; marca cada serie y el descanso corre solo.</p>
            </div>
            {/* Racha */}
            <div className="flex gap-2">
              <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-center min-w-[92px]">
                <p className="text-2xl font-black text-white leading-none"><i className="fas fa-fire-flame-curved text-orange-400 mr-1.5 text-lg"></i>{diasRacha}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-200/70 mt-1">{diasRacha === 1 ? 'día de racha' : 'días de racha'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center min-w-[92px]">
                <p className="text-2xl font-black text-white leading-none"><i className="fas fa-calendar-check text-[#4a90d9] mr-1.5 text-lg"></i>{semana}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mt-1">esta semana</p>
              </div>
            </div>
          </div>

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
          <div className="mt-5 flex gap-2 md:gap-3 overflow-x-auto md:flex-wrap scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 pt-2 pb-1">
            {data.partes.map(p => (
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
        <section className="min-w-0">
          {/* Rutinas disponibles para esta parte y lugar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">{lista.length} {lista.length === 1 ? 'rutina' : 'rutinas'} de {parte.nombre.toLowerCase()} {lugar === 'casa' ? 'en casa' : 'en el gym'}</p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {(['todos', ...NIVELES] as const).map(n => (
                <button key={n} onClick={() => { setNivelFiltro(n); const f = n === 'todos' ? null : lista.find(r => r.nivel === n); if (f) select({ r: f.id }); }} aria-pressed={nivelFiltro === n}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border transition-colors ${nivelFiltro === n ? 'bg-[#4a90d9] text-black border-[#4a90d9]' : 'text-white/60 border-white/10 hover:border-white/30'}`}>
                  {n === 'todos' ? 'Todos' : n}
                </button>
              ))}
            </div>
          </div>
          {filtradas.length > 0 ? (
            <div ref={carruselRef} className="relative flex gap-3 overflow-x-auto scrollbar-none -mx-5 px-5 md:mx-0 md:px-0 pb-2 mb-5 snap-x">
              {filtradas.map(r => {
                const sel = rutina?.id === r.id;
                return (
                  <button key={r.id} onClick={() => select({ r: r.id })} aria-pressed={sel}
                    className={`snap-start relative flex-shrink-0 w-[220px] h-[130px] rounded-2xl overflow-hidden border text-left transition-all ${sel ? 'border-[#4a90d9] ring-2 ring-[#4a90d9]/50' : 'border-white/10 hover:border-white/30 opacity-80 hover:opacity-100'}`}>
                    {r.imagen ? (
                      <img src={r.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg, rgba(37,99,168,0.55), #0a1322 70%)' }}>
                        <i className={`fas ${parte.icono} absolute -right-3 -bottom-3 text-[90px] text-white/[0.07]`}></i>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-[0.15em] ${NIVEL_COLOR[r.nivel]}`}>{r.nivel}</span>
                      <p className="text-sm font-black text-white mt-1 leading-tight line-clamp-2">{r.titulo}</p>
                      <p className="text-[10px] text-white/60 mt-0.5">{r.minutos} min · {r.ejercicios.length} ejercicios</p>
                    </div>
                    {r.destacada && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px]"><i className="fas fa-star"></i></span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mb-5 text-sm text-white/40 rounded-2xl border border-dashed border-white/10 p-5">No hay rutinas de este nivel aquí todavía. Prueba con otro nivel o lugar.</p>
          )}

          {!rutina ? (
            <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/50">
              <p className="text-4xl mb-3">🏗️</p>
              Pronto habrá rutinas de {parte.nombre.toLowerCase()} {lugar === 'casa' ? 'en casa' : 'en el gym'}. Mientras, prueba {lugar === 'casa' ? 'en el gym' : 'en casa'}.
            </div>
          ) : (
            <>
              {/* Resumen */}
              <div className="relative overflow-hidden rounded-3xl border border-[#4a90d9]/25 mb-5">
                {cover && <img src={cover} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />}
                <div className={`absolute inset-0 ${cover ? 'bg-gradient-to-br from-black/80 via-black/70 to-[#05070a]/95' : 'bg-gradient-to-br from-[#4a90d9]/[0.12] to-transparent'}`}></div>
                <div className="relative p-5 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7]">{parte.nombre} · {lugar === 'casa' ? 'En casa' : 'En el gym'}{rutina.objetivo ? ` · ${rutina.objetivo}` : ''}</p>
                      <h2 className="font-serif italic text-3xl md:text-5xl text-white mt-1">{rutina.titulo}</h2>
                      <p className="text-sm text-white/65 mt-2 max-w-xl">{rutina.descripcion || parte.frase}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[
                      ['fa-clock', `${rutina.minutos} min`],
                      ['fa-signal', rutina.nivel],
                      ['fa-list-check', `${ejercicios.length} ejercicios`],
                      ['fa-layer-group', `${totalSets} series`],
                    ].map(([icon, t]) => (
                      <span key={icon} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-[10px] font-bold text-white/75"><i className={`fas ${icon} text-[#4a90d9]`}></i>{t}</span>
                    ))}
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

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-5">
                    <button onClick={empezarModo} className="col-span-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.15em] hover:bg-[#4a90d9] transition-colors shadow-[0_10px_30px_rgba(255,255,255,0.15)]">
                      <i className="fas fa-play"></i>{done.size > 0 && !finished ? 'Continuar entreno' : 'Modo entreno'}
                    </button>
                    <button onClick={playMusic} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4a90d9] text-black text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white transition-colors">
                      <i className="fas fa-headphones"></i><span className="sm:hidden">Música</span><span className="hidden sm:inline">Ponle música</span>
                    </button>
                    <button onClick={share} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/15 text-white/80 text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white/10 transition-colors">
                      <i className="fas fa-share-nodes"></i>Compartir
                    </button>
                  </div>
                </div>
              </div>

              {finished && (
                <div className="rounded-3xl p-6 mb-5 text-center border border-emerald-400/40 bg-emerald-500/10 animate-fade-in-up">
                  <p className="text-4xl mb-2">💪🙏</p>
                  <p className="font-serif italic text-3xl text-white">¡Rutina terminada!</p>
                  <p className="text-sm text-white/60 mt-1">"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13</p>
                  <p className="text-xs text-emerald-200/80 mt-2 font-bold"><i className="fas fa-fire-flame-curved mr-1"></i>Racha: {diasRacha} {diasRacha === 1 ? 'día' : 'días'} · {semana} {semana === 1 ? 'día' : 'días'} entrenados esta semana</p>
                  <button onClick={share} className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-[0.15em]">
                    <i className="fas fa-share-nodes"></i>Presúmelo
                  </button>
                </div>
              )}

              {/* Calentamiento */}
              <div className="rounded-2xl border border-orange-400/20 bg-orange-500/[0.05] mb-3">
                <button onClick={() => setWarmOpen(o => !o)} aria-expanded={warmOpen} className="w-full flex items-center gap-3 p-4 text-left">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-300 flex items-center justify-center"><i className="fas fa-fire"></i></span>
                  <span className="flex-1">
                    <span className="block text-white font-bold">Calentamiento</span>
                    <span className="block text-[11px] text-white/50">{warmDone.size} / {calentamiento.length} · 5 minutos antes de empezar</span>
                  </span>
                  <i className={`fas fa-chevron-down text-white/40 transition-transform ${warmOpen ? 'rotate-180' : ''}`}></i>
                </button>
                {warmOpen && (
                  <ul className="px-4 pb-4 flex flex-col gap-1.5">
                    {calentamiento.map((c, i) => (
                      <li key={i}>
                        <button onClick={() => setWarmDone(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left">
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-[9px] ${warmDone.has(i) ? 'bg-orange-400 border-orange-400 text-black' : 'border-white/25'}`}>{warmDone.has(i) && <i className="fas fa-check"></i>}</span>
                          <span className={`text-sm ${warmDone.has(i) ? 'text-white/40 line-through' : 'text-white/80'}`}>{c}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Ejercicios */}
              <ol className="flex flex-col gap-3">
                {ejercicios.map((ej, ei) => {
                  const hechos = hechosDe(ei);
                  const completo = hechos === ej.series;
                  return (
                    <li key={`${ei}-${ej.nombre}`} className={`rounded-2xl border p-4 md:p-5 transition-colors ${completo ? 'border-emerald-400/40 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                      <div className="flex items-start gap-4">
                        {ej.imagen ? (
                          <button onClick={() => setLightbox({ src: ej.imagen!, alt: ej.nombre })} className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/10 bg-black" aria-label={`Ver imagen de ${ej.nombre}`}>
                            <img src={ej.imagen} alt={ej.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className={`absolute top-1 left-1 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${completo ? 'bg-emerald-500 text-black' : 'bg-black/70 text-white'}`}>{completo ? <i className="fas fa-check"></i> : ei + 1}</span>
                          </button>
                        ) : (
                          <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black ${completo ? 'bg-emerald-500 text-black' : 'bg-[#4a90d9]/15 text-[#7eb8f7]'}`}>
                            {completo ? <i className="fas fa-check"></i> : ei + 1}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-white font-bold text-base md:text-lg leading-snug">{ej.nombre}</h3>
                            {ej.musculo && <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-[0.1em] text-white/50">{ej.musculo}</span>}
                          </div>
                          <p className="text-xs text-white/60 mt-1">
                            <span className="text-white font-bold">{ej.series} × {ej.reps}</span>
                            {ej.descanso > 0 && <> · descanso {fmtDescanso(ej.descanso)}</>}
                          </p>
                          {ej.tip && <p className="text-xs text-white/45 mt-2 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{ej.tip}</p>}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
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
                            <button onClick={() => verTecnica(ej)} className="h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-red-300 border border-red-400/25 hover:bg-red-500/10 transition-colors">
                              <i className="fab fa-youtube mr-1.5"></i>Técnica
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="text-[11px] text-white/35 mt-6 leading-relaxed">
                Si tienes alguna lesión o condición de salud, consulta a tu médico. Ajusta el peso para terminar cada serie con buena técnica y deja 1-2 repeticiones en reserva si estás empezando.
              </p>
            </>
          )}
        </section>

        {/* Lateral: versiculo y otras rutinas */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-3xl p-6 border-l-4 border-[#2563a8] bg-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-3"><i className="fas fa-bible mr-2"></i>Entrena el espíritu</p>
            <blockquote className="font-serif text-xl md:text-2xl text-white leading-snug">"{parte.versiculo.texto}"</blockquote>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7eb8f7]">{parte.versiculo.cita}</p>
          </div>
          <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.02]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3">Otras partes {lugar === 'casa' ? 'en casa' : 'en el gym'}</p>
            <div className="flex flex-col gap-1">
              {data.partes.filter(p => p.id !== parte.id).map(p => {
                const n = rutinasVisibles(data, p.id, lugar).length;
                return (
                  <button key={p.id} onClick={() => { select({ parte: p.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors">
                    <span className="w-9 h-9 rounded-lg bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center"><i className={`fas ${p.icono} text-sm`}></i></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white">{p.nombre}</span>
                      <span className="block text-[10px] text-white/40">{n === 0 ? 'Próximamente' : `${n} ${n === 1 ? 'rutina' : 'rutinas'}`}</span>
                    </span>
                    <i className="fas fa-chevron-right text-[10px] text-white/30"></i>
                  </button>
                );
              })}
            </div>
          </div>
          {hist.length > 0 && (
            <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3"><i className="fas fa-trophy text-amber-400 mr-2"></i>Tus últimos entrenos</p>
              <ul className="flex flex-col gap-2">
                {hist.slice(0, 5).map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/80 truncate">{h.titulo}</span>
                    <span className="text-white/40 whitespace-nowrap">{h.fecha.split('-').reverse().slice(0, 2).join('/')}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-white/30 mt-3">{hist.length} entrenos guardados en este teléfono.</p>
            </div>
          )}
        </aside>
      </main>

      {/* Cronometro de descanso (fuera del modo entreno) */}
      {rest && !modo && (
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

      {/* Modo entreno: un ejercicio a la vez, pantalla completa */}
      {modo && rutina && ejFocus && (
        <div className="fixed inset-0 z-[9600] bg-[#05070a] flex flex-col" role="dialog" aria-modal="true" aria-label="Modo entreno">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
            <button onClick={() => setModo(false)} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center" aria-label="Salir del modo entreno"><i className="fas fa-xmark"></i></button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7eb8f7] truncate">{rutina.titulo}</p>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
                <div className="h-full bg-[#4a90d9] transition-all duration-500" style={{ width: `${progress * 100}%` }}></div>
              </div>
            </div>
            <span className="text-xs font-black text-white tabular-nums">{done.size}/{totalSets}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center text-center max-w-xl mx-auto w-full">
            {finished ? (
              <div className="my-auto">
                <p className="text-6xl mb-4">🏆</p>
                <p className="font-serif italic text-4xl text-white">¡Terminaste!</p>
                <p className="text-sm text-white/60 mt-2">"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13</p>
                <p className="text-sm text-orange-300 font-bold mt-3"><i className="fas fa-fire-flame-curved mr-1"></i>{diasRacha} {diasRacha === 1 ? 'día' : 'días'} de racha</p>
                <div className="flex gap-2 justify-center mt-6">
                  <button onClick={share} className="px-5 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-[0.15em]"><i className="fas fa-share-nodes mr-2"></i>Presúmelo</button>
                  <button onClick={() => setModo(false)} className="px-5 py-3 rounded-xl border border-white/15 text-white text-[11px] font-black uppercase tracking-[0.15em]">Cerrar</button>
                </div>
              </div>
            ) : rest ? (
              <div className="my-auto w-full">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7eb8f7] mb-4">{rest.left <= 0 ? '¡A darle!' : 'Descansa'}</p>
                <div className="relative w-56 h-56 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-56 h-56 -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke={rest.left <= 0 ? '#10b981' : '#4a90d9'} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${(rest.left / rest.total) * 100.5} 100.5`} style={{ transition: 'stroke-dasharray 1s linear' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-black text-6xl tabular-nums">{rest.left <= 0 ? '¡Ya!' : fmt(rest.left)}</span>
                </div>
                <p className="text-sm text-white/50 mt-5">Sigue: <b className="text-white">{ejFocus.nombre}</b> · serie {Math.min(hechosDe(focus) + 1, ejFocus.series)} de {ejFocus.series}</p>
                <div className="flex gap-2 justify-center mt-5">
                  <button onClick={() => setRest(r => r ? { ...r, left: r.left + 15, total: r.total + 15 } : r)} className="px-5 py-3 rounded-xl bg-white/10 text-white text-xs font-black">+15 s</button>
                  <button onClick={() => setRest(null)} className="px-5 py-3 rounded-xl bg-[#4a90d9] text-black text-xs font-black uppercase tracking-[0.1em]"><i className="fas fa-forward mr-2"></i>Saltar descanso</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Ejercicio {focus + 1} de {ejercicios.length}</p>
                {ejFocus.imagen ? (
                  <img src={ejFocus.imagen} alt={ejFocus.nombre} referrerPolicy="no-referrer" className="mt-4 w-full max-h-[34vh] object-contain rounded-2xl bg-black border border-white/10" />
                ) : (
                  <div className="mt-4 w-28 h-28 rounded-3xl bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center text-5xl"><i className={`fas ${parte.icono}`}></i></div>
                )}
                <h3 className="font-serif italic text-3xl md:text-4xl text-white mt-5 leading-tight">{ejFocus.nombre}</h3>
                {ejFocus.musculo && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-2">{ejFocus.musculo}</p>}
                <p className="text-5xl font-black text-white mt-4">{ejFocus.reps}</p>
                <p className="text-sm text-[#7eb8f7] font-bold mt-1">Serie {Math.min(hechosDe(focus) + 1, ejFocus.series)} de {ejFocus.series}</p>
                <div className="flex gap-1.5 mt-3">
                  {Array.from({ length: ejFocus.series }, (_, si) => (
                    <span key={si} className={`w-8 h-1.5 rounded-full ${done.has(`${focus}-${si}`) ? 'bg-emerald-400' : 'bg-white/15'}`}></span>
                  ))}
                </div>
                {ejFocus.tip && <p className="text-sm text-white/55 mt-5 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{ejFocus.tip}</p>}
                <button onClick={() => verTecnica(ejFocus)} className="mt-4 text-[11px] font-black uppercase tracking-[0.15em] text-red-300"><i className="fab fa-youtube mr-1.5"></i>Ver técnica</button>
              </>
            )}
          </div>

          {!finished && (
            <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-white/5 flex items-center gap-2 max-w-xl mx-auto w-full">
              <button onClick={() => { setRest(null); setFocus(f => Math.max(0, f - 1)); }} disabled={focus === 0} className="w-14 h-14 rounded-2xl bg-white/5 text-white disabled:opacity-30 flex items-center justify-center" aria-label="Ejercicio anterior"><i className="fas fa-chevron-left"></i></button>
              <button onClick={serieHecha} disabled={!!rest || hechosDe(focus) >= ejFocus.series} className="flex-1 h-14 rounded-2xl bg-emerald-500 text-black text-sm font-black uppercase tracking-[0.15em] disabled:opacity-40 transition-opacity">
                {hechosDe(focus) >= ejFocus.series ? <><i className="fas fa-check mr-2"></i>Ejercicio listo</> : <><i className="fas fa-check mr-2"></i>Serie hecha</>}
              </button>
              <button onClick={() => { setRest(null); setFocus(f => Math.min(ejercicios.length - 1, f + 1)); }} disabled={focus >= ejercicios.length - 1} className="w-14 h-14 rounded-2xl bg-white/5 text-white disabled:opacity-30 flex items-center justify-center" aria-label="Siguiente ejercicio"><i className="fas fa-chevron-right"></i></button>
            </div>
          )}
        </div>
      )}

      {/* Imagen en grande */}
      {lightbox && (
        <div className="fixed inset-0 z-[9700] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={lightbox.src} alt={lightbox.alt} referrerPolicy="no-referrer" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-white" aria-label="Cerrar"><i className="fas fa-xmark"></i></button>
        </div>
      )}

      {/* Video de tecnica */}
      {video && (
        <div className="fixed inset-0 z-[9700] bg-black/90 flex items-center justify-center p-4" onClick={() => setVideo(null)} role="dialog" aria-modal="true" aria-label={video.title}>
          <div className="w-full max-w-3xl" onClick={ev => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold truncate">{video.title}</p>
              <button onClick={() => setVideo(null)} className="w-10 h-10 rounded-full bg-white/10 text-white flex-shrink-0" aria-label="Cerrar"><i className="fas fa-xmark"></i></button>
            </div>
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RutinasView;
