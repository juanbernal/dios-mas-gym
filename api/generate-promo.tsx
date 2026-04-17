import React from 'react';
import { ImageResponse } from '@vercel/og';

// VERSIÓN "CLEAN & PRO" (Reversión al diseño preferido por el usuario)
export const config = {
  runtime: 'edge',
};

const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
];

const templates = [
  { id: 'original-v1', color: '#c5a059', label: 'GOLD CLASSIC' },
  { id: 'beat-crimson', color: '#ff4444', label: 'CRIMSON STEEL' },
  { id: 'beat-cyber', color: '#00f2ff', label: 'CYBER ELECTRIC' },
  { id: 'beat-platinum', color: '#e5e4e2', label: 'PLATINUM GHOST' },
  { id: 'beat-toxic', color: '#39ff14', label: 'TOXIC EMERALD' }
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
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // 1. CARGA DE FUENTES (Solo las esenciales para el Clean Look)
    const fontResults = await Promise.allSettled([
      fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bebasneue/BebasNeue-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/static/Inter-Bold.ttf').then(r => r.arrayBuffer())
    ]);

    const bebasData = fontResults[0].status === 'fulfilled' ? fontResults[0].value : null;
    const interData = fontResults[1].status === 'fulfilled' ? fontResults[1].value : null;

    // Validación binaria básica
    const safeBebas = (bebasData && new Uint8Array(bebasData)[0] !== 60) ? bebasData : null;
    const safeInter = (interData && new Uint8Array(interData)[0] !== 60) ? interData : null;

    // 2. DATA
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const catalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];

    let artist = song.artist || "Diosmasgym";
    if (artist.toLowerCase().includes("juan")) artist = "Juan 614";
    if (artist.toLowerCase().includes("dios")) artist = "Diosmasgym";

    const accent = template.color;
    const bgUrl = song.cover;

    // 3. DISEÑO "CLEAN & PRO" (Inspirado en la imagen enviada por el usuario)
    const fonts: any[] = [];
    if (safeBebas) fonts.push({ name: 'Bebas Neue', data: safeBebas, style: 'normal' });
    if (safeInter) fonts.push({ name: 'Inter', data: safeInter, style: 'normal' });

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
          {/* Fondo Difuminado */}
          {bgUrl && (
            <div style={{ position: 'absolute', inset: -100, display: 'flex' }}>
              <img src={bgUrl} style={{ width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(80px) brightness(0.3)', opacity: 0.8 }} />
            </div>
          )}

          {/* Textura de Grano Sutil */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")', display: 'flex' }} />

          {/* Contenedor de Vidrio (Rounded Glass Card) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '850px',
              height: '1100px',
              border: `1px solid ${accent}44`,
              backgroundColor: 'rgba(5, 10, 25, 0.7)',
              borderRadius: '40px',
              padding: '60px',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 50px 100px rgba(0,0,0,0.5)',
            }}
          >
            {/* Esquinas Neon Minimalistas */}
            <div style={{ position: 'absolute', top: 40, left: 40, width: 40, height: 40, borderTop: `4px solid ${accent}`, borderLeft: `4px solid ${accent}`, borderTopLeftRadius: '10px', display: 'flex' }} />
            <div style={{ position: 'absolute', bottom: 40, right: 40, width: 40, height: 40, borderBottom: `4px solid ${accent}`, borderRight: `4px solid ${accent}`, borderBottomRightRadius: '10px', display: 'flex' }} />

            {/* Portada con Brillo Sutil */}
            <div style={{ display: 'flex', borderRadius: '20px', overflow: 'hidden', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 0 80px ${accent}33` }}>
              <img src={bgUrl} style={{ width: '450px', height: '450px', objectFit: 'cover' }} />
            </div>

            {/* Textos Centrales */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: accent, letterSpacing: '0.8em', marginBottom: '25px', textTransform: 'uppercase', display: 'flex', fontFamily: safeInter ? 'Inter' : 'sans-serif' }}>THE BEAT SERIES</div>
              
              <div style={{ 
                fontSize: 100, 
                fontFamily: safeBebas ? 'Bebas Neue' : 'sans-serif',
                color: 'white', 
                marginBottom: '15px', 
                textTransform: 'uppercase', 
                maxWidth: '750px', 
                lineHeight: 0.9, 
                letterSpacing: '0.05em',
                display: 'flex',
                transform: safeBebas ? 'none' : 'scaleX(0.7)'
              }}>
                {song.name}
              </div>
              
              <div style={{ 
                fontSize: 34, 
                color: 'rgba(255,255,255,0.4)', 
                marginBottom: '60px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.2em',
                display: 'flex',
                fontFamily: safeInter ? 'Inter' : 'sans-serif'
              }}>
                {artist}
              </div>

              {/* Botón Escuchar Ahora (Pill Button) */}
              <div style={{ 
                padding: '16px 50px', 
                backgroundColor: 'white', 
                color: 'black', 
                borderRadius: '50px', 
                fontSize: 16, 
                fontWeight: 900, 
                letterSpacing: '0.3em',
                boxShadow: '0 10px 30px rgba(255,255,255,0.2)',
                display: 'flex'
              }}>
                ESCUCHAR AHORA
              </div>
            </div>
          </div>
          
          {/* Marca de Agua Studio AI Minimal */}
          <div style={{ position: 'absolute', bottom: '50px', display: 'flex', alignItems: 'center', gap: '30px', opacity: 0.2 }}>
            <div style={{ width: '80px', height: '1px', backgroundColor: 'white', display: 'flex' }} />
            <div style={{ color: 'white', fontSize: 14, fontWeight: 900, letterSpacing: '0.6em', textTransform: 'uppercase', display: 'flex' }}>DiosMasGym • STUDIO AI</div>
            <div style={{ width: '80px', height: '1px', backgroundColor: 'white', display: 'flex' }} />
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
        fonts: fonts.length > 0 ? fonts : undefined
      }
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", new Blob([arrayBuffer], { type: 'image/png' }), "promo.png");
    formData.append("caption", `🎧 *${song.name}* - ${artist}\n✨ Recomendación del día.\n\nEscúchalo aquí: ${song.url}\n\n#DiosMasGym #TheBeatSeries`);
    formData.append("parse_mode", "Markdown");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });

    return new Response(JSON.stringify({ success: true, mode: "Clean & Pro Reversion" }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_system: error.message }), { status: 500 });
  }
}
