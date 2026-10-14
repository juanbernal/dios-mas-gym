import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CALENTAMIENTO_GENERAL, Ejercicio, Lugar, NIVELES, Nivel, Rutina, parteDeMusculo, parteDelDia, rutinaPrincipal, rutinasVisibles, zonasDeParte } from '../data/rutinas';
import BodyMap from './BodyMap';
import BuscadorRutinas from './rutinas/BuscadorRutinas';
import ProgresoPanel from './rutinas/ProgresoPanel';
import FiguraEjercicio, { tieneFigura } from './rutinas/FiguraEjercicio';
import {
  Entreno, SerieLog, borrarSesion, entrenosEstaSemana, getFavoritas, getHistorial, getMeta, getSesion, guardarSeries, guardarSesion, hoyLocal,
  mejorKg, racha, registrarEntreno, segundosDeReps, setMeta, toggleFavorita, ultimaVez, useRutinas, youtubeId,
} from '../services/rutinaService';

interface Props {
  catalog: any[];
  onPlaySong: (song: any) => void;
}

// Pitidos sin archivos de audio: largo al terminar un tiempo, corto en la cuenta 3-2-1
const beep = (veces = 3, freq = 880) => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    Array.from({ length: veces }, (_, i) => i * 0.25).forEach(t => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* sin sonido */ }
};

const VOZ_KEY = 'dg_rutinas_voz';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtDescanso = (s: number) => (s >= 60 ? fmt(s) : `${s} s`);
const fmtKg = (kg?: number) => (kg ? `${String(kg).replace('.', ',')} kg` : 'sin peso');
const NIVEL_COLOR: Record<Nivel, string> = { Principiante: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30', Intermedio: 'text-amber-300 bg-amber-500/15 border-amber-400/30', Avanzado: 'text-red-300 bg-red-500/15 border-red-400/30' };
const ytSearch = (nombre: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`cómo hacer ${nombre} técnica correcta`)}`;
const repsBase = (reps: string) => { const n = parseInt(reps, 10); return Number.isFinite(n) && n > 0 ? n : undefined; };

// Progreso del entreno de la rutina abierta; se guarda en el telefono para retomarlo si se cierra la pagina
type Ses = { rid: string; done: Set<string>; warm: Set<number>; pesos: Record<string, SerieLog>; inicio: number | null };
const cargarSes = (r?: Rutina): Ses => {
  const s = r ? getSesion(r.id) : null;
  const valida = (k: string) => { const [ei, si] = k.split('-').map(Number); return !!r && si < (r.ejercicios[ei]?.series ?? 0); };
  return {
    rid: r?.id || '',
    done: new Set((s?.done || []).filter(valida)),
    warm: new Set(s?.warmDone || []),
    pesos: s?.pesos || {},
    inicio: s?.inicio ?? null,
  };
};

type Timer = { left: number; total: number; label: string; tipo: 'descanso' | 'trabajo'; ei: number; si: number };
type Resumen = { minutos: number; series: number; volumen: number; prs: { nombre: string; kg: number }[] };

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

  const [ses, setSes] = useState<Ses>(() => cargarSes(rutina));
  // Al cambiar de rutina se carga su progreso guardado (o vacio)
  if ((rutina?.id || '') !== ses.rid) setSes(cargarSes(rutina));
  const { done, warm: warmDone, pesos } = ses;

  const [rest, setRest] = useState<Timer | null>(null);
  const [warmOpen, setWarmOpen] = useState(false);
  const [modo, setModo] = useState(false);
  const [focus, setFocus] = useState(0);
  const [lightbox, setLightbox] = useState<{ src?: string; alt: string; tip?: string } | null>(null);
  const [video, setVideo] = useState<{ id: string; title: string } | null>(null);
  const [hist, setHist] = useState<Entreno[]>(() => getHistorial());
  const [favs, setFavs] = useState<string[]>(() => getFavoritas());
  const [meta, setMetaState] = useState<number>(() => getMeta());
  const [anotar, setAnotar] = useState<Set<number>>(new Set());
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [voz, setVoz] = useState<boolean>(() => { try { return localStorage.getItem(VOZ_KEY) !== '0'; } catch { return true; } });
  const [, setTick] = useState(0);
  const registrado = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const carruselRef = useRef<HTMLDivElement>(null);
  const vozRef = useRef(voz);
  vozRef.current = voz;

  const hablar = (texto: string) => {
    if (!vozRef.current || !modo) return;
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-MX';
      u.rate = 1.05;
      s.speak(u);
    } catch { /* sin voz */ }
  };

  // La tarjeta elegida siempre a la vista en el carrusel (sin mover la pagina)
  useEffect(() => {
    const c = carruselRef.current;
    const el = c?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (c && el) c.scrollTo({ left: Math.max(0, el.offsetLeft - c.offsetLeft - 20), behavior: 'smooth' });
  }, [rutina?.id, nivelFiltro]);

  useEffect(() => {
    setRest(null);
    setFocus(0);
    setAnotar(new Set());
    setResumen(null);
    registrado.current = null;
  }, [rutina?.id]);

  useEffect(() => {
    document.title = `Rutina de ${parte.nombre.toLowerCase()} en ${lugar === 'casa' ? 'casa' : 'el gym'} | Diosmasgym`;
  }, [parte.id, lugar]);

  const ejercicios = rutina?.ejercicios || [];
  const totalSets = ejercicios.reduce((a, e) => a + e.series, 0);
  const progress = totalSets ? done.size / totalSets : 0;
  const finished = done.size === totalSets && totalSets > 0;

  // Lo que se anoto la ultima vez y el mejor peso de cada ejercicio (se relee al terminar)
  const previo = useMemo(
    () => ejercicios.map(ej => ({ ultima: ultimaVez(ej.nombre), record: mejorKg(ej.nombre) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rutina?.id, hist.length],
  );

  // Guardar el entreno en curso para retomarlo
  useEffect(() => {
    if (!rutina || ses.rid !== rutina.id || finished) return;
    if (done.size === 0 && warmDone.size === 0 && Object.keys(pesos).length === 0) return;
    guardarSesion({ rutinaId: rutina.id, fecha: hoyLocal(), done: Array.from(done), warmDone: Array.from(warmDone), pesos, inicio: ses.inicio });
  }, [ses]);

  const updSes = (fn: (s: Ses) => Partial<Ses>) => setSes(s => ({ ...s, ...fn(s) }));

  // Sugerencia de peso y reps para una serie: lo anotado, la serie anterior de hoy o lo de la ultima vez
  const sugerencia = (ei: number, si: number): SerieLog => {
    const k = `${ei}-${si}`;
    if (pesos[k]) return pesos[k];
    for (let i = si - 1; i >= 0; i--) if (pesos[`${ei}-${i}`]) return pesos[`${ei}-${i}`];
    const u = previo[ei]?.ultima?.sets;
    const prev = u?.[si] || u?.[u.length - 1];
    return { kg: prev?.kg, reps: prev?.reps ?? repsBase(ejercicios[ei]?.reps || '') };
  };

  const setPeso = (ei: number, si: number, campo: keyof SerieLog, valor: number | undefined) =>
    updSes(s => {
      const k = `${ei}-${si}`;
      const base = s.pesos[k] || sugerencia(ei, si);
      return { pesos: { ...s.pesos, [k]: { ...base, [campo]: valor && valor > 0 ? Math.round(valor * 100) / 100 : undefined } } };
    });

  const terminar = () => {
    if (!rutina) return;
    const minutos = ses.inicio ? Math.max(1, Math.round((Date.now() - ses.inicio) / 60000)) : rutina.minutos;
    let volumen = 0;
    const prs: Resumen['prs'] = [];
    ejercicios.forEach((ej, ei) => {
      const sets = Array.from({ length: ej.series }, (_, si) => (done.has(`${ei}-${si}`) ? pesos[`${ei}-${si}`] || {} : {}));
      sets.forEach(x => { if (x.kg && x.reps) volumen += x.kg * x.reps; });
      const max = Math.max(0, ...sets.map(x => x.kg || 0));
      const antes = mejorKg(ej.nombre);
      if (antes > 0 && max > antes) prs.push({ nombre: ej.nombre, kg: max });
      guardarSeries(ej.nombre, sets);
    });
    volumen = Math.round(volumen);
    setResumen({ minutos, series: totalSets, volumen, prs });
    setHist(registrarEntreno({ id: rutina.id, titulo: rutina.titulo, parte: parte.id, lugar, minutos, series: totalSets, volumen, prs: prs.length }));
    borrarSesion();
    beep(4, 1046);
    hablar('¡Rutina terminada! Todo lo puedo en Cristo que me fortalece.');
  };

  useEffect(() => {
    if (finished && rutina && registrado.current !== rutina.id) {
      registrado.current = rutina.id;
      terminar();
    }
  }, [finished, rutina?.id]);

  const hechosDe = (ei: number) => Array.from({ length: ejercicios[ei]?.series || 0 }, (_, si) => done.has(`${ei}-${si}`)).filter(Boolean).length;
  const siguienteSerie = (ei: number) => Array.from({ length: ejercicios[ei]?.series || 0 }, (_, i) => i).find(i => !done.has(`${ei}-${i}`));

  const toggleSet = (ei: number, si: number, guardarSugerencia = false) => {
    const key = `${ei}-${si}`;
    const ej = ejercicios[ei];
    if (done.has(key)) { updSes(s => { const n = new Set(s.done); n.delete(key); return { done: n }; }); return; }
    const next = new Set(done);
    next.add(key);
    const sug = guardarSugerencia && !pesos[key] ? sugerencia(ei, si) : null;
    updSes(s => ({
      done: next,
      inicio: s.inicio ?? Date.now(),
      pesos: sug && (sug.kg || sug.reps) ? { ...s.pesos, [key]: sug } : s.pesos,
    }));
    // Al marcar una serie arranca el descanso de ese ejercicio
    if (ej.descanso > 0 && next.size < totalSets) {
      setRest({ left: ej.descanso, total: ej.descanso, label: ej.nombre, tipo: 'descanso', ei, si });
      hablar(`Descansa ${ej.descanso >= 60 && ej.descanso % 60 === 0 ? `${ej.descanso / 60} ${ej.descanso === 60 ? 'minuto' : 'minutos'}` : `${ej.descanso} segundos`}`);
    } else setRest(null);
  };
  const toggleRef = useRef(toggleSet);
  toggleRef.current = toggleSet;

  // Ejercicios por tiempo: cuenta atras de trabajo y al terminar marca la serie
  const iniciarTrabajo = (ei: number) => {
    const ej = ejercicios[ei];
    const seg = segundosDeReps(ej?.reps || '');
    const si = siguienteSerie(ei);
    if (!ej || !seg || si === undefined) return;
    beep(1, 660);
    hablar(`¡Dale! ${seg} segundos`);
    updSes(s => ({ inicio: s.inicio ?? Date.now() }));
    setRest({ left: seg, total: seg, label: ej.nombre, tipo: 'trabajo', ei, si });
  };

  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      beep();
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* sin vibracion */ }
      if (rest.tipo === 'trabajo') {
        setRest(null);
        toggleRef.current(rest.ei, rest.si);
        return;
      }
      const sig = ejercicios[focus];
      const si = siguienteSerie(focus);
      hablar(sig && si !== undefined ? `¡A darle! ${sig.nombre}, serie ${si + 1} de ${sig.series}` : '¡A darle!');
      const t = window.setTimeout(() => setRest(null), 1500);
      return () => clearTimeout(t);
    }
    if (rest.left <= 3) beep(1, 660);
    timerRef.current = window.setTimeout(() => setRest(r => r ? { ...r, left: r.left - 1 } : r), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [rest]);

  // En modo entreno la pantalla no se apaga (si el navegador lo permite)
  useEffect(() => {
    if (!modo) return;
    let lock: any = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => { /* sin wake lock */ });
    document.body.style.overflow = 'hidden';
    return () => { try { lock?.release?.(); } catch { /* nada */ } document.body.style.overflow = ''; try { window.speechSynthesis?.cancel(); } catch { /* nada */ } };
  }, [modo]);

  // Reloj del entreno
  useEffect(() => {
    if (!ses.inicio || finished) return;
    const t = window.setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [ses.inicio, finished]);

  // Anunciar el ejercicio en pantalla
  useEffect(() => {
    if (!modo || rest || finished) return;
    const ej = ejercicios[focus];
    const si = siguienteSerie(focus);
    if (ej && si !== undefined) hablar(`${ej.nombre}. Serie ${si + 1} de ${ej.series}. ${ej.reps}`);
  }, [modo, focus]);

  // Modo entreno: marca la siguiente serie pendiente del ejercicio en pantalla
  const serieHecha = () => {
    const ej = ejercicios[focus];
    if (!ej) return;
    const si = siguienteSerie(focus);
    if (si === undefined) return;
    toggleSet(focus, si, true);
    if (si === ej.series - 1) {
      const sig = ejercicios.findIndex((_, i) => i > focus && hechosDe(i) < ejercicios[i].series);
      const vuelta = sig >= 0 ? sig : ejercicios.findIndex((_, i) => i !== focus && hechosDe(i) < ejercicios[i].series);
      if (vuelta >= 0) setFocus(vuelta);
    }
  };

  const empezarModo = () => {
    const first = ejercicios.findIndex((_, i) => hechosDe(i) < ejercicios[i].series);
    setFocus(first >= 0 ? first : 0);
    setModo(true);
  };

  const reiniciar = () => {
    if (!confirm('¿Empezar esta rutina de cero? Se borra el progreso de hoy.')) return;
    borrarSesion();
    setRest(null);
    setResumen(null);
    registrado.current = null;
    setSes({ rid: rutina?.id || '', done: new Set(), warm: new Set(), pesos: {}, inicio: null });
  };

  const cambiarVoz = () => {
    const v = !voz;
    setVoz(v);
    try { localStorage.setItem(VOZ_KEY, v ? '1' : '0'); } catch { /* nada */ }
    if (!v) try { window.speechSynthesis?.cancel(); } catch { /* nada */ }
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
    const extra = finished && resumen ? ` en ${resumen.minutos} min${resumen.volumen ? `, ${resumen.volumen.toLocaleString('es')} kg levantados` : ''}${resumen.prs.length ? ` y ${resumen.prs.length} ${resumen.prs.length === 1 ? 'récord nuevo' : 'récords nuevos'} 🏅` : ''}` : '';
    const text = `💪 ${finished ? 'Terminé la rutina' : 'Rutina'} "${rutina.titulo}" (${parte.nombre.toLowerCase()} ${lugar === 'casa' ? 'en casa' : 'en el gym'})${extra}. ${parte.versiculo.cita}. Fe y músculo con Diosmasgym:`;
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

  const abrirRutina = (r: Rutina) => {
    setNivelFiltro('todos');
    setParams({ parte: r.parte, lugar: r.lugar, r: r.id }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const diasRacha = racha(hist);
  const semana = entrenosEstaSemana(hist);
  const calentamiento = rutina?.calentamiento?.length ? rutina.calentamiento : CALENTAMIENTO_GENERAL;
  const cover = rutina?.imagen || parte.imagen;
  const ejFocus = ejercicios[focus];
  const esFav = !!rutina && favs.includes(rutina.id);
  const misFavs = favs.map(id => data.rutinas.find(r => r.id === id && !r.oculta)).filter((r): r is Rutina => !!r);
  const transcurrido = ses.inicio ? Math.floor((Date.now() - ses.inicio) / 1000) : 0;
  const segFocus = ejFocus ? segundosDeReps(ejFocus.reps) : null;
  const siFocus = siguienteSerie(focus);
  const sugFocus = ejFocus && siFocus !== undefined ? sugerencia(focus, siFocus) : null;
  const metaPct = Math.min(1, semana / meta);

  const resumenFinal = (grande?: boolean) => resumen ? (
    <div className={`grid grid-cols-3 gap-2 ${grande ? 'mt-6' : 'mt-4'} max-w-sm mx-auto`}>
      {[
        ['fa-stopwatch', `${resumen.minutos} min`, 'duración'],
        ['fa-layer-group', String(resumen.series), 'series'],
        ['fa-weight-hanging', resumen.volumen ? `${resumen.volumen.toLocaleString('es')}` : '—', 'kg totales'],
      ].map(([icon, v, l]) => (
        <div key={l} className="rounded-xl bg-black/30 border border-white/10 p-2.5">
          <i className={`fas ${icon} text-emerald-300 text-xs`}></i>
          <p className="text-lg font-black text-white leading-none mt-1 tabular-nums">{v}</p>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/45 mt-1">{l}</p>
        </div>
      ))}
      {resumen.prs.length > 0 && (
        <div className="col-span-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1"><i className="fas fa-star mr-1.5"></i>{resumen.prs.length === 1 ? 'Récord nuevo' : 'Récords nuevos'}</p>
          {resumen.prs.map(p => <p key={p.nombre} className="text-xs text-white/85"><b>{p.nombre}</b> · {fmtKg(p.kg)}</p>)}
        </div>
      )}
    </div>
  ) : null;

  const stepper = (label: string, valor: number | undefined, paso: number, sufijo: string, onCambio: (v: number | undefined) => void) => (
    <div className="flex-1 rounded-2xl bg-white/[0.04] border border-white/10 p-2">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{label}</p>
      <div className="flex items-center justify-between gap-1 mt-1">
        <button onClick={() => onCambio(Math.max(0, (valor || 0) - paso))} className="w-10 h-10 rounded-xl bg-white/10 text-white text-sm active:scale-95" aria-label={`Menos ${label}`}><i className="fas fa-minus"></i></button>
        <span className="text-xl font-black text-white tabular-nums">{valor ? String(valor).replace('.', ',') : '—'}<span className="text-[10px] text-white/40 font-bold ml-0.5">{valor ? sufijo : ''}</span></span>
        <button onClick={() => onCambio((valor || 0) + paso)} className="w-10 h-10 rounded-xl bg-white/10 text-white text-sm active:scale-95" aria-label={`Más ${label}`}><i className="fas fa-plus"></i></button>
      </div>
    </div>
  );

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
              <p className="text-sm md:text-base text-white/55 mt-4 max-w-xl">{data.rutinas.filter(r => !r.oculta).length} rutinas para entrenar el cuerpo y el espíritu. Elige dónde entrenas, la parte y tu nivel; anota tus pesos, marca cada serie y el descanso corre solo.</p>
            </div>
            {/* Racha y meta semanal */}
            <div className="flex gap-2">
              <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-center min-w-[92px]">
                <p className="text-2xl font-black text-white leading-none"><i className="fas fa-fire-flame-curved text-orange-400 mr-1.5 text-lg"></i>{diasRacha}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-200/70 mt-1">{diasRacha === 1 ? 'día de racha' : 'días de racha'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 flex items-center gap-2.5 min-w-[120px]">
                <div className="relative w-11 h-11 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={metaPct >= 1 ? '#10b981' : '#4a90d9'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${metaPct * 94.2} 94.2`} style={{ transition: 'stroke-dasharray .6s' }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">{metaPct >= 1 ? <i className="fas fa-check text-emerald-400"></i> : `${semana}/${meta}`}</span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-tight">Meta<br />semanal</p>
                  <p className="text-[10px] text-white/70 font-bold mt-0.5">{metaPct >= 1 ? '¡Cumplida!' : `Faltan ${meta - semana}`}</p>
                </div>
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
          {/* Mapa del cuerpo: se pinta la parte elegida y al tocar un musculo se abre su rutina */}
          <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-4 max-w-md">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7] mb-2"><i className="fas fa-person-running mr-2"></i>Mapa muscular · {parte.nombre}</p>
            <BodyMap
              alto={250}
              activos={new Set(zonasDeParte(parte))}
              corazon={parte.id === 'cardio'}
              onPick={m => { const p = parteDeMusculo(data.partes, m); if (p) select({ parte: p.id }); }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 grid lg:grid-cols-[1fr_340px] gap-6 md:gap-8">
        <section className="min-w-0">
          <BuscadorRutinas data={data} onPick={abrirRutina} />

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
                const hecha = hist.some(h => h.id === r.id);
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
                      <p className="text-[10px] text-white/60 mt-0.5">{r.minutos} min · {r.ejercicios.length} ejercicios{hecha && <span className="text-emerald-300"> · <i className="fas fa-check"></i> hecha</span>}</p>
                    </div>
                    <span className="absolute top-2 right-2 flex gap-1">
                      {favs.includes(r.id) && <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"><i className="fas fa-heart"></i></span>}
                      {r.destacada && <span className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-[10px]"><i className="fas fa-star"></i></span>}
                    </span>
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7]">{parte.nombre} · {lugar === 'casa' ? 'En casa' : 'En el gym'}{rutina.objetivo ? ` · ${rutina.objetivo}` : ''}</p>
                      <h2 className="font-serif italic text-3xl md:text-5xl text-white mt-1">{rutina.titulo}</h2>
                      <p className="text-sm text-white/65 mt-2 max-w-xl">{rutina.descripcion || parte.frase}</p>
                    </div>
                    <button onClick={() => setFavs(toggleFavorita(rutina.id))} aria-pressed={esFav} aria-label={esFav ? 'Quitar de favoritas' : 'Guardar en favoritas'}
                      className={`flex-shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${esFav ? 'bg-rose-500 border-rose-500 text-white' : 'border-white/20 text-white/70 hover:text-white bg-black/30'}`}>
                      <i className={`${esFav ? 'fas' : 'far'} fa-heart`}></i>
                    </button>
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
                    {ses.inicio && !finished && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-bold text-emerald-200 tabular-nums"><i className="fas fa-stopwatch"></i>{fmt(transcurrido)}</span>
                    )}
                  </div>

                  {/* Progreso */}
                  <div className="mt-5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">
                      <span>Progreso</span>
                      <span className="text-white">
                        {done.size} / {totalSets} series
                        {(done.size > 0 || finished) && <button onClick={reiniciar} className="ml-3 text-white/40 hover:text-white normal-case tracking-normal font-bold" aria-label="Reiniciar rutina"><i className="fas fa-rotate-left mr-1"></i>Reiniciar</button>}
                      </span>
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
                  {resumenFinal()}
                  <p className="text-xs text-emerald-200/80 mt-3 font-bold"><i className="fas fa-fire-flame-curved mr-1"></i>Racha: {diasRacha} {diasRacha === 1 ? 'día' : 'días'} · {semana} de {meta} días de tu meta semanal</p>
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
                        <button onClick={() => updSes(s => { const n = new Set(s.warm); n.has(i) ? n.delete(i) : n.add(i); return { warm: n }; })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left">
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
                  const seg = segundosDeReps(ej.reps);
                  const { ultima, record } = previo[ei] || { ultima: null, record: 0 };
                  const abierto = anotar.has(ei);
                  return (
                    <li key={`${ei}-${ej.nombre}`} className={`rounded-2xl border p-4 md:p-5 transition-colors ${completo ? 'border-emerald-400/40 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
                      <div className="flex items-start gap-4">
                        {ej.imagen ? (
                          <button onClick={() => setLightbox({ src: ej.imagen!, alt: ej.nombre })} className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/10 bg-black" aria-label={`Ver imagen de ${ej.nombre}`}>
                            <img src={ej.imagen} alt={ej.nombre} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            <span className={`absolute top-1 left-1 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${completo ? 'bg-emerald-500 text-black' : 'bg-black/70 text-white'}`}>{completo ? <i className="fas fa-check"></i> : ei + 1}</span>
                          </button>
                        ) : tieneFigura(ej.nombre) ? (
                          <button onClick={() => setLightbox({ alt: ej.nombre, tip: ej.tip })} className="relative flex-shrink-0 w-24 h-20 md:w-32 md:h-24 rounded-xl overflow-hidden border border-white/10 bg-[#0a1322]" aria-label={`Ver cómo se hace ${ej.nombre}`}>
                            <FiguraEjercicio nombre={ej.nombre} className="w-full h-full" />
                            <span className={`absolute top-1 left-1 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${completo ? 'bg-emerald-500 text-black' : 'bg-black/70 text-white'}`}>{completo ? <i className="fas fa-check"></i> : ei + 1}</span>
                            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/60 text-white/80 flex items-center justify-center text-[8px]"><i className="fas fa-magnifying-glass"></i></span>
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
                          {ultima && (
                            <p className="text-[11px] text-[#9cc8f5]/80 mt-1.5">
                              <i className="fas fa-history mr-1.5"></i>Última vez ({ultima.fecha.split('-').reverse().slice(0, 2).join('/')}): {ultima.sets.filter(x => x.kg || x.reps).map(x => `${x.kg ? `${String(x.kg).replace('.', ',')}kg` : ''}${x.kg && x.reps ? '×' : ''}${x.reps || ''}`).join(' · ')}
                              {record > 0 && <span className="text-amber-300/90"> · <i className="fas fa-star"></i> {fmtKg(record)}</span>}
                            </p>
                          )}
                          {ej.tip && <p className="text-xs text-white/45 mt-2 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{ej.tip}</p>}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {Array.from({ length: ej.series }, (_, si) => {
                              const isDone = done.has(`${ei}-${si}`);
                              const p = pesos[`${ei}-${si}`];
                              return (
                                <button
                                  key={si}
                                  onClick={() => toggleSet(ei, si)}
                                  aria-pressed={isDone}
                                  aria-label={`Serie ${si + 1} de ${ej.nombre}`}
                                  className={`min-w-[44px] h-11 px-3 rounded-xl text-xs font-black transition-all ${isDone ? 'bg-emerald-500 text-black scale-95' : 'bg-white/5 text-white/70 border border-white/15 hover:border-[#4a90d9]'}`}
                                >
                                  {isDone ? (p?.kg ? <span className="text-[10px]"><i className="fas fa-check mr-1"></i>{String(p.kg).replace('.', ',')}</span> : <i className="fas fa-check"></i>) : `S${si + 1}`}
                                </button>
                              );
                            })}
                            {seg && !completo && (
                              <button onClick={() => iniciarTrabajo(ei)} disabled={rest?.tipo === 'trabajo'} className="h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-orange-200 border border-orange-400/30 bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-40 transition-colors">
                                <i className="fas fa-stopwatch mr-1.5"></i>{fmtDescanso(seg)}
                              </button>
                            )}
                            {!seg && (
                              <button onClick={() => setAnotar(s => { const n = new Set(s); n.has(ei) ? n.delete(ei) : n.add(ei); return n; })} aria-expanded={abierto} className={`h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-colors ${abierto ? 'bg-[#4a90d9] text-black border-[#4a90d9]' : 'text-[#9cc8f5] border-[#4a90d9]/30 hover:bg-[#4a90d9]/10'}`}>
                                <i className="fas fa-pen-to-square mr-1.5"></i>Pesos
                              </button>
                            )}
                            <button onClick={() => verTecnica(ej)} className="h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-red-300 border border-red-400/25 hover:bg-red-500/10 transition-colors">
                              <i className="fab fa-youtube mr-1.5"></i>Técnica
                            </button>
                          </div>
                          {abierto && (
                            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                              <div className="grid grid-cols-[36px_1fr_1fr] gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-white/40 mb-1.5 px-0.5">
                                <span>Serie</span><span>Peso (kg)</span><span>Reps</span>
                              </div>
                              {Array.from({ length: ej.series }, (_, si) => {
                                const k = `${ei}-${si}`;
                                const sug = sugerencia(ei, si);
                                return (
                                  <div key={si} className="grid grid-cols-[36px_1fr_1fr] gap-2 items-center mb-1.5">
                                    <span className={`text-xs font-black ${done.has(k) ? 'text-emerald-400' : 'text-white/60'}`}>S{si + 1}</span>
                                    <input type="number" inputMode="decimal" min={0} step={0.5} value={pesos[k]?.kg ?? ''} placeholder={sug.kg ? String(sug.kg) : '0'}
                                      onChange={ev => setPeso(ei, si, 'kg', ev.target.value === '' ? undefined : Number(ev.target.value))}
                                      className="w-full min-w-0 h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#4a90d9]" aria-label={`Peso serie ${si + 1}`} />
                                    <input type="number" inputMode="numeric" min={0} step={1} value={pesos[k]?.reps ?? ''} placeholder={sug.reps ? String(sug.reps) : ej.reps}
                                      onChange={ev => setPeso(ei, si, 'reps', ev.target.value === '' ? undefined : Number(ev.target.value))}
                                      className="w-full min-w-0 h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#4a90d9]" aria-label={`Repeticiones serie ${si + 1}`} />
                                  </div>
                                );
                              })}
                              <p className="text-[10px] text-white/35 mt-1">Lo gris es lo de tu última vez. Súbele un poco cuando completes todas las reps con buena técnica.</p>
                            </div>
                          )}
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

        {/* Lateral: versiculo, progreso y otras rutinas */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-3xl p-6 border-l-4 border-[#2563a8] bg-white/[0.03]">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-3"><i className="fas fa-bible mr-2"></i>Entrena el espíritu</p>
            <blockquote className="font-serif text-xl md:text-2xl text-white leading-snug">"{parte.versiculo.texto}"</blockquote>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#7eb8f7]">{parte.versiculo.cita}</p>
          </div>
          <ProgresoPanel hist={hist} meta={meta} onMeta={n => { setMeta(n); setMetaState(n); }} />
          {misFavs.length > 0 && (
            <div className="rounded-3xl p-5 border border-rose-400/20 bg-rose-500/[0.04]">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-3"><i className="fas fa-heart text-rose-400 mr-2"></i>Tus favoritas</p>
              <div className="flex flex-col gap-1">
                {misFavs.slice(0, 6).map(r => (
                  <button key={r.id} onClick={() => abrirRutina(r)} className={`flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${rutina?.id === r.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center"><i className={`fas ${data.partes.find(p => p.id === r.parte)?.icono || 'fa-dumbbell'} text-sm`}></i></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{r.titulo}</span>
                      <span className="block text-[10px] text-white/40">{r.lugar === 'casa' ? 'Casa' : 'Gym'} · {r.nivel} · {r.minutos} min</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
              <ul className="flex flex-col gap-2.5">
                {hist.slice(0, 5).map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0">
                      <span className="block text-white/80 truncate">{h.titulo}</span>
                      {(h.minutos || h.volumen) ? <span className="block text-[10px] text-white/35">{h.minutos ? `${h.minutos} min` : ''}{h.minutos && h.volumen ? ' · ' : ''}{h.volumen ? `${h.volumen.toLocaleString('es')} kg` : ''}{h.prs ? ` · 🏅 ${h.prs}` : ''}</span> : null}
                    </span>
                    <span className="text-white/40 whitespace-nowrap">{h.fecha.split('-').reverse().slice(0, 2).join('/')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>

      {/* Cronometro de descanso o de trabajo (fuera del modo entreno) */}
      {rest && !modo && (
        <div role="timer" aria-live="polite" className={`fixed left-3 right-3 bottom-[84px] md:left-auto md:right-6 md:bottom-6 md:w-[360px] z-[9500] rounded-3xl border bg-[#0a1322]/95 backdrop-blur-xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-fade-in-up ${rest.tipo === 'trabajo' ? 'border-orange-400/60' : 'border-[#4a90d9]/50'}`}>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={rest.left <= 0 ? '#10b981' : rest.tipo === 'trabajo' ? '#fb923c' : '#4a90d9'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(rest.left / rest.total) * 100.5} 100.5`} style={{ transition: 'stroke-dasharray 1s linear' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-black text-sm tabular-nums">{rest.left <= 0 ? '¡Ya!' : fmt(rest.left)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${rest.tipo === 'trabajo' ? 'text-orange-300' : 'text-[#7eb8f7]'}`}>{rest.tipo === 'trabajo' ? `¡Dale! Serie ${rest.si + 1}` : rest.left <= 0 ? '¡A darle!' : 'Descansa'}</p>
              <p className="text-sm font-bold text-white truncate">{rest.label}</p>
              <div className="flex gap-2 mt-2">
                {rest.tipo === 'descanso' && <button onClick={() => setRest(r => r ? { ...r, left: r.left + 15, total: r.total + 15 } : r)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-black">+15 s</button>}
                <button onClick={() => setRest(null)} className="px-3 py-1.5 rounded-lg bg-[#4a90d9] text-black text-[10px] font-black uppercase">{rest.tipo === 'trabajo' ? 'Cancelar' : 'Saltar'}</button>
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
            <div className="text-right">
              <p className="text-xs font-black text-white tabular-nums">{done.size}/{totalSets}</p>
              {ses.inicio && !finished && <p className="text-[10px] font-bold text-emerald-300 tabular-nums">{fmt(transcurrido)}</p>}
            </div>
            <button onClick={cambiarVoz} aria-pressed={voz} className={`w-10 h-10 rounded-xl flex items-center justify-center ${voz ? 'bg-[#4a90d9]/20 text-[#9cc8f5]' : 'bg-white/5 text-white/40'}`} aria-label={voz ? 'Apagar guía de voz' : 'Encender guía de voz'}>
              <i className={`fas ${voz ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col items-center text-center max-w-xl mx-auto w-full">
            {finished ? (
              <div className="my-auto w-full">
                <p className="text-6xl mb-4">🏆</p>
                <p className="font-serif italic text-4xl text-white">¡Terminaste!</p>
                <p className="text-sm text-white/60 mt-2">"Todo lo puedo en Cristo que me fortalece." — Filipenses 4:13</p>
                {resumenFinal(true)}
                <p className="text-sm text-orange-300 font-bold mt-4"><i className="fas fa-fire-flame-curved mr-1"></i>{diasRacha} {diasRacha === 1 ? 'día' : 'días'} de racha · {semana}/{meta} esta semana</p>
                <div className="flex gap-2 justify-center mt-6">
                  <button onClick={share} className="px-5 py-3 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-[0.15em]"><i className="fas fa-share-nodes mr-2"></i>Presúmelo</button>
                  <button onClick={() => setModo(false)} className="px-5 py-3 rounded-xl border border-white/15 text-white text-[11px] font-black uppercase tracking-[0.15em]">Cerrar</button>
                </div>
              </div>
            ) : rest ? (
              <div className="my-auto w-full">
                <p className={`text-[11px] font-black uppercase tracking-[0.3em] mb-4 ${rest.tipo === 'trabajo' ? 'text-orange-300' : 'text-[#7eb8f7]'}`}>{rest.tipo === 'trabajo' ? `¡Dale! ${rest.label}` : rest.left <= 0 ? '¡A darle!' : 'Descansa'}</p>
                <div className="relative w-56 h-56 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-56 h-56 -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke={rest.left <= 0 ? '#10b981' : rest.tipo === 'trabajo' ? '#fb923c' : '#4a90d9'} strokeWidth="2" strokeLinecap="round" strokeDasharray={`${(rest.left / rest.total) * 100.5} 100.5`} style={{ transition: 'stroke-dasharray 1s linear' }} />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-white font-black text-6xl tabular-nums ${rest.left <= 3 && rest.left > 0 ? 'animate-pulse' : ''}`}>{rest.left <= 0 ? '¡Ya!' : fmt(rest.left)}</span>
                </div>
                {rest.tipo === 'descanso' ? (
                  <p className="text-sm text-white/50 mt-5">Sigue: <b className="text-white">{ejFocus.nombre}</b> · serie {Math.min(hechosDe(focus) + 1, ejFocus.series)} de {ejFocus.series}</p>
                ) : (
                  <p className="text-sm text-white/50 mt-5">Serie {rest.si + 1} de {ejercicios[rest.ei]?.series}. Al terminar se marca sola.</p>
                )}
                <div className="flex gap-2 justify-center mt-5">
                  {rest.tipo === 'descanso' && <button onClick={() => setRest(r => r ? { ...r, left: r.left + 15, total: r.total + 15 } : r)} className="px-5 py-3 rounded-xl bg-white/10 text-white text-xs font-black">+15 s</button>}
                  <button onClick={() => setRest(null)} className="px-5 py-3 rounded-xl bg-[#4a90d9] text-black text-xs font-black uppercase tracking-[0.1em]">
                    {rest.tipo === 'trabajo' ? <><i className="fas fa-xmark mr-2"></i>Cancelar</> : <><i className="fas fa-forward mr-2"></i>Saltar descanso</>}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Ejercicio {focus + 1} de {ejercicios.length}</p>
                {ejFocus.imagen ? (
                  <img src={ejFocus.imagen} alt={ejFocus.nombre} referrerPolicy="no-referrer" className="mt-4 w-full max-h-[30vh] object-contain rounded-2xl bg-black border border-white/10" />
                ) : tieneFigura(ejFocus.nombre) ? (
                  <FiguraEjercicio nombre={ejFocus.nombre} className="mt-4 w-full max-w-md h-[30vh] max-h-[260px] rounded-2xl bg-[#0a1322] border border-white/10" />
                ) : (
                  <div className="mt-4 w-24 h-24 rounded-3xl bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center text-4xl"><i className={`fas ${parte.icono}`}></i></div>
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
                {/* Peso y reps de la serie que toca */}
                {!segFocus && siFocus !== undefined && sugFocus && (
                  <div className="w-full mt-5">
                    <div className="flex gap-2">
                      {stepper('Peso', sugFocus.kg, 2.5, 'kg', v => setPeso(focus, siFocus, 'kg', v))}
                      {stepper('Reps', sugFocus.reps, 1, '', v => setPeso(focus, siFocus, 'reps', v))}
                    </div>
                    {(previo[focus]?.ultima || (previo[focus]?.record || 0) > 0) && (
                      <p className="text-[11px] text-white/40 mt-2">
                        {previo[focus]?.ultima && <>Última vez: {previo[focus]!.ultima!.sets.filter(x => x.kg || x.reps).map(x => `${x.kg ? `${String(x.kg).replace('.', ',')}kg` : ''}${x.kg && x.reps ? '×' : ''}${x.reps || ''}`).join(' · ')}</>}
                        {(previo[focus]?.record || 0) > 0 && <span className="text-amber-300/80"> · Récord {fmtKg(previo[focus]!.record)}</span>}
                      </p>
                    )}
                  </div>
                )}
                {ejFocus.tip && <p className="text-sm text-white/55 mt-5 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{ejFocus.tip}</p>}
                <button onClick={() => verTecnica(ejFocus)} className="mt-4 text-[11px] font-black uppercase tracking-[0.15em] text-red-300"><i className="fab fa-youtube mr-1.5"></i>Ver técnica</button>
              </>
            )}
          </div>

          {!finished && (
            <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 border-t border-white/5 flex items-center gap-2 max-w-xl mx-auto w-full">
              <button onClick={() => { setRest(null); setFocus(f => Math.max(0, f - 1)); }} disabled={focus === 0} className="w-14 h-14 rounded-2xl bg-white/5 text-white disabled:opacity-30 flex items-center justify-center" aria-label="Ejercicio anterior"><i className="fas fa-chevron-left"></i></button>
              {segFocus && siFocus !== undefined ? (
                <button onClick={() => iniciarTrabajo(focus)} disabled={!!rest} className="flex-1 h-14 rounded-2xl bg-orange-500 text-black text-sm font-black uppercase tracking-[0.15em] disabled:opacity-40 transition-opacity">
                  <i className="fas fa-stopwatch mr-2"></i>Iniciar {fmtDescanso(segFocus)}
                </button>
              ) : (
                <button onClick={serieHecha} disabled={!!rest || siFocus === undefined} className="flex-1 h-14 rounded-2xl bg-emerald-500 text-black text-sm font-black uppercase tracking-[0.15em] disabled:opacity-40 transition-opacity">
                  {siFocus === undefined ? <><i className="fas fa-check mr-2"></i>Ejercicio listo</> : <><i className="fas fa-check mr-2"></i>Serie hecha</>}
                </button>
              )}
              <button onClick={() => { setRest(null); setFocus(f => Math.min(ejercicios.length - 1, f + 1)); }} disabled={focus >= ejercicios.length - 1} className="w-14 h-14 rounded-2xl bg-white/5 text-white disabled:opacity-30 flex items-center justify-center" aria-label="Siguiente ejercicio"><i className="fas fa-chevron-right"></i></button>
            </div>
          )}
        </div>
      )}

      {/* Imagen en grande */}
      {lightbox && (
        <div className="fixed inset-0 z-[9700] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          {lightbox.src ? (
            <img src={lightbox.src} alt={lightbox.alt} referrerPolicy="no-referrer" className="max-w-full max-h-[85vh] rounded-2xl object-contain" />
          ) : (
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0a1322] p-4" onClick={ev => ev.stopPropagation()}>
              <p className="text-white font-bold text-lg px-1 pr-12">{lightbox.alt}</p>
              <FiguraEjercicio nombre={lightbox.alt} className="w-full aspect-[4/3] mt-2" />
              <p className="text-[10px] text-white/40 px-1"><span className="inline-block w-2 h-2 rounded-full bg-[#ff9a3c] mr-1.5"></span>En naranja, lo que trabaja</p>
              {lightbox.tip && <p className="text-sm text-white/70 mt-3 px-1 leading-relaxed"><i className="fas fa-lightbulb text-amber-400/80 mr-1.5"></i>{lightbox.tip}</p>}
            </div>
          )}
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
