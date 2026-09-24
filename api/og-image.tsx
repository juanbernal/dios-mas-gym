import React from 'react';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';

// Runtime Node (no edge) para poder convertir el PNG a JPEG con sharp.
// El PNG pesaba 400-500 KB y WhatsApp no muestra la vista previa si la imagen
// pasa de ~300 KB; en JPEG queda alrededor de 50 KB.

const BASE = 'https://www.diosmasgym.com';
const FALLBACK_COVER = `${BASE}/icon-512.png`;

// Descarga la portada y la deja en 360x360 como data URL. Si maxresdefault de
// YouTube no existe (pasa en videos viejos) prueba hqdefault; si todo falla usa el icono.
async function loadCover(raw: string): Promise<string> {
  const candidates: string[] = [];
  if (/^https?:\/\//.test(raw)) {
    candidates.push(raw);
    if (raw.includes('maxresdefault')) candidates.push(raw.replace('maxresdefault', 'hqdefault'));
  }
  candidates.push(FALLBACK_COVER);
  for (const url of candidates) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const input = Buffer.from(await r.arrayBuffer());
      const out = await sharp(input).resize(360, 360, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
      return `data:image/jpeg;base64,${out.toString('base64')}`;
    } catch { /* probar la siguiente */ }
  }
  return FALLBACK_COVER;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const q = (k: string) => { const v = req.query[k]; return (Array.isArray(v) ? v[0] : v) || ''; };
    const title = (q('title') || 'Dios Mas Gym').slice(0, 80);
    const artist = (q('artist') || 'El Arsenal de Fe').slice(0, 60);
    const type = q('type') || 'song';

    const cover = await loadCover(q('cover'));
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

    const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(jpeg.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400');
    return res.status(200).send(jpeg);
  } catch (err: any) {
    console.error('[og-image] Error:', err);
    // Mejor una imagen generica que un 500: asi WhatsApp/Facebook siguen mostrando algo
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.redirect(302, `${BASE}/icon-512.png`);
  }
}
