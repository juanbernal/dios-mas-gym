
import { FEED_URL } from '../constants';
import { ContentPost } from '../types';

/**
 * Recuperación de datos desde el feed JSON público de Blogger.
 * No requiere API Key.
 */
export const fetchArsenalData = async (): Promise<ContentPost[]> => {
  try {
    // Intentamos usar nuestro proxy interno primero
    let response = await fetch('/api/feed');
    
    // Si falla (por ejemplo en un hosting estático como GitHub Pages), usamos un proxy público
    if (!response.ok) {
      console.warn('Internal proxy failed or not found, trying public proxy...');
      const blogId = "5031959192789589903";
      const targetUrl = `https://www.blogger.com/feeds/${blogId}/posts/default?alt=json&max-results=50`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      
      response = await fetch(proxyUrl);
    }
    
    if (!response.ok) {
      console.error('Blogger Feed Error:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return processFeedData(data);
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
