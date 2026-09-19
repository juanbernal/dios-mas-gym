import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchMusicCatalog, fetchSavedLyrics } from '../services/musicService';
import { MusicItem } from '../types';
import { useOneSignal } from '../services/useOneSignal';
import { useAnalytics } from '../hooks/useAnalytics';

const generateSlug = (text: string) =>
    (text || '').toLowerCase()
       .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
       .replace(/[^a-z0-9]+/g, '-')
       .replace(/(^-|-$)+/g, '');

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}


const HUDCorners = ({ color }: { color: string }) => (
    <>
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l pointer-events-none" style={{ borderColor: `${color}60` }}></div>
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r pointer-events-none" style={{ borderColor: `${color}60` }}></div>
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l pointer-events-none" style={{ borderColor: `${color}60` }}></div>
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r pointer-events-none" style={{ borderColor: `${color}60` }}></div>
    </>
);

const YouTubeAudioPlayer = ({ videoId, isJuan }: { videoId: string, isJuan: boolean, key?: any }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const playerRef = React.useRef<any>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const initedRef = React.useRef(false);

    useEffect(() => {
        // Reset player states for a fresh song when videoId changes
        setIsPlaying(false);
        setProgress(0);
        setStartTime(0);
        initedRef.current = false;
        playerRef.current = null;

        const tryInit = () => {
            if (initedRef.current) return;
            if (!window.YT || !window.YT.Player) return;
            if (!containerRef.current) return;

            initedRef.current = true;

            // Create a fresh target element inside the container
            const targetDiv = document.createElement('div');
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(targetDiv);

            playerRef.current = new window.YT.Player(targetDiv, {
                height: '200',
                width: '200',
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    origin: window.location.origin
                },
                events: {
                    onStateChange: (event: any) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        } else if (
                            event.data === window.YT.PlayerState.PAUSED ||
                            event.data === window.YT.PlayerState.ENDED
                        ) {
                            setIsPlaying(false);
                        }
                    },
                    onError: (event: any) => {
                        console.error('YouTube Player Error:', event.data);
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            tryInit();
        } else {
            if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
                const tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }
            const prevCb = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof prevCb === 'function') prevCb();
                tryInit();
            };
        }

        return () => {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (_) {}
                playerRef.current = null;
            }
            initedRef.current = false;
        };
    }, [videoId]);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                    const time = playerRef.current.getCurrentTime();
                    const elapsed = time - startTime;
                    setProgress((elapsed / 60) * 100);
                    if (elapsed >= 60) {
                        playerRef.current.pauseVideo();
                        playerRef.current.seekTo(startTime);
                        setIsPlaying(false);
                        setProgress(0);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, startTime]);

    const togglePlay = () => {
        if (!playerRef.current || !playerRef.current.playVideo) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!playerRef.current || !playerRef.current.seekTo) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        let percentage = clickX / width;
        if (percentage < 0) percentage = 0;
        if (percentage > 1) percentage = 1;

        const newTime = startTime + (percentage * 60);
        playerRef.current.seekTo(newTime);
        setProgress(percentage * 100);

        if (!isPlaying) {
            playerRef.current.playVideo();
        }
    };

    const accentColor = isJuan ? '#4a90d9' : '#4a90d9';
    const waveBarCount = 16;
    const delays = [0.1, 0.4, 0.2, 0.6, 0.3, 0.8, 0.5, 0.2, 0.7, 0.4, 0.9, 0.3, 0.6, 0.1, 0.5, 0.8];

    return (
        <div className={`w-full max-w-md mb-8 rounded-2xl p-5 border shadow-2xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${isJuan ? 'bg-[#081830]/90 border-[#1e4a7a]/30' : 'bg-black/50 border-white/10 backdrop-blur-xl'}`}>
            <HUDCorners color={isJuan ? '#4a90d9' : '#4a90d9'} />

            {/* scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-[0.07]"></div>

            <div className="flex justify-between items-center relative z-10 px-1">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: accentColor }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                    VISTA PREVIA DE AUDIO (60s)
                </span>
                <span className={`text-[8px] font-mono tracking-widest ${isJuan ? 'text-[#f1f5f9]/40' : 'text-white/40'}`}>
                    {Math.floor(progress * 0.6)}s / 60s
                </span>
            </div>

            {/* Hidden YT player container — sized to prevent browser pausing, but invisible */}
            <div
                ref={containerRef}
                className="fixed pointer-events-none"
                style={{ width: '300px', height: '300px', top: 0, left: 0, opacity: 0.01, zIndex: 9999 }}
            />

            <div className="flex items-center gap-4 relative z-10">
                <button 
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border group"
                    style={{ 
                        backgroundColor: 'transparent',
                        borderColor: `${accentColor}80`,
                        color: accentColor,
                        boxShadow: `0 0 10px ${accentColor}20`
                    }}
                >
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} group-hover:scale-110 transition-transform ${!isPlaying ? 'ml-0.5' : ''}`}></i>
                </button>
                <div className="flex-1 pr-1 text-left">
                    <div className={`flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 ${isJuan ? 'text-[#f1f5f9]/60' : 'text-white/60'}`}>
                        <span>{isPlaying ? 'REPRODUCIENDO PREVIA' : 'LISTO PARA REPRODUCIR'}</span>
                        <span className="font-mono">{isPlaying ? 'AVANCE ACTIVO' : 'STANDBY'}</span>
                    </div>
                </div>
            </div>

            <div className="mt-1 cursor-pointer hover:opacity-95 group/timeline" onClick={handleTimelineClick} title="Haz clic en las barras para navegar la previa">
                <div className="flex items-end justify-between h-9 w-full relative z-10 px-1">
                    {Array.from({ length: waveBarCount }).map((_, idx) => {
                        const delay = delays[idx % delays.length];
                        const duration = 0.5 + Math.sin(idx + 1) * 0.2 + 0.5; // ~0.6s to ~1.2s
                        const isActive = (progress / 100) >= (idx / waveBarCount);
                        
                        return (
                            <div 
                                key={idx}
                                className="w-[4%] rounded-full transition-all duration-300 group-hover/timeline:scale-y-110"
                                style={{
                                    backgroundColor: accentColor,
                                    opacity: isActive ? 1 : 0.25,
                                    animation: isPlaying ? `wave-bounce ${duration}s ease-in-out infinite alternate` : 'none',
                                    animationDelay: `${delay}s`,
                                    height: isPlaying ? undefined : '5px',
                                    boxShadow: isActive ? `0 0 8px ${accentColor}` : 'none',
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ReleaseCountdown = ({ releaseDate, isJuan }: { releaseDate: string, isJuan: boolean }) => {
    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
    const [isReleased, setIsReleased] = useState(false);

    useEffect(() => {
        if (!releaseDate) {
            setIsReleased(true);
            return;
        }

        const target = new Date(releaseDate).getTime();
        if (isNaN(target)) {
            setIsReleased(true);
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setIsReleased(true);
                setTimeLeft(null);
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [releaseDate]);

    const accentColor = isJuan ? '#4a90d9' : '#4a90d9';

    if (isReleased) {
        return (
            <div className={`w-full max-w-sm flex items-center justify-center gap-2 mb-6 py-2.5 px-4 rounded-xl border text-[9px] uppercase font-black tracking-widest font-mono ${
                isJuan 
                ? 'bg-[#4a90d9]/5 border-[#4a90d9]/25 text-[#4a90d9]'
                : 'bg-green-500/5 border-green-500/20 text-green-400'
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isJuan ? 'bg-[#4a90d9]' : 'bg-green-500'}`}></span>
                ¡Ya Disponible en Plataformas!
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className={`w-full max-w-sm rounded-2xl p-4 mb-6 border text-center font-mono ${
            isJuan 
            ? 'bg-[#081830]/40 border-[#1e4a7a]/20 text-[#f1f5f9]' 
            : 'bg-black/40 border-white/5 text-white'
        }`}>
            <div className="text-[8px] uppercase tracking-[0.25em] mb-2.5 font-black" style={{ color: accentColor }}>
                ⏳ Estreno Oficial en
            </div>
            <div className="flex justify-center gap-3">
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tight" style={{ textShadow: `0 0 10px ${accentColor}30` }}>
                        {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="text-[6px] uppercase tracking-widest opacity-40 font-sans mt-0.5">Días</span>
                </div>
                <span className="text-xl font-bold opacity-30 animate-pulse">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tight" style={{ textShadow: `0 0 10px ${accentColor}30` }}>
                        {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[6px] uppercase tracking-widest opacity-40 font-sans mt-0.5">Hrs</span>
                </div>
                <span className="text-xl font-bold opacity-30 animate-pulse">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tight" style={{ textShadow: `0 0 10px ${accentColor}30` }}>
                        {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[6px] uppercase tracking-widest opacity-40 font-sans mt-0.5">Min</span>
                </div>
                <span className="text-xl font-bold opacity-30 animate-pulse">:</span>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tight text-red-500" style={{ textShadow: '0 0 10px rgba(239,68,68,0.3)' }}>
                        {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[6px] uppercase tracking-widest opacity-40 font-sans mt-0.5">Seg</span>
                </div>
            </div>
        </div>
    );
};

const SongCredits = ({ isJuan, song }: { isJuan: boolean, song: MusicItem }) => {
    const accentColor = isJuan ? '#4a90d9' : '#4a90d9';
    const bgClass = isJuan ? 'bg-[#081830]/40' : 'bg-black/30';
    const textPrimary = isJuan ? 'text-[#f1f5f9]' : 'text-white';
    const textSecondary = isJuan ? 'text-[#f1f5f9]/40' : 'text-white/40';
    const borderClass = isJuan ? 'border-[#1e4a7a]/10' : 'border-white/5';
    const mainBorderClass = isJuan ? 'border-[#1e4a7a]/20' : 'border-[#4a90d9]/15';
    
    return (
        <div className={`w-full backdrop-blur-xl p-6 rounded-2xl border shadow-[0_15px_35px_rgba(0,0,0,0.4)] text-left ${bgClass} ${mainBorderClass} relative overflow-hidden group`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isJuan ? 'from-[#4a90d9] to-[#1e4a7a]' : 'from-[#4a90d9] to-[#8c6b32]'}`}></div>
            
            <h4 className={`text-[8px] font-black uppercase tracking-[0.25em] mb-5 flex items-center gap-2`} style={{ color: accentColor }}>
                <i className="fas fa-info-circle text-[9px]"></i> CRÉDITOS DE LA CANCIÓN
            </h4>
            
            <div className="flex flex-col gap-4 pl-1">
                {/* Composition & Lyrics */}
                <div className={`flex items-center gap-4 pb-4 border-b ${borderClass}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold tracking-widest text-[12px] font-serif italic"
                         style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                        JB
                    </div>
                    <div>
                        <h5 className={`text-xs font-bold leading-tight tracking-wide ${textPrimary}`}>Juan Bernal</h5>
                        <p className={`text-[8.5px] font-mono uppercase tracking-wider mt-1 ${textSecondary}`}>Composición y Letra</p>
                    </div>
                </div>
                
                {/* Production & Engineering */}
                <div className={`flex items-center gap-4 pb-4 border-b ${borderClass}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold tracking-widest text-[12px] font-serif italic"
                         style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                        JB
                    </div>
                    <div>
                        <h5 className={`text-xs font-bold leading-tight tracking-wide ${textPrimary}`}>Juan Bernal</h5>
                        <p className={`text-[8.5px] font-mono uppercase tracking-wider mt-1 ${textSecondary}`}>Producción y Grabación</p>
                    </div>
                </div>

                {/* Record Label */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold tracking-widest text-[12px] font-serif italic"
                         style={{ backgroundColor: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                        <i className="fas fa-compact-disc text-[14px]"></i>
                    </div>
                    <div>
                        <h5 className={`text-xs font-bold leading-tight tracking-wide ${textPrimary}`}>DiosMasGym Records</h5>
                        <p className={`text-[8.5px] font-mono uppercase tracking-wider mt-1 ${textSecondary}`}>Sello Discográfico</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BIBLE_BOOKS: Record<string, { apiName: string; prettyName: string; chapters: number }> = {
  genesis: { apiName: "genesis", prettyName: "Génesis", chapters: 50 },
  josue: { apiName: "josue", prettyName: "Josué", chapters: 24 },
  salmos: { apiName: "salmos", prettyName: "Salmos", chapters: 150 },
  proverbios: { apiName: "proverbios", prettyName: "Proverbios", chapters: 31 },
  isaias: { apiName: "isaias", prettyName: "Isaías", chapters: 66 },
  romanos: { apiName: "romanos", prettyName: "Romanos", chapters: 16 },
  "1-corintios": { apiName: "1-corintios", prettyName: "1 Corintios", chapters: 16 },
  "2-corintios": { apiName: "2-corintios", prettyName: "2 Corintios", chapters: 13 },
  efesios: { apiName: "efesios", prettyName: "Efesios", chapters: 6 },
  filipenses: { apiName: "filipenses", prettyName: "Filipenses", chapters: 4 },
  hebreos: { apiName: "hebreos", prettyName: "Hebreos", chapters: 13 },
  santiago: { apiName: "santiago", prettyName: "Santiago", chapters: 5 },
  "1-pedro": { apiName: "1-pedro", prettyName: "1 Pedro", chapters: 5 },
  "1-juan": { apiName: "1-juan", prettyName: "1 Juan", chapters: 5 },
  apocalipsis: { apiName: "apocalipsis", prettyName: "Apocalipsis", chapters: 22 },
  mateo: { apiName: "mateo", prettyName: "Mateo", chapters: 28 },
  juan: { apiName: "juan", prettyName: "Juan", chapters: 21 }
};

const DGM_FAVORITE_BOOKS = ["josue", "salmos", "proverbios", "romanos", "1-corintios", "efesios", "filipenses", "isaias", "hebreos", "santiago"];
const JUAN_FAVORITE_BOOKS = ["salmos", "proverbios", "filipenses", "efesios", "juan", "mateo", "1-juan", "romanos"];
// Origen del trafico: el admin genera enlaces con ?utm_source=whatsapp|instagram|... y GA4 lo atribuye solo
const getTrafficSource = () => {
    try { return new URLSearchParams(window.location.search).get('utm_source') || ''; } catch { return ''; }
};

const PlatformButton = ({ platform, icon, color, url, isJuan, variant = 'primary' }: { platform: string, icon: string, color: string, url: string, isJuan: boolean, variant?: 'primary' | 'compact' | 'bar' | 'icon' }) => {
    const { trackEvent } = useAnalytics();
    // Un evento por plataforma (sl_click_spotify, sl_click_apple_music...): GA4 los cuenta sin dimensiones personalizadas
    const handleClick = () => {
        const slug = platform.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        trackEvent(`sl_click_${slug}`, { platform, path: window.location.pathname, src: getTrafficSource() });
    };

    // Texto legible sobre el color de la plataforma (blanco salvo que el contraste sea pobre, como el verde de Spotify)
    const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const fg = 1.05 / (lum + 0.05) >= 3.5 ? '#ffffff' : '#000000';
    const mono = isJuan ? 'font-mono' : '';

    // Boton principal: grande, con el color de la plataforma
    if (variant === 'primary') {
        return (
            <a href={url} target="_blank" rel="noreferrer" onClick={handleClick}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:brightness-110 active:scale-[0.98] transition-all"
                style={{ backgroundColor: color, color: fg }}>
                <i className={`${icon} text-2xl w-8 text-center`}></i>
                <span className={`flex-1 text-left text-[13px] font-black uppercase tracking-[0.15em] ${mono}`}>Escuchar en {platform}</span>
                <i className="fas fa-arrow-right text-sm opacity-70"></i>
            </a>
        );
    }

    // Barra fija inferior (movil): boton ancho con el nombre
    if (variant === 'bar') {
        return (
            <a href={url} target="_blank" rel="noreferrer" onClick={handleClick}
                className="flex-1 min-w-0 flex items-center justify-center gap-2.5 h-12 rounded-xl active:scale-[0.98] transition-all"
                style={{ backgroundColor: color, color: fg }}>
                <i className={`${icon} text-xl`}></i>
                <span className={`text-[12px] font-black uppercase tracking-[0.12em] truncate ${mono}`}>Escuchar en {platform}</span>
            </a>
        );
    }

    // Barra fija inferior (movil): boton cuadrado solo con el icono
    if (variant === 'icon') {
        return (
            <a href={url} target="_blank" rel="noreferrer" onClick={handleClick} aria-label={`Escuchar en ${platform}`}
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl active:scale-[0.96] transition-all"
                style={{ backgroundColor: color, color: fg }}>
                <i className={`${icon} text-xl`}></i>
            </a>
        );
    }

    // Plataformas secundarias
    return (
        <a href={url} target="_blank" rel="noreferrer" onClick={handleClick}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:scale-[1.02] ${isJuan ? 'bg-[#0b1f36]/60 border-[#4a90d9]/20 hover:border-[#4a90d9]/50' : 'bg-white/[0.05] border-white/10 hover:border-white/30'}`}>
            <i className={`${icon} text-lg w-6 text-center`} style={{ color }}></i>
            <span className={`flex-1 text-left text-[12px] font-bold truncate ${isJuan ? 'font-mono text-[#f1f5f9]' : 'text-white'}`}>{platform}</span>
        </a>
    );
};

const QrModal = ({ isOpen, onClose, url }: { isOpen: boolean, onClose: () => void, url: string }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#111] border border-[#4a90d9]/30 p-8 rounded-3xl max-w-sm w-full flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
                <h3 className="text-[#4a90d9] text-[12px] font-black uppercase tracking-[0.2em] mb-6">Escanea para escuchar</h3>
                <div className="bg-white p-4 rounded-2xl mb-6">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`} alt="QR Code" className="w-48 h-48" />
                </div>
                <button onClick={onClose} className="w-full py-3 rounded-full border border-white/10 hover:bg-white/5 text-white/70 text-[10px] font-bold uppercase tracking-widest transition-all">Cerrar</button>
            </div>
        </div>
    );
};

const InlineLyrics = ({ lyrics, songName, songSlug, isJuan }: { lyrics?: string, songName: string, songSlug?: string, isJuan: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    
    if (!lyrics) return null;

    const accentColor = isJuan ? '#4a90d9' : '#4a90d9';
    const bgClass = isJuan ? 'bg-[#081830]/40 border-[#1e4a7a]/20' : 'bg-black/45 border-white/5';
    const targetSlug = songSlug || generateSlug(songName);
    const lyricsUrl = `/letra/${targetSlug}`;
    
    return (
        <div className={`w-full max-w-6xl backdrop-blur-xl ${bgClass} border p-6 md:p-8 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500`}>
            <HUDCorners color={accentColor} />
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20" style={{ backgroundColor: accentColor }}></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 border-b border-white/5 pb-4">
                <div>
                    <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] mb-1.5 flex items-center gap-2" style={{ color: accentColor }}>
                        <i className="fas fa-file-lines"></i> Letra Oficial
                    </h3>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{songName}</h2>
                </div>

                <Link 
                    to={lyricsUrl}
                    className="self-start sm:self-auto inline-flex items-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#4a90d9]/40 text-white/90 hover:text-white transition-all duration-200 group"
                >
                    <span>Ver Letra Completa</span>
                    <i className="fas fa-arrow-up-right-from-square text-[9px] text-[#4a90d9] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
                </Link>
            </div>

            <div className={`relative z-10 transition-all duration-700 ease-in-out overflow-hidden ${expanded || lyrics.length <= 260 ? 'max-h-[5000px]' : 'max-h-[220px]'}`}>
                <div className="whitespace-pre-wrap font-serif text-base md:text-lg text-left leading-relaxed md:leading-[2.2] text-white/85 select-text">
                    {lyrics}
                </div>
                
                {/* Fade out en la parte inferior cuando está colapsado */}
                {!expanded && lyrics.length > 260 && (
                    <div className={`absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t ${isJuan ? 'from-[#081830] via-[#081830]/90' : 'from-[#050505] via-[#050505]/90'} to-transparent pointer-events-none`}></div>
                )}
            </div>

            {/* Footer con llamada a la acción y toggle */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                <Link 
                    to={lyricsUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4a90d9] hover:bg-[#3b7ac4] text-black font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-[#4a90d9]/25 hover:scale-[1.02]"
                >
                    <i className="fas fa-book-open"></i>
                    <span>Ver Letra Completa e Interactiva</span>
                    <i className="fas fa-arrow-right text-[10px]"></i>
                </Link>

                {lyrics.length > 260 && (
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="text-[11px] font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5"
                    >
                        <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs text-[#4a90d9]`}></i>
                        <span>{expanded ? 'Mostrar Menos' : 'Desplegar aquí'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const BANNERS = [
    {
        id: 'news',
        icon: 'fas fa-newspaper',
        title: 'NOTICIA EXCLUSIVA',
        text: '¡Nuevo álbum en camino! Mantente al tanto de nuestros próximos estrenos.',
        buttonText: 'Suscribirse',
        url: '#subscribe', 
    },
    {
        id: 'merch',
        icon: 'fas fa-tshirt',
        title: 'MERCH OFICIAL',
        text: 'Vístete con propósito. Descubre la nueva colección de gorras y playeras oficiales (Próximamente).',
        buttonText: 'Ver Tienda',
        url: 'https://musica.diosmasgym.com/', 
    },
    {
        id: 'social',
        icon: 'fab fa-instagram',
        title: 'DETRÁS DE CÁMARAS',
        text: 'Síguenos en Instagram y TikTok para ver cómo se hizo esta canción.',
        buttonText: 'Seguir',
        url: 'https://instagram.com/diosmasgym',
    },
    {
        id: 'playlist',
        icon: 'fas fa-fire',
        title: 'PLAYLIST DESTACADA',
        text: 'Recomendación de la semana: Escucha nuestra Playlist Oficial "Entrenamiento Espiritual".',
        buttonText: 'Escuchar',
        url: 'https://open.spotify.com/search/DiosMasGym', 
    }
];

const DynamicBanner = ({ isJuan, onSubscribe }: { isJuan: boolean, onSubscribe?: () => void }) => {
    const [banner, setBanner] = useState<typeof BANNERS[0] | null>(null);

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * BANNERS.length);
        const selected = { ...BANNERS[randomIndex] }; // Clone to avoid modifying the global array
        if (isJuan && selected.id === 'social') {
            selected.url = 'https://instagram.com/juan614oficial';
        }
        if (isJuan && selected.id === 'merch') {
            selected.url = 'https://juan614.diosmasgym.com/';
        }
        setBanner(selected);
    }, [isJuan]);

    if (!banner) return null;

    const handleAction = (e: React.MouseEvent) => {
        if (banner.url === '#subscribe') {
            e.preventDefault();
            if (onSubscribe) onSubscribe();
        }
    };

    if (isJuan) {
        return (
            <div className="w-full max-w-6xl my-4 backdrop-blur-xl bg-[#081830]/70 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/40 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group transition-all duration-500">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#4a90d9] to-[#1e4a7a]"></div>
                
                <div className="flex items-center gap-6 z-10 w-full md:w-auto">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-[#1e4a7a]/20 flex items-center justify-center border border-[#1e4a7a]/40">
                        <i className={`${banner.icon} text-2xl text-[#4a90d9]`}></i>
                    </div>
                    <div className="text-left flex-1">
                        <h4 className="text-[#4a90d9] text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] mb-1 font-mono">{banner.title}</h4>
                        <p className="text-[#f2ebd9] text-sm md:text-base opacity-90">{banner.text}</p>
                    </div>
                </div>

                <a 
                    href={banner.url}
                    onClick={handleAction}
                    target={banner.url.startsWith('#') ? '_self' : '_blank'}
                    rel="noreferrer"
                    className="z-10 shrink-0 w-full md:w-auto px-8 py-3 rounded-lg bg-[#1e4a7a]/20 border border-[#1e4a7a]/50 hover:bg-[#1e4a7a] hover:text-white text-[#4a90d9] font-bold uppercase tracking-widest text-[11px] transition-all text-center font-mono"
                >
                    {banner.buttonText}
                </a>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl my-4 backdrop-blur-xl bg-black/60 p-6 md:p-8 rounded-3xl border border-[#4a90d9]/30 shadow-[0_15px_40px_rgba(37,99,168,0.1)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-[#4a90d9]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="flex items-center gap-6 z-10 w-full md:w-auto">
                <div className="w-14 h-14 shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-[#4a90d9]/30 shadow-[0_0_15px_rgba(37,99,168,0.2)]">
                    <i className={`${banner.icon} text-2xl text-[#4a90d9]`}></i>
                </div>
                <div className="text-left flex-1">
                    <h4 className="text-[#4a90d9] text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                        {banner.title}
                        {banner.id === 'news' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    </h4>
                    <p className="text-white text-sm md:text-base opacity-80">{banner.text}</p>
                </div>
            </div>

            <a 
                href={banner.url}
                onClick={handleAction}
                target={banner.url.startsWith('#') ? '_self' : '_blank'}
                rel="noreferrer"
                className="z-10 shrink-0 w-full md:w-auto px-8 py-3 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/40 hover:bg-[#4a90d9] hover:text-black text-white font-black uppercase tracking-widest text-[11px] transition-all text-center shadow-[0_0_20px_rgba(37,99,168,0.2)] hover:shadow-[0_0_30px_rgba(37,99,168,0.5)]"
            >
                {banner.buttonText} <i className="fas fa-arrow-right ml-2 opacity-70"></i>
            </a>
        </div>
    );
};

const SmartLinkView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [song, setSong] = useState<MusicItem | null>(null);
    const [relatedSongs, setRelatedSongs] = useState<MusicItem[]>([]);
    const [otherReleases, setOtherReleases] = useState<MusicItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { isSubscribed, subscribe, unsubscribe, permission: pushPermission, busy: pushBusy, error: pushError, sendLocalTest } = useOneSignal();
    const [pushTestMsg, setPushTestMsg] = useState('');
    const { trackEvent } = useAnalytics();

    const [showQrModal, setShowQrModal] = useState(false);
    // Barra fija inferior (movil): aparece cuando los botones principales salen de la pantalla hacia arriba
    const heroBtnRef = React.useRef<HTMLDivElement>(null);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPlatforms, setShowPlatforms] = useState(false);
    const [devotional, setDevotional] = useState<{ verse: string; reference: string } | null>(null);
    const [loadingVerse, setLoadingVerse] = useState(false);

    const fetchBibleVerse = async (isJuan: boolean) => {
        setLoadingVerse(true);
        const booksList = isJuan ? JUAN_FAVORITE_BOOKS : DGM_FAVORITE_BOOKS;
        let attempts = 0;
        let success = false;
        let verseText = "";
        let citation = "";
        
        while (attempts < 3 && !success) {
            attempts++;
            try {
                const randomBookKey = booksList[Math.floor(Math.random() * booksList.length)];
                const bookData = BIBLE_BOOKS[randomBookKey];
                if (!bookData) continue;
                
                const randomChapter = Math.floor(Math.random() * bookData.chapters) + 1;
                const url = `https://bible-api.deno.dev/api/read/rv1960/${bookData.apiName}/${randomChapter}`;
                const res = await fetch(url);
                if (!res.ok) continue;
                
                const data = await res.json();
                if (data && data.vers && Array.isArray(data.vers) && data.vers.length > 0) {
                    const randomVerseObj = data.vers[Math.floor(Math.random() * data.vers.length)];
                    verseText = randomVerseObj.verse;
                    citation = `${bookData.prettyName.toUpperCase()} ${randomChapter}:${randomVerseObj.number}`;
                    success = true;
                }
            } catch (e) {
                console.warn("Bible API attempt failed:", e);
            }
        }
        
        if (success) {
            setDevotional({ verse: verseText, reference: citation });
        } else {
            // Fallback
            const fallbacks = isJuan ? [
                { verse: "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; junto a aguas de reposo me pastoreará.", reference: "SALMOS 23:1-2" },
                { verse: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.", reference: "JUAN 14:27" },
                { verse: "Estad quietos, y conoced que yo soy Dios; seré exaltado entre las naciones; enaltecido seré en la tierra.", reference: "SALMOS 46:10" }
            ] : [
                { verse: "Jehová es mi fortaleza y mi escudo; en él confió mi corazón, y fui ayudado, por lo que se gozó mi corazón, y con mi cántico le alabaré.", reference: "SALMOS 28:7" },
                { verse: "Todo lo puedo en Cristo que me fortalece.", reference: "FILIPENSES 4:13" },
                { verse: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.", reference: "JOSUÉ 1:9" }
            ];
            const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            setDevotional(randomFallback);
        }
        setLoadingVerse(false);
    };

    const getShareUrl = () => {
        if (id === 'custom') {
            // el enlace que se comparte desde la pagina no arrastra el origen (utm_*) de quien lo abrio
            const params = new URLSearchParams(location.search);
            [...params.keys()].filter(k => k.startsWith('utm_')).forEach(k => params.delete(k));
            const qs = params.toString();
            return `https://www.diosmasgym.com/link/custom${qs ? '?' + qs : ''}`;
        }
        if (id && id.startsWith('prx-') && song) {
            const params = new URLSearchParams();
            params.set('title', song.name);
            params.set('artist', song.artist);
            params.set('cover', song.cover || '');
            params.set('url', song.url || '');
            if (song.date) params.set('date', song.date);
            return `https://www.diosmasgym.com/link/custom?${params.toString()}`;
        }
        return `https://www.diosmasgym.com/link/${id}`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getShareUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        const el = heroBtnRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([entry]) => {
            setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        }, { threshold: 0 });
        io.observe(el);
        return () => io.disconnect();
    }, [song?.id, loading]);

    useEffect(() => {
        if (song) {
            trackEvent('smart_link_view', {
                title: song.name,
                artist: song.artist,
                src: getTrafficSource()
            });
            fetchBibleVerse(song.artist.toLowerCase().includes('juan'));
        }
    }, [song]);

    useEffect(() => {
        const loadSong = async () => {
            try {
                // Buscamos en ambos catálogos para enlaces normales y letras guardadas
                const [dM, j6, savedLyrics] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614'),
                    fetchSavedLyrics().catch(() => [])
                ]);
                let fullCatalog = [...dM, ...j6];

                // Hoja de Próximos Lanzamientos: solo se espera si la canción no está en el catálogo.
                // Antes se esperaba siempre y la página tardaba varios segundos en mostrar algo.
                const mergeUpcomingReleases = async () => {
                try {
                    const response = await fetch(`/api/sheet-proxy?read=true`);
                    if (response.ok) {
                        const data = await response.json();
                        const extraReleases = (data as any[]).map(r => {
                            const findKey = (keys: string[]) => {
                                const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
                                return k ? r[k] : '';
                            };
                            return {
                                id: `prx-${r.rowId || Math.random().toString(36).substr(2, 9)}`,
                                artist: findKey(['artista']) || 'Desconocido',
                                name: findKey(['name', 'nombre', 'titulo', 'título']),
                                date: findKey(['releasedate', 'fecha']),
                                url: findKey(['audiourl', 'youtube', 'audio']),
                                cover: findKey(['coverimageurl', 'imagen', 'portada']),
                                type: 'Próximo Lanzamiento'
                            };
                        }).filter(r => r.name && r.date && !r.artist.toLowerCase().startsWith('config'));
                        
                        extraReleases.forEach(extra => {
                            const exists = fullCatalog.some(c => 
                                c.name.toLowerCase() === extra.name.toLowerCase() && 
                                c.artist.toLowerCase() === extra.artist.toLowerCase()
                            );
                            if (!exists) {
                                fullCatalog.push(extra as any);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error fetching future releases from sheet:", e);
                }
                };
                const upcomingPromise = mergeUpcomingReleases();

                if (id === 'custom') {
                    const queryParams = new URLSearchParams(location.search);
                    const title = queryParams.get('title');
                    const artist = queryParams.get('artist');
                    const cover = queryParams.get('cover');
                    const url = queryParams.get('url') || '#';
                    const dateParam = queryParams.get('date');
                    const releaseDate = dateParam && !isNaN(new Date(dateParam).getTime()) ? dateParam : new Date().toISOString();
                    
                    if (title && artist && cover) {
                        const manualSong: MusicItem = {
                            id: 'custom',
                            name: title,
                            artist: artist,
                            cover: cover,
                            url: url,
                            type: 'Manual',
                            date: releaseDate
                        };
                        setSong(manualSong);
                        document.title = `${manualSong.name} - ${manualSong.artist}`;
                        setLoading(false);
                        return;
                    }
                }

                // Helper to normalize text for comparison (remove accents, lowercase, replace spaces with hyphens)
                const normalize = (str: string) =>
                    str.toLowerCase()
                       .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                       .replace(/[^a-z0-9]+/g, '-')
                       .replace(/(^-|-$)+/g, '');

                // 1. Exact ID match
                // 2. URL contains the id fragment
                // 3. Normalized ID match (handles accent differences in slugs)
                // 4. Slug built from artist+name matches the id
                const matchesId = (s: MusicItem) => {
                    if (s.id === id) return true;
                    if (s.url && id && s.url.includes(id)) return true;
                    if (id && s.id && normalize(s.id) === normalize(id)) return true;
                    const slugFromName = normalize(`${s.artist}-${s.name}`);
                    const slugFromNameOnly = normalize(s.name);
                    if (id && (normalize(id) === slugFromName || normalize(id) === slugFromNameOnly)) return true;
                    return false;
                };
                let found = fullCatalog.find(matchesId);
                if (!found) {
                    await upcomingPromise;
                    found = fullCatalog.find(matchesId);
                }

                if (found) {
                    let songWithLyrics = { ...found };
                    if (Array.isArray(savedLyrics) && savedLyrics.length > 0) {
                        const normText = (text: string) => (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                        const fNameNorm = normText(found.name);
                        const fSlug = normalize(found.name);
                        const matchedSaved = savedLyrics.find((l: any) => {
                            const lTitleNorm = normText(l.title || '');
                            return (
                                l.id === found.id ||
                                l.id === id ||
                                (l.title && normalize(l.title) === fSlug) ||
                                (lTitleNorm && fNameNorm && lTitleNorm === fNameNorm)
                            );
                        });

                        if (matchedSaved?.content && (!songWithLyrics.lyrics || songWithLyrics.lyrics.trim().length === 0 || songWithLyrics.lyrics.length < matchedSaved.content.length)) {
                            songWithLyrics.lyrics = matchedSaved.content;
                        }
                    }
                    setSong(songWithLyrics);
                    // === SEO: Dynamic meta tags for Google / Social ===
                    const songTitle = `${found.name} - ${found.artist}`;
                    const songDesc = `Escucha "${found.name}" de ${found.artist} en Spotify, YouTube, Apple Music y más. Fe · Música · Corridos · Dios Más Gym`;
                    const songImg  = found.cover || 'https://www.diosmasgym.com/logo-diosmasgym.png';
                    const songUrl  = `https://www.diosmasgym.com/link/${found.id}`;

                    document.title = songTitle;

                    const setMeta = (selector: string, attr: string, val: string) => {
                        let el = document.querySelector(selector) as HTMLMetaElement;
                        if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
                        (el as any)[attr] = val;
                    };

                    // Standard
                    setMeta('meta[name="description"]',         'content', songDesc);
                    setMeta('meta[name="keywords"]',            'content', `${found.name}, ${found.artist}, diosmasgym, juan614, musica cristiana, corridos tumbados, fe, gym`);
                    setMeta('link[rel="canonical"]',            'href',    songUrl);

                    // Open Graph (WhatsApp, Facebook)
                    setMeta('meta[property="og:title"]',        'content', songTitle);
                    setMeta('meta[property="og:description"]',  'content', songDesc);
                    setMeta('meta[property="og:image"]',        'content', songImg);
                    setMeta('meta[property="og:url"]',          'content', songUrl);
                    setMeta('meta[property="og:type"]',         'content', 'music.song');

                    // Twitter Card
                    setMeta('meta[name="twitter:card"]',        'content', 'summary_large_image');
                    setMeta('meta[name="twitter:title"]',       'content', songTitle);
                    setMeta('meta[name="twitter:description"]', 'content', songDesc);
                    setMeta('meta[name="twitter:image"]',       'content', songImg);


                    // Buscar canciones del mismo álbum
                    let related = fullCatalog.filter(s => {
                        if (s.artist.toLowerCase() !== found.artist.toLowerCase()) return false;
                        if (s.id === found.id) return false;
                        
                        // 1. Misma portada
                        if (s.cover && found.cover && s.cover === found.cover) return true;
                        
                        // 2. Misma fecha exacta
                        if (s.date && found.date && s.date === found.date) return true;
                        
                        // 3. Fechas muy cercanas (dentro de 10 minutos, para tolerar pequeñas variaciones en el auto-sync)
                        if (s.date && found.date) {
                            try {
                                const diff = Math.abs(new Date(s.date).getTime() - new Date(found.date).getTime());
                                if (diff <= 10 * 60 * 1000) return true;
                            } catch (e) {}
                        }
                        
                        return false;
                    });
                    
                    // Protección para Juan 614 (si sube más de 15 temas el mismo día que no son un álbum)
                    // Filtramos adicionalmente por la misma portada si hay muchísimas canciones
                    if (related.length > 15) {
                        related = related.filter(s => s.cover === found.cover);
                    }
                    
                    setRelatedSongs(related);

                    // Buscar otros lanzamientos del mismo artista (excluyendo el tema actual y los relacionados) de forma aleatoria
                    const others = fullCatalog.filter(s => 
                        s.artist.toLowerCase() === found.artist.toLowerCase() &&
                        s.id !== found.id &&
                        !related.some(r => r.id === s.id)
                    );
                    const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 5);
                    setOtherReleases(randomOthers);
                } else if (Array.isArray(savedLyrics) && savedLyrics.length > 0) {
                    const normText = (text: string) => (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                    const slugNorm = normText(id || '');
                    const matchedSaved = savedLyrics.find((l: any) => {
                        const lTitleNorm = normText(l.title || '');
                        return (
                            l.id === id ||
                            (id && normalize(l.title || '') === normalize(id)) ||
                            (lTitleNorm && slugNorm && lTitleNorm === slugNorm)
                        );
                    });
                    if (matchedSaved) {
                        const lyricSong: MusicItem = {
                            id: matchedSaved.id || id || 'song',
                            name: matchedSaved.title,
                            artist: matchedSaved.artist || 'Dios Mas Gym',
                            cover: matchedSaved.cover || '/logo-diosmasgym.png',
                            url: matchedSaved.url || '',
                            type: 'Single',
                            lyrics: matchedSaved.content,
                            date: matchedSaved.date || new Date().toISOString()
                        };
                        setSong(lyricSong);
                        document.title = `${lyricSong.name} - ${lyricSong.artist}`;
                        setLoading(false);
                        return;
                    }
                    setErrorMsg(`No se encontró el enlace con el ID: ${id}`);
                } else {
                    setErrorMsg(`No se encontró el enlace con el ID: ${id}`);
                }
            } catch (err: any) {
                console.error("Error cargando el smart link:", err);
                setErrorMsg(`Error de carga: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadSong();
    }, [id, navigate, location.search]);

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#4a90d9] border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-8">
                <i className="fas fa-exclamation-triangle text-4xl text-[#4a90d9] mb-4"></i>
                <h1 className="text-2xl font-serif italic mb-2 text-center">Enlace no disponible</h1>
                <p className="text-white/50 text-xs mb-8 text-center">{errorMsg}</p>
                <button onClick={() => navigate('/')} className="bg-[#4a90d9] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                    Volver al Inicio
                </button>
            </div>
        );
    }

    if (!song) return null;

    const isJuan = song.artist.toLowerCase().includes('juan');

    const getPlatformUrl = (platform: string) => {
        const urlStr = song.url.toLowerCase();
        const query = encodeURIComponent(`${song.name} ${song.artist}`);
        
        if (platform === 'Spotify') {
            if (urlStr.includes('spotify.com')) return song.url;
            return `https://open.spotify.com/search/${query}`;
        }
        if (platform === 'YouTube') {
            if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) return song.url;
            return `https://www.youtube.com/results?search_query=${query}`;
        }
        if (platform === 'Apple Music') {
            if (urlStr.includes('apple.com')) return song.url;
            return `https://music.apple.com/us/search?term=${query}`;
        }
        if (platform === 'Deezer') {
            if (urlStr.includes('deezer.com')) return song.url;
            return `https://www.deezer.com/search/${query}`;
        }
        if (platform === 'Amazon Music') {
            if (urlStr.includes('amazon.com')) return song.url;
            return `https://music.amazon.com/search/${query}`;
        }
        if (platform === 'Tidal') {
            if (urlStr.includes('tidal.com')) return song.url;
            return `https://tidal.com/search?q=${query}`;
        }
        if (platform === 'Audiomack') {
            if (urlStr.includes('audiomack.com')) return song.url;
            return `https://audiomack.com/search?q=${query}`;
        }
        if (platform === 'Pandora') {
            if (urlStr.includes('pandora.com')) return song.url;
            return `https://pandora.com/search/${query}/all`;
        }
        return song.url;
    };

    const getEmbedData = () => {
        const urlStr = song.url;
        if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) {
            const videoId = urlStr.includes('youtu.be') ? urlStr.split('/').pop() : new URLSearchParams(new URL(urlStr).search).get('v');
            if (videoId) return { type: 'youtube', id: videoId };
        }
        if (urlStr.includes('spotify.com/track')) {
            const trackId = urlStr.split('track/')[1]?.split('?')[0];
            if (trackId) return { type: 'spotify', url: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator` };
        }
        return null;
    };

    const embedData = getEmbedData();

    // === DISEÑO UNIFICADO: un solo layout para Diosmasgym y Juan 614; cada artista aporta su tema ===
    const T = isJuan ? {
        bg: '#07111d', accent: '#4a90d9',
        mono: 'font-mono', titleColor: 'text-[#f2ebd9]', text: 'text-[#f1f5f9]',
        card: 'bg-[#0b1f36]/55 border-[#4a90d9]/15',
        chip: 'bg-[#0b1f36]/60 border-[#4a90d9]/20 hover:border-[#4a90d9]/50',
        round: 'bg-[#0b1f36]/60 border-[#4a90d9]/20 hover:bg-[#4a90d9] hover:text-black',
        logo: '/logo-juan614-v2-sm.webp', brand: 'Juan 614', home: 'https://juan614.diosmasgym.com/', siteLabel: 'Sitio Web Oficial',
        verseTitle: 'Palabra de esperanza', verseIcon: 'fa-book-bible', verseRef: 'text-[#4a90d9]/70',
        shareTitle: 'Compartir', shareText: `Escucha esto: "${song.name}" de ${song.artist}: `,
        showX: false, dedicate: false, temple: false,
        subTitle: 'Próximos estrenos', subLabel: 'Avísame', subDone: '¡Suscrito!', subHint: '',
        otherTitle: `Más de ${song.artist}`, showType: false,
        followTitle: 'Sígueme', copyright: 'Juan 614.',
        socials: [
            { href: 'https://instagram.com/juan614oficial', icon: 'fab fa-instagram', hover: 'hover:bg-[#4a90d9]/30' },
            { href: 'https://tiktok.com/@juan614oficial', icon: 'fab fa-tiktok', hover: 'hover:bg-[#4a90d9]/30' },
        ],
    } : {
        bg: '#060810', accent: '#4a90d9',
        mono: '', titleColor: 'text-white', text: 'text-white',
        card: 'bg-white/[0.05] border-white/10',
        chip: 'bg-white/[0.05] border-white/10 hover:border-white/30',
        round: 'bg-white/5 border-white/10 hover:bg-[#4a90d9] hover:text-black',
        logo: '/logo-diosmasgym-sm.webp', brand: 'Dios Mas Gym', home: 'https://musica.diosmasgym.com/', siteLabel: 'Sitio Oficial',
        verseTitle: 'Escudo de fe / aliento diario', verseIcon: 'fa-shield-halved', verseRef: 'text-white/40',
        shareTitle: 'Compartir con el mundo', shareText: `¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}: `,
        showX: true, dedicate: true, temple: true,
        subTitle: 'No te pierdas de nada', subLabel: 'Avísame de nuevos estrenos', subDone: '¡Suscrito! Espera música pronto',
        subHint: `Recibe una notificación push cuando ${song.artist} saque música nueva`,
        otherTitle: `Otros lanzamientos de ${song.artist}`, showType: true,
        followTitle: 'Únete a la comunidad', copyright: 'DiosMasGym Records. Todos los derechos reservados.',
        socials: [
            { href: 'https://instagram.com/diosmasgym', icon: 'fab fa-instagram', hover: 'hover:bg-[#E1306C]' },
            { href: 'https://tiktok.com/@diosmasgym', icon: 'fab fa-tiktok', hover: 'hover:bg-white/20' },
            { href: 'https://youtube.com/@diosmasgym', icon: 'fab fa-youtube', hover: 'hover:bg-[#FF0000]' },
        ],
    };

    const card = `rounded-3xl border backdrop-blur-xl p-5 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${T.card}`;
    const sectionTitle = `text-[11px] font-black uppercase tracking-[0.22em] flex items-center gap-2 mb-5 ${T.mono}`;
    const roundBtn = `w-12 h-12 rounded-full flex items-center justify-center border transition-all text-base ${T.round}`;
    const shareUrl = getShareUrl();

    const handlePushTest = async () => {
        const ok = await sendLocalTest();
        setPushTestMsg(ok ? 'Te enviamos una notificación de prueba. Si no la ves, revisa el modo "No molestar".' : 'No se pudo mostrar la prueba en este dispositivo.');
        setTimeout(() => setPushTestMsg(''), 6000);
    };

    return (
        <div className={`min-h-screen font-['Poppins'] relative overflow-x-hidden ${T.text} ${showStickyBar ? 'pb-24 md:pb-0' : ''}`} style={{ backgroundColor: T.bg }}>
            <style>{`
              @keyframes wave-bounce {
                0%, 100% { height: 5px; }
                50% { height: 32px; }
              }
            `}</style>

            {/* Fondo: la portada desenfocada tiñe toda la pagina con sus colores */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-cover bg-center scale-125 blur-3xl opacity-50 saturate-150" style={{ backgroundImage: `url(${song.cover})` }}></div>
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${T.bg}80 0%, ${T.bg}d9 42%, ${T.bg} 88%)` }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center w-full animate-fade-in">

                {/* Barra superior: marca + compartir */}
                <header className="w-full max-w-5xl flex items-center justify-between px-4 pt-4">
                    <a href={T.home} className="flex items-center gap-2.5 pr-4 pl-1.5 py-1.5 rounded-full border border-white/10 bg-black/30 backdrop-blur-md hover:bg-black/50 transition-all">
                        <img src={T.logo} alt={T.brand} className="w-8 h-8 rounded-full object-cover bg-black/40" />
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${T.mono}`}>{T.brand}</span>
                    </a>
                    <div className="flex items-center gap-2">
                        <button onClick={copyToClipboard} title="Copiar enlace" className="w-11 h-11 rounded-full border border-white/10 bg-black/30 backdrop-blur-md hover:bg-black/50 flex items-center justify-center transition-all relative">
                            <i className={`fas ${copied ? 'fa-check' : 'fa-link'} text-sm`}></i>
                            {copied && <span className="absolute top-12 right-0 bg-black text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap">¡Copiado!</span>}
                        </button>
                        <button onClick={() => setShowQrModal(true)} title="Código QR" className="w-11 h-11 rounded-full border border-white/10 bg-black/30 backdrop-blur-md hover:bg-black/50 flex items-center justify-center transition-all">
                            <i className="fas fa-qrcode text-sm"></i>
                        </button>
                    </div>
                </header>

                <main className="w-full max-w-5xl px-4 pb-10 flex flex-col gap-6 md:gap-8">

                    {/* HERO */}
                    <section className="pt-5 md:pt-12 grid md:grid-cols-[minmax(0,400px)_1fr] gap-6 md:gap-14 items-center">
                        <div className="justify-self-center w-full max-w-[12.5rem] sm:max-w-[19rem] md:max-w-none relative group">
                            <div className="absolute -inset-6 bg-cover bg-center rounded-[3rem] blur-2xl opacity-40 transition-opacity duration-700 group-hover:opacity-60" style={{ backgroundImage: `url(${song.cover})` }}></div>
                            <img src={song.cover} alt={song.name} className="relative w-full aspect-square object-cover rounded-[1.75rem] ring-1 ring-white/15 shadow-[0_30px_70px_rgba(0,0,0,0.6)]" />
                        </div>

                        <div className="w-full flex flex-col items-center md:items-start text-center md:text-left">
                            <h1 className={`h1-gothic text-3xl sm:text-5xl md:text-6xl leading-[1.05] mb-3 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] break-words max-w-full ${T.titleColor}`}>{song.name}</h1>
                            <p className={`text-[12px] md:text-[13px] font-black uppercase tracking-[0.4em] mb-5 ${T.mono}`} style={{ color: T.accent }}>{song.artist}</p>

                            <ReleaseCountdown releaseDate={song.date} isJuan={isJuan} />

                            {/* Botones principales: lo primero que ve quien llega desde WhatsApp / Instagram */}
                            <div ref={heroBtnRef} className="w-full max-w-md flex flex-col gap-3 mb-5">
                                <PlatformButton variant="primary" platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={isJuan} />
                                <PlatformButton variant="primary" platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={isJuan} />
                                <PlatformButton variant="primary" platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={isJuan} />
                            </div>

                            {embedData?.type === 'youtube' && (
                                <YouTubeAudioPlayer videoId={embedData.id} isJuan={isJuan} />
                            )}

                            {embedData?.type === 'spotify' && (
                                <div className="w-full max-w-md rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${T.mono}`} style={{ color: T.accent }}>
                                            <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></span>
                                            Previa Spotify
                                        </span>
                                        <span className="text-[8px] uppercase tracking-widest text-white/40">Escucha un fragmento</span>
                                    </div>
                                    <iframe src={embedData.url} width="100%" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="rounded-lg"></iframe>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* MAS PLATAFORMAS */}
                    <section className={card}>
                        <h2 className={sectionTitle} style={{ color: T.accent }}><i className="fas fa-headphones"></i> Más plataformas</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                            <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} isJuan={isJuan} variant="compact" />
                            <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} isJuan={isJuan} variant="compact" />
                            <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} isJuan={isJuan} variant="compact" />
                            <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} isJuan={isJuan} variant="compact" />
                            <PlatformButton platform={T.siteLabel} icon="fas fa-globe" color="#4a90d9" url={T.home} isJuan={isJuan} variant="compact" />
                        </div>
                    </section>

                    <DynamicBanner isJuan={isJuan} onSubscribe={subscribe} />

                    {song.lyrics && (
                        <div className="w-full flex justify-center">
                            <InlineLyrics lyrics={song.lyrics} songName={song.name} songSlug={song.id || generateSlug(song.name)} isJuan={isJuan} />
                        </div>
                    )}

                    {/* CONTENIDO EN DOS COLUMNAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                        <div className="flex flex-col gap-6 md:gap-8">
                            <SongCredits isJuan={isJuan} song={song} />

                            {/* Versiculo */}
                            <section className={`${card} relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: `linear-gradient(180deg, ${T.accent}, transparent)` }}></div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className={`${sectionTitle} !mb-0`} style={{ color: T.accent }}><i className={`fas ${T.verseIcon}`}></i> {T.verseTitle}</h2>
                                    <button onClick={() => fetchBibleVerse(isJuan)} disabled={loadingVerse} title="Otro versículo" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-40" style={{ color: T.accent }}>
                                        <i className={`fas fa-dice text-lg ${loadingVerse ? 'animate-spin' : ''}`}></i>
                                    </button>
                                </div>
                                {loadingVerse ? (
                                    <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-t-transparent animate-spin rounded-full" style={{ borderColor: T.accent, borderTopColor: 'transparent' }}></div></div>
                                ) : (
                                    <p className="text-[15px] md:text-base font-serif italic leading-relaxed text-white/90 mb-5">
                                        “{devotional?.verse || (isJuan ? 'Buscando palabra...' : 'Cargando palabra de fe...')}”
                                    </p>
                                )}
                                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${T.verseRef}`}>{loadingVerse ? 'Cargando...' : devotional?.reference}</span>
                                    {T.temple && (
                                        <a href="/" className="text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5" style={{ color: T.accent }}>
                                            ⚔️ Entrar al templo <i className="fas fa-chevron-right text-[8px]"></i>
                                        </a>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="flex flex-col gap-6 md:gap-8">
                            {/* Compartir */}
                            <section className={card}>
                                <h2 className={sectionTitle} style={{ color: T.accent }}><i className="fas fa-share-nodes"></i> {T.shareTitle}</h2>
                                <div className="flex flex-wrap gap-3 justify-center">
                                    <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(T.shareText + shareUrl)}`} target="_blank" rel="noreferrer" title="Compartir por WhatsApp" className="w-12 h-12 rounded-full flex items-center justify-center bg-[#25D366]/15 border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white transition-all"><i className="fab fa-whatsapp text-lg"></i></a>
                                    {T.showX && (
                                        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(T.shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" title="Compartir en X" className={roundBtn}><i className="fab fa-x-twitter"></i></a>
                                    )}
                                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" title="Compartir en Facebook" className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1877F2]/15 border border-[#1877F2]/30 hover:bg-[#1877F2] hover:text-white transition-all"><i className="fab fa-facebook-f"></i></a>
                                    <button onClick={() => setShowQrModal(true)} title="Código QR" className={roundBtn}><i className="fas fa-qrcode"></i></button>
                                    <button onClick={copyToClipboard} title="Copiar enlace" className={roundBtn}><i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i></button>
                                </div>
                                {T.dedicate && (
                                    <div className="flex justify-center border-t border-white/10 pt-5 mt-5">
                                        <a
                                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Te dedico esta canción que me inspiró bastante: *${song.name}* de ${song.artist} 🎵✨. Escúchala completa aquí: ` + shareUrl)}`}
                                            target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all bg-green-500/10 border-green-500/25 hover:bg-green-500 hover:text-black hover:border-green-500"
                                        >
                                            <i className="fas fa-heart text-red-500"></i> Dedicar por WhatsApp
                                        </a>
                                    </div>
                                )}
                            </section>

                            {/* Avisos de nuevos estrenos: refleja el estado REAL de la suscripcion */}
                            <section className={`${card} text-center flex flex-col items-center`}>
                                <h2 className={`${sectionTitle} justify-center`} style={{ color: T.accent }}>{T.subTitle}</h2>

                                {pushPermission === 'unsupported' ? (
                                    <p className="text-[12px] text-white/60 leading-relaxed max-w-xs">
                                        Este navegador no permite avisos. En iPhone: toca Compartir → «Añadir a pantalla de inicio» y abre la app desde ahí.
                                    </p>
                                ) : pushPermission === 'denied' ? (
                                    <p className="text-[12px] text-amber-200/80 leading-relaxed max-w-xs">
                                        Tienes las notificaciones bloqueadas para este sitio. Toca el candado junto a la dirección → Notificaciones → Permitir, y recarga la página.
                                    </p>
                                ) : isSubscribed ? (
                                    <>
                                        <div className="flex items-center gap-3 px-6 py-3 rounded-full border bg-green-500/10 border-green-500/30 text-green-400">
                                            <i className="fas fa-check-circle text-lg"></i>
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${T.mono}`}>{T.subDone}</span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap justify-center gap-5">
                                            <button onClick={handlePushTest} className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 hover:text-white transition-colors" style={{ color: T.accent }}>Enviarme una prueba</button>
                                            <button onClick={unsubscribe} disabled={pushBusy} className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-red-400 underline underline-offset-4 transition-colors">Darse de baja</button>
                                        </div>
                                        {pushTestMsg && <p className="mt-3 text-[11px] text-white/60 max-w-xs">{pushTestMsg}</p>}
                                    </>
                                ) : (
                                    <button
                                        onClick={subscribe}
                                        disabled={pushBusy}
                                        className="flex items-center gap-3 px-7 py-3.5 rounded-full border transition-all bg-white/5 border-white/15 hover:bg-white/10 disabled:opacity-60"
                                    >
                                        <i className={`fas ${pushBusy ? 'fa-spinner fa-spin' : 'fa-bell'} text-lg`} style={{ color: T.accent }}></i>
                                        <span className={`text-[11px] font-black uppercase tracking-widest text-white/80 ${T.mono}`}>
                                            {pushBusy ? 'Activando...' : T.subLabel}
                                        </span>
                                    </button>
                                )}

                                {pushError && pushPermission !== 'denied' && (
                                    <p className="mt-3 text-[11px] text-amber-200/80 max-w-xs">
                                        {pushError === 'sdk_unavailable'
                                            ? 'No se pudo cargar el servicio de avisos. Si tienes un bloqueador de anuncios, desactívalo para este sitio e inténtalo de nuevo.'
                                            : 'No se pudo activar los avisos. Inténtalo de nuevo.'}
                                    </p>
                                )}
                                {T.subHint && !isSubscribed && pushPermission !== 'denied' && pushPermission !== 'unsupported' && (
                                    <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-white/30">{T.subHint}</p>
                                )}
                            </section>

                            {relatedSongs.length > 0 && (
                                <section className={card}>
                                    <h2 className={sectionTitle} style={{ color: T.accent }}><i className="fas fa-list-ul"></i> Lista de canciones</h2>
                                    <div className="space-y-2">
                                        {relatedSongs.map((track, i) => (
                                            <button key={i} onClick={() => navigate(`/link/${track.id}`)} className="w-full flex items-center justify-between p-3.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <span className="text-[11px] font-mono text-white/30">{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
                                                    <span className="text-sm font-bold text-white/85 group-hover:text-white truncate">{track.name}</span>
                                                </div>
                                                <i className="fas fa-chevron-right text-[11px] text-white/25 group-hover:text-white transition-colors"></i>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* OTROS LANZAMIENTOS */}
                    {otherReleases.length > 0 && (
                        <section className={card}>
                            <h2 className={`${sectionTitle} justify-center text-center`} style={{ color: T.accent }}><i className="fas fa-compact-disc"></i> {T.otherTitle}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                                {otherReleases.map((other, idx) => (
                                    <button key={idx} onClick={() => navigate(`/link/${other.id}`)} className="w-full flex flex-col items-center p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 group">
                                        <div className="w-full aspect-square mb-3 overflow-hidden rounded-xl">
                                            <img src={other.cover} alt={other.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <h3 className="text-[13px] font-bold leading-snug line-clamp-1 w-full text-center">{other.name}</h3>
                                        {T.showType && <p className="text-[8px] font-mono uppercase text-white/40 tracking-wider mt-1">{other.type || 'Sencillo'}</p>}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                {/* Pie */}
                <footer className="w-full max-w-5xl mt-2 text-center border-t border-white/10 px-4 pt-8 pb-10">
                    <h2 className={`text-[10px] font-black uppercase tracking-[0.35em] text-white/50 mb-5 ${T.mono}`}>{T.followTitle}</h2>
                    <div className="flex justify-center gap-4">
                        {T.socials.map(s => (
                            <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className={`w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 hover:scale-110 ${s.hover}`}>
                                <i className={`${s.icon} text-xl`}></i>
                            </a>
                        ))}
                    </div>
                    <p className={`text-white/30 text-[9px] mt-7 tracking-widest uppercase ${T.mono}`}>&copy; {new Date().getFullYear()} {T.copyright}</p>
                </footer>
            </div>

            {/* Barra fija inferior (solo movil): aparece al bajar, para escuchar sin volver arriba */}
            {showStickyBar && (
                <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl border-t border-white/10" style={{ backgroundColor: `${T.bg}ee` }}>
                    <div className="flex gap-2 max-w-md mx-auto">
                        <PlatformButton variant="bar" platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={isJuan} />
                        <PlatformButton variant="icon" platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={isJuan} />
                        <PlatformButton variant="icon" platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={isJuan} />
                    </div>
                </div>
            )}

            {/* Modals */}
            <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={shareUrl} />
        </div>
    );
};

export default SmartLinkView;
