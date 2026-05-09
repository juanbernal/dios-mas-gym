import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        }

        const prompt = `Actúa como un Director de Arte experto en edición de video musical para TikTok y YouTube.
        Tu objetivo es generar una configuración visual única, creativa y espectacular para un "Lyric Video" (Video de Letras).
        Debes devolver UNICAMENTE un objeto JSON válido con las siguientes claves y valores posibles:
        
        - "visualizerStyle": elige uno de ['bars', 'wave', 'pulse', 'dots', 'circular', 'hidden']
        - "vibe": elige uno de ['cinematic', 'modern', 'party', 'retro', 'glitch']
        - "emojiPack": elige uno de ['none', 'fire', 'love', 'stars', 'music']
        - "animationStyle": elige uno de ['fade', 'slide', 'zoom']
        - "sensitivity": un número decimal entre 0.5 y 3.0 (ej. 1.2, 2.5)
        - "fontSize": un número entero entre 30 y 100
        - "textColor": un color en formato HEX (ej. "#ffffff", "#ff00cc", "#00ffcc", "#ffcc00", etc.)
        - "glowToggle": true o false
        - "leakToggle": true o false
        - "vhsMode": true o false (úsalo rara vez, solo si pega con retro/glitch)

        La combinación debe tener sentido estético. Por ejemplo, si es "retro", un texto amarillo o naranja con "vhsMode" en true. Si es "party", usa colores vibrantes de neón y sensibilidad de bajo alta.
        Asegúrate de que la salida sea estrictamente JSON y nada más. No incluyas backticks de markdown.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.9,
                responseMimeType: "application/json"
            }
        });

        const response = await result.response;
        const text = response.text();
        
        let config;
        try {
            config = JSON.parse(text);
        } catch (e) {
            console.error("Error parsing JSON from Gemini:", text);
            return res.status(500).json({ error: 'Invalid JSON returned from AI' });
        }

        return res.status(200).json(config);
    } catch (error: any) {
        console.error('Error generating lyric style:', error);
        return res.status(500).json({ error: error.message || 'Error generating lyric style' });
    }
}
