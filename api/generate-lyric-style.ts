import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // MODELO ESTABLE
    const modelName = "gemini-2.0-flash-exp"; // Usamos el modelo que sabemos que le funciona a tu API key
    
    const promptText = `Actúa como un Director de Arte experto en edición de video musical para TikTok y YouTube.
    Tu objetivo es generar una configuración visual única, creativa y espectacular para un "Lyric Video" (Video de Letras).
    Debes devolver UNICAMENTE un objeto JSON válido con las siguientes claves y valores posibles:
    
    - "visualizerStyle": elige uno de ['bars', 'wave', 'pulse', 'dots', 'circular', 'hidden']
    - "vibe": elige uno de ['cinematic', 'modern', 'party', 'retro', 'glitch']
    - "emojiPack": elige uno de ['none', 'fire', 'love', 'stars', 'music']
    - "animationStyle": elige uno de ['fade', 'slide', 'zoom']
    - "sensitivity": un número decimal entre 0.5 y 3.0 (ej. 1.2, 2.5)
    - "fontSize": un número entero entre 30 y 100
    - "textColor": un color en formato HEX (ej. "#ffffff", "#ff00cc", "#00ffcc", "#ffcc00", "#c5a059", "#ff3333", etc.)
    - "glowToggle": true o false
    - "leakToggle": true o false
    - "vhsMode": true o false (úsalo rara vez, solo si pega con retro/glitch)

    La combinación debe tener sentido estético. Por ejemplo, si es "retro", un texto amarillo o naranja con "vhsMode" en true. Si es "party", usa colores vibrantes de neón y sensibilidad de bajo alta.
    Asegúrate de que la salida sea estrictamente JSON y nada más. No incluyas backticks de markdown.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    temperature: 0.9,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const jsonText = data.candidates[0].content.parts[0].text;
            try {
                const config = JSON.parse(jsonText);
                return res.status(200).json(config);
            } catch (e) {
                return res.status(500).json({ error: 'La IA no devolvió un JSON válido.' });
            }
        }

        // Si falla por el modelo, intentamos con gemini-3-flash-preview
        if (data.error?.code === 404) {
             const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
            const backupData = await backupResponse.json();
             if (backupData.candidates) {
                return res.status(200).json(JSON.parse(backupData.candidates[0].content.parts[0].text));
            }
            throw new Error(backupData.error?.message || data.error.message);
        }

        throw new Error(data.error?.message || "Error desconocido en la generación");
    } catch (e: any) {
        return res.status(500).json({ 
            error: "Error con Gemini", 
            google_error: e.message
        });
    }
}
