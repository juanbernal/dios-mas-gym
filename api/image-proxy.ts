import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import http from 'http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache locally for 24 hours

    client.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (proxyRes) => {
      const statusCode = proxyRes.statusCode || 0;
      
      // Handle potential redirects (e.g. Google Drive, YouTube, etc.)
      if (statusCode >= 300 && statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = new URL(proxyRes.headers.location, imageUrl).toString();
        // Redirect client to proxy again with redirected URL
        res.writeHead(302, { 'Location': `/api/image-proxy?url=${encodeURIComponent(redirectUrl)}` });
        return res.end();
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.writeHead(statusCode);
        return res.end(`Failed to fetch image: HTTP ${statusCode}`);
      }

      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error('[image-proxy] Fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch image', details: err.message });
    });
  } catch (error: any) {
    console.error('[image-proxy] Invalid URL:', error);
    res.status(400).json({ error: 'Invalid URL provided', details: error.message });
  }
}
