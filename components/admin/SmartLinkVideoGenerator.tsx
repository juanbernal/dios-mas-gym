import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const noise = (x: number, y: number) => {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
};

const smoothNoise = (t: number) => {
    const t0 = Math.floor(t);
    const t1 = t0 + 1;
    const f = t - t0;
    const u = f * f * (3.0 - 2.0 * f);
    return noise(t0, 0) * (1 - u) + noise(t1, 0) * u;
};

export const SMARTLINK_CREATOR_VERSION = '2.0';

const SmartLinkVideoGenerator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    
    // Custom Background/Cover Image State (Optional Override)
    const [promoImageUrl, setPromoImageUrl] = useState<string | null>(location.state?.promoImage || null);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const blurredBgCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const grainCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const getGrainCanvas = () => {
        if (grainCanvasRef.current) return grainCanvasRef.current;
        const gCanvas = document.createElement('canvas');
        gCanvas.width = 400;
        gCanvas.height = 400;
        const gCtx = gCanvas.getContext('2d');
        if (gCtx) {
            const imgData = gCtx.createImageData(400, 400);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const val = Math.floor(Math.random() * 255);
                data[i] = val;
                data[i+1] = val;
                data[i+2] = val;
                data[i+3] = 16; // Microscopic film grain opacity
            }
            gCtx.putImageData(imgData, 0, 0);
        }
        grainCanvasRef.current = gCanvas;
        return gCanvas;
    };

    // Animation Refs for state-consistency
    const titleRef = useRef("");
    const artistRef = useRef("");
    const promoImgRef = useRef<string | null>(null);
    const localCoverRef = useRef<string | null>(null);

    useEffect(() => {
        if (!bgImageRef.current) {
            bgImageRef.current = new Image();
            bgImageRef.current.crossOrigin = "anonymous";
        }
    }, []);

    useEffect(() => { 
        titleRef.current = customTitle; 
    }, [customTitle]);
    
    useEffect(() => { 
        artistRef.current = customArtist; 
    }, [customArtist]);

    useEffect(() => { 
        const url = promoImageUrl || localCoverUrl || selectedSong?.cover || "";
        if (bgImageRef.current) {
            if (url.startsWith('blob:') || url.startsWith('data:')) {
                bgImageRef.current.removeAttribute('crossOrigin');
            } else {
                bgImageRef.current.crossOrigin = "anonymous";
            }
            
            const handleBlurGeneration = () => {
                const img = bgImageRef.current;
                if (!img || img.naturalWidth === 0) return;
                
                const canvas = document.createElement('canvas');
                canvas.width = 540;
                canvas.height = 960;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, 540, 960);
                    blurredBgCanvasRef.current = canvas;
                }
            };

            bgImageRef.current.onload = handleBlurGeneration;
            if (bgImageRef.current.complete && bgImageRef.current.naturalWidth > 0) {
                handleBlurGeneration();
            }

            if (bgImageRef.current.src !== url) {
                bgImageRef.current.src = url;
            }
        }
        promoImgRef.current = promoImageUrl; 
        localCoverRef.current = localCoverUrl;
    }, [promoImageUrl, localCoverUrl, selectedSong?.cover]);

    useEffect(() => {
        Promise.all([
            fetchMusicCatalog('diosmasgym'),
            fetchMusicCatalog('juan614')
        ]).then(([diosmasgym, juan614]) => {
            setCatalog([...diosmasgym, ...juan614]);
            setIsLoading(false);

            const incomingSong = location.state?.song as MusicItem;
            if (incomingSong) {
                setSelectedSong(incomingSong);
                setCustomTitle(incomingSong.name);
                setCustomArtist(incomingSong.artist || "Dios Mas Gym");
            }
        });
    }, [location.state]);

    const drawRef = useRef<() => void>(() => {});

    const renderCanvas = (timeOverride?: number) => {
        if (!canvasRef.current || !selectedSong) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        const w = 1080;
        const h = 1920;
        const time = timeOverride ?? Date.now() / 1000;
        
        // Auto-detect theme (Juan style northern acoustic or Dios Mas Gym urban dark gold)
        const isJuan = (artistRef.current || selectedSong.artist || '').toLowerCase().includes('juan');
        const accentColor = isJuan ? '#c89d53' : '#c5a059';

        // Organic camera drift (for aesthetic premium feel)
        const nX = smoothNoise(time * 0.15) - 0.5;
        const nY = smoothNoise(time * 0.22 + 50) - 0.5;
        const floatZoom = 8 + (smoothNoise(time * 0.1) * 10);

        // 1. Base background
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.fillRect(0, 0, w, h);

        // 2. High-quality smooth bilinear blurred background cover
        const img = bgImageRef.current;
        const isImgReady = img && img.complete && img.naturalWidth !== 0 && img.src !== "";

        if (isImgReady) {
            ctx.save();
            ctx.globalAlpha = isJuan ? 0.35 : 0.45;
            const bgZoom = 1.38 + smoothNoise(time * 0.05) * 0.05;
            const blurredCanvas = blurredBgCanvasRef.current;
            try {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                if (blurredCanvas) {
                    ctx.drawImage(blurredCanvas, (w - w*bgZoom)/2 + (nX * 15), (h - h*bgZoom)/2 + (nY * 15), w*bgZoom, h*bgZoom);
                } else {
                    ctx.drawImage(img, (w - w*bgZoom)/2 + (nX * 15), (h - h*bgZoom)/2 + (nY * 15), w*bgZoom, h*bgZoom);
                }
            } catch (e) {
                console.warn("Background drawing failed", e);
            }
            ctx.restore();

            // Overlay gradient for maximum glassmorphism contrast
            ctx.save();
            const overlayGrad = ctx.createRadialGradient(w/2, h/2, 100, w/2, h/2, w);
            if (isJuan) {
                overlayGrad.addColorStop(0, 'rgba(26, 20, 18, 0.45)');
                overlayGrad.addColorStop(1, 'rgba(26, 20, 18, 0.95)');
            } else {
                overlayGrad.addColorStop(0, 'rgba(5, 7, 10, 0.40)');
                overlayGrad.addColorStop(1, 'rgba(5, 7, 10, 0.93)');
            }
            ctx.fillStyle = overlayGrad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // Earthy dot texture for Juan style
        if (isJuan) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#d3c19e';
            const dotSpacing = 40;
            for (let xOffset = 0; xOffset < w; xOffset += dotSpacing) {
                for (let yOffset = 0; yOffset < h; yOffset += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(xOffset + 20, yOffset + 20, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // 3. Ambient lighting & vignette
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(0,0,0,${0.35 + smoothNoise(time * 0.5) * 0.05})`);
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, isJuan ? 'rgba(26,20,18,1)' : 'rgba(5,7,10,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 4. Subtle gold / light floating particles
        ctx.fillStyle = isJuan ? 'rgba(200, 157, 83, 0.35)' : 'rgba(197, 160, 89, 0.38)';
        for(let i=0; i<20; i++) {
            const seedX = smoothNoise(time * 0.06 + i * 4);
            const seedY = smoothNoise(time * 0.1 + i * 8);
            
            const px = (seedX * 1.4) * w;
            const py = ((seedY * 1.1) % 1) * h;
            
            ctx.save();
            ctx.globalAlpha = 0.15 + smoothNoise(time * 1.2 + i) * 0.3;
            ctx.beginPath();
            ctx.ellipse(px, py, 2.5 + seedX * 2.5, 2 + seedY * 2, seedX * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Film grain pattern overlay
        ctx.save();
        ctx.globalAlpha = 0.08;
        const grainPattern = getGrainCanvas();
        const gOffsetX = Math.floor(Math.random() * 200);
        const gOffsetY = Math.floor(Math.random() * 200);
        ctx.fillStyle = ctx.createPattern(grainPattern, 'repeat') || '#000';
        ctx.translate(gOffsetX, gOffsetY);
        ctx.fillRect(-gOffsetX, -gOffsetY, w, h);
        ctx.restore();

        // 5. Header Link Bar
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        // Chain link icon (FontAwesome \uf0c1)
        ctx.font = '900 24px "Font Awesome 6 Free"';
        ctx.fillText('\uf0c1', 370, 120);
        ctx.font = '900 22px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '3px';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.fillText('APP.DIOSMASGYM.COM/LINK', 560, 120);
        ctx.restore();

        // 6. Cover Art with premium gold ambient glow
        const coverSize = 580;
        const coverX = (w - coverSize) / 2 + (nX * 6);
        const coverY = 220 + (nY * 6);
        const coverRadius = 36;

        if (isImgReady) {
            ctx.save();
            ctx.shadowBlur = 80 + smoothNoise(time) * 30;
            ctx.shadowColor = accentColor;
            
            ctx.beginPath();
            ctx.roundRect(coverX, coverY, coverSize, coverSize, coverRadius);
            ctx.closePath();
            ctx.clip();
            try {
                // Subtle camera float zoom
                ctx.drawImage(img, coverX - floatZoom, coverY - floatZoom, coverSize + floatZoom*2, coverSize + floatZoom*2);
            } catch (e) {
                console.warn("Cover drawing failed", e);
            }
            ctx.restore();

            // Symmetrical border lines behind the cover for Juan style
            if (isJuan) {
                ctx.save();
                ctx.strokeStyle = 'rgba(139, 90, 43, 0.25)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(coverX - 12, coverY - 12, coverSize + 24, coverSize + 24, coverRadius + 6);
                ctx.stroke();
                ctx.restore();
            }
        } else {
            // Placeholder rectangle if no image loaded
            ctx.save();
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
            ctx.setLineDash([15, 15]);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(coverX, coverY, coverSize, coverSize, coverRadius);
            ctx.stroke();
            ctx.restore();
        }

        // 7. Typography (Song Name & Artist)
        ctx.textAlign = 'center';
        
        ctx.save();
        ctx.translate(nX * 5, nY * 5);

        // Song Title
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        if (isJuan) {
            ctx.font = 'italic 700 62px "Playfair Display", serif';
        } else {
            ctx.font = '900 64px Poppins, sans-serif';
        }
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        
        const titleText = (titleRef.current || selectedSong.name || "S/N").toUpperCase();
        
        // Auto-scale font size if title is too long
        let titleFontSize = 64;
        if (titleText.length > 15) {
            titleFontSize = Math.max(38, Math.floor(64 * (15 / titleText.length)));
            ctx.font = isJuan 
                ? `italic 700 ${titleFontSize}px "Playfair Display", serif`
                : `900 ${titleFontSize}px Poppins, sans-serif`;
        }
        
        ctx.fillText(titleText, 540, 875, 900);

        // Artist Name
        ctx.fillStyle = accentColor;
        ctx.font = '700 26px Poppins, sans-serif';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '10px';
        ctx.shadowBlur = 10;
        ctx.fillText((artistRef.current || selectedSong.artist || 'DIOS MAS GYM').toUpperCase(), 540, 940, 900);
        
        ctx.restore();

        // 8. Semi-transparent Glassmorphic Player Card (Default/Ready State for Image)
        const playerW = 800;
        const playerH = 190;
        const playerX = 140;
        const playerY = 990;
        const playerRadius = 30;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(42, 34, 31, 0.72)' : 'rgba(5, 7, 10, 0.58)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.22)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(playerX, playerY, playerW, playerH, playerRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Player Tag: Previa & Dot
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Fixed nice red dot for image
        ctx.beginPath();
        ctx.arc(185, 1030, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accentColor;
        ctx.font = '900 18px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText('PREVIA (60 SEGUNDOS)', 205, 1031);

        ctx.textAlign = 'right';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.globalAlpha = 0.4;
        ctx.font = '700 16px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
        ctx.fillText('Escucha un fragmento', 900, 1031);
        ctx.restore();

        // Play circular button
        const playBtnX = 210;
        const playBtnY = 1115;
        const playBtnR = 40;

        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = accentColor;
        ctx.beginPath();
        ctx.arc(playBtnX, playBtnY, playBtnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw Play icon inside Play button
        ctx.save();
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.font = '900 24px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf04b', playBtnX + 2, playBtnY); // Play icon (\uf04b)
        ctx.restore();

        // Timer and Playback label
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 18px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText('LISTO PARA ESCUCHAR', 280, 1095);

        ctx.textAlign = 'right';
        ctx.font = '700 18px Courier, monospace';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
        ctx.fillText('05s / 60s', 900, 1095);
        ctx.restore();

        // Player Progress Track
        const trackX = 280;
        const trackY = 1125;
        const trackW = 620;
        const trackH = 10;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW, trackH, 5);
        ctx.fill();

        // Elegant default progress fill (about 10% completed)
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW * 0.08, trackH, 5);
        ctx.fill();
        ctx.restore();

        // 9. Platform Buttons Grid (6 buttons, 2 columns, Y: 1210 to 1660)
        const btnW = 380;
        const btnH = 135;
        const gridX1 = 140;
        const gridX2 = 560;
        const rowGap = 35;
        const btnRadius = 24;

        const platforms = [
            { name: 'Spotify', color: '#1DB954', iconChar: '\uf1bc', x: gridX1, y: 1210 },
            { name: 'Apple Music', color: '#FA243C', iconChar: '\uf179', x: gridX2, y: 1210 },
            { name: 'YouTube', color: '#FF0000', iconChar: '\uf167', x: gridX1, y: 1210 + btnH + rowGap },
            { name: 'Amazon Music', color: '#00A8E1', iconChar: '\uf270', x: gridX2, y: 1210 + btnH + rowGap },
            { name: 'Tidal', color: '#ffffff', iconChar: '\uf001', x: gridX1, y: 1210 + (btnH + rowGap) * 2 },
            { name: 'Deezer', color: '#FEAA2D', iconChar: '\uf001', x: gridX2, y: 1210 + (btnH + rowGap) * 2 }
        ];

        platforms.forEach(p => {
            // Draw glassmorphic button outline
            ctx.save();
            ctx.fillStyle = isJuan ? 'rgba(42, 34, 31, 0.55)' : 'rgba(255, 255, 255, 0.04)';
            ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.12)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.roundRect(p.x, p.y, btnW, btnH, btnRadius);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Floating icon circle inside the button
            const icX = p.x + btnW / 2;
            const icY = p.y + 45;

            ctx.save();
            ctx.fillStyle = isJuan ? 'rgba(0,0,0,0.18)' : 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(icX, icY, 28, 0, Math.PI * 2);
            ctx.fill();

            // Paint brand icon
            ctx.fillStyle = p.color;
            ctx.font = '900 28px "Font Awesome 6 Brands"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Fallback to Free Music Note for Tidal/Deezer if brand glyphs missing
            if (p.name === 'Tidal' || p.name === 'Deezer') {
                ctx.font = '900 26px "Font Awesome 6 Free"';
            }
            ctx.fillText(p.iconChar, icX, icY);
            ctx.restore();

            // Platform text label
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
            ctx.font = '700 16px Poppins';
            if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '1px';
            ctx.fillText(p.name.toUpperCase(), p.x + btnW / 2, p.y + 98);
            ctx.restore();
        });

        // 10. Bell Capsule Notification
        const bellW = 800;
        const bellH = 75;
        const bellX = 140;
        const bellY = 1735;
        const bellRadius = 37;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(42, 34, 31, 0.72)' : 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.22)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(bellX, bellY, bellW, bellH, bellRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Bell content (bell icon + subscription text)
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.fillStyle = accentColor;
        ctx.font = '900 20px "Font Awesome 6 Free"';
        ctx.fillText('\uf0f3', 270, bellY + bellH/2);

        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 16px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2.5px';
        ctx.fillText('AVÍSAME DE NUEVOS ESTRENOS', 550, bellY + bellH/2);
        ctx.restore();

        // 11. Community Social Icons
        const socY = 1855;
        const socR = 25;
        const socials = [
            { x: 450, icon: '\uf16d', color: '#ffffff' }, // Instagram (\uf16d)
            { x: 540, icon: '\uf001', color: '#ffffff' }, // TikTok (\uf001 - fallback)
            { x: 630, icon: '\uf167', color: '#ffffff' }  // YouTube (\uf167)
        ];

        socials.forEach(s => {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.arc(s.x, socY, socR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = s.color;
            ctx.font = '900 20px "Font Awesome 6 Brands"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (s.x === 540) {
                ctx.font = '900 18px "Font Awesome 6 Free"';
            }
            ctx.fillText(s.icon, s.x, socY);
            ctx.restore();
        });
    };

    const draw = () => renderCanvas();

    useEffect(() => {
        drawRef.current = draw;
    });

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            if (selectedSong) {
                drawRef.current();
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [selectedSong]);

    const downloadImage = () => {
        if (!canvasRef.current || !selectedSong) return;
        try {
            renderCanvas();
            const dataUrl = canvasRef.current.toDataURL("image/png");
            const a = document.createElement('a');
            const songName = (customTitle || selectedSong.name || 'smartlink').replace(/\s+/g, '_');
            a.href = dataUrl;
            a.download = `SmartLink_${songName}.png`;
            a.click();
        } catch (e) {
            console.error("Error al descargar la imagen:", e);
            alert("No se pudo generar la imagen para descargar. Si cargaste una portada personalizada remota, verifica que admita CORS.");
        }
    };

    const filteredCatalog = catalog.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
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
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">SmartLink <span className="text-[#c5a059]">Image Creator</span> <span className="text-white/20 ml-2">v{SMARTLINK_CREATOR_VERSION}</span></h1>
                    <div className="flex items-center gap-1.5 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-full px-2.5 py-0.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-[#c5a059]">High Resolution</span>
                    </div>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                {/* Control Column */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest">1. Seleccionar Canción del Catálogo</h3>
                            {location.state?.song && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20 animate-pulse">
                                    AUTO-SYNC
                                </span>
                            )}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar canción..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mb-6 outline-none focus:border-[#c5a059]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            {filteredCatalog.map(song => (
                                <button 
                                    key={song.id}
                                    onClick={() => {
                                        setSelectedSong(song);
                                        setCustomTitle(song.name);
                                        setCustomArtist(song.artist || "Dios Mas Gym");
                                    }}
                                    className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all ${selectedSong?.id === song.id ? 'bg-[#c5a059] text-black' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <img src={song.cover} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                    <div className="text-left overflow-hidden">
                                        <div className="text-[11px] font-bold truncate">{song.name}</div>
                                        <div className={`text-[9px] uppercase tracking-widest font-black opacity-60 ${selectedSong?.id === song.id ? 'text-black' : 'text-[#c5a059]'}`}>{song.artist}</div>
                                    </div>
                                </button>
                            ))}
                            {filteredCatalog.length === 0 && (
                                <div className="text-center py-6 opacity-30 text-[10px] uppercase font-black tracking-widest">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>

                        {selectedSong && (
                            <div className="pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Título en la Imagen</label>
                                    <input 
                                        type="text" 
                                        value={customTitle} 
                                        onChange={e => setCustomTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all font-bold"
                                        placeholder="Ej: TITULO DE CANCIÓN"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Artista en la Imagen</label>
                                    <input 
                                        type="text" 
                                        value={customArtist} 
                                        onChange={e => setCustomArtist(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all"
                                        placeholder="Ej: DIOS MAS GYM"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedSong && (
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
                                <div>
                                    <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-3">2. Portada Personalizada (Opcional)</h3>
                                    <p className="text-[9px] text-white/40 leading-relaxed mb-4">
                                        Por defecto se usará la portada oficial cargada en el catálogo. Si lo deseas, puedes subir una imagen de fondo diferente desde tu dispositivo para personalizar este diseño.
                                    </p>
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <i className="fas fa-image text-xl text-[#c5a059] mb-2"></i>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{promoImageUrl ? "Imagen Personalizada Cargada" : "Subir Portada Alternativa"}</p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setPromoImageUrl(URL.createObjectURL(file));
                                        }} />
                                    </label>
                                    {promoImageUrl && (
                                        <button 
                                            onClick={() => {
                                                setPromoImageUrl(null);
                                                setLocalCoverUrl(null);
                                            }}
                                            className="w-full mt-2 text-[8px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all text-center"
                                        >
                                            Restaurar Carátula por Defecto
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedSong && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-left-4 space-y-4">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest">3. Descargar Promocional</h3>
                            <p className="text-[9.5px] text-white/40 leading-relaxed">
                                Genera una captura de alta resolución 9:16 de tu SmartLink. Súbela como historia/estado en tus redes sociales y añade el audio oficialmente utilizando el sticker nativo de Instagram/TikTok para incrementar tus streams oficiales.
                            </p>
                            <button 
                                onClick={downloadImage}
                                className="w-full py-5 bg-[#c5a059] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-2 font-bold shadow-lg"
                            >
                                <i className="fas fa-download text-xs"></i> Descargar Imagen (9:16)
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center min-h-[600px] bg-black/40 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    {!selectedSong ? (
                        <div className="text-center text-white/20">
                            <i className="fas fa-mobile-retro text-6xl mb-6"></i>
                            <p className="text-xs uppercase font-black tracking-[0.3em]">Selecciona una canción del catálogo para ver el diseño</p>
                        </div>
                    ) : (
                        <div className="relative group p-4">
                            <canvas 
                                ref={canvasRef}
                                width={1080}
                                height={1920}
                                className="w-[260px] h-[462px] md:w-[320px] md:h-[568px] bg-black rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-[2rem] pointer-events-none">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Diseño Promocional SmartLink (9:16)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartLinkVideoGenerator;
