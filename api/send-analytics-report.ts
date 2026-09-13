import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

function timingSafeCompare(a: string, b: string): boolean {
  const strA = String(a).trim();
  const strB = String(b).trim();
  try {
    const hashA = crypto.createHash('sha256').update(strA).digest();
    const hashB = crypto.createHash('sha256').update(strB).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  } catch {
    return false;
  }
}

function verifyAuth(req: any): boolean {
  // 1. Cron de Vercel
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

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (vercelSig) return true;

  // 2. Contraseña de Admin
  const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
  const MASTER_KEY = (process.env[ENV_KEY_NAME] || '').trim().replace(/^["']|["']$/g, '');

  let providedPassword = '';
  if (typeof req.headers?.get === 'function') {
    providedPassword = req.headers.get('x-admin-password') || '';
  } else if (req.headers) {
    providedPassword = (req.headers['x-admin-password'] as string) || '';
  }

  if (MASTER_KEY && timingSafeCompare(providedPassword, MASTER_KEY)) return true;
  if (MASTER_KEY && authHeader.startsWith('Bearer ') && timingSafeCompare(authHeader.substring(7).trim(), MASTER_KEY)) return true;

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Permitir GET (para Cron) y POST (para trigger manual desde panel de admin)
  if (!verifyAuth(req)) {
    // Si viene de query param con token de emergencia
    const token = req.query?.token;
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || token !== cronSecret) {
      return res.status(401).json({ status: 'error', message: 'No autorizado' });
    }
  }

  const propertyId = process.env.GA_PROPERTY_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const recipientEmail = process.env.ADMIN_REPORT_EMAIL || 'administrador@diosmasgym.com';

  if (!propertyId || !clientEmail || !privateKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Faltan credenciales de Google Analytics (GA_PROPERTY_ID, GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY)'
    });
  }

  try {
    const analyticsClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    // Consultas para las métricas del día (hoy) y de ayer para comparar
    const [
      [todayViewsResponse],
      [yesterdayViewsResponse],
      [todaySongsResponse],
      [todayPostsResponse],
      [todayPagesResponse],
      [statsResponse],
      [deviceResponse],
      [sourcesResponse],
      [countriesResponse]
    ] = await Promise.all([
      // 1. Visitas y usuarios de hoy
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
      }),
      // 2. Visitas de ayer (para cálculo de tendencia)
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      }),
      // 3. Top Canciones de hoy
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'play_song' } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 8,
      }),
      // 4. Top Reflexiones de hoy
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:title' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'post_view' } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 5,
      }),
      // 5. Top Páginas y Letras de hoy
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 8,
      }),
      // 6. Tiempo de sesión y rebote
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      }),
      // 7. Dispositivos
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 8. Fuentes de Tráfico
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 5,
      }),
      // 9. Países
      analyticsClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      })
    ]);

    // Procesamiento de datos
    const todayViews = parseInt(todayViewsResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const todayUsers = parseInt(todayViewsResponse.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
    const todaySessions = parseInt(todayViewsResponse.rows?.[0]?.metricValues?.[2]?.value || '0', 10);

    const yesterdayViews = parseInt(yesterdayViewsResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

    let growthViewsPercent = 0;
    if (yesterdayViews > 0) {
      growthViewsPercent = Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100);
    }

    // Top Canciones
    const topSongs = (todaySongsResponse.rows || []).map(r => ({
      title: r.dimensionValues?.[0]?.value || 'Desconocida',
      artist: r.dimensionValues?.[1]?.value || 'Dios Mas Gym',
      plays: parseInt(r.metricValues?.[0]?.value || '0', 10)
    })).filter(s => s.title !== '(not set)');

    // Top Reflexiones
    const topPosts = (todayPostsResponse.rows || []).map(r => {
      let title = r.dimensionValues?.[0]?.value || 'Reflexión';
      title = title.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
      return {
        title,
        views: parseInt(r.metricValues?.[0]?.value || '0', 10)
      };
    }).filter(p => p.title !== '(not set)');

    // Top Páginas
    const topPages = (todayPagesResponse.rows || []).map(r => {
      let title = r.dimensionValues?.[0]?.value || 'Página';
      title = title.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
      return {
        title,
        views: parseInt(r.metricValues?.[0]?.value || '0', 10)
      };
    }).filter(p => p.title !== '(not set)');

    // Tiempo promedio
    let avgDuration = '00:00';
    if (statsResponse.rows && statsResponse.rows.length > 0) {
      const sec = parseFloat(statsResponse.rows[0].metricValues?.[0]?.value || '0');
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      avgDuration = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Dispositivos
    let mobile = 0, desktop = 0;
    (deviceResponse.rows || []).forEach(r => {
      const dev = (r.dimensionValues?.[0]?.value || '').toLowerCase();
      const val = parseInt(r.metricValues?.[0]?.value || '0', 10);
      if (dev === 'mobile') mobile += val;
      else desktop += val;
    });
    const totalDev = mobile + desktop;
    const mobilePct = totalDev > 0 ? Math.round((mobile / totalDev) * 100) : 0;
    const desktopPct = totalDev > 0 ? Math.round((desktop / totalDev) * 100) : 0;

    // Fuentes
    const sources = (sourcesResponse.rows || []).map(r => ({
      name: r.dimensionValues?.[0]?.value === '(direct)' ? 'Directo' : (r.dimensionValues?.[0]?.value || 'Otro'),
      count: parseInt(r.metricValues?.[0]?.value || '0', 10)
    })).filter(s => s.name !== '(not set)');

    // Países
    const countries = (countriesResponse.rows || []).map(r => ({
      name: r.dimensionValues?.[0]?.value || 'Desconocido',
      count: parseInt(r.metricValues?.[0]?.value || '0', 10)
    })).filter(c => c.name !== '(not set)');

    const todayDateFormatted = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'full',
      timeZone: 'America/Mexico_City'
    }).format(new Date());

    // Generar Plantilla HTML para el correo
    const htmlEmail = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #05070a; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0f111a; border-radius: 16px; border: 1px solid #1e2230; overflow: hidden; }
    .header { background: linear-gradient(135deg, #111420 0%, #05070a 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #c5a059; }
    .header h1 { margin: 0; font-size: 26px; color: #c5a059; letter-spacing: 2px; text-transform: uppercase; }
    .header p { margin: 6px 0 0; color: #8890a0; font-size: 13px; }
    .content { padding: 24px; }
    .metric-card { padding: 16px; text-align: center; background-color: #151824; border-radius: 12px; border: 1px solid #202638; }
    .metric-val { font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 4px; }
    .metric-val.highlight { color: #c5a059; }
    .metric-label { font-size: 10px; text-transform: uppercase; color: #8890a0; font-weight: bold; letter-spacing: 1px; }
    .section-title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #c5a059; margin: 24px 0 12px; border-bottom: 1px solid #202638; padding-bottom: 6px; }
    .list-item { display: table; width: 100%; padding: 10px 12px; margin-bottom: 6px; background-color: #151824; border-radius: 8px; box-sizing: border-box; }
    .list-left { display: table-cell; vertical-align: middle; }
    .list-right { display: table-cell; text-align: right; vertical-align: middle; color: #c5a059; font-weight: bold; font-size: 13px; }
    .item-title { font-size: 13px; font-weight: bold; color: #ffffff; }
    .item-sub { font-size: 11px; color: #70788d; }
    .badge-pill { display: inline-block; padding: 4px 10px; background-color: #1a2030; border-radius: 20px; font-size: 11px; color: #c5a059; margin-right: 6px; margin-bottom: 6px; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #60687a; border-top: 1px solid #1a2030; background-color: #0b0d14; }
    .btn-panel { display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #c5a059; color: #000000; text-decoration: none; font-weight: bold; font-size: 12px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Dios Mas Gym</h1>
      <p>Reporte Diario de Actividad • ${todayDateFormatted}</p>
    </div>

    <div class="content">
      <!-- Métricas Principales -->
      <table style="width: 100%; border-spacing: 8px; margin-bottom: 16px;">
        <tr>
          <td class="metric-card" style="width: 33.33%;">
            <div class="metric-val highlight">${todayViews}</div>
            <div class="metric-label">Páginas Vistas</div>
            <div style="font-size: 10px; color: ${growthViewsPercent >= 0 ? '#10b981' : '#f43f5e'}; margin-top: 4px;">
              ${growthViewsPercent >= 0 ? '▲ +' : '▼ '}${growthViewsPercent}% vs ayer
            </div>
          </td>
          <td class="metric-card" style="width: 33.33%;">
            <div class="metric-val">${todayUsers}</div>
            <div class="metric-label">Visitantes Únicos</div>
            <div style="font-size: 10px; color: #8890a0; margin-top: 4px;">${todaySessions} sesiones</div>
          </td>
          <td class="metric-card" style="width: 33.33%;">
            <div class="metric-val">${avgDuration}</div>
            <div class="metric-label">Tiempo Promedio</div>
            <div style="font-size: 10px; color: #8890a0; margin-top: 4px;">duración / sesión</div>
          </td>
        </tr>
      </table>

      <!-- Top Canciones -->
      <div class="section-title">🎵 Canciones Más Escuchadas Hoy</div>
      ${
        topSongs.length > 0
          ? topSongs.map((s, idx) => `
            <div class="list-item">
              <div class="list-left">
                <div class="item-title">#${idx + 1} ${s.title}</div>
                <div class="item-sub">${s.artist}</div>
              </div>
              <div class="list-right">${s.plays} ${s.plays === 1 ? 'play' : 'plays'}</div>
            </div>
          `).join('')
          : '<p style="color: #60687a; font-size: 12px; text-align: center;">Sin reproducciones registradas hoy todavía.</p>'
      }

      <!-- Top Páginas / Letras -->
      <div class="section-title">📖 Páginas y Letras Más Visitadas</div>
      ${
        topPages.length > 0
          ? topPages.slice(0, 5).map(p => `
            <div class="list-item">
              <div class="list-left">
                <div class="item-title">${p.title}</div>
              </div>
              <div class="list-right">${p.views} vistas</div>
            </div>
          `).join('')
          : '<p style="color: #60687a; font-size: 12px; text-align: center;">Sin páginas registradas hoy.</p>'
      }

      <!-- Fuentes y Dispositivos -->
      <div class="section-title">📱 Dispositivos y Fuentes de Tráfico</div>
      <div style="padding: 12px; background-color: #151824; border-radius: 8px; margin-bottom: 12px;">
        <div style="margin-bottom: 8px; font-size: 12px;">
          <strong>Dispositivos:</strong> 📱 Móvil: <strong>${mobilePct}%</strong> | 💻 Computadora: <strong>${desktopPct}%</strong>
        </div>
        <div style="font-size: 12px;">
          <strong>Orígenes principales:</strong>
          <div style="margin-top: 6px;">
            ${
              sources.length > 0
                ? sources.map(src => `<span class="badge-pill">${src.name}: ${src.count}</span>`).join(' ')
                : '<span style="color: #70788d;">Directo</span>'
            }
          </div>
        </div>
      </div>

      <!-- Países -->
      ${
        countries.length > 0
          ? `
            <div class="section-title">🌎 Países con Mayor Actividad</div>
            <div style="padding: 12px; background-color: #151824; border-radius: 8px;">
              ${countries.map(c => `<span class="badge-pill">${c.name} (${c.count})</span>`).join(' ')}
            </div>
          `
          : ''
      }

      <div style="text-align: center; margin-top: 28px;">
        <a href="https://www.diosmasgym.com/admin/analytics" class="btn-panel">Ver Centro de Análisis Completo</a>
      </div>
    </div>

    <div class="footer">
      Dios Mas Gym • Reporte automatizado diario de las 11:00 PM<br>
      Enviado automáticamente a ${recipientEmail}
    </div>
  </div>
</body>
</html>
    `;

    // Enviar el correo usando Google Apps Script (GS_ANALYTICS_URL)
    const GS_ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';
    
    let emailSent = false;
    let emailError = '';

    try {
      const resp = await fetch(GS_ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'sendEmailReport',
          to: recipientEmail,
          subject: `📊 Reporte Diario Dios Mas Gym: ${todayViews} visitas hoy (${todayDateFormatted})`,
          htmlBody: htmlEmail
        }).toString()
      });

      if (resp.ok) {
        emailSent = true;
      } else {
        emailError = `Apps Script respondió con status: ${resp.status}`;
      }
    } catch (e: any) {
      emailError = e.message;
    }

    return res.status(200).json({
      status: 'success',
      message: 'Reporte generado correctamente',
      data: {
        recipient: recipientEmail,
        todayViews,
        todayUsers,
        todaySessions,
        topSongsCount: topSongs.length,
        emailSent,
        emailError: emailError || undefined
      }
    });

  } catch (error: any) {
    console.error('[send-analytics-report] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Error al generar el reporte diario'
    });
  }
}
