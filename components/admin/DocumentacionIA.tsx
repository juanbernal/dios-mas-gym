import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CONFIG_INICIAL, ConfigIA, LanzamientoIA, cargarConfig, comprimirImagen, crearPDF, diasDesde, faltantes, guardarConfig, nombreArchivo,
} from '../../services/docIAService';

const campo = 'mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 normal-case tracking-normal font-normal';
const etiqueta = 'block text-[10px] font-black uppercase tracking-[0.15em] text-white/45';
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const VACIO: LanzamientoIA = { artista: 'Diosmasgym', nombre: '', tipo: 'Sencillo', fecha: '', sello: '', pistas: [] };

// Firma dibujada con el dedo o el mouse; se guarda recortada como PNG transparente
const PadFirma: React.FC<{ onGuardar: (png: string) => void; onCancelar: () => void }> = ({ onGuardar, onCancelar }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const trazando = useRef(false);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    const ctx = c.getContext('2d')!;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1a3a';
  }, []);

  const punto = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) * 2, (e.clientY - r.top) * 2];
  };
  const bajar = (e: React.PointerEvent) => {
    trazando.current = true;
    ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext('2d')!;
    const [x, y] = punto(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const mover = (e: React.PointerEvent) => {
    if (!trazando.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const [x, y] = punto(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setVacio(false);
  };
  const borrar = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setVacio(true); };
  const guardar = () => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    if (x1 <= x0) return;
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 20;
    out.height = y1 - y0 + 20;
    out.getContext('2d')!.drawImage(c, x0 - 10, y0 - 10, out.width, out.height, 0, 0, out.width, out.height);
    onGuardar(out.toDataURL('image/png'));
  };

  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
      <canvas ref={ref} onPointerDown={bajar} onPointerMove={mover} onPointerUp={() => (trazando.current = false)} onPointerLeave={() => (trazando.current = false)}
        className="w-full h-40 rounded-lg bg-white touch-none cursor-crosshair" aria-label="Área para firmar" />
      <div className="flex gap-2 mt-2">
        <button onClick={guardar} disabled={vacio} className="px-3 py-2 rounded-lg bg-[#a855f7] text-xs font-black disabled:opacity-40">Usar esta firma</button>
        <button onClick={borrar} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold">Borrar</button>
        <button onClick={onCancelar} className="px-3 py-2 rounded-lg text-xs text-white/60">Cancelar</button>
      </div>
    </div>
  );
};

// Genera el PDF que TooLost pide ("AI Documentation Required") para cada lanzamiento hecho con IA
const DocumentacionIA: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [config, setConfig] = useState<ConfigIA>(cargarConfig);
  const [lanz, setLanz] = useState<LanzamientoIA>(() => (location.state as any)?.lanzamiento || VACIO);
  const [pistasTxt, setPistasTxt] = useState(() => ((location.state as any)?.lanzamiento?.pistas || []).join('\n'));
  const [firmando, setFirmando] = useState(false);
  const [verConfig, setVerConfig] = useState(() => { const c = cargarConfig(); return !c.nombreLegal.trim() || !c.firma; });
  const [aviso, setAviso] = useState('');
  const [guardadoOk, setGuardadoOk] = useState(true);
  const desdeMigracion = !!(location.state as any)?.lanzamiento;

  const avisar = (m: string) => { setAviso(m); window.setTimeout(() => setAviso(''), 2200); };
  const cambiar = (datos: Partial<ConfigIA>) => setConfig(c => { const n = { ...c, ...datos }; setGuardadoOk(guardarConfig(n)); return n; });

  const lanzamiento: LanzamientoIA = { ...lanz, pistas: pistasTxt.split('\n').map(s => s.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean) };
  const falta = faltantes(config, lanzamiento);
  // Un mes despues de la captura o del recibo, toca actualizarlos
  const vencido = (diasDesde(config.capturaFecha) ?? 0) > 31 || (!!config.recibo && (diasDesde(config.reciboFecha) ?? 0) > 31);

  const subir = async (e: React.ChangeEvent<HTMLInputElement>, fn: (img: string) => void) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { fn(await comprimirImagen(f)); } catch { avisar('No se pudo leer la imagen'); }
  };

  const generar = (ver: boolean) => {
    try {
      const doc = crearPDF(config, lanzamiento);
      if (ver) window.open(URL.createObjectURL(doc.output('blob')), '_blank');
      else { doc.save(nombreArchivo(lanzamiento)); avisar('PDF descargado'); }
    } catch (e: any) {
      avisar(e?.message || 'No se pudo crear el PDF');
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(desdeMigracion ? '/admin/migracion' : '/admin')} className="text-xs text-white/50 hover:text-white mb-6"><i className="fas fa-arrow-left mr-2"></i>{desdeMigracion ? 'Migración' : 'Panel'}</button>
        <h1 className="text-2xl md:text-3xl font-black"><i className="fas fa-file-shield text-[#a855f7] mr-3"></i>Documentación IA para TooLost</h1>
        <p className="text-sm text-white/55 mt-2 max-w-2xl">Cuando TooLost dice <b className="text-amber-300">“AI Documentation Required”</b>, sube aquí el PDF de ese lanzamiento: lleva la captura de tu plan, las cláusulas de la licencia, la lista de canciones y tu declaración firmada. Sirve para sencillos, EPs y álbumes, estén o no en tu catálogo.</p>

        {/* Datos fijos */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
          <button onClick={() => setVerConfig(v => !v)} className="w-full flex items-center justify-between gap-3 p-4 text-left" aria-expanded={verConfig}>
            <span>
              <span className="block font-black">1. Datos fijos <span className="text-white/40 font-normal text-xs">(se llenan una vez y se quedan guardados)</span></span>
              <span className="block text-[11px] text-white/45 mt-0.5">
                {config.nombreLegal || '✗ Falta nombre'} · {config.firma ? '✓ Firma' : '✗ Falta firma'} · {config.herramienta} {config.plan} · {config.extras.length} anexo{config.extras.length === 1 ? '' : 's'}
                {!guardadoOk && <span className="text-red-300"> · No se pudo guardar (imágenes muy pesadas)</span>}
              </span>
            </span>
            <i className={`fas fa-chevron-${verConfig ? 'up' : 'down'} text-white/40`}></i>
          </button>

          {verConfig && (
            <div className="border-t border-white/10 p-4 grid gap-4">
              <div className="grid md:grid-cols-2 gap-3">
                <label className={etiqueta}>Nombre legal<input value={config.nombreLegal} onChange={e => cambiar({ nombreLegal: e.target.value })} className={campo} /></label>
                <div className="grid grid-cols-3 gap-2">
                  <label className={etiqueta}>Herramienta<input value={config.herramienta} onChange={e => cambiar({ herramienta: e.target.value })} className={campo} /></label>
                  <label className={etiqueta}>Sitio<input value={config.herramientaUrl} onChange={e => cambiar({ herramientaUrl: e.target.value })} className={campo} /></label>
                  <label className={etiqueta}>Plan<input value={config.plan} onChange={e => cambiar({ plan: e.target.value })} className={campo} /></label>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <label className={etiqueta}>Términos (URL)<input value={config.terminosUrl} onChange={e => cambiar({ terminosUrl: e.target.value })} className={campo} /></label>
                <label className={etiqueta}>Última revisión<input value={config.terminosRevision} onChange={e => cambiar({ terminosRevision: e.target.value })} className={campo} /></label>
                <label className={etiqueta}>Vigentes desde<input value={config.terminosVigencia} onChange={e => cambiar({ terminosVigencia: e.target.value })} className={campo} /></label>
              </div>

              <div>
                <p className={etiqueta}>Cláusulas de la licencia (en inglés, como vienen en los términos)</p>
                <div className="grid gap-2 mt-1">
                  {config.clausulas.map((k, i) => (
                    <div key={i} className="grid md:grid-cols-[200px_1fr_auto] gap-2 items-start">
                      <input value={k.titulo} onChange={e => cambiar({ clausulas: config.clausulas.map((x, j) => j === i ? { ...x, titulo: e.target.value } : x) })} placeholder="Nombre de la sección" className={`${campo} !mt-0 font-bold`} />
                      <textarea value={k.texto} onChange={e => cambiar({ clausulas: config.clausulas.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) })} rows={2} className={`${campo} !mt-0`} />
                      <button onClick={() => cambiar({ clausulas: config.clausulas.filter((_, j) => j !== i) })} className="px-2 py-2 text-white/40 hover:text-red-300" aria-label="Quitar cláusula"><i className="fas fa-trash"></i></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => cambiar({ clausulas: [...config.clausulas, { titulo: '', texto: '' }] })} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold"><i className="fas fa-plus mr-1.5"></i>Cláusula</button>
                    <button onClick={() => cambiar({ clausulas: CONFIG_INICIAL.clausulas })} className="px-3 py-2 rounded-lg text-xs text-white/50">Restaurar las de Suno</button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-start">
                <label className={etiqueta}>Qué hizo la IA (en inglés)<input value={config.uso} onChange={e => cambiar({ uso: e.target.value })} className={campo} /></label>
                <label className="flex items-center gap-2 text-sm mt-5"><input type="checkbox" checked={config.letraPropia} onChange={e => cambiar({ letraPropia: e.target.checked })} className="w-4 h-4 accent-[#a855f7]" />Las letras las escribí yo</label>
              </div>

              <div>
                <p className={etiqueta}>Tu firma</p>
                {firmando
                  ? <div className="mt-2"><PadFirma onGuardar={png => { cambiar({ firma: png }); setFirmando(false); }} onCancelar={() => setFirmando(false)} /></div>
                  : (
                    <div className="mt-2 flex items-center gap-3">
                      {config.firma ? <img src={config.firma} alt="Tu firma" className="h-16 rounded-lg bg-white px-3" /> : <span className="text-xs text-amber-200/80">Aún no firmas</span>}
                      <button onClick={() => setFirmando(true)} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold"><i className="fas fa-signature mr-1.5"></i>{config.firma ? 'Firmar de nuevo' : 'Firmar'}</button>
                    </div>
                  )}
              </div>

              <div>
                <p className={etiqueta}>Anexos (opcional)</p>
                <p className="text-[11px] text-white/40 mt-1">Por ejemplo capturas de la página de términos o de tu recibo de pago. Cada una va en su propia página al final.</p>
                <div className="grid gap-2 mt-2">
                  {config.extras.map((x, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <img src={x.img} alt="" className="w-16 h-12 object-cover rounded-md border border-white/10" />
                      <input value={x.titulo} onChange={e => cambiar({ extras: config.extras.map((y, j) => j === i ? { ...y, titulo: e.target.value } : y) })} placeholder="Título (ej. Suno Terms of Service)" className={`${campo} !mt-0 flex-1`} />
                      <button onClick={() => cambiar({ extras: config.extras.filter((_, j) => j !== i) })} className="px-2 py-2 text-white/40 hover:text-red-300" aria-label="Quitar anexo"><i className="fas fa-trash"></i></button>
                    </div>
                  ))}
                  <label className="w-fit px-3 py-2 rounded-lg bg-white/10 text-xs font-bold cursor-pointer"><i className="fas fa-plus mr-1.5"></i>Agregar anexo
                    <input type="file" accept="image/*" className="hidden" onChange={e => subir(e, img => cambiar({ extras: [...config.extras, { titulo: '', img }] }))} />
                  </label>
                </div>
              </div>
              <p className="text-[11px] text-white/35"><i className="fas fa-lock mr-1.5"></i>Tu firma y tus capturas se guardan solo en este navegador; no se suben al servidor.</p>
            </div>
          )}
        </section>

        {/* Lo que cambia cada mes */}
        <section className={`mt-4 rounded-2xl border p-4 grid gap-4 ${vencido ? 'border-amber-400/40 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.03]'}`}>
          <div>
            <p className="font-black">2. Cada mes <span className="text-white/40 font-normal text-xs">(cuando se renueva tu plan de {config.herramienta})</span></p>
            {vencido
              ? <p className="text-[11px] text-amber-200/90 mt-1"><i className="fas fa-triangle-exclamation mr-1.5"></i>Tu captura o tu recibo tienen más de un mes. Actualízalos antes de generar el documento.</p>
              : <p className="text-[11px] text-white/45 mt-1">Lo demás se queda igual; aquí solo cambias la captura, el recibo y la fecha del siguiente cobro.</p>}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {([
              { k: 'captura', f: 'capturaFecha', titulo: 'Captura de tu cuenta', ayuda: `${config.herramientaUrl}/account, donde se vea el plan ${config.plan} y “Commercial use rights”.` },
              { k: 'recibo', f: 'reciboFecha', titulo: 'Recibo de pago (opcional)', ayuda: 'El correo o comprobante del cobro del mes (Google Play, tarjeta, etc.).' },
            ] as const).map(({ k, f, titulo, ayuda }) => (
              <div key={k}>
                <p className={etiqueta}>{titulo}</p>
                <p className="text-[11px] text-white/40 mt-1">{ayuda}</p>
                {config[k]
                  ? <img src={config[k]} alt={titulo} className="mt-2 w-full h-40 object-contain rounded-lg border border-white/10 bg-black" />
                  : <div className={`mt-2 h-40 flex items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs ${k === 'captura' ? 'border-amber-400/40 bg-amber-500/5 text-amber-200/80' : 'border-white/15 text-white/35'}`}>Aún no la subes</div>}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold cursor-pointer"><i className="fas fa-upload mr-1.5"></i>{config[k] ? 'Cambiar' : 'Subir'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => subir(e, img => cambiar({ [k]: img, [f]: config[f] && (diasDesde(config[f]) ?? 99) < 3 ? config[f] : hoy() } as Partial<ConfigIA>))} />
                  </label>
                  {k === 'recibo' && config.recibo && <button onClick={() => cambiar({ recibo: undefined, reciboFecha: '' })} className="px-2 py-2 text-xs text-white/40 hover:text-red-300">Quitar</button>}
                  <label className={`${etiqueta} flex-1 min-w-[140px]`}>Fecha<input type="date" value={config[f]} onChange={e => cambiar({ [f]: e.target.value } as Partial<ConfigIA>)} className={campo} /></label>
                </div>
              </div>
            ))}
          </div>
          <label className={etiqueta}>Facturación (en inglés)<input value={config.facturacion} onChange={e => cambiar({ facturacion: e.target.value })} placeholder="monthly billing, next billing date Nov 3, 2026" className={campo} /></label>
        </section>

        {/* Lanzamiento */}
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black">3. El lanzamiento <span className="text-white/40 font-normal text-xs">(cambia en cada documento)</span></p>
            {(lanz.nombre || pistasTxt) && <button onClick={() => { setLanz(VACIO); setPistasTxt(''); }} className="text-xs text-white/50 hover:text-white"><i className="fas fa-eraser mr-1.5"></i>Limpiar</button>}
          </div>
          {desdeMigracion && <p className="text-[11px] text-emerald-300/80 -mt-2"><i className="fas fa-circle-check mr-1.5"></i>Datos traídos de Migración a TooLost. Revisa que el orden de las canciones sea el mismo que en TooLost.</p>}
          <div className="grid md:grid-cols-[1fr_160px_150px] gap-3">
            <label className={etiqueta}>Nombre (igual que en TooLost)<input value={lanz.nombre} onChange={e => setLanz({ ...lanz, nombre: e.target.value })} placeholder="Ej. Somos o No Somos (Confesión de un Pecador)" className={campo} /></label>
            <label className={etiqueta}>Artista
              <select value={lanz.artista} onChange={e => setLanz({ ...lanz, artista: e.target.value })} className={campo}>
                {['Diosmasgym', 'Juan 614'].map(x => <option key={x} value={x} className="bg-[#0a1322]">{x}</option>)}
              </select>
            </label>
            <label className={etiqueta}>Tipo
              <select value={lanz.tipo} onChange={e => setLanz({ ...lanz, tipo: e.target.value as LanzamientoIA['tipo'] })} className={campo}>
                {(['Sencillo', 'EP', 'Álbum'] as const).map(x => <option key={x} value={x} className="bg-[#0a1322]">{x}</option>)}
              </select>
            </label>
          </div>
          <div className="grid md:grid-cols-[1fr_200px] gap-3">
            <label className={etiqueta}>Canciones (una por renglón, en orden)
              <textarea value={pistasTxt} onChange={e => setPistasTxt(e.target.value)} rows={Math.max(3, Math.min(12, pistasTxt.split('\n').length + 1))}
                placeholder={'Somos o No Somos\nConfesión de un Pecador'} className={campo} />
              <span className="block mt-1 normal-case tracking-normal font-normal text-white/35">{lanzamiento.pistas.length} {lanzamiento.pistas.length === 1 ? 'canción' : 'canciones'}{lanz.tipo === 'Sencillo' && !lanzamiento.pistas.length && lanz.nombre ? ' · si es sencillo, escribe el mismo nombre' : ''}</span>
            </label>
            <div className="grid gap-3 content-start">
              <label className={etiqueta}>Fecha de salida (opcional)<input type="date" value={lanz.fecha || ''} onChange={e => setLanz({ ...lanz, fecha: e.target.value })} className={campo} /></label>
              <label className={etiqueta}>Sello (opcional)<input value={lanz.sello || ''} onChange={e => setLanz({ ...lanz, sello: e.target.value })} className={campo} /></label>
            </div>
          </div>
          {lanz.tipo === 'Sencillo' && lanz.nombre && !pistasTxt.trim() && (
            <button onClick={() => setPistasTxt(lanz.nombre)} className="w-fit -mt-2 text-xs text-[#c084fc] hover:underline">Usar “{lanz.nombre}” como la canción</button>
          )}

          {falta.length > 0 && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.07] p-3 text-xs text-amber-100/90">
              <p className="font-bold mb-1"><i className="fas fa-triangle-exclamation mr-1.5"></i>Falta para que TooLost lo acepte:</p>
              <ul className="list-disc pl-5">{falta.map(f => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => generar(false)} disabled={falta.length > 0} className="px-4 py-3 rounded-xl bg-[#a855f7] text-sm font-black disabled:opacity-40"><i className="fas fa-file-pdf mr-2"></i>Descargar PDF</button>
            <button onClick={() => generar(true)} disabled={!lanz.nombre.trim()} className="px-4 py-3 rounded-xl bg-white/10 text-sm font-bold disabled:opacity-40"><i className="fas fa-eye mr-2"></i>Vista previa</button>
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[12px] text-white/55 leading-relaxed">
          <p className="font-bold text-white/80 mb-1"><i className="fas fa-lightbulb text-amber-400 mr-2"></i>Cómo subirlo en TooLost</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>En el lanzamiento, al intentar publicar sale “Can’t publish yet · AI Documentation Required”.</li>
            <li>Toca <b>Upload Documentation</b> y elige el PDF de ese mismo lanzamiento (el nombre del archivo ya lleva el título).</li>
            <li>Haz un PDF por lanzamiento: la lista de canciones del documento debe coincidir con la del disco.</li>
            <li>Si tu plan de {config.herramienta} cambia o vence, toma una captura nueva antes de generar más documentos.</li>
          </ol>
        </div>
      </div>

      {aviso && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-black shadow-xl">{aviso}</div>}
    </div>
  );
};

export default DocumentacionIA;
