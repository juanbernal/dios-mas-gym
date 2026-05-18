import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { title, artist, lyrics } = req.body || {};

    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');

    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // MODELO ESTABLE
    const modelName = "gemini-2.0-flash-exp"; // Usamos el modelo que sabemos que le funciona a tu API key
    
    const promptText = `Actúa como un Director de Arte y Director de Videos Musicales de élite mundial (estilo directores ganadores del Grammy como David Fincher, Spike Jonze, Michel Gondry).
    Se te proporcionará la letra de una canción, el título y el artista.
    Tu primer paso es analizar a fondo el significado de la letra y determinar de forma autónoma el mejor estilo o género narrativo visual (como 'Narrativa de Superación y Esfuerzo', 'Metáfora Conceptual y Espiritual', 'Historia Dramática Urbana', 'Épico Gótico y Viaje del Héroe', o cualquier otro estilo narrativo/estético altamente descriptivo que se invente para que encaje al 100% con la letra).
    
    Tu objetivo es crear una propuesta visual y artística cinematográfica insuperable para el video musical de este tema, diseñada para impactar visualmente, y estructurar un guion técnico escena por escena optimizado al 100% para generadores de video de IA modernos (como Sora, Runway Gen-3, Luma Dream Machine, Kling, Pika).

    Información de la Canción:
    - Título: ${title || 'Sin Título'}
    - Artista: ${artist || 'Desconocido'}
    - Letra de la Canción:
    """
    ${lyrics || 'Letra no proporcionada.'}
    """

    Debes analizar a fondo el significado de la letra y su mensaje espiritual o motivacional (Dios Mas Gym), diseñando una metáfora visual coherente e impactante.
    Debes devolver ÚNICAMENTE un objeto JSON válido con las siguientes claves y estructura, sin envolverlo en bloques de código markdown (\`\`\`json ... \`\`\`):

    {
      "songAnalysis": "Un párrafo analizando el trasfondo emocional, lírico y el mensaje central de la canción.",
      "suggestedStyle": "El estilo/género narrativo visual de la historia que has determinado autónomamente (ej. 'Narrativa de Superación y Esfuerzo', 'Metáfora Conceptual y Espiritual', 'Historia Dramática Urbana', etc. según corresponda).",
      "mainConcept": "La idea artística o metáfora visual central del video. Por ejemplo, la batalla interna de un corredor en un desierto neblinoso que representa la superación espiritual.",
      "colorPalette": {
        "description": "Descripción general de la iluminación, contraste y paleta de colores del video (ej. HSL apagado, neones dorados y sombras de medianoche).",
        "colors": ["#C5A059", "#000000", "#1A2536", "#F3F4F6"]
      },
      "suggestedVibe": "E.g. Cinematic Neo-Noir, Dark Epic Gothic, Modern Cyber-Vibe, Minimalist Golden Light",
      "masterPrompt": "Un prompt maestro global de estilo visual y dirección de arte EN INGLÉS para IAs de video que represente e introduzca la atmósfera visual de la canción. PROHIBIDO copiar los ejemplos por defecto o usar siempre el mismo texto genérico (como 'moves from industrial to natural landscapes' o 'gold dust'). El prompt debe ser 100% PERSONALIZADO y derivarse directamente de la letra de la canción para servir como una intro espectacular del video musical. Por ejemplo: si la letra es de disciplina física/gimnasio, detalla sombras duras, neones, grano de película y texturas de sudor; si la letra es celestial/fe, detalla iluminación celestial volumétrica, niebla y rayos de luz dorada; si es una batalla interna, detalla elementos simbólicos acordes. Incluye especificaciones técnicas profesionales como 'shot on Arri Alexa LF, anamorphic 35mm lens, cinematic color grading, slow-motion 60fps, high dynamic range' pero adaptándolas al concepto de la canción.",
      "scenes": [
        {
          "timeframe": "Rango aproximado de tiempo (ej. 0:00 - 0:25 o Intro)",
          "lyricsSnippet": "Frase o fragmento clave de la letra que encaja con esta escena.",
          "visualDescription": "Descripción detallada de la acción, el personaje, la iluminación y el simbolismo visual en ESPAÑOL.",
          "aiPrompt": "El prompt técnico específico y ultra-descriptivo EN INGLÉS optimizado para Runway Gen-3 o Sora. Debe detallar la toma (ej. 'Close-up shot of...'), el movimiento de cámara (ej. 'slow dolly-in...'), la iluminación (ej. 'dramatic rim lighting...'), el entorno y la textura, asegurando que sea 100% fiel a la letra y al concepto."
        }
      ]
    }

    Asegúrate de que:
    1. Las descripciones e ideas visuales sean altamente artísticas y creativas, no genéricas. Que transmitan el poder de la superación, la disciplina física, mental y la fe.
    2. El \"masterPrompt\" sea una introducción atmosférica cinematográfica espectacular diseñada y personalizada exactamente para reflejar el alma lírica y el mensaje de esta canción en particular. No utilices la plantilla predeterminada de desiertos/paisajes a menos que la letra hable explícitamente de ello.
    3. Haya al menos 4 o 5 escenas detalladas que cubran toda la canción de principio a fin (Intro, Versos, Coros, Outro).
    4. Los campos de prompts de IA (\"masterPrompt\" y \"aiPrompt\" de cada escena) estén obligatoriamente EN INGLÉS, ya que las IAs generadoras de video operan infinitamente mejor en este idioma. Deben ser de calidad cinematográfica profesional de Hollywood.
    5. La salida sea estrictamente un JSON válido. No incluyas explicaciones previas ni posteriores al JSON.`;

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
                return res.status(500).json({ error: 'La IA no devolvió un JSON válido.', rawText: jsonText });
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
