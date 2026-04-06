
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde nuestro servidor (Proxy Seguro).
 * Esto permite cargar grandes cantidades de datos y bypass de CORS.
 */
const getSlugFromUrl = (url: string) => {
  if (!url) return '';
  return url.split('/').pop()?.replace('.html', '') || '';
};

export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string, query?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string, q?: string) => {
      const isVercel = window.location.hostname.includes('vercel');
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
      
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', limit.toString());
      if (token) url.searchParams.append('pageToken', token);
      if (q) url.searchParams.append('q', q);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) return { posts: [], nextPageToken: undefined };
        
        const data = await response.json();
        const processed = processApiV3Data(data);
        
        // Caché optimizada (solo para la carga inicial sin búsqueda)
        if (processed.posts.length > 0 && !token && !q && limit >= 50) {
          try {
            const cacheablePosts = processed.posts.map(p => ({
               ...p,
               content: p.content.substring(0, 150) + '...'
            }));
            localStorage.setItem('dg_posts_cache', JSON.stringify(cacheablePosts));
            localStorage.setItem('dg_posts_cache_time', Date.now().toString());
          } catch (e) {
            localStorage.removeItem('dg_posts_cache');
          }
        }
        
        return processed;
      } catch (e) {
        return { posts: [], nextPageToken: undefined };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Intentar caché (solo si no hay búsqueda ni paginación)
    if (!pageToken && !query) {
      const cached = localStorage.getItem('dg_posts_cache');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          if (cachedData.length > 0) return { posts: cachedData };
        } catch (e) {}
      }
    }

    return await fetchFromServer(maxResults, pageToken, query);
  } catch (error) {
    return { posts: [] };
  }
};

export const fetchPostById = async (postId: string): Promise<ContentPost | null> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
    const url = new URL('/api/arsenal', apiBase);
    url.searchParams.append('maxResults', '10'); // We just need to check if it's in the latest or search by ID specifically?
    // Actually our API doesn't have a direct ID fetch, so we fetch and find.
    const response = await fetch(url.toString());
    const data = await response.json();
    const processed = processApiV3Data(data);
    return processed.posts.find(p => p.id === postId) || null;
  } catch (e) { return null; }
};

export const fetchPostBySlug = async (slug: string): Promise<ContentPost | null> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');

    const search = async (q: string) => {
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', '20');
      url.searchParams.append('q', q);
      const res = await fetch(url.toString());
      const data = await res.json();
      return processApiV3Data(data);
    };

    // 1. Intento con slug exacto
    const query = slug.replace(/-/g, ' ');
    let result = await search(`"${query}"`);
    
    // 2. Intento con palabras clave si falla
    if (result.posts.length === 0) {
      result = await search(query);
    }
    
    const findMatch = (posts: ContentPost[]) => posts.find(p => {
      const pSlug = getSlugFromUrl(p.url).toLowerCase();
      const target = slug.toLowerCase();
      return pSlug === target || pSlug.includes(target) || target.includes(pSlug);
    });

    const match = findMatch(result.posts);
    if (match) return match;

    // 3. Fallback agresivo para artículos ultra-viejos (2011-2015)
    // Extraemos solo la palabra más importante (ej: 'kaka')
    const keywords = slug.split('-').filter(k => k.length > 3);
    if (keywords.length > 0) {
       const finalResult = await search(keywords[keywords.length - 1]);
       return findMatch(finalResult.posts) || finalResult.posts[0] || null;
    }

    return result.posts[0] || null;
  } catch (e) { return null; }
};

const processApiV3Data = (data: any): { posts: ContentPost[], nextPageToken?: string } => {
  if (!data || !data.items) return { posts: [] };
  const posts = data.items.map((item: any): ContentPost => {
    let imageUrl = '';
    if (item.images?.length > 0) imageUrl = item.images[0].url;
    else {
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
      author: { displayName: item.author?.displayName || 'DiosMasGym', image: { url: item.author?.image?.url || '' } },
      labels: item.labels || [],
      readingTime: Math.max(1, Math.ceil((item.content || '').split(/\s+/).length / 200))
    };
  });
  return { posts, nextPageToken: data.nextPageToken };
};
