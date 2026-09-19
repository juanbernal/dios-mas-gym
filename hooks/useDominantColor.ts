import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

// Color principal de una portada (el mas vivo, no el mas comun): sirve para que el brillo del
// reproductor y del destacado cambien con cada cancion. Si la imagen no permite leerse
// (CORS) o falla, se queda con el color de la marca.
export function useDominantColor(src?: string, fallback = '#4a90d9'): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    if (!src) { setColor(fallback); return; }
    const hit = cache.get(src);
    if (hit) { setColor(hit); return; }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('sin canvas');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const lum = (max + min) / 510;
          const sat = max === 0 ? 0 : (max - min) / max;
          if (lum < 0.12 || lum > 0.92 || sat < 0.2) continue; // negros, blancos y grises no aportan color
          const weight = sat * sat;
          r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; w += weight;
        }
        if (w === 0) throw new Error('sin color vivo');
        r /= w; g /= w; b /= w;
        const top = Math.max(r, g, b) || 1;
        const k = Math.min(2.4, 225 / top); // se aclara para que brille sobre fondo oscuro
        const out = `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
        cache.set(src, out);
        setColor(out);
      } catch {
        cache.set(src, fallback);
        setColor(fallback);
      }
    };
    img.onerror = () => { if (!cancelled) setColor(fallback); };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, fallback]);

  return color;
}
