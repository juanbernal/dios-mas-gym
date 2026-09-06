import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.diosmasgym.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN no configurado en Vercel. Ve a Settings → Environment Variables.' });
    }

    // POST: iniciar separación de pistas
    if (req.method === 'POST') {
      let { audioUrl, model_name } = req.body as { audioUrl?: string; model_name?: string };
      if (!audioUrl) {
        return res.status(400).json({ error: 'audioUrl es requerido' });
      }

      // Validar modelo seleccionado: 'htdemucs' (4 stems) o 'htdemucs_6s' (6 stems)
      const selectedModel = (model_name === 'htdemucs_6s') ? 'htdemucs_6s' : 'htdemucs';

      // Si viene de tmpfiles.org, resolver el enlace de descarga directo real (WAV binario)
      // porque tmpfiles.org/dl/ID/name.wav ahora redirige a una página HTML con el botón de descarga
      if (audioUrl.includes('tmpfiles.org')) {
        try {
          const pageUrl = audioUrl.replace('/dl/', '/');
          const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const html = await pageRes.text();
          const match = html.match(/href=["'](https?:\/\/tmpfiles\.org\/dl\/[^"']+)["']/);
          if (match && match[1]) {
            audioUrl = match[1];
            console.log('[separate-audio] Enlace directo real resuelto:', audioUrl);
          }
        } catch (e) {
          console.warn('[separate-audio] No se pudo resolver enlace directo de tmpfiles:', e);
        }
      }

      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953', // cjwbw/demucs official latest
          input: {
            audio: audioUrl,
            model_name: selectedModel,
            clip_mode: 'rescale',   // Evita clipping y reduce picos de memoria en WAV
            shifts: 1,              // Evita Out Of Memory en audios largos o WAV pesados
            float32: false,         // Evita duplicar el uso de memoria RAM (2x)
            overlap: 0.25,
            output_format: 'wav',   // Genera salida en WAV puro
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[separate-audio] Replicate POST error:', data);
        return res.status(response.status).json({ error: data?.detail || 'Error al iniciar separación en Replicate' });
      }

      return res.status(200).json(data);
    }

    // GET: verificar estado de un prediction
    if (req.method === 'GET') {
      const id = req.query.id as string | undefined;
      if (!id) {
        return res.status(400).json({ error: 'id es requerido' });
      }

      const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[separate-audio] Replicate GET error:', data);
        return res.status(response.status).json({ error: data?.detail || 'Error consultando estado' });
      }

      // Limpiar output si terminó con éxito para eliminar campos nulos (ej: guitar o piano cuando se eligen 4 stems)
      if (data.status === 'succeeded' && data.output && typeof data.output === 'object') {
        const cleaned: Record<string, string> = {};
        for (const [key, val] of Object.entries(data.output)) {
          if (val && typeof val === 'string' && val.trim().startsWith('http')) {
            cleaned[key] = val.trim();
          }
        }
        data.output = cleaned;
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error: any) {
    console.error('[separate-audio] Error inesperado:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
