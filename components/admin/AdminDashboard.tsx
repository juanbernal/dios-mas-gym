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
    const [toolSearch, setToolSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todo');
    const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('admin_favorite_tools') || '[]'); } catch { return []; }
    });
    const [recentToolIds, setRecentToolIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('admin_recent_tools') || '[]'); } catch { return []; }
    });
    const push = useOneSignal();

    const loadMusicCatalog = async (forceRefresh = false) => {
        setIsSyncingMusic(true);
        try {
            const [diosmasgym, juan614] = await Promise.all([
                fetchMusicCatalog('diosmasgym', forceRefresh),
                fetchMusicCatalog('juan614', forceRefresh)
            ]);
            setMusicCatalog([
                ...diosmasgym.map(s => ({ ...s, artistGroup: 'diosmasgym' as const })),
                ...juan614.map(s => ({ ...s, artistGroup: 'juan614' as const }))
            ]);
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

        // Solo marcar como admin por defecto si no se ha configurado previamente (para permitir apagar el filtro en analíticas)
        if (localStorage.getItem('pwa_admin_user') === null) {
            localStorage.setItem('pwa_admin_user', 'true');
            document.cookie = "is_admin_user=true; path=/; max-age=31536000; samesite=lax"; // Cookie de respaldo
        }
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
            description: 'Crea imágenes promocionales para Instagram, Stories y más desde el catálogo de canciones.',
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
            id: 'smart-links',
            title: 'Smart Links',
            description: 'Genera enlaces únicos (Pre-Saves) para tus canciones con landing pages dinámicas para cada artista.',
            icon: 'fa-link',
            color: '#3b82f6',
            route: '/admin/smart-links',
            category: 'Marketing & Social'
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
            id: 'smartlink-video',
            title: 'SmartLink Image Creator',
            description: 'Genera imágenes verticales (9:16) en alta resolución con el diseño real de tu SmartLink, listas para compartir en tus Stories y Estados.',
            icon: 'fa-mobile-screen',
            color: '#c5a059',
            route: '/admin/smartlink-video',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'lyrics-manager',
            title: 'Gestor de Letras',
            description: 'Centraliza todas tus letras de Blogger (Publicadas y Borradores) en un solo gestor inteligente.',
            icon: 'fa-file-lines',
            color: '#00ffcc',
            route: '/admin/lyrics-manager',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'anti-ai-watermark',
            title: 'Mando Ejecutivo - Marca',
            description: 'Aplica el logo oficial Mando Ejecutivo, listones de fe y tus redes de Diosmasgym a tus fotos sin perder calidad.',
            icon: 'fa-shield-halved',
            color: '#c5a059',
            route: '/admin/watermark',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'push-notifications',
            title: 'Push Notifications',
            description: 'Envía alertas directas a los dispositivos de tus seguidores (Lanzamientos, Noticias, etc).',
            icon: 'fa-bell',
            color: '#f43f5e',
            route: '/admin/push-notifications',
            category: 'Marketing & Social'
        },
        {
            id: 'analytics',
            title: 'Centro de Análisis',
            description: 'Métricas en tiempo real: descubre qué reflexiones y canciones están impactando más.',
            icon: 'fa-chart-pie',
            color: '#c5a059',
            route: '/admin/analytics',
            category: 'Métricas & Audiencia'
        },
        {
            id: 'maintenance',
            title: 'Control de Mantenimiento',
            description: 'Activa o desactiva el modo de mantenimiento global de la página y configura el video animado.',
            icon: 'fa-screwdriver-wrench',
            color: '#ff4b2b',
            route: '/admin/maintenance',
            category: 'Gestión y Utilidades'
        },
        {
            id: 'municion-fe',
            title: 'Centro de Munición de Fe',
            description: 'Generador de imágenes y tarjetas motivadoras en alta resolución con versículos o citas personalizadas.',
            icon: 'fa-quote-left',
            color: '#c5a059',
            route: '/admin/municion-fe',
            category: 'Contenido Audiovisual'
        },
        {
            id: 'top5-social',
            title: 'Top 5 Canciones',
            description: 'Genera una imagen atractiva con el Top 5 de canciones para compartir en redes sociales.',
            icon: 'fa-list-ol',
            color: '#38bdf8',
            route: '/admin/top5-social',
            category: 'Marketing & Social'
        }
    ];

    const toolCategories = ['Todo', ...Array.from(new Set(tools.map(tool => tool.category)))];
    const recentTools = recentToolIds
        .map(id => tools.find(tool => tool.id === id))
        .filter(Boolean) as typeof tools;
    const visibleTools = tools
        .filter(tool => activeCategory === 'Todo' || tool.category === activeCategory)
        .filter(tool => {
            const term = toolSearch.toLowerCase();
            return !term || tool.title.toLowerCase().includes(term) || tool.description.toLowerCase().includes(term) || tool.category.toLowerCase().includes(term);
        })
        .sort((a, b) => Number(favoriteToolIds.includes(b.id)) - Number(favoriteToolIds.includes(a.id)));

    const openTool = (tool: typeof tools[number]) => {
        const nextRecent = [tool.id, ...recentToolIds.filter(id => id !== tool.id)].slice(0, 4);
        setRecentToolIds(nextRecent);
        localStorage.setItem('admin_recent_tools', JSON.stringify(nextRecent));
        if (tool.route) navigate(tool.route);
    };

    const toggleFavorite = (toolId: string) => {
        const nextFavorites = favoriteToolIds.includes(toolId)
            ? favoriteToolIds.filter(id => id !== toolId)
            : [toolId, ...favoriteToolIds];
        setFavoriteToolIds(nextFavorites);
        localStorage.setItem('admin_favorite_tools', JSON.stringify(nextFavorites));
    };

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
                <div className="mb-12 md:mb-20 flex flex-col lg:flex-row lg:items-end justify-between gap-8 md:gap-10">
                    <div className="text-left">
                        <h1 className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.6em] text-[#c5a059] mb-3 md:mb-4 flex items-center gap-2 md:gap-4">
                            <span className="w-6 md:w-12 h-px bg-[#c5a059]/30"></span> Mando Ejecutivo
                        </h1>
                        <h2 className="font-serif italic text-3xl md:text-7xl text-white leading-tight">
                            Hola, <span className="text-[#c5a059] drop-shadow-[0_0_30px_rgba(197,160,89,0.2)]">Juan</span>
                        </h2>
                    </div>

                    {/* Stats Compactos (Quick Look) */}
                    <div className="flex items-center gap-6 md:gap-12 border-l border-white/5 pl-6 md:pl-12 h-fit mb-2 md:mb-4">
                        <div className="text-left">
                            <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 md:mb-2">Build</p>
                            <p className="text-[10px] md:text-xs font-mono text-white/60">v5.0.4 Premium</p>
                        </div>
                        <div className="text-left">
                            <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 md:mb-2">Estado</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full animate-pulse ${isInstalled ? 'bg-green-500' : 'bg-[#c5a059]'}`}></div>
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/80">
                                    {isInstalled ? 'Instalado' : 'Navegador'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Módulo Central: Asistente Inteligente (Protagonista) */}
                <div className="mb-16">
                    <WeeklyContentAssistant catalog={musicCatalog} />
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    {[
                        { label: 'Nueva Letra', icon: 'fa-file-circle-plus', route: '/admin/lyrics-manager', color: '#00ffcc' },
                        { label: 'Nuevo Post', icon: 'fa-bullhorn', route: '/admin/social-post', color: '#fbbf24' },
                        { label: 'Smart Link', icon: 'fa-link', route: '/admin/smart-links', color: '#3b82f6' },
                        { label: 'Calendario', icon: 'fa-calendar-plus', route: '/admin/content-calendar', color: '#38bdf8' }
                    ].map(action => (
                        <button
                            key={action.label}
                            onClick={() => navigate(action.route)}
                            className="bg-[#0f111a] border border-white/5 rounded-3xl p-5 text-left hover:-translate-y-1 hover:border-[#c5a059]/30 transition-all group"
                        >
                            <i className={`fas ${action.icon} text-xl mb-6`} style={{ color: action.color }}></i>
                            <p className="text-white text-xs font-black uppercase tracking-widest group-hover:text-[#c5a059] transition-colors">{action.label}</p>
                        </button>
                    ))}
                </div>

                {/* Sección de Herramientas Premium (Bento Grid) */}
                <div className="mb-32">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-6 mb-10">
                        <h3 className="text-white text-[11px] font-black uppercase tracking-[0.6em] shrink-0">Arsenal Creativo</h3>
                        <div className="h-px bg-white/5 flex-1"></div>
                        <div className="relative w-full xl:w-80">
                            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                            <input
                                value={toolSearch}
                                onChange={e => setToolSearch(e.target.value)}
                                placeholder="Buscar herramienta..."
                                className="w-full bg-[#0f111a] border border-white/10 rounded-full pl-11 pr-5 py-3 text-xs text-white outline-none focus:border-[#c5a059]/40"
                            />
                        </div>
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

                    <div className="flex flex-wrap gap-2 mb-8">
                        {toolCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-5 py-2.5 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${activeCategory === category ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/5 text-white/35 border-white/10 hover:text-white'}`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {recentTools.length > 0 && (
                        <div className="mb-10">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mb-4">Últimas usadas</p>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {recentTools.map(tool => (
                                    <button
                                        key={tool.id}
                                        onClick={() => openTool(tool)}
                                        className="shrink-0 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-3 hover:border-[#c5a059]/30 transition-all"
                                    >
                                        <i className={`fas ${tool.icon}`} style={{ color: tool.color }}></i>
                                        <span className="text-[10px] font-bold text-white/70">{tool.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {visibleTools.map(tool => (
                            <div 
                                key={tool.id}
                                onClick={() => openTool(tool)}
                                className="group bg-[#0f111a] border border-white/5 p-8 rounded-[2rem] cursor-pointer hover:border-[#c5a059]/40 transition-all hover:-translate-y-2 relative overflow-hidden flex flex-col"
                            >
                                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleFavorite(tool.id);
                                    }}
                                    className={`absolute top-5 right-5 z-10 w-8 h-8 rounded-full border transition-all ${favoriteToolIds.includes(tool.id) ? 'bg-[#c5a059] border-[#c5a059] text-black' : 'bg-white/5 border-white/10 text-white/20 hover:text-[#c5a059]'}`}
                                    title="Marcar como favorito"
                                >
                                    <i className="fas fa-star text-[10px]"></i>
                                </button>
                                 
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
