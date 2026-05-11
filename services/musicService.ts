import { MusicItem } from '../types';

const generateSlug = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

/**
 * Fetches music catalog for a specific artist via the backend proxy.
 */
export const fetchMusicCatalog = async (artist: 'diosmasgym' | 'juan614', forceRefresh = false): Promise<MusicItem[]> => {
  try {
    const isVercel = window.location.hostname.includes('vercel');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiBase = isLocal ? window.location.origin : (isVercel ? window.location.origin : 'https://app.diosmasgym.com');
    
    const url = new URL('/api/music', apiBase);
    url.searchParams.append('artist', artist);
    if (forceRefresh) url.searchParams.append('refresh', Date.now().toString());

    const response = await fetch(url.toString(), forceRefresh ? { cache: 'no-store' } : undefined);
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
 * Supports both Diosmasgym (named headers) and Juan614 (positional fallback) CSV formats.
 */
const parseMusicCSV = (csvText: string): MusicItem[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Data starts after the "---" if present, or from the headers
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre') && lines[i].includes('Artista')) {
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

    // Robust CSV split for handling quotes and spaces
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else current += char;
    }
    values.push(current.trim());

    if (values.length < 3) continue;

    const clean = (v: string) => (v || '').replace(/^"|"$/g, '').trim();

    const entry: any = {};

    // --- Named header mapping ---
    headers.forEach((header, index) => {
      const val = clean(values[index]);
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
      if (header.includes('portada')) entry.cover = val;
      if (header === 'tipo') entry.type = val;
      if (header === 'fecha') entry.date = val;
      if (header.includes('album')) entry.album = val;
    });

    // --- Positional fallbacks (for CSVs with empty header columns, e.g. Juan 614) ---
    // Expected order: 0=Nombre, 1=Artista, 2=URL, 3=Portada, 4=Tipo, 5=Fecha
    if (!entry.name)   entry.name   = clean(values[0]);
    if (!entry.artist) entry.artist = clean(values[1]);
    if (!entry.url)    entry.url    = clean(values[2]);
    if (!entry.cover)  entry.cover  = clean(values[3]);
    if (!entry.type)   entry.type   = clean(values[4]);
    if (!entry.date)   entry.date   = clean(values[5]);

    // Skip metadata rows (Spotify artist info, empty lines, etc.)
    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name) continue;

    if (entry.url) {
      let videoId = '';
      try {
        if (entry.url.includes('youtube.com') && entry.url.includes('v=')) {
          videoId = entry.url.split('v=')[1].split('&')[0];
        } else if (entry.url.includes('youtu.be/')) {
          videoId = entry.url.split('youtu.be/')[1].split('?')[0];
        }
      } catch (e) {}

      entry.id = videoId || generateSlug(`${entry.artist}-${entry.name}`);
      music.push(entry as MusicItem);
    }
  }

  // Return newest first (those at the bottom of the CSV)
  return music.reverse();
};
