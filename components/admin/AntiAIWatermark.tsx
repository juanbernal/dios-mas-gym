import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as piexif from 'piexifjs';

const AntiAIWatermark: React.FC = () => {
    const navigate = useNavigate();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState<{width: number, height: number} | null>(null);
    const [activeTab, setActiveTab] = useState<'logo' | 'ribbon' | 'socials' | 'watermark' | 'frames'>('logo');
    
    // Logo States
    const [logoSelection, setLogoSelection] = useState<'diosmasgym' | 'none'>('diosmasgym');
    const [logoSize, setLogoSize] = useState<number>(19); // 19% default size
    const [logoOpacity, setLogoOpacity] = useState<number>(100);
    const [logoPosition, setLogoPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
    const [showText, setShowText] = useState<boolean>(true);
    
    // Ribbon / Banner States
    const [ribbonStyle, setRibbonStyle] = useState<'none' | 'bottom' | 'top' | 'diagonal-left' | 'diagonal-right'>('none');
    const [ribbonText, setRibbonText] = useState<string>('#PuroSeñorJesucristoCompa');
    const [ribbonColor, setRibbonColor] = useState<'gold' | 'black' | 'white' | 'red' | 'blue' | 'green' | 'grey'>('gold');
    const [ribbonOpacity, setRibbonOpacity] = useState<number>(90);

    // Social Media States
    const [showSocials, setShowSocials] = useState<boolean>(true);
    const [socialText, setSocialText] = useState<string>('@diosmasgym');
    const [socialInstagram, setSocialInstagram] = useState<boolean>(true);
    const [socialTikTok, setSocialTikTok] = useState<boolean>(true);
    const [socialYouTube, setSocialYouTube] = useState<boolean>(true);
    const [socialFacebook, setSocialFacebook] = useState<boolean>(true);
    const [socialSpotify, setSocialSpotify] = useState<boolean>(true);
    const [socialX, setSocialX] = useState<boolean>(true);
    const [socialPosition, setSocialPosition] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left');
    const [socialColor, setSocialColor] = useState<'white' | 'gold' | 'black' | 'green' | 'blue'>('white');
    const [socialBackground, setSocialBackground] = useState<boolean>(true);
    const [socialOpacity, setSocialOpacity] = useState<number>(90);

    // Frame / Vignette States (New Options)
    const [frameStyle, setFrameStyle] = useState<'none' | 'cinematic' | 'luxury-gold' | 'minimalist'>('none');
    const [frameOpacity, setFrameOpacity] = useState<number>(100);
    const [vignetteEnabled, setVignetteEnabled] = useState<boolean>(false);
    const [vignetteStrength, setVignetteStrength] = useState<number>(50);

    // Music Platforms States (Listen to our music on...)
    const [showMusicPlatforms, setShowMusicPlatforms] = useState<boolean>(true);
    const [musicPlatformsText, setMusicPlatformsText] = useState<string>('Escucha nuestra música en:');
    const [musicSpotify, setMusicSpotify] = useState<boolean>(true);
    const [musicApple, setMusicApple] = useState<boolean>(true);
    const [musicYouTube, setMusicYouTube] = useState<boolean>(true);

    // Hashtag Watermark States
    const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(true);
    const [watermarkStyle, setWatermarkStyle] = useState<'diagonal' | 'tiled' | 'center'>('diagonal');
    const [watermarkText, setWatermarkText] = useState<string>('#PuroSeñorJesucristoCompa');
    const [watermarkOpacity, setWatermarkOpacity] = useState<number>(8); // 8% default opacity
    const [watermarkSize, setWatermarkSize] = useState<number>(35);

    const [injectExif, setInjectExif] = useState<boolean>(true);
    const [isDownloading, setIsDownloading] = useState(false);
    
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const diosmasgymLogoRef = useRef<HTMLImageElement>(new Image());

    useEffect(() => {
        diosmasgymLogoRef.current.src = '/logo-diosmasgym.png';
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
        'Puro Señor Jesucristo',
        'La Gloria es de Dios',
        'Fe y Disciplina',
        'Diosmasgym'
    ];

    // Quick phrases for Watermark
    const watermarkPhrases = [
        '#PuroSeñorJesucristoCompa',
        'Diosmasgym.com',
        'Diosmasgym Records',
        'Puro Chihuahua',
        '#Diosmasgym',
        'La Gloria es de Dios'
    ];

    const drawComposition = (ctx: CanvasRenderingContext2D, width: number, height: number, sourceImage: HTMLImageElement) => {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw main image
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(sourceImage, 0, 0, width, height);

        // 1. Draw Watermarks (Hashtags) in background
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
            } else if (ribbonColor === 'red') {
                const grad = ctx.createLinearGradient(0, 0, width, 0);
                grad.addColorStop(0, '#590909');
                grad.addColorStop(0.5, '#bd2c2c');
                grad.addColorStop(1, '#590909');
                fillStyle = grad;
            } else if (ribbonColor === 'blue') {
                const grad = ctx.createLinearGradient(0, 0, width, 0);
                grad.addColorStop(0, '#0a225c');
                grad.addColorStop(0.5, '#2b62d9');
                grad.addColorStop(1, '#0a225c');
                fillStyle = grad;
            } else if (ribbonColor === 'green') {
                const grad = ctx.createLinearGradient(0, 0, width, 0);
                grad.addColorStop(0, '#093a1d');
                grad.addColorStop(0.5, '#228b4c');
                grad.addColorStop(1, '#093a1d');
                fillStyle = grad;
            } else if (ribbonColor === 'grey') {
                fillStyle = 'rgba(60, 64, 74, 0.88)';
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

        if (logoToDraw && logoToDraw.complete && logoToDraw.naturalWidth > 0) {
            const aspect = logoToDraw.height / logoToDraw.width;
            const lHeight = targetWidth * aspect;
            const { x, y } = getCoordinates(logoPosition, targetWidth, lHeight);
            drawLogo(logoToDraw, x, y);
        }

        // 4. Draw Social Media Badge Block (Premium Minimalist Glass Style with Music Platforms)
        if (showSocials && socialText) {
            ctx.save();
            ctx.globalAlpha = socialOpacity / 100;
            
            const fontSize = Math.max(12, width * 0.016);
            ctx.font = `700 ${fontSize}px Montserrat, Inter, sans-serif`;
            
            // Set colors
            let drawColor = '#ffffff';
            if (socialColor === 'gold') drawColor = '#c5a059';
            else if (socialColor === 'black') drawColor = '#0a0c14';
            else if (socialColor === 'green') drawColor = '#00ff66';
            else if (socialColor === 'blue') drawColor = '#33ccff';
            
            // Row 1 Dimensions
            let iconCount = 0;
            if (socialInstagram) iconCount++;
            if (socialTikTok) iconCount++;
            if (socialYouTube) iconCount++;
            if (socialFacebook) iconCount++;
            if (socialSpotify) iconCount++;
            if (socialX) iconCount++;
            
            const socialTextMetrics = ctx.measureText(socialText);
            const iconSize = fontSize * 1.05;
            const iconGap = fontSize * 0.45;
            const totalIconsWidth = iconCount > 0 ? (iconCount * iconSize) + ((iconCount - 1) * iconGap) : 0;
            const row1Width = socialTextMetrics.width + totalIconsWidth + (iconCount > 0 ? fontSize * 0.7 : 0);
            
            // Row 2 Dimensions
            let row2Width = 0;
            let musicIconCount = 0;
            if (showMusicPlatforms) {
                if (musicSpotify) musicIconCount++;
                if (musicApple) musicIconCount++;
                if (musicYouTube) musicIconCount++;
                
                ctx.font = `italic 600 ${fontSize * 0.85}px Montserrat, Inter, sans-serif`;
                const musicTextMetrics = ctx.measureText(musicPlatformsText);
                const totalMusicIconsWidth = musicIconCount > 0 ? (musicIconCount * iconSize) + ((musicIconCount - 1) * iconGap) : 0;
                row2Width = musicTextMetrics.width + totalMusicIconsWidth + (musicIconCount > 0 ? fontSize * 0.6 : 0);
            }
            
            // Reset main font
            ctx.font = `700 ${fontSize}px Montserrat, Inter, sans-serif`;
            
            const blockPaddingH = fontSize * 1.0;
            const blockPaddingV = fontSize * 0.7;
            const rowSpacing = fontSize * 0.6;
            
            const blockWidth = Math.max(row1Width, row2Width) + (blockPaddingH * 2);
            const blockHeight = fontSize + (showMusicPlatforms ? (fontSize * 0.85) + rowSpacing : 0) + (blockPaddingV * 2);
            
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
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 4;
                
                ctx.fillStyle = 'rgba(10, 12, 20, 0.88)';
                ctx.beginPath();
                ctx.roundRect(bx, by, blockWidth, blockHeight, fontSize * 0.8);
                ctx.fill();
                
                ctx.shadowBlur = 0;
                ctx.shadowOffsetY = 0;
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.6)';
                ctx.lineWidth = Math.max(1.5, fontSize * 0.07);
                ctx.stroke();
            }
            
            // --- DRAW ROW 1 (Socials) ---
            let currentIconX = bx + blockPaddingH;
            const currentIconY = by + blockPaddingV + (fontSize - iconSize) / 2;
            
            ctx.fillStyle = drawColor;
            ctx.strokeStyle = drawColor;
            
            if (socialInstagram) {
                ctx.save();
                ctx.lineWidth = iconSize * 0.11;
                ctx.beginPath();
                ctx.roundRect(currentIconX, currentIconY, iconSize, iconSize, iconSize * 0.28);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(currentIconX + iconSize/2, currentIconY + iconSize/2, iconSize * 0.24, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(currentIconX + iconSize * 0.76, currentIconY + iconSize * 0.24, iconSize * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }
            
            if (socialTikTok) {
                ctx.save();
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = iconSize * 0.14;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                const cx = currentIconX + iconSize * 0.55;
                const cy = currentIconY + iconSize * 0.5;
                
                ctx.beginPath();
                ctx.moveTo(cx, cy - iconSize * 0.35);
                ctx.lineTo(cx, cy + iconSize * 0.15);
                ctx.arc(cx - iconSize * 0.22, cy + iconSize * 0.15, iconSize * 0.22, 0, Math.PI * 1.25, false);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(cx + iconSize * 0.28, cy - iconSize * 0.35, iconSize * 0.28, Math.PI, Math.PI * 0.5, true);
                ctx.stroke();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }
            
            if (socialYouTube) {
                ctx.save();
                ctx.fillStyle = drawColor;
                ctx.beginPath();
                ctx.roundRect(currentIconX, currentIconY + iconSize * 0.1, iconSize * 1.15, iconSize * 0.8, iconSize * 0.22);
                ctx.fill();
                
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

            if (socialFacebook) {
                ctx.save();
                ctx.fillStyle = drawColor;
                ctx.beginPath();
                ctx.roundRect(currentIconX, currentIconY, iconSize, iconSize, iconSize * 0.28);
                ctx.fill();
                
                ctx.fillStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                ctx.font = `bold ${iconSize * 0.85}px Inter, Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('f', currentIconX + iconSize * 0.5, currentIconY + iconSize * 0.48);
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }

            if (socialSpotify) {
                ctx.save();
                ctx.fillStyle = drawColor;
                ctx.beginPath();
                ctx.arc(currentIconX + iconSize/2, currentIconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                ctx.lineWidth = iconSize * 0.08;
                ctx.lineCap = 'round';
                
                const cx = currentIconX + iconSize/2;
                const cy = currentIconY + iconSize/2;
                const r = iconSize/2;
                
                ctx.beginPath();
                ctx.arc(cx - r * 0.05, cy + r * 0.55, r * 0.75, Math.PI * 1.25, Math.PI * 1.75);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx - r * 0.05, cy + r * 0.7, r * 0.6, Math.PI * 1.25, Math.PI * 1.75);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(cx - r * 0.05, cy + r * 0.85, r * 0.45, Math.PI * 1.25, Math.PI * 1.75);
                ctx.stroke();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }

            if (socialX) {
                ctx.save();
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = iconSize * 0.15;
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(currentIconX + iconSize * 0.15, currentIconY + iconSize * 0.15);
                ctx.lineTo(currentIconX + iconSize * 0.85, currentIconY + iconSize * 0.85);
                ctx.moveTo(currentIconX + iconSize * 0.85, currentIconY + iconSize * 0.15);
                ctx.lineTo(currentIconX + iconSize * 0.15, currentIconY + iconSize * 0.85);
                ctx.stroke();
                ctx.restore();
                
                currentIconX += iconSize + iconGap;
            }
            
            // Draw social handle text
            ctx.fillStyle = drawColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(socialText, currentIconX, by + blockPaddingV + fontSize / 2);
            
            // --- DRAW ROW 2 (Music Platforms) ---
            if (showMusicPlatforms) {
                ctx.font = `italic 600 ${fontSize * 0.85}px Montserrat, Inter, sans-serif`;
                let mIconX = bx + blockPaddingH;
                const mIconY = by + blockPaddingV + fontSize + rowSpacing + ((fontSize * 0.85) - iconSize) / 2;
                
                // Draw label text
                ctx.fillStyle = drawColor;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(musicPlatformsText, mIconX, by + blockPaddingV + fontSize + rowSpacing + (fontSize * 0.85) / 2);
                
                mIconX += ctx.measureText(musicPlatformsText).width + fontSize * 0.5;
                const mRadius = iconSize / 2;
                
                if (musicSpotify) {
                    ctx.save();
                    ctx.fillStyle = drawColor;
                    ctx.strokeStyle = drawColor;
                    
                    const scx = mIconX + mRadius;
                    const scy = mIconY + mRadius;
                    
                    ctx.beginPath();
                    ctx.arc(scx, scy, mRadius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                    ctx.lineWidth = mRadius * 0.18;
                    ctx.lineCap = 'round';
                    
                    ctx.beginPath();
                    ctx.arc(scx - mRadius * 0.05, scy + mRadius * 0.55, mRadius * 0.75, Math.PI * 1.25, Math.PI * 1.75);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(scx - mRadius * 0.05, scy + mRadius * 0.7, mRadius * 0.6, Math.PI * 1.25, Math.PI * 1.75);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(scx - mRadius * 0.05, scy + mRadius * 0.85, mRadius * 0.45, Math.PI * 1.25, Math.PI * 1.75);
                    ctx.stroke();
                    ctx.restore();
                    
                    mIconX += iconSize + iconGap;
                }
                
                if (musicApple) {
                    ctx.save();
                    ctx.fillStyle = drawColor;
                    
                    const acx = mIconX + mRadius;
                    const acy = mIconY + mRadius;
                    
                    ctx.beginPath();
                    ctx.arc(acx, acy, mRadius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                    ctx.beginPath();
                    ctx.ellipse(acx - mRadius * 0.25, acy + mRadius * 0.3, mRadius * 0.18, mRadius * 0.12, -Math.PI/6, 0, Math.PI*2);
                    ctx.ellipse(acx + mRadius * 0.15, acy + mRadius * 0.2, mRadius * 0.18, mRadius * 0.12, -Math.PI/6, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                    ctx.lineWidth = mRadius * 0.09;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(acx - mRadius * 0.1, acy + mRadius * 0.3);
                    ctx.lineTo(acx - mRadius * 0.1, acy - mRadius * 0.35);
                    ctx.lineTo(acx + mRadius * 0.3, acy - mRadius * 0.45);
                    ctx.lineTo(acx + mRadius * 0.3, acy + mRadius * 0.2);
                    ctx.stroke();
                    
                    ctx.lineWidth = mRadius * 0.22;
                    ctx.beginPath();
                    ctx.moveTo(acx - mRadius * 0.12, acy - mRadius * 0.28);
                    ctx.lineTo(acx + mRadius * 0.32, acy - mRadius * 0.38);
                    ctx.stroke();
                    ctx.restore();
                    
                    mIconX += iconSize + iconGap;
                }
                
                if (musicYouTube) {
                    ctx.save();
                    ctx.fillStyle = drawColor;
                    
                    const ycx = mIconX + mRadius;
                    const ycy = mIconY + mRadius;
                    
                    ctx.beginPath();
                    ctx.roundRect(ycx - mRadius, ycy - mRadius * 0.7, mRadius * 2, mRadius * 1.4, mRadius * 0.4);
                    ctx.fill();
                    
                    ctx.fillStyle = socialBackground ? 'rgba(10, 12, 20, 0.95)' : '#000000';
                    ctx.beginPath();
                    ctx.moveTo(ycx - mRadius * 0.3, ycy - mRadius * 0.35);
                    ctx.lineTo(ycx + mRadius * 0.35, ycy);
                    ctx.lineTo(ycx - mRadius * 0.3, ycy + mRadius * 0.35);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }
            
            ctx.restore();
        }

        // Draw Frame Style
        if (frameStyle !== 'none') {
            ctx.save();
            ctx.globalAlpha = frameOpacity / 100;
            if (frameStyle === 'cinematic') {
                const barHeight = height * 0.08;
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, barHeight);
                ctx.fillRect(0, height - barHeight, width, barHeight);
            } else if (frameStyle === 'luxury-gold') {
                const borderOffset = Math.max(10, width * 0.015);
                ctx.strokeStyle = '#c5a059';
                ctx.lineWidth = Math.max(2, width * 0.003);
                ctx.strokeRect(borderOffset, borderOffset, width - borderOffset * 2, height - borderOffset * 2);
                
                ctx.strokeStyle = 'rgba(197, 160, 89, 0.4)';
                ctx.lineWidth = Math.max(1, width * 0.001);
                ctx.strokeRect(borderOffset + 8, borderOffset + 8, width - (borderOffset + 8) * 2, height - (borderOffset + 8) * 2);
            } else if (frameStyle === 'minimalist') {
                const borderOffset = Math.max(15, width * 0.02);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = Math.max(1, width * 0.0015);
                ctx.strokeRect(borderOffset, borderOffset, width - borderOffset * 2, height - borderOffset * 2);
            }
            ctx.restore();
        }

        // Draw Vignette
        if (vignetteEnabled) {
            ctx.save();
            const grad = ctx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * 0.3, 
                width / 2, height / 2, Math.max(width, height) * 0.7
            );
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength / 100})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
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
        showSocials, socialText, socialInstagram, socialTikTok, socialYouTube, socialFacebook, socialSpotify, socialX, socialPosition, socialColor, socialBackground, socialOpacity,
        showMusicPlatforms, musicPlatformsText, musicSpotify, musicApple, musicYouTube,
        watermarkEnabled, watermarkStyle, watermarkText, watermarkOpacity, watermarkSize,
        frameStyle, frameOpacity, vignetteEnabled, vignetteStrength
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
                        zeroth[piexif.ImageIFD.Software] = "Mando Ejecutivo Watermark Engine v5.3";
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
                            Aplica sellos oficiales, listones de fe personalizados y redes de Diosmasgym sin pérdida de resolución.
                        </p>
                    </div>

                    {/* Image Upload */}
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

                    {/* Tab Navigation in Sidebar */}
                    <div className="flex flex-wrap border-b border-white/10 mb-6 bg-black/20 rounded-xl p-1.5 gap-1">
                        <button
                            onClick={() => setActiveTab('logo')}
                            className={`flex-1 min-w-[60px] py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'logo' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🏆 Sello
                        </button>
                        <button
                            onClick={() => setActiveTab('ribbon')}
                            className={`flex-1 min-w-[60px] py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ribbon' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🎗️ Lema
                        </button>
                        <button
                            onClick={() => setActiveTab('socials')}
                            className={`flex-1 min-w-[60px] py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'socials' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            📱 Redes
                        </button>
                        <button
                            onClick={() => setActiveTab('frames')}
                            className={`flex-1 min-w-[60px] py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'frames' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🖼️ Marcos
                        </button>
                        <button
                            onClick={() => setActiveTab('watermark')}
                            className={`flex-1 min-w-[60px] py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'watermark' ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                        >
                            🏷️ Fondo
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 mb-6">
                        
                        {/* LOGO TAB */}
                        {activeTab === 'logo' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] block mb-3">Sello Oficial</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setLogoSelection('diosmasgym')}
                                            className={`py-3 px-2 text-[9px] font-black uppercase rounded-xl border transition-all ${logoSelection === 'diosmasgym' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20'}`}
                                        >
                                            🏆 Diosmasgym
                                        </button>
                                        <button 
                                            onClick={() => setLogoSelection('none')}
                                            className={`py-3 px-2 text-[9px] font-black uppercase rounded-xl border transition-all ${logoSelection === 'none' ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20'}`}
                                        >
                                            Ninguno
                                        </button>
                                    </div>
                                </div>

                                {logoSelection !== 'none' && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Posición del Sello</label>
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
                                                    <label className="text-[10px] font-bold text-white/70">Tamaño (Def: 19%)</label>
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
                                                <label className="text-[10px] font-bold text-white/70 block mb-2">Color del Listón</label>
                                                <select 
                                                    value={ribbonColor}
                                                    onChange={(e) => setRibbonColor(e.target.value as any)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 outline-none"
                                                >
                                                    <option value="gold">🏆 Oro Degradado</option>
                                                    <option value="black">🖤 Negro Carbón</option>
                                                    <option value="white">🤍 Blanco Nítido</option>
                                                    <option value="red">❤️ Rojo Pasión</option>
                                                    <option value="blue">💙 Azul Rey</option>
                                                    <option value="green">💚 Verde Esmeralda</option>
                                                    <option value="grey">🩶 Gris Traslúcido</option>
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

                        {/* SOCIALS TAB (Includes social media + music platforms) */}
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
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Texto de Redes (Usuario)</label>
                                            <input 
                                                type="text"
                                                value={socialText}
                                                onChange={(e) => setSocialText(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#c5a059]"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-white/70 block mb-2">Redes a Activar</label>
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
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialFacebook} 
                                                        onChange={(e) => setSocialFacebook(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    FB
                                                </label>
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialSpotify} 
                                                        onChange={(e) => setSocialSpotify(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    Spotify
                                                </label>
                                                <label className="flex items-center justify-center gap-2 text-[9px] font-black uppercase py-1.5 rounded cursor-pointer border border-white/5 hover:bg-white/5 transition-all text-zinc-300">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={socialX} 
                                                        onChange={(e) => setSocialX(e.target.checked)}
                                                        className="accent-[#c5a059]"
                                                    />
                                                    X (Twitter)
                                                </label>
                                            </div>
                                        </div>

                                        {/* Music Platforms Section (New) */}
                                        <div className="border-t border-white/5 pt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-[10px] font-bold text-white/70">Cinta "Escucha nuestra música en:"</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={showMusicPlatforms} 
                                                    onChange={(e) => setShowMusicPlatforms(e.target.checked)}
                                                    className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                                />
                                            </div>

                                            {showMusicPlatforms && (
                                                <div className="space-y-3 pl-2 border-l border-white/10">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-white/50 block mb-1">Frase Escucha</label>
                                                        <input 
                                                            type="text"
                                                            value={musicPlatformsText}
                                                            onChange={(e) => setMusicPlatformsText(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-xs text-white outline-none focus:border-[#c5a059]"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-[9px] font-bold text-white/50 block mb-1">Plataformas</label>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-300 cursor-pointer">
                                                                <input type="checkbox" checked={musicSpotify} onChange={(e) => setMusicSpotify(e.target.checked)} className="accent-[#c5a059]" /> Spotify
                                                            </label>
                                                            <label className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-300 cursor-pointer">
                                                                <input type="checkbox" checked={musicApple} onChange={(e) => setMusicApple(e.target.checked)} className="accent-[#c5a059]" /> Apple
                                                            </label>
                                                            <label className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-300 cursor-pointer">
                                                                <input type="checkbox" checked={musicYouTube} onChange={(e) => setMusicYouTube(e.target.checked)} className="accent-[#c5a059]" /> YouTube
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
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
                                                    <option value="white">🤍 Blanco Nítido</option>
                                                    <option value="gold">🏆 Oro Diosmasgym</option>
                                                    <option value="black">🖤 Negro Oscuro</option>
                                                    <option value="green">💚 Verde Neón</option>
                                                    <option value="blue">🩵 Azul Claro</option>
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

                        {/* FRAMES TAB (New Options) */}
                        {activeTab === 'frames' && (
                            <div className="space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] block mb-2">Marco Estético</label>
                                    <select 
                                        value={frameStyle}
                                        onChange={(e) => setFrameStyle(e.target.value as any)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white/80 outline-none focus:border-[#c5a059]"
                                    >
                                        <option value="none">Sin Marco</option>
                                        <option value="cinematic">🎬 Formato Cine (Franjas Negras)</option>
                                        <option value="luxury-gold">🏆 Doble Filete Dorado</option>
                                        <option value="minimalist">🤍 Borde Blanco Minimalista</option>
                                    </select>
                                </div>

                                {frameStyle !== 'none' && (
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[10px] font-bold text-white/70">Opacidad del Marco</label>
                                            <span className="text-[10px] text-[#c5a059]">{frameOpacity}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="20" max="100" 
                                            value={frameOpacity}
                                            onChange={(e) => setFrameOpacity(Number(e.target.value))}
                                            className="w-full accent-[#c5a059]"
                                        />
                                    </div>
                                )}

                                <div className="border-t border-white/5 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-bold text-white/70">Efecto Viñeta (Bordes Oscuros)</label>
                                        <input 
                                            type="checkbox" 
                                            checked={vignetteEnabled} 
                                            onChange={(e) => setVignetteEnabled(e.target.checked)}
                                            className="accent-[#c5a059] w-4 h-4 cursor-pointer"
                                        />
                                    </div>

                                    {vignetteEnabled && (
                                        <div>
                                            <div className="flex justify-between mb-1">
                                                <label className="text-[10px] font-bold text-white/70">Intensidad de Sombra</label>
                                                <span className="text-[10px] text-[#c5a059]">{vignetteStrength}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" max="90" 
                                                value={vignetteStrength}
                                                onChange={(e) => setVignetteStrength(Number(e.target.value))}
                                                className="w-full accent-[#c5a059]"
                                            />
                                        </div>
                                    )}
                                </div>
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
                                                    <label className="text-[10px] font-bold text-white/70">Opacidad (Def: 8%)</label>
                                                    <span className="text-[10px] text-[#c5a059]">{watermarkOpacity}%</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="2" max="80" 
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
