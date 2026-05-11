import fs from 'fs';

const generateSlug = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const parseMusicCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre,Artista')) {
      startIndex = i;
      break;
    }
  }

  const headerLine = lines[startIndex];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  
  const music = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;

    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else current += char;
    }
    values.push(current.trim());

    if (values.length < 4) continue;

    const entry = {};
    headers.forEach((header, index) => {
      let val = (values[index] || '').replace(/^"|"$/g, '').trim();
      
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
      if (header.includes('portada')) entry.cover = val;
      if (header === 'tipo') entry.type = val;
      if (header === 'fecha') entry.date = val;
      if (header.includes('album')) entry.album = val;
    });

    if (entry.name && entry.url) {
      let videoId = '';
      try {
        if (entry.url.includes('youtube.com') && entry.url.includes('v=')) {
          videoId = entry.url.split('v=')[1].split('&')[0];
        } else if (entry.url.includes('youtu.be/')) {
          videoId = entry.url.split('youtu.be/')[1].split('?')[0];
        }
      } catch (e) {}

      entry.id = videoId || generateSlug(`${entry.artist}-${entry.name}`);
      music.push(entry);
    }
  }

  return music.reverse();
};

async function run() {
    const dM_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=' + Date.now()).then(r => r.text());
    const j6_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv&t=' + Date.now()).then(r => r.text());
    
    const dM = parseMusicCSV(dM_csv);
    const j6 = parseMusicCSV(j6_csv);
    
    console.log("dM parsed:", dM.length);
    console.log("j6 parsed:", j6.length);

    const latestCatalog = [...dM.slice(0, 40), ...j6.slice(0, 40)];
    
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec?read=true';
    const existingRaw = await fetch(scriptUrl).then(r => r.json());
    
    const existing = existingRaw.map(r => {
        const findKey = (keys) => {
            const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
            return k ? r[k] : '';
        };
        return {
            Artista: findKey(['artista']),
            name: findKey(['name', 'nombre', 'titulo', 'título']),
            releaseDate: findKey(['releasedate', 'fecha']),
            preSaveLink: findKey(['presavelink', 'spotify', 'presave']),
            audioUrl: findKey(['audiourl', 'youtube', 'audio']),
            coverImageUrl: findKey(['coverimageurl', 'imagen', 'portada'])
        };
    });
    
    console.log("Existing count:", existing.length);

    const normalize = (s) => s.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '')
        .trim();

    const missing = latestCatalog.filter((cat, idx) => {
        const normCatName = normalize(cat.name);
        const normCatArtist = normalize(cat.artist);
        
        const isFound = existing.some(ex => {
            const normExName = normalize(ex.name || '');
            const normExArtist = normalize(ex.Artista || '');
            const isNameMatch = normExName === normCatName;
            
            const catDateOnly = cat.date ? cat.date.split('T')[0] : '';
            let isDateMatch = false;
            if (ex.releaseDate && catDateOnly) {
                let exDate = ex.releaseDate;
                if (exDate.includes('/')) {
                    const [d, m, y] = exDate.split('/');
                    exDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
                isDateMatch = exDate === catDateOnly;
            }
            
            const isArtistMatch = normExArtist.includes(normCatArtist) || normCatArtist.includes(normExArtist);
            return isArtistMatch && (isNameMatch || isDateMatch);
        });
        
        return !isFound;
    });

    console.log("Missing length:", missing.length);
    if (missing.length > 0) {
        console.log("First missing:", missing[0]);
    }
}

run();
