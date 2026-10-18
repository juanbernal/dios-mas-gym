import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Tienda de merch: productos de Printful con precio en pesos, carrito guardado en el navegador
// y pago con Mercado Pago (tarjeta, OXXO o saldo). El servidor recalcula todo el precio.

interface Variante { id: number; nombre: string; talla?: string; color?: string; imagen?: string }
interface Producto { id: string; nombre: string; descripcion: string; precio: number; imagenes: string[]; variantes: Variante[] }
interface CartItem { productoId: string; varianteId: number; cantidad: number }
interface PedidoPublico { id: string; estado: string; total: number; items: { nombre: string; variante: string; cantidad: number; imagen?: string }[] }

const CART_KEY = 'dmg_tienda_carrito';
const DATOS_KEY = 'dmg_tienda_datos';
const mxn = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MXN`;
const leer = <T,>(k: string, def: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const inp = 'w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-3 text-sm text-white placeholder-white/30 focus:border-[#4a90d9] focus:outline-none';

const CartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" />
  </svg>
);
const TruckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" />
  </svg>
);

const unicos = (xs: (string | undefined)[]) => Array.from(new Set(xs.filter(Boolean) as string[]));

// ── Ficha de producto: colores, tallas y cantidad ──
const ProductoModal: React.FC<{ p: Producto; onClose: () => void; onAdd: (item: CartItem) => void }> = ({ p, onClose, onAdd }) => {
  const colores = unicos(p.variantes.map(v => v.color));
  const [color, setColor] = useState(colores[0] || '');
  const tallas = unicos(p.variantes.filter(v => !color || v.color === color).map(v => v.talla));
  const [talla, setTalla] = useState(tallas.length === 1 ? tallas[0] : '');
  const [cantidad, setCantidad] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => { if (talla && !tallas.includes(talla)) setTalla(tallas.length === 1 ? tallas[0] : ''); }, [color]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const variante = p.variantes.find(v => (!colores.length || v.color === color) && (!tallas.length || v.talla === talla))
    || (p.variantes.length === 1 ? p.variantes[0] : undefined);
  const imagenes = unicos([variante?.imagen || p.variantes.find(v => v.color === color)?.imagen, ...p.imagenes]);
  const img = imagenes[Math.min(imgIdx, imagenes.length - 1)];

  return (
    <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={p.nombre}>
      <div className="w-full md:max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0b0f17] border border-white/10 rounded-t-[2rem] md:rounded-[2rem] grid md:grid-cols-2" onClick={e => e.stopPropagation()}>
        <div className="relative bg-white/[0.03]">
          {img ? <img src={img} alt={p.nombre} className="w-full aspect-square max-h-[45vh] md:max-h-none object-contain" /> : <div className="w-full aspect-square flex items-center justify-center"><i className="fas fa-shirt text-6xl text-white/10"></i></div>}
          {imagenes.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {imagenes.map((u, i) => (
                <button key={u} onClick={() => setImgIdx(i)} className={`w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-[#4a90d9]' : 'border-transparent'}`}>
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center md:hidden"><i className="fas fa-xmark"></i></button>
        </div>
        <div className="p-6 md:p-8 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">{p.nombre}</h2>
              <p className="text-xl font-black text-[#4a90d9] mt-1">{mxn(p.precio)}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="hidden md:flex w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white items-center justify-center flex-shrink-0"><i className="fas fa-xmark"></i></button>
          </div>
          {p.descripcion && <p className="text-sm text-white/60 whitespace-pre-line leading-relaxed">{p.descripcion}</p>}

          {colores.length > 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-2">Color: <span className="text-white">{color}</span></p>
              <div className="flex flex-wrap gap-2">
                {colores.map(c => (
                  <button key={c} onClick={() => { setColor(c); setImgIdx(0); }} className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${c === color ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:border-white/30'}`}>{c}</button>
                ))}
              </div>
            </div>
          )}
          {tallas.length > 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-2">Talla</p>
              <div className="flex flex-wrap gap-2">
                {tallas.map(t => (
                  <button key={t} onClick={() => setTalla(t)} className={`min-w-[3rem] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${t === talla ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:border-white/30'}`}>{t}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/5">
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))} aria-label="Menos" className="w-11 h-11 text-white/70 hover:text-white"><i className="fas fa-minus text-xs"></i></button>
              <span className="w-8 text-center text-white font-bold tabular-nums">{cantidad}</span>
              <button onClick={() => setCantidad(c => Math.min(10, c + 1))} aria-label="Más" className="w-11 h-11 text-white/70 hover:text-white"><i className="fas fa-plus text-xs"></i></button>
            </div>
            <button
              disabled={!variante}
              onClick={() => variante && onAdd({ productoId: p.id, varianteId: variante.id, cantidad })}
              className="flex-1 h-11 rounded-xl bg-[#4a90d9] hover:bg-[#5ea0e6] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-[0.15em] inline-flex items-center justify-center gap-2"
            >
              <CartIcon className="w-4 h-4" />{variante ? 'Agregar al carrito' : 'Elige tu talla'}
            </button>
          </div>
          <p className="text-[11px] text-white/40 flex items-center gap-2"><TruckIcon className="w-4 h-4 flex-shrink-0" />Se fabrica bajo pedido y se envía a todo México.</p>
        </div>
      </div>
    </div>
  );
};

// ── Pantalla al volver de Mercado Pago ──
const EstadoPedido: React.FC<{ id: string; fallo: boolean; paymentId: string; onSeguir: () => void; onPagado: () => void }> = ({ id, fallo, paymentId, onSeguir, onPagado }) => {
  const [pedido, setPedido] = useState<PedidoPublico | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    let intentos = 0;
    const revisar = async () => {
      try {
        const r = await fetch(`/api/tienda?op=pedido&id=${encodeURIComponent(id)}${paymentId ? `&payment_id=${encodeURIComponent(paymentId)}` : ''}`);
        const j = await r.json();
        if (!vivo) return;
        if (!r.ok) { setError(j.error || 'No se encontró el pedido'); return; }
        setPedido(j);
        if (j.estado !== 'pendiente_pago') { onPagado(); return; }
      } catch { /* reintentar */ }
      if (vivo && !fallo && ++intentos < 12) setTimeout(revisar, 5000);
    };
    revisar();
    return () => { vivo = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagado = pedido && pedido.estado !== 'pendiente_pago' && pedido.estado !== 'cancelado';
  return (
    <div className="max-w-xl mx-auto px-5 py-16 text-center">
      {error ? (
        <><i className="fas fa-triangle-exclamation text-4xl text-amber-400 mb-4 block"></i><h1 className="text-2xl font-black text-white mb-2">{error}</h1></>
      ) : !pedido ? (
        <i className="fas fa-spinner fa-spin text-3xl text-[#4a90d9]"></i>
      ) : pagado ? (
        <>
          <i className="fas fa-circle-check text-5xl text-emerald-400 mb-4 block"></i>
          <h1 className="text-3xl font-black text-white mb-2">¡Gracias por tu compra!</h1>
          <p className="text-white/60 text-sm mb-6">Tu pago se recibió. Ya estamos preparando tu pedido y te llegará un correo cuando se envíe.</p>
        </>
      ) : fallo ? (
        <>
          <i className="fas fa-triangle-exclamation text-5xl text-amber-400 mb-4 block"></i>
          <h1 className="text-2xl font-black text-white mb-2">El pago no se completó</h1>
          <p className="text-white/60 text-sm mb-6">No se hizo ningún cargo. Tu carrito sigue guardado para que lo intentes de nuevo.</p>
        </>
      ) : (
        <>
          <i className="fas fa-spinner fa-spin text-4xl text-[#4a90d9] mb-4 block"></i>
          <h1 className="text-2xl font-black text-white mb-2">Esperando tu pago</h1>
          <p className="text-white/60 text-sm mb-6">Si pagaste con tarjeta, se confirma en unos segundos. Si elegiste OXXO, tu pedido se procesa en cuanto pagues en tienda (puede tardar hasta 48 horas en reflejarse).</p>
        </>
      )}
      {pedido && (
        <div className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-6 space-y-3">
          {pedido.items.map((i, k) => (
            <div key={k} className="flex items-center gap-3">
              {i.imagen && <img src={i.imagen} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5" />}
              <div className="min-w-0 flex-1"><p className="text-sm text-white font-bold truncate">{i.nombre}</p><p className="text-[11px] text-white/45">{i.variante} · {i.cantidad} pz</p></div>
            </div>
          ))}
          <p className="text-right text-sm text-white font-black pt-2 border-t border-white/10">Total {mxn(pedido.total)}</p>
          <p className="text-[10px] text-white/30">Pedido {pedido.id}</p>
        </div>
      )}
      <button onClick={onSeguir} className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.15em]">Volver a la tienda</button>
    </div>
  );
};

const TiendaView: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const pedidoId = params.get('pedido') || '';

  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [envioBase, setEnvioBase] = useState(0);
  const [envioGratisDesde, setEnvioGratisDesde] = useState(0);
  const [estados, setEstados] = useState<Record<string, string>>({});
  const [errorCarga, setErrorCarga] = useState('');
  const [abierto, setAbierto] = useState<Producto | null>(null);
  const [carrito, setCarrito] = useState<CartItem[]>(() => leer<CartItem[]>(CART_KEY, []));
  const [panel, setPanel] = useState<'cerrado' | 'carrito' | 'datos'>('cerrado');
  const [datos, setDatos] = useState(() => leer(DATOS_KEY, { nombre: '', email: '', telefono: '', calle: '', colonia: '', ciudad: '', estado: '', cp: '' }));
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => { document.title = 'Tienda oficial | Diosmasgym'; }, []);
  useEffect(() => {
    fetch('/api/tienda?op=productos')
      .then(r => r.json())
      .then(j => { setProductos(j.productos || []); setEnvioBase(j.config?.envio || 0); setEnvioGratisDesde(j.config?.envioGratisDesde || 0); setEstados(j.estados || {}); })
      .catch(() => { setProductos([]); setErrorCarga('No se pudo cargar la tienda. Intenta de nuevo en un momento.'); });
  }, []);
  useEffect(() => { guardar(CART_KEY, carrito); }, [carrito]);

  // Solo cuentan los productos del carrito que siguen a la venta
  const lineas = useMemo(() => {
    if (!productos) return [];
    return carrito.map(c => {
      const p = productos.find(x => x.id === c.productoId);
      const v = p?.variantes.find(x => x.id === c.varianteId);
      return p && v ? { ...c, p, v } : null;
    }).filter(Boolean) as (CartItem & { p: Producto; v: Variante })[];
  }, [carrito, productos]);
  const piezas = lineas.reduce((s, l) => s + l.cantidad, 0);
  const subtotal = lineas.reduce((s, l) => s + l.p.precio * l.cantidad, 0);
  const envio = envioGratisDesde > 0 && subtotal >= envioGratisDesde ? 0 : envioBase;

  const agregar = (item: CartItem) => {
    setCarrito(prev => {
      const i = prev.findIndex(x => x.productoId === item.productoId && x.varianteId === item.varianteId);
      if (i < 0) return [...prev, item];
      const next = [...prev];
      next[i] = { ...next[i], cantidad: Math.min(10, next[i].cantidad + item.cantidad) };
      return next;
    });
    setAbierto(null);
    setAviso('Agregado al carrito');
    setTimeout(() => setAviso(''), 2200);
  };
  const cambiar = (varianteId: number, productoId: string, delta: number) => setCarrito(prev => prev
    .map(x => x.varianteId === varianteId && x.productoId === productoId ? { ...x, cantidad: Math.min(10, x.cantidad + delta) } : x)
    .filter(x => x.cantidad > 0));

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPago('');
    setPagando(true);
    guardar(DATOS_KEY, datos);
    try {
      const r = await fetch('/api/tienda?op=checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lineas.map(l => ({ productoId: l.productoId, varianteId: l.varianteId, cantidad: l.cantidad })), direccion: datos }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'No se pudo iniciar el pago');
      window.location.href = j.url;
    } catch (err: any) {
      setErrorPago(err?.message || 'No se pudo iniciar el pago');
      setPagando(false);
    }
  };

  if (pedidoId) {
    return (
      <div className="min-h-screen bg-[#05070a]">
        <EstadoPedido
          id={pedidoId}
          fallo={params.get('fallo') === '1'}
          paymentId={params.get('payment_id') || params.get('collection_id') || ''}
          onPagado={() => setCarrito([])}
          onSeguir={() => setParams({})}
        />
      </div>
    );
  }

  const set = (k: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDatos(d => ({ ...d, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#05070a]">
      <header className="max-w-[1400px] mx-auto px-5 md:px-16 pt-10 md:pt-16 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#4a90d9] mb-3">Merch oficial</p>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.95] tracking-tight">Vístete con<br className="hidden md:block" /> propósito</h1>
          <p className="text-white/55 text-sm md:text-base mt-4 max-w-lg">Gorras y ropa oficial de Diosmasgym. Cada pieza se hace bajo pedido y se envía a todo México.</p>
        </div>
        <button onClick={() => setPanel('carrito')} className="self-start md:self-auto inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-bold">
          <CartIcon className="w-5 h-5" />Carrito
          <span className="min-w-[1.5rem] h-6 px-1.5 rounded-full bg-[#4a90d9] text-black text-xs font-black flex items-center justify-center tabular-nums">{piezas}</span>
        </button>
      </header>

      <section className="max-w-[1400px] mx-auto px-5 md:px-16 pb-24">
        {productos === null ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[0, 1, 2, 3].map(i => <div key={i} className="aspect-[4/5] rounded-3xl bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#4a90d9]/10 to-transparent p-10 md:p-16 text-center">
            <i className="fas fa-shirt text-5xl text-[#4a90d9]/40 mb-5 block"></i>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{errorCarga ? 'Tienda no disponible' : 'Muy pronto'}</h2>
            <p className="text-white/55 text-sm max-w-md mx-auto mb-6">{errorCarga || 'Estamos preparando la primera colección de gorras y playeras oficiales. Síguenos en redes para enterarte del lanzamiento.'}</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.15em]">Escuchar la música</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {productos.map(p => {
              const img = p.imagenes[0] || p.variantes[0]?.imagen;
              const colores = unicos(p.variantes.map(v => v.color)).length;
              return (
                <button key={p.id} onClick={() => setAbierto(p)} aria-label={`${p.nombre}, ${mxn(p.precio)}`} className="group text-left rounded-3xl border border-white/10 bg-white/[0.03] hover:border-[#4a90d9]/50 overflow-hidden transition-colors">
                  <div className="aspect-square bg-white/[0.04] overflow-hidden">
                    {img ? <img src={img} alt={p.nombre} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><i className="fas fa-shirt text-5xl text-white/10"></i></div>}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm md:text-base font-bold text-white leading-snug line-clamp-2">{p.nombre}</h3>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-sm md:text-base font-black text-[#4a90d9]">{mxn(p.precio)}</span>
                      {colores > 1 && <span className="text-[10px] text-white/40">{colores} colores</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {abierto && <ProductoModal p={abierto} onClose={() => setAbierto(null)} onAdd={agregar} />}

      {aviso && (
        <div className="fixed bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-[6100] px-5 py-3 rounded-full bg-white text-black text-xs font-black shadow-2xl flex items-center gap-3">
          <i className="fas fa-circle-check text-emerald-600"></i>{aviso}
          <button onClick={() => { setAviso(''); setPanel('carrito'); }} className="underline">Ver carrito</button>
        </div>
      )}

      {/* Boton flotante del carrito en movil */}
      {piezas > 0 && panel === 'cerrado' && (
        <button onClick={() => setPanel('carrito')} aria-label={`Carrito, ${piezas} piezas`} className="md:hidden fixed right-5 bottom-28 z-[1500] w-14 h-14 rounded-full bg-[#4a90d9] text-black shadow-2xl flex items-center justify-center">
          <CartIcon className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center">{piezas}</span>
        </button>
      )}

      {panel !== 'cerrado' && (
        <div className="fixed inset-0 z-[6000] bg-black/70 backdrop-blur-sm flex justify-end" onClick={() => !pagando && setPanel('cerrado')}>
          <aside className="w-full max-w-md h-full bg-[#0b0f17] border-l border-white/10 flex flex-col" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Carrito">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {panel === 'datos' && <button onClick={() => setPanel('carrito')} aria-label="Regresar" className="w-9 h-9 rounded-full bg-white/5 text-white"><i className="fas fa-arrow-left text-xs"></i></button>}
                <h2 className="text-lg font-black text-white">{panel === 'carrito' ? 'Tu carrito' : 'Datos de envío'}</h2>
              </div>
              <button onClick={() => setPanel('cerrado')} disabled={pagando} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-white/5 text-white"><i className="fas fa-xmark"></i></button>
            </div>

            {panel === 'carrito' ? (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {lineas.length === 0 ? (
                    <div className="text-center py-16"><CartIcon className="w-10 h-10 text-white/15 mx-auto mb-3" /><p className="text-white/50 text-sm">Tu carrito está vacío.</p></div>
                  ) : lineas.map(l => (
                    <div key={`${l.productoId}-${l.varianteId}`} className="flex gap-3">
                      <img src={l.v.imagen || l.p.imagenes[0]} alt="" className="w-20 h-20 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-snug">{l.p.nombre}</p>
                        <p className="text-[11px] text-white/45">{[l.v.color, l.v.talla].filter(Boolean).join(' / ')}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center rounded-lg border border-white/10">
                            <button onClick={() => cambiar(l.varianteId, l.productoId, -1)} aria-label="Menos" className="w-8 h-8 text-white/70"><i className={`fas ${l.cantidad === 1 ? 'fa-trash' : 'fa-minus'} text-[10px]`}></i></button>
                            <span className="w-6 text-center text-white text-sm font-bold tabular-nums">{l.cantidad}</span>
                            <button onClick={() => cambiar(l.varianteId, l.productoId, 1)} aria-label="Más" className="w-8 h-8 text-white/70"><i className="fas fa-plus text-[10px]"></i></button>
                          </div>
                          <span className="text-sm font-black text-white">{mxn(l.p.precio * l.cantidad)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {lineas.length > 0 && (
                  <div className="p-5 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-sm text-white/60"><span>Subtotal</span><span>{mxn(subtotal)}</span></div>
                    <div className="flex justify-between text-sm text-white/60"><span>Envío</span><span>{envio === 0 ? 'Gratis' : mxn(envio)}</span></div>
                    {envioGratisDesde > 0 && envio > 0 && <p className="text-[11px] text-emerald-300/80">Te faltan {mxn(envioGratisDesde - subtotal)} para envío gratis.</p>}
                    <div className="flex justify-between text-lg font-black text-white pt-2"><span>Total</span><span>{mxn(subtotal + envio)}</span></div>
                    <button onClick={() => setPanel('datos')} className="w-full mt-2 h-12 rounded-xl bg-[#4a90d9] hover:bg-[#5ea0e6] text-black font-black text-xs uppercase tracking-[0.15em]">Continuar</button>
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={pagar} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  <input required value={datos.nombre} onChange={set('nombre')} placeholder="Nombre completo" autoComplete="name" className={inp} />
                  <input required type="email" value={datos.email} onChange={set('email')} placeholder="Correo electrónico" autoComplete="email" className={inp} />
                  <input required type="tel" inputMode="tel" value={datos.telefono} onChange={set('telefono')} placeholder="Teléfono (10 dígitos)" autoComplete="tel" className={inp} />
                  <input required value={datos.calle} onChange={set('calle')} placeholder="Calle y número" autoComplete="address-line1" className={inp} />
                  <input value={datos.colonia} onChange={set('colonia')} placeholder="Colonia" autoComplete="address-line2" className={inp} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={datos.ciudad} onChange={set('ciudad')} placeholder="Ciudad o municipio" autoComplete="address-level2" className={inp} />
                    <input required inputMode="numeric" pattern="\d{5}" maxLength={5} value={datos.cp} onChange={set('cp')} placeholder="C.P." autoComplete="postal-code" className={inp} />
                  </div>
                  <select required value={datos.estado} onChange={set('estado')} className={`${inp} ${datos.estado ? '' : 'text-white/30'}`}>
                    <option value="">Estado</option>
                    {Object.entries(estados).sort((a, b) => a[1].localeCompare(b[1])).map(([k, v]) => <option key={k} value={k} className="text-black">{v}</option>)}
                  </select>
                  {errorPago && <p className="text-sm text-red-400 flex items-start gap-2"><i className="fas fa-triangle-exclamation mt-0.5"></i>{errorPago}</p>}
                </div>
                <div className="p-5 border-t border-white/10 space-y-3">
                  <div className="flex justify-between text-lg font-black text-white"><span>Total</span><span>{mxn(subtotal + envio)}</span></div>
                  <button type="submit" disabled={pagando || lineas.length === 0} className="w-full h-12 rounded-xl bg-[#009ee3] hover:bg-[#1aa9ea] disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.15em] inline-flex items-center justify-center gap-2">
                    {pagando ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-lock"></i>}
                    {pagando ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
                  </button>
                  <p className="text-[10px] text-white/35 text-center">Tarjeta de crédito o débito, OXXO o saldo de Mercado Pago. El pago se hace en la página segura de Mercado Pago.</p>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default TiendaView;
