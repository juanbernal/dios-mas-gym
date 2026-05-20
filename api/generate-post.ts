import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { content } = req.body;
    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // Modelo estable Gemini 1.5 Flash
    const modelName = "gemini-1.5-flash";
    
    let promptText = `Escribe contenido espiritual y reflexivo para un blog cristiano. NO uses markdown ni formato especial. NO incluyas hashtags, tips de marketing ni emojis en exceso. Solo texto plano con párrafos separados por saltos de línea. Contenido: ${content}`;

    try {
        if (content && content.trim().startsWith('{')) {
            const parsed = JSON.parse(content);
            const { input, platform, goal, tone, lyrics } = parsed;
            
            promptText = `Eres un experto estratega de marketing musical cristiano y creador de contenido viral para redes sociales.
Tu tarea es generar contenido promocional extraordinario y de alta conversión para la canción descrita abajo.

INFORMACIÓN DE LA CANCIÓN / PROMO:
${input}

${lyrics ? `LETRA DE LA CANCIÓN / TEMA EMOCIONAL:\n${lyrics}` : ''}

PARÁMETROS DE LA CAMPAÑA:
- Plataforma objetivo: ${platform || 'Instagram/TikTok'}
- Objetivo de la publicación: ${goal || 'Inspirar y Viralizar'}
- Tono y Estilo: ${tone || 'Épico y Motivador'}

INSTRUCCIONES DE RESPUESTA:
Por favor, genera una estructura de publicación dividida en las siguientes secciones claramente identificadas, usando un lenguaje de alta vibración, emocionante y centrado en la fe:

1. 🌟 ARTÍCULO DE BLOG (Blogger / Prensa):
Un texto de 3-4 párrafos, reflexivo y profundamente inspirador que narre el mensaje de fe, esfuerzo y fe detrás de la canción (e incluya el mensaje de la letra de la canción si está provista). Debe motivar a los lectores a escuchar la canción y reflexionar.

2. 📱 PUBLICACIÓN PARA REDES SOCIALES (${platform || 'Instagram/TikTok'}):
Un copy muy directo, impactante y magnético. Utiliza ganchos emocionales en la primera línea, micro-párrafos limpios y emojis estratégicos.

3. 🏷️ ESTRATEGIA DE HASHTAGS EXCLUSIVOS:
Genera un bloque de 10-15 hashtags altamente personalizados y relevantes basados STRICTAMENTE en el título de la canción, el artista, y los temas específicos de la letra de la canción provista (ej: #NombreDeCancion, #NombreDeArtista, y las palabras clave líricas/emocionales). ¡Evita hashtags genéricos aburridos!

Entrega el resultado formateado de manera elegante y legible con separadores limpios.`;
        }
    } catch (e) {
        // Fallback to default blog prompt if JSON parsing fails
    }

    try {
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

        // Si falla, intentamos gemini-2.5-flash-preview como backup
        if (data.error?.code === 404 || data.error?.code === 400) {
             const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
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
            error: "Error con Gemini API", 
            google_error: e.message,
            tip: "Verifica que GEMINI_API_KEY esté configurada en Vercel."
        });
    }
}
