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
export interface Entreno { id: string; titulo: string; fecha: string } // fecha YYYY-MM-DD local

const hoyLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getHistorial = (): Entreno[] => {
  try { const l = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
};

export const registrarEntreno = (id: string, titulo: string): Entreno[] => {
  const list = [{ id, titulo, fecha: hoyLocal() }, ...getHistorial()].slice(0, 400);
  try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ }
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

export const entrenosEstaSemana = (list: Entreno[]): number => {
  const d = new Date();
  const lunes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const desde = hoyLocal(lunes);
  return new Set(list.filter(e => e.fecha >= desde).map(e => e.fecha)).size;
};

// YouTube: acepta enlaces watch, youtu.be y shorts
export const youtubeId = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};
