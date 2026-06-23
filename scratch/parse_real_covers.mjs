import fetch from 'node-fetch';

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
    });

    if (!entry.cover) entry.cover = clean(values[3]);

    if (entry.cover) {
      music.push(entry);
    }
  }

  return music;
};

async function test() {
  const res1 = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv');
  const text1 = await res1.text();
  const list1 = parseMusicCSV(text1);

  const res2 = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv');
  const text2 = await res2.text();
  const list2 = parseMusicCSV(text2);

  const all = [...list1, ...list2];
  console.log("Total entries with covers:", all.length);

  const covers = all.map(x => x.cover).filter(Boolean);
  const uniqueCovers = Array.from(new Set(covers));

  console.log("Unique covers count:", uniqueCovers.length);
  console.log("Unique covers list (first 40):");
  uniqueCovers.slice(0, 40).forEach(c => console.log(` - ${c}`));
}

test();
