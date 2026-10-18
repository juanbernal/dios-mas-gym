import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { get as blobGet, put as blobPut, list as blobList } from '@vercel/blob';

// ── Tienda de merch ──
// Productos: se importan de Printful (productos ya diseñados en tu tienda "API" de Printful) y el admin
// les pone precio en pesos. Se guardan como JSON en Vercel Blob.
// Cobro: Mercado Pago Checkout Pro (tarjeta, OXXO, saldo MP). El precio siempre se recalcula aquí,
// nunca se confía en lo que manda el navegador.
// Pedido pagado: Mercado Pago avisa al webhook, se verifica el pago con su API y se manda el pedido a
// Printful, que lo fabrica y lo envía.
//
// Variables en Vercel: MP_ACCESS_TOKEN, PRINTFUL_API_TOKEN, PRINTFUL_STORE_ID (si el token es de cuenta),
// BLOB_READ_WRITE_TOKEN (ya existe) y opcionalmente TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID para avisos.

const BASE = 'https://www.diosmasgym.com';

export interface Variante { id: number; nombre: string; talla?: string; color?: string; imagen?: string; activo: boolean }
export interface Producto {
  id: string; nombre: string; descripcion: string; precio: number; imagenes: string[]; activo: boolean;
  printfulId: number; variantes: Variante[];
}
export interface Config { envio: number; envioGratisDesde: number; autoConfirmar: boolean }
export interface Catalogo { productos: Producto[]; config: Config }
export interface Direccion { nombre: string; email: string; telefono: string; calle: string; colonia: string; ciudad: string; estado: string; cp: string }
export interface Pedido {
  id: string; creado: number; estado: 'pendiente_pago' | 'pagado' | 'enviado_printful' | 'error_printful' | 'cancelado';
  items: { productoId: string; varianteId: number; nombre: string; variante: string; cantidad: number; precio: number; imagen?: string }[];
  subtotal: number; envio: number; total: number; direccion: Direccion;
  mpPreferenceId?: string; mpPaymentId?: string; mpEstado?: string; pagado?: number;
  printfulId?: number; printfulEstado?: string; error?: string;
}

const DEFAULT_CONFIG: Config = { envio: 149, envioGratisDesde: 0, autoConfirmar: false };

export const ESTADOS_MX: Record<string, string> = {
  AGU: 'Aguascalientes', BCN: 'Baja California', BCS: 'Baja California Sur', CAM: 'Campeche', CHP: 'Chiapas',
  CHH: 'Chihuahua', CMX: 'Ciudad de México', COA: 'Coahuila', COL: 'Colima', DUR: 'Durango', GUA: 'Guanajuato',
  GRO: 'Guerrero', HID: 'Hidalgo', JAL: 'Jalisco', MEX: 'Estado de México', MIC: 'Michoacán', MOR: 'Morelos',
  NAY: 'Nayarit', NLE: 'Nuevo León', OAX: 'Oaxaca', PUE: 'Puebla', QUE: 'Querétaro', ROO: 'Quintana Roo',
  SLP: 'San Luis Potosí', SIN: 'Sinaloa', SON: 'Sonora', TAB: 'Tabasco', TAM: 'Tamaulipas', TLA: 'Tlaxcala',
  VER: 'Veracruz', YUC: 'Yucatán', ZAC: 'Zacatecas',
};

// ── Admin ──
// Intentos fallidos de contraseña por IP (frena la fuerza bruta; se reinicia con cada instancia)
const adminFails = new Map<string, { count: number; resetAt: number }>();
const clientIp = (req: any) => String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

function isAdmin(req: any): boolean {
  const keyName = process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD' : (Object.keys(process.env).find(k => k.toUpperCase().includes('ADMIN_PASSWORD')) || 'ADMIN_PASSWORD');
  const master = (process.env[keyName] || '').trim().replace(/^["']|["']$/g, '');
  const provided = String(req.headers?.['x-admin-password'] || '').trim();
  if (!master) return !process.env.VERCEL; // en desarrollo local sin variable se permite
  const a = Buffer.from(provided);
  const b = Buffer.from(master);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Vercel Blob (la tienda de Blob puede ser publica o privada: se prueban ambas) ──
let blobAccess: 'private' | 'public' | null = null;

async function readJson<T>(path: string): Promise<T | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const modes: Array<'private' | 'public'> = blobAccess ? [blobAccess] : ['private', 'public'];
  for (const access of modes) {
    try {
      const r: any = await blobGet(path, { access, useCache: false });
      if (r === null) return null;
      if (r && r.statusCode === 200 && r.stream) {
        blobAccess = access;
        return JSON.parse(await new Response(r.stream).text()) as T;
      }
    } catch (_) { /* probar el otro modo */ }
  }
  return null;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta BLOB_READ_WRITE_TOKEN en el servidor');
  const modes: Array<'private' | 'public'> = blobAccess ? [blobAccess] : ['private', 'public'];
  let lastErr: any;
  for (const access of modes) {
    try {
      await blobPut(path, JSON.stringify(data), { access, contentType: 'application/json', allowOverwrite: true, addRandomSuffix: false });
      blobAccess = access;
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No se pudo guardar');
}

const CATALOGO_PATH = 'tienda/catalogo.json';
// El nombre del archivo lleva una firma secreta: aunque alguien conozca el numero de pedido
// no puede adivinar la direccion del archivo (que trae nombre y domicilio del cliente).
const pedidoFirma = (id: string) => crypto
  .createHmac('sha256', `${process.env.BLOB_READ_WRITE_TOKEN || ''}|tienda`)
  .update(id).digest('hex').slice(0, 24);
const pedidoPath = (id: string) => `tienda/pedidos/${id}-${pedidoFirma(id)}.json`;

let catalogoCache: { data: Catalogo; at: number } | null = null;
async function readCatalogo(fresh = false): Promise<Catalogo> {
  if (!fresh && catalogoCache && Date.now() - catalogoCache.at < 60000) return catalogoCache.data;
  const raw = await readJson<Catalogo>(CATALOGO_PATH);
  const data: Catalogo = { productos: Array.isArray(raw?.productos) ? raw!.productos : [], config: { ...DEFAULT_CONFIG, ...(raw?.config || {}) } };
  catalogoCache = { data, at: Date.now() };
  return data;
}

async function readPedido(id: string): Promise<Pedido | null> {
  if (!/^DMG[0-9a-f]{16}$/.test(id)) return null;
  const p = await readJson<Pedido>(pedidoPath(id));
  if (p) return p;
  // Si la firma cambio (p. ej. se renovo el token de Blob) se busca el archivo por su prefijo
  try {
    const page: any = await blobList({ prefix: `tienda/pedidos/${id}-`, limit: 1 });
    const found = page.blobs?.[0]?.pathname;
    return found ? readJson<Pedido>(found) : null;
  } catch { return null; }
}
const savePedido = (p: Pedido) => writeJson(pedidoPath(p.id), p);

// ── Limpieza de lo que manda el admin ──
const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const money = (v: any) => { const n = Math.round(Number(v) * 100) / 100; return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000000) : 0; };
const httpsUrl = (v: any) => { const s = str(v, 1000); return /^https:\/\//i.test(s) ? s : ''; };

function sanitizeCatalogo(body: any): Catalogo | null {
  if (!body || !Array.isArray(body.productos)) return null;
  const productos: Producto[] = body.productos.slice(0, 100).map((p: any) => ({
    id: str(p.id, 60).replace(/[^a-zA-Z0-9_-]/g, '') || `p${Date.now().toString(36)}`,
    nombre: str(p.nombre, 120) || 'Producto',
    descripcion: str(p.descripcion, 2000),
    precio: money(p.precio),
    imagenes: (Array.isArray(p.imagenes) ? p.imagenes : []).map(httpsUrl).filter(Boolean).slice(0, 12),
    activo: !!p.activo,
    printfulId: Number(p.printfulId) || 0,
    variantes: (Array.isArray(p.variantes) ? p.variantes : []).slice(0, 200).map((v: any) => ({
      id: Number(v.id) || 0, nombre: str(v.nombre, 160), talla: str(v.talla, 40) || undefined, color: str(v.color, 60) || undefined,
      imagen: httpsUrl(v.imagen) || undefined, activo: v.activo !== false,
    })).filter((v: Variante) => v.id > 0),
  }));
  const c = body.config || {};
  return { productos, config: { envio: money(c.envio), envioGratisDesde: money(c.envioGratisDesde), autoConfirmar: !!c.autoConfirmar } };
}

// ── Printful ──
async function printful(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const token = (process.env.PRINTFUL_API_TOKEN || '').trim();
  if (!token) throw new Error('Falta PRINTFUL_API_TOKEN en Vercel');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const store = (process.env.PRINTFUL_STORE_ID || '').trim();
  if (store) headers['X-PF-Store-Id'] = store;
  const r = await fetch(`https://api.printful.com${path}`, {
    method: init.method || 'GET', headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Printful ${r.status}: ${j?.error?.message || j?.result || 'error'}`);
  return j.result;
}

async function importarPrintful(): Promise<Producto[]> {
  const lista: any[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const page = await printful(`/store/products?limit=100&offset=${offset}`);
    if (!Array.isArray(page) || page.length === 0) break;
    lista.push(...page);
    if (page.length < 100) break;
  }
  const productos: Producto[] = [];
  for (const sp of lista) {
    const det = await printful(`/store/products/${sp.id}`);
    const variantes: Variante[] = (det?.sync_variants || []).filter((v: any) => !v.is_ignored).map((v: any) => {
      const preview = (v.files || []).find((f: any) => f.type === 'preview')?.preview_url || v.product?.image;
      return { id: v.id, nombre: String(v.name || ''), talla: v.size || undefined, color: v.color || undefined, imagen: preview || undefined, activo: v.availability_status !== 'discontinued' };
    });
    productos.push({
      id: `pf${sp.id}`, nombre: String(sp.name || 'Producto'), descripcion: '', precio: 0,
      imagenes: sp.thumbnail_url ? [sp.thumbnail_url] : [], activo: false, printfulId: sp.id, variantes,
    });
  }
  return productos;
}

async function enviarAPrintful(p: Pedido, confirmar: boolean): Promise<Pedido> {
  try {
    // El webhook y la pagina de regreso pueden llegar casi juntos: si Printful ya tiene el pedido, no se duplica
    const existente = await printful(`/orders/@${p.id}`).catch(() => null);
    if (existente?.id) {
      p.printfulId = existente.id;
      p.printfulEstado = existente.status;
      p.estado = 'enviado_printful';
      p.error = undefined;
      return p;
    }
    const d = p.direccion;
    const result = await printful(`/orders?confirm=${confirmar ? 'true' : 'false'}`, {
      method: 'POST',
      body: {
        external_id: p.id,
        shipping: 'STANDARD',
        recipient: {
          name: d.nombre, address1: d.calle, address2: d.colonia || undefined, city: d.ciudad,
          state_code: d.estado, country_code: 'MX', zip: d.cp, email: d.email, phone: d.telefono,
        },
        items: p.items.map(i => ({ sync_variant_id: i.varianteId, quantity: i.cantidad })),
        retail_costs: { currency: 'MXN', subtotal: p.subtotal.toFixed(2), shipping: p.envio.toFixed(2), total: p.total.toFixed(2) },
      },
    });
    p.printfulId = result?.id;
    p.printfulEstado = result?.status;
    p.estado = 'enviado_printful';
    p.error = undefined;
  } catch (e: any) {
    p.estado = 'error_printful';
    p.error = String(e?.message || e).slice(0, 500);
  }
  return p;
}

// ── Mercado Pago ──
async function mercadoPago(path: string, init: { method?: string; body?: unknown; idem?: string } = {}): Promise<any> {
  const token = (process.env.MP_ACCESS_TOKEN || '').trim();
  if (!token) throw new Error('Falta MP_ACCESS_TOKEN en Vercel');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (init.idem) headers['X-Idempotency-Key'] = init.idem;
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    method: init.method || 'GET', headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago ${r.status}: ${j?.message || 'error'}`);
  return j;
}

async function notifyTelegram(text: string): Promise<void> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chat = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (_) { /* el aviso es opcional */ }
}

// Revisa un pago en la API de Mercado Pago (nunca se confia en lo que llega al webhook) y, si esta
// aprobado y cubre el total del pedido, lo marca pagado y lo manda a Printful.
async function procesarPago(paymentId: string): Promise<string> {
  const pago = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`);
  const pedido = await readPedido(String(pago?.external_reference || ''));
  if (!pedido) return 'pedido no encontrado';
  pedido.mpPaymentId = String(pago.id);
  pedido.mpEstado = String(pago.status);
  if (pedido.estado !== 'pendiente_pago') { return `ya procesado (${pedido.estado})`; }
  if (pago.status !== 'approved') { await savePedido(pedido); return `pago ${pago.status}`; }
  if (pago.currency_id !== 'MXN' || Number(pago.transaction_amount) + 0.01 < pedido.total) {
    pedido.error = `Monto pagado (${pago.transaction_amount} ${pago.currency_id}) no cubre el total ${pedido.total} MXN`;
    await savePedido(pedido);
    await notifyTelegram(`⚠️ Pedido ${pedido.id}: ${pedido.error}`);
    return 'monto incorrecto';
  }
  pedido.estado = 'pagado';
  pedido.pagado = Date.now();
  await savePedido(pedido);
  const { config } = await readCatalogo(true);
  const enviado = await enviarAPrintful(pedido, config.autoConfirmar);
  await savePedido(enviado);
  const resumen = pedido.items.map(i => `• ${i.cantidad} × ${i.nombre} (${i.variante})`).join('\n');
  await notifyTelegram(
    `🛒 Nueva venta: $${pedido.total.toFixed(2)} MXN\n${resumen}\n${pedido.direccion.nombre} — ${pedido.direccion.ciudad}, ${ESTADOS_MX[pedido.direccion.estado] || pedido.direccion.estado}\n` +
    (enviado.estado === 'enviado_printful'
      ? (config.autoConfirmar ? 'Printful ya lo está fabricando.' : 'Quedó como borrador en Printful: confírmalo en /admin/tienda.')
      : `❌ No se pudo mandar a Printful: ${enviado.error}`)
  );
  return enviado.estado;
}

// Limite simple por IP para crear pedidos
const checkoutMap = new Map<string, { count: number; resetAt: number }>();
function allowCheckout(ip: string): boolean {
  const now = Date.now();
  const e = checkoutMap.get(ip);
  if (!e || now > e.resetAt) { checkoutMap.set(ip, { count: 1, resetAt: now + 3600000 }); return true; }
  e.count++;
  return e.count <= 6;
}
// Tope general por instancia: cada intento crea un archivo en Blob y el plan gratis limita las escrituras
let checkoutsHora = { count: 0, resetAt: 0 };
function allowCheckoutGlobal(): boolean {
  const now = Date.now();
  if (now > checkoutsHora.resetAt) checkoutsHora = { count: 0, resetAt: now + 3600000 };
  return ++checkoutsHora.count <= 60;
}

const publicPedido = (p: Pedido) => ({
  id: p.id, estado: p.estado, total: p.total, creado: p.creado,
  items: p.items.map(i => ({ nombre: i.nombre, variante: i.variante, cantidad: i.cantidad, imagen: i.imagen })),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const op = String(req.query.op || '');
  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  try {
    // ── Webhook de Mercado Pago (servidor a servidor) ──
    if (op === 'webhook') {
      const type = String(req.query.type || req.query.topic || body.type || body.topic || '');
      const id = String(req.query['data.id'] || body?.data?.id || (type === 'payment' ? req.query.id : '') || '');
      if (type === 'payment' && /^\d+$/.test(id)) {
        try { console.log('[tienda] webhook', id, await procesarPago(id)); }
        catch (e: any) { console.error('[tienda] webhook error:', e?.message); return res.status(500).json({ error: 'reintentar' }); }
      }
      return res.status(200).json({ ok: true });
    }

    // ── Publico ──
    if (req.method === 'GET' && op === 'productos') {
      const { productos, config } = await readCatalogo();
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      return res.status(200).json({
        productos: productos.filter(p => p.activo && p.precio > 0).map(p => ({ ...p, variantes: p.variantes.filter(v => v.activo) })).filter(p => p.variantes.length > 0),
        config: { envio: config.envio, envioGratisDesde: config.envioGratisDesde },
        estados: ESTADOS_MX,
      });
    }

    if (req.method === 'GET' && op === 'pedido') {
      const pedido = await readPedido(String(req.query.id || ''));
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      // Al volver de Mercado Pago el webhook puede tardar: se revisa el pago aqui tambien
      const pid = String(req.query.payment_id || '');
      if (pedido.estado === 'pendiente_pago' && /^\d+$/.test(pid)) {
        try { await procesarPago(pid); } catch (_) { /* el webhook lo volvera a intentar */ }
        const again = await readPedido(pedido.id);
        if (again) return res.status(200).json(publicPedido(again));
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(publicPedido(pedido));
    }

    if (req.method === 'POST' && op === 'checkout') {
      if (!allowCheckout(clientIp(req)) || !allowCheckoutGlobal()) return res.status(429).json({ error: 'Demasiados intentos, espera un rato.' });

      const d = body.direccion || {};
      const direccion: Direccion = {
        nombre: str(d.nombre, 100), email: str(d.email, 120), telefono: str(d.telefono, 20).replace(/[^\d+]/g, ''),
        calle: str(d.calle, 120), colonia: str(d.colonia, 100), ciudad: str(d.ciudad, 80), estado: str(d.estado, 3).toUpperCase(), cp: str(d.cp, 5),
      };
      if (!direccion.nombre || !direccion.calle || !direccion.ciudad) return res.status(400).json({ error: 'Completa nombre, calle y ciudad' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direccion.email)) return res.status(400).json({ error: 'Correo inválido' });
      if (!/^\d{5}$/.test(direccion.cp)) return res.status(400).json({ error: 'El código postal debe tener 5 dígitos' });
      if (!ESTADOS_MX[direccion.estado]) return res.status(400).json({ error: 'Elige tu estado' });
      if (direccion.telefono.replace(/\D/g, '').length < 10) return res.status(400).json({ error: 'Teléfono de 10 dígitos' });

      const { productos, config } = await readCatalogo(true);
      const pedidoItems: Pedido['items'] = [];
      for (const it of (Array.isArray(body.items) ? body.items : []).slice(0, 30)) {
        const prod = productos.find(p => p.id === String(it.productoId) && p.activo && p.precio > 0);
        const vari = prod?.variantes.find(v => v.id === Number(it.varianteId) && v.activo);
        const cantidad = Math.max(1, Math.min(10, Math.floor(Number(it.cantidad) || 1)));
        if (!prod || !vari) return res.status(400).json({ error: 'Un producto del carrito ya no está disponible. Actualiza la página.' });
        pedidoItems.push({
          productoId: prod.id, varianteId: vari.id, nombre: prod.nombre,
          variante: [vari.color, vari.talla].filter(Boolean).join(' / ') || vari.nombre,
          cantidad, precio: prod.precio, imagen: vari.imagen || prod.imagenes[0],
        });
      }
      if (pedidoItems.length === 0) return res.status(400).json({ error: 'El carrito está vacío' });

      const subtotal = Math.round(pedidoItems.reduce((s, i) => s + i.precio * i.cantidad, 0) * 100) / 100;
      const envio = config.envioGratisDesde > 0 && subtotal >= config.envioGratisDesde ? 0 : config.envio;
      const pedido: Pedido = {
        id: `DMG${crypto.randomBytes(8).toString('hex')}`, creado: Date.now(), estado: 'pendiente_pago',
        items: pedidoItems, subtotal, envio, total: Math.round((subtotal + envio) * 100) / 100, direccion,
      };

      const [nom, ...ape] = direccion.nombre.split(/\s+/);
      const tel = direccion.telefono.replace(/\D/g, '').slice(-10);
      const pref = await mercadoPago('/checkout/preferences', {
        method: 'POST', idem: pedido.id,
        body: {
          items: [
            ...pedidoItems.map(i => ({
              id: `${i.productoId}-${i.varianteId}`, title: `${i.nombre} (${i.variante})`.slice(0, 250), quantity: i.cantidad,
              unit_price: i.precio, currency_id: 'MXN', picture_url: i.imagen, category_id: 'fashion',
            })),
            ...(envio > 0 ? [{ id: 'envio', title: 'Envío a domicilio', quantity: 1, unit_price: envio, currency_id: 'MXN' }] : []),
          ],
          payer: { name: nom, surname: ape.join(' ') || undefined, email: direccion.email, phone: { area_code: '52', number: tel } },
          external_reference: pedido.id,
          back_urls: {
            success: `${BASE}/tienda?pedido=${pedido.id}`,
            pending: `${BASE}/tienda?pedido=${pedido.id}`,
            failure: `${BASE}/tienda?pedido=${pedido.id}&fallo=1`,
          },
          auto_return: 'approved',
          notification_url: `${BASE}/api/tienda?op=webhook`,
          statement_descriptor: 'DIOSMASGYM',
          expires: true,
          expiration_date_to: new Date(Date.now() + 3 * 24 * 3600000).toISOString(),
        },
      });
      pedido.mpPreferenceId = pref.id;
      await savePedido(pedido);
      return res.status(200).json({ id: pedido.id, url: pref.init_point });
    }

    // ── Admin ──
    const ip = clientIp(req);
    const fails = adminFails.get(ip);
    if (fails && Date.now() < fails.resetAt && fails.count >= 5) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
    if (!isAdmin(req)) {
      const now = Date.now();
      if (!fails || now > fails.resetAt) adminFails.set(ip, { count: 1, resetAt: now + 15 * 60000 });
      else fails.count++;
      return res.status(401).json({ error: 'No autorizado' });
    }
    adminFails.delete(ip);

    if (req.method === 'GET' && op === 'admin') {
      const catalogo = await readCatalogo(true);
      return res.status(200).json({
        ...catalogo,
        estados: ESTADOS_MX,
        configurado: {
          mercadoPago: !!process.env.MP_ACCESS_TOKEN,
          mercadoPagoPrueba: String(process.env.MP_ACCESS_TOKEN || '').trim().startsWith('TEST-'),
          printful: !!process.env.PRINTFUL_API_TOKEN,
          printfulStore: !!process.env.PRINTFUL_STORE_ID,
          blob: !!process.env.BLOB_READ_WRITE_TOKEN,
          telegram: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID,
        },
      });
    }

    if (req.method === 'GET' && op === 'pedidos') {
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const page: any = await blobList({ prefix: 'tienda/pedidos/', cursor, limit: 1000 });
        for (const b of page.blobs || []) { const m = String(b.pathname).match(/(DMG[0-9a-f]{16})-[0-9a-f]{24}\.json$/); if (m) ids.push(m[1]); }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor && ids.length < 2000);
      const pedidos = (await Promise.all(ids.map(id => readPedido(id)))).filter(Boolean) as Pedido[];
      pedidos.sort((a, b) => b.creado - a.creado);
      const soloPagados = req.query.todos !== '1';
      return res.status(200).json({ pedidos: soloPagados ? pedidos.filter(p => p.estado !== 'pendiente_pago').slice(0, 300) : pedidos.slice(0, 300) });
    }

    if (req.method === 'POST' && op === 'guardar') {
      const catalogo = sanitizeCatalogo(body);
      if (!catalogo) return res.status(400).json({ error: 'Datos inválidos' });
      await writeJson(CATALOGO_PATH, catalogo);
      catalogoCache = { data: catalogo, at: Date.now() };
      return res.status(200).json({ success: true });
    }

    if (req.method === 'POST' && op === 'importar') {
      return res.status(200).json({ productos: await importarPrintful() });
    }

    if (req.method === 'POST' && (op === 'reenviar' || op === 'confirmar' || op === 'revisar-pago')) {
      const pedido = await readPedido(String(body.id || ''));
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      if (op === 'revisar-pago') {
        if (!pedido.mpPaymentId && !/^\d+$/.test(String(body.paymentId || ''))) return res.status(400).json({ error: 'Escribe el número de operación de Mercado Pago' });
        const estado = await procesarPago(String(body.paymentId || pedido.mpPaymentId));
        return res.status(200).json({ estado, pedido: await readPedido(pedido.id) });
      }
      if (op === 'reenviar') {
        if (pedido.estado !== 'error_printful' && pedido.estado !== 'pagado') return res.status(400).json({ error: 'Solo se reenvían pedidos pagados que fallaron' });
        const { config } = await readCatalogo(true);
        await enviarAPrintful(pedido, config.autoConfirmar);
      } else {
        if (!pedido.printfulId) return res.status(400).json({ error: 'El pedido no está en Printful' });
        const r = await printful(`/orders/${pedido.printfulId}/confirm`, { method: 'POST' });
        pedido.printfulEstado = r?.status;
      }
      await savePedido(pedido);
      return res.status(200).json({ pedido });
    }

    if (req.method === 'POST' && op === 'cancelar') {
      const pedido = await readPedido(String(body.id || ''));
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      pedido.estado = 'cancelado';
      await savePedido(pedido);
      return res.status(200).json({ pedido });
    }

    if (req.method === 'POST' && op === 'estado-printful') {
      const pedido = await readPedido(String(body.id || ''));
      if (!pedido?.printfulId) return res.status(404).json({ error: 'El pedido no está en Printful' });
      const r = await printful(`/orders/${pedido.printfulId}`);
      pedido.printfulEstado = r?.status;
      await savePedido(pedido);
      return res.status(200).json({ pedido, envios: (r?.shipments || []).map((s: any) => ({ paqueteria: s.carrier, guia: s.tracking_number, url: s.tracking_url })) });
    }

    return res.status(400).json({ error: 'Operación desconocida' });
  } catch (e: any) {
    console.error('[tienda]', op, e?.message);
    return res.status(500).json({ error: e?.message || 'Error interno' });
  }
}
