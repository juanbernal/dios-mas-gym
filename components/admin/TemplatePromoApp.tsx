import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";

// Dimensiones estándar para la previsualización y exportación
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1080;

const TemplatePromoApp: React.FC = () => {
    const navigate = useNavigate();
    
    // Estados de los campos
    const [title, setTitle] = useState("TÍTULO DEL TEMA");
    const [phrase, setPhrase] = useState("Una frase que inspire valentía y fe en cada paso de tu camino.");
    const [date, setDate] = useState("ESTRENO 5 DE ABRIL");
    const [artist, setArtist] = useState("DIOSMASGYM");
    
    // Estados de las imágenes
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    
    // Ajustes de la portada (Cover)
    const [coverSize, setCoverSize] = useState(55); // Porcentaje
    const [coverX, setCoverX] = useState(50); // Porcentaje
    const [coverY, setCoverY] = useState(48); // Porcentaje
    
    // Opciones de estilo de texto
    const [theme, setTheme] = useState("urbano"); // 'urbano' | 'acustico'
    const [isGenerating, setIsGenerating] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const masterRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Ajustar escala visual
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const targetWidth = EXPORT_WIDTH;
                // Dejamos un margen
                setScale(Math.min(containerWidth / targetWidth, 1));
            }
        };
        
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setter(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const captureEl = masterRef.current;
            if (!captureEl) throw new Error("Elemento no encontrado");

            // Forzar fuentes antes de renderizar
            if (typeof document !== 'undefined') {
                await document.fonts.ready;
            }

            const canvas = await html2canvas(captureEl, {
                scale: 2, // Alta calidad
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#000000',
                logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('promo-master');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.boxShadow = 'none';
                    }
                }
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
            if (!blob) throw new Error("Error al generar imagen");

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = `PLANTILLA-${title.replace(/\s+/g, '-')}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al generar la imagen.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Temas visuales de texto (Coordenadas y estilos CSS)
    const renderTexts = () => {
        if (theme === 'urbano') {
            return (
                <>
                    {/* FECHA */}
                    <div className="absolute top-[35%] right-[5%] max-w-[250px] text-right transform rotate-2">
                        <div className="font-['Bebas_Neue'] text-5xl text-[#c5a059] leading-none drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-wider">
                            {date.split(' ').map((word, i) => (
                                <span key={i} className={i === 1 || i === 3 ? "text-white" : ""}>{word} </span>
                            ))}
                        </div>
                    </div>

                    {/* TÍTULO PRINCIPAL */}
                    <div className="absolute bottom-[20%] left-0 right-0 text-center z-20 flex flex-col items-center justify-center transform -rotate-3">
                        <h1 className="font-['Bebas_Neue'] text-8xl md:text-[140px] text-white leading-[0.8] tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] uppercase px-8"
                            style={{ WebkitTextStroke: '2px #000' }}>
                            {title}
                        </h1>
                    </div>

                    {/* ARTISTA */}
                    <div className="absolute bottom-[13%] left-0 right-0 text-center z-20">
                        <h2 className="font-['Poppins'] font-black text-2xl text-[#c5a059] tracking-[0.4em] uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                            ARTISTA: <span className="text-white">{artist}</span>
                        </h2>
                    </div>

                    {/* FRASE (Nota en esquina) */}
                    {phrase && (
                        <div className="absolute top-[20%] left-[5%] max-w-[300px] bg-[#f4e4c1] text-black p-8 shadow-[0_15px_30px_rgba(0,0,0,0.7)] transform -rotate-6 border border-black/10"
                             style={{
                                 backgroundImage: 'radial-gradient(#d3c19e 1px, transparent 1px)',
                                 backgroundSize: '20px 20px',
                                 boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3), 5px 10px 20px rgba(0,0,0,0.8)'
                             }}>
                            <div className="absolute top-[-15px] left-1/2 transform -translate-x-1/2 w-20 h-8 bg-white/40 rotate-2 border border-black/5" style={{ backdropFilter: 'blur(2px)' }}></div>
                            <h3 className="font-['Bebas_Neue'] text-3xl mb-4 border-b-2 border-black/20 pb-2">FRASE DE LA CANCIÓN</h3>
                            <p className="font-['Dancing_Script'] font-bold text-3xl leading-snug">"{phrase}"</p>
                        </div>
                    )}
                </>
            );
        }

        // Diseño Acústico / Limpio
        return (
            <>
                <div className="absolute top-[10%] right-[10%] text-right z-20">
                    <div className="font-['Bebas_Neue'] text-4xl text-[#c5a059] tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                        {date}
                    </div>
                </div>

                <div className="absolute bottom-[15%] right-[10%] text-right z-20 max-w-[60%]">
                    <p className="font-['Poppins'] font-bold text-xl text-white/80 uppercase tracking-widest mb-4 border-b border-white/20 pb-2 inline-block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {phrase}
                    </p>
                    <h1 className="font-['Bebas_Neue'] text-8xl text-white leading-none tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] mb-4">
                        {title}
                    </h1>
                    <h2 className="font-['Satisfy'] text-6xl text-[#c5a059] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] -rotate-3 transform origin-right">
                        {artist}
                    </h2>
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins']">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Panel
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Premium <span className="text-[#c5a059]">Templates</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="flex-1 p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-auto">
                {/* Panel de Controles */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#c5a059] mb-6">1. Imágenes</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-2">Plantilla Base (Fondo)</label>
                                <button onClick={() => document.getElementById('bg-upload')?.click()} className="w-full py-3 bg-black/40 border border-white/10 rounded-lg text-xs hover:border-[#c5a059] transition-all text-white/80">
                                    <i className="fas fa-upload mr-2"></i> {bgImage ? 'Cambiar Plantilla' : 'Subir Plantilla Base'}
                                </button>
                                <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setBgImage)} />
                            </div>

                            <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-2">Portada (Cover de la Canción)</label>
                                <button onClick={() => document.getElementById('cover-upload')?.click()} className="w-full py-3 bg-black/40 border border-white/10 rounded-lg text-xs hover:border-[#c5a059] transition-all text-white/80">
                                    <i className="fas fa-image mr-2"></i> {coverImage ? 'Cambiar Portada' : 'Subir Portada'}
                                </button>
                                <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setCoverImage)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#c5a059] mb-6">2. Textos Mágicos</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-1">Diseño Textual</label>
                                <select 
                                    className="w-full bg-black/50 border border-white/10 p-3 rounded-lg outline-none text-sm text-[#c5a059] cursor-pointer"
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                >
                                    <option value="urbano">Urbano / Corrido (Estilo 1)</option>
                                    <option value="acustico">Acústico / Country (Estilo 2)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-1">Título de la Canción</label>
                                <input type="text" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg outline-none focus:border-[#c5a059] text-sm" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} />
                            </div>

                            <div>
                                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-1">Frase / Letra destacada</label>
                                <textarea rows={2} className="w-full bg-black/50 border border-white/10 p-3 rounded-lg outline-none focus:border-[#c5a059] text-sm" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-1">Fecha</label>
                                    <input type="text" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg outline-none focus:border-[#c5a059] text-sm" value={date} onChange={(e) => setDate(e.target.value.toUpperCase())} />
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-1">Artista</label>
                                    <input type="text" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg outline-none focus:border-[#c5a059] text-sm" value={artist} onChange={(e) => setArtist(e.target.value.toUpperCase())} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {coverImage && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#c5a059] mb-6">3. Ajuste de Portada</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-2">Tamaño ({coverSize}%)</label>
                                    <input type="range" min="10" max="100" value={coverSize} onChange={(e) => setCoverSize(Number(e.target.value))} className="w-full accent-[#c5a059]" />
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-2">Posición X ({coverX}%)</label>
                                    <input type="range" min="0" max="100" value={coverX} onChange={(e) => setCoverX(Number(e.target.value))} className="w-full accent-[#c5a059]" />
                                </div>
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block mb-2">Posición Y ({coverY}%)</label>
                                    <input type="range" min="0" max="100" value={coverY} onChange={(e) => setCoverY(Number(e.target.value))} className="w-full accent-[#c5a059]" />
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleDownload}
                        disabled={isGenerating || !bgImage}
                        className="w-full py-5 bg-[#c5a059] text-black font-black uppercase tracking-[0.3em] rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <i className={`fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                        {isGenerating ? 'Generando Master...' : 'Descargar Diseño'}
                    </button>
                </div>

                {/* Previsualización */}
                <div ref={containerRef} className="lg:col-span-8 flex justify-center items-start">
                    <div className="sticky top-24 border-2 border-white/10 rounded-3xl overflow-hidden bg-black shadow-2xl relative" style={{ 
                        width: EXPORT_WIDTH * scale, 
                        height: EXPORT_HEIGHT * scale 
                    }}>
                        <div 
                            id="promo-master"
                            ref={masterRef}
                            className="absolute top-0 left-0 bg-black overflow-hidden"
                            style={{ 
                                width: EXPORT_WIDTH, 
                                height: EXPORT_HEIGHT,
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            {/* Capa Base (Plantilla subida por el usuario) */}
                            {bgImage ? (
                                <img src={bgImage} className="absolute inset-0 w-full h-full object-cover z-10" alt="Plantilla" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1d] text-white/20 border-dashed border-4 border-white/10 m-8 rounded-3xl z-10">
                                    <i className="fas fa-image text-8xl mb-4"></i>
                                    <p className="font-black uppercase tracking-widest">Sube tu plantilla base para comenzar</p>
                                </div>
                            )}

                            {/* Capa de Portada (Sube sobre el fondo, o debajo del hueco si el fondo tiene transparencia) */}
                            {coverImage && (
                                <div 
                                    className="absolute z-0" 
                                    style={{
                                        width: `${coverSize}%`,
                                        height: `${coverSize}%`,
                                        left: `${coverX}%`,
                                        top: `${coverY}%`,
                                        transform: 'translate(-50%, -50%)',
                                        // Opcional: si quieren mezclarlo con el fondo
                                        // mixBlendMode: 'screen' 
                                    }}
                                >
                                    <img src={coverImage} className="w-full h-full object-cover rounded-md shadow-2xl" alt="Cover" />
                                </div>
                            )}
                            
                            {/* NOTA IMPORTANTE PARA EL Z-INDEX: 
                                Puse z-10 en bgImage y z-0 en coverImage. 
                                Esto asume que el usuario sube un PNG con el hueco central transparente.
                                Si suben un JPG con marco negro, la portada no se verá.
                                Dejaré un botón para invertir las capas por si acaso.
                            */}

                            {/* Capa de Textos Dinámicos */}
                            {bgImage && (
                                <div className="absolute inset-0 z-30 pointer-events-none">
                                    {renderTexts()}
                                </div>
                            )}
                        </div>

                        {/* Controles rápidos sobre la visualización */}
                        {coverImage && (
                            <div className="absolute top-4 left-4 z-50 flex gap-2">
                                <button 
                                    onClick={() => {
                                        const bg = masterRef.current?.querySelector('img[alt="Plantilla"]') as HTMLElement;
                                        const cover = masterRef.current?.querySelector('img[alt="Cover"]')?.parentElement as HTMLElement;
                                        if (bg && cover) {
                                            // Toggle z-index
                                            if (bg.style.zIndex === '10') {
                                                bg.style.zIndex = '0';
                                                cover.style.zIndex = '10';
                                            } else {
                                                bg.style.zIndex = '10';
                                                cover.style.zIndex = '0';
                                            }
                                        }
                                    }}
                                    className="bg-black/80 backdrop-blur text-white text-[9px] font-black uppercase px-3 py-2 rounded-lg border border-white/20 hover:bg-[#c5a059] transition-all"
                                >
                                    <i className="fas fa-layer-group mr-2"></i> Invertir Capas (Fondo/Portada)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplatePromoApp;
