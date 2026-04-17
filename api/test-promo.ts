import React from 'react';
import { ImageResponse } from '@vercel/og';

// --- CONFIGURACIÓN DE PRUEBA ---
const DEPLOY_ID = "VERIFICACION_PATH_NUEVO_2326"; // ID único para confirmar subida
// -------------------------------

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

    // 1. Data
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)] || { name: "Test", artist: "System" };

    // 2. Imagen "Test"
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
          backgroundColor: '#000',
          color: '#0f0',
          padding: '40px',
        },
      },
      [
         React.createElement('div', { style: { fontSize: '40px', marginBottom: '20px' } }, "PRUEBA DE CONEXIÓN"),
         React.createElement('div', { style: { fontSize: '20px', color: '#fff' } }, `ID: ${DEPLOY_ID}`),
         React.createElement('div', { style: { fontSize: '60px', marginTop: '40px' } }, song.name)
      ]
    );

    const imageRes = new ImageResponse(design, { width: 800, height: 600 });
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    // 3. Telegram
    const formData = new FormData();
    const file = new Blob([buffer], { type: 'image/png' });
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "test.png");
    formData.append("caption", `✅ Prueba de Deploy: ${DEPLOY_ID}`);

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });

    return res.status(200).json({ 
        deployed: true, 
        id: DEPLOY_ID, 
        song: song.name,
        message: "Si ves esto, el código nuevo SÍ se subió." 
    });

  } catch (error) {
    return res.status(500).json({ error_deploy: error.message, id: DEPLOY_ID });
  }
}
