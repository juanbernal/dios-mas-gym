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

    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) {
        return res.status(500).json({ error: 'Missing OneSignal environment variables' });
    }

    if (req.method === 'GET') {
        try {
            const response = await fetch(`https://onesignal.com/api/v1/apps/${APP_ID}`, {
                headers: { 
                    Authorization: `Basic ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('[send-notification] OneSignal GET error:', JSON.stringify(data));
                return res.status(response.status).json({ 
                    error: `Error de API de OneSignal (${response.status}): ${data.errors ? data.errors.join(', ') : 'Error desconocido de OneSignal'}` 
                });
            }
            // OneSignal devuelve el conteo en distintos campos según la versión de la API
            const subscribers = data.messageable_players ?? data.players ?? data.total_subscriptions ?? 0;
            console.log('[send-notification] OneSignal app data:', JSON.stringify({ 
                messageable_players: data.messageable_players,
                players: data.players,
                total_subscriptions: data.total_subscriptions,
                subscribers_used: subscribers
            }));
            return res.status(200).json({ subscribers });
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { title, message, url, imageUrl, testPlayerId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const payload: any = {
            app_id: APP_ID,
            headings: { 
                en: title,
                es: title 
            },
            contents: {
                en: message,
                es: message,
            },
            url: url || 'https://app.diosmasgym.com',
            ...(imageUrl && { big_picture: imageUrl, large_icon: imageUrl }),
            ...(!imageUrl && { large_icon: 'https://app.diosmasgym.com/icon-192.png' })
        };

        if (testPlayerId) {
            // OneSignal v16+ uses subscription_ids
            payload.include_subscription_ids = [testPlayerId];
        } else {
            payload.included_segments = ['Active Users', 'Subscribed Users', 'Total Subscriptions'];
        }

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.errors ? data.errors.join(', ') : 'Failed to send notification');
        }

        if (data.recipients === 0) {
            return res.status(400).json({ error: 'La notificación se envió pero ningún dispositivo la recibió (recipients = 0). Asegúrate de tener permisos activos.' });
        }

        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error('[send-notification] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
