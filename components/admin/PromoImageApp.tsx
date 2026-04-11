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

const PromoImageApp: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("CARGANDO CANCIÓN...");
  const [artist, setArtist] = useState("Diosmasgym");
  const [bg, setBg] = useState<string | null>(null);
  const [mode, setMode] = useState("proximamente");
  const [size, setSize] = useState<keyof typeof sizes>("story");
  const [date, setDate] = useState("2026-04-05T23:00");
  const [overlay, setOverlay] = useState(0.65);
  const [tracks, setTracks] = useState("INTRO\nTEMA UNO\nTEMA DOS");
  const [textColor, setTextColor] = useState("#ffffff");
  const [contrastColor, setContrastColor] = useState("#000000");
  const [glow, setGlow] = useState(true);
  const [stroke, setStroke] = useState(false); // Default to false for solid look
  const containerRef = useRef<HTMLDivElement>(null);
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
    img.crossOrigin = "anonymous"; // SOLUCIÓN AL ERROR DE SEGURIDAD
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

        let brightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        brightness /= data.length / 4;

        setOverlay(brightness > 140 ? 0.75 : 0.45);
        setTextColor(brightness > 140 ? "#000000" : "#ffffff");
        setContrastColor(brightness > 140 ? "#ffffff" : "#000000");
      } catch (err) {
        console.warn("⚠️ [SEGURIDAD] No se pudo leer el brillo (CORS). Usando valores por defecto.");
        setOverlay(0.5);
        setTextColor("#ffffff");
        setContrastColor("#000000");
      }
    };
    img.onerror = () => {
      console.warn("⚠️ [ERROR] No se pudo cargar la imagen de detección de brillo.");
    };
  }, [bg]);

  const handleShare = async (platform: 'whatsapp' | 'facebook' | 'twitter' | 'generic') => {
    const exportEl = document.getElementById("promo-export-master");
    if (!exportEl) return;

    try {
      // 1. Asegurar que TODAS las fuentes estén cargadas
      await Promise.all([
        document.fonts.load('1em "Bebas Neue"'),
        document.fonts.load('1em "Inter"'),
        document.fonts.load('1em "DM Serif Display"'),
        document.fonts.load('1em "Space Grotesk"')
      ]);
      
      // 2. Esperar que la imagen de fondo esté cargada en el navegador
      if (bg) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = bg;
          await new Promise((resolve) => {
              if (img.complete) resolve(true);
              else { img.onload = () => resolve(true); img.onerror = () => resolve(false); }
          });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(exportEl, {
        scale: 3, // Calidad alta para compartir
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        imageTimeout: 15000,
        width: config.w,
        height: config.h,
        windowWidth: config.w,
        windowHeight: config.h
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not generate image");

      const file = new File([blob], `promo-${title.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
      const text = `¡Escucha "${title}" de ${artist}! Ya disponible. #DiosMasGym #Juan614`;
      const url = "https://diosmasgym.com";

      // 1. Try Native Sharing (Recommended for Mobile)
      if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: text,
          });
          setIsSendingToMake(false);
          return;
        } catch (err) {
          console.warn("Share failed or cancelled:", err);
        }
      }

      // 2. Try Clipboard (Best for Desktop)
      try {
        if (typeof ClipboardItem !== 'undefined') {
            const data = [new ClipboardItem({ [file.type]: blob })];
            await navigator.clipboard.write(data);
            alert("✅ Imagen copiada al portapapeles. ¡Pégala directamente en tu chat o red social!");
            setIsSendingToMake(false);
            return;
        }
      } catch (err) {
        console.warn("Clipboard failed:", err);
      }

      // 3. Fallback to per-platform URL (Text only)
      switch (platform) {
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, '_blank');
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'generic':
          alert("Tu navegador no soporta compartir archivos. Usa 'Descargar Master 4K' y comparte el archivo manualmente.");
          break;
      }
    } catch (err) {
      console.error("Error sharing:", err);
      alert("Error al procesar la imagen para compartir.");
    } finally {
      setIsSendingToMake(false);
    }
  };

  const handleSendToMake = async (ovTitle?: any, ovArtist?: any, ovMode?: any) => {
    const exportEl = document.getElementById("promo-export-master");
    if (!exportEl) return;
    
    // Prioridad absoluta a los parámetros pasados (para evitar clausuras viejas)
    const finalTitle = (typeof ovTitle === 'string') ? ovTitle : titleRef.current;
    const finalArtist = (typeof ovArtist === 'string') ? ovArtist : artistRef.current;
    const finalMode = (typeof ovMode === 'string') ? ovMode : modeRef.current;

    console.log("📤 [MAKE] Enviando FormData:", finalTitle, "-", finalArtist);

    setIsSendingToMake(true);
    try {
      // 1. Asegurar que TODAS las fuentes estén cargadas
      await Promise.all([
        document.fonts.load('1em "Bebas Neue"'),
        document.fonts.load('1em "Inter"'),
        document.fonts.load('1em "DM Serif Display"'),
        document.fonts.load('1em "Space Grotesk"')
      ]);
      
      if (bg) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = bg;
          await new Promise(resolve => {
              if (img.complete) resolve(true);
              else { img.onload = () => resolve(true); img.onerror = () => resolve(false); }
          });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(exportEl, {
        scale: 2, 
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        imageTimeout: 15000,
        width: config.w,
        height: config.h,
        windowWidth: config.w,
        windowHeight: config.h
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
            setIsSendingToMake(false);
            return;
        }

        const formData = new FormData();
        formData.append("file", blob, `promo-${finalArtist.replace(/\s+/g, '-')}.png`);
        formData.append("artist", finalArtist);
        formData.append("title", finalTitle);
        formData.append("mode", finalMode);
        formData.append("post_text", `¡Nuevo lanzamiento! "${finalTitle}" de ${finalArtist}. ${finalMode === 'proximamente' ? 'Próximamente disponible.' : '¡Ya disponible!'} #DiosMasGym #Juan614`);

        try {
            const res = await fetch("https://hook.us2.make.com/9jkc3se9ac5kragltqzru0tw0zppmwx4", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                console.log("✅ [MAKE] Archivo NATIVO enviado con éxito a Make!");
            } else {
                console.error("❌ [MAKE] Error (HTTP " + res.status + ")");
            }
        } catch (err) {
            alert("Error enviando datos a Make");
            console.error(err);
        }
        setIsSendingToMake(false);
      }, "image/png");

    } catch (e) {
      console.error("Error General:", e);
      alert("Ocurrió un error inesperado al procesar la imagen");
      setIsSendingToMake(false);
    }
  };


  const handleDownload = async () => {
    const exportEl = document.getElementById("promo-export-master");
    if (!exportEl) return;
    try {
      // 1. Asegurar cargado de fuentes
      await Promise.all([
        document.fonts.load('1em "Bebas Neue"'),
        document.fonts.load('1em "Inter"'),
        document.fonts.load('1em "DM Serif Display"'),
        document.fonts.load('1em "Space Grotesk"')
      ]);
      
      // 2. Asegurar cargado de imagen real
      if (bg) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = bg;
          await new Promise(resolve => {
              if (img.complete) resolve(true);
              else { img.onload = () => resolve(true); img.onerror = () => resolve(false); }
          });
      }
      
      // 3. Pequeño retraso extra para estabilización de renderizado en off-screen
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(exportEl, {
        scale: 5, // Aumentamos a 5 para máxima nitidez (resolución 5K aprox)
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: null,
        imageTimeout: 20000,
        removeContainer: true,
        width: config.w,
        height: config.h,
        windowWidth: config.w,
        windowHeight: config.h
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `promo-${artist.replace(/\s+/g, '-')}-${mode}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png", 1.0); // Calidad máxima sugerida para el blob
    } catch (err) {
      alert("Error al descargar");
      console.error(err);
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
      const d = new Date(date);
      const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "long" }).toUpperCase();
      const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `ESTRENO ${fecha} · ${hora}`;
    } catch {
      return "PRÓXIMAMENTE";
    }
  };

  const commonProps = {
    title, artist, bg, mode, size, date, overlay, textColor, contrastColor, glow, stroke,
    formatDate, trackList: tracks.split("\n"),
    config: sizes[size],
    grit, noise, scanlines, vignette, industrial, template
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

      <div className="flex-1 p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 overflow-auto">
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
            </div>
          </div>

          {/* GROUP: AESTHETICS & TEMPLATES */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-8">Base de Diseño & Plantilla</h2>
            
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
                  onClick={handleDownload}
                  className="w-full py-6 bg-white text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-2xl hover:bg-[#c5a059] transition-all flex items-center justify-center gap-4 group shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  <i className="fas fa-download group-hover:translate-y-1 transition-transform"></i> Descargar Master 4K
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
              style={{ 
                width: config.w * scale, 
                height: config.h * scale, 
                display: 'block',
                position: 'relative',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isSendingToMake ? 'brightness(0.5) blur(10px)' : 'none'
              }}
              className="hover:scale-[1.02] cursor-crosshair"
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

            {isSendingToMake && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-[200] animate-fade-in">
                <div className="w-16 h-16 border-t-2 border-r-2 border-[#c5a059] rounded-full animate-spin"></div>
                <div className="text-[10px] font-black uppercase tracking-[1em] text-[#c5a059] animate-pulse">Masterizando Señal</div>
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

      {/* EXPORT MASTER (OFF-SCREEN) */}
      <div id="promo-export-master" style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -100 }}>
         <div style={{ width: config.w, height: config.h, overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
            <PromoTemplate {...commonProps} isExport={true} />
         </div>
      </div>
    </div>
  );
}

const PromoTemplate: React.FC<any> = ({ 
    title, artist, bg, mode, config, overlay, textColor, contrastColor, glow, stroke,
    formatDate, trackList, isExport = false,
    grit, noise, scanlines, vignette, industrial, template
}) => {
    return (
        <div style={{ width: "100%", height: "100%", position: 'relative', overflow: 'hidden' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:italic&family=Inter:wght@400;700;900&family=Space+Grotesk:wght@300;700&display=swap');
            * { -webkit-font-smoothing: antialiased; }
            
            .noise-layer {
              position: absolute;
              inset: 0;
              background-image: url("https://www.transparenttextures.com/patterns/carbon-fibre.png");
              opacity: ${grit * 0.5};
              mix-blend-mode: overlay;
              pointer-events: none;
              z-index: 7;
            }

            .real-grain {
              position: absolute;
              inset: 0;
              background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
              opacity: ${grit};
              pointer-events: none;
              z-index: 6;
            }

            .industrial-overlay {
              position: absolute;
              inset: 0;
              background: ${template === 'studio-v3' ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(197, 160, 89, 0.03) 10px, rgba(197, 160, 89, 0.03) 20px)' : 'none'};
              pointer-events: none;
              z-index: 4;
            }

            .scanlines {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,${scanlines}) 50%);
              background-size: 100% 4px;
              pointer-events: none;
              z-index: 8;
            }

            .vignette {
              position: absolute;
              inset: 0;
              background: radial-gradient(circle, transparent 20%, rgba(0,0,0,${vignette}) 100%);
              pointer-events: none;
              z-index: 9;
            }

            .glitch-scan {
              position: absolute;
              inset: 0;
              background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
              background-size: 100% 2px, 3px 100%;
              pointer-events: none;
              z-index: 12;
              opacity: 0.15;
            }

            .beat-border {
                border: 1px solid rgba(255,255,255,0.1);
                transition: border-color 0.4s ease;
            }
          `}</style>
          {bg && (
            <div style={{ 
              position: "absolute", 
              inset: 0, 
              backgroundImage: `url("${bg}")`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              backgroundRepeat: 'no-repeat'
            }} />
          )}

          {/* LAYER 1: OVERLAY BASE */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            backgroundColor: `rgba(0,0,0,${overlay})` 
          }} />

          {/* LAYER 2: TEXTURES (Common but adaptive) */}
          <div className="vignette" />
          {scanlines > 0 && <div className="scanlines" />}
          {noise && <div className="real-grain" />}
          {industrial && <div className="industrial-overlay" />}

          {/* STYLE-SPECIFIC RENDERING */}
          {/* THE BEAT SERIES (ORIGINAL LAYOUT VARIANTS) */}
          {(template === 'original-v1' || template.startsWith('beat-')) && (() => {
            const theme = {
              'original-v1': { accent: '#c5a059', glow: glow ? contrastColor : 'rgba(197,160,89,0.15)', effect: null },
              'beat-crimson': { accent: '#ff4444', glow: 'rgba(255,68,68,0.2)', effect: 'grunge' },
              'beat-cyber': { accent: '#00f2ff', glow: 'rgba(0,242,255,0.25)', effect: 'glitch' },
              'beat-platinum': { accent: '#e5e4e2', glow: 'rgba(255,255,255,0.1)', effect: 'glass' },
              'beat-toxic': { accent: '#39ff14', glow: 'rgba(57,255,20,0.2)', effect: 'radar' }
            }[template] || { accent: '#c5a059', glow: 'rgba(197,160,89,0.15)', effect: null };

            return (
              <div style={{ position: "relative", padding: config.title * 1.2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", zIndex: 10 }}>
                {theme.effect === 'glitch' && <div className="glitch-scan" />}
                
                {/* BRANDING STAMP (ORIGINAL) */}
                <div style={{ position: 'absolute', top: '12%', right: '8%', width: config.title * 2, height: config.title * 2, borderRadius: '50%', border: `2px dashed ${theme.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15, opacity: 0.6, transform: 'rotate(-15deg)' }}>
                    <div style={{ fontSize: config.title * 0.12, fontFamily: 'Inter', fontWeight: 900, color: theme.accent, textAlign: 'center', letterSpacing: '0.1em' }}>MASTERED FOR<br />THE SPIRIT<br />6:14</div>
                </div>

                {/* HEADER (ORIGINAL) */}
                <div style={{ display: "flex", flexWrap: 'wrap', justifyContent: "space-between", alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: config.title * 0.28, fontWeight: 900, letterSpacing: '0.5em', color: theme.accent, fontFamily: 'Inter' }}>{artist.toUpperCase() === "JUAN 614" ? "JUAN 614" : `${artist.toUpperCase()} RECORDS`}</div>
                      <div style={{ fontSize: config.title * 0.12, letterSpacing: '0.8em', opacity: 0.4, fontWeight: 'bold' }}>REFLECTIONS // HUB PRO V5.1</div>
                  </div>
                  <div style={{ padding: "8px 20px", borderRadius: 2, border: `1px solid ${theme.accent}66`, background: "rgba(0, 0, 0, 0.4)", backdropFilter: 'blur(10px)', color: theme.accent, fontSize: config.title * 0.22, fontWeight: '900', letterSpacing: '0.2em', fontFamily: 'Inter' }}>
                    {mode === "proximamente" ? "PRÓXIMO ESTRENO" : mode === "disponible" ? "YA DISPONIBLE" : "EXTENDED PLAY"}
                  </div>
                </div>

                {/* CENTER (ORIGINAL) */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {bg && (
                    <div style={{ position: "relative", marginBottom: config.title * 0.8 }}>
                      <div style={{ position: 'absolute', inset: -40, background: theme.glow, filter: 'blur(80px)', opacity: 0.25, borderRadius: '50%' }} />
                      <div style={{ position: 'relative', padding: 6, background: `linear-gradient(135deg, ${theme.accent} 0%, transparent 50%, ${theme.accent} 100%)`, borderRadius: 4, boxShadow: "0 40px 120px rgba(0,0,0,1)" }}>
                        <img src={bg} crossOrigin="anonymous" style={{ width: config.title * 6, height: config.title * 6, borderRadius: 2, objectFit: 'cover', display: 'block', filter: theme.effect === 'grunge' ? 'grayscale(0.3) contrast(1.2)' : 'none' }} />
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: config.title * 0.25, color: theme.accent, fontWeight: 900, letterSpacing: '0.8em', marginBottom: 15, fontFamily: 'Inter' }}>ESTRENO GLOBAL</h4>
                    <h1 style={{ fontSize: config.title * (title.length > 15 ? 1.4 : 1.8), fontWeight: 900, lineHeight: 0.8, fontFamily: "'Bebas Neue'", color: textColor, letterSpacing: '-2px', textShadow: `0px 20px 50px ${theme.accent}33` }}>{title}</h1>
                  </div>
                  {mode === "proximamente" && <div style={{ marginTop: 10, fontSize: config.title * 0.5, color: textColor, fontFamily: "'DM Serif Display'", fontStyle: 'italic' }}>{formatDate()}</div>}
                  {mode === "disponible" && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
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

                {/* FOOTER (ORIGINAL) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', borderTop: `1px solid ${theme.accent}33`, paddingTop: 15 }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.4em', color: theme.accent }}>{template.split('-')[1]?.toUpperCase() || 'GOLD'} EDITION</div>
                      <div style={{ fontSize: config.title * 0.12, opacity: 0.3, fontWeight: 'bold' }}>&copy; 2026 RECORDS HUB PRO</div>
                    </div>
                    <div style={{ padding: "12px 30px", borderRadius: 2, fontWeight: "900", fontSize: config.title * 0.3, color: '#000', background: theme.accent, letterSpacing: '0.4em', boxShadow: `0 10px 40px ${theme.accent}4d` }}>DIOSMASGYM.COM</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.4em', color: theme.accent }}>MASTERED HIGH DEF</div>
                      <div style={{ fontSize: config.title * 0.12, opacity: 0.3, fontWeight: 'bold' }}>BPM: 128 // ID: {template.startsWith('beat') ? 'BEAT' : 'TACTICAL'}-6:14</div>
                    </div>
                </div>
              </div>
            );
          })()}
        </div>
    );
}

export default PromoImageApp;
