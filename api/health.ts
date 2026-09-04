import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Health Check Endpoint — /api/health
 * Útil para monitoreo externo (UptimeRobot, BetterStack, etc.)
 * Retorna estado del servicio y timestamp.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();

  // Verificar conexión con la API de música
  let musicApiStatus = 'unknown';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const musicRes = await fetch(
      `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/music?artist=diosmasgym&limit=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    musicApiStatus = musicRes.ok ? 'ok' : `error_${musicRes.status}`;
  } catch (e: any) {
    musicApiStatus = e.name === 'AbortError' ? 'timeout' : 'error';
  }

  const elapsed = Date.now() - startTime;

  const status = musicApiStatus === 'ok' ? 'healthy' : 'degraded';

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  return res.status(status === 'healthy' ? 200 : 207).json({
    status,
    version: '5.0.7',
    timestamp: new Date().toISOString(),
    uptime_check_ms: elapsed,
    services: {
      music_api: musicApiStatus,
    },
    environment: process.env.VERCEL_ENV || 'unknown',
  });
}
