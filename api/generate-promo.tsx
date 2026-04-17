import React from 'react';
import { ImageResponse } from '@vercel/og';

// MOTOR DE EDGE RUNTIME (Máxima compatibilidad con @vercel/og)
export const config = {
  runtime: 'edge',
};

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

export default async function handler(req: Request) {
  try {
    const BOT_TOKEN = "6696133622:AAEC99ObW5r2TKFNwGF_eto6RbIL3iK1DUY";
    const CHAT_ID = "6439505267";

    // 1. Catálogo
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const catalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];

    let artist = song.artist;
    if (artist.toLowerCase().includes("juan")) artist = "Juan 614";
    if (artist.toLowerCase().includes("dios")) artist = "Diosmasgym";

    // 2. Imagen "The Beat" (Diseño Premium)
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
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Fondo Blur */}
          <div style={{ display: 'flex', position: 'absolute', inset: -100 }}>
            <img 
              src={song.cover} 
              style={{ width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(80px) brightness(0.3)', opacity: 0.8 }} 
            />
          </div>

          {/* Grano / Textura */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")' }} />

          {/* Contenedor Principal */}
          <div
            style={{
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
            }}
          >
            {/* Esquinas Neon */}
            <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: `4px solid ${template.color}`, borderLeft: `4px solid ${template.color}`, borderTopLeftRadius: '10px' }} />
            <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: `4px solid ${template.color}`, borderRight: `4px solid ${template.color}`, borderBottomRightRadius: '10px' }} />

            {/* Portada */}
            <div style={{ display: 'flex', borderRadius: '20px', overflow: 'hidden', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 0 50px ${template.color}22` }}>
              <img src={song.cover} style={{ width: '450px', height: '450px', objectFit: 'cover' }} />
            </div>

            {/* Texto */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: template.color, letterSpacing: '0.6em', marginBottom: '20px', textTransform: 'uppercase' }}>THE BEAT SERIES</div>
              <div style={{ fontSize: 72, fontWeight: 900, color: 'white', marginBottom: '10px', textTransform: 'uppercase', maxWidth: '700px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{song.name}</div>
              <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: '60px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{artist}</div>

              {/* Simulación Botón */}
              <div style={{ padding: '12px 30px', backgroundColor: 'white', color: 'black', borderRadius: '50px', fontSize: 14, fontWeight: 900, letterSpacing: '0.2em' }}>ESCUCHAR AHORA</div>
            </div>
          </div>
          
          {/* Pie de página */}
          <div style={{ position: 'absolute', bottom: '60px', display: 'flex', alignItems: 'center', gap: '20px', opacity: 0.2 }}>
            <div style={{ width: '100px', height: '1px', backgroundColor: 'white' }} />
            <div style={{ color: 'white', fontSize: 12, fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase' }}>DiosMasGym • Studio AI</div>
            <div style={{ width: '100px', height: '1px', backgroundColor: 'white' }} />
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );

    // 3. Envío a Telegram
    const arrayBuffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    // En Edge Runtime, el Blob se crea pasando el arrayBuffer
    const file = new Blob([arrayBuffer], { type: 'image/png' });
    
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", `🎧 *${song.name}* - ${artist}\n✨ Disponible ahora: ${song.url}\n\n#DiosMasGym #TheBeat`);
    formData.append("parse_mode", "Markdown");

    const telRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    if (!telRes.ok) {
        const errData = await telRes.json();
        return new Response(JSON.stringify({ error_telegram: errData }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, song: song.name, engine: "edge-runtime" }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_edge: error.message }), { status: 500 });
  }
}
