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
      const entry = { row: i + 1 };
      headers.forEach((header, index) => {
        let val = (values[index] || '').replace(/^"|"$/g, '').trim();
        if (header === 'nombre') entry.name = val;
        if (header === 'artista') entry.artist = val;
        if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
        if (header.includes('portada')) entry.cover = val;
      });
      if (entry.name && entry.artist && entry.artist.toLowerCase().includes('dios')) {
        music.push(entry);
      }
    }
    return music;
  };

  const dCsv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv').then(r=>r.text());

  const all = parse(dCsv);
  
  const groupedByCover = {};
  all.forEach(s => {
    let key = s.cover || 'No Cover';
    if (!groupedByCover[key]) groupedByCover[key] = [];
    groupedByCover[key].push(s);
  });

  console.log('Dios Mas Gym Albums Analysis:\n');
  Object.keys(groupedByCover).forEach(cover => {
    const songs = groupedByCover[cover];
    const missingYT = songs.filter(s => !s.url || !s.url.includes('youtu'));
    
    console.log('--------------------------------------------------');
    console.log('Cover URL:', cover);
    console.log(`Total Songs: ${songs.length} | Missing URL: ${missingYT.length}`);
    songs.forEach(m => {
       const hasUrl = m.url && m.url.includes('youtu') ? '✅ HAS YT URL' : '❌ MISSING YT URL';
       console.log(`  - ${m.name} [${hasUrl}]`);
    });
  });
}
run();
