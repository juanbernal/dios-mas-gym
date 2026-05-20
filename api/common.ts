import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { verifyAdminPassword } from './_auth';

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
    if (artist.toLowerCase() === 'diosmasgym') {
      csvUrl = process.env.CSV_URL_DIOSMASGYM || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
    } else if (artist.toLowerCase() === 'juan614') {
      csvUrl = process.env.CSV_URL_JUAN614 || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';
    } else {
      return res.status(404).json({ error: 'Artist not found' });
    }

    try {
      const fetchUrl = refresh ? `${csvUrl}&t=${Date.now()}` : csvUrl;
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      const csvData = await response.text();
      
      if (refresh) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
      }
      
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csvData);
    } catch (error) {
      console.error(`Error fetching music for ${artist}:`, error);
      return res.status(500).json({ error: 'Internal Server Error' });
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
    const blogId = process.env.BLOG_ID || "5031959192789589903";
    const apiKey = process.env.BLOGGER_API_KEY;

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
