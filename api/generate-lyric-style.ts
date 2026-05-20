import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { lyrics } = req.body || {};

    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // Modelo estable Gemini 1.5 Flash
    const modelName = "gemini-1.5-flash";
    
    const promptText = `Actúa como un Director de Arte experto en edición de video musical para TikTok y YouTube.
    Se te proporcionará la letra de una canción. Tu objetivo es analizar la vibra, el sentimiento y el ritmo de esa letra, y generar una configuración visual única, creativa y espectacular que encaje perfectamente con ese tema.
    
    Letra de la canción:
    """
    ${lyrics ? lyrics : 'Letra no proporcionada. Usa tu creatividad libremente.'}
    """
    
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
    - "imagePrompt": Un prompt muy descriptivo y detallado EN INGLÉS para un generador de imágenes de IA. Este prompt debe describir una escena visual épica, cinemática y de alta calidad que sirva como fondo perfecto para la canción. Por ejemplo: "A cinematic neon cyberpunk city at night with glowing rain, hyperrealistic, 8k, moody atmosphere".

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

        if (data.error?.code === 404 || data.error?.code === 400) {
             const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
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
