import React from 'react';
import { ImageResponse } from '@vercel/og';
import { Buffer } from 'node:buffer';
import { decode as decodePng } from 'fast-png';
// @ts-ignore - jpeg-js no trae tipos
import encodeJpeg from 'jpeg-js/lib/encoder.js';

export const config = {
  runtime: 'edge',
};

// El PNG pesaba 400-500 KB y WhatsApp no muestra la vista previa si la imagen
// pasa de ~300 KB; en JPEG queda alrededor de 50 KB. Se convierte con librerias
// de JavaScript puro porque sharp (nativo) hacia fallar la funcion en Vercel.
(globalThis as any).Buffer ??= Buffer;

const BASE = 'https://www.diosmasgym.com';
const FALLBACK_COVER = `${BASE}/icon-512.png`;

// Si maxresdefault de YouTube no existe (pasa en videos viejos) prueba
// hqdefault; si todo falla usa el icono.
async function pickCover(raw: string): Promise<string> {
  const candidates: string[] = [];
  if (/^https?:\/\//.test(raw)) {
    candidates.push(raw);
    if (raw.includes('maxresdefault')) candidates.push(raw.replace('maxresdefault', 'hqdefault'));
  }
  for (const url of candidates) {
    try {
      const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
      if (r.ok) return url;
    } catch { /* probar la siguiente */ }
  }
  return FALLBACK_COVER;
}

async function pngToJpeg(png: ArrayBuffer, quality = 85): Promise<Uint8Array> {
  const img = decodePng(new Uint8Array(png));
  const { width, height, channels } = img;
  const src = img.data as Uint8Array;
  // jpeg-js espera RGBA de 8 bits
  let rgba: Uint8Array;
  if (channels === 4) rgba = src;
  else {
    rgba = new Uint8Array(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += channels) {
      rgba[i * 4] = src[j];
      rgba[i * 4 + 1] = src[j + (channels >= 3 ? 1 : 0)];
      rgba[i * 4 + 2] = src[j + (channels >= 3 ? 2 : 0)];
      rgba[i * 4 + 3] = 255;
    }
  }
  const out = encodeJpeg({ data: rgba, width, height }, quality);
  return new Uint8Array(out.data);
}

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || 'Dios Mas Gym').slice(0, 80);
    const artist = (searchParams.get('artist') || 'El Arsenal de Fe').slice(0, 60);
    const type = searchParams.get('type') || 'song';

    const cover = await pickCover(searchParams.get('cover') || '');
    const logoUrl = `${BASE}/logo-diosmasgym.png`;

    const png = new ImageResponse(
      React.createElement(
        'div',
        {
          style: {
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #05070a 0%, #071325 50%, #0b1f3a 100%)',
            fontFamily: 'sans-serif',
            position: 'relative',
            overflow: 'hidden',
          },
        },
        // Grid background
        React.createElement('div', {
          style: {
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'linear-gradient(rgba(37,99,168,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,168,0.07) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          },
        }),
        // Glow left
        React.createElement('div', {
          style: {
            position: 'absolute', top: '-100px', left: '-100px',
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(37,99,168,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          },
        }),
        // Glow right
        React.createElement('div', {
          style: {
            position: 'absolute', bottom: '-80px', right: '-80px',
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          },
        }),
        // Album art
        React.createElement('div', {
          style: {
            width: '360px', height: '360px', margin: '0 60px 0 80px',
            borderRadius: '16px', overflow: 'hidden',
            border: '2px solid rgba(59,130,246,0.4)',
            boxShadow: '0 0 40px rgba(37,99,168,0.5)',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#071325',
          },
        },
          React.createElement('img', {
            src: cover, width: 360, height: 360,
            style: { objectFit: 'cover', width: '100%', height: '100%' },
          })
        ),
        // Text content (right side)
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '60px' } },
          // Logo + brand
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '24px' } },
            React.createElement('img', { src: logoUrl, width: 44, height: 44, style: { borderRadius: '8px', marginRight: '12px' } }),
            React.createElement('span', { style: { color: '#60a5fa', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' } }, 'DIOS MAS GYM')
          ),
          // Badge
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '20px' } },
            React.createElement('span', {
              style: { padding: '4px 14px', background: 'rgba(37,99,168,0.2)', border: '1px solid rgba(37,99,168,0.5)', borderRadius: '20px', color: '#93c5fd', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' },
            }, type === 'lyrics' ? String.fromCodePoint(0x271D) + ' Letra Oficial' : String.fromCodePoint(0x1F3B5) + ' Escuchar Ahora')
          ),
          // Song title
          React.createElement('div', {
            style: { color: '#ffffff', fontSize: title.length > 20 ? '42px' : '52px', fontWeight: 900, lineHeight: 1.1, marginBottom: '16px', textShadow: '0 2px 20px rgba(37,99,168,0.6)' },
          }, title),
          // Artist
          React.createElement('div', { style: { color: '#94a3b8', fontSize: '26px', fontWeight: 600, marginBottom: '32px' } }, artist),
          // Footer row
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
            React.createElement('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' } }),
            React.createElement('span', { style: { color: '#64748b', fontSize: '16px' } },
              type === 'lyrics' ? 'diosmasgym.com - Letras' : 'Spotify · YouTube · Apple Music · Deezer'
            )
          )
        )
      ),
      { width: 1200, height: 630 }
    );

    const jpeg = await pngToJpeg(await png.arrayBuffer());

    return new Response(jpeg, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[og-image] Error:', err);
    // Mejor una imagen generica que un 500: asi WhatsApp/Facebook siguen mostrando algo
    return Response.redirect(`${BASE}/icon-512.png`, 302);
  }
}
