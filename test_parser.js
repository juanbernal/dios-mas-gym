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
    });
    
    if(entry.name) music.push(entry);
  }
  return music.reverse();
};

async function test() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=1';
  const res = await fetch(url);
  const text = await res.text();
  const catalog = parseMusicCSV(text);
  console.log(catalog.slice(0, 3));
}
test();
