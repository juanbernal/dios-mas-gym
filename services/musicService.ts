import { MusicItem } from '../types';

const generateSlug = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

/**
 * Fetches music catalog for a specific artist via the backend proxy.
 */
export const fetchMusicCatalog = async (artist: 'diosmasgym' | 'juan614', forceRefresh = false): Promise<MusicItem[]> => {
  try {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
    const isVercel = hostname.endsWith('.vercel.app') || hostname.includes('vercel');
    const isProdDomain = hostname === 'diosmasgym.com' || hostname.endsWith('.diosmasgym.com');
    const apiBase = (isLocal || isVercel || isProdDomain) ? window.location.origin : 'https://www.diosmasgym.com';
    
    const url = new URL('/api/music', apiBase);
    url.searchParams.append('artist', artist);
    if (forceRefresh) url.searchParams.append('refresh', Date.now().toString());

    const response = await fetch(url.toString(), forceRefresh ? { cache: 'no-store' } : undefined);
    if (!response.ok) {
      let errorDetails = '';
      try {
        const errJson = await response.json();
        errorDetails = errJson.details || errJson.error || JSON.stringify(errJson);
      } catch (e) {
        try {
          errorDetails = await response.text();
        } catch (e2) {}
      }
      throw new Error(`HTTP error! status: ${response.status}${errorDetails ? ` - Details: ${errorDetails}` : ''}`);
    }
    
    const csvText = await response.text();
    return parseMusicCSV(csvText);
  } catch (error) {
    console.error(`Error fetching music for ${artist}:`, error);
    return [];
  }
};

const isNonMusicOrForeign = (title: string): boolean => {
  if (!title) return true;
  const t = title.toLowerCase();

  // Tagalog words & non-Spanish auto-sync markers
  const tagalogRegex = /\b(ano|kung|ang|mga|hindi|ng|saulo|ebanghelyo|kasalanan|sinasabi|ligtas|kamatayan|dugo|sino|paano|katawan|lupang|bakit|tagalog|pinoy|na|ka|mo|ko|salamat|totoo|paalala|pagsubok|taong|impyerno|impiyerno|kailangan|pananampalataya|kaligtasan|handa|pumanaw|makilala|siyang|ating|tunay|kawikaan|biyaya|s'yang|bangkay|labanan|namatay|apostol|himala|langit|glorified|kinuha|bagong|orihinal|muling|ginawa|digmaang|salitang|pagibig|alalahanin|manalangin|panalangin|katangian|tagausig|pala|dito|nakapunta|ikaw|matapos|makagawa|sadyain|kulam|kasiguraduhan|hudas|iskariote|lord|pakinggan|ngayon|tupa|tsismis|nagkokontrahan|paul|james|nawawala|nagsasabing|pangalan|aklat|lahat|may|ilalaban|payo|hesus|biyaya|posible|sikreto)\b/;
  if (tagalogRegex.test(t)) return true;

  // English YouTube devotionals / trivia / sermon titles
  const englishDevotionals = [
    'sunset', 'ocean waves', 'billy graham', 'bible facts', 'miracles performed',
    'prophecies fulfilled', 'prophecy of', 'tribulation', 'armageddon', 'rapture',
    'how jesus', 'how moses', 'how sodom', 'how rapture', 'how to',
    'talk to jesus', 'he has good news', 'receive god', 'fear not', 'real love 💯',
    'pursue love', 'patiently waiting', 'guard your heart', 'god is my strength',
    'humble yourself', 'surrendered 💯', 'all things', "god's love",
    'worry no more', 'grace is sufficient', 'trusting god', 'remember this bible',
    'spreadlove', 'jesus is calling', 'top 5 biggest religion', 'prayer for',
    'morning prayer', 'fathers discipline', 'psalm chapter', 'happy hearts day',
    'how david', 'god is with us', 'god is love', 'god loves you',
    'god is our refuge', 'be strong and courageous', 'we are eternal', 'god knows your pain',
    'hope in the lord', 'receive god', 'the nine choirs', 'result of trust', 'trust in jesus',
    'jesus conquered', 'tired? come to jesus', 'love is..', 'do not fear', 'not that we loved',
    'jesus warning', 'marrying the right person', 'happiness is not a goal', 'put god first',
    'feeling unloved', 'miracles of jesus', 'miracle performed', 'how jesus turned', 'anxious? talk to jesus',
    'broken-hearted', 'need healing', 'need peace', 'feeling alone', 'are you tired',
    'prophecies fulfilled', 'biblical names', 'we belong to jesus', 'jesus chose you',
    'god is saying today', 'jesus the light', 'love message from god', 'the only way',
    'jesus the bread', 'message of the cross', 'jesus love will not', 'let me fight this',
    'first ten fallen angels', 'jesus reminder', 'scientific death', 'test your bible',
    'best gift ever!', 'king david', 'king solomon', "a father's discipline",
    'only reason i know', 'jesus is life', 'receive the good news', 'always remember',
    'why do i love', 'love your enemies'
  ];

  if (englishDevotionals.some(phrase => t.includes(phrase))) return true;

  return false;
};

/**
 * Parses a CSV string into an array of MusicItem objects.
 * Handles variations in headers and potential empty lines.
 * Supports both Diosmasgym (named headers) and Juan614 (positional fallback) CSV formats.
 */
const parseRows = (csv: string): string[] => {
  const rows: string[] = [];
  let currentRow = '';
  let inQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      if (char === '"') inQuotes = !inQuotes;
      
      if (char === '\n' && !inQuotes) {
          rows.push(currentRow);
          currentRow = '';
      } else if (char === '\r' && !inQuotes) {
          // ignore \r
      } else {
          currentRow += char;
      }
  }
  if (currentRow) rows.push(currentRow);
  return rows;
};

const parseMusicCSV = (csvText: string): MusicItem[] => {
  const lines = parseRows(csvText);
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
      if (header === 'letra' || header === 'lyrics') entry.lyrics = val.replace(/\\n/g, '\n');
    });

    // --- Positional fallbacks (for CSVs with empty header columns, e.g. Juan 614) ---
    // Expected order: 0=Nombre, 1=Artista, 2=URL, 3=Portada, 4=Tipo, 5=Fecha, 6=Letra
    if (!entry.name)   entry.name   = clean(values[0]);
    if (!entry.artist) entry.artist = clean(values[1]);
    if (!entry.url)    entry.url    = clean(values[2]);
    if (!entry.cover)  entry.cover  = clean(values[3]);
    if (!entry.type)   entry.type   = clean(values[4]);
    if (!entry.date)   entry.date   = clean(values[5]);
    if (!entry.lyrics && values[6]) entry.lyrics = clean(values[6]).replace(/\\n/g, '\n');

    // Skip metadata rows (Spotify artist info, empty lines, foreign/devotional auto-sync videos)
    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name || entry.name.toLowerCase().includes('spotify artist')) continue;
    if (isNonMusicOrForeign(entry.name)) continue;

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

/**
 * Deduplicates music catalog items by video ID or normalized name slug,
 * prioritizing official release types (Sencillo, Álbum, EP, Single) over YouTube Auto Sync entries.
 */
export const deduplicateCatalog = (items: MusicItem[]): MusicItem[] => {
  const map = new Map<string, MusicItem>();
  const isOfficialType = (type?: string) => {
    if (!type) return false;
    const t = type.toLowerCase();
    return t.includes('sencillo') || t.includes('álbum') || t.includes('album') || t.includes('ep') || t.includes('single');
  };

  for (const item of items) {
    if (!item) continue;
    let key = item.id;
    if (!key || key.includes('-')) {
      key = (item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '');
    }
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key)!;
      if (isOfficialType(item.type) && !isOfficialType(existing.type)) {
        map.set(key, item);
      }
    }
  }
  return Array.from(map.values());
};

