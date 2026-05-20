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

function verifyCronOrAdmin(req: any): boolean {
  if (verifyAdminPassword(req)) {
    return true;
  }

  const cronSecret = process.env.CRON_SECRET;
  let authHeader = '';
  let vercelSig = '';

  if (typeof req.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || '';
    vercelSig = req.headers.get('x-vercel-signature') || '';
  } else if (req.headers) {
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

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : '';
        });
        return obj;
    });
}

async function fetchRows(): Promise<Record<string, string>[]> {
    const res = await fetch(`${GOOGLE_SHEET_URL}?read=true&t=${Date.now()}`);
    if (!res.ok) throw new Error(`Google Sheet respondió con error ${res.status}`);
    
    const text = await res.text();
    
    // Try JSON
    try {
        if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
            return JSON.parse(text);
        }
    } catch (e) {
        console.log('[check-releases] Falló JSON parse, intentando CSV...');
    }

    return parseCSV(text);
}

function normalizeRow(r: Record<string, string>): ReleaseRow {
    const find = (keys: string[]) => {
        const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
        return k ? (r[k] ?? '') : '';
    };
    let rawDate = find(['releasedate', 'fecha']).trim();
    // Convert DD/MM/YYYY to YYYY-MM-DD if needed
    if (rawDate && rawDate.includes('/') && !rawDate.includes('-')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
            const d = parts[0].trim();
            const m = parts[1].trim();
            const y = parts[2].trim();
            rawDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }

    return {
        Artista: find(['artista']),
        name: find(['name', 'nombre', 'titulo', 'título']),
        releaseDate: rawDate,
        preSaveLink: find(['presavelink', 'spotify', 'presave']),
        coverImageUrl: find(['coverimageurl', 'imagen', 'portada']),
    };
}

async function sendOneSignalPush(release: ReleaseRow): Promise<any> {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) {
        return { error: 'Missing environment variables' };
    }

    const artistEmoji = release.Artista.toLowerCase().includes('juan') ? '🤠' : '💪';
    const payload = {
        app_id: APP_ID,
        included_segments: ['Active Users', 'Subscribed Users', 'Total Subscriptions'],
        headings: { 
            en: `${artistEmoji} New Release! ${release.name}`,
            es: `${artistEmoji} ¡Hoy estrena! ${release.name}` 
        },
        contents: {
            en: `${release.Artista} just released something new. It's time to make some noise! 🔥`,
            es: `${release.Artista} acaba de lanzar algo nuevo. ¡Es el momento de hacer ruido en redes! 🔥`,
        },
        url: release.preSaveLink || 'https://app.diosmasgym.com/#/admin/proximos-lanzamientos',
        ...(release.coverImageUrl
            ? { big_picture: release.coverImageUrl, large_icon: release.coverImageUrl }
            : { large_icon: 'https://app.diosmasgym.com/icon-192.png' }),
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${API_KEY}`,
        },
        body: JSON.stringify(payload),
    });

    return await response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Allow GET (cron) or POST (manual trigger from admin panel)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Security: only allow cron or admin panel calls
    if (!verifyCronOrAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }


    try {
        const rows = await fetchRows();

        if (rows.length === 0) {
            return res.status(200).json({ sent: 0, message: 'La hoja de cálculo parece estar vacía.' });
        }

        // --- 1. Detect New Releases from Catalog ---
        // Usa el mismo endpoint de música pero con un parser robusto
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host || 'app.diosmasgym.com';
        const baseUrl = `${protocol}://${host}`;

        // Parse CSV robusto (maneja comillas, comas dentro de campos, etc.)
        const parseCatalogCSV = (text: string): any[] => {
            const lines = text.split(/\r?\n/);
            if (lines.length < 2) return [];
            
            // Buscar la línea de headers
            let headerIdx = 0;
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i].toLowerCase();
                if (l.includes('nombre') || l.includes('artista')) { headerIdx = i; break; }
            }
            
            const parseCSVLine = (line: string): string[] => {
                const values: string[] = [];
                let current = '';
                let inQuotes = false;
                for (const char of line) {
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
                    else current += char;
                }
                values.push(current.trim());
                return values.map(v => v.replace(/^"|"$/g, '').trim());
            };
            
            const headers = parseCSVLine(lines[headerIdx]);
            const results: any[] = [];
            
            for (let i = headerIdx + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line === '---') continue;
                const vals = parseCSVLine(line);
                const entry: any = {};
                headers.forEach((h, idx) => {
                    const key = h.toLowerCase();
                    const val = vals[idx] || '';
                    if (key === 'nombre') entry.name = val;
                    else if (key === 'artista') entry.artist = val;
                    else if (key.includes('url') || key === 'url spotify' || key === 'url youtube') { if (!entry.url) entry.url = val; }
                    else if (key.includes('portada')) entry.cover = val;
                    else if (key === 'fecha') entry.date = val;
                    else if (key === 'tipo') entry.type = val;
                });
                // Positional fallbacks
                if (!entry.name) entry.name = vals[0] || '';
                if (!entry.artist) entry.artist = vals[1] || '';
                if (!entry.url) entry.url = vals[2] || '';
                if (!entry.cover) entry.cover = vals[3] || '';
                if (!entry.date) entry.date = vals[5] || '';
                
                if (entry.name && entry.url && !entry.url.includes('spotify.com/artist')) {
                    results.push(entry);
                }
            }
            return results;
        };

        const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        const newlyDetected: any[] = [];

        try {
            const [dMRes, j6Res] = await Promise.all([
                fetch(`${baseUrl}/api/music?artist=diosmasgym`),
                fetch(`${baseUrl}/api/music?artist=juan614`)
            ]);
            
            const dMCatalog = dMRes.ok ? parseCatalogCSV(await dMRes.text()) : [];
            const j6Catalog = j6Res.ok ? parseCatalogCSV(await j6Res.text()) : [];
            
            console.log(`[check-releases] Catalog sizes: dM=${dMCatalog.length}, j6=${j6Catalog.length}`);
            
            const allCatalog = [...dMCatalog, ...j6Catalog];
            
            for (const item of allCatalog) {
                if (!item.date) continue;
                const itemDate = new Date(item.date);
                if (isNaN(itemDate.getTime()) || itemDate < sevenDaysAgo) continue;
                
                // Check if already in sheet
                const alreadyInSheet = rows.some(r => {
                    const row = normalizeRow(r);
                    const rowName = row.name.toLowerCase().trim();
                    const itemName = (item.name || '').toLowerCase().trim();
                    return rowName && itemName && (
                        rowName === itemName || 
                        rowName.includes(itemName) || 
                        itemName.includes(rowName)
                    );
                });
                
                if (!alreadyInSheet && item.name) {
                    console.log(`[check-releases] New item detected: ${item.name} (${item.date})`);
                    newlyDetected.push(item);
                    // Attempt to sync to sheet
                    try {
                        const syncPayload = {
                            Artista: item.artist || 'Diosmasgym',
                            name: item.name,
                            releaseDate: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
                            coverImageUrl: item.cover || '',
                            preSaveLink: item.url || '',
                            audioUrl: item.url || ''
                        };
                        const qs = new URLSearchParams(syncPayload as any).toString();
                        await fetch(`${GOOGLE_SHEET_URL}?${qs}`, { method: 'POST', body: JSON.stringify(syncPayload) });
                        console.log(`[check-releases] Auto-synced: ${item.name}`);
                    } catch (e) {
                        console.error(`[check-releases] Failed to auto-sync ${item.name}:`, e);
                    }
                }
            }
        } catch (catalogErr: any) {
            console.error('[check-releases] Catalog detection failed (non-fatal):', catalogErr.message);
        }

        // --- 2. Fetch Fresh Sheet (if we synced anything) ---
        let finalRows = rows;
        if (newlyDetected.length > 0) {
            finalRows = await fetchRows();
        }

        // Calculate "today" in Mexico City timezone (UTC-6)
        const now = new Date();
        const mxNow = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        const todayStr = mxNow.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Allow manual override via query param
        const targetDate = (req.query.date as string) || todayStr;

        const releases = finalRows.map(normalizeRow);
        
        // Match releases for the target date
        const todaysReleases = releases.filter(r => {
            if (!r.name || !r.releaseDate) return false;
            // Support both YYYY-MM-DD and DD/MM/YYYY
            let cleanDate = r.releaseDate;
            if (cleanDate.includes('/') && !cleanDate.includes('-')) {
                const [d, m, y] = cleanDate.split('/');
                cleanDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            return cleanDate === targetDate;
        });

        console.log(`[check-releases] Target Date: ${targetDate} | Total Rows: ${finalRows.length} | Today: ${todaysReleases.length}`);
        
        const debugInfo = {
            targetDate,
            all_releases_dates: releases.map(r => `${r.name}: ${r.releaseDate}`),
            todays_count: todaysReleases.length
        };

        if (todaysReleases.length === 0) {
            return res.status(200).json({ 
                sent: 0, 
                message: `No hay estrenos para la fecha ${targetDate}.`,
                detected: newlyDetected.length,
                debug: debugInfo
            });
        }

        const APP_ID = process.env.ONESIGNAL_APP_ID;
        const API_KEY = process.env.ONESIGNAL_REST_API_KEY;
        if (!APP_ID || !API_KEY) {
            return res.status(200).json({ 
                sent: 0, 
                message: 'Error: El servidor no detecta las variables de OneSignal. ¿Has desplegado los cambios en Vercel después de añadirlas?',
                debug: {
                    has_app_id: !!APP_ID,
                    has_api_key: !!API_KEY,
                    app_id_start: APP_ID ? APP_ID.substring(0, 5) + '...' : 'nulo',
                },
                detected: newlyDetected.length
            });
        }

        // Send push
        const pushResults = await Promise.all(todaysReleases.map(sendOneSignalPush));

        return res.status(200).json({
            sent: todaysReleases.length,
            releases: todaysReleases.map(r => r.name),
            detected: newlyDetected.length,
            pushResults
        });
    } catch (err: any) {
        console.error('[check-releases] Error:', err);
        return res.status(200).json({ 
            error: `Error interno: ${err.message}`,
            version: '4.7.1',
            env_check: {
                has_app_id: !!process.env.ONESIGNAL_APP_ID,
                has_api_key: !!process.env.ONESIGNAL_REST_API_KEY
            }
        });
    }
}
