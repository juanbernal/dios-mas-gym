// Implementación en memoria como plan de respaldo (fallback) si localStorage no está disponible
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return memoryStorage[key] || null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error al leer la clave "${key}" de localStorage, usando respaldo en memoria:`, e);
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        memoryStorage[key] = value;
        return;
      }
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Error al escribir la clave "${key}" en localStorage, usando respaldo en memoria:`, e);
      memoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        delete memoryStorage[key];
        return;
      }
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SafeStorage] Error al eliminar la clave "${key}" de localStorage, usando respaldo en memoria:`, e);
      delete memoryStorage[key];
    }
  }
};
