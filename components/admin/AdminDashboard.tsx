import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';
import WeeklyContentAssistant from './WeeklyContentAssistant';
import { useOneSignal } from '../../services/useOneSignal';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [musicCatalog, setMusicCatalog] = useState<MusicItem[]>([]);
    const [isSyncingMusic, setIsSyncingMusic] = useState(false);
    const [lastMusicSync, setLastMusicSync] = useState<string>('Pendiente');
    const push = useOneSignal();

    const loadMusicCatalog = async (forceRefresh = false) => {
        setIsSyncingMusic(true);
        try {
            const [diosmasgym, juan614] = await Promise.all([
                fetchMusicCatalog('diosmasgym', forceRefresh),
                fetchMusicCatalog('juan614', forceRefresh)
            ]);
            setMusicCatalog([...diosmasgym, ...juan614]);
            setLastMusicSync(new Date().toLocaleTimeString('es-US', { hour: '2-digit', minute: '2-digit' }));
        } catch (error) {
            console.error('Error sincronizando musica:', error);
        } finally {
            setIsSyncingMusic(false);
        }
    };

    useEffect(() => {
        // LIMPIEZA AGRESIVA DE CACHÉ Y SW VIEJOS
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    if (!registration.active?.scriptURL.includes('sw-v3.js')) {
                        registration.unregister();
                        console.log('🧹 SW viejo eliminado');
                    }
                }
            });
            
            navigator.serviceWorker.register('/sw-v3.js', { scope: '/admin' })
                .then(reg => {
                    console.log('🚀 Nuevo SW-V3 registrado para /admin');
                    reg.update();
                });
        }

        // El manifiesto ahora se carga de forma estática en index.html para mayor fiabilidad

        // Comprobar si ya existe el evento capturado globalmente
        if ((window as any).deferredPWAEvent) {
            setDeferredPrompt((window as any).deferredPWAEvent);
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            console.log('✅ PWA: Capturado en Dashboard');
            setDeferredPrompt(e);
        };

        const handlePWAReady = () => {
            if ((window as any).deferredPWAEvent) {
                setDeferredPrompt((window as any).deferredPWAEvent);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('pwa-ready', handlePWAReady);

        localStorage.setItem('pwa_admin_user', 'true'); // Marca persistente siempre que entre al panel
        document.cookie = "is_admin_user=true; path=/; max-age=31536000; samesite=lax"; // Cookie de respaldo
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('pwa-ready', handlePWAReady);
            // Opcional: no removemos el manifest para que la App siga funcionando tras instalar
        };
    }, []);

    useEffect(() => {
        loadMusicCatalog();
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsInstalled(true);
        }
    };

    const tools = [
        {
            id: 'promo-image',
            title: 'Promo Image Generator',
            description: 'Crea imágenes promocionales para Instagram, Stories y más. Personaliza textos, artistas y fondos.',
            icon: 'fa-image',
            color: '#c5a059',
            route: '/admin/promo-image',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'lyric-studio',
            title: 'Lyric Studio Pro',
            description: 'Genera videos líricos cinemáticos con sincronización de audio y efectos visuales modernos.',
            icon: 'fa-clapperboard',
            color: '#00ffcc',
            route: '/admin/lyric-studio',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'lyric-cleaner',
            title: 'Limpiador de Letras',
            description: 'Formatea letras en bruto de IA para Musixmatch de manera rápida.',
            icon: 'fa-align-left',
            color: '#10b981',
            route: '/admin/lyric-cleaner',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'proximos-lanzamientos',
            title: 'Próximos Lanzamientos',
            description: 'Gestión y programación de estrenos directamente desde la base de datos centralizada de Google.',
            icon: 'fa-rocket',
            color: '#ff4b2b',
            route: '/admin/proximos-lanzamientos',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'social-post',
            title: 'Viral Post Generator',
            description: 'Convierte letras y títulos en publicaciones de alto impacto para redes sociales con IA estratégica.',
            icon: 'fa-bullhorn',
            color: '#fbbf24',
            route: '/admin/social-post',
            category: 'Marketing & Social'
        },
        {
            id: 'press-release',
            title: 'AI Press Release',
            description: 'Redacta comunicados de prensa profesionales para blogs y revistas usando inteligencia artificial.',
            icon: 'fa-newspaper',
            color: '#d946ef',
            route: '/admin/press-release',
            category: 'Marketing & Social'
        },
        {
            id: 'smart-links',
            title: 'Smart Links',
            description: 'Genera enlaces únicos (Pre-Saves) para tus canciones con landing pages dinámicas para cada artista.',
            icon: 'fa-link',
            color: '#3b82f6',
            route: '/admin/smart-links',
            category: 'Marketing & Social'
        },
        {
            id: 'epk-generator',
            title: 'EPK Generator',
            description: 'Construye y exporta en PDF tu Electronic Press Kit (Presskit) profesional con tus fotos, bio y métricas.',
            icon: 'fa-file-pdf',
            color: '#f43f5e',
            route: '/admin/epk-generator',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'canvas-creator',
            title: 'Spotify Canvas Creator',
            description: 'Convierte tus portadas cuadradas en visuales verticales (9:16) con efectos y texturas.',
            icon: 'fa-mobile-screen-button',
            color: '#1DB954',
            route: '/admin/canvas-creator',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'metadata-tagger',
            title: 'Metadata Tagger ID3',
            description: 'Incrusta directamente la portada, ISRC y el artista dentro de tus archivos MP3 antes de distribuirlos.',
            icon: 'fa-compact-disc',
            color: '#a855f7',
            route: '/admin/metadata-tagger',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'link-bio',
            title: 'Link-in-Bio Manager',
            description: 'Gestiona tu página de enlaces para Instagram y TikTok con el diseño premium de la marca.',
            icon: 'fa-user-astronaut',
            color: '#c5a059',
            route: '/admin/links',
            category: 'Marketing & Social'
        },
        {
            id: 'video-snippet',
            title: 'Video Snippet Creator',
            description: 'Genera clips de 60 segundos para Reels/TikTok eligiendo cualquier parte de tus canciones.',
            icon: 'fa-film',
            color: '#c5a059',
            route: '/admin/video-snippet',
            category: 'Contenido Audiovisual'
        }
    ];

    // Agrupar tools por categoría
    const toolsByCategory = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool);
        return acc;
    }, {} as Record<string, typeof tools>);

    const musicStats = {
        total: musicCatalog.length,
        diosmasgym: musicCatalog.filter(song => song.artist.toLowerCase().includes('dios')).length,
        juan614: musicCatalog.filter(song => song.artist.toLowerCase().includes('juan')).length,
        missingCover: musicCatalog.filter(song => !song.cover).length,
        missingDate: musicCatalog.filter(song => !song.date).length,
        latest: [...musicCatalog]
            .filter(song => song.date)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
            <div className="max-w-7xl mx-auto">
                {/* Header / Saludo Premium */}
                <div className="mb-20 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#c5a059]/10 rounded-full blur-[80px] pointer-events-none"></div>
                        <h1 className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] mb-4 flex items-center gap-4">
                            <span className="w-12 h-px bg-[#c5a059]/30"></span> Mando Ejecutivo
                        </h1>
                        <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-tight">
                            Hola, <span className="text-[#c5a059] drop-shadow-[0_0_30px_rgba(197,160,89,0.2)]">Juan</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-12 border-l border-white/5 pl-12 h-fit mb-4">
                        <div className="text-left">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Build</p>
                            <p className="text-xs font-mono text-white/60">v4.1.0 Premium</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Estado</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full animate-pulse ${isInstalled ? 'bg-green-500' : 'bg-[#c5a059]'}`}></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                    {isInstalled ? 'Instalado' : 'Navegador'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Módulo Central: Asistente Inteligente (Protagonista) */}
                <div className="mb-16">
                    <WeeklyContentAssistant />
                </div>

                {/* Grid Superior: Instalación + Stats Rápidos */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
                    {/* Tarjeta de Instalación (si no está instalada) */}
                    {!isInstalled && (
                        <div className="lg:col-span-8 bg-[#0f111a] border border-[#c5a059]/20 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-[#c5a059] to-[#8B5A2B] rounded-3xl flex items-center justify-center shrink-0 shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                                    <i className="fas fa-rocket text-black text-3xl"></i>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-serif italic text-white mb-2">Sube de nivel tu flujo</h3>
                                    <p className="text-white/40 text-sm max-w-md">Instala la App para eliminar la barra del navegador y trabajar a pantalla completa.</p>
                                </div>
                                <button 
                                    onClick={handleInstall}
                                    className="px-10 py-5 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all transform active:scale-95 shadow-xl"
                                >
                                    Instalar App
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stats Compactos (Bento Style) */}
                    <div className={`${isInstalled ? 'lg:col-span-12' : 'lg:col-span-4'} grid grid-cols-2 gap-4 h-full`}>
                        <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                            <i className="fas fa-compact-disc text-[#c5a059] text-xl"></i>
                            <div>
                                <p className="text-3xl font-serif italic text-white">{musicStats.total}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Catálogo Total</p>
                            </div>
                        </div>
                        <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                            <i className="fas fa-rotate text-white/20 text-xl"></i>
                            <div>
                                <p className="text-xs font-bold text-white/60">{lastMusicSync}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Última Sync</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección de Herramientas Premium (Bento Grid) */}
                <div className="mb-32">
                    <div className="flex items-center gap-6 mb-16">
                        <h3 className="text-white text-[11px] font-black uppercase tracking-[0.6em] shrink-0">Arsenal Creativo</h3>
                        <div className="h-px bg-white/5 flex-1"></div>
                        {push.isSupported && (
                            <button 
                                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                                className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all ${
                                    push.isSubscribed ? 'border-[#c5a059]/40 text-[#c5a059]' : 'border-white/10 text-white/30'
                                }`}
                            >
                                <i className={`fas ${push.isSubscribed ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                                {push.isSubscribed ? 'Notificaciones On' : 'Activar Alertas'}
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {tools.map(tool => (
                            <div 
                                key={tool.id}
                                onClick={() => tool.route && navigate(tool.route)}
                                className="group bg-[#0f111a] border border-white/5 p-8 rounded-[2rem] cursor-pointer hover:border-[#c5a059]/40 transition-all hover:-translate-y-2 relative overflow-hidden flex flex-col"
                            >
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/5 group-hover:border-[#c5a059]/30 transition-all"
                                         style={{ backgroundColor: `${tool.color}10`, color: tool.color }}>
                                        <i className={`fas ${tool.icon} text-lg`}></i>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-0.5">{tool.category}</p>
                                        <h4 className="text-white font-bold text-sm truncate group-hover:text-[#c5a059] transition-colors">{tool.title}</h4>
                                    </div>
                                </div>

                                <p className="text-white/30 text-[10px] leading-relaxed flex-1 mb-6">
                                    {tool.description}
                                </p>

                                <div className="flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Ejecutar</span>
                                    <i className="fas fa-arrow-right text-[10px] text-[#c5a059]"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer del Catálogo (Más discreto) */}
                <div className="border-t border-white/5 pt-20">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-8">
                            <img src="/logo-diosmasgym.png" className="w-12 h-12 grayscale opacity-50" alt="Logo" />
                            <div>
                                <p className="text-white text-xs font-bold mb-1">Base de Datos Centralizada</p>
                                <p className="text-white/30 text-[10px] uppercase tracking-widest">Conectado a Google Sheets Cloud</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => loadMusicCatalog(true)}
                                disabled={isSyncingMusic}
                                className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-[#c5a059] transition-all flex items-center gap-3"
                            >
                                <i className={`fas ${isSyncingMusic ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                                Sincronizar Catálogo
                            </button>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <button 
                                onClick={() => navigate('/')}
                                className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all"
                            >
                                Ver Web Pública
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
