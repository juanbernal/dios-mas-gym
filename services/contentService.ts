import { ContentPost } from '../types';

const getSlugFromUrl = (url: string) => {
  if (!url) return '';
  return url.split('/').pop()?.replace('.html', '') || '';
};

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const toTitleCase = (str: string) => {
   return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export const fetchArsenalData = async (maxResults: number = 50, pageToken?: string, query?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  try {
    const fetchFromServer = async (limit: number, token?: string, q?: string) => {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
      // Si estamos en Vercel o local, usamos el mismo origen.
      const apiBase = (isLocal || hostname.includes('vercel.app')) 
        ? window.location.origin 
        : (hostname.includes('diosmasgym.com') ? window.location.origin : 'https://app.diosmasgym.com');
      
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
    
    // ESTRATEGIA DE BÚSQUEDA ROBUSTA (Armor-Plated Search)
    // Si la búsqueda original falla, probamos variaciones de capitalización y acentos
    if (query && result.posts.length === 0) {
       const term = query.trim();
       
       // Intento 1: Lowercase (kaka)
       if (term !== term.toLowerCase()) {
         result = await fetchFromServer(maxResults, pageToken, term.toLowerCase());
         if (result.posts.length > 0) return result;
       }

       // Intento 2: Title Case (Kaka)
       const titleCase = toTitleCase(term);
       if (titleCase !== term) {
         result = await fetchFromServer(maxResults, pageToken, titleCase);
         if (result.posts.length > 0) return result;
       }

       // Intento 3: Sin acentos y minúsculas (kaka)
       const normalized = normalizeText(term);
       if (normalized !== term && normalized !== term.toLowerCase()) {
         result = await fetchFromServer(maxResults, pageToken, normalized);
         if (result.posts.length > 0) return result;
       }

       // Intento 4: Búsqueda parcial de la última palabra del término (fuzzy)
       if (term.includes(' ')) {
          const parts = term.split(' ').filter(p => p.length > 3);
          if (parts.length > 0) {
             result = await fetchFromServer(maxResults, pageToken, parts[parts.length - 1]);
             if (result.posts.length > 0) return result;
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
      return processApiV3Data(res.ok ? await res.json() : {});
    };

    const targetSlug = slug.toLowerCase();
    const queryTerm = slug.replace(/-/g, ' ');
    
    // Probamos con el término derivado del slug
    let result = await searchApi(queryTerm);
    
    // Si falla, usamos el Armor-Plated Search de fetchArsenalData pero simplificado aquí
    if (result.posts.length === 0) {
       result = await fetchArsenalData(30, undefined, targetSlug.replace(/-/g, ' '));
    }

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
