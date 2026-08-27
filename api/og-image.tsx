import React from 'react';
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

const BASE = 'https://www.diosmasgym.com';

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Dios Mas Gym';
    const artist = searchParams.get('artist') || 'El Arsenal de Fe';
    const coverRaw = searchParams.get('cover') || '';
    const type = searchParams.get('type') || 'song';

    // Only allow absolute http/https cover URLs to avoid SSRF with relative paths
    const cover = coverRaw.startsWith('http') ? coverRaw : `${BASE}/icon-512.png`;
    const logoUrl = `${BASE}/logo-diosmasgym.png`;

    return new ImageResponse(
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
  } catch (err: any) {
    console.error('[og-image] Error:', err);
    return new Response('Error generating image', { status: 500 });
  }
}
