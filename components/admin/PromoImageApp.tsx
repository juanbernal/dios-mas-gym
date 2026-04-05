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

      const imageBase64 = canvas.toDataURL("image/png");
      
      const payload = {
        artist: finalArtist,
        title: finalTitle,
        mode: finalMode,
        timestamp: new Date().toLocaleTimeString(),
        post_text: `¡Nuevo lanzamiento! "${finalTitle}" de ${finalArtist}. ${finalMode === 'proximamente' ? 'Próximamente disponible.' : '¡Ya disponible!'} #DiosMasGym #Juan614`,
        image_base64: imageBase64
      };

      const res = await fetch("https://hook.us2.make.com/9jkc3se9ac5kragltqzru0tw0zppmwx4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log("✅ [MAKE] JSON Enviado con éxito!");
      } else {
        console.error("❌ [MAKE] Error JSON (HTTP " + res.status + ")");
      }
      setIsSendingToMake(false);
    } catch (err) {
      alert("Error en el envío JSON");
      console.error(err);
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
    config: sizes[size]
  };

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white">
      {/* APP HEADER */}
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#c5a059] transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          Volver al Panel
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Promo Generator <span className="opacity-30 ml-2">v2.0.7 - NEW WEBHOOK</span></h1>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PANEL */}
        <div className="p-6 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl h-fit order-2 lg:order-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#c5a059]">Configuración de Imagen</h2>
          <button 
            onClick={handleRandomFromCatalog}
            disabled={isLoadingCatalog}
            className="flex items-center gap-2 px-4 py-2 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-full text-[10px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all disabled:opacity-50"
          >
            <i className={`fas ${isLoadingCatalog ? 'fa-spinner fa-spin' : 'fa-random'}`}></i>
            {isLoadingCatalog ? 'Cargando...' : 'Obtener Aleatorio'}
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/40">Título</label>
            <input 
              className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none focus:border-[#c5a059]"
              value={title} 
              onChange={(e)=>setTitle(e.target.value.toUpperCase())} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Artista</label>
              <select 
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none text-white"
                value={artist} 
                onChange={(e)=>setArtist(e.target.value)}
              >
                <option value="Diosmasgym">Diosmasgym</option>
                <option value="Juan 614">Juan 614</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Modo</label>
              <select 
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none text-white"
                value={mode} 
                onChange={(e)=>setMode(e.target.value)}
              >
                <option value="proximamente">Próximamente</option>
                <option value="disponible">Disponible</option>
                <option value="album">Álbum</option>
              </select>
            </div>
          </div>

          {mode === "proximamente" && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Fecha de Lanzamiento</label>
              <input 
                type="datetime-local" 
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none text-white"
                value={date} 
                onChange={(e)=>setDate(e.target.value)} 
              />
            </div>
          )}

          {mode === "album" && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Tracklist (Uno por línea)</label>
              <textarea 
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none text-white h-32"
                value={tracks} 
                onChange={(e)=>setTracks(e.target.value.toUpperCase())} 
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <label className="text-[10px] uppercase font-bold text-white/40">Color Texto</label>
               <input type="color" className="w-full h-10 bg-transparent rounded-lg cursor-pointer" value={textColor} onChange={(e)=>setTextColor(e.target.value)} />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] uppercase font-bold text-white/40">Contraste (Glow)</label>
               <input type="color" className="w-full h-10 bg-transparent rounded-lg cursor-pointer" value={contrastColor} onChange={(e)=>setContrastColor(e.target.value)} />
             </div>
          </div>

          <div className="flex gap-8 py-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={glow} onChange={()=>setGlow(!glow)} className="w-4 h-4 accent-[#c5a059]" />
              <span className="text-xs uppercase font-bold group-hover:text-[#c5a059] transition-colors">Resplandor (Glow)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={stroke} onChange={()=>setStroke(!stroke)} className="w-4 h-4 accent-[#c5a059]" />
              <span className="text-xs uppercase font-bold group-hover:text-[#c5a059] transition-colors">Borde (Logo Layout)</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Formato</label>
              <select 
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg outline-none"
                value={size} 
                onChange={(e)=>setSize(e.target.value as any)}
              >
                <option value="instagram">Instagram (Portrait)</option>
                <option value="story">Story (Vertical)</option>
                <option value="post">Post (Horizontal)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/40">Imagen de Fondo</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleBg} 
                className="w-full text-xs text-white/40 file:bg-[#c5a059] file:border-0 file:text-black file:px-3 file:py-2 file:rounded-lg file:mr-2 cursor-pointer"
              />
            </div>
          </div>

          <button 
            onClick={handleAutoPublish}
            disabled={isSendingToMake || isLoadingCatalog}
            className="mt-4 w-full py-5 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.4em] rounded-lg hover:bg-white transition-all shadow-[0_20px_50px_rgba(197,160,89,0.3)] flex items-center justify-center gap-3 border-2 border-transparent hover:border-black"
          >
            <i className={`fas ${isSendingToMake ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
            {isSendingToMake ? 'Procesando Publicación...' : 'Publicar Aleatorio (1-Clic)'}
          </button>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={handleDownload}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-black uppercase text-[9px] tracking-widest rounded-lg hover:bg-white/10 transition-colors"
            >
              Descargar 4K
            </button>
            <button 
              onClick={handleSendToMake}
              disabled={isSendingToMake}
              className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 font-black uppercase text-[9px] tracking-widest rounded-lg hover:bg-white/10 transition-colors"
            >
              Enviar a Make
            </button>
          </div>

          {/* Autopilot Panel */}
          <div className="mt-8 p-6 bg-white/5 border border-[#c5a059]/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#c5a059]">Modo Piloto Automático</h3>
                <p className="text-[9px] text-white/40 uppercase mt-1">Automatización 24/7 de Promos</p>
              </div>
              <button 
                onClick={() => setIsAutopilot(!isAutopilot)}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isAutopilot ? 'bg-red-500 text-white' : 'bg-[#c5a059] text-black'}`}
              >
                {isAutopilot ? 'Detener Piloto' : 'Activar Piloto'}
              </button>
            </div>

            {isAutopilot && (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-[#c5a059]/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Próximo Envío:</span>
                  <span className="text-sm font-mono font-bold text-white">{formatCountdown(countdown)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <label className="text-[9px] uppercase font-bold text-white/40">Frecuencia (Minutos)</label>
              <input 
                type="number" 
                className="w-full bg-white/5 border border-white/10 p-2 rounded text-xs outline-none focus:border-[#c5a059]"
                value={autopilotMinutes}
                onChange={(e) => setAutopilotMinutes(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>

        </div>
      </div>

      {/* PREVIEW */}
      <div className="flex flex-col items-center gap-6 order-1 lg:order-2 overflow-hidden" ref={containerRef}>
        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-white/20">Vista Previa (Master)</h2>
        <div 
          style={{ 
            width: config.w * scale, 
            height: config.h * scale, 
            display: 'block',
            position: 'relative',
            boxShadow: '0 50px 100px rgba(0,0,0,0.5)'
          }}
        >
          <div 
            style={{ 
              width: config.w, 
              height: config.h, 
              borderRadius: 20, 
              position: "absolute", 
              overflow: "hidden", 
              display: 'block',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundColor: '#000'
            }}
          >
            <PromoTemplate {...commonProps} />
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
    </div>
  );
}

const PromoTemplate: React.FC<any> = ({ 
    title, artist, bg, mode, config, overlay, textColor, contrastColor, glow, stroke,
    formatDate, trackList, isExport = false 
}) => {
    return (
        <div style={{ width: "100%", height: "100%", position: 'relative' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:italic&family=Inter:wght@400;700;900&display=swap');
            * { -webkit-font-smoothing: antialiased; }
            .grain {
              position: absolute;
              inset: 0;
              background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
              background-size: 24px 24px;
              opacity: 1;
              pointer-events: none;
              z-index: 5;
            }
            .scanlines {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 50%);
              background-size: 100% 4px;
              pointer-events: none;
              z-index: 6;
            }
            .corner-br {
                position: absolute;
                width: 40px;
                height: 40px;
                border: 2px solid rgba(197, 160, 89, 0.4);
                z-index: 8;
                pointer-events: none;
            }
          `}</style>
          {bg && (
            <img src={bg} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
          )}

          {/* LAYER 1: VIGNETTE & OVERLAY */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            background: `radial-gradient(circle, transparent 0%, rgba(0,0,0,${overlay + 0.2}) 100%), rgba(0,0,0,${overlay})` 
          }} />

          {/* LAYER 2: SCANLINES & GRAIN */}
          <div className="scanlines" />
          <div className="grain" />

          {/* LAYER 3: TACTICAL BRACKETS */}
          <div className="corner-br" style={{ top: 20, left: 20, borderRight: 0, borderBottom: 0 }}></div>
          <div className="corner-br" style={{ top: 20, right: 20, borderLeft: 0, borderBottom: 0 }}></div>
          <div className="corner-br" style={{ bottom: 20, left: 20, borderRight: 0, borderTop: 0 }}></div>
          <div className="corner-br" style={{ bottom: 20, right: 20, borderLeft: 0, borderTop: 0 }}></div>

          {/* LAYER 4: BRANDING STAMP */}
          <div style={{
              position: 'absolute',
              top: '12%',
              right: '8%',
              width: config.title * 2,
              height: config.title * 2,
              borderRadius: '50%',
              border: '2px dashed rgba(197, 160, 89, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 15,
              opacity: 0.6,
              transform: 'rotate(-15deg)'
          }}>
              <div style={{
                  fontSize: config.title * 0.12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 900,
                  color: '#c5a059',
                  textAlign: 'center',
                  letterSpacing: '0.1em'
              }}>
                  MASTERED FOR<br />THE SPIRIT<br />6:14
              </div>
          </div>

          <div style={{ position: "relative", padding: config.title * 1.2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", zIndex: 10 }}>

            {/* HEADER: ARTIST BADGE */}
            <div style={{ display: "flex", flexWrap: 'wrap', justifyContent: "space-between", alignItems: 'flex-start', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ 
                    fontSize: config.title * 0.28, 
                    fontWeight: 900, 
                    letterSpacing: '0.5em', 
                    color: '#c5a059',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {artist.toUpperCase() === "JUAN 614" ? "JUAN 614" : `${artist.toUpperCase()} RECORDS`}
                  </div>
                  <div style={{ fontSize: config.title * 0.12, letterSpacing: '0.8em', opacity: 0.4, fontWeight: 'bold' }}>
                    REFLECTIONS // HUB PRO V5
                  </div>
              </div>
              <div style={{ 
                padding: "8px 20px", 
                borderRadius: 2, 
                border: '1px solid rgba(197, 160, 89, 0.6)',
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: 'blur(10px)',
                color: '#c5a059',
                fontSize: config.title * 0.22,
                fontWeight: '900',
                letterSpacing: '0.2em',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}>
                {mode === "proximamente" ? "PRÓXIMO ESTRENO" : mode === "disponible" ? "YA DISPONIBLE" : "EXTENDED PLAY"}
              </div>
            </div>

            {/* CENTER: COVER & TITLES */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>

              {bg && (
                <div style={{ position: "relative", marginBottom: config.title * 0.8 }}>
                  {/* GLOW BEHIND COVER */}
                  {glow && (
                    <div style={{ 
                        position: 'absolute', 
                        inset: -40, 
                        background: contrastColor, 
                        filter: 'blur(80px)', 
                        opacity: 0.25,
                        borderRadius: '50%'
                    }} />
                  )}
                  
                  <div style={{ 
                    position: 'relative',
                    padding: 6,
                    background: 'linear-gradient(135deg, #c5a059 0%, transparent 50%, #c5a059 100%)',
                    borderRadius: 4,
                    boxShadow: "0 40px 120px rgba(0,0,0,1)"
                  }}>
                    <img
                        src={bg}
                        style={{
                        width: config.title * 6,
                        height: config.title * 6,
                        borderRadius: 2,
                        objectFit: 'cover',
                        display: 'block'
                        }}
                    />
                    <div className="scanlines" style={{ opacity: 0.2, zIndex: 1 }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ 
                    fontSize: config.title * 0.25, 
                    color: '#c5a059', 
                    fontWeight: 900, 
                    letterSpacing: '0.8em', 
                    marginBottom: 15,
                    fontFamily: 'Inter, sans-serif' 
                }}>
                    ESTRENO GLOBAL
                </h4>
                <h1 style={{
                    fontSize: config.title * 1.8,
                    fontWeight: 900, // HIGH BOLD
                    lineHeight: 0.8,
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: textColor,
                    letterSpacing: '-2px',
                    WebkitTextStroke: stroke ? `2px ${contrastColor}` : 'none',
                    textShadow: stroke || glow ? `0px 20px 50px ${contrastColor}CC` : "none",
                    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))"
                }}>{title}</h1>
              </div>

              {mode === "proximamente" && (
                <div style={{ 
                    marginTop: 10,
                    fontSize: config.title * 0.5, 
                    color: textColor, 
                    fontFamily: "'DM Serif Display', serif",
                    fontStyle: 'italic',
                    opacity: 1,
                    textShadow: '0 5px 15px rgba(0,0,0,0.5)' 
                }}>
                   {formatDate()}
                </div>
              )}

              {mode === "disponible" && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                  <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 15,
                      fontSize: config.title * 0.3, 
                      color: '#c5a059',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 900,
                      letterSpacing: '0.3em'
                  }}>
                     <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right, transparent, rgba(197, 160, 89, 0.5))', width: 60 }}></div>
                     <span>PLATAFORMAS DIGITALES</span>
                     <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left, transparent, rgba(197, 160, 89, 0.5))', width: 60 }}></div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: config.title * 0.8,
                    color: '#c5a059',
                    opacity: 0.9,
                    filter: glow ? `drop-shadow(0 0 10px ${contrastColor}44)` : 'none'
                  }}>
                    <i className="fab fa-spotify" style={{ fontSize: config.title * 0.7 }}></i>
                    <i className="fab fa-apple" style={{ fontSize: config.title * 0.7 }}></i>
                    <i className="fab fa-youtube" style={{ fontSize: config.title * 0.7 }}></i>
                    <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.7 }}></i>
                  </div>
                </div>
              )}

              {mode === "album" && (
                <div style={{ marginTop: 30, color: textColor, fontSize: config.title * 0.25, textAlign: 'left', width: '90%', margin: '20px auto' }}>
                  {trackList.map((t: string, i: number)=>(
                    <div key={i} style={{ 
                        display:"flex", 
                        justifyContent:"space-between", 
                        borderBottom: '1px solid rgba(255,255,255,0.05)', 
                        padding: '8px 0',
                        fontFamily: 'Inter, sans-serif',
                        textTransform: 'uppercase'
                    }}>
                      <span style={{ color: '#c5a059', fontWeight: 900, fontSize: config.title * 0.15, opacity: 0.6 }}>PROX TRACK {String(i+1).padStart(2,"0")}</span>
                      <span style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: config.title * 0.28 }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* FOOTER: WEBSITE & CTA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', borderTop: '1px solid rgba(197, 160, 89, 0.2)', paddingTop: 15 }}>
               <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.4em', color: '#c5a059' }}>STUDIO SESSION</div>
                  <div style={{ fontSize: config.title * 0.12, opacity: 0.3, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}>&copy; 2026 RECORDS HUB PRO</div>
               </div>
               
               <div style={{ textAlign: "center" }}>
                 <div style={{
                   display: "inline-block",
                   padding: "12px 30px",
                   borderRadius: 2,
                   fontWeight: "900",
                   fontSize: config.title * 0.3,
                   color: '#000',
                   background: "#c5a059",
                   letterSpacing: '0.4em',
                   fontFamily: 'Inter, sans-serif',
                   boxShadow: "0 10px 40px rgba(197,160,89,0.3)"
                 }}>
                   DIOSMASGYM.COM
                 </div>
               </div>

               <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: config.title * 0.15, fontWeight: 900, letterSpacing: '0.4em', color: '#c5a059' }}>MASTERED HIGH DEF</div>
                  <div style={{ fontSize: config.title * 0.12, opacity: 0.3, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}>BPM: 128 // ID: TACTICAL-7</div>
               </div>
            </div>

          </div>
        </div>
    );
}

export default PromoImageApp;
