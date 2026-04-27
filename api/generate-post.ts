import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });

    // Intento directo y veloz
    const prompt = `Crea un post viral impactante para: ${content}`;
    
    // Solo 2 intentos para evitar timeouts en Vercel
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-1.5-flash' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seg de límite cada intento

            const response = await fetch(`https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            }
            lastError = data.error;
        } catch (e: any) {
            lastError = { message: e.message === 'The user aborted a request.' ? 'Tiempo de espera agotado' : e.message };
        }
    }

    return res.status(500).json({ 
        error: "Fallo de conexión rápida", 
        google_error: lastError,
        note: "Si el error es 404, prueba crear una clave nueva en un proyecto nuevo de Google AI Studio." 
    });
}
