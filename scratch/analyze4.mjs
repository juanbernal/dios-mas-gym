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
      });
      if (entry.name && entry.artistRaw.toLowerCase().includes('dios')) music.push(entry);
    }
    return music;
  };

  const dCsv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv').then(r=>r.text());
  const dbSongs = parse(dCsv);
  
  const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const dbSet = new Set(dbSongs.map(s => normalize(s.name)));

  const itunesUrl = 'https://itunes.apple.com/search?term=diosmasgym&entity=song&limit=200';
  const itunesData = await fetch(itunesUrl).then(r => r.json());
  
  const appleSongs = itunesData.results.filter(r => r.artistName.toLowerCase().includes('dios') || r.artistName.toLowerCase().includes('gym'));
  
  const missing = [];
  appleSongs.forEach(song => {
      const normName = normalize(song.trackName);
      if (!dbSet.has(normName)) {
          missing.push(song.trackName);
      }
  });

  console.log('Apple Music returned: ' + appleSongs.length);
  console.log('Excel DB has: ' + dbSongs.length);
  console.log('--- MISSING IN DB ---');
  missing.forEach(m => console.log(m));
}
run();
