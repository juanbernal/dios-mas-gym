import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AntiAIWatermark: React.FC = () => {
    const navigate = useNavigate();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<{width: number, height: number} | null>(null);
    const [logoSelection, setLogoSelection] = useState<'diosmasgym' | 'juan614' | 'both'>('diosmasgym');
    const [logoSize, setLogoSize] = useState<number>(20); // 20% of image width
    const [logoOpacity, setLogoOpacity] = useState<number>(100);
    const [logoPosition, setLogoPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
    const [bothLayout, setBothLayout] = useState<'opposite' | 'stacked' | 'side-by-side'>('opposite');
    const [showText, setShowText] = useState<boolean>(true);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const diosmasgymLogoRef = useRef<HTMLImageElement>(new Image());
    const juan614LogoRef = useRef<HTMLImageElement>(new Image());

    useEffect(() => {
        diosmasgymLogoRef.current.src = '/logo-diosmasgym.png';
        juan614LogoRef.current.src = '/logo-juan614-v2.jpg';
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setOriginalSize({ width: img.width, height: img.height });
                setImageSrc(img.src);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const drawComposition = (ctx: CanvasRenderingContext2D, width: number, height: number, sourceImage: HTMLImageElement) => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Draw main image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(sourceImage, 0, 0, width, height);

        // Calculate logos dimensions
        const margin = width * 0.05; // 5% margin
        const targetWidth = width * (logoSize / 100);
        
        ctx.globalAlpha = logoOpacity / 100;

        const drawLogo = (logoImg: HTMLImageElement, posX: number, posY: number) => {
            if (!logoImg.complete || logoImg.naturalWidth === 0) return;
            const aspect = logoImg.height / logoImg.width;
            const targetHeight = targetWidth * aspect;
            
            // To make the JPG blend a bit if needed (like Juan 614 logo)
            ctx.drawImage(logoImg, posX, posY, targetWidth, targetHeight);
        };

        const getCoordinates = (pos: string, logoW: number, logoH: number, index: number, total: number) => {
            let x = 0;
            let y = 0;
            
            if (total === 1) {
                switch (pos) {
                    case 'bottom-right': x = width - logoW - margin; y = height - logoH - margin; break;
                    case 'bottom-left': x = margin; y = height - logoH - margin; break;
                    case 'top-right': x = width - logoW - margin; y = margin; break;
                    case 'top-left': x = margin; y = margin; break;
                    case 'center': x = (width / 2) - (logoW / 2); y = (height / 2) - (logoH / 2); break;
                }
            } else {
                // Total === 2
                if (bothLayout === 'opposite') {
                    // Put first at pos, second at opposite corner (horizontally)
                    if (index === 0) {
                        switch (pos) {
                            case 'bottom-right': x = width - logoW - margin; y = height - logoH - margin; break;
                            case 'bottom-left': x = margin; y = height - logoH - margin; break;
                            case 'top-right': x = width - logoW - margin; y = margin; break;
                            case 'top-left': x = margin; y = margin; break;
                            case 'center': x = (width / 2) - logoW - margin/2; y = (height / 2) - (logoH / 2); break;
                        }
                    } else {
                        switch (pos) {
                            case 'bottom-right': x = margin; y = height - logoH - margin; break; // opposite is bottom-left
                            case 'bottom-left': x = width - logoW - margin; y = height - logoH - margin; break;
                            case 'top-right': x = margin; y = margin; break;
                            case 'top-left': x = width - logoW - margin; y = margin; break;
                            case 'center': x = (width / 2) + margin/2; y = (height / 2) - (logoH / 2); break;
                        }
                    }
                } else if (bothLayout === 'stacked') {
                    const totalH = (logoH * 2) + margin;
                    switch (pos) {
                        case 'bottom-right': x = width - logoW - margin; y = height - totalH - margin + (index * (logoH + margin)); break;
                        case 'bottom-left': x = margin; y = height - totalH - margin + (index * (logoH + margin)); break;
                        case 'top-right': x = width - logoW - margin; y = margin + (index * (logoH + margin)); break;
                        case 'top-left': x = margin; y = margin + (index * (logoH + margin)); break;
                        case 'center': x = (width / 2) - (logoW / 2); y = (height / 2) - (totalH / 2) + (index * (logoH + margin)); break;
                    }
                } else { // side-by-side
                    const totalW = (logoW * 2) + margin;
                    switch (pos) {
                        case 'bottom-right': x = width - totalW - margin + (index * (logoW + margin)); y = height - logoH - margin; break;
                        case 'bottom-left': x = margin + (index * (logoW + margin)); y = height - logoH - margin; break;
                        case 'top-right': x = width - totalW - margin + (index * (logoW + margin)); y = margin; break;
                        case 'top-left': x = margin + (index * (logoW + margin)); y = margin; break;
                        case 'center': x = (width / 2) - (totalW / 2) + (index * (logoW + margin)); y = (height / 2) - (logoH / 2); break;
                    }
                }
            }
            return { x, y };
        };

        let logosToDraw = [];
        if (logoSelection === 'diosmasgym' || logoSelection === 'both') logosToDraw.push(diosmasgymLogoRef.current);
        if (logoSelection === 'juan614' || logoSelection === 'both') logosToDraw.push(juan614LogoRef.current);

        logosToDraw.forEach((logo, idx) => {
            if (logo.complete && logo.naturalWidth > 0) {
                const aspect = logo.height / logo.width;
                const lHeight = targetWidth * aspect;
                const { x, y } = getCoordinates(logoPosition, targetWidth, lHeight, idx, logosToDraw.length);
                drawLogo(logo, x, y);
            }
        });

        // Add text if enabled
        if (showText) {
            ctx.globalAlpha = logoOpacity / 100;
            const fontSize = Math.max(16, width * 0.02); // 2% of width
            ctx.font = `600 ${fontSize}px Inter, Montserrat, sans-serif`;
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = fontSize / 2;
            ctx.fillText('DIOSMASGYM.COM', width / 2, height - margin / 2);
            ctx.shadowBlur = 0; // reset
        }

        ctx.globalAlpha = 1.0;
    };

    useEffect(() => {
        if (!imageSrc || !originalSize || !previewCanvasRef.current) return;
        
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Adjust canvas size to fit the container while maintaining aspect ratio
            const containerWidth = canvas.parentElement?.clientWidth || 800;
            const containerHeight = canvas.parentElement?.clientHeight || 600;
            
            const scale = Math.min(containerWidth / originalSize.width, containerHeight / originalSize.height, 1);
            
            canvas.width = originalSize.width * scale;
            canvas.height = originalSize.height * scale;
            
            drawComposition(ctx, canvas.width, canvas.height, img);
        };
        img.src = imageSrc;

    }, [imageSrc, originalSize, logoSelection, logoSize, logoOpacity, logoPosition, bothLayout, showText]);

    const handleDownload = () => {
        if (!imageSrc || !originalSize) return;
        
        setIsDownloading(true);
        
        const img = new Image();
        img.onload = () => {
            // Create a high-res hidden canvas
            const canvas = document.createElement('canvas');
            canvas.width = originalSize.width;
            canvas.height = originalSize.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                drawComposition(ctx, canvas.width, canvas.height, img);
                
                // Export at max quality
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `watermarked_image_${new Date().getTime()}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }
                    setIsDownloading(false);
                }, 'image/png', 1.0);
            } else {
                setIsDownloading(false);
            }
        };
        img.src = imageSrc;
    };

    return (
        <div className="min-h-screen bg-[#05070a] text-white pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
                
                {/* Control Sidebar */}
                <div className="w-full md:w-[400px] shrink-0 bg-[#0f111a] border border-white/5 rounded-3xl p-8 custom-scrollbar">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#c5a059] transition-all"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Volver al Panel
                    </button>

                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-shield-halved text-[#c5a059] text-xl"></i>
                            <h1 className="text-2xl font-serif italic text-white">Anti-AI Watermark</h1>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed">
                            Aplica los logos de Diosmasgym o Juan 614 a tus imágenes conservando la calidad original para evitar detecciones erróneas en redes sociales.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">1. Seleccionar Imagen</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 bg-black/40 border border-white/10 rounded-xl hover:border-[#c5a059]/50 transition-all flex flex-col items-center gap-2"
                            >
                                <i className="fas fa-cloud-arrow-up text-xl text-white/30"></i>
                                <span className="text-[10px] font-bold text-white/60">Subir Imagen HD</span>
                            </button>
                        </div>

                        {/* Logo Settings */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4 block">2. Configuración de Marca</label>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 block mb-2">Selección de Logo</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            onClick={() => setLogoSelection('diosmasgym')}
                                            className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${logoSelection === 'diosmasgym' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                                        >
                                            Diosmasgym
                                        </button>
                                        <button 
                                            onClick={() => setLogoSelection('juan614')}
                                            className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${logoSelection === 'juan614' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                                        >
                                            Juan 614
                                        </button>
                                        <button 
                                            onClick={() => setLogoSelection('both')}
                                            className={`py-2 text-[9px] font-bold uppercase rounded-lg border transition-all ${logoSelection === 'both' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                                        >
                                            Ambos
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-white/70 block mb-2">Posición</label>
                                    <select 
                                        value={logoPosition}
                                        onChange={(e) => setLogoPosition(e.target.value as any)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none"
                                    >
                                        <option value="bottom-right">Abajo - Derecha</option>
                                        <option value="bottom-left">Abajo - Izquierda</option>
                                        <option value="top-right">Arriba - Derecha</option>
                                        <option value="top-left">Arriba - Izquierda</option>
                                        <option value="center">Centro</option>
                                    </select>
                                </div>

                                {logoSelection === 'both' && (
                                    <div>
                                        <label className="text-[10px] font-bold text-white/70 block mb-2">Diseño Ambos Logos</label>
                                        <select 
                                            value={bothLayout}
                                            onChange={(e) => setBothLayout(e.target.value as any)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none mb-2"
                                        >
                                            <option value="opposite">Esquinas Opuestas</option>
                                            <option value="side-by-side">Lado a Lado (Horizontal)</option>
                                            <option value="stacked">Apilados (Vertical)</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-lg border border-white/5">
                                    <label className="text-[10px] font-bold text-white/70">Texto "DIOSMASGYM.COM"</label>
                                    <input 
                                        type="checkbox" 
                                        checked={showText} 
                                        onChange={(e) => setShowText(e.target.checked)}
                                        className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-[10px] font-bold text-white/70">Tamaño del Logo</label>
                                        <span className="text-[10px] text-[#c5a059]">{logoSize}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="5" max="50" 
                                        value={logoSize}
                                        onChange={(e) => setLogoSize(Number(e.target.value))}
                                        className="w-full accent-[#c5a059]"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-[10px] font-bold text-white/70">Opacidad</label>
                                        <span className="text-[10px] text-[#c5a059]">{logoOpacity}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" max="100" 
                                        value={logoOpacity}
                                        onChange={(e) => setLogoOpacity(Number(e.target.value))}
                                        className="w-full accent-[#c5a059]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Export */}
                        <div className="pt-4">
                            <button 
                                onClick={handleDownload}
                                disabled={!imageSrc || isDownloading}
                                className="w-full py-4 bg-[#c5a059] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-[#c5a059] flex justify-center items-center gap-3 text-xs"
                            >
                                {isDownloading ? (
                                    <><i className="fas fa-circle-notch fa-spin"></i> Procesando HD...</>
                                ) : (
                                    <><i className="fas fa-download"></i> Descargar Imagen Sin Pérdida</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-black rounded-3xl border border-white/5 flex flex-col overflow-hidden relative shadow-2xl">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0c14]">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Vista Previa</span>
                        {originalSize && (
                            <span className="text-[9px] font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full">
                                {originalSize.width}x{originalSize.height}px (Calidad Original)
                            </span>
                        )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDkwOTA5Ii8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTExIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxMTEiLz48L3N2Zz4=')]">
                        {imageSrc ? (
                            <canvas 
                                ref={previewCanvasRef} 
                                className="max-w-full max-h-[70vh] shadow-2xl ring-1 ring-white/10"
                            ></canvas>
                        ) : (
                            <div className="text-center opacity-30">
                                <i className="fas fa-image text-6xl mb-4"></i>
                                <p className="text-xs font-black uppercase tracking-widest">Sube una imagen para previsualizar</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AntiAIWatermark;
