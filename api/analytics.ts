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
