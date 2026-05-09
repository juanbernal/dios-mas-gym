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
        if (char === '\"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else current += char;
    }
    values.push(current.trim());

    if (values.length < 4) continue;

    const entry = {};
    headers.forEach((header, index) => {
      let val = (values[index] || '').replace(/^\"|\"$/g, '').trim();
      
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'fecha') entry.date = val;
      if (header.includes('portada')) entry.cover = val;
      if (header.includes('youtube') || header.includes('audio')) entry.audio = val;
    });
    
    if(entry.name && entry.date && entry.date >= '2026-05-08') music.push(entry);
  }
  return music.reverse();
};

async function sync() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=2';
  const res = await fetch(url);
  const text = await res.text();
  const catalog = parseMusicCSV(text);
  
  console.log('Pushing latest to Sheet:', catalog.length, 'songs');
  
  const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
  
  for(const song of catalog) {
    const params = new URLSearchParams();
    params.append('name', song.name);
    params.append('releaseDate', song.date.split('T')[0]);
    params.append('Artista', song.artist);
    params.append('audioUrl', song.audio || '');
    params.append('coverImageUrl', song.cover || '');
    
    await fetch(googleScriptUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: params.toString()
    });
    console.log('Pushed', song.name);
  }
}
sync();
