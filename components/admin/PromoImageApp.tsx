import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

const sizes = {
  instagram: { w: 500, h: 650, title: 32 },
  story: { w: 500, h: 900, title: 42 },
  post: { w: 900, h: 600, title: 36 },
};

const countryOptions = [
  { name: 'GLOBAL (TODAS)', flag: '🌎', iso: 'un' },
  { name: 'México', flag: '🇲🇽', iso: 'mx' },
  { name: 'Estados Unidos', flag: '🇺🇸', iso: 'us' },
  { name: 'Colombia', flag: '🇨🇴', iso: 'co' },
  { name: 'Argentina', flag: '🇦🇷', iso: 'ar' },
  { name: 'España', flag: '🇪🇸', iso: 'es' },
  { name: 'Chile', flag: '🇨🇱', iso: 'cl' },
  { name: 'Puerto Rico', flag: '🇵🇷', iso: 'pr' },
  { name: 'Guatemala', flag: '🇬🇹', iso: 'gt' },
  { name: 'El Salvador', flag: '🇸🇻', iso: 'sv' }
];

// UTILITY TO UPGRADE ALL EXTERNAL URLS TO ABSOLUTE ORIGINAL RESOLUTION
const getHighResUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  
  try {
    // 1. Handle Blogger/Google User Content URLs (Absolute coverage)
    if (url.includes('googleusercontent.com') || url.includes('blogger.com') || url.includes('bp.blogspot.com') || url.includes('ggpht.com')) {
       // s0 is the absolute master original in Google's ecosystem
       return url.replace(/=s\d+([-c])?/, '=s0')
                 .replace(/=w\d+(-h\d+)?([-c])?/, '=s0')
                 .replace(/\/s\d+(-c)?\//, '/s0/')
                 .replace(/-rw$/, ''); // Strip WebP compression if present
    }
    
    // 2. Handle YouTube Thumbnails (Force maxresdefault)
    if (url.includes('ytimg.com')) {
       return url.replace(/\/(hq|mq|sd|default)default\.jpg/, '/maxresdefault.jpg');
    }

    // 3. Handle Google Drive (Force Direct Download mode)
    if (url.includes('drive.google.com')) {
       if (url.includes('/thumbnail')) return url.replace('/thumbnail', '/uc') + '&export=download';
       if (url.includes('/file/d/')) {
         const fileId = url.split('/file/d/')[1]?.split('/')[0];
         if (fileId) return `https://drive.google.com/uc?id=${fileId}&export=download`;
       }
    }
  } catch (e) {
    console.warn("URL Upgrade failed, using fallback:", url);
  }
  
  return url;
};

const PromoImageApp: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("CARGANDO CANCIÓN...");
  const [artist, setArtist] = useState("Diosmasgym");
  const [bg, setBg] = useState<string | null>(null);
  const [mode, setMode] = useState("proximamente");
  const [size, setSize] = useState<keyof typeof sizes>("instagram");
  const [date, setDate] = useState("2026-04-05T23:00");
  const [overlay, setOverlay] = useState(0.65);
  const [tracks, setTracks] = useState("INTRO\nTEMA UNO\nTEMA DOS");
  const [textColor, setTextColor] = useState("#ffffff");
  const [contrastColor, setContrastColor] = useState("#000000");
  const [glow, setGlow] = useState(true);
  const [stroke, setStroke] = useState(false); // Default to false for solid look
  const containerRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSendingToMake, setIsSendingToMake] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // NEW AESTHETICS 2026
  const [template, setTemplate] = useState("original-v1");
  const [grit, setGrit] = useState(0.85); // 85% por defecto
  const [noise, setNoise] = useState(true);
  const [scanlines, setScanlines] = useState(0.08);
  const [vignette, setVignette] = useState(0.6);
  const [industrial, setIndustrial] = useState(false);
  const [autoColor, setAutoColor] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // Progress feedback state
  const [country, setCountry] = useState(countryOptions[0]);


  // REFS PARA EVITAR CLAUSURAS DESACTUALIZADAS (Fijar datos en memoria real)
  // Esto garantiza que handleSendToMake siempre vea lo que hay en pantalla actualmente
  const titleRef = useRef(title);
  const artistRef = useRef(artist);
  const modeRef = useRef(mode);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { artistRef.current = artist; }, [artist]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614')
        ]);
        const fullCatalog = [...dM, ...j6];
        setCatalog(fullCatalog);

        // AUTO-ALEATORIO AL INICIAR PARA EVITAR "DUDAS QUÉ ES AMOR"
        if (fullCatalog.length > 0) {
          const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];
          let normalizedArtist = song.artist;
          if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
          if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

          setTitle(song.name.toUpperCase());
          setArtist(normalizedArtist);
          setBg(song.cover);
        }
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, []);

  const handleSelectSong = (song: MusicItem) => {
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    setTitle(song.name.toUpperCase());
    setArtist(normalizedArtist);
    setBg(song.cover);
    setMode("disponible");
    setSize("instagram");
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const handleRandomFromCatalog = () => {
    if (catalog.length === 0) return;
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    handleSelectSong(song);
  };

  const filteredCatalog = catalog.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const config = sizes[size];

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const targetWidth = config.w;
        if (containerWidth < targetWidth) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [size, config.w]);

  useEffect(() => {
    if (!bg) return;
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    img.src = bg;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 20;
        canvas.height = 20;
        ctx.drawImage(img, 0, 0, 20, 20);
        const data = ctx.getImageData(0, 0, 20, 20).data;

        let r = 0, g = 0, b = 0, brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const pixelCount = data.length / 4;
        r = Math.round(r / pixelCount);
        g = Math.round(g / pixelCount);
        b = Math.round(b / pixelCount);
        brightness /= pixelCount;

        const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

        if (autoColor) {
           setContrastColor(hexColor);
           setOverlay(brightness > 160 ? 0.75 : 0.5);
           
           // SMART TEXT MASTERY: Color de texto armonizado (no solo B/W)
           if (brightness > 160) {
             setTextColor(`rgba(${Math.max(0, r-150)}, ${Math.max(0, g-150)}, ${Math.max(0, b-150)}, 1)`); // Versión muy oscura del dominante
           } else {
             setTextColor(`rgba(${Math.min(255, r+200)}, ${Math.min(255, g+200)}, ${Math.min(255, b+200)}, 1)`); // Versión muy clara del dominante
           }
           
           setGlow(true);
        } else {
           setOverlay(brightness > 140 ? 0.75 : 0.45);
        }
      } catch (err) {
        console.warn("⚠️ [AUTO-COLOR] Error en análisis. Fallback.");
        if (autoColor) setContrastColor("#c5a059");
      }
    };
  }, [bg, autoColor]);

  // ASYNC PREPARE CANVAS: Ghost Master Engine (Native 4K Native Resolution)
  const prepareCanvas = async (customScale = 1) => {
    console.log("[MASTER] STARTING GHOST-MASTER NATIVE 4K PREPARATION...");
    
    // Target the hidden high-res master container
    // We look for the main template container within our ghost master ref
    const captureEl = masterRef.current?.querySelector('.promo-master-target') as HTMLElement;
    if (!captureEl) throw new Error("Ghost Master element not found. Please wait a moment and try again.");

    // 1. Force Load ALL Images in the Master Render
    const images = Array.from(captureEl.querySelectorAll('img, [style*="background-image"]'));
    await Promise.all(images.map(img => {
      let src = "";
      if (img instanceof HTMLImageElement) {
        src = img.src;
      } else {
        const bgStyle = (img as HTMLElement).style.backgroundImage;
        const match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        src = match ? match[1] : "";
      }
      
      if (!src || src === 'none' || src === '""') return Promise.resolve();
      
      return new Promise(resolve => {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        const t = setTimeout(() => resolve(false), 20000); 
        testImg.onload = () => { clearTimeout(t); resolve(true); };
        testImg.onerror = () => { clearTimeout(t); resolve(false); };
        testImg.src = src;
      });
    }));

    // 1.5 Stabilization Wait (Browser rasterization at high-res)
    console.log("[MASTER] MASTER IMAGES LOADED, STABILIZING 4K RASTER...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Load Fonts (Wait for primary and master rasterization)
    try {
      if (typeof document !== 'undefined') {
        await document.fonts.ready;
      }
    } catch (e) { console.warn("Font loading fallback."); }

    // 3. Capture Native Master (Scale 1 because master is already huge)
    console.log("[MASTER] CAPTURING NATIVE 4K MASTER...");
    
    return await html2canvas(captureEl, {
      scale: customScale, // Usually 1 for native master
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // FONT INJECTION: Critical for 4K Master Parity on Windows/Vercel
        const fontLink = clonedDoc.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;700;900&family=Satisfy&display=swap';
        clonedDoc.head.appendChild(fontLink);

        const clonedWrapper = clonedDoc.querySelector('.promo-master-target') as HTMLElement;
        if (clonedWrapper) {
          // FORCE EXACT PIXEL DIMENSIONS TO PREVENT 0x0 PATTERN ERRORS
          clonedWrapper.style.transform = 'none';
          clonedWrapper.style.boxShadow = 'none';
          clonedWrapper.style.width = `${masterWidth}px`; // Use masterWidth instead of preview config
          clonedWrapper.style.height = `${masterWidth * (sizes[size].h / sizes[size].w)}px`;
          clonedWrapper.style.display = 'block';
        }

        const findAndFixNoise = (selector: string, multiplier: number) => {
          const el = clonedDoc.querySelector(selector) as HTMLElement;
          if (el) { 
            // PRESERVE ORIGINAL BLEND MODE FROM CSS (No more forcing to 'normal')
            el.style.opacity = (grit * multiplier).toString(); 
          }
        };
        findAndFixNoise('.noise-layer', 0.1);
        findAndFixNoise('.real-grain', 0.12);
        
        // 4. Backdrop-Filter Fallback (Subtle for readability)
        const polyfills = clonedDoc.querySelectorAll('[data-backdrop-polyfill]');
        polyfills.forEach(el => {
          const h = el as HTMLElement;
          h.style.backdropFilter = 'none';
          (h.style as any).webkitBackdropFilter = 'none';
          // Use original background alpha but slightly darker to ensure text pop in master
          h.style.backgroundColor = 'rgba(0,0,0,0.7)'; 
        });

        // 5. No Global Sharpening (Matches Preview exactly)
        if (clonedWrapper) {
          clonedWrapper.style.filter = 'none'; 
        }
      }
    });
  };

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter' | 'generic') => {
    setIsGenerating(true);
    try {
      // Use standard scale (2x) for sharing to ensure compatibility
      const canvas = await prepareCanvas(2);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
      if (!blob) throw new Error("Blob failed");

      const file = new File([blob], `PROMO-${title.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
      const text = `¡Escucha "${title}" de ${artist}! Ya disponible. #DiosMasGym #Juan614`;
      const url = "https://diosmasgym.com";

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text, url });
      } else {
        try {
          if (typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([new ClipboardItem({ [file.type]: blob })]);
            alert("✅ Imagen copiada al portapapeles.");
          }
        } catch (e) {
          switch (platform) {
            case 'whatsapp': window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, '_blank'); break;
            case 'facebook': window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'); break;
            case 'twitter': window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank'); break;
            default: alert("Usa 'Descargar Master 4K' para compartir.");
          }
        }
      }
    } catch (err) {
      console.error("Share error:", err);
      alert("Error al compartir la imagen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToMake = async () => {
    setIsGenerating(true);
    setIsSendingToMake(true);
    try {
      const canvas = await prepareCanvas(2);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.8));
      if (!blob) throw new Error("Blob failed");

      const formData = new FormData();
      formData.append("file", blob, `PROMO-${artistRef.current}.png`);
      formData.append("artist", artistRef.current);
      formData.append("title", titleRef.current);
      formData.append("mode", modeRef.current);

      const res = await fetch("https://hook.us2.make.com/9jkc3se9ac5kragltqzru0tw0zppmwx4", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error");
      alert("✅ Promo enviada al Arsenal exitosamente.");
    } catch (err) {
      console.error("Make error:", err);
      alert("Error al enviar al Arsenal.");
    } finally {
      setIsSendingToMake(false);
      setIsGenerating(false);
    }
  };

  const handleDownload = async (isUltra = true) => {
    setIsGenerating(true);
    console.log(`[DOWNLOAD] STARTING ${isUltra ? '4K' : '1:1'} EXPORT...`);
    try {
      // Use scale 1 for 1:1 parity if requested, otherwise 4 for 4K
      const canvas = await prepareCanvas(isUltra ? 4 : 1);
      console.log("[DOWNLOAD] CANVAS GENERATED, CREATING BLOB...");
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error("Blob generation failed");

      console.log("[DOWNLOAD] BLOB READY, TRIGGERING DOWNLOAD...");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `PROMO-${title.replace(/\s+/g, '-')}-${isUltra ? '4K' : '1to1'}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log("[DOWNLOAD] PROCESS COMPLETE");
    } catch (e: any) {
      console.error("Critical Export Error:", e);
      alert(`⚠️ Export Error: ${e.message || 'Browser Memory/Connection Issue'}. Try lowering resolution or checking connection.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBg(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const formatDate = () => {
    try {
      // FIXING TIMEZONE OFFSET (Input 12 show 11) - Force local parsing
      // replace('-','/') ensures browser treats it as local date if time not present
      const dateString = date.includes('T') ? date : `${date}T12:00:00`;
      const d = new Date(dateString);
      const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "long" }).toUpperCase();
      
      if (mode === 'proximamente') {
         return `ESTRENO ${fecha}`;
      }
      
      const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `ESTRENO ${fecha} · ${hora}`;
    } catch {
      return "PRÓXIMAMENTE";
    }
  };

  const commonProps = {
    title, artist, bg, mode, size, date, overlay, textColor, contrastColor, glow, stroke,
    formatDate, country, trackList: tracks.split("\n"),
    config: sizes[size],
    grit, noise, scanlines, vignette, industrial, template
  };

  // 4K MASTER PROPS: Scaled configuration for high-res render
  const masterWidth = 3840;
  const masterMultiplier = masterWidth / sizes[size].w;
  const masterCommonProps = {
    ...commonProps,
    config: {
      ...sizes[size],
      w: masterWidth,
      h: sizes[size].h * masterMultiplier,
      title: sizes[size].title * masterMultiplier, // SCALING FONT SIZES FOR 4K
    }
  };

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white">
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
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Studio <span className="text-[#c5a059]">PRO GENERATOR</span> v3.0</h1>
        </div>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      <div ref={containerRef} className="flex-1 p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 overflow-auto">
        {/* LEFT COMPONENT: CONTROLS */}
        <div className="lg:col-span-5 space-y-8 animate-fade-in-up">
          
          {/* GROUP: CONTENT & SEARCH */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl scale-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059]">Contenido</h2>
              <button 
                onClick={handleRandomFromCatalog}
                disabled={isLoadingCatalog}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all disabled:opacity-50"
              >
                <i className={`fas ${isLoadingCatalog ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>
                {isLoadingCatalog ? 'Sorteando...' : 'Azar'}
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#c5a059]/40">
                <i className="fas fa-search text-xs"></i>
              </div>
              <input 
                type="text"
                placeholder="BUSCAR CANCIÓN EN CATÁLOGO..."
                className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-[10px] font-black tracking-widest transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
              />
              
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl animate-fade-in">
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

            {/* BOTÓN DE CARGA MANUAL RESPALDADO */}
            <div className="mb-8">
              <button 
                onClick={() => document.getElementById('manual-bg-upload')?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all group"
              >
                <i className="fas fa-cloud-upload-alt group-hover:scale-110 transition-transform"></i>
                Subir Imagen Manual (Local)
              </button>
              <input 
                id="manual-bg-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleBg} 
              />
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Título de la Obra</label>
                <input 
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-lg font-serif italic transition-all"
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value.toUpperCase())} 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Artista</label>
                  <select 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                    value={artist} 
                    onChange={(e)=>setArtist(e.target.value)}
                  >
                    <option value="Diosmasgym">Diosmasgym</option>
                    <option value="Juan 614">Juan 614</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Estado</label>
                  <select 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                    value={mode} 
                    onChange={(e)=>setMode(e.target.value)}
                  >
                    <option value="proximamente">Próximamente</option>
                    <option value="disponible">Disponible</option>
                    <option value="album">Álbum / EP</option>
                  </select>
                </div>
              </div>

              {/* TRACKLIST FOR ALBUM/EP */}
              {mode === 'album' && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Canciones del Álbum / EP</label>
                  <textarea
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest text-[#c5a059] resize-none"
                    rows={6}
                    placeholder={"INTRO\nTEMA UNO\nTEMA DOS\nTEMA TRES"}
                    value={tracks}
                    onChange={(e) => setTracks(e.target.value)}
                  />
                  <p className="text-[8px] text-white/20 tracking-widest">Una canción por línea</p>
                </div>
              )}

              {/* NEW COUNTRY SELECTOR */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">País del Estreno</label>
                <select 
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none text-xs appearance-none cursor-pointer text-[#c5a059] font-black"
                  value={country.name}
                  onChange={(e) => {
                    const sel = countryOptions.find(c => c.name === e.target.value);
                    if (sel) setCountry(sel);
                  }}
                >
                  {countryOptions.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                </select>
              </div>

              {/* DATE PICKER (Conditional Simple Calendar for Proximamente) */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">
                  {mode === 'proximamente' ? 'Día del Estreno (Calendario)' : 'Fecha y Hora Oficial'}
                </label>
                <input 
                  type={mode === 'proximamente' ? "date" : "datetime-local"}
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest text-[#c5a059]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* GROUP: AESTHETICS & TEMPLATES */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059]">Base de Diseño & Plantilla</h2>
              <button 
                onClick={() => setAutoColor(!autoColor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${autoColor ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'border-white/10 text-white/40'}`}
              >
                <i className={`fas ${autoColor ? 'fa-magic' : 'fa-palette'}`}></i>
                {autoColor ? 'Smart Color ON' : 'Manual Color'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              {/* TEMPLATE SELECTOR: THE BEAT SERIES */}
              <div className="space-y-4">
                 <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">The Beat Series (Variaciones Estéticas)</label>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'original-v1', label: 'GOLD CLASSIC', icon: 'fa-history', color: '#c5a059' },
                      { id: 'beat-crimson', label: 'CRIMSON STEEL', icon: 'fa-face-angry', color: '#ff4444' },
                      { id: 'beat-cyber', label: 'CYBER ELECTRIC', icon: 'fa-bolt', color: '#00f2ff' },
                      { id: 'beat-platinum', label: 'PLATINUM GHOST', icon: 'fa-ghost', color: '#e5e4e2' },
                      { id: 'beat-toxic', label: 'TOXIC EMERALD', icon: 'fa-biohazard', color: '#39ff14' }
                    ].map((t) => (
                      <button 
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-3 ${template === t.id ? 'bg-white text-black border-white shadow-xl scale-[1.02]' : 'bg-black/40 text-white/30 border-white/5 hover:text-white hover:border-white/20'}`}
                        style={template === t.id ? { backgroundColor: t.color, color: '#000', borderColor: t.color, boxShadow: `0 0 30px ${t.color}33` } : {}}
                      >
                         <i className={`fas ${t.icon}`}></i>
                         {t.label}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Nivel de Grano ({Math.round(grit * 100)}%)</label>
                  <div className="flex gap-4">
                    <button onClick={() => setNoise(!noise)} className={`text-[8px] px-2 py-1 rounded border ${noise ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'border-white/10 text-white/40'}`}>NOISE</button>
                    <button onClick={() => setIndustrial(!industrial)} className={`text-[8px] px-2 py-1 rounded border ${industrial ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'border-white/10 text-white/40'}`}>GRID</button>
                  </div>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={grit} onChange={(e) => setGrit(parseFloat(e.target.value))} className="w-full accent-[#c5a059]" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                   <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Scanlines</label>
                   <input type="range" min="0" max="0.3" step="0.01" value={scanlines} onChange={(e) => setScanlines(parseFloat(e.target.value))} className="w-full accent-[#c5a059]" />
                </div>
                <div className="space-y-4">
                   <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Viñeta</label>
                   <input type="range" min="0" max="0.9" step="0.05" value={vignette} onChange={(e) => setVignette(parseFloat(e.target.value))} className="w-full accent-[#c5a059]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Color Título</label>
                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="color" className="w-10 h-10 bg-transparent rounded-lg cursor-pointer border-none" value={textColor} onChange={(e)=>setTextColor(e.target.value)} />
                    <span className="text-[10px] font-mono opacity-40">{textColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Color Glow</label>
                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="color" className="w-10 h-10 bg-transparent rounded-lg cursor-pointer border-none" value={contrastColor} onChange={(e)=>setContrastColor(e.target.value)} />
                    <span className="text-[10px] font-mono opacity-40">{contrastColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GROUP: EXPORT & SHARE */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-8">Exportar & Compartir</h2>
             <div className="flex flex-col gap-6">
                <button 
                  onClick={() => handleDownload(true)}
                  className="w-full py-6 bg-white text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-2xl hover:bg-[#c5a059] transition-all flex items-center justify-center gap-4 group shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  <i className="fas fa-crown group-hover:scale-110 transition-transform"></i> Descargar Master 4K Ultra
                </button>

                <button 
                  onClick={() => handleDownload(false)}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white/40 font-black uppercase text-[9px] tracking-[0.3em] rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-eye"></i> Descargar 1:1 (Calidad de Vista)
                </button>
                
                <div className="space-y-4">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest text-center block">Compartir en Redes Sociales</label>
                  <div className="grid grid-cols-4 gap-3">
                    <button 
                      onClick={() => handleShare('whatsapp')}
                      className="py-4 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] rounded-xl hover:bg-[#25D366] hover:text-white transition-all flex items-center justify-center text-lg"
                      title="WhatsApp"
                    >
                      <i className="fab fa-whatsapp"></i>
                    </button>
                    <button 
                      onClick={() => handleShare('facebook')}
                      className="py-4 bg-[#1877F2]/10 border border-[#1877F2]/20 text-[#1877F2] rounded-xl hover:bg-[#1877F2] hover:text-white transition-all flex items-center justify-center text-lg"
                      title="Facebook"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </button>
                    <button 
                      onClick={() => handleShare('twitter')}
                      className="py-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-all flex items-center justify-center text-lg"
                      title="Twitter/X"
                    >
                      <i className="fab fa-x-twitter"></i>
                    </button>
                    <button 
                      onClick={() => handleShare('generic')}
                      className="py-4 bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] rounded-xl hover:bg-[#c5a059] hover:text-white transition-all flex items-center justify-center text-lg"
                      title="Compartir"
                    >
                      <i className="fas fa-share-nodes"></i>
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => handleSendToMake()}
                    disabled={isSendingToMake}
                    className="w-full py-3 bg-black/40 border border-white/10 text-white/40 text-[8px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <i className={`fas ${isSendingToMake ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                    {isSendingToMake ? 'Sincronizando...' : 'Sincronizar con Make.com (Manual)'}
                  </button>
                </div>
             </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: PREVIEW */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start gap-10">
          <div className="w-full h-full min-h-[600px] bg-black/60 rounded-[40px] border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-inner">
            {/* STUDIO LIGHTING EFFECTS */}
            <div className="absolute top-0 left-1/4 w-1/2 h-40 bg-[#c5a059]/10 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-1/2 h-40 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
            
            <div 
              onClick={() => handleDownload(false)}
              style={{ 
                width: config.w * scale, 
                height: config.h * scale, 
                display: 'block',
                position: 'relative',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isSendingToMake ? 'brightness(0.5) blur(10px)' : 'none'
              }}
              className="hover:scale-[1.02] cursor-download promo-container-wrapper"
              title="Haz clic para descargar exactamente lo que ves"
            >
              <div 
                style={{ 
                  width: config.w, 
                  height: config.h, 
                  borderRadius: 12, 
                  position: "absolute", 
                  overflow: "hidden", 
                  display: 'block',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  backgroundColor: '#000',
                  boxShadow: '0 100px 200px -50px rgba(0,0,0,0.8)'
                }}
              >
                <PromoTemplate {...commonProps} />
              </div>
            </div>

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-[250] bg-black/60 backdrop-blur-md animate-fade-in rounded-[40px]">
                <div className="w-16 h-16 border-t-2 border-r-2 border-[#c5a059] rounded-full animate-spin shadow-[0_0_30px_rgba(197,160,89,0.3)]"></div>
                <div className="text-[10px] font-black uppercase tracking-[1em] text-[#c5a059] animate-pulse">Masterizando 4K</div>
              </div>
            )}
            
            {/* SIZE SELECTOR OVERLAY */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all">
                {Object.keys(sizes).map((s) => (
                  <button 
                    key={s}
                    onClick={() => setSize(s as any)}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${size === s ? 'bg-[#c5a059] text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>
          
          <div className="flex gap-10 opacity-20 hover:opacity-50 transition-opacity">
             <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"><i className="fas fa-layer-group"></i> Adobe Style Engine</div>
             <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"><i className="fas fa-microchip"></i> Vercel Logic Core</div>
             <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest"><i className="fas fa-signal"></i> Make.com Link Active</div>
          </div>
        </div>
      </div>

      {/* GHOST MASTER: NATIVE 4K RENDERER (OFF-SCREEN BUT VISIBLE FOR CAPTURE) */}
      <div 
        style={{ 
          position: 'fixed', 
          left: -4000, 
          top: -4000, 
          width: masterWidth, 
          pointerEvents: 'none',
          zIndex: -1000,
          opacity: 1, // Fix: Opacity 1 ensures images aren't black
          visibility: 'visible',
          overflow: 'hidden',
          background: '#000'
        }}
      >
        <div ref={masterRef}>
          {/* We mirror the exact structure that the capture engine expects but with Master Props */}
          <div 
            className="promo-master-target" 
            style={{ 
              width: masterWidth, 
              height: masterWidth * (sizes[size].h / sizes[size].w),
              position: 'relative',
              display: 'block'
            }}
          >
             <PromoTemplate {...masterCommonProps} isExport={true} />
          </div>
        </div>
      </div>

    </div>
  );
};

const PromoTemplate: React.FC<any> = ({ 
    title, artist, bg, mode, config, overlay, textColor, contrastColor, glow, stroke,
    formatDate, trackList, isExport = false, country,
    grit, noise, scanlines, vignette, industrial, template
}) => {
    return (
        <div style={{ width: "100%", height: "100%", position: 'relative', overflow: 'hidden' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:italic&family=Inter:wght@400;700;900&family=Space+Grotesk:wght@300;700&display=swap');
            * { 
              -webkit-font-smoothing: antialiased; 
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            
            img {
              image-rendering: -webkit-optimize-contrast;
              image-rendering: high-quality;
            }
            
            .noise-layer {
              position: absolute;
              inset: 0;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
              background-size: 100% 100%; /* Evita tiling que causa errores de createPattern */
              opacity: ${grit * 0.1};
              mix-blend-mode: overlay;
              pointer-events: none;
              z-index: 7;
            }

            .real-grain {
              position: absolute;
              inset: 0;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grainFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grainFilter)'/%3E%3C/svg%3E");
              background-size: 100% 100%;
              opacity: ${grit * 0.12};
              pointer-events: none;
              mix-blend-mode: soft-light;
              z-index: 6;
            }

            .halftone-grid {
              position: absolute;
              inset: 0;
              background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
              background-size: 8px 8px;
              background-repeat: repeat;
              pointer-events: none;
              z-index: 10;
              opacity: ${grit * 0.5};
            }

            .light-leak {
              position: absolute;
              top: -20%;
              left: -10%;
              width: 140%;
              height: 140%;
              background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
                          radial-gradient(circle at 80% 80%, rgba(197, 160, 89, 0.05) 0%, transparent 40%);
              pointer-events: none;
              z-index: 5;
              mix-blend-mode: screen;
            }

            .industrial-overlay {
              position: absolute;
              inset: 0;
              background: ${industrial ? 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255, 255, 255, 0.02) 1px, rgba(255, 255, 255, 0.02) 2px)' : 'none'};
              pointer-events: none;
              z-index: 4;
            }

            .scanlines {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,${scanlines * 0.5}) 50%);
              background-size: 100% 2px;
              pointer-events: none;
              z-index: 8;
            }

            .vignette {
              position: absolute;
              inset: 0;
              background: radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignette * 0.8}) 100%);
              pointer-events: none;
              z-index: 9;
            }

            .glitch-scan {
              position: absolute;
              inset: 0;
              background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
              background-size: 100% 2px, 3px 100%;
              pointer-events: none;
              z-index: 12;
              opacity: 0.1;
            }

            .beat-border {
                border: 1px solid rgba(255,255,255,0.1);
                transition: border-color 0.4s ease;
            }
          `}</style>
          {bg && (
            <div 
              data-export-bg
              data-export-master-img
              style={{ 
                position: "absolute", 
                inset: "-2%", // Ligero margen negativo para evitar bordes blancos
                backgroundImage: `url("${getHighResUrl(bg)}")`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat',
                imageRendering: 'high-quality',
                filter: 'brightness(1.02)' // Brillo base para contrarrestar el overlay oscuro
              }} 
            />
          )}
          
          {/* SILK SMOOTHING OVERLAY */}
          <div 
            data-backdrop-polyfill
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)`,
              backdropFilter: 'contrast(1.02)',
              zIndex: 1,
              pointerEvents: 'none'
            }} 
          />

          {/* LAYER 1: OVERLAY BASE */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            backgroundColor: `rgba(0,0,0,${overlay})` 
          }} />

          <div className="vignette" />
          <div className="light-leak" />
          <div className="halftone-grid" />
          {scanlines > 0 && <div className="scanlines" />}
          {noise && <div className="real-grain" />}
          {industrial && <div className="industrial-overlay" />}

          {/* === BOKEH BACKGROUND === */}
          {[{x:'15%',y:'20%',s:80,o:0.07},{x:'75%',y:'10%',s:120,o:0.05},{x:'88%',y:'55%',s:60,o:0.08},{x:'5%',y:'70%',s:100,o:0.06},{x:'50%',y:'85%',s:90,o:0.05},{x:'30%',y:'40%',s:50,o:0.04}].map((b,i) => (
            <div key={i} style={{ position:'absolute', left:b.x, top:b.y, width:b.s, height:b.s, borderRadius:'50%', background:`radial-gradient(circle, ${template==='beat-cyber'?'rgba(0,242,255,':template==='beat-crimson'?'rgba(255,68,68,':template==='beat-toxic'?'rgba(57,255,20,':template==='beat-platinum'?'rgba(229,228,226,':'rgba(197,160,89,'}${b.o}) 0%, transparent 70%)`, filter:'blur(12px)', zIndex:3, pointerEvents:'none' }} />
          ))}

          {/* === DIAGONAL ACCENT LINES === */}
          <div style={{ position:'absolute', inset:0, zIndex:11, pointerEvents:'none', overflow:'hidden' }}>
            {/* Top-left corner lines */}
            <div style={{ position:'absolute', top:0, left:0, width:'180px', height:'180px' }}>
              <div style={{ position:'absolute', top:'30px', left:'-60px', width:'200px', height:'1px', background:`linear-gradient(to right, transparent, ${contrastColor||'#c5a059'}44, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
              <div style={{ position:'absolute', top:'50px', left:'-60px', width:'200px', height:'1px', background:`linear-gradient(to right, transparent, ${contrastColor||'#c5a059'}22, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
            </div>
            {/* Bottom-right corner lines */}
            <div style={{ position:'absolute', bottom:0, right:0, width:'180px', height:'180px' }}>
              <div style={{ position:'absolute', bottom:'30px', right:'-60px', width:'200px', height:'1px', background:`linear-gradient(to left, transparent, ${contrastColor||'#c5a059'}44, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
              <div style={{ position:'absolute', bottom:'50px', right:'-60px', width:'200px', height:'1px', background:`linear-gradient(to left, transparent, ${contrastColor||'#c5a059'}22, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
            </div>
          </div>

          {/* === HORIZONTAL LIGHT SWEEP === */}
          <div style={{ position:'absolute', left:0, right:0, top:'38%', height: config.title * 2.5, background:`linear-gradient(180deg, transparent 0%, ${(contrastColor||'#c5a059')}0a 30%, ${(contrastColor||'#c5a059')}18 50%, ${(contrastColor||'#c5a059')}0a 70%, transparent 100%)`, zIndex:11, pointerEvents:'none', mixBlendMode:'screen' as const }} />

          {/* === VERTICAL SIDEBAR === */}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width: config.title * 1.0, zIndex:13, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ transform:'rotate(-90deg)', whiteSpace:'nowrap', fontSize: config.title * 0.13, fontWeight:900, letterSpacing:'0.35em', color:(contrastColor||'#c5a059'), opacity:0.55, fontFamily:'Inter', textTransform:'uppercase' as const }}>
              {artist.toUpperCase().includes('JUAN 614') ? 'JUAN 614 · JESUCRISTO · 2026 · DIOSMASGYM' : 'DIOSMASGYM RECORDS · PURO CHIHUAHUA · 2026'}
            </div>
            <div style={{ position:'absolute', right:0, top:'10%', bottom:'10%', width:'1px', background:`linear-gradient(to bottom, transparent, ${contrastColor||'#c5a059'}55, transparent)` }} />
          </div>

          {/* STYLE-SPECIFIC RENDERING */}
          {/* THE BEAT SERIES (ORIGINAL LAYOUT VARIANTS) */}
          {(template === 'original-v1' || template.startsWith('beat-')) && (() => {
            const theme = {
              'original-v1': { accent: contrastColor || '#c5a059', glow: glow ? contrastColor : 'rgba(197,160,89,0.15)', effect: null },
              'beat-crimson': { accent: '#ff4444', glow: 'rgba(255,68,68,0.2)', effect: 'grunge' },
              'beat-cyber': { accent: '#00f2ff', glow: 'rgba(0,242,255,0.25)', effect: 'glitch' },
              'beat-platinum': { accent: '#e5e4e2', glow: 'rgba(255,255,255,0.1)', effect: 'glass' },
              'beat-toxic': { accent: '#39ff14', glow: 'rgba(57,255,20,0.2)', effect: 'radar' }
            }[template] || { accent: '#c5a059', glow: 'rgba(197,160,89,0.15)', effect: null };

            return (
              <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", zIndex: 10 }}>
                {theme.effect === 'glitch' && <div className="glitch-scan" />}

                {/* INNER CONTENT AREA: padded, flex-1 so footer stays at bottom */}
                <div style={{ flex: 1, padding: config.title * 1.2, paddingLeft: config.title * 2.2, paddingBottom: config.title * 0.6, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

                {/* BRANDING LOGO REMOVED FROM TOP-RIGHT - MOVED TO FOOTER */}

                {/* HEADER (ORIGINAL) */}
                <div style={{ display: "flex", flexWrap: 'wrap', justifyContent: "space-between", alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: config.title * 0.28, fontWeight: 900, letterSpacing: '0.5em', color: theme.accent, fontFamily: 'Inter' }}>{artist.toUpperCase() === "JUAN 614" ? "JUAN 614" : `${artist.toUpperCase()} RECORDS`}</div>
                      <div style={{ fontSize: config.title * 0.12, letterSpacing: '0.8em', opacity: 0.4, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span>REFLECTIONS // HUB PRO V5.1</span>
                        <span style={{ color: theme.accent, opacity: 0.8 }}>//</span>
                        <span style={{ color: theme.accent }}>{artist.toUpperCase().includes('JUAN 614') ? 'PURO SEÑOR JESUCRISTO' : 'PURO CHIHUAHUA'}</span>
                      </div>
                  </div>
                  <div 
                    data-backdrop-polyfill
                    style={{ padding: "8px 20px", borderRadius: 2, border: `1px solid ${theme.accent}66`, background: "rgba(0, 0, 0, 0.4)", backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: theme.accent, fontSize: config.title * 0.22, fontWeight: '900', letterSpacing: '0.2em', fontFamily: 'Inter' }}>
                    {mode === "proximamente" ? "PRÓXIMO ESTRENO" : mode === "disponible" ? "YA DISPONIBLE" : "EXTENDED PLAY"}
                  </div>
                </div>

                {/* CENTER (ORIGINAL) */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {bg && (
                      <div style={{ position: 'relative', padding: 6, background: `linear-gradient(135deg, ${theme.accent} 0%, transparent 50%, ${theme.accent} 100%)`, borderRadius: 4, boxShadow: "0 40px 120px rgba(0,0,0,1)" }}>
                        <div style={{ width: config.title * 6, height: config.title * 6, overflow: 'hidden', borderRadius: 2 }}>
                          <div 
                            data-export-cover
                            data-export-master-img
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              backgroundImage: `url("${getHighResUrl(bg)}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              display: 'block', 
                              transform: bg && bg.startsWith('data:') ? 'scale(1.02)' : 'none', // Removed scale(1.3) which caused distortion/pixelation
                              filter: theme.effect === 'grunge' ? 'grayscale(0.3) contrast(1.2)' : 'none' 
                            }} 
                          />
                        </div>
                      </div>
                    )}
                  <div style={{ marginBottom: config.title * 0.4 }}>
                    {mode === 'proximamente' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                        <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${theme.accent})` }}></div>
                        <h4 style={{ 
                          fontSize: config.title * 0.22, 
                          color: theme.accent, 
                          fontWeight: 900, 
                          letterSpacing: '0.6em', 
                          textShadow: `0 4px 20px ${theme.accent}44`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          ESTRENO MUNDIAL
                        </h4>
                        <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${theme.accent})` }}></div>
                      </div>
                    )}
                    <h1 style={{ 
                      fontSize: config.title * (title.length > 15 ? 1.4 : 1.8), 
                      fontWeight: 900, 
                      lineHeight: 0.85, 
                      fontFamily: "'Bebas Neue'", 
                      color: textColor,
                      letterSpacing: '-1px', 
                      textShadow: `0 0 80px ${theme.accent}88, 0 0 30px ${theme.accent}55, 0 10px 20px rgba(0,0,0,0.6)`,
                      filter: stroke ? `drop-shadow(0 0 3px ${theme.accent})` : `drop-shadow(0 2px 8px rgba(0,0,0,0.8))`,
                      paddingBottom: config.title * 0.1
                    }}>{title}</h1>
                    <div style={{ marginTop: config.title * 0.3 }}>
                      <h2 style={{
                        fontSize: config.title * 0.35,
                        fontWeight: 700,
                        color: theme.accent,
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        textShadow: `0 2px 10px rgba(0,0,0,0.5)`,
                        fontFamily: 'Inter',
                        display: 'inline-block',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(10px)',
                        padding: `${config.title * 0.15}px ${config.title * 0.5}px`,
                        borderRadius: 100,
                        border: `1px solid ${theme.accent}33`
                      }}>
                        {artist}
                      </h2>
                    </div>
                  </div>
                  {mode === "proximamente" && (
                    <div style={{ marginTop: config.title * 0.25, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
                      <div 
                        data-backdrop-polyfill
                        style={{ 
                          padding: "12px 40px", 
                          background: "rgba(255, 255, 255, 0.05)", 
                          backdropFilter: 'blur(20px)', 
                          border: `1px solid ${theme.accent}33`, 
                          borderRadius: 100,
                          boxShadow: `0 10px 40px rgba(0,0,0,0.3)`
                        }}>
                        <div style={{ fontSize: config.title * 0.5, color: textColor, fontFamily: "'DM Serif Display'", fontStyle: 'italic', letterSpacing: '0.05em' }}>
                          {formatDate()}
                        </div>
                      </div>
                      {country && country.iso !== 'un' && (
                        <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.5em', color: theme.accent, opacity: 0.6, marginTop: 5 }}>
                          EXCLUSIVO // {country.name.toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  {mode === "disponible" && (
                    <div style={{ marginTop: config.title * 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: config.title * 0.3, color: theme.accent, fontWeight: 900, letterSpacing: '0.3em' }}>
                         <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${theme.accent}80)`, width: 60 }}></div>
                         <span>PLATAFORMAS DIGITALES</span>
                         <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${theme.accent}80)`, width: 60 }}></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: config.title * 0.8, color: theme.accent, opacity: 0.9 }}>
                        <i className="fab fa-spotify" style={{ fontSize: config.title * 0.7 }}></i>
                        <i className="fab fa-apple" style={{ fontSize: config.title * 0.7 }}></i>
                        <i className="fab fa-youtube" style={{ fontSize: config.title * 0.7 }}></i>
                        <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.7 }}></i>
                      </div>
                    </div>
                  )}
                </div>

                {/* ALBUM TRACKLIST IN TEMPLATE */}
                {mode === 'album' && trackList && trackList.filter(t => t.trim()).length > 0 && (
                  <div style={{ width: '100%', marginTop: config.title * 0.3, marginBottom: config.title * 0.2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: config.title * 0.15 }}>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${theme.accent}80)` }}></div>
                      <div style={{ fontSize: config.title * 0.2, fontWeight: 900, letterSpacing: '0.5em', color: theme.accent }}>TRACKLIST</div>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${theme.accent}80)` }}></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: trackList.filter(t => t.trim()).length > 5 ? '1fr 1fr' : '1fr', gap: `${config.title * 0.1}px ${config.title * 0.6}px` }}>
                      {trackList.filter(t => t.trim()).map((track, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.15, borderBottom: `1px solid ${theme.accent}22`, paddingBottom: config.title * 0.07 }}>
                          <span style={{ fontSize: config.title * 0.18, fontWeight: 900, color: theme.accent, minWidth: config.title * 0.45, opacity: 0.7 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontSize: config.title * 0.22, fontWeight: 700, color: textColor, letterSpacing: '0.1em', opacity: 0.9, textTransform: 'uppercase' }}>{track.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                </div>{/* END INNER CONTENT AREA */}

                {/* FOOTER — natural flex child, spans full width */}
                {/* FOOTER (PRO REFINED) */}
                <div style={{
                  background: `linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.97) 100%)`,
                  borderTop: `2px solid ${theme.accent}66`,
                  boxShadow: `0 -8px 40px rgba(0,0,0,0.8), inset 0 1px 0 ${theme.accent}33`,
                  padding: `${config.title * 0.5}px ${config.title * 1.4}px`,
                  flexShrink: 0,
                  boxSizing: 'border-box' as const,
                }}>

                  {/* MAIN FOOTER ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    {/* LEFT: Edition + Streaming icons */}
                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: config.title * 0.1, minWidth: config.title * 2.5 }}>
                      <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.4em', color: theme.accent }}>{template.split('-')[1]?.toUpperCase() || 'GOLD'} EDITION</div>
                      <div style={{ fontSize: config.title * 0.11, opacity: 0.25, fontWeight: 'bold' }}>© 2026 RECORDS HUB PRO</div>
                      {/* STREAMING PLATFORM ICONS */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.25, marginTop: config.title * 0.05, opacity: 0.55 }}>
                        <i className="fab fa-spotify" style={{ fontSize: config.title * 0.3, color: theme.accent }}></i>
                        <i className="fab fa-apple" style={{ fontSize: config.title * 0.3, color: theme.accent }}></i>
                        <i className="fab fa-youtube" style={{ fontSize: config.title * 0.3, color: theme.accent }}></i>
                        <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.28, color: theme.accent }}></i>
                        <i className="fab fa-instagram" style={{ fontSize: config.title * 0.28, color: theme.accent }}></i>
                      </div>
                    </div>

                    {/* CENTER: URL Badge + Slogan */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: config.title * 0.1, flexShrink: 0 }}>
                      <div
                        onClick={() => window.open(artist.toUpperCase().includes('JUAN 614') ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/', '_blank')}
                        style={{
                          padding: `${config.title * 0.12}px ${config.title * 0.5}px`,
                          borderRadius: 4,
                          fontWeight: '900',
                          fontSize: config.title * 0.2,
                          color: '#000',
                          background: theme.accent,
                          letterSpacing: '0.18em',
                          boxShadow: `0 8px 30px ${theme.accent}4d`,
                          cursor: 'pointer',
                          textTransform: 'uppercase' as const
                        }}
                      >
                        {artist.toUpperCase().includes('JUAN 614') ? 'juan614.diosmasgym.com' : 'musica.diosmasgym.com'}
                      </div>
                      <div style={{
                        fontSize: config.title * 0.42,
                        color: textColor,
                        fontFamily: "'Satisfy', cursive",
                        letterSpacing: '0.02em',
                        opacity: 1,
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                      }}>
                        {artist.toUpperCase().includes('JUAN 614') ? 'Puro Señor Jesucristo' : 'Puro Chihuahua, Saludos'}
                      </div>
                    </div>

                    {/* RIGHT: Logo + BPM tag */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: config.title * 0.1, minWidth: config.title * 2.5 }}>
                      <div style={{ width: config.title * 2.8, height: config.title * 1.4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <img
                          src={artist.toUpperCase().includes('JUAN 614') ? '/logo-juan614-v2.jpg' : '/logo-diosmasgym.png'}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            filter: `drop-shadow(0 0 10px ${theme.accent}55)`,
                            transform: artist.toUpperCase().includes('JUAN 614') ? 'scale(1.1)' : 'scale(1.3)'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: config.title * 0.11, opacity: 0.25, fontWeight: 'bold', letterSpacing: '0.1em' }}>© 2026 DIOSMASGYM RECORDS</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
    );
}

export default PromoImageApp;
