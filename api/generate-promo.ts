import React from 'react';
import { ImageResponse } from '@vercel/og';

// URLS DE LOS CATÁLOGOS (CSV de Google Sheets)
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
];

const templates = [
  { id: 'gold', color: '#c5a059', label: 'GOLD CLASSIC' },
  { id: 'crimson', color: '#ff4444', label: 'CRIMSON STEEL' },
  { id: 'cyber', color: '#00f2ff', label: 'CYBER ELECTRIC' },
  { id: 'platinum', color: '#e5e4e2', label: 'PLATINUM GHOST' },
  { id: 'toxic', color: '#39ff14', label: 'TOXIC EMERALD' }
];

const catchyTexts = [
  "💎 ¡Una joya que no puedes dejar de escuchar!",
  "🔥 Energía pura para tu día. ¡Dale play!",
  "🎧 ¿Buscas algo nuevo? Esta es la señal.",
  "✨ Directo a tus favoritos. ¡Escúchalo ya!",
  "🧨 ¡Esto está rompiendo! ¿Ya lo escuchaste?"
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
    const values = [];
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
    const entry = {};
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

export default async function handler(req, res) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(400).json({ error: "Missing config." });
    }

    // 1. Cargar catálogo
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    
    if (fullCatalog.length === 0) return res.status(500).json({ error: "Empty catalog." });

    // 2. Selección
    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const capText = catchyTexts[Math.floor(Math.random() * catchyTexts.length)];

    let artist = song.artist;
    if (artist.toLowerCase().includes("juan")) artist = "Juan 614";
    if (artist.toLowerCase().includes("dios")) artist = "Diosmasgym";

    // 3. Diseño con React.createElement (Evita líos de .tsx)
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
          backgroundColor: '#020617',
          position: 'relative',
          overflow: 'hidden',
        },
      },
      [
        // Fondo
        React.createElement('div', { style: { display: 'flex', position: 'absolute', inset: -100 } }, [
          React.createElement('img', { src: song.cover, style: { width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(80px) brightness(0.3)', opacity: 0.8 } })
        ]),
        // Marco
        React.createElement('div', {
          style: {
             display: 'flex',
             flexDirection: 'column',
             width: '850px',
             height: '1100px',
             border: `1px solid ${template.color}44`,
             backgroundColor: 'rgba(5, 10, 25, 0.7)',
             borderRadius: '40px',
             padding: '60px',
             alignItems: 'center',
             justifyContent: 'center',
             position: 'relative',
          }
        }, [
          React.createElement('div', { style: { position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: `4px solid ${template.color}`, borderLeft: `4px solid ${template.color}` } }),
          React.createElement('div', { style: { position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: `4px solid ${template.color}`, borderRight: `4px solid ${template.color}` } }),
          React.createElement('div', { style: { display: 'flex', borderRadius: '20px', overflow: 'hidden', marginBottom: '60px' } }, [
             React.createElement('img', { src: song.cover, style: { width: '450px', height: '450px', objectFit: 'cover' } })
          ]),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, [
             React.createElement('div', { style: { fontSize: 16, color: template.color, letterSpacing: '0.6em', marginBottom: '20px' } }, 'RECOMENDACIÓN HOY'),
             React.createElement('div', { style: { fontSize: 72, fontWeight: 900, color: 'white', marginBottom: '10px' } }, song.name),
             React.createElement('div', { style: { fontSize: 32, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: '60px' } }, artist)
          ])
        ])
      ]
    );

    const imageRes = new ImageResponse(design, { width: 1080, height: 1350 });

    // 4. Enviar a Telegram
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const formData = new FormData();
    const file = new Blob([buffer], { type: 'image/png' });
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", `${capText}\n\n🎧 *${song.name}* - ${artist}\n✨ Escúchalo: ${song.url}`);
    formData.append("parse_mode", "Markdown");

    const telRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });
    if (!telRes.ok) return res.status(500).json({ error: "Telegram failed" });

    return res.status(200).json({ success: true, song: song.name });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
