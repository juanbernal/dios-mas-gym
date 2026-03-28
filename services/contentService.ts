
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde nuestro servidor (Proxy Seguro).
 * Esto protege la API Key y permite cargar grandes cantidades de datos.
 */
export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string) => {
      // PRO TIP: Si estamos en GitHub Pages (app.diosmasgym.com), 
      // forzamos la llamada a Vercel donde reside la API.
      const isVercel = window.location.hostname.includes('vercel');
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
      
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', limit.toString());
      if (token) url.searchParams.append('pageToken', token);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        
        // Si el servidor responde 404, es probable que la API no esté configurada aún en este entorno
        if (response.status === 404) {
          console.error("Server API not found (404). Please ensure Vercel functions are deployed.");
          return { posts: [], nextPageToken: undefined };
        }

        if (!response.ok) throw new Error(`Server API error: ${response.status}`);
        
        const data = await response.json();
        const processed = processApiV3Data(data);
        
        // Guardar en caché solo si es la carga principal
        if (processed.posts.length > 0 && !token && limit >= 20) {
          try {
            localStorage.setItem('dg_posts_cache', JSON.stringify(processed.posts));
            localStorage.setItem('dg_posts_cache_time', Date.now().toString());
          } catch (e) {
            console.warn("Could not save to cache (quota likely exceeded)", e);
          }
        }
        
        return processed;
      } catch (e) {
        console.error("Fetch from proxy failed:", e);
        return { posts: [], nextPageToken: undefined };
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

export const fetchPostById = async (postId: string): Promise<ContentPost | null> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
    
    // We fetch via the proxy but we could also have a specialized endpoint if needed.
    // For now, we'll just use the arsenal list and find it, but skip cache.
    const url = new URL('/api/arsenal', apiBase);
    url.searchParams.append('maxResults', '50');
    const response = await fetch(url.toString());
    const data = await response.json();
    const processed = processApiV3Data(data);
    return processed.posts.find(p => p.id === postId) || null;
  } catch (e) {
    console.error("Fetch post by ID failed", e);
    return null;
  }
};

export const fetchPostBySlug = async (slug: string): Promise<ContentPost | null> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');

    const url = new URL('/api/arsenal', apiBase);
    url.searchParams.append('maxResults', '20');
    url.searchParams.append('q', slug.replace(/-/g, ' '));
    const response = await fetch(url.toString());
    const data = await response.json();
    const processed = processApiV3Data(data);
    
    const exactMatch = processed.posts.find(p => {
      const pSlug = p.url.split('/').pop()?.replace('.html', '');
      return pSlug === slug;
    });
    return exactMatch || null;
  } catch (e) {
    console.error("Fetch post by slug failed", e);
    return null;
  }
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
