import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#c5a059', '#1a2536', '#0088cc', '#00ffcc'];

const AnalyticsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [rawData, setRawData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string>('');
    const [excludeVisits, setExcludeVisits] = useState(() => {
        return localStorage.getItem('pwa_admin_user') === 'true';
    });
    const [samplingFilter, setSamplingFilter] = useState<'all' | 'main' | 'external'>('all');
    const [timeframeFilter, setTimeframeFilter] = useState<'day' | 'yesterday' | 'week' | 'month'>('week');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);

    const handleSendEmailReport = async () => {
        setSendingEmail(true);
        setEmailSuccessMsg(null);
        try {
            const res = await fetch('/api/analytics?action=sendReport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({ action: 'sendReport' })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setEmailSuccessMsg(`✅ ¡Reporte enviado con éxito a ${json.data?.recipient || 'administrador@diosmasgym.com'}!`);
            } else {
                setEmailSuccessMsg(`⚠️ ${json.message || 'Error al enviar reporte'}`);
            }
        } catch (err: any) {
            setEmailSuccessMsg(`❌ Error: ${err.message}`);
        } finally {
            setSendingEmail(false);
            setTimeout(() => setEmailSuccessMsg(null), 8000);
        }
    };

    const handleToggleExclusion = () => {
        const nextVal = !excludeVisits;
        setExcludeVisits(nextVal);
        // Tambien se apaga/enciende Google Analytics en esta sesion (al recargar lo decide index.html)
        (window as any)['ga-disable-G-ZL60YWDMDD'] = nextVal;
        if (nextVal) {
            localStorage.setItem('pwa_admin_user', 'true');
            document.cookie = "is_admin_user=true; path=/; max-age=31536000; samesite=lax";
        } else {
            localStorage.setItem('pwa_admin_user', 'false');
            document.cookie = "is_admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax";
        }
    };

    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = async (forceRefresh = false, scope: string = samplingFilter) => {
        setRefreshing(true);
        setLoadError('');
        try {
            const params = new URLSearchParams();
            if (forceRefresh) params.set('refresh', 'true');
            if (scope !== 'all') params.set('scope', scope);
            const qs = params.toString();
            const res = await fetch(`/api/analytics${qs ? `?${qs}` : ''}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getAnalytics' })
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json || json.status !== 'success' || !json.data) {
                throw new Error(json?.message || `Error ${res.status} al consultar Google Analytics`);
            }
            setRawData(json.data);
        } catch (err: any) {
            // Ya no se muestran numeros inventados: si Google no responde, se dice claramente
            console.error('No se pudo consultar Google Analytics:', err);
            setLoadError(err?.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getFilteredData = () => {
        if (!rawData) return null;

        let filteredHistory = rawData.history || [];
        let currentTotal = rawData.totalViews;
        // Las fechas vienen en la zona horaria de la propiedad de Analytics; "hoy" se calcula en esa misma zona
        const tz = rawData.meta?.timeZone || 'America/Mexico_City';

        if (timeframeFilter === 'week') {
            filteredHistory = filteredHistory.slice(-7);
            currentTotal = filteredHistory.reduce((sum: number, h: any) => sum + h.views, 0);
        } else if (timeframeFilter === 'day') {
            const todayFormatted = new Intl.DateTimeFormat('es-MX', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit'
            }).format(new Date());

            const todayEntry = filteredHistory.find((h: any) => h.date === todayFormatted);
            if (todayEntry) {
                filteredHistory = [todayEntry];
                currentTotal = todayEntry.views;
            } else {
                filteredHistory = [{ date: todayFormatted, views: 0 }];
                currentTotal = 0;
            }
        } else if (timeframeFilter === 'yesterday') {
            const yesterdayFormatted = new Intl.DateTimeFormat('es-MX', {
                timeZone: tz,
                day: '2-digit',
                month: '2-digit'
            }).format(new Date(Date.now() - 24 * 60 * 60 * 1000));

            const yesterdayEntry = filteredHistory.find((h: any) => h.date === yesterdayFormatted);
            if (yesterdayEntry) {
                filteredHistory = [yesterdayEntry];
                currentTotal = yesterdayEntry.views;
            } else {
                filteredHistory = [{ date: yesterdayFormatted, views: 0 }];
                currentTotal = 0;
            }
        }

        return {
            ...rawData,
            history: filteredHistory,
            totalViews: currentTotal
        };
    };

    const data = getFilteredData();

    useEffect(() => {
        fetchAnalytics(false, samplingFilter);
    }, [samplingFilter]);

    // ── Visitantes activos ahora + Smart Links (necesitan la clave de admin) ──
    const adminHeaders = () => ({ 'x-admin-password': localStorage.getItem('admin_password') || '' });
    const [realtime, setRealtime] = useState<any>(null);
    const [realtimeError, setRealtimeError] = useState('');
    const [sl, setSl] = useState<any>(null);
    const [slError, setSlError] = useState('');
    const [songNames, setSongNames] = useState<Record<string, string>>({});

    // Tiempo real: se actualiza cada minuto mientras la pestaña esta visible
    useEffect(() => {
        let stop = false;
        const load = async () => {
            if (document.hidden) return;
            try {
                const res = await fetch('/api/analytics?action=realtime', { headers: adminHeaders() });
                const json = await res.json().catch(() => null);
                if (stop) return;
                if (!res.ok || json?.status !== 'ok') { setRealtimeError(json?.message || `Error ${res.status}`); return; }
                setRealtimeError('');
                setRealtime(json);
            } catch (e: any) {
                if (!stop) setRealtimeError(e?.message || 'Sin conexión');
            }
        };
        load();
        const t = setInterval(load, 60000);
        // Al volver a la pestaña se actualiza de inmediato (en segundo plano no se consulta para no gastar cuota)
        const onVisible = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
    }, []);

    // Smart links: clics por plataforma y origen, segun el periodo elegido
    useEffect(() => {
        let stop = false;
        const days = timeframeFilter === 'day' ? 0 : timeframeFilter === 'yesterday' ? 'yesterday' : timeframeFilter === 'week' ? 7 : 30;
        setSlError('');
        (async () => {
            try {
                const res = await fetch(`/api/analytics?action=smartlinks&days=${days}`, { headers: adminHeaders() });
                const json = await res.json().catch(() => null);
                if (stop) return;
                if (!res.ok || json?.status !== 'ok') { setSl(null); setSlError(json?.message || `Error ${res.status}`); return; }
                setSl(json);
            } catch (e: any) {
                if (!stop) { setSl(null); setSlError(e?.message || 'Sin conexión'); }
            }
        })();
        return () => { stop = true; };
    }, [timeframeFilter]);

    // Nombres de canciones para mostrar en lugar del id del smart link
    useEffect(() => {
        (async () => {
            try {
                const [a, b] = await Promise.all([fetchMusicCatalog('diosmasgym'), fetchMusicCatalog('juan614')]);
                const map: Record<string, string> = {};
                [...a, ...b].forEach((s: any) => { if (s?.id) map[s.id] = s.name; });
                setSongNames(map);
            } catch { /* se mostrara el id */ }
        })();
    }, []);


    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/5 border-t-[#c5a059] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!rawData) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center px-6 font-['Poppins']">
                <div className="max-w-md w-full bg-[#0f111a] border border-[#f43f5e]/30 rounded-3xl p-8 text-center">
                    <i className="fas fa-triangle-exclamation text-3xl text-[#f43f5e] mb-4"></i>
                    <h2 className="text-white text-lg font-bold mb-2">No se pudo consultar Google Analytics</h2>
                    <p className="text-white/50 text-xs leading-relaxed mb-6 break-words">{loadError || 'Sin respuesta del servidor.'}</p>
                    <p className="text-white/30 text-[11px] leading-relaxed mb-6">No se muestran números de ejemplo para que nunca confundas datos inventados con datos reales.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => { setLoading(true); fetchAnalytics(true); }} className="px-5 py-2.5 rounded-full bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">Reintentar</button>
                        <button onClick={() => navigate('/admin')} className="px-5 py-2.5 rounded-full border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Volver</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
            <div className="max-w-6xl mx-auto animate-fade-in-up">
                
                {/* Header */}
                <div className="mb-12 border-b border-white/5 pb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <button onClick={() => navigate('/admin')} className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                            <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                        </button>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => fetchAnalytics(true)}
                                disabled={refreshing}
                                className={`px-4 py-2.5 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    refreshing
                                        ? 'bg-white/5 border-white/10 text-white/40 cursor-wait'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                                title="Burlar caché y consultar Google Analytics en vivo"
                            >
                                <i className={`fas fa-sync-alt text-xs ${refreshing ? 'animate-spin text-[#c5a059]' : ''}`}></i>
                                <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
                            </button>

                            <button
                                onClick={handleSendEmailReport}
                                disabled={sendingEmail}
                                className={`px-5 py-2.5 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all ${
                                    sendingEmail
                                        ? 'bg-white/5 border-white/10 text-white/40 cursor-wait'
                                        : 'bg-[#c5a059]/10 border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059] hover:text-black shadow-lg shadow-[#c5a059]/10'
                                }`}
                            >
                                {sendingEmail ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-[#c5a059] rounded-full animate-spin"></div>
                                        <span>Generando y Enviando...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-paper-plane text-xs"></i>
                                        <span>Enviar Reporte al Correo (11 PM)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {emailSuccessMsg && (
                        <div className="mb-6 p-4 rounded-2xl bg-[#0f111a] border border-[#c5a059]/40 text-xs text-white flex items-center gap-3 animate-fade-in">
                            <i className="fas fa-envelope-open-text text-[#c5a059] text-base"></i>
                            <span className="font-medium">{emailSuccessMsg}</span>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-tight">
                                Centro de <span className="text-[#c5a059]">Análisis</span>
                            </h2>
                            <p className="text-white/40 mt-4 max-w-2xl text-sm leading-relaxed">
                                Métricas avanzadas en tiempo real. Visualiza el crecimiento de tu comunidad.
                            </p>
                        </div>
                        
                        {data?.meta && (
                            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex flex-col gap-1 shrink-0 max-w-sm">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-circle-info text-[#c5a059]"></i>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Fuente: Google Analytics</span>
                                </div>
                                <span className="text-white/40 text-[10px] break-words">Solo tráfico público (sin tu panel /admin). Zona horaria de Analytics: {data.meta.timeZone}.</span>
                                
                            </div>
                        )}
                    </div>
                </div>

                                {/* Visitantes activos ahora (tiempo real) */}
                <div className="mb-8 bg-[#0f111a] border border-[#00ffcc]/20 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#00ffcc]/5 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10 relative z-10">
                        <div className="flex items-center gap-6 shrink-0">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffcc] opacity-60"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00ffcc]"></span>
                            </span>
                            <div>
                                <div className="text-5xl font-black text-white leading-none">{realtime ? realtime.activeUsers30 : '—'}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-2">Visitantes activos ahora</div>
                                <div className="text-[9px] text-white/30 mt-0.5">últimos 30 minutos</div>
                            </div>
                            <div className="pl-6 border-l border-white/10">
                                <div className="text-3xl font-black text-[#00ffcc] leading-none">{realtime ? realtime.activeUsers5 : '—'}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-2">Últimos 5 min</div>
                            </div>
                        </div>
                        {realtime && (realtime.pages?.length > 0 || realtime.countries?.length > 0) && (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Viendo ahora</p>
                                    {realtime.pages.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between gap-3 text-xs py-1">
                                            <span className="truncate text-white/80">{p.name}</span>
                                            <span className="text-[#00ffcc] font-mono shrink-0">{p.users}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">Desde</p>
                                    {realtime.countries.map((c: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between gap-3 text-xs py-1">
                                            <span className="truncate text-white/80">{c.name}</span>
                                            <span className="text-[#00ffcc] font-mono shrink-0">{c.users}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {realtimeError && <p className="mt-4 text-[10px] text-amber-300/80 relative z-10">Tiempo real no disponible: {realtimeError}</p>}
                </div>

                {/* Control de Exclusión de Visitas (Filtro de Desarrollador) */}
                <div className="mb-8 bg-[#0f111a] border border-[#c5a059]/30 rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`w-2 h-2 rounded-full ${excludeVisits ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                <h3 className="text-white text-xs font-black uppercase tracking-widest">
                                    Filtro de Administrador: {excludeVisits ? 'Activo (Excluyendo tus visitas)' : 'Inactivo (Registrando tus visitas)'}
                                </h3>
                            </div>
                            <p className="text-white/40 text-xs leading-relaxed max-w-3xl">
                                Al estar activado, tus acciones y visitas en esta aplicación (como reproducir canciones o leer reflexiones) **no serán contabilizadas** en el Centro de Análisis para mantener limpias tus métricas reales.
                            </p>
                            
                            {/* Panel de GitHub / Vercel Sitios Externos */}
                            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="text-[10px] text-[#c5a059] font-black uppercase tracking-widest shrink-0 flex items-center gap-2">
                                    <i className="fas fa-circle-info text-[#c5a059]"></i> Exclusión Automática
                                </div>
                                <p className="text-white/45 text-[10px] leading-relaxed">
                                    💡 <strong>¡100% Automático en esta App!</strong> Al haber ingresado al panel de administración, el sistema te reconoce y excluye tu tráfico permanentemente en este dispositivo.
                                    <br />
                                    <span className="text-white/30 block mt-1.5 leading-relaxed">Para tus páginas externas (ej: <code className="text-white/50 font-normal">tu-usuario.github.io/proyecto/</code> o <code className="text-white/50 font-normal">mi-sitio.vercel.app</code>), como los navegadores bloquean compartir almacenamiento entre distintos dominios por seguridad, solo debes visitarlas una vez en este navegador agregando <code className="text-white bg-white/5 px-2 py-0.5 rounded font-mono font-normal">?admin=true</code> al final del enlace para que la exclusión se active allí también.</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            <button
                                onClick={handleToggleExclusion}
                                className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none ${excludeVisits ? 'bg-[#c5a059]' : 'bg-white/10'}`}
                            >
                                <span 
                                    className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-black transition-transform duration-300 flex items-center justify-center ${excludeVisits ? 'translate-x-8' : 'translate-x-0'}`}
                                >
                                    <i className={`fas ${excludeVisits ? 'fa-eye-slash text-[#c5a059]' : 'fa-eye text-white/50'} text-[10px]`}></i>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selector de Muestreo de Datos (Filtros de Origen) */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    {[
                        { id: 'all', label: 'Muestreo Global (Todo)', icon: 'fa-globe', desc: 'Tráfico total acumulado de todos los dominios' },
                        { id: 'main', label: 'App Principal (Vercel)', icon: 'fa-cubes', desc: 'Tráfico de diosmasgym.com (sin el panel admin)' },
                        { id: 'external', label: 'Páginas Externas (GitHub Pages)', icon: 'fa-github', desc: 'Blogs y sitios externos con tu código de rastreo' }
                    ].map(option => (
                        <button
                            key={option.id}
                            onClick={() => setSamplingFilter(option.id as any)}
                            className={`flex-1 p-5 rounded-3xl border text-left transition-all ${
                                samplingFilter === option.id
                                    ? 'bg-[#c5a059]/10 border-[#c5a059] text-white shadow-[0_0_20px_rgba(197,160,89,0.15)]'
                                    : 'bg-[#0f111a] border-white/5 text-white/50 hover:border-white/20 hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <i className={`fas ${option.icon} ${samplingFilter === option.id ? 'text-[#c5a059]' : 'text-white/30'} text-sm`}></i>
                                <span className="text-[10px] font-black uppercase tracking-wider">{option.label}</span>
                            </div>
                            <p className="text-[9px] text-white/30 leading-relaxed font-sans">{option.desc}</p>
                        </button>
                    ))}
                </div>

                {/* Selector de Período Temporal */}
                <div className="mb-12">
                    <div className="flex bg-[#0f111a] border border-white/5 rounded-2xl p-1 gap-1">
                        {[
                            { id: 'day', label: 'Hoy', icon: 'fa-sun' },
                            { id: 'yesterday', label: 'Ayer', icon: 'fa-moon' },
                            { id: 'week', label: 'Últimos 7 días', icon: 'fa-calendar-week' },
                            { id: 'month', label: 'Últimos 30 días', icon: 'fa-calendar-alt' }
                        ].map(period => (
                            <button
                                key={period.id}
                                onClick={() => setTimeframeFilter(period.id as any)}
                                className={`flex-1 py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all text-[10px] font-black uppercase tracking-wider ${
                                    timeframeFilter === period.id
                                        ? 'bg-[#c5a059] text-black shadow-lg shadow-[#c5a059]/10'
                                        : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                                }`}
                            >
                                <i className={`fas ${period.icon}`}></i>
                                <span>{period.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    {/* Tarjeta de Visitas Totales */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-chart-line mr-2"></i> Tráfico Total ({timeframeFilter === 'day' ? 'Hoy' : timeframeFilter === 'yesterday' ? 'Ayer' : timeframeFilter === 'month' ? 'Mes' : 'Semana'})</p>
                        <h3 className="text-5xl font-bold text-white">{data?.totalViews?.toLocaleString() || '0'}</h3>
                    </div>

                    {/* Tarjeta de Retención */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088cc]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-clock mr-2"></i> Tiempo Promedio</p>
                        <h3 className="text-4xl font-bold text-white">{data?.avgSessionDuration || '00:00'} <span className="text-sm text-white/30 font-normal">min</span></h3>
                    </div>

                    {/* Tarjeta de Tasa de Rebote */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f43f5e]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-door-open mr-2"></i> Tasa de Rebote</p>
                        <h3 className="text-4xl font-bold text-white">{data?.bounceRate || '0%'}</h3>
                    </div>

                    {/* Tarjeta de Usuarios Nuevos vs Recurrentes */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffcc]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4"><i className="fas fa-users mr-2"></i> Fidelidad</p>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white">Nuevos ({data?.newVsReturning?.new || 0}%)</span>
                            <span className="text-white/50">Recurrentes ({data?.newVsReturning?.returning || 0}%)</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 flex overflow-hidden">
                            <div className="bg-[#00ffcc] h-full" style={{ width: `${data?.newVsReturning?.new || 0}%` }}></div>
                            <div className="bg-white/20 h-full" style={{ width: `${data?.newVsReturning?.returning || 0}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    {/* Gráfica de Dispositivos */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 relative flex flex-col lg:col-span-1 h-48">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-mobile-alt mr-2"></i> Dispositivos</p>
                        <div className="flex flex-col gap-4 mt-2">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-mobile-alt text-white/50 w-4"></i>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1"><span className="text-white">Móvil</span><span className="text-white/50">{data?.deviceBreakdown?.mobile || 0}%</span></div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5"><div className="bg-[#c5a059] h-full rounded-full" style={{ width: `${data?.deviceBreakdown?.mobile || 0}%` }}></div></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-desktop text-white/50 w-4"></i>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1"><span className="text-white">Desktop</span><span className="text-white/50">{data?.deviceBreakdown?.desktop || 0}%</span></div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5"><div className="bg-white/30 h-full rounded-full" style={{ width: `${data?.deviceBreakdown?.desktop || 0}%` }}></div></div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <i className="fas fa-tablet-alt text-white/50 w-4"></i>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1"><span className="text-white">Tablet</span><span className="text-white/50">{data?.deviceBreakdown?.tablet || 0}%</span></div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5"><div className="bg-white/20 h-full rounded-full" style={{ width: `${data?.deviceBreakdown?.tablet || 0}%` }}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfica de Distribución (Pastel) */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 relative flex flex-col lg:col-span-1 h-48">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-adjust mr-2"></i> Intereses de Audiencia</p>
                        <div className="flex-1 w-full h-full -mt-4" style={{ minHeight: 0 }}>
                            {data?.distribution && data.distribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <PieChart>
                                        <Pie
                                            data={data.distribution}
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {data.distribution.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f111a', border: '1px solid rgba(197,160,89,0.3)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-white/20 text-xs">Sin datos suficientes</div>
                            )}
                        </div>
                    </div>

                    {/* Gráfica Histórica (Líneas) */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 relative lg:col-span-2 h-48">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 relative z-10">
                            <i className="fas fa-calendar-alt mr-2"></i> {timeframeFilter === 'day' ? 'Páginas vistas de hoy' : timeframeFilter === 'yesterday' ? 'Páginas vistas de ayer' : timeframeFilter === 'month' ? 'Páginas vistas de los últimos 30 días (por día)' : 'Páginas vistas de los últimos 7 días (por día)'}
                        </p>
                        <div className="w-full h-32 relative z-10" style={{ minHeight: 0 }}>
                            {data?.history && data.history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={data.history}>
                                        <defs>
                                            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c5a059" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#c5a059" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.1)" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f111a', border: '1px solid rgba(197,160,89,0.3)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#c5a059', fontWeight: 'bold' }}
                                            labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '4px' }}
                                        />
                                        <Area type="monotone" dataKey="views" name="Visitas" stroke="#c5a059" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-white/20 text-xs">Registrando primeros días...</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lista de Top Canciones */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088cc]/5 rounded-full blur-[40px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-headphones mr-2"></i> Top Canciones (Plays)</p>
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            {data?.topSongs?.length > 0 ? data.topSongs.map((song: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-[#c5a059]/30 transition-colors">
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <span className="text-[#c5a059] font-black text-xs w-4">{i+1}.</span>
                                        <span className="text-white text-sm font-bold truncate">{song.title} <span className="text-white/30 font-normal text-[10px] ml-2 hidden sm:inline">{song.artist}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#c5a059] font-mono text-xs shrink-0 bg-[#c5a059]/10 px-2 py-1 rounded">
                                        {song.plays} <i className="fas fa-play text-[8px]"></i>
                                    </div>
                                </div>
                            )) : <div className="text-white/30 text-xs">No hay datos suficientes.</div>}
                        </div>
                    </div>

                    {/* Lista de Top Reflexiones */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-book-open mr-2"></i> Top Reflexiones (Lecturas)</p>
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            {data?.topPosts?.length > 0 ? data.topPosts.map((post: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-[#c5a059]/30 transition-colors">
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <span className="text-[#c5a059] font-black text-xs w-4">{i+1}.</span>
                                        <span className="text-white text-sm font-serif truncate">{post.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/50 font-mono text-xs shrink-0">
                                        {post.views} <i className="fas fa-book-reader text-[8px]"></i>
                                    </div>
                                </div>
                            )) : <div className="text-white/30 text-xs">No hay datos suficientes.</div>}
                        </div>
                    </div>

                    {/* Lista de Top Páginas (Page Views) */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffcc]/5 rounded-full blur-[40px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-mouse-pointer mr-2"></i> Páginas Más Visitadas (Clics)</p>
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            {data?.topPages?.length > 0 ? data.topPages.map((page: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-[#00ffcc]/30 transition-colors">
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <span className="text-[#00ffcc] font-black text-xs w-4">{i+1}.</span>
                                        <span className="text-white text-sm font-sans truncate">{page.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#00ffcc]/70 font-mono text-xs shrink-0 bg-[#00ffcc]/10 px-2 py-1 rounded">
                                        {page.views} <i className="fas fa-eye text-[8px]"></i>
                                    </div>
                                </div>
                            )) : <div className="text-white/30 text-xs">No hay datos suficientes.</div>}
                        </div>
                    </div>
                </div>


                {/* Smart Links: clics a plataformas y origen de las visitas */}
                {(() => {
                    const periodLabel = timeframeFilter === 'day' ? 'Hoy' : timeframeFilter === 'yesterday' ? 'Ayer' : timeframeFilter === 'week' ? 'Últimos 7 días' : 'Últimos 30 días';
                    const PLATFORM_NAMES: Record<string, string> = {
                        spotify: 'Spotify', apple_music: 'Apple Music', youtube: 'YouTube', amazon_music: 'Amazon Music',
                        tidal: 'Tidal', deezer: 'Deezer', audiomack: 'Audiomack', sitio_oficial: 'Sitio Oficial', sitio_web_oficial: 'Sitio Web Oficial',
                    };
                    const SOURCE_NAMES: Record<string, string> = {
                        whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube',
                        x: 'X', bio: 'Link en bio', qr: 'Código QR', google: 'Google', bing: 'Bing', '(direct)': 'Directo / sin origen',
                    };
                    const totalsByPlatform: Record<string, number> = {};
                    (sl?.links || []).forEach((l: any) => Object.entries(l.clicks || {}).forEach(([k, v]: any) => { totalsByPlatform[k] = (totalsByPlatform[k] || 0) + v; }));
                    const platformRows = Object.entries(totalsByPlatform).sort((a: any, b: any) => b[1] - a[1]);
                    const maxPlatform = Math.max(1, ...platformRows.map(r => r[1] as number));
                    const sourceRows = (sl?.sources || []).slice(0, 6);
                    const maxSource = Math.max(1, ...sourceRows.map((s: any) => s.sessions));
                    const topLinks = (sl?.links || []).slice(0, 6);
                    const ctr = sl && sl.totals.views > 0 ? Math.round((sl.totals.clicks / sl.totals.views) * 100) : 0;
                    const bar = (label: string, value: number, max: number, unit: string) => (
                        <div key={label} className="flex items-center gap-3 text-xs">
                            <span className="w-28 truncate text-white/75">{label}</span>
                            <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden"><div className="h-full bg-[#c5a059]" style={{ width: `${(value / max) * 100}%` }}></div></div>
                            <span className="w-16 text-right font-mono text-white/60">{value} {unit}</span>
                        </div>
                    );
                    return (
                        <div className="mt-8 bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full blur-[50px] pointer-events-none"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-6"><i className="fas fa-link mr-2 text-[#c5a059]"></i> Smart Links · {periodLabel}</p>

                            {slError ? (
                                <p className="text-amber-300/80 text-xs relative z-10">Estadísticas de smart links no disponibles: {slError}</p>
                            ) : !sl ? (
                                <p className="text-white/40 text-xs relative z-10">Consultando...</p>
                            ) : sl.totals.views === 0 && sl.totals.clicks === 0 ? (
                                <p className="text-white/40 text-xs relative z-10">Aún no hay visitas a smart links en este periodo.</p>
                            ) : (
                                <div className="relative z-10 space-y-8">
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: 'Visitas', value: sl.totals.views },
                                            { label: 'Clics a plataformas', value: sl.totals.clicks },
                                            { label: 'Clics por visita', value: `${ctr}%` },
                                        ].map(k => (
                                            <div key={k.label} className="bg-black/30 border border-white/5 rounded-2xl p-5 text-center">
                                                <div className="text-3xl font-black text-white">{k.value}</div>
                                                <div className="text-[9px] uppercase tracking-widest text-white/40 mt-1">{k.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Clics por plataforma</p>
                                            {platformRows.length === 0
                                                ? <p className="text-white/30 text-xs">Sin clics todavía.</p>
                                                : platformRows.map(([k, v]: any) => bar(PLATFORM_NAMES[k] || String(k).replace(/_/g, ' '), v, maxPlatform, 'clics'))}
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Origen de las visitas</p>
                                            {sourceRows.length === 0
                                                ? <p className="text-white/30 text-xs">Sin datos de origen.</p>
                                                : sourceRows.map((s: any) => bar(SOURCE_NAMES[s.source] || s.source, s.sessions, maxSource, 'ses.'))}
                                            <p className="text-[9px] text-white/25 leading-relaxed pt-1">El origen sale de dónde copiaste el link en Smart Links (WhatsApp, Instagram…). Los links copiados sin origen cuentan como "Directo".</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Enlaces más visitados</p>
                                            {topLinks.map((l: any) => (
                                                <div key={l.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                                                    <span className="text-xs text-white/80 truncate">{songNames[l.id] || l.id}</span>
                                                    <span className="text-[10px] font-mono text-white/50 shrink-0">{l.views} <i className="fas fa-eye text-[8px]"></i> · {l.totalClicks} <i className="fas fa-mouse-pointer text-[8px]"></i></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
