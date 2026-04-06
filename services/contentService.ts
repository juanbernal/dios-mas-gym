import { ContentPost } from '../types';

const getSlugFromUrl = (url: string) => {
  if (!url) return '';
  return url.split('/').pop()?.replace('.html', '') || '';
};

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string, query?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string, q?: string) => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBase = isLocal ? window.location.origin : 'https://app.diosmasgym.com';
      
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', limit.toString());
      if (token) url.searchParams.append('pageToken', token);
      if (q) url.searchParams.append('q', q);

      try {
        const response = await fetch(url.toString());
        if (!response.ok) return { posts: [], nextPageToken: undefined };
        const data = await response.json();
        return processApiV3Data(data);
      } catch (e) {
        return { posts: [], nextPageToken: undefined };
      }
    };

    let result = await fetchFromServer(maxResults, pageToken, query);
    
    // Si la búsqueda original falla, intentamos búsquedas más "suaves"
    if (query && result.posts.length === 0) {
       // Intento 1: Sin acentos
       const normalized = normalizeText(query);
       if (normalized !== query) {
         const retry = await fetchFromServer(maxResults, pageToken, normalized);
         if (retry.posts.length > 0) return retry;
       }
       
       // Intento 2: Palabras individuales si es una cadena larga (ej: slug)
       if (query.includes(' ')) {
          const keywords = query.split(' ').filter(k => k.length > 3);
          if (keywords.length > 0) {
             const fuzzyRetry = await fetchFromServer(maxResults, pageToken, keywords[keywords.length - 1]);
             return fuzzyRetry;
          }
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

    const searchApi = async (q: string) => {
      const url = new URL('/api/arsenal', apiBase);
      url.searchParams.append('maxResults', '30');
      url.searchParams.append('q', q);
      const res = await fetch(url.toString());
      if (!res.ok) return { posts: [] };
      return processApiV3Data(await res.json());
    };

    const targetSlug = slug.toLowerCase();
    const queryTerm = slug.replace(/-/g, ' ');
    
    // 1. Buscamos por el término exacto del slug (con espacios)
    let result = await searchApi(queryTerm);
    
    // 2. Buscamos por palabras clave si no hay resultados
    if (result.posts.length === 0) {
       const chunks = targetSlug.split('-').filter(c => c.length > 3);
       if (chunks.length > 0) {
          result = await searchApi(chunks[chunks.length - 1]);
       }
    }

    // 3. Verificamos si alguno de los resultados coincide con el slug real en el URL
    const match = result.posts.find(p => {
       const pSlug = getSlugFromUrl(p.url).toLowerCase();
       return pSlug === targetSlug || pSlug.includes(targetSlug) || targetSlug.includes(pSlug);
    });

    return match || result.posts[0] || null;
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
