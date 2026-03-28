import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. Security check: Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Security: Input Validation
  const maxResults = req.query.maxResults || '50';
  const pageToken = req.query.pageToken;

  // Validate maxResults is a number and within range 1-50
  const limit = parseInt(maxResults as string, 10);
  if (isNaN(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'Invalid maxResults parameter. Must be between 1 and 50.' });
  }

  try {
    const blogId = process.env.BLOG_ID || "5031959192789589903";
    const apiKey = process.env.BLOGGER_API_KEY;
    
    if (!apiKey) {
      console.error("CRITICAL: BLOGGER_API_KEY is not defined.");
      return res.status(500).json({ error: "Missing BLOGGER_API_KEY in server environment" });
    }

    let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=${limit}&fetchImages=true`;
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
        'Referer': 'https://dios-mas-gym.vercel.app',
        'Accept': 'application/json'
      }
    });
    if (!response.ok) {
      const errData = await response.json();
      console.error("Blogger API Error Status:", response.status);
      return res.status(response.status).json({ 
        error: "Failed to fetch data from source",
        message: process.env.NODE_ENV === 'development' ? errData.error?.message : undefined
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
