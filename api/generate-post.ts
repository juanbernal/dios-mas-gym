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
        return res.status(400).json({ error: 'El contexto es requerido.' });
    }

    const prompt = `
        Actúa como un estratega de contenido viral de élite y copywriter experto en psicología de audiencias. 
        Tu objetivo es crear una publicación de impacto masivo utilizando el contexto proporcionado.
        
        CONTEXTO DETALLADO:
        ${content}
        
        ESTRUCTURA DEL POST:
        1. GANCHO (Hook): Una primera frase demoledora que detenga el scroll.
        2. CUERPO: Texto emocional, rítmico y con autoridad. Usa saltos de línea estratégicos.
        3. VALOR/REFLEXIÓN: Una enseñanza o pensamiento poderoso basado en el contenido.
        4. CTA (Llamada a la acción): Instrucción clara para comentar, compartir o guardar.
        5. HASHTAGS: Bloque de etiquetas premium (mezcla entre 500k-1M posts y nicho específico).
        
        REGLAS DE ORO:
        - Usa emojis que refuercen el mensaje (no de relleno).
        - Mantén el tono solicitado rigurosamente.
        - Si el contenido es una letra de canción, destaca los versos más fuertes.
        - Escribe en español latino de forma natural y poderosa.
        
        Responde DIRECTAMENTE con el texto final del post, listo para ser copiado.
    `;

    try {
        // Intentamos con la URL de producción estable v1
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            // Si v1 falla, intentamos con v1beta y el nombre completo del modelo
            console.warn("v1 failed, trying v1beta...");
            const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.error) {
                throw new Error(fallbackData.error.message || 'Error en la API de Gemini');
            }
            
            const resultText = fallbackData.candidates[0].content.parts[0].text;
            return res.status(200).json({ text: resultText });
        }

        const resultText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ text: resultText });
    } catch (error: any) {
        console.error('Error in generate-post API:', error);
        return res.status(500).json({ error: error.message || 'Error interno al generar el post.' });
    }
}
