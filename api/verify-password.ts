import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Try to get password from body, supporting both parsed and raw formats
  let { password } = req.body || {};
  
  if (!password && typeof req.body === 'string') {
    try {
      password = JSON.parse(req.body).password;
    } catch {}
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Priority search for ADMIN_PASSWORD, otherwise find any other ADMIN-like key
  const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
  const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');
  const INPUT_KEY = String(password).trim();

  if (!MASTER_KEY) {
    const allKeys = Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN')).join(', ');
    const adminLikeKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes('ADMIN')).join(', ');
    
    return res.status(500).json({ 
      success: false, 
      error: 'CONFIG_ERROR',
      message: 'La variable ADMIN_PASSWORD no está definida en Vercel.',
      diagnostics: { 
        input_len: INPUT_KEY.length,
        target_len: 0,
        env_keys_found: allKeys,
        admin_like_keys: adminLikeKeys || 'Ninguna',
        chosen_key: ENV_KEY_NAME
      }
    });
  }

  if (INPUT_KEY === MASTER_KEY) {
    return res.status(200).json({ success: true, message: 'Authenticated successfully' });
  } else {
    // Return diagnostic info to help the user debug (length mismatch, etc)
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid password',
      diagnostics: {
        input_len: INPUT_KEY.length,
        target_len: MASTER_KEY.length,
        match: false
      }
    });
  }
}
