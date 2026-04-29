import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../services/musicService';
import { MusicItem } from '../types';

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
        if (platform === 'SoundCloud') {
            if (urlStr.includes('soundcloud.com')) return song.url;
            return `https://soundcloud.com/search?q=${query}`;
        }
        if (platform === 'Pandora') {
            if (urlStr.includes('pandora.com')) return song.url;
            return `https://www.pandora.com/search/${query}/all`;
        }
        return song.url;
    };

    // Helper to get embed URL for 1-minute preview
    const getEmbedUrl = () => {
        const urlStr = song.url;
        if (urlStr.includes('youtube.com') || urlStr.includes('youtu.be')) {
            const videoId = urlStr.includes('youtu.be') ? urlStr.split('/').pop() : new URLSearchParams(new URL(urlStr).search).get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}?end=60&controls=1&rel=0`;
        }
        if (urlStr.includes('spotify.com/track')) {
            const trackId = urlStr.split('track/')[1]?.split('?')[0];
            if (trackId) return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
        }
        return null;
    };

    const embedUrl = getEmbedUrl();

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

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 w-full max-w-2xl mx-auto">
                    <div className="relative group mb-8">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#c5a059] to-[#8c6b32] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                        <img 
                            src={song.cover} 
                            alt={song.name} 
                            className="relative w-56 h-56 md:w-72 md:h-72 object-cover rounded-2xl shadow-2xl border border-white/10"
                        />
                    </div>
                    
                    <h1 className="font-serif italic text-3xl md:text-5xl text-center mb-2 drop-shadow-xl font-bold">{song.name}</h1>
                    <p className="text-[#c5a059] text-[11px] font-black uppercase tracking-[0.5em] mb-8 text-center">{song.artist}</p>

                    {embedUrl && (
                        <div className="w-full max-w-md mb-8 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 bg-black/40 p-2 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3 px-2 pt-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    Previa (60 Segundos)
                                </span>
                                <span className="text-[8px] uppercase tracking-widest text-white/40">Escucha un fragmento</span>
                            </div>
                            <iframe 
                                src={embedUrl} 
                                width="100%" 
                                height={embedUrl.includes('spotify') ? '80' : '200'} 
                                frameBorder="0" 
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                loading="lazy"
                                className="rounded-lg"
                            ></iframe>
                        </div>
                    )}

                    <div className="w-full max-w-md space-y-3 relative z-20 backdrop-blur-xl bg-white/5 p-4 md:p-6 rounded-3xl border border-white/10 shadow-2xl">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 text-center mb-6">Escuchar Completa En</h3>
                        <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                        <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                        <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                        <PlatformButton platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} />
                        <PlatformButton platform="Tidal" icon="fas fa-water" color="#000000" url={getPlatformUrl('Tidal')} light={true} />
                        <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
                        <PlatformButton platform="SoundCloud" icon="fab fa-soundcloud" color="#FF5500" url={getPlatformUrl('SoundCloud')} />
                    </div>

                    <div className="mt-16 text-center w-full max-w-md border-t border-white/10 pt-8 relative z-20">
                        <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-6">Únete a la Comunidad</h3>
                        <div className="flex justify-center gap-6">
                            <a href="https://instagram.com/diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E1306C] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-instagram text-xl text-white"></i></a>
                            <a href="https://tiktok.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black hover:scale-110 transition-all duration-300"><i className="fab fa-tiktok text-xl text-white"></i></a>
                            <a href="https://youtube.com/@diosmasgym" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF0000] hover:border-transparent hover:scale-110 transition-all duration-300"><i className="fab fa-youtube text-xl text-white"></i></a>
                        </div>
                        <p className="mt-10 text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">© {new Date().getFullYear()} {song.artist}. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        );
    }

    // === TEMA JUAN 614 (Acústico / Norteño / Tierra) ===
    return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#2c2c2c] font-['Poppins'] flex flex-col relative overflow-hidden">
            {/* Background Texture (Papel/Madera/Ruido) */}
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#d3c19e 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 w-full max-w-2xl mx-auto">
                <div className="relative mb-8 group">
                    <img 
                        src={song.cover} 
                        alt={song.name} 
                        className="w-56 h-56 md:w-72 md:h-72 object-cover rounded-2xl shadow-2xl z-10 relative group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Elemento de diseño de fondo */}
                    <div className="absolute -inset-4 border-2 border-[#8B5A2B] opacity-20 transform rotate-3 rounded-2xl group-hover:rotate-6 transition-transform duration-500"></div>
                </div>
                
                <h1 className="font-['Playfair_Display',serif] italic text-3xl md:text-5xl text-center mb-2 text-[#4A3B2C] font-bold">{song.name}</h1>
                <p className="text-[#8B5A2B] text-[10px] font-black uppercase tracking-[0.4em] mb-8 text-center">{song.artist}</p>

                {embedUrl && (
                    <div className="w-full max-w-md mb-8 rounded-xl overflow-hidden shadow-xl border border-[#8B5A2B]/10 bg-white/80 p-2 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-3 px-2 pt-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#8B5A2B] flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                Previa (60 Segundos)
                            </span>
                            <span className="text-[8px] uppercase tracking-widest text-[#8B5A2B]/50">Escucha un fragmento</span>
                        </div>
                        <iframe 
                            src={embedUrl} 
                            width="100%" 
                            height={embedUrl.includes('spotify') ? '80' : '200'} 
                            frameBorder="0" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                            className="rounded-lg"
                        ></iframe>
                    </div>
                )}

                <div className="w-full max-w-md space-y-3 relative z-20 backdrop-blur-xl bg-white/60 p-4 md:p-6 rounded-3xl border border-[#8B5A2B]/10 shadow-xl">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#8B5A2B]/50 text-center mb-6">Escuchar Completa En</h3>
                    <PlatformButton light platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                    <PlatformButton light platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                    <PlatformButton light platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                    <PlatformButton light platform="Amazon Music" icon="fab fa-amazon" color="#00A8E1" url={getPlatformUrl('Amazon Music')} />
                    <PlatformButton platform="Tidal" icon="fas fa-water" color="#ffffff" url={getPlatformUrl('Tidal')} />
                    <PlatformButton light platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
                    <PlatformButton light platform="SoundCloud" icon="fab fa-soundcloud" color="#FF5500" url={getPlatformUrl('SoundCloud')} />
                </div>

                <div className="mt-16 text-center w-full max-w-md border-t border-[#8B5A2B]/20 pt-8 relative z-20">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#8B5A2B]/70 mb-6">Sígueme en Redes</h3>
                    <div className="flex justify-center gap-6">
                        <a href="https://instagram.com/juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#E1306C] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-instagram text-xl text-[#8B5A2B] group-hover:text-white transition-colors"></i></a>
                        <a href="https://tiktok.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-black hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-tiktok text-xl text-[#8B5A2B] group-hover:text-white transition-colors"></i></a>
                        <a href="https://youtube.com/@juan614" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-white border border-[#8B5A2B]/20 shadow-sm flex items-center justify-center hover:bg-[#FF0000] hover:text-white hover:border-transparent hover:scale-110 transition-all duration-300 group"><i className="fab fa-youtube text-xl text-[#8B5A2B] group-hover:text-white transition-colors"></i></a>
                    </div>
                    <p className="mt-10 text-[8px] font-bold uppercase tracking-[0.2em] text-[#8B5A2B]/50">© {new Date().getFullYear()} {song.artist}. Todos los derechos reservados.</p>
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
            className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] active:scale-95 ${light ? 'bg-white border border-gray-100 shadow-sm hover:shadow-xl' : (isDarkBg ? 'bg-black border border-white/20 shadow-lg' : 'bg-white/5 border border-white/10 hover:bg-white/10')}`}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5" style={{ color }}>
                    <i className={`${icon} text-2xl`}></i>
                </div>
                <span className={`font-bold tracking-wide ${light ? 'text-gray-800' : 'text-white'}`}>{platform}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 ${light ? 'bg-gray-100 text-gray-600 group-hover:bg-[#c5a059] group-hover:text-white transition-colors' : 'bg-white/10 text-white/70 hover:bg-white hover:text-black transition-colors'}`}>
                <i className="fas fa-play text-[8px]"></i> Play
            </span>
        </a>
    );
};

export default SmartLinkView;
