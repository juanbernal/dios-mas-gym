import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';
import ysFixWebmDuration from 'fix-webm-duration';

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

export const SMARTLINK_GENERATOR_VERSION = '1.0';

const SmartLinkVideoGenerator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    
    // Configurable/Export States
    const [startTime, setStartTime] = useState(0);
    const [duration] = useState(60); // Exact 60 seconds (1 minute) as requested
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
    const [promoImageUrl, setPromoImageUrl] = useState<string | null>(location.state?.promoImage || null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const isRecordingRef = useRef(false);
    const exportFrameRef = useRef<number>(0);

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

    // Animation Refs for state-consistency in requestAnimationFrame
    const titleRef = useRef("");
    const artistRef = useRef("");
    const promoImgRef = useRef<string | null>(null);
    const localCoverRef = useRef<string | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const blurredBgCanvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (!bgImageRef.current) {
            bgImageRef.current = new Image();
            bgImageRef.current.crossOrigin = "anonymous";
        }

        return () => {
            audioCtxRef.current?.close().catch(() => {});
            audioCtxRef.current = null;
            sourceRef.current = null;
        };
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
                setStartTime(0);
            }
        });
    }, [location.state]);

    useEffect(() => {
        if ((selectedSong || localFileUrl) && audioRef.current) {
            audioRef.current.currentTime = startTime;
            if (isPlaying) audioRef.current.play().catch(e => console.error("Auto-play blocked or failed", e));
        }
    }, [startTime, selectedSong, localFileUrl]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLocalFileUrl(url);
            setSelectedSong({
                id: 'local',
                name: customTitle || file.name.split('.')[0],
                artist: customArtist || 'Dios Mas Gym',
                cover: promoImageUrl || localCoverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1080',
                url: url,
                type: 'Local',
                date: new Date().toISOString()
            });
            if (!customTitle) setCustomTitle(file.name.split('.')[0]);
            if (!customArtist) setCustomArtist('Dios Mas Gym');
            setStartTime(0);
        }
    };

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (!localFileUrl) {
            alert("Sube un MP3 local antes de escuchar o exportar el video.");
            return;
        }
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.currentTime = startTime;
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const drawRef = useRef<() => void>(() => {});

    const renderCanvas = (progressOverride?: number, timeOverride?: number) => {
        if (!canvasRef.current || !selectedSong) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (!ctx) return;

        const w = 1080;
        const h = 1920;
        const time = timeOverride ?? Date.now() / 1000;
        
        // Auto-detect theme (Juan style northern acoustic or Dios Mas Gym urban dark gold)
        const isJuan = (artistRef.current || selectedSong.artist || '').toLowerCase().includes('juan');
        const accentColor = isJuan ? '#c89d53' : '#c5a059';

        // Organic camera drift (Anti-AI & Premium feel)
        const nX = smoothNoise(time * 0.25) - 0.5;
        const nY = smoothNoise(time * 0.35 + 100) - 0.5;
        const floatZoom = 5 + (smoothNoise(time * 0.15) * 15);

        // 1. Base background
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.fillRect(0, 0, w, h);

        // 2. High-quality smooth bilinear blurred background cover
        const img = bgImageRef.current;
        const isImgReady = img && img.complete && img.naturalWidth !== 0 && img.src !== "";

        if (isImgReady) {
            ctx.save();
            ctx.globalAlpha = isJuan ? 0.32 : 0.42;
            const bgZoom = 1.4 + smoothNoise(time * 0.08) * 0.08;
            const blurredCanvas = blurredBgCanvasRef.current;
            try {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                if (blurredCanvas) {
                    ctx.drawImage(blurredCanvas, (w - w*bgZoom)/2 + (nX * 25), (h - h*bgZoom)/2 + (nY * 25), w*bgZoom, h*bgZoom);
                } else {
                    ctx.drawImage(img, (w - w*bgZoom)/2 + (nX * 25), (h - h*bgZoom)/2 + (nY * 25), w*bgZoom, h*bgZoom);
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
                overlayGrad.addColorStop(1, 'rgba(26, 20, 18, 0.94)');
            } else {
                overlayGrad.addColorStop(0, 'rgba(5, 7, 10, 0.40)');
                overlayGrad.addColorStop(1, 'rgba(5, 7, 10, 0.92)');
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
        grad.addColorStop(0, `rgba(0,0,0,${0.35 + smoothNoise(time) * 0.05})`);
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, isJuan ? 'rgba(26,20,18,1)' : 'rgba(5,7,10,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 4. Subtle gold / light floating particles
        ctx.fillStyle = isJuan ? 'rgba(200, 157, 83, 0.35)' : 'rgba(197, 160, 89, 0.38)';
        for(let i=0; i<24; i++) {
            const seedX = smoothNoise(time * 0.08 + i * 4);
            const seedY = smoothNoise(time * 0.12 + i * 8);
            
            const px = (seedX * 1.4) * w;
            const py = ((seedY * 1.1) % 1) * h;
            
            ctx.save();
            ctx.globalAlpha = 0.15 + smoothNoise(time * 1.8 + i) * 0.35;
            ctx.beginPath();
            ctx.ellipse(px, py, 2.5 + seedX * 2.5, 2 + seedY * 2, seedX * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Film grain pattern overlay
        ctx.save();
        ctx.globalAlpha = 0.08 + smoothNoise(time * 8) * 0.04;
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
        ctx.font = '900 24px Poppins';
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
        const coverX = (w - coverSize) / 2 + (nX * 10);
        const coverY = 220 + (nY * 10);
        const coverRadius = 36;

        if (isImgReady) {
            ctx.save();
            ctx.shadowBlur = 90 + smoothNoise(time * 2.2) * 45;
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
        ctx.translate(nX * 8, nY * 8);

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

        // 8. Semi-transparent Glassmorphic Player Card
        const playerW = 800;
        const playerH = 190;
        const playerX = 140;
        const playerY = 990;
        const playerRadius = 30;

        ctx.save();
        // Blur styling using color fill
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
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`; // Pulse red dot
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

        // Play/Pause circular button
        const playBtnX = 210;
        const playBtnY = 1115;
        const playBtnR = 40;

        ctx.save();
        ctx.fillStyle = accentColor;
        ctx.shadowBlur = 15;
        ctx.shadowColor = accentColor;
        ctx.beginPath();
        ctx.arc(playBtnX, playBtnY, playBtnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw icon inside Play button
        ctx.save();
        ctx.fillStyle = isJuan ? '#1a1412' : '#05070a';
        ctx.font = '900 24px "Font Awesome 6 Free"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const isCurrentlyPlaying = isRecordingRef.current ? true : isPlaying;
        if (isCurrentlyPlaying) {
            // Pause icon (\uf04c)
            ctx.fillText('\uf04c', playBtnX, playBtnY);
        } else {
            // Play icon (\uf04b)
            ctx.fillText('\uf04b', playBtnX + 2, playBtnY);
        }
        ctx.restore();

        // Timer and Playback label
        const elapsed = progressOverride !== undefined 
            ? progressOverride * duration 
            : (isRecordingRef.current ? (recordingProgress * duration) : ((audioRef.current?.currentTime || 0) - startTime));
        const progress = Math.max(0, Math.min(1, elapsed / duration));

        ctx.save();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = isJuan ? '#e8dcc5' : '#ffffff';
        ctx.font = '900 18px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText(isCurrentlyPlaying ? 'REPRODUCIENDO...' : 'LISTO PARA ESCUCHAR', 280, 1095);

        ctx.textAlign = 'right';
        ctx.font = '700 18px Courier, monospace';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';
        ctx.fillText(`${Math.floor(elapsed)}s / 60s`, 900, 1095);
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

        // Player Progress Fill
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(trackX, trackY, trackW * progress, trackH, 5);
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
            const icW = 55;
            const icH = 55;
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
        // Bell icon (\uf0f3) with bounce vibration
        const bellJitter = isCurrentlyPlaying ? Math.sin(time * 10) * 2 : 0;
        ctx.fillText('\uf0f3', 270 + bellJitter, bellY + bellH/2);

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
                // TikTok is represented with standard music note or brand icon
                ctx.font = '900 18px "Font Awesome 6 Free"';
            }
            ctx.fillText(s.icon, s.x, socY);
            ctx.restore();
        });

        // Trigger loop check
        if (progress >= 1 && isPlaying && !isRecording) {
            audioRef.current?.pause();
            setIsPlaying(false);
        }
    };

    const draw = () => renderCanvas();

    useEffect(() => {
        drawRef.current = draw;
    });

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            if (selectedSong && !isRecordingRef.current) {
                drawRef.current();
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [selectedSong]);

    const getSupportedMimeType = () => {
        const candidates = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm'
        ];
        return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
    };

    const setupRecordingAudio = async () => {
        if (!audioRef.current) throw new Error("Audio element not ready");

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContextClass();
            sourceRef.current = null;
        }

        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }

        if (!sourceRef.current) {
            sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
        }

        const destination = audioCtxRef.current.createMediaStreamDestination();
        sourceRef.current.disconnect();
        sourceRef.current.connect(destination);
        sourceRef.current.connect(audioCtxRef.current.destination);

        // Anti-AI Micro Room Signature Analog Noise bypass
        try {
            const bufferSize = 2 * audioCtxRef.current.sampleRate;
            const noiseBuffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * 0.00007; // extremely quiet
            }
            
            const whiteNoiseSource = audioCtxRef.current.createBufferSource();
            whiteNoiseSource.buffer = noiseBuffer;
            whiteNoiseSource.loop = true;

            const noiseFilter = audioCtxRef.current.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 10000;
            noiseFilter.Q.value = 0.5;

            const noiseGain = audioCtxRef.current.createGain();
            noiseGain.gain.value = 0.001;

            whiteNoiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            
            noiseGain.connect(destination);
            noiseGain.connect(audioCtxRef.current.destination);
            
            whiteNoiseSource.start();
        } catch (e) {
            console.warn("Anti-AI bypass setup failed", e);
        }

        return destination;
    };

    const waitForAudioReady = async () => {
        const audio = audioRef.current;
        if (!audio) throw new Error("Audio element not ready");
        if (Number.isFinite(audio.duration) && audio.duration > 0) return;

        await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("No se pudo leer la duración del MP3.")), 8000);
            const cleanup = () => {
                window.clearTimeout(timeout);
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
            };
            const onLoaded = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); reject(new Error("No se pudo cargar el MP3.")); };
            audio.addEventListener('loadedmetadata', onLoaded, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.load();
        });
    };

    const waitForImageReady = async () => {
        const img = bgImageRef.current;
        if (!img || !img.src) return;

        if (!img.complete || img.naturalWidth === 0) {
            await new Promise<void>((resolve) => {
                const timeout = window.setTimeout(() => resolve(), 5000);
                const cleanup = () => {
                    window.clearTimeout(timeout);
                    img.removeEventListener('load', onLoad);
                    img.removeEventListener('error', onError);
                };
                const onLoad = () => { cleanup(); resolve(); };
                const onError = () => { cleanup(); resolve(); };
                img.addEventListener('load', onLoad, { once: true });
                img.addEventListener('error', onError, { once: true });
            });
        } else if ('decode' in img) {
            await img.decode().catch(() => {});
        }

        if (img.complete && img.naturalWidth > 0) {
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
        }
    };

    const startRecording = async () => {
        if (!canvasRef.current || !audioRef.current) return;
        if (!selectedSong) return;
        if (!localFileUrl) {
            alert("Por favor, sube un archivo MP3 local antes de exportar el video.");
            return;
        }
        
        let stream: MediaStream | null = null;
        let recorder: MediaRecorder | null = null;
        let stopTimeout = 0;

        const cleanupRecording = () => {
            isRecordingRef.current = false;
            if (exportFrameRef.current) cancelAnimationFrame(exportFrameRef.current);
            if (stopTimeout) window.clearTimeout(stopTimeout);
            stream?.getTracks().forEach(track => track.stop());
            sourceRef.current?.disconnect();
            if (audioCtxRef.current && sourceRef.current) {
                sourceRef.current.connect(audioCtxRef.current.destination);
            }
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
            setIsRecording(false);
        };

        try {
            await waitForAudioReady();
            const audioDuration = audioRef.current.duration;
            if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
                throw new Error("El archivo MP3 no tiene una duración válida.");
            }
            if (startTime >= audioDuration) {
                throw new Error("El punto de inicio seleccionado supera la duración total del MP3.");
            }

            const exportDuration = Math.max(1, Math.min(duration, audioDuration - startTime));
            if (exportDuration < 2) {
                throw new Error("El fragmento a exportar es demasiado corto.");
            }

            setIsRecording(true);
            isRecordingRef.current = true;
            setRecordingProgress(0);
            const canvas = canvasRef.current;
            await waitForImageReady();
            renderCanvas(0, 0);

            // High 60fps framerate vertical stream
            stream = canvas.captureStream(60);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const destination = await setupRecordingAudio();
            destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));

            const mimeType = getSupportedMimeType();
            recorder = new MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 80_000_000, // Cinematic 80 Mbps target
                audioBitsPerSecond: 192_000
            });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onerror = (event) => {
                console.error("Recording error:", event);
                cleanupRecording();
                alert("Error durante la grabación del video. Intenta de nuevo.");
            };
            
            recorder.onstop = () => {
                if (chunks.length === 0) {
                    cleanupRecording();
                    alert("La grabación finalizó sin datos cargados. Intenta de nuevo.");
                    return;
                }

                const buggyBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
                const durationMs = Math.round(exportDuration * 1000);
                
                // Inject correct EBML seekable metadata duration so video editors/social systems read WebM correctly
                ysFixWebmDuration(buggyBlob, durationMs, (fixedBlob) => {
                    const songName = selectedSong?.name.replace(/\s+/g, '_') || 'smartlink';
                    const url = URL.createObjectURL(fixedBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `SmartLink_${songName}.webm`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 10_000);
                    cleanupRecording();
                    setRecordingProgress(0);
                });
            };

            audioRef.current.currentTime = startTime;
            recorder.start(16); // force more keyframes
            await audioRef.current.play();
            setIsPlaying(true);

            const recordingStartTime = performance.now();
            const renderExportFrame = (now: number) => {
                if (!recorder || recorder.state !== 'recording') return;
                const elapsed = Math.min((now - recordingStartTime) / 1000, exportDuration);
                const progress = Math.min(elapsed / exportDuration, 1);
                renderCanvas(progress, elapsed);
                setRecordingProgress(progress);

                try { if (recorder.state === 'recording') recorder.requestData(); } catch(_) {}

                if (progress >= 1) {
                    audioRef.current?.pause();
                    recorder.stop();
                    return;
                }

                exportFrameRef.current = requestAnimationFrame(renderExportFrame);
            };

            exportFrameRef.current = requestAnimationFrame(renderExportFrame);
            stopTimeout = window.setTimeout(() => {
                if (recorder?.state === 'recording') recorder.stop();
            }, (exportDuration + 1) * 1000);
        } catch (err) {
            console.error("Recording init failure:", err);
            alert(err instanceof Error ? err.message : "Fallo al iniciar exportación.");
            cleanupRecording();
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
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">SmartLink <span className="text-[#c5a059]">Video Creator</span> <span className="text-white/20 ml-2">v{SMARTLINK_GENERATOR_VERSION}</span></h1>
                    <div className="flex items-center gap-1.5 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-full px-2.5 py-0.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
                        <span className="text-[7.5px] font-black uppercase tracking-wider text-[#c5a059]">Fidelity Engine</span>
                    </div>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                {/* Control Column */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest">1. Cargar Datos del Catálogo</h3>
                            {location.state?.song && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20 animate-pulse">
                                    AUTO-SYNC
                                </span>
                            )}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar canción en catálogo..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mb-6 outline-none focus:border-[#c5a059]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            {filteredCatalog.map(song => (
                                <button 
                                    key={song.id}
                                    onClick={() => {
                                        setSelectedSong(song);
                                        setCustomTitle(song.name);
                                        setCustomArtist(song.artist || "Dios Mas Gym");
                                        setStartTime(0);
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
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Título en Video</label>
                                    <input 
                                        type="text" 
                                        value={customTitle} 
                                        onChange={e => setCustomTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all font-bold"
                                        placeholder="Ej: TITULO DE CANCIÓN"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Artista en Video</label>
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

                        {/* OPCIONES DE DESCARGA */}
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
                            <div>
                                <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-2">Opción A: Descargar como Imagen (Stories)</h3>
                                <p className="text-[9.5px] text-white/40 leading-relaxed mb-4">
                                    Exporta el diseño de tu SmartLink como una imagen vertical de alta calidad. Súbela a tus Historias de Instagram/TikTok y añade tu música usando el sticker oficial. ¡Esto incrementa notablemente tus reproducciones!
                                </p>
                                <button 
                                    onClick={downloadImage}
                                    className="w-full py-4 bg-[#c5a059] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-2 font-bold shadow-lg"
                                >
                                    <i className="fas fa-download text-xs"></i> Descargar Imagen (9:16)
                                </button>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-4">Opción B: Generar como Video (Opcional)</h3>
                                <p className="text-[9.5px] text-white/40 leading-relaxed mb-4">
                                    Si prefieres exportar un video animado de 1 minuto con la música ya integrada de fondo, realiza los siguientes pasos:
                                </p>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] uppercase font-black tracking-widest text-white/30 block mb-1">1. Subir archivo MP3 local</label>
                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <i className="fas fa-music text-xl text-[#c5a059] mb-2"></i>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{localFileUrl ? "Archivo MP3 Cargado" : "Seleccionar MP3"}</p>
                                            </div>
                                            <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <label className="text-[8px] uppercase font-black tracking-widest text-white/30 block mb-1">2. Imagen de fondo personalizada (Opcional)</label>
                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <i className="fas fa-image text-xl text-[#c5a059] mb-2"></i>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{promoImageUrl ? "Imagen Cargada" : "Seleccionar Imagen"}</p>
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
                                                className="w-full mt-2 text-[8px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all"
                                            >
                                                Quitar Imagen
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {selectedSong && localFileUrl && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-left-4">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-6">Configurar Fragmento de Video</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest mb-4">
                                        <span className="text-white/40">Punto de Inicio</span>
                                        <span className="text-[#c5a059]">{Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={audioRef.current?.duration ? Math.max(0, audioRef.current.duration - duration) : 300}
                                        value={startTime}
                                        onChange={e => setStartTime(parseInt(e.target.value))}
                                        className="w-full accent-[#c5a059] bg-white/10 rounded-lg h-1"
                                    />
                                    <p className="text-[9px] text-white/30 mt-4 leading-relaxed italic">
                                        * El video durará exactamente 1 minuto (60 segundos) sincronizado con el diseño real de tu SmartLink.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handlePlayPause}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                                    >
                                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                                        {isPlaying ? 'Pausar' : 'Escuchar'}
                                    </button>
                                    <button 
                                        onClick={startRecording}
                                        disabled={isRecording}
                                        className="flex-[1.5] py-4 bg-[#c5a059] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50"
                                    >
                                        {isRecording ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Grabando...</> : <><i className="fas fa-video mr-2"></i> Generar Video</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Column */}
                <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[600px] bg-black/40 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    {!selectedSong ? (
                        <div className="text-center text-white/20">
                            <i className="fas fa-mobile-retro text-6xl mb-6"></i>
                            <p className="text-xs uppercase font-black tracking-[0.3em]">Selecciona una canción para comenzar la vista previa</p>
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
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Lienzo Vertical SmartLink (9:16)</span>
                            </div>
                            
                            <audio 
                                ref={audioRef} 
                                src={localFileUrl || ""} 
                                onTimeUpdate={(e) => {
                                    if (!isRecording) {
                                        const curr = e.currentTarget.currentTime;
                                        if (curr > startTime + duration) {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = startTime;
                                            setIsPlaying(false);
                                        }
                                    }
                                }}
                                onEnded={() => setIsPlaying(false)}
                                onError={() => alert("Error al cargar el audio. Verifica el formato del MP3.")}
                            />
                        </div>
                    )}
                </div>
            </div>

            {isRecording && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-32 h-32 relative mb-8">
                        <div className="absolute inset-0 border-4 border-[#c5a059]/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#c5a059] rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[#c5a059] font-black text-xl">
                            {recordingProgress >= 1 ? '✓' : 'REC'}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-[0.5em] mb-4">
                        {recordingProgress >= 1 ? 'Finalizando exportación...' : 'Grabando Video SmartLink'}
                    </h2>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-8">
                        No cierres esta pestaña hasta que la descarga finalice automáticamente.
                    </p>
                    <div className="w-64 bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-[#c5a059] h-full transition-all duration-100" style={{ width: `${recordingProgress * 100}%` }}></div>
                    </div>
                    {recordingProgress < 1 && (
                        <p className="text-white/20 text-[10px] uppercase tracking-widest mt-4">
                            {Math.round(recordingProgress * duration)}s / {duration}s
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartLinkVideoGenerator;
