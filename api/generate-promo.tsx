import React from 'react';
import { ImageResponse } from '@vercel/og';

// VERSIÓN 2.1: Anti-Cache + Transformación Explícita
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

    // 1. CARGA DE FUENTES
    const fontResults = await Promise.allSettled([
      fetch('https://unpkg.com/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff').then(r => r.arrayBuffer()),
      fetch('https://unpkg.com/@fontsource/inter/files/inter-latin-700-normal.woff').then(r => r.arrayBuffer())
    ]);

    const validateFont = (data: any) => {
        if (!data) return null;
        const head = new Uint8Array(data.slice(0, 4));
        if (head[0] === 60) return null;
        if (head[0] === 80 && head[1] === 97) return null;
        return data;
    };

    const safeBebas = validateFont(fontResults[0].status === 'fulfilled' ? fontResults[0].value : null);
    const safeInter = validateFont(fontResults[1].status === 'fulfilled' ? fontResults[1].value : null);

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

    // 3. DISEÑO
    const fonts: any[] = [];
    if (safeBebas) fonts.push({ name: 'Bebas Neue', data: safeBebas, style: 'normal' });
    if (safeInter) fonts.push({ name: 'Inter', data: safeInter, style: 'normal' });

    const finalTransform = safeBebas ? 'scale(1)' : 'scale(0.7, 1.0)';

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
          {bgUrl && (
            <div style={{ position: 'absolute', inset: -100, display: 'flex' }}>
              <img src={bgUrl} style={{ width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(80px) brightness(0.3)', opacity: 0.8 }} />
            </div>
          )}

          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")', display: 'flex' }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '850px',
              height: '1100px',
              border: `1px solid ${accent}44`,
              backgroundColor: 'rgba(5, 10, 25, 0.7)',
              borderRadius: '50px',
              padding: '60px',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 50px 100px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ position: 'absolute', top: 50, left: 50, width: 40, height: 40, borderTop: `4px solid ${accent}`, borderLeft: `4px solid ${accent}`, borderTopLeftRadius: '10px', display: 'flex' }} />
            <div style={{ position: 'absolute', bottom: 50, right: 50, width: 40, height: 40, borderBottom: `4px solid ${accent}`, borderRight: `4px solid ${accent}`, borderBottomRightRadius: '10px', display: 'flex' }} />

            <div style={{ display: 'flex', borderRadius: '40px', overflow: 'hidden', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 0 80px ${accent}33` }}>
              <img src={bgUrl} style={{ width: '450px', height: '450px', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: accent, letterSpacing: '0.8em', marginBottom: '25px', textTransform: 'uppercase', display: 'flex', fontWeight: 'bold' }}>THE BEAT SERIES</div>
              
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
                transform: finalTransform
              }}>
                {song.name}
              </div>
              
              <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.4)', marginBottom: '80px', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', fontWeight: 'bold' }}>
                {artist}
              </div>
              
              <div style={{ padding: '16px 60px', backgroundColor: 'white', color: 'black', borderRadius: '100px', fontSize: 18, fontWeight: 900, letterSpacing: '0.3em', boxShadow: '0 10px 30px rgba(255,255,255,0.2)', display: 'flex' }}>
                ESCUCHAR AHORA
              </div>
            </div>
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
    formData.append("caption", `🎧 *NUEVA RECOMENDACIÓN*\n━━━━━━━━━━━━━━━━━━\n🎵 *${song.name.toUpperCase()}*\n👤 Artista: *${artist}*\n\n👇 *Escúchalo aquí:*\n${song.url}\n\n📲 *Síguenos en nuestras redes sociales:*\nhttps://musica.diosmasgym.com\n\n#${artist.replace(/\s+/g, '')} #NuevaMusica #DiosMasGym`);
    formData.append("parse_mode", "Markdown");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });

    return new Response(JSON.stringify({ 
      success: true, 
      version: "2.1-AntiCache",
      status: "Mastering Finalization" 
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_system: error.message }), { status: 500 });
  }
}
