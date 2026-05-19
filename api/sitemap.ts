import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    // Fetch up to 150 posts (Blogger max is 500 per call, 150 is plenty and fast)
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
    
    // Fallback basic sitemap so Google doesn't see a 500 error
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
