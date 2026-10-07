// Arma una imagen vertical (1080x1350, formato de Instagram/WhatsApp) con el versículo del día
// y la comparte con el menú del teléfono. Si el navegador no puede compartir archivos, la descarga.

const W = 1080;
const H = 1350;

const loadImage = (src: string) => new Promise<HTMLImageElement | null>(resolve => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// Parte el texto en renglones que quepan en el ancho dado
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawVerse(verse: { t: string; r: string; m: string }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  try { await Promise.all([document.fonts.load('80px "Pirata One"'), document.fonts.load('700 40px Oswald')]); } catch { /* se usan fuentes del sistema */ }

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#020d1a');
  bg.addColorStop(0.55, '#071325');
  bg.addColorStop(1, '#0b1929');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, 700);
  glow.addColorStop(0, 'rgba(74,144,217,0.28)');
  glow.addColorStop(1, 'rgba(74,144,217,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Cuadricula sutil
  ctx.strokeStyle = 'rgba(74,144,217,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Barra lateral
  ctx.fillStyle = '#2563a8';
  ctx.fillRect(90, 260, 8, 760);

  // Encabezado
  ctx.fillStyle = '#4a90d9';
  ctx.font = '700 34px Oswald, Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('✝  VERSÍCULO DEL DÍA', 90, 190);

  // Versiculo: se ajusta el tamaño para que siempre quepa
  const text = `“${verse.t}”`;
  let size = 84;
  let lines: string[] = [];
  do {
    ctx.font = `${size}px "Pirata One", Georgia, serif`;
    lines = wrap(ctx, text, W - 240);
    size -= 4;
  } while (lines.length * size * 1.25 > 620 && size > 40);
  const lineH = (size + 4) * 1.2;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(37,99,168,0.6)';
  ctx.shadowBlur = 30;
  let y = 330;
  for (const l of lines) { ctx.fillText(l, 140, y); y += lineH; }
  ctx.shadowBlur = 0;

  // Referencia
  y += 30;
  ctx.font = '700 40px Oswald, Arial, sans-serif';
  const refW = ctx.measureText(verse.r).width + 60;
  ctx.fillStyle = 'rgba(37,99,168,0.25)';
  ctx.fillRect(140, y - 46, refW, 66);
  ctx.strokeStyle = 'rgba(74,144,217,0.5)';
  ctx.strokeRect(140, y - 46, refW, 66);
  ctx.fillStyle = '#7eb8f7';
  ctx.fillText(verse.r, 170, y);

  // Motivacion
  if (verse.m) {
    y += 90;
    ctx.font = '34px Arial, sans-serif';
    ctx.fillStyle = 'rgba(200,205,212,0.75)';
    for (const l of wrap(ctx, verse.m, W - 280).slice(0, 3)) { ctx.fillText(l, 140, y); y += 48; }
  }

  // Pie con logo y sitio
  const logo = await loadImage('/logo-diosmasgym-md.webp') || await loadImage('/logo-diosmasgym.png');
  const footY = H - 170;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(90, footY - 30, W - 180, 2);
  if (logo) ctx.drawImage(logo, 90, footY, 100, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = '52px "Pirata One", Georgia, serif';
  ctx.fillText('Diosmasgym', logo ? 215 : 90, footY + 55);
  ctx.fillStyle = '#4a90d9';
  ctx.font = '700 28px Oswald, Arial, sans-serif';
  ctx.fillText('DIOSMASGYM.COM', logo ? 215 : 90, footY + 95);

  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas')), 'image/png'));
}

export async function shareVerseImage(verse: { t: string; r: string; m: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await drawVerse(verse);
  const fileName = `versiculo-${verse.r.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `${verse.r} ✝ Versículo del día en https://www.diosmasgym.com` });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
