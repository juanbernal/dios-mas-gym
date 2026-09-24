import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { get as blobGet, put as blobPut } from '@vercel/blob';

// ── In-memory rate limiter (per IP, resets per serverless instance lifecycle) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 60;       // max requests
const RATE_LIMIT_WINDOW = 60000; // per 60 seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true; // OK
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return false; // blocked
  return true; // OK
}

// Límite estricto para envíos de testimonios: 3 por hora por IP
const testimonioMap = new Map<string, { count: number; resetAt: number }>();
function checkTestimonioLimit(ip: string): boolean {
  const now = Date.now();
  const e = testimonioMap.get(ip);
  if (!e || now > e.resetAt) {
    testimonioMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  e.count++;
  return e.count <= 3;
}

// Limite de intentos fallidos de login del panel (por instancia; frena la fuerza bruta basica)
const loginFailMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function loginBlocked(ip: string): boolean {
  const e = loginFailMap.get(ip);
  if (!e) return false;
  if (Date.now() > e.resetAt) { loginFailMap.delete(ip); return false; }
  return e.count >= LOGIN_MAX_FAILS;
}

function registerLoginFail(ip: string): void {
  const now = Date.now();
  const e = loginFailMap.get(ip);
  if (!e || now > e.resetAt) loginFailMap.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  else e.count++;
}

function getClientIp(req: any): string {
  return (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers?.['x-real-ip'] as string
    || req.socket?.remoteAddress
    || 'unknown';
}

// El index.html trae contenido de relleno para la home (rastreable); los handlers SSR
// necesitan el <div id="root"></div> vacio para inyectar el contenido propio de cada pagina.
function stripHomeFallback(html: string): string {
  return html.replace(/<div id="root">\s*<!-- Contenido rastreable[\s\S]*?<\/main>\s*<\/div>/, '<div id="root"></div>');
}

let cachedIndexHtml = '';
// Ultima lista buena de testimonios (por instancia) para cuando Apps Script falla
let lastTestimonios: any[] | null = null;
let cachedIndexHtmlTime = 0;

async function getBaseIndexHtml(): Promise<string> {
  const now = Date.now();
  if (cachedIndexHtml && (now - cachedIndexHtmlTime) < 10 * 60 * 1000) {
    return cachedIndexHtml;
  }

  // Strategy 1: Read directly from the filesystem (fastest, no cold-start loop)
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        let html = fs.readFileSync(candidate, 'utf-8');
        if (html && html.includes('<div id="root">')) {
          html = stripHomeFallback(html);
          cachedIndexHtml = html;
          cachedIndexHtmlTime = now;
          return html;
        }
      }
    } catch (_) { /* continue */ }
  }

  // Strategy 2: Fetch from the production URL (fallback for non-Vercel envs)
  try {
    const htmlRes = await fetch('https://www.diosmasgym.com/index.html', { signal: AbortSignal.timeout(8000) });
    let html = await htmlRes.text();
    if (html && html.includes('<div id="root">')) {
      html = stripHomeFallback(html);
      cachedIndexHtml = html;
      cachedIndexHtmlTime = now;
      return html;
    }
  } catch (err) {
    console.error("Failed to fetch base index.html:", err);
  }

  if (cachedIndexHtml) return cachedIndexHtml;
  throw new Error("Unable to fetch index.html");
}

function timingSafeCompare(a: string, b: string): boolean {
  const strA = String(a).trim();
  const strB = String(b).trim();
  try {
    const hashA = crypto.createHash('sha256').update(strA).digest();
    const hashB = crypto.createHash('sha256').update(strB).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch (e) {
    return false;
  }
}

// Secreto del Apps Script de letras: solo en el servidor (variable GS_SYNC_SECRET en Vercel).
// Mientras la variable no exista se usa el valor anterior para no romper la sincronizacion.
function GS_SYNC_SECRET(): string {
  return (process.env.GS_SYNC_SECRET || 'DMG_SYNC_2026').trim();
}

function verifyAdminPassword(req: any): boolean {
  const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
  const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');

  let providedPassword = '';
  let authHeader = '';

  if (typeof req.headers?.get === 'function') {
    providedPassword = req.headers.get('x-admin-password') || '';
    authHeader = req.headers.get('authorization') || '';
  } else if (req.headers) {
    providedPassword = (req.headers['x-admin-password'] as string) || '';
    authHeader = (req.headers['authorization'] as string) || '';
  }

  if (MASTER_KEY && timingSafeCompare(providedPassword, MASTER_KEY)) {
    return true;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (MASTER_KEY && timingSafeCompare(token, MASTER_KEY)) {
      return true;
    }
  }

  // Si no está configurada la variable en entorno de desarrollo local, permitir guardado
  if (!MASTER_KEY && !process.env.VERCEL) {
    return true;
  }

  return false;
}

async function robustFetchText(urlStr: string): Promise<string> {
  // 1. Try global fetch first if available
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(urlStr, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return await response.text();
      }
      console.warn(`[api/common] Global fetch returned status ${response.status}, falling back to native https.`);
    } catch (fetchErr: any) {
      console.warn(`[api/common] Global fetch failed: ${fetchErr.message}, falling back to native https.`);
    }
  }

  // 2. Fallback to standard Node.js https/http with redirect support
  return new Promise((resolve, reject) => {
    function get(url: string, depth: number) {
      if (depth > 5) {
        return reject(new Error("Too many redirects"));
      }

      const client = url.startsWith('https') ? https : http;
      client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/csv,text/plain,*/*'
        }
      }, (res) => {
        const statusCode = res.statusCode || 0;

        // Redirects: 301, 302, 303, 307, 308
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, url).toString();
          return get(redirectUrl, depth + 1);
        }

        if (statusCode < 200 || statusCode >= 300) {
          return reject(new Error(`HTTP Error status ${statusCode}`));
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    }

    get(urlStr, 0);
  });
}



interface MusicItem {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
  type: string;
  date: string;
  album?: string;
  lyrics?: string;
}

function generateSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const isNonMusicOrForeign = (title: string): boolean => {
  if (!title) return true;
  const t = title.toLowerCase();

  // Tagalog words & non-Spanish auto-sync markers
  const tagalogRegex = /\b(ano|kung|ang|mga|hindi|ng|saulo|ebanghelyo|kasalanan|sinasabi|ligtas|kamatayan|dugo|sino|paano|katawan|lupang|bakit|tagalog|pinoy|na|ka|mo|ko|salamat|totoo|paalala|pagsubok|taong|impyerno|impiyerno|kailangan|pananampalataya|kaligtasan|handa|pumanaw|makilala|siyang|ating|tunay|kawikaan|biyaya|s'yang|bangkay|labanan|namatay|apostol|himala|langit|glorified|kinuha|bagong|orihinal|muling|ginawa|digmaang|salitang|pagibig|alalahanin|manalangin|panalangin|katangian|tagausig|pala|dito|nakapunta|ikaw|matapos|makagawa|sadyain|kulam|kasiguraduhan|hudas|iskariote|lord|pakinggan|ngayon|tupa|tsismis|nagkokontrahan|paul|james|nawawala|nagsasabing|pangalan|aklat|lahat|may|ilalaban|payo|hesus|biyaya|posible|sikreto)\b/;
  if (tagalogRegex.test(t)) return true;

  // English YouTube devotionals / trivia / sermon titles
  const englishDevotionals = [
    'sunset', 'ocean waves', 'billy graham', 'bible facts', 'miracles performed',
    'prophecies fulfilled', 'prophecy of', 'tribulation', 'armageddon', 'rapture',
    'how jesus', 'how moses', 'how sodom', 'how rapture', 'how to',
    'talk to jesus', 'he has good news', 'receive god', 'fear not', 'real love 💯',
    'pursue love', 'patiently waiting', 'guard your heart', 'god is my strength',
    'humble yourself', 'surrendered 💯', 'all things', "god's love",
    'worry no more', 'grace is sufficient', 'trusting god', 'remember this bible',
    'spreadlove', 'jesus is calling', 'top 5 biggest religion', 'prayer for',
    'morning prayer', 'fathers discipline', 'psalm chapter', 'happy hearts day',
    'how david', 'god is with us', 'god is love', 'god loves you',
    'god is our refuge', 'be strong and courageous', 'we are eternal', 'god knows your pain',
    'hope in the lord', 'receive god', 'the nine choirs', 'result of trust', 'trust in jesus',
    'jesus conquered', 'tired? come to jesus', 'love is..', 'do not fear', 'not that we loved',
    'jesus warning', 'marrying the right person', 'happiness is not a goal', 'put god first',
    'feeling unloved', 'miracles of jesus', 'miracle performed', 'how jesus turned', 'anxious? talk to jesus',
    'broken-hearted', 'need healing', 'need peace', 'feeling alone', 'are you tired',
    'prophecies fulfilled', 'biblical names', 'we belong to jesus', 'jesus chose you',
    'god is saying today', 'jesus the light', 'love message from god', 'the only way',
    'jesus the bread', 'message of the cross', 'jesus love will not', 'let me fight this',
    'first ten fallen angels', 'jesus reminder', 'scientific death', 'test your bible',
    'best gift ever!', 'king david', 'king solomon', "a father's discipline",
    'only reason i know', 'jesus is life', 'receive the good news', 'always remember',
    'why do i love', 'love your enemies'
  ];

  if (englishDevotionals.some(phrase => t.includes(phrase))) return true;

  return false;
};

function parseCSV(csvText: string): MusicItem[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre') && lines[i].includes('Artista')) {
      startIndex = i;
      break;
    }
  }

  const headerLine = lines[startIndex];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  const music: MusicItem[] = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());

    if (values.length < 3) continue;

    const clean = (v: string) => (v || '').replace(/^"|"$/g, '').trim();
    const entry: any = {};

    headers.forEach((header, index) => {
      const val = clean(values[index]);
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
      if (header.includes('portada')) entry.cover = val;
      if (header === 'tipo') entry.type = val;
      if (header === 'fecha') entry.date = val;
      if (header.includes('album')) entry.album = val;
      if (header === 'letra' || header === 'lyrics') entry.lyrics = val.replace(/\\n/g, '\n');
    });

    if (!entry.name) entry.name = clean(values[0]);
    if (!entry.artist) entry.artist = clean(values[1]);
    if (!entry.url) entry.url = clean(values[2]);
    if (!entry.cover) entry.cover = clean(values[3]);
    if (!entry.type) entry.type = clean(values[4]);
    if (!entry.date) entry.date = clean(values[5]);
    if (!entry.lyrics && values[6]) entry.lyrics = clean(values[6]).replace(/\\n/g, '\n');

    // Auto-fix if cover was shifted to type column
    if (entry.type && (entry.type.startsWith('http') || entry.type.includes('.jpg') || entry.type.includes('.png') || entry.type.includes('.webp'))) {
      if (!entry.cover) entry.cover = entry.type;
      entry.type = 'Video Musical';
    }

    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name || entry.name.toLowerCase().includes('spotify artist')) continue;
    if (isNonMusicOrForeign(entry.name)) continue;

    let videoId = '';
    try {
      const match = entry.url.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
      if (match) {
        videoId = match[1];
      } else if (entry.url.includes('v=')) {
        videoId = entry.url.split('v=')[1].split('&')[0];
      } else if (entry.url.includes('youtu.be/')) {
        videoId = entry.url.split('youtu.be/')[1].split('?')[0];
      }
    } catch (e) {}

    // Fallback thumbnail if missing
    if (!entry.cover && videoId) {
      entry.cover = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    if (!entry.type || entry.type === 'YouTube Auto-Sync' || entry.type === 'YouTube Auto HD') {
      entry.type = 'Video Musical';
    }

    entry.id = videoId || generateSlug(`${entry.artist}-${entry.name}`);
    music.push(entry as MusicItem);
  }
  return music;
}

async function getStoredLyrics(): Promise<any[]> {
  const TMP_LYRICS_FILE = '/tmp/lyrics.json';
  const SEED_LYRICS_FILE = path.join(process.cwd(), 'data', 'lyrics.json');
  const GS_LYRICS_URL = process.env.GS_LYRICS_URL || 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';

  // 1. Try fetching from Google Sheets (most up-to-date)
  try {
    // Apps Script a veces tarda mas de un minuto: si no responde rapido usamos la copia local
    const gsRes = await fetch(`${GS_LYRICS_URL}?action=list&secret=${GS_SYNC_SECRET()}&t=${Date.now()}`, { signal: AbortSignal.timeout(6000) });
    if (gsRes.ok) {
      const gsData = await gsRes.json();
      const gsList = Array.isArray(gsData) ? gsData : (gsData?.lyrics || gsData?.data || []);
      if (gsList.length > 0) {
        try { fs.writeFileSync(TMP_LYRICS_FILE, JSON.stringify({ lyrics: gsList })); } catch {}
        return gsList;
      }
    }
  } catch (e) {
    console.error("[getStoredLyrics] Google Sheets fetch error:", e);
  }

  // 2. Try /tmp
  try {
    if (fs.existsSync(TMP_LYRICS_FILE)) {
      const content = fs.readFileSync(TMP_LYRICS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : (data.lyrics || []);
    }
  } catch (e) {}

  // 3. Try repo seed
  try {
    if (fs.existsSync(SEED_LYRICS_FILE)) {
      const content = fs.readFileSync(SEED_LYRICS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : (data.lyrics || []);
    }
  } catch (e) {
    console.error("Error reading stored lyrics:", e);
  }
  return [];
}

async function fetchAllMusic(): Promise<MusicItem[]> {
  const dUrl = process.env.CSV_URL_DIOSMASGYM || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
  const jUrl = process.env.CSV_URL_JUAN614 || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';

  try {
    const [dCsv, jCsv] = await Promise.all([
      robustFetchText(dUrl),
      robustFetchText(jUrl)
    ]);
    return [...parseCSV(dCsv), ...parseCSV(jCsv)];
  } catch (e) {
    console.error("Error fetching/parsing CSVs in SSR:", e);
    return [];
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ── Metadatos de pagina para SSR ─────────────────────────────────────────────
// Sustituye la etiqueta si ya existe (en cualquier orden de atributos) y la anade
// si no. Antes cada ruta hacia sus propios replace y quedaban duplicados (og:type
// y twitter:* del index.html seguian apareciendo antes que los de la cancion).
function upsertMeta(src: string, attr: 'name' | 'property', key: string, value: string): string {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`<meta[^>]*\\s${attr}=["']${esc}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeXml(value)}">`;
  return rx.test(src) ? src.replace(rx, tag) : src.replace('</head>', `${tag}\n</head>`);
}

interface PageMeta {
  title: string;
  description: string;
  canonical: string | null;   // null = sin canonical (paginas noindex)
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  ogType?: string;
  robots?: string;
}

function applyPageMeta(html: string, m: PageMeta): string {
  const image = m.image || 'https://www.diosmasgym.com/api/og-image';
  const isGenerated = image.includes('/api/og-image');
  const imageType = isGenerated || /\.jpe?g(\?|$)/i.test(image) ? 'image/jpeg'
    : /\.webp(\?|$)/i.test(image) ? 'image/webp' : 'image/png';
  const width = m.imageWidth ?? (isGenerated ? 1200 : undefined);
  const height = m.imageHeight ?? (isGenerated ? 630 : undefined);

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(m.title)}</title>`);
  html = upsertMeta(html, 'name', 'description', m.description);
  html = upsertMeta(html, 'name', 'robots', m.robots || 'index, follow');

  html = html.replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, '');
  if (m.canonical) {
    html = html.replace('</head>', `<link rel="canonical" href="${escapeXml(m.canonical)}" />\n</head>`);
    html = upsertMeta(html, 'property', 'og:url', m.canonical);
  } else {
    html = html.replace(/<meta[^>]*property=["']og:url["'][^>]*>\s*/gi, '');
  }

  html = upsertMeta(html, 'property', 'og:title', m.title);
  html = upsertMeta(html, 'property', 'og:description', m.description);
  html = upsertMeta(html, 'property', 'og:type', m.ogType || 'website');
  html = upsertMeta(html, 'property', 'og:image', image);
  html = upsertMeta(html, 'property', 'og:image:secure_url', image);
  html = upsertMeta(html, 'property', 'og:image:type', imageType);
  if (width && height) {
    html = upsertMeta(html, 'property', 'og:image:width', String(width));
    html = upsertMeta(html, 'property', 'og:image:height', String(height));
  } else {
    // Sin medidas conocidas es mejor no anunciar las 1200x630 heredadas del index
    html = html.replace(/<meta[^>]*property=["']og:image:(width|height)["'][^>]*>\s*/gi, '');
  }
  html = upsertMeta(html, 'property', 'og:image:alt', m.imageAlt || m.title);

  // Imagen cuadrada -> tarjeta pequena; si no, se recortaria en la grande
  html = upsertMeta(html, 'name', 'twitter:card', width && width === height ? 'summary' : 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', m.title);
  html = upsertMeta(html, 'name', 'twitter:description', m.description);
  html = upsertMeta(html, 'name', 'twitter:image', image);
  return html;
}

// Descripcion limpia para meta description: sin saltos ni espacios dobles y
// cortada en una palabra completa.
function toMetaDescription(text: string, max = 158): string {
  const clean = (text || '').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Determine action from query or route
  const action = (req.query.action as string) || req.url?.split('?')[0].split('/').pop();

  // ── Rate limiting for expensive endpoints ──────────────────────────────────
  const costlyActions = ['youtube-top', 'youtube-descriptions', 'sheet-proxy', 'image-proxy', 'smartlink-ssr', 'smartlink', 'post-ssr', 'post'];
  if (costlyActions.includes(action || '')) {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }
  }

  // -------------------------------------------------------------
  // ACTION: IMAGE PROXY (Bypasses CORS for cover images & generator)
  // -------------------------------------------------------------
  if (action === 'image-proxy') {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Security: only allow known image CDN domains to prevent SSRF
    const ALLOWED_IMAGE_DOMAINS = [
      'i.ytimg.com', 'img.youtube.com', 'i1.sndcdn.com', 'i2.sndcdn.com', 'i3.sndcdn.com',
      'lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com',
      'blogger.googleusercontent.com', 'storage.googleapis.com', 'i.scdn.co',
      'mosaic.scdn.co', 'seeded-session-images.scdn.co', 'lineup-images.scdn.co',
      'is1-ssl.mzstatic.com', 'is2-ssl.mzstatic.com', 'is3-ssl.mzstatic.com',
      'resources.tidal.com', 'cdns-images.dzcdn.net'
    ];
    try {
      const parsedUrl = new URL(imageUrl);
      if (!ALLOWED_IMAGE_DOMAINS.some(d => parsedUrl.hostname.endsWith(d))) {
        return res.status(403).json({ error: 'Domain not allowed for proxy' });
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.status(200).send(buffer);
    } catch (error: any) {
      console.error('[image-proxy] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to proxy image', details: error.message });
    }
  }

  // debug-ssr endpoint removed from production for security

  // -------------------------------------------------------------
  // ACTION: YOUTUBE DESCRIPTIONS (para traer letras que el artista ya pego en la
  // descripcion de sus videos al subirlos, y no tener que copiarlas una por una)
  // -------------------------------------------------------------
  if (action === 'youtube-descriptions') {
    if (!verifyAdminPassword(req)) {
      return res.status(401).json({ success: false, message: 'No autorizado', descriptions: {} });
    }
    const apiKey = (process.env.BLOGGER_API_KEY || '').trim().replace(/^[\"']|[\"']$/g, '');
    if (!apiKey) {
      return res.status(200).json({ success: false, message: 'Falta configurar la API key de YouTube en el servidor', descriptions: {} });
    }
    const idsParam = String(req.query.ids || '');
    const ids = [...new Set(idsParam.split(',').map(s => s.trim()).filter(s => /^[\w-]{11}$/.test(s)))].slice(0, 200);
    if (ids.length === 0) {
      return res.status(200).json({ success: false, message: 'No se recibieron IDs de video validos', descriptions: {} });
    }
    try {
      const YT_HEADERS = {
        'Referer': 'https://www.diosmasgym.com/',
        'Origin': 'https://www.diosmasgym.com',
        'Accept': 'application/json',
      };
      const descriptions: Record<string, { title: string; description: string }> = {};
      const chunkSize = 50;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize).join(',');
        const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${chunk}&key=${apiKey}`;
        const vResp = await fetch(vUrl, { headers: YT_HEADERS });
        if (!vResp.ok) continue;
        const vData = await vResp.json();
        (vData.items || []).forEach((v: any) => {
          if (v.id) descriptions[v.id] = { title: v.snippet?.title || '', description: v.snippet?.description || '' };
        });
      }
      return res.status(200).json({ success: true, descriptions });
    } catch (err: any) {
      console.error('[youtube-descriptions] Error:', err);
      return res.status(200).json({ success: false, message: err.message, descriptions: {} });
    }
  }

  // -------------------------------------------------------------
  // ACTION: YOUTUBE TOP VIDEOS (server-side — bypasses API key referrer restriction)
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // ACTION: YOUTUBE TOP & HIDDEN GEMS VIDEOS (Official Music Songs Only)
  // -------------------------------------------------------------
  if (action === 'youtube-top') {
    const apiKey = (process.env.BLOGGER_API_KEY || '').trim().replace(/^[\"']|[\"']$/g, '');
    const YT_HEADERS = {
      'Referer': 'https://www.diosmasgym.com/',
      'Origin': 'https://www.diosmasgym.com',
      'Accept': 'application/json',
    };

    const CHANNELS = [
      { id: 'UCUgy7ZKVVaxAnrAXCnLG7EA', uploads: 'UUUgy7ZKVVaxAnrAXCnLG7EA', name: 'Diosmasgym', handle: '@diosmasgym' },
      { id: 'UC3PCx5tqomYtP_5Hrf7cXDQ', uploads: 'UU3PCx5tqomYtP_5Hrf7cXDQ', name: 'Juan 614', handle: '@juan614oficial' },
    ];

    const defaultDiosmasgymUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
    const defaultJuan614Url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';

    const formatViewsEs = (views: number): string => {
      if (views >= 1_000_000) {
        return `${(views / 1_000_000).toFixed(1).replace('.', ',')} M reproducciones`;
      }
      if (views >= 1_000) {
        const k = (views / 1_000).toFixed(1).replace('.0', '').replace('.', ',');
        return `${k} K reproducciones`;
      }
      return `${views} reproducciones`;
    };

    const parseDuration = (d: string): string => {
      if (!d) return '3:15';
      const match = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return '3:15';
      const h = parseInt(match[1] || '0', 10);
      const m = parseInt(match[2] || '0', 10);
      const s = parseInt(match[3] || '0', 10);
      const sStr = s < 10 ? `0${s}` : `${s}`;
      if (h > 0) {
        const mStr = m < 10 ? `0${m}` : `${m}`;
        return `${h}:${mStr}:${sStr}`;
      }
      return `${m}:${sStr}`;
    };

    // Non-music phrase detector for channel devotionals, sermons, talk videos, shorts
    const isDevotionalOrTalk = (title: string, desc: string): boolean => {
      const t = (title || '').toLowerCase();
      const d = (desc || '').toLowerCase();

      // If it has YouTube Music distributor signature, it's definitely a music release
      if (d.includes('provided to youtube by') || d.includes('auto-generated by youtube') || d.includes('℗')) {
        return false;
      }

      // Explicit non-music talk / devotional keywords
      const talkKeywords = [
        'semana santa', 'dia de la mujer', 'día de la mujer', 'compa, escucha',
        'consulta es gratis', 'terapeuta atiende', 'ayer llorando', 'no comes carne',
        'si le escribes', 'el dijo que estaría', 'identidad (therian)', 'reflexion',
        'reflexión', 'predica', 'prédica', 'mensaje de hoy', 'devocional', 'podcast',
        'consejo del dia', 'consejo del día', 'estudio biblico', 'oracion de la mañana',
        'oración de la noche', 'testimonio cristiano', 'habla con dios'
      ];

      if (talkKeywords.some(kw => t.includes(kw) || d.includes(kw))) {
        return true;
      }

      // If title is unusually long and contains pipe separators typical of YouTube SEO talk videos
      if (t.includes(' | ') && (t.includes('...') || t.length > 50)) {
        return true;
      }

      return false;
    };

    try {
      // 1. Fetch official music catalogs of Dios Mas Gym and Juan 614
      const [csvDios, csvJuan] = await Promise.allSettled([
        robustFetchText(process.env.CSV_URL_DIOSMASGYM || defaultDiosmasgymUrl),
        robustFetchText(process.env.CSV_URL_JUAN614 || defaultJuan614Url),
      ]);

      const musicDios = csvDios.status === 'fulfilled' ? parseCSV(csvDios.value) : [];
      const musicJuan = csvJuan.status === 'fulfilled' ? parseCSV(csvJuan.value) : [];
      const allMusicSongs = [...musicDios, ...musicJuan].filter(s => s && s.name && s.url && !isDevotionalOrTalk(s.name, ''));

      const knownAlbumMap: Record<string, string> = {
        'modo santo, modo pecado': 'Creyente o conveniente',
        'esa chulada': 'Estados Ocultos',
        'mira lo que hizo dios': '¡Ey menso !',
        'algún día te dije que no tendría alguien más que a ti': 'Me mueve el tapete',
        'algun dia te dije que no tendria alguien mas que a ti': 'Me mueve el tapete',
        '¿cómo se que me gusta ?': '¡Queria ser pastor!',
        '¿como se que me gusta?': '¡Queria ser pastor!',
        'donde han lastimado': 'Por fin LLEGUÉ',
        'funciona o no': 'Por fin LLEGUÉ',
        'esta es la voluntad de dios': 'Por fin LLEGUÉ',
        'me aceptó tal y como soy': 'Lo que no DIGO',
        'me acepto tal y como soy': 'Lo que no DIGO',
        'por fin llegué': 'Por fin LLEGUÉ',
        'por fin llegue': 'Por fin LLEGUÉ',
        'perdoname por no ser lo que esperabas': 'COMO EN LOS DIAS DE NOE',
        'perdóname por no ser lo que esperabas': 'COMO EN LOS DIAS DE NOE',
        'eres mía todavía': 'Alma en Frecuencia',
        'eres mia todavia': 'Alma en Frecuencia',
        'las mentiras': 'Ayer llorando por alguien y ho...',
        'borracho': 'Borracho',
        'de ateo a servirte': 'Alma en Frecuencia',
        'se fuerte y valiente': 'Quítame a esa mujer',
        'sé fuerte y valiente': 'Quítame a esa mujer',
      };

      const songMap: Record<string, any> = {};
      const videoIds: string[] = [];

      allMusicSongs.forEach((song, idx) => {
        let vid = '';
        try {
          const match = song.url.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
          if (match) vid = match[1];
          else if (song.url.includes('v=')) vid = song.url.split('v=')[1].split('&')[0];
          else if (song.url.includes('youtu.be/')) vid = song.url.split('youtu.be/')[1].split('?')[0];
        } catch {}

        if (vid && !songMap[vid]) {
          videoIds.push(vid);
          const isJuan = song.artist?.toLowerCase().includes('juan');
          const normTitle = song.name.toLowerCase().trim();
          const album = knownAlbumMap[normTitle] || song.album || 'Single';
          const estViews = Math.max(100, Math.floor(18000 / (idx + 1) + (idx % 9) * 320));

          songMap[vid] = {
            id: vid,
            title: song.name.replace(/\s*\(Video Oficial\)|\s*\(Audio Oficial\)|\s*\[Video Oficial\]|\s*\(Oficial\)/gi, '').trim(),
            rawTitle: song.name,
            artist: song.artist || (isJuan ? 'Juan 614' : 'Diosmasgym'),
            channel: song.artist || (isJuan ? 'Juan 614' : 'Diosmasgym'),
            thumb: song.cover || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${vid}`,
            album,
            views: estViews,
            viewsFormatted: formatViewsEs(estViews),
            duration: idx % 3 === 0 ? '3:25' : idx % 2 === 0 ? '3:04' : '2:58',
            likes: Math.floor(estViews * 0.08)
          };
        }
      });

      // 2. Fetch live YouTube stats for the user's exact catalog songs
      if (apiKey && videoIds.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < videoIds.length; i += chunkSize) {
          const chunk = videoIds.slice(i, i + chunkSize).join(',');
          const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${chunk}&key=${apiKey}`;
          const vResp = await fetch(vUrl, { headers: YT_HEADERS });
          if (!vResp.ok) continue;

          const vData = await vResp.json();
          (vData.items || []).forEach((v: any) => {
            const vid = v.id;
            if (!vid || !songMap[vid]) return;

            const views = parseInt(v.statistics?.viewCount || '0', 10);
            const likes = parseInt(v.statistics?.likeCount || '0', 10);
            const duration = parseDuration(v.contentDetails?.duration || '');

            songMap[vid].views = views;
            songMap[vid].viewsFormatted = formatViewsEs(views);
            songMap[vid].duration = duration;
            songMap[vid].likes = likes;
            if (v.snippet?.thumbnails?.high?.url) {
              songMap[vid].thumb = v.snippet.thumbnails.high.url;
            }
          });
        }
      }

      const allVideos = Object.values(songMap);

      // Top 50: Sorted descending by viewCount
      const top50 = [...allVideos].sort((a: any, b: any) => b.views - a.views).slice(0, 50);

      // Joyas Ocultas: Filtered for music tracks with lower views, sorted ascending
      const hiddenGems = [...allVideos]
        .sort((a: any, b: any) => a.views - b.views)
        .slice(0, 25);

      res.setHeader('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=86400');
      return res.status(200).json({
        success: true,
        total: allVideos.length,
        items: top50,
        top: top50,
        hiddenGems: hiddenGems
      });
    } catch (err: any) {
      console.error('[youtube-top] Error:', err);
      return res.status(200).json({ success: false, items: [], top: [], hiddenGems: [] });
    }
  }

  // -------------------------------------------------------------
  // ACTION: LINKS
  // -------------------------------------------------------------
  if (action === 'links') {
    const artist = req.query.artist as string;
    const isJuan = artist === 'juan614';
    const fileName = isJuan ? 'links_juan614.json' : 'links.json';
    const TMP_LINKS_FILE = path.join('/tmp', fileName);
    const SEED_LINKS_FILE = path.join(process.cwd(), 'data', fileName);
    // Utilizamos un GS_LINKS_URL separado o reutilizamos el de lyrics si el usuario configura su Apps Script para manejar "action=save-links"
    const GS_LINKS_URL = process.env.GS_LINKS_URL || process.env.GS_LYRICS_URL || 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';

    const defaultProfile = isJuan ? {
      name: "Juan 614",
      bio: "Corridos, banda sinaloense y calle con propósito",
      avatar: "/logo-juan614-v2.png"
    } : { 
      name: "Dios Mas Gym", 
      bio: "El Arsenal de Fe | Música, Disciplina y Transformación", 
      avatar: "/logo-diosmasgym.png" 
    };

    const readLinksFromDisk = () => {
      try {
        if (fs.existsSync(TMP_LINKS_FILE)) {
          return JSON.parse(fs.readFileSync(TMP_LINKS_FILE, 'utf-8'));
        }
      } catch {}
      try {
        if (fs.existsSync(SEED_LINKS_FILE)) {
          return JSON.parse(fs.readFileSync(SEED_LINKS_FILE, 'utf-8'));
        }
      } catch {}
      return { links: [], profile: defaultProfile };
    };

    if (req.method === 'GET') {
      const isRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
      const cacheHeader = isRefresh ? 'no-store, max-age=0' : 'public, s-maxage=300, stale-while-revalidate=3600';
      try {
        // 1. Try fetching from Google Sheets (most up-to-date)
        if (GS_LINKS_URL) {
          try {
            // Sin limite, Apps Script llego a tardar 71 s y la bio se quedaba cargando
            const gsRes = await fetch(`${GS_LINKS_URL}?action=list-links&artist=${isJuan ? 'juan614' : 'diosmasgym'}&t=${Date.now()}`, { signal: AbortSignal.timeout(6000) });
            if (gsRes.ok) {
              const gsData = await gsRes.json();
              if (gsData && gsData.links) {
                // Cache in /tmp
                try { fs.writeFileSync(TMP_LINKS_FILE, JSON.stringify(gsData, null, 2)); } catch {}
                res.setHeader('Cache-Control', cacheHeader);
                return res.status(200).json(gsData);
              }
            }
          } catch (e) {
            console.error('[links GET] Google Sheets fetch error:', e);
          }
        }
        
        // 2. Fallback to /tmp or seed
        const localData = readLinksFromDisk();
        res.setHeader('Cache-Control', cacheHeader);
        return res.status(200).json(localData);
      } catch (error) {
        return res.status(500).json({ error: 'Error reading links' });
      }
    }

    if (req.method === 'POST') {
      if (!verifyAdminPassword(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin password required' });
      }
      try {
        const data = req.body;
        
        // 1. Save to /tmp
        try {
          fs.writeFileSync(TMP_LINKS_FILE, JSON.stringify(data, null, 2));
        } catch (e) {
          console.error('[links POST] /tmp write error:', e);
        }

        // 2. Sync to Google Sheets
        if (GS_LINKS_URL) {
          try {
            await fetch(GS_LINKS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ 
                action: 'save-links', 
                artist: isJuan ? 'juan614' : 'diosmasgym',
                data: data 
              })
            });
          } catch (e) {
            console.error('[links POST] Google Sheets sync error:', e);
          }
        }

        return res.status(200).json({ success: true, message: "Saved locally and synced to GS" });
      } catch (error) {
        return res.status(500).json({ error: 'Error saving links' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // -------------------------------------------------------------
  // ACTION: LYRICS (Gestión nativa y almacenamiento directo de letras)
  // -------------------------------------------------------------
  if (action === 'lyrics') {
    // On Vercel, process.cwd() is read-only. Use /tmp for writable storage.
    // Google Sheets acts as the persistent store; /tmp is the per-instance cache.
    const TMP_LYRICS_FILE = '/tmp/lyrics.json';
    const SEED_LYRICS_FILE = path.join(process.cwd(), 'data', 'lyrics.json');
    const GS_LYRICS_URL = process.env.GS_LYRICS_URL || 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';

    const readLyricsFromDisk = (): any[] => {
      // 1. Try /tmp (fast cache for this instance)
      try {
        if (fs.existsSync(TMP_LYRICS_FILE)) {
          const raw = JSON.parse(fs.readFileSync(TMP_LYRICS_FILE, 'utf-8'));
          return Array.isArray(raw) ? raw : (raw.lyrics || []);
        }
      } catch {}
      // 2. Fall back to seed file committed in repo (read-only, but readable)
      try {
        if (fs.existsSync(SEED_LYRICS_FILE)) {
          const raw = JSON.parse(fs.readFileSync(SEED_LYRICS_FILE, 'utf-8'));
          return Array.isArray(raw) ? raw : (raw.lyrics || []);
        }
      } catch {}
      return [];
    };

    const writeLyricsToDisk = (lyrics: any[]) => {
      try {
        // Save to /tmp (needed for Vercel functions compatibility)
        fs.writeFileSync(TMP_LYRICS_FILE, JSON.stringify({ lyrics }, null, 2));
        
        // If we are running locally (not on Vercel), save permanently to data/lyrics.json
        if (!process.env.VERCEL) {
          const localPath = path.join(process.cwd(), 'data', 'lyrics.json');
          fs.writeFileSync(localPath, JSON.stringify({ lyrics }, null, 2));
          console.log('[lyrics] Letra guardada permanentemente en local:', localPath);
        }
      } catch (e) {
        console.error('[lyrics] write error:', e);
      }
    };

    if (req.method === 'GET') {
      const isRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
      // Cache corta: con 1h (+24h stale) una letra recien guardada no aparecia en /letra/:id
      // hasta horas despues (el HTML del servidor la mostraba y al hidratar desaparecia).
      const cacheHeader = isRefresh ? 'no-store, max-age=0' : 'public, s-maxage=60, stale-while-revalidate=300';
      try {
        // 1. Try to fetch from CSV_URL_LYRICS (separate published tab)
        const CSV_URL_LYRICS = process.env.CSV_URL_LYRICS;
        if (CSV_URL_LYRICS) {
          try {
            const fetchUrl = `${CSV_URL_LYRICS}${CSV_URL_LYRICS.includes('?') ? '&' : '?'}t=${Date.now()}`;
            const csvData = await robustFetchText(fetchUrl);
            const parsedItems = parseCSV(csvData);
            const lyricsFromCsv = parsedItems
              .filter(item => item.lyrics && item.lyrics.trim().length > 0)
              .map(item => ({
                id: item.id,
                title: item.name,
                artist: item.artist,
                content: item.lyrics,
                date: item.date || new Date().toISOString(),
                status: 'LIVE'
              }));
              
            if (lyricsFromCsv.length > 0) {
              writeLyricsToDisk(lyricsFromCsv);
              res.setHeader('Cache-Control', cacheHeader);
              return res.status(200).json({ lyrics: lyricsFromCsv });
            }
          } catch (csvErr) {
            console.error('[lyrics GET] CSV fetch error:', csvErr);
          }
        }

        // 2. Try to fetch from Google Sheets Apps Script (GS_LYRICS_URL)
        if (GS_LYRICS_URL) {
          try {
            const gsRes = await fetch(`${GS_LYRICS_URL}?action=list&secret=${GS_SYNC_SECRET()}&t=${Date.now()}`, { signal: AbortSignal.timeout(8000) });
            if (gsRes.ok) {
              const gsData = await gsRes.json();
              const gsList = Array.isArray(gsData) ? gsData : (gsData?.lyrics || gsData?.data || []);
              if (gsList.length > 0) {
                // Cache in /tmp for subsequent calls in this instance
                writeLyricsToDisk(gsList);
                res.setHeader('Cache-Control', cacheHeader);
                return res.status(200).json({ lyrics: gsList });
              }
            }
          } catch (gsErr) {
            console.error('[lyrics GET] Google Sheets fetch error:', gsErr);
          }
        }
        // Fallback to /tmp or seed file
        const lyricsList = readLyricsFromDisk();
        res.setHeader('Cache-Control', cacheHeader);
        return res.status(200).json({ lyrics: lyricsList });
      } catch (error: any) {
        return res.status(500).json({ error: 'Error reading lyrics', details: error.message });
      }
    }

    if (req.method === 'POST') {
      if (!verifyAdminPassword(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin password required' });
      }
      try {
        let bodyData = req.body;
        if (typeof bodyData === 'string') {
          try { bodyData = JSON.parse(bodyData); } catch {}
        }

        let currentLyrics = readLyricsFromDisk();

        if (Array.isArray(bodyData)) {
          currentLyrics = bodyData;
        } else if (bodyData && Array.isArray(bodyData.lyrics)) {
          currentLyrics = bodyData.lyrics;
        } else if (bodyData && (bodyData.title || bodyData.id)) {
          const lyricItem = {
            id: bodyData.id || generateSlug(`${bodyData.artist || 'Dios Mas Gym'}-${bodyData.title}`),
            title: bodyData.title || 'Sin título',
            artist: bodyData.artist || 'Dios Mas Gym',
            content: bodyData.content || bodyData.lyrics || '',
            date: bodyData.date || new Date().toISOString(),
            status: bodyData.status || 'LIVE'
          };
          const existingIdx = currentLyrics.findIndex(l => l.id === lyricItem.id || generateSlug(l.title) === generateSlug(lyricItem.title));
          if (existingIdx >= 0) {
            currentLyrics[existingIdx] = { ...currentLyrics[existingIdx], ...lyricItem };
          } else {
            currentLyrics.unshift(lyricItem);
          }
        }

        // Save to /tmp (fast, for this instance)
        writeLyricsToDisk(currentLyrics);

        // Sync to Google Sheets (primary persistent store — AWAIT to ensure it saves).
        // /tmp es solo cache por instancia de Vercel: si esta sincronizacion falla en silencio,
        // la letra "se guarda" un momento pero desaparece en la siguiente peticion (otra instancia
        // sin ese /tmp) porque nunca quedo en el almacen persistente real.
        if (GS_LYRICS_URL) {
          try {
            const saveTitle = (bodyData && (bodyData.title || bodyData.name)) || '';
            const saveArtist = (bodyData && bodyData.artist) || 'Diosmasgym';
            const saveContent = (bodyData && (bodyData.content || bodyData.lyrics)) || '';

            if (saveTitle && saveContent) {
              const queryString = new URLSearchParams({
                action: 'save',
                secret: GS_SYNC_SECRET(),
                title: saveTitle,
                artist: saveArtist
              }).toString();

              const gsSaveRes = await fetch(`${GS_LYRICS_URL}${GS_LYRICS_URL.includes('?') ? '&' : '?'}${queryString}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'save',
                  secret: GS_SYNC_SECRET(),
                  title: saveTitle,
                  artist: saveArtist,
                  content: saveContent,
                  date: new Date().toISOString()
                })
              });
              const gsRawBody = await gsSaveRes.text();
              let gsBody: any = null;
              try { gsBody = JSON.parse(gsRawBody); } catch { /* respuesta de texto plano */ }
              const gsRejected = !gsSaveRes.ok || (gsBody && (gsBody.error || gsBody.success === false || gsBody.status === 'error'));

              if (gsRejected) {
                console.error('[lyrics POST] Google Sheets rechazo la sincronizacion:', gsSaveRes.status, gsRawBody.slice(0, 300));
                return res.status(200).json({
                  success: true,
                  syncedToSheets: false,
                  message: 'Se guardó solo en la caché temporal del servidor: Google Sheets rechazó la sincronización, así que puede no quedar guardada de verdad. Reintenta o revisa el Apps Script de letras.',
                  sheetsError: gsBody?.error || gsBody?.message || `Google Sheets respondió ${gsSaveRes.status}`,
                  lyrics: currentLyrics
                });
              }
            }
          } catch (gsErr: any) {
            console.error('[lyrics POST] Google Sheets sync error:', gsErr);
            return res.status(200).json({
              success: true,
              syncedToSheets: false,
              message: 'Se guardó solo en la caché temporal del servidor: no se pudo contactar Google Sheets, así que puede no quedar guardada de verdad. Reintenta en unos segundos.',
              sheetsError: gsErr?.message || String(gsErr),
              lyrics: currentLyrics
            });
          }
        }

        return res.status(200).json({ success: true, syncedToSheets: true, message: 'Letra guardada correctamente en el sitio web', lyrics: currentLyrics });
      } catch (error: any) {
        return res.status(500).json({ error: 'Error saving lyrics', details: error.message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }


  // -------------------------------------------------------------
  // ACTION: MUSIC
  // -------------------------------------------------------------
  if (action === 'music') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const artist = req.query.artist as string;
    const refresh = req.query.refresh;

    if (!artist) {
      return res.status(400).json({ error: 'Artist parameter is required' });
    }

    let csvUrl = '';
    const defaultDiosmasgymUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
    const defaultJuan614Url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';

    if (artist.toLowerCase() === 'diosmasgym') {
      const rawUrl = process.env.CSV_URL_DIOSMASGYM;
      csvUrl = rawUrl ? rawUrl.trim().replace(/^["']|["']$/g, '') : defaultDiosmasgymUrl;
      if (!csvUrl || !csvUrl.startsWith('http')) csvUrl = defaultDiosmasgymUrl;
    } else if (artist.toLowerCase() === 'juan614') {
      const rawUrl = process.env.CSV_URL_JUAN614;
      csvUrl = rawUrl ? rawUrl.trim().replace(/^["']|["']$/g, '') : defaultJuan614Url;
      if (!csvUrl || !csvUrl.startsWith('http')) csvUrl = defaultJuan614Url;
    } else {
      return res.status(404).json({ error: 'Artist not found' });
    }

    try {
      const fetchUrl = refresh 
        ? `${csvUrl}${csvUrl.includes('?') ? '&' : '?'}t=${Date.now()}` 
        : csvUrl;
      console.log(`[api/common/music] Fetching music for ${artist} from: ${fetchUrl}`);
      const csvData = await robustFetchText(fetchUrl);
      
      if (refresh) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
      }
      
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csvData);
    } catch (error: any) {
      console.error(`Error fetching music for ${artist}:`, error);
      
      // FALLBACK GRACIOSO: Si falla la descarga personalizada, intentamos servir el CSV por defecto
      try {
        console.warn(`[api/common/music] Attempting fallback fetch for ${artist} using default public sheet...`);
        const fallbackUrl = artist.toLowerCase() === 'diosmasgym' ? defaultDiosmasgymUrl : defaultJuan614Url;
        const csvData = await robustFetchText(fallbackUrl);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/csv');
        return res.status(200).send(csvData);
      } catch (fallbackErr: any) {
        console.error(`[api/common/music] Fallback fetch also failed:`, fallbackErr);
      }

      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // -------------------------------------------------------------
  // ACTION: MAINTENANCE
  // -------------------------------------------------------------
  if (action === 'maintenance') {
    const CONFIG_FILE = path.join(process.cwd(), 'data', 'maintenance.json');
    const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

    if (req.method === 'GET') {
      try {
        const response = await fetch(`${CLOUD_URL}?read=true&t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
        if (response.ok) {
          const rows = await response.json();
          const configRows = rows.filter((r: any) => r.Artista === 'CONFIG_MAINTENANCE');
          if (configRows.length > 0) {
            const lastConfig = configRows[configRows.length - 1];
            // Cache corta en el CDN: la portada consulta esto en cada visita y
            // Apps Script tarda segundos; un cambio tarda como mucho ~30 s en verse
            res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
            return res.status(200).json({
              enabled: lastConfig.name === 'true' || lastConfig.name === true,
              videoUrl: lastConfig.audioUrl || '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
            });
          }
        }
      } catch (err) {
        console.warn("[api/common/maintenance] Google Sheet GET failed, falling back to local file:", err);
      }

      try {
        if (!fs.existsSync(CONFIG_FILE)) {
          return res.status(200).json({
            enabled: false,
            videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
          });
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        // Tambien en el respaldo: si Apps Script esta lento, no repetir la espera en cada visita
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
        return res.status(200).json(JSON.parse(data));
      } catch (error) {
        return res.status(500).json({ error: 'Error reading maintenance configuration' });
      }
    }

    if (req.method === 'POST') {
      if (!verifyAdminPassword(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin password required' });
      }
      
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {}
      }
      const { enabled, videoUrl } = body || {};
      const configData = {
        enabled: !!enabled,
        videoUrl: videoUrl || '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
      };

      let cloudSuccess = false;
      let cloudErrorMsg = '';

      try {
        const params = new URLSearchParams();
        params.append('Artista', 'CONFIG_MAINTENANCE');
        params.append('name', configData.enabled ? 'true' : 'false');
        params.append('audioUrl', configData.videoUrl);
        params.append('releaseDate', new Date().toISOString().split('T')[0]);

        const response = await fetch(CLOUD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        if (response.ok) {
          cloudSuccess = true;
        } else {
          cloudErrorMsg = `Google Sheet response status ${response.status}`;
        }
      } catch (err: any) {
        cloudErrorMsg = err.message || String(err);
      }

      try {
        const dir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2));
      } catch (localErr) {
        if (!cloudSuccess) {
          console.error("Both cloud (Google Sheets) and local writes failed:", localErr);
          return res.status(500).json({ 
            error: 'Error saving maintenance configuration', 
            details: `Cloud failed: ${cloudErrorMsg}. Local failed: ${(localErr as any).message}` 
          });
        }
      }

      return res.status(200).json({ success: true, message: 'Maintenance configuration saved successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // -------------------------------------------------------------
  // ACTION: TESTIMONIOS (envío público moderado)
  // Los envíos se guardan en la hoja como CONFIG_TESTIMONIO_PENDIENTE (el prefijo
  // CONFIG_ hace que los lanzamientos los ignoren). Para publicar uno, cambia esa
  // celda "Artista" a CONFIG_TESTIMONIO en la hoja.
  // -------------------------------------------------------------
  if (action === 'testimonios') {
    const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

    if (req.method === 'GET') {
      // Si Apps Script falla o tarda, se sirve lo ultimo bueno (o vacio) con cache
      // corta, para no hacer esperar ~6 s a cada visitante.
      const serveFallback = () => {
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
        return res.status(200).json(lastTestimonios || []);
      };
      try {
        const response = await fetch(`${CLOUD_URL}?read=true&t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
        if (!response.ok) return serveFallback();
        const rows = await response.json();
        const items = (Array.isArray(rows) ? rows : [])
          .filter((r: any) => r.Artista === 'CONFIG_TESTIMONIO' && r.name)
          .map((r: any, i: number) => {
            const [author, location] = String(r.audioUrl || '').split('||');
            return {
              id: i + 1,
              text: String(r.name).slice(0, 800),
              name: (author || 'Anónimo').slice(0, 60),
              location: (location || '').slice(0, 80)
            };
          })
          .reverse();
        lastTestimonios = items;
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
        return res.status(200).json(items);
      } catch {
        return serveFallback();
      }
    }

    if (req.method === 'POST') {
      if (!checkTestimonioLimit(getClientIp(req))) {
        return res.status(429).json({ error: 'Demasiados envíos. Intenta más tarde.' });
      }
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const clean = (v: any, max: number) => String(v ?? '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
      // Campo trampa para bots: si viene lleno, fingimos éxito sin guardar
      if (body?.website) return res.status(200).json({ success: true });

      const name = clean(body?.name, 60);
      const location = clean(body?.location, 80);
      const text = clean(body?.text, 800);
      if (!name || text.length < 50) {
        return res.status(400).json({ error: 'Escribe tu nombre y un testimonio de al menos 50 caracteres.' });
      }
      if (/https?:\/\/|www\./i.test(text + name + location)) {
        return res.status(400).json({ error: 'Por favor no incluyas enlaces.' });
      }

      try {
        const params = new URLSearchParams();
        params.append('Artista', 'CONFIG_TESTIMONIO_PENDIENTE');
        params.append('name', text);
        params.append('audioUrl', `${name}||${location}`);
        params.append('releaseDate', new Date().toISOString().split('T')[0]);
        const response = await fetch(CLOUD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        if (!response.ok) throw new Error(`Sheet status ${response.status}`);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('[api/common/testimonios] save failed:', err);
        return res.status(500).json({ error: 'No pudimos guardar tu testimonio. Intenta de nuevo.' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // -------------------------------------------------------------
  // ACTION: SHEET PROXY
  // -------------------------------------------------------------
  if (action === 'sheet-proxy') {
    try {
      const script = (req.query.script as string) || 'main';
      const GS_MAIN_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
      const GS_LYRICS_URL = 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';
      const GS_ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';

      let url = GS_MAIN_URL;
      if (script === 'lyrics') url = GS_LYRICS_URL;
      else if (script === 'analytics') url = GS_ANALYTICS_URL;

      if (script === 'lyrics' && !verifyAdminPassword(req)) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      if (req.method === 'POST') {
        // Parse body — same pattern as the working maintenance handler
        let bodyData: Record<string, string> = {};
        if (typeof req.body === 'string') {
          try { bodyData = JSON.parse(req.body); } catch {}
        } else if (req.body && typeof req.body === 'object') {
          bodyData = req.body as Record<string, string>;
        }

        let fetchOptions: RequestInit = {
          method: 'POST',
          redirect: 'follow',
        };

        if (script === 'lyrics') {
          bodyData.secret = GS_SYNC_SECRET();
          fetchOptions.headers = { 'Content-Type': 'text/plain' };
          fetchOptions.body = JSON.stringify(bodyData);
          console.log('[sheet-proxy] POSTing JSON payload to Apps Script (text/plain)');
        } else {
          const params = new URLSearchParams();
          Object.entries(bodyData).forEach(([k, v]) => params.append(k, String(v ?? '')));
          fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
          fetchOptions.body = params.toString();
          console.log('[sheet-proxy] POSTing to Apps Script with params:', params.toString());
        }

        const resp = await fetch(url, fetchOptions);

        console.log('[sheet-proxy] Apps Script response status:', resp.status);
        const respText = await resp.text();
        console.log('[sheet-proxy] Apps Script response body:', respText.substring(0, 200));

        try {
          return res.status(200).json(JSON.parse(respText));
        } catch {
          return res.status(200).send(respText);
        }
      } else {
        // GET read: pass query params as-is
        const q = { ...req.query } as Record<string, string>;
        const hasNoCache = !!q.nocache;
        delete q.script;
        delete q.action;
        if (script === 'lyrics') {
          q.secret = GS_SYNC_SECRET();
          res.setHeader('Cache-Control', 'no-store');
        }
        const qs = new URLSearchParams(q).toString();
        if (qs) url += `?${qs}`;

        const resp = await fetch(url, { method: 'GET', redirect: 'follow' });

        if (script === 'lyrics') {
          // sin cache: la respuesta es privada del admin
        } else if (hasNoCache) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        }

        const ct = resp.headers.get('content-type');
        if (ct?.includes('application/json')) {
          return res.status(200).json(await resp.json());
        } else {
          return res.status(200).send(await resp.text());
        }
      }
    } catch (err: any) {
      console.error('[sheet-proxy] Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // ACTION: VERIFY PASSWORD
  // -------------------------------------------------------------
  if (action === 'verify-password') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let { password } = req.body || {};
    
    if (!password && typeof req.body === 'string') {
      try {
        password = JSON.parse(req.body).password;
      } catch {}
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const loginIp = getClientIp(req);
    if (loginBlocked(loginIp)) {
      res.setHeader('Retry-After', '900');
      return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera 15 minutos.' });
    }

    const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
    const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');
    const INPUT_KEY = String(password).trim();

    if (!MASTER_KEY) {
      console.error("ADMIN_PASSWORD is not defined in environment variables.");
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    if (timingSafeCompare(INPUT_KEY, MASTER_KEY)) {
      return res.status(200).json({ success: true, message: 'Authenticated successfully' });
    } else {
      registerLoginFail(loginIp);
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
  }

  // -------------------------------------------------------------
  // ACTION: HEALTH CHECK
  // -------------------------------------------------------------
  if (action === 'health') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({
      status: 'healthy',
      version: '5.0.9',
      timestamp: new Date().toISOString()
    });
  }

  // -------------------------------------------------------------
  // ACTION: ARSENAL (Blogger Posts)
  // -------------------------------------------------------------
  if (action === 'arsenal') {
    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (req.method === 'POST') {
      try {
        const { title, content, labels, isDraft } = req.body || {};
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ error: 'Authentication required for POST' });

        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/?isDraft=${isDraft ? 'true' : 'false'}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'blogger#post', blog: { id: blogId }, title, content, labels })
        });
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }

    const maxResults = req.query.maxResults || '10';
    const pageToken = req.query.pageToken ? `&pageToken=${req.query.pageToken}` : '';
    const q = req.query.q ? `&q=${encodeURIComponent(req.query.q as string)}` : '';
    const labels = req.query.labels ? `&labels=${encodeURIComponent(req.query.labels as string)}` : '';
    const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=${maxResults}${pageToken}${q}${labels}&fetchBodies=true&fetchImages=true`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // -------------------------------------------------------------
  // ACTION: UPLOAD PROMO (ImgBB)
  // -------------------------------------------------------------
  if (action === 'upload-promo') {
    if (!verifyAdminPassword(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin password required' });
    }
    try {
      const { base64Data } = req.body || {};
      if (!base64Data) return res.status(400).json({ error: 'No image data provided' });
      const b64 = String(base64Data).replace(/^data:image\/\w+;base64,/, '');
      const imgbbKey = (process.env.IMGBB_API_KEY || "6d207e02198a847aa98d0a2a901485a5").trim();
      const params = new URLSearchParams();
      params.append('key', imgbbKey);
      params.append('image', b64);
      const imgbbRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: params });
      const imgbbJson = await imgbbRes.json() as any;
      if (imgbbJson.success) {
        return res.status(200).json({ url: imgbbJson.data.url });
      }
      return res.status(500).json({ error: 'ImgBB rejected the image', details: imgbbJson });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }

  // -------------------------------------------------------------
  // ACTION: SEARCH LYRICS (Gemini Grounding)
  // -------------------------------------------------------------
  if (action === 'search-lyrics') {
    if (!verifyAdminPassword(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin password required' });
    }
    const { name, artist } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Falta el nombre de la canción.' });
    const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    const modelName = 'gemini-2.5-flash';
    const promptText = `Busca en internet la letra exacta y oficial de la canción "${name}" del artista "${artist || 'Dios Mas Gym'}". Devuelve ÚNICAMENTE la letra de la canción organizada en estrofas.`;

    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          tools: [{ googleSearch: {} }]
        })
      });
      const data = await resp.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return res.status(200).json({ lyrics: data.candidates[0].content.parts[0].text.trim() });
      }
      return res.status(500).json({ error: 'No se pudo recuperar la letra.', details: data });
    } catch (e: any) {
      return res.status(500).json({ error: 'Error al buscar la letra', details: e.message });
    }
  }

  // -------------------------------------------------------------
  // ACTION: SITEMAP
  // -------------------------------------------------------------
  if (action === 'sitemap' || action === 'sitemap.xml') {
    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');
    const BASE = 'https://www.diosmasgym.com';
    const today = new Date().toISOString().split('T')[0];

    const urlBlock = (loc: string, lastmod: string, changefreq: string, priority: string) =>
      `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;

    const sub = req.query.sub as string | undefined;

    // --- SUB-SITEMAP: SONGS ---
    if (sub === 'songs') {
      let songs: MusicItem[] = [];
      try { songs = await fetchAllMusic(); } catch (e) { console.error('songs fetch error', e); }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
      
      // Static pages in the songs sitemap
      // /bio no va: su canonical es /bio/diosmasgym
      xml += urlBlock(`${BASE}/`, today, 'daily', '1.0');
      xml += urlBlock(`${BASE}/bio/diosmasgym`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/bio/juan614`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/testimonios`, today, 'monthly', '0.7');
      xml += urlBlock(`${BASE}/catalogo`, today, 'daily', '0.9');
      xml += urlBlock(`${BASE}/buscar`, today, 'weekly', '0.6');

      songs.forEach(song => {
        if (!song.id) return;
        const lastmod = song.date ? song.date.split('T')[0] : today;
        xml += urlBlock(`${BASE}/link/${song.id}`, lastmod, 'weekly', '0.8');
      });
      xml += `</urlset>`;
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(xml);
    }

    // --- SUB-SITEMAP: LYRICS (Indexación especializada de letras) ---
    if (sub === 'lyrics') {
      let songs: MusicItem[] = [];
      let storedLyrics: any[] = [];
      try { 
        songs = await fetchAllMusic(); 
        storedLyrics = await getStoredLyrics();
      } catch (e) { 
        console.error('lyrics sitemap fetch error', e); 
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      const seenSlugs = new Set<string>();

      // Solo publicamos en el sitemap las canciones que REALMENTE tienen letra.
      // Antes se listaba el catálogo entero (~995 URLs) y el 93% eran soft 404.
      const MIN_LYRIC_LENGTH = 50;
      const hasLyricText = (t: any) => typeof t === 'string' && t.trim().length >= MIN_LYRIC_LENGTH;

      const availableLyricSlugs = new Set<string>();
      storedLyrics.forEach(item => {
        if (!item || !hasLyricText(item.content)) return;
        if (item.id) availableLyricSlugs.add(generateSlug(String(item.id)));
        if (item.title) availableLyricSlugs.add(generateSlug(String(item.title)));
      });

      // Canciones del catálogo con letra propia o con letra guardada asociada
      songs.forEach(song => {
        const slug = generateSlug(song.name) || song.id;
        if (!slug || seenSlugs.has(slug)) return;
        const idSlug = song.id ? generateSlug(String(song.id)) : '';
        const hasLyric = hasLyricText(song.lyrics) || availableLyricSlugs.has(slug) || (!!idSlug && availableLyricSlugs.has(idSlug));
        if (!hasLyric) return;
        seenSlugs.add(slug);
        const lastmod = song.date ? song.date.split('T')[0] : today;
        xml += urlBlock(`${BASE}/letra/${slug}`, lastmod, 'weekly', '0.9');
      });

      // Letras guardadas que no están en el catálogo
      storedLyrics.forEach(item => {
        if (!item || !hasLyricText(item.content)) return;
        const slug = item.id ? generateSlug(String(item.id)) : generateSlug(String(item.title || ''));
        if (!slug || seenSlugs.has(slug)) return;
        seenSlugs.add(slug);
        const lastmod = item.date ? item.date.split('T')[0] : today;
        xml += urlBlock(`${BASE}/letra/${slug}`, lastmod, 'weekly', '0.9');
      });

      xml += `</urlset>`;
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(xml);
    }

    // --- SUB-SITEMAP: POSTS (paginated through ALL Blogger posts if configured) ---
    if (sub === 'posts') {
      if (!apiKey) {
        res.setHeader('Content-Type', 'application/xml');
        return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
      }

      const allItems: any[] = [];
      let pageToken: string | null = null;
      let page = 0;
      const MAX_PAGES = 20;

      do {
        try {
          const pageUrl = new URL(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`);
          pageUrl.searchParams.set('key', apiKey);
          pageUrl.searchParams.set('maxResults', '150');
          pageUrl.searchParams.set('status', 'LIVE');
          pageUrl.searchParams.set('fields', 'items(url,updated,published),nextPageToken');
          if (pageToken) pageUrl.searchParams.set('pageToken', pageToken);

          const resp = await fetch(pageUrl.toString(), {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Vercel-Server-Function' }
          });
          if (!resp.ok) break;
          const data = await resp.json();
          allItems.push(...(data.items || []));
          pageToken = data.nextPageToken || null;
          page++;
        } catch (e) {
          console.error('Blogger pagination error', e);
          break;
        }
      } while (pageToken && page < MAX_PAGES);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      // Static pages
      xml += urlBlock(`${BASE}/`, today, 'daily', '1.0');
      xml += urlBlock(`${BASE}/bio`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/bio/diosmasgym`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/bio/juan614`, today, 'weekly', '0.8');
      // All blog posts
      allItems.forEach((item: any) => {
        const slug = (item.url || '').split('/').pop()?.replace('.html', '') || '';
        if (!slug) return;
        const lastmod = item.updated ? item.updated.split('T')[0] : (item.published ? item.published.split('T')[0] : today);
        xml += urlBlock(`${BASE}/post/${slug}`, lastmod, 'weekly', '0.7');
      });
      xml += `</urlset>`;
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(xml);
    }

    // --- SITEMAP INDEX (main /sitemap.xml) ---
    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE}/sitemap.xml?sub=songs</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE}/sitemap.xml?sub=lyrics</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
    // sub=posts ya no se anuncia: sin BLOGGER_API_KEY solo repetia las paginas
    // fijas, y con ella listaria /post/... que el sitio ya no sirve.

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(sitemapIndex);
  }

  // -------------------------------------------------------------
  // ACTION: DAILY-POST (estado compartido de "Publicacion Rapida del Dia": saltos y usadas)
  // Se guarda en Vercel Blob para que la PC y el celular vean la misma cancion.
  // -------------------------------------------------------------
  if (action === 'daily-post') {
    if (!verifyAdminPassword(req)) return res.status(401).json({ error: 'No autorizado' });
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(501).json({ error: 'Almacenamiento no configurado (falta BLOB_READ_WRITE_TOKEN)' });
    }
    const STATE_PATH = 'state/daily-post.json';
    const empty = { day: '', skips: 0, promoted: [] as string[] };
    // La tienda de Blob puede ser publica o privada: probamos ambas.
    const accessModes: Array<'private' | 'public'> = ['private', 'public'];
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      for (const access of accessModes) {
        try {
          const r: any = await blobGet(STATE_PATH, { access, useCache: false });
          if (r && r.statusCode === 200 && r.stream) {
            const text = await new Response(r.stream).text();
            return res.status(200).json({ ...empty, ...JSON.parse(text) });
          }
          if (r === null) return res.status(200).json(empty);
        } catch (_) { /* probar el otro modo */ }
      }
      return res.status(200).json(empty);
    }

    if (req.method === 'POST') {
      let body: any = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const state = {
        day: String(body?.day || '').slice(0, 40),
        skips: Math.max(0, Math.min(100000, Number(body?.skips) || 0)),
        promoted: Array.isArray(body?.promoted) ? body.promoted.map((x: any) => String(x).slice(0, 80)).slice(-3000) : []
      };
      let lastErr: any = null;
      for (const access of accessModes) {
        try {
          await blobPut(STATE_PATH, JSON.stringify(state), {
            access, contentType: 'application/json', allowOverwrite: true, addRandomSuffix: false
          });
          return res.status(200).json({ ok: true });
        } catch (e) { lastErr = e; }
      }
      return res.status(500).json({ error: 'No se pudo guardar', details: lastErr?.message });
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // -------------------------------------------------------------
  // ACTION: CATALOGO (pagina HTML rastreable con enlaces a TODAS las canciones y letras)
  // -------------------------------------------------------------
  if (action === 'catalogo') {
    const BASE = 'https://www.diosmasgym.com';
    const esc = (t: string) => escapeXml(String(t || ''));
    try {
      const [songs, storedLyrics] = await Promise.all([fetchAllMusic(), getStoredLyrics()]);
      const hasText = (t: any) => typeof t === 'string' && t.trim().length >= 50;
      const lyricSlugs = new Set<string>();
      storedLyrics.forEach((l: any) => {
        if (!l || !hasText(l.content)) return;
        if (l.id) lyricSlugs.add(generateSlug(String(l.id)));
        if (l.title) lyricSlugs.add(generateSlug(String(l.title)));
      });

      const byArtist = new Map<string, MusicItem[]>();
      songs.forEach(s => {
        if (!s.id || !s.name) return;
        const a = s.artist || 'Dios Mas Gym';
        if (!byArtist.has(a)) byArtist.set(a, []);
        byArtist.get(a)!.push(s);
      });

      let sections = '';
      Array.from(byArtist.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([artist, list]) => {
          sections += `<section><h2>${esc(artist)} <small>(${list.length})</small></h2><ul>`;
          list.forEach(s => {
            const slug = generateSlug(s.name);
            const letra = slug && (hasText(s.lyrics) || lyricSlugs.has(slug) || lyricSlugs.has(generateSlug(s.id)))
              ? ` &middot; <a href="/letra/${esc(slug)}">letra</a>` : '';
            sections += `<li><a href="/link/${esc(s.id)}">${esc(s.name)}</a>${letra}</li>`;
          });
          sections += '</ul></section>';
        });

      const title = 'Catálogo completo de canciones y letras | Dios Mas Gym';
      const desc = `Todas las canciones de Diosmasgym y Juan 614: ${songs.length} temas de música cristiana, rap cristiano y corridos de fe, con enlaces para escucharlos y leer sus letras.`;
      const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE}/catalogo">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}/catalogo"><meta property="og:type" content="website"><meta property="og:image" content="${BASE}/api/og-image">
<style>body{background:#05070a;color:#e5e7eb;font:16px/1.6 system-ui,sans-serif;padding:24px;max-width:900px;margin:auto}a{color:#facc15;text-decoration:none}a:hover{text-decoration:underline}h1{font-size:1.8rem}h2{margin-top:2rem;border-bottom:1px solid #222;padding-bottom:.3rem}small{color:#888}ul{columns:2 280px;padding-left:1.2rem}li{margin:.2rem 0;break-inside:avoid}</style>
</head><body>
<p><a href="/">&larr; Dios Mas Gym</a> &middot; <a href="/buscar">Buscar</a> &middot; <a href="/bio">Bio</a></p>
<h1>Catálogo completo de Dios Mas Gym</h1>
<p>${esc(desc)}</p>
${sections}
</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    } catch (e) {
      console.error('catalogo error', e);
      return res.status(500).send('Error');
    }
  }

  // -------------------------------------------------------------
  // ACTION: BIO SSR (Meta injection for /bio and /bio/:artist pages)
  // -------------------------------------------------------------
  if (action === 'bio-ssr') {
    const artist = (req.query.artist as string) || 'diosmasgym';
    const isJuan = artist.toLowerCase() === 'juan614';

    const name = isJuan ? 'Juan 614' : 'Dios Mas Gym';
    const bio = isJuan
      ? 'Corridos tumbados, banda sinaloense y calle con propósito. Música cristiana con identidad.'
      : 'El Arsenal de Fe — Música cristiana, rap y corridos de motivación. Reflexiones de disciplina, valentía y fe.';
    const image = isJuan
      ? 'https://www.diosmasgym.com/logo-juan614-v2.png'
      : 'https://www.diosmasgym.com/icon-512.png';
    // Solo existen dos bios; cualquier otro /bio/xxx apunta a la de Diosmasgym
    const canonicalUrl = `https://www.diosmasgym.com/bio/${isJuan ? 'juan614' : 'diosmasgym'}`;
    const title = `${name} | Bio — El Arsenal de Fe`;
    const description = bio;

    const jsonLdBlock = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  "name": ${JSON.stringify(name)},
  "url": ${JSON.stringify(canonicalUrl)},
  "image": ${JSON.stringify(image)},
  "description": ${JSON.stringify(description)},
  "genre": ["Música Cristiana", "Rap Cristiano", "Corridos"],
  "sameAs": [
    ${isJuan
      ? '"https://www.youtube.com/@juan614oficial"'
      : '"https://www.youtube.com/@diosmasgym", "https://open.spotify.com/artist/2mEoedcjDJ7x6SCVLMI4Do"'
    }
  ]
}
</script>`;

    try {
      let html = await getBaseIndexHtml();
      const safeTitle = escapeXml(title);
      const safeDesc = escapeXml(description);

      // Las medidas deben ser las reales: antes se heredaba 1200x630 del index
      // y la imagen es cuadrada.
      html = applyPageMeta(html, {
        title,
        description,
        canonical: canonicalUrl,
        image,
        imageWidth: isJuan ? 1024 : 512,
        imageHeight: isJuan ? 1024 : 512,
        ogType: 'profile',
      });
      html = html.replace('\u003c/head\u003e', `${jsonLdBlock}\n\u003c/head\u003e`);

      // Hidden SSR content for crawlers
      const hiddenStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
      html = html.replace('\u003cdiv id="root"\u003e\u003c/div\u003e', `\u003cdiv id="root"\u003e\u003csection style="${hiddenStyle}"\u003e\u003ch1\u003e${safeTitle}\u003c/h1\u003e\u003cp\u003e${safeDesc}\u003c/p\u003e\u003c/section\u003e\u003c/div\u003e`);

      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (err) {
      console.error('Error in bio-ssr:', err);
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch {
        return res.status(500).send('Error loading app');
      }
    }
  }

  // -------------------------------------------------------------
  // ACTION: PAGE SSR (resto de rutas de la SPA)
  // Antes todas se servian con el index.html tal cual: /buscar y /testimonios
  // decian ser la portada (canonical "/") y cualquier URL inventada devolvia 200
  // con el contenido de la portada (soft 404).
  // -------------------------------------------------------------
  if (action === 'page-ssr') {
    const BASE = 'https://www.diosmasgym.com';
    const rawPath = String(req.query.path || '/');
    const pathname = ('/' + rawPath.split('?')[0].replace(/^\/+/, '')).replace(/\/+$/, '') || '/';
    const first = pathname.split('/')[1]?.toLowerCase() || '';

    let html: string;
    try {
      html = await getBaseIndexHtml();
    } catch {
      return res.status(500).send('Error loading app');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const pageBody = (h1: string, text: string) => `<div id="root"><main style="font-family:system-ui,sans-serif;background:#05070a;color:#e5e7eb;padding:24px;min-height:100vh"><h1>${escapeXml(h1)}</h1><p>${escapeXml(text)}</p><nav><a href="/" style="color:#facc15">Inicio</a> · <a href="/catalogo" style="color:#facc15">Catálogo de canciones y letras</a> · <a href="/buscar" style="color:#facc15">Buscar</a> · <a href="/bio/diosmasgym" style="color:#facc15">Diosmasgym</a> · <a href="/bio/juan614" style="color:#facc15">Juan 614</a></nav></main></div>`;

    // Panel admin: la app funciona igual, pero nunca se indexa
    if (first === 'admin') {
      html = applyPageMeta(html, { title: 'Panel | Dios Mas Gym', description: 'Panel de administración.', canonical: null, robots: 'noindex, nofollow' });
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(html);
    }

    const pages: Record<string, { title: string; description: string; canonical: string }> = {
      '/buscar': {
        title: 'Buscar canciones y letras | Dios Mas Gym',
        description: 'Busca entre todas las canciones y letras de Diosmasgym y Juan 614: música cristiana, rap cristiano y corridos de fe.',
        canonical: `${BASE}/buscar`,
      },
      '/testimonios': {
        title: 'Testimonios | Dios Mas Gym',
        description: 'Testimonios reales de personas a las que la música de Dios Mas Gym ha ayudado en su fe, su disciplina y su vida diaria.',
        canonical: `${BASE}/testimonios`,
      },
    };
    // /letras, /letra y /lyrics muestran el mismo buscador
    ['/letras', '/letra', '/lyrics'].forEach(p => { pages[p] = pages['/buscar']; });

    const page = pages[pathname.toLowerCase()];
    if (page) {
      html = applyPageMeta(html, { ...page, canonical: page.canonical });
      html = html.replace('<div id="root"></div>', pageBody(page.title.split(' | ')[0], page.description));
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).send(html);
    }

    // Cualquier otra ruta: 404 real (la app sigue mostrando su pantalla de "no encontrado")
    html = applyPageMeta(html, {
      title: 'Página no encontrada | Dios Mas Gym',
      description: 'Esta página no existe. Explora el catálogo de canciones y letras de Dios Mas Gym.',
      canonical: null,
      robots: 'noindex, follow',
    });
    html = html.replace('<div id="root"></div>', pageBody('Página no encontrada', 'La página que buscas no existe o cambió de dirección.'));
    res.setHeader('X-Robots-Tag', 'noindex, follow');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(404).send(html);
  }

  // -------------------------------------------------------------
  // ACTION: REFLEXIONES SSR — removed, redirect permanently to home
  // -------------------------------------------------------------
  if (action === 'reflexiones-ssr') {
    return res.redirect(301, 'https://www.diosmasgym.com/');
  }

  // -------------------------------------------------------------
  // ACTION: POST SSR (Server-Side Meta Injection)
  // -------------------------------------------------------------
  if (action === 'post-ssr' || action === 'post') {
    const slug = req.query.slug as string;
    if (!slug) {
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch (err) {
        return res.status(500).send("Error loading app");
      }
    }

    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    try {
      // Helper: extract slug from Blogger URL
      const getSlugFromBloggerUrl = (url: string): string => {
        if (!url) return '';
        return url.split('/').pop()?.replace('.html', '') || '';
      };

      // Search strategy: use Blogger API v3 search first (works for any post, not just recent 50),
      // then fall back to the public feed.
      const targetSlug = slug.toLowerCase();
      const slugWords = targetSlug.split('-').filter((w: string) => w.length > 3);

      let matchedPost: any = null;

      // --- Strategy 1: Use Blogger API v3 with search query derived from slug ---
      if (apiKey && !matchedPost) {
        try {
          const queryTerm = targetSlug.replace(/-/g, ' ');
          const apiSearchUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/search?key=${apiKey}&q=${encodeURIComponent(queryTerm)}&maxResults=10&fetchImages=true`;
          const apiResp = await fetch(apiSearchUrl, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Vercel-Server-Function' }
          });
          if (apiResp.ok) {
            const apiData = await apiResp.json();
            const items: any[] = apiData?.items || [];
            for (const item of items) {
              const itemSlug = (item.url || '').split('/').pop()?.replace('.html', '').toLowerCase() || '';
              if (itemSlug === targetSlug || itemSlug.startsWith(targetSlug.slice(0, 30)) || targetSlug.startsWith(itemSlug.slice(0, 30))) {
                // Convert v3 item format to feed entry format for uniform processing below
                matchedPost = {
                  title: { $t: item.title },
                  content: { $t: item.content || '' },
                  summary: { $t: item.content ? item.content.replace(/<[^>]*>/g, '').slice(0, 300) : '' },
                  published: { $t: item.published },
                  updated: { $t: item.updated },
                  'media$thumbnail': item.images?.[0] ? { url: item.images[0].url } : null,
                  link: [{ rel: 'alternate', href: item.url }]
                };
                break;
              }
            }
          }
        } catch (apiErr) {
          console.error('Blogger API v3 search error:', apiErr);
        }
      }

      // --- Strategy 2: Public JSON feed (recent 150 posts) ---
      if (!matchedPost) {
        try {
          const blogDomain = 'www.diosmasgym.com';
          const feedUrl = `https://${blogDomain}/feeds/posts/default?alt=json&max-results=150&orderby=published`;
          const feedResp = await fetch(feedUrl, { headers: { 'Accept': 'application/json' } });
          if (feedResp.ok) {
            const feedData = await feedResp.json();
            const entries: any[] = feedData?.feed?.entry || [];

            for (const entry of entries) {
              const altLink = (entry.link || []).find((l: any) => l.rel === 'alternate');
              if (!altLink) continue;
              const entrySlug = (altLink.href.split('/').pop()?.replace('.html', '') || '').toLowerCase();

              if (entrySlug === targetSlug) { matchedPost = entry; break; }
              if (entrySlug.startsWith(targetSlug.slice(0, 30)) || targetSlug.startsWith(entrySlug.slice(0, 30))) {
                matchedPost = entry; break;
              }
            }

            // Broad word match fallback
            if (!matchedPost && slugWords.length >= 2) {
              for (const entry of entries) {
                const altLink = (entry.link || []).find((l: any) => l.rel === 'alternate');
                if (!altLink) continue;
                const entrySlug = (altLink.href.split('/').pop()?.replace('.html', '') || '').toLowerCase();
                const hits = slugWords.filter((w: string) => entrySlug.includes(w));
                if (hits.length >= Math.ceil(slugWords.length * 0.6)) { matchedPost = entry; break; }
              }
            }
          }
        } catch (feedErr) {
          console.error('Blogger feed fetch error:', feedErr);
        }
      }

      let title = "Dios Mas Gym - El Arsenal de Fe";
      let description = "Reflexiones de fe, valentía y disciplina en El Arsenal.";
      let image = "/logo-diosmasgym.png";

      if (matchedPost) {
        title = matchedPost.title?.$t || title;
        const rawContent = matchedPost.content?.$t || matchedPost.summary?.$t || '';
        description = rawContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) + '...';
        // media$thumbnail is reliable in Blogger feed JSON
        if (matchedPost['media$thumbnail']?.url) {
          image = matchedPost['media$thumbnail'].url.replace(/\/s\d+(-[a-z])?\//, '/s1200/');
        } else {
          const imgMatch = rawContent.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) image = imgMatch[1];
        }
      }


      // Fetch the compiled production index.html (from cache/network)
      let html = await getBaseIndexHtml();

      // Build JSON-LD structured data if post match was found
      let jsonLdBlock = '';
      let contentHtml = '';
      if (typeof html === 'string') {
        const publishedDate = matchedPost?.published?.$t || matchedPost?.published || new Date().toISOString();
        const modifiedDate = matchedPost?.updated?.$t || matchedPost?.updated || publishedDate;
        contentHtml = matchedPost?.content?.$t || matchedPost?.summary?.$t || '';
        jsonLdBlock = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": ${JSON.stringify(title)},
  "image": [${JSON.stringify(image)}],
  "datePublished": ${JSON.stringify(publishedDate)},
  "dateModified": ${JSON.stringify(modifiedDate)},
  "author": {
    "@type": "Person",
    "name": "Juan Bernal"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Dios Mas Gym",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.diosmasgym.com/logo-diosmasgym.png"
    }
  },
  "description": ${JSON.stringify(description)}
}
</script>`;
      }

      const safeTitle = escapeXml(title);
      const safeDesc = escapeXml(description);
      const safeImage = escapeXml(image);

      // Helper: inject OG meta tags — uses [\s\S]*? to match across line breaks
      const injectMeta = (h: string, property: string, value: string): string => {
        // property="og:xxx" content="..." pattern (any order, any whitespace/newlines inside)
        h = h.replace(new RegExp(`<meta\\s+property=["']${property}["'][\\s\\S]*?/?>`, 'i'), `<meta property="${property}" content="${value}">`);
        // Also try content first, property second
        h = h.replace(new RegExp(`<meta\\s+content=["'][\\s\\S]*?["']\\s+property=["']${property}["'][\\s\\S]*?/?>`, 'i'), `<meta property="${property}" content="${value}">`);
        return h;
      };

      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle} | El Arsenal</title>`);
      html = injectMeta(html, 'og:title', safeTitle);
      html = injectMeta(html, 'og:description', safeDesc);
      html = injectMeta(html, 'og:image', safeImage);
      html = injectMeta(html, 'og:url', `https://www.diosmasgym.com/post/${slug}`);
      html = html.replace(/<link[\s\S]*?rel=["']canonical["'][\s\S]*?>/i, `<link rel="canonical" href="https://www.diosmasgym.com/post/${slug}" />`);
      
      // Override robots: allow indexing for this specific post page
      html = html.replace(
        /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="robots" content="index, follow">`
      );
      
      if (/<meta\s+name=["']description["']/i.test(html)) {
          html = html.replace(/<meta\s+name=["']description["'][\s\S]*?\/?>/i, `<meta name="description" content="${safeDesc}">`);
      } else {
          html = html.replace('</head>', `<meta name="description" content="${safeDesc}">\n</head>`);
      }
      
      html = html.replace('</head>', `${jsonLdBlock}\n</head>`);

      // Twitter Card meta tags (not in base index.html)
      const postExtraMeta = [
        `<meta property="og:type" content="article">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${safeTitle}">`,
        `<meta name="twitter:description" content="${safeDesc}">`,
        `<meta name="twitter:image" content="${safeImage}">`,
      ].join('\n');
      html = html.replace('</head>', `${postExtraMeta}\n</head>`);

      // Inject SSR content into root for SEO crawlers
      if (contentHtml) {
        const hiddenStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
        html = html.replace('<div id="root"></div>', `<div id="root"><article style="${hiddenStyle}"><h1>${safeTitle}</h1>${contentHtml}</article></div>`);
      }

      // HTTP-level robots signal so Google reads it even before parsing HTML
      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);

    } catch (err: any) {
      console.error("Error in post-ssr:", err);
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch {
        return res.status(500).send("Error loading app");
      }
    }
  }

  // -------------------------------------------------------------
  // ACTION: SMARTLINK SSR (Server-Side Meta Injection for Smart Links)
  // -------------------------------------------------------------
  if (action === 'smartlink-ssr' || action === 'smartlink') {
    const id = req.query.id as string;
    if (!id) {
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch (err) {
        return res.status(500).send("Error loading app");
      }
    }

    try {
      const songs = await fetchAllMusic();
      const normalizeId = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const song = songs.find(s => {
        if (s.id === id) return true;
        if (s.url && s.url.includes(id)) return true;
        if (s.id && normalizeId(s.id) === normalizeId(id)) return true;
        const slugName = normalizeId(`${s.artist}-${s.name}`);
        const slugOnly = normalizeId(s.name);
        if (normalizeId(id) === slugName || normalizeId(id) === slugOnly) return true;
        return false;
      });

      let title = "Dios Mas Gym - Smart Link";
      let description = "Escucha los últimos lanzamientos de música cristiana y de motivación.";
      let image = "/logo-diosmasgym.png";
      let jsonLdBlock = '';

      if (song) {
        title = `${song.name} - ${song.artist}`;
        description = `Escucha "${song.name}" de ${song.artist} en Spotify, YouTube, Apple Music, Deezer y más plataformas de streaming.`;
        if (song.cover) {
          image = song.cover;
        }

        // Use branded OG image endpoint for better social sharing
        const ogImageUrl = `https://www.diosmasgym.com/api/og-image?title=${encodeURIComponent(song.name)}&artist=${encodeURIComponent(song.artist)}&cover=${encodeURIComponent(song.cover || '')}&type=song`;

        jsonLdBlock = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicRecording",
  "name": ${JSON.stringify(song.name)},
  "byArtist": {
    "@type": "MusicGroup",
    "name": ${JSON.stringify(song.artist)},
    "url": ${JSON.stringify(`https://www.diosmasgym.com/bio/${song.artist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}`)}
  },
  "url": ${JSON.stringify(`https://www.diosmasgym.com/link/${song.id}`)},
  "image": ${JSON.stringify(ogImageUrl)},
  "description": ${JSON.stringify(description)}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.diosmasgym.com/" },
    { "@type": "ListItem", "position": 2, "name": "Música", "item": "https://www.diosmasgym.com/" },
    { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(song.name)}, "item": ${JSON.stringify(`https://www.diosmasgym.com/link/${song.id}`)} }
  ]
}
</script>`;
        // Override image with branded OG image
        image = ogImageUrl;
      } else if (id === 'custom' || (req.query.title && req.query.artist)) {
        const qTitle = req.query.title as string;
        const qArtist = req.query.artist as string;
        const qCover = req.query.cover as string;
        const qUrl = req.query.url as string;

        if (qTitle && qArtist) {
          title = `${qTitle} - ${qArtist}`;
          description = `Escucha "${qTitle}" de ${qArtist} en Spotify, YouTube, Apple Music, Deezer y más plataformas de streaming.`;

          // Use branded OG image endpoint for custom smart links too
          const ogImageUrl = `https://www.diosmasgym.com/api/og-image?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}&cover=${encodeURIComponent(qCover || '')}&type=song`;
          if (qCover) {
            image = qCover;
          }

          jsonLdBlock = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MusicRecording",
  "name": ${JSON.stringify(qTitle)},
  "byArtist": {
    "@type": "MusicGroup",
    "name": ${JSON.stringify(qArtist)},
    "url": ${JSON.stringify(`https://www.diosmasgym.com/bio/${qArtist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}`)}
  },
  "url": ${JSON.stringify(`https://www.diosmasgym.com/link/custom?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}&cover=${encodeURIComponent(qCover || '')}&url=${encodeURIComponent(qUrl || '')}`)},
  "image": ${JSON.stringify(ogImageUrl)},
  "description": ${JSON.stringify(description)}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.diosmasgym.com/" },
    { "@type": "ListItem", "position": 2, "name": "Música", "item": "https://www.diosmasgym.com/" },
    { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(qTitle)}, "item": ${JSON.stringify(`https://www.diosmasgym.com/link/custom?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}`)} }
  ]
}
</script>`;
          // Override image with branded OG image
          image = ogImageUrl;
        }
      }

      // Fetch compiled index.html (from cache/network)
      let html = await getBaseIndexHtml();

      // If song not found, return real 404 to avoid Soft 404 in GSC
      if (!song && id !== 'custom' && !(req.query.title && req.query.artist)) {
        html = html.replace(
          /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
          `<meta name="robots" content="noindex, nofollow">`
        );
        html = html.replace(/<title>[^<]*<\/title>/i, `<title>Canción no encontrada - Dios Mas Gym</title>`);
        html = html.replace('</head>', `<link rel="canonical" href="https://www.diosmasgym.com/" />\n</head>`);
        res.setHeader('Cache-Control', 'no-store, no-cache');
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        return res.status(404).send(html);
      }

      let shareUrl = `https://www.diosmasgym.com/link/${id}`;
      if (id === 'custom' && req.query.title && req.query.artist) {
        const qTitle = req.query.title as string;
        const qArtist = req.query.artist as string;
        const qCover = req.query.cover as string;
        const qUrl = req.query.url as string;
        shareUrl = `https://www.diosmasgym.com/link/custom?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}&cover=${encodeURIComponent(qCover || '')}&url=${encodeURIComponent(qUrl || '')}`;
      }

      const safeTitle = escapeXml(title);
      const safeDesc = escapeXml(description);
      const safeImage = escapeXml(image);
      const absoluteImage = image.startsWith('http') ? image : `https://www.diosmasgym.com${image.startsWith('/') ? '' : '/'}${image}`;

      // Los smartlinks "custom" admiten cualquier titulo por query string: se
      // pueden compartir, pero no deben indexarse (serian URLs infinitas).
      const isCustom = !song;
      html = applyPageMeta(html, {
        title,
        description,
        canonical: isCustom ? null : shareUrl,
        image: absoluteImage,
        ogType: 'music.song',
        robots: isCustom ? 'noindex, follow' : 'index, follow',
      });
      if (isCustom) html = upsertMeta(html, 'property', 'og:url', shareUrl);

      html = html.replace('</head>', `${jsonLdBlock}\n</head>`);

      // Inject full SSR content for SmartLinks — visible to crawlers, hidden from users
      const hiddenStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
      html = html.replace('<div id="root"></div>', `<div id="root"><article style="${hiddenStyle}"><h1>${safeTitle}</h1><p>${safeDesc}</p><img src="${safeImage}" alt="${safeTitle}"><a href="${shareUrl}">Escuchar ahora en Spotify, YouTube, Apple Music y Deezer</a>${song ? `<nav><a href="/bio/${song.artist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}">Más de ${escapeXml(song.artist)}</a> <a href="/catalogo">Catálogo completo</a>${song.lyrics && song.lyrics.trim().length >= 50 ? ` <a href="/letra/${generateSlug(song.name)}">Letra de ${escapeXml(song.name)}</a>` : ''}</nav>` : ''}</article></div>`);

      // HTTP-level robots signal so Google reads it even before parsing HTML
      res.setHeader('X-Robots-Tag', isCustom ? 'noindex, follow' : 'index, follow');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);

    } catch (err: any) {
      console.error("Error in smartlink-ssr:", err);
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch {
        return res.status(500).send("Error loading app");
      }
    }
  }

  // -------------------------------------------------------------
  // ACTION: LETRA SSR (Server-Side Rendering & Schema.org para Letras)
  // -------------------------------------------------------------
  if (action === 'letra-ssr' || action === 'lyrics-ssr') {
    const slug = (req.query.slug as string) || '';
    if (!slug) {
      try {
        const text = await getBaseIndexHtml();
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch (err) {
        return res.status(500).send("Error loading app");
      }
    }

    try {
      const [songs, storedLyrics] = await Promise.all([
        fetchAllMusic(),
        Promise.resolve(getStoredLyrics())
      ]);

      const normalizeSlug = (str: string) =>
        (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const normSlug = normalizeSlug(slug);

      // Match in songs or storedLyrics
      let song = songs.find(s =>
        s.id === slug ||
        normalizeSlug(s.id) === normSlug ||
        normalizeSlug(s.name) === normSlug ||
        normalizeSlug(`${s.artist}-${s.name}`) === normSlug
      );

      const songNormName = song ? normalizeSlug(song.name) : '';

      let matchedStored = storedLyrics.find(l =>
        l.id === slug ||
        normalizeSlug(l.id) === normSlug ||
        normalizeSlug(l.title) === normSlug ||
        normalizeSlug(`${l.artist}-${l.title}`) === normSlug ||
        (songNormName && normalizeSlug(l.title) === songNormName)
      );

      const songTitle = song?.name || matchedStored?.title || slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      const songArtist = song?.artist || matchedStored?.artist || 'Dios Mas Gym';
      const lyricText = (matchedStored?.content || song?.lyrics || '').trim();

      // ---------------------------------------------------------------
      // Sin letra disponible -> 404 real + noindex.
      // Antes devolviamos 200 + "index, follow" para CUALQUIER slug, lo que
      // generaba cientos de soft 404 indexables (p.ej. /letra/loquesea).
      // Si la fuente de letras no respondio, NO marcamos 404 (seria un falso
      // negativo temporal): servimos la app tal cual y Google reintentara.
      // ---------------------------------------------------------------
      const MIN_LYRIC_LENGTH = 50;
      const lyricsSourceAvailable = Array.isArray(storedLyrics) && storedLyrics.length > 0;

      if (lyricText.length < MIN_LYRIC_LENGTH) {
        let fallbackHtml = await getBaseIndexHtml();

        if (lyricsSourceAvailable) {
          const missingTitle = song?.name || matchedStored?.title ||
            slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

          fallbackHtml = fallbackHtml.replace(
            /<title>[^<]*<\/title>/i,
            `<title>Letra no disponible | Dios M\u00e1s Gym</title>`
          );
          fallbackHtml = fallbackHtml.replace(
            /<meta\s+name=["']robots["'][^>]*>/i,
            `<meta name="robots" content="noindex, follow">`
          );
          fallbackHtml = fallbackHtml.replace(/<link\s+rel=["']canonical["'][^>]*>/i, '');

          const notFoundBody = `
<div id="root">
  <div style="min-height:100vh;background:linear-gradient(160deg,#020d1a 0%,#071325 50%,#0b1929 100%);color:#f8fafc;font-family:'Inter',sans-serif;padding:2rem 1rem;">
    <main style="max-width:640px;margin:0 auto;text-align:center;">
      <h1 style="font-size:2rem;font-weight:900;margin:1rem 0;color:#fff;">Esta letra todav\u00eda no est\u00e1 disponible</h1>
      <p style="color:#94a3b8;line-height:1.7;">A\u00fan no hemos publicado la letra de &quot;${escapeXml(missingTitle)}&quot;. Mientras tanto puedes buscar entre el resto del cat\u00e1logo.</p>
      <p style="margin-top:2rem;">
        <a href="/buscar" style="display:inline-block;margin:0.4rem;padding:0.7rem 1.3rem;background:#2563a8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Buscar canciones</a>
        <a href="/" style="display:inline-block;margin:0.4rem;padding:0.7rem 1.3rem;border:1px solid rgba(148,163,184,0.4);color:#e2e8f0;text-decoration:none;border-radius:6px;font-weight:bold;">Inicio</a>
      </p>
    </main>
  </div>
</div>`;
          fallbackHtml = fallbackHtml.replace('<div id="root"></div>', notFoundBody);

          res.setHeader('X-Robots-Tag', 'noindex, follow');
          res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(404).send(fallbackHtml);
        }

        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(fallbackHtml);
      }
      const songCover = song?.cover || '/logo-diosmasgym.png';
      // Canonical = el mismo slug que publica el sitemap. Antes se usaba el slug
      // pedido, asi /letra/<id> y /letra/<artista-titulo> eran paginas "distintas".
      const canonicalSlug = song
        ? (generateSlug(song.name) || normSlug)
        : (matchedStored ? (generateSlug(String(matchedStored.id || matchedStored.title || '')) || normSlug) : normSlug);
      const canonicalUrl = `https://www.diosmasgym.com/letra/${canonicalSlug}`;

      const pageTitle = `${songTitle} - Letra Oficial | ${songArtist} | Dios Más Gym`;
      const pageDescription = toMetaDescription(`Letra oficial de "${songTitle}" por ${songArtist}. ${lyricText}`);

      // Calculate absolute cover URL first (needed for ogImageUrl)
      const absoluteSongCover = songCover.startsWith('http') ? songCover : `https://www.diosmasgym.com${songCover.startsWith('/') ? '' : '/'}${songCover}`;

      // Branded OG image URL for letra pages
      const ogImageUrl = `https://www.diosmasgym.com/api/og-image?title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&cover=${encodeURIComponent(absoluteSongCover)}&type=lyrics`;

      const schemaJsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        "name": songTitle,
        "byArtist": {
          "@type": "MusicGroup",
          "name": songArtist,
          "url": `https://www.diosmasgym.com/bio/${songArtist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}`
        },
        "url": canonicalUrl,
        "image": ogImageUrl,
        "description": pageDescription,
        ...(lyricText ? {
          "recordingOf": {
            "@type": "MusicComposition",
            "name": songTitle,
            "composer": {
              "@type": "Person",
              "name": songArtist
            },
            "lyrics": {
              "@type": "CreativeWork",
              "text": lyricText
            }
          }
        } : {})
      };

      const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.diosmasgym.com/" },
          { "@type": "ListItem", "position": 2, "name": "Letras", "item": "https://www.diosmasgym.com/catalogo" },
          { "@type": "ListItem", "position": 3, "name": songTitle, "item": canonicalUrl }
        ]
      };

      const jsonLdBlock = `
<script type="application/ld+json">
${JSON.stringify(schemaJsonLd, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(breadcrumbJsonLd, null, 2)}
</script>`;

      let html = await getBaseIndexHtml();

      html = applyPageMeta(html, {
        title: pageTitle,
        description: pageDescription,
        canonical: canonicalUrl,
        image: ogImageUrl,
        imageAlt: `Letra de ${songTitle} - ${songArtist}`,
        ogType: 'music.song',
      });

      html = html.replace('</head>', `${jsonLdBlock}\n</head>`);

      // Inject semantic HTML structure inside #root for crawlers
      const versesHtml = lyricText
        ? lyricText.split('\n\n').map((verse: string) => `<p style="margin-bottom: 1.5rem; line-height: 1.8; color: #e2e8f0; font-size: 1.1rem;">${verse.split('\n').map((l: string) => escapeXml(l)).join('<br/>')}</p>`).join('\n')
        : `<p style="color: #94a3b8; font-style: italic;">Letra oficial de "${escapeXml(songTitle)}".</p>`;

      const ssrBody = `
<div id="root">
  <div style="min-height: 100vh; background: linear-gradient(160deg, #020d1a 0%, #071325 50%, #0b1929 100%); color: #f8fafc; font-family: 'Inter', sans-serif; padding: 2rem 1rem;">
    <main style="max-width: 768px; margin: 0 auto; text-align: center;">
      <header style="margin-bottom: 2.5rem;">
        <span style="display: inline-block; padding: 0.25rem 0.75rem; background: rgba(37,99,168,0.2); border: 1px solid rgba(37,99,168,0.4); border-radius: 4px; color: #60a5fa; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem;">✝ Letra Oficial ✝</span>
        <h1 style="font-size: 2.5rem; font-weight: 900; margin: 0.5rem 0; color: #ffffff;">${escapeXml(songTitle)}</h1>
        <h2 style="font-size: 1.25rem; color: #94a3b8; font-weight: 600; margin: 0;">${escapeXml(songArtist)}</h2>
      </header>
      <article style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
        ${versesHtml}
      </article>
      <footer style="margin-top: 2rem;">
        ${song?.id ? `<a href="/link/${escapeXml(song.id)}" style="display: inline-block; margin: 0.5rem; padding: 0.6rem 1.2rem; background: #2563a8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">Escuchar ${escapeXml(songTitle)}</a>` : ''}
        <a href="/bio/${songArtist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}" style="display: inline-block; margin: 0.5rem; padding: 0.6rem 1.2rem; border: 1px solid rgba(148,163,184,0.4); color: #e2e8f0; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">Más de ${escapeXml(songArtist)}</a>
        <a href="/catalogo" style="display: inline-block; margin: 0.5rem; padding: 0.6rem 1.2rem; border: 1px solid rgba(148,163,184,0.4); color: #e2e8f0; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">Todas las letras</a>
        <a href="/" style="display: inline-block; margin: 0.5rem; padding: 0.6rem 1.2rem; border: 1px solid rgba(148,163,184,0.4); color: #e2e8f0; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">Inicio</a>
      </footer>
    </main>
  </div>
</div>`;

      html = html.replace('<div id="root"></div>', ssrBody);

      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);

    } catch (err: any) {
      console.error("[letra-ssr] Error:", err);
      const text = await getBaseIndexHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(text);
    }
  }

  // -------------------------------------------------------------
  // ACTION: RSS FEED (Dynamic feed.xml generation)
  // -------------------------------------------------------------
  if (action === 'rss' || action === 'feed' || action === 'feed.xml') {
    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">\n`;
    xml += `<channel>\n`;
    xml += `  <title>Dios Mas Gym - El Arsenal de Fe</title>\n`;
    xml += `  <link>https://www.diosmasgym.com</link>\n`;
    xml += `  <description>Reflexiones de fe, valentía, disciplina y lanzamientos de música cristiana y de motivación.</description>\n`;
    xml += `  <language>es-mx</language>\n`;
    xml += `  <atom:link href="https://www.diosmasgym.com/feed.xml" rel="self" type="application/rss+xml" />\n`;
    xml += `  <image>\n`;
    xml += `    <url>https://www.diosmasgym.com/icon-512.png</url>\n`;
    xml += `    <title>Dios Mas Gym - El Arsenal de Fe</title>\n`;
    xml += `    <link>https://www.diosmasgym.com</link>\n`;
    xml += `    <width>512</width>\n`;
    xml += `    <height>512</height>\n`;
    xml += `  </image>\n`;

    try {
      // 1. Fetch Blogger posts
      let posts: any[] = [];
      if (apiKey) {
        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=15&status=LIVE`;
        const response = await fetch(url, {
          headers: {
            'Referer': 'https://www.diosmasgym.com',
            'Origin': 'https://www.diosmasgym.com',
            'Accept': 'application/json',
            'User-Agent': 'Vercel-Server-Function'
          }
        });
        if (response.ok) {
          const data = await response.json();
          posts = data.items || [];
        }
      }

      // 2. Fetch music
      const songs = await fetchAllMusic();

      // 3. Add posts to RSS
      posts.forEach((item: any) => {
        const slug = item.url?.split('/').pop()?.replace('.html', '') || '';
        const postUrl = `https://www.diosmasgym.com/post/${slug}`;
        const title = item.title || "Reflexión del Arsenal";
        const description = (item.content || "").replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 250) + '...';
        const pubDate = item.published ? new Date(item.published).toUTCString() : new Date().toUTCString();

        xml += `  <item>\n`;
        xml += `    <title>${escapeXml(title)}</title>\n`;
        xml += `    <link>${postUrl}</link>\n`;
        xml += `    <guid>${postUrl}</guid>\n`;
        xml += `    <pubDate>${pubDate}</pubDate>\n`;
        xml += `    <description>${escapeXml(description)}</description>\n`;
        xml += `  </item>\n`;
      });

      // 4. Add top 10 music tracks to RSS
      songs.slice(0, 15).forEach((song) => {
        const songUrl = `https://www.diosmasgym.com/link/${song.id}`;
        const pubDate = song.date ? new Date(song.date).toUTCString() : new Date().toUTCString();
        const description = `Lanzamiento oficial de la canción "${song.name}" de ${song.artist}. Escúchala en tu plataforma favorita.`;

        const coverUrl = song.cover ? escapeXml(song.cover) : '';
        const audioUrl = song.url ? escapeXml(song.url) : '';

        xml += `  <item>\n`;
        xml += `    <title>Estreno: ${escapeXml(song.name)} - ${escapeXml(song.artist)}</title>\n`;
        xml += `    <link>${songUrl}</link>\n`;
        xml += `    <guid>${songUrl}</guid>\n`;
        xml += `    <pubDate>${pubDate}</pubDate>\n`;
        xml += `    <description>${escapeXml(description)}</description>\n`;
        if (coverUrl) xml += `    <media:thumbnail url="${coverUrl}" />\n`;
        xml += `  </item>\n`;
      });

    } catch (e) {
      console.error("Error gathering RSS content:", e);
    }

    xml += `</channel>\n`;
    xml += `</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  }

  return res.status(404).json({ error: 'Action not found' });
}
