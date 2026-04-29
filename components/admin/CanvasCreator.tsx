import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

type FilterType = 'none' | 'vhs' | 'gold-dust' | 'dark-vignette' | 'neon-glow';

const CanvasCreator: React.FC = () => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLDivElement>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [songTitle, setSongTitle] = useState('');
    const [artist, setArtist] = useState<'diosmasgym' | 'juan614'>('diosmasgym');
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [phrase, setPhrase] = useState('');
    const [filter, setFilter] = useState<FilterType>('none');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const loadCatalog = async () => {
            setIsLoading(true);
            try {
                const data = await fetchMusicCatalog(artist);
                setCatalog(data);
                if (data.length > 0) {
                    setSongTitle(data[0].name);
                    setCoverImage(data[0].cover);
                } else {
                    setSongTitle('');
                    setCoverImage(null);
                }
            } catch (error) {
                console.error("Error fetching catalog", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, [artist]);

    const handleSongSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const songName = e.target.value;
        const selected = catalog.find(s => s.name === songName);
        if (selected) {
            setSongTitle(selected.name);
            setCoverImage(selected.cover);
        }
    };



    const handleExport = async () => {
        if (!canvasRef.current) return;
        
        try {
            setIsExporting(true);
            
            const canvas = await html2canvas(canvasRef.current, {
            scale: 4, // Resolución ultra alta (4x)
            useCORS: true,
            allowTaint: true,
            backgroundColor: null // Fondo transparente para que use el contenedor real
        });

            // Descargar imagen
            const link = document.createElement('a');
            link.download = `SpotifyCanvas_${songTitle || 'Master'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 1.0); // Calidad máxima 100%
            link.click();
            
        } catch (error) {
            console.error('Error exportando canvas:', error);
            alert("Error al exportar. Intenta con una imagen más ligera.");
        } finally {
            setIsExporting(false);
        }
    };

    // Estilos de los filtros
    const getFilterStyle = () => {
        switch (filter) {
            case 'vhs':
                return 'contrast(1.2) saturate(1.5) hue-rotate(5deg)';
            case 'gold-dust':
                return 'sepia(0.3) contrast(1.1) brightness(0.9)';
            case 'dark-vignette':
                return 'brightness(0.7) contrast(1.2)';
            case 'neon-glow':
                return 'saturate(2) contrast(1.3) brightness(0.8)';
            default:
                return 'none';
        }
    };

    const filterOverlays = {
        'none': null,
        'vhs': (
            <div className="absolute inset-0 pointer-events-none z-20 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }}></div>
        ),
        'gold-dust': (
            <div className="absolute inset-0 pointer-events-none z-20 opacity-30 mix-blend-color-dodge bg-[#c5a059]" style={{ backgroundImage: 'radial-gradient(circle, transparent 20%, #000 100%)' }}></div>
        ),
        'dark-vignette': (
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)]"></div>
        ),
        'neon-glow': (
            <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-t from-[#c5a059]/30 to-transparent mix-blend-screen"></div>
        )
    };

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white font-['Poppins'] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#1DB954] hover:text-white transition-all bg-[#1DB954]/10 px-4 py-2 rounded-full border border-[#1DB954]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Spotify <span className="text-[#c5a059]">Canvas</span> <span className="text-white/20 ml-2">v1.3</span></h1>
                </div>
                <button onClick={handleExport} disabled={isExporting || !coverImage} className={`bg-[#1DB954] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isExporting || !coverImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}>
                    <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`}></i> 
                    {isExporting ? 'Renderizando...' : 'Descargar Master'}
                </button>
            </div>

            <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controles */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h2 className="text-[#1DB954] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">1. Identidad</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Artista</label>
                                    <select 
                                        value={artist} 
                                        onChange={(e) => setArtist(e.target.value as any)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#1DB954]"
                                    >
                                        <option value="diosmasgym">Diosmasgym</option>
                                        <option value="juan614">Juan 614</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Canción (Autocompletado)</label>
                                    <select 
                                        value={songTitle} 
                                        onChange={handleSongSelect}
                                        disabled={isLoading || catalog.length === 0}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#1DB954]"
                                    >
                                        {isLoading ? (
                                            <option>Cargando catálogo...</option>
                                        ) : catalog.length === 0 ? (
                                            <option>No hay canciones disponibles</option>
                                        ) : (
                                            catalog.map(song => (
                                                <option key={song.id} value={song.name}>{song.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Frase Viral (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={phrase} 
                                        onChange={(e) => setPhrase(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#1DB954]"
                                        placeholder="Ej. Para esos días difíciles..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h2 className="text-[#1DB954] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">2. Color Grading & Efectos</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setFilter('none')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'none' ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]' : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'}`}>Original</button>
                            <button onClick={() => setFilter('dark-vignette')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'dark-vignette' ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]' : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'}`}>Dark Cinema</button>
                            <button onClick={() => setFilter('gold-dust')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'gold-dust' ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]' : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'}`}>Gold Dust</button>
                            <button onClick={() => setFilter('vhs')} className={`p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'vhs' ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]' : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'}`}>Retro VHS</button>
                            <button onClick={() => setFilter('neon-glow')} className={`col-span-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'neon-glow' ? 'bg-[#1DB954]/20 border-[#1DB954] text-[#1DB954]' : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30'}`}>Neon Glow</button>
                        </div>
                    </div>

                    <div className="bg-[#1DB954]/10 rounded-2xl p-6 border border-[#1DB954]/20 text-center">
                        <i className="fab fa-spotify text-3xl text-[#1DB954] mb-4"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1DB954]">Especificaciones Spotify</p>
                        <p className="text-xs text-white/50 mt-2 leading-relaxed">Se generará una imagen maestra en resolución 1080x1920 (9:16). Para usarla en Spotify, súbela a CapCut, añade un efecto de "Zoom Lento" de 8 segundos y expórtala como video MP4.</p>
                    </div>
                </div>

                {/* Lienzo de previsualización 9:16 */}
                <div className="lg:col-span-7 flex justify-center">
                    <div className="relative w-[360px] h-[640px] shadow-[0_0_50px_rgba(29,185,84,0.1)] rounded-sm overflow-hidden flex-shrink-0 bg-[#05070a] ring-1 ring-white/10">
                        {/* Indicadores de UI de Spotify falsos (solo para preview visual, NO se exportarán) */}
                        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 opacity-50">
                            <div className="flex justify-between items-center text-xs">
                                <i className="fas fa-chevron-down"></i>
                                <span className="font-bold text-[9px] uppercase tracking-widest">{artist === 'diosmasgym' ? 'DIOSMASGYM' : 'JUAN 614'}</span>
                                <i className="fas fa-ellipsis-v"></i>
                            </div>
                            <div className="flex justify-between items-end pb-8">
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">{songTitle || 'Título'}</h4>
                                    <p className="text-[10px] opacity-80">{artist === 'diosmasgym' ? 'DIOSMASGYM' : 'JUAN 614'}</p>
                                </div>
                                <div className="flex flex-col gap-4 text-xl">
                                    <i className="far fa-heart"></i>
                                    <i className="fas fa-share-alt"></i>
                                </div>
                            </div>
                        </div>

                        {/* ESTE ES EL CANVAS REAL QUE SE EXPORTA */}
                        <div 
                                    ref={canvasRef}
                                    className="relative w-full aspect-[9/16] bg-[#111111] overflow-hidden rounded-lg"
                                >
                            {coverImage ? (
                                <>
                                    {/* Fondo ultra difuminado (más claro) */}
                                    <img 
                                        src={coverImage}
                                        className="absolute inset-0 w-full h-full object-cover scale-125 blur-xl opacity-70"
                                        style={{ filter: getFilterStyle() }}
                                        crossOrigin="anonymous"
                                        alt=""
                                    />
                                    
                                    {/* Capa de oscurecimiento muy leve para legibilidad */}
                                    <div className="absolute inset-0 bg-black/20 z-[5]"></div>

                                    {/* Sombra suave interna (menos oscura) */}
                                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] z-10 pointer-events-none"></div>

                                    {/* Capa de Efectos/Overlays */}
                                    {filterOverlays[filter]}

                                    {/* Elemento Central (Portada o Textos) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
                                        <img 
                                            src={coverImage} 
                                            alt="Cover" 
                                            className="w-full aspect-square object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm mb-12"
                                            style={{ filter: getFilterStyle() }}
                                            crossOrigin="anonymous"
                                        />
                                        
                                        {(songTitle || phrase) && (
                                            <div className="text-center w-full">
                                                {phrase && <p className="text-white/80 text-xs italic font-serif mb-4 px-4 leading-relaxed">"{phrase}"</p>}
                                                {songTitle && <h1 className="font-serif italic text-4xl mb-2 drop-shadow-xl text-white">{songTitle}</h1>}
                                                <p className="text-[#c5a059] text-[9px] font-black uppercase tracking-[0.4em] drop-shadow-md">{artist === 'diosmasgym' ? 'DIOSMASGYM' : 'JUAN 614'}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Viñeta base sutil en los bordes para mejorar legibilidad */}
                                    <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] pointer-events-none z-10"></div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/20 flex-col">
                                    <i className="fas fa-film text-4xl mb-4"></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sube una portada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CanvasCreator;
