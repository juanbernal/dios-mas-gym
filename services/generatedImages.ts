// Imagenes generadas en las herramientas (Studio PRO, SmartLink Image Creator) para reutilizarlas en
// "Publicacion Rapida del Dia" sin volver a crearlas.
// - Copia local (IndexedDB) para que aparezcan al instante.
// - Copia en el servidor (Vercel Blob) para verlas en todos los dispositivos.
// Se borran al terminar de publicar la cancion y, si no, a los 30 dias.

import { adminHeaders } from './adminSync';

export type GeneratedImageSource = 'promo' | 'smartlink';
export interface GeneratedImage {
  key: string;            // `${source}:${songId}`: se guarda la ultima de cada herramienta por cancion
  source: GeneratedImageSource;
  songId: string;
  songName: string;
  blob: Blob;
  createdAt: number;
}

const DB_NAME = 'dmg_generated_images';
const STORE = 'images';
const MAX_ITEMS = 40;
const MAX_AGE_MS = 30 * 86400000;
const API = '/api/common?action=generated-images';
// Listar en Blob cuenta como operacion avanzada (cupo mensual limitado en el plan gratis):
// cada cancion se consulta al servidor una sola vez por sesion.
const serverChecked = new Set<string>();

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const getAll = async (): Promise<GeneratedImage[]> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as GeneratedImage[]);
    req.onerror = () => reject(req.error);
  });
};

const putLocal = async (item: GeneratedImage) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const deleteLocal = async (keys: string[]) => {
  if (!keys.length) return;
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  keys.forEach(k => tx.objectStore(STORE).delete(k));
};

// JPG de 1440 px como maximo: suficiente para redes y ligero para subir
const toUploadJpeg = async (blob: Blob): Promise<string> => {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, 1440 / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return canvas.toDataURL('image/jpeg', 0.88);
};

export const saveGeneratedImage = async (source: GeneratedImageSource, songId: string, songName: string, blob: Blob): Promise<void> => {
  if (!songId || !blob) return;
  try {
    await putLocal({ key: `${source}:${songId}`, source, songId, songName, blob, createdAt: Date.now() });
    // Solo se conservan las mas recientes y de menos de 30 dias
    const all = (await getAll()).sort((a, b) => b.createdAt - a.createdAt);
    await deleteLocal(all.filter((g, i) => i >= MAX_ITEMS || Date.now() - g.createdAt > MAX_AGE_MS).map(g => g.key));
  } catch (e) {
    console.warn('No se pudo guardar la imagen en este dispositivo:', e);
  }
  try {
    const imageBase64 = await toUploadJpeg(blob);
    await fetch(API, {
      method: 'POST',
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ songId, source, imageBase64 })
    });
  } catch (e) {
    console.warn('No se pudo subir la imagen al servidor:', e);
  }
};

export const getGeneratedImagesForSong = async (songId: string, songName = ''): Promise<GeneratedImage[]> => {
  if (!songId) return [];
  let local: GeneratedImage[] = [];
  try {
    local = (await getAll()).filter(i => i.songId === songId && Date.now() - i.createdAt <= MAX_AGE_MS);
  } catch { /* sin IndexedDB */ }

  if (!serverChecked.has(songId)) {
    serverChecked.add(songId);
    try {
      const res = await fetch(`${API}&songId=${encodeURIComponent(songId)}`, { headers: adminHeaders() });
      if (res.ok) {
        const { items = [] } = await res.json();
        for (const it of items as { source: GeneratedImageSource; path: string; createdAt: number }[]) {
          const mine = local.find(l => l.source === it.source);
          // Solo se descarga si es de otro dispositivo o mas nueva que la local
          if (mine && mine.createdAt >= it.createdAt - 5000) continue;
          const img = await fetch(`${API}&path=${encodeURIComponent(it.path)}`, { headers: adminHeaders() });
          if (!img.ok) continue;
          const item: GeneratedImage = { key: `${it.source}:${songId}`, source: it.source, songId, songName: mine?.songName || songName, blob: await img.blob(), createdAt: it.createdAt };
          try { await putLocal(item); } catch { /* sin IndexedDB */ }
          local = [...local.filter(l => l.source !== it.source), item];
        }
      }
    } catch { /* sin conexion: quedan las locales */ }
  }
  return local.sort((a, b) => b.createdAt - a.createdAt);
};

// Al terminar de publicar la cancion ya no hacen falta
export const deleteGeneratedImagesForSong = async (songId: string): Promise<void> => {
  if (!songId) return;
  try {
    await deleteLocal((await getAll()).filter(i => i.songId === songId).map(i => i.key));
  } catch { /* sin IndexedDB */ }
  serverChecked.delete(songId);
  fetch(`${API}&songId=${encodeURIComponent(songId)}`, { method: 'DELETE', headers: adminHeaders() }).catch(() => {});
};
