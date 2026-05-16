import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron: runs daily at 9:00 AM (UTC-6 = 15:00 UTC)
// Checks Google Sheet for releases today and sends OneSignal push
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_SHEET_URL =
    'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

interface ReleaseRow {
    Artista: string;
    name: string;
    releaseDate: string;
    preSaveLink?: string;
    coverImageUrl?: string;
}

function normalizeRow(r: Record<string, string>): ReleaseRow {
    const find = (keys: string[]) => {
        const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
        return k ? (r[k] ?? '') : '';
    };
    let rawDate = find(['releasedate', 'fecha']);
    // Convert DD/MM/YYYY to YYYY-MM-DD if needed
    if (rawDate && rawDate.includes('/') && !rawDate.includes('-')) {
        const [d, m, y] = rawDate.split('/');
        if (d && m && y) rawDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return {
        Artista: find(['artista']),
        name: find(['name', 'nombre', 'titulo', 'título']),
        releaseDate: rawDate,
        preSaveLink: find(['presavelink', 'spotify', 'presave']),
        coverImageUrl: find(['coverimageurl', 'imagen', 'portada']),
    };
}

async function sendOneSignalPush(release: ReleaseRow): Promise<void> {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) {
        console.warn('[check-releases] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY not set — skipping push');
        return;
    }

    const artistEmoji = release.Artista.toLowerCase().includes('juan') ? '🤠' : '💪';
    const payload = {
        app_id: APP_ID,
        included_segments: ['All'],          // All subscribers
        headings: { en: `${artistEmoji} ¡Hoy estrena! ${release.name}` },
        contents: {
            en: `${release.Artista} acaba de lanzar algo nuevo. ¡Es el momento de hacer ruido en redes! 🔥`,
        },
        url: release.preSaveLink || 'https://app.diosmasgym.com/#/admin/proximos-lanzamientos',
        ...(release.coverImageUrl
            ? { big_picture: release.coverImageUrl, large_icon: release.coverImageUrl }
            : { large_icon: 'https://app.diosmasgym.com/icon-192.png' }),
        android_accent_color: 'c5a059',
        chrome_web_icon: 'https://app.diosmasgym.com/icon-192.png',
        chrome_web_badge: 'https://app.diosmasgym.com/icon-192.png',
        ttl: 86400, // expire after 24h if not delivered
    };

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
        console.error('[check-releases] OneSignal error:', data);
    } else {
        console.log(`[check-releases] ✅ Push sent for "${release.name}":`, data.id);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Allow GET (cron) or POST (manual trigger from admin panel)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Security: only allow cron (GET) or admin panel calls (POST)
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    // We only enforce strict security on GET requests (automated cron)
    if (req.method === 'GET' && cronSecret) {
        if (authHeader !== `Bearer ${cronSecret}`) {
            const vercelSig = req.headers['x-vercel-signature'];
            if (!vercelSig) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
        }
    }


    try {
        // Fetch releases from Google Sheet
        const sheetRes = await fetch(`${GOOGLE_SHEET_URL}?read=true&t=${Date.now()}`);
        if (!sheetRes.ok) throw new Error('Failed to fetch Google Sheet');
        const rows: Record<string, string>[] = await sheetRes.json();

        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const releases = rows.map(normalizeRow);
        const todaysReleases = releases.filter(r => r.releaseDate === todayStr && r.name);

        console.log(`[check-releases] Date: ${todayStr} | Releases today: ${todaysReleases.length}`);

        if (todaysReleases.length === 0) {
            return res.status(200).json({ sent: 0, message: 'No releases today' });
        }

        // Send a push for each release today
        await Promise.all(todaysReleases.map(sendOneSignalPush));

        return res.status(200).json({
            sent: todaysReleases.length,
            releases: todaysReleases.map(r => r.name),
        });
    } catch (err: any) {
        console.error('[check-releases] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
