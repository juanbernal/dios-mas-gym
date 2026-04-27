import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la clave en Vercel.' });

    const promptText = `Crea un post viral para: ${content}`;
    
    // Lista ampliada con el nuevo modelo 8B
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash-8b' },
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}&t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            }
            lastError = data.error;
        } catch (e: any) {
            lastError = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "Diagnóstico v1.3.3", 
        key_identity: apiKey.substring(0, 10) + "...", // Verificador de identidad
        google_error: lastError,
        tip: "Si el ID de la clave es el antiguo, haz Redeploy en Vercel."
    });
}
