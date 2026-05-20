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

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
      return res.status(200).send(xml);
    } catch (error) {
      console.error("Error generating dynamic sitemap:", error);
      
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
      xml += `</urlset>`;
      
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(xml);
    }
  }

  return res.status(404).json({ error: 'Action not found' });
}
