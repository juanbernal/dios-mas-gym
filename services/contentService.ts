
import { ContentPost } from '../types';

const getSlugFromUrl = (url: string) => {
  if (!url) return '';
  return url.split('/').pop()?.replace('.html', '') || '';
};

// Intenta normalizar acentos para búsquedas exitosas en Blogger
const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s deep search

      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) return { posts: [], nextPageToken: undefined };
        const data = await response.json();
        return processApiV3Data(data);
      } catch (e) {
        return { posts: [], nextPageToken: undefined };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Búsqueda inteligente: si falla con el original, probamos con variaciones (acentos)
    let result = await fetchFromServer(maxResults, pageToken, query);
    
    if (query && result.posts.length === 0) {
       const normalized = normalizeText(query);
       if (normalized !== query) {
         const retry = await fetchFromServer(maxResults, pageToken, normalized);
         return retry;
       }
    }

    return result;
  } catch (error) {
    return { posts: [] };
  }
};

export const fetchPostById = async (postId: string): Promise<ContentPost | null> => {
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : 'https://app.diosmasgym.com';
    const url = new URL('/api/arsenal', apiBase);
    url.searchParams.append('maxResults', '15'); 
    const response = await fetch(url.toString());
    const data = await response.json();
    const processed = processApiV3Data(data);
    return processed.posts.find(p => p.id === postId) || null;
  } catch (e) { return null; }
};

export const fetchPostBySlug = async (slug: string): Promise<ContentPost | null> => {
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : 'https://app.diosmasgym.com';

    const search = async (q: string) => {
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', '25');
      url.searchParams.append('q', q);
      const res = await fetch(url.toString());
      if (!res.ok) return { posts: [] };
      return processApiV3Data(await res.json());
    };

    const targetSlug = slug.toLowerCase();
    const queryTerm = slug.replace(/-/g, ' ');
    
    // Probamos varias estrategias en paralelo o cascada
    let result = await search(queryTerm);
    
    // Si no hay resultados o match, probamos sin acentos en el slug
    if (result.posts.length === 0) {
      result = await search(normalizeText(queryTerm));
    }

    const match = result.posts.find(p => {
       const pSlug = getSlugFromUrl(p.url).toLowerCase();
       return pSlug === targetSlug || pSlug.includes(targetSlug) || targetSlug.includes(pSlug);
    });

    if (match) return match;

    // Fallback de "último recurso" por última palabra del slug (ej: 'kaka')
    const chunks = targetSlug.split('-').filter(c => c.length > 3);
    if (chunks.length > 0) {
       const finalTry = await search(chunks[chunks.length - 1]);
       const finalMatch = finalTry.posts.find(p => getSlugFromUrl(p.url).toLowerCase().includes(targetSlug));
       return finalMatch || finalTry.posts[0] || null;
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
