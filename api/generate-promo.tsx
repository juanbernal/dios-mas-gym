import React from 'react';
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

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

export default async function (req: Request) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ 
        error: "Faltan variables de entorno: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID",
        check: "Asegúrate de haberlas guardado en Vercel Dashboard -> Settings -> Environment Variables y que estén disponibles para 'Production'"
      }), { status: 400 });
    }

    // 1. Cargar catálogos
    const results = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = results.flatMap(csv => parseMusicCSV(csv));
    
    if (fullCatalog.length === 0) {
      return new Response(JSON.stringify({ error: "El catálogo de música está vacío o falló la descarga del CSV" }), { status: 400 });
    }

    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];

    // 2. Generar Imagen SIMPLE (Sin fuentes externas ni filtros pesados)
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#020617',
            color: 'white',
            padding: '40px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 20, color: '#00f2ff' }}>DIOSMASGYM PROMO</div>
          <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>{song.name}</div>
          <div style={{ fontSize: 40, opacity: 0.6 }}>{song.artist}</div>
          <div style={{ position: 'absolute', bottom: 40, opacity: 0.2 }}>Safe Mode Diagnostic</div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );

    const imageData = await imageResponse.arrayBuffer();
    
    // 3. Enviar a Telegram
    const formData = new FormData();
    const file = new Blob([imageData], { type: 'image/png' });
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "simple-promo.png");
    formData.append("caption", `🚀 Promo de prueba: ${song.name} - ${song.artist}\nLink: ${song.url}`);

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    if (!telegramRes.ok) {
      const errorData = await telegramRes.json();
      return new Response(JSON.stringify({ error_telegram: errorData }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      mode: "diagnostic-safe",
      song: song.name 
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_crash: error.message }), { status: 500 });
  }
}
