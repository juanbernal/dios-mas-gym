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

    // 1. CARGA DE TODAS LAS FUENTES (Identidad Visual Completa)
    const [bebasData, interData, satisfyData, dmSerifData] = await Promise.all([
      fetch('https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf').then(r => r.arrayBuffer()),
      fetch('https://github.com/google/fonts/raw/main/ofl/satisfy/Satisfy-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('https://github.com/google/fonts/raw/main/ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf').then(r => r.arrayBuffer())
    ]);

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

    // 3. GENERACIÓN DE IMAGEN VERSIÓN MASTER 4K
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* BACKGROUND LAYERS */}
          {bgUrl && (
            <div style={{ position: 'absolute', inset: -50, display: 'flex' }}>
              <img src={bgUrl} style={{ width: '110%', height: '110%', objectFit: 'cover', filter: 'blur(80px) brightness(1.02)' }} />
            </div>
          )}
          
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)' }} />
          
          {/* BOKEH EFFECTS */}
          {[
            {x:'15%',y:'20%',s:200,o:0.1},
            {x:'75%',y:'10%',s:300,o:0.08},
            {x:'88%',y:'55%',s:150,o:0.12},
            {x:'5%',y:'70%',s:250,o:0.1}
          ].map((b,i) => (
            <div key={i} style={{ 
              position:'absolute', left:b.x, top:b.y, width:b.s, height:b.s, borderRadius:'50%', 
              background: `radial-gradient(circle, ${accent}${Math.floor(b.o*255).toString(16)} 0%, transparent 70%)`,
              filter: 'blur(30px)', zIndex: 1
            }} />
          ))}

          {/* NOISE & SCANLINES (Using HTML/CSS replication) */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")', zIndex: 2 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 50%)', backgroundSize: '100% 4px', zIndex: 2 }} />

          {/* THE MASTER SIDEBAR */}
          <div style={{ 
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}>
             <div style={{ 
               transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 18, fontWeight: 900, letterSpacing: '0.4em', color: accent, opacity: 0.6, fontFamily: 'Inter', textTransform: 'uppercase'
             }}>
                DIOSMASGYM RECORDS · PURO CHIHUAHUA · 2026
             </div>
             <div style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '1px', background: `linear-gradient(to bottom, transparent, ${accent}55, transparent)` }} />
          </div>

          {/* MAIN PROMO CONTENT AREA */}
          <div style={{ flex: 1, padding: '80px', paddingLeft: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 5 }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.5em', color: accent, fontFamily: 'Inter' }}>{artist.toUpperCase()} RECORDS</div>
                  <div style={{ fontSize: 12, letterSpacing: '0.8em', opacity: 0.4, fontWeight: 'bold', fontFamily: 'Inter' }}>REFLECTIONS // HUB PRO V5.1 // PURO CHIHUAHUA</div>
               </div>
               <div style={{ padding: "8px 24px", borderRadius: 4, border: `1px solid ${accent}66`, background: "rgba(0, 0, 0, 0.4)", color: accent, fontSize: 16, fontWeight: '900', letterSpacing: '0.2em', fontFamily: 'Inter' }}>
                  YA DISPONIBLE
               </div>
            </div>

            {/* CENTER PORTRAIT & TITLE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
               {/* Cover Container */}
               <div style={{ position: 'relative', padding: 10, background: `linear-gradient(135deg, ${accent} 0%, transparent 50%, ${accent} 100%)`, borderRadius: 8, boxShadow: "0 60px 150px rgba(0,0,0,0.8)" }}>
                  <div style={{ width: 600, height: 600, overflow: 'hidden', borderRadius: 4 }}>
                     <img src={bgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
               </div>

               {/* Large Bold Title */}
               <div style={{ marginTop: '40px' }}>
                  <div style={{ 
                    fontSize: 180, 
                    fontWeight: 900, 
                    fontFamily: 'Bebas Neue', 
                    color: 'white', 
                    lineHeight: 0.85, 
                    letterSpacing: '-2px',
                    textShadow: `0 0 80px ${accent}88, 0 10px 40px rgba(0,0,0,0.8)`
                  }}>
                    {song.name.toUpperCase()}
                  </div>

                  {/* Artist Chip */}
                  <div style={{ marginTop: '30px' }}>
                    <div style={{ 
                      fontSize: 34, color: accent, fontWeight: 900, letterSpacing: '0.3em', fontFamily: 'Inter',
                      background: 'rgba(0,0,0,0.5)', padding: '12px 60px', borderRadius: 100, border: `1px solid ${accent}44`, display: 'inline-block'
                    }}>
                      {artist.toUpperCase()}
                    </div>
                  </div>
               </div>

               {/* Platforms Label */}
               <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <div style={{ color: accent, fontSize: 16, fontWeight: 900, letterSpacing: '0.5em', display: 'flex', alignItems: 'center', gap: 20 }}>
                     <div style={{ width: 60, height: 1, backgroundColor: `${accent}44` }} />
                     PLATAFORMAS DIGITALES
                     <div style={{ width: 60, height: 1, backgroundColor: `${accent}44` }} />
                  </div>
                  {/* Digital Icons (Simplified text for now, in a real app use SVGs) */}
                  <div style={{ display: 'flex', gap: 50, opacity: 0.8 }}>
                     {/* SVG MOCKUPS FOR PLATFORMS */}
                     <span style={{ color: accent, fontSize: 24, fontWeight: 'bold' }}>SPOTIFY</span>
                     <span style={{ color: accent, fontSize: 24, fontWeight: 'bold' }}>APPLE</span>
                     <span style={{ color: accent, fontSize: 24, fontWeight: 'bold' }}>YOUTUBE</span>
                  </div>
               </div>
            </div>

            {/* EMPTY FLEX PUSH */}
            <div style={{ flex: 1 }} />

          </div>

          {/* MASTER FOOTER */}
          <div style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,1) 100%)`,
            borderTop: `2px solid ${accent}66`,
            padding: `40px 80px 40px 220px`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            {/* Left: Edition */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
               <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.4em', color: accent }}>{template.label} EDITION</div>
               <div style={{ fontSize: 12, opacity: 0.3, color: 'white' }}>© 2026 RECORDS HUB PRO</div>
            </div>

            {/* Center: URL & Slogan */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
               <div style={{ 
                 padding: "10px 40px", borderRadius: 4, backgroundColor: accent, color: 'black', fontWeight: 900, fontSize: 20, letterSpacing: '0.2em'
               }}>
                  MUSICA.DIOSMASGYM.COM
               </div>
               <div style={{ 
                 fontSize: 48, color: 'white', fontFamily: 'Satisfy', opacity: 0.9, textShadow: '0 4px 10px rgba(0,0,0,0.5)'
               }}>
                  {artist.toLowerCase().includes('juan') ? 'Puro Señor Jesucristo' : 'Puro Chihuahua, Saludos'}
               </div>
            </div>

            {/* Right: Studio Logo Mockup */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '0.2em' }}>STUDIO <span style={{ color: accent }}>AI</span></div>
               <div style={{ fontSize: 10, opacity: 0.3, letterSpacing: '0.1em' }}>POWERED BY DIOSMASGYM</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
        fonts: [
          { name: 'Bebas Neue', data: bebasData, style: 'normal' },
          { name: 'Inter', data: interData, style: 'normal' },
          { name: 'Satisfy', data: satisfyData, style: 'normal' },
          { name: 'DM Serif Display', data: dmSerifData, style: 'normal' }
        ]
      }
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    const file = new Blob([arrayBuffer], { type: 'image/png' });
    
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", `🔥 *NUEVO ESTRENO AUTOMÁTICO*\n\n🎧 *${song.name}*\n👤 ${artist}\n\nEscúchalo aquí: ${song.url}\n\n#TheBeatSeries #DiosMasGym`);
    formData.append("parse_mode", "Markdown");

    const telRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    return new Response(JSON.stringify({ 
      success: true, 
      song: song.name, 
      mode: "Master-4K-Legacy-Restored" 
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_system: error.message }), { status: 500 });
  }
}
