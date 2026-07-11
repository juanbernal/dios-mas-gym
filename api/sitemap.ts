import type { VercelRequest, VercelResponse } from '@vercel/node';

const generateSlug = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

async function fetchCatalogCSV(artist: string): Promise<string> {
  const urls: Record<string, string> = {
    diosmasgym: process.env.MUSIC_CSV_URL_DIOSMASGYM || '',
    juan614: process.env.MUSIC_CSV_URL_JUAN614 || '',
  };
  const url = urls[artist];
  if (!url) return '';
  const res = await fetch(url);
  return res.ok ? res.text() : '';
}

function parseIdsFromCSV(csv: string): string[] {
  const lines = csv.split(/\r?\n/);
  const ids: string[] = [];
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre') && lines[i].includes('Artista')) { startIndex = i; break; }
  }
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const urlVal = values[2] || '';
    const name = values[0] || '';
    const artist = values[1] || '';
    if (!name || !urlVal) continue;
    let videoId = '';
    if (urlVal.includes('youtube.com') && urlVal.includes('v=')) {
      videoId = urlVal.split('v=')[1].split('&')[0];
    } else if (urlVal.includes('youtu.be/')) {
      videoId = urlVal.split('youtu.be/')[1].split('?')[0];
    }
    ids.push(videoId || generateSlug(`${artist}-${name}`));
  }
  return ids;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1 hour

  try {
    const [csv1, csv2] = await Promise.all([
      fetchCatalogCSV('diosmasgym'),
      fetchCatalogCSV('juan614'),
    ]);

    const ids1 = parseIdsFromCSV(csv1);
    const ids2 = parseIdsFromCSV(csv2);
    const allIds = [...new Set([...ids1, ...ids2])].filter(Boolean);

    const base = 'https://app.diosmasgym.com';
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { url: `${base}/`, priority: '1.0', changefreq: 'daily' },
      { url: `${base}/reflexiones/`, priority: '0.8', changefreq: 'daily' },
      { url: `${base}/bio/diosmasgym`, priority: '0.9', changefreq: 'weekly' },
      { url: `${base}/bio/juan614`, priority: '0.9', changefreq: 'weekly' },
    ];

    const smartLinkPages = allIds.map(id => ({
      url: `${base}/link/${id}`,
      priority: '0.7',
      changefreq: 'monthly',
    }));

    const allPages = [...staticPages, ...smartLinkPages];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map(p => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
