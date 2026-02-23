
import { FEED_URL } from '../constants';
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde el feed JSON público de Blogger.
 * No requiere API Key.
 */
export const fetchArsenalData = async (maxResults: number = 50): Promise<ContentPost[]> => {
  try {
    // 1. Intentar cargar desde caché local para velocidad instantánea
    const cached = localStorage.getItem('dg_posts_cache');
    const cacheTime = localStorage.getItem('dg_posts_cache_time');
    const now = Date.now();
    
    // Si el caché existe, lo usamos para entrar INSTANTÁNEAMENTE
    let cachedData: ContentPost[] = [];
    if (cached) {
      try {
        cachedData = JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing cache", e);
      }
    }

    // 2. Determinar si estamos en GitHub Pages o local
    const isGitHubPages = window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('diosmasgym.com') ||
                         window.location.hostname.includes('run.app');

    const fetchFromSource = async (limit: number) => {
      let data = null;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

      try {
        // Si no es GitHub Pages (es local con servidor Express), intentamos el proxy interno
        if (!isGitHubPages) {
          try {
            const response = await fetch(`/api/feed?maxResults=${limit}`, { signal: controller.signal });
            if (response.ok) {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                data = await response.json();
              }
            }
          } catch (e) {
            console.warn("Internal proxy fetch failed or timed out");
          }
        }
        
        // Si falla o estamos en producción estática, usamos el proxy público
        if (!data) {
          const blogId = "5031959192789589903";
          const targetUrl = `https://www.blogger.com/feeds/${blogId}/posts/default?alt=json&max-results=${limit}`;
          
          // Intentamos con AllOrigins
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          
          try {
            const response = await fetch(proxyUrl, { signal: controller.signal });
            if (response.ok) {
              data = await response.json();
            }
          } catch (e) {
            console.error("Public proxy 1 failed", e);
            
            // Intento 2: Otro proxy
            try {
              const proxyUrl2 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
              const response2 = await fetch(proxyUrl2, { signal: controller.signal });
              if (response2.ok) {
                data = await response2.json();
              }
            } catch (e2) {
              console.error("Public proxy 2 failed", e2);
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (data) {
        const processed = processFeedData(data);
        if (processed.length > 0) {
          // Solo guardamos en caché si pedimos el set completo (o si es mayor al caché actual)
          if (limit >= 40) {
            localStorage.setItem('dg_posts_cache', JSON.stringify(processed));
            localStorage.setItem('dg_posts_cache_time', Date.now().toString());
          }
          return processed;
        }
      }
      return null;
    };

    // Si tenemos caché (aunque sea viejo), lo devolvemos ya para que la app abra
    if (cachedData.length > 0) {
      // Si el caché tiene más de 5 minutos, disparamos el refresh en background
      if (!cacheTime || (now - parseInt(cacheTime)) > 5 * 60 * 1000) {
        fetchFromSource(maxResults); 
      }
      return cachedData;
    }

    // Si no hay caché, esperamos la carga inicial (con el límite solicitado)
    const freshData = await fetchFromSource(maxResults);
    return freshData || [];

  } catch (error) {
    console.error('Error fetching Blogger feed:', error);
    return [];
  }
};

const processFeedData = (data: any): ContentPost[] => {
  if (!data || !data.feed || !data.feed.entry) {
    console.warn('Blogger Feed: No entries found or invalid structure', data);
    return [];
  }

  const entries = data.feed.entry;
  
  return entries.map((entry: any): ContentPost => {
    // Extraer ID (formato: tag:blogger.com,1999:blog-ID.post-POSTID)
    const rawId = entry.id?.$t || Math.random().toString();
    const idParts = rawId.split('.post-');
    const id = idParts.length > 1 ? idParts[1] : rawId;
    
    // Extraer URL alterna (la del post en el blog)
    const alternateLink = entry.link?.find((l: any) => l.rel === 'alternate');
    const url = alternateLink ? alternateLink.href : '';
    
    // Extraer etiquetas
    const labels = entry.category ? entry.category.map((c: any) => c.term) : [];
    
    // Extraer contenido (preferir content, luego summary)
    const content = entry.content?.$t || entry.summary?.$t || '';
    
    // Extraer imagen (Blogger suele poner una miniatura)
    let imageUrl = entry.media$thumbnail?.url || '';
    
    // Intentar extraer imagen del contenido si no hay miniatura
    if (!imageUrl && content) {
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    // Si es una miniatura de Blogger (s72-c), obtenemos una más grande
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
        image: {
          url: entry.author?.[0]?.gd$image?.src || ''
        }
      },
      labels
    };
  });
};
