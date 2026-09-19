/**
 * Rasterizado de iconos para html2canvas.
 *
 * Los iconos del sitio ya no vienen de la fuente de Font Awesome sino de
 * `public/fa-icons.css`, donde cada uno es una mascara SVG (`mask-image`).
 * Eso es mucho mas ligero en la web, pero html2canvas no sabe rasterizar
 * `mask-image`: en las imagenes generadas por el panel de admin los iconos
 * salian en blanco.
 *
 * `rasterizeIconsForCanvas` se pasa como opcion `onclone`. html2canvas clona
 * el DOM antes de fotografiarlo, asi que aqui cambiamos cada <i class="fa-...">
 * del CLON por un <img> con el mismo SVG incrustado y ya coloreado. El DOM
 * real que ve el usuario no se toca.
 */

type IconMap = Record<string, string>;

let iconMapCache: IconMap | null = null;

/** Lee las reglas .fa-* de las hojas de estilo y saca el data URI de cada icono. */
const buildIconMap = (): IconMap => {
  if (iconMapCache) return iconMapCache;

  const map: IconMap = {};
  const urlPattern = /url\(\s*["']?(data:image\/svg\+xml,[^"')]+)["']?\s*\)/i;

  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        // Hoja de otro origen: no se puede leer, la saltamos.
        continue;
      }
      if (!rules) continue;

      for (const rule of Array.from(rules)) {
        const styleRule = rule as CSSStyleRule;
        if (!styleRule.selectorText || !styleRule.style) continue;
        if (styleRule.selectorText.indexOf('.fa-') !== 0) continue;

        const value =
          styleRule.style.getPropertyValue('mask-image') ||
          styleRule.style.getPropertyValue('-webkit-mask-image');
        if (!value) continue;

        const match = value.match(urlPattern);
        if (!match) continue;

        const className = styleRule.selectorText.slice(1).trim();
        if (className) map[className] = match[1];
      }
    }
  } catch (err) {
    console.warn('[canvasIcons] No se pudieron leer las reglas de iconos:', err);
  }

  iconMapCache = map;
  return map;
};

/**
 * Prepara el SVG para que html2canvas lo dibuje bien:
 * - le mete el color dentro, para no depender de currentColor;
 * - le da width/height propios sacados del viewBox. Sin tamano intrinseco,
 *   el navegador le asigna 300x150 al rasterizarlo y el icono salia recortado.
 */
const prepareSvgDataUri = (dataUri: string, color: string): string => {
  try {
    const encoded = dataUri.replace(/^data:image\/svg\+xml,/, '');
    let svg = decodeURIComponent(encoded);

    const viewBox = svg.match(/viewBox="\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*"/i);
    const attrs: string[] = [`fill="${color}"`];
    if (viewBox && !/\swidth="/i.test(svg)) {
      attrs.push(`width="${viewBox[3]}"`, `height="${viewBox[4]}"`);
    }
    attrs.push('preserveAspectRatio="xMidYMid meet"');

    svg = svg.replace(/<svg\b/, `<svg ${attrs.join(' ')}`);
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  } catch {
    return dataUri;
  }
};

export const rasterizeIconsForCanvas = (clonedDoc: Document): void => {
  const map = buildIconMap();
  if (!Object.keys(map).length) return;

  const view = clonedDoc.defaultView || window;
  const nodes = Array.from(
    clonedDoc.querySelectorAll<HTMLElement>('i[class*="fa-"], span[class*="fa-"]')
  );

  for (const node of nodes) {
    const iconClass = Array.from(node.classList).find(c => map[c]);
    if (!iconClass) continue;

    let computed: CSSStyleDeclaration | null = null;
    try {
      computed = view.getComputedStyle(node);
    } catch {
      computed = null;
    }

    const color = (computed && computed.color) || '#ffffff';
    const fontSize = parseFloat((computed && computed.fontSize) || '16') || 16;
    const width = parseFloat((computed && computed.width) || '') || fontSize;
    const height = parseFloat((computed && computed.height) || '') || fontSize;

    const img = clonedDoc.createElement('img');
    img.src = prepareSvgDataUri(map[iconClass], color);
    img.alt = '';
    img.width = Math.round(width);
    img.height = Math.round(height);
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.display = 'inline-block';
    img.style.verticalAlign = '-0.125em';
    img.style.objectFit = 'contain';

    if (computed) {
      img.style.marginTop = computed.marginTop;
      img.style.marginRight = computed.marginRight;
      img.style.marginBottom = computed.marginBottom;
      img.style.marginLeft = computed.marginLeft;
      if (computed.opacity) img.style.opacity = computed.opacity;
    }

    node.parentNode?.replaceChild(img, node);
  }
};

/**
 * Anade el rasterizado a unas opciones de html2canvas, conservando cualquier
 * `onclone` que ya tuviera la llamada.
 */
export const withRasterizedIcons = <T extends { onclone?: (doc: Document, el?: HTMLElement) => void }>(
  options: T
): T => {
  const previous = options.onclone;
  return {
    ...options,
    onclone: (clonedDoc: Document, el?: HTMLElement) => {
      if (previous) previous(clonedDoc, el);
      rasterizeIconsForCanvas(clonedDoc);
    }
  };
};
