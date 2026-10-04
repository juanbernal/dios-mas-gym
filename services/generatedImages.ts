// Imagenes generadas en las herramientas (Studio PRO, SmartLink Image Creator) guardadas en el
// navegador (IndexedDB) para reutilizarlas en "Publicacion Rapida del Dia" sin volver a crearlas.
// Viven solo en este dispositivo.

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

export const saveGeneratedImage = async (source: GeneratedImageSource, songId: string, songName: string, blob: Blob): Promise<void> => {
  if (!songId || !blob) return;
  try {
    const db = await openDb();
    const item: GeneratedImage = { key: `${source}:${songId}`, source, songId, songName, blob, createdAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    // Se conservan solo las mas recientes para no llenar el almacenamiento
    const all = await getAll();
    if (all.length > MAX_ITEMS) {
      const old = all.sort((a, b) => b.createdAt - a.createdAt).slice(MAX_ITEMS);
      const tx = db.transaction(STORE, 'readwrite');
      old.forEach(o => tx.objectStore(STORE).delete(o.key));
    }
  } catch (e) {
    console.warn('No se pudo guardar la imagen generada:', e);
  }
};

export const getGeneratedImagesForSong = async (songId: string): Promise<GeneratedImage[]> => {
  if (!songId) return [];
  try {
    return (await getAll()).filter(i => i.songId === songId).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
};
