import { MusicItem } from '../types';

/**
 * Fetches music catalog for a specific artist via the backend proxy.
 */
export const fetchMusicCatalog = async (artist: 'diosmasgym' | 'juan614'): Promise<MusicItem[]> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
    
    const url = new URL('/api/music', apiBase);
    url.searchParams.append('artist', artist);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const csvText = await response.text();
    return parseMusicCSV(csvText);
  } catch (error) {
    console.error(`Error fetching music for ${artist}:`, error);
    return [];
  }
};

/**
 * Parses a CSV string into an array of MusicItem objects.
 * Handles variations in headers and potential empty lines.
 */
const parseMusicCSV = (csvText: string): MusicItem[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Data starts after the "---" if present, or from the headers
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre,Artista')) {
      startIndex = i;
      break;
    }
  }

  const headerLine = lines[startIndex];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  const music: MusicItem[] = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;

    // Split handling commas within quotes
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    if (values.length < 4) continue;

    const entry: any = {};
    headers.forEach((header, index) => {
      let val = (values[index] || '').replace(/^"|"$/g, '').trim();
      
      // Map common header variations specifically
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
      if (header.includes('portada')) entry.cover = val;
      if (header === 'tipo') entry.type = val;
      if (header === 'fecha') entry.date = val;
    });

    if (entry.name && entry.url) {
      // Create a unique ID
      entry.id = entry.url.split('v=')[1] || Math.random().toString(36).substr(2, 9);
      music.push(entry as MusicItem);
    }
  }

  // Return newest first (those at the bottom of the CSV)
  return music.reverse();
};
