
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde nuestro servidor (Proxy Seguro).
 * Esto protege la API Key y permite cargar grandes cantidades de datos.
 */
export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string) => {
      const url = new URL('/api/arsenal', window.location.origin);
      url.searchParams.append('maxResults', limit.toString());
      if (token) url.searchParams.append('pageToken', token);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        
        // Si el servidor responde 404, es probable que estemos en un entorno estático (GitHub Pages)
        if (response.status === 404) {
          console.warn("Server API not found (404). Switching to client-side fetch.");
          return { posts: await fetchFromPublicFeed(limit) };
        }

        if (!response.ok) throw new Error(`Server API error: ${response.status}`);
        
        const data = await response.json();
        const processed = processApiV3Data(data);
        
        // Guardar en caché solo si es la carga principal
        if (processed.posts.length > 0 && !token && limit >= 40) {
          localStorage.setItem('dg_posts_cache', JSON.stringify(processed.posts));
          localStorage.setItem('dg_posts_cache_time', Date.now().toString());
        }
        
        return processed;
      } catch (e) {
        console.error("Fetch from server failed", e);
        // Fallback al feed público si el servidor falla (solo para carga inicial)
        if (!token) return { posts: await fetchFromPublicFeed(limit) };
        return { posts: [] };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // 1. Intentar cargar desde caché local para velocidad instantánea
    if (!pageToken) {
      const cached = localStorage.getItem('dg_posts_cache');
      const cacheTime = localStorage.getItem('dg_posts_cache_time');
      const now = Date.now();
      
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          if (cachedData.length > 0) {
            // Si el caché tiene más de 10 minutos, disparamos actualización en background
            if (!cacheTime || (now - parseInt(cacheTime)) > 10 * 60 * 1000) {
              fetchFromServer(maxResults, pageToken);
            }
            return { posts: maxResults < cachedData.length ? cachedData.slice(0, maxResults) : cachedData };
          }
        } catch (e) {
          console.error("Error parsing cache", e);
        }
      }
    }

    return await fetchFromServer(maxResults, pageToken);

  } catch (error) {
    console.error('Error in fetchArsenalData:', error);
    return { posts: [] };
  }
};

const fetchFromPublicFeed = async (limit: number): Promise<ContentPost[]> => {
  const blogId = "5031959192789589903";
  // Intentamos varios proxies para mayor fiabilidad
  const proxies = [
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  const targetUrl = `https://www.blogger.com/feeds/${blogId}/posts/default?alt=json&max-results=${limit}`;
  
  for (const getProxyUrl of proxies) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const response = await fetch(proxyUrl, { signal: controller.signal });
      
      if (response.ok) {
        const data = await response.json();
        // allorigins devuelve { contents: "..." } si no se usa /raw
        const finalData = data.contents ? JSON.parse(data.contents) : data;
        return processPublicFeedData(finalData);
      }
    } catch (e) {
      console.error(`Proxy failed: ${getProxyUrl(targetUrl)}`, e);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return [];
};

const processApiV3Data = (data: any): { posts: ContentPost[], nextPageToken?: string } => {
  if (!data || !data.items) return { posts: [] };

  const posts = data.items.map((item: any): ContentPost => {
    let imageUrl = '';
    if (item.images && item.images.length > 0) {
      imageUrl = item.images[0].url;
    } else {
      const imgMatch = item.content?.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    return {
      id: item.id,
      title: item.title || 'Sin título',
      content: item.content || '',
      published: item.published,
      url: item.url,
      images: imageUrl ? [{ url: imageUrl }] : [],
      author: {
        displayName: item.author?.displayName || 'DiosMasGym',
        image: { url: item.author?.image?.url || '' }
      },
      labels: item.labels || [],
      readingTime: Math.max(1, Math.ceil((item.content || '').split(/\s+/).length / 200))
    };
  });

  return { posts, nextPageToken: data.nextPageToken };
};

const processPublicFeedData = (data: any): ContentPost[] => {
  if (!data || !data.feed || !data.feed.entry) return [];
  const entries = data.feed.entry;
  return entries.map((entry: any): ContentPost => {
    const rawId = entry.id?.$t || Math.random().toString();
    const idParts = rawId.split('.post-');
    const id = idParts.length > 1 ? idParts[1] : rawId;
    const alternateLink = entry.link?.find((l: any) => l.rel === 'alternate');
    const url = alternateLink ? alternateLink.href : '';
    const labels = entry.category ? entry.category.map((c: any) => c.term) : [];
    const content = entry.content?.$t || entry.summary?.$t || '';
    let imageUrl = entry.media$thumbnail?.url || '';
    if (!imageUrl && content) {
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) imageUrl = imgMatch[1];
    }
    if (imageUrl && imageUrl.includes('/s72-c/')) {
      imageUrl = imageUrl.replace('/s72-c/', '/s1600/');
    }
    return {
      id,
      title: entry.title?.$t || 'Sin título',
      content,
      published: entry.published?.$t || new Date().toISOString(),
      url,
      images: imageUrl ? [{ url: imageUrl }] : [],
      author: {
        displayName: entry.author?.[0]?.name?.$t || 'DiosMasGym',
        image: { url: entry.author?.[0]?.gd$image?.src || '' }
      },
      labels,
      readingTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200))
    };
  });
};
