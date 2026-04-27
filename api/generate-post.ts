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
        5. HASHTAGS: Bloque de etiquetas premium.
        
        REGLAS DE ORO:
        - Usa emojis que refuercen el mensaje.
        - Mantén el tono solicitado rigurosamente.
        - Escribe en español latino de forma natural y poderosa.
        
        Responde DIRECTAMENTE con el texto final del post, listo para ser copiado.
    `;

    try {
        // Intentamos con gemini-1.5-flash en v1
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
            console.warn("Gemini 1.5 Flash failed, trying Gemini Pro (v1)...");
            // Fallback a gemini-pro que es el modelo más estable en v1
            const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
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
                // Si todo falla, devolvemos el error amigable
                throw new Error(`Error de API: ${fallbackData.error.message}`);
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
