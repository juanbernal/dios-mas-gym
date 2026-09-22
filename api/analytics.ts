import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// SMART LINKS: estadisticas por enlace (vistas, clics por plataforma, origen)
// Se calculan desde GA4 sin dimensiones personalizadas:
//   - vistas:  pagePath  + screenPageViews
//   - clics:   eventName "sl_click_<plataforma>" + pagePath + eventCount
//   - origen:  landingPage + sessionSource/sessionMedium + sessions (utm_source del enlace)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// TRAFICO PUBLICO: los reportes excluyen tu propio panel (/admin/*), que antes inflaba visitas, paginas
// mas vistas y sesiones. scope: 'all' (todo) | 'main' (dominio principal) | 'external' (blogs y sitios externos).
// ─────────────────────────────────────────────────────────────
const HOST_MAIN = 'diosmasgym.com';
export const publicFilter = (scope: string, extra?: any) => {
  const exprs: any[] = [
    { notExpression: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/admin' } } } },
  ];
  const host = { filter: { fieldName: 'hostName', stringFilter: { matchType: 'CONTAINS', value: HOST_MAIN } } };
  if (scope === 'main') exprs.push(host);
  if (scope === 'external') exprs.push({ notExpression: host });
  if (extra) exprs.push(extra);
  return exprs.length === 1 ? exprs[0] : { andGroup: { expressions: exprs } };
};

export type GaRow = { dims: string[]; value: number };
export type SmartLinkStat = {
  path: string;
  id: string;
  views: number;
  clicks: Record<string, number>;
  totalClicks: number;
  sources: { source: string; medium: string; sessions: number }[];
};

const normPath = (p: string) => (p || '').split('?')[0].replace(/\/+$/, '') || '/';
const idFromPath = (p: string) => {
  const raw = p.replace(/^\/link\//, '');
  try { return decodeURIComponent(raw); } catch { return raw; }
};

export function buildSmartLinkStats(views: GaRow[], clicks: GaRow[], sources: GaRow[]) {
  const map = new Map<string, SmartLinkStat>();
  const get = (rawPath: string): SmartLinkStat => {
    const path = normPath(rawPath);
    let st = map.get(path);
    if (!st) {
      st = { path, id: idFromPath(path), views: 0, clicks: {}, totalClicks: 0, sources: [] };
      map.set(path, st);
    }
    return st;
  };

  for (const r of views) {
    if (!r.dims[0]?.startsWith('/link/')) continue;
    get(r.dims[0]).views += r.value;
  }
  for (const r of clicks) {
    const [eventName, path] = r.dims;
    if (!eventName?.startsWith('sl_click_') || !path?.startsWith('/link/')) continue;
    const platform = eventName.slice('sl_click_'.length);
    const st = get(path);
    st.clicks[platform] = (st.clicks[platform] || 0) + r.value;
    st.totalClicks += r.value;
  }
  const totalSources = new Map<string, { source: string; medium: string; sessions: number }>();
  for (const r of sources) {
    const [landing, source, medium] = r.dims;
    if (!landing?.startsWith('/link/')) continue;
    const src = source || '(direct)';
    const med = medium || '(none)';
    const st = get(landing);
    const found = st.sources.find(x => x.source === src && x.medium === med);
    if (found) found.sessions += r.value; else st.sources.push({ source: src, medium: med, sessions: r.value });
    const key = src + '|' + med;
    const t = totalSources.get(key);
    if (t) t.sessions += r.value; else totalSources.set(key, { source: src, medium: med, sessions: r.value });
  }

  const links = [...map.values()]
    .map(l => ({ ...l, sources: l.sources.sort((a, b) => b.sessions - a.sessions) }))
    .sort((a, b) => b.views - a.views);
  return {
    links,
    totals: {
      views: links.reduce((n, l) => n + l.views, 0),
      clicks: links.reduce((n, l) => n + l.totalClicks, 0),
    },
    sources: [...totalSources.values()].sort((a, b) => b.sessions - a.sessions),
  };
}

const toRows = (res: any): GaRow[] =>
  (res?.rows || []).map((r: any) => ({
    dims: (r.dimensionValues || []).map((d: any) => d.value || ''),
    value: Number(r.metricValues?.[0]?.value || 0),
  }));

// Consulta de smart links (vistas, clics por plataforma y origen). La usan el panel y el correo diario.
// startDate: 'today' | 'NdaysAgo'
export async function querySmartLinkStats(client: any, propertyId: string, startDate: string, endDate: string = 'today') {
  const dateRanges = [{ startDate, endDate }];
  const property = `properties/${propertyId}`;
  const linkFilter = (fieldName: string) => ({ filter: { fieldName, stringFilter: { matchType: 'BEGINS_WITH' as const, value: '/link/' } } });

  const [[viewsRes], [clicksRes], [sourcesRes]] = await Promise.all([
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: linkFilter('pagePath'),
      limit: 500,
    }),
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'eventName' }, { name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { matchType: 'BEGINS_WITH' as const, value: 'sl_click_' } } },
            linkFilter('pagePath'),
          ],
        },
      },
      limit: 1000,
    }),
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'landingPage' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: linkFilter('landingPage'),
      limit: 1000,
    }),
  ]);

  return buildSmartLinkStats(toRows(viewsRes), toRows(clicksRes), toRows(sourcesRes));
}

// Autenticacion del admin (misma variable que /api/common, sin las llaves de confianza fijas)
export function isAdminRequest(req: any): boolean {
  const keyName = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN_PASSWORD')) || 'ADMIN_PASSWORD');
  const master = (process.env[keyName] || '').trim().replace(/^["']|["']$/g, '');
  const provided = String(req.headers?.['x-admin-password'] || '').trim();
  if (!master) return !process.env.VERCEL; // en desarrollo local sin variable se permite
  const a = Buffer.from(provided);
  const b = Buffer.from(master);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (['smartlinks', 'realtime'].includes(String(req.query.action)) && !isAdminRequest(req)) {
    return res.status(401).json({ status: 'error', message: 'No autorizado' });
  }

  // Leer credenciales del entorno
  const propertyId = process.env.GA_PROPERTY_ID; 
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Vercel a veces escapa los saltos de línea, hay que restaurarlos
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    const missing = [];
    if (!propertyId) missing.push('GA_PROPERTY_ID');
    if (!clientEmail) missing.push('GOOGLE_CLIENT_EMAIL');
    if (!privateKey) missing.push('GOOGLE_PRIVATE_KEY');
    
    return res.status(200).json({ 
      status: 'error', 
      message: `Faltan credenciales: ${missing.join(', ')}` 
    });
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    // ── Estadisticas de Smart Links (panel de admin) ──
    if (req.query.action === 'smartlinks') {
      const daysRaw = String(req.query.days ?? '30');
      let startDate: string;
      let endDate = 'today';
      if (daysRaw === 'yesterday') {
        startDate = 'yesterday';
        endDate = 'yesterday';
      } else {
        const daysParam = parseInt(daysRaw, 10);
        const days = Number.isNaN(daysParam) ? 30 : Math.min(Math.max(daysParam, 0), 90); // 0 = solo hoy
        startDate = days === 0 ? 'today' : `${days}daysAgo`;
      }
      const stats = await querySmartLinkStats(analyticsDataClient, propertyId, startDate, endDate);
      res.setHeader('Cache-Control', 'private, max-age=120');
      return res.status(200).json({ status: 'ok', days: daysRaw, ...stats });
    }

    // ── Visitantes activos ahora (tiempo real, ultimos 30 minutos) ──
    if (req.query.action === 'realtime') {
      const property = `properties/${propertyId}`;
      const last30 = [{ startMinutesAgo: 29, endMinutesAgo: 0 }];
      const last5 = [{ startMinutesAgo: 4, endMinutesAgo: 0 }];
      const notAdmin = { notExpression: { filter: { fieldName: 'unifiedPageScreen', stringFilter: { matchType: 'BEGINS_WITH' as const, value: '/admin' } } } };
      // Sin tu panel /admin; si Google rechazara el filtro en tiempo real se reintenta sin el
      const rt = async (request: any): Promise<any> => {
        try {
          const [r] = await analyticsDataClient.runRealtimeReport({ property, ...request, dimensionFilter: notAdmin });
          return r;
        } catch (e: any) {
          console.warn('[analytics] tiempo real con filtro rechazado, se reintenta sin filtro:', e?.message);
          const [r] = await analyticsDataClient.runRealtimeReport({ property, ...request });
          return r;
        }
      };
      const total = (r: any) => parseInt(r?.rows?.[0]?.metricValues?.[0]?.value || r?.totals?.[0]?.metricValues?.[0]?.value || '0', 10);
      const [r30, r5, pagesRes, countriesRes] = await Promise.all([
        rt({ metrics: [{ name: 'activeUsers' }], minuteRanges: last30 }),
        rt({ metrics: [{ name: 'activeUsers' }], minuteRanges: last5 }),
        rt({ dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], minuteRanges: last30, orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 5 }),
        rt({ dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], minuteRanges: last30, orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 5 }),
      ]);
      const list = (r: any, clean = false) => (r?.rows || [])
        .map((row: any) => {
          let name: string = row.dimensionValues?.[0]?.value || '';
          if (clean) name = name.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
          return { name, users: parseInt(row.metricValues?.[0]?.value || '0', 10) };
        })
        .filter((x: any) => x.name && x.name !== '(not set)');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json({
        status: 'ok',
        activeUsers30: total(r30),
        activeUsers5: total(r5),
        pages: list(pagesRes, true),
        countries: list(countriesRes),
        generatedAt: new Date().toISOString(),
      });
    }

    const scope = ['main', 'external'].includes(String(req.query.scope)) ? String(req.query.scope) : 'all';
    // Periodo (en dias) del ranking de canciones: 7 = semana, 30 = mes, 365 = año. Por defecto 30.
    const topDaysParam = parseInt(String(req.query.topDays ?? '30'), 10);
    const topDays = Number.isNaN(topDaysParam) ? 30 : Math.min(Math.max(topDaysParam, 1), 400);
    // Consulta solo trafico publico. Si Google rechazara el filtro para alguna combinacion de metricas,
    // se reintenta sin filtro para no romper el panel ni el correo.
    const runPublic = async (request: any): Promise<any[]> => {
      try {
        return await analyticsDataClient.runReport({ ...request, dimensionFilter: publicFilter(scope, request.dimensionFilter) });
      } catch (e: any) {
        console.warn('[analytics] filtro de trafico publico rechazado, se reintenta sin filtro:', e?.message);
        return await analyticsDataClient.runReport(request);
      }
    };

    const isReportAction = req.query.action === 'sendReport' || (typeof req.body === 'object' && req.body?.action === 'sendReport');

    // ── Si la acción es Enviar Reporte por Correo (11 PM o manual) ──
    if (isReportAction) {
      const recipientEmail = process.env.ADMIN_REPORT_EMAIL || 'administrador@diosmasgym.com';

      // Guard anti-duplicado: si ya se envió hoy no reenviar (salvo forzado)
      const forceResend = req.query.force === 'true' || req.body?.force === true;
      const todayKey = new Date().toISOString().slice(0, 10); // "2026-09-17"
      const lastSentKey = `lastReportSent_${todayKey}`;
      // Usamos una variable de proceso simple para evitar duplicados en la misma instancia
      if (!forceResend && (global as any)[lastSentKey]) {
        return res.status(200).json({
          status: 'skipped',
          message: `Reporte ya enviado hoy (${todayKey}). Usa ?force=true para reenviar.`
        });
      }

      const [
        [todayViewsRes],
        [yesterdayViewsRes],
        [totalMonthRes],
        [todaySongsRes],
        [todayPagesRes],
        [statsRes],
        [deviceRes],
        [sourcesRes],
        [countriesRes],
        [hostViewsRes]
      ] = await Promise.all([
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
          metrics: [{ name: 'screenPageViews' }],
        }),
        // Total visitas últimos 30 días
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [{ name: 'screenPageViews' }],
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['play_song', 'song_play'] } } },
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 8,
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'pageTitle' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 8,
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'averageSessionDuration' }],
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 5,
        }),
        runPublic({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5,
        }),
        // Visitas de hoy por dominio (para el desglose "dominio principal / sitios externos")
        runPublic({
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'hostName' }],
          metrics: [{ name: 'screenPageViews' }],
          limit: 50,
        })
      ]);

      const todayViews    = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      const todayUsers    = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
      const todaySessions = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[2]?.value || '0', 10);
      const yesterdayViews = parseInt(yesterdayViewsRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      const totalMonth30  = parseInt(totalMonthRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      const growthViewsPercent = yesterdayViews > 0 ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) : 0;
      const growthArrow = growthViewsPercent >= 0 ? `&#9650; +${growthViewsPercent}%` : `&#9660; ${growthViewsPercent}%`;
      const growthColor = growthViewsPercent >= 0 ? '#10b981' : '#f43f5e';

      const topSongsList = (todaySongsRes.rows || []).map(r => ({
        title: r.dimensionValues?.[0]?.value || 'Desconocida',
        artist: r.dimensionValues?.[1]?.value || 'Dios Mas Gym',
        plays: parseInt(r.metricValues?.[0]?.value || '0', 10)
      })).filter(s => s.title !== '(not set)');

      const topPagesList = (todayPagesRes.rows || []).map(r => ({
        title: (r.dimensionValues?.[0]?.value || 'Pagina').replace(' | El Arsenal', '').replace(' | Dios Mas Gym', ''),
        views: parseInt(r.metricValues?.[0]?.value || '0', 10)
      })).filter(p => p.title !== '(not set)');

      let avgDuration = '00:00';
      if (statsRes.rows && statsRes.rows.length > 0) {
        const sec = parseFloat(statsRes.rows[0].metricValues?.[0]?.value || '0');
        avgDuration = `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
      }

      // Fuentes de trafico
      const sourcesList = (sourcesRes.rows || []).map(r => {
        let src = r.dimensionValues?.[0]?.value || 'Directo';
        if (src === '(direct)') src = 'Directo';
        if (src === '(not set)') return null;
        return { source: src, sessions: parseInt(r.metricValues?.[0]?.value || '0', 10) };
      }).filter(Boolean) as { source: string; sessions: number }[];

      // Desglose del conteo por origen: dominio principal vs sitios externos (ya sin tu panel /admin)
      let mainViews = 0;
      let externalViews = 0;
      ((hostViewsRes as any)?.rows || []).forEach((r: any) => {
        const host: string = r.dimensionValues?.[0]?.value || '';
        const n = parseInt(r.metricValues?.[0]?.value || '0', 10);
        if (host.includes(HOST_MAIN)) mainViews += n; else externalViews += n;
      });

      // Smart links de hoy: visitas, clics por plataforma y origen (utm)
      let sl: any = { links: [], totals: { views: 0, clicks: 0 }, sources: [] };
      try {
        sl = await querySmartLinkStats(analyticsDataClient, propertyId, 'today');
      } catch (e: any) {
        console.warn('[analytics] smart links en el correo no disponibles:', e?.message);
      }
      const PLATFORM_NAMES: Record<string, string> = {
        spotify: 'Spotify', apple_music: 'Apple Music', youtube: 'YouTube', amazon_music: 'Amazon Music',
        tidal: 'Tidal', deezer: 'Deezer', audiomack: 'Audiomack', sitio_oficial: 'Sitio Oficial', sitio_web_oficial: 'Sitio Web Oficial',
      };
      const SOURCE_NAMES: Record<string, string> = {
        whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
        youtube: 'YouTube', x: 'X', bio: 'Link en bio', qr: 'C&oacute;digo QR', google: 'Google', bing: 'Bing',
      };
      const clicksByPlatform: Record<string, number> = {};
      (sl.links || []).forEach((l: any) => Object.entries(l.clicks || {}).forEach(([k, v]: any) => { clicksByPlatform[k] = (clicksByPlatform[k] || 0) + v; }));
      const platformRows = Object.entries(clicksByPlatform).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
      const slSourceRows = (sl.sources || []).slice(0, 5);
      const slCtr = sl.totals.views > 0 ? Math.round((sl.totals.clicks / sl.totals.views) * 100) : 0;

      const todayDateFormatted = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'full',
        timeZone: 'America/Mexico_City'
      }).format(new Date());

      const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #05070a; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 620px; margin: 0 auto; background-color: #0f111a; border-radius: 16px; border: 1px solid #1e2230; overflow: hidden; }
    .header { background: linear-gradient(135deg, #111420 0%, #05070a 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #c5a059; }
    .header h1 { margin: 0; font-size: 26px; color: #c5a059; letter-spacing: 2px; text-transform: uppercase; }
    .header p { margin: 6px 0 0; color: #8890a0; font-size: 13px; }
    .content { padding: 24px; }
    .metrics-grid { display: table; width: 100%; border-spacing: 8px; margin-bottom: 20px; }
    .metric-card { display: table-cell; padding: 18px 12px; text-align: center; background-color: #151824; border-radius: 12px; border: 1px solid #202638; width: 25%; vertical-align: middle; }
    .metric-val { font-size: 30px; font-weight: 900; color: #ffffff; margin-bottom: 4px; line-height: 1; }
    .metric-val.gold { color: #c5a059; }
    .metric-label { font-size: 9px; text-transform: uppercase; color: #8890a0; font-weight: bold; letter-spacing: 1px; margin-top: 4px; }
    .metric-sub { font-size: 10px; margin-top: 4px; }
    .section-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #c5a059; margin: 20px 0 10px; border-bottom: 1px solid #202638; padding-bottom: 6px; }
    .list-item { display: table; width: 100%; padding: 9px 12px; margin-bottom: 5px; background-color: #151824; border-radius: 8px; box-sizing: border-box; }
    .list-left { display: table-cell; vertical-align: middle; }
    .list-right { display: table-cell; text-align: right; vertical-align: middle; color: #c5a059; font-weight: bold; font-size: 13px; white-space: nowrap; }
    .item-title { font-size: 13px; font-weight: bold; color: #ffffff; }
    .item-sub { font-size: 11px; color: #70788d; }
    .footer { text-align: center; padding: 18px; font-size: 11px; color: #60687a; border-top: 1px solid #1a2030; background-color: #0b0d14; }
    .btn-panel { display: inline-block; margin-top: 16px; padding: 12px 28px; background-color: #c5a059; color: #000000; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dios Mas Gym</h1>
      <p>Reporte Diario &bull; ${todayDateFormatted}</p>
    </div>
    <div class="content">

      <!-- METRICAS PRINCIPALES -->
      <table class="metrics-grid">
        <tr>
          <td class="metric-card">
            <div class="metric-val gold">${todayViews}</div>
            <div class="metric-label">Visitas HOY</div>
            <div class="metric-sub" style="color:${growthColor};">${growthArrow} vs ayer</div>
          </td>
          <td class="metric-card">
            <div class="metric-val">${totalMonth30.toLocaleString('es-MX')}</div>
            <div class="metric-label">Total 30 dias</div>
            <div class="metric-sub" style="color:#8890a0;">paginas vistas</div>
          </td>
          <td class="metric-card">
            <div class="metric-val">${todayUsers}</div>
            <div class="metric-label">Visitantes unicos</div>
            <div class="metric-sub" style="color:#8890a0;">${todaySessions} sesiones</div>
          </td>
          <td class="metric-card">
            <div class="metric-val">${avgDuration}</div>
            <div class="metric-label">Tiempo prom</div>
            <div class="metric-sub" style="color:#8890a0;">por sesion</div>
          </td>
        </tr>
      </table>

      <!-- FILTRO APLICADO: de donde salen los numeros -->
      <div style="margin:0 0 18px;padding:12px 14px;background-color:#0b0d14;border:1px solid #202638;border-radius:10px;font-size:11px;line-height:1.7;color:#8890a0;">
        <strong style="color:#c5a059;letter-spacing:1px;">FILTRO APLICADO</strong> &nbsp;Solo tr&aacute;fico p&uacute;blico (sin tu panel /admin) &bull; Fuente: Google Analytics<br>
        Dominio principal: <strong style="color:#ffffff;">${mainViews}</strong> vistas &nbsp;&bull;&nbsp; Sitios externos: <strong style="color:#ffffff;">${externalViews}</strong> vistas
      </div>

      <!-- SMART LINKS: CLICS Y ORIGEN -->
      <div class="section-title">&#128279; Smart Links Hoy</div>
      ${
        sl.totals.views > 0
          ? `<table class="metrics-grid">
              <tr>
                <td class="metric-card"><div class="metric-val gold">${sl.totals.views}</div><div class="metric-label">Visitas</div></td>
                <td class="metric-card"><div class="metric-val">${sl.totals.clicks}</div><div class="metric-label">Clics a plataformas</div></td>
                <td class="metric-card"><div class="metric-val">${slCtr}%</div><div class="metric-label">Clics por visita</div></td>
              </tr>
            </table>
            ${platformRows.length > 0 ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8890a0;margin:6px 0 6px;">Clics por plataforma</div>${platformRows.map(([k, v]: any) => `
              <div class="list-item">
                <div class="list-left"><div class="item-title">${PLATFORM_NAMES[k] || String(k).replace(/_/g, ' ')}</div></div>
                <div class="list-right">${v} clics</div>
              </div>`).join('')}` : '<p style="color:#60687a;font-size:12px;text-align:center;">A&uacute;n sin clics a plataformas hoy.</p>'}
            ${slSourceRows.length > 0 ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8890a0;margin:14px 0 6px;">Origen de las visitas (seg&uacute;n d&oacute;nde compartiste el link)</div>${slSourceRows.map((s: any) => `
              <div class="list-item">
                <div class="list-left"><div class="item-title">${s.source === '(direct)' ? 'Directo / sin origen' : (SOURCE_NAMES[s.source] || s.source)}</div></div>
                <div class="list-right">${s.sessions} sesiones</div>
              </div>`).join('')}` : ''}`
          : '<p style="color:#60687a;font-size:12px;text-align:center;">Sin visitas a smart links hoy todav&iacute;a.</p>'
      }

      <!-- TOP CANCIONES -->
      <div class="section-title">&#127925; Canciones Mas Escuchadas Hoy</div>
      ${
        topSongsList.length > 0
          ? topSongsList.map((s, idx) => `
            <div class="list-item">
              <div class="list-left"><div class="item-title">#${idx + 1} ${s.title}</div><div class="item-sub">${s.artist}</div></div>
              <div class="list-right">${s.plays} plays</div>
            </div>`).join('')
          : '<p style="color:#60687a;font-size:12px;text-align:center;">Sin reproducciones registradas hoy todavia.</p>'
      }

      <!-- TOP PAGINAS -->
      <div class="section-title">&#128214; Paginas y Letras Mas Visitadas</div>
      ${
        topPagesList.length > 0
          ? topPagesList.slice(0, 5).map(p => `
            <div class="list-item">
              <div class="list-left"><div class="item-title">${p.title}</div></div>
              <div class="list-right">${p.views} vistas</div>
            </div>`).join('')
          : '<p style="color:#60687a;font-size:12px;text-align:center;">Sin paginas registradas hoy.</p>'
      }

      <!-- FUENTES DE TRAFICO -->
      ${sourcesList.length > 0 ? `
      <div class="section-title">&#127760; Fuentes de Trafico</div>
      ${sourcesList.map(s => `
        <div class="list-item">
          <div class="list-left"><div class="item-title">${s.source}</div></div>
          <div class="list-right">${s.sessions} sesiones</div>
        </div>`).join('')}
      ` : ''}

      <div style="text-align:center;margin-top:28px;">
        <a href="https://www.diosmasgym.com/admin/analytics" class="btn-panel">Ver Centro de Analisis Completo</a>
      </div>
    </div>
    <div class="footer">
      Dios Mas Gym &bull; Reporte automatizado diario 11:00 PM<br>
      Solo tráfico público (sin tu panel /admin) &bull; Fuente: Google Analytics &bull; Zona horaria: ${(todayViewsRes as any)?.metadata?.timeZone || 'America/Mexico_City'}<br>
      Enviado a ${recipientEmail}
    </div>
  </div>
</body>
</html>`;

      const GS_ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';
      let emailSent = false;
      let emailErrorMsg = '';
      try {
        const resp = await fetch(GS_ANALYTICS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'sendEmailReport',
            to: recipientEmail,
            subject: `📊 Reporte Dios Mas Gym — ${todayViews} visitas hoy | ${totalMonth30.toLocaleString('es-MX')} en 30 dias (${todayDateFormatted})`,
            htmlBody: htmlEmail
          })
        });
        const respJson = await resp.json().catch(() => null);
        if (resp.ok && respJson?.status === 'success') {
          emailSent = true;
          // Marcar como enviado hoy para evitar duplicados
          (global as any)[lastSentKey] = true;
        } else {
          emailErrorMsg = respJson?.message || `Error status: ${resp.status}`;
        }
      } catch (e: any) {
        emailErrorMsg = e.message;
        console.error('Error enviando correo a Apps Script:', e);
      }

      return res.status(200).json({
        status: emailSent ? 'success' : 'error',
        message: emailSent
          ? 'Reporte diario generado y enviado con exito'
          : `Error al despachar correo: ${emailErrorMsg || 'Verificar Google Apps Script'}`,
        data: {
          recipient: recipientEmail,
          todayViews,
          totalMonth30,
          todayUsers,
          todaySessions,
          topSongsCount: topSongsList.length,
          emailSent,
          error: emailErrorMsg || undefined
        }
      });
    }

    // Ejecutar todas las consultas en paralelo para mejorar radicalmente el tiempo de respuesta
    const [
      [pageViewsResponse],
      [songsResponse],
      [postsResponse],
      [pagesResponse],
      [generalStatsResponse],
      [deviceResponse],
      [loyaltyResponse],
      [sourcesResponse]
    ] = await Promise.all([
      // 1. Obtener Histórico de Visitas Generales
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      // 2. Obtener Top Canciones
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${topDays}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: ['play_song', 'song_play'] } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      }),
      // 3. Obtener Top Reflexiones
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:title' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'post_view' } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      }),
      // 4. Obtener Top Páginas
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      // 5. Estadísticas Generales (Duración y Rebote)
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      }),
      // 6. Dispositivos
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 7. Nuevos vs Recurrentes
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 8. Fuentes de Tráfico
      runPublic({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 5,
      })
    ]);

    // --- Formatear Resultados ---

    // Zona horaria de la propiedad de Analytics: las fechas (date) vienen en esa zona, asi que "hoy" tambien
    const propertyTz: string = (pageViewsResponse as any)?.metadata?.timeZone || 'America/Mexico_City';

    // Historial
    let history = (pageViewsResponse.rows || []).map(row => {
      const dateStr = row.dimensionValues?.[0].value || '';
      // Formatear YYYYMMDD a DD/MM
      const formattedDate = dateStr.length === 8 
        ? `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}` 
        : dateStr;
      return {
        date: formattedDate,
        views: parseInt(row.metricValues?.[0].value || '0', 10),
      };
    });

    // Asegurar que la fecha de hoy exista en el historial (para que 'Hoy' no muestre el conteo de ayer)
    const todayFormatted = new Intl.DateTimeFormat('es-MX', {
      timeZone: propertyTz,
      day: '2-digit',
      month: '2-digit'
    }).format(new Date());

    if (!history.some(h => h.date === todayFormatted)) {
      history.push({
        date: todayFormatted,
        views: 0
      });
    }

    const totalViews = history.reduce((sum, item) => sum + item.views, 0);

    // Canciones
    const topSongs = (songsResponse.rows || []).map(row => ({
      title: row.dimensionValues?.[0].value || 'Desconocida',
      artist: row.dimensionValues?.[1].value || 'Artista',
      plays: parseInt(row.metricValues?.[0].value || '0', 10),
    })).filter(s => s.title !== '(not set)');

    // Reflexiones
    const topPosts = (postsResponse.rows || []).map(row => {
      let rawTitle = row.dimensionValues?.[0].value || 'Desconocido';
      rawTitle = rawTitle.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
      return {
        title: rawTitle,
        views: parseInt(row.metricValues?.[0].value || '0', 10),
      };
    }).filter(p => p.title !== '(not set)');

    // Páginas
    const topPages = (pagesResponse.rows || []).map(row => {
      let rawTitle = row.dimensionValues?.[0].value || 'Desconocida';
      rawTitle = rawTitle.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
      return {
        title: rawTitle,
        views: parseInt(row.metricValues?.[0].value || '0', 10),
      };
    }).filter(p => p.title !== '(not set)');

    // Nuevas Estadísticas
    let avgSessionDuration = '00:00';
    let bounceRate = '0%';
    
    if (generalStatsResponse.rows && generalStatsResponse.rows.length > 0) {
      const avgSeconds = parseFloat(generalStatsResponse.rows[0].metricValues?.[0].value || '0');
      const minutes = Math.floor(avgSeconds / 60);
      const seconds = Math.floor(avgSeconds % 60);
      avgSessionDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const bounce = parseFloat(generalStatsResponse.rows[0].metricValues?.[1].value || '0');
      bounceRate = `${Math.round(bounce * 100)}%`;
    }

    // Dispositivos
    let mobile = 0, desktop = 0, tablet = 0;
    let totalDevices = 0;
    (deviceResponse.rows || []).forEach(row => {
      const device = (row.dimensionValues?.[0].value || '').toLowerCase();
      const count = parseInt(row.metricValues?.[0].value || '0', 10);
      if (device === 'mobile') mobile += count;
      else if (device === 'desktop') desktop += count;
      else if (device === 'tablet') tablet += count;
      totalDevices += count;
    });
    
    const deviceBreakdown = {
      mobile: totalDevices > 0 ? Math.round((mobile / totalDevices) * 100) : 0,
      desktop: totalDevices > 0 ? Math.round((desktop / totalDevices) * 100) : 0,
      tablet: totalDevices > 0 ? Math.round((tablet / totalDevices) * 100) : 0,
    };

    // Fidelidad
    let newUsers = 0, returningUsers = 0;
    (loyaltyResponse.rows || []).forEach(row => {
      const type = (row.dimensionValues?.[0].value || '').toLowerCase();
      const count = parseInt(row.metricValues?.[0].value || '0', 10);
      if (type === 'new') newUsers += count;
      else returningUsers += count; // 'returning'
    });
    
    const totalLoyalty = newUsers + returningUsers;
    const newVsReturning = {
      new: totalLoyalty > 0 ? Math.round((newUsers / totalLoyalty) * 100) : 0,
      returning: totalLoyalty > 0 ? Math.round((returningUsers / totalLoyalty) * 100) : 0,
    };

    // Fuentes de Tráfico
    const trafficSources = (sourcesResponse.rows || []).map(row => {
      let source = row.dimensionValues?.[0].value || 'Directo';
      if (source === '(direct)') source = 'Directo';
      return {
        source,
        value: parseInt(row.metricValues?.[0].value || '0', 10),
      };
    }).filter(s => s.source !== '(not set)');

    const isRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    if (isRefresh) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    } else {
      res.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=86400');
    }

    return res.status(200).json({
      status: 'success',
      data: {
        totalViews,
        history,
        topSongs,
        topPosts,
        topPages,
        distribution: [
           { name: 'Canciones', value: topSongs.reduce((sum, s) => sum + s.plays, 0) },
           { name: 'Reflexiones', value: topPosts.reduce((sum, p) => sum + p.views, 0) },
           { name: 'Páginas', value: topPages.reduce((sum, p) => sum + p.views, 0) }
        ],
        avgSessionDuration,
        bounceRate,
        newVsReturning,
        deviceBreakdown,
        trafficSources,
        isMock: false,
        meta: { timeZone: propertyTz, scope, excludes: '/admin', generatedAt: new Date().toISOString() }
      }
    });
  } catch (error: any) {
    console.error('GA4 API Error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Error interno al consultar Google Analytics' 
    });
  }
}
