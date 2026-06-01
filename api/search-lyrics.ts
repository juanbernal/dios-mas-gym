import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, artist } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Falta el nombre de la canción.' });

    let apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, '');
    if (!apiKey) return res.status(500).json({ error: 'Falta la API Key.' });

    // Implementación local directa de verifyAdminPassword para evitar problemas de resolución de módulos en Vercel
    const commonVerify = (req: any): boolean => {
        const ENV_KEY_NAME = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN')) || 'ADMIN_PASSWORD');
        const MASTER_KEY = (process.env[ENV_KEY_NAME] || "").trim().replace(/^["']|["']$/g, '');
        
        if (!MASTER_KEY) return false;

        let providedPassword = '';
        let authHeader = '';

        if (typeof req.headers?.get === 'function') {
            providedPassword = req.headers.get('x-admin-password') || '';
            authHeader = req.headers.get('authorization') || '';
        } else if (req.headers) {
            providedPassword = (req.headers['x-admin-password'] as string) || '';
            authHeader = (req.headers['authorization'] as string) || '';
        }

        const tCompare = (a: string, b: string): boolean => {
            const strA = String(a).trim();
            const strB = String(b).trim();
            try {
                const crypto = require('crypto');
                const hashA = crypto.createHash('sha256').update(strA).digest();
                const hashB = crypto.createHash('sha256').update(strB).digest();
                return crypto.timingSafeEqual(hashA, hashB);
            } catch (e) {
                return false;
            }
        };

        if (tCompare(providedPassword, MASTER_KEY)) return true;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (tCompare(token, MASTER_KEY)) return true;
        }

        return false;
    };

    if (!commonVerify(req)) {
        return res.status(401).json({ error: 'Acceso denegado: Se requiere autenticación de administrador.' });
    }

    // Modelo estable (con soporte para Google Search grounding)
    const modelName = "gemini-2.5-flash";
    
    // We explicitly enable Google Search grounding so Gemini can search the live web for the lyrics!
    const promptText = `Busca en internet la letra exacta y oficial de la canción "${name}" del artista "${artist || 'Dios Mas Gym'}". 
Devuelve ÚNICAMENTE la letra de la canción organizada en estrofas. 
NO incluyas introducciones, ni comentarios, ni explicaciones, ni notas de copyright. Solo la letra limpia.
Si no puedes encontrar la letra exacta bajo ninguna circunstancia, responde únicamente con la palabra: LETRA_NO_ENCONTRADA`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                tools: [{ googleSearch: {} }] // Enable Google Search Grounding tool!
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const lyricsResult = data.candidates[0].content.parts[0].text.trim();
            return res.status(200).json({ lyrics: lyricsResult });
        }

        if (data.error?.code === 404 || data.error?.code === 400) {
             const backupResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    tools: [{ googleSearch: {} }]
                })
            });
            const backupData = await backupResponse.json();
            if (backupData.candidates) {
                const lyricsResult = backupData.candidates[0].content.parts[0].text.trim();
                return res.status(200).json({ lyrics: lyricsResult });
            }
            throw new Error(backupData.error?.message || data.error.message);
        }

        throw new Error(data.error?.message || "No se pudo recuperar la letra.");

    } catch (e: any) {
        return res.status(500).json({ 
            error: "Error al buscar la letra", 
            details: e.message 
        });
    }
}
