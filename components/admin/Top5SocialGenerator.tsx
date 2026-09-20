import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog, deduplicateCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getHighResUrl } from "../../services/imageHelpers";

// ── Opciones del generador ────────────────────────────────────────────────────
type FormatKey = 'post' | 'story' | 'square';
const FORMATS: Record<FormatKey, { label: string; hint: string; w: number; h: number }> = {
  post: { label: 'Post', hint: '4:5 · Instagram / Facebook', w: 1080, h: 1350 },
  story: { label: 'Historia', hint: '9:16 · Stories / Reels / TikTok', w: 1080, h: 1920 },
  square: { label: 'Cuadrado', hint: '1:1 · WhatsApp / X', w: 1080, h: 1080 },
};
const COUNTS = [3, 5, 10] as const;
const ACCENTS: { key: string; label: string; color: string }[] = [
  { key: 'gold', label: 'Dorado', color: '#c5a059' },
  { key: 'blue', label: 'Azul', color: '#4a90d9' },
  { key: 'red', label: 'Rojo', color: '#ef4444' },
  { key: 'white', label: 'Blanco', color: '#e5e7eb' },
];
// Cada opción cambia el subtítulo Y trae los datos de ese periodo
type PeriodKey = 'week' | 'month' | 'year' | 'alltime' | 'new';
const PERIODS: { key: PeriodKey; label: string; hint: string }[] = [
  { key: 'week', label: 'DE LA SEMANA', hint: 'Reproducciones en el sitio, últimos 7 días' },
  { key: 'month', label: 'DEL MES', hint: 'Reproducciones en el sitio, últimos 30 días' },
  { key: 'year', label: 'DEL AÑO', hint: 'Reproducciones en el sitio, últimos 12 meses' },
  { key: 'alltime', label: 'MÁS ESCUCHADAS', hint: 'Vistas totales en YouTube' },
  { key: 'new', label: 'ESTRENOS', hint: 'Los lanzamientos más recientes' },
];
const PERIOD_DAYS: Partial<Record<PeriodKey, number>> = { week: 7, month: 30, year: 365 };
const PREFS_KEY = 'dmg_top5_prefs';

type Source = 'analytics' | 'recent' | 'random' | 'youtube';

// ── Utilidades ───────────────────────────────────────────────────────────────
const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function urlToDataUrl(src: string): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(src))}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("proxy " + res.status);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

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

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Dibuja la imagen recortada al centro para llenar el rectángulo (como object-fit: cover)
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; }
  else { sh = img.width / r; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 2 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function weekLabel(): string {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const m = (d: Date) => d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '').toUpperCase();
  return start.getMonth() === end.getMonth()
    ? `SEMANA DEL ${start.getDate()} AL ${end.getDate()} ${m(end)}`
    : `${start.getDate()} ${m(start)} AL ${end.getDate()} ${m(end)}`;
}

// Coincidencia estricta: nombre exacto; si no, contiene solo cuando el título es largo
function findByTitle(dedup: MusicItem[], title: string): MusicItem | undefined {
  const t = norm(title);
  if (!t) return undefined;
  const exact = dedup.find(c => norm(c.name) === t);
  if (exact) return exact;
  if (t.length < 6) return undefined;
  return dedup.find(c => {
    const n = norm(c.name);
    return n.length >= 6 && (n.includes(t) || t.includes(n));
  });
}

function pickSongs(catalog: MusicItem[], source: Source, count: number, analyticsTitles: string[]): MusicItem[] {
  const dedup = deduplicateCatalog(catalog);
  if (source === 'random') return [...dedup].sort(() => Math.random() - 0.5).slice(0, count);
  if (source === 'recent') {
    return [...dedup]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }
  const matched: MusicItem[] = [];
  // 'analytics' y 'youtube' llegan como lista de títulos ya ordenada por su ranking
  for (const title of analyticsTitles) {
    if (matched.length >= count) break;
    const m = findByTitle(dedup, title);
    if (m && !matched.some(x => x.id === m.id)) matched.push(m);
  }
  if (matched.length >= count) return matched;
  return [...matched, ...dedup.filter(c => !matched.some(m => m.id === c.id))].slice(0, count);
}

interface RenderOptions {
  songs: MusicItem[];
  images: Record<string, HTMLImageElement | undefined>;
  logos: { dmg: HTMLImageElement | null; juan: HTMLImageElement | null };
  format: FormatKey;
  count: number;
  subtitle: string;
  accent: string;
}

// ── Un solo dibujo para la vista previa y la descarga (lo que ves es lo que se descarga) ──
function renderTop(canvas: HTMLCanvasElement, o: RenderOptions) {
  const { w: W, h: H } = FORMATS[o.format];
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const { accent } = o;
  const N = Math.max(1, o.songs.length);
  const titleFont = `"Pirata One", Georgia, serif`;
  const bodyFont = `Oswald, "Arial Narrow", Arial, sans-serif`;

  // Fondo
  ctx.fillStyle = '#020202';
  ctx.fillRect(0, 0, W, H);
  const first = o.images[o.songs[0]?.id];
  if (first) {
    // Desenfoque compatible con todos los navegadores: se reduce y se vuelve a ampliar
    const tiny = document.createElement('canvas');
    tiny.width = 24; tiny.height = Math.max(24, Math.round(24 * H / W));
    const tctx = tiny.getContext('2d')!;
    drawCover(tctx, first, 0, 0, tiny.width, tiny.height);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tiny, 0, 0, W, H);
    ctx.restore();
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Medidas según el formato
  const titleSize = o.format === 'story' ? 210 : o.format === 'square' ? 120 : 165;
  const titleY = o.format === 'story' ? 110 : o.format === 'square' ? 34 : 56;
  const pillH = o.format === 'square' ? 46 : 58;
  const pillFont = o.format === 'square' ? 28 : 34;
  const pillY = titleY + titleSize + (o.format === 'square' ? 4 : 14);
  const footerH = o.format === 'square' ? 110 : 140;
  const pad = 55;
  const startY = pillY + pillH + (o.format === 'square' ? 24 : 40);
  const endY = H - footerH - 24;
  const gap = o.count >= 10 ? 10 : 16;
  const rowH = Math.min(150, (endY - startY - gap * (N - 1)) / N);

  // Título "TOP N"
  ctx.textBaseline = 'top';
  ctx.font = `${titleSize}px ${titleFont}`;
  const topW = ctx.measureText('TOP ').width;
  const numW = ctx.measureText(String(o.count)).width;
  const tx = (W - (topW + numW)) / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 24;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TOP ', tx, titleY);
  ctx.fillStyle = accent;
  ctx.fillText(String(o.count), tx + topW, titleY);
  ctx.shadowBlur = 0;

  // Subtítulo
  if (o.subtitle) {
    ctx.font = `600 ${pillFont}px ${bodyFont}`;
    const text = o.subtitle;
    const spacing = 6;
    const tw = ctx.measureText(text).width + spacing * (text.length - 1);
    const px = 46;
    const rx = (W - tw) / 2 - px;
    rrPath(ctx, rx, pillY, tw + px * 2, pillH, pillH / 2);
    ctx.fillStyle = accent + '26';
    ctx.fill();
    ctx.strokeStyle = accent + '66';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textBaseline = 'middle';
    let cx = (W - tw) / 2;
    for (const ch of text) {
      ctx.fillText(ch, cx, pillY + pillH / 2 + 1);
      cx += ctx.measureText(ch).width + spacing;
    }
  }

  // Filas
  const cover = rowH - 20;
  const nameSize = Math.max(22, Math.min(38, rowH * 0.26));
  const artistSize = Math.max(16, Math.min(26, rowH * 0.18));
  const rankSize = Math.max(34, Math.min(84, rowH * 0.6));
  o.songs.forEach((song, i) => {
    const y = startY + i * (rowH + gap);
    const isFirst = i === 0;

    rrPath(ctx, pad, y, W - pad * 2, rowH, 22);
    ctx.fillStyle = isFirst ? accent + '2E' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    if (isFirst) {
      ctx.strokeStyle = accent + 'AA';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.save();
    rrPath(ctx, pad, y, W - pad * 2, rowH, 22);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(pad, y, 7, rowH);
    ctx.restore();

    ctx.font = `${rankSize}px ${titleFont}`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), pad + 62, y + rowH / 2 + 4);

    const cx = pad + 120;
    const cy = y + (rowH - cover) / 2;
    const img = o.images[song.id];
    ctx.save();
    rrPath(ctx, cx, cy, cover, cover, 14);
    ctx.clip();
    if (img) drawCover(ctx, img, cx, cy, cover, cover);
    else {
      ctx.fillStyle = '#161922';
      ctx.fillRect(cx, cy, cover, cover);
      ctx.fillStyle = accent + '88';
      ctx.font = `bold ${cover * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♪', cx + cover / 2, cy + cover / 2);
    }
    ctx.restore();

    const textX = cx + cover + 26;
    const maxTW = W - pad - 30 - textX;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${nameSize}px ${bodyFont}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fitText(ctx, (song.name || '').toUpperCase(), maxTW), textX, y + rowH / 2 - artistSize * 0.7);
    ctx.font = `500 ${artistSize}px ${bodyFont}`;
    ctx.fillStyle = accent;
    ctx.fillText(fitText(ctx, (song.artist || 'DIOSMASGYM').toUpperCase(), maxTW), textX, y + rowH / 2 + nameSize * 0.6);
  });

  // Pie
  const footY = H - footerH;
  const sep = ctx.createLinearGradient(pad, 0, W - pad, 0);
  sep.addColorStop(0, 'rgba(255,255,255,0)');
  sep.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  sep.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = sep;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footY);
  ctx.lineTo(W - pad, footY);
  ctx.stroke();

  const midY = footY + (footerH - 10) / 2 + 8;
  // Logos de los dos artistas, en sus colores originales (los PNG tienen fondo transparente).
  // Cada logo trae margen vacío, por eso se recorta a la zona con dibujo.
  const logoH = Math.min(104, footerH - 30);
  let lx = pad;
  const drawLogo = (img: HTMLImageElement | null, crop: [number, number, number, number]) => {
    if (!img) return;
    const [fx, fy, fw, fh] = crop; // fracciones de la imagen
    const sw = img.width * fw, sh = img.height * fh;
    const dh = logoH, dw = dh * (sw / sh);
    ctx.drawImage(img, img.width * fx, img.height * fy, sw, sh, lx, midY - dh / 2, dw, dh);
    lx += dw + 18;
  };
  drawLogo(o.logos.dmg, [0.24, 0.0, 0.52, 1.0]);
  if (o.logos.dmg && o.logos.juan) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(lx - 9, midY - logoH / 2 + 8, 2, logoH - 16);
    lx += 9;
  }
  drawLogo(o.logos.juan, [0.33, 0.24, 0.40, 0.56]);
  if (!o.logos.dmg && !o.logos.juan) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 34px ${bodyFont}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DIOSMASGYM × JUAN 614', pad, midY);
  }

  ctx.textAlign = 'right';
  ctx.font = `700 32px ${bodyFont}`;
  ctx.fillStyle = accent;
  ctx.fillText('diosmasgym.com', W - pad, midY - 14);
  ctx.font = `400 22px ${bodyFont}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Spotify · YouTube · Apple Music', W - pad, midY + 20);
}

const Top5SocialGenerator: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [analyticsTitles, setAnalyticsTitles] = useState<string[]>([]);
  const [topSongs, setTopSongs] = useState<MusicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [images, setImages] = useState<Record<string, HTMLImageElement | undefined>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [logos, setLogos] = useState<{ dmg: HTMLImageElement | null; juan: HTMLImageElement | null }>({ dmg: null, juan: null });
  const [fontsReady, setFontsReady] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionEdited, setCaptionEdited] = useState(false);

  const prefs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
  }, []);
  const [format, setFormat] = useState<FormatKey>(prefs.format in FORMATS ? prefs.format : 'post');
  const [count, setCount] = useState<number>(COUNTS.includes(prefs.count) ? prefs.count : 5);
  const [accentKey, setAccentKey] = useState<string>(ACCENTS.some(a => a.key === prefs.accent) ? prefs.accent : 'gold');
  const [subtitle, setSubtitle] = useState<string>(typeof prefs.subtitle === 'string' ? prefs.subtitle : 'DE LA SEMANA');
  const [source, setSource] = useState<Source>('analytics');
  const [period, setPeriod] = useState<PeriodKey | null>('week');
  const [dataNote, setDataNote] = useState('');
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const titlesCache = useRef<Record<string, string[]>>({});
  const periodReq = useRef(0);

  const accent = ACCENTS.find(a => a.key === accentKey)!.color;

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ format, count, accent: accentKey, subtitle })); } catch {}
  }, [format, count, accentKey, subtitle]);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(n => (n && n.text === text ? null : n)), 5000);
  };

  // Títulos ordenados por ranking para un periodo (con caché para no repetir consultas)
  async function fetchPeriodTitles(key: PeriodKey): Promise<string[]> {
    const cacheKey = key;
    if (titlesCache.current[cacheKey]) return titlesCache.current[cacheKey];
    let titles: string[] = [];
    try {
      if (key === 'alltime') {
        const res = await fetch('/api/common?action=youtube-top');
        if (res.ok) {
          const json = await res.json();
          titles = (json?.top || []).map((v: any) => v.title).filter(Boolean);
        }
      } else if (PERIOD_DAYS[key]) {
        const res = await fetch(`/api/analytics?topDays=${PERIOD_DAYS[key]}`);
        if (res.ok) {
          const json = await res.json();
          titles = (json?.data?.topSongs || []).map((s: any) => s.title).filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('Error cargando ranking del periodo:', err);
    }
    if (titles.length > 0) titlesCache.current[cacheKey] = titles;
    return titles;
  }

  // Elegir un periodo cambia el subtítulo y trae las canciones que corresponden
  const applyPeriod = async (key: PeriodKey, labelOverride?: string) => {
    const info = PERIODS.find(p => p.key === key)!;
    setPeriod(key);
    setSubtitle(labelOverride || info.label);
    if (catalog.length === 0) return;
    if (key === 'new') {
      periodReq.current++;
      setLoadingPeriod(false);
      setSource('recent');
      setTopSongs(pickSongs(catalog, 'recent', count, []));
      setDataNote(info.hint);
      return;
    }
    const req = ++periodReq.current;
    setLoadingPeriod(true);
    const titles = await fetchPeriodTitles(key);
    if (req !== periodReq.current) return; // llegó una respuesta vieja
    setLoadingPeriod(false);
    setSource(key === 'alltime' ? 'youtube' : 'analytics');
    setAnalyticsTitles(titles);
    setTopSongs(pickSongs(catalog, 'analytics', count, titles));
    setDataNote(titles.length > 0
      ? info.hint
      : `Aún no hay datos para este periodo (${info.hint.toLowerCase()}): se muestran canciones del catálogo. Ajusta la lista a mano.`);
  };

  // Carga inicial: catálogo, analíticas, logos y fuentes de la marca
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [dM, j6] = await Promise.all([
        fetchMusicCatalog("diosmasgym").catch(() => []),
        fetchMusicCatalog("juan614").catch(() => [])
      ]);
      const full = deduplicateCatalog([...dM, ...j6]);
      setCatalog(full);

      const titles = await fetchPeriodTitles('week');
      setAnalyticsTitles(titles);
      setDataNote(titles.length > 0 ? PERIODS[0].hint : 'Aún no hay datos de reproducciones: se muestran canciones del catálogo.');
      if (full.length > 0) setTopSongs(pickSongs(full, 'analytics', count, titles));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    Promise.all([
      loadImage('/logo-diosmasgym-md.webp').catch(() => null),
      loadImage('/logo-juan614-v2-md.webp').catch(() => null),
    ]).then(([dmg, juan]) => setLogos({ dmg, juan }));
    (async () => {
      try {
        await Promise.all([
          document.fonts.load('100px "Pirata One"'),
          document.fonts.load('700 30px Oswald'),
          document.fonts.load('500 20px Oswald'),
        ]);
      } catch {}
      setFontsReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precarga de portadas como imágenes
  useEffect(() => {
    if (topSongs.length === 0) { setImagesReady(true); return; }
    const needed = topSongs.filter(s => s.cover && !images[s.id]);
    if (needed.length === 0) { setImagesReady(true); return; }
    setImagesReady(false);
    let alive = true;
    const timeout = setTimeout(() => { if (alive) setImagesReady(true); }, 6000);
    (async () => {
      const updates: Record<string, HTMLImageElement> = {};
      await Promise.all(needed.map(async s => {
        try { updates[s.id] = await loadImage(await urlToDataUrl(s.cover)); } catch {}
      }));
      if (alive) {
        setImages(prev => ({ ...prev, ...updates }));
        setImagesReady(true);
      }
    })();
    return () => { alive = false; clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topSongs]);

  // Vista previa: mismo dibujo que la descarga
  useEffect(() => {
    if (!canvasRef.current || !fontsReady) return;
    const t = setTimeout(() => {
      if (canvasRef.current) renderTop(canvasRef.current, { songs: topSongs, images, logos, format, count, subtitle, accent });
    }, 120);
    return () => clearTimeout(t);
  }, [topSongs, images, logos, format, count, subtitle, accent, fontsReady]);

  // Texto listo para publicar (se regenera solo hasta que lo edites)
  const autoCaption = useMemo(() => {
    if (topSongs.length === 0) return '';
    const lines = topSongs.map((s, i) => `${i + 1}. ${s.name} — ${s.artist}`).join('\n');
    return `🔥 TOP ${count}${subtitle ? ' ' + subtitle : ''}\n\n${lines}\n\n🎧 Escúchalas en diosmasgym.com\n\n#Diosmasgym #Juan614 #MusicaCristiana #RapCristiano #CorridosCristianos #FeYGym`;
  }, [topSongs, count, subtitle]);
  useEffect(() => { if (!captionEdited) setCaption(autoCaption); }, [autoCaption, captionEdited]);

  const applySource = (src: Source, n = count) => {
    if (catalog.length === 0) return;
    if (src === 'analytics') { applyPeriod(period && period !== 'new' ? period : 'week', period && period !== 'new' ? subtitle : undefined); return; }
    setSource(src);
    setPeriod(null);
    setTopSongs(pickSongs(catalog, src, n, analyticsTitles));
    setDataNote(src === 'recent' ? 'Los lanzamientos más recientes' : 'Selección al azar');
  };

  const changeCount = (n: number) => {
    setCount(n);
    setTopSongs(prev => (prev.length > n ? prev.slice(0, n) : prev));
    if (topSongs.length < n && catalog.length > 0) setTopSongs(pickSongs(catalog, source === 'youtube' ? 'analytics' : source, n, analyticsTitles));
  };

  const filteredCatalog = useMemo(() => {
    const q = norm(searchQuery);
    if (!q) return [];
    return catalog.filter(s => norm(s.name).includes(q) || norm(s.artist).includes(q)).slice(0, 10);
  }, [catalog, searchQuery]);

  const handleSelectSong = (song: MusicItem) => {
    if (topSongs.length >= count) { flash('error', `Ya tienes ${count} canciones. Quita una o cambia la cantidad.`); return; }
    if (topSongs.find(s => s.id === song.id)) return;
    setTopSongs([...topSongs, song]);
    setSearchQuery(""); setIsSearchOpen(false);
  };

  const moveSong = (i: number, dir: "up" | "down") => {
    const arr = [...topSongs];
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setTopSongs(arr);
  };

  const fileName = `TOP-${count}-${(subtitle || 'DMG').replace(/[^a-zA-Z0-9]+/g, '-')}-${format}.png`;

  const getBlob = (): Promise<Blob | null> =>
    new Promise(resolve => {
      const c = canvasRef.current;
      if (!c) return resolve(null);
      renderTop(c, { songs: topSongs, images, logos, format, count, subtitle, accent });
      c.toBlob(b => resolve(b), 'image/png');
    });

  const handleDownload = useCallback(async () => {
    if (topSongs.length === 0) return;
    setIsGenerating(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error('No se pudo crear la imagen');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
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
  }, [topSongs, images, logos, format, count, subtitle, accent, fileName]);

  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare && !!navigator.share;
  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        flash('error', 'Este dispositivo no permite compartir la imagen. Descárgala.');
      }
    } catch { /* el usuario cerró el menú de compartir */ }
  };

  const handleCopyImage = async () => {
    try {
      const blob = await getBlob();
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash('ok', 'Imagen copiada. Pégala en tu publicación.');
    } catch {
      flash('error', 'Tu navegador no permite copiar la imagen. Usa Descargar.');
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      flash('ok', 'Texto copiado.');
    } catch {
      flash('error', 'No se pudo copiar el texto.');
    }
  };

  const ready = !isLoading && imagesReady && fontsReady && topSongs.length > 0;
  const label = "text-[9px] uppercase font-bold text-white/40 tracking-widest mb-2 block";
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${active ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins'] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => navigate("/admin")}
          className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20">
          <i className="fas fa-chevron-left text-[8px]" /> Volver
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
          TOP <span className="text-[#c5a059]">CUSTOM MAKER</span>
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
            {/* Formato */}
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
              <p className="text-[9px] text-white/30 mt-2">{FORMATS[format].hint}</p>
            </div>

            {/* Cantidad y color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={label}>Cantidad</span>
                <div className="flex gap-2">
                  {COUNTS.map(n => (
                    <button key={n} onClick={() => changeCount(n)} className={`${chip(count === n)} flex-1`}>Top {n}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className={label}>Color</span>
                <div className="flex gap-2">
                  {ACCENTS.map(a => (
                    <button key={a.key} onClick={() => setAccentKey(a.key)} title={a.label} aria-label={a.label}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${accentKey === a.key ? 'border-white scale-110' : 'border-white/10'}`}
                      style={{ background: a.color }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Subtítulo */}
            <div>
              <label className={label} htmlFor="top5-subtitle">Subtítulo</label>
              <input id="top5-subtitle" className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl outline-none focus:border-white/40 text-sm font-bold uppercase transition-all"
                value={subtitle} maxLength={34} onChange={e => setSubtitle(e.target.value.toUpperCase())} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PERIODS.map(p => (
                  <button key={p.key} disabled={loadingPeriod || isLoading} onClick={() => applyPeriod(p.key)} className={chip(period === p.key && subtitle === p.label)}>{p.label}</button>
                ))}
                <button disabled={loadingPeriod || isLoading} onClick={() => applyPeriod('week', weekLabel())} className={chip(period === 'week' && subtitle !== 'DE LA SEMANA')}>
                  <i className="fas fa-calendar-day mr-1" />Fechas de esta semana
                </button>
              </div>
              <p className="text-[10px] mt-2 flex items-center gap-1.5" style={{ color: loadingPeriod ? accent : 'rgba(255,255,255,0.4)' }}>
                <i className={`fas ${loadingPeriod ? 'fa-spinner fa-spin' : 'fa-circle-info'}`} />
                {loadingPeriod ? 'Buscando datos del periodo...' : (dataNote || 'Elige un periodo para traer sus datos.')}
              </p>
            </div>

            {/* Origen de las canciones */}
            <div>
              <span className={label}>Llenar automáticamente con</span>
              <div className="grid grid-cols-3 gap-2">
                <button disabled={isLoading || catalog.length === 0} onClick={() => applySource('analytics')} className={chip(source === 'analytics')}>
                  <i className="fas fa-chart-line mr-1.5" />Más vistas
                </button>
                <button disabled={isLoading || catalog.length === 0} onClick={() => applySource('recent')} className={chip(source === 'recent')}>
                  <i className="fas fa-clock mr-1.5" />Recientes
                </button>
                <button disabled={isLoading || catalog.length === 0} onClick={() => applySource('random', count)} className={chip(source === 'random')}>
                  <i className="fas fa-shuffle mr-1.5" />Al azar
                </button>
              </div>
            </div>

            {/* Buscar */}
            <div className="relative">
              <label className={label} htmlFor="top5-search">Agregar canción ({topSongs.length}/{count})</label>
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none" />
                <input id="top5-search" type="text" placeholder="Buscar en el catálogo..."
                  className="w-full bg-black/40 border border-white/10 pl-11 pr-4 py-3.5 rounded-xl outline-none focus:border-white/40 text-xs font-bold transition-all"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(e.target.value.length > 0); }} />
              </div>
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl max-h-64 overflow-y-auto">
                  {filteredCatalog.length === 0 && <p className="p-4 text-xs text-white/40">Sin resultados</p>}
                  {filteredCatalog.map(song => (
                    <button key={song.id} onClick={() => handleSelectSong(song)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left">
                      <img src={`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(song.cover))}`} className="w-10 h-10 rounded-lg object-cover bg-black" alt="" />
                      <div>
                        <div className="text-[11px] font-bold text-white/90">{song.name}</div>
                        <div className="text-[9px] font-bold uppercase" style={{ color: accent }}>{song.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="space-y-2">
              {topSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 bg-black/30 border border-white/5 p-2.5 rounded-xl">
                  <span className="text-xs font-black w-5 text-center" style={{ color: accent }}>{i + 1}</span>
                  <div className="w-10 h-10 rounded overflow-hidden bg-black shrink-0 flex items-center justify-center">
                    {song.cover
                      ? <img src={`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(song.cover))}`} className="w-full h-full object-cover" alt="" />
                      : <i className="fas fa-music text-white/20 text-xs" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{song.name}</p>
                    <p className="text-[9px] text-white/50 truncate uppercase">{song.artist}</p>
                  </div>
                  <div className="flex flex-col">
                    <button onClick={() => moveSong(i, "up")} disabled={i === 0} aria-label={`Subir ${song.name}`} className="w-7 h-5 text-white/40 hover:text-white disabled:opacity-20"><i className="fas fa-chevron-up text-[10px]" /></button>
                    <button onClick={() => moveSong(i, "down")} disabled={i === topSongs.length - 1} aria-label={`Bajar ${song.name}`} className="w-7 h-5 text-white/40 hover:text-white disabled:opacity-20"><i className="fas fa-chevron-down text-[10px]" /></button>
                  </div>
                  <button onClick={() => setTopSongs(topSongs.filter(s => s.id !== song.id))} aria-label={`Quitar ${song.name}`}
                    className="w-8 h-8 flex items-center justify-center text-red-500/60 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10">
                    <i className="fas fa-times" />
                  </button>
                </div>
              ))}
              {topSongs.length === 0 && !isLoading && <p className="text-xs text-white/40 text-center py-4">Agrega canciones o usa "Llenar automáticamente".</p>}
            </div>
          </div>

          {/* Texto para publicar */}
          <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 md:p-8 space-y-3">
            <div className="flex items-center justify-between">
              <label className={`${label} mb-0`} htmlFor="top5-caption">Texto para la publicación</label>
              {captionEdited && (
                <button onClick={() => { setCaptionEdited(false); setCaption(autoCaption); }} className="text-[9px] font-bold uppercase tracking-wider text-white/50 hover:text-white">
                  <i className="fas fa-rotate-left mr-1" />Restablecer
                </button>
              )}
            </div>
            <textarea id="top5-caption" rows={8} value={caption}
              onChange={e => { setCaption(e.target.value); setCaptionEdited(true); }}
              className="w-full bg-black/40 border border-white/10 p-3.5 rounded-xl outline-none focus:border-white/40 text-xs leading-relaxed resize-y" />
            <button onClick={handleCopyCaption} disabled={!caption}
              className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40">
              <i className="fas fa-copy mr-2" />Copiar texto
            </button>
          </div>
        </div>

        {/* Vista previa (es el mismo dibujo que se descarga) */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="flex justify-center">
              <canvas ref={canvasRef}
                aria-label="Vista previa de la imagen"
                className="rounded-2xl border border-white/10 shadow-2xl bg-black"
                style={{ maxWidth: '100%', maxHeight: '72vh', width: 'auto', height: 'auto' }} />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <button onClick={handleDownload} disabled={!ready || isGenerating}
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-black hover:brightness-110 transition flex items-center justify-center gap-3 shadow-lg disabled:opacity-40"
                style={{ background: accent }}>
                {isGenerating ? <><i className="fas fa-spinner fa-spin" /> Generando...</> : !ready ? <><i className="fas fa-spinner fa-spin" /> Preparando...</> : <><i className="fas fa-download" /> Descargar PNG</>}
              </button>
              {canShareFiles && (
                <button onClick={handleShare} disabled={!ready}
                  className="py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-black uppercase tracking-widest transition disabled:opacity-40">
                  <i className="fas fa-share-nodes mr-2" />Compartir
                </button>
              )}
              <button onClick={handleCopyImage} disabled={!ready}
                className="py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-black uppercase tracking-widest transition disabled:opacity-40">
                <i className="fas fa-copy mr-2" />Copiar
              </button>
            </div>
            <p className="text-center text-[10px] text-white/30">{FORMATS[format].w} × {FORMATS[format].h} px · lo que ves es lo que se descarga</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Top5SocialGenerator;
