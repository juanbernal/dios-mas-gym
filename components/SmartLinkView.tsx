import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../services/musicService';
import { MusicItem } from '../types';

const SmartLinkView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [song, setSong] = useState<MusicItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSong = async () => {
            try {
                // Buscamos en ambos catálogos
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                const fullCatalog = [...dM, ...j6];
                const found = fullCatalog.find(s => s.id === id);
                if (found) {
                    setSong(found);
                    // Actualizar Meta Tags dinámicamente
                    document.title = `${found.name} - ${found.artist}`;
                } else {
                    // Si no se encuentra, redirigir a inicio
                    navigate('/');
                }
            } catch (err) {
                console.error("Error cargando el smart link:", err);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        if (id) loadSong();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full"></div>
            </div>
        );
    }

    if (!song) return null;

    const isJuan = song.artist.toLowerCase().includes('juan');

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

                    <div className="w-full max-w-md space-y-4">
                        <PlatformButton platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={song.url} />
                        <PlatformButton platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={song.url} />
                        <PlatformButton platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={song.url} />
                        <PlatformButton platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={song.url} />
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

                <div className="w-full max-w-md space-y-4">
                    <PlatformButton light platform="Spotify" icon="fab fa-spotify" color="#1DB954" url={song.url} />
                    <PlatformButton light platform="Apple Music" icon="fab fa-apple" color="#FA243C" url={song.url} />
                    <PlatformButton light platform="YouTube" icon="fab fa-youtube" color="#FF0000" url={song.url} />
                    <PlatformButton light platform="Deezer" icon="fab fa-deezer" color="#FEAA2D" url={song.url} />
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
