import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

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

function getClientIp(req: any): string {
  return (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers?.['x-real-ip'] as string
    || req.socket?.remoteAddress
    || 'unknown';
}

let cachedIndexHtml = '';
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
        const html = fs.readFileSync(candidate, 'utf-8');
        if (html && html.includes('<div id="root">')) {
          cachedIndexHtml = html;
          cachedIndexHtmlTime = now;
          return html;
        }
      }
    } catch (_) { /* continue */ }
  }

  // Strategy 2: Fetch from the production URL (fallback for non-Vercel envs)
  try {
    const htmlRes = await fetch('https://www.diosmasgym.com/index.html');
    const html = await htmlRes.text();
    if (html && html.includes('<div id="root">')) {
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

function verifyAdminPassword(req: any): boolean {
  const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
  const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');
  
  if (!MASTER_KEY) {
    console.error("ADMIN_PASSWORD is not defined in environment variables.");
    return false;
  }

  let providedPassword = '';
  let authHeader = '';

  if (typeof req.headers?.get === 'function') {
    providedPassword = req.headers.get('x-admin-password') || '';
    authHeader = req.headers.get('authorization') || '';
  } else if (req.headers) {
    providedPassword = (req.headers['x-admin-password'] as string) || '';
    authHeader = (req.headers['authorization'] as string) || '';
  }

  if (timingSafeCompare(providedPassword, MASTER_KEY)) {
    return true;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (timingSafeCompare(token, MASTER_KEY)) {
      return true;
    }
  }

  return false;
}

async function robustFetchText(urlStr: string): Promise<string> {
  // 1. Try global fetch first if available
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(urlStr);
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

    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name || entry.name.toLowerCase().includes('spotify artist')) continue;
    if (isNonMusicOrForeign(entry.name)) continue;

    let videoId = '';
    try {
      if (entry.url.includes('youtube.com') && entry.url.includes('v=')) {
        videoId = entry.url.split('v=')[1].split('&')[0];
      } else if (entry.url.includes('youtu.be/')) {
        videoId = entry.url.split('youtu.be/')[1].split('?')[0];
      }
    } catch (e) {}

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
    const gsRes = await fetch(`${GS_LYRICS_URL}?action=list&t=${Date.now()}`);
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
  const costlyActions = ['youtube-top', 'sheet-proxy', 'image-proxy', 'smartlink-ssr', 'smartlink', 'post-ssr', 'post'];
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
  // ACTION: YOUTUBE TOP VIDEOS (server-side — bypasses API key referrer restriction)
  // -------------------------------------------------------------
  if (action === 'youtube-top') {
    const apiKey = (process.env.BLOGGER_API_KEY || '').trim().replace(/^[\"']|[\"']$/g, '');
    const YT_HEADERS = {
      'Referer': 'https://www.diosmasgym.com/',
      'Origin': 'https://www.diosmasgym.com',
      'Accept': 'application/json',
    };
    const CHANNELS = [
      { id: 'UCUgy7ZKVVaxAnrAXCnLG7EA', name: 'Diosmasgym', handle: '@diosmasgym', maxResults: 6 },
      { id: 'UC3PCx5tqomYtP_5Hrf7cXDQ', name: 'Juan 614', handle: '@juan614oficial', maxResults: 3 },
    ];
    try {
      const allVideos: any[] = [];
      for (const ch of CHANNELS) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ch.id}&order=viewCount&maxResults=${ch.maxResults}&type=video&videoCategoryId=10&key=${apiKey}`;
        const resp = await fetch(url, { headers: YT_HEADERS });
        if (!resp.ok) { console.error(`YT search error ${ch.name}:`, resp.status); continue; }
        const data = await resp.json();
        const items: any[] = data.items || [];
        // Fetch video stats for viewCount
        const videoIds = items.map((v: any) => v.id?.videoId).filter(Boolean).join(',');
        let statsMap: Record<string, string> = {};
        if (videoIds) {
          const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`, { headers: YT_HEADERS });
          if (statsResp.ok) {
            const sd = await statsResp.json();
            (sd.items || []).forEach((v: any) => { statsMap[v.id] = v.statistics?.viewCount || '0'; });
          }
        }
        items.forEach((v: any) => {
          const vid = v.id?.videoId;
          if (!vid) return;
          const views = parseInt(statsMap[vid] || '0', 10);
          allVideos.push({
            id: vid,
            title: (v.snippet?.title || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
            thumb: v.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${vid}`,
            channel: ch.name,
            handle: ch.handle,
            views,
            viewsFormatted: views >= 1000000 ? `${(views/1000000).toFixed(1)}M vistas` : views >= 1000 ? `${Math.floor(views/1000)}K vistas` : `${views} vistas`,
          });
        });
      }
      allVideos.sort((a: any, b: any) => b.views - a.views);
      return res.status(200).json({ items: allVideos });
    } catch (err: any) {
      console.error('[youtube-top] Error:', err);
      return res.status(200).json({ items: [] });
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
      avatar: "/logo-juan614-v2.jpg"
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
      try {
        // 1. Try fetching from Google Sheets (most up-to-date)
        if (GS_LINKS_URL) {
          try {
            const gsRes = await fetch(`${GS_LINKS_URL}?action=list-links&artist=${isJuan ? 'juan614' : 'diosmasgym'}&t=${Date.now()}`);
            if (gsRes.ok) {
              const gsData = await gsRes.json();
              if (gsData && gsData.links) {
                // Cache in /tmp
                try { fs.writeFileSync(TMP_LINKS_FILE, JSON.stringify(gsData, null, 2)); } catch {}
                res.setHeader('Cache-Control', 'no-store, max-age=0');
                return res.status(200).json(gsData);
              }
            }
          } catch (e) {
            console.error('[links GET] Google Sheets fetch error:', e);
          }
        }
        
        // 2. Fallback to /tmp or seed
        const localData = readLinksFromDisk();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
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
        fs.writeFileSync(TMP_LYRICS_FILE, JSON.stringify({ lyrics }, null, 2));
      } catch (e) {
        console.error('[lyrics] /tmp write error:', e);
      }
    };

    if (req.method === 'GET') {
      try {
        // First try to fetch from Google Sheets (most up-to-date)
        if (GS_LYRICS_URL) {
          try {
            const gsRes = await fetch(`${GS_LYRICS_URL}?action=list&t=${Date.now()}`);
            if (gsRes.ok) {
              const gsData = await gsRes.json();
              const gsList = Array.isArray(gsData) ? gsData : (gsData?.lyrics || gsData?.data || []);
              if (gsList.length > 0) {
                // Cache in /tmp for subsequent calls in this instance
                writeLyricsToDisk(gsList);
                res.setHeader('Cache-Control', 'no-store, max-age=0');
                return res.status(200).json({ lyrics: gsList });
              }
            }
          } catch (gsErr) {
            console.error('[lyrics GET] Google Sheets fetch error:', gsErr);
          }
        }
        // Fallback to /tmp or seed file
        const lyricsList = readLyricsFromDisk();
        res.setHeader('Cache-Control', 'no-store, max-age=0');
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

        // Sync to Google Sheets (primary persistent store — AWAIT to ensure it saves)
        if (GS_LYRICS_URL) {
          try {
            await fetch(GS_LYRICS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ action: 'save', lyrics: currentLyrics, item: bodyData })
            });
          } catch (gsErr) {
            console.error('[lyrics POST] Google Sheets sync error:', gsErr);
            // Non-fatal — data is already in /tmp
          }
        }

        return res.status(200).json({ success: true, message: 'Letra guardada correctamente en el sitio web', lyrics: currentLyrics });
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
        const response = await fetch(`${CLOUD_URL}?read=true&t=${Date.now()}`, { cache: 'no-store' });
        if (response.ok) {
          const rows = await response.json();
          const configRows = rows.filter((r: any) => r.Artista === 'CONFIG_MAINTENANCE');
          if (configRows.length > 0) {
            const lastConfig = configRows[configRows.length - 1];
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
        res.setHeader('Cache-Control', 'no-store, max-age=0');
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
        const qs = new URLSearchParams(q).toString();
        if (qs) url += `?${qs}`;

        const resp = await fetch(url, { method: 'GET', redirect: 'follow' });

        if (hasNoCache) {
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
      return res.status(401).json({ success: false, message: 'Invalid password' });
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

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      // Static pages in the songs sitemap
      xml += urlBlock(`${BASE}/`, today, 'daily', '1.0');
      xml += urlBlock(`${BASE}/bio`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/bio/diosmasgym`, today, 'weekly', '0.8');
      xml += urlBlock(`${BASE}/bio/juan614`, today, 'weekly', '0.8');

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
        storedLyrics = getStoredLyrics();
      } catch (e) { 
        console.error('lyrics sitemap fetch error', e); 
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      
      const seenSlugs = new Set<string>();

      // All songs from catalog
      songs.forEach(song => {
        const slug = generateSlug(song.name) || song.id;
        if (!slug || seenSlugs.has(slug)) return;
        seenSlugs.add(slug);
        const lastmod = song.date ? song.date.split('T')[0] : today;
        xml += urlBlock(`${BASE}/letra/${slug}`, lastmod, 'weekly', '0.9');
      });

      // All custom stored lyrics
      storedLyrics.forEach(item => {
        const slug = item.id || generateSlug(item.title);
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
  <sitemap>
    <loc>${BASE}/sitemap.xml?sub=posts</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(sitemapIndex);
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
      ? 'https://www.diosmasgym.com/logo-juan614-v2.jpg'
      : 'https://www.diosmasgym.com/icon-512.png';
    const canonicalUrl = `https://www.diosmasgym.com/bio/${artist.toLowerCase()}`;
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
      const safeImg = escapeXml(image);

      html = html.replace(/\u003ctitle\u003e[\s\S]*?\u003c\/title\u003e/i, `\u003ctitle\u003e${safeTitle}\u003c/title\u003e`);
      html = html.replace(/\u003cmeta\s+name=["']description["'][\s\S]*?\/?>/i, `\u003cmeta name="description" content="${safeDesc}"\u003e`);
      html = html.replace(/\u003cmeta\s+property=["']og:title["'][\s\S]*?\/?>/i, `\u003cmeta property="og:title" content="${safeTitle}"\u003e`);
      html = html.replace(/\u003cmeta\s+property=["']og:description["'][\s\S]*?\/?>/i, `\u003cmeta property="og:description" content="${safeDesc}"\u003e`);
      html = html.replace(/\u003cmeta\s+property=["']og:image["'][\s\S]*?\/?>/i, `\u003cmeta property="og:image" content="${safeImg}"\u003e`);
      html = html.replace(/\u003cmeta\s+property=["']og:url["'][\s\S]*?\/?>/i, `\u003cmeta property="og:url" content="${canonicalUrl}"\u003e`);
      html = html.replace(/\u003clink[\s\S]*?rel=["']canonical["'][\s\S]*?\u003e/i, `\u003clink rel="canonical" href="${canonicalUrl}" /\u003e`);
      html = html.replace(/\u003cmeta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i, `\u003cmeta name="robots" content="index, follow"\u003e`);
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
  "image": ${JSON.stringify(image)},
  "description": ${JSON.stringify(description)}
}
</script>`;
      } else if (id === 'custom' || (req.query.title && req.query.artist)) {
        const qTitle = req.query.title as string;
        const qArtist = req.query.artist as string;
        const qCover = req.query.cover as string;
        const qUrl = req.query.url as string;

        if (qTitle && qArtist) {
          title = `${qTitle} - ${qArtist}`;
          description = `Escucha "${qTitle}" de ${qArtist} en Spotify, YouTube, Apple Music, Deezer y más plataformas de streaming.`;
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
  "image": ${JSON.stringify(image)},
  "description": ${JSON.stringify(description)}
}
</script>`;
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

      // Perform meta tag injections using robust regexes
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
      
      html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${safeTitle}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:title["']\s*\/?>/i, `<meta property="og:title" content="${safeTitle}">`);
      
      html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${safeDesc}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:description["']\s*\/?>/i, `<meta property="og:description" content="${safeDesc}">`);
      
      html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${safeImage}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:image["']\s*\/?>/i, `<meta property="og:image" content="${safeImage}">`);
      
      html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${shareUrl}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:url["']\s*\/?>/i, `<meta property="og:url" content="${shareUrl}">`);
      
      html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${shareUrl}" />`);
      
      // Override robots: allow indexing for this specific smart link page
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

      // Add og:type = music.song and Twitter Card tags (not present in base index.html)
      const extraMeta = [
        `<meta property="og:type" content="music.song">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${safeTitle}">`,
        `<meta name="twitter:description" content="${safeDesc}">`,
        `<meta name="twitter:image" content="${safeImage}">`,
      ].join('\n');
      html = html.replace('</head>', `${extraMeta}\n</head>`);

      // Inject full SSR content for SmartLinks — visible to crawlers, hidden from users
      const hiddenStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
      html = html.replace('<div id="root"></div>', `<div id="root"><article style="${hiddenStyle}"><h1>${safeTitle}</h1><p>${safeDesc}</p><img src="${safeImage}" alt="${safeTitle}"><a href="${shareUrl}">Escuchar ahora en Spotify, YouTube, Apple Music y Deezer</a></article></div>`);

      // HTTP-level robots signal so Google reads it even before parsing HTML
      res.setHeader('X-Robots-Tag', 'index, follow');
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
      const songCover = song?.cover || '/logo-diosmasgym.png';
      const canonicalUrl = `https://www.diosmasgym.com/letra/${normSlug}`;

      const pageTitle = `${songTitle} - Letra Oficial | ${songArtist} | Dios Más Gym`;
      const descriptionSnippet = lyricText ? lyricText.substring(0, 160).replace(/\n+/g, ' ') : `Lee la letra oficial de "${songTitle}" interpretada por ${songArtist}.`;
      const pageDescription = `Letra oficial de "${songTitle}" por ${songArtist}. ${descriptionSnippet}`;

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
        "image": songCover.startsWith('http') ? songCover : `https://www.diosmasgym.com${songCover}`,
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

      const jsonLdBlock = `
<script type="application/ld+json">
${JSON.stringify(schemaJsonLd, null, 2)}
</script>`;

      let html = await getBaseIndexHtml();

      const safeTitle = escapeXml(pageTitle);
      const safeDesc = escapeXml(pageDescription);
      // Always use absolute URL for og:image (Facebook/WhatsApp won't resolve relative URLs)
      const absoluteSongCover = songCover.startsWith('http') ? songCover : `https://www.diosmasgym.com${songCover.startsWith('/') ? '' : '/'}${songCover}`;
      const safeImage = escapeXml(absoluteSongCover);

      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
      html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${safeTitle}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:title["']\s*\/?>/i, `<meta property="og:title" content="${safeTitle}">`);
      html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${safeDesc}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:description["']\s*\/?>/i, `<meta property="og:description" content="${safeDesc}">`);
      html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${safeImage}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:image["']\s*\/?>/i, `<meta property="og:image" content="${safeImage}">`);
      html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:url["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}">`);
      html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
      
      html = html.replace(
        /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="robots" content="index, follow">`
      );

      const extraMeta = [
        `<meta property="og:type" content="music.song">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${safeTitle}">`,
        `<meta name="twitter:description" content="${safeDesc}">`,
        `<meta name="twitter:image" content="${safeImage}">`,
      ].join('\n');

      html = html.replace('</head>', `${extraMeta}\n${jsonLdBlock}\n</head>`);

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
        <a href="https://www.diosmasgym.com" style="display: inline-block; margin: 0.5rem; padding: 0.6rem 1.2rem; background: #2563a8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">← Volver al Inicio</a>
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
