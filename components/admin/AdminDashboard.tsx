import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Simple standalone check for dashboard specific adjustments if needed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }
    }, []);

    const handleInstall = async () => {
        // Redundant, now managed by global PWAInstallPrompt
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
        },
        {
            id: 'lyric-cleaner',
            title: 'Limpiador de Letras',
            description: 'Formatea letras en bruto de IA para Musixmatch de manera rápida.',
            icon: 'fa-align-left',
            color: '#10b981',
            route: '/admin/lyric-cleaner'
        },
        {
            id: 'proximos-lanzamientos',
            title: 'Próximos Lanzamientos',
            description: 'Gestión y programación de estrenos directamente desde la base de datos centralizada de Google.',
            icon: 'fa-rocket',
            color: '#ff4b2b',
            route: '/admin/proximos-lanzamientos'
        },
        {
            id: 'social-post',
            title: 'Viral Post Generator',
            description: 'Convierte letras y títulos en publicaciones de alto impacto para redes sociales con IA estratégica.',
            icon: 'fa-bullhorn',
            color: '#fbbf24',
            route: '/admin/social-post'
        },
        {
            id: 'smart-links',
            title: 'Smart Links',
            description: 'Genera enlaces únicos (Pre-Saves) para tus canciones con landing pages dinámicas para cada artista.',
            icon: 'fa-link',
            color: '#3b82f6',
            route: '/admin/smart-links'
        }
    ];

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-20 text-center relative font-['Poppins']">
                    <h1 className="font-serif italic text-6xl md:text-8xl text-white mb-6">Panel de <span className="text-[#c5a059]">Control</span></h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-10">Herramientas Estratégicas de Creación</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-['Poppins']">
                    {tools.map(tool => (
                        <div 
                            key={tool.id}
                            onClick={() => {
                                if ('url' in tool && tool.url) {
                                    window.open(tool.url as string, '_blank');
                                } else if (tool.route) {
                                    navigate(tool.route);
                                }
                            }}
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
                                {'url' in tool ? 'Abrir Base de Datos' : 'Abrir Herramienta'} 
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
