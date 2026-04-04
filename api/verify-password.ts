import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Use ADMIN_PASSWORD from environment variables (set in Vercel Dashboard)
  const MASTER_KEY = process.env.ADMIN_PASSWORD;

  if (!MASTER_KEY) {
    console.error("ADMIN_PASSWORD environment variable is not defined");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (password === MASTER_KEY) {
    return res.status(200).json({ success: true, message: 'Authenticated successfully' });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid password' });
  }
}
