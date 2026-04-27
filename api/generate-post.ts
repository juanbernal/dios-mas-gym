import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content } = req.body;
    let apiKey = process.env.GEMINI_API_KEY || "";
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'La API Key no está configurada en Vercel.' });
    }

    const prompt = `Crea un post viral para: ${content}`;

    const models = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' }
    ];

    let lastRawError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/${model.v}/models/${model.m}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
            } 
            
            lastRawError = data.error;
        } catch (e: any) {
            lastRawError = { message: e.message };
        }
    }

    // Diagnostic information for the user
    return res.status(500).json({ 
        error: "Diagnóstico de API",
        google_error: lastRawError,
        check: {
            key_length: apiKey.length,
            key_start: apiKey.substring(0, 7) + "...",
            env_var_name: "GEMINI_API_KEY"
        },
        instruction: "Si ves un error 403, tu API Key no tiene permisos. Si ves un error 400, el formato es inválido. Genera una nueva clave en https://aistudio.google.com/app/apikey"
    });
}
