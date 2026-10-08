import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_RUTINAS, Ejercicio, ICONOS_PARTE, Lugar, MUSCULOS, NIVELES, Nivel, OBJETIVOS, ParteCuerpo, Rutina, RutinasData, zonasDeParte } from '../../data/rutinas';
import BodyMap from '../BodyMap';
import { fetchRutinasAdmin, saveRutinas, uploadRutinaImagen, youtubeId } from '../../services/rutinaService';

// Panel de rutinas: crear, editar, ocultar y destacar rutinas, sus ejercicios (con foto/GIF y video)
// y las partes del cuerpo. Todo se edita en memoria y se guarda junto con "Guardar cambios".

const inp = 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#4a90d9] focus:outline-none';
const lbl = 'block text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-1.5';
const btn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-colors disabled:opacity-40';
const NIVEL_COLOR: Record<Nivel, string> = { Principiante: 'text-emerald-300 bg-emerald-500/15', Intermedio: 'text-amber-300 bg-amber-500/15', Avanzado: 'text-red-300 bg-red-500/15' };

const nuevoId = (base: string) => `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ── Imagen: subir archivo, pegar URL o quitar ──
const ImageField: React.FC<{ value?: string; onChange: (v?: string) => void; label?: string; compact?: boolean; extra?: React.ReactNode }> = ({ value, onChange, label, compact, extra }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');

  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr(null);
    try { onChange(await uploadRutinaImagen(f)); } catch (e: any) { setErr(e?.message || 'No se pudo subir'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const size = compact ? 'w-20 h-20' : 'w-full aspect-[16/9]';
  return (
    <div>
      {label && <span className={lbl}>{label}</span>}
      <div className={`flex ${compact ? 'gap-3 items-start' : 'flex-col gap-2'}`}>
        <div
          className={`${size} relative flex-shrink-0 rounded-xl overflow-hidden border border-dashed border-white/15 bg-black/40 flex items-center justify-center`}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
        >
          {value ? <img src={value} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <i className={`fas fa-image text-white/20 ${compact ? 'text-xl' : 'text-3xl'}`}></i>}
          {busy && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-white"></i></div>}
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={`${btn} !px-3 !py-2 bg-[#4a90d9] text-black`}><i className="fas fa-upload"></i>{value ? 'Cambiar' : 'Subir'}</button>
            <button type="button" onClick={() => { setUrlMode(m => !m); setUrl(value || ''); }} className={`${btn} !px-3 !py-2 bg-white/10 text-white`}><i className="fas fa-link"></i>URL</button>
            {value && <button type="button" onClick={() => onChange(undefined)} className={`${btn} !px-3 !py-2 bg-red-500/15 text-red-300`}><i className="fas fa-trash"></i></button>}
            {extra}
          </div>
          {urlMode && (
            <div className="flex gap-1.5">
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… (foto o GIF)" className={`${inp} !py-2 text-xs`} />
              <button type="button" onClick={() => { const v = url.trim(); if (v && !/^https?:\/\//i.test(v)) { setErr('La URL debe empezar con https://'); return; } onChange(v || undefined); setUrlMode(false); setErr(null); }} className={`${btn} !px-3 !py-2 bg-white text-black`}>OK</button>
            </div>
          )}
          {err && <p className="text-[11px] text-red-400">{err}</p>}
          {!compact && !value && <p className="text-[10px] text-white/35">Arrastra una imagen aquí. JPG, PNG, WEBP o GIF animado.</p>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
    </div>
  );
};

// ── Editor de un ejercicio ──
const EjercicioCard: React.FC<{
  ej: Ejercicio; i: number; total: number; open: boolean;
  onToggle: () => void; onChange: (ej: Ejercicio) => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onDelete: () => void;
  usosMismoNombre: number; onImageAll: (img?: string) => void;
}> = ({ ej, i, total, open, onToggle, onChange, onMove, onDuplicate, onDelete, usosMismoNombre, onImageAll }) => {
  const set = (patch: Partial<Ejercicio>) => onChange({ ...ej, ...patch });
  const videoMal = ej.video && !youtubeId(ej.video);
  return (
    <div className={`rounded-2xl border ${open ? 'border-[#4a90d9]/40 bg-[#4a90d9]/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="flex items-center gap-3 p-3">
        <span className="w-8 h-8 rounded-lg bg-white/5 text-white/60 text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
        {ej.imagen && <img src={ej.imagen} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <span className="block text-sm font-bold text-white truncate">{ej.nombre || 'Ejercicio sin nombre'}</span>
          <span className="block text-[11px] text-white/45">{ej.series} × {ej.reps} · {ej.descanso} s{ej.video ? ' · 🎬' : ''}</span>
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onMove(-1)} disabled={i === 0} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 disabled:opacity-20" aria-label="Subir"><i className="fas fa-chevron-up text-[10px]"></i></button>
          <button onClick={() => onMove(1)} disabled={i === total - 1} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 disabled:opacity-20" aria-label="Bajar"><i className="fas fa-chevron-down text-[10px]"></i></button>
          <button onClick={onToggle} className="w-8 h-8 rounded-lg bg-white/5 text-white/60" aria-label="Editar"><i className={`fas ${open ? 'fa-xmark' : 'fa-pen'} text-[10px]`}></i></button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-4 grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2"><span className={lbl}>Nombre</span><input value={ej.nombre} onChange={e => set({ nombre: e.target.value })} className={inp} placeholder="Ej. Press de banca con barra" /></label>
          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <label><span className={lbl}>Series</span><input type="number" min={1} max={20} value={ej.series} onChange={e => set({ series: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={inp} /></label>
            <label><span className={lbl}>Reps / tiempo</span><input value={ej.reps} onChange={e => set({ reps: e.target.value })} className={inp} placeholder="10-12, 30 s, Al fallo" /></label>
            <label><span className={lbl}>Descanso (s)</span><input type="number" min={0} max={600} step={5} value={ej.descanso} onChange={e => set({ descanso: Math.max(0, Math.min(600, Number(e.target.value) || 0)) })} className={inp} /></label>
          </div>
          <label><span className={lbl}>Músculo</span><input value={ej.musculo || ''} onChange={e => set({ musculo: e.target.value || undefined })} className={inp} placeholder="Pecho alto, Glúteo medio…" /></label>
          <label>
            <span className={lbl}>Video de técnica (YouTube)</span>
            <input value={ej.video || ''} onChange={e => set({ video: e.target.value.trim() || undefined })} className={inp} placeholder="https://youtu.be/…" />
            {videoMal && <span className="block text-[10px] text-amber-400 mt-1">No parece un enlace de YouTube: se abrirá en otra pestaña.</span>}
          </label>
          <label className="md:col-span-2"><span className={lbl}>Consejo de técnica</span><textarea value={ej.tip} onChange={e => set({ tip: e.target.value })} rows={2} className={inp} placeholder="Lo más importante para hacerlo bien" /></label>
          <div className="md:col-span-2">
            <ImageField
              compact label="Foto o GIF del ejercicio" value={ej.imagen} onChange={v => set({ imagen: v })}
              extra={ej.imagen && usosMismoNombre > 0 ? (
                <button type="button" onClick={() => onImageAll(ej.imagen)} className={`${btn} !px-3 !py-2 bg-emerald-500/15 text-emerald-300`} title="Pone esta imagen en los ejercicios con el mismo nombre de otras rutinas">
                  <i className="fas fa-copy"></i>Usar en {usosMismoNombre} más
                </button>
              ) : undefined}
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
            <button onClick={onDuplicate} className={`${btn} bg-white/10 text-white`}><i className="fas fa-copy"></i>Duplicar</button>
            <button onClick={onDelete} className={`${btn} bg-red-500/15 text-red-300`}><i className="fas fa-trash"></i>Quitar ejercicio</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Editor de rutina ──
const RutinaEditor: React.FC<{
  rutina: Rutina; partes: ParteCuerpo[]; biblioteca: Ejercicio[]; contarNombre: (nombre: string, excluirRutina: string) => number;
  onChange: (r: Rutina) => void; onClose: () => void; onDuplicate: () => void; onDelete: () => void; onImageAll: (nombre: string, img?: string) => void;
}> = ({ rutina, partes, biblioteca, contarNombre, onChange, onClose, onDuplicate, onDelete, onImageAll }) => {
  const [open, setOpen] = useState<number | null>(null);
  const [libQ, setLibQ] = useState('');
  const [libOpen, setLibOpen] = useState(false);
  const set = (patch: Partial<Rutina>) => onChange({ ...rutina, ...patch });
  const setEj = (list: Ejercicio[]) => set({ ejercicios: list });
  const totalSeries = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
  const estimado = Math.round(rutina.ejercicios.reduce((a, e) => a + e.series * (45 + e.descanso), 0) / 60) + 5;

  const libFiltrada = useMemo(() => {
    const q = libQ.trim().toLowerCase();
    return biblioteca.filter(e => !q || e.nombre.toLowerCase().includes(q) || (e.musculo || '').toLowerCase().includes(q)).slice(0, 40);
  }, [biblioteca, libQ]);

  const agregar = (ej?: Ejercicio) => {
    const nuevo: Ejercicio = ej ? clone(ej) : { nombre: '', series: 3, reps: '10-12', descanso: 60, tip: '' };
    setEj([...rutina.ejercicios, nuevo]);
    setOpen(rutina.ejercicios.length);
    setLibOpen(false);
    setLibQ('');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={onClose} className={`${btn} bg-white/10 text-white`}><i className="fas fa-arrow-left"></i>Lista</button>
        <div className="flex-1"></div>
        <a href={`/rutinas?parte=${rutina.parte}&lugar=${rutina.lugar}&r=${rutina.id}`} target="_blank" rel="noopener" className={`${btn} bg-white/10 text-white`}><i className="fas fa-eye"></i>Ver (versión guardada)</a>
        <button onClick={onDuplicate} className={`${btn} bg-white/10 text-white`}><i className="fas fa-copy"></i>Duplicar</button>
        <button onClick={onDelete} className={`${btn} bg-red-500/15 text-red-300`}><i className="fas fa-trash"></i>Borrar</button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          <label><span className={lbl}>Título</span><input value={rutina.titulo} onChange={e => set({ titulo: e.target.value })} className={`${inp} text-lg font-bold`} placeholder="Ej. Coraza de acero" /></label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label><span className={lbl}>Parte</span>
              <select value={rutina.parte} onChange={e => set({ parte: e.target.value })} className={inp}>
                {partes.map(p => <option key={p.id} value={p.id} className="bg-[#0a1322]">{p.nombre}</option>)}
              </select>
            </label>
            <label><span className={lbl}>Lugar</span>
              <select value={rutina.lugar} onChange={e => set({ lugar: e.target.value as Lugar })} className={inp}>
                <option value="casa" className="bg-[#0a1322]">En casa</option>
                <option value="gym" className="bg-[#0a1322]">En el gym</option>
              </select>
            </label>
            <label><span className={lbl}>Nivel</span>
              <select value={rutina.nivel} onChange={e => set({ nivel: e.target.value as Nivel })} className={inp}>
                {NIVELES.map(n => <option key={n} value={n} className="bg-[#0a1322]">{n}</option>)}
              </select>
            </label>
            <label><span className={lbl}>Minutos</span><input type="number" min={1} max={240} value={rutina.minutos} onChange={e => set({ minutos: Math.max(1, Math.min(240, Number(e.target.value) || 1)) })} className={inp} /></label>
          </div>
          <label><span className={lbl}>Objetivo</span>
            <input list="rutina-objetivos" value={rutina.objetivo || ''} onChange={e => set({ objetivo: e.target.value || undefined })} className={inp} placeholder="Hipertrofia, Fuerza, Quemar grasa…" />
            <datalist id="rutina-objetivos">{OBJETIVOS.map(o => <option key={o} value={o} />)}</datalist>
          </label>
          <label><span className={lbl}>Descripción</span><textarea value={rutina.descripcion || ''} onChange={e => set({ descripcion: e.target.value || undefined })} rows={3} className={inp} placeholder="Para quién es, cómo hacerla, cuántas veces por semana…" /></label>
          <label>
            <span className={lbl}>Calentamiento (uno por línea; vacío = el general)</span>
            <textarea value={(rutina.calentamiento || []).join('\n')} onChange={e => { const l = e.target.value.split('\n'); set({ calentamiento: l.some(x => x.trim()) ? l : undefined }); }} onBlur={() => set({ calentamiento: rutina.calentamiento?.map(x => x.trim()).filter(Boolean) })} rows={3} className={inp} placeholder={'5 min de bicicleta\n10 rotaciones de hombro'} />
          </label>

          {/* Ejercicios */}
          <div className="mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Ejercicios ({rutina.ejercicios.length})</h3>
              <span className="text-[11px] text-white/45">{totalSeries} series · ≈ {estimado} min calculados</span>
            </div>
            <div className="flex flex-col gap-2">
              {rutina.ejercicios.map((ej, i) => (
                <EjercicioCard
                  key={i} ej={ej} i={i} total={rutina.ejercicios.length} open={open === i}
                  onToggle={() => setOpen(o => (o === i ? null : i))}
                  onChange={n => setEj(rutina.ejercicios.map((x, j) => (j === i ? n : x)))}
                  onMove={d => { const l = [...rutina.ejercicios]; const t = l[i + d]; if (!t) return; l[i + d] = l[i]; l[i] = t; setEj(l); setOpen(i + d); }}
                  onDuplicate={() => { const l = [...rutina.ejercicios]; l.splice(i + 1, 0, clone(ej)); setEj(l); setOpen(i + 1); }}
                  onDelete={() => { if (!confirm(`¿Quitar "${ej.nombre || 'este ejercicio'}"?`)) return; setEj(rutina.ejercicios.filter((_, j) => j !== i)); setOpen(null); }}
                  usosMismoNombre={ej.nombre ? contarNombre(ej.nombre, rutina.id) : 0}
                  onImageAll={img => onImageAll(ej.nombre, img)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => agregar()} className={`${btn} bg-[#4a90d9] text-black`}><i className="fas fa-plus"></i>Nuevo ejercicio</button>
              <button onClick={() => setLibOpen(o => !o)} className={`${btn} bg-white/10 text-white`}><i className="fas fa-book-open"></i>De la biblioteca ({biblioteca.length})</button>
            </div>
            {libOpen && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                <input autoFocus value={libQ} onChange={e => setLibQ(e.target.value)} placeholder="Busca por nombre o músculo…" className={inp} />
                <div className="mt-2 max-h-72 overflow-y-auto flex flex-col gap-1">
                  {libFiltrada.map(e => (
                    <button key={e.nombre} onClick={() => agregar(e)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left">
                      {e.imagen ? <img src={e.imagen} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-md object-cover" /> : <span className="w-9 h-9 rounded-md bg-white/5 flex items-center justify-center text-white/30"><i className="fas fa-dumbbell text-xs"></i></span>}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-white truncate">{e.nombre}</span>
                        <span className="block text-[10px] text-white/40">{e.musculo || '—'} · {e.series} × {e.reps}</span>
                      </span>
                      <i className="fas fa-plus text-[#4a90d9] text-xs"></i>
                    </button>
                  ))}
                  {libFiltrada.length === 0 && <p className="text-xs text-white/40 p-2">Nada con ese nombre. Usa "Nuevo ejercicio".</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <ImageField label="Portada de la rutina" value={rutina.imagen} onChange={v => set({ imagen: v })} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span><span className="block text-sm font-bold text-white"><i className="fas fa-eye mr-2 text-[#4a90d9]"></i>Publicada</span><span className="block text-[11px] text-white/40">Si la apagas, solo la ves tú aquí.</span></span>
              <input type="checkbox" checked={!rutina.oculta} onChange={e => set({ oculta: !e.target.checked || undefined })} className="w-5 h-5 accent-[#4a90d9]" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span><span className="block text-sm font-bold text-white"><i className="fas fa-star mr-2 text-amber-400"></i>Destacada</span><span className="block text-[11px] text-white/40">Se abre primero en su parte y lugar, y sale en la portada.</span></span>
              <input type="checkbox" checked={!!rutina.destacada} onChange={e => set({ destacada: e.target.checked || undefined })} className="w-5 h-5 accent-amber-400" />
            </label>
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed">Los cambios se guardan en la página hasta que pulses <b className="text-white/60">Guardar cambios</b> arriba.</p>
        </aside>
      </div>
    </div>
  );
};

// ── Editor de partes del cuerpo ──
const PartesEditor: React.FC<{ data: RutinasData; onChange: (d: RutinasData) => void }> = ({ data, onChange }) => {
  const [open, setOpen] = useState<string | null>(null);
  const setParte = (i: number, p: ParteCuerpo) => onChange({ ...data, partes: data.partes.map((x, j) => (j === i ? p : x)) });
  const move = (i: number, d: -1 | 1) => { const l = [...data.partes]; const t = l[i + d]; if (!t) return; l[i + d] = l[i]; l[i] = t; onChange({ ...data, partes: l }); };
  const add = () => {
    const nombre = prompt('Nombre de la nueva parte o categoría (ej. Pantorrilla, Boxeo, Embarazo):')?.trim();
    if (!nombre) return;
    let id = slug(nombre) || nuevoId('parte');
    if (data.partes.some(p => p.id === id)) id = nuevoId(id);
    onChange({ ...data, partes: [...data.partes, { id, nombre, icono: 'fa-dumbbell', frase: '', versiculo: { texto: '', cita: '' } }] });
    setOpen(id);
  };
  const remove = (p: ParteCuerpo) => {
    const n = data.rutinas.filter(r => r.parte === p.id).length;
    if (data.partes.length <= 1) { alert('Debe quedar al menos una parte.'); return; }
    if (!confirm(n ? `"${p.nombre}" tiene ${n} rutinas. Se borrarán también. ¿Seguir?` : `¿Borrar "${p.nombre}"?`)) return;
    onChange({ partes: data.partes.filter(x => x.id !== p.id), rutinas: data.rutinas.filter(r => r.parte !== p.id) });
  };

  return (
    <div className="flex flex-col gap-2">
      {data.partes.map((p, i) => {
        const n = data.rutinas.filter(r => r.parte === p.id).length;
        const isOpen = open === p.id;
        return (
          <div key={p.id} className={`rounded-2xl border ${isOpen ? 'border-[#4a90d9]/40 bg-[#4a90d9]/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className="flex items-center gap-3 p-3">
              <span className="w-10 h-10 rounded-xl bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center flex-shrink-0"><i className={`fas ${p.icono}`}></i></span>
              <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-bold text-white">{p.nombre}</span>
                <span className="block text-[11px] text-white/45 truncate">{n} rutinas · {p.versiculo.cita || 'sin versículo'}</span>
              </button>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 disabled:opacity-20" aria-label="Subir"><i className="fas fa-chevron-up text-[10px]"></i></button>
              <button onClick={() => move(i, 1)} disabled={i === data.partes.length - 1} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 disabled:opacity-20" aria-label="Bajar"><i className="fas fa-chevron-down text-[10px]"></i></button>
              <button onClick={() => setOpen(isOpen ? null : p.id)} className="w-8 h-8 rounded-lg bg-white/5 text-white/60" aria-label="Editar"><i className={`fas ${isOpen ? 'fa-xmark' : 'fa-pen'} text-[10px]`}></i></button>
            </div>
            {isOpen && (
              <div className="px-3 pb-4 grid md:grid-cols-[1fr_260px] gap-4">
                <div className="flex flex-col gap-3">
                  <label><span className={lbl}>Nombre</span><input value={p.nombre} onChange={e => setParte(i, { ...p, nombre: e.target.value })} className={inp} /></label>
                  <div>
                    <span className={lbl}>Ícono</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ICONOS_PARTE.map(ic => (
                        <button key={ic} onClick={() => setParte(i, { ...p, icono: ic })} aria-pressed={p.icono === ic} className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.icono === ic ? 'bg-[#4a90d9] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><i className={`fas ${ic}`}></i></button>
                      ))}
                    </div>
                  </div>
                  <label><span className={lbl}>Frase</span><input value={p.frase} onChange={e => setParte(i, { ...p, frase: e.target.value })} className={inp} placeholder="Una frase corta que motive" /></label>
                  <label><span className={lbl}>Versículo</span><textarea value={p.versiculo.texto} onChange={e => setParte(i, { ...p, versiculo: { ...p.versiculo, texto: e.target.value } })} rows={3} className={inp} /></label>
                  <label><span className={lbl}>Cita</span><input value={p.versiculo.cita} onChange={e => setParte(i, { ...p, versiculo: { ...p.versiculo, cita: e.target.value } })} className={inp} placeholder="Filipenses 4:13" /></label>
                  <button onClick={() => remove(p)} className={`${btn} self-start bg-red-500/15 text-red-300`}><i className="fas fa-trash"></i>Borrar parte</button>
                </div>
                <div className="flex flex-col gap-4">
                  <ImageField label="Imagen (si la rutina no tiene portada)" value={p.imagen} onChange={v => setParte(i, { ...p, imagen: v })} />
                  <div>
                    <span className={lbl}>Músculos en el mapa (toca para marcar)</span>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <BodyMap
                        alto={200}
                        activos={new Set(zonasDeParte(p))}
                        onPick={m => { const z = new Set(zonasDeParte(p)); z.has(m) ? z.delete(m) : z.add(m); setParte(i, { ...p, zonas: [...z] }); }}
                      />
                    </div>
                    <p className="text-[10px] text-white/40 mt-1.5">{zonasDeParte(p).map(z => MUSCULOS[z]).join(', ') || 'Ninguno'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={add} className={`${btn} self-start mt-2 bg-[#4a90d9] text-black`}><i className="fas fa-plus"></i>Nueva parte / categoría</button>
    </div>
  );
};

// ── Panel ──
const RutinasAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<RutinasData | null>(null);
  const [guardado, setGuardado] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<'rutinas' | 'partes'>('rutinas');
  const [editId, setEditId] = useState<string | null>(null);
  const [fParte, setFParte] = useState('todas');
  const [fLugar, setFLugar] = useState<'todos' | Lugar>('todos');
  const [q, setQ] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetchRutinasAdmin();
      setData(clone(r.data)); setGuardado(r.guardado); setDirty(false);
      // fetchRutinasAdmin agrega solas las rutinas nuevas de la plantilla; hay que guardarlas
      if (r.guardado && r.nuevas > 0) {
        setDirty(true);
        setMsg({ ok: true, text: `Llegaron ${r.nuevas} rutinas nuevas de la plantilla. Pulsa Guardar cambios para conservarlas.` });
      }
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'No se pudo cargar' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = (d: RutinasData) => { setData(d); setDirty(true); setMsg(null); };

  const save = async () => {
    if (!data) return;
    const sinNombre = data.rutinas.find(r => !r.titulo.trim() || r.ejercicios.some(e => !e.nombre.trim()));
    if (sinNombre) { setMsg({ ok: false, text: `"${sinNombre.titulo || 'Una rutina'}" tiene título o ejercicios vacíos.` }); setEditId(sinNombre.id); setTab('rutinas'); return; }
    setSaving(true); setMsg(null);
    try {
      const limpio: RutinasData = { ...data, rutinas: data.rutinas.map(r => ({ ...r, calentamiento: r.calentamiento?.map(x => x.trim()).filter(Boolean) })) };
      await saveRutinas(limpio);
      setData(limpio); setDirty(false); setGuardado(true);
      setMsg({ ok: true, text: 'Guardado. La página de rutinas se actualiza en 1 minuto.' });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'No se pudo guardar' });
    } finally { setSaving(false); }
  };

  const biblioteca = useMemo(() => {
    const m = new Map<string, Ejercicio>();
    data?.rutinas.forEach(r => r.ejercicios.forEach(e => {
      const k = e.nombre.trim().toLowerCase();
      if (!k) return;
      const prev = m.get(k);
      if (!prev || (!prev.imagen && e.imagen) || (!prev.video && e.video)) m.set(k, e);
    }));
    return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#05070a] text-white p-10 flex items-center justify-center">
        {msg ? <div className="text-center"><p className="text-red-400 mb-4">{msg.text}</p><button onClick={load} className={`${btn} bg-white/10`}>Reintentar</button></div> : <i className="fas fa-spinner fa-spin text-2xl text-[#4a90d9]"></i>}
      </div>
    );
  }

  const parteNombre = (id: string) => data.partes.find(p => p.id === id)?.nombre || id;
  const editing = editId ? data.rutinas.find(r => r.id === editId) : undefined;

  const setRutina = (r: Rutina) => {
    let rutinas = data.rutinas.map(x => (x.id === r.id ? r : x));
    // Solo una destacada por parte y lugar
    if (r.destacada) rutinas = rutinas.map(x => (x.id !== r.id && x.parte === r.parte && x.lugar === r.lugar && x.destacada ? { ...x, destacada: undefined } : x));
    update({ ...data, rutinas });
  };
  const crear = () => {
    const parte = fParte !== 'todas' ? fParte : data.partes[0].id;
    const lugar: Lugar = fLugar !== 'todos' ? fLugar : 'casa';
    const r: Rutina = { id: nuevoId(`${parte}-${lugar}`), parte, lugar, nivel: 'Intermedio', titulo: '', minutos: 30, ejercicios: [{ nombre: '', series: 3, reps: '10-12', descanso: 60, tip: '' }] };
    update({ ...data, rutinas: [r, ...data.rutinas] });
    setEditId(r.id);
  };
  const duplicar = (r: Rutina) => {
    const c: Rutina = { ...clone(r), id: nuevoId(`${r.parte}-${r.lugar}`), titulo: `${r.titulo} (copia)`, destacada: undefined, oculta: true };
    update({ ...data, rutinas: [c, ...data.rutinas] });
    setEditId(c.id);
  };
  const borrar = (r: Rutina) => {
    if (!confirm(`¿Borrar la rutina "${r.titulo || 'sin título'}"?`)) return;
    update({ ...data, rutinas: data.rutinas.filter(x => x.id !== r.id) });
    setEditId(null);
  };
  const contarNombre = (nombre: string, excluir: string) => {
    const k = nombre.trim().toLowerCase();
    return data.rutinas.reduce((a, r) => a + (r.id === excluir ? 0 : r.ejercicios.filter(e => e.nombre.trim().toLowerCase() === k).length), 0);
  };
  const imagenEnTodas = (nombre: string, img?: string) => {
    const k = nombre.trim().toLowerCase();
    const n = contarNombre(nombre, '');
    if (!confirm(`¿Poner esta imagen en los ${n} ejercicios llamados "${nombre}"?`)) return;
    update({ ...data, rutinas: data.rutinas.map(r => ({ ...r, ejercicios: r.ejercicios.map(e => (e.nombre.trim().toLowerCase() === k ? { ...e, imagen: img } : e)) })) });
  };
  const agregarPlantilla = () => {
    const partesIds = new Set(data.partes.map(p => p.id));
    const rutIds = new Set(data.rutinas.map(r => r.id));
    const nuevasPartes = DEFAULT_RUTINAS.partes.filter(p => !partesIds.has(p.id));
    const nuevas = DEFAULT_RUTINAS.rutinas.filter(r => !rutIds.has(r.id));
    if (!nuevasPartes.length && !nuevas.length) { alert('Ya tienes todas las rutinas de la plantilla.'); return; }
    if (!confirm(`Se agregarán ${nuevas.length} rutinas y ${nuevasPartes.length} partes de la plantilla (no se toca nada de lo tuyo). ¿Seguir?`)) return;
    update({ partes: [...data.partes, ...clone(nuevasPartes)], rutinas: [...data.rutinas, ...clone(nuevas)] });
  };
  const restaurar = () => {
    if (!confirm('Esto reemplaza TODO por la plantilla original (se pierden tus imágenes y cambios al guardar). ¿Seguro?')) return;
    update(clone(DEFAULT_RUTINAS));
    setEditId(null);
  };
  const exportar = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rutinas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importar = async (f?: File) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!Array.isArray(j?.partes) || !Array.isArray(j?.rutinas)) throw new Error('El archivo no tiene partes y rutinas');
      if (!confirm(`Importar ${j.rutinas.length} rutinas y ${j.partes.length} partes y reemplazar lo actual?`)) return;
      update(j); setEditId(null);
    } catch (e: any) { alert(e?.message || 'Archivo inválido'); } finally { if (importRef.current) importRef.current.value = ''; }
  };

  const qn = q.trim().toLowerCase();
  const lista = data.rutinas
    .filter(r => (fParte === 'todas' || r.parte === fParte) && (fLugar === 'todos' || r.lugar === fLugar))
    .filter(r => !qn || r.titulo.toLowerCase().includes(qn) || r.ejercicios.some(e => e.nombre.toLowerCase().includes(qn)))
    .sort((a, b) => data.partes.findIndex(p => p.id === a.parte) - data.partes.findIndex(p => p.id === b.parte) || a.lugar.localeCompare(b.lugar) || NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel));
  const publicadas = data.rutinas.filter(r => !r.oculta).length;
  const conImagen = data.rutinas.filter(r => r.imagen).length;
  const totalEj = data.rutinas.reduce((a, r) => a + r.ejercicios.length, 0);
  const ejConImagen = data.rutinas.reduce((a, r) => a + r.ejercicios.filter(e => e.imagen).length, 0);

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      {/* Barra fija con guardar */}
      <div className="sticky top-0 z-40 bg-[#05070a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-3 flex flex-wrap items-center gap-2">
          <button onClick={() => { if (!dirty || confirm('Tienes cambios sin guardar. ¿Salir?')) navigate('/admin'); }} className="text-xs text-white/50 hover:text-white mr-2"><i className="fas fa-arrow-left mr-2"></i>Panel</button>
          <h1 className="text-lg md:text-xl font-black flex-1 min-w-0 truncate"><i className="fas fa-dumbbell text-[#4a90d9] mr-2"></i>Rutinas Fe + Gym</h1>
          {dirty && <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400"><i className="fas fa-circle text-[6px] mr-1.5 align-middle"></i>Sin guardar</span>}
          <button onClick={() => { if (!dirty || confirm('¿Descartar los cambios sin guardar?')) load(); }} disabled={saving} className={`${btn} bg-white/10 text-white`} title="Volver a cargar lo guardado"><i className="fas fa-rotate"></i><span className="hidden sm:inline">Descartar</span></button>
          <button onClick={save} disabled={saving || (!dirty && guardado)} className={`${btn} bg-emerald-500 text-black`}><i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>Guardar cambios</button>
        </div>
        {msg && <p className={`max-w-6xl mx-auto px-5 md:px-10 pb-3 text-xs font-bold ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-10 py-6 md:py-8">
        {!guardado && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <i className="fas fa-circle-info mr-2"></i>Estás viendo la <b>plantilla</b> ({data.rutinas.length} rutinas). La página la muestra tal cual hasta que guardes por primera vez; desde ahí manda lo que edites aquí.
          </div>
        )}

        {editing ? (
          <RutinaEditor
            rutina={editing} partes={data.partes} biblioteca={biblioteca} contarNombre={contarNombre}
            onChange={setRutina} onClose={() => setEditId(null)} onDuplicate={() => duplicar(editing)} onDelete={() => borrar(editing)} onImageAll={imagenEnTodas}
          />
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                ['fa-dumbbell', `${publicadas}/${data.rutinas.length}`, 'rutinas publicadas'],
                ['fa-layer-group', String(data.partes.length), 'partes / categorías'],
                ['fa-image', `${conImagen}`, 'rutinas con portada'],
                ['fa-images', `${ejConImagen}/${totalEj}`, 'ejercicios con imagen'],
              ].map(([icon, n, t]) => (
                <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-2xl font-black"><i className={`fas ${icon} text-[#4a90d9] text-base mr-2`}></i>{n}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 mt-1">{t}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
                {([['rutinas', 'Rutinas'], ['partes', 'Partes del cuerpo']] as const).map(([id, t]) => (
                  <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-black ${tab === id ? 'bg-white text-black' : 'text-white/60'}`}>{t}</button>
                ))}
              </div>
              <div className="flex-1"></div>
              <button onClick={agregarPlantilla} className={`${btn} bg-white/10 text-white`} title="Agrega las rutinas de la plantilla que no tengas"><i className="fas fa-file-import"></i><span className="hidden md:inline">Traer de la plantilla</span></button>
              <button onClick={exportar} className={`${btn} bg-white/10 text-white`} title="Descargar copia de seguridad"><i className="fas fa-download"></i><span className="hidden md:inline">Exportar</span></button>
              <button onClick={() => importRef.current?.click()} className={`${btn} bg-white/10 text-white`} title="Cargar copia de seguridad"><i className="fas fa-upload"></i><span className="hidden md:inline">Importar</span></button>
              <button onClick={restaurar} className={`${btn} bg-red-500/10 text-red-300`} title="Volver a la plantilla original"><i className="fas fa-arrow-rotate-left"></i></button>
              <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={e => importar(e.target.files?.[0])} />
            </div>

            {tab === 'partes' ? (
              <PartesEditor data={data} onChange={update} />
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs"></i>
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar rutina o ejercicio…" className={`${inp} pl-9`} />
                  </div>
                  <select value={fParte} onChange={e => setFParte(e.target.value)} className={`${inp} md:w-48`}>
                    <option value="todas" className="bg-[#0a1322]">Todas las partes</option>
                    {data.partes.map(p => <option key={p.id} value={p.id} className="bg-[#0a1322]">{p.nombre}</option>)}
                  </select>
                  <select value={fLugar} onChange={e => setFLugar(e.target.value as any)} className={`${inp} md:w-36`}>
                    <option value="todos" className="bg-[#0a1322]">Casa y gym</option>
                    <option value="casa" className="bg-[#0a1322]">En casa</option>
                    <option value="gym" className="bg-[#0a1322]">En el gym</option>
                  </select>
                  <button onClick={crear} className={`${btn} bg-[#4a90d9] text-black whitespace-nowrap`}><i className="fas fa-plus"></i>Nueva rutina</button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lista.map(r => (
                    <div key={r.id} className={`group rounded-2xl border overflow-hidden flex flex-col ${r.oculta ? 'border-white/5 opacity-55' : 'border-white/10'} bg-white/[0.02]`}>
                      <button onClick={() => setEditId(r.id)} className="relative h-28 text-left">
                        {r.imagen ? <img src={r.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" /> : (
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg, rgba(37,99,168,0.45), #0a1322 70%)' }}>
                            <i className={`fas ${data.partes.find(p => p.id === r.parte)?.icono || 'fa-dumbbell'} absolute right-3 bottom-2 text-5xl text-white/10`}></i>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                        <div className="absolute left-3 right-3 bottom-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9cc8f5]">{parteNombre(r.parte)} · {r.lugar === 'casa' ? 'Casa' : 'Gym'}</p>
                          <p className="text-sm font-black text-white truncate">{r.titulo || 'Sin título'}</p>
                        </div>
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${NIVEL_COLOR[r.nivel]}`}>{r.nivel}</span>
                          {r.oculta && <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-black/70 text-white/70">Oculta</span>}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 p-2">
                        <span className="flex-1 text-[11px] text-white/45 pl-1">{r.ejercicios.length} ej · {r.minutos} min</span>
                        <button onClick={() => setRutina({ ...r, destacada: !r.destacada || undefined })} className={`w-8 h-8 rounded-lg ${r.destacada ? 'bg-amber-400 text-black' : 'bg-white/5 text-white/40 hover:text-amber-300'}`} title="Destacada" aria-pressed={!!r.destacada}><i className="fas fa-star text-[11px]"></i></button>
                        <button onClick={() => setRutina({ ...r, oculta: !r.oculta || undefined })} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 hover:text-white" title={r.oculta ? 'Publicar' : 'Ocultar'}><i className={`fas ${r.oculta ? 'fa-eye-slash' : 'fa-eye'} text-[11px]`}></i></button>
                        <button onClick={() => duplicar(r)} className="w-8 h-8 rounded-lg bg-white/5 text-white/60 hover:text-white" title="Duplicar"><i className="fas fa-copy text-[11px]"></i></button>
                        <button onClick={() => setEditId(r.id)} className="w-8 h-8 rounded-lg bg-[#4a90d9]/20 text-[#9cc8f5]" title="Editar"><i className="fas fa-pen text-[11px]"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
                {lista.length === 0 && <p className="text-sm text-white/40 py-10 text-center">No hay rutinas con esos filtros.</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RutinasAdmin;
