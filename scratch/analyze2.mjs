async function run() {
  const parse = (csvText) => {
    const lines = csvText.split(/\r?\n/);
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Nombre,Artista')) { startIndex = i; break; }
    }
    const headers = lines[startIndex].split(',').map(h => h.trim().toLowerCase());
    const music = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '---') continue;
      const values = []; let current = ''; let inQuotes = false;
      for (let char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else current += char;
      }
      values.push(current.trim());
      const entry = { row: i + 1, artistRaw: values[1] || '' };
      headers.forEach((header, index) => {
        let val = (values[index] || '').replace(/^"|"$/g, '').trim();
        if (header === 'nombre') entry.name = val;
        if (header === 'artista') entry.artist = val;
        if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
        if (header.includes('portada')) entry.cover = val;
      });
      if (entry.name && entry.artistRaw.toLowerCase().includes('dios')) music.push(entry);
    }
    return music;
  };

  const dCsv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv').then(r=>r.text());
  const all = parse(dCsv);
  
  // Create a set of all normalized names that have a YouTube link
  const ytSongs = new Set();
  all.forEach(s => {
      if (s.url && s.url.includes('youtu')) {
          ytSongs.add(s.name.trim().toLowerCase());
      }
  });

  const trulyMissing = [];
  all.forEach(s => {
      if (!s.url || !s.url.includes('youtu')) {
          if (!ytSongs.has(s.name.trim().toLowerCase())) {
              trulyMissing.push(s);
          }
      }
  });

  console.log('TRULY MISSING FROM YOUTUBE (No row has a YT link for this name):');
  trulyMissing.forEach(s => console.log(' - ' + s.name + ' (Cover: ' + s.cover + ')'));

}
run();
