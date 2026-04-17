import React from 'react';
import { ImageResponse } from '@vercel/og';

// URLS DE LOS CATÁLOGOS (CSV de Google Sheets)
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
];

function parseMusicCSV(csvText) {
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
    if (!line) continue;
    const values = line.split(',');
    if (values.length < 4) continue;
    const entry = {};
    headers.forEach((header, index) => {
      let val = (values[index] || '').trim();
      if (header === 'nombre') entry.name = val;
      if (header === 'artista') entry.artist = val;
      if (header === 'url spotify' || header === 'url youtube' || (header === 'url' && !entry.url)) entry.url = val;
    });
    if (entry.name && entry.url) music.push(entry);
  }
  return music;
}

export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // 1. Catálogo (Texto plano)
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)] || { name: "Error", artist: "Unknown", url: "" };

    // 2. DISEÑO ULTRA-SEGURO (SIN IMÁGENES, SIN FUENTES EXTERNAS)
    // Usamos puras divs y colores para validar si el runtime funciona.
    const design = React.createElement(
      'div',
      {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '40px',
        },
      },
      [
         React.createElement('div', { 
           style: { 
             fontSize: '60px', 
             fontWeight: 'bold', 
             marginBottom: '20px',
             textTransform: 'uppercase',
             textAlign: 'center'
           } 
         }, song.name),
         React.createElement('div', { 
           style: { 
             fontSize: '30px', 
             opacity: 0.5,
             marginBottom: '60px'
           } 
         }, song.artist),
         React.createElement('div', { 
           style: { 
             padding: '20px 40px', 
             backgroundColor: '#3b82f6', 
             borderRadius: '100px',
             fontSize: '20px'
           } 
         }, 'DALE PLAY')
      ]
    );

    const imageRes = new ImageResponse(design, { width: 800, height: 800 });
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    // 3. Telegram
    const formData = new FormData();
    const file = new Blob([buffer], { type: 'image/png' });
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", `🚀 ¡Recomendación del día!\n\n🎵 *${song.name}*\n👤 ${song.artist}\n\nEscucha aquí: ${song.url}`);
    formData.append("parse_mode", "Markdown");

    const telRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });
    
    if (!telRes.ok) {
        const err = await telRes.json();
        return res.status(500).json({ error_telegram: err });
    }

    return res.status(200).json({ success: true, mode: "ultra-safe-mode", song: song.name });

  } catch (error) {
    return res.status(500).json({ error_node: error.message });
  }
}
