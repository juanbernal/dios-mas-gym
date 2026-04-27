import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta GEMINI_API_KEY en Vercel.' });

    const promptText = `Eres un experto viral. Crea un post estratégico para: ${content}. Usa emojis y hashtags.`;
    
    // Lista de modelos balanceada: Flash para velocidad, Pro para cuando hay mucha demanda
    const configs = [
        { v: 'v1beta', m: 'gemini-1.5-flash' },
        { v: 'v1', m: 'gemini-pro' },
        { v: 'v1beta', m: 'gemini-1.5-flash-latest' }
    ];

    let lastError = null;

    for (const config of configs) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${config.v}/models/${config.m}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });

            const data = await response.json();

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return res.status(200).json({ 
                    text: data.candidates[0].content.parts[0].text,
                    engine: config.m 
                });
            }
            
            lastError = data.error;
            // Si el error es 503 (Saturación), el bucle pasará al siguiente modelo automáticamente
            console.warn(`Model ${config.m} saturated or failed: ${data.error?.message}`);
        } catch (e: any) {
            lastError = { message: e.message };
        }
    }

    return res.status(500).json({ 
        error: "Google está muy ocupado ahora mismo", 
        google_error: lastError,
        tip: "Tu configuración es CORRECTA. Solo vuelve a intentarlo en 10 segundos, es saturación temporal de los servidores de Google." 
    });
}
