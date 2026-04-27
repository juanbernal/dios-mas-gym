import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY.' });

    const promptText = `Escribe un post viral para: ${content}. Emojis y hashtags incluidos.`;
    
    // Configuraciones Anti-Caché y Multiversión
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            // Añadimos un parámetro 't' para evitar el caché de Vercel/Google
            const timestamp = Date.now();
            const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}&t=${timestamp}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            }
            
            lastError = data.error;
            if (data.error?.code === 503) break; // Si está ocupado, paramos para que el usuario reintente
        } catch (e: any) {
            lastError = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "Diagnóstico Final", 
        google_error: lastError,
        note: "Si el error persiste, la clave de API actual tiene un problema de permisos en Google Studio."
    });
}
