import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [musicCatalog, setMusicCatalog] = useState<MusicItem[]>([]);
    const [isSyncingMusic, setIsSyncingMusic] = useState(false);
    const [lastMusicSync, setLastMusicSync] = useState<string>('Pendiente');

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
            .slice(0, 3)
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header / Saludo */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-4 flex items-center gap-4">
                            <span className="w-12 h-px bg-[#c5a059]"></span> Centro de Mando
                        </h1>
                        <h2 className="font-serif italic text-6xl md:text-8xl text-white">
                            Hola, <span className="text-[#c5a059]">Juan</span>
                            <span className="text-[8px] opacity-20 ml-4 font-sans not-italic tracking-widest">BUILD 3.5.0</span>
                        </h2>
                    </div>
                    <div className="flex gap-10">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Herramientas</p>
                            <p className="text-2xl font-serif italic text-white">{tools.length}</p>
                        </div>
                        <div className="text-right border-l border-white/10 pl-10">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Estado PWA</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isInstalled ? 'text-green-500' : 'text-[#c5a059]'}`}>
                                {isInstalled ? 'SISTEMA INSTALADO' : 'MODO NAVEGADOR'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sección de Instalación Mejorada */}
                {!isInstalled && (
                    <div className="mb-20">
                        <div className="bg-[#0f111a] border border-[#c5a059]/20 rounded-3xl p-1 md:p-2 overflow-hidden shadow-2xl relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#c5a059]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            
                            <div className="bg-[#05070a] rounded-[1.4rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 relative z-10">
                                <div className="w-24 h-24 bg-[#c5a059] rounded-3xl flex items-center justify-center shrink-0 shadow-[0_15px_40px_rgba(197,160,89,0.4)] rotate-3 group-hover:rotate-0 transition-transform">
                                    <i className="fas fa-mobile-screen text-black text-4xl"></i>
                                </div>
                                
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-serif italic text-white mb-2">Instalar Panel de Control</h3>
                                    <p className="text-[#94a3b8] text-sm max-w-xl">
                                        Acceso instantáneo sin navegador. Instalando la App tendrás un acceso directo en tu pantalla de inicio y una experiencia más rápida y fluida.
                                    </p>
                                </div>

                                <div className="w-full md:w-auto">
                                    {deferredPrompt ? (
                                        <button 
                                            onClick={handleInstall}
                                            className="w-full md:px-12 py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all transform active:scale-95 shadow-xl"
                                        >
                                            INSTALAR AHORA
                                        </button>
                                    ) : (
                                        <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-center">
                                            <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mb-1">Instrucción Manual</p>
                                            <p className="text-[10px] text-white/50 uppercase tracking-widest">
                                                Toca <i className="fas fa-share-square mx-1 text-[#c5a059]"></i> o <i className="fas fa-ellipsis-v mx-1 text-[#c5a059]"></i> <br/>
                                                y selecciona <span className="text-white">"Añadir a inicio"</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-20 bg-[#0f111a] border border-[#c5a059]/20 rounded-[2rem] p-8 md:p-10 shadow-2xl overflow-hidden relative font-['Poppins']">
                    <div className="absolute -top-32 -right-24 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-[100px]"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-3">Base musical</p>
                            <h3 className="font-serif italic text-4xl md:text-5xl text-white">Control del catálogo</h3>
                            <p className="text-white/40 text-xs mt-3 max-w-2xl">Estadísticas rápidas de Diosmasgym y Juan 614. Usa sincronizar para revisar cambios nuevos del Google Sheet sin esperar el cache normal.</p>
                        </div>
                        <button
                            onClick={() => loadMusicCatalog(true)}
                            disabled={isSyncingMusic}
                            className="px-8 py-5 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <i className={`fas ${isSyncingMusic ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-3`}></i>
                            {isSyncingMusic ? 'Sincronizando' : 'Sincronizar ahora'}
                        </button>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        {[
                            { label: 'Total', value: musicStats.total, icon: 'fa-music' },
                            { label: 'Diosmasgym', value: musicStats.diosmasgym, icon: 'fa-dumbbell' },
                            { label: 'Juan 614', value: musicStats.juan614, icon: 'fa-microphone-lines' },
                            { label: 'Sin portada', value: musicStats.missingCover, icon: 'fa-image' },
                            { label: 'Sin fecha', value: musicStats.missingDate, icon: 'fa-calendar-xmark' }
                        ].map(stat => (
                            <div key={stat.label} className="bg-[#05070a] border border-white/5 rounded-2xl p-5">
                                <i className={`fas ${stat.icon} text-[#c5a059] mb-4`}></i>
                                <p className="text-3xl font-serif italic text-white">{stat.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Últimos lanzamientos</p>
                                <span className="text-[9px] text-[#c5a059] uppercase tracking-widest">Sync: {lastMusicSync}</span>
                            </div>
                            <div className="space-y-3">
                                {musicStats.latest.length > 0 ? musicStats.latest.map(song => (
                                    <div key={song.id} className="flex items-center gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                        <img src={song.cover || '/logo-diosmasgym.png'} alt={song.name} className="w-12 h-12 rounded-xl object-cover bg-white/5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-sm font-bold truncate">{song.name}</p>
                                            <p className="text-white/30 text-[10px] uppercase tracking-widest truncate">{song.artist} · {song.date}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-white/30 text-xs">Sin fechas registradas todavía.</p>}
                            </div>
                        </div>
                        <div className="bg-[#05070a] border border-white/5 rounded-2xl p-6 flex flex-col justify-between gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">Promos rápidas</p>
                                <p className="text-white/50 text-xs leading-relaxed">Crea una imagen promocional o un post viral usando canciones del catálogo musical ya sincronizado.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onClick={() => navigate('/admin/promo-image')} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:border-[#c5a059] transition-all">Imagen promo</button>
                                <button onClick={() => navigate('/admin/social-post')} className="py-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:border-[#c5a059] transition-all">Post automático</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-24 font-['Poppins']">
                    {Object.entries(toolsByCategory).map(([category, categoryTools]) => (
                        <div key={category} className="animate-fade-in-up">
                            <h3 className="text-white text-sm font-black uppercase tracking-[0.4em] mb-10 flex items-center gap-6">
                                <span className="text-[#c5a059]">{category}</span>
                                <div className="h-px bg-white/5 flex-1"></div>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {categoryTools.map(tool => (
                                    <div 
                                        key={tool.id}
                                        onClick={() => {
                                            if ('url' in tool && tool.url) {
                                                window.open(tool.url as string, '_blank');
                                            } else if (tool.route) {
                                                navigate(tool.route);
                                            }
                                        }}
                                        className="group relative bg-[#0f111a] border border-white/5 p-10 rounded-3xl cursor-pointer hover:border-[#c5a059]/40 transition-all hover:-translate-y-2 shadow-2xl overflow-hidden flex flex-col h-full"
                                    >
                                        {/* Glow effect on hover */}
                                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c5a059]/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div 
                                            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-all group-hover:scale-110"
                                            style={{ backgroundColor: `${tool.color}10`, color: tool.color, border: `1px solid ${tool.color}20` }}
                                        >
                                            <i className={`fas ${tool.icon} text-xl`}></i>
                                        </div>

                                        <h2 className="text-2xl font-serif italic text-white mb-4 group-hover:text-[#c5a059] transition-colors">{tool.title}</h2>
                                        <p className="text-white/40 text-[11px] leading-relaxed mb-8 flex-1">
                                            {tool.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">ACCEDER</span>
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-[#c5a059] group-hover:text-black transition-all"
                                                style={{ color: tool.color }}
                                            >
                                                <i className="fas fa-chevron-right text-[10px]"></i>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
