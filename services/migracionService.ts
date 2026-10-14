import { MusicItem } from '../types';
import { syncFetch } from './adminSync';

// Migracion del catalogo a TooLost. Los videos "Topic" de YouTube Music traen en la descripcion
// el disco al que pertenece cada cancion, el sello y la fecha original:
//   Provided to YouTube by DistroKid / Titulo · Artista · ... / Nombre del disco / ℗ Sello / Released on: AAAA-MM-DD
// Con eso se arman los discos tal como salieron, para volver a subirlos igual en TooLost.

export type Estado = 'pendiente' | 'preparando' | 'subido' | 'publicado' | 'omitir';
export const ESTADOS: { id: Estado; label: string; color: string }[] = [
  { id: 'pendiente', label: 'Pendiente', color: 'text-white/60 bg-white/5 border-white/15' },
  { id: 'preparando', label: 'Preparando', color: 'text-amber-300 bg-amber-500/10 border-amber-400/30' },
  { id: 'subido', label: 'Subido a TooLost', color: 'text-sky-300 bg-sky-500/10 border-sky-400/30' },
  { id: 'publicado', label: 'Ya publicado', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' },
  { id: 'omitir', label: 'No subir', color: 'text-red-300 bg-red-500/10 border-red-400/30' },
];

export const GENEROS = [
  'Cristiana / Gospel', 'Hip-Hop / Rap', 'Latina - Urbano', 'Latina - Regional Mexicano', 'Latina - Pop',
  'Pop', 'Rock', 'Inspiracional', 'Reggaetón', 'R&B / Soul', 'Electrónica', 'Acústica', 'Hablado / Spoken word',
];

export interface Meta { album: string; linea: string; sello?: string; fecha?: string; dist: string }
export interface Pista { id: string; titulo: string; creditos: string; url: string; portada: string; letra?: string; otrosDiscos: string[] }
export interface Disco {
  key: string; artista: string; nombre: string; fecha: string; sello: string; distribuidor: string;
  tipo: 'Sencillo' | 'EP' | 'Álbum' | 'Sin disco'; portada: string; pistas: Pista[];
  generoSugerido: string; genero2Sugerido: string;
}
export interface DatosDisco { estado: Estado; genero?: string; genero2?: string; nota?: string; upc?: string; fecha?: number }
export interface EstadoMigracion { discos: Record<string, DatosDisco>; pistas: Record<string, boolean>; updatedAt?: number }

const youtubeId = (url: string) => url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1] || null;

export const leerDescripcion = (d: string): Meta | null => {
  const m = d.match(/Provided to YouTube by ([^\n]+)\n\n([^\n]+)\n\n([^\n]+)\n\n(?:℗ ([^\n]+)\n\n)?(?:[\s\S]*?Released on: (\d{4}-\d{2}-\d{2}))?/);
  if (!m) return null;
  return { dist: m[1].trim(), linea: m[2].trim(), album: m[3].trim(), sello: m[4]?.trim(), fecha: m[5] };
};

// ── Metadatos de YouTube (se guardan 7 dias en este navegador para no gastar cuota) ──
const META_KEY = 'migracion_meta_v1';
const META_TTL = 7 * 86400000;
type MetaCache = { at: number; data: Record<string, Meta | 0> };

const leerCache = (): MetaCache => {
  try {
    const c = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    if (c && Date.now() - c.at < META_TTL && c.data) return c;
  } catch { /* nada */ }
  return { at: Date.now(), data: {} };
};

export async function cargarMetadatos(ids: string[], forzar = false, onProgreso?: (hechos: number, total: number) => void): Promise<Record<string, Meta | 0>> {
  const cache = forzar ? { at: Date.now(), data: {} as Record<string, Meta | 0> } : leerCache();
  const faltan = ids.filter(id => !(id in cache.data));
  for (let i = 0; i < faltan.length; i += 200) {
    const lote = faltan.slice(i, i + 200);
    const res = await syncFetch(`/api/common?action=youtube-descriptions&ids=${lote.join(',')}`);
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Sesión de admin vencida: vuelve a entrar al panel');
    if (!j?.success) throw new Error(j?.message || `No se pudieron leer los datos de YouTube (${res.status})`);
    lote.forEach(id => { const d = j.descriptions?.[id]; cache.data[id] = d ? leerDescripcion(d.description || '') || 0 : 0; });
    onProgreso?.(Math.min(i + 200, faltan.length), faltan.length);
  }
  try { localStorage.setItem(META_KEY, JSON.stringify(cache)); } catch { /* sin espacio */ }
  return cache.data;
}

// ── Genero sugerido segun los titulos ──
const sugerirGenero = (texto: string, artista: string): [string, string] => {
  const t = texto.toLowerCase();
  if (/corrido|tumbado|b[eé]lico|norte[nñ]|sierre[nñ]|banda|tololoche/.test(t)) return ['Latina - Regional Mexicano', 'Cristiana / Gospel'];
  if (/reggaet|perreo|dembow|urbano/.test(t)) return ['Latina - Urbano', 'Cristiana / Gospel'];
  if (/\brap\b|trap|freestyle|tiraera|cypher|drill|boom ?bap|hip ?hop|barras/.test(t)) return ['Hip-Hop / Rap', 'Cristiana / Gospel'];
  if (/ac[uú]stic|piano|balada|alabanza|adoraci[oó]n/.test(t)) return ['Cristiana / Gospel', 'Latina - Pop'];
  return artista.toLowerCase().includes('juan') ? ['Cristiana / Gospel', 'Latina - Regional Mexicano'] : ['Cristiana / Gospel', 'Hip-Hop / Rap'];
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function armarDiscos(canciones: MusicItem[], meta: Record<string, Meta | 0>, letras: Map<string, string>): Disco[] {
  const discos = new Map<string, Disco>();
  const vistos = new Set<string>();
  // El catalogo viene del mas nuevo al mas viejo; se recorre al reves para respetar el orden de la hoja
  [...canciones].reverse().forEach(c => {
    const id = youtubeId(c.url || '') || c.id;
    if (!id || vistos.has(id)) return;
    vistos.add(id);
    const m = meta[id] || null;
    const artista = c.artist || 'Diosmasgym';
    const nombre = m ? m.album : 'Solo en YouTube (sin disco)';
    const fecha = m?.fecha || (c.date || '').slice(0, 10);
    const key = m ? `${artista}|${m.album}|${m.fecha || ''}` : `${artista}|__sin_disco__`;
    if (!discos.has(key)) {
      discos.set(key, {
        key, artista, nombre, fecha, sello: m?.sello || '', distribuidor: m?.dist || '',
        tipo: 'Sin disco', portada: c.cover || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, pistas: [],
        generoSugerido: '', genero2Sugerido: '',
      });
    }
    const letra = (c.lyrics && c.lyrics.trim().length > 50 ? c.lyrics : letras.get(norm(c.name))) || undefined;
    // "Titulo · Artista · Otro" -> "Artista · Otro"
    const creditos = m ? m.linea.split(' · ').slice(1).join(' · ') : '';
    discos.get(key)!.pistas.push({ id, titulo: c.name, creditos: creditos || artista, url: c.url, portada: c.cover, letra, otrosDiscos: [] });
  });

  // Canciones que salieron en mas de un disco (sencillo y luego dentro de un album)
  const porTitulo = new Map<string, Disco[]>();
  discos.forEach(d => { if (d.tipo === 'Sin disco' && !d.distribuidor) return; d.pistas.forEach(p => { const k = `${d.artista}|${norm(p.titulo)}`; porTitulo.set(k, [...(porTitulo.get(k) || []), d]); }); });

  return Array.from(discos.values()).map(d => {
    const n = d.pistas.length;
    if (d.distribuidor) d.tipo = n === 1 ? 'Sencillo' : n <= 6 ? 'EP' : 'Álbum';
    d.pistas.forEach(p => {
      p.otrosDiscos = (porTitulo.get(`${d.artista}|${norm(p.titulo)}`) || []).filter(o => o.key !== d.key).map(o => o.nombre);
    });
    [d.generoSugerido, d.genero2Sugerido] = sugerirGenero(`${d.nombre} ${d.pistas.map(p => p.titulo).join(' ')}`, d.artista);
    return d;
  });
}

// ── Avance guardado en el servidor (con copia local por si no hay conexion) ──
const LOCAL_KEY = 'migracion_estado_v1';
const vacio = (): EstadoMigracion => ({ discos: {}, pistas: {} });

export async function cargarEstado(): Promise<EstadoMigracion> {
  let local: EstadoMigracion = vacio();
  try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null') || vacio(); } catch { /* nada */ }
  try {
    const res = await syncFetch(`/api/common?action=migracion&t=${Date.now()}`);
    const j = await res.json();
    const srv: EstadoMigracion | null = j?.data && typeof j.data === 'object' ? j.data : null;
    // Gana la copia mas reciente
    if (srv && (srv.updatedAt || 0) >= (local.updatedAt || 0)) return { discos: srv.discos || {}, pistas: srv.pistas || {}, updatedAt: srv.updatedAt };
  } catch { /* sin servidor: usar la local */ }
  return local;
}

export async function guardarEstado(e: EstadoMigracion): Promise<boolean> {
  const conFecha = { ...e, updatedAt: Date.now() };
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(conFecha)); } catch { /* sin espacio */ }
  try {
    const res = await syncFetch('/api/common?action=migracion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: conFecha }),
    });
    return res.ok;
  } catch { return false; }
}

// Ficha de texto para llenar el formulario de TooLost
export const fichaDisco = (d: Disco, datos: DatosDisco | undefined): string => [
  `Lanzamiento: ${d.nombre} (${d.tipo})`,
  `Artista principal: ${d.artista}`,
  `Género principal: ${datos?.genero || d.generoSugerido}`,
  `Género secundario: ${datos?.genero2 || d.genero2Sugerido}`,
  `Fecha de lanzamiento original: ${d.fecha || '—'}`,
  d.sello ? `Sello (℗): ${d.sello}` : '',
  datos?.upc ? `UPC anterior: ${datos.upc}` : '',
  '',
  'Pistas:',
  ...d.pistas.map((p, i) => `${i + 1}. ${p.titulo}${p.creditos && p.creditos !== d.artista ? `  (${p.creditos})` : ''}`),
].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

export const exportarCSV = (discos: Disco[], estado: EstadoMigracion): string => {
  const q = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Artista', 'Disco', 'Tipo', 'Fecha original', 'Sello', 'Pista', 'Título', 'Créditos', 'Género', 'Género 2', 'Estado', 'Pista subida', 'Tiene letra', 'YouTube']];
  discos.forEach(d => {
    const dd = estado.discos[d.key];
    d.pistas.forEach((p, i) => filas.push([
      d.artista, d.nombre, d.tipo, d.fecha, d.sello, String(i + 1), p.titulo, p.creditos,
      dd?.genero || d.generoSugerido, dd?.genero2 || d.genero2Sugerido, dd?.estado || 'pendiente',
      estado.pistas[p.id] ? 'sí' : 'no', p.letra ? 'sí' : 'no', p.url,
    ]));
  });
  return '﻿' + filas.map(f => f.map(q).join(',')).join('\n');
};
