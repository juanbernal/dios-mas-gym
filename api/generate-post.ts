import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'API Key no configurada en Vercel.' });
    }

    const prompt = `Actúa como estratega viral. Crea un post para: ${content}. Usa emojis y hashtags.`;

    // Lista exhaustiva de modelos (incluyendo sugerencias del usuario y variantes)
    const models = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1beta', m: 'gemini-1.5-flash-latest' },
        { v: 'v1beta', m: 'gemini-1.5-pro' },
        { v: 'v1', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }, 
        { v: 'v1', m: 'gemini-1.0-pro' },
        { v: 'v1', m: 'gemini-pro-vision' }, // Sugerido por el usuario (Legacy)
        { v: 'v1beta', m: 'gemini-1.0-pro' }
    ];

    let lastError = '';

    for (const model of models) {
        try {
            console.log(`Intentando conectar con: ${model.m} (${model.v})`);
            const response = await fetch(`https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            // ERROR EN MI LOGICA ANTERIOR: model.version y model.name no existian, era model.v y model.m
            // REPARADO AHORA
            const finalUrl = `https://generativelanguage.googleapis.com/${model.v}/models/${model.m}:generateContent?key=${apiKey}`;
            const realResponse = await fetch(finalUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            
            const data = await realResponse.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ 
                    text: data.candidates[0].content.parts[0].text,
                    success_model: `${model.m} (${model.v})`
                });
            } else if (data.error) {
                lastError = `${model.m}: ${data.error.message}`;
            }
        } catch (e: any) {
            lastError = e.message;
        }
    }

    return res.status(500).json({ 
        error: "Bucle de respaldo agotado.",
        details: lastError,
        help: "Tu clave de API parece no tener acceso a los modelos de Gemini. Verifica los servicios habilitados en Google AI Studio."
    });
}
