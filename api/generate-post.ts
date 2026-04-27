import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key en Vercel.' });

    const payload = {
        contents: [{ parts: [{ text: `Crea un post para: ${content}` }] }]
    };
    
    // Lista de modelos de máxima estabilidad
    const models = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastErrorDetails = null;

    for (const model of models) {
        try {
            // Usamos la cabecera x-goog-api-key para mayor seguridad y compatibilidad
            const response = await fetch(`https://generativelanguage.googleapis.com/${model.v}/models/${model.m}:generateContent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            }
            lastErrorDetails = data.error;
        } catch (e: any) {
            lastErrorDetails = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "Diagnóstico v1.3.5", 
        google_error: lastErrorDetails,
        tip: "Asegúrate de que la clave se creó en un PROYECTO NUEVO en AI Studio."
    });
}
