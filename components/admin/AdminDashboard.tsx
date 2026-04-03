import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        const appInstalledHandler = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', appInstalledHandler);

        // Check if already in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', appInstalledHandler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const tools = [
        {
            id: 'promo-image',
            title: 'Promo Image Generator',
            description: 'Crea imágenes promocionales para Instagram, Stories y más. Personaliza textos, artistas y fondos.',
            icon: 'fa-image',
            color: '#c5a059',
            route: '/admin/promo-image'
        },
        {
            id: 'lyric-studio',
            title: 'Lyric Studio Pro',
            description: 'Genera videos líricos cinemáticos con sincronización de audio y efectos visuales modernos.',
            icon: 'fa-clapperboard',
            color: '#00ffcc',
            route: '/admin/lyric-studio'
        }
    ];

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-20 text-center relative">
                    <h1 className="font-serif italic text-6xl md:text-8xl text-white mb-6">Panel de <span className="text-[#c5a059]">Control</span></h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-10">Herramientas Estratégicas de Creación</p>
                    
                    {/* PWA INSTALL BANNER (Sticky on mobile) */}
                    {!isInstalled && (
                        <div className="sticky top-0 z-[100] md:relative mb-12">
                            <div className="max-w-md mx-auto bg-[#c5a059] border border-[#c5a059]/30 p-5 rounded-2xl md:rounded-3xl shadow-2xl shadow-[#c5a059]/20 animate-fade-in group pointer-events-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-black text-[#c5a059] rounded-full flex items-center justify-center animate-pulse border-2 border-black/10">
                                            <i className="fas fa-download text-lg"></i>
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-[11px] font-black uppercase tracking-widest text-black">Instalar App Oficial</h3>
                                            <p className="text-[8px] text-black/60 font-bold uppercase leading-tight">Diosmasgym Records</p>
                                        </div>
                                    </div>
                                    
                                    {deferredPrompt ? (
                                        <button 
                                            onClick={handleInstall}
                                            className="px-6 py-3 bg-black text-[#c5a059] font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl active:scale-95"
                                        >
                                            DESCARGAR
                                        </button>
                                    ) : (
                                        <div className="text-[8px] text-black/70 font-black uppercase text-right max-w-[120px] leading-tight">
                                            Menú → Añadir a Inicio
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isInstalled && (
                        <div className="max-w-md mx-auto text-[#22c55e] text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 bg-white/5 py-4 rounded-full border border-white/5">
                             <i className="fas fa-check-circle"></i>
                             Aplicación Oficial Activa
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {tools.map(tool => (
                        <div 
                            key={tool.id}
                            onClick={() => navigate(tool.route)}
                            className="group relative bg-[#0f111a] border border-white/5 p-12 rounded-2xl cursor-pointer hover:border-[#c5a059]/30 transition-all hover:scale-[1.02] shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all">
                                <i className={`fas ${tool.icon} text-[180px]`}></i>
                            </div>

                            <div 
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-all font-bold text-2xl"
                                style={{ backgroundColor: `${tool.color}20`, color: tool.color, border: `1px solid ${tool.color}40` }}
                            >
                                <i className={`fas ${tool.icon}`}></i>
                            </div>

                            <h2 className="text-3xl font-serif italic text-white mb-4 group-hover:text-[#c5a059] transition-colors">{tool.title}</h2>
                            <p className="text-[#94a3b8] text-sm leading-relaxed mb-10 max-w-sm">
                                {tool.description}
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest group-hover:gap-6 transition-all" style={{ color: tool.color }}>
                                Abrir Herramienta 
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-40 text-center">
                    <button 
                        onClick={() => navigate('/')}
                        className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-all underline underline-offset-8 decoration-white/10"
                    >
                        Volver al Arsenal Público
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
