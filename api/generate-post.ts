import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });

    const promptText = `Eres un experto viral. Crea un post para: ${content}. Usa emojis y hashtags.`;
    
    // Lista de modelos limpia y sin parámetros extra en la URL
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            // URL LIMPIA sin parámetros extra que puedan causar 404
            const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
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
        error: "Final Trace v1.3.4", 
        key_id: apiKey.substring(0, 8),
        google_error: lastError,
        tip: "Si el error es 404 con URL limpia, verifica que Gemini esté disponible en tu país."
    });
}
