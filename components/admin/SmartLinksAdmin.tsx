import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

// Los enlaces que se copian siempre apuntan al dominio real (no a localhost ni a una vista previa)
const PUBLIC_BASE = 'https://www.diosmasgym.com';

// Origen del enlace: se agrega como utm_source y GA4 lo atribuye solo (sin configurar nada mas)
const SOURCES = [
    { id: 'directo', label: 'Directo', icon: 'fas fa-link' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp' },
    { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
    { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f' },
    { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok' },
    { id: 'youtube', label: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'x', label: 'X', icon: 'fab fa-x-twitter' },
    { id: 'bio', label: 'Link en bio', icon: 'fas fa-user' },
];

const PLATFORM_LABELS: Record<string, string> = {
    spotify: 'Spotify', apple_music: 'Apple Music', youtube: 'YouTube', youtube_music: 'YouTube Music',
    deezer: 'Deezer', amazon_music: 'Amazon Music', tidal: 'Tidal', soundcloud: 'SoundCloud',
};
const labelPlatform = (k: string) => PLATFORM_LABELS[k] || k.replace(/_/g, ' ');
const labelSource = (s: string) => SOURCES.find(x => x.id === s)?.label || (s === '(direct)' ? 'Directo / sin origen' : s);

const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

type LinkStat = {
    id: string;
    views: number;
    totalClicks: number;
    clicks: Record<string, number>;
    sources: { source: string; medium: string; sessions: number }[];
};
type StatsState = {
    status: 'idle' | 'loading' | 'ok' | 'error';
    message?: string;
    days: number;
    byId: Record<string, LinkStat>;
    totals: { views: number; clicks: number };
    sources: { source: string; medium: string; sessions: number }[];
};
const EMPTY_STATS: StatsState = { status: 'idle', days: 30, byId: {}, totals: { views: 0, clicks: 0 }, sources: [] };

type UpcomingRelease = { key: string; name: string; artist: string; date: string; url: string; cover: string };

type SortMode = 'recent' | 'name' | 'views';

const SmartLinksAdmin: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(() => {
        const incoming = location.state?.song as any;
        return incoming?.name || "";
    });
    const [artistFilter, setArtistFilter] = useState<'all' | 'diosmasgym' | 'juan614'>('all');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [source, setSource] = useState<string>('directo');
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });
    const [stats, setStats] = useState<StatsState>(EMPTY_STATS);
    const [upcoming, setUpcoming] = useState<UpcomingRelease[]>([]);

    const showToast = useCallback((msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    }, []);

    // ── Catalogo ────────────────────────────────────────────────
    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                setCatalog([...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (err: any) {
                console.error("Error loading catalog:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, []);

    // ── Proximos lanzamientos guardados (misma hoja que usa el admin de Proximos Lanzamientos) ──
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/sheet-proxy?read=true');
                if (!res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;
                const rows: UpcomingRelease[] = data.map((r: any, i: number) => {
                    const find = (keys: string[]) => {
                        const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
                        return k ? String(r[k] ?? '') : '';
                    };
                    return {
                        key: String(r.rowId || i),
                        artist: find(['artista']) || 'Diosmasgym',
                        name: find(['name', 'nombre', 'titulo', 'título']),
                        date: find(['releasedate', 'fecha']),
                        url: find(['audiourl', 'youtube', 'audio']),
                        cover: find(['coverimageurl', 'imagen', 'portada']),
                    };
                }).filter(r => r.name && r.date && !r.artist.toLowerCase().startsWith('config'));
                const weekAgo = Date.now() - 7 * 86400000;
                setUpcoming(rows.filter(r => { const t = new Date(r.date).getTime(); return isNaN(t) || t >= weekAgo; })
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
            } catch (e) {
                console.warn('No se pudieron leer los proximos lanzamientos:', e);
            }
        };
        load();
    }, []);

    // ── Estadisticas (GA4, ultimos 30 dias) ─────────────────────
    const loadStats = useCallback(async () => {
        setStats(s => ({ ...s, status: 'loading', message: undefined }));
        try {
            const password = localStorage.getItem('admin_password') || '';
            const res = await fetch('/api/analytics?action=smartlinks&days=30', { headers: { 'x-admin-password': password } });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status !== 'ok') {
                setStats({ ...EMPTY_STATS, status: 'error', message: data.message || `Error ${res.status}` });
                return;
            }
            const byId: Record<string, LinkStat> = {};
            (data.links || []).forEach((l: LinkStat) => { byId[l.id] = l; });
            setStats({ status: 'ok', days: data.days || 30, byId, totals: data.totals || { views: 0, clicks: 0 }, sources: data.sources || [] });
        } catch (e: any) {
            setStats({ ...EMPTY_STATS, status: 'error', message: e?.message || 'No se pudo consultar' });
        }
    }, []);
    useEffect(() => { loadStats(); }, [loadStats]);

    // ── Construccion de enlaces ─────────────────────────────────
    const withSource = useCallback((url: string, campaign: string, src: string = source) => {
        if (src === 'directo') return url;
        const u = new URL(url);
        u.searchParams.set('utm_source', src);
        u.searchParams.set('utm_medium', 'smartlink');
        u.searchParams.set('utm_campaign', slugify(campaign) || 'smartlink');
        return u.toString();
    }, [source]);

    const songUrl = (song: MusicItem, src?: string) => withSource(`${PUBLIC_BASE}/link/${song.id}`, song.name, src);

    const customUrl = (r: { name: string; artist: string; cover: string; url: string; date?: string }, src?: string) => {
        const params = new URLSearchParams({ title: r.name, artist: r.artist, cover: r.cover, url: r.url || '' });
        if (r.date) params.set('date', r.date);
        return withSource(`${PUBLIC_BASE}/link/custom?${params.toString()}`, r.name, src);
    };

    const buildMessage = (name: string, artist: string, url: string, date?: string) => {
        const future = date && !isNaN(new Date(date).getTime()) && new Date(date).getTime() > Date.now();
        return future
            ? `⏳ Próximo estreno: "${name}" de ${artist}\n🔔 Guarda el link y no te lo pierdas 👇\n${url}`
            : `🎵 "${name}" de ${artist}\n🎧 Escúchala en Spotify, YouTube, Apple Music y más 👇\n${url}`;
    };

    const copyText = (text: string, okMsg: string) => {
        navigator.clipboard.writeText(text)
            .then(() => showToast(okMsg))
            .catch(() => showToast("Error al copiar"));
    };

    const handleDownloadQr = async (url: string, name: string) => {
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=12&data=${encodeURIComponent(url)}`;
        try {
            const res = await fetch(qrSrc);
            if (!res.ok) throw new Error('qr');
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `QR-${slugify(name) || 'smartlink'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 1500);
            showToast("QR descargado");
        } catch {
            window.open(qrSrc, '_blank');
            showToast("QR abierto en otra pestaña");
        }
    };

    // ── Link manual (plegado) ───────────────────────────────────
    const [manualForm, setManualForm] = useState({ title: '', artist: 'diosmasgym', coverUrl: '', targetUrl: '', date: '' });

    const manualReady = () => {
        if (!manualForm.title || !manualForm.coverUrl) {
            showToast("Título y Portada obligatorios");
            return null;
        }
        return customUrl({ name: manualForm.title, artist: manualForm.artist, cover: manualForm.coverUrl, url: manualForm.targetUrl, date: manualForm.date || undefined });
    };
    const handleCopyManualLink = () => { const u = manualReady(); if (u) copyText(u, "Enlace manual copiado"); };
    const handlePreviewManual = () => {
        const u = manualReady();
        if (u) window.open(u.replace(PUBLIC_BASE, ''), '_blank');
    };

    // ── Lista filtrada ──────────────────────────────────────────
    const filteredCatalog = useMemo(() => {
        const q = searchQuery.toLowerCase();
        const list = catalog.filter(song => {
            if (artistFilter === 'juan614' && !song.artist.toLowerCase().includes('juan')) return false;
            if (artistFilter === 'diosmasgym' && song.artist.toLowerCase().includes('juan')) return false;
            return !q || song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
        });
        if (sortMode === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'));
        if (sortMode === 'views') return [...list].sort((a, b) => (stats.byId[b.id]?.views || 0) - (stats.byId[a.id]?.views || 0));
        return list;
    }, [catalog, searchQuery, artistFilter, sortMode, stats.byId]);

    const ctr = stats.totals.views > 0 ? Math.round((stats.totals.clicks / stats.totals.views) * 100) : 0;
    const maxSource = Math.max(1, ...stats.sources.map(s => s.sessions));

    const chip = (active: boolean) =>
        `px-3.5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${active ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/50 border-white/10 hover:text-white hover:border-white/30'}`;

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Panel
                </button>
                <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Smart <span className="text-[#c5a059]">Links</span></h1>
                <button
                    onClick={loadStats}
                    title="Actualizar estadísticas"
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all px-4 py-2 rounded-full border border-white/10"
                >
                    <i className={`fas fa-rotate text-[8px] ${stats.status === 'loading' ? 'animate-spin' : ''}`}></i>
                    <span className="hidden sm:inline">Stats</span>
                </button>
            </div>

            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

                {/* Origen del enlace */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
                    <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-1">¿Dónde vas a compartirlo?</h2>
                    <p className="text-white/40 text-[11px] mb-4">Elige el origen antes de copiar: así verás abajo desde dónde llegan las visitas.</p>
                    <div className="flex flex-wrap gap-2">
                        {SOURCES.map(s => (
                            <button key={s.id} onClick={() => setSource(s.id)} className={chip(source === s.id)}>
                                <i className={`${s.icon} mr-2`}></i>{s.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Estadisticas: si no estan disponibles solo se muestra una linea discreta */}
                {stats.status === 'error' && (
                    <p className="text-amber-300/70 text-[11px] px-2 -mt-3 flex items-center gap-2">
                        <i className="fas fa-chart-line"></i>
                        Estadísticas no disponibles: {stats.message}
                        <button onClick={loadStats} className="underline hover:text-amber-200">Reintentar</button>
                    </p>
                )}
                {stats.status !== 'error' && (
                <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
                    <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-4">
                        <i className="fas fa-chart-line mr-2"></i>Últimos {stats.days} días
                    </h2>
                    {stats.status === 'loading' && <p className="text-white/40 text-[11px]">Consultando...</p>}
                    {stats.status === 'ok' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Visitas', value: stats.totals.views },
                                    { label: 'Clics a plataformas', value: stats.totals.clicks },
                                    { label: 'Clics / visita', value: `${ctr}%` },
                                ].map(k => (
                                    <div key={k.label} className="bg-black/40 rounded-xl p-4 text-center border border-white/5">
                                        <div className="text-2xl font-black text-white">{k.value}</div>
                                        <div className="text-[8px] uppercase tracking-widest text-white/40 mt-1">{k.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Origen de las visitas</div>
                                {stats.sources.length === 0 && <p className="text-white/30 text-[11px]">Aún no hay datos con origen.</p>}
                                {stats.sources.slice(0, 5).map(s => (
                                    <div key={s.source + s.medium} className="flex items-center gap-3 text-[11px]">
                                        <span className="w-28 truncate text-white/70">{labelSource(s.source)}</span>
                                        <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#c5a059]" style={{ width: `${(s.sessions / maxSource) * 100}%` }}></div>
                                        </div>
                                        <span className="w-8 text-right text-white/60">{s.sessions}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
                )}

                {/* Catalogo */}
                <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
                    <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-5 border-b border-white/10 pb-4">
                        <i className="fas fa-database mr-2"></i> Desde el Catálogo
                    </h2>

                    <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#c5a059]/40">
                            <i className="fas fa-search"></i>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar canción o artista..."
                            className="w-full bg-black/40 border border-white/10 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059] text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-6">
                        {([['all', 'Todos'], ['diosmasgym', 'Diosmasgym'], ['juan614', 'Juan 614']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => setArtistFilter(id)} className={chip(artistFilter === id)}>{label}</button>
                        ))}
                        <select
                            value={sortMode}
                            onChange={(e) => setSortMode(e.target.value as SortMode)}
                            className="ml-auto bg-black/40 border border-white/10 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/60 outline-none"
                            aria-label="Ordenar"
                        >
                            <option value="recent">Más recientes</option>
                            <option value="name">A → Z</option>
                            <option value="views">Más visitadas</option>
                        </select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-[#c5a059] animate-pulse">
                            <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
                            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Catálogo...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredCatalog.map(song => {
                                const st = stats.byId[song.id];
                                const topClicks = st ? Object.entries(st.clicks).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${labelPlatform(k)} ${v}`).join(' · ') : '';
                                const url = songUrl(song);
                                return (
                                    <div key={song.id} className="bg-black/60 border border-white/5 rounded-xl overflow-hidden hover:border-[#c5a059]/30 transition-all">
                                        <div className="flex items-center p-4 border-b border-white/5">
                                            <img src={song.cover} alt={song.name} className="w-16 h-16 rounded-lg object-cover mr-4" />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white truncate text-sm">{song.name}</h3>
                                                <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-wider truncate">{song.artist}</p>
                                                {stats.status === 'ok' && (
                                                    <p className="text-[9px] text-white/40 mt-1 truncate" title={topClicks}>
                                                        <i className="fas fa-eye mr-1"></i>{st?.views || 0}
                                                        <i className="fas fa-mouse-pointer ml-3 mr-1"></i>{st?.totalClicks || 0}
                                                        {topClicks && <span className="ml-2 text-white/30">{topClicks}</span>}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 divide-x divide-white/5 bg-white/5">
                                            <button onClick={() => window.open(`/link/${song.id}`, '_blank')} title="Previsualizar" className="py-3 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-1">
                                                <i className="fas fa-eye"></i><span>Ver</span>
                                            </button>
                                            <button onClick={() => copyText(url, "¡Enlace copiado!")} title="Copiar enlace" className="py-3 text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059]/10 transition-all flex flex-col items-center gap-1">
                                                <i className="fas fa-copy"></i><span>Link</span>
                                            </button>
                                            <button onClick={() => copyText(buildMessage(song.name, song.artist, url, song.date), "Mensaje copiado")} title="Copiar mensaje listo para pegar" className="py-3 text-[9px] font-black uppercase tracking-widest text-[#25D366] hover:bg-[#25D366]/10 transition-all flex flex-col items-center gap-1">
                                                <i className="fab fa-whatsapp"></i><span>Mensaje</span>
                                            </button>
                                            <button onClick={() => handleDownloadQr(songUrl(song, 'qr'), song.name)} title="Descargar QR" className="py-3 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-all flex flex-col items-center gap-1">
                                                <i className="fas fa-qrcode"></i><span>QR</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredCatalog.length === 0 && (
                                <div className="col-span-full py-12 text-center text-white/30 text-sm">
                                    No se encontraron canciones que coincidan con la búsqueda.
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Proximos lanzamientos guardados */}
                {upcoming.length > 0 && (
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
                        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                            <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest">
                                <i className="fas fa-calendar mr-2"></i> Próximos lanzamientos guardados
                            </h2>
                            <button onClick={() => navigate('/admin/proximos-lanzamientos')} className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white">
                                <i className="fas fa-pen mr-2"></i>Editar lista
                            </button>
                        </div>
                        <div className="space-y-3">
                            {upcoming.map(r => {
                                const url = customUrl(r);
                                const d = new Date(r.date);
                                return (
                                    <div key={r.key} className="flex items-center gap-4 bg-black/50 border border-white/5 rounded-xl p-3">
                                        {r.cover && <img src={r.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate">{r.name}</div>
                                            <div className="text-[10px] text-[#c5a059] font-black uppercase tracking-wider truncate">
                                                {r.artist}{!isNaN(d.getTime()) && ` · ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`}
                                            </div>
                                        </div>
                                        <button onClick={() => copyText(url, "Enlace copiado")} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059]/10 rounded-lg"><i className="fas fa-copy mr-1"></i>Link</button>
                                        <button onClick={() => copyText(buildMessage(r.name, r.artist, url, r.date), "Mensaje copiado")} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#25D366] hover:bg-[#25D366]/10 rounded-lg"><i className="fab fa-whatsapp mr-1"></i>Mensaje</button>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Link manual (plegado) */}
                <details className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="cursor-pointer text-[#c5a059] text-xs font-black uppercase tracking-widest flex items-center justify-between">
                        <span><i className="fas fa-plus-circle mr-2"></i> Link manual (canción que aún no está en el catálogo)</span>
                        <i className="fas fa-chevron-down text-[8px] text-white/30"></i>
                    </summary>
                    <div className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Título de la Canción *</label>
                                <input type="text" value={manualForm.title} onChange={e => setManualForm({ ...manualForm, title: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]" placeholder="Ej. El Comienzo" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Artista *</label>
                                <select value={manualForm.artist} onChange={e => setManualForm({ ...manualForm, artist: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]">
                                    <option value="diosmasgym">Diosmasgym</option>
                                    <option value="juan614">Juan 614</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">URL de la Portada (Imagen) *</label>
                                <input type="text" value={manualForm.coverUrl} onChange={e => setManualForm({ ...manualForm, coverUrl: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">URL de Destino (Opcional)</label>
                                <input type="text" value={manualForm.targetUrl} onChange={e => setManualForm({ ...manualForm, targetUrl: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]" placeholder="Link de Pre-Save / Spotify..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Fecha y hora del estreno (Opcional: activa la cuenta regresiva)</label>
                                <input type="datetime-local" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handlePreviewManual} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 border border-white/20 rounded-xl transition-all">
                                <i className="fas fa-eye mr-2"></i> Previsualizar
                            </button>
                            <button onClick={handleCopyManualLink} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-black bg-[#c5a059] hover:bg-white rounded-xl transition-all">
                                <i className="fas fa-copy mr-2"></i> Generar & Copiar Link
                            </button>
                        </div>
                    </div>
                </details>
            </div>

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-subtle">
                    <div className="bg-black/80 backdrop-blur-xl border border-[#c5a059]/30 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(197,160,89,0.1)] flex items-center gap-4 transition-all scale-110">
                        <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(197,160,89,0.5)]">
                            <i className="fas fa-check text-lg"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">Listo</span>
                            <span className="text-xs font-medium text-white/90 tracking-wide">
                                {toast.msg}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartLinksAdmin;
