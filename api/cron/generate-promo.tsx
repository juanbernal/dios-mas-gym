import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

// URLS DE LOS CATÁLOGOS (CSV de Google Sheets)
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
];

const MAKE_WEBHOOK = 'https://hook.us2.make.com/9jkc3se9ac5kragltqzru0tw0zppmwx4';

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

// Reutilizamos la lógica de parseo del CSV
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
    if (!line || line === '---') continue;

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

export default async function handler(req: NextRequest) {
  try {
    // 1. Cargar fuentes (Opcional, pero mejora mucho el diseño)
    const fontData = await fetch(
      new URL('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGkyMZhrib2Bg-4.woff', import.meta.url)
    ).then((res) => res.arrayBuffer());

    // 2. Cargar catálogos
    const results = await Promise.all(CSV_URLS.map(url => fetch(url).then(r => r.text())));
    const fullCatalog = results.flatMap(csv => parseMusicCSV(csv));
    
    if (fullCatalog.length === 0) throw new Error("Catalog is empty");

    // 3. Seleccionar canción, template y texto al azar
    const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const caption = catchyTexts[Math.floor(Math.random() * catchyTexts.length)];

    // Normalizar Artista
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    // 4. Generar Imagen con @vercel/og
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
             <img src={song.cover} alt="" style={{ width: '120%', height: '120%', objectFit: 'cover', filter: 'blur(80px) brightness(0.3)', opacity: 0.8 }} />
          </div>

          {/* Grano / Textura */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/asfalt-dark.png")' }} />

          {/* Marco Estilo "The Beat" */}
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
              boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${template.color}11`,
              position: 'relative',
            }}
          >
            {/* Esquinas Neon */}
            <div style={{ position: 'absolute', top: 30, left: 30, width: 40, height: 40, borderTop: `4px solid ${template.color}`, borderLeft: `4px solid ${template.color}`, borderTopLeftRadius: '10px' }} />
            <div style={{ position: 'absolute', bottom: 30, right: 30, width: 40, height: 40, borderBottom: `4px solid ${template.color}`, borderRight: `4px solid ${template.color}`, borderBottomRightRadius: '10px' }} />

            {/* Cover con Glow */}
            <div style={{ display: 'flex', boxShadow: `0 0 80px ${template.color}33`, borderRadius: '20px', overflow: 'hidden', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={song.cover} alt="" style={{ width: '450px', height: '450px', objectFit: 'cover' }} />
            </div>

            {/* Info de la obra */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: template.color, letterSpacing: '0.6em', marginBottom: '20px', textTransform: 'uppercase' }}>
                Recomendación Hoy
              </div>
              <div style={{ fontSize: 72, fontWeight: 900, color: 'white', marginBottom: '10px', textTransform: 'uppercase', maxWidth: '700px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {song.name}
              </div>
              <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: '60px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                {normalizedArtist}
              </div>

              {/* Plataformas UI */}
              <div style={{ display: 'flex', gap: '30px' }}>
                <div style={{ padding: '12px 30px', backgroundColor: 'white', color: 'black', borderRadius: '50px', fontSize: 14, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Escuchar Ahora
                </div>
                <div style={{ padding: '12px 30px', border: '2px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50px', fontSize: 14, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Ver Video
                </div>
              </div>
            </div>
          </div>

          {/* Watermark UI */}
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
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    );

    // 5. Convertir ImageResponse a Buffer
    const imageData = await imageResponse.arrayBuffer();
    
    // 6. Enviar a TELEGRAM directamente
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables");
    }

    const fullCaption = `${caption}\n\n🎧 *${song.name}* - ${normalizedArtist}\n✨ Escúchalo aquí: ${song.url}\n\n#DiosMasGym #Juan614 #PromoDiaria`;

    const formData = new FormData();
    const file = new Blob([imageData], { type: 'image/png' });
    formData.append("chat_id", CHAT_ID);
    formData.append("photo", file, "promo.png");
    formData.append("caption", fullCaption);
    formData.append("parse_mode", "Markdown");

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    if (!telegramRes.ok) {
      const errorData = await telegramRes.json();
      throw new Error(`Telegram API Error: ${JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sentTo: "Telegram",
      song: song.name, 
      artist: normalizedArtist
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
