import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, ''); // Limpiar posibles comillas

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'Falta la API Key de Gemini. Asegúrate de haberla configurado en Vercel como GEMINI_API_KEY.' });
    }

    if (!content) {
        return res.status(400).json({ error: 'El contexto es requerido.' });
    }

    const prompt = `Escribe un post viral para redes sociales basado en: ${content}. Incluye emojis y hashtags.`;

    // Intentaremos todos los modelos posibles conocidos
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1beta', m: 'gemini-1.5-flash-latest' },
        { v: 'v1beta', m: 'gemini-1.5-pro' },
        { v: 'v1', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' },
        { v: 'v1', m: 'gemini-1.0-pro' }
    ];

    let lastErrorMessage = '';

    for (const config of configs) {
        try {
            const url = `https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ 
                    text: data.candidates[0].content.parts[0].text,
                    model_used: `${config.m} (${config.v})`
                });
            } else if (data.error) {
                lastErrorMessage = `${config.m} (${config.v}): ${data.error.message}`;
            }
        } catch (e: any) {
            lastErrorMessage = e.message;
        }
    }

    return res.status(500).json({ 
        error: "No se pudo conectar con los modelos de Gemini.",
        details: lastErrorMessage,
        tip: "Verifica que la API Key esté activa en Google AI Studio y que la cuenta tenga acceso el modelo 1.5 Flash."
    });
}
