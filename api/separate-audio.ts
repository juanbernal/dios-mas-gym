import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';

const isBlobHost = (h: string) => h.endsWith('.public.blob.vercel-storage.com');

// Cada POST inicia una prediccion de pago en Replicate con tu token: solo el admin puede lanzarla.
function isAdminRequest(req: any): boolean {
  const keyName = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN_PASSWORD')) || 'ADMIN_PASSWORD');
  const master = (process.env[keyName] || '').trim().replace(/^["']|["']$/g, '');
  const provided = String(req.headers?.['x-admin-password'] || '').trim();
  if (!master) return !process.env.VERCEL; // en desarrollo local sin variable se permite
  const a = Buffer.from(provided);
  const b = Buffer.from(master);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://www.diosmasgym.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: 'No autorizado: falta la clave de administrador' });
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN no configurado en Vercel. Ve a Settings → Environment Variables.' });
    }

    // POST de Vercel Blob: el navegador pide un permiso de subida directa (solo audio, tamaño limitado)
    if (req.method === 'POST' && req.body && typeof req.body.type === 'string' && req.body.type.startsWith('blob.')) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(501).json({ error: 'Almacenamiento privado no configurado (falta BLOB_READ_WRITE_TOKEN)' });
      }
      const json = await handleUpload({
        body: req.body as HandleUploadBody,
        request: req as any,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: ['audio/*', 'application/octet-stream'],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => { /* nada que hacer: el audio se borra al terminar la separacion */ },
      });
      return res.status(200).json(json);
    }

    // POST de limpieza: borra el audio subido en cuanto Replicate termino
    if (req.method === 'POST' && req.body && req.body.action === 'cleanup') {
      try {
        const u = new URL(String(req.body.url || ''));
        if (u.protocol === 'https:' && isBlobHost(u.hostname) && process.env.BLOB_READ_WRITE_TOKEN) {
          await del(u.toString());
          return res.status(200).json({ deleted: true });
        }
      } catch { /* url invalida */ }
      return res.status(200).json({ deleted: false });
    }

    // POST: iniciar separación de pistas
    if (req.method === 'POST') {
      let { audioUrl, model_name } = req.body as { audioUrl?: string; model_name?: string };
      if (!audioUrl) {
        return res.status(400).json({ error: 'audioUrl es requerido' });
      }

      // Validar el modelo: Demucs 'htdemucs' (4 pistas), 'htdemucs_ft' (4 pistas, mayor calidad y mas lento),
      // 'htdemucs_6s' (6 pistas) o el motor BS-RoFormer (mas nuevo): 'roformer_2' (voz + instrumental), 'roformer_4', 'roformer_6'
      const ALLOWED_MODELS = ['htdemucs', 'htdemucs_ft', 'htdemucs_6s', 'roformer_2', 'roformer_4', 'roformer_6'];
      const selectedModel = ALLOWED_MODELS.includes(String(model_name)) ? String(model_name) : 'htdemucs';

      // Solo se aceptan direcciones del servicio temporal de subida o de Replicate (evita que el servidor
      // descargue cualquier URL que le manden)
      let host = '';
      try { const u = new URL(audioUrl); if (u.protocol === 'https:' || u.protocol === 'http:') host = u.hostname; } catch { /* invalida */ }
      const hostOk = host === 'tmpfiles.org' || host.endsWith('.tmpfiles.org') || host === 'replicate.delivery' || host.endsWith('.replicate.delivery') || isBlobHost(host);
      if (!hostOk) {
        return res.status(400).json({ error: 'audioUrl no permitido: solo almacenamiento privado, tmpfiles.org o replicate.delivery' });
      }

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

      const isRoformer = selectedModel.startsWith('roformer_');
      // Modelo de la comunidad: Replicate exige el id de version (la ruta /models/.../predictions solo sirve para modelos oficiales)
      const replicateUrl = 'https://api.replicate.com/v1/predictions';
      const replicateBody = isRoformer
        ? {
            version: '4705a6f81046d29dc9b2101765bbbc81c68cb4aeec630e9465fc191ccdcd6e63', // cottom/bs-roformer
            input: {
              audio: audioUrl,
              mode: selectedModel === 'roformer_2' ? 'vocals' : selectedModel === 'roformer_4' ? '4-stem' : '6-stem',
              output_format: 'wav', // WAV 24-bit a la frecuencia original
            },
          }
        : {
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
        };

      const response = await fetch(replicateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replicateBody),
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
      // BS-RoFormer devuelve una lista de URLs sin nombre: se nombran por el archivo o, si no, por su posicion
      if (data.status === 'succeeded' && Array.isArray(data.output)) {
        const urls = data.output.filter((v: any) => typeof v === 'string' && v.trim().startsWith('http')).map((v: string) => v.trim());
        const byPosition: Record<number, string[]> = {
          2: ['vocals', 'instrumental'],
          4: ['vocals', 'drums', 'bass', 'other'],
          6: ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'],
        };
        const keywords: [string, RegExp][] = [
          ['instrumental', /instrum|no_?vocal|accomp|karaoke/i],
          ['vocals', /vocal|voice|voz/i],
          ['drums', /drum/i],
          ['bass', /bass/i],
          ['guitar', /guitar/i],
          ['piano', /piano|keys/i],
          ['other', /other|rest/i],
        ];
        const named: Record<string, string> = {};
        const unnamed: number[] = [];
        urls.forEach((url: string, i: number) => {
          const file = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
          const hit = keywords.find(([key, re]) => re.test(file) && !named[key]);
          if (hit) named[hit[0]] = url; else unnamed.push(i);
        });
        const order = byPosition[urls.length] || [];
        for (const i of unnamed) {
          const key = order[i] && !named[order[i]] ? order[i] : `pista_${i + 1}`;
          named[key] = urls[i];
        }
        data.output = named;
      }

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
