import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getCorsFriendlyUrl } from "../../services/imageHelpers";

const Top5SocialGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [topSongs, setTopSongs] = useState<MusicItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [subtitle, setSubtitle] = useState("DE LA SEMANA");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadCatalog = async () => {
            setIsLoading(true);
            try {
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                const fullCatalog = [...dM, ...j6];
                setCatalog(fullCatalog);
                
                // Empezar con vacío para que el usuario seleccione, o precargar las últimas 5 como sugerencia
                if (fullCatalog.length > 0) {
                    const sorted = [...fullCatalog].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
                    setTopSongs(sorted.slice(0, 5));
                }
            } catch (err) {
                console.error("Error loading catalog:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, []);

    const handleAutoFill = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/sheet-proxy?script=analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getAnalytics' })
            });
            if (res.ok) {
                const json = await res.json();
                if (json?.data?.topSongs?.length > 0) {
                    const newTop: MusicItem[] = [];
                    // Intentar buscar los top 5 reales (hasta llenar 5)
                    for (const stat of json.data.topSongs) {
                        if (newTop.length >= 5) break;
                        const match = catalog.find(c => c.name.toLowerCase() === stat.title.toLowerCase() || (c.name.toLowerCase().includes(stat.title.toLowerCase())));
                        if (match && !newTop.find(s => s.id === match.id)) {
                            newTop.push(match);
                        }
                    }
                    if (newTop.length > 0) {
                        setTopSongs(newTop);
                    } else {
                        alert("No se encontraron coincidencias en el catálogo.");
                    }
                } else {
                    alert("No hay suficientes datos en las analíticas aún.");
                }
            }
        } catch(e) {
            console.error(e);
            alert("Error al obtener las analíticas reales.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCatalog = catalog.filter(song => 
        song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);

    const handleSelectSong = (song: MusicItem) => {
        if (topSongs.length >= 5) {
            alert("Ya tienes 5 canciones en el Top. Elimina una primero.");
            return;
        }
        if (topSongs.find(s => s.id === song.id)) {
            alert("Esta canción ya está en el Top.");
            return;
        }
        setTopSongs([...topSongs, song]);
        setSearchQuery("");
        setIsSearchOpen(false);
    };

    const handleRemoveSong = (id: string) => {
        setTopSongs(topSongs.filter(s => s.id !== id));
    };

    const moveSong = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newSongs = [...topSongs];
            [newSongs[index - 1], newSongs[index]] = [newSongs[index], newSongs[index - 1]];
            setTopSongs(newSongs);
        } else if (direction === 'down' && index < topSongs.length - 1) {
            const newSongs = [...topSongs];
            [newSongs[index + 1], newSongs[index]] = [newSongs[index], newSongs[index + 1]];
            setTopSongs(newSongs);
        }
    };

    const handleDownload = async () => {
        if (!captureRef.current) return;
        setIsGenerating(true);
        try {
            // Pre-load images to avoid html2canvas issues
            const images = Array.from(captureRef.current.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            // Esperar un momento para que las fuentes e imágenes se rendericen
            await new Promise(r => setTimeout(r, 1000));
            
            // Fix cutoff issue and CSS scale
            window.scrollTo(0, 0);
            if (containerRef.current) {
                containerRef.current.style.transform = 'scale(1)';
                containerRef.current.style.marginBottom = '0px';
            }

            const canvas = await html2canvas(captureRef.current, {
                scale: 2, // High resolution
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#000000',
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1080,
                windowHeight: 1350,
                onclone: (clonedDoc) => {
                    const captureEl = clonedDoc.querySelector('div[style*="1080px"]') as HTMLElement;
                    if (captureEl) {
                        captureEl.style.transform = 'none';
                    }
                }
            });
            
            // Restore styles
            if (containerRef.current) {
                containerRef.current.style.transform = '';
                containerRef.current.style.marginBottom = '';
            }

            const url = canvas.toDataURL("image/png", 1.0);
            const link = document.createElement("a");
            link.download = `TOP-5-SONGS-${new Date().getTime()}.png`;
            link.href = url;
            link.click();
        } catch (e) {
            console.error("Error generating image:", e);
            alert("Hubo un error al generar la imagen.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Social icons SVGs safely embedded
    const spotifySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="#1DB954"><path d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8zm100.7 364.9c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4zm26.9-65.6c-5.2 0-8.7-2.3-12.3-4.2-72.5-47-152.2-56.6-231.5-38.2-10.6 2.6-15.8 1-19.4-7.4-3.9-9.4-1.3-16.8 8.1-19.4 90.7-21.7 182.2-10 264.6 43.4 5.2 3.2 8.7 8.1 8.7 16.5-.3 10.3-8.1 9.3-18.1 9.3zm-3.6-70.3C293 189 193 180 117.8 203.2c-12 3.6-20.7-1-24.5-11.9-3.9-11 1.3-19.4 12-23 88.4-27.1 200.7-16.8 290 41.1 11.3 7.4 14.2 15.8 11.3 25.5-2.6 11-13.3 14.5-24.5 9.7z"/></svg>`;
    const youtubeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="#FF0000"><path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"/></svg>`;
    const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="#FFFFFF"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>`;

    return (
        <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins'] pb-20">
            {/* APP HEADER */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">TOP 5 <span className="text-[#c5a059]">CUSTOM MAKER</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* CONTROLS */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#c5a059] mb-4">Configurar Top 5</h2>
                        
                        <div className="space-y-6">
                            {/* Subtitle Input */}
                            <div className="space-y-2">
                                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Subtítulo (Ej: De la semana)</label>
                                <input 
                                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-sm font-bold uppercase transition-all"
                                    value={subtitle} 
                                    onChange={(e)=>setSubtitle(e.target.value.toUpperCase())} 
                                />
                            </div>

                            <button 
                                onClick={handleAutoFill}
                                disabled={isLoading || catalog.length === 0}
                                className="w-full py-3 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-xl text-[10px] font-bold text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-colors flex items-center justify-center gap-2"
                            >
                                <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i> Autocompletar con Visitas Reales (Google Analytics)
                            </button>

                            {/* Song Search */}
                            <div className="relative">
                                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest mb-2 block">Agregar Canción ({topSongs.length}/5)</label>
                                <div className="absolute inset-y-0 left-4 top-6 flex items-center pointer-events-none text-[#c5a059]/40 mt-1">
                                    <i className="fas fa-search text-xs"></i>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="BUSCAR EN CATÁLOGO..."
                                    className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest transition-all"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setIsSearchOpen(e.target.value.length > 0);
                                    }}
                                    onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                                    disabled={topSongs.length >= 5}
                                />
                                
                                {isSearchOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl animate-fade-in max-h-60 overflow-y-auto">
                                        {filteredCatalog.length > 0 ? (
                                            filteredCatalog.map((song) => (
                                                <button
                                                    key={song.id}
                                                    onClick={() => handleSelectSong(song)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left"
                                                >
                                                    <img src={song.cover} className="w-10 h-10 rounded-lg object-cover bg-black" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black text-white/90 truncate uppercase tracking-widest">{song.name}</div>
                                                        <div className="text-[8px] font-bold text-[#c5a059] truncate uppercase tracking-widest">{song.artist}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">No se encontraron temas</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Songs List */}
                            <div className="space-y-3 mt-4">
                                {topSongs.map((song, index) => (
                                    <div key={song.id} className="flex items-center gap-3 bg-black/30 border border-white/5 p-3 rounded-xl">
                                        <div className="text-xs font-black text-[#c5a059] w-4 text-center">{index + 1}</div>
                                        <img src={song.cover} alt="Cover" className="w-10 h-10 rounded object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-white truncate uppercase">{song.name}</p>
                                            <p className="text-[8px] text-white/50 truncate uppercase">{song.artist}</p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => moveSong(index, 'up')} disabled={index === 0} className="text-white/30 hover:text-white disabled:opacity-30"><i className="fas fa-chevron-up text-[10px]"></i></button>
                                            <button onClick={() => moveSong(index, 'down')} disabled={index === topSongs.length - 1} className="text-white/30 hover:text-white disabled:opacity-30"><i className="fas fa-chevron-down text-[10px]"></i></button>
                                        </div>
                                        <button onClick={() => handleRemoveSong(song.id)} className="w-8 h-8 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10 ml-2">
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleDownload}
                                disabled={isLoading || isGenerating || topSongs.length === 0}
                                className="w-full mt-6 py-5 bg-[#c5a059] text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                                ) : (
                                    <><i className="fas fa-download"></i> Descargar Imagen HD</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="lg:col-span-7 flex justify-center items-start">
                    {/* Contenedor que será capturado */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ width: '1080px', maxWidth: '100%', aspectRatio: '4/5', transformOrigin: 'top center' }} ref={containerRef}>
                        <div 
                            ref={captureRef}
                            className="absolute inset-0 bg-[#020202] flex flex-col items-center justify-between py-12 px-16 overflow-hidden"
                            style={{ width: '1080px', height: '1350px', transform: 'scale(1)', transformOrigin: 'top left' }}
                        >
                            {/* Background decoration */}
                            {topSongs[0] && (
                                <div 
                                    className="absolute inset-0 opacity-20 blur-3xl scale-110" 
                                    style={{ backgroundImage: `url(${getCorsFriendlyUrl(topSongs[0].cover)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95"></div>
                            
                            <div className="relative z-10 w-full flex flex-col items-center flex-1">
                                {/* Header */}
                                <div className="text-center mb-10">
                                    <h1 className="text-[140px] font-serif italic text-white leading-[1] tracking-tighter drop-shadow-2xl">
                                        TOP <span className="text-[#c5a059]">5</span>
                                    </h1>
                                    {subtitle && (
                                        <p className="text-4xl font-black uppercase tracking-[0.4em] text-white/70 mt-6 bg-[#c5a059]/10 py-3 px-8 rounded-full border border-[#c5a059]/30 inline-block backdrop-blur-md">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>

                                {/* List */}
                                <div className="w-full max-w-4xl space-y-5 flex-1 flex flex-col justify-center mb-8">
                                    {topSongs.map((song, index) => (
                                        <div key={song.id} className="flex items-center gap-8 bg-gradient-to-r from-white/10 to-transparent backdrop-blur-md p-5 rounded-3xl border-l-4 border-[#c5a059] shadow-2xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-black/60 to-transparent pointer-events-none"></div>
                                            <div className="text-6xl font-serif italic text-[#c5a059] w-16 text-center drop-shadow-lg opacity-90 shrink-0">
                                                {index + 1}
                                            </div>
                                            <img src={getCorsFriendlyUrl(song.cover)} alt={song.name} crossOrigin="anonymous" className="w-28 h-28 shrink-0 rounded-2xl object-cover shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10" />
                                            <div className="flex-1 z-10 min-w-0">
                                                <h3 className="text-[34px] font-bold text-white mb-1 uppercase tracking-wide truncate">{song.name}</h3>
                                                <p className="text-[20px] font-medium text-[#c5a059] uppercase tracking-widest truncate">{song.artist}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Footer */}
                                <div className="w-full mt-auto flex flex-col items-center">
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-10"></div>
                                    
                                    <div className="flex items-center justify-between w-full max-w-4xl px-8">
                                        <div className="flex items-center gap-5 opacity-80">
                                            <img src="/logo-diosmasgym.png" crossOrigin="anonymous" className="w-[70px] h-[70px] grayscale brightness-200" alt="Logo" />
                                            <div className="text-left">
                                                <span className="text-2xl font-black uppercase tracking-[0.4em] text-white block leading-tight">DIOSMASGYM</span>
                                                <span className="text-sm font-bold uppercase tracking-[0.6em] text-[#c5a059] block">Network</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10 opacity-70">
                                            <span className="text-lg font-bold tracking-[0.3em] uppercase text-white/50 mr-2">ESCUCHA EN</span>
                                            <div className="w-10 h-10" dangerouslySetInnerHTML={{__html: spotifySvg}} />
                                            <div className="w-12 h-10" dangerouslySetInnerHTML={{__html: youtubeSvg}} />
                                            <div className="w-9 h-10" dangerouslySetInnerHTML={{__html: appleSvg}} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CSS to scale preview down correctly on smaller screens */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 1080px) {
                    .lg\\:col-span-7 > div {
                        transform: scale(0.4);
                        transform-origin: top;
                        margin-bottom: -800px;
                    }
                }
                @media (min-width: 768px) and (max-width: 1080px) {
                    .lg\\:col-span-7 > div {
                        transform: scale(0.5);
                        margin-bottom: -600px;
                    }
                }
            `}} />
        </div>
    );
};

export default Top5SocialGenerator;
