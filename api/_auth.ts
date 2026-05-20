import type { VercelRequest } from '@vercel/node';

/**
 * Valida si la contraseña del administrador proporcionada en las cabeceras coincide
 * con la contraseña configurada en las variables de entorno.
 */
export function verifyAdminPassword(req: any): boolean {
  const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
  const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');
  
  if (!MASTER_KEY) {
    console.error("ADMIN_PASSWORD is not defined in environment variables.");
    return false;
  }

  let providedPassword = '';
  let authHeader = '';

  if (typeof req.headers?.get === 'function') {
    // Edge Runtime Request
    providedPassword = req.headers.get('x-admin-password') || '';
    authHeader = req.headers.get('authorization') || '';
  } else if (req.headers) {
    // Node.js VercelRequest
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

/**
 * Valida si la petición proviene de un cron programado (CRON_SECRET o x-vercel-signature)
 * o si es una llamada autorizada del administrador.
 */
export function verifyCronOrAdmin(req: any): boolean {
  if (verifyAdminPassword(req)) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  let authHeader = '';
  let vercelSig = '';

  if (typeof req.headers?.get === 'function') {
    // Edge Runtime
    authHeader = req.headers.get('authorization') || '';
    vercelSig = req.headers.get('x-vercel-signature') || '';
  } else if (req.headers) {
    // Node.js
    authHeader = (req.headers['authorization'] as string) || '';
    vercelSig = (req.headers['x-vercel-signature'] as string) || '';
  }

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  if (vercelSig) {
    return true;
  }

  return false;
}
