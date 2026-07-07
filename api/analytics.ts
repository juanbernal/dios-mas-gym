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

    // 1. Obtener Histórico de Visitas Generales (Últimos 30 días)
    const [pageViewsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    // 2. Obtener Top Canciones (Evento: play_song)
    // Nota: 'customEvent:song_title' y 'customEvent:song_artist' deben registrarse 
    // en GA4 como Dimensiones Personalizadas para que esto funcione.
    const [songsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'customEvent:song_title' }, { name: 'customEvent:song_artist' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'play_song' },
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

    // 3. Obtener Top Reflexiones (Evento: post_view)
    const [postsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'customEvent:title' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'post_view' },
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

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
      // Limpiar el title (remover ' | El Arsenal' o similar si lo deseas)
      let rawTitle = row.dimensionValues?.[0].value || 'Desconocido';
      rawTitle = rawTitle.replace(' | El Arsenal', '').replace(' | Dios Mas Gym', '');
      return {
        title: rawTitle,
        views: parseInt(row.metricValues?.[0].value || '0', 10),
      };
    }).filter(p => p.title !== '(not set)');

    return res.status(200).json({
      status: 'success',
      data: {
        totalViews,
        history,
        topSongs,
        topPosts,
        distribution: [
           { name: 'Canciones', value: topSongs.reduce((sum, s) => sum + s.plays, 0) },
           { name: 'Reflexiones', value: topPosts.reduce((sum, p) => sum + p.views, 0) }
        ],
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
