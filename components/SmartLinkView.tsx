import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../services/musicService';
import { MusicItem } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubeAudioPlayer = ({ videoId, isJuan }: { videoId: string, isJuan: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const playerRef = React.useRef<any>(null);

    useEffect(() => {
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
                        } else {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        }
    }, [videoId]);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                    const time = playerRef.current.getCurrentTime();
                    setProgress((time / 60) * 100);
                    if (time >= 60) {
                        playerRef.current.pauseVideo();
                        playerRef.current.seekTo(0);
                        setIsPlaying(false);
                        setProgress(0);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    const togglePlay = () => {
        if (!playerRef.current || !playerRef.current.playVideo) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const accentColor = isJuan ? '#c89d53' : '#c5a059';

    return (
        <div className={`w-full max-w-md mb-8 rounded-3xl p-4 border shadow-xl flex flex-col gap-4 relative overflow-hidden ${isJuan ? 'bg-[#2a221f] border-[#8B5A2B]/20' : 'bg-white/5 border-white/10 backdrop-blur-xl'}`}>
            <div id={`yt-player-${videoId}`} className="hidden"></div>
            
            {/* Background progress indicator pulse */}
            {isPlaying && <div className="absolute inset-0 opacity-10 animate-pulse" style={{ backgroundColor: accentColor }}></div>}
            
            <div className="flex justify-between items-center relative z-10 px-2">
                <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor }}>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    Previa (60 Segundos)
                </span>
                <span className={`text-[8px] uppercase tracking-widest ${isJuan ? 'text-[#e8dcc5]/40' : 'text-white/40'}`}>
                    Escucha un fragmento
                </span>
            </div>

            <div className="flex items-center gap-4 relative z-10">
                <button onClick={togglePlay} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform" style={{ backgroundColor: accentColor }}>
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-black text-xl ${!isPlaying ? 'ml-1' : ''}`}></i>
                </button>
                <div className="flex-1 pr-2">
                    <div className={`flex justify-between text-[9px] font-black uppercase tracking-widest mb-3 ${isJuan ? 'text-[#e8dcc5]/70' : 'text-white/70'}`}>
                        <span>{isPlaying ? 'Reproduciendo...' : 'Listo para escuchar'}</span>
                        <span className="font-mono">{Math.floor(progress * 0.6)}s / 60s</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isJuan ? 'bg-black/30' : 'bg-white/10'}`}>
                        <div className="h-full transition-all duration-1000 ease-linear rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: accentColor }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SmartLinkView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [song, setSong] = useState<MusicItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const loadSong = async () => {
            try {
                if (id === 'custom') {
                    // Cargar desde parámetros de la URL para enlaces generados manualmente
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
                        return; // Termina aquí
                    }
                }

                // Buscamos en ambos catálogos para enlaces normales
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                const fullCatalog = [...dM, ...j6];
                const found = fullCatalog.find(s => s.id === id || (s.url && s.url.includes(id || '')));
                if (found) {
                    setSong(found);
                    // Actualizar Meta Tags dinámicamente
                    document.title = `${found.name} - ${found.artist}`;
                } else {
                    // Si no se encuentra, mostrar error en lugar de redirigir
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
            return `https://www.pandora.com/search/${query}/all`;
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
                {/* Background Blur */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 scale-110 blur-xl"
                    style={{ backgroundImage: `url(${song.cover})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#05070a]/50 via-[#05070a] to-[#05070a]"></div>

                <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-16 px-4 py-6 md:py-20 w-full max-w-5xl mx-auto">
                    
                    {/* LEFT COLUMN: Art & Player */}
                    <div className="flex flex-col items-center w-full max-w-sm shrink-0">
                        <div className="relative group mb-4 md:mb-8">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#c5a059] to-[#8c6b32] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                            <img 
                                src={song.cover} 
                                alt={song.name} 
                                className="relative w-40 h-40 md:w-80 md:h-80 object-cover rounded-2xl shadow-2xl border border-white/10"
                            />
                        </div>
                        
                        <h1 className="font-serif italic text-2xl md:text-5xl text-center mb-1 md:mb-2 drop-shadow-xl font-bold px-2">{song.name}</h1>
                        <p className="text-[#c5a059] text-[11px] font-black uppercase tracking-[0.5em] mb-4 md:mb-8 text-center">{song.artist}</p>

                        {embedData?.type === 'youtube' && (
                            <YouTubeAudioPlayer videoId={embedData.id!} isJuan={false} />
                        )}
                        
                        {embedData?.type === 'spotify' && (
                            <div className="w-full mb-4 md:mb-8 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 bg-black/40 p-2 backdrop-blur-md">
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
                    <div className="flex flex-col items-center w-full max-w-md">
                        <div className="w-full relative z-20 backdrop-blur-xl bg-white/5 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl">
                            <div className="flex flex-col items-center justify-center mb-4 md:mb-6">
                                <div className="bg-[#c5a059] text-black text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] px-3 md:px-4 py-1.5 md:py-2 rounded-full animate-bounce shadow-[0_0_15px_rgba(197,160,89,0.4)] flex items-center gap-2">
                                    ¡Canción Completa Aquí! <i className="fas fa-arrow-down"></i>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                                <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                                <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                                <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} />
                                <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} />
                                <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
                                <div className="col-span-2">
                                    <PlatformButton platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center w-full border-t border-white/10 pt-8 relative z-20">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">Únete a la Comunidad</h3>
                            <div className="flex justify-center gap-6">
                                <a href="https://instagram.com/diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E1306C] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-instagram text-xl text-white"></i></a>
                                <a href="https://tiktok.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all duration-300"><i className="fab fa-tiktok text-xl text-white"></i></a>
                                <a href="https://youtube.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF0000] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-youtube text-xl text-white"></i></a>
                            </div>
                            <p className="mt-8 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">© {new Date().getFullYear()} {song.artist}. v2.2</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // === TEMA JUAN 614 (Acústico / Norteño / Tierra - Dark Mode) ===
    return (
        <div className="min-h-screen bg-[#1a1412] text-[#e8dcc5] font-['Poppins'] flex flex-col relative overflow-hidden">
            {/* Background Blur basado en portada */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-10 scale-110 blur-2xl saturate-50"
                style={{ backgroundImage: `url(${song.cover})` }}
            ></div>
            {/* Background Texture (Papel/Madera/Ruido) en oscuro */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d3c19e 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-16 px-4 py-6 md:py-20 w-full max-w-5xl mx-auto">
                
                {/* LEFT COLUMN: Art & Player */}
                <div className="flex flex-col items-center w-full max-w-sm shrink-0">
                    <div className="relative mb-4 md:mb-8 group">
                        <img 
                            src={song.cover} 
                            alt={song.name} 
                            className="w-40 h-40 md:w-80 md:h-80 object-cover rounded-2xl shadow-2xl z-10 relative group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Elemento de diseño de fondo */}
                        <div className="absolute -inset-4 border-2 border-[#8B5A2B] opacity-20 transform rotate-3 rounded-2xl group-hover:rotate-6 transition-transform duration-500"></div>
                    </div>
                    
                    <h1 className="font-['Playfair_Display',serif] italic text-2xl md:text-5xl text-center mb-1 md:mb-2 text-[#e8dcc5] font-bold px-2">{song.name}</h1>
                    <p className="text-[#c89d53] text-[10px] font-black uppercase tracking-[0.4em] mb-4 md:mb-8 text-center">{song.artist}</p>

                    {embedData?.type === 'youtube' && (
                        <YouTubeAudioPlayer videoId={embedData.id!} isJuan={true} />
                    )}
                    
                    {embedData?.type === 'spotify' && (
                        <div className="w-full mb-4 md:mb-8 rounded-xl overflow-hidden shadow-xl border border-[#8B5A2B]/20 bg-[#2a221f] p-2 backdrop-blur-md">
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
                <div className="flex flex-col items-center w-full max-w-md">
                    <div className="w-full relative z-20 backdrop-blur-xl bg-[#2a221f]/80 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-[#8B5A2B]/20 shadow-2xl">
                        <div className="flex flex-col items-center justify-center mb-4 md:mb-6">
                            <div className="bg-[#c89d53] text-[#1a1412] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] px-3 md:px-4 py-1.5 md:py-2 rounded-full animate-bounce shadow-[0_0_15px_rgba(200,157,83,0.4)] flex items-center gap-2">
                                ¡Canción Completa Aquí! <i className="fas fa-arrow-down"></i>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <PlatformButton light={false} platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                            <PlatformButton light={false} platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                            <PlatformButton light={false} platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                            <PlatformButton light={false} platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} />
                            <PlatformButton light={false} platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} />
                            <PlatformButton light={false} platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
                            <div className="col-span-2">
                                <PlatformButton light={false} platform="Audiomack" icon="fas fa-music" color="#FFA500" url={getPlatformUrl('Audiomack')} />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center w-full border-t border-[#8B5A2B]/20 pt-8 relative z-20">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#e8dcc5]/50 mb-6">Sígueme en Redes</h3>
                        <div className="flex justify-center gap-6">
                            <a href="https://instagram.com/juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#E1306C] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-instagram text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                            <a href="https://tiktok.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-black hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-tiktok text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                            <a href="https://youtube.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#2a221f] border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#FF0000] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-youtube text-xl text-[#c89d53] group-hover:text-white transition-colors"></i></a>
                        </div>
                        <p className="mt-8 text-[8px] font-bold uppercase tracking-[0.2em] text-[#e8dcc5]/30">© {new Date().getFullYear()} {song.artist}. v2.2</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlatformButton = ({ platform, icon, color, url, light }: { platform: string, icon: string, color: string, url: string, light?: boolean }) => {
    const isDarkBg = platform === 'Tidal' && !light;
    return (
        <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full p-2.5 md:p-4 rounded-2xl flex flex-col items-center justify-center gap-2 md:gap-3 transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-95 ${light ? 'bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200' : (isDarkBg ? 'bg-black border border-white/20 shadow-lg' : 'bg-white/5 border border-white/10 hover:bg-white/10')}`}
        >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner ${light ? 'bg-gray-50' : 'bg-black/20'}`} style={{ color }}>
                <i className={`${icon} text-xl md:text-3xl drop-shadow-md`}></i>
            </div>
            <span className={`font-bold tracking-wide text-[8px] md:text-[10px] uppercase ${light ? 'text-gray-800' : 'text-white'}`}>{platform}</span>
        </a>
    );
};

export default SmartLinkView;
