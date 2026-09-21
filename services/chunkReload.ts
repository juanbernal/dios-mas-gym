// Tras un despliegue, los archivos con hash de los modulos lazy cambian y una pestaña abierta
// con la version vieja falla al pedirlos. Recargar una vez trae la version nueva.
const GUARD_KEY = 'chunk_reload_at';

export const isChunkLoadError = (message: string): boolean =>
  /dynamically imported module|Loading chunk|Loading CSS chunk|Importing a module script failed|Unable to preload/i.test(message || '');

export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY) || 0);
    // Evita un bucle de recargas si el fallo no se debe a una version nueva
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch { /* sin sessionStorage: recargamos igual una vez */ }
  window.location.reload();
  return true;
}
