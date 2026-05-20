import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!verifyAdminPassword(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin password required' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { base64Data } = req.body;
        if (!base64Data) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Clean the Base64 header if it exists
        const b64 = base64Data.replace(/^data:image\/\w+;base64,/, "");

        // Build URL parameters for ImgBB (using key from env, with a secure fallback)
        const imgbbKey = (process.env.IMGBB_API_KEY || "6d207e02198a847aa98d0a2a901485a5").trim();
        const params = new URLSearchParams();
        params.append("key", imgbbKey);
        params.append("image", b64);

        // Upload to ImgBB
        const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: params
        });

        const imgbbJson = await imgbbRes.json() as any;
        
        if (imgbbJson.success) {
            return res.status(200).json({ url: imgbbJson.data.url });
        } else {
            return res.status(500).json({ error: 'ImgBB rejected the image', details: imgbbJson });
        }
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}
