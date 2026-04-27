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
        Esn un experto en redes sociales.
        
        CONTEXTO:
        ${content}
        
        Genera un post viral llamativo con emojis y hashtags.
    `;

    // Lista de modelos a intentar en orden de preferencia
    const modelsToTry = [
        { version: 'v1beta', name: 'gemini-1.5-flash' },
        { version: 'v1beta', name: 'gemini-1.5-flash-latest' },
        { version: 'v1', name: 'gemini-1.5-flash' },
        { version: 'v1', name: 'gemini-pro' }
    ];

    let lastError = '';

    for (const model of modelsToTry) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`, {
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
            
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                const resultText = data.candidates[0].content.parts[0].text;
                return res.status(200).json({ text: resultText });
            } else if (data.error) {
                lastError = data.error.message;
                console.warn(`Model ${model.name} (${model.version}) failed: ${lastError}`);
                continue; // Intentar el siguiente
            }
        } catch (error: any) {
            lastError = error.message;
            continue;
        }
    }

    return res.status(500).json({ 
        error: `No se pudo conectar con ningún modelo de IA. Último error: ${lastError}`,
        help: "Verifica que tu API Key sea de Google AI Studio y tenga permisos para Gemini."
    });
}
