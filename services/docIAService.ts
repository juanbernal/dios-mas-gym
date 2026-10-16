import { jsPDF } from 'jspdf';

// Documento que TooLost pide cuando un lanzamiento declara uso de IA:
// "AI Documentation Required" -> copia de los terminos/licencia que te dan derecho a distribuirlo.
// Se arma un PDF por lanzamiento con la captura del plan, las clausulas de la licencia,
// la lista de canciones cubiertas y la declaracion firmada.

export interface Clausula { titulo: string; texto: string }
export interface Evidencia { titulo: string; img: string }
export interface ConfigIA {
  nombreLegal: string;
  herramienta: string;
  herramientaUrl: string;
  plan: string;
  facturacion: string;
  capturaFecha: string; // AAAA-MM-DD
  captura?: string; // dataURL
  recibo?: string; // dataURL del recibo de pago del mes
  reciboFecha: string; // AAAA-MM-DD
  terminosUrl: string;
  terminosRevision: string;
  terminosVigencia: string;
  clausulas: Clausula[];
  uso: string;
  letraPropia: boolean;
  firma?: string; // dataURL png
  extras: Evidencia[];
}
export interface LanzamientoIA {
  artista: string;
  nombre: string;
  tipo: 'Sencillo' | 'EP' | 'Álbum';
  fecha?: string;
  sello?: string;
  pistas: string[];
}

export const CONFIG_INICIAL: ConfigIA = {
  nombreLegal: 'Juan Alberto Bernal Ríos',
  herramienta: 'Suno',
  herramientaUrl: 'suno.com',
  plan: 'Pro',
  facturacion: 'monthly billing',
  capturaFecha: '',
  reciboFecha: '',
  terminosUrl: 'https://suno.com/terms',
  terminosRevision: 'August 10, 2026',
  terminosVigencia: 'September 3, 2026',
  clausulas: [
    { titulo: 'Pro and Premier Accounts', texto: 'for subscribers to the Pro or Premier paid tier, Suno assigns to the user its right, title and interest in the Output generated from the user\'s submissions.' },
    { titulo: 'Permitted Commercial Use', texto: 'paid-tier users may commercially exploit Output obtained through a permitted Download under their tier\'s allocation; these rights are perpetual and are not affected by later cancellation or downgrade of the subscription.' },
    { titulo: 'Free or Basic Tier Accounts', texto: 'only free/basic tier Output is limited to personal, non-commercial use (not applicable: this account is Pro).' },
  ],
  uso: 'Music and vocals generated with Suno',
  letraPropia: true,
  extras: [],
};

// ── Guardado en este navegador (la firma y las capturas no salen del dispositivo) ──
const KEY = 'docia_config_v1';
export const cargarConfig = (): ConfigIA => {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && typeof c === 'object') return { ...CONFIG_INICIAL, ...c };
  } catch { /* nada */ }
  return CONFIG_INICIAL;
};
export const guardarConfig = (c: ConfigIA): boolean => {
  try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch { return false; }
};

// Reduce la imagen para que quepa en el almacenamiento y el PDF no pese de mas
export const comprimirImagen = (file: File, maxLado = 2400, calidad = 0.9): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });

const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fechaIngles = (iso?: string): string => {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso || '';
  return `${MESES[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
};
// Dias desde una fecha AAAA-MM-DD (para avisar cuando ya toca actualizar la captura o el recibo)
export const diasDesde = (iso?: string): number | null => {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Math.floor((Date.now() - new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()) / 86400000);
};
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TIPO_EN: Record<LanzamientoIA['tipo'], string> = { Sencillo: 'Single', EP: 'EP', 'Álbum': 'Album' };

// La fuente base del PDF solo trae Latin-1: se cambian los signos que no existen ahi
const t = (s: string) => (s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/℗/g, '(P)').replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');

export const nombreArchivo = (l: LanzamientoIA) =>
  `${l.artista}_${l.nombre}_AI_Rights_Documentation.pdf`
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');

// Lo que falta para que el documento sirva
export const faltantes = (c: ConfigIA, l: LanzamientoIA): string[] => [
  !c.nombreLegal.trim() && 'Tu nombre legal',
  !c.captura && 'La captura de tu cuenta con el plan activo',
  !c.firma && 'Tu firma',
  !l.nombre.trim() && 'El nombre del lanzamiento',
  !l.pistas.some(p => p.trim()) && 'Al menos una canción',
].filter(Boolean) as string[];

export function crearPDF(c: ConfigIA, l: LanzamientoIA): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 54;
  const ancho = W - M * 2;
  let y = M;
  const pistas = l.pistas.map(p => p.trim()).filter(Boolean);
  const herramienta = `${c.herramienta} (${c.herramientaUrl})`;

  const saltoSi = (alto: number) => { if (y + alto > H - M - 20) { doc.addPage(); y = M; } };
  const texto = (s: string, { size = 10, bold = false, gap = 4, color = 30 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lineas = doc.splitTextToSize(t(s), ancho);
    const alto = size * 1.3;
    lineas.forEach((ln: string) => { saltoSi(alto); doc.text(ln, M, y + size); y += alto; });
    y += gap;
  };
  // Linea con partes en negrita: [["Artist: ", true], ["Diosmasgym", false]]
  const mixta = (partes: [string, boolean][], size = 10) => {
    saltoSi(size * 1.4);
    let x = M;
    doc.setFontSize(size);
    doc.setTextColor(30);
    partes.forEach(([s, b]) => {
      doc.setFont('helvetica', b ? 'bold' : 'normal');
      const v = t(s);
      if (x + doc.getTextWidth(v) > M + ancho) { y += size * 1.4; x = M; saltoSi(size * 1.4); }
      doc.text(v, x, y + size);
      x += doc.getTextWidth(v);
    });
    y += size * 1.4 + 2;
  };
  const titulo = (s: string) => { y += 10; saltoSi(40); texto(s, { size: 14, bold: true, gap: 6, color: 10 }); };
  // Prueba a pagina completa: la hoja se gira segun la imagen para que se lea bien
  // (una captura de escritorio va en horizontal y llena toda la hoja)
  const pruebaPagina = (src: string, leyenda: string) => {
    const p = doc.getImageProperties(src);
    const horizontal = p.width > p.height;
    doc.addPage('letter', horizontal ? 'landscape' : 'portrait');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(10);
    const lineas = doc.splitTextToSize(t(leyenda), pw - m * 2);
    doc.text(lineas, m, m + 12);
    const top = m + 12 + lineas.length * 15;
    const maxW = pw - m * 2;
    const maxH = ph - top - m - 22;
    let w = maxW;
    let h = (p.height / p.width) * w;
    if (h > maxH) { h = maxH; w = (p.width / p.height) * h; }
    const x = (pw - w) / 2;
    doc.addImage(src, p.fileType, x, top, w, h);
    doc.setDrawColor(200);
    doc.rect(x, top, w, h);
  };

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(10);
  doc.text('AI-Assisted Content - Distribution Rights Documentation', W / 2, y + 16, { align: 'center' });
  y += 34;
  mixta([['Artist: ', true], [`${l.artista}    `, false], ['Legal name: ', true], [c.nombreLegal, false]]);
  mixta([['Release: ', true], [`${l.nombre}    `, false], ['Type: ', true], [`${TIPO_EN[l.tipo]} (${pistas.length} track${pistas.length === 1 ? '' : 's'})`, false]]);
  const linea3: [string, boolean][] = [['AI tool used: ', true], [`${herramienta}    `, false]];
  if (l.fecha) linea3.push(['Original release date: ', true], [fechaIngles(l.fecha), false]);
  mixta(linea3);
  if (l.sello) mixta([['Label: ', true], [l.sello, false]]);
  mixta([['Date of this document: ', true], [fechaIngles(hoyISO()), false]]);
  doc.setDrawColor(180);
  doc.line(M, y + 4, M + ancho, y + 4);
  y += 10;

  // 1. Cuenta
  titulo(`1. Account status - ${c.herramienta} ${c.plan} Plan (active)`);
  // Las imagenes van al final, cada una en su propia hoja y a tamano completo
  const pruebas: { src: string; leyenda: string }[] = [];
  const letra = () => String.fromCharCode(65 + pruebas.length);
  const refCaptura = c.captura ? ` (attached full-size as Exhibit ${letra()})` : '';
  if (c.captura) pruebas.push({ src: c.captura, leyenda: `Exhibit A - ${c.herramienta} account page (${c.herramientaUrl}/account)${c.capturaFecha ? `, screenshot taken ${fechaIngles(c.capturaFecha)}` : ''}: Current plan ${c.plan}` });
  const refRecibo = c.recibo ? ` A payment receipt for the current subscription${c.reciboFecha ? ` (${fechaIngles(c.reciboFecha)})` : ''} is attached as Exhibit ${letra()}.` : '';
  if (c.recibo) pruebas.push({ src: c.recibo, leyenda: `Exhibit ${letra()} - Payment receipt for the ${c.herramienta} ${c.plan} subscription${c.reciboFecha ? ` (${fechaIngles(c.reciboFecha)})` : ''}` });
  texto(`Screenshot of the ${c.herramienta} account page (${c.herramientaUrl}/account)${c.capturaFecha ? ` taken ${fechaIngles(c.capturaFecha)}` : ''}${refCaptura}. It shows: Current plan: ${c.plan} Plan${c.facturacion ? `, ${c.facturacion}` : ''}. The ${c.plan} plan includes "Commercial use rights".${refRecibo}`);

  // 2. Licencia
  titulo(`2. Applicable license - ${c.herramienta} Terms of Service`);
  const fechas = [c.terminosRevision && `Date of Last Revision: ${c.terminosRevision}`, c.terminosVigencia && `Effective Date: ${c.terminosVigencia}`].filter(Boolean).join('; ');
  texto(`Source: ${c.terminosUrl}${fechas ? ` (${fechas})` : ''}. A full copy of the Terms is available at that URL. Relevant sections:`);
  c.clausulas.filter(k => k.titulo.trim() || k.texto.trim()).forEach(k => {
    doc.setFontSize(10);
    const cuerpo = doc.splitTextToSize(t(`"${k.titulo}" - ${k.texto}`), ancho - 14);
    saltoSi(cuerpo.length * 13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30);
    doc.text('•', M + 2, y + 10);
    cuerpo.forEach((ln: string, i: number) => {
      saltoSi(13);
      // El titulo de la clausula va en negrita en la primera linea
      if (i === 0 && ln.startsWith(`"${t(k.titulo)}"`)) {
        const tit = `"${t(k.titulo)}"`;
        doc.setFont('helvetica', 'bold');
        doc.text(tit, M + 14, y + 10);
        const wt = doc.getTextWidth(tit);
        doc.setFont('helvetica', 'normal');
        doc.text(ln.slice(tit.length), M + 14 + wt, y + 10);
      } else doc.text(ln, M + 14, y + 10);
      y += 13;
    });
    y += 5;
  });

  // 3. Canciones cubiertas
  titulo('3. Tracks covered by this document');
  const detalle = `${c.uso}${c.letraPropia ? `; lyrics written by ${c.nombreLegal}` : ''}.`;
  texto(`All tracks listed below are AI-assisted: ${detalle}`, { gap: 6 });
  pistas.forEach((p, i) => {
    saltoSi(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(`${i + 1}.`, M + 4, y + 10);
    doc.setFont('helvetica', 'normal');
    const ln = doc.splitTextToSize(t(p), ancho - 28);
    ln.forEach((s: string) => { saltoSi(13); doc.text(s, M + 24, y + 10); y += 13; });
    y += 2;
  });

  // 4. Declaracion
  // Declaracion y firma siempre en la misma pagina
  y += 10;
  saltoSi(200);
  y -= 10;
  titulo('4. Declaration');
  texto(`I, ${c.nombreLegal} (artist name ${l.artista}), declare that the AI-assisted tracks on the release "${l.nombre}" were generated with ${c.herramienta} while subscribed to the ${c.herramienta} ${c.plan} plan, were obtained through ${c.herramienta}'s official download feature${c.letraPropia ? ', and that all lyrics were written by me' : ''}. I hold the rights needed to distribute this content.`, { gap: 14 });
  saltoSi(90);
  const xFirma = M;
  if (c.firma) {
    const p = doc.getImageProperties(c.firma);
    const h = 46;
    const w = Math.min(200, (p.width / p.height) * h);
    doc.addImage(c.firma, p.fileType, xFirma + 52, y, w, h);
  }
  y += 48;
  doc.setDrawColor(60);
  doc.line(xFirma + 52, y, xFirma + 260, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Signature:', xFirma, y - 2);
  doc.text('Date:', xFirma + 290, y - 2);
  doc.text(t(fechaIngles(hoyISO())), xFirma + 322, y - 4);
  doc.line(xFirma + 318, y, xFirma + 440, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(t(`${c.nombreLegal} (${l.artista})`), xFirma + 52, y);
  y += 10;

  // Pruebas y anexos, cada uno en su hoja
  c.extras.filter(e => e.img).forEach(e => pruebas.push({ src: e.img, leyenda: `Exhibit ${letra()}${e.titulo ? ` - ${e.titulo}` : ''}` }));
  pruebas.forEach(p => pruebaPagina(p.src, p.leyenda));

  // Pie de pagina
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = W > H ? 30 : 54;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(t(`${l.artista} - ${l.nombre} - AI Rights Documentation`), M, H - 28);
    doc.text(`Page ${i} of ${n}`, W - M, H - 28, { align: 'right' });
  }
  return doc;
}
