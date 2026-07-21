async function run() {
  // 1. Fetch from Google Sheets Database
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
      });
      if (entry.name && entry.artistRaw.toLowerCase().includes('dios')) music.push(entry);
    }
    return music;
  };

  const dCsv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv').then(r=>r.text());
  const dbSongs = parse(dCsv);
  
  // Normalize string for comparison
  const normalize = (s) => s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');

  const dbSet = new Set();
  dbSongs.forEach(s => dbSet.add(normalize(s.name)));

  // 2. Fetch from iTunes API
  const itunesUrl = 'https://itunes.apple.com/search?term=dios+mas+gym&entity=song&limit=200';
  const itunesData = await fetch(itunesUrl).then(r => r.json());
  
  const appleSongs = itunesData.results.filter(r => r.artistName.toLowerCase().includes('dios mas gym'));

  const missingFromDB = [];
  appleSongs.forEach(song => {
      const normName = normalize(song.trackName);
      if (!dbSet.has(normName)) {
          // Double check if there's a partial match to avoid false positives (e.g. "Song (Acoustic)")
          const hasPartial = Array.from(dbSet).some(dbName => dbName.includes(normName) || normName.includes(dbName));
          if (!hasPartial) {
              missingFromDB.push(song);
          }
      }
  });

  // Group missing by album
  const missingByAlbum = {};
  missingFromDB.forEach(s => {
      const album = s.collectionName;
      if (!missingByAlbum[album]) missingByAlbum[album] = [];
      missingByAlbum[album].push(s.trackName);
  });

  console.log('--- CANCIONES EN APPLE MUSIC QUE FALTAN EN TU BASE DE DATOS EXCEL ---\n');
  if (Object.keys(missingByAlbum).length === 0) {
      console.log('¡Todas las canciones de Apple Music ya están en tu base de datos!');
  } else {
      Object.keys(missingByAlbum).forEach(album => {
          console.log(`ALBUM / EP: ${album}`);
          missingByAlbum[album].forEach(track => console.log(`  - ${track}`));
          console.log('');
      });
  }
}
run();
