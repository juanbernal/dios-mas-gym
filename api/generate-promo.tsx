import React from 'react';
import { ImageResponse } from '@vercel/og';

// VERSIÓN MASTER 4K (Restaurada con Carga Blindada)
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

    // 1. CARGA DE FUENTES CON LINKS DE ALTA DISPONIBILIDAD (TTF)
    const fontResults = await Promise.allSettled([
      fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bebasneue/BebasNeue-Regular.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/static/Inter-Bold.ttf').then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/satisfy/Satisfy-Regular.ttf').then(r => r.arrayBuffer())
    ]);

    const bebasData = fontResults[0].status === 'fulfilled' ? fontResults[0].value : null;
    const interData = fontResults[1].status === 'fulfilled' ? fontResults[1].value : null;
    const satisfyData = fontResults[2].status === 'fulfilled' ? fontResults[2].value : null;

    // VALIDACIÓN CRÍTICA: Si el archivo empieza con "<!DO" es HTML (error) y no lo usamos
    const safeBebas = (bebasData && new Uint8Array(bebasData)[0] !== 60) ? bebasData : null;
    const safeInter = (interData && new Uint8Array(interData)[0] !== 60) ? interData : null;
    const safeSatisfy = (satisfyData && new Uint8Array(satisfyData)[0] !== 60) ? satisfyData : null;

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

    // 3. DISEÑO MASTER
    const fonts: any[] = [];
    if (safeBebas) fonts.push({ name: 'Bebas Neue', data: safeBebas, style: 'normal' });
    if (safeInter) fonts.push({ name: 'Inter', data: safeInter, style: 'normal' });
    if (safeSatisfy) fonts.push({ name: 'Satisfy', data: safeSatisfy, style: 'normal' });

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
          {/* Fondo Blur */}
          {bgUrl && (
            <div style={{ position: 'absolute', inset: -50, display: 'flex' }}>
              <img src={bgUrl} style={{ width: '110%', height: '110%', objectFit: 'cover', filter: 'blur(80px) brightness(1.02)' }} />
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex' }} />
          
          {/* Bokeh */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {[ {x:'15%',y:'20%',s:200,o:0.1}, {x:'75%',y:'10%',s:300,o:0.08}, {x:'88%',y:'55%',s:150,o:0.12}, {x:'5%',y:'70%',s:250,o:0.1} ].map((b,i) => (
              <div key={i} style={{ position:'absolute', left:b.x, top:b.y, width:b.s, height:b.s, borderRadius:'50%', background: `radial-gradient(circle, ${accent}${Math.floor(b.o*255).toString(16)} 0%, transparent 70%)`, filter: 'blur(30px)', display: 'flex' }} />
            ))}
          </div>

          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")', display: 'flex' }} />

          {/* Sidebar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
             <div style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 18, fontWeight: 900, letterSpacing: '0.4em', color: accent, opacity: 0.6, fontFamily: safeInter ? 'Inter' : 'sans-serif', textTransform: 'uppercase', display: 'flex' }}>
                DIOSMASGYM RECORDS · PURO CHIHUAHUA · 2026
             </div>
             <div style={{ position: 'absolute', right: 0, top: '10%', bottom: '10%', width: '1px', background: `linear-gradient(to bottom, transparent, ${accent}55, transparent)`, display: 'flex' }} />
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, padding: '80px', paddingLeft: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.5em', color: accent, fontFamily: safeInter ? 'Inter' : 'sans-serif', display: 'flex' }}>{artist.toUpperCase()} RECORDS</div>
                  <div style={{ fontSize: 12, letterSpacing: '0.8em', opacity: 0.4, fontWeight: 'bold', fontFamily: safeInter ? 'Inter' : 'sans-serif', display: 'flex' }}>REFLECTIONS // HUB PRO V5.1 // PURO CHIHUAHUA</div>
               </div>
               <div style={{ padding: "8px 24px", borderRadius: 4, border: `1px solid ${accent}66`, background: "rgba(0, 0, 0, 0.4)", color: accent, fontSize: 16, fontWeight: '900', letterSpacing: '0.2em', fontFamily: safeInter ? 'Inter' : 'sans-serif', display: 'flex' }}>
                  YA DISPONIBLE
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
               <div style={{ position: 'relative', padding: 10, background: `linear-gradient(135deg, ${accent} 0%, transparent 50%, ${accent} 100%)`, borderRadius: 8, boxShadow: "0 60px 150px rgba(0,0,0,0.8)", display: 'flex' }}>
                  <div style={{ width: 600, height: 600, overflow: 'hidden', borderRadius: 4, display: 'flex' }}>
                     <img src={bgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
               </div>
               <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 180, fontWeight: 900, fontFamily: safeBebas ? 'Bebas Neue' : 'sans-serif', color: 'white', lineHeight: 0.85, letterSpacing: '-2px', textShadow: `0 0 80px ${accent}88, 0 10px 40px rgba(0,0,0,0.8)`, textTransform: 'uppercase', display: 'flex', transform: safeBebas ? 'none' : 'scaleX(0.7)' }}>
                    {song.name}
                  </div>
                  <div style={{ marginTop: '30px', display: 'flex' }}>
                    <div style={{ fontSize: 34, color: accent, fontWeight: 900, letterSpacing: '0.3em', fontFamily: safeInter ? 'Inter' : 'sans-serif', background: 'rgba(0,0,0,0.5)', padding: '12px 60px', borderRadius: 100, border: `1px solid ${accent}44`, display: 'flex' }}>
                      {artist.toUpperCase()}
                    </div>
                  </div>
               </div>
            </div>
            <div style={{ flex: 1, display: 'flex' }} />
          </div>

          <div style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,1) 100%)`, borderTop: `2px solid ${accent}66`, padding: `40px 80px 40px 220px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
               <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.4em', color: accent, display: 'flex' }}>{template.label} EDITION</div>
               <div style={{ fontSize: 12, opacity: 0.3, color: 'white', display: 'flex' }}>© 2026 RECORDS HUB PRO</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
               <div style={{ padding: "10px 40px", borderRadius: 4, backgroundColor: accent, color: 'black', fontWeight: 900, fontSize: 20, letterSpacing: '0.2em', display: 'flex' }}>MUSICA.DIOSMASGYM.COM</div>
               <div style={{ fontSize: 48, color: 'white', fontFamily: safeSatisfy ? 'Satisfy' : 'sans-serif', opacity: 0.9, textShadow: '0 4px 10px rgba(0,0,0,0.5)', fontStyle: safeSatisfy ? 'normal' : 'italic', display: 'flex' }}>
                  {artist.toLowerCase().includes('juan') ? 'Puro Señor Jesucristo' : 'Puro Chihuahua, Saludos'}
               </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '0.2em', display: 'flex' }}>STUDIO AI</div>
               <div style={{ fontSize: 10, opacity: 0.3, letterSpacing: '0.1em', display: 'flex' }}>POWERED BY DIOSMASGYM</div>
            </div>
          </div>
        </div>
      ),
      { width: 1080, height: 1350, fonts: fonts.length > 0 ? fonts : undefined }
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    const formData = new FormData();
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", new Blob([arrayBuffer], { type: 'image/png' }), "promo.png");
    formData.append("caption", `🎧 *${song.name}* - ${artist}\n🔥 Estreno automático.\n\nEscúchalo aquí: ${song.url}`);
    formData.append("parse_mode", "Markdown");

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: formData });

    return new Response(JSON.stringify({ success: true, font_status: fonts.length > 0 ? "Master Fonts Loaded" : "Fallback Applied" }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error_system: error.message }), { status: 500 });
  }
}
