import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // MODELO DETECTADO EN EL CÓDIGO DEL USUARIO
    const modelName = "gemini-3-flash-preview";
    
    const promptText = `Actúa como estratega viral. Crea un post para: ${content}. Usa emojis y hashtags.`;

    try {
        // Para modelos Preview/Experimental, usamos v1beta
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
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

        // Si falla el gemini-3, intentamos gemini-2.0-flash-exp por si acaso
        if (data.error?.code === 404) {
             const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });
            const backupData = await backupResponse.json();
             if (backupData.candidates) {
                return res.status(200).json({ text: backupData.candidates[0].content.parts[0].text });
            }
            throw new Error(backupData.error?.message || data.error.message);
        }

        throw new Error(data.error?.message || "Error desconocido en la generación");

    } catch (e: any) {
        return res.status(500).json({ 
            error: "Error con Gemini 3", 
            google_error: e.message,
            tip: "Tu cuenta está usando un modelo experimental. Si falla, intenta crear una clave en un proyecto normal."
        });
    }
}
