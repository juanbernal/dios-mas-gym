import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as piexif from 'piexifjs';

const AntiAIWatermark: React.FC = () => {
    const navigate = useNavigate();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<{width: number, height: number} | null>(null);
    const [activeTab, setActiveTab] = useState<'logo' | 'ribbon' | 'socials' | 'watermark'>('logo');
    
    // Logo States
    const [logoSelection, setLogoSelection] = useState<'diosmasgym' | 'mando_ejecutivo' | 'none'>('mando_ejecutivo');
    const [logoSize, setLogoSize] = useState<number>(25); // percentage of image width
    const [logoOpacity, setLogoOpacity] = useState<number>(100);
    const [logoPosition, setLogoPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
    const [showText, setShowText] = useState<boolean>(true);
    
    // Ribbon / Banner States
    const [ribbonStyle, setRibbonStyle] = useState<'none' | 'bottom' | 'top' | 'diagonal-left' | 'diagonal-right'>('none');
    const [ribbonText, setRibbonText] = useState<string>('#PuroSeñorJesucristoCompa');
    const [ribbonColor, setRibbonColor] = useState<'gold' | 'black' | 'white'>('gold');
    const [ribbonOpacity, setRibbonOpacity] = useState<number>(90);

    // Social Media States
    const [showSocials, setShowSocials] = useState<boolean>(true);
    const [socialText, setSocialText] = useState<string>('@diosmasgym');
    const [socialInstagram, setSocialInstagram] = useState<boolean>(true);
    const [socialTikTok, setSocialTikTok] = useState<boolean>(true);
    const [socialYouTube, setSocialYouTube] = useState<boolean>(false);
    const [socialPosition, setSocialPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left');
    const [socialColor, setSocialColor] = useState<'gold' | 'white'>('white');
    const [socialBackground, setSocialBackground] = useState<boolean>(true);
    const [socialOpacity, setSocialOpacity] = useState<number>(90);

    // Hashtag Watermark States
    const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(true);
    const [watermarkStyle, setWatermarkStyle] = useState<'diagonal' | 'tiled' | 'center'>('diagonal');
    const [watermarkText, setWatermarkText] = useState<string>('#PuroSeñorJesucristoCompa');
    const [watermarkOpacity, setWatermarkOpacity] = useState<number>(20);
    const [watermarkSize, setWatermarkSize] = useState<number>(35);

    const [injectExif, setInjectExif] = useState<boolean>(true);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const diosmasgymLogoRef = useRef<HTMLImageElement>(new Image());
    const mandoEjecutivoLogoRef = useRef<HTMLImageElement>(new Image());

    useEffect(() => {
        diosmasgymLogoRef.current.src = '/logo-diosmasgym.png';
        mandoEjecutivoLogoRef.current.src = '/logo-mando-ejecutivo.png';
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

    // Quick phrases for Ribbon
    const ribbonPhrases = [
        '#PuroSeñorJesucristoCompa',
        'Puro Chihuahua',
        'Saludos desde Chihuahua',
        'Diosmasgym Records',
        'Mando Ejecutivo',
        'Puro Señor Jesucristo',
        'La Gloria es de Dios',
        'Fe y Disciplina'
    ];

    // Quick phrases for Watermark
    const watermarkPhrases = [
        '#PuroSeñorJesucristoCompa',
        'Diosmasgym.com',
        'Diosmasgym Records',
        'Puro Chihuahua',
        '#Diosmasgym',
        'Mando Ejecutivo'
    ];

    const drawComposition = (ctx: CanvasRenderingContext2D, width: number, height: number, sourceImage: HTMLImageElement) => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw main image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(sourceImage, 0, 0, width, height);

        // 1. Draw Watermarks (Hashtags) in background (drawn under logos/ribbons)
        if (watermarkEnabled && watermarkText) {
            ctx.save();
            ctx.globalAlpha = watermarkOpacity / 100;
            ctx.fillStyle = socialColor === 'gold' ? 'rgba(197, 160, 89, 0.9)' : 'rgba(255, 255, 255, 0.8)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 6;
            const wSize = Math.max(16, width * (watermarkSize / 100) * 0.15);
            ctx.font = `italic 900 ${wSize}px Montserrat, Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (watermarkStyle === 'diagonal') {
                ctx.translate(width / 2, height / 2);
                ctx.rotate(-Math.PI / 6); // -30 degrees
                ctx.fillText(watermarkText, 0, 0);
            } else if (watermarkStyle === 'tiled') {
                const stepX = width / 2.2;
                const stepY = height / 3.2;
                for (let x = -width * 0.2; x < width * 1.5; x += stepX) {
                    for (let y = -height * 0.2; y < height * 1.5; y += stepY) {
                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(-Math.PI / 12);
                        ctx.fillText(watermarkText, 0, 0);
                        ctx.restore();
                    }
                }
            } else {
                ctx.fillText(watermarkText, width / 2, height / 2);
            }
            ctx.restore();
        }

        // 2. Draw Ribbon / Listón
        if (ribbonStyle !== 'none' && ribbonText) {
            ctx.save();
            ctx.globalAlpha = ribbonOpacity / 100;
            
            const ribbonHeight = Math.max(45, height * 0.08);
            let fillStyle: string | CanvasGradient = 'rgba(15, 17, 26, 0.9)';
            
            if (ribbonColor === 'gold') {
                const grad = ctx.createLinearGradient(0, 0, width, 0);
                grad.addColorStop(0, '#78531b');
                grad.addColorStop(0.5, '#c5a059');
                grad.addColorStop(1, '#78531b');
                fillStyle = grad;
            } else if (ribbonColor === 'black') {
                fillStyle = 'rgba(10, 12, 20, 0.92)';
            } else if (ribbonColor === 'white') {
                fillStyle = 'rgba(255, 255, 255, 0.95)';
            }
            
            ctx.fillStyle = fillStyle;
            
            if (ribbonStyle === 'bottom') {
                ctx.fillRect(0, height - ribbonHeight, width, ribbonHeight);
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1.5, height * 0.003);
                ctx.beginPath();
                ctx.moveTo(0, height - ribbonHeight);
                ctx.lineTo(width, height - ribbonHeight);
                ctx.stroke();
                
                ctx.fillStyle = ribbonColor === 'white' ? '#000000' : '#ffffff';
                ctx.font = `italic 900 ${ribbonHeight * 0.38}px Montserrat, Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ribbonText, width / 2, height - (ribbonHeight / 2));
            } else if (ribbonStyle === 'top') {
                ctx.fillRect(0, 0, width, ribbonHeight);
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1.5, height * 0.003);
                ctx.beginPath();
                ctx.moveTo(0, ribbonHeight);
                ctx.lineTo(width, ribbonHeight);
                ctx.stroke();
                
                ctx.fillStyle = ribbonColor === 'white' ? '#000000' : '#ffffff';
                ctx.font = `italic 900 ${ribbonHeight * 0.38}px Montserrat, Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ribbonText, width / 2, ribbonHeight / 2);
            } else if (ribbonStyle === 'diagonal-left') {
                const diagWidth = ribbonHeight * 1.6;
                ctx.translate(0, 0);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(-diagWidth * 2, diagWidth, diagWidth * 4, ribbonHeight);
                
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1, height * 0.002);
                ctx.strokeRect(-diagWidth * 2, diagWidth, diagWidth * 4, ribbonHeight);
                
                ctx.fillStyle = ribbonColor === 'white' ? '#000000' : '#ffffff';
                ctx.font = `900 ${ribbonHeight * 0.32}px Montserrat, Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ribbonText, 0, diagWidth + ribbonHeight / 2);
            } else if (ribbonStyle === 'diagonal-right') {
                const diagWidth = ribbonHeight * 1.6;
                ctx.translate(width, 0);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-diagWidth * 2, diagWidth, diagWidth * 4, ribbonHeight);
                
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1, height * 0.002);
                ctx.strokeRect(-diagWidth * 2, diagWidth, diagWidth * 4, ribbonHeight);
                
                ctx.fillStyle = ribbonColor === 'white' ? '#000000' : '#ffffff';
                ctx.font = `900 ${ribbonHeight * 0.32}px Montserrat, Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ribbonText, 0, diagWidth + ribbonHeight / 2);
            }
            ctx.restore();
        }

        // 3. Draw Logos
        const margin = width * 0.05; // 5% margin
        const targetWidth = width * (logoSize / 100);
        
        ctx.globalAlpha = logoOpacity / 100;

        const drawLogo = (logoImg: HTMLImageElement, posX: number, posY: number) => {
            if (!logoImg.complete || logoImg.naturalWidth === 0) return;
            const aspect = logoImg.height / logoImg.width;
            const targetHeight = targetWidth * aspect;
            ctx.drawImage(logoImg, posX, posY, targetWidth, targetHeight);
        };

        const getCoordinates = (pos: string, logoW: number, logoH: number) => {
            let x = 0;
            let y = 0;
            switch (pos) {
                case 'bottom-right': x = width - logoW - margin; y = height - logoH - margin; break;
                case 'bottom-left': x = margin; y = height - logoH - margin; break;
                case 'top-right': x = width - logoW - margin; y = margin; break;
                case 'top-left': x = margin; y = margin; break;
                case 'center': x = (width / 2) - (logoW / 2); y = (height / 2) - (logoH / 2); break;
            }
            return { x, y };
        };

        let logoToDraw = null;
        if (logoSelection === 'diosmasgym') logoToDraw = diosmasgymLogoRef.current;
        if (logoSelection === 'mando_ejecutivo') logoToDraw = mandoEjecutivoLogoRef.current;

        if (logoToDraw && logoToDraw.complete && logoToDraw.naturalWidth > 0) {
            const aspect = logoToDraw.height / logoToDraw.width;
            const lHeight = targetWidth * aspect;
            const { x, y } = getCoordinates(logoPosition, targetWidth, lHeight);
            drawLogo(logoToDraw, x, y);
        }

        // 4. Draw Social Media Badge Block (Premium Minimalist Glass Style)
        if (showSocials && socialText) {
            ctx.save();
            ctx.globalAlpha = socialOpacity / 100;
            
            const fontSize = Math.max(12, width * 0.016);
            ctx.font = `700 ${fontSize}px Montserrat, Inter, sans-serif`;
            
            // Calculate size with icons
            let iconCount = 0;
            if (socialInstagram) iconCount++;
            if (socialTikTok) iconCount++;
            if (socialYouTube) iconCount++;
            
            const textMetrics = ctx.measureText(socialText);
            const iconSize = fontSize * 1.05;
            const iconGap = fontSize * 0.45;
            const totalIconsWidth = iconCount > 0 ? (iconCount * iconSize) + ((iconCount - 1) * iconGap) : 0;
            
            const blockPaddingH = fontSize * 0.9;
            const blockPaddingV = fontSize * 0.6;
            const blockWidth = textMetrics.width + totalIconsWidth + (iconCount > 0 ? fontSize * 0.7 : 0) + (blockPaddingH * 2);
            const blockHeight = fontSize + (blockPaddingV * 2);
            
            let bx = margin;
            let by = height - margin - blockHeight;
            
            if (socialPosition === 'bottom-right') {
                bx = width - margin - blockWidth;
                by = height - margin - blockHeight;
            } else if (socialPosition === 'top-left') {
                bx = margin;
                by = margin;
            } else if (socialPosition === 'top-right') {
                bx = width - margin - blockWidth;
                by = margin;
            }
            
            // Draw luxury rounded pill with shadow and gold accent border
            if (socialBackground) {
                // Drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 4;
                
                // Pill Background
                ctx.fillStyle = 'rgba(10, 12, 20, 0.88)';
                ctx.beginPath();
                ctx.roundRect(bx, by, blockWidth, blockHeight, blockHeight / 2);
                ctx.fill();
                
                // Gold shiny border
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1.5, fontSize * 0.07);
                ctx.stroke();
            }
            
            // Draw icons
            let currentIconX = bx + blockPaddingH;
            const currentIconY = by + (blockHeight - iconSize) / 2;
            
            ctx.fillStyle = socialColor === 'gold' ? '#c5a059' : '#ffffff';
            ctx.strokeStyle = socialColor === 'gold' ? '#c5a059' : '#ffffff';
            
            if (socialInstagram) {
                ctx.save();
                ctx.lineWidth = iconSize * 0.11;
                // Outer body
                ctx.beginPath();
                ctx.roundRect(currentIconX, currentIconY, iconSize, iconSize, iconSize * 0.28);
                ctx.stroke();
                // Lens
                ctx.beginPath();
                ctx.arc(currentIconX + iconSize/2, currentIconY + iconSize/2, iconSize * 0.24, 0, Math.PI * 2);
                ctx.stroke();
                // Flash dot
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(currentIconX + iconSize * 0.76, currentIconY + iconSize * 0.24, iconSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }
            
            if (socialTikTok) {
                ctx.save();
                ctx.lineWidth = iconSize * 0.13;
                const tx = currentIconX + iconSize * 0.46;
                const ty = currentIconY + iconSize * 0.15;
                
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx, ty + iconSize * 0.55);
                ctx.arc(tx - iconSize * 0.2, ty + iconSize * 0.55, iconSize * 0.22, 0, Math.PI);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(tx + iconSize * 0.24, ty + iconSize * 0.24, iconSize * 0.24, Math.PI, Math.PI * 1.5);
                ctx.stroke();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }
            
            if (socialYouTube) {
                ctx.save();
                ctx.fillStyle = socialColor === 'gold' ? '#c5a059' : '#ffffff';
                ctx.beginPath();
                ctx.roundRect(currentIconX, currentIconY + iconSize * 0.1, iconSize * 1.15, iconSize * 0.8, iconSize * 0.22);
                ctx.fill();
                
                // Play triangle inside
                ctx.fillStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                ctx.beginPath();
                ctx.moveTo(currentIconX + iconSize * 0.45, currentIconY + iconSize * 0.32);
                ctx.lineTo(currentIconX + iconSize * 0.75, currentIconY + iconSize * 0.5);
                ctx.lineTo(currentIconX + iconSize * 0.45, currentIconY + iconSize * 0.68);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
                
                currentIconX += iconSize * 1.15 + iconGap;
            }
            
            // Draw social handle text
            ctx.fillStyle = socialColor === 'gold' ? '#c5a059' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(socialText, currentIconX, by + blockHeight / 2);
            ctx.restore();
        }

        // 5. Add Default Brand Text at the bottom if enabled
        if (showText) {
            ctx.globalAlpha = logoOpacity / 100;
            
            const gradientHeight = Math.max(150, height * 0.15);
            const grad = ctx.createLinearGradient(0, height - gradientHeight, 0, height);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

            const fontSize = Math.max(16, width * 0.018); 
            ctx.font = `400 ${fontSize}px Montserrat, Inter, sans-serif`;
            if ('letterSpacing' in ctx) {
                (ctx as any).letterSpacing = `${fontSize * 0.6}px`;
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = fontSize * 1.5;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
            
            const textY = height - (margin * 0.6);
            ctx.fillText('DIOSMASGYM.COM', width / 2, textY);
            
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            const textMetrics = ctx.measureText('DIOSMASGYM.COM');
            const actualWidth = textMetrics.width;
            
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.7)';
            ctx.lineWidth = Math.max(1, fontSize * 0.1);
            ctx.beginPath();
            ctx.moveTo((width / 2) - (actualWidth / 3), textY + fontSize * 1.2);
            ctx.lineTo((width / 2) + (actualWidth / 3), textY + fontSize * 1.2);
            ctx.stroke();
            
            if ('letterSpacing' in ctx) {
                (ctx as any).letterSpacing = '0px';
            }
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
            const containerWidth = canvas.parentElement?.clientWidth || 800;
            const containerHeight = canvas.parentElement?.clientHeight || 600;
            const scale = Math.min(containerWidth / originalSize.width, containerHeight / originalSize.height, 1);
            
            canvas.width = originalSize.width * scale;
            canvas.height = originalSize.height * scale;
            
            drawComposition(ctx, canvas.width, canvas.height, img);
        };
        img.src = imageSrc;

    }, [
        imageSrc, originalSize, logoSelection, logoSize, logoOpacity, logoPosition, showText,
        ribbonStyle, ribbonText, ribbonColor, ribbonOpacity,
        showSocials, socialText, socialInstagram, socialTikTok, socialYouTube, socialPosition, socialColor, socialBackground, socialOpacity,
        watermarkEnabled, watermarkStyle, watermarkText, watermarkOpacity, watermarkSize
    ]);

    const handleDownload = () => {
        if (!imageSrc || !originalSize) return;
        
        setIsDownloading(true);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = originalSize.width;
            canvas.height = originalSize.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                drawComposition(ctx, canvas.width, canvas.height, img);
                
                try {
                    if (injectExif) {
                        const dataURL = canvas.toDataURL('image/jpeg', 1.0);
                        const zeroth: any = {};
                        const exif: any = {};
                        const gps: any = {};

                        zeroth[piexif.ImageIFD.Make] = "Diosmasgym Records";
                        zeroth[piexif.ImageIFD.Model] = "Mando Ejecutivo Suite (DSLR-Simulation)";
                        zeroth[piexif.ImageIFD.Software] = "Mando Ejecutivo Watermark Engine v5.1";
                        zeroth[piexif.ImageIFD.Artist] = "Diosmasgym";
                        zeroth[piexif.ImageIFD.Copyright] = `Copyright ${new Date().getFullYear()} Diosmasgym`;

                        const now = new Date();
                        const dateStr = `${now.getFullYear()}:${String(now.getMonth()+1).padStart(2, '0')}:${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                        exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
                        exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;

                        const exifObj = {"0th": zeroth, "Exif": exif, "GPS": gps};
                        const exifBytes = piexif.dump(exifObj);
                        const newJpegDataUrl = piexif.insert(exifBytes, dataURL);

                        const arr = newJpegDataUrl.split(',');
                        const mime = arr[0].match(/:(.*?);/)[1];
                        const bstr = atob(arr[1]);
                        let n = bstr.length;
                        const u8arr = new Uint8Array(n);
                        while (n--) {
                            u8arr[n] = bstr.charCodeAt(n);
                        }
                        const blob = new Blob([u8arr], { type: mime });
                        const blobUrl = URL.createObjectURL(blob);

                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `mando_ejecutivo_${new Date().getTime()}.jpg`;
                        a.click();
                        
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                        setIsDownloading(false);
                    } else {
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `mando_ejecutivo_${new Date().getTime()}.png`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }
                            setIsDownloading(false);
                        }, 'image/png', 1.0);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Error al inyectar metadatos. Descargando sin EXIF.");
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `mando_ejecutivo_${new Date().getTime()}.png`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }
                        setIsDownloading(false);
                    }, 'image/png', 1.0);
                }
            } else {
                setIsDownloading(false);
            }
        };
        img.src = imageSrc;
    };

    return (
        <div className="min-h-screen bg-[#05070a] text-white pt-24 pb-12 px-4 md:px-6">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
                
                {/* Control Sidebar */}
                <div className="w-full lg:w-[440px] shrink-0 bg-[#0f111a] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col max-h-none lg:max-h-[85vh] lg:overflow-y-auto custom-scrollbar">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#c5a059] transition-all w-fit"
                    >
                        <i className="fas fa-arrow-left"></i>
                        Volver al Panel
                    </button>

                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <i className="fas fa-shield-halved text-[#c5a059] text-xl"></i>
                            <h1 className="text-xl md:text-2xl font-serif italic text-white">Mando Ejecutivo</h1>
                        </div>
                        <p className="text-white/40 text-[11px] leading-relaxed">
                            Crea masters HD agregando tu logo oficial, listones de fe personalizados y redes oficiales sin pérdida de resolución.
                        </p>
                    </div>

                    {/* Drag-and-drop Image Upload directly at top */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">1. Imagen de Fondo</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                        {imageSrc ? (
                            <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-3">
                                <span className="text-[10px] font-bold text-[#c5a059] truncate max-w-[200px]">✓ Imagen cargada</span>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white underline"
                                >
                                    Cambiar
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 bg-black/40 border border-white/10 rounded-xl hover:border-[#c5a059]/50 transition-all flex flex-col items-center gap-1.5"
                            >
                                <i className="fas fa-cloud-arrow-up text-lg text-white/30"></i>
                                <span className="text-[10px] font-bold text-white/60">Subir Imagen HD / Foto</span>
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation in Sidebar for better organization on PC & Mobile */}
                    <div className="flex border-b border-white/10 mb-6 bg-black/20 rounded-xl p-1.5 gap-1">
                        <button
                            onClick={() => setActiveTab('logo')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'logo' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🤠 Logo
                        </button>
                        <button
                            onClick={() => setActiveTab('ribbon')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ribbon' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🎗️ Listón
                        </button>
                        <button
                            onClick={() => setActiveTab('socials')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'socials' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            📱 Redes
                        </button>
                        <button
                            onClick={() => setActiveTab('watermark')}
                            className={`flex-1 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'watermark' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🏷️ Frases
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 mb-6">
                        
                        {/* LOGO TAB */}
                        {activeTab === 'logo' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] block mb-3">Sello Principal</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setLogoSelection('mando_ejecutivo')}
                                            className={`py-3 px-2 text-[9px] font-black uppercase rounded-xl border transition-all ${logoSelection === 'mando_ejecutivo' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20'}`}
                                        >
                                            🤠 Mando Ejecutivo
                                        </button>
                                        <button 
                                            onClick={() => setLogoSelection('diosmasgym')}
                                            className={`py-3 px-2 text-[9px] font-black uppercase rounded-xl border transition-all ${logoSelection === 'diosmasgym' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20'}`}
                                        >
                                            🏆 Diosmasgym
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setLogoSelection('none')}
                                        className={`w-full mt-2 py-2 text-[9px] font-black uppercase rounded-lg border transition-all ${logoSelection === 'none' ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-white/30 border-dashed border-white/10 hover:border-white/20'}`}
                                    >
                                        Ninguno
                                    </button>
                                </div>

                                {logoSelection !== 'none' && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Posición del Logo</label>
                                            <select 
                                                value={logoPosition}
                                                onChange={(e) => setLogoPosition(e.target.value as any)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none focus:border-[#c5a059]"
                                            >
                                                <option value="bottom-right">Abajo - Derecha</option>
                                                <option value="bottom-left">Abajo - Izquierda</option>
                                                <option value="top-right">Arriba - Derecha</option>
                                                <option value="top-left">Arriba - Izquierda</option>
                                                <option value="center">Centro</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-white/70">Tamaño</label>
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
                                    </>
                                )}
                            </div>
                        )}

                        {/* RIBBON TAB */}
                        {activeTab === 'ribbon' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] block mb-2">Estilo de Listón</label>
                                    <select 
                                        value={ribbonStyle}
                                        onChange={(e) => setRibbonStyle(e.target.value as any)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none focus:border-[#c5a059]"
                                    >
                                        <option value="none">Sin Listón</option>
                                        <option value="bottom">Cinta Inferior (Completa)</option>
                                        <option value="top">Cinta Superior (Completa)</option>
                                        <option value="diagonal-left">Esquina Superior Izquierda</option>
                                        <option value="diagonal-right">Esquina Superior Derecha</option>
                                    </select>
                                </div>

                                {ribbonStyle !== 'none' && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Lema o Frase del Listón</label>
                                            <input 
                                                type="text"
                                                value={ribbonText}
                                                onChange={(e) => setRibbonText(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c5a059] mb-3"
                                                placeholder="#PuroSeñorJesucristoCompa"
                                            />
                                            
                                            {/* Quick Phrases for Ribbon */}
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-2">Frases Rápidas del Lema</label>
                                            <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                                                {ribbonPhrases.map((phrase) => (
                                                    <button
                                                        key={phrase}
                                                        type="button"
                                                        onClick={() => setRibbonText(phrase)}
                                                        className={`p-1.5 text-[8.5px] font-bold text-left rounded bg-white/5 border border-white/5 hover:border-[#c5a059]/30 hover:bg-white/[0.08] transition-all truncate ${ribbonText === phrase ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'text-zinc-300'}`}
                                                    >
                                                        {phrase}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-white/70 block mb-2">Color</label>
                                                <select 
                                                    value={ribbonColor}
                                                    onChange={(e) => setRibbonColor(e.target.value as any)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 outline-none"
                                                >
                                                    <option value="gold">Oro Degradado</option>
                                                    <option value="black">Negro Carbón</option>
                                                    <option value="white">Blanco Nítido</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-white/70 block mb-2">Opacidad</label>
                                                <input 
                                                    type="range" 
                                                    min="30" max="100" 
                                                    value={ribbonOpacity}
                                                    onChange={(e) => setRibbonOpacity(Number(e.target.value))}
                                                    className="w-full accent-[#c5a059] mt-2"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* SOCIALS TAB */}
                        {activeTab === 'socials' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Mostrar Redes Diosmasgym</label>
                                    <input 
                                        type="checkbox" 
                                        checked={showSocials} 
                                        onChange={(e) => setShowSocials(e.target.checked)}
                                        className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                {showSocials && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Texto de Redes</label>
                                            <input 
                                                type="text"
                                                value={socialText}
                                                onChange={(e) => setSocialText(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#c5a059]"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Iconos Sociales</label>
                                            <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg border border-white/10">
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialInstagram} 
                                                        onChange={(e) => setSocialInstagram(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    Insta
                                                </label>
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialTikTok} 
                                                        onChange={(e) => setSocialTikTok(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    TikTok
                                                </label>
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialYouTube} 
                                                        onChange={(e) => setSocialYouTube(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    YouTube
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-white/70 block mb-2">Ubicación</label>
                                                <select 
                                                    value={socialPosition}
                                                    onChange={(e) => setSocialPosition(e.target.value as any)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 outline-none"
                                                >
                                                    <option value="bottom-left">Abajo - Izquierda</option>
                                                    <option value="bottom-right">Abajo - Derecha</option>
                                                    <option value="top-left">Arriba - Izquierda</option>
                                                    <option value="top-right">Arriba - Derecha</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-white/70 block mb-2">Color Redes</label>
                                                <select 
                                                    value={socialColor}
                                                    onChange={(e) => setSocialColor(e.target.value as any)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 outline-none"
                                                >
                                                    <option value="white">Blanco</option>
                                                    <option value="gold">Oro</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/10">
                                            <label className="text-[10px] font-bold text-white/70">Diseño en Bloque de Vidrio</label>
                                            <input 
                                                type="checkbox" 
                                                checked={socialBackground} 
                                                onChange={(e) => setSocialBackground(e.target.checked)}
                                                className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-bold text-white/70">Opacidad de Redes</label>
                                                <span className="text-[10px] text-[#c5a059]">{socialOpacity}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="30" max="100" 
                                                value={socialOpacity}
                                                onChange={(e) => setSocialOpacity(Number(e.target.value))}
                                                className="w-full accent-[#c5a059]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* WATERMARK TAB */}
                        {activeTab === 'watermark' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Fondo Marca de Fe</label>
                                    <input 
                                        type="checkbox" 
                                        checked={watermarkEnabled} 
                                        onChange={(e) => setWatermarkEnabled(e.target.checked)}
                                        className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                {watermarkEnabled && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Frase o Hashtag de Fondo</label>
                                            <input 
                                                type="text"
                                                value={watermarkText}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#c5a059] mb-3"
                                            />
                                            
                                            {/* Quick Phrases for Watermark */}
                                            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-2">Frases Rápidas de Fondo</label>
                                            <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                                                {watermarkPhrases.map((phrase) => (
                                                    <button
                                                        key={phrase}
                                                        type="button"
                                                        onClick={() => setWatermarkText(phrase)}
                                                        className={`p-1.5 text-[8.5px] font-bold text-left rounded bg-white/5 border border-white/5 hover:border-[#c5a059]/30 hover:bg-white/[0.08] transition-all truncate ${watermarkText === phrase ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' : 'text-zinc-300'}`}
                                                    >
                                                        {phrase}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Estilo de Malla</label>
                                            <select 
                                                value={watermarkStyle}
                                                onChange={(e) => setWatermarkStyle(e.target.value as any)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none"
                                            >
                                                <option value="diagonal">Diagonal Grande (Centro)</option>
                                                <option value="tiled">Malla Repetitiva (Patrón)</option>
                                                <option value="center">Central Horizontal</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-white/70">Opacidad</label>
                                                    <span className="text-[10px] text-[#c5a059]">{watermarkOpacity}%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="5" max="80" 
                                                    value={watermarkOpacity}
                                                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                                    className="w-full accent-[#c5a059]"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <label className="text-[10px] font-bold text-white/70">Tamaño</label>
                                                    <span className="text-[10px] text-[#c5a059]">{watermarkSize}%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="15" max="80" 
                                                    value={watermarkSize}
                                                    onChange={(e) => setWatermarkSize(Number(e.target.value))}
                                                    className="w-full accent-[#c5a059]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* Exif and Bottom Branding Option */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3 block">Seguridad Anti-IA</label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-lg border border-white/5 hover:border-[#c5a059]/40 transition-all cursor-pointer" onClick={() => setInjectExif(!injectExif)}>
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 block cursor-pointer">Inyectar Metadatos EXIF</label>
                                    <span className="text-[8px] text-white/40 uppercase tracking-widest">Firma digital de cámara física real</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={injectExif} 
                                    onChange={(e) => setInjectExif(e.target.checked)}
                                    className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                />
                            </div>

                            <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-lg border border-white/5">
                                <label className="text-[10px] font-bold text-white/70">Texto "DIOSMASGYM.COM" al pie</label>
                                <input 
                                    type="checkbox" 
                                    checked={showText} 
                                    onChange={(e) => setShowText(e.target.checked)}
                                    className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="pt-2 mt-auto">
                        <button 
                            onClick={handleDownload}
                            disabled={!imageSrc || isDownloading}
                            className="w-full py-4 bg-[#c5a059] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:hover:bg-[#c5a059] flex justify-center items-center gap-3 text-xs shadow-xl"
                        >
                            {isDownloading ? (
                                <><i className="fas fa-circle-notch fa-spin"></i> Procesando HD...</>
                            ) : (
                                <><i className="fas fa-download"></i> Descargar Master HD</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 bg-black rounded-3xl border border-white/5 flex flex-col overflow-hidden relative shadow-2xl min-h-[450px] lg:min-h-0">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0c14]">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Mesa de Trabajo / Master HD</span>
                        {originalSize && (
                            <span className="text-[9px] font-mono text-white/40 bg-white/5 px-3 py-1 rounded-full">
                                {originalSize.width}x{originalSize.height}px (Calidad Original Preservada)
                            </span>
                        )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjMDkwOTA5Ii8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMTExIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMxMTEiLz48L3N2Zz4=')]">
                        {imageSrc ? (
                            <canvas 
                                ref={previewCanvasRef} 
                                className="max-w-full max-h-[65vh] shadow-2xl ring-1 ring-white/10 rounded"
                            ></canvas>
                        ) : (
                            <div className="text-center opacity-30 p-6">
                                <i className="fas fa-image text-6xl mb-4 text-[#c5a059]"></i>
                                <p className="text-xs font-black uppercase tracking-[0.2em] max-w-xs mx-auto">Sube una imagen para previsualizar tu diseño</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AntiAIWatermark;
