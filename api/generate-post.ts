import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { content } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'Falta la API Key de Gemini en el servidor.' });
    }

    if (!content) {
        return res.status(400).json({ error: 'El contenido es requerido.' });
    }

    const prompt = `
        Actúa como un experto en marketing digital y estratega de redes sociales viral. 
        Tu objetivo es crear un post para Instagram/TikTok/Facebook que se vuelva viral.
        
        El contenido base es la siguiente letra o título de canción:
        "${content}"
        
        Instrucciones:
        1. Escribe un copy extremadamente llamativo y emocional que conecte con la audiencia.
        2. Usa un tono motivador, espiritual o de superación personal (según el contexto de la letra).
        3. Incluye una "llamada a la acción" (CTA) efectiva.
        4. Agrega los mejores hashtags para que el algoritmo lo posicione (mezcla hashtags populares y específicos).
        5. Usa emojis de forma estratégica para mejorar la legibilidad y el impacto visual.
        6. El formato debe estar listo para copiar y pegar.
        
        Responde solo con el texto del post, sin explicaciones adicionales.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const resultText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: resultText });
    } catch (error: any) {
        console.error('Error in generate-post API:', error);
        return res.status(500).json({ error: error.message || 'Error interno al generar el post.' });
    }
}
