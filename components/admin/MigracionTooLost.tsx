import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog, fetchSavedLyrics } from '../../services/musicService';
import {
  DatosDisco, Disco, ESTADOS, Estado, EstadoMigracion, GENEROS, Meta,
  armarDiscos, cargarEstado, cargarMetadatos, exportarCSV, fichaDisco, guardarEstado,
} from '../../services/migracionService';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
const TIPO_COLOR: Record<Disco['tipo'], string> = {
  Sencillo: 'bg-violet-500/15 text-violet-300', EP: 'bg-sky-500/15 text-sky-300', 'Álbum': 'bg-amber-500/15 text-amber-300', 'Sin disco': 'bg-white/10 text-white/50',
};
const fechaCorta = (f: string) => (f ? f.split('-').reverse().join('/') : '—');

const copiar = async (texto: string, aviso: (m: string) => void, que: string) => {
  try { await navigator.clipboard.writeText(texto); aviso(`${que} copiado`); } catch { aviso('No se pudo copiar'); }
};

// Plan para volver a subir todo el catalogo en TooLost, disco por disco
const MigracionTooLost: React.FC = () => {
  const navigate = useNavigate();
  const [discos, setDiscos] = useState<Disco[]>([]);
  const [estado, setEstado] = useState<EstadoMigracion>({ discos: {}, pistas: {} });
  const [cargando, setCargando] = useState(true);
  const [progreso, setProgreso] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [artista, setArtista] = useState<'todos' | 'Diosmasgym' | 'Juan 614'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<Estado | 'todos' | 'faltan'>('faltan');
  const [tipo, setTipo] = useState<Disco['tipo'] | 'todos'>('todos');
  const [orden, setOrden] = useState<'viejos' | 'nuevos'>('viejos');
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<'ok' | 'guardando' | 'error'>('ok');
  const [aviso, setAviso] = useState('');
  const listo = useRef(false);
  const timer = useRef<number | null>(null);

  const avisar = (m: string) => { setAviso(m); window.setTimeout(() => setAviso(''), 1800); };

  const cargar = async (forzar = false) => {
    setCargando(true);
    setError(null);
    try {
      setProgreso('Leyendo catálogos…');
      const [dmg, j614, letrasWeb, est] = await Promise.all([
        fetchMusicCatalog('diosmasgym', forzar), fetchMusicCatalog('juan614', forzar), fetchSavedLyrics().catch(() => []), cargarEstado(),
      ]);
      const canciones = [...dmg, ...j614];
      const ids = Array.from(new Set(canciones.map(c => c.url?.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1]).filter(Boolean) as string[]));
      setProgreso(`Buscando el disco de ${ids.length} canciones…`);
      const meta: Record<string, Meta | 0> = await cargarMetadatos(ids, forzar, (h, t) => setProgreso(`Buscando discos en YouTube… ${h}/${t}`));
      const letras = new Map<string, string>();
      (letrasWeb || []).forEach((l: any) => { if (l?.title && typeof l.content === 'string' && l.content.trim().length > 50) letras.set(norm(l.title), l.content); });
      setDiscos(armarDiscos(canciones, meta, letras));
      setEstado(est);
      listo.current = true;
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar');
    } finally {
      setCargando(false);
      setProgreso('');
    }
  };

  useEffect(() => { cargar(); }, []);

  // Guardado automatico un momento despues de cada cambio
  const cambiar = (fn: (e: EstadoMigracion) => EstadoMigracion) => {
    setEstado(prev => {
      const next = fn(prev);
      if (timer.current) clearTimeout(timer.current);
      setGuardado('guardando');
      timer.current = window.setTimeout(async () => setGuardado((await guardarEstado(next)) ? 'ok' : 'error'), 1000);
      return next;
    });
  };
  const setDisco = (key: string, datos: Partial<DatosDisco>) =>
    cambiar(e => ({ ...e, discos: { ...e.discos, [key]: { ...(e.discos[key] || { estado: 'pendiente' }), ...datos } } }));
  const setEstadoDisco = (d: Disco, est: Estado) => {
    setDisco(d.key, { estado: est, fecha: Date.now() });
    // Al marcarlo subido o publicado, se marcan todas sus pistas
    if (est === 'subido' || est === 'publicado') cambiar(e => ({ ...e, pistas: { ...e.pistas, ...Object.fromEntries(d.pistas.map(p => [p.id, true])) } }));
  };
  const togglePista = (id: string) => cambiar(e => {
    const pistas = { ...e.pistas };
    if (pistas[id]) delete pistas[id]; else pistas[id] = true;
    return { ...e, pistas };
  });

  const estadoDe = (d: Disco): Estado => estado.discos[d.key]?.estado || 'pendiente';

  const delArtista = useMemo(() => discos.filter(d => artista === 'todos' || d.artista === artista), [discos, artista]);
  const visibles = useMemo(() => {
    const t = norm(q);
    return delArtista
      .filter(d => filtroEstado === 'todos' || (filtroEstado === 'faltan' ? !['subido', 'publicado', 'omitir'].includes(estadoDe(d)) : estadoDe(d) === filtroEstado))
      .filter(d => tipo === 'todos' || d.tipo === tipo)
      .filter(d => !t || norm(`${d.nombre} ${d.pistas.map(p => p.titulo).join(' ')}`).includes(t))
      .sort((a, b) => (a.tipo === 'Sin disco' ? 1 : 0) - (b.tipo === 'Sin disco' ? 1 : 0) || (orden === 'viejos' ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)));
  }, [delArtista, filtroEstado, tipo, q, orden, estado]);

  const stats = useMemo(() => {
    const conDisco = delArtista.filter(d => d.tipo !== 'Sin disco');
    const hechos = conDisco.filter(d => ['subido', 'publicado'].includes(estadoDe(d)));
    const pistas = conDisco.flatMap(d => d.pistas);
    const porEstado = Object.fromEntries(ESTADOS.map(s => [s.id, conDisco.filter(d => estadoDe(d) === s.id).length]));
    return {
      discos: conDisco.length, hechos: hechos.length, pistas: pistas.length,
      pistasHechas: pistas.filter(p => estado.pistas[p.id]).length,
      sinDisco: delArtista.filter(d => d.tipo === 'Sin disco').reduce((a, d) => a + d.pistas.length, 0),
      porEstado, sencillos: conDisco.filter(d => d.tipo === 'Sencillo').length, eps: conDisco.filter(d => d.tipo === 'EP').length, albums: conDisco.filter(d => d.tipo === 'Álbum').length,
    };
  }, [delArtista, estado]);

  const siguiente = useMemo(() => delArtista
    .filter(d => d.tipo !== 'Sin disco' && ['pendiente', 'preparando'].includes(estadoDe(d)))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0], [delArtista, estado]);

  const descargarCSV = () => {
    const blob = new Blob([exportarCSV(delArtista, estado)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `migracion-toolost-${artista === 'todos' ? 'catalogo' : norm(artista).replace(/ /g, '-')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const pct = stats.discos ? Math.round((stats.hechos / stats.discos) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/admin')} className="text-xs text-white/50 hover:text-white mb-6"><i className="fas fa-arrow-left mr-2"></i>Panel</button>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black"><i className="fas fa-compact-disc text-[#a855f7] mr-3"></i>Migración a TooLost</h1>
            <p className="text-sm text-white/55 mt-2 max-w-2xl">Tus canciones agrupadas en los mismos discos con los que salieron (según YouTube Music). Sube un disco a la vez, márcalo y aquí queda el avance, en cualquier dispositivo.</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-2 rounded-lg text-[11px] font-bold ${guardado === 'error' ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-white/50'}`}>
              {guardado === 'guardando' ? <><i className="fas fa-rotate fa-spin mr-1.5"></i>Guardando</> : guardado === 'error' ? <><i className="fas fa-triangle-exclamation mr-1.5"></i>Guardado solo aquí</> : <><i className="fas fa-check mr-1.5"></i>Guardado</>}
            </span>
            <button onClick={() => cargar(true)} disabled={cargando} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold disabled:opacity-50" title="Volver a leer catálogos y discos"><i className={`fas fa-rotate mr-1.5 ${cargando ? 'fa-spin' : ''}`}></i>Actualizar</button>
            <button onClick={descargarCSV} disabled={!discos.length} className="px-3 py-2 rounded-lg bg-white/10 text-xs font-bold disabled:opacity-50"><i className="fas fa-download mr-1.5"></i>CSV</button>
          </div>
        </div>

        {error && <p className="my-4 text-sm text-red-400 rounded-xl border border-red-500/30 bg-red-500/10 p-3">{error}</p>}
        {cargando && <p className="my-6 text-sm text-white/60"><i className="fas fa-rotate fa-spin mr-2"></i>{progreso || 'Cargando…'}</p>}

        {!cargando && discos.length > 0 && (
          <>
            {/* Artista */}
            <div className="mt-6 inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
              {(['todos', 'Diosmasgym', 'Juan 614'] as const).map(a => (
                <button key={a} onClick={() => setArtista(a)} aria-pressed={artista === a} className={`px-4 py-2 rounded-lg text-xs font-black ${artista === a ? 'bg-[#a855f7] text-white' : 'text-white/60 hover:text-white'}`}>{a === 'todos' ? 'Ambos artistas' : a}</button>
              ))}
            </div>

            {/* Avance */}
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 rounded-2xl border border-[#a855f7]/30 bg-[#a855f7]/10 p-4">
                <div className="flex items-end justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-200/80">Discos migrados</p>
                  <p className="text-2xl font-black">{stats.hechos}<span className="text-sm text-white/50"> / {stats.discos}</span></p>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 mt-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#a855f7] to-emerald-400 transition-all" style={{ width: `${pct}%` }}></div></div>
                <p className="text-[11px] text-white/55 mt-2">{pct}% · {stats.pistasHechas} de {stats.pistas} canciones subidas</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Lanzamientos</p>
                <p className="text-sm mt-2 leading-relaxed"><b>{stats.albums}</b> álbumes<br /><b>{stats.eps}</b> EPs<br /><b>{stats.sencillos}</b> sencillos</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Por estado</p>
                <ul className="text-[11px] mt-2 space-y-0.5">
                  {ESTADOS.map(s => <li key={s.id} className="flex justify-between"><span className="text-white/60">{s.label}</span><b>{stats.porEstado[s.id] || 0}</b></li>)}
                </ul>
              </div>
            </div>
            {stats.sinDisco > 0 && <p className="text-[11px] text-white/45 mt-3"><i className="fas fa-circle-info mr-1.5"></i>{stats.sinDisco} canciones solo están como video en YouTube (no salieron por distribuidora). Están al final, por si quieres subirlas como sencillos nuevos.</p>}

            {/* Siguiente */}
            {siguiente && (
              <button onClick={() => { setAbierto(siguiente.key); setQ(''); setFiltroEstado('faltan'); setTipo('todos'); setTimeout(() => document.getElementById(`disco-${siguiente.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                className="mt-5 w-full flex items-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-3 text-left hover:bg-emerald-500/[0.12] transition-colors">
                <img src={siguiente.portada} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover bg-black" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Sigue con este (el más antiguo que falta)</span>
                  <span className="block font-bold truncate">{siguiente.nombre}</span>
                  <span className="block text-[11px] text-white/50">{siguiente.artista} · {siguiente.tipo} · {siguiente.pistas.length} {siguiente.pistas.length === 1 ? 'canción' : 'canciones'} · {fechaCorta(siguiente.fecha)}</span>
                </span>
                <i className="fas fa-chevron-right text-white/40"></i>
              </button>
            )}

            {/* Filtros */}
            <div className="mt-5 flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                <i className="fas fa-magnifying-glass text-white/40 text-xs"></i>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar disco o canción…" className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/30" />
              </div>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as any)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold">
                <option value="faltan" className="bg-[#0a1322]">Faltan por subir</option>
                <option value="todos" className="bg-[#0a1322]">Todos los estados</option>
                {ESTADOS.map(s => <option key={s.id} value={s.id} className="bg-[#0a1322]">{s.label}</option>)}
              </select>
              <select value={tipo} onChange={e => setTipo(e.target.value as any)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold">
                <option value="todos" className="bg-[#0a1322]">Todos los tipos</option>
                {(['Álbum', 'EP', 'Sencillo', 'Sin disco'] as const).map(t => <option key={t} value={t} className="bg-[#0a1322]">{t}</option>)}
              </select>
              <select value={orden} onChange={e => setOrden(e.target.value as any)} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs font-bold">
                <option value="viejos" className="bg-[#0a1322]">Más antiguos primero</option>
                <option value="nuevos" className="bg-[#0a1322]">Más recientes primero</option>
              </select>
            </div>
            <p className="text-[11px] text-white/40 mt-2">{visibles.length} {visibles.length === 1 ? 'disco' : 'discos'}</p>

            {/* Discos */}
            <div className="mt-3 flex flex-col gap-2.5">
              {visibles.map(d => {
                const datos = estado.discos[d.key];
                const est = estadoDe(d);
                const info = ESTADOS.find(s => s.id === est)!;
                const abiertoEste = abierto === d.key;
                const subidas = d.pistas.filter(p => estado.pistas[p.id]).length;
                const repetidas = d.pistas.filter(p => p.otrosDiscos.length).length;
                return (
                  <div key={d.key} id={`disco-${d.key}`} className={`rounded-2xl border bg-white/[0.03] ${abiertoEste ? 'border-[#a855f7]/50' : 'border-white/10'} scroll-mt-4`}>
                    <div className="flex items-center gap-3 p-3">
                      <button onClick={() => setAbierto(abiertoEste ? null : d.key)} className="flex items-center gap-3 min-w-0 flex-1 text-left" aria-expanded={abiertoEste}>
                        <img src={d.portada} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover bg-black flex-shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-bold truncate">{d.nombre}</span>
                          <span className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px]">
                            <span className={`px-2 py-0.5 rounded-full font-black ${TIPO_COLOR[d.tipo]}`}>{d.tipo}</span>
                            <span className="text-white/50">{d.artista} · {d.pistas.length} {d.pistas.length === 1 ? 'canción' : 'canciones'} · {fechaCorta(d.fecha)}</span>
                            {d.tipo !== 'Sin disco' && <span className="text-white/40">· {datos?.genero || d.generoSugerido}</span>}
                            {repetidas > 0 && <span className="text-amber-300/80" title="Canciones que también salieron en otro disco"><i className="fas fa-layer-group mr-1"></i>{repetidas} repetida{repetidas > 1 ? 's' : ''}</span>}
                            {subidas > 0 && subidas < d.pistas.length && <span className="text-sky-300/80">{subidas}/{d.pistas.length} subidas</span>}
                          </span>
                        </span>
                      </button>
                      <select value={est} onChange={e => setEstadoDisco(d, e.target.value as Estado)} className={`rounded-lg border px-2 py-2 text-[11px] font-black max-w-[150px] ${info.color}`} aria-label={`Estado de ${d.nombre}`}>
                        {ESTADOS.map(s => <option key={s.id} value={s.id} className="bg-[#0a1322] text-white">{s.label}</option>)}
                      </select>
                    </div>

                    {abiertoEste && (
                      <div className="border-t border-white/10 p-4 grid md:grid-cols-[1fr_260px] gap-5">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45 mb-2">Canciones (marca cada una al subirla)</p>
                          <ol className="flex flex-col gap-1">
                            {d.pistas.map((p, i) => (
                              <li key={p.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/5">
                                <button onClick={() => togglePista(p.id)} aria-pressed={!!estado.pistas[p.id]} aria-label={`Marcar ${p.titulo} como subida`}
                                  className={`mt-0.5 w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center text-[9px] ${estado.pistas[p.id] ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/25'}`}>
                                  {estado.pistas[p.id] && <i className="fas fa-check"></i>}
                                </button>
                                <span className="text-xs text-white/40 w-5 text-right mt-0.5">{i + 1}.</span>
                                <span className="min-w-0 flex-1">
                                  <span className={`block text-sm ${estado.pistas[p.id] ? 'text-white/45 line-through' : 'text-white/90'}`}>{p.titulo}</span>
                                  {p.creditos && <span className="block text-[10px] text-white/35 truncate">{p.creditos}</span>}
                                  {p.otrosDiscos.length > 0 && <span className="block text-[10px] text-amber-300/80"><i className="fas fa-layer-group mr-1"></i>También en: {p.otrosDiscos.join(', ')}</span>}
                                </span>
                                <span className="flex gap-1 flex-shrink-0">
                                  {p.letra && <button onClick={() => copiar(p.letra!, avisar, 'Letra')} className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-white/70 hover:bg-white/10" title="Copiar letra"><i className="fas fa-align-left mr-1"></i>Letra</button>}
                                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-md bg-white/5 text-[10px] text-white/70 hover:bg-white/10" title="Escuchar en YouTube Music"><i className="fab fa-youtube"></i></a>
                                </span>
                              </li>
                            ))}
                          </ol>
                          <p className="text-[10px] text-white/35 mt-2">El orden es el de tu catálogo; confírmalo con el disco original antes de subir.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                          <a href={d.portada.replace(/(hq|mq|sd)default\.jpg/, 'maxresdefault.jpg')} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10 bg-black">
                            <img src={d.portada} alt={`Portada de ${d.nombre}`} referrerPolicy="no-referrer" className="w-full aspect-video object-cover" />
                          </a>
                          <dl className="text-[11px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                            <dt className="text-white/40">Fecha original</dt><dd>{fechaCorta(d.fecha)}</dd>
                            {d.sello && <><dt className="text-white/40">Sello ℗</dt><dd>{d.sello}</dd></>}
                            {d.distribuidor && <><dt className="text-white/40">Antes en</dt><dd>{d.distribuidor}</dd></>}
                          </dl>
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Género principal
                            <select value={datos?.genero || d.generoSugerido} onChange={e => setDisco(d.key, { genero: e.target.value })} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs normal-case tracking-normal font-bold text-white">
                              {GENEROS.map(g => <option key={g} value={g} className="bg-[#0a1322]">{g}{!datos?.genero && g === d.generoSugerido ? ' (sugerido)' : ''}</option>)}
                            </select>
                          </label>
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Género secundario
                            <select value={datos?.genero2 || d.genero2Sugerido} onChange={e => setDisco(d.key, { genero2: e.target.value })} className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs normal-case tracking-normal font-bold text-white">
                              {GENEROS.map(g => <option key={g} value={g} className="bg-[#0a1322]">{g}</option>)}
                            </select>
                          </label>
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">UPC anterior (opcional)
                            <input value={datos?.upc || ''} onChange={e => setDisco(d.key, { upc: e.target.value })} placeholder="Para conservar el historial" className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs normal-case tracking-normal text-white placeholder:text-white/25" />
                          </label>
                          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-white/45">Notas
                            <textarea value={datos?.nota || ''} onChange={e => setDisco(d.key, { nota: e.target.value })} rows={2} placeholder="Ej. falta el WAV de la pista 3" className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-xs normal-case tracking-normal text-white placeholder:text-white/25" />
                          </label>
                          <button onClick={() => copiar(fichaDisco(d, datos), avisar, 'Ficha')} className="w-full px-3 py-2.5 rounded-xl bg-[#a855f7] text-white text-xs font-black"><i className="fas fa-copy mr-2"></i>Copiar ficha para TooLost</button>
                          {d.tipo !== 'Sin disco' && (
                            <button onClick={() => navigate('/admin/documentacion-ia', { state: { lanzamiento: { artista: d.artista, nombre: d.nombre, tipo: d.tipo, fecha: d.fecha, sello: d.sello, pistas: d.pistas.map(p => p.titulo) } } })}
                              className="w-full px-3 py-2 rounded-xl bg-amber-500/15 text-amber-200 text-xs font-bold"><i className="fas fa-file-shield mr-2"></i>PDF de IA para TooLost</button>
                          )}
                          <button onClick={() => copiar(d.pistas.map(p => p.titulo).join('\n'), avisar, 'Lista')} className="w-full px-3 py-2 rounded-xl bg-white/10 text-xs font-bold"><i className="fas fa-list-ol mr-2"></i>Copiar lista de canciones</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {visibles.length === 0 && <p className="text-sm text-white/40 rounded-2xl border border-dashed border-white/10 p-6 text-center">No hay discos con esos filtros.</p>}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[12px] text-white/55 leading-relaxed">
              <p className="font-bold text-white/80 mb-1"><i className="fas fa-lightbulb text-amber-400 mr-2"></i>Para que la migración no te afecte</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Usa la <b>fecha de lanzamiento original</b> de cada disco; así el catálogo conserva su orden.</li>
                <li>Sube primero el disco nuevo en TooLost y quita el de la distribuidora anterior hasta que ya esté publicado, para no desaparecer de las plataformas.</li>
                <li>Si una canción salió en varios discos, decide si la subes en todos o solo en el principal (las marcadas con <i className="fas fa-layer-group"></i>).</li>
                <li>Las portadas de aquí son de YouTube (baja resolución): usa tus archivos originales de 3000×3000.</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {aviso && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-black shadow-xl">{aviso}</div>}
    </div>
  );
};

export default MigracionTooLost;
