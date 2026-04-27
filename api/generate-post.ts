import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });

    const promptText = `Crea un post viral para: ${content}. Usa emojis y hashtags.`;
    
    // MODELOS QUE SABEMOS QUE TU CLAVE RECONOCE (v1.3.1 Recover)
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();
            
            // Si el éxito es total
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            }
            
            // Si es saturación (503), intentamos el siguiente o devolvemos error amigable
            if (data.error?.code === 503) {
                lastError = { code: 503, message: "Google está saturado (503). Inténtalo de nuevo en 5 segundos, tu clave es CORRECTA." };
                continue;
            }

            lastError = data.error;
        } catch (e: any) {
            lastError = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "Estado de Conexión", 
        google_error: lastError,
        note: "Si el error es 503, es BUENA SEÑAL: tu clave funciona pero Google está lleno. Solo reintenta."
    });
}
