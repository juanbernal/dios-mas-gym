import fs from 'fs';

const generateSlug = (text) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const parseMusicCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nombre,Artista')) { startIndex = i; break; }
  }
  const headers = lines[startIndex].split(',').map(h => h.trim().toLowerCase());
  const music = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === '---') continue;
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else current += char;
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
    });
    if (entry.name && entry.url) {
      let videoId = '';
      try {
        if (entry.url.includes('youtube.com') && entry.url.includes('v=')) videoId = entry.url.split('v=')[1].split('&')[0];
        else if (entry.url.includes('youtu.be/')) videoId = entry.url.split('youtu.be/')[1].split('?')[0];
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

    console.log("=== dM TOP 20 (most recent after reverse) ===");
    dM.slice(0, 20).forEach(s => console.log(`  [${s.date ? s.date.split('T')[0] : 'NO DATE'}] ${s.name}`));
    
    console.log("\n=== J6 TOP 20 (most recent after reverse) ===");
    j6.slice(0, 20).forEach(s => console.log(`  [${s.date ? s.date.split('T')[0] : 'NO DATE'}] ${s.name}`));

    // Check covers to detect albums
    console.log("\n=== dM Cover grouping (top 20) ===");
    const coverGroups = {};
    dM.slice(0, 20).forEach(s => {
        const coverKey = s.cover ? s.cover.split('/vi/')[1]?.split('/')[0] || s.cover : 'no-cover';
        if (!coverGroups[coverKey]) coverGroups[coverKey] = [];
        coverGroups[coverKey].push(s.name);
    });
    Object.entries(coverGroups).forEach(([k, songs]) => {
        if (songs.length > 1) console.log(`  ALBUM (${k}):`, songs);
    });
}
run();
