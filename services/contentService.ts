
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
          console.warn("Server API not found (404). Switching to direct Blogger API fetch.");
          return await fetchDirectlyFromBlogger(limit, token);
        }

        if (!response.ok) throw new Error(`Server API error: ${response.status}`);
        
        const data = await response.json();
        const processed = processApiV3Data(data);
        
        // Guardar en caché solo si es la carga principal y comprimir para evitar cuota excedida
        if (processed.posts.length > 0 && !token && limit >= 20) {
          const lightPosts = processed.posts.map(({ content, ...rest }) => ({
            ...rest,
            content: content.length > 1000 ? content.substring(0, 1000) + '...' : content
          }));
          try {
            localStorage.setItem('dg_posts_cache', JSON.stringify(lightPosts));
            localStorage.setItem('dg_posts_cache_time', Date.now().toString());
          } catch (e) {
            console.warn("Could not save to cache (quota likely exceeded)", e);
          }
        }
        
        return processed;
      } catch (e) {
        console.error("Fetch from server failed", e);
        // Fallback directo a Blogger API si el servidor falla
        return await fetchDirectlyFromBlogger(limit, token);
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

export const fetchPostBySlug = async (slug: string): Promise<ContentPost | null> => {
  const blogId = "5031959192789589903";
  const apiKey = (process.env as any).BLOGGER_API_KEY;

  if (!apiKey) return null;

  try {
    // Intentamos buscar por el slug (que es parte del título o URL en Blogger)
    // La búsqueda de Blogger API es bastante flexible
    const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/search?q=${encodeURIComponent(slug)}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const processed = processApiV3Data(data);
    
    // Buscamos el post exacto que coincida con el slug en su URL
    const exactMatch = processed.posts.find(p => {
      const pSlug = p.url.split('/').pop()?.replace('.html', '');
      return pSlug === slug;
    });

    return exactMatch || processed.posts[0] || null;
  } catch (e) {
    console.error("Fetch post by slug failed", e);
    return null;
  }
};

const fetchDirectlyFromBlogger = async (limit: number, token?: string): Promise<{ posts: ContentPost[], nextPageToken?: string }> => {
  const blogId = "5031959192789589903";
  const apiKey = (process.env as any).BLOGGER_API_KEY;

  if (!apiKey) {
    console.error("No BLOGGER_API_KEY found for direct fetch.");
    return { posts: [] };
  }

  try {
    let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=${limit}&fetchImages=true`;
    if (token) url += `&pageToken=${token}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Blogger API direct error: ${response.status}`);
    
    const data = await response.json();
    return processApiV3Data(data);
  } catch (e) {
    console.error("Direct Blogger API fetch failed", e);
    return { posts: [] };
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
