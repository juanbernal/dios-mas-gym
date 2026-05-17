import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AnalyticsDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Intenta obtener analíticas reales del backend
                const res = await fetch('/api/sheet-proxy?action=getAnalytics');
                if (!res.ok) throw new Error('API Error');
                const json = await res.json();
                
                if (json && json.status === 'success' && json.data) {
                    setData(json.data);
                } else {
                    throw new Error('No data');
                }
            } catch (err) {
                console.warn('Failed to fetch real analytics, using mock data for preview.');
                // Fallback a datos de prueba (Mock Data) para visualización inicial
                setData({
                    totalViews: 12450,
                    topPosts: [
                        { title: 'El Silencio de Dios en la Prueba', views: 3420 },
                        { title: 'Armadura Completa: Rutina y Oración', views: 2850 },
                        { title: 'Cómo Vencer la Pereza Espiritual', views: 1930 }
                    ],
                    topSongs: [
                        { title: 'Guerrero de Luz', artist: 'Dios Mas Gym', plays: 4500 },
                        { title: 'Fe Inquebrantable', artist: 'Juan 614', plays: 3200 },
                        { title: 'Levántate', artist: 'Dios Mas Gym', plays: 2100 }
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
        return <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 flex items-center justify-center font-serif italic text-3xl text-[#c5a059] animate-pulse">Sincronizando radares...</div>;
    }

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
                                Observa en tiempo real qué contenido está impactando más a tu audiencia.
                            </p>
                        </div>
                        
                        {data?.isMock && (
                            <div className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 px-4 py-3 rounded-xl flex items-center gap-3 shrink-0">
                                <i className="fas fa-exclamation-circle text-[#f43f5e]"></i>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#f43f5e]">Mostrando datos de prueba</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Tarjeta de Visitas Totales */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between h-48">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/10 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10"><i className="fas fa-eye mr-2"></i> Tráfico Total (Páginas y Canciones)</p>
                        <h3 className="text-5xl font-bold text-white relative z-10">{data?.totalViews?.toLocaleString() || '0'}</h3>
                    </div>

                    {/* Tarjeta Canciones */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between h-48 md:col-span-2">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0088cc]/5 rounded-full blur-[50px] pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-4"><i className="fas fa-music mr-2"></i> Top Canciones</p>
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            {data?.topSongs?.map((song: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-white font-bold truncate pr-4">{i+1}. {song.title} <span className="text-white/30 font-normal text-xs ml-2">{song.artist}</span></span>
                                    <span className="text-[#c5a059] font-mono bg-[#c5a059]/10 px-2 py-1 rounded text-xs shrink-0">{song.plays} plays</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* Lista de Top Posts */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10 mb-8"><i className="fas fa-book-open mr-2"></i> Reflexiones Más Leídas</p>
                        
                        <div className="flex flex-col gap-4 relative z-10">
                            {data?.topPosts?.map((post: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-[#c5a059]/30 transition-colors">
                                    <div className="flex items-center gap-4 truncate pr-4">
                                        <div className="w-8 h-8 rounded-full bg-[#c5a059]/20 text-[#c5a059] flex items-center justify-center font-bold text-xs shrink-0">
                                            {i+1}
                                        </div>
                                        <span className="text-white font-serif text-lg truncate">{post.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/50 text-xs shrink-0">
                                        <i className="fas fa-eye"></i> {post.views}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsDashboard;
