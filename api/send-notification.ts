import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) {
        return res.status(500).json({ error: 'Missing OneSignal environment variables' });
    }

    if (req.method === 'GET') {
        try {
            const response = await fetch(`https://onesignal.com/api/v1/apps/${APP_ID}`, {
                headers: { Authorization: `Basic ${API_KEY}` }
            });
            const data = await response.json();
            return res.status(200).json({ subscribers: data.messageable_players || 0 });
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
            payload.include_player_ids = [testPlayerId];
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

        return res.status(200).json({ success: true, data });
    } catch (err: any) {
        console.error('[send-notification] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
