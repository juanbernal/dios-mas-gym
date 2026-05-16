import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { generateLyricStyle } from "../../services/geminiService";

const brandingData = {
  none: { name: "", link: "" },
  juan614: { name: "Juan 614", link: "juan614.diosmasgym.com" },
  diosmasgym: { name: "Diosmasgym", link: "musica.diosmasgym.com" }
};

const emojiMap = {
  none: [] as string[],
  fire: ["🔥", "⚡", "💥", "✨"],
  love: ["❤️", "✨", "☁️", "🌸"],
  stars: ["✨", "🌟", "💫", "✨"],
  music: ["🎵", "🎶", "🎧", "✨"]
};

interface LyricLine {
  time: number;
  text: string;
}

const INTRO_DURATION = 4;
const OUTRO_DURATION = 7;
const MAX_VIDEO_DURATION = 90; // Límite estricto para TikTok (1:30 minutos)
const SYNC_CORRECTION = 0.25; // Ajuste automático de sincronización (segundos)

// --- ANTI-AI ORGANIC NOISE ENGINE ---
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

const LyricStudio: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncIndex, setSyncIndex] = useState(0);
  const [syncLines, setSyncLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [vibe, setVibe] = useState("cinematic");
  const [emojiPack, setEmojiPack] = useState<keyof typeof emojiMap>("none");
  const [fontSize, setFontSize] = useState(50);
  const [textColor, setTextColor] = useState("#ffffff");
  const [glowToggle, setGlowToggle] = useState(true);
  const [leakToggle, setLeakToggle] = useState(true);
  const [branding, setBranding] = useState<keyof typeof brandingData>("none");
  const [rawLyrics, setRawLyrics] = useState("");
  const [lyricsInput, setLyricsInput] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scale, setScale] = useState(1);
  const [includeIntro, setIncludeIntro] = useState(false);
  const [includeOutro, setIncludeOutro] = useState(false);
  const [outroMessage, setOutroMessage] = useState("SÍGUENOS EN REDES SOCIALES");
  const [animationStyle, setAnimationStyle] = useState("fade");
  const [vhsMode, setVhsMode] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [blurAmount, setBlurAmount] = useState(25);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [visualizerStyle, setVisualizerStyle] = useState("bars"); // bars, wave, pulse, dots, circular, hidden
  const [outroImageIndex, setOutroImageIndex] = useState(0); // 0 o 1 para los dos estilos de outro
  const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
  const [imagePromptStatus, setImagePromptStatus] = useState<string>("");
  const [savedDrafts, setSavedDrafts] = useState<{name: string, content: string, sync: string, date: string}[]>([]);
  const [draftName, setDraftName] = useState("");
  const [bloggerDrafts, setBloggerDrafts] = useState<any[]>([]);
  const [isFetchingBlogger, setIsFetchingBlogger] = useState(false);
  const [sheetsSyncUrl, setSheetsSyncUrl] = useState(localStorage.getItem('lyrics_sheets_sync_url') || "");
  const [showBloggerModal, setShowBloggerModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());
  const particlesRef = useRef<any[]>([]);
  
  // Audio Analysis Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number>();
  const logoStudioRef = useRef<HTMLImageElement>(new Image());
  const outroImagesRef = useRef<HTMLImageElement[]>([new Image(), new Image()]);

  useEffect(() => {
    // Initial Particles
    particlesRef.current = Array.from({length: 35}, () => ({
      x: Math.random() * 720,
      y: Math.random() * 1280 + 1280,
      size: 10 + Math.random() * 40,
      speedY: -0.2 - Math.random() * 2.5,
      speedX: (Math.random() - 0.5) * 1.5,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.05,
      opacity: 0.05 + Math.random() * 0.4,
      char: "",
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2
    }));

    logoStudioRef.current.src = "/logo_diosmasgym.png";

    const updateScale = () => {
        if (containerRef.current) {
            const isMobile = window.innerWidth < 768;
            const containerWidth = containerRef.current.offsetWidth - 32;
            const containerHeight = isMobile ? window.innerHeight * 0.4 : containerRef.current.offsetHeight - 100;
            
            const targetWidth = 720;
            const targetHeight = 1280;
            
            const scaleW = containerWidth / targetWidth;
            const scaleH = containerHeight / targetHeight;
            
            // On mobile, we prioritize fitting the width but also respect a max height
            if (isMobile) {
                setScale(Math.min(scaleW, scaleH * 1.2)); // Allow slightly more height on mobile
            } else {
                setScale(Math.min(1, scaleW, scaleH));
            }
        }
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    // Load saved drafts
    const saved = localStorage.getItem('lyric_studio_drafts');
    if (saved) setSavedDrafts(JSON.parse(saved));

    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Effect to load outro images when branding changes
  useEffect(() => {
    if (branding === 'juan614') {
        outroImagesRef.current[0].src = "/outros/outro_juan_1.png";
        outroImagesRef.current[1].src = "/outros/outro_juan_2.png";
    } else if (branding === 'diosmasgym') {
        outroImagesRef.current[0].src = "/outros/outro_dios_1.png";
        outroImagesRef.current[1].src = "/outros/outro_dios_2.png";
    }
  }, [branding]);

  const setupAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      analyserRef.current = audioCtxRef.current!.createAnalyser();
      analyserRef.current.fftSize = 512;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      if (audioRef.current) {
        sourceRef.current = audioCtxRef.current!.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current!.destination);
      }
    } catch (e) {
      console.error("Audio Context Error", e);
    }
  }, []);

  const handleBackupLyrics = () => {
    if (!lyricsInput && !rawLyrics) return;
    const content = lyricsInput || rawLyrics;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Respaldo_Letras_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseLyrics = (input: string): LyricLine[] => {
    return input.split('\n').map(line => {
      const parts = line.split('|');
      if (parts.length < 2) return null;
      return { time: parseFloat(parts[0]), text: parts[1].trim() };
    }).filter((l): l is LyricLine => l !== null).sort((a, b) => a.time - b.time);
  };
  useEffect(() => {
    if (branding === 'diosmasgym') {
      setIncludeIntro(true);
      setIncludeOutro(true);
    }
  }, [branding]);

  const saveDraft = async () => {
    if (!rawLyrics && !lyricsInput) return;
    const name = draftName || `Borrador ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const content = rawLyrics;
    const sync = lyricsInput;
    const date = new Date().toISOString();
    
    const newDraft = { name, content, sync, date };
    const updated = [newDraft, ...savedDrafts].slice(0, 10); // Keep last 10
    setSavedDrafts(updated);
    localStorage.setItem('lyric_studio_drafts', JSON.stringify(updated));
    setDraftName("");
    
    // Auto-sync to cloud if available
    if (sheetsSyncUrl) {
      try {
        const SYNC_SECRET = "DMG_SYNC_2026";
        const queryString = new URLSearchParams({
          action: 'save',
          secret: SYNC_SECRET,
          title: name,
          artist: "Dios Mas Gym", // Default artist for Studio
          date: date
        }).toString();
        
        await fetch(`${sheetsSyncUrl}${sheetsSyncUrl.includes('?') ? '&' : '?'}${queryString}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            secret: SYNC_SECRET,
            title: name,
            artist: "Dios Mas Gym",
            content: content,
            date: date
          })
        });
        console.log("Synced to cloud");
      } catch (e) {
        console.error("Cloud sync error", e);
      }
    }

    alert("✅ Borrador guardado" + (sheetsSyncUrl ? " y sincronizado en la nube." : " localmente."));
  };

  const loadDraft = (draft: any) => {
    setRawLyrics(draft.content);
    setLyricsInput(draft.sync);
  };

  const deleteDraft = (index: number) => {
    const updated = savedDrafts.filter((_, i) => i !== index);
    setSavedDrafts(updated);
    localStorage.setItem('lyric_studio_drafts', JSON.stringify(updated));
  };

  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRawLyrics(ev.target?.result as string);
    reader.readAsText(file);
  };

  const fetchBloggerDrafts = async () => {
    setIsFetchingBlogger(true);
    try {
      let allDrafts: any[] = [];

      // 1. Fetch from Blogger
      try {
        const { fetchArsenalData } = await import('../../services/contentService');
        (window as any).BLOGGER_STATUS = 'DRAFT';
        const result = await fetchArsenalData(50);
        allDrafts = [...(result.posts || [])];
        (window as any).BLOGGER_STATUS = undefined;
      } catch (e) { console.error("Blogger error", e); }

      // 2. Fetch from Google Sheets
      if (sheetsSyncUrl) {
        try {
          const res = await fetch(sheetsSyncUrl);
          if (res.ok) {
            const data = await res.json();
            const sheetDrafts = (data || []).map((l: any) => ({
              title: l.title,
              content: l.content,
              published: l.date,
              type: 'SHEET'
            }));
            allDrafts = [...sheetDrafts, ...allDrafts];
          }
        } catch (e) { console.error("Sheets sync error", e); }
      }

      setBloggerDrafts(allDrafts);
      if (allDrafts.length === 0) alert("No se encontraron borradores en la nube.");
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setIsFetchingBlogger(false);
    }
  };

  const importFromBlogger = (post: any) => {
    // Clean HTML content to plain text
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = post.content;
    setRawLyrics(tempDiv.innerText || tempDiv.textContent || "");
    setShowBloggerModal(false);
  };

  const drawFilmGrain = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    ctx.save();
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * cw;
        const y = Math.random() * ch;
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  };

  const drawLightLeaks = (ctx: CanvasRenderingContext2D, cw: number, ch: number, time: number) => {
    if (!leakToggle) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Leak 1: Warm Orange
    const x1 = cw * (0.5 + Math.sin(time * 0.4) * 0.5);
    const y1 = ch * (0.1 + Math.cos(time * 0.3) * 0.2);
    const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, cw * 0.8);
    grad1.addColorStop(0, 'rgba(255, 100, 0, 0.15)');
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, cw, ch);

    // Leak 2: Soft Blue
    const x2 = cw * (0.2 + Math.cos(time * 0.5) * 0.3);
    const y2 = ch * (0.8 + Math.sin(time * 0.6) * 0.2);
    const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, cw * 0.6);
    grad2.addColorStop(0, 'rgba(0, 150, 255, 0.1)');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, cw, ch);
    
    ctx.restore();
  };

  const drawProgressBar = (ctx: CanvasRenderingContext2D, cw: number, ch: number, pct: number) => {
    ctx.save();
    const barW = cw - 80;
    const barH = 4;
    const bx = 40, by = ch - 20;
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath(); (ctx as any).roundRect(bx, by, barW, barH, 2); ctx.fill();
    
    // Progress
    const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    grad.addColorStop(0, '#00ffcc');
    grad.addColorStop(1, '#0099ff');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 10;
    ctx.beginPath(); (ctx as any).roundRect(bx, by, barW * (pct / 100), barH, 2); ctx.fill();
    ctx.restore();
  };

  const applyChromaticAberration = (ctx: CanvasRenderingContext2D, cw: number, ch: number, amount: number) => {
    // Faux aberration by drawing offset overlays with blend modes
  };

  const drawGlobalVignette = (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
    const vGrad = ctx.createRadialGradient(cw/2, ch/2, cw/4, cw/2, ch/2, ch*0.9);
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vGrad; ctx.fillRect(0,0,cw,ch);
  };

  const renderAudioSpectrum = (ctx: CanvasRenderingContext2D, cw: number, ch: number, lowEnd: number, time: number) => {
    if (!dataArrayRef.current) return;
    
    const barsCount = 100;
    const barW = cw / barsCount;

    if (visualizerStyle === 'bars') {
        // URBAN GOLD BARS (Organic/Anti-AI)
        ctx.save();
        for (let i = 0; i < barsCount; i++) {
            const val = dataArrayRef.current[i % dataArrayRef.current.length];
            const noiseFactor = smoothNoise(i * 0.1 + (time || 0) * 2) * 15;
            const h = Math.max(0, (val / 255) * 120 * sensitivity + noiseFactor);
            const grad = ctx.createLinearGradient(0, ch - h - 40, 0, ch - 40);
            grad.addColorStop(0, '#c5a059'); // Gold
            grad.addColorStop(1, 'rgba(197, 160, 89, 0.1)');
            ctx.fillStyle = grad;
            ctx.shadowColor = '#c5a059';
            ctx.shadowBlur = lowEnd > 0.6 ? 15 : 5;
            ctx.fillRect(i * barW, ch - h - 40, barW - 2, h);
        }
        ctx.restore();
    } else if (visualizerStyle === 'wave') {
        // DIGITAL CYAN WAVE (Jagged/Organic)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, ch - 150);
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00f2ff';
        ctx.shadowBlur = 20;
        for (let i = 0; i < cw; i += 5) {
            const idx = Math.floor((i / cw) * dataArrayRef.current.length);
            const val = dataArrayRef.current[idx];
            const noiseJitter = smoothNoise(i * 0.05 + (time || 0) * 3) * 10;
            const y = ch - 150 - (val / 255) * 100 * sensitivity + noiseJitter;
            ctx.lineTo(i, y);
        }
        ctx.stroke();
        
        ctx.lineTo(cw, ch);
        ctx.lineTo(0, ch);
        const grad = ctx.createLinearGradient(0, ch - 250, 0, ch);
        grad.addColorStop(0, 'rgba(0, 242, 255, 0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    } else if (visualizerStyle === 'pulse') {
        // NEON RED PULSE
        ctx.save();
        const pSize = 300 + (lowEnd * 200 * sensitivity);
        const grad = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, pSize);
        grad.addColorStop(0, 'rgba(255, 0, 80, 0.15)');
        grad.addColorStop(0.5, 'rgba(255, 0, 80, 0.05)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cw/2, ch/2, pSize, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    } else if (visualizerStyle === 'dots') {
        // MINIMAL WHITE DOTS
        ctx.save();
        for (let i = 0; i < 40; i++) {
            const idx = Math.floor((i / 40) * dataArrayRef.current.length);
            const val = dataArrayRef.current[idx];
            const x = (i / 40) * cw + barW/2;
            const y = ch - 100 - (val / 255) * 200 * sensitivity;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
            if (lowEnd > 0.5) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, ch); ctx.stroke();
            }
        }
        ctx.restore();
    } else if (visualizerStyle === 'circular') {
        // PREVIOUS CIRCULAR (KEEP AS OPTION)
        const bars = 60;
        const radius = 220 + (lowEnd * 50 * sensitivity);
        ctx.save();
        ctx.translate(cw/2, ch/2 - 120);
        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const val = dataArrayRef.current[(i * 2) % dataArrayRef.current.length] / 2;
            const h = 5 + (val * 0.5);
            ctx.save();
            ctx.rotate(angle);
            ctx.fillStyle = `rgba(0, 255, 204, ${0.4 + (val/255)})`;
            ctx.shadowColor = '#00ffcc';
            ctx.shadowBlur = 10;
            ctx.fillRect(radius, -1, h, 2);
            ctx.restore();
        }
        ctx.restore();
    }
  };

  const renderIntro = (ctx: CanvasRenderingContext2D, time: number, cw: number, ch: number) => {
    const fadeIn  = Math.min(time / 0.8, 1);
    const fadeOut = Math.min((INTRO_DURATION - time) / 0.8, 1);
    const alpha   = fadeIn * fadeOut;
    ctx.save();

    // 1. Deep Black Base
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    // 2. Cinematic smoke rings
    for (let i = 0; i < 5; i++) {
      const motion = time * 0.3 + i * 1.2;
      const x = cw / 2 + Math.cos(motion) * 140;
      const y = ch / 2 + Math.sin(motion * 0.7) * 100;
      const r  = 280 + Math.sin(time + i) * 40;
      const g  = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(197,160,89,${0.07 * alpha})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 3. Golden particle rain (Anti-AI randomized)
    const seed = Math.floor(time * 30 + smoothNoise(time) * 100);
    for (let i = 0; i < 60; i++) {
      const px = ((i * 137 + seed * 31) % cw);
      const py = ((i * 97  + seed * 17) % ch);
      const ps = 1 + (i % 3);
      const pa = (0.2 + (i % 5) * 0.08) * alpha;
      ctx.save();
      ctx.globalAlpha = pa;
      ctx.fillStyle = '#c5a059';
      ctx.shadowColor = '#c5a059';
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // 4. Logo reveal — use the real Diosmasgym Records logo
    const logo = logoStudioRef.current;
    if (logo.complete && logo.naturalWidth > 0) {
      const prog = Math.min(time / 1.8, 1);
      const logoH = ch * 0.38;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.save();
      ctx.translate(cw / 2, ch / 2 - 60);
      ctx.globalAlpha = alpha * prog;
      // Subtle scale-up from 0.85 to 1.0
      const s = 0.85 + prog * 0.15;
      ctx.scale(s, s);
      // Gold halo under logo
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, logoW * 0.7);
      halo.addColorStop(0, `rgba(197,160,89,${0.25 * alpha})`);
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, logoW * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(logo, -logoW / 2, -logoH / 2, logoW, logoH);
      ctx.restore();
    }

    // 5. "PRESENTA" text with tracking animation
    const txtProg = Math.min(Math.max((time - 1.2) / 1.2, 0), 1);
    if (txtProg > 0) {
      ctx.save();
      ctx.globalAlpha = txtProg * fadeOut;
      ctx.textAlign = 'center';
      // Label
      ctx.font = '700 22px Montserrat';
      ctx.letterSpacing = '10px';
      ctx.fillStyle = 'rgba(197,160,89,0.85)';
      ctx.fillText('DIOSMASGYM RECORDS', cw / 2, ch / 2 + ch * 0.22);
      // Separator line
      const lineW = 80 * txtProg;
      ctx.strokeStyle = 'rgba(197,160,89,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cw / 2 - lineW, ch / 2 + ch * 0.245);
      ctx.lineTo(cw / 2 + lineW, ch / 2 + ch * 0.245);
      ctx.stroke();
      // PRESENTA
      ctx.font = `900 ${68 + txtProg * 10}px Montserrat`;
      ctx.letterSpacing = `${txtProg * 12}px`;
      const tg = ctx.createLinearGradient(0, ch / 2 + ch * 0.26, 0, ch / 2 + ch * 0.35);
      tg.addColorStop(0, '#fff');
      tg.addColorStop(1, '#c5a059');
      ctx.fillStyle = tg;
      ctx.shadowColor = 'rgba(197,160,89,0.6)';
      ctx.shadowBlur = 30 * alpha;
      ctx.fillText('PRESENTA', cw / 2, ch / 2 + ch * 0.32);
      ctx.restore();
    }

    ctx.restore();
  };

  const renderOutro = (ctx: CanvasRenderingContext2D, time: number, cw: number, ch: number) => {
    const fadeIn = Math.min(time / 0.9, 1);
    ctx.save();

    // Try to draw branding image from /outros/ if available
    const brandingImg = outroImagesRef.current[outroImageIndex];
    if (brandingImg && brandingImg.complete && brandingImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = fadeIn;
        // Cover logic
        const s = Math.max(cw / brandingImg.width, ch / brandingImg.height);
        ctx.translate(cw/2, ch/2);
        ctx.scale(s, s);
        ctx.drawImage(brandingImg, -brandingImg.width/2, -brandingImg.height/2);
        ctx.restore();
        ctx.restore();
        return;
    }

    // 1. Dark background with album art blur
    if (imgRef.current.src) {
      const src = imgRef.current;
      const sc = Math.max(cw / (src.width || cw), ch / (src.height || ch)) * 1.15;
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(sc, sc);
      ctx.filter = 'blur(50px) brightness(0.18) saturate(0.4)';
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#08090e';
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.filter = 'none';

    // 2. Bokeh gold particles
    const seed = Math.floor(time * 15);
    for (let i = 0; i < 18; i++) {
      const bx = ((i * 173 + seed * 41) % cw);
      const by = ((i * 113 + seed * 29) % ch);
      const br = 18 + (i % 4) * 12;
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg2.addColorStop(0, `rgba(197,160,89,${(0.06 + (i%3)*0.02) * fadeIn})`);
      bg2.addColorStop(1, 'transparent');
      ctx.fillStyle = bg2;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 3. Logo
    const logo = logoStudioRef.current;
    const logoProg = Math.min(time / 1.2, 1);
    if (logo.complete && logo.naturalWidth > 0) {
      const lH = ch * 0.22;
      const lW = (logo.width / logo.height) * lH;
      ctx.save();
      ctx.globalAlpha = logoProg * fadeIn;
      const s2 = 0.8 + logoProg * 0.2;
      ctx.translate(cw / 2, ch * 0.175);
      ctx.scale(s2, s2);
      ctx.drawImage(logo, -lW / 2, -lH / 2, lW, lH);
      ctx.restore();
    }

    // 4. Headline
    ctx.save();
    ctx.globalAlpha = Math.min(Math.max((time - 0.5) / 0.8, 0), 1) * fadeIn;
    ctx.textAlign = 'center';
    ctx.font = '900 54px Montserrat';
    ctx.letterSpacing = '4px';
    const hg = ctx.createLinearGradient(0, ch * 0.33, 0, ch * 0.42);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(1, '#c5a059');
    ctx.fillStyle = hg;
    ctx.shadowColor = 'rgba(197,160,89,0.4)';
    ctx.shadowBlur = 20;
    ctx.fillText('\u00daNet', cw / 2, ch * 0.375);
    ctx.font = '900 52px Montserrat';
    ctx.fillText('a la comunidad', cw / 2, ch * 0.425);
    // Thin separator
    ctx.strokeStyle = 'rgba(197,160,89,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cw / 2 - 60, ch * 0.445);
    ctx.lineTo(cw / 2 + 60, ch * 0.445);
    ctx.stroke();
    ctx.font = '400 20px Inter';
    ctx.letterSpacing = '6px';
    ctx.fillStyle = 'rgba(197,160,89,0.7)';
    ctx.fillText('@DIOSMASGYM', cw / 2, ch * 0.468);
    ctx.restore();

    // 5. Social platform cards
    const platforms = [
      { name: 'INSTAGRAM', handle: '@diosmasgym',   color: '#E1306C', icon: 'inst' },
      { name: 'TIKTOK',    handle: '@diosmasgym',   color: '#ffffff', icon: 'tiktok' },
      { name: 'YOUTUBE',   handle: 'Diosmasgym Records', color: '#FF0000', icon: 'yt' },
      { name: 'SPOTIFY',   handle: 'Diosmasgym',    color: '#1DB954', icon: 'spot' },
    ];

    const cardW = cw * 0.82;
    const cardH = ch * 0.075;
    const cardX = (cw - cardW) / 2;
    const startY = ch * 0.51;
    const gap = cardH + ch * 0.014;

    platforms.forEach((p, i) => {
      const delay = 0.3 + i * 0.15;
      const pAlpha = Math.min(Math.max((time - delay) / 0.5, 0), 1);
      const slideY = (1 - pAlpha) * 40;

      ctx.save();
      ctx.globalAlpha = pAlpha * fadeIn;
      const cy2 = startY + i * gap + slideY;

      // Card background
      const cg = ctx.createLinearGradient(cardX, cy2, cardX + cardW, cy2);
      cg.addColorStop(0, 'rgba(255,255,255,0.09)');
      cg.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = cg;
      ctx.strokeStyle = `${p.color}44`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      (ctx as any).roundRect(cardX, cy2, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      // Color accent left strip
      ctx.fillStyle = p.color;
      ctx.beginPath();
      (ctx as any).roundRect(cardX, cy2, 5, cardH, [14, 0, 0, 14]);
      ctx.fill();

      // Icon circle
      const iconX = cardX + cardH * 0.5 + 12;
      const iconCY = cy2 + cardH / 2;
      const iconR = cardH * 0.33;
      ctx.fillStyle = `${p.color}22`;
      ctx.beginPath(); ctx.arc(iconX, iconCY, iconR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(iconX, iconCY, iconR * 0.55, 0, Math.PI * 2); ctx.fill();

      // Platform name
      ctx.textAlign = 'left';
      ctx.font = `900 ${cardH * 0.32}px Montserrat`;
      ctx.letterSpacing = '2px';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillText(p.name, iconX + iconR + 16, cy2 + cardH * 0.41);

      // Handle
      ctx.font = `400 ${cardH * 0.26}px Inter`;
      ctx.letterSpacing = '0px';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(p.handle, iconX + iconR + 16, cy2 + cardH * 0.72);

      // Arrow
      ctx.textAlign = 'right';
      ctx.font = `700 ${cardH * 0.3}px Inter`;
      ctx.fillStyle = `${p.color}cc`;
      ctx.fillText('\u2192', cardX + cardW - 18, cy2 + cardH / 2 + cardH * 0.1);

      ctx.restore();
    });

    // 6. Bottom tagline
    const tagAlpha = Math.min(Math.max((time - 1.5) / 0.8, 0), 1) * fadeIn;
    if (tagAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = tagAlpha * 0.5;
      ctx.textAlign = 'center';
      ctx.font = '400 18px Inter';
      ctx.letterSpacing = '3px';
      ctx.fillStyle = '#c5a059';
      ctx.fillText('musica.diosmasgym.com', cw / 2, ch * 0.965);
      ctx.restore();
    }

    ctx.restore();
  };

  const drawSocialLogo = (ctx: CanvasRenderingContext2D, logo: any, x: number, y: number) => {
    // Icon Box (Glassmorphism)
    const size = 100;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-size/2, -size/2, size, size, 25); ctx.fill(); ctx.stroke();

    // Glow
    const iconGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
    iconGlow.addColorStop(0, `${logo.color}44`);
    iconGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = iconGlow;
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI*2); ctx.fill();

    // Drawing the actual paths
    if (logo.platform === 'Spotify') {
        ctx.fillStyle = logo.color;
        ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for(let j=0; j<3; j++) {
            ctx.beginPath();
            ctx.arc(0, 6, 22 - j*7, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
        }
    } else if (logo.platform === 'Instagram') {
        const instGrad = ctx.createLinearGradient(-30, 30, 30, -30);
        instGrad.addColorStop(0, '#f09433'); instGrad.addColorStop(1, '#bc1888');
        ctx.strokeStyle = instGrad; ctx.lineWidth = 7;
        ctx.strokeRect(-28, -28, 56, 56);
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = instGrad; ctx.beginPath(); ctx.arc(18, -18, 4, 0, Math.PI*2); ctx.fill();
    } else if (logo.platform === 'YouTube') {
        ctx.fillStyle = logo.color;
        ctx.beginPath(); ctx.roundRect(-40, -28, 80, 56, 12); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-12, -18); ctx.lineTo(18, 0); ctx.lineTo(-12, 18); ctx.closePath(); ctx.fill();
    }
  };

  const renderFrame = (absoluteTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    let effectiveTime = absoluteTime;
    let phase = 'lyrics'; // intro, lyrics, outro

    const actualIntroDuration = includeIntro ? INTRO_DURATION : 0;
    const lyrics = parseLyrics(lyricsInput);
    const lyricsDuration = lyrics.length > 0 ? (lyrics[lyrics.length - 1].time + 3.0) : 0;

    if (includeIntro && absoluteTime < actualIntroDuration) {
        phase = 'intro';
    } else if (includeOutro && absoluteTime > actualIntroDuration + lyricsDuration) {
        phase = 'outro';
        effectiveTime = absoluteTime - (actualIntroDuration + lyricsDuration);
    } else {
        phase = 'lyrics';
        effectiveTime = absoluteTime - actualIntroDuration;
    }

    if (phase === 'intro') {
        renderIntro(ctx, absoluteTime, cw, ch);
        drawFilmGrain(ctx, cw, ch);
        drawGlobalVignette(ctx, cw, ch);
        return;
    }

    if (phase === 'outro') {
        renderOutro(ctx, effectiveTime, cw, ch);
        drawFilmGrain(ctx, cw, ch);
        drawGlobalVignette(ctx, cw, ch);
        return;
    }

    const time = effectiveTime;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);

    let audioIntensity = 0;
    let lowEnd = 0;
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0; 
      for(let i=0; i<dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
      audioIntensity = (sum / dataArrayRef.current.length) / 255;
      
      let lowSum = 0; 
      for(let i=0; i<8; i++) lowSum += dataArrayRef.current[i];
      lowEnd = (lowSum / 8) / 255;
    }

    // 1. Fondo Cinemático
    ctx.save();
    const sourceImg = imgRef.current;
    let scale = Math.max(cw / (sourceImg.width || cw), ch / (sourceImg.height || ch));
    
    // Organic Handheld Camera (Anti-AI)
    const nX = smoothNoise(time * 0.8) - 0.5;
    const nY = smoothNoise(time * 0.7 + 100) - 0.5;
    
    let panX = nX * 40 + Math.sin(time * 0.1) * 15;
    let panY = nY * 30 + Math.cos(time * 0.08) * 10;
    let shake = (lowEnd > 0.7) ? (Math.random()-0.5) * 12 * lowEnd : 0;
    let zoom = 1.05 + (lowEnd * 0.06) + smoothNoise(time * 0.2) * 0.05;

    // Breath effect
    const breath = 1 + smoothNoise(time * 0.4) * 0.03;
    
    ctx.translate(cw/2 + panX + shake, ch/2 + panY + shake);
    ctx.scale(scale * zoom * breath, scale * zoom * breath);
    
    if (sourceImg.src) {
      ctx.translate(-sourceImg.width/2, -sourceImg.height/2);
      if (lowEnd > 0.75) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(sourceImg, 4, 0);
        ctx.drawImage(sourceImg, -4, 0);
        ctx.globalAlpha = 1.0;
      }
      ctx.drawImage(sourceImg, 0, 0);
    }
    ctx.restore();

    // Filters
    if (vibe === 'party') ctx.filter = `hue-rotate(${time * 30}deg) saturate(1.2)`;
    if (vibe === 'retro') ctx.filter = `sepia(0.3) contrast(1.1) brightness(0.9)`;
    if (vibe === 'glitch' && Math.random() > 0.96) ctx.filter = `invert(0.1) contrast(2)`;
    
    const vGrad = ctx.createRadialGradient(cw/2, ch/2, cw/4, cw/2, ch/2, ch*0.9);
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vGrad; ctx.fillRect(0,0,cw,ch);
    ctx.filter = 'none';

    drawLightLeaks(ctx, cw, ch, time);
    drawProgressBar(ctx, cw, ch, (time / (duration || 1)) * 100);
    renderAudioSpectrum(ctx, cw, ch, lowEnd * sensitivity, time);

    if (vhsMode) {
      ctx.save();
      
      // Sporadic Tracking Errors (Anti-AI)
      if (lowEnd > 0.85 || Math.random() > 0.97) {
        const tearY = Math.random() * ch;
        const tearH = Math.random() * 20 + 5;
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'color-dodge';
        ctx.fillStyle = Math.random() > 0.5 ? '#ff0055' : '#00ffcc';
        ctx.fillRect(0, tearY, cw, tearH);
        ctx.translate((Math.random()-0.5)*10, 0);
      }

      ctx.globalAlpha = 0.1 + smoothNoise(time * 5) * 0.05;
      ctx.fillStyle = '#fff';
      if (Math.random() > 0.8) ctx.fillRect(0, Math.random() * ch, cw, Math.random() * 4);
      ctx.restore();
      
      // Chromatic Aberration Jitter
      if (lowEnd > 0.8) ctx.translate((Math.random()-0.5)*6, (Math.random()-0.5)*6);
    }

    // Title Card Overlay (First 5 seconds of lyrics)
    if (time > 0 && time < 5) {
      const tAlpha = Math.min(time / 1, 1) * Math.min((5 - time) / 1, 1);
      ctx.save();
      ctx.globalAlpha = tAlpha;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = '900 40px Montserrat';
      ctx.shadowColor = 'rgba(0, 255, 204, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText("NOW PLAYING", 60, 100);
      
      const bData = brandingData[branding];
      const artistTitle = bData.name ? bData.name.toUpperCase() : "DIOSMASGYM";
      
      ctx.font = '400 20px Inter';
      ctx.letterSpacing = '8px';
      ctx.fillText(artistTitle, 60, 140);
      
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(60, 160); ctx.lineTo(160, 160); ctx.stroke();
      ctx.restore();
    }

    // Particles (Organic Physics-based)
    const pack = emojiMap[emojiPack];
    particlesRef.current.forEach((p, idx) => {
      // Wind and drag
      p.wobble += p.wobbleSpeed;
      const windX = Math.sin(p.wobble) * 0.5 + smoothNoise(time * 0.5 + idx) * 2;
      
      p.y += (p.speedY - lowEnd * 2);
      p.x += p.speedX + windX;
      p.rotation += p.rotationSpeed;

      if (p.y < -100 || p.x < -100 || p.x > cw + 100) { 
        p.y = ch + 50; 
        p.x = Math.random() * cw; 
        p.char = pack[Math.floor(Math.random()*pack.length)] || ""; 
        p.speedY = -0.2 - Math.random() * 2.5;
        p.speedX = (Math.random() - 0.5) * 1.5;
      }
      
      ctx.save();
      // Flicker opacity slightly
      ctx.globalAlpha = p.opacity * (0.8 + 0.2 * Math.sin(time * 5 + idx));
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      
      if (p.char) {
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.char, 0, 0);
      } else {
        // Abstract dust instead of perfect circles
        ctx.fillStyle = vibe === 'party' ? `hsl(${time*100 + idx*10}, 70%, 70%)` : 'rgba(255,255,255,0.8)';
        ctx.shadowColor = vibe === 'party' ? `hsl(${time*100 + idx*10}, 70%, 70%)` : 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 10;
        
        ctx.beginPath(); 
        ctx.ellipse(0, 0, p.size/8, p.size/12, 0, 0, Math.PI*2); 
        ctx.fill();
      }
      ctx.restore();
    });

    // Branding
    if (branding !== 'none') {
      const b = brandingData[branding];
      ctx.save();
      const bx = cw/2 - 220, by = ch - 120, bw = 440, bh = 70;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); (ctx as any).roundRect(bx, by, bw, bh, 20); ctx.fill(); ctx.stroke();
      
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '800 24px Montserrat';
      ctx.fillText(b.name.toUpperCase(), cw/2, by + 32);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 14px Inter';
      ctx.fillText(b.link, cw/2, by + 54);
      ctx.restore();
    }

    // Lyrics (Kinetic Typography Anti-AI)
    const activeIdx = lyrics.findIndex(l => time >= l.time && time < (lyrics[lyrics.indexOf(l) + 1]?.time || 999));
    const active = lyrics[activeIdx];
    
    if (active && active.text.trim() !== "" && active.text !== "[SILENCIO]") {
      const elapsed = time - active.time;
      let alpha = Math.min(elapsed / 0.45, 1);
      const next = lyrics[activeIdx + 1];
      if (next && (next.time - time) < 0.3) alpha = Math.max((next.time - time) / 0.3, 0);

      ctx.save();
      const yPos = ch / 2;
      
      if (glowToggle) {
        const glow = ctx.createRadialGradient(cw/2, yPos, 0, cw/2, yPos, cw*0.7);
        glow.addColorStop(0, `rgba(0,0,0,${alpha * 0.8})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, yPos - 200, cw, 400);
      }

      ctx.translate(cw/2, yPos);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;

      // Organic Motion Blur & Non-Linear easing
      const easing = 1 - Math.pow(1 - alpha, 3); // Cubic out
      
      if (animationStyle === 'slide') {
          ctx.translate(0, (1 - easing) * 60);
          if (alpha < 1) ctx.filter = `blur(${(1 - alpha) * 10}px)`;
      } else if (animationStyle === 'zoom') {
          const s = 0.7 + (easing * 0.3);
          ctx.scale(s, s);
          if (alpha < 1) ctx.filter = `blur(${(1 - alpha) * 15}px)`;
      } else {
          // Fade + Organic Drift
          const driftX = smoothNoise(active.time) * 20 * (1 - easing);
          const driftY = smoothNoise(active.time + 10) * 20 * (1 - easing);
          ctx.translate(driftX, driftY);
          const blur = Math.max(0, (1 - easing) * 15);
          if (blur > 0) ctx.filter = `blur(${blur}px)`;
      }

      const words = active.text.toUpperCase().split(' ');
      let lineText = '', linesArr: string[] = [];
      ctx.font = `900 ${fontSize}px Montserrat`;
      words.forEach(w => {
        if (ctx.measureText(lineText + w).width > cw * 0.85) { linesArr.push(lineText); lineText = w + ' '; }
        else lineText += w + ' ';
      });
      linesArr.push(lineText);

      linesArr.forEach((l, i) => {
        const ly = (i - (linesArr.length-1)/2) * (fontSize * 1.35);
        const lineTrimmed = l.trim();
        
        ctx.save();
        ctx.translate(0, ly);
        
        // Jitter text slightly based on audio intensity
        const jitterX = (lowEnd > 0.8) ? (Math.random() - 0.5) * 4 : 0;
        const jitterY = (lowEnd > 0.8) ? (Math.random() - 0.5) * 4 : 0;
        ctx.translate(jitterX, jitterY);

        ctx.font = `900 ${fontSize + (lowEnd * 3)}px Montserrat`;
        ctx.shadowColor = '#000'; ctx.shadowBlur = 30;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 12;
        ctx.strokeText(lineTrimmed, 0, 0);
        
        if (glowToggle) {
          ctx.shadowColor = textColor;
          ctx.shadowBlur = 8 + (lowEnd * 15);
        }

        ctx.fillStyle = textColor;
        ctx.fillText(lineTrimmed, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }
  };

  const startTimeRef = useRef<number>(0);

  const animate = useCallback((time: number) => {
    if (isPlaying && !isExporting) {
      const actualIntro = includeIntro ? INTRO_DURATION : 0;
      let visualTime = 0;
      
      if (audioRef.current && !audioRef.current.paused) {
          visualTime = audioRef.current.currentTime + actualIntro;
      } else {
          if (startTimeRef.current === 0) startTimeRef.current = performance.now();
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          visualTime = Math.min(elapsed, actualIntro);
      }

      setCurrentTime(visualTime);
      renderFrame(visualTime);
      requestRef.current = requestAnimationFrame(animate);
    } else if (!isExporting) {
      startTimeRef.current = 0;
      renderFrame(currentTime);
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, isExporting, lyricsInput, vibe, emojiPack, fontSize, textColor, glowToggle, branding, includeIntro, includeOutro, currentTime, animationStyle, vhsMode, sensitivity, customLogo, visualizerStyle]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  const handlePlayToggle = () => {
    setupAudio();
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (includeIntro) {
          setCurrentTime(0);
          setIsPlaying(true);
          startTimeRef.current = performance.now();
          setTimeout(() => {
              if (audioRef.current && isPlaying) { 
                  audioRef.current.play();
              }
          }, INTRO_DURATION * 1000);
      } else {
          audioRef.current?.play();
          setIsPlaying(true);
          startTimeRef.current = 0;
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => imgRef.current.src = ev.target?.result as string;
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);
    }
  };

  const handleExport = async () => {
    const lyrics = parseLyrics(lyricsInput);
    if (!audioRef.current?.src || lyrics.length === 0) return alert("Sincroniza primero.");
    if (!canvasRef.current) return;

    setIsExporting(true); setIsPlaying(false); audioRef.current.pause();
    
    setupAudio();
    const stream = canvasRef.current.captureStream(60); 
    const audioStreamDest = audioCtxRef.current!.createMediaStreamDestination();
    
    sourceRef.current?.disconnect();
    sourceRef.current?.connect(audioStreamDest);
    sourceRef.current?.connect(analyserRef.current!);
    
    stream.addTrack(audioStreamDest.stream.getAudioTracks()[0]);

    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9,opus', 
      videoBitsPerSecond: 20000000 
    });

    const chunksArr: Blob[] = [];
    recorder.ondataavailable = e => chunksArr.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksArr, { type: 'video/webm' });
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob);
      a.download = `master-premium-video.webm`; a.click();
      
      sourceRef.current?.disconnect();
      sourceRef.current?.connect(analyserRef.current!);
      analyserRef.current?.connect(audioCtxRef.current!.destination);
      
      setIsExporting(false);
      setProgress(0);
    };

    const lyricsDuration = lyrics[lyrics.length - 1].time + 3.0;
    const actualIntro = includeIntro ? INTRO_DURATION : 0;
    const actualOutro = includeOutro ? OUTRO_DURATION : 0;
    const totalDuration = actualIntro + lyricsDuration + actualOutro;

    recorder.start(); 
    audioRef.current.currentTime = 0; 
    
    let exportTime = 0;
    let lastRealTime = performance.now();

    const recordLoop = (now: number) => {
      if (!audioRef.current) return;
      
      const dt = Math.min((now - lastRealTime) / 1000, 0.1); 
      lastRealTime = now;
      exportTime += dt;

      const frameTime = exportTime;
      renderFrame(frameTime);
      
      const pct = Math.min((frameTime / totalDuration) * 100, 100);
      setProgress(pct);

      // Sincronización de Audio
      if (frameTime >= actualIntro && frameTime < actualIntro + lyricsDuration) {
          if (audioRef.current.paused) {
              audioRef.current.play().catch(e => console.error("Auto-play blocked", e));
          }
      } else {
          if (!audioRef.current.paused) audioRef.current.pause();
      }
      
      if (frameTime < totalDuration) {
        requestAnimationFrame(recordLoop);
      } else {
        recorder.stop();
      }
    };
    requestAnimationFrame(recordLoop);
  };

  const startSync = () => {
    const lines = rawLyrics.split('\n').filter(l => l.trim() !== "");
    if (lines.length === 0) return alert("Pega la letra.");
    setSyncLines(lines);
    setSyncIndex(0);
    setIsSyncing(true);
    setLyricsInput("");
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
        setupAudio();
    }
  };

  const markTime = () => {
    if (!isSyncing || syncIndex >= syncLines.length) return;
    if (!audioRef.current) return;
    
    // Aplicación de corrección automática fija (+0.25s para compensar latencia/adelanto)
    const rawTime = audioRef.current.currentTime + SYNC_CORRECTION;
    if (rawTime > MAX_VIDEO_DURATION) {
        setIsSyncing(false);
        return;
    }
    const correctedTime = rawTime.toFixed(2);
    setLyricsInput(prev => prev + `${correctedTime} | ${syncLines[syncIndex]}\n`);
    const nextIdx = syncIndex + 1;
    setSyncIndex(nextIdx);
    
    if (nextIdx >= syncLines.length) {
        setIsSyncing(false);
    }
  };

  const markSilence = () => {
    if (!isSyncing) return;
    if (!audioRef.current) return;
    const rawTime = audioRef.current.currentTime + SYNC_CORRECTION;
    if (rawTime > MAX_VIDEO_DURATION) return;
    const time = rawTime.toFixed(2);
    setLyricsInput(prev => prev + `${time} | [SILENCIO]\n`);
  };

  const aiSync = async () => {
    if (!rawLyrics.trim()) return;
    alert("Función IA requiere configuración de API Key.");
    // In a real scenario, we would call Gemini here
  };

  const handleMagicDesign = async () => {
      const lyricsToSend = rawLyrics.trim() || lyricsInput.trim();
      if (!lyricsToSend) {
          alert("Por favor pega o escribe la letra primero para que la IA se base en ella.");
          return;
      }
      setIsGeneratingStyle(true);
      try {
          const config = await generateLyricStyle(lyricsToSend);
          if (config) {
              if (config.visualizerStyle) setVisualizerStyle(config.visualizerStyle);
              if (config.vibe) setVibe(config.vibe);
              if (config.emojiPack) setEmojiPack(config.emojiPack);
              if (config.animationStyle) setAnimationStyle(config.animationStyle);
              if (config.sensitivity !== undefined) setSensitivity(config.sensitivity);
              if (config.fontSize) setFontSize(config.fontSize);
              if (config.textColor) setTextColor(config.textColor);
              if (config.glowToggle !== undefined) setGlowToggle(config.glowToggle);
              if (config.leakToggle !== undefined) setLeakToggle(config.leakToggle);
              if (config.vhsMode !== undefined) setVhsMode(config.vhsMode);

              if (config.imagePrompt) {
                  setImagePromptStatus("Pintando fondo con IA...");
                  const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(config.imagePrompt)}?width=720&height=1280&nologo=true`;
                  imgRef.current.crossOrigin = "anonymous";
                  imgRef.current.src = imgUrl;
              }
          }
      } catch (error) {
          console.error("Failed to generate magic design", error);
          alert("Hubo un error al generar el diseño con IA.");
      } finally {
          setIsGeneratingStyle(false);
          setTimeout(() => setImagePromptStatus(""), 3000);
      }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-[#030305] text-white">
      {/* PREVIEW AREA */}
      <main 
        ref={containerRef}
        className="flex-none md:flex-1 flex flex-col items-center justify-center bg-black p-4 relative sticky top-0 z-[50] md:relative shadow-2xl shadow-black border-b border-white/5"
        style={{ height: window.innerWidth < 768 ? '45vh' : 'auto' }}
      >
        <div 
            className="relative bg-black rounded-[24px] shadow-2xl overflow-hidden shadow-cyan-500/10"
            style={{ 
                width: 720 * scale, 
                height: 1280 * scale 
            }}
        >
          <canvas 
            ref={canvasRef} 
            width="720" 
            height="1280" 
            className="block origin-top-left"
            style={{ 
                width: 720, 
                height: 1280,
                transform: `scale(${scale})`
            }} 
          />
        </div>
        
        <div className="mt-2 flex flex-col items-center gap-2 w-full scale-75 md:scale-100">
          <div className="flex items-center justify-between w-full max-w-xs bg-white/5 backdrop-blur-xl px-6 py-2 rounded-full border border-white/10 shadow-lg">
            <button 
                onClick={handlePlayToggle}
                className="text-[9px] font-black uppercase tracking-[0.2em] hover:text-[#00ffcc] transition-all"
            >
                {isPlaying ? "Pausar" : "Vista Previa"}
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-2"></div>
            <span className="text-[9px] font-mono text-zinc-400">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
          <audio 
            ref={audioRef} 
            className="hidden" 
            onLoadedMetadata={(e) => {
                const d = Math.min(e.currentTarget.duration, MAX_VIDEO_DURATION);
                setDuration(d);
            }}
            onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime > MAX_VIDEO_DURATION) {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = MAX_VIDEO_DURATION;
                    setIsPlaying(false);
                }
                setCurrentTime(e.currentTarget.currentTime);
            }}
          />
        </div>
      </main>

      {/* CONTROL SIDEBAR */}
      <aside className="flex-1 md:flex-none md:w-[420px] bg-[#0a0a0f] border-l border-white/5 p-8 custom-scrollbar overflow-y-auto">
        <button 
          onClick={() => navigate('/admin')}
          className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-[#00ffcc] transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          Volver al Panel
        </button>

        <div className="flex items-center gap-3 mb-10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ffcc] shadow-[0_0_15px_#00ffcc]"></div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Lyric Studio <span className="text-[9px] not-italic text-zinc-600 font-bold ml-1">Modern FX / V2.2</span></h1>
        </div>

        {/* 1. Media */}
        <div className="mb-6 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 block">1. Media & Branding</span>
            <div className="space-y-4">
                <div>
                    <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1 block">Fondo HD</label>
                    <input type="file" onChange={handleImageChange} accept="image/*" className="w-full text-[10px] file:bg-zinc-800 file:border-0 file:text-white file:px-3 file:py-2 file:rounded-lg" />
                </div>
                <div>
                    <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1 block">Audio Master</label>
                    <input type="file" onChange={handleAudioChange} accept="audio/*" className="w-full text-[10px] file:bg-zinc-800 file:border-0 file:text-white file:px-3 file:py-2 file:rounded-lg" />
                </div>
                <select 
                    value={branding} 
                    onChange={(e) => setBranding(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 p-2 text-xs rounded-lg outline-none"
                >
                    <option value="none">Sin Marca de Agua</option>
                    <option value="juan614">Juan 614 - juan614.diosmasgym.com</option>
                    <option value="diosmasgym">Diosmasgym - musica.diosmasgym.com</option>
                </select>
            </div>
        </div>

        {/* 1.5. Intro/Outro Control */}
        <div className="mb-6 p-5 bg-white/5 border border-[#00ffcc]/20 rounded-2xl shadow-[0_0_15px_rgba(0,255,204,0.05)]">
            <div className="flex items-center gap-2 mb-4">
                <i className="fas fa-clapperboard text-[#00ffcc] text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffcc]">Cinematics</span>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Intro Diosmasgym</label>
                    <input type="checkbox" checked={includeIntro} onChange={(e) => setIncludeIntro(e.target.checked)} className="accent-[#00ffcc]" />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Outro Redes Sociales</label>
                    <input type="checkbox" checked={includeOutro} onChange={(e) => setIncludeOutro(e.target.checked)} className="accent-[#00ffcc]" />
                </div>
                {includeOutro && (
                    <>
                        <div className="pt-2">
                            <label className="text-[9px] uppercase font-bold text-[#c5a059] mb-2 block">Estilo de Imagen Final (Outro)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setOutroImageIndex(0)}
                                    className={`p-2 rounded-lg text-[8px] font-bold uppercase transition-all border ${outroImageIndex === 0 ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}
                                >
                                    Estilo A
                                </button>
                                <button 
                                    onClick={() => setOutroImageIndex(1)}
                                    className={`p-2 rounded-lg text-[8px] font-bold uppercase transition-all border ${outroImageIndex === 1 ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}
                                >
                                    Estilo B
                                </button>
                            </div>
                        </div>
                        <input 
                            type="text" 
                            value={outroMessage}
                            onChange={(e) => setOutroMessage(e.target.value)}
                            placeholder="Mensaje Outro..."
                            className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg outline-none focus:border-[#00ffcc]/30"
                        />
                    </>
                )}
            </div>
        </div>

        {/* 2. Sincronización */}
        <div className="mb-6 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">2. Sincronización</span>
                <label className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-[#00ffcc] hover:underline">
                    <i className="fas fa-file-import mr-2"></i> Subir Letra (.txt)
                    <input type="file" accept=".txt" className="hidden" onChange={handleLyricsFileUpload} />
                </label>
            </div>
            <textarea 
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-3 text-[10px] rounded-xl h-24 mb-3 outline-none focus:border-cyan-500/30" 
                placeholder="Pega la letra limpia aquí..."
            />
            
            {isSyncing ? (
                <div className="mb-3 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 space-y-3 animate-pulse">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-cyan-400 uppercase font-black tracking-widest">Siguiente frase:</span>
                        <span className="text-xs text-white font-bold italic truncate">{syncLines[syncIndex]}</span>
                    </div>
                    <button 
                        onClick={markTime}
                        className="w-full bg-[#00ffcc] text-black font-black py-3 rounded-xl text-[10px] uppercase shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                    >
                        MARCAR TIEMPO (SPACE)
                    </button>
                    <button 
                        onClick={markSilence}
                        className="w-full bg-white/10 text-[#00ffcc] font-black py-3 rounded-xl text-[10px] uppercase border border-[#00ffcc]/20 hover:bg-[#00ffcc]/10 transition-all flex items-center justify-center gap-3"
                    >
                        <i className="fas fa-volume-mute"></i>
                        Marcar Silencio
                    </button>
                    <button 
                        onClick={() => setIsSyncing(false)}
                        className="w-full text-[8px] uppercase text-zinc-500 font-bold"
                    >
                        Cancelar
                    </button>
                </div>
            ) : (
                <button 
                    onClick={startSync}
                    className="w-full py-3 bg-zinc-900 border border-white/5 text-[9px] uppercase font-bold rounded-xl hover:bg-zinc-800 transition-all mb-2"
                >
                    Iniciar Sincronización Manual
                </button>
            )}

            <textarea 
                value={lyricsInput}
                onChange={(e) => setLyricsInput(e.target.value)}
                className="w-full bg-black/20 border border-white/5 p-3 text-[10px] font-mono rounded-xl h-32 outline-none" 
                placeholder="0.0 | Letra de ejemplo..."
            />
            
            <div className="mt-4">
                <button 
                    onClick={handleBackupLyrics}
                    disabled={!lyricsInput && !rawLyrics}
                    className="flex-1 py-3 bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#c5a059] hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-30"
                >
                    <i className="fas fa-download"></i>
                    Descargar
                </button>
                <button 
                    onClick={() => { setShowBloggerModal(true); fetchBloggerDrafts(); }}
                    className="flex-1 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-3"
                >
                    <i className="fas fa-cloud"></i>
                    Borradores Cloud
                </button>
            </div>

            {/* DRAFTS SECTION */}
            <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        placeholder="Nombre del borrador..."
                        className="flex-1 bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg outline-none"
                    />
                    <button 
                        onClick={saveDraft}
                        className="px-4 py-2 bg-[#00ffcc] text-black text-[9px] font-black uppercase rounded-lg hover:bg-white transition-all"
                    >
                        Guardar
                    </button>
                </div>

                {savedDrafts.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {savedDrafts.map((draft, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 group">
                                <div className="flex-1 cursor-pointer" onClick={() => loadDraft(draft)}>
                                    <div className="text-[10px] font-bold text-white/80 group-hover:text-[#00ffcc] transition-all">{draft.name}</div>
                                    <div className="text-[8px] text-white/20 uppercase tracking-widest">{new Date(draft.date).toLocaleDateString()}</div>
                                </div>
                                <button onClick={() => deleteDraft(i)} className="text-white/20 hover:text-red-500 px-2 transition-all">
                                    <i className="fas fa-trash-can text-[10px]"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* 3. Estética */}
        <div className="mb-10 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">3. Estética Pro</span>
                <button 
                    onClick={handleMagicDesign}
                    disabled={isGeneratingStyle}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50"
                >
                    {isGeneratingStyle ? (
                        <><i className="fas fa-spinner fa-spin"></i> Magia...</>
                    ) : (
                        <><i className="fas fa-wand-magic-sparkles"></i> Diseño Mágico IA v2.2</>
                    )}
                </button>
            </div>
            
            {imagePromptStatus && (
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center gap-3 animate-pulse text-[9px] font-black uppercase tracking-widest text-purple-400">
                    <i className="fas fa-palette"></i> {imagePromptStatus}
                </div>
            )}
            
            <div className="mb-6 p-3 bg-black/20 rounded-xl border border-white/5">
                <label className="text-[9px] text-[#c5a059] uppercase font-black tracking-widest mb-2 block">Estilo del Visualizador</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'bars', label: 'Barras Urbanas', icon: 'fa-chart-simple' },
                        { id: 'wave', label: 'Onda Digital', icon: 'fa-wave-square' },
                        { id: 'pulse', label: 'Pulso Neon', icon: 'fa-circle-dot' },
                        { id: 'dots', label: 'Puntos Minimal', icon: 'fa-ellipsis' },
                        { id: 'circular', label: 'Círculo Studio', icon: 'fa-circle-notch' },
                        { id: 'hidden', label: 'Ocultar todo', icon: 'fa-eye-slash' }
                    ].map((s) => (
                        <button 
                            key={s.id}
                            onClick={() => setVisualizerStyle(s.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg text-[8px] font-bold uppercase transition-all border ${visualizerStyle === s.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'}`}
                        >
                            <i className={`fas ${s.icon}`}></i>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Vibe FX</label>
                    <select 
                        value={vibe} 
                        onChange={(e) => setVibe(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg"
                    >
                        <option value="cinematic">Cinemático Glow</option>
                        <option value="modern">Modern Minimal</option>
                        <option value="party">Fiesta Beats</option>
                        <option value="retro">Vintage 8mm</option>
                        <option value="glitch">Glitch Art</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Partículas</label>
                    <select 
                        value={emojiPack} 
                        onChange={(e) => setEmojiPack(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg"
                    >
                        <option value="none">Ninguno</option>
                        <option value="fire">🔥 Fuego</option>
                        <option value="love">❤️ Amor</option>
                        <option value="stars">✨ Brillos</option>
                        <option value="music">🎵 Notas</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Animación Letra</label>
                    <select 
                        value={animationStyle} 
                        onChange={(e) => setAnimationStyle(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg"
                    >
                        <option value="fade">Fade & Blur (Classic)</option>
                        <option value="slide">Slide Up (Smooth)</option>
                        <option value="zoom">Elastic Zoom (Action)</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Sensibilidad Bass</label>
                    <input type="range" min="0.5" max="3" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="w-full accent-[#00ffcc]" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Tamaño Fuente</label>
                    <input type="range" min="30" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-[#00ffcc]" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Color Texto</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer" />
                </div>
            </div>

            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={glowToggle} onChange={() => setGlowToggle(!glowToggle)} className="w-4 h-4 accent-[#00ffcc]" />
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Glow Aura</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={leakToggle} onChange={() => setLeakToggle(!leakToggle)} className="w-4 h-4 accent-[#00ffcc]" />
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Light Leaks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={vhsMode} onChange={() => setVhsMode(!vhsMode)} className="w-4 h-4 accent-[#00ffcc]" />
                    <span className="text-[9px] uppercase font-bold text-[#ff4444]">Retro VHS</span>
                </label>
            </div>
        </div>

        {/* 4. Export */}
        <div className="pb-12">
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-4 bg-[#00ffcc] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-50"
            >
                {isExporting ? "Procesando Master..." : "Exportar Master Final"}
            </button>
            
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
                    <div className="w-full max-w-md space-y-8 text-center">
                        <div className="relative w-48 h-48 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={502.4} strokeDashoffset={502.4 * (1 - progress/100)} className="text-[#00ffcc] transition-all duration-300" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic">{Math.floor(progress)}%</span>
                                <span className="text-[9px] uppercase font-black tracking-widest text-[#00ffcc]">Rindiendo Master</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Procesando Video HD</h3>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">
                                Por favor mantén esta pestaña activa.<br/>
                                <span className="text-[#ff4444]">El proceso se pausará si cambias de ventana.</span>
                            </p>
                        </div>

                        <div className="flex justify-center gap-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-1 h-1 bg-[#00ffcc] rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            ) }
        </div>
        </aside>
        
        {/* BLOGGER MODAL */}
        {showBloggerModal && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="bg-[#0a0a0f] border border-white/10 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-cloud-arrow-down text-[#c5a059] text-xl"></i>
                            <h2 className="text-sm font-black uppercase tracking-widest">Borradores en la Nube</h2>
                        </div>
                        <button onClick={() => setShowBloggerModal(false)} className="text-white/20 hover:text-white">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {isFetchingBlogger ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-8 h-8 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Sincronizando con la nube...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bloggerDrafts.length > 0 ? (
                                    bloggerDrafts.map((post, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => importFromBlogger(post)}
                                            className={`p-4 bg-white/5 border rounded-2xl transition-all cursor-pointer group ${post.type === 'SHEET' ? 'border-[#c5a059]/30 hover:border-[#c5a059] hover:bg-[#c5a059]/5' : 'border-white/5 hover:border-blue-400/50 hover:bg-blue-400/5'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={`text-xs font-bold ${post.type === 'SHEET' ? 'group-hover:text-[#c5a059]' : 'group-hover:text-blue-400'} transition-colors`}>{post.title}</h3>
                                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${post.type === 'SHEET' ? 'bg-[#c5a059]/20 text-[#c5a059]' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {post.type === 'SHEET' ? 'Google Sheet' : 'Blogger'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] text-white/20 uppercase tracking-widest">{new Date(post.published).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-white/20">No se encontraron borradores</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 bg-white/5 border-t border-white/5">
                        <p className="text-[9px] text-white/40 leading-relaxed text-center italic">
                            Los borradores se sincronizan desde Blogger y tu Google Sheet configurada.
                        </p>
                    </div>
                </div>
            </div>
        )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LyricStudio;
