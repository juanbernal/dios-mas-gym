import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#c5a059', '#1a2536', '#0088cc', '#00ffcc'];

const AnalyticsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [rawData, setRawData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [debugError, setDebugError] = useState<string>('');
    const [excludeVisits, setExcludeVisits] = useState(() => {
        return localStorage.getItem('pwa_admin_user') === 'true';
    });
    const [samplingFilter, setSamplingFilter] = useState<'all' | 'main' | 'external'>('all');
    const [timeframeFilter, setTimeframeFilter] = useState<'day' | 'week' | 'month'>('week');

    const handleToggleExclusion = () => {
        const nextVal = !excludeVisits;
        setExcludeVisits(nextVal);
        if (nextVal) {
            localStorage.setItem('pwa_admin_user', 'true');
            document.cookie = "is_admin_user=true; path=/; max-age=31536000; samesite=lax";
        } else {
            localStorage.setItem('pwa_admin_user', 'false');
            document.cookie = "is_admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax";
        }
    };

    const getFilteredData = () => {
        if (!rawData) return null;

        if (!rawData.isMock) {
            let filteredHistory = rawData.history || [];
            let currentTotal = rawData.totalViews;
            
            if (timeframeFilter === 'week') {
                filteredHistory = filteredHistory.slice(-7);
                currentTotal = filteredHistory.reduce((sum: number, h: any) => sum + h.views, 0);
            } else if (timeframeFilter === 'day') {
                filteredHistory = filteredHistory.slice(-1);
                currentTotal = filteredHistory.reduce((sum: number, h: any) => sum + h.views, 0);
            }

            return {
                ...rawData,
                history: filteredHistory,
                totalViews: currentTotal
            };
        }
        
        // Lógica para datos de prueba (Mock Data)
        let sourceMultiplier = 1;
        if (samplingFilter === 'main') sourceMultiplier = 0.65;
        if (samplingFilter === 'external') sourceMultiplier = 0.35;
        
        let timeMultiplier = 1;
        let filteredHistory = [];
        
        if (timeframeFilter === 'day') {
            timeMultiplier = 0.07;
            filteredHistory = [
                { date: '08:00 AM', views: Math.round(180 * sourceMultiplier) },
                { date: '12:00 PM', views: Math.round(350 * sourceMultiplier) },
                { date: '04:00 PM', views: Math.round(290 * sourceMultiplier) },
                { date: '08:00 PM', views: Math.round(420 * sourceMultiplier) },
            ];
        } else if (timeframeFilter === 'month') {
            timeMultiplier = 4.3;
            filteredHistory = [
                { date: 'Semana 1', views: Math.round(2800 * sourceMultiplier) },
                { date: 'Semana 2', views: Math.round(3400 * sourceMultiplier) },
                { date: 'Semana 3', views: Math.round(4900 * sourceMultiplier) },
                { date: 'Semana 4', views: Math.round(6200 * sourceMultiplier) },
            ];
        } else {
            timeMultiplier = 1;
            filteredHistory = rawData.history?.map((h: any) => ({
                ...h,
                views: Math.round(h.views * sourceMultiplier)
            })) || [];
        }

        const isMain = samplingFilter === 'main';
        
        return {
            ...rawData,
            totalViews: Math.round(rawData.totalViews * sourceMultiplier * timeMultiplier),
            distribution: rawData.distribution?.map((d: any) => ({
                ...d,
                value: Math.round(d.value * sourceMultiplier * timeMultiplier * (isMain ? 1.25 : 0.85))
            })),
            history: filteredHistory,
            topSongs: isMain 
                ? rawData.topSongs?.slice(0, 5).map((s: any) => ({ ...s, plays: Math.round(s.plays * timeMultiplier * 0.9) }))
                : rawData.topSongs?.slice(2, 7).map((s: any) => ({ ...s, plays: Math.round(s.plays * timeMultiplier * 0.4) })),
            topPosts: isMain 
                ? rawData.topPosts?.slice(0, 5).map((p: any) => ({ ...p, views: Math.round(p.views * timeMultiplier * 0.9) }))
                : rawData.topPosts?.slice(2, 7).map((p: any) => ({ ...p, views: Math.round(p.views * timeMultiplier * 0.4) }))
        };
    };

    const data = getFilteredData();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getAnalytics' })
                });
                if (!res.ok) throw new Error('API Error');
                const json = await res.json();
                
                if (json && json.status === 'success' && json.data) {
                    setRawData(json.data);
                } else {
                    throw new Error(json.message || 'Error en respuesta de Google');
                }
            } catch (err: any) {
                setDebugError(err.message || 'Error de conexión');
                console.warn('Failed to fetch real analytics, using mock data for preview.', err);
                
                // Fallback a datos de prueba (Mock Data) avanzados
                setRawData({
                    totalViews: 12450,
                    topPosts: [
                        { title: 'El Silencio de Dios en la Prueba', views: 3420 },
                        { title: 'Armadura Completa: Rutina y Oración', views: 2850 },
                        { title: 'Cómo Vencer la Pereza Espiritual', views: 1930 },
                        { title: 'Ansiedad vs Fe: La Batalla Diaria', views: 1200 },
                        { title: 'Construyendo Disciplina Real', views: 980 }
                    ],
                    topSongs: [
                        { title: 'Guerrero de Luz', artist: 'Dios Mas Gym', plays: 4500 },
                        { title: 'Fe Inquebrantable', artist: 'Juan 614', plays: 3200 },
                        { title: 'Levántate', artist: 'Dios Mas Gym', plays: 2100 },
                        { title: 'Amanecer', artist: 'Juan 614', plays: 1500 },
                        { title: 'Vencedores', artist: 'Dios Mas Gym', plays: 1100 }
                    ],
                    history: [
                        { date: '11/05', views: 120 },
                        { date: '12/05', views: 450 },
                        { date: '13/05', views: 800 },
                        { date: '14/05', views: 750 },
                        { date: '15/05', views: 1300 },
                        { date: '16/05', views: 2100 },
                        { date: '17/05', views: 3200 }
                    ],
                    distribution: [
                        { name: 'Canciones', value: 7500 },
                        { name: 'Reflexiones', value: 4950 }
                    ],
                    isMock: true
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/5 border-t-[#c5a059] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
            <div className="max-w-6xl mx-auto animate-fade-in-up">
                
                {/* Header */}
                <div className="mb-12 border-b border-white/5 pb-8">
                    <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                        <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-tight">
                                Centro de <span className="text-[#c5a059]">Análisis</span>
                            </h2>
                            <p className="text-white/40 mt-4 max-w-2xl text-sm leading-relaxed">
                                Métricas avanzadas en tiempo real. Visualiza el crecimiento de tu comunidad.
                            </p>
                        </div>
                        
                        {data?.isMock && (
                            <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 px-4 py-3 rounded-xl flex flex-col gap-1 shrink-0 max-w-sm">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-exclamation-circle text-[#f43f5e]"></i>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#f43f5e]">Mostrando datos de prueba</span>
                                </div>
                                <span className="text-white/40 text-[10px] break-words">Esperando primer registro real en Google Sheets.</span>
                                {debugError && <span className="text-[#f43f5e]/50 text-[9px] mt-1">Debug: {debugError}</span>}
                            </div>
                        )}
                    </div>
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
                        { id: 'main', label: 'App Principal (Vercel)', icon: 'fa-cubes', desc: 'Tráfico de app.diosmasgym.com' },
                        { id: 'external', label: 'Páginas Externas (GitHub Pages)', icon: 'fa-github', desc: 'Rastreo en blogs y landing pages externas (.github.io)' }
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
                            { id: 'day', label: 'Hoy (Por Horas)', icon: 'fa-sun' },
                            { id: 'week', label: 'Últimos 7 Días (Por Día)', icon: 'fa-calendar-week' },
                            { id: 'month', label: 'Último Mes (Por Semanas)', icon: 'fa-calendar-alt' }
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-chart-line mr-2"></i> Tráfico Total ({timeframeFilter === 'day' ? 'Hoy' : timeframeFilter === 'month' ? 'Mes' : 'Semana'})</p>
                        <h3 className="text-5xl font-bold text-white">{data?.totalViews?.toLocaleString() || '0'}</h3>
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
                            <i className="fas fa-calendar-alt mr-2"></i> {timeframeFilter === 'day' ? 'Tráfico en Tiempo Real de Hoy (Horas)' : timeframeFilter === 'month' ? 'Tráfico del Último Mes (Semanas)' : 'Tráfico de los últimos 7 días'}
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

            </div>
        </div>
    );
};

export default AnalyticsDashboard;
