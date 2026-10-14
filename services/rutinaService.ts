import { useEffect, useState } from 'react';
import { DEFAULT_RUTINAS, PLANTILLA_VERSION, RutinasData, aplicarPlantilla } from '../data/rutinas';
import { syncFetch } from './adminSync';

// Las rutinas que edita el admin viven en /api/rutinas; si todavia no hay nada guardado
// (o no hay conexion) se usa la plantilla de data/rutinas.ts.
let cache: RutinasData | null = null;
let inFlight: Promise<RutinasData> | null = null;

const isValid = (d: any): d is RutinasData => d && Array.isArray(d.partes) && Array.isArray(d.rutinas) && d.partes.length > 0;

export function fetchRutinas(): Promise<RutinasData> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = fetch('/api/rutinas')
      .then(r => (r.ok ? r.json() : null))
      .then(j => (cache = isValid(j?.data) ? aplicarPlantilla(j.data) : DEFAULT_RUTINAS))
      .catch(() => DEFAULT_RUTINAS)
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

// Arranca con la plantilla (o lo ya cargado) para pintar al instante y luego cambia a lo del admin
export function useRutinas(): RutinasData {
  const [data, setData] = useState<RutinasData>(cache || DEFAULT_RUTINAS);
  useEffect(() => {
    let alive = true;
    fetchRutinas().then(d => { if (alive) setData(d); });
    return () => { alive = false; };
  }, []);
  return data;
}

// ── Admin ──
export async function fetchRutinasAdmin(): Promise<{ data: RutinasData; guardado: boolean; nuevas: number }> {
  const res = await syncFetch(`/api/rutinas?all=1&t=${Date.now()}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Error ${res.status}`);
  const j = await res.json();
  if (!isValid(j?.data)) return { data: DEFAULT_RUTINAS, guardado: false, nuevas: 0 };
  const data = aplicarPlantilla(j.data);
  return { data, guardado: true, nuevas: data.rutinas.length - j.data.rutinas.length };
}

export async function saveRutinas(data: RutinasData): Promise<void> {
  const res = await syncFetch('/api/rutinas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'guardar', data: { ...data, plantilla: PLANTILLA_VERSION } }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Error ${res.status}`);
  cache = data;
}

// Reduce la foto en el navegador (max 1280 px, JPEG) para que suba rapido.
// Los GIF se suben tal cual para no perder la animacion.
const fileToUploadData = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
  reader.onload = () => {
    const src = String(reader.result);
    if (file.type === 'image/gif') {
      if (file.size > 3.5 * 1024 * 1024) return reject(new Error('El GIF pesa más de 3.5 MB'));
      return resolve(src);
    }
    const img = new Image();
    img.onerror = () => reject(new Error('Formato de imagen no válido'));
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
});

export async function uploadRutinaImagen(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen');
  const dataUrl = await fileToUploadData(file);
  const res = await syncFetch('/api/rutinas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'imagen', imageBase64: dataUrl }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.url) throw new Error(j?.error || `Error ${res.status}`);
  return j.url;
}

// ── Historial en este telefono (racha y entrenamientos terminados) ──
const HIST_KEY = 'dg_rutinas_hist';
export interface Entreno {
  id: string;
  titulo: string;
  fecha: string;      // YYYY-MM-DD local
  parte?: string;
  lugar?: string;
  minutos?: number;   // duracion real
  series?: number;
  volumen?: number;   // kg x reps sumados
  prs?: number;       // records personales en esa sesion
  hora?: number;      // hora local en que termino
}

export const hoyLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const leer = <T,>(key: string, fallback: T): T => {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; }
};
const escribir = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
};

export const getHistorial = (): Entreno[] => {
  const l = leer<Entreno[]>(HIST_KEY, []);
  return Array.isArray(l) ? l : [];
};

export const registrarEntreno = (e: Omit<Entreno, 'fecha' | 'hora'>): Entreno[] => {
  const list = [{ ...e, fecha: hoyLocal(), hora: new Date().getHours() }, ...getHistorial()].slice(0, 400);
  escribir(HIST_KEY, list);
  return list;
};

// Dias seguidos entrenando, contando hoy o ayer como ultimo dia
export const racha = (list: Entreno[]): number => {
  const dias = new Set(list.map(e => e.fecha));
  const d = new Date();
  if (!dias.has(hoyLocal(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (dias.has(hoyLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
};

export const mejorRacha = (list: Entreno[]): number => {
  const dias = Array.from(new Set(list.map(e => e.fecha))).sort();
  let mejor = 0, n = 0, prev = '';
  dias.forEach(f => {
    const d = new Date(`${f}T12:00:00`);
    d.setDate(d.getDate() - 1);
    n = prev === hoyLocal(d) ? n + 1 : 1;
    mejor = Math.max(mejor, n);
    prev = f;
  });
  return mejor;
};

export const entrenosEstaSemana = (list: Entreno[]): number => {
  const d = new Date();
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const desde = hoyLocal(lunes);
  return new Set(list.filter(e => e.fecha >= desde).map(e => e.fecha)).size;
};

// ── Meta semanal (dias a entrenar por semana) ──
const META_KEY = 'dg_rutinas_meta';
export const getMeta = (): number => { const n = Number(leer(META_KEY, 4)); return n >= 1 && n <= 7 ? n : 4; };
export const setMeta = (n: number) => escribir(META_KEY, n);

// ── Favoritas ──
const FAVS_KEY = 'dg_rutinas_favs';
export const getFavoritas = (): string[] => { const l = leer<string[]>(FAVS_KEY, []); return Array.isArray(l) ? l : []; };
export const toggleFavorita = (id: string): string[] => {
  const l = getFavoritas();
  const next = l.includes(id) ? l.filter(x => x !== id) : [id, ...l];
  escribir(FAVS_KEY, next);
  return next;
};

// ── Pesos y repeticiones por ejercicio (sobrecarga progresiva) ──
export interface SerieLog { kg?: number; reps?: number }
interface SesionEj { fecha: string; sets: SerieLog[] }
const LOG_KEY = 'dg_rutinas_log';
const claveEj = (nombre: string) => nombre.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

const getLog = (): Record<string, SesionEj[]> => {
  const l = leer<Record<string, SesionEj[]>>(LOG_KEY, {});
  return l && typeof l === 'object' && !Array.isArray(l) ? l : {};
};

// La ultima sesion anterior a hoy en la que se anoto algo de este ejercicio
export const ultimaVez = (nombre: string): SesionEj | null => {
  const hoy = hoyLocal();
  return (getLog()[claveEj(nombre)] || []).find(s => s.fecha !== hoy && s.sets.some(x => x.kg || x.reps)) || null;
};

export const mejorKg = (nombre: string): number =>
  (getLog()[claveEj(nombre)] || []).filter(s => s.fecha !== hoyLocal()).reduce((m, s) => Math.max(m, ...s.sets.map(x => x.kg || 0)), 0);

export const guardarSeries = (nombre: string, sets: SerieLog[]) => {
  if (!sets.some(x => x.kg || x.reps)) return;
  const log = getLog();
  const k = claveEj(nombre);
  const hoy = hoyLocal();
  log[k] = [{ fecha: hoy, sets }, ...(log[k] || []).filter(s => s.fecha !== hoy)].slice(0, 30);
  escribir(LOG_KEY, log);
};

// ── Entreno en curso: si se cierra la pagina se retoma donde iba (solo el mismo dia) ──
const SESION_KEY = 'dg_rutinas_sesion';
export interface SesionEnCurso {
  rutinaId: string;
  fecha: string;
  done: string[];
  warmDone: number[];
  pesos: Record<string, SerieLog>;
  inicio: number | null;
}
export const getSesion = (rutinaId: string): SesionEnCurso | null => {
  const s = leer<SesionEnCurso | null>(SESION_KEY, null);
  return s && s.rutinaId === rutinaId && s.fecha === hoyLocal() ? s : null;
};
export const guardarSesion = (s: SesionEnCurso) => escribir(SESION_KEY, s);
export const borrarSesion = () => { try { localStorage.removeItem(SESION_KEY); } catch { /* nada */ } };

// ── Medallas ──
export interface Logro { id: string; nombre: string; icono: string; desc: string; ok: boolean }
export const logros = (list: Entreno[]): Logro[] => {
  const total = list.length;
  const mr = mejorRacha(list);
  const partes = new Set(list.map(e => e.parte).filter(Boolean));
  const lugares = new Set(list.map(e => e.lugar).filter(Boolean));
  const prs = list.reduce((a, e) => a + (e.prs || 0), 0);
  return [
    { id: 'primer', nombre: 'Primer paso', icono: 'fa-person-walking', desc: 'Termina tu primera rutina', ok: total >= 1 },
    { id: 'fiel', nombre: 'Fiel en lo poco', icono: 'fa-gem', desc: '5 rutinas terminadas (Lucas 16:10)', ok: total >= 5 },
    { id: 'racha3', nombre: 'Constante', icono: 'fa-fire', desc: 'Racha de 3 días', ok: mr >= 3 },
    { id: 'racha7', nombre: 'Siete días', icono: 'fa-fire-flame-curved', desc: 'Racha de 7 días', ok: mr >= 7 },
    { id: 'record', nombre: 'Nuevo récord', icono: 'fa-star', desc: 'Supera tu mejor peso en un ejercicio', ok: prs >= 1 },
    { id: 'completo', nombre: 'Templo completo', icono: 'fa-person-running', desc: 'Entrena 5 partes distintas', ok: partes.size >= 5 },
    { id: 'ambos', nombre: 'Casa y gym', icono: 'fa-house', desc: 'Entrena en casa y en el gym', ok: lugares.size >= 2 },
    { id: 'madrugador', nombre: 'Madrugador', icono: 'fa-sun', desc: 'Termina un entreno antes de las 8 am', ok: list.some(e => e.hora !== undefined && e.hora < 8) },
    { id: 'guerrero', nombre: 'Guerrero', icono: 'fa-shield-halved', desc: '25 rutinas terminadas', ok: total >= 25 },
    { id: 'cien', nombre: 'Centurión', icono: 'fa-crown', desc: '100 rutinas terminadas', ok: total >= 100 },
  ];
};

// Ejercicios por tiempo: "30 s", "45 s por lado", "30-45 s", "5 min" -> segundos
export const segundosDeReps = (reps: string): number | null => {
  const m = reps.match(/(\d+)(?:\s*-\s*(\d+))?\s*(s|seg|min)\b/i);
  if (!m) return null;
  const n = Number(m[2] || m[1]);
  return /min/i.test(m[3]) ? n * 60 : n;
};

// YouTube: acepta enlaces watch, youtu.be y shorts
export const youtubeId = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};
