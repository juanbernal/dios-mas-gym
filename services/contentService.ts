
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde nuestro servidor (Proxy Seguro).
 * Esto protege la API Key y permite cargar grandes cantidades de datos.
 */
const getSlugFromUrl = (url: string) => {
  if (!url) return '';
  return url.split('/').pop()?.replace('.html', '') || '';
};

export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string, query?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string, q?: string) => {
      // PRO TIP: Si estamos en GitHub Pages (app.diosmasgym.com), 
      // forzamos la llamada a Vercel donde reside la API.
      const isVercel = window.location.hostname.includes('vercel');
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
      
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', limit.toString());
      if (token) url.searchParams.append('pageToken', token);
      if (q) url.searchParams.append('q', q);

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
        
        // Guardar en caché solo si es la carga principal y optimizar espacio
        if (processed.posts.length > 0 && !token && limit >= 20) {
          try {
            // Optimizar: no guardar el contenido HTML completo en el caché de la lista para ahorrar espacio (QuotaExceededError)
            const cacheablePosts = processed.posts.map(p => ({
               ...p,
               content: p.content.substring(0, 150) + '...' // Solo un extracto
            }));
            localStorage.setItem('dg_posts_cache', JSON.stringify(cacheablePosts));
            localStorage.setItem('dg_posts_cache_time', Date.now().toString());
          } catch (e) {
            console.warn("Retrying cache after clearing old data...");
            localStorage.removeItem('dg_posts_cache'); // Intentar limpiar si falla
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
    if (!pageToken && !query) {
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

    return await fetchFromServer(maxResults, pageToken, query);

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
    url.searchParams.append('maxResults', '30');
    // Búsqueda profunda: probamos slug original, sin guiones y variaciones comunes
    const query = slug.replace(/-/g, ' ');
    url.searchParams.append('q', `"${query}" OR ${query}`); // Comillas para búsqueda exacta + OR
    const response = await fetch(url.toString());
    const data = await response.json();
    const processed = processApiV3Data(data);
    
    // 1. Match Exacto por Slug (debe contener el slug tal cual)
    const exactMatch = processed.posts.find(p => {
      const pSlug = getSlugFromUrl(p.url).toLowerCase();
      const normalizedSlug = slug.toLowerCase();
      return pSlug === normalizedSlug || pSlug.includes(normalizedSlug) || normalizedSlug.includes(pSlug);
    });

    if (exactMatch) return exactMatch;

    // 2. Si es una búsqueda de un post viejo (como 'kaka'), buscar por palabras clave en los resultados
    const keywords = slug.split('-').filter(k => k.length > 3);
    if (keywords.length > 0) {
       const partialMatch = processed.posts.find(p => {
          const title = p.title.toLowerCase();
          const content = p.content.toLowerCase();
          return keywords.every(k => title.includes(k.toLowerCase()) || content.includes(k.toLowerCase()));
       });
       if (partialMatch) return partialMatch;
    }

    // 3. Fallback final al primer resultado o null
    return processed.posts[0] || null;
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
