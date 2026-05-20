import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. Security check: Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
  const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');

  if (req.method === 'POST') {
    try {
      const { title, content, labels, isDraft } = req.body;
      const auth = req.headers.authorization;

      if (!auth) {
        return res.status(401).json({ error: 'Authentication required for POST' });
      }

      const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/?isDraft=${isDraft ? 'true' : 'false'}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'blogger#post',
          blog: { id: blogId },
          title,
          content,
          labels
        })
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 2. Security: Input Validation
  const maxResults = req.query.maxResults || '50';
  const pageToken = req.query.pageToken;
  const q = req.query.q;

  // Validate maxResults is a number and within range 1-50
  const limit = parseInt(maxResults as string, 10);
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Invalid maxResults parameter. Must be between 1 and 50.' });
  }

  try {
    const blogId = (process.env.BLOG_ID || "5031959192789589903").trim().replace(/^["']|["']$/g, '');
    const apiKey = (process.env.BLOGGER_API_KEY || "").trim().replace(/^["']|["']$/g, '');
    
    if (!apiKey) {
      console.error("CRITICAL: BLOGGER_API_KEY is not defined.");
      return res.status(500).json({ error: "Missing BLOGGER_API_KEY in server environment" });
    }

    let endpoint = q ? 'posts/search' : 'posts';
    const status = req.query.status || 'LIVE';
    let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/${endpoint}?key=${apiKey}&maxResults=${limit}&fetchImages=true&status=${status}`;
    
    if (q) {
      url += `&q=${encodeURIComponent(q as string)}`;
    }
    if (pageToken) {
      // Basic sanitization for pageToken (alphanumeric check)
      if (typeof pageToken === 'string' && /^[a-zA-Z0-9_-]+$/.test(pageToken)) {
        url += `&pageToken=${pageToken}`;
      } else if (pageToken) {
        return res.status(400).json({ error: 'Invalid pageToken format' });
      }
    }

    console.log(`API Proxy Request: limit=${limit}, pageToken=${pageToken || 'none'}`);

    const response = await fetch(url, {
      headers: {
        'Referer': 'https://app.diosmasgym.com',
        'Origin': 'https://app.diosmasgym.com',
        'Accept': 'application/json',
        'User-Agent': 'Vercel-Server-Function'
      }
    });
    
    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      console.error("Blogger API Error Details:", JSON.stringify(errData, null, 2));
      
      const errorMessage = errData.error?.message || `Blogger API responded with ${response.status}`;
      return res.status(response.status).json({ 
        error: errorMessage,
        details: errData.error || null,
        debug_info: {
          blogId,
          endpoint,
          hasApiKey: !!apiKey
        }
      });
    }
    
    const data = await response.json();
    
    // 3. Security: Set caching headers for performance and to reduce API calls
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Internal Error in API handler:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
