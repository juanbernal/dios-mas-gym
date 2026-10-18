import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminHeaders } from '../../services/adminSync';

// Panel de la tienda: importar productos de Printful, ponerles precio en pesos, publicar,
// configurar el envío y revisar los pedidos (confirmarlos o reenviarlos a Printful).

interface Variante { id: number; nombre: string; talla?: string; color?: string; imagen?: string; activo: boolean }
interface Producto { id: string; nombre: string; descripcion: string; precio: number; imagenes: string[]; activo: boolean; printfulId: number; variantes: Variante[] }
interface Config { envio: number; envioGratisDesde: number; autoConfirmar: boolean }
interface Pedido {
  id: string; creado: number; estado: string; subtotal: number; envio: number; total: number;
  items: { nombre: string; variante: string; cantidad: number; precio: number; imagen?: string }[];
  direccion: { nombre: string; email: string; telefono: string; calle: string; colonia: string; ciudad: string; estado: string; cp: string };
  mpPaymentId?: string; mpEstado?: string; printfulId?: number; printfulEstado?: string; error?: string;
}
interface Configurado { mercadoPago: boolean; mercadoPagoPrueba: boolean; printful: boolean; printfulStore: boolean; blob: boolean; telegram: boolean }

const inp = 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#4a90d9] focus:outline-none';
const lbl = 'block text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-1.5';
const btn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-colors disabled:opacity-40';
const mxn = (n: number) => `$${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

const ESTADO: Record<string, { t: string; c: string }> = {
  pendiente_pago: { t: 'Esperando pago', c: 'bg-white/10 text-white/60' },
  pagado: { t: 'Pagado', c: 'bg-amber-500/15 text-amber-300' },
  enviado_printful: { t: 'En Printful', c: 'bg-emerald-500/15 text-emerald-300' },
  error_printful: { t: 'Error Printful', c: 'bg-red-500/15 text-red-300' },
  cancelado: { t: 'Cancelado', c: 'bg-white/5 text-white/40' },
};

const api = async (op: string, body?: unknown) => {
  const r = await fetch(`/api/tienda?op=${op}`, body === undefined
    ? { headers: adminHeaders() }
    : { method: 'POST', headers: adminHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
};

const TiendaAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [config, setConfig] = useState<Config>({ envio: 149, envioGratisDesde: 0, autoConfirmar: false });
  const [configurado, setConfigurado] = useState<Configurado | null>(null);
  const [estados, setEstados] = useState<Record<string, string>>({});
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [verTodos, setVerTodos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState('');
  const [cambios, setCambios] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [abiertoVar, setAbiertoVar] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Record<string, { paqueteria: string; guia: string; url: string }[]>>({});

  const aviso = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 5000); };

  const cargarPedidos = async (todos = verTodos) => {
    try { setPedidos((await api(`pedidos${todos ? '&todos=1' : ''}`)).pedidos || []); } catch (e: any) { aviso(e.message, false); }
  };
  const cargar = async () => {
    setCargando(true);
    try {
      const j = await api('admin');
      setProductos(j.productos || []); setConfig(j.config); setConfigurado(j.configurado); setEstados(j.estados || {});
      setCambios(false);
      await cargarPedidos();
    } catch (e: any) { aviso(e.message, false); } finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editar = (id: string, patch: Partial<Producto>) => { setProductos(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p)); setCambios(true); };

  const importar = async () => {
    setOcupado('importar');
    try {
      const nuevos: Producto[] = (await api('importar', {})).productos || [];
      // Se conserva lo que ya editaste (precio, nombre, descripcion, publicado) y se actualizan variantes e imagenes
      setProductos(prev => {
        const merged = nuevos.map(n => {
          const old = prev.find(p => p.printfulId === n.printfulId);
          if (!old) return n;
          return {
            ...old,
            imagenes: n.imagenes.length ? n.imagenes : old.imagenes,
            variantes: n.variantes.map(v => ({ ...v, activo: v.activo && (old.variantes.find(o => o.id === v.id)?.activo ?? true) })),
          };
        });
        const sueltos = prev.filter(p => !nuevos.some(n => n.printfulId === p.printfulId));
        return [...merged, ...sueltos];
      });
      setCambios(true);
      aviso(`${nuevos.length} productos leídos de Printful. Ponles precio, publícalos y guarda.`);
    } catch (e: any) { aviso(e.message, false); } finally { setOcupado(''); }
  };

  const guardarTodo = async () => {
    const sinPrecio = productos.filter(p => p.activo && !(p.precio > 0));
    if (sinPrecio.length) { aviso(`Ponle precio a: ${sinPrecio.map(p => p.nombre).join(', ')}`, false); return; }
    setOcupado('guardar');
    try { await api('guardar', { productos, config }); setCambios(false); aviso('Tienda guardada'); } catch (e: any) { aviso(e.message, false); } finally { setOcupado(''); }
  };

  const accion = async (op: string, id: string, extra: Record<string, unknown> = {}) => {
    setOcupado(`${op}-${id}`);
    try {
      const j = await api(op, { id, ...extra });
      if (j.pedido) setPedidos(ps => ps.map(p => p.id === id ? j.pedido : p));
      if (j.envios) setEnvios(e => ({ ...e, [id]: j.envios }));
      aviso(op === 'confirmar' ? 'Confirmado: Printful ya lo está fabricando' : op === 'reenviar' ? (j.pedido?.estado === 'enviado_printful' ? 'Enviado a Printful' : `No se pudo: ${j.pedido?.error}`) : op === 'revisar-pago' ? `Pago: ${j.estado}` : 'Listo', op !== 'reenviar' || j.pedido?.estado === 'enviado_printful');
    } catch (e: any) { aviso(e.message, false); } finally { setOcupado(''); }
  };

  const Check: React.FC<{ ok?: boolean; label: string; hint: string }> = ({ ok, label, hint }) => (
    <div className="flex items-start gap-3">
      <i className={`fas ${ok ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-red-400'} mt-0.5`}></i>
      <div><p className="text-sm font-bold text-white">{label}</p>{!ok && <p className="text-[11px] text-white/45">{hint}</p>}</div>
    </div>
  );

  const listo = configurado?.mercadoPago && configurado?.printful && configurado?.blob;

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-5 md:p-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/admin')} className="text-xs text-white/50 hover:text-white mb-6"><i className="fas fa-arrow-left mr-2"></i>Panel</button>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black"><i className="fas fa-shirt text-[#4a90d9] mr-3"></i>Tienda</h1>
          <div className="flex gap-2">
            <a href="/tienda" target="_blank" rel="noopener" className={`${btn} bg-white/10 text-white`}><i className="fas fa-eye"></i>Ver tienda</a>
            <button onClick={cargar} className={`${btn} bg-white/10 text-white`}><i className={`fas fa-rotate ${cargando ? 'fa-spin' : ''}`}></i>Actualizar</button>
          </div>
        </div>

        {/* Conexiones */}
        {configurado && (
          <section className={`rounded-2xl border p-5 mb-8 ${listo ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-amber-500/30 bg-amber-500/[0.05]'}`}>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-4">Conexiones</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Check ok={configurado.mercadoPago} label={`Mercado Pago${configurado.mercadoPagoPrueba ? ' (modo prueba)' : ''}`} hint="Agrega MP_ACCESS_TOKEN en Vercel (Mercado Pago → Tus integraciones → Credenciales de producción → Access Token)." />
              <Check ok={configurado.printful} label="Printful" hint="Agrega PRINTFUL_API_TOKEN en Vercel (Printful → Settings → API → crear token)." />
              <Check ok={configurado.blob} label="Almacenamiento (Vercel Blob)" hint="Falta BLOB_READ_WRITE_TOKEN." />
              <Check ok={configurado.telegram} label="Avisos de venta por Telegram (opcional)" hint="Usa el mismo bot de los avisos de oración." />
            </div>
            {configurado.printful && !configurado.printfulStore && (
              <p className="text-[11px] text-white/45 mt-4"><i className="fas fa-circle-info mr-1.5"></i>Si al importar sale un error de "store", agrega también PRINTFUL_STORE_ID (el número de tu tienda en Printful).</p>
            )}
            {configurado.mercadoPagoPrueba && (
              <p className="text-[11px] text-amber-300/80 mt-4"><i className="fas fa-triangle-exclamation mr-1.5"></i>Estás usando credenciales de prueba: nadie puede pagar de verdad. Cámbialas por las de producción cuando termines de probar.</p>
            )}
          </section>
        )}

        {/* Envio */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-8">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/60 mb-4">Envío y pedidos</h2>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <label><span className={lbl}>Costo de envío (MXN)</span>
              <input type="number" min={0} value={config.envio} onChange={e => { setConfig(c => ({ ...c, envio: Number(e.target.value) })); setCambios(true); }} className={inp} /></label>
            <label><span className={lbl}>Envío gratis desde (0 = nunca)</span>
              <input type="number" min={0} value={config.envioGratisDesde} onChange={e => { setConfig(c => ({ ...c, envioGratisDesde: Number(e.target.value) })); setCambios(true); }} className={inp} /></label>
            <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
              <input type="checkbox" checked={config.autoConfirmar} onChange={e => { setConfig(c => ({ ...c, autoConfirmar: e.target.checked })); setCambios(true); }} className="accent-[#4a90d9] w-4 h-4" />
              <span className="text-xs text-white/80">Mandar a fabricar en automático</span>
            </label>
          </div>
          <p className="text-[11px] text-white/40 mt-3">
            {config.autoConfirmar
              ? 'Cada venta pagada se manda a Printful y se cobra a tu tarjeta de Printful al instante.'
              : 'Cada venta pagada llega a Printful como borrador. Tú la revisas y le das "Confirmar" aquí abajo (Printful cobra hasta que confirmas).'}
          </p>
        </section>

        {/* Productos */}
        <section className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#4a90d9]">Productos ({productos.length})</h2>
            <button onClick={importar} disabled={!!ocupado || !configurado?.printful} className={`${btn} bg-white text-black`}>
              <i className={`fas ${ocupado === 'importar' ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'}`}></i>Importar de Printful
            </button>
          </div>
          {productos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
              Primero diseña tus productos en Printful (en una tienda tipo <b className="text-white/80">"Manual order platform / API"</b>) y luego toca <b className="text-white/80">Importar de Printful</b>.
            </div>
          ) : (
            <div className="space-y-4">
              {productos.map(p => (
                <div key={p.id} className={`rounded-2xl border p-4 md:p-5 ${p.activo ? 'border-[#4a90d9]/30 bg-[#4a90d9]/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <img src={p.imagenes[0] || p.variantes[0]?.imagen} alt="" className="w-full md:w-28 h-40 md:h-28 rounded-xl object-cover bg-white/5 flex-shrink-0" />
                    <div className="flex-1 grid md:grid-cols-[1fr_140px] gap-3">
                      <label><span className={lbl}>Nombre</span><input value={p.nombre} onChange={e => editar(p.id, { nombre: e.target.value })} className={inp} /></label>
                      <label><span className={lbl}>Precio MXN</span><input type="number" min={0} value={p.precio || ''} placeholder="499" onChange={e => editar(p.id, { precio: Number(e.target.value) })} className={inp} /></label>
                      <label className="md:col-span-2"><span className={lbl}>Descripción</span>
                        <textarea rows={2} value={p.descripcion} onChange={e => editar(p.id, { descripcion: e.target.value })} placeholder="Gorra bordada, ajustable, 100% algodón…" className={inp} /></label>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => editar(p.id, { activo: !p.activo })} className={`${btn} ${p.activo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
                      <i className={`fas ${p.activo ? 'fa-eye' : 'fa-eye-slash'}`}></i>{p.activo ? 'Publicado' : 'Oculto'}
                    </button>
                    <button onClick={() => setAbiertoVar(abiertoVar === p.id ? null : p.id)} className={`${btn} bg-white/5 text-white/70`}>
                      <i className="fas fa-tags"></i>{p.variantes.filter(v => v.activo).length}/{p.variantes.length} variantes
                    </button>
                    <button onClick={() => { if (confirm(`¿Quitar "${p.nombre}" de la tienda? (no se borra de Printful)`)) { setProductos(ps => ps.filter(x => x.id !== p.id)); setCambios(true); } }} className={`${btn} bg-red-500/10 text-red-300 ml-auto`}>
                      <i className="fas fa-trash"></i>Quitar
                    </button>
                  </div>
                  {abiertoVar === p.id && (
                    <div className="mt-3 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {p.variantes.map(v => (
                        <label key={v.id} className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2 text-xs text-white/80 cursor-pointer">
                          <input type="checkbox" checked={v.activo} onChange={e => editar(p.id, { variantes: p.variantes.map(x => x.id === v.id ? { ...x, activo: e.target.checked } : x) })} className="accent-[#4a90d9]" />
                          <span className="truncate">{[v.color, v.talla].filter(Boolean).join(' / ') || v.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pedidos */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Pedidos ({pedidos.length})</h2>
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input type="checkbox" checked={verTodos} onChange={e => { setVerTodos(e.target.checked); cargarPedidos(e.target.checked); }} className="accent-[#4a90d9]" />
              Mostrar también los que no pagaron
            </label>
          </div>
          {pedidos.length === 0 ? <p className="text-sm text-white/40">Todavía no hay pedidos.</p> : (
            <div className="space-y-3">
              {pedidos.map(o => {
                const e = ESTADO[o.estado] || ESTADO.pendiente_pago;
                const borrador = o.estado === 'enviado_printful' && o.printfulEstado === 'draft';
                return (
                  <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${e.c}`}>{e.t}</span>
                      {o.printfulEstado && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/60">Printful: {o.printfulEstado}</span>}
                      <span className="text-[11px] text-white/40">{new Date(o.creado).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="ml-auto text-base font-black">{mxn(o.total)}</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        {o.items.map((i, k) => <p key={k} className="text-white/80">{i.cantidad} × {i.nombre} <span className="text-white/45">({i.variante})</span></p>)}
                        <p className="text-white/35">Envío {mxn(o.envio)} · {o.id}{o.mpPaymentId ? ` · MP ${o.mpPaymentId}` : ''}</p>
                      </div>
                      <div className="text-white/60">
                        <p className="text-white font-bold">{o.direccion.nombre}</p>
                        <p>{o.direccion.calle}{o.direccion.colonia ? `, ${o.direccion.colonia}` : ''}</p>
                        <p>{o.direccion.ciudad}, {estados[o.direccion.estado] || o.direccion.estado} {o.direccion.cp}</p>
                        <p>{o.direccion.email} · {o.direccion.telefono}</p>
                      </div>
                    </div>
                    {o.error && <p className="mt-3 text-xs text-red-300"><i className="fas fa-triangle-exclamation mr-1.5"></i>{o.error}</p>}
                    {envios[o.id]?.map((s, k) => (
                      <p key={k} className="mt-2 text-xs text-emerald-300">{s.paqueteria}: {s.url ? <a href={s.url} target="_blank" rel="noopener" className="underline">{s.guia}</a> : s.guia}</p>
                    ))}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {borrador && <button onClick={() => accion('confirmar', o.id)} disabled={!!ocupado} className={`${btn} bg-emerald-500 text-black`}><i className="fas fa-check"></i>Confirmar y fabricar</button>}
                      {(o.estado === 'error_printful' || o.estado === 'pagado') && <button onClick={() => accion('reenviar', o.id)} disabled={!!ocupado} className={`${btn} bg-amber-500 text-black`}><i className="fas fa-rotate"></i>Reenviar a Printful</button>}
                      {o.printfulId && <button onClick={() => accion('estado-printful', o.id)} disabled={!!ocupado} className={`${btn} bg-white/10 text-white`}><i className="fas fa-rotate"></i>Ver envío</button>}
                      {o.estado === 'pendiente_pago' && <button onClick={() => { const pid = o.mpPaymentId || prompt('Número de operación de Mercado Pago:') || ''; if (pid) accion('revisar-pago', o.id, { paymentId: pid }); }} disabled={!!ocupado} className={`${btn} bg-white/10 text-white`}><i className="fas fa-rotate"></i>Revisar pago</button>}
                      {(o.estado === 'pendiente_pago' || o.estado === 'error_printful') && <button onClick={() => { if (confirm('¿Marcar como cancelado? (si ya pagó, devuélvele el dinero desde Mercado Pago)')) accion('cancelar', o.id); }} disabled={!!ocupado} className={`${btn} bg-red-500/10 text-red-300`}><i className="fas fa-xmark"></i>Cancelar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {(cambios || msg) && (
        <div className="fixed bottom-5 inset-x-5 md:inset-x-auto md:right-10 z-50 flex flex-col md:flex-row items-stretch md:items-center gap-3 rounded-2xl bg-[#0f141d] border border-white/15 shadow-2xl p-3">
          {msg && <p className={`text-xs px-2 ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.t}</p>}
          {cambios && (
            <button onClick={guardarTodo} disabled={!!ocupado} className={`${btn} bg-[#4a90d9] text-black`}>
              <i className={`fas ${ocupado === 'guardar' ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>Guardar cambios
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TiendaAdmin;
