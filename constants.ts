
/**
 * SISTEMA DE CONFIGURACIÓN DINÁMICA
 * No modificar manualmente. Los valores se inyectan en tiempo de construcción.
 */
const _D = (s: string) => {
  try { return atob(s); } catch (e) { return ''; }
};

// Intentamos capturar las variables desde diferentes entornos de construcción comunes
// (Vite, Webpack, process.env)
const getV = (key: string, fallback: string) => {
  // Fix: Use a safer way to access environment variables across different build systems.
  let value: string | undefined;

  // Try process.env (Standard in Node.js and many bundlers like Webpack)
  try {
    if (typeof process !== 'undefined' && process.env) {
      value = (process.env as any)[key];
    }
  } catch (e) {
    // process.env might not be defined or accessible
  }

  // Try import.meta.env (Standard in modern ESM bundlers like Vite)
  if (!value) {
    try {
      // Fix: We use @ts-ignore and avoid casting the 'import' keyword itself,
      // which was causing the "Duplicate identifier 'as'" and other parsing errors.
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        value = import.meta.env[key];
      }
    } catch (e) {
      // import.meta might not be supported in the current environment
    }
  }

  return value || _D(fallback);
};

// Credenciales protegidas
export const _CX_K = '';
const _ID = 'NTAzMTk1OTE5Mjc4OTU4OTkwMw==';

// Ruta de acceso al recurso
export const GATEWAY_URL = `https://www.googleapis.com/blogger/v3/blogs/${_ID}/posts`;
export const FEED_URL = `https://www.diosmasgym.com/feeds/posts/default?alt=json&max-results=50`;
