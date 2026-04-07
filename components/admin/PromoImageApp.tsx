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
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [autopilotMinutes, setAutopilotMinutes] = useState(240);
  const [countdown, setCountdown] = useState(0);
  
  // NEW AESTHETICS 2026
  const [template, setTemplate] = useState("original-v1");
  const [grit, setGrit] = useState(0.15);
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

  const handleRandomFromCatalog = () => {
    if (catalog.length === 0) {
      alert("Catálogo vacío o cargando...");
      return;
    }
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    setTitle(song.name.toUpperCase());
    setArtist(normalizedArtist);
    setBg(song.cover);
    setMode("disponible");
    setSize("instagram");
  };

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

  // Autopilot Timer
  useEffect(() => {
    let timer: any;
    if (isAutopilot) {
       setCountdown(autopilotMinutes * 60);
       timer = setInterval(() => {
          setCountdown(prev => {
             if (prev <= 1) {
                handleAutoPublish();
                return autopilotMinutes * 60;
             }
             return prev - 1;
          });
       }, 1000);
    } else {
       setCountdown(0);
       clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isAutopilot, autopilotMinutes]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleAutoPublish = async () => {
    if (catalog.length === 0) {
      alert("Catálogo vacío o cargando...");
      return;
    }
    
    // 1. Elegir canción al azar
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    const newTitle = song.name.toUpperCase();
    const newArtist = normalizedArtist;
    const newMode = "disponible";

    console.log("🎲 [PILOTO] Seleccionando:", newTitle);

    setTitle(newTitle);
    setArtist(newArtist);
    setBg(song.cover);
    setMode(newMode);
    setSize("instagram");

    // 2. Esperar a que el DOM cargue la nueva imagen (2.5s)
    setIsSendingToMake(true);
    
    setTimeout(async () => {
      console.log("⏱️ [AUTO] Ejecutando envío programado...");
      await handleSendToMake(newTitle, newArtist, newMode);
    }, 2500);
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
      await document.fonts.load('1em "Bebas Neue"');
      
      const canvas = await html2canvas(exportEl, {
        scale: 1.5, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
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
      await document.fonts.load('1em "Bebas Neue"');
      
      const canvas = await html2canvas(exportEl, {
        scale: 4, 
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null
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
      }, "image/png");
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
          
          {/* GROUP: CONTENT */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl scale-in">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059]">Contenido Principal</h2>
              <button 
                onClick={handleRandomFromCatalog}
                disabled={isLoadingCatalog}
                className="flex items-center gap-2 px-6 py-2 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all disabled:opacity-50"
              >
                <i className={`fas ${isLoadingCatalog ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>
                {isLoadingCatalog ? 'Sorteando...' : 'Catálogo Aleatorio'}
              </button>
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
              {/* TEMPLATE SELECTOR */}
              <div className="space-y-4">
                 <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Motor de Renderizado (v5.1 HQ)</label>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'original-v1', label: 'ORIGINAL BEAT', icon: 'fa-history' },
                      { id: 'studio-v3', label: 'STUDIO BLACK', icon: 'fa-cube' },
                      { id: 'magazine', label: 'SACRED EDITORIAL', icon: 'fa-book-open' },
                      { id: 'minimal-pro', label: 'CINEMATIC NOIR', icon: 'fa-film' },
                      { id: 'neon-strike', label: 'PRISM FLOW', icon: 'fa-droplet' }
                    ].map((t) => (
                      <button 
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-3 ${template === t.id ? 'bg-[#c5a059] text-black border-[#c5a059] shadow-lg shadow-[#c5a059]/30 scale-[1.02]' : 'bg-black/40 text-white/30 border-white/5 hover:text-white hover:border-[#c5a059]/40'}`}
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

          {/* GROUP: EXPORT */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-8">Salida de Producción</h2>
             <div className="flex flex-col gap-4">
                <button 
                  onClick={handleAutoPublish}
                  disabled={isSendingToMake || isLoadingCatalog}
                  className="w-full py-6 bg-white text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-2xl hover:bg-[#c5a059] transition-all flex items-center justify-center gap-4 group shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  <i className={`fas ${isSendingToMake ? 'fa-spinner fa-spin' : 'fa-shuttle-space'} group-hover:rotate-12 transition-transform`}></i>
                  {isSendingToMake ? 'Sincronizando...' : 'Publicación Instantánea'}
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleDownload}
                    className="py-4 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-download"></i> Master 4K
                  </button>
                  <button 
                    onClick={() => setIsAutopilot(!isAutopilot)}
                    className={`py-4 border text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${isAutopilot ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                  >
                    <i className={`fas ${isAutopilot ? 'fa-radio' : 'fa-robot'}`}></i> {isAutopilot ? formatCountdown(countdown) : 'Piloto OFF'}
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

            .film-grain {
              position: absolute;
              inset: 0;
              background-image: url("https://www.transparenttextures.com/patterns/60-lines.png");
              opacity: 0.05;
              pointer-events: none;
              z-index: 6;
            }

            .serif-display {
                font-family: 'DM Serif Display', serif;
            }

            .glass-panel {
                background: rgba(0,0,0,0.4);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(197, 160, 89, 0.2);
            }

            .gold-glow {
                box-shadow: 0 0 50px rgba(197,160,89,0.1);
            }
          `}</style>
          {bg && (
            <img src={bg} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
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
          {template === 'studio-v3' && (
            <div style={{ position: "relative", padding: config.title * 1.5, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", zIndex: 10 }}>
              <div style={{ position: 'absolute', top: 0, left: 20, width: 2, height: '100%', background: 'linear-gradient(to bottom, transparent, #c5a059, transparent)', opacity: 0.2 }}></div>
              <div style={{ position: 'absolute', top: 0, right: 20, width: 2, height: '100%', background: 'linear-gradient(to bottom, transparent, #c5a059, transparent)', opacity: 0.2 }}></div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'flex-start' }}>
                <div style={{ opacity: 0.8 }}>
                    <div style={{ fontSize: config.title * 0.2, fontWeight: 900, letterSpacing: '0.8em', color: '#c5a059' }}>RECORDS // HUB PRO</div>
                    <div style={{ fontSize: config.title * 0.1, letterSpacing: '0.4em' }}>STUDIO BLACK EDITION</div>
                </div>
                <div style={{ fontSize: config.title * 0.15, fontWeight: 900, borderBottom: '1px solid #c5a059', paddingBottom: 4 }}>{mode.toUpperCase()}</div>
              </div>

              <div style={{ textAlign: "center" }}>
                 {bg && (
                   <div style={{ position: 'relative', display: 'inline-block', marginBottom: 40, padding: 20, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                      {glow && <div style={{ position: 'absolute', inset: -10, background: contrastColor, filter: 'blur(100px)', opacity: 0.15 }} />}
                      <img src={bg} style={{ width: config.title * 6, height: config.title * 6, borderRadius: 2, objectFit: 'cover' }} />
                   </div>
                 )}
                 <h1 style={{ fontSize: config.title * (title.length > 15 ? 1.4 : 1.8), fontWeight: 900, fontFamily: 'Bebas Neue', color: textColor, letterSpacing: '6px', margin: 0 }}>{title}</h1>
                 <div style={{ marginTop: 20, fontSize: config.title * 0.3, fontWeight: 900, color: '#c5a059', letterSpacing: '1.2em' }}>{artist.toUpperCase()}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 60, alignItems: 'center' }}>
                 <div style={{ width: 100, height: 1, background: 'rgba(197,160,89,0.3)' }}></div>
                 <div style={{ fontSize: config.title * 0.3, fontWeight: 900, letterSpacing: '0.8em' }}>DIOSMASGYM.COM</div>
                 <div style={{ width: 100, height: 1, background: 'rgba(197,160,89,0.3)' }}></div>
              </div>
            </div>
          )}

          {template === 'magazine' && (
            <div style={{ position: "relative", padding: config.title * 2, display: "flex", flexDirection: "column", height: "100%", zIndex: 10, background: 'rgba(10,10,10,1)' }}>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 60 }}>
                  <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '1em', color: '#c5a059', marginBottom: 20 }}>EL ARSENAL DE FE // MAGAZINE</div>
                  <h2 style={{ fontSize: config.title, fontFamily: 'DM Serif Display', margin: 0, textTransform: 'uppercase', letterSpacing: '10px', WebkitTextStroke: '1px rgba(255,255,255,0.1)', color: 'transparent' }}>RECORDS</h2>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, flex: 1, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                     <h4 style={{ fontSize: config.title * 0.2, color: '#c5a059', fontWeight: 900, letterSpacing: '0.5em', marginBottom: 20 }}>THE ARTIST</h4>
                     <h5 style={{ fontSize: config.title * 1.5, fontFamily: 'Bebas Neue', color: textColor, margin: 0, lineHeight: 0.8 }}>{artist.toUpperCase()}</h5>
                  </div>
                  {bg && (
                     <div style={{ position: 'relative' }}>
                        <img src={bg} style={{ width: '100%', height: config.title * 8, objectFit: 'cover', borderRadius: '4px', filter: 'grayscale(0.5) contrast(1.1)' }} />
                        <div style={{ position: 'absolute', bottom: -20, left: -20, padding: '20px', background: '#c5a059', color: '#000', fontSize: 12, fontWeight: 900, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>S/A-26</div>
                     </div>
                  )}
               </div>

               <div style={{ marginTop: 60 }}>
                  <h1 style={{ fontSize: config.title * (title.length > 15 ? 1.4 : 1.8), fontFamily: 'DM Serif Display', fontStyle: 'italic', color: textColor, lineHeight: 0.9, textAlign: 'center' }}>{title}</h1>
                  <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 900, opacity: 0.5, letterSpacing: '4px' }}>
                     <span>VOL. 3 // NO. 614</span>
                     <span>DIOSMASGYM.COM</span>
                     <span>{mode.toUpperCase()}</span>
                  </div>
               </div>
            </div>
          )}

          {template === 'minimal-pro' && (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", background: '#000', zIndex: 10 }}>
                {bg && (
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
                        <img src={bg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 10%, transparent 50%, #000 90%)' }}></div>
                    </div>
                )}
                
                <div style={{ position: 'absolute', top: 60, width: '100%', textAlign: 'center', fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '1.2em', color: '#c5a059' }}>{artist.toUpperCase()}</div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: config.title * 2 }}>
                    <h1 style={{ fontSize: config.title * (title.length > 15 ? 2.5 : 3.5), fontWeight: 900, fontFamily: 'Bebas Neue', color: textColor, letterSpacing: '4px', textAlign: 'center', margin: 0, opacity: 0.9 }}>{title}</h1>
                    <div style={{ marginTop: 40, padding: '10px 40px', border: '1px solid rgba(255,255,255,0.2)', fontSize: config.title * 0.3, fontWeight: 900, letterSpacing: '8px' }}>{mode.toUpperCase()}</div>
                </div>

                <div style={{ position: 'absolute', bottom: 60, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 40, height: 1, background: '#c5a059' }}></div>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '6px' }}>CINEMATIC NOIR</div>
                    <div style={{ width: 40, height: 1, background: '#c5a059' }}></div>
                </div>
            </div>
          )}

          {template === 'neon-strike' && (
            <div style={{ position: "relative", padding: config.title * 2, display: "flex", flexDirection: "column", height: "100%", background: '#080808', zIndex: 10, overflow: 'hidden' }}>
                {/* PRISM ELEMENTS */}
                <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '140%', height: '140%', background: `radial-gradient(circle at center, rgba(197, 160, 89, 0.1) 0%, transparent 70%)`, filter: 'blur(60px)' }}></div>
                
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    {bg && (
                        <div style={{ position: 'relative', marginBottom: 60, width: config.title * 7, height: config.title * 7 }}>
                            <div style={{ position: 'absolute', inset: -30, border: '1px solid rgba(197, 160, 89, 0.1)', borderRadius: '50%' }}></div>
                            <img src={bg} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: '4px solid #c5a059', boxShadow: '0 0 80px rgba(197,160,89,0.2)' }} />
                        </div>
                    )}
                    <h2 style={{ fontSize: config.title * 0.3, fontWeight: 900, color: '#c5a059', letterSpacing: '1em', marginBottom: 20 }}>{artist.toUpperCase()}</h2>
                    <h1 style={{ fontSize: config.title * (title.length > 15 ? 1.6 : 2.5), fontWeight: 900, fontFamily: 'Bebas Neue', color: '#fff', letterSpacing: '15px', textShadow: '0 0 30px rgba(255,255,255,0.2)' }}>{title}</h1>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 30 }}>
                    <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.3 }}>PRISM FLOW // V1.0</div>
                    <div style={{ padding: '8px 25px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 900, letterSpacing: '4px' }}>{mode.toUpperCase()}</div>
                    <div style={{ fontSize: config.title * 0.3, fontWeight: 900, color: '#c5a059' }}>6:14</div>
                </div>
            </div>
          )}
        </div>
    );
}

export default PromoImageApp;
