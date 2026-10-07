import type { VercelRequest, VercelResponse } from '@vercel/node';

import crypto from 'crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const strA = String(a).trim();
  const strB = String(b).trim();
  try {
    const hashA = crypto.createHash('sha256').update(strA).digest();
    const hashB = crypto.createHash('sha256').update(strB).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch (e) {
    return false;
  }
}

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

  if (timingSafeCompare(providedPassword, MASTER_KEY)) {
    return true;
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (timingSafeCompare(token, MASTER_KEY)) {
      return true;
    }
  }

  return false;
}

function verifyCronOrAdmin(req: any): boolean {
  // 1. Si viene con la cabecera del panel de administración, validarlo directamente
  if (verifyAdminPassword(req)) {
    return true;
  }

  // 2. Si viene de la automatización Cron de Vercel: Vercel manda "Authorization: Bearer <CRON_SECRET>".
  // (Antes bastaba con mandar cualquier cabecera x-vercel-signature, y cualquiera podia disparar
  // notificaciones a todos los suscriptores.)
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  let authHeader = '';
  if (typeof req.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || '';
  } else if (req.headers) {
    authHeader = (req.headers['authorization'] as string) || '';
  }
  return !!cronSecret && timingSafeCompare(authHeader, `Bearer ${cronSecret}`);
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
        // Sheets manda numeros o fechas en algunas celdas: todo se trata como texto
        return k && r[k] != null ? String(r[k]) : '';
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
    
    // Generate SmartLink URL
    const generateSlug = (text: string) => {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    };

    let videoId = '';
    if (release.preSaveLink) {
        if (release.preSaveLink.includes('youtube.com') && release.preSaveLink.includes('v=')) {
            videoId = release.preSaveLink.split('v=')[1].split('&')[0];
        } else if (release.preSaveLink.includes('youtu.be/')) {
            videoId = release.preSaveLink.split('youtu.be/')[1].split('?')[0];
        }
    }
    const songId = videoId || generateSlug(`${release.Artista}-${release.name}`);
    const smartLinkUrl = `https://www.diosmasgym.com/link/${songId}`;

    const payload: any = {
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
        url: smartLinkUrl,
        ...(release.coverImageUrl
            ? { big_picture: release.coverImageUrl, large_icon: release.coverImageUrl }
            : { large_icon: 'https://www.diosmasgym.com/icon-192.png' }),
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

async function sendConsolidatedPush(items: any[]): Promise<any> {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) {
        return { error: 'Missing environment variables' };
    }

    const first = items[0];
    const artist = first.artist || 'Diosmasgym';
    const artistEmoji = artist.toLowerCase().includes('juan') ? '🤠' : '💪';
    const names = items.map(i => i.name).slice(0, 3).join(', ');
    const more = items.length > 3 ? ` y ${items.length - 3} más` : '';

    const payload: any = {
        app_id: APP_ID,
        included_segments: ['Active Users', 'Subscribed Users', 'Total Subscriptions'],
        headings: { 
            en: `${artistEmoji} New Releases from ${artist}!`,
            es: `${artistEmoji} ¡Nuevos Estrenos de ${artist}!` 
        },
        contents: {
            en: `New music available: ${names}${more}. Listen now on the website! 🔥`,
            es: `Se acaban de estrenar ${items.length} canciones nuevas: ${names}${more}. ¡Entra a escucharlas! 🔥`,
        },
        url: 'https://www.diosmasgym.com/#arsenal-content',
        ...(first.cover
            ? { big_picture: first.cover, large_icon: first.cover }
            : { large_icon: 'https://www.diosmasgym.com/icon-192.png' }),
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

// El catalogo no dice a que album pertenece cada cancion. Aqui va el nombre real de cada album
// (artista|fecha de estreno); si no esta, se usa el titulo mas corto, igual que el panel.
const KNOWN_ALBUMS: Record<string, string> = {
    'diosmasgym|2026-10-06': 'Entre Amigos y Ángeles',
};

// Estrenos que ya se avisaron por notificacion aunque no quedaron en la hoja (artista|fecha):
// se guardan en la hoja pero no se vuelve a notificar.
const ALREADY_NOTIFIED = new Set<string>(['diosmasgym|2026-10-06']);

async function syncToGoogleSheet(item: any): Promise<boolean> {
    try {
        const payload: Record<string, string> = {
            Artista: item.artist || 'Diosmasgym',
            name: item.name,
            releaseDate: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
            coverImageUrl: item.cover || '',
            preSaveLink: item.id ? `https://www.diosmasgym.com/link/${item.id}` : (item.url || ''),
            audioUrl: item.url || ''
        };

        const formParams = new URLSearchParams();
        Object.entries(payload).forEach(([k, v]) => formParams.append(k, String(v ?? '')));
        // El Apps Script de la hoja principal solo acepta escrituras con su clave
        const secret = (process.env.GS_MAIN_SECRET || '').trim();
        if (secret) formParams.append('secret', secret);

        const response = await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formParams.toString()
        });

        // Apps Script responde 200 aunque rechace la escritura: hay que leer la respuesta
        const text = await response.text();
        let ok = response.ok;
        try {
            const body = JSON.parse(text);
            if (body?.error || body?.status === 'error' || body?.success === false || body?.result === 'error') ok = false;
        } catch { if (/error|unauthorized|denied/i.test(text.slice(0, 300))) ok = false; }
        console.log(`[check-releases] Auto-sync "${item.name}" -> ${ok ? 'guardado' : 'RECHAZADO'} (status ${response.status}): ${text.slice(0, 150)}`);
        return ok;
    } catch (e) {
        console.error(`[check-releases] Failed to auto-sync "${item.name}" to Google Sheet:`, e);
        return false;
    }
}

async function sendAdminNotification(items: any[]): Promise<any> {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !API_KEY) return { error: 'Missing environment variables' };
    if (!items || items.length === 0) return;

    const titles = items.map(i => i.name).join(', ');

    const payload: any = {
        app_id: APP_ID,
        target_channel: "push",
        filters: [
            { field: "tag", key: "admin", relation: "=", value: "true" }
        ],
        headings: { 
            en: `⚠️ Nueva Música Cargada`,
            es: `⚠️ Nueva Música Cargada`
        },
        contents: {
            en: `Se han detectado y cargado en el sistema: ${titles}`,
            es: `Se han detectado y cargado en el sistema: ${titles}`,
        },
        url: 'https://www.diosmasgym.com/admin'
    };

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${API_KEY}`,
            },
            body: JSON.stringify(payload),
        });
        return await response.json();
    } catch (e) {
        console.error('[check-releases] Error sending admin notification:', e);
    }
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


    // mode=detect: solo busca canciones nuevas del catalogo, las pasa a la hoja y avisa.
    // Corre varias veces al dia; el aviso de "estreno de hoy" y las promos solo van en la corrida diaria.
    const detectOnly = req.query.mode === 'detect';

    try {
        const rows = await fetchRows();

        if (rows.length === 0) {
            return res.status(200).json({ sent: 0, message: 'La hoja de cálculo parece estar vacía.' });
        }

        // --- 1. Detect New Releases from Catalog ---
        // Usa el mismo endpoint de música pero con un parser robusto
        // Siempre el dominio publico: el cron entra por la direccion interna *.vercel.app, que tiene
        // proteccion de acceso y devuelve una pagina de login en vez del catalogo.
        const host = String(req.headers.host || '');
        const baseUrl = /localhost|127\.0\.0\.1/.test(host) ? `http://${host}` : 'https://www.diosmasgym.com';

        // Parse CSV robusto: comillas, comas y SALTOS DE LINEA dentro de un campo (la columna
        // Letra trae la letra completa). Antes se partia por renglones y el catalogo se cortaba
        // en la primera letra: solo se leian ~4 canciones por artista.
        const parseCatalogCSV = (text: string): any[] => {
            const rows: string[][] = [];
            let row: string[] = [];
            let field = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (inQuotes) {
                    if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
                    else if (c === '"') inQuotes = false;
                    else field += c;
                } else if (c === '"') inQuotes = true;
                else if (c === ',') { row.push(field.trim()); field = ''; }
                else if (c === '\n' || c === '\r') {
                    if (c === '\r' && text[i + 1] === '\n') i++;
                    row.push(field.trim()); field = '';
                    rows.push(row); row = [];
                } else field += c;
            }
            if (field || row.length) { row.push(field.trim()); rows.push(row); }
            if (rows.length < 2) return [];

            // Buscar la fila de encabezados
            let headerIdx = rows.findIndex(r => r.some(v => /^(nombre|artista)$/i.test(v)));
            if (headerIdx < 0) headerIdx = 0;
            const lines = rows.map(r => r);
            const parseCSVLine = (r: string[]) => r;

            const headers = parseCSVLine(lines[headerIdx]);
            const results: any[] = [];
            
            for (let i = headerIdx + 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.some(v => v) || line[0] === '---') continue;
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
            
            const day = (d: string) => String(d || '').slice(0, 10);
            const sheetRows = rows.map(normalizeRow);
            const fresh: any[] = [];

            for (const item of allCatalog) {
                if (!item.date) continue;
                const itemDate = new Date(item.date);
                if (isNaN(itemDate.getTime()) || itemDate < sevenDaysAgo) continue;
                
                // Check if already in sheet
                const alreadyInSheet = sheetRows.some(row => {
                    const rowName = String(row.name ?? "").toLowerCase().trim();
                    const itemName = (item.name || '').toLowerCase().trim();
                    // Un album se guarda como una sola fila "Álbum: ..." con su fecha: sus canciones ya cuentan
                    if (/^[áa]lbum\b/.test(rowName) && day(String(row.releaseDate ?? "")) === day(item.date) &&
                        (!row.Artista || String(row.Artista).toLowerCase() === String(item.artist || '').toLowerCase())) return true;
                    return rowName && itemName && (
                        rowName === itemName || 
                        rowName.includes(itemName) || 
                        itemName.includes(rowName)
                    );
                });
                
                if (!alreadyInSheet && item.name) fresh.push(item);
            }

            // Igual que el panel: 3 o mas canciones del mismo artista con la misma fecha son un
            // album y van como una sola fila (y una sola notificacion), no una por cancion.
            const groups = new Map<string, any[]>();
            for (const item of fresh) {
                const key = `${String(item.artist || '').toLowerCase()}|${item.date}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(item);
            }
            for (const group of groups.values()) {
                let items = group;
                if (group.length >= 3) {
                    const rep = [...group].sort((a, b) => a.name.length - b.name.length)[0];
                    const albumName = KNOWN_ALBUMS[`${String(rep.artist || '').toLowerCase()}|${String(rep.date).slice(0, 10)}`]
                        || rep.name.replace(/\s*\(feat\..*?\)/gi, '').trim();
                    items = [{ ...group[0], name: `Álbum: ${albumName}` }];
                }
                for (const item of items) {
                    const vid = String(item.url || '').match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
                    if (vid) item.id = vid;
                    console.log(`[check-releases] New item detected: ${item.name} (${item.date})`);
                    // Solo se avisa si quedo guardado en la hoja; si no, la siguiente revision
                    // lo volveria a detectar y mandaria la notificacion otra vez.
                    const saved = await syncToGoogleSheet(item);
                    if (saved && !ALREADY_NOTIFIED.has(`${String(item.artist || '').toLowerCase()}|${String(item.date).slice(0, 10)}`)) newlyDetected.push(item);
                }
            }
        } catch (catalogErr: any) {
            console.error('[check-releases] Catalog detection failed (non-fatal):', catalogErr.message);
        }

        const pushResults: any[] = [];
        const notifiedSongNames = new Set<string>();

        // 1. Enviar notificación push inmediata a TODOS los suscriptores si se detectó música nueva
        if (newlyDetected.length > 0) {
            console.log(`[check-releases] Enviando notificación pública para ${newlyDetected.length} nuevos temas detectados...`);
            
            if (newlyDetected.length === 1) {
                const single = newlyDetected[0];
                const releaseRow: ReleaseRow = {
                    Artista: single.artist || 'Diosmasgym',
                    name: single.name,
                    releaseDate: single.date ? single.date.split('T')[0] : new Date().toISOString().split('T')[0],
                    preSaveLink: single.url || '',
                    coverImageUrl: single.cover || ''
                };
                const resPush = await sendOneSignalPush(releaseRow);
                pushResults.push(resPush);
                notifiedSongNames.add((single.name || '').toLowerCase().trim());
            } else {
                // Si son múltiples canciones, agrupar por artista para no saturar al usuario
                const byArtist = new Map<string, any[]>();
                newlyDetected.forEach(item => {
                    const art = item.artist || 'Diosmasgym';
                    if (!byArtist.has(art)) byArtist.set(art, []);
                    byArtist.get(art)!.push(item);
                    notifiedSongNames.add((item.name || '').toLowerCase().trim());
                });

                for (const [artist, songs] of byArtist.entries()) {
                    if (songs.length === 1) {
                        const s = songs[0];
                        const resPush = await sendOneSignalPush({
                            Artista: s.artist || artist,
                            name: s.name,
                            releaseDate: s.date ? s.date.split('T')[0] : new Date().toISOString().split('T')[0],
                            preSaveLink: s.url || '',
                            coverImageUrl: s.cover || ''
                        });
                        pushResults.push(resPush);
                    } else {
                        const resPush = await sendConsolidatedPush(songs);
                        pushResults.push(resPush);
                    }
                }
            }

            try {
                await sendAdminNotification(newlyDetected);
                console.log(`[check-releases] Notified admins about ${newlyDetected.length} new items.`);
            } catch (err) {
                console.error('[check-releases] Failed to notify admins:', err);
            }
        }

        // --- 2. Fetch Fresh Sheet (if we synced anything) ---
        let finalRows = rows;
        if (newlyDetected.length > 0) {
            try {
                finalRows = await fetchRows();
            } catch (e) {
                console.warn('[check-releases] Error refetching sheet after sync:', e);
            }
        }

        // Calculate "today" in multiple timezones to avoid misses
        // The sheet dates might be stored in different TZ references
        const now = new Date();
        
        // Generate candidate dates covering UTC, UTC-5, UTC-6, UTC-7
        const candidateDates = new Set<string>();
        [-7, -6, -5, 0].forEach(offsetH => {
            const adjusted = new Date(now.getTime() + (offsetH * 60 * 60 * 1000));
            candidateDates.add(adjusted.toISOString().split('T')[0]);
        });
        
        // Primary target: Mexico City (UTC-6)
        const mxNow = new Date(now.getTime() - (6 * 60 * 60 * 1000));
        const primaryDate = mxNow.toISOString().split('T')[0];
        
        // Allow manual override via query param
        const targetDate = (req.query.date as string) || primaryDate;
        
        // If manual override, only use that date
        const datesToCheck = req.query.date 
            ? new Set<string>([targetDate]) 
            : candidateDates;

        const releases = finalRows.map(normalizeRow);
        
        // Match releases for any of the candidate dates
        const todaysReleases = releases.filter(r => {
            if (!r.name || !r.releaseDate) return false;
            // Ignore config rows
            if (r.Artista && r.Artista.toLowerCase().startsWith('config')) return false;
            // Support both YYYY-MM-DD and DD/MM/YYYY
            let cleanDate = r.releaseDate.trim();
            if (cleanDate.includes('/') && !cleanDate.includes('-')) {
                const parts = cleanDate.split('/');
                if (parts.length === 3) {
                    // Could be DD/MM/YYYY or MM/DD/YYYY — try both
                    const [a, b, y] = parts;
                    cleanDate = `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
                }
            }
            return datesToCheck.has(cleanDate);
        });

        console.log(`[check-releases] Target: ${targetDate} | Candidate dates: ${[...datesToCheck].join(',')} | Total Rows: ${finalRows.length} | Today's releases: ${todaysReleases.length}`);
        
        // Enviar para los estrenos del día en la hoja que no hayan sido ya notificados
        const remainingToday = detectOnly ? [] : todaysReleases.filter(r => 
            !notifiedSongNames.has((r.name || '').toLowerCase().trim())
        );

        if (remainingToday.length > 0) {
            const todayResults = await Promise.all(remainingToday.map(sendOneSignalPush));
            pushResults.push(...todayResults);
        }

        // Disparar generación de promos diarias en background si viene de cron
        const cronSecret = (process.env.CRON_SECRET || '').trim();
        const fromCron = !!cronSecret && (req.headers as any)?.authorization === `Bearer ${cronSecret}`;
        if (fromCron && !detectOnly) {
            fetch(`${baseUrl}/api/generate-promo`, {
                headers: { Authorization: `Bearer ${cronSecret}` }
            }).catch(() => null);
        }

        const debugInfo = {
            targetDate,
            candidateDates: [...datesToCheck],
            all_releases_dates: releases.map(r => `${r.name}: ${r.releaseDate}`),
            todays_count: todaysReleases.length,
            detected_count: newlyDetected.length
        };

        return res.status(200).json({
            sent: pushResults.length,
            detected: newlyDetected.length,
            releases: [
                ...newlyDetected.map(r => `[Detectado y Auto-sincronizado] ${r.name}`),
                ...remainingToday.map(r => `[Estreno de Hoy] ${r.name}`)
            ],
            pushResults,
            debug: debugInfo
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
