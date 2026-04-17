import React from 'react';
import { ImageResponse } from '@vercel/og';

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

    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: "Variables faltantes" }), { status: 400 });
    }

    // 1. CARGA DE FUENTES CON ULTRA-STABILITY (Try/Catch)
    let bebasData: ArrayBuffer | null = null;
    let interData: ArrayBuffer | null = null;

    try {
      // Usamos URLs de RAW GitHub o CDN directos que suelen ser más estables para Fetch
      const [resBebas, resInter] = await Promise.all([
        fetch('https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf'),
        fetch('https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf')
      ]);

      if (resBebas.ok) bebasData = await resBebas.arrayBuffer();
      if (resInter.ok) interData = await resInter.arrayBuffer();
    } catch (e) {
      console.error("No se pudieron descargar las fuentes, usando fallback del sistema.");
    }

    // 2. DATA
    const csvResults = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const catalog = csvResults.flatMap(csv => parseMusicCSV(csv));
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];

    let artist = song.artist || "Diosmasgym";
    if (artist.toLowerCase().includes("juan")) artist = "Juan 614";
    if (artist.toLowerCase().includes("dios")) artist = "Diosmasgym";

    // 3. GENERACIÓN DE IMAGEN
    const fonts: any[] = [];
    if (bebasData) fonts.push({ name: 'Bebas Neue', data: bebasData, style: 'normal' });
    if (interData) fonts.push({ name: 'Inter', data: interData, style: 'normal' });

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

          {/* Glass Container */}
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
            {/* Corners */}
            <div style={{ position: 'absolute', top: 40, left: 40, width: 40, height: 40, borderTop: `4px solid ${template.color}`, borderLeft: `4px solid ${template.color}`, borderTopLeftRadius: '10px' }} />
            <div style={{ position: 'absolute', bottom: 40, right: 40, width: 40, height: 40, borderBottom: `4px solid ${template.color}`, borderRight: `4px solid ${template.color}`, borderBottomRightRadius: '10px' }} />

            {/* Cover */}
            <div style={{ display: 'flex', borderRadius: '20px', overflow: 'hidden', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 0 80px ${template.color}33` }}>
              <img src={song.cover} style={{ width: '450px', height: '450px', objectFit: 'cover' }} />
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: template.color, letterSpacing: '0.8em', marginBottom: '25px', textTransform: 'uppercase' }}>THE BEAT SERIES</div>
              <div style={{ 
                fontSize: 90, 
                fontFamily: bebasData ? 'Bebas Neue' : 'sans-serif',
                color: 'white', 
                marginBottom: '15px', 
                textTransform: 'uppercase', 
                maxWidth: '750px', 
                lineHeight: 0.9, 
                letterSpacing: '0.05em' 
              }}>
                {song.name}
              </div>
              <div style={{ 
                fontSize: 34, 
                fontFamily: interData ? 'Inter' : 'sans-serif',
                color: 'rgba(255,255,255,0.4)', 
                fontStyle: 'italic', 
                marginBottom: '60px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.2em' 
              }}>
                {artist}
              </div>
              <div style={{ padding: '14px 45px', backgroundColor: 'white', color: 'black', borderRadius: '50px', fontSize: 14, fontWeight: 900, letterSpacing: '0.3em' }}>
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
    const file = new Blob([arrayBuffer], { type: 'image/png' });
    
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", `🎧 *${song.name}* - ${artist}\n✨ Recomendación del día.\n\nEscúchalo aquí: ${song.url}\n\n#DiosMasGym #TheBeatSeries`);
    formData.append("parse_mode", "Markdown");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });

    return new Response(JSON.stringify({ 
      success: true, 
      song: song.name, 
      font_status: fonts.length > 0 ? "Custom Loaded" : "System Fallback" 
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_system: error.message }), { status: 500 });
  }
}
