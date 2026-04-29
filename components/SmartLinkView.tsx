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
        return song.url;
    };

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

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
                    <img 
                        src={song.cover} 
                        alt={song.name} 
                        className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-xl shadow-[0_20px_50px_rgba(197,160,89,0.2)] border border-[#c5a059]/20 mb-10 transform hover:scale-105 transition-transform duration-500"
                    />
                    <h1 className="font-serif italic text-4xl md:text-6xl text-center mb-2 drop-shadow-xl">{song.name}</h1>
                    <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-[0.4em] mb-12 text-center">{song.artist}</p>

                    <div className="w-full max-w-md space-y-4 relative z-20">
                        <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                        <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                        <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                        <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
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
            
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
                <div className="relative mb-12">
                    <img 
                        src={song.cover} 
                        alt={song.name} 
                        className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-md shadow-2xl z-10 relative"
                    />
                    {/* Elemento de diseño de fondo */}
                    <div className="absolute -inset-4 border-2 border-[#8B5A2B] opacity-20 transform rotate-3"></div>
                </div>
                
                <h1 className="font-['Playfair_Display',serif] italic text-4xl md:text-6xl text-center mb-2 text-[#4A3B2C]">{song.name}</h1>
                <p className="text-[#8B5A2B] text-xs font-bold uppercase tracking-[0.3em] mb-12 text-center">{song.artist}</p>

                <div className="w-full max-w-md space-y-4 relative z-20">
                    <PlatformButton light platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={getPlatformUrl('Spotify')} />
                    <PlatformButton light platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={getPlatformUrl('Apple Music')} />
                    <PlatformButton light platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={getPlatformUrl('YouTube')} />
                    <PlatformButton light platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={getPlatformUrl('Deezer')} />
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
    return (
        <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 transform hover:-translate-y-1 ${light ? 'bg-white border border-gray-200 shadow-md hover:shadow-xl' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
        >
            <div className="flex items-center gap-4">
                <i className={`${icon} text-2xl`} style={{ color }}></i>
                <span className={`font-bold ${light ? 'text-gray-800' : 'text-white'}`}>{platform}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${light ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-white/50'}`}>Escuchar</span>
        </a>
    );
};

export default SmartLinkView;
