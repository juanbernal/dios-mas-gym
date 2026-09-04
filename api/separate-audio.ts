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
      const { audioUrl } = req.body as { audioUrl?: string };
      if (!audioUrl) {
        return res.status(400).json({ error: 'audioUrl es requerido' });
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
            model_name: 'htdemucs_6s',
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

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error: any) {
    console.error('[separate-audio] Error inesperado:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
