import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../services/musicService';
import { MusicItem } from '../types';
import { useOneSignal } from '../services/useOneSignal';
import { useAnalytics } from '../hooks/useAnalytics';

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
    const hasSeekedRef = React.useRef(false);

    useEffect(() => {
        // Reset player states for a fresh song when videoId changes
        setIsPlaying(false);
        setProgress(0);
        setStartTime(0);
        hasSeekedRef.current = false;

        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }
            
            window.onYouTubeIframeAPIReady = () => {
                initPlayer();
            };
        } else if (window.YT && window.YT.Player) {
            initPlayer();
        }

        function initPlayer() {
            if (playerRef.current) return;
            playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
                height: '0',
                width: '0',
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1
                },
                events: {
                    onStateChange: (event: any) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                            if (!hasSeekedRef.current) {
                                const duration = event.target.getDuration();
                                if (duration > 60) {
                                    const maxStart = duration - 60;
                                    const randomStart = Math.floor(Math.random() * maxStart);
                                    setStartTime(randomStart);
                                    event.target.seekTo(randomStart);
                                } else {
                                    setStartTime(0);
                                }
                                hasSeekedRef.current = true;
                            }
                        } else {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        }

        return () => {
            // Destroy the player when the component unmounts or videoId changes
            if (playerRef.current && playerRef.current.destroy) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    // ignore
                }
                playerRef.current = null;
            }
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
                    if (elapsed >= 60 || elapsed < 0) {
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

    const accentColor = isJuan ? '#c89d53' : '#4a90d9';
    const waveBarCount = 16;
    const delays = [0.1, 0.4, 0.2, 0.6, 0.3, 0.8, 0.5, 0.2, 0.7, 0.4, 0.9, 0.3, 0.6, 0.1, 0.5, 0.8];

    return (
        <div className={`w-full max-w-md mb-8 rounded-2xl p-5 border shadow-2xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${isJuan ? 'bg-[#2a221f]/90 border-[#1e4a7a]/30' : 'bg-black/50 border-white/10 backdrop-blur-xl'}`}>
            <div id={`yt-player-${videoId}`} className="hidden"></div>
            
            <HUDCorners color={isJuan ? '#c89d53' : '#4a90d9'} />

            {/* scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none opacity-[0.07]"></div>

            <div className="flex justify-between items-center relative z-10 px-1">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: accentColor }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                    VISTA PREVIA DE AUDIO (60s)
                </span>
                <span className={`text-[8px] font-mono tracking-widest ${isJuan ? 'text-[#e8dcc5]/40' : 'text-white/40'}`}>
                    {Math.floor(progress * 0.6)}s / 60s
                </span>
            </div>

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
                    <div className={`flex justify-between text-[8px] font-black uppercase tracking-widest mb-1 ${isJuan ? 'text-[#e8dcc5]/60' : 'text-white/60'}`}>
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

    const accentColor = isJuan ? '#c89d53' : '#4a90d9';

    if (isReleased) {
        return (
            <div className={`w-full max-w-sm flex items-center justify-center gap-2 mb-6 py-2.5 px-4 rounded-xl border text-[9px] uppercase font-black tracking-widest font-mono ${
                isJuan 
                ? 'bg-[#c89d53]/5 border-[#c89d53]/25 text-[#c89d53]'
                : 'bg-green-500/5 border-green-500/20 text-green-400'
            }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isJuan ? 'bg-[#c89d53]' : 'bg-green-500'}`}></span>
                ¡Ya Disponible en Plataformas!
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className={`w-full max-w-sm rounded-2xl p-4 mb-6 border text-center font-mono ${
            isJuan 
            ? 'bg-[#2a221f]/40 border-[#1e4a7a]/20 text-[#e8dcc5]' 
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

const SongCredits = ({ isJuan, artistName }: { isJuan: boolean, artistName: string }) => {
    const accentColor = isJuan ? '#c89d53' : '#4a90d9';
    const bgClass = isJuan ? 'bg-[#2a221f]/40' : 'bg-black/30';
    const textPrimary = isJuan ? 'text-[#e8dcc5]' : 'text-white';
    const textSecondary = isJuan ? 'text-[#e8dcc5]/40' : 'text-white/40';
    const borderClass = isJuan ? 'border-[#1e4a7a]/10' : 'border-white/5';
    const mainBorderClass = isJuan ? 'border-[#1e4a7a]/20' : 'border-[#4a90d9]/15';
    
    return (
        <div className={`w-full backdrop-blur-xl p-6 rounded-2xl border shadow-[0_15px_35px_rgba(0,0,0,0.4)] text-left ${bgClass} ${mainBorderClass} relative overflow-hidden group`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isJuan ? 'from-[#c89d53] to-[#1e4a7a]' : 'from-[#4a90d9] to-[#8c6b32]'}`}></div>
            
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
const PlatformButton = ({ platform, icon, color, url, isJuan }: { platform: string, icon: string, color: string, url: string, isJuan: boolean }) => {
    if (isJuan) {
        return (
            <a href={url} target="_blank" rel="noreferrer" className="w-full flex items-center p-3 md:p-4 rounded-xl bg-[#1a1411]/50 border border-[#1e4a7a]/10 hover:border-[#1e4a7a]/40 hover:bg-[#1e4a7a]/10 transition-all group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl mr-4" style={{ backgroundColor: `${color}15`, color: color }}>
                    <i className={icon}></i>
                </div>
                <div className="flex-1 text-left">
                    <h5 className="text-[12px] md:text-[14px] font-bold text-[#e8dcc5] group-hover:text-white transition-colors font-mono">{platform}</h5>
                    <p className="text-[8px] md:text-[9px] uppercase tracking-wider text-[#c89d53]/60 font-mono">Reproducir</p>
                </div>
                <i className="fas fa-chevron-right text-[#c89d53]/40 group-hover:text-[#c89d53] transition-colors"></i>
            </a>
        );
    }
    return (
        <a href={url} target="_blank" rel="noreferrer" className="w-full flex items-center p-3 md:p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: color }}></div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl mr-4 bg-white/5 group-hover:scale-110 transition-transform duration-300" style={{ color: color }}>
                <i className={icon}></i>
            </div>
            <div className="flex-1 text-left">
                <h5 className="text-[12px] md:text-[14px] font-bold text-white group-hover:text-[var(--hover-color)] transition-colors" style={{ '--hover-color': color } as React.CSSProperties}>{platform}</h5>
                <p className="text-[8px] md:text-[9px] font-mono uppercase tracking-widest text-white/40">Reproducir ahora</p>
            </div>
            <i className="fas fa-chevron-right text-white/20 group-hover:text-white transition-colors"></i>
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
            <div className="w-full max-w-6xl my-4 backdrop-blur-xl bg-[#2a221f]/70 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/40 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group transition-all duration-500">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#c89d53] to-[#1e4a7a]"></div>
                
                <div className="flex items-center gap-6 z-10 w-full md:w-auto">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-[#1e4a7a]/20 flex items-center justify-center border border-[#1e4a7a]/40">
                        <i className={`${banner.icon} text-2xl text-[#c89d53]`}></i>
                    </div>
                    <div className="text-left flex-1">
                        <h4 className="text-[#c89d53] text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] mb-1 font-mono">{banner.title}</h4>
                        <p className="text-[#f2ebd9] text-sm md:text-base opacity-90">{banner.text}</p>
                    </div>
                </div>

                <a 
                    href={banner.url}
                    onClick={handleAction}
                    target={banner.url.startsWith('#') ? '_self' : '_blank'}
                    rel="noreferrer"
                    className="z-10 shrink-0 w-full md:w-auto px-8 py-3 rounded-lg bg-[#1e4a7a]/20 border border-[#1e4a7a]/50 hover:bg-[#1e4a7a] hover:text-white text-[#c89d53] font-bold uppercase tracking-widest text-[11px] transition-all text-center font-mono"
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
    const { isSubscribed, subscribe, unsubscribe } = useOneSignal();
    const { trackEvent } = useAnalytics();

    const [showQrModal, setShowQrModal] = useState(false);
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
            return `https://app.diosmasgym.com/link/custom${location.search}`;
        }
        if (id && id.startsWith('prx-') && song) {
            const params = new URLSearchParams();
            params.set('title', song.name);
            params.set('artist', song.artist);
            params.set('cover', song.cover || '');
            params.set('url', song.url || '');
            return `https://app.diosmasgym.com/link/custom?${params.toString()}`;
        }
        return `https://app.diosmasgym.com/link/${id}`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getShareUrl());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (song) {
            trackEvent('smart_link_view', {
                title: song.name,
                artist: song.artist
            });
            fetchBibleVerse(song.artist.toLowerCase().includes('juan'));
        }
    }, [song]);

    useEffect(() => {
        const loadSong = async () => {
            try {
                // Buscamos en ambos catálogos para enlaces normales
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                let fullCatalog = [...dM, ...j6];

                // Fetch de la hoja de Próximos Lanzamientos
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

                if (id === 'custom') {
                    const queryParams = new URLSearchParams(location.search);
                    const title = queryParams.get('title');
                    const artist = queryParams.get('artist');
                    const cover = queryParams.get('cover');
                    const url = queryParams.get('url') || '#';
                    
                    if (title && artist && cover) {
                        const manualSong: MusicItem = {
                            id: 'custom',
                            name: title,
                            artist: artist,
                            cover: cover,
                            url: url,
                            type: 'Manual',
                            date: new Date().toISOString()
                        };
                        setSong(manualSong);
                        document.title = `${manualSong.name} - ${manualSong.artist}`;
                        setLoading(false);
                        return;
                    }
                }

                const found = fullCatalog.find(s => s.id === id || (s.url && s.url.includes(id || '')));
                if (found) {
                    setSong(found);
                    document.title = `${found.name} - ${found.artist}`;
                    
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
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#4a90d9] border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-[#05070a] text-white flex flex-col items-center justify-center p-8">
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

        // === TEMA DIOSMASGYM (Urbano / Oscuro / Dorado) ===
    if (!isJuan) {
        return (
            <div className="min-h-screen bg-[#05070a] text-white font-['Poppins'] flex flex-col relative overflow-hidden">
                <style>{`
                  @keyframes wave-bounce {
                    0%, 100% { height: 5px; }
                    50% { height: 32px; }
                  }
                  @keyframes float-slow-orb {
                    0%, 100% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(40px, -60px) scale(1.1); }
                    66% { transform: translate(-30px, 30px) scale(0.95); }
                  }
                  .animate-float-slow {
                    animation: float-slow-orb 18s ease-in-out infinite;
                  }
                `}</style>

                {/* Dynamic Gold Glowing Orbs (Premium background effect) */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#4a90d9]/8 rounded-full blur-[120px] animate-float-slow pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8c6b32]/8 rounded-full blur-[120px] animate-float-slow pointer-events-none" style={{ animationDelay: '5s' }}></div>

                {/* Background Blur */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-15 scale-110 blur-2xl saturate-75 pointer-events-none"
                    style={{ backgroundImage: `url(${song.cover})` }}
                ></div>

                <div className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 md:py-16 gap-8 md:gap-12 animate-fade-in">
                    
                    {/* HERO SECTION */}
                    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                        <div className="w-full max-w-sm shrink-0 transition-transform duration-500 group relative">
                            {/* Ambient Glow using Cover image */}
                            <div 
                                className="absolute -inset-4 bg-cover bg-center rounded-[40px] blur-xl opacity-30 group-hover:opacity-55 transition duration-700 pointer-events-none"
                                style={{ backgroundImage: `url(${song.cover})` }}
                            ></div>
                            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#4a90d9] to-[#8c6b32] rounded-[36px] opacity-10 group-hover:opacity-30 transition duration-700 pointer-events-none"></div>
                            <div className="relative w-64 h-64 md:w-96 md:h-96 mx-auto overflow-hidden rounded-[32px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.02]">
                                <img 
                                    src={song.cover} 
                                    alt={song.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        
                        <div className="w-full max-w-lg flex flex-col items-center md:items-start text-center md:text-left">
                            <h1 className="font-serif italic text-4xl md:text-6xl mb-2 md:mb-4 drop-shadow-[0_10px_25px_rgba(0,0,0,0.7)] font-bold tracking-wide text-white">{song.name}</h1>
                            <p className="text-[#4a90d9] text-[12px] md:text-[14px] font-black uppercase tracking-[0.5em] mb-6 md:mb-8">{song.artist}</p>

                            <ReleaseCountdown releaseDate={song.date} isJuan={false} />

                            {embedData?.type === 'youtube' && (
                                <YouTubeAudioPlayer videoId={embedData.id} isJuan={false} />
                            )}
                            
                            {embedData?.type === 'spotify' && (
                                <div className="w-full max-w-md mb-4 md:mb-8 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[#4a90d9]/20 bg-black/40 p-2 backdrop-blur-md">
                                    <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#4a90d9] flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></div>
                                            Previa Spotify
                                        </span>
                                        <span className="text-[8px] uppercase tracking-widest text-white/40">Escucha un fragmento</span>
                                    </div>
                                    <iframe 
                                        src={embedData.url} 
                                        width="100%" 
                                        height="80" 
                                        frameBorder="0" 
                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                        loading="lazy"
                                        className="rounded-lg"
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PLATFORMS SECTION */}
                    <div className="w-full max-w-6xl relative z-20 backdrop-blur-xl bg-black/45 p-6 md:p-10 rounded-3xl border border-[#4a90d9]/20 shadow-[0_20px_50px_rgba(37,99,168,0.08)] transition-all hover:border-[#4a90d9]/30 duration-500 overflow-hidden">
                        <HUDCorners color="#4a90d9" />
                        
                        <h3 className="text-[#4a90d9] text-[12px] md:text-[14px] font-black uppercase tracking-[0.3em] mb-8 flex items-center justify-center gap-3">
                            <i className="fas fa-play-circle animate-pulse"></i> ESCUCHAR EL TEMA COMPLETO
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={false} />
                            <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={false} />
                            <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={false} />
                            <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} isJuan={false} />
                            <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} isJuan={false} />
                            <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} isJuan={false} />
                            <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} isJuan={false} />
                            <PlatformButton platform="Sitio Oficial" icon="fas fa-globe" color="#4a90d9" url="https://musica.diosmasgym.com/" isJuan={false} />
                        </div>
                    </div>

                    <DynamicBanner isJuan={false} onSubscribe={subscribe} />

                    {/* TWO-COLUMN CONTENT GRID */}
                    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-6 md:gap-8">
                            <SongCredits isJuan={false} artistName={song.artist} />
                            
                            {/* Palabra de Aliento Card */}
                            <div className="w-full h-full backdrop-blur-xl bg-black/45 p-6 md:p-8 rounded-2xl border border-[#4a90d9]/15 shadow-[0_15px_35px_rgba(0,0,0,0.4)] text-left relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#4a90d9] to-[#8c6b32]"></div>
                                
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-[#4a90d9] text-[10px] md:text-[12px] font-black uppercase tracking-[0.25em] flex items-center gap-2">
                                        <i className="fas fa-shield-halved text-[#4a90d9]"></i> ESCUDO DE FE / ALIENTO DIARIO
                                    </h4>
                                    <button 
                                        onClick={() => fetchBibleVerse(false)} 
                                        disabled={loadingVerse}
                                        className="text-[#4a90d9] hover:text-white transition-colors p-2 flex items-center justify-center font-bold uppercase tracking-widest disabled:opacity-40"
                                    >
                                        <i className={`fas fa-dice text-lg ${loadingVerse ? 'animate-spin' : ''}`}></i>
                                    </button>
                                </div>
                                
                                {loadingVerse ? (
                                    <div className="py-8 flex justify-center items-center">
                                        <div className="w-6 h-6 border-2 border-[#4a90d9] border-t-transparent animate-spin rounded-full"></div>
                                    </div>
                                ) : (
                                    <p className="text-white/90 text-sm md:text-base font-serif italic leading-relaxed tracking-wide mb-6">
                                        "{devotional?.verse || 'Cargando palabra de fe...'}"
                                    </p>
                                )}

                                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-auto">
                                    <span className="text-[9px] md:text-[10px] font-mono text-white/40 uppercase tracking-wider font-bold">{loadingVerse ? 'Cargando...' : devotional?.reference}</span>
                                    <a 
                                        href="/" 
                                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#4a90d9] hover:text-white transition-colors flex items-center gap-1.5"
                                    >
                                        ⚔️ Entrar al Templo <i className="fas fa-chevron-right text-[8px]"></i>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-6 md:gap-8">
                            {/* Compartir & Redes */}
                            <div className="w-full backdrop-blur-xl bg-black/45 p-6 md:p-8 rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                                <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-6 text-left flex items-center gap-2">
                                    <i className="fas fa-share-nodes"></i> Compartir con el mundo
                                </h3>
                                <div className="flex flex-wrap gap-4 justify-center mb-6">
                                    <a 
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}: ` + getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366] hover:text-white transition-all text-sm md:text-base"
                                        title="Compartir por WhatsApp"
                                    >
                                        <i className="fab fa-whatsapp"></i>
                                    </a>
                                    <a 
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}:`)}&url=${encodeURIComponent(getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-black hover:text-white transition-all text-sm md:text-base"
                                        title="Compartir en X (Twitter)"
                                    >
                                        <i className="fab fa-x-twitter"></i>
                                    </a>
                                    <a 
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2] hover:text-white transition-all text-sm md:text-base"
                                        title="Compartir en Facebook"
                                    >
                                        <i className="fab fa-facebook-f"></i>
                                    </a>
                                    <button 
                                        onClick={() => setShowQrModal(true)}
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#4a90d9] hover:text-black transition-all text-sm md:text-base"
                                        title="Código QR"
                                    >
                                        <i className="fas fa-qrcode"></i>
                                    </button>
                                    <button 
                                        onClick={copyToClipboard}
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#4a90d9] hover:text-black transition-all relative text-sm md:text-base"
                                        title="Copiar enlace"
                                    >
                                        <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
                                        {copied && (
                                            <span className="absolute -top-12 bg-black text-white text-[10px] px-3 py-1.5 rounded border border-white/10 animate-bounce whitespace-nowrap z-50">
                                                ¡Copiado!
                                            </span>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="flex justify-center border-t border-white/5 pt-5">
                                    <a 
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Te dedico esta canción que me inspiró bastante: *${song.name}* de ${song.artist} 🎵✨. Escúchala completa aquí: ` + getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest border transition-all text-white bg-green-500/10 border-green-500/25 hover:bg-green-500 hover:text-black hover:border-green-500 hover:shadow-[0_0_15px_rgba(37,211,102,0.455)]"
                                    >
                                        <i className="fas fa-heart text-red-500 animate-pulse"></i> Dedicar por WhatsApp
                                    </a>
                                </div>
                            </div>

                            {/* Avísame Card */}
                            <div className="w-full backdrop-blur-xl bg-black/45 p-6 md:p-8 rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center text-center">
                                <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-4">No te pierdas de nada</h3>
                                <button 
                                    onClick={subscribe}
                                    className={`flex items-center gap-3 px-8 py-4 rounded-full border transition-all group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 hover:border-[#4a90d9] hover:bg-[#4a90d9]/10'}`}
                                >
                                    <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500 text-lg' : 'fa-bell text-[#4a90d9] group-hover:animate-bounce text-lg'}`}></i>
                                    <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${isSubscribed ? 'text-green-500' : 'text-white/70 group-hover:text-white'}`}>
                                        {isSubscribed ? '¡Suscrito! Espera música pronto' : 'Avísame de nuevos estrenos'}
                                    </span>
                                </button>
                                <p className="mt-4 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-white/20">Recibe una notificación push cuando {song.artist} saque música nueva</p>
                                {isSubscribed && (
                                    <button 
                                        onClick={unsubscribe}
                                        className="mt-4 text-[8px] font-bold uppercase tracking-widest text-white/10 hover:text-red-500 transition-all underline underline-offset-4"
                                    >
                                        Darse de baja
                                    </button>
                                )}
                            </div>

                            {relatedSongs.length > 0 && (
                                <div className="w-full backdrop-blur-xl bg-black/45 p-6 md:p-8 rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                                    <h3 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-6 flex items-center gap-3 text-left">
                                        <i className="fas fa-list-ul"></i>
                                        Lista de Canciones / Tracks
                                    </h3>
                                    <div className="space-y-3">
                                        {relatedSongs.map((track, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => navigate(`/link/${track.id}`)}
                                                className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] md:text-[12px] font-mono text-white/20">{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
                                                    <span className="text-sm md:text-base font-bold text-white/80 group-hover:text-white transition-colors">{track.name}</span>
                                                </div>
                                                <i className="fas fa-chevron-right text-[12px] text-white/20 group-hover:text-[#4a90d9] transition-colors"></i>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* OTROS LANZAMIENTOS (FULL WIDTH GRID) */}
                    {otherReleases.length > 0 && (
                        <div className="w-full max-w-6xl backdrop-blur-xl bg-black/45 p-6 md:p-10 rounded-3xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-center">
                            <h4 className="text-[#4a90d9] text-[12px] md:text-[14px] font-black uppercase tracking-[0.3em] mb-8 flex items-center justify-center gap-3">
                                <i className="fas fa-compact-disc"></i> OTROS LANZAMIENTOS DE {song.artist.toUpperCase()}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {otherReleases.map((other, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => navigate(`/link/${other.id}`)}
                                        className="w-full flex flex-col items-center p-3 md:p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-[#4a90d9]/30 transition-all duration-300 group"
                                    >
                                        <div className="w-full aspect-square mb-3 md:mb-4 overflow-hidden rounded-xl">
                                            <img 
                                                src={other.cover} 
                                                alt={other.name} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                        <h5 className="text-[12px] md:text-[14px] font-bold text-white leading-snug group-hover:text-[#4a90d9] transition-colors line-clamp-1">{other.name}</h5>
                                        <p className="text-[8px] md:text-[9px] font-mono uppercase text-white/40 tracking-wider mt-1">{other.type || 'Sencillo'}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-8 text-center w-full border-t border-white/10 pb-8 pt-8 relative z-20 max-w-7xl mx-auto px-4">
                    <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">Únete a la Comunidad</h3>
                    <div className="flex justify-center gap-6">
                        <a href="https://instagram.com/diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E1306C] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-instagram text-xl md:text-2xl text-white"></i></a>
                        <a href="https://tiktok.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all duration-300"><i className="fab fa-tiktok text-xl md:text-2xl text-white"></i></a>
                        <a href="https://youtube.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF0000] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-youtube text-xl md:text-2xl text-white"></i></a>
                    </div>
                    <p className="text-white/30 text-[8px] md:text-[9px] mt-8 tracking-widest uppercase font-mono">&copy; {new Date().getFullYear()} DiosMasGym Records. Todos los derechos reservados.</p>
                </div>

                {/* Modals */}
                <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={getShareUrl()} />
            </div>
        );
    }

    // === TEMA JUAN 614 (Acústico / Norteño / Tierra - Dark Mode) ===
    return (
        <div className="min-h-screen bg-[#110e0c] text-[#e8dcc5] font-['Outfit'] flex flex-col relative overflow-hidden">
            <style>{`
              @keyframes dust-float {
                0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.1; }
                50% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
              }
              @keyframes rustic-glow {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.6; }
              }
              .animate-dust {
                animation: dust-float 15s ease-in-out infinite;
              }
              .animate-rustic-glow {
                animation: rustic-glow 8s ease-in-out infinite;
              }
            `}</style>

            {/* Rustic Ambience Background */}
            <div className="absolute inset-0 bg-[#1a1411] opacity-60"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#3a2820_0%,_transparent_60%)] pointer-events-none opacity-50"></div>
            
            {/* Background Blur Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-[0.08] scale-110 blur-xl saturate-50 mix-blend-luminosity pointer-events-none"
                style={{ backgroundImage: `url(${song.cover})` }}
            ></div>

            {/* Ambient dust motes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute w-1 h-1 bg-[#c89d53] rounded-full animate-dust"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 md:py-16 gap-8 md:gap-12 animate-fade-in">
                
                {/* HERO SECTION */}
                <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <div className="w-full max-w-sm shrink-0 transition-transform duration-500 group relative">
                        {/* Ambient Glow */}
                        <div 
                            className="absolute -inset-6 bg-cover bg-center rounded-[20px] blur-2xl opacity-20 group-hover:opacity-40 transition duration-700 pointer-events-none"
                            style={{ backgroundImage: `url(${song.cover})` }}
                        ></div>
                        <div className="absolute -inset-2 bg-gradient-to-tr from-[#c89d53]/30 to-transparent rounded-[16px] opacity-20 group-hover:opacity-50 transition duration-700 pointer-events-none animate-rustic-glow"></div>
                        <div className="relative w-64 h-64 md:w-96 md:h-96 mx-auto overflow-hidden rounded-[12px] border-2 border-[#1e4a7a]/40 shadow-[0_20px_50px_rgba(20,10,5,0.8)] transition-transform duration-500 group-hover:scale-[1.02]">
                            <img 
                                src={song.cover} 
                                alt={song.name} 
                                className="w-full h-full object-cover mix-blend-normal"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full max-w-lg flex flex-col items-center md:items-start text-center md:text-left">
                        <h1 className="font-serif text-4xl md:text-6xl mb-2 md:mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] font-bold text-[#f2ebd9] tracking-tight">{song.name}</h1>
                        <p className="text-[#c89d53] text-[12px] md:text-[14px] font-bold uppercase tracking-[0.4em] mb-6 md:mb-8 font-mono">{song.artist}</p>

                        <ReleaseCountdown releaseDate={song.date} isJuan={true} />

                        {embedData?.type === 'youtube' && (
                            <YouTubeAudioPlayer videoId={embedData.id} isJuan={true} />
                        )}
                        
                        {embedData?.type === 'spotify' && (
                            <div className="w-full max-w-md mb-4 md:mb-8 rounded-xl overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)] border border-[#1e4a7a]/30 bg-[#2a221f]/60 p-2 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#c89d53] flex items-center gap-2 font-mono">
                                        <div className="w-2 h-2 rounded-full bg-[#1DB954]"></div>
                                        Previa Spotify
                                    </span>
                                </div>
                                <iframe 
                                    src={embedData.url} 
                                    width="100%" 
                                    height="80" 
                                    frameBorder="0" 
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                    loading="lazy"
                                    className="rounded-lg opacity-90 hover:opacity-100 transition-opacity"
                                ></iframe>
                            </div>
                        )}
                    </div>
                </div>

                {/* PLATFORMS SECTION */}
                <div className="w-full max-w-6xl relative z-20 backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-10 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-all hover:border-[#1e4a7a]/40 duration-500">
                    <h3 className="text-[#c89d53] text-[12px] md:text-[14px] font-bold uppercase tracking-[0.2em] mb-8 flex items-center justify-center gap-3 font-mono">
                        <i className="fas fa-headphones"></i> DÓNDE ESCUCHAR
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={true} />
                        <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={true} />
                        <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={true} />
                        <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} isJuan={true} />
                        <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} isJuan={true} />
                        <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} isJuan={true} />
                        <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} isJuan={true} />
                        <PlatformButton platform="Sitio Web Oficial" icon="fas fa-globe" color="#c89d53" url="https://juan614.diosmasgym.com/" isJuan={true} />
                    </div>
                </div>

                <DynamicBanner isJuan={true} onSubscribe={subscribe} />

                {/* TWO-COLUMN CONTENT GRID */}
                <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* LEFT COLUMN */}
                    <div className="flex flex-col gap-6 md:gap-8">
                        <SongCredits isJuan={true} artistName={song.artist} />
                        
                        {/* Palabra de Aliento Card */}
                        <div className="w-full h-full backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_35px_rgba(0,0,0,0.4)] text-left relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#c89d53] to-[#1e4a7a]"></div>
                            
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[#c89d53] text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
                                    <i className="fas fa-book-bible text-[#c89d53]"></i> PALABRA DE ESPERANZA
                                </h4>
                                <button 
                                    onClick={() => fetchBibleVerse(true)} 
                                    disabled={loadingVerse}
                                    className="text-[#c89d53] hover:text-[#f2ebd9] transition-colors p-2 flex items-center justify-center font-bold uppercase tracking-widest disabled:opacity-40"
                                >
                                    <i className={`fas fa-dice text-lg ${loadingVerse ? 'animate-spin' : ''}`}></i>
                                </button>
                            </div>
                            
                            {loadingVerse ? (
                                <div className="py-8 flex justify-center items-center">
                                    <div className="w-6 h-6 border-2 border-[#c89d53] border-t-transparent animate-spin rounded-full"></div>
                                </div>
                            ) : (
                                <p className="text-[#f2ebd9]/90 text-sm md:text-base font-serif italic leading-relaxed tracking-wide mb-6">
                                    "{devotional?.verse || 'Buscando palabra...'}"
                                </p>
                            )}

                            <div className="flex justify-between items-center border-t border-[#1e4a7a]/20 pt-4 mt-auto">
                                <span className="text-[9px] md:text-[10px] font-mono text-[#c89d53]/60 uppercase tracking-wider font-bold">{loadingVerse ? 'Cargando...' : devotional?.reference}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="flex flex-col gap-6 md:gap-8">
                        {/* Compartir & Redes */}
                        <div className="w-full backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                            <h3 className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#c89d53] mb-6 text-left flex items-center gap-2 font-mono">
                                <i className="fas fa-share-nodes"></i> Compartir
                            </h3>
                            <div className="flex flex-wrap gap-4 justify-center mb-6">
                                <a 
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Escucha esto: "${song.name}" de ${song.artist}: ` + getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white transition-all text-sm md:text-base"
                                    title="Compartir por WhatsApp"
                                >
                                    <i className="fab fa-whatsapp"></i>
                                </a>
                                <a 
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2] hover:text-white transition-all text-sm md:text-base"
                                    title="Compartir en Facebook"
                                >
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                                <button 
                                    onClick={() => setShowQrModal(true)}
                                    className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#1e4a7a]/10 border border-[#1e4a7a]/30 hover:bg-[#1e4a7a] hover:text-white transition-all text-sm md:text-base"
                                    title="Código QR"
                                >
                                    <i className="fas fa-qrcode"></i>
                                </button>
                                <button 
                                    onClick={copyToClipboard}
                                    className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#1e4a7a]/10 border border-[#1e4a7a]/30 hover:bg-[#1e4a7a] hover:text-white transition-all relative text-sm md:text-base"
                                    title="Copiar enlace"
                                >
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
                                    {copied && (
                                        <span className="absolute -top-12 bg-black text-[#c89d53] text-[10px] px-3 py-1.5 rounded border border-[#1e4a7a] animate-bounce whitespace-nowrap z-50">
                                            ¡Copiado!
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Avísame Card */}
                        <div className="w-full backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center text-center">
                            <h3 className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#c89d53] mb-4 font-mono">Próximos Estrenos</h3>
                            <button 
                                onClick={subscribe}
                                className={`flex items-center gap-3 px-8 py-4 rounded-lg border transition-all group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-[#1e4a7a]/10 border-[#1e4a7a]/30 hover:bg-[#1e4a7a]/20'}`}
                            >
                                <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500 text-lg' : 'fa-bell text-[#c89d53] text-lg'}`}></i>
                                <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-widest font-mono ${isSubscribed ? 'text-green-500' : 'text-[#c89d53]'}`}>
                                    {isSubscribed ? '¡Suscrito!' : 'Avísame'}
                                </span>
                            </button>
                            {isSubscribed && (
                                <button 
                                    onClick={unsubscribe}
                                    className="mt-4 text-[8px] font-bold uppercase tracking-widest text-[#c89d53]/50 hover:text-red-400 transition-all underline underline-offset-4"
                                >
                                    Darse de baja
                                </button>
                            )}
                        </div>

                        {relatedSongs.length > 0 && (
                            <div className="w-full backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-8 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                                <h3 className="text-[10px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#c89d53] mb-6 flex items-center gap-3 text-left font-mono">
                                    <i className="fas fa-list-ul"></i>
                                    Canciones del Álbum
                                </h3>
                                <div className="space-y-3">
                                    {relatedSongs.map((track, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => navigate(`/link/${track.id}`)}
                                            className="w-full flex items-center justify-between p-4 bg-[#1a1411]/50 rounded-lg border border-[#1e4a7a]/10 hover:border-[#1e4a7a]/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-[11px] md:text-[12px] font-mono text-[#c89d53]/50">{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
                                                <span className="text-sm md:text-base font-bold text-[#e8dcc5]/80 group-hover:text-[#e8dcc5] transition-colors">{track.name}</span>
                                            </div>
                                            <i className="fas fa-chevron-right text-[12px] text-[#c89d53]/40 group-hover:text-[#c89d53] transition-colors"></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* OTROS LANZAMIENTOS (FULL WIDTH GRID) */}
                {otherReleases.length > 0 && (
                    <div className="w-full max-w-6xl backdrop-blur-xl bg-[#2a221f]/50 p-6 md:p-10 rounded-2xl border border-[#1e4a7a]/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-center">
                        <h4 className="text-[#c89d53] text-[12px] md:text-[14px] font-bold uppercase tracking-[0.2em] mb-8 flex items-center justify-center gap-3 font-mono">
                            <i className="fas fa-compact-disc"></i> MÁS DE {song.artist.toUpperCase()}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {otherReleases.map((other, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => navigate(`/link/${other.id}`)}
                                    className="w-full flex flex-col items-center p-3 md:p-4 rounded-xl bg-[#1a1411]/50 border border-[#1e4a7a]/10 hover:border-[#1e4a7a]/30 transition-all duration-300 group"
                                >
                                    <div className="w-full aspect-square mb-3 md:mb-4 overflow-hidden rounded-lg">
                                        <img 
                                            src={other.cover} 
                                            alt={other.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <h5 className="text-[12px] md:text-[14px] font-bold text-[#e8dcc5] leading-snug group-hover:text-[#c89d53] transition-colors line-clamp-1">{other.name}</h5>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center w-full border-t border-[#1e4a7a]/20 pb-8 pt-8 relative z-20 max-w-7xl mx-auto px-4">
                <h3 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#c89d53]/70 mb-6 font-mono">Sígueme</h3>
                <div className="flex justify-center gap-6">
                    <a href="https://instagram.com/juan614oficial" target="_blank" rel="noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#1e4a7a]/10 border border-[#1e4a7a]/20 flex items-center justify-center hover:bg-[#1e4a7a]/30 transition-all duration-300"><i className="fab fa-instagram text-xl md:text-2xl text-[#c89d53]"></i></a>
                    <a href="https://tiktok.com/@juan614oficial" target="_blank" rel="noreferrer" className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-[#1e4a7a]/10 border border-[#1e4a7a]/20 flex items-center justify-center hover:bg-[#1e4a7a]/30 transition-all duration-300"><i className="fab fa-tiktok text-xl md:text-2xl text-[#c89d53]"></i></a>
                </div>
                <p className="text-[#c89d53]/40 text-[8px] md:text-[9px] mt-8 tracking-widest uppercase font-mono">&copy; {new Date().getFullYear()} Juan 614.</p>
            </div>

            {/* Modals */}
            <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} url={getShareUrl()} />
        </div>
    );
};

export default SmartLinkView;
