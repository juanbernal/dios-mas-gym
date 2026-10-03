import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog, deduplicateCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getHighResUrl } from "../../services/imageHelpers";

// ── Anuncio Studio: imagen tipo "anuncio corporativo" ─────────────────────────
// Logo arriba, titular gigante, subtítulo, fila de 3 beneficios con iconos,
// foto grande abajo con una curva blanca y la página web en la esquina.

type FormatKey = 'post' | 'square' | 'story';
const FORMATS: Record<FormatKey, { label: string; hint: string; w: number; h: number }> = {
  post: { label: 'Post', hint: '4:5 · Instagram / Facebook', w: 1080, h: 1350 },
  square: { label: 'Cuadrado', hint: '1:1 · WhatsApp / X', w: 1080, h: 1080 },
  story: { label: 'Historia', hint: '9:16 · Stories / TikTok', w: 1080, h: 1920 },
};
type ThemeKey = 'auto' | 'light' | 'dark';
type FitKey = 'auto' | 'fill' | 'fit';
type LogoKey = 'dmg' | 'juan' | 'none';
const ACCENTS = [
  { key: 'auto', label: 'Color de la foto', color: '' },
  { key: 'orange', label: 'Naranja', color: '#f26a1b' },
  { key: 'gold', label: 'Dorado', color: '#c5a059' },
  { key: 'blue', label: 'Azul', color: '#2f6fd1' },
  { key: 'red', label: 'Rojo', color: '#d0202e' },
];
// Iconos disponibles (salen del subconjunto local de Font Awesome del sitio)
const ICONS = ['music', 'headphones', 'microphone', 'fire', 'bolt', 'cross', 'bible', 'hands-praying', 'dumbbell', 'heart', 'star', 'crown', 'play', 'globe', 'map-marker-alt', 'calendar', 'compact-disc', 'spotify', 'youtube', 'users'];

interface Feature { icon: string; text: string }
interface Content {
  headline: string;
  subheadline: string;
  features: Feature[];
  website: string;
}
const TEMPLATES: { key: string; label: string; content: Content }[] = [
  {
    key: 'estreno', label: 'Nuevo estreno', content: {
      headline: 'YA DISPONIBLE',
      subheadline: 'Música con propósito para tu entreno y tu fe',
      features: [{ icon: 'spotify', text: 'Spotify' }, { icon: 'youtube', text: 'YouTube' }, { icon: 'music', text: 'Todas las plataformas' }],
      website: 'diosmasgym.com',
    },
  },
  {
    key: 'catalogo', label: 'Catálogo', content: {
      headline: 'MÁS DE 100 CANCIONES',
      subheadline: 'Corridos y rap cristiano para levantar tu fe',
      features: [{ icon: 'cross', text: 'Mensaje de fe' }, { icon: 'dumbbell', text: 'Para tu entreno' }, { icon: 'headphones', text: 'Gratis en la web' }],
      website: 'diosmasgym.com',
    },
  },
  {
    key: 'evento', label: 'Evento', content: {
      headline: 'EN VIVO',
      subheadline: 'Te esperamos para alabar juntos',
      features: [{ icon: 'map-marker-alt', text: 'Chihuahua' }, { icon: 'calendar', text: 'Sábado 8 PM' }, { icon: 'microphone', text: 'Entrada libre' }],
      website: 'diosmasgym.com',
    },
  },
];
const PREFS_KEY = 'dmg_anuncio_prefs';

// ── Utilidades ───────────────────────────────────────────────────────────────
const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) { reject(new Error("no src")); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load error"));
    img.src = src;
  });
}

async function proxiedDataUrl(src: string): Promise<string> {
  const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(src))}`);
  if (!res.ok) throw new Error("proxy " + res.status);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Los logos traen mucho margen transparente: se recortan al contenido real
function trimTransparent(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return c;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// Toma el SVG del icono desde la hoja fa-icons.css y lo pinta del color pedido
async function loadIcon(name: string, color: string): Promise<HTMLImageElement | null> {
  const el = document.createElement('i');
  el.className = `fas fa-${name}`;
  el.style.position = 'absolute'; el.style.left = '-9999px';
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const mask = cs.getPropertyValue('mask-image') || cs.getPropertyValue('-webkit-mask-image');
  document.body.removeChild(el);
  const m = mask.match(/url\(["']?(data:image\/svg\+xml,[^"')]+)["']?\)/);
  if (!m) return null;
  const svg = decodeURIComponent(m[1].replace('data:image/svg+xml,', '')).replace(/<path/g, `<path fill="${color}"`);
  try { return await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); } catch { return null; }
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; }
  else { sh = img.width / r; sy = (img.height - sh) * focusY; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Muchas portadas llegan con franjas lisas a los lados (ej. miniaturas 16:9 con relleno café):
// se recortan las filas/columnas de color parejo para quedarnos solo con el arte.
function trimSolidBorders(img: HTMLImageElement): HTMLCanvasElement {
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  // ¿La línea (fila o columna) es casi de un solo color?
  const flat = (get: (i: number) => number, len: number) => {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < len; i++) { const p = get(i); r += data[p]; g += data[p + 1]; b += data[p + 2]; }
    r /= len; g /= len; b /= len;
    let dev = 0;
    for (let i = 0; i < len; i++) { const p = get(i); dev += Math.abs(data[p] - r) + Math.abs(data[p + 1] - g) + Math.abs(data[p + 2] - b); }
    return dev / len < 24;
  };
  const col = (x: number) => flat(i => (i * width + x) * 4, height);
  const row = (y: number) => flat(i => (y * width + i) * 4, width);
  let x0 = 0, x1 = width - 1, y0 = 0, y1 = height - 1;
  while (x0 < width * 0.4 && col(x0)) x0++;
  while (x1 > width * 0.6 && col(x1)) x1--;
  while (y0 < height * 0.4 && row(y0)) y0++;
  while (y1 > height * 0.6 && row(y1)) y1--;
  if (x0 === 0 && y0 === 0 && x1 === width - 1 && y1 === height - 1) return c;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

type HSL = [number, number, number];
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

interface PhotoColors { base: HSL; vivid: HSL | null; lum: number }
// Saca el tono que más domina la foto y su color más vivo
function extractColors(src: HTMLCanvasElement): PhotoColors {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0, 48, 48);
  const { data } = ctx.getImageData(0, 0, 48, 48);
  const bins = Array.from({ length: 12 }, () => ({ n: 0, w: 0, h: 0, s: 0, l: 0 }));
  let lum = 0, count = 0;
  for (let p = 0; p < data.length; p += 4) {
    const [h, s, l] = rgbToHsl(data[p], data[p + 1], data[p + 2]);
    lum += l; count++;
    if (s < 0.2 || l < 0.12 || l > 0.9) continue;
    const b = bins[Math.floor(h / 30) % 12];
    const w = s * (1 - Math.abs(l - 0.5));
    b.n++; b.w += w; b.h += h; b.s += s; b.l += l;
  }
  const avg = (b: typeof bins[0]): HSL => [b.h / b.n, b.s / b.n, b.l / b.n];
  const byCount = [...bins].sort((a, b) => b.n - a.n)[0];
  const byVivid = [...bins].sort((a, b) => b.w - a.w)[0];
  return {
    base: byCount.n > 0 ? avg(byCount) : [0, 0, 0.5],
    vivid: byVivid.n > 0 ? avg(byVivid) : null,
    lum: lum / count,
  };
}

interface Palette { bg: string; bgClear: string; head: string; text: string; ribbonA: string; ribbonB: string; silk: string; empty: string; vivid: string | null }
function buildPalette(theme: ThemeKey, colors: PhotoColors | null): Palette {
  const vivid = colors?.vivid ? hsl(colors.vivid[0], Math.max(colors.vivid[1], 0.65), Math.min(Math.max(colors.vivid[2], 0.48), 0.6)) : null;
  const mode = theme === 'auto' ? (colors && colors.lum > 0.62 ? 'autoLight' : 'autoDark') : theme;
  if (mode === 'light') return { bg: '#ffffff', bgClear: 'rgba(255,255,255,0)', head: '#5b5b5b', text: '#111111', ribbonA: '#f2f2f2', ribbonB: '#e9e9e9', silk: 'rgba(0,0,0,0.07)', empty: '#d0d0d0', vivid };
  if (mode === 'dark' || !colors) return { bg: '#0b0b0d', bgClear: 'rgba(11,11,13,0)', head: '#d9d9d9', text: '#ffffff', ribbonA: '#16161a', ribbonB: '#0f0f12', silk: 'rgba(255,255,255,0.07)', empty: '#1f1f25', vivid };
  const [h, s0] = colors.base;
  const s = Math.min(s0, 0.55);
  if (mode === 'autoLight') {
    return { bg: hsl(h, s, 0.95), bgClear: hsl(h, s, 0.95, 0), head: hsl(h, s * 0.6, 0.33), text: hsl(h, s * 0.5, 0.1), ribbonA: hsl(h, s, 0.92), ribbonB: hsl(h, s, 0.88), silk: hsl(h, s, 0.5, 0.12), empty: hsl(h, s, 0.8), vivid };
  }
  // En oscuro, poca saturación: un naranja muy oscuro se vería café
  const ds = Math.min(s, 0.3);
  return { bg: hsl(h, ds, 0.08), bgClear: hsl(h, ds, 0.08, 0), head: hsl(h, ds * 0.5, 0.88), text: '#ffffff', ribbonA: hsl(h, ds, 0.13), ribbonB: hsl(h, ds, 0.06), silk: hsl(h, s, 0.6, 0.16), empty: hsl(h, ds, 0.18), vivid };
}

// Ajusta el tamaño de letra para que el texto quepa en el ancho
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, maxSize: number, maxWidth: number, minSize = 20): number {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

// Parte el titular en 1 o 2 líneas cuando es muy largo
function splitHeadline(ctx: CanvasRenderingContext2D, text: string, maxSize: number, maxWidth: number): string[] {
  ctx.font = `900 ${maxSize}px Montserrat`;
  if (ctx.measureText(text).width <= maxWidth * 1.25) return [text];
  const words = text.split(/\s+/);
  if (words.length < 2) return [text];
  let best = [text], bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}

interface RenderOptions {
  format: FormatKey;
  palette: Palette;
  accent: string;
  logo: HTMLCanvasElement | null;
  photo: HTMLCanvasElement | null;
  photoFocus: number;
  fit: FitKey;
  content: Content;
  icons: Record<string, HTMLImageElement | null>;
  globeIcon: HTMLImageElement | null;
}

// ── Un solo dibujo para la vista previa y la descarga ─────────────────────────
function renderAnuncio(canvas: HTMLCanvasElement, o: RenderOptions) {
  const { w: W, h: H } = FORMATS[o.format];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const pal = o.palette;
  const bg = pal.bg;
  const headColor = pal.head;
  const textColor = pal.text;
  const k = H / 1350; // escala vertical respecto al post 4:5

  // Fondo con un brillo suave tipo seda
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const silk = ctx.createRadialGradient(W * 0.92, H * 0.04, 0, W * 0.92, H * 0.04, W * 0.7);
  silk.addColorStop(0, pal.silk);
  silk.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = silk;
  ctx.fillRect(0, 0, W, H);

  const margin = 70;
  const maxW = W - margin * 2;
  let y = 50 * k;

  // Logo
  if (o.logo) {
    const lh = (o.format === 'square' ? 140 : 185) * k;
    const lw = Math.min(lh * (o.logo.width / o.logo.height), maxW * 0.6);
    const realH = lw / (o.logo.width / o.logo.height);
    ctx.drawImage(o.logo, (W - lw) / 2, y, lw, realH);
    y += realH + 24 * k;
  } else {
    y += 30 * k;
  }

  // Titular gigante (1 o 2 líneas), ajustado al ancho
  const headline = (o.content.headline || '').trim().toUpperCase();
  const headMax = (o.format === 'story' ? 150 : 132) * Math.min(k, 1.15);
  if (headline) {
    const lines = splitHeadline(ctx, headline, headMax, maxW);
    let size = headMax;
    for (const line of lines) size = Math.min(size, fitFont(ctx, line, 900, 'Montserrat', headMax, maxW));
    ctx.font = `900 ${size}px Montserrat`;
    ctx.fillStyle = headColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const line of lines) {
      y += size * 0.86;
      // letras apretadas como en el ejemplo
      try { (ctx as any).letterSpacing = `${-size * 0.045}px`; } catch {}
      ctx.fillText(line, W / 2, y);
      y += size * 0.06;
    }
    try { (ctx as any).letterSpacing = '0px'; } catch {}
  }

  // Subtítulo
  const sub = (o.content.subheadline || '').trim();
  if (sub) {
    y += 14 * k;
    const s = fitFont(ctx, sub, 800, 'Montserrat', 46 * Math.min(k, 1.1), maxW, 18);
    try { (ctx as any).letterSpacing = `${-s * 0.03}px`; } catch {}
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    y += s * 0.9;
    ctx.fillText(sub, W / 2, y);
    try { (ctx as any).letterSpacing = '0px'; } catch {}
    y += s * 0.35;
  }

  // Fila de beneficios: icono de color + texto
  const feats = o.content.features.filter(f => f.text.trim());
  if (feats.length) {
    y += 30 * k;
    let fs = 30 * Math.min(k, 1.1);
    const iconGap = 10, itemGap = 34;
    const measure = () => {
      ctx.font = `700 ${fs}px Poppins`;
      return feats.reduce((acc, f) => acc + fs * 1.15 + iconGap + ctx.measureText(f.text.trim()).width, 0) + itemGap * (feats.length - 1);
    };
    while (measure() > maxW && fs > 14) fs -= 1;
    const total = measure();
    let x = (W - total) / 2;
    const cy = y + fs * 0.5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const f of feats) {
      const ic = o.icons[f.icon];
      const is = fs * 1.15;
      if (ic) ctx.drawImage(ic, x, cy - is / 2, is, is);
      x += is + iconGap;
      ctx.fillStyle = textColor;
      ctx.fillText(f.text.trim(), x, cy + fs * 0.05);
      x += ctx.measureText(f.text.trim()).width + itemGap;
    }
    ctx.textBaseline = 'alphabetic';
    y += fs + 26 * k;
  }

  // Foto grande abajo
  const photoTop = Math.min(y + 10 * k, H * 0.62);
  const photoH = H - photoTop;
  if (o.photo) {
    const regionRatio = W / photoH;
    const imgRatio = o.photo.width / o.photo.height;
    // "Completa": si la foto es mucho más angosta que el espacio, se muestra entera
    // sobre una versión difuminada de sí misma (así no se corta el título de la portada)
    const showWhole = o.fit === 'fit' || (o.fit === 'auto' && imgRatio < regionRatio * 0.8);
    if (showWhole) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, photoTop, W, photoH); ctx.clip();
      ctx.filter = 'blur(40px) brightness(0.75) saturate(1.2)';
      drawCover(ctx, o.photo, -60, photoTop - 60, W + 120, photoH + 120);
      ctx.filter = 'none';
      const ih = photoH * 0.94;
      const iw = Math.min(ih * imgRatio, W * 0.92);
      const realH = iw / imgRatio;
      const ix = (W - iw) / 2, iy = photoTop + (photoH - realH) / 2 + photoH * 0.02;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 50;
      ctx.drawImage(o.photo, ix, iy, iw, realH);
      ctx.restore();
    } else {
      drawCover(ctx, o.photo, 0, photoTop, W, photoH, o.photoFocus);
    }
  } else {
    ctx.fillStyle = pal.empty;
    ctx.fillRect(0, photoTop, W, photoH);
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.4;
    ctx.font = `700 34px Poppins`;
    ctx.textAlign = 'center';
    ctx.fillText('Sube una foto o elige una portada', W / 2, photoTop + photoH / 2);
    ctx.globalAlpha = 1;
  }

  // Desvanecido del fondo hacia la foto (como el horizonte del ejemplo)
  const fadeH = 70 * k;
  const fade = ctx.createLinearGradient(0, photoTop, 0, photoTop + fadeH);
  fade.addColorStop(0, bg);
  fade.addColorStop(1, pal.bgClear);
  ctx.fillStyle = fade;
  ctx.fillRect(0, photoTop - 1, W, fadeH + 1);

  // Curva tipo listón en la esquina inferior izquierda
  const waveTop = H - photoH * 0.36;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = -6;
  ctx.beginPath();
  ctx.moveTo(0, waveTop);
  ctx.bezierCurveTo(W * 0.18, waveTop - photoH * 0.06, W * 0.38, H - photoH * 0.12, W * 0.74, H + 4);
  ctx.lineTo(0, H + 4);
  ctx.closePath();
  const ribbon = ctx.createLinearGradient(0, waveTop, W * 0.5, H);
  ribbon.addColorStop(0, pal.ribbonA);
  ribbon.addColorStop(0.5, bg);
  ribbon.addColorStop(1, pal.ribbonB);
  ctx.fillStyle = ribbon;
  ctx.fill();
  ctx.restore();
  // Filo de color sobre la curva
  ctx.beginPath();
  ctx.moveTo(0, waveTop);
  ctx.bezierCurveTo(W * 0.18, waveTop - photoH * 0.06, W * 0.38, H - photoH * 0.12, W * 0.74, H + 4);
  ctx.strokeStyle = o.accent;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Página web
  const site = (o.content.website || '').trim();
  if (site) {
    const fs = 38 * Math.min(k, 1.1);
    ctx.font = `800 ${fs}px Montserrat`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const sy = H - 70 * k;
    let sx = 66;
    if (o.globeIcon) { ctx.drawImage(o.globeIcon, sx, sy - fs * 0.5, fs, fs); sx += fs + 12; }
    ctx.fillStyle = textColor;
    ctx.fillText(site, sx, sy);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Componente ───────────────────────────────────────────────────────────────
const AnuncioStudio: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prefs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
  }, []);

  const [format, setFormat] = useState<FormatKey>(prefs.format in FORMATS ? prefs.format : 'post');
  const [theme, setTheme] = useState<ThemeKey>(['auto', 'light', 'dark'].includes(prefs.theme) ? prefs.theme : 'auto');
  const [accentKey, setAccentKey] = useState<string>(ACCENTS.some(a => a.key === prefs.accent) ? prefs.accent : 'auto');
  const [logoKey, setLogoKey] = useState<LogoKey>(['dmg', 'juan', 'none'].includes(prefs.logo) ? prefs.logo : 'dmg');
  const [content, setContent] = useState<Content>(prefs.content?.features?.length === 3 ? prefs.content : TEMPLATES[1].content);
  const [photo, setPhotoState] = useState<HTMLCanvasElement | null>(null);
  const [photoColors, setPhotoColors] = useState<PhotoColors | null>(null);
  const [photoFocus, setPhotoFocus] = useState(0.5);
  const [fit, setFit] = useState<FitKey>('auto');
  const [logos, setLogos] = useState<{ dmg: HTMLCanvasElement | null; juan: HTMLCanvasElement | null }>({ dmg: null, juan: null });
  const [icons, setIcons] = useState<Record<string, HTMLImageElement | null>>({});
  const [globeIcon, setGlobeIcon] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Colores del fondo y acento: fijos o sacados de la foto
  const palette = useMemo(() => buildPalette(theme, photoColors), [theme, photoColors]);
  const accent = accentKey === 'auto' ? (palette.vivid || '#f26a1b') : ACCENTS.find(a => a.key === accentKey)!.color;

  const setPhoto = (img: HTMLImageElement | null) => {
    if (!img) { setPhotoState(null); setPhotoColors(null); return; }
    const trimmed = trimSolidBorders(img);
    setPhotoState(trimmed);
    setPhotoColors(extractColors(trimmed));
    setPhotoFocus(0.5);
  };

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ format, theme, accent: accentKey, logo: logoKey, content })); } catch {}
  }, [format, theme, accentKey, logoKey, content]);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(n => (n && n.text === text ? null : n)), 5000);
  };

  // Fuentes, logos y catálogo
  useEffect(() => {
    if (!document.getElementById('anuncio-fonts')) {
      const link = document.createElement('link');
      link.id = 'anuncio-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Poppins:wght@700&display=swap';
      document.head.appendChild(link);
    }
    (async () => {
      try {
        await Promise.race([
          Promise.all([
            document.fonts.load('900 100px Montserrat'),
            document.fonts.load('800 40px Montserrat'),
            document.fonts.load('700 30px Poppins'),
          ]),
          new Promise(r => setTimeout(r, 4000)),
        ]);
      } catch {}
      setFontsReady(true);
    })();
    Promise.all([
      loadImage('/logo-diosmasgym.png').then(trimTransparent).catch(() => null),
      loadImage('/logo-juan614-v2.png').then(trimTransparent).catch(() => null),
    ]).then(([dmg, juan]) => setLogos({ dmg, juan }));
    Promise.all([
      fetchMusicCatalog("diosmasgym").catch(() => []),
      fetchMusicCatalog("juan614").catch(() => []),
    ]).then(([a, b]) => setCatalog(deduplicateCatalog([...a, ...b])));
  }, []);

  // Iconos del color elegido
  const usedIcons = content.features.map(f => f.icon).join(',');
  useEffect(() => {
    let alive = true;
    (async () => {
      const names = Array.from(new Set(content.features.map(f => f.icon)));
      const loaded: Record<string, HTMLImageElement | null> = {};
      await Promise.all(names.map(async n => { loaded[n] = await loadIcon(n, accent); }));
      const globe = await loadIcon('globe', palette.text);
      if (alive) { setIcons(loaded); setGlobeIcon(globe); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedIcons, accent, palette.text]);

  const renderOpts = (): RenderOptions => ({
    format, palette, accent, photo, photoFocus, fit, content, icons, globeIcon,
    logo: logoKey === 'none' ? null : logos[logoKey],
  });

  useEffect(() => {
    if (!canvasRef.current || !fontsReady) return;
    const t = setTimeout(() => { if (canvasRef.current) renderAnuncio(canvasRef.current, renderOpts()); }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, palette, accent, photo, photoFocus, fit, content, icons, globeIcon, logos, logoKey, fontsReady]);

  const chooseLogo = (k: LogoKey) => {
    setLogoKey(k);
    // El logo de Juan 614 es blanco: necesita fondo oscuro
    if (k === 'juan' && theme === 'light') setTheme('dark');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    loadImage(url).then(img => setPhoto(img)).catch(() => flash('error', 'No se pudo abrir esa imagen.'));
  };

  const pickSong = async (song: MusicItem, fillText: boolean) => {
    setSearch('');
    if (fillText) {
      setContent(c => ({ ...c, headline: 'YA DISPONIBLE', subheadline: `"${song.name}" — ${song.artist}` }));
    }
    if (!song.cover) return;
    setLoadingPhoto(true);
    try {
      setPhoto(await loadImage(await proxiedDataUrl(song.cover)));
    } catch {
      flash('error', 'No se pudo cargar la portada de esa canción.');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const results = useMemo(() => {
    const q = norm(search);
    if (!q) return [];
    return catalog.filter(s => norm(s.name).includes(q) || norm(s.artist).includes(q)).slice(0, 8);
  }, [catalog, search]);

  const setFeature = (i: number, patch: Partial<Feature>) =>
    setContent(c => ({ ...c, features: c.features.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));

  const fileName = `ANUNCIO-${(content.headline || 'DIOSMASGYM').replace(/[^a-zA-Z0-9]+/g, '-')}-${format}.png`;

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      const c = canvasRef.current;
      if (!c) return resolve(null);
      renderAnuncio(c, renderOpts());
      c.toBlob(b => resolve(b), 'image/png');
    });

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error('No se pudo crear la imagen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      flash('ok', 'Imagen descargada.');
    } catch (e) {
      flash('error', 'Error al generar la imagen: ' + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, palette, accent, photo, photoFocus, fit, content, icons, globeIcon, logos, logoKey, fileName]);

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else flash('error', 'Este dispositivo no permite compartir la imagen. Descárgala.');
    } catch { /* el usuario cerró el menú */ }
  };

  const label = "text-[9px] uppercase font-bold text-white/40 tracking-widest mb-2 block";
  const input = "w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-white/40 text-sm font-bold transition-all";
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${active ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'}`;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins'] pb-20">
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => navigate("/admin")}
          className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20">
          <i className="fas fa-chevron-left text-[8px]" /> Volver
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
          ANUNCIO <span className="text-[#c5a059]">STUDIO</span>
        </h1>
        <div className="w-20" />
      </div>

      <div className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Controles */}
        <div className="lg:col-span-5 space-y-5 order-2 lg:order-1">
          {notice && (
            <div role="status" className={`px-4 py-3 rounded-xl text-xs font-bold border ${notice.kind === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              {notice.text}
            </div>
          )}

          <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div>
              <span className={label}>Plantilla rápida</span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.key} onClick={() => setContent(t.content)} className={chip(false)}>{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <span className={label}>Formato</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FORMATS) as FormatKey[]).map(k => (
                  <button key={k} onClick={() => setFormat(k)} className={`${chip(format === k)} flex flex-col items-center gap-0.5 py-3`}>
                    <span>{FORMATS[k].label}</span>
                    <span className="text-[8px] font-medium normal-case tracking-normal opacity-70">{FORMATS[k].hint.split(' · ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={label}>Fondo</span>
                <div className="flex gap-2">
                  <button onClick={() => setTheme('auto')} className={`${chip(theme === 'auto')} flex-1`} title="Toma los colores de la foto">Auto</button>
                  <button onClick={() => setTheme('light')} className={`${chip(theme === 'light')} flex-1`}>Claro</button>
                  <button onClick={() => setTheme('dark')} className={`${chip(theme === 'dark')} flex-1`}>Oscuro</button>
                </div>
              </div>
              <div>
                <span className={label}>Color</span>
                <div className="flex gap-2">
                  {ACCENTS.map(a => (
                    <button key={a.key} onClick={() => setAccentKey(a.key)} title={a.label} aria-label={a.label}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${accentKey === a.key ? 'border-white scale-110' : 'border-white/10'}`}
                      style={{ background: a.key === 'auto' ? `conic-gradient(${palette.vivid || '#f26a1b'} 0 50%, #ef4444 50% 66%, #38bdf8 66% 83%, #c5a059 83%)` : a.color }} />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className={label}>Logo</span>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => chooseLogo('dmg')} className={chip(logoKey === 'dmg')}>Diosmasgym</button>
                <button onClick={() => chooseLogo('juan')} className={chip(logoKey === 'juan')}>Juan 614</button>
                <button onClick={() => chooseLogo('none')} className={chip(logoKey === 'none')}>Sin logo</button>
              </div>
            </div>

            <div>
              <label className={label} htmlFor="an-head">Titular grande</label>
              <input id="an-head" className={`${input} uppercase`} maxLength={40} value={content.headline}
                onChange={e => setContent(c => ({ ...c, headline: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className={label} htmlFor="an-sub">Subtítulo</label>
              <input id="an-sub" className={input} maxLength={70} value={content.subheadline}
                onChange={e => setContent(c => ({ ...c, subheadline: e.target.value }))} />
            </div>

            <div>
              <span className={label}>Beneficios (icono + texto)</span>
              <div className="space-y-2">
                {content.features.map((f, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select aria-label={`Icono ${i + 1}`} value={f.icon} onChange={e => setFeature(i, { icon: e.target.value })}
                      className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold outline-none w-36">
                      {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <i className={`fas fa-${f.icon} text-lg`} style={{ color: accent }} />
                    <input aria-label={`Texto ${i + 1}`} className={input} maxLength={26} value={f.text}
                      onChange={e => setFeature(i, { text: e.target.value })} />
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-white/30 mt-2">Deja un texto vacío para ocultar ese beneficio.</p>
            </div>

            <div>
              <label className={label} htmlFor="an-web">Página web</label>
              <input id="an-web" className={input} maxLength={40} value={content.website}
                onChange={e => setContent(c => ({ ...c, website: e.target.value }))} />
            </div>

            <div>
              <span className={label}>Foto de abajo</span>
              <label className="flex items-center justify-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl p-4 text-xs font-bold">
                <i className="fas fa-upload" /> Subir foto (concierto, ciudad, estudio...)
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
              <div className="relative mt-3">
                <input className={input} placeholder="…o busca una canción para usar su portada" value={search}
                  onChange={e => setSearch(e.target.value)} />
                {results.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#0f111a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {results.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2 hover:bg-white/5">
                        <img src={`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(s.cover))}`} className="w-10 h-10 rounded-lg object-cover bg-black" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{s.name}</div>
                          <div className="text-[10px] text-white/40 truncate">{s.artist}</div>
                        </div>
                        <button onClick={() => pickSong(s, false)} className={chip(false)}>Foto</button>
                        <button onClick={() => pickSong(s, true)} className={chip(false)} title="Usa la portada y pone el nombre de la canción">Foto + texto</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {loadingPhoto && <p className="text-[10px] text-white/40 mt-2"><i className="fas fa-spinner fa-spin mr-1" />Cargando portada...</p>}
              {photo && (
                <div className="mt-3 space-y-3">
                  <div>
                    <span className={label}>Cómo se acomoda la foto</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setFit('auto')} className={chip(fit === 'auto')}>Auto</button>
                      <button onClick={() => setFit('fill')} className={chip(fit === 'fill')}>Llenar</button>
                      <button onClick={() => setFit('fit')} className={chip(fit === 'fit')}>Completa</button>
                    </div>
                  </div>
                  <label className={label} htmlFor="an-focus">Encuadre vertical de la foto</label>
                  <input id="an-focus" type="range" min={0} max={1} step={0.01} value={photoFocus}
                    onChange={e => setPhotoFocus(Number(e.target.value))} className="w-full" />
                  <button onClick={() => setPhoto(null)} className="text-[10px] text-red-300 mt-1">Quitar foto</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-4 flex justify-center">
              <canvas ref={canvasRef}
                className="rounded-xl shadow-2xl w-full h-auto"
                style={{ maxWidth: format === 'story' ? 380 : 560, aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}` }} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleDownload} disabled={isGenerating || !fontsReady}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-black disabled:opacity-50"
                style={{ background: accent }}>
                {isGenerating ? <><i className="fas fa-spinner fa-spin" /> Generando...</> : <><i className="fas fa-download" /> Descargar PNG</>}
              </button>
              {canShare && (
                <button onClick={handleShare} className="px-5 rounded-2xl bg-white/10 hover:bg-white/20 font-bold text-xs" aria-label="Compartir">
                  <i className="fas fa-share-nodes" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnuncioStudio;
