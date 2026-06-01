import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
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

  if (providedPassword.trim() === MASTER_KEY) {
    return true;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === MASTER_KEY) {
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
    });

    if (!entry.name) entry.name = clean(values[0]);
    if (!entry.artist) entry.artist = clean(values[1]);
    if (!entry.url) entry.url = clean(values[2]);
    if (!entry.cover) entry.cover = clean(values[3]);
    if (!entry.type) entry.type = clean(values[4]);
    if (!entry.date) entry.date = clean(values[5]);

    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name) continue;

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

  // -------------------------------------------------------------
  // ACTION: LINKS
  // -------------------------------------------------------------
  if (action === 'links') {
    const artist = req.query.artist as string;
    const fileName = artist === 'juan614' ? 'links_juan614.json' : 'links.json';
    const LINKS_FILE = path.join(process.cwd(), 'data', fileName);

    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(LINKS_FILE)) {
          const defaultProfile = artist === 'juan614' ? {
            name: "Juan 614",
            bio: "Corridos, banda sinaloense y calle con propósito",
            avatar: "/logo-juan614-v2.jpg"
          } : { 
            name: "Dios Mas Gym", 
            bio: "El Arsenal de Fe | Música, Disciplina y Transformación", 
            avatar: "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" 
          };

          return res.json({ 
            links: [], 
            profile: defaultProfile 
          });
        }
        const data = fs.readFileSync(LINKS_FILE, 'utf-8');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).json(JSON.parse(data));
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
        const dir = path.dirname(LINKS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2));
        return res.status(200).json({ success: true, message: "Saved locally (Note: production requires DB)" });
      } catch (error) {
        return res.status(500).json({ error: 'Error saving links' });
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
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
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
    const CLOUD_URL = 'https://jsonbin-zeta.vercel.app/api/bins/HzFSZP5mcS';

    if (req.method === 'GET') {
      try {
        const response = await fetch(CLOUD_URL, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn("[api/common/maintenance] Cloud GET failed, falling back to local file:", err);
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
        const response = await fetch(CLOUD_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configData)
        });
        if (response.ok) {
          cloudSuccess = true;
        } else {
          cloudErrorMsg = `Cloud response status ${response.status}`;
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
          console.error("Both cloud and local writes failed:", localErr);
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

    if (INPUT_KEY === MASTER_KEY) {
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

    if (!apiKey) {
      console.error("Missing BLOGGER_API_KEY");
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://app.diosmasgym.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://app.diosmasgym.com/bio</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
    }

    try {
      const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=150&status=LIVE&fields=items(url,updated,published)`;
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://app.diosmasgym.com',
          'Origin': 'https://app.diosmasgym.com',
          'Accept': 'application/json',
          'User-Agent': 'Vercel-Server-Function'
        }
      });

      if (!response.ok) {
        throw new Error(`Blogger API responded with ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Fetch all music tracks dynamically for sitemap expansion
      let songs: MusicItem[] = [];
      try {
        songs = await fetchAllMusic();
      } catch (err) {
        console.error("Error fetching music for sitemap:", err);
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // 1. Home
      xml += `  <url>\n`;
      xml += `    <loc>https://app.diosmasgym.com/</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;

      // 2. Bio Page
      xml += `  <url>\n`;
      xml += `    <loc>https://app.diosmasgym.com/bio</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;

      // 3. Dynamic posts from Blogger API
      items.forEach((item: any) => {
        const bloggerUrl = item.url || '';
        const slug = bloggerUrl.split('/').pop()?.replace('.html', '') || '';
        if (slug) {
          const postUrl = `https://app.diosmasgym.com/post/${slug}`;
          const lastMod = item.updated ? item.updated.split('T')[0] : (item.published ? item.published.split('T')[0] : '');
          
          xml += `  <url>\n`;
          xml += `    <loc>${postUrl}</loc>\n`;
          if (lastMod) {
            xml += `    <lastmod>${lastMod}</lastmod>\n`;
          }
          xml += `    <changefreq>monthly</changefreq>\n`;
          xml += `    <priority>0.7</priority>\n`;
          xml += `  </url>\n`;
        }
      });

      // 4. Dynamic Smart Links for Songs
      songs.forEach((song) => {
        const songUrl = `https://app.diosmasgym.com/link/${song.id}`;
        const lastMod = song.date ? song.date.split('T')[0] : '';
        
        xml += `  <url>\n`;
        xml += `    <loc>${songUrl}</loc>\n`;
        if (lastMod) {
          xml += `    <lastmod>${lastMod}</lastmod>\n`;
        }
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).send(xml);
    } catch (error) {
      console.error("Error generating dynamic sitemap:", error);
      
      let songs: MusicItem[] = [];
      try {
        songs = await fetchAllMusic();
      } catch (err) {}

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url>\n`;
      xml += `    <loc>https://app.diosmasgym.com/</loc>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>1.0</priority>\n`;
      xml += `  </url>\n`;
      xml += `  <url>\n`;
      xml += `    <loc>https://app.diosmasgym.com/bio</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;

      songs.forEach((song) => {
        xml += `  <url>\n`;
        xml += `    <loc>https://app.diosmasgym.com/link/${song.id}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;
      
    }
  }

  // -------------------------------------------------------------
  // ACTION: POST SSR (Server-Side Meta Injection)
  // -------------------------------------------------------------
  if (action === 'post-ssr' || action === 'post') {
    const slug = req.query.slug as string;
    if (!slug) {
      try {
        const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
        const text = await htmlRes.text();
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(text);
      } catch (err) {
        return res.status(500).send("Error loading app");
      }
    }

    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    try {
      const queryTerm = slug.replace(/-/g, ' ');
      const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/search?key=${apiKey}&q=${encodeURIComponent(queryTerm)}&fetchImages=true&maxResults=10`;
      
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://app.diosmasgym.com',
          'Origin': 'https://app.diosmasgym.com',
          'Accept': 'application/json',
          'User-Agent': 'Vercel-Server-Function'
        }
      });
      
      let title = "Dios Mas Gym - El Arsenal de Fe";
      let description = "Reflexiones de fe, valentía y disciplina en El Arsenal.";
      let image = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

      let matchedPost: any = null;

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        const targetSlug = slug.toLowerCase();
        
        const getSlugFromUrl = (url: string) => {
          if (!url) return '';
          return url.split('/').pop()?.replace('.html', '') || '';
        };

        const match = items.find((p: any) => {
          const pSlug = getSlugFromUrl(p.url).toLowerCase();
          return pSlug === targetSlug || pSlug.includes(targetSlug) || targetSlug.includes(pSlug);
        });

        if (match) {
          matchedPost = match;
          title = match.title || title;
          description = (match.content || "").replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) + '...';
          
          if (match.images && match.images.length > 0) {
            image = match.images[0].url;
          } else {
            const imgMatch = match.content?.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) image = imgMatch[1];
          }
        }
      }

      // Fetch the compiled production index.html
      const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
      let html = await htmlRes.text();

      // Build JSON-LD structured data if post match was found
      let jsonLdBlock = '';
      if (typeof html === 'string') {
        const publishedDate = matchedPost?.published || new Date().toISOString();
        const modifiedDate = matchedPost?.updated || publishedDate;
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
      "url": "https://app.diosmasgym.com/logo-diosmasgym.png"
    }
  },
  "description": ${JSON.stringify(description)}
}
</script>`;
      }

      // Perform meta tag injections
      html = html.replace('<title>Dios Mas Gym - El Arsenal de Fe</title>', `<title>${title} | El Arsenal</title>`);
      html = html.replace('<meta property="og:title" content="Dios Mas Gym - El Arsenal de Fe">', `<meta property="og:title" content="${title}">`);
      html = html.replace('<meta property="og:description" content="Reflexiones de fe, valentía y disciplina en El Arsenal.">', `<meta property="og:description" content="${description}">`);
      html = html.replace('<meta property="og:image" content="https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600">', `<meta property="og:image" content="${image}">`);
      html = html.replace('<link rel="canonical" href="https://app.diosmasgym.com/" />', `<link rel="canonical" href="https://app.diosmasgym.com/post/${slug}" />`);
      html = html.replace('</head>', `${jsonLdBlock}\n<meta name="description" content="${description}">\n</head>`);

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);

    } catch (err: any) {
      console.error("Error in post-ssr:", err);
      try {
        const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(await htmlRes.text());
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
        const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(await htmlRes.text());
      } catch (err) {
        return res.status(500).send("Error loading app");
      }
    }

    try {
      const songs = await fetchAllMusic();
      const song = songs.find(s => s.id === id || (s.url && s.url.includes(id)));

      let title = "Dios Mas Gym - Smart Link";
      let description = "Escucha los últimos lanzamientos de música cristiana y de motivación.";
      let image = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";
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
    "url": ${JSON.stringify(`https://app.diosmasgym.com/bio/${song.artist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}`)}
  },
  "url": ${JSON.stringify(`https://app.diosmasgym.com/link/${song.id}`)},
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
    "url": ${JSON.stringify(`https://app.diosmasgym.com/bio/${qArtist.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym'}`)}
  },
  "url": ${JSON.stringify(`https://app.diosmasgym.com/link/custom?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}&cover=${encodeURIComponent(qCover || '')}&url=${encodeURIComponent(qUrl || '')}`)},
  "image": ${JSON.stringify(image)},
  "description": ${JSON.stringify(description)}
}
</script>`;
        }
      }

      // Fetch compiled index.html
      const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
      let html = await htmlRes.text();

      let shareUrl = `https://app.diosmasgym.com/link/${id}`;
      if (id === 'custom' && req.query.title && req.query.artist) {
        const qTitle = req.query.title as string;
        const qArtist = req.query.artist as string;
        const qCover = req.query.cover as string;
        const qUrl = req.query.url as string;
        shareUrl = `https://app.diosmasgym.com/link/custom?title=${encodeURIComponent(qTitle)}&artist=${encodeURIComponent(qArtist)}&cover=${encodeURIComponent(qCover || '')}&url=${encodeURIComponent(qUrl || '')}`;
      }

      // Perform injections using robust regexes to avoid minification discrepancies
      html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
      
      html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${title}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:title["']\s*\/?>/i, `<meta property="og:title" content="${title}">`);
      
      html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${description}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:description["']\s*\/?>/i, `<meta property="og:description" content="${description}">`);
      
      html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${image}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:image["']\s*\/?>/i, `<meta property="og:image" content="${image}">`);
      
      html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${shareUrl}">`);
      html = html.replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:url["']\s*\/?>/i, `<meta property="og:url" content="${shareUrl}">`);
      
      html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${shareUrl}" />`);
      
      html = html.replace('</head>', `${jsonLdBlock}\n<meta name="description" content="${description}">\n</head>`);

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);

    } catch (err: any) {
      console.error("Error in smartlink-ssr:", err);
      try {
        const htmlRes = await fetch('https://app.diosmasgym.com/index.html');
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(await htmlRes.text());
      } catch {
        return res.status(500).send("Error loading app");
      }
    }
  }

  // -------------------------------------------------------------
  // ACTION: RSS FEED (Dynamic feed.xml generation)
  // -------------------------------------------------------------
  if (action === 'rss' || action === 'feed' || action === 'feed.xml') {
    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
    xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
    xml += `<channel>\n`;
    xml += `  <title>Dios Mas Gym - El Arsenal de Fe</title>\n`;
    xml += `  <link>https://app.diosmasgym.com</link>\n`;
    xml += `  <description>Reflexiones de fe, valentía, disciplina y lanzamientos de música cristiana y de motivación.</description>\n`;
    xml += `  <language>es-es</language>\n`;
    xml += `  <atom:link href="https://app.diosmasgym.com/feed.xml" rel="self" type="application/rss+xml" />\n`;

    try {
      // 1. Fetch Blogger posts
      let posts: any[] = [];
      if (apiKey) {
        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=15&status=LIVE`;
        const response = await fetch(url, {
          headers: {
            'Referer': 'https://app.diosmasgym.com',
            'Origin': 'https://app.diosmasgym.com',
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
        const postUrl = `https://app.diosmasgym.com/post/${slug}`;
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
        const songUrl = `https://app.diosmasgym.com/link/${song.id}`;
        const pubDate = song.date ? new Date(song.date).toUTCString() : new Date().toUTCString();
        const description = `Lanzamiento oficial de la canción "${song.name}" de ${song.artist}. Escúchala en tu plataforma favorita.`;

        xml += `  <item>\n`;
        xml += `    <title>Estreno: ${escapeXml(song.name)} - ${escapeXml(song.artist)}</title>\n`;
        xml += `    <link>${songUrl}</link>\n`;
        xml += `    <guid>${songUrl}</guid>\n`;
        xml += `    <pubDate>${pubDate}</pubDate>\n`;
        xml += `    <description>${escapeXml(description)}</description>\n`;
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
