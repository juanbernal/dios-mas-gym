import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

const Top5SocialGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [topSongs, setTopSongs] = useState<MusicItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
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
                
                // Seleccionar 5 canciones (podemos usar las más recientes como Top 5)
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

    const handleRandomize = () => {
        if (catalog.length > 5) {
            const shuffled = [...catalog].sort(() => 0.5 - Math.random());
            setTopSongs(shuffled.slice(0, 5));
        }
    };

    const handleDownload = async () => {
        if (!captureRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(captureRef.current, {
                scale: 2, // High resolution
                useCORS: true,
                backgroundColor: '#000000',
            });
            const url = canvas.toDataURL("image/png");
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

    return (
        <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins']">
            {/* APP HEADER */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Centro de Control
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">TOP 5 <span className="text-[#c5a059]">GENERATOR</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* CONTROLS */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 shadow-2xl">
                        <h2 className="text-xs font-black uppercase tracking-widest text-[#c5a059] mb-4">Controles</h2>
                        <p className="text-white/40 text-[10px] mb-6 leading-relaxed">
                            Genera una imagen impactante con el Top 5 de canciones más escuchadas (o seleccionadas) para compartir en redes sociales.
                        </p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={handleRandomize}
                                disabled={isLoading || catalog.length < 5}
                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-random text-[#c5a059]"></i> Mezclar Canciones
                            </button>

                            <button 
                                onClick={handleDownload}
                                disabled={isLoading || isGenerating || topSongs.length === 0}
                                className="w-full py-4 bg-[#c5a059] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                                ) : (
                                    <><i className="fas fa-download"></i> Descargar Imagen</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PREVIEW */}
                <div className="lg:col-span-8 flex justify-center items-start">
                    {/* Contenedor que será capturado */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ width: '1080px', maxWidth: '100%', aspectRatio: '4/5', transformOrigin: 'top center' }} ref={containerRef}>
                        <div 
                            ref={captureRef}
                            className="absolute inset-0 bg-black flex flex-col items-center justify-center p-12 overflow-hidden"
                            style={{ width: '1080px', height: '1350px', transform: 'scale(1)', transformOrigin: 'top left' }}
                        >
                            {/* Background decoration */}
                            {topSongs[0] && (
                                <div 
                                    className="absolute inset-0 opacity-30 blur-3xl scale-110" 
                                    style={{ backgroundImage: `url(${topSongs[0].cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                            
                            <div className="relative z-10 w-full flex flex-col items-center">
                                {/* Header */}
                                <div className="text-center mb-16">
                                    <h1 className="text-[120px] font-serif italic text-white leading-none tracking-tighter drop-shadow-2xl">
                                        TOP <span className="text-[#c5a059]">5</span>
                                    </h1>
                                    <p className="text-3xl font-black uppercase tracking-[0.5em] text-white/60 mt-2">
                                        Más Escuchadas
                                    </p>
                                </div>

                                {/* List */}
                                <div className="w-full max-w-3xl space-y-8">
                                    {topSongs.map((song, index) => (
                                        <div key={song.id} className="flex items-center gap-8 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
                                            <div className="text-5xl font-serif italic text-[#c5a059] w-12 text-center drop-shadow-lg">
                                                {index + 1}
                                            </div>
                                            <img src={song.cover} alt={song.name} crossOrigin="anonymous" className="w-32 h-32 rounded-2xl object-cover shadow-lg border border-white/5" />
                                            <div className="flex-1">
                                                <h3 className="text-4xl font-bold text-white mb-2 uppercase tracking-wide truncate">{song.name}</h3>
                                                <p className="text-2xl font-semibold text-white/50 uppercase tracking-widest">{song.artist}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Footer */}
                                <div className="mt-20 flex items-center justify-center gap-4 opacity-50">
                                    <img src="/logo-diosmasgym.png" className="w-16 h-16 grayscale" alt="Logo" />
                                    <span className="text-xl font-black uppercase tracking-[0.4em] text-white">Diosmasgym</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CSS to scale preview down correctly on smaller screens */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 1080px) {
                    .lg\\:col-span-8 > div {
                        transform: scale(0.4);
                        transform-origin: top;
                        margin-bottom: -800px;
                    }
                }
                @media (min-width: 768px) and (max-width: 1080px) {
                    .lg\\:col-span-8 > div {
                        transform: scale(0.6);
                        margin-bottom: -500px;
                    }
                }
            `}} />
        </div>
    );
};

export default Top5SocialGenerator;
