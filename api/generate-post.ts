import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });
    if (!content) return res.status(400).json({ error: 'Falta contenido.' });

    const promptText = `Eres un experto viral. Crea un post para: ${content}. Usa emojis y hashtags.`;
    
    // El orden de estos modelos es crítico basado en el error 404 previo
    const models = [
        { v: 'v1beta', m: 'gemini-1.5-flash-latest' },
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastErrorDetails = null;

    for (const model of models) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${model.v}/models/${model.m}:generateContent?key=${apiKey}`, {
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
            lastErrorDetails = data.error;
        } catch (e: any) {
            lastErrorDetails = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "ERROR 404 PERSISTENTE",
        google_error: lastErrorDetails,
        solution: "Tu API Key actual no encuentra modelos disponibles. Por favor, genera UNA NUEVA clave en https://aistudio.google.com/app/apikey y actualízala en Vercel."
    });
}
