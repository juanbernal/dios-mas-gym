import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';
import { getCorsFriendlyUrl } from '../../services/imageHelpers';

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

export const SMARTLINK_CREATOR_VERSION = '8.0 (4K UHD - Ultra Sharp Master - Proxy CORS-Safe)';

const SmartLinkVideoGenerator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
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
                data[i+3] = 14; // Microscopic film grain opacity
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
        const corsUrl = getCorsFriendlyUrl(url);

        setIsImageLoaded(false); // Reset load state for new image loading

        if (bgImageRef.current) {
            if (corsUrl.startsWith('blob:') || corsUrl.startsWith('data:')) {
                bgImageRef.current.removeAttribute('crossOrigin');
            } else {
                bgImageRef.current.crossOrigin = "anonymous";
            }
            
            const handleBlurGeneration = () => {
                const img = bgImageRef.current;
                if (!img || img.naturalWidth === 0) return;
                
                const canvas = document.createElement('canvas');
                canvas.width = 960;
                canvas.height = 540;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, 960, 540);
                    blurredBgCanvasRef.current = canvas;
                }
                setIsImageLoaded(true); // High-res image fully loaded and processed!
            };

            bgImageRef.current.onload = handleBlurGeneration;
            
            // Graceful fallback system for image load errors (e.g. YouTube maxresdefault.jpg returning 404)
            bgImageRef.current.onerror = () => {
                const currentSrc = bgImageRef.current?.src || "";
                if (currentSrc.includes('maxresdefault.jpg')) {
                    console.warn("YouTube maxresdefault.jpg failed, falling back to sddefault.jpg");
                    bgImageRef.current!.src = getCorsFriendlyUrl(url.replace('maxresdefault.jpg', 'sddefault.jpg'));
                } else if (currentSrc.includes('sddefault.jpg')) {
                    console.warn("YouTube sddefault.jpg failed, falling back to hqdefault.jpg");
                    bgImageRef.current!.src = getCorsFriendlyUrl(url.replace('sddefault.jpg', 'hqdefault.jpg'));
                } else if (currentSrc.includes('hqdefault.jpg')) {
                    console.warn("YouTube hqdefault.jpg failed, falling back to mqdefault.jpg");
                    bgImageRef.current!.src = getCorsFriendlyUrl(url.replace('hqdefault.jpg', 'mqdefault.jpg'));
                } else {
                    console.error("Failed to load image:", currentSrc);
                    const fallbackUrl = selectedSong?.cover || "";
                    if (fallbackUrl && currentSrc !== fallbackUrl) {
                        bgImageRef.current!.src = getCorsFriendlyUrl(fallbackUrl);
                    } else {
                        setIsImageLoaded(true); // Allow download with fallback / spinner off
                    }
                }
            };

            if (bgImageRef.current.complete && bgImageRef.current.naturalWidth > 0) {
                handleBlurGeneration();
            } else {
                setIsImageLoaded(false);
            }

            if (bgImageRef.current.src !== corsUrl) {
                bgImageRef.current.src = corsUrl;
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

    const getRelatedTracks = () => {
        if (!selectedSong) return [];
        // Find other songs by the same artist first
        const sameArtist = catalog.filter(
            s => s.artist.toLowerCase().includes(selectedSong.artist.toLowerCase()) && s.id !== selectedSong.id
        );
        if (sameArtist.length > 0) return sameArtist.slice(0, 3);
        // Fallback to general catalog if no other same-artist tracks are found
        return catalog.filter(s => s.id !== selectedSong.id).slice(0, 3);
    };

    const drawRef = useRef<() => void>(() => {});

    const renderCanvas = (timeOverride?: number, isStatic = false) => {
        if (!canvasRef.current || !selectedSong) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Double internal scaling factor to support 3840x2160 UHD output on 1920x1080 coordinate system
        ctx.save();
        ctx.scale(2, 2);

        // Force Crisp Bilinear Rendering Settings *after* scaling to prevent browser defaults from resetting
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1920x1080 Desktop HD Resolution
        const w = 1920;
        const h = 1080;
        const time = timeOverride ?? Date.now() / 1000;
        
        // Auto-detect theme (Juan style northern acoustic or Dios Mas Gym urban dark gold)
        const isJuan = (artistRef.current || selectedSong.artist || '').toLowerCase().includes('juan');
        const accentColor = isJuan ? '#c89d53' : '#c5a059';

        // Symmetrical float drifts (Anti-AI camera movements - disabled for pixel-perfect static downloads)
        const driftX = isStatic ? 0 : (smoothNoise(time * 0.12) - 0.5);
        const driftY = isStatic ? 0 : (smoothNoise(time * 0.18 + 50) - 0.5);
        const floatZoom = isStatic ? 0 : (6 + (smoothNoise(time * 0.08) * 8));

        // 1. Base dark background
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.fillRect(0, 0, w, h);

        // 2. Blurred background cover image (HD Blur using native canvas filters)
        const img = bgImageRef.current;
        const isImgReady = img && img.complete && img.naturalWidth !== 0 && img.src !== "";

        if (isImgReady) {
            ctx.save();
            ctx.globalAlpha = isJuan ? 0.22 : 0.30;
            const bgZoom = 1.30 + (isStatic ? 0.025 : smoothNoise(time * 0.05) * 0.05);
            
            // Keep background perfectly sharp and high quality matching original cover art
            if ('filter' in ctx) {
                ctx.filter = 'none';
            }
            
            try {
                // Round all coordinates to avoid blurry fractional pixel rendering
                const targetW = Math.round(w * bgZoom);
                const targetH = Math.round(h * bgZoom);
                const targetX = Math.round((w - targetW) / 2 + (driftX * 15));
                const targetY = Math.round((h - targetH) / 2 + (driftY * 15));
                
                ctx.drawImage(img, targetX, targetY, targetW, targetH);
            } catch (e) {
                console.warn("Background drawing failed", e);
            }
            ctx.restore();
            
            // Ensure filter is reset
            if ('filter' in ctx) {
                ctx.filter = 'none';
            }

            // Overlay dark vignette gradient for maximum content pop
            ctx.save();
            const overlayGrad = ctx.createRadialGradient(w/2, h/2, 200, w/2, h/2, w);
            if (isJuan) {
                overlayGrad.addColorStop(0, 'rgba(26, 20, 18, 0.40)');
                overlayGrad.addColorStop(1, 'rgba(26, 20, 18, 0.93)');
            } else {
                overlayGrad.addColorStop(0, 'rgba(5, 7, 10, 0.35)');
                overlayGrad.addColorStop(1, 'rgba(5, 7, 10, 0.94)');
            }
            ctx.fillStyle = overlayGrad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // Earthy dot texture for Juan style
        if (isJuan) {
            ctx.save();
            ctx.globalAlpha = 0.15;
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

        // Film grain pattern overlay (Crispy texture overlay)
        ctx.save();
        ctx.globalAlpha = 0.05;
        const grainPattern = getGrainCanvas();
        const gOffsetX = Math.floor(Math.random() * 200);
        const gOffsetY = Math.floor(Math.random() * 200);
        ctx.fillStyle = ctx.createPattern(grainPattern, 'repeat') || '#000';
        ctx.translate(gOffsetX, gOffsetY);
        ctx.fillRect(-gOffsetX, -gOffsetY, w, h);
        ctx.restore();

        // 3. Ambient lighting & vignette edges
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(0,0,0,${0.25 + (isStatic ? 0.025 : smoothNoise(time * 0.5) * 0.05)})`);
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, isJuan ? 'rgba(26,20,18,0.96)' : 'rgba(5,7,10,0.96)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle gold / light floating particles
        ctx.fillStyle = isJuan ? 'rgba(200, 157, 83, 0.35)' : 'rgba(197, 160, 89, 0.38)';
        for(let i=0; i<15; i++) {
            const seedX = isStatic ? 0.35 : smoothNoise(time * 0.04 + i * 4);
            const seedY = isStatic ? 0.65 : smoothNoise(time * 0.07 + i * 8);
            
            const px = (seedX * 1.4) * w;
            const py = ((seedY * 1.1) % 1) * h;
            
            ctx.save();
            ctx.globalAlpha = isStatic ? 0.15 : (0.08 + smoothNoise(time * 1.2 + i) * 0.18);
            ctx.beginPath();
            ctx.ellipse(px, py, 2.5 + seedX * 2.5, 2 + seedY * 2, seedX * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ===================================================
        // PROPORTIONAL TWIN-COLUMN DESKTOP PARITY SYSTEM
        // ===================================================
        // Col A (Left): Centered around X = 500, width = 640
        // Col B (Right): Card wrapper from X = 1080 to 1640 (width = 560, height = 820)
        
        // ------------------------------------------
        // COL A: LEFT COLUMN (Centered layout matching website desktop)
        // ------------------------------------------
        const colCenterX = 500;
        
        // Cover art size 420x420, centered on X = 500. Top Y = 130
        const coverSize = 420;
        const coverX = Math.round(colCenterX - (coverSize / 2) + (driftX * 3));
        const coverY = Math.round(130 + (driftY * 3));
        const coverRadius = 20;

        if (isImgReady) {
            // Draw Dios Mas Gym golden pulsing blur halo behind cover
            if (!isJuan) {
                ctx.save();
                ctx.shadowBlur = isStatic ? 65 : (60 + smoothNoise(time) * 20);
                ctx.shadowColor = accentColor;
                
                // Subtle pulse glow
                const glowScale = isStatic ? 1.02 : (1.01 + smoothNoise(time * 0.5) * 0.015);
                ctx.fillStyle = 'rgba(197, 160, 89, 0.22)';
                ctx.beginPath();
                ctx.roundRect(
                    Math.round(colCenterX - (coverSize * glowScale)/2), 
                    Math.round(coverY - (coverSize * (glowScale - 1))/2), 
                    Math.round(coverSize * glowScale), 
                    Math.round(coverSize * glowScale), 
                    coverRadius + 4
                );
                ctx.fill();
                ctx.restore();
            }

            // Draw Juan rotated border line behind cover (3 degrees rotate)
            if (isJuan) {
                ctx.save();
                ctx.translate(colCenterX, coverY + coverSize/2);
                ctx.rotate(3 * Math.PI / 180); // Rotate 3 degrees
                ctx.strokeStyle = 'rgba(139, 90, 43, 0.28)';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.roundRect(-coverSize/2 - 8, -coverSize/2 - 8, coverSize + 16, coverSize + 16, coverRadius + 4);
                ctx.stroke();
                ctx.restore();
            }

            // Draw crisp high-res cover image
            ctx.save();
            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.roundRect(coverX, coverY, coverSize, coverSize, coverRadius);
            ctx.closePath();
            ctx.clip();
            try {
                const drawSize = Math.round(coverSize + floatZoom*2);
                const drawX = Math.round(coverX - floatZoom);
                const drawY = Math.round(coverY - floatZoom);
                
                // Universal center-cropping to maintain 1:1 aspect ratio without stretching/distortion or pixelation
                const imgW = img.naturalWidth;
                const imgH = img.naturalHeight;
                const srcSize = Math.min(imgW, imgH);
                const sx = Math.round((imgW - srcSize) / 2);
                const sy = Math.round((imgH - srcSize) / 2);
                
                ctx.drawImage(img, sx, sy, srcSize, srcSize, drawX, drawY, drawSize, drawSize);
            } catch (e) {
                console.warn("Cover drawing failed", e);
            }
            ctx.restore();
        } else {
            ctx.save();
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
            ctx.setLineDash([15, 15]);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(coverX, coverY, coverSize, coverSize, coverRadius);
            ctx.stroke();
            ctx.restore();
        }

        // Title - Centered Georgia or Playfair display, elegant Mixed-Case!
        ctx.save();
        ctx.translate(Math.round(driftX * 2), Math.round(driftY * 2));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        let titleFontSize = 46;
        ctx.font = isJuan
            ? `italic 700 ${titleFontSize}px "Playfair Display", Georgia, serif`
            : `italic 700 ${titleFontSize}px Georgia, "Playfair Display", serif`;
            
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        
        const titleText = customTitle || selectedSong.name || "S/N";
        let textWidth = ctx.measureText(titleText).width;
        
        // Auto-scale font size to fit the column width perfectly
        if (textWidth > 600) {
            titleFontSize = Math.max(26, Math.floor(46 * (600 / textWidth)));
            ctx.font = isJuan
                ? `italic 700 ${titleFontSize}px "Playfair Display", Georgia, serif`
                : `italic 700 ${titleFontSize}px Georgia, "Playfair Display", serif`;
        }
        
        ctx.fillText(titleText, colCenterX, 595);

        // Artist Name - gold uppercase centered
        ctx.fillStyle = accentColor;
        ctx.font = '700 16px Poppins, sans-serif';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '6px';
        ctx.shadowBlur = 8;
        ctx.fillText((customArtist || selectedSong.artist || 'DIOS MAS GYM').toUpperCase(), colCenterX, 655);
        ctx.restore();

        // Left Player Card (Beautifully centered, width = 460px to match cover cleanly)
        const playerW = 460;
        const playerH = 135;
        const playerX = colCenterX - (playerW / 2);
        const playerY = 695;
        const playerRadius = 24;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(42, 34, 31, 0.72)' : 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.22)' : 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(playerX, playerY, playerW, playerH, playerRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Player Live indicator red dot + labels
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.beginPath();
        ctx.arc(playerX + 35, playerY + 32, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accentColor;
        ctx.font = '900 13px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText('PREVIA (60 SEGUNDOS)', playerX + 50, playerY + 33);

        ctx.textAlign = 'right';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.globalAlpha = 0.4;
        ctx.font = '700 11.5px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
        ctx.fillText('Escucha un fragmento', playerX + playerW - 32, playerY + 33);
        ctx.restore();

        // Play Button circular (solid gold)
        const playBtnX = playerX + 55;
        const playBtnY = playerY + 90;
        const playBtnR = 22;

        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 8;
        ctx.shadowColor = accentColor;
        ctx.beginPath();
        ctx.arc(playBtnX, playBtnY, playBtnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Play glyph icon (centered inside circular button)
        ctx.save();
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.font = '900 14px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf04b', playBtnX + 1.5, playBtnY);
        ctx.restore();

        // Timer labels
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 12.5px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '1px';
        ctx.fillText('LISTO PARA ESCUCHAR', playerX + 95, playerY + 81);

        ctx.textAlign = 'right';
        ctx.font = '700 12.5px Courier, monospace';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
        ctx.fillText('05s / 60s', playerX + playerW - 32, playerY + 81);
        ctx.restore();

        // Player track progress bar
        const trackX = playerX + 95;
        const trackY = playerY + 98;
        const trackW = playerW - 127;
        const trackH = 5;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW, trackH, 2.5);
        ctx.fill();

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW * 0.08, trackH, 2.5);
        ctx.fill();
        ctx.restore();

        // ----------------------------------------------------
        // COL B: RIGHT COLUMN (Premium Glassmorphic Card Container)
        // ----------------------------------------------------
        const cardX = 1080;
        const cardY = 130;
        const cardW = 560;
        const cardH = 820;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(42, 34, 31, 0.85)' : 'rgba(255, 255, 255, 0.05)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.22)' : 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 32);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // "¡CANCIÓN COMPLETA AQUÍ! ⬇" Gold Pill Button Badge
        const badgeW = 360;
        const badgeH = 45;
        const badgeX = cardX + (cardW - badgeW) / 2;
        const badgeY = cardY + 30;

        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = accentColor + '55'; // 33% opacity
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 22.5);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.font = '900 13px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¡CANCIÓN COMPLETA AQUÍ! ⬇', cardX + cardW / 2, badgeY + badgeH / 2);
        ctx.restore();

        // Platform 2x3 Grid: Centered vertically inside Right Card
        const gridY = cardY + 105;
        const btnW = 235;
        const btnH = 105;
        const rowGap = 12;
        const colGap = 20;

        // Perfect coordinate mapping for 2 symmetrical columns inside 560px card (35px margin on both sides)
        const platforms = [
            { name: 'Spotify', color: '#1DB954', iconChar: '\uf1bc', x: cardX + 35, y: gridY },
            { name: 'Apple Music', color: '#FA243C', iconChar: '\uf179', x: cardX + 290, y: gridY },
            { name: 'YouTube', color: '#FF0000', iconChar: '\uf167', x: cardX + 35, y: gridY + btnH + rowGap },
            { name: 'Amazon Music', color: '#00A8E1', iconChar: '\uf270', x: cardX + 290, y: gridY + btnH + rowGap },
            { name: 'Tidal', color: '#ffffff', iconChar: '\uf773', x: cardX + 35, y: gridY + (btnH + rowGap) * 2 },
            { name: 'Deezer', color: '#FEAA2D', iconChar: '\uf3b7', x: cardX + 290, y: gridY + (btnH + rowGap) * 2 }
        ];

        platforms.forEach(p => {
            // Draw clean vertical glass button card
            ctx.save();
            ctx.fillStyle = isJuan ? 'rgba(26, 20, 18, 0.72)' : 'rgba(255, 255, 255, 0.03)';
            ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.16)' : 'rgba(255, 255, 255, 0.07)';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.roundRect(p.x, p.y, btnW, btnH, 18);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Brand icon centered in top circle of card
            const icX = p.x + btnW / 2;
            const icY = p.y + 36;

            ctx.save();
            ctx.fillStyle = p.color;
            ctx.font = '900 21px "Font Awesome 6 Brands"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (p.name === 'Tidal') {
                ctx.font = '900 19px "Font Awesome 6 Free"'; // wave glyph in standard solid set
            } else if (p.name === 'Deezer') {
                ctx.font = '900 19px "Font Awesome 6 Brands"';
            }
            ctx.fillText(p.iconChar, icX, icY);
            ctx.restore();

            // Platform label centered below the circle icon
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
            ctx.font = '900 10px Poppins';
            if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '1.5px';
            ctx.fillText(p.name.toUpperCase(), icX, p.y + 76);
            ctx.restore();
        });

        // Audiomack (full-width horizontal card spanning the base of grid)
        const admW = 490;
        const admH = 60;
        const admX = cardX + 35;
        const admY = gridY + (btnH + rowGap) * 3;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(26, 20, 18, 0.72)' : 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.16)' : 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(admX, admY, admW, admH, 18);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Audiomack left-aligned icon and label centered
        ctx.save();
        ctx.fillStyle = '#FFA500';
        ctx.font = '900 18px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf001', admX + 175, admY + admH / 2);

        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 11.5px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('AUDIOMACK', admX + 205, admY + admH / 2);
        ctx.restore();

        // 11. Dynamic "LISTA DE CANCIONES / TRACKS" Album Tracklist
        const relatedTracks = getRelatedTracks();
        const hasTracklist = relatedTracks.length > 0;
        const tracklistStartY = gridY + (btnH + rowGap) * 3 + admH + 35;

        if (hasTracklist) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = accentColor;
            
            // compact disc icon (\uf51f) for Juan, list icon (\uf0ca) for Dios Mas Gym
            ctx.font = '900 14px "Font Awesome 6 Free"';
            ctx.fillText(isJuan ? '\uf51f' : '\uf0ca', cardX + 35, tracklistStartY);
            
            ctx.font = '900 12px Poppins';
            if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
            ctx.fillText(isJuan ? 'CONTENIDO DEL ÁLBUM' : 'LISTA DE CANCIONES / TRACKS', cardX + 62, tracklistStartY + 0.5);
            ctx.restore();

            relatedTracks.forEach((track, idx) => {
                const trackY = tracklistStartY + 28 + (idx * 45);
                
                // Divider horizontal line
                ctx.save();
                ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.12)' : 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cardX + 35, trackY - 8);
                ctx.lineTo(cardX + cardW - 35, trackY - 8);
                ctx.stroke();
                ctx.restore();

                // Track indices
                ctx.save();
                ctx.fillStyle = accentColor;
                ctx.globalAlpha = 0.45;
                ctx.font = '700 12px monospace';
                ctx.fillText(`0${idx + 1}`, cardX + 35, trackY + 12);
                ctx.restore();

                // Track title
                ctx.save();
                ctx.fillStyle = isJuan ? 'rgba(232, 220, 197, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                ctx.font = '700 13px Poppins';
                const maxLen = 42;
                const displayName = track.name.length > maxLen ? track.name.substring(0, maxLen) + '...' : track.name;
                ctx.fillText(displayName, cardX + 75, trackY + 12);
                ctx.restore();

                // Chevron icon on right edge of card
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.font = '900 11px "Font Awesome 6 Free"';
                ctx.textAlign = 'right';
                ctx.fillText('\uf054', cardX + cardW - 35, trackY + 12);
                ctx.restore();
            });
        }

        // 12. Capsule Notification Bell Capsule (Drawn at card base, dynamic height based on tracks)
        const bellW = 490;
        const bellH = 50;
        const bellX = cardX + 35;
        // Float to bottom of card (Y = 740) if tracklist is empty, or fit right below tracklist
        const bellY = hasTracklist ? (tracklistStartY + 28 + (relatedTracks.length * 45) + 15) : (cardY + 740);
        const bellRadius = 25;

        ctx.save();
        ctx.fillStyle = isJuan ? 'rgba(26, 20, 18, 0.72)' : 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = isJuan ? 'rgba(139, 90, 43, 0.16)' : 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(bellX, bellY, bellW, bellH, bellRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Bell content
        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.fillStyle = accentColor;
        ctx.font = '900 14px "Font Awesome 6 Free"';
        ctx.fillText('\uf0f3', bellX + 115, bellY + bellH/2);

        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 11px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText('AVÍSAME DE NUEVOS ESTRENOS', bellX + bellW / 2 + 10, bellY + bellH/2);
        ctx.restore();

        // ------------------------------------------
        // LOWER BOTTOM COMMON FOOTER AREA
        // ------------------------------------------
        // 13. Centered Social circles horizontally below both columns
        const socY = 995;
        const socR = 20;
        const socials = [
            { x: w/2 - 50, icon: '\uf16d', color: '#ffffff' }, // Instagram (\uf16d)
            { x: w/2, icon: '\ue07b', color: '#ffffff' },      // TikTok (\ue07b in brands)
            { x: w/2 + 50, icon: '\uf167', color: '#ffffff' }  // YouTube (\uf167)
        ];

        socials.forEach(s => {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.arc(s.x, socY, socR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = s.color;
            ctx.font = '900 15px "Font Awesome 6 Brands"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.icon, s.x, socY);
            ctx.restore();
        });

        // Restore the 2x UHD scaling context save scope
        ctx.restore();
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
            renderCanvas(undefined, true); // Force pixel-perfect static rendering for downloads
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
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-[#c5a059]">Full HD Desktop</span>
                    </div>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                {/* Control Column */}
                <div className="lg:col-span-4 space-y-6">
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
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 mb-6">
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
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all font-bold font-serif"
                                        placeholder="Ej: Titulo de la Canción"
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
                                    <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-3 font-bold">2. Portada Personalizada (Opcional)</h3>
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
                                Genera una captura en Ultra HD 4K (3840x2160) idéntica a la versión de escritorio de tu SmartLink. Ideal para promociones, banners y redes.
                            </p>
                            <button 
                                onClick={downloadImage}
                                disabled={!isImageLoaded}
                                className={`w-full py-5 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 font-bold shadow-lg ${!isImageLoaded ? 'bg-[#c5a059]/40 cursor-not-allowed opacity-50' : 'bg-[#c5a059] hover:bg-white'}`}
                            >
                                {!isImageLoaded ? (
                                    <>
                                        <i className="fas fa-spinner animate-spin text-xs"></i> Cargando Portada HD...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-download text-xs"></i> Descargar Imagen Desktop (4K UHD)
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[600px] bg-black/40 rounded-[3rem] border border-white/5 relative overflow-hidden p-6 group">
                    {!selectedSong ? (
                        <div className="text-center text-white/20">
                            <i className="fas fa-desktop text-6xl mb-6"></i>
                            <p className="text-xs uppercase font-black tracking-[0.3em]">Selecciona una canción del catálogo para ver el diseño horizontal</p>
                        </div>
                    ) : (
                        <div className="relative group p-4 flex items-center justify-center w-full">
                            <canvas 
                                ref={canvasRef}
                                width={3840}
                                height={2160}
                                className="w-[533px] h-[300px] md:w-[640px] md:h-[360px] lg:w-[711px] lg:h-[400px] bg-black rounded-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-3xl pointer-events-none">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Diseño Escritorio SmartLink (4K UHD)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartLinkVideoGenerator;
