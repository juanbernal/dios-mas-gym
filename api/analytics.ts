import { BetaAnalyticsDataClient } from '@google-analytics/data';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    const isReportAction = req.query.action === 'sendReport' || (typeof req.body === 'object' && req.body?.action === 'sendReport');

    // ── Si la acción es Enviar Reporte por Correo (11 PM o manual) ──
    if (isReportAction) {
      const recipientEmail = process.env.ADMIN_REPORT_EMAIL || 'administrador@diosmasgym.com';
      const [
        [todayViewsRes],
        [yesterdayViewsRes],
        [todaySongsRes],
        [todayPagesRes],
        [statsRes],
        [deviceRes],
        [sourcesRes],
        [countriesRes]
      ] = await Promise.all([
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
          metrics: [{ name: 'screenPageViews' }],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'play_song' } } },
          orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
          limit: 8,
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'pageTitle' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 8,
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'averageSessionDuration' }],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 5,
        }),
        analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 5,
        })
      ]);

      const todayViews = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      const todayUsers = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
      const todaySessions = parseInt(todayViewsRes.rows?.[0]?.metricValues?.[2]?.value || '0', 10);
      const yesterdayViews = parseInt(yesterdayViewsRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      const growthViewsPercent = yesterdayViews > 0 ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) : 0;

      const topSongsList = (todaySongsRes.rows || []).map(r => ({
        title: r.dimensionValues?.[0]?.value || 'Desconocida',
        artist: r.dimensionValues?.[1]?.value || 'Dios Mas Gym',
        plays: parseInt(r.metricValues?.[0]?.value || '0', 10)
      })).filter(s => s.title !== '(not set)');

      const topPagesList = (todayPagesRes.rows || []).map(r => ({
        title: (r.dimensionValues?.[0]?.value || 'Página').replace(' | El Arsenal', '').replace(' | Dios Mas Gym', ''),
        views: parseInt(r.metricValues?.[0]?.value || '0', 10)
      })).filter(p => p.title !== '(not set)');

      let avgDuration = '00:00';
      if (statsRes.rows && statsRes.rows.length > 0) {
        const sec = parseFloat(statsRes.rows[0].metricValues?.[0]?.value || '0');
        avgDuration = `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
      }

      const todayDateFormatted = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'full',
        timeZone: 'America/Mexico_City'
      }).format(new Date());

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

      <div class="section-title">🎵 Canciones Más Escuchadas Hoy</div>
      ${
        topSongsList.length > 0
          ? topSongsList.map((s, idx) => `
            <div class="list-item">
              <div class="list-left"><div class="item-title">#${idx + 1} ${s.title}</div><div class="item-sub">${s.artist}</div></div>
              <div class="list-right">${s.plays} plays</div>
            </div>
          `).join('')
          : '<p style="color: #60687a; font-size: 12px; text-align: center;">Sin reproducciones registradas hoy todavía.</p>'
      }

      <div class="section-title">📖 Páginas y Letras Más Visitadas</div>
      ${
        topPagesList.length > 0
          ? topPagesList.slice(0, 5).map(p => `
            <div class="list-item">
              <div class="list-left"><div class="item-title">${p.title}</div></div>
              <div class="list-right">${p.views} vistas</div>
            </div>
          `).join('')
          : '<p style="color: #60687a; font-size: 12px; text-align: center;">Sin páginas registradas hoy.</p>'
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
</html>`;

      const GS_ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';
      let emailSent = false;
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
        emailSent = resp.ok;
      } catch (e) {
        console.error('Error enviando correo a Apps Script:', e);
      }

      return res.status(200).json({
        status: 'success',
        message: 'Reporte diario generado y enviado con éxito',
        data: {
          recipient: recipientEmail,
          todayViews,
          todayUsers,
          todaySessions,
          topSongsCount: topSongsList.length,
          emailSent
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
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      // 2. Obtener Top Canciones
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'play_song' } },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      }),
      // 3. Obtener Top Reflexiones
      analyticsDataClient.runReport({
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
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      // 5. Estadísticas Generales (Duración y Rebote)
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'averageSessionDuration' }, { name: 'bounceRate' }],
      }),
      // 6. Dispositivos
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 7. Nuevos vs Recurrentes
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 8. Fuentes de Tráfico
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 5,
      })
    ]);

    // --- Formatear Resultados ---

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
      timeZone: 'America/Mexico_City',
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
        isMock: false
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
