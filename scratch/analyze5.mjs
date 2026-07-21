async function run() {
  const itunesUrl = 'https://itunes.apple.com/search?term=dios+mas+gym&entity=musicArtist&limit=1';
  const artistData = await fetch(itunesUrl).then(r => r.json());
  if (artistData.results.length === 0) return console.log('Artist not found');
  const artistId = artistData.results[0].artistId;
  console.log('Artist ID:', artistId);
  
  const lookupUrl = 'https://itunes.apple.com/lookup?id=' + artistId + '&entity=song&limit=500';
  const songData = await fetch(lookupUrl).then(r => r.json());
  
  console.log('Total songs by Artist ID on Apple Music:', songData.results.length - 1);
  
  const appleSongs = songData.results.slice(1).map(s => s.trackName);
  
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
      });
      music.push(entry);
    }
    return music;
  };

  const dCsv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv').then(r=>r.text());
  const dbSongs = parse(dCsv);
  
  const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const dbSet = new Set(dbSongs.map(s => normalize(s.name)));

  const missing = [];
  appleSongs.forEach(song => {
      const normName = normalize(song);
      if (!dbSet.has(normName)) {
          missing.push(song);
      }
  });

  console.log('--- MISSING IN EXCEL ---');
  missing.forEach(m => console.log(m));
}
run();
