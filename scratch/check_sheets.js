const generateSlug = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const parseMusicCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre') && lines[i].includes('Artista')) {
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
    for (const char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else current += char;
    }
    values.push(current.trim());

    if (values.length < 3) continue;

    const clean = (v) => (v || '').replace(/^"|"$/g, '').trim();

    const entry = {};

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

    if (!entry.name)   entry.name   = clean(values[0]);
    if (!entry.artist) entry.artist = clean(values[1]);
    if (!entry.url)    entry.url    = clean(values[2]);
    if (!entry.cover)  entry.cover  = clean(values[3]);
    if (!entry.type)   entry.type   = clean(values[4]);
    if (!entry.date)   entry.date   = clean(values[5]);

    if (!entry.url) continue;
    if (entry.url.includes('spotify.com/intl') || entry.url.includes('spotify.com/artist')) continue;
    if (!entry.name) continue;

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

  return music.reverse();
};

async function testParse() {
  const urls = [
    { name: 'diosmasgym', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv' },
    { name: 'juan614', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv' }
  ];

  for (const item of urls) {
    try {
      const res = await fetch(item.url);
      const text = await res.text();
      const songs = parseMusicCSV(text);
      console.log(`Artist: ${item.name}`);
      console.log(`Parsed count: ${songs.length}`);
      if (songs.length > 0) {
        console.log('First parsed song:', JSON.stringify(songs[0], null, 2));
      }
    } catch (e) {
      console.error(e);
    }
  }
}

testParse();
