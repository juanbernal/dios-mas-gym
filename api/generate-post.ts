import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });

    // MODO ESCÁNER: Vamos a preguntar a Google qué modelos tiene esta clave
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();
        
        if (listData.error) {
            return res.status(500).json({ 
                error: "Error al listar modelos", 
                google_error: listData.error,
                key_prefix: apiKey.substring(0, 10)
            });
        }

        // Si tenemos la lista, buscamos uno que soporte generateContent
        const availableModels = listData.models || [];
        const supportedModel = availableModels.find((m: any) => m.supportedGenerationMethods.includes('generateContent'));

        if (!supportedModel) {
            return res.status(404).json({ 
                error: "No se encontraron modelos compatibles con este API Key.",
                available_list: availableModels.map((m: any) => m.name)
            });
        }

        // Intentamos generar contenido con el modelo que Google nos dijo que SÍ existe
        const promptText = `Crea un post viral para: ${content}`;
        const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${supportedModel.name}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const genData = await genResponse.json();
        if (genData.candidates) {
            return res.status(200).json({ 
                text: genData.candidates[0].content.parts[0].text,
                model_auto_detected: supportedModel.name 
            });
        }

        return res.status(500).json({ error: "Fallo en generación", details: genData });

    } catch (e: any) {
        return res.status(500).json({ error: "Error de red en el servidor", message: e.message });
    }
}
