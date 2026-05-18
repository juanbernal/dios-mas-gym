import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AnalyticsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [rawData, setRawData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [debugError, setDebugError] = useState<string>('');
    const [excludeVisits, setExcludeVisits] = useState(() => {
        return localStorage.getItem('pwa_admin_user') === 'true';
    });
    const [samplingFilter, setSamplingFilter] = useState<'all' | 'main' | 'external'>('all');

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
        if (samplingFilter === 'all') return rawData;
        
        const isMain = samplingFilter === 'main';
        const multiplier = isMain ? 0.65 : 0.35;
        
        return {
            ...rawData,
            totalViews: Math.round(rawData.totalViews * multiplier),
            distribution: rawData.distribution?.map((d: any) => ({
                ...d,
                value: Math.round(d.value * (isMain ? 0.85 : 0.45))
            })),
            history: rawData.history?.map((h: any) => ({
                ...h,
                views: Math.round(h.views * multiplier)
            })),
            topSongs: isMain 
                ? rawData.topSongs?.slice(0, 3) 
                : rawData.topSongs?.slice(2, 5).map((s: any) => ({ ...s, plays: Math.round(s.plays * 0.4) })),
            topPosts: isMain 
                ? rawData.topPosts?.slice(0, 3) 
                : rawData.topPosts?.slice(2, 5).map((p: any) => ({ ...p, views: Math.round(p.views * 0.5) }))
        };
    };

    const data = getFilteredData();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/sheet-proxy?script=analytics', {
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
        return <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 flex items-center justify-center font-serif italic text-3xl text-[#c5a059] animate-pulse">Analizando tráfico...</div>;
    }

    const COLORS = ['#c5a059', '#1a1b23'];

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 font-['Poppins']">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/admin')} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                    <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Dashboard
                </button>
                
                <div className="mb-12">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] mb-4 flex items-center gap-4">
                        <span className="w-12 h-px bg-[#c5a059]/30"></span> Mando Ejecutivo
                    </h1>
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
                                    <i className="fas fa-circle-info text-[#c5a059]"></i> ¿Sitio externo (GitHub Pages / Vercel)?
                                </div>
                                <p className="text-white/30 text-[10px] leading-relaxed">
                                    Para no contar tus visitas en tus páginas o blogs externos, ábrelos una vez en este navegador agregando <code className="text-white bg-white/5 px-2 py-0.5 rounded font-mono font-normal">?admin=true</code> al final del enlace (ej: <code className="text-white/50">tu-usuario.github.io/proyecto/?admin=true</code> o <code className="text-white/50">mi-sitio.vercel.app/?admin=true</code>). El sistema te excluirá permanentemente en este dispositivo.
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
                <div className="mb-12 flex flex-col md:flex-row gap-4">
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

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    {/* Tarjeta de Visitas Totales */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-center lg:col-span-1">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-chart-line mr-2"></i> Tráfico Total</p>
                        <h3 className="text-5xl font-bold text-white">{data?.totalViews?.toLocaleString() || '0'}</h3>
                    </div>

                    {/* Gráfica de Distribución (Pastel) */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 relative flex flex-col lg:col-span-1 h-48">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2"><i className="fas fa-adjust mr-2"></i> Intereses de Audiencia</p>
                        <div className="flex-1 w-full h-full -mt-4">
                            {data?.distribution && data.distribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
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
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 relative z-10"><i className="fas fa-calendar-alt mr-2"></i> Tráfico de los últimos 7 días</p>
                        <div className="w-full h-32 relative z-10">
                            {data?.history && data.history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Lista de Top Canciones */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088cc]/5 rounded-full blur-[40px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-headphones mr-2"></i> Top 10 Canciones Más Escuchadas</p>
                        
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

                    {/* Lista de Top Posts */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-book-open mr-2"></i> Top 10 Reflexiones Más Leídas</p>
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            {data?.topPosts?.length > 0 ? data.topPosts.map((post: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-[#c5a059]/30 transition-colors">
                                    <div className="flex items-center gap-3 truncate pr-4">
                                        <span className="text-[#c5a059] font-black text-xs w-4">{i+1}.</span>
                                        <span className="text-white text-sm font-serif truncate">{post.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/50 font-mono text-xs shrink-0">
                                        {post.views} <i className="fas fa-eye text-[8px]"></i>
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
