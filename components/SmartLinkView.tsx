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

    const accentColor = isJuan ? '#c89d53' : '#c5a059';
    const waveBarCount = 16;
    const delays = [0.1, 0.4, 0.2, 0.6, 0.3, 0.8, 0.5, 0.2, 0.7, 0.4, 0.9, 0.3, 0.6, 0.1, 0.5, 0.8];

    return (
        <div className={`w-full max-w-md mb-8 rounded-2xl p-5 border shadow-2xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${isJuan ? 'bg-[#2a221f]/90 border-[#8B5A2B]/30' : 'bg-black/50 border-white/10 backdrop-blur-xl'}`}>
            <div id={`yt-player-${videoId}`} className="hidden"></div>
            
            <HUDCorners color={isJuan ? '#c89d53' : '#c5a059'} />

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

    const accentColor = isJuan ? '#c89d53' : '#c5a059';

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
            ? 'bg-[#2a221f]/40 border-[#8B5A2B]/20 text-[#e8dcc5]' 
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

const getMotivationalQuotes = (isJuan: boolean, songName: string) => {
    if (isJuan) {
        return [
            "Música acústica y honesta para reconectar con lo esencial y calmar el espíritu.",
            "Cada acorde de madera busca llevarte a un momento de intimidad y adoración pura.",
            "Una propuesta para detener el ruido diario y encontrar paz en la sencillez de la fe.",
            "Adoración cruda y orgánica nacida en el corazón, cantada desde el alma."
        ];
    } else {
        return [
            "El cuerpo entrena, el espíritu persevera. Tu verdadera fuerza proviene del Creador.",
            "La disciplina en el ejercicio es el reflejo externo de tu constancia en la fe.",
            "¡No te rindas! Todo lo puedo en Cristo que me fortalece (Filipenses 4:13).",
            "Música de alto impacto diseñada para activar tu cuerpo y fortalecer tu espíritu hoy.",
            "Fe en el proceso, fuerza en el cuerpo, enfoque en la meta. ¡Dale con todo!"
        ];
    }
};

const getThematicStats = (isJuan: boolean, songName: string) => {
    if (isJuan) {
        return {
            uso: "Tiempo de Meditación / Adoración / Calma",
            ritmo: "Adoración Acústica / Tempo Lento y Profundo",
            enfoque: "Paz Mental & Intimidad Espiritual",
            recom: "Ideal para iniciar el día en oración o encontrar descanso en Dios."
        };
    } else {
        return {
            uso: "Entrenamiento de Fuerza / Cardio / Alta Intensidad",
            ritmo: "Ritmo Energético / Enfoque Motivacional",
            enfoque: "Disciplina Mental & Poder Espiritual",
            recom: "Ideal para escuchar al iniciar tu rutina o durante tus series más pesadas."
        };
    }
};

const SmartLinkView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [song, setSong] = useState<MusicItem | null>(null);
    const [relatedSongs, setRelatedSongs] = useState<MusicItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { isSubscribed, subscribe, unsubscribe } = useOneSignal();
    const { trackEvent } = useAnalytics();

    const [showQrModal, setShowQrModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showPlatforms, setShowPlatforms] = useState(false);

    const getShareUrl = () => {
        if (id === 'custom') {
            return `https://app.diosmasgym.com/link/custom${location.search}`;
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
                <div className="w-12 h-12 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-screen bg-[#05070a] text-white flex flex-col items-center justify-center p-8">
                <i className="fas fa-exclamation-triangle text-4xl text-[#c5a059] mb-4"></i>
                <h1 className="text-2xl font-serif italic mb-2 text-center">Enlace no disponible</h1>
                <p className="text-white/50 text-xs mb-8 text-center">{errorMsg}</p>
                <button onClick={() => navigate('/')} className="bg-[#c5a059] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                    Volver al Inicio
                </button>
            </div>
        );
    }

    if (!song) return null;

    const isJuan = song.artist.toLowerCase().includes('juan');

    const quotes = getMotivationalQuotes(isJuan, song.name);
    const hash = song.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selectedQuote = quotes[hash % quotes.length];
    const stats = getThematicStats(isJuan, song.name);

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
                    0%, 100% {
                      height: 5px;
                    }
                    50% {
                      height: 32px;
                    }
                  }
                  @keyframes float-slow-orb {
                    0%, 100% {
                      transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                      transform: translate(40px, -60px) scale(1.1);
                    }
                    66% {
                      transform: translate(-30px, 30px) scale(0.95);
                    }
                  }
                  .animate-float-slow {
                    animation: float-slow-orb 18s ease-in-out infinite;
                  }
                `}</style>

                {/* Dynamic Gold Glowing Orbs (Premium background effect) */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c5a059]/8 rounded-full blur-[120px] animate-float-slow pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8c6b32]/8 rounded-full blur-[120px] animate-float-slow pointer-events-none" style={{ animationDelay: '5s' }}></div>

                {/* Background Blur */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-25 scale-110 blur-2xl saturate-150"
                    style={{ backgroundImage: `url(${song.cover})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#05070a]/60 via-[#05070a] to-[#05070a]"></div>

                <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-16 px-4 py-6 md:py-20 w-full max-w-5xl mx-auto animate-fade-in">
                    
                    {/* LEFT COLUMN: Art & Player */}
                    <div className="flex flex-col items-center w-full max-w-sm shrink-0 transition-transform duration-500">
                        <div className="relative group mb-6 md:mb-8 p-1">
                            {/* Ambient Glow using Cover image */}
                            <div 
                                className="absolute -inset-4 bg-cover bg-center rounded-[40px] blur-xl opacity-30 group-hover:opacity-55 transition duration-700 pointer-events-none"
                                style={{ backgroundImage: `url(${song.cover})` }}
                            ></div>
                            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#c5a059] to-[#8c6b32] rounded-[36px] opacity-10 group-hover:opacity-30 transition duration-700 pointer-events-none"></div>
                            <div className="relative w-44 h-44 md:w-80 md:h-80 overflow-hidden rounded-[32px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.02]">
                                <img 
                                    src={song.cover} 
                                    alt={song.name} 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        
                        <h1 className="font-serif italic text-2xl md:text-5xl text-center mb-1 md:mb-2 drop-shadow-[0_10px_25px_rgba(0,0,0,0.7)] font-bold px-2 tracking-wide text-white">{song.name}</h1>
                        <p className="text-[#c5a059] text-[11px] font-black uppercase tracking-[0.5em] mb-5 md:mb-6 text-center">{song.artist}</p>

                        <ReleaseCountdown releaseDate={song.date} isJuan={false} />

                        {embedData?.type === 'youtube' && (
                            <YouTubeAudioPlayer videoId={embedData.id!} isJuan={false} />
                        )}
                        
                        {embedData?.type === 'spotify' && (
                            <div className="w-full mb-4 md:mb-8 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-[#c5a059]/20 bg-black/40 p-2 backdrop-blur-md">
                                <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2">
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

                    {/* RIGHT COLUMN: Links & Social */}
                    <div className="flex flex-col items-center w-full max-w-md gap-6">
                        {/* Dynamic Inspiration & Thematic Stats Cards */}
                        <div className="w-full flex flex-col gap-4 relative z-20">
                            {/* Card 1: Inspiration Quote */}
                            <div className="w-full backdrop-blur-xl bg-black/40 p-5 rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-left relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#c5a059]"></div>
                                <h4 className="text-[#c5a059] text-[8px] font-black uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                                    <i className="fas fa-quote-left text-[6px]"></i> INSPIRACIÓN Y REFLEXIÓN
                                </h4>
                                <p className="text-white/90 text-xs font-serif italic leading-relaxed tracking-wide">
                                    "{selectedQuote}"
                                </p>
                            </div>

                            {/* Card 2: Thematic Workout Stats */}
                            <div className="w-full backdrop-blur-xl bg-black/40 p-5 rounded-2xl border border-white/5 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-left relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#8c6b32]/60"></div>
                                <h4 className="text-[#c5a059] text-[8px] font-black uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
                                    <i className="fas fa-dumbbell text-[8px]"></i> ESPECIFICACIONES DE ENTRENAMIENTO
                                </h4>
                                <div className="space-y-2.5 text-[9px] text-white/50 uppercase tracking-wider font-semibold">
                                    <div>USO RECOMENDADO: <span className="text-white font-bold block normal-case font-sans text-xs mt-0.5">{stats.uso}</span></div>
                                    <div>RITMO Y VIBRA: <span className="text-white font-bold block normal-case font-sans text-xs mt-0.5">{stats.ritmo}</span></div>
                                    <div>ENFOQUE CENTRAL: <span className="text-white font-bold block normal-case font-sans text-xs mt-0.5">{stats.enfoque}</span></div>
                                    <div className="border-t border-white/5 pt-2 mt-2 normal-case text-white/40 font-sans font-normal italic text-[8.5px]">
                                        {stats.recom}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Platforms Dropdown Card */}
                        <div className="w-full relative z-20 backdrop-blur-xl bg-black/40 p-4 md:p-5 rounded-3xl border border-[#c5a059]/20 shadow-[0_20px_50px_rgba(197,160,89,0.08)] transition-all hover:border-[#c5a059]/30 duration-500 overflow-hidden">
                            <HUDCorners color="#c5a059" />
                            
                            <button 
                                onClick={() => setShowPlatforms(!showPlatforms)}
                                className={`w-full py-4 px-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 ${
                                    showPlatforms 
                                    ? 'bg-white text-black shadow-lg scale-[0.99]' 
                                    : 'bg-gradient-to-r from-[#c5a059] to-[#8c6b32] text-black shadow-[0_4px_25px_rgba(197,160,89,0.35)] hover:shadow-[0_8px_30px_rgba(197,160,89,0.5)] hover:scale-[1.01]'
                                }`}
                            >
                                <i className={`fas ${showPlatforms ? 'fa-times' : 'fa-play-circle'} text-xs`}></i>
                                {showPlatforms ? 'Ocultar Plataformas' : 'Escuchar en plataformas'}
                            </button>

                            <div 
                                className={`transition-all duration-500 ease-in-out overflow-hidden flex flex-col gap-3 ${
                                    showPlatforms ? 'max-h-[600px] mt-4 opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={false} />
                                <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={false} />
                                <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={false} />
                                <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} isJuan={false} />
                                <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} isJuan={false} />
                                <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} isJuan={false} />
                                <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} isJuan={false} />
                                <PlatformButton platform="Sitio Web Oficial" icon="fas fa-globe" color="#c5a059" url="https://musica.diosmasgym.com/" isJuan={false} />
                            </div>

                            {/* SECCIÓN COMPARTIR (DGM) */}
                            <div className="mt-6 border-t border-white/5 pt-6 w-full">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4 flex items-center gap-2">
                                    <i className="fas fa-share-alt"></i> Compartir lanzamiento
                                </h3>
                                <div className="flex gap-3 justify-center">
                                    <a 
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}: ` + getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366] hover:text-white transition-all text-xs"
                                        title="Compartir por WhatsApp"
                                    >
                                        <i className="fab fa-whatsapp"></i>
                                    </a>
                                    <a 
                                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}:`)}&url=${encodeURIComponent(getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-black hover:text-white transition-all text-xs"
                                        title="Compartir en X (Twitter)"
                                    >
                                        <i className="fab fa-x-twitter"></i>
                                    </a>
                                    <a 
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2] hover:text-white transition-all text-xs"
                                        title="Compartir en Facebook"
                                    >
                                        <i className="fab fa-facebook-f"></i>
                                    </a>
                                    <button 
                                        onClick={() => setShowQrModal(true)}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#c5a059] hover:text-black transition-all text-xs"
                                        title="Código QR"
                                    >
                                        <i className="fas fa-qrcode"></i>
                                    </button>
                                    <button 
                                        onClick={copyToClipboard}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#c5a059] hover:text-black transition-all relative text-xs"
                                        title="Copiar enlace"
                                    >
                                        <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
                                        {copied && (
                                            <span className="absolute -top-10 bg-black text-white text-[8px] px-2 py-1 rounded border border-white/10 animate-bounce whitespace-nowrap z-50">
                                                ¡Copiado!
                                            </span>
                                        )}
                                    </button>
                                </div>
                                <div className="mt-5 flex justify-center">
                                    <a 
                                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Te dedico esta canción que me inspiró bastante: *${song.name}* de ${song.artist} 🎵✨. Escúchala completa aquí: ` + getShareUrl())}`}
                                        target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all text-white bg-green-500/10 border-green-500/25 hover:bg-green-500 hover:text-black hover:border-green-500 hover:shadow-[0_0_15px_rgba(37,211,102,0.45)]"
                                    >
                                        <i className="fas fa-heart text-red-500 animate-pulse"></i> Dedicar por WhatsApp
                                    </a>
                                </div>
                            </div>

                            {relatedSongs.length > 0 && (
                                <div className="mt-10 border-t border-white/5 pt-8">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 flex items-center gap-3">
                                        <i className="fas fa-list-ul"></i>
                                        Lista de Canciones / Tracks
                                    </h3>
                                    <div className="space-y-2">
                                        {relatedSongs.map((track, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => navigate(`/link/${track.id}`)}
                                                className="w-full flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-mono text-white/20">{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
                                                    <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{track.name}</span>
                                                </div>
                                                <i className="fas fa-chevron-right text-[10px] text-white/20 group-hover:text-[#c5a059] transition-colors"></i>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center">
                                <button 
                                    onClick={subscribe}
                                    className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10 hover:border-[#c5a059] hover:bg-[#c5a059]/10'}`}
                                >
                                    <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500' : 'fa-bell text-[#c5a059] group-hover:animate-bounce'}`}></i>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isSubscribed ? 'text-green-500' : 'text-white/70 group-hover:text-white'}`}>
                                        {isSubscribed ? '¡Suscrito! Espera música pronto' : 'Avísame de nuevos estrenos'}
                                    </span>
                                </button>
                                <p className="mt-3 text-[7px] font-bold uppercase tracking-widest text-white/20">Recibe una notificación push cuando {song.artist} saque música nueva</p>
                                {isSubscribed && (
                                    <button 
                                        onClick={unsubscribe}
                                        className="mt-4 text-[7px] font-bold uppercase tracking-widest text-white/10 hover:text-red-500 transition-all underline underline-offset-4"
                                    >
                                        Darse de baja
                                    </button>
                                )}
                            </div>
                        </div>


                        <div className="mt-8 text-center w-full border-t border-white/10 pt-8 relative z-20">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">Únete a la Comunidad</h3>
                            <div className="flex justify-center gap-6">
                                <a href="https://instagram.com/diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E1306C] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-instagram text-xl text-white"></i></a>
                                <a href="https://tiktok.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all duration-300"><i className="fab fa-tiktok text-xl text-white"></i></a>
                                <a href="https://youtube.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF0000] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-youtube text-xl text-white"></i></a>
                            </div>
                            <p className="mt-8 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">© {new Date().getFullYear()} {song.artist}. v5.0.5</p>
                        </div>
                    </div>
                </div>

                {/* QR CODE MODAL OVERLAY (DGM) */}
                {showQrModal && (
                    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all" onClick={() => setShowQrModal(false)}>
                        <div 
                            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl flex flex-col items-center gap-6 relative ${isJuan ? 'bg-[#2a221f] border-[#8B5A2B]/30 text-[#e8dcc5]' : 'bg-[#0a0c14] border-white/10 text-white'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button 
                                onClick={() => setShowQrModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            
                            <div className="text-center mt-2">
                                <h3 className="font-serif italic text-xl font-bold mb-1">Escanear Código QR</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Escucha en tu dispositivo móvil</p>
                            </div>

                            {/* QR Image */}
                            <div className="p-4 bg-white rounded-2xl shadow-inner">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getShareUrl())}&color=${isJuan ? '8B5A2B' : 'c5a059'}&bgcolor=ffffff`}
                                    alt="Código QR del smartlink"
                                    className="w-48 h-48 object-contain rounded-lg"
                                    loading="lazy"
                                />
                            </div>

                            <div className="text-center w-full">
                                <span className="text-[10px] font-bold text-white/40 block mb-3 font-mono break-all px-4">{getShareUrl()}</span>
                                <button 
                                    onClick={() => {
                                        copyToClipboard();
                                        setShowQrModal(false);
                                    }}
                                    className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md font-bold"
                                    style={{ backgroundColor: isJuan ? '#c89d53' : '#c5a059', color: '#000' }}
                                >
                                    <i className="fas fa-link mr-2"></i> Copiar enlace
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // === TEMA JUAN 614 (Acústico / Norteño / Tierra - Dark Mode) ===
    return (
        <div className="min-h-screen bg-[#1a1412] text-[#e8dcc5] font-['Poppins'] flex flex-col relative overflow-hidden">
            <style>{`
              @keyframes wave-bounce {
                0%, 100% {
                  height: 5px;
                }
                50% {
                  height: 32px;
                }
              }
              @keyframes float-slow-orb {
                0%, 100% {
                  transform: translate(0px, 0px) scale(1);
                }
                33% {
                  transform: translate(40px, -60px) scale(1.1);
                }
                66% {
                  transform: translate(-30px, 30px) scale(0.95);
                }
              }
              .animate-float-slow {
                animation: float-slow-orb 18s ease-in-out infinite;
              }
            `}</style>

            {/* Dynamic Earthy/Bronze Glowing Orbs (Acoustic feel) */}
            <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-[#c89d53]/6 rounded-full blur-[130px] animate-float-slow pointer-events-none"></div>
            <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-[#8B5A2B]/6 rounded-full blur-[130px] animate-float-slow pointer-events-none" style={{ animationDelay: '5s' }}></div>

            {/* Background Blur basado en portada */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-15 scale-110 blur-2xl saturate-75"
                style={{ backgroundImage: `url(${song.cover})` }}
            ></div>
            {/* Background Texture (Papel/Madera/Ruido) en oscuro */}
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#d3c19e 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-16 px-4 py-6 md:py-20 w-full max-w-5xl mx-auto animate-fade-in">
                
                {/* LEFT COLUMN: Art & Player */}
                <div className="flex flex-col items-center w-full max-w-sm shrink-0 transition-transform duration-500">
                    <div className="relative mb-6 md:mb-8 group p-1">
                        {/* Ambient Glow using Cover image */}
                        <div 
                            className="absolute -inset-4 bg-cover bg-center rounded-[32px] blur-xl opacity-20 group-hover:opacity-45 transition duration-700 pointer-events-none"
                            style={{ backgroundImage: `url(${song.cover})` }}
                        ></div>
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#c89d53] to-[#8B5A2B] rounded-[28px] opacity-15 group-hover:opacity-35 transition duration-700 pointer-events-none"></div>
                        <div className="relative w-44 h-44 md:w-80 md:h-80 overflow-hidden rounded-[24px] border border-[#c89d53]/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:scale-[1.02]">
                            <img 
                                src={song.cover} 
                                alt={song.name} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Elemento de diseño de fondo */}
                        <div className="absolute -inset-4 border border-[#8B5A2B]/20 transform rotate-3 rounded-2xl group-hover:rotate-6 transition-transform duration-500 pointer-events-none"></div>
                    </div>
                    
                    <h1 className="font-['Playfair_Display',serif] italic text-2xl md:text-5xl text-center mb-1 md:mb-2 text-[#e8dcc5] font-bold px-2 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">{song.name}</h1>
                    <p className="text-[#c89d53] text-[10px] font-black uppercase tracking-[0.4em] mb-5 md:mb-6 text-center">{song.artist}</p>

                    <ReleaseCountdown releaseDate={song.date} isJuan={true} />

                    {embedData?.type === 'youtube' && (
                        <YouTubeAudioPlayer videoId={embedData.id!} isJuan={true} />
                    )}
                    
                    {embedData?.type === 'spotify' && (
                        <div className="w-full mb-4 md:mb-8 rounded-xl overflow-hidden shadow-2xl border border-[#c89d53]/20 bg-[#2a221f] p-2 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#1DB954] flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse"></div>
                                    Previa Spotify
                                </span>
                                <span className="text-[8px] uppercase tracking-widest text-[#e8dcc5]/50">Escucha un fragmento</span>
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

                {/* RIGHT COLUMN: Links & Social */}
                <div className="flex flex-col items-center w-full max-w-md gap-6">
                    {/* Dynamic Inspiration & Acoustic Stats Cards */}
                    <div className="w-full flex flex-col gap-4 relative z-20">
                        {/* Card 1: Inspiration Quote */}
                        <div className="w-full backdrop-blur-xl bg-[#2a221f]/50 p-5 rounded-2xl border border-[#8B5A2B]/15 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-left relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#c89d53]"></div>
                            <h4 className="text-[#c89d53] text-[8px] font-black uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                                <i className="fas fa-quote-left text-[6px]"></i> INSPIRACIÓN Y MENSAJE
                            </h4>
                            <p className="text-[#e8dcc5]/90 text-xs font-serif italic leading-relaxed tracking-wide">
                                "{selectedQuote}"
                            </p>
                        </div>

                        {/* Card 2: Acoustic Stats */}
                        <div className="w-full backdrop-blur-xl bg-[#2a221f]/50 p-5 rounded-2xl border border-[#8B5A2B]/15 shadow-[0_15px_30px_rgba(0,0,0,0.3)] text-left relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#8B5A2B]/50"></div>
                            <h4 className="text-[#c89d53] text-[8px] font-black uppercase tracking-[0.25em] mb-3 flex items-center gap-1.5">
                                <i className="fas fa-music text-[8px]"></i> ESPECIFICACIONES DE ADORACIÓN
                            </h4>
                            <div className="space-y-2.5 text-[9px] text-[#e8dcc5]/50 uppercase tracking-wider font-semibold">
                                <div>USO RECOMENDADO: <span className="text-[#e8dcc5] font-bold block normal-case font-sans text-xs mt-0.5">{stats.uso}</span></div>
                                <div>ESTILO Y RITMO: <span className="text-[#e8dcc5] font-bold block normal-case font-sans text-xs mt-0.5">{stats.ritmo}</span></div>
                                <div>ENFOQUE CENTRAL: <span className="text-[#e8dcc5] font-bold block normal-case font-sans text-xs mt-0.5">{stats.enfoque}</span></div>
                                <div className="border-t border-[#8B5A2B]/20 pt-2 mt-2 normal-case text-[#e8dcc5]/40 font-sans font-normal italic text-[8.5px]">
                                    {stats.recom}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Platforms Dropdown Card */}
                    <div className="w-full relative z-20 backdrop-blur-xl bg-[#2a221f]/90 p-4 md:p-5 rounded-3xl border border-[#c89d53]/25 shadow-[0_20px_50px_rgba(139,90,43,0.08)] transition-all hover:border-[#c89d53]/40 duration-500 overflow-hidden">
                        <HUDCorners color="#c89d53" />
                        
                        <button 
                            onClick={() => setShowPlatforms(!showPlatforms)}
                            className={`w-full py-4 px-6 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 ${
                                showPlatforms 
                                ? 'bg-[#e8dcc5] text-[#1a1412] shadow-lg scale-[0.99]' 
                                : 'bg-gradient-to-r from-[#c89d53] to-[#8B5A2B] text-black shadow-[0_4px_25px_rgba(200,157,83,0.3)] hover:shadow-[0_8px_30px_rgba(200,157,83,0.45)] hover:scale-[1.01]'
                            }`}
                        >
                            <i className={`fas ${showPlatforms ? 'fa-times' : 'fa-play-circle'} text-xs`}></i>
                            {showPlatforms ? 'Ocultar Plataformas' : 'Escuchar en plataformas'}
                        </button>

                        <div 
                            className={`transition-all duration-500 ease-in-out overflow-hidden flex flex-col gap-3 ${
                                showPlatforms ? 'max-h-[600px] mt-4 opacity-100' : 'max-h-0 opacity-0'
                            }`}
                        >
                            <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} isJuan={true} />
                            <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} isJuan={true} />
                            <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} isJuan={true} />
                            <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} isJuan={true} />
                            <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} isJuan={true} />
                            <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} isJuan={true} />
                            <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} isJuan={true} />
                            <PlatformButton platform="Sitio Web Oficial" icon="fas fa-globe" color="#c89d53" url="https://juan614.diosmasgym.com/" isJuan={true} />
                        </div>

                        {/* SECCIÓN COMPARTIR (JUAN 614) */}
                        <div className="mt-6 border-t border-[#8B5A2B]/20 pt-6 w-full">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c89d53] mb-4 flex items-center gap-2">
                                <i className="fas fa-share-alt"></i> Compartir lanzamiento
                            </h3>
                            <div className="flex gap-3 justify-center">
                                <a 
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}: ` + getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366] hover:text-white transition-all text-xs"
                                    title="Compartir por WhatsApp"
                                >
                                    <i className="fab fa-whatsapp"></i>
                                </a>
                                <a 
                                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`¡Tienes que escuchar esto! 🔥 "${song.name}" de ${song.artist}:`)}&url=${encodeURIComponent(getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-black hover:text-white transition-all text-xs"
                                    title="Compartir en X (Twitter)"
                                >
                                    <i className="fab fa-x-twitter"></i>
                                </a>
                                <a 
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2] hover:text-white transition-all text-xs"
                                    title="Compartir en Facebook"
                                >
                                    <i className="fab fa-facebook-f"></i>
                                </a>
                                <button 
                                    onClick={() => setShowQrModal(true)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#c89d53] hover:text-black transition-all text-xs"
                                    title="Código QR"
                                >
                                    <i className="fas fa-qrcode"></i>
                                </button>
                                <button 
                                    onClick={copyToClipboard}
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-[#c89d53] hover:text-black transition-all relative text-xs"
                                    title="Copiar enlace"
                                >
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
                                    {copied && (
                                        <span className="absolute -top-10 bg-black text-white text-[8px] px-2 py-1 rounded border border-[#8B5A2B]/20 animate-bounce whitespace-nowrap z-50">
                                            ¡Copiado!
                                        </span>
                                    )}
                                </button>
                            </div>
                            <div className="mt-5 flex justify-center">
                                <a 
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Te dedico esta canción que me inspiró bastante: *${song.name}* de ${song.artist} 🎵✨. Escúchala completa aquí: ` + getShareUrl())}`}
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all text-[#e8dcc5] bg-green-500/10 border-green-500/25 hover:bg-green-500 hover:text-black hover:border-green-500 hover:shadow-[0_0_15px_rgba(37,211,102,0.45)]"
                                >
                                    <i className="fas fa-heart text-red-500 animate-pulse"></i> Dedicar por WhatsApp
                                </a>
                            </div>
                        </div>

                        {relatedSongs.length > 0 && (
                            <div className="mt-10 border-t border-[#8B5A2B]/20 pt-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c89d53] mb-6 flex items-center gap-3">
                                    <i className="fas fa-compact-disc"></i>
                                    Contenido del Álbum
                                </h3>
                                <div className="space-y-2">
                                    {relatedSongs.map((track, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => navigate(`/link/${track.id}`)}
                                            className="w-full flex items-center justify-between p-4 bg-[#1a1412] rounded-xl border border-[#8B5A2B]/10 hover:border-[#c89d53]/40 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-5 h-5 flex items-center justify-center relative font-mono text-[10px]">
                                                    <span className="absolute transition-opacity duration-300 opacity-100 group-hover:opacity-0 text-[#c89d53]/30">
                                                        {i + 1 < 10 ? `0${i + 1}` : i + 1}
                                                    </span>
                                                    <i className="fas fa-play absolute transition-opacity duration-300 opacity-0 group-hover:opacity-100 text-[#c89d53] text-[8px]"></i>
                                                </div>
                                                <span className="text-xs font-bold text-[#e8dcc5]/80 group-hover:text-[#e8dcc5] transition-colors">{track.name}</span>
                                            </div>
                                            <i className="fas fa-chevron-right text-[10px] text-[#c89d53]/30 group-hover:text-[#c89d53] transition-colors"></i>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Public Notification Subscription (Juan Style) */}
                        <div className="mt-8 pt-8 border-t border-[#8B5A2B]/20 flex flex-col items-center">
                            <button 
                                onClick={subscribe}
                                className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-[#1a1412] border-[#8B5A2B]/40 hover:border-[#c89d53] hover:bg-[#c89d53]/10'}`}
                            >
                                <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500' : 'fa-bell text-[#c89d53] group-hover:animate-bounce'}`}></i>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isSubscribed ? 'text-green-500' : 'text-[#e8dcc5]/70 group-hover:text-[#e8dcc5]'}`}>
                                    {isSubscribed ? '¡Suscrito! Espera música pronto' : 'Avísame de nuevos estrenos'}
                                </span>
                            </button>
                            {isSubscribed && (
                                <button 
                                    onClick={unsubscribe}
                                    className="mt-4 text-[7px] font-bold uppercase tracking-widest text-[#e8dcc5]/20 hover:text-red-500 transition-all underline underline-offset-4"
                                >
                                    ¿Ya no quieres recibir avisos? Haz clic aquí para darte de baja
                                </button>
                            )}
                        </div>
                    </div>


                    <div className="mt-8 text-center w-full border-t border-[#8B5A2B]/20 pt-8 relative z-20">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#e8dcc5]/50 mb-6">Sígueme en Redes</h3>
                        <div className="flex justify-center gap-6">
                            <a href="https://instagram.com/juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#E1306C] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-instagram text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                            <a href="https://tiktok.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-black hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-tiktok text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                            <a href="https://youtube.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#FF0000] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-youtube text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                        </div>
                        <p className="mt-8 text-[8px] font-bold uppercase tracking-[0.2em] text-[#e8dcc5]/30">© {new Date().getFullYear()} {song.artist}. v5.0.5</p>
                    </div>
                </div>
            </div>

            {/* QR CODE MODAL OVERLAY */}
            {showQrModal && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all" onClick={() => setShowQrModal(false)}>
                    <div 
                        className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl flex flex-col items-center gap-6 relative ${isJuan ? 'bg-[#2a221f] border-[#8B5A2B]/30 text-[#e8dcc5]' : 'bg-[#0a0c14] border-white/10 text-white'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button 
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-xs"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        
                        <div className="text-center mt-2">
                            <h3 className="font-serif italic text-xl font-bold mb-1">Escanear Código QR</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Escucha en tu dispositivo móvil</p>
                        </div>

                        {/* QR Image */}
                        <div className="p-4 bg-white rounded-2xl shadow-inner">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getShareUrl())}&color=${isJuan ? '8B5A2B' : 'c5a059'}&bgcolor=ffffff`}
                                alt="Código QR del smartlink"
                                className="w-48 h-48 object-contain rounded-lg"
                                loading="lazy"
                            />
                        </div>

                        <div className="text-center w-full">
                            <span className="text-[10px] font-bold text-white/40 block mb-3 font-mono break-all px-4">{getShareUrl()}</span>
                            <button 
                                onClick={() => {
                                    copyToClipboard();
                                    setShowQrModal(false);
                                }}
                                className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md font-bold"
                                style={{ backgroundColor: isJuan ? '#c89d53' : '#c5a059', color: '#000' }}
                            >
                                <i className="fas fa-link mr-2"></i> Copiar enlace
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlatformButton = ({ platform, icon, color, url, isJuan }: { platform: string, icon: string, color: string, url: string, isJuan: boolean }) => {
    const accentColor = isJuan ? '#c89d53' : '#c5a059';
    
    let subtitle = "Escuchar canción";
    let actionText = "Escuchar";
    
    if (platform.toLowerCase().includes('youtube')) {
        subtitle = "Ver video oficial";
        actionText = "Ver";
    } else if (platform.toLowerCase().includes('sitio web')) {
        subtitle = "Visitar portal";
        actionText = "Entrar";
    } else if (platform.toLowerCase().includes('apple')) {
        subtitle = "Escuchar en alta fidelidad";
    } else if (platform.toLowerCase().includes('amazon')) {
        subtitle = "Escuchar en HD";
    } else if (platform.toLowerCase().includes('deezer')) {
        subtitle = "Escuchar en Deezer";
    } else if (platform.toLowerCase().includes('audiomack')) {
        subtitle = "Escuchar gratis";
    } else if (platform.toLowerCase().includes('tidal')) {
        subtitle = "Escuchar audio HiFi";
    }

    const ctaClass = isJuan 
        ? "group-hover:bg-[#c89d53] group-hover:text-black group-hover:border-[#c89d53] group-hover:shadow-[0_0_12px_rgba(200,157,83,0.4)]"
        : "group-hover:bg-[#c5a059] group-hover:text-black group-hover:border-[#c5a059] group-hover:shadow-[0_0_15px_rgba(197,160,89,0.5)]";

    return (
        <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all duration-300 group border relative overflow-hidden ${
                isJuan 
                ? 'bg-[#2a221f]/40 border-[#8B5A2B]/20 hover:border-[#c89d53]/50 hover:bg-[#2a221f]/70' 
                : 'bg-black/30 border-white/5 hover:border-[#c5a059]/40 hover:bg-black/60'
            }`}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300" style={{ backgroundColor: color }}></div>

            <div className="flex items-center gap-4 relative z-10">
                <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0"
                    style={{ 
                        backgroundColor: `${color}15`, 
                        border: `1px solid ${color}30`,
                        color: color 
                    }}
                >
                    <i className={`${icon} text-lg md:text-xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}></i>
                </div>
                
                <div className="text-left">
                    <h4 className={`text-xs md:text-sm font-bold tracking-wide ${isJuan ? 'text-[#e8dcc5]' : 'text-white'}`}>
                        {platform}
                    </h4>
                    <p className={`text-[8px] md:text-[9px] uppercase tracking-wider font-semibold ${isJuan ? 'text-[#e8dcc5]/40' : 'text-white/40'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="relative z-10 shrink-0">
                <span 
                    className={`px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all duration-300 border font-mono block ${ctaClass}`}
                    style={{
                        backgroundColor: 'transparent',
                        borderColor: `${accentColor}30`,
                        color: accentColor,
                        boxShadow: `0 0 0px ${accentColor}`,
                    }}
                >
                    {actionText}
                </span>
            </div>
        </a>
    );
};

export default SmartLinkView;
