import type { VercelRequest, VercelResponse } from '@vercel/node';

// URLS DE LOS CATÁLOGOS (CSV de Google Sheets)
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
];

function parseMusicCSV(csvText: string) {
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
  const music: any[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else current += char;
    }
    values.push(current.trim());
    if (values.length < 4) continue;
    const entry: any = {};
    headers.forEach((header, index) => {
      let val = (values[index] || '').replace(/^"|"$/g, '').trim();
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
      if (header.includes('portada')) entry.cover = val;
    });
    if (entry.name && entry.url) music.push(entry);
  }
  return music;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(400).json({ error: "Faltan variables: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID" });
    }

    // 1. Cargar catálogos
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    
    if (fullCatalog.length === 0) {
      return res.status(500).json({ error: "No se pudo cargar el catálogo de música." });
    }

    // 2. Selección aleatoria
    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];
    let artist = song.artist;
    if (artist.toLowerCase().includes("juan")) artist = "Juan 614";
    if (artist.toLowerCase().includes("dios")) artist = "Diosmasgym";

    // 3. Enviar MENSAJE DE TEXTO (Para verificar que la API funciona)
    const textMsg = `🔥 *RECOMENDACIÓN DEL DÍA* 🔥\n\n🎵 *${song.name}*\n👤 ${artist}\n\n🎧 Escúchalo aquí: ${song.url}\n\n#DiosMasGym #Juan614 #PromoAuto`;

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: textMsg,
        parse_mode: "Markdown"
      })
    });

    if (!telegramRes.ok) {
        const err = await telegramRes.json();
        return res.status(500).json({ error_telegram: err });
    }

    return res.status(200).json({ 
      success: true, 
      msg: "Mensaje de texto enviado a Telegram. La API está funcionando.",
      song: song.name
    });

  } catch (error: any) {
    return res.status(500).json({ error_node: error.message });
  }
}
