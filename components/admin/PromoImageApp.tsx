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
  const [title, setTitle] = useState("¿DUDAS QUÉ ES AMOR?");
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
  const [stroke, setStroke] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614')
        ]);
        setCatalog([...dM, ...j6]);
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
    
    // Normalize artist name to match select options
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    setTitle(song.name.toUpperCase());
    setArtist(normalizedArtist);
    setBg(song.cover);
    setMode("disponible");
    setSize("instagram"); // User requested instagram by default
  };

  const website = artist === "Diosmasgym"
    ? "🔥 BUSCA AQUÍ: musica.diosmasgym.com"
    : "🔥 BUSCA AQUÍ: juan614.diosmasgym.com";

  const trackList = tracks.split("\n");
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
    img.src = bg;
    img.onload = () => {
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
    };
  }, [bg]);

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try {
      // Force font loading
      await document.fonts.load('1em "Bebas Neue"');
      
      // To ensure 1:1 capture without CSS transforms affecting quality,
      // we temporarily remove the scale or target the inner content.
      const canvas = await html2canvas(canvasRef.current, {
        scale: 4, // 4 is stable and high enough for 4K
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null,
        onclone: (clonedDoc) => {
          const clonedCanvas = clonedDoc.getElementById("promo-canvas-capture");
          if (clonedCanvas) {
            clonedCanvas.style.transform = "none";
          }
        }
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `promo-${artist}-${mode}.png`;
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
        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Promo Generator</h1>
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
               <label className="text-[10px] uppercase font-bold text-white/40">Contraste (Stroke/Glow)</label>
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
              <span className="text-xs uppercase font-bold group-hover:text-[#c5a059] transition-colors">Borde (Stroke)</span>
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
            onClick={handleDownload}
            className="mt-4 w-full py-4 bg-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-lg hover:bg-white transition-colors"
          >
            Descargar en 4K HD
          </button>
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
            position: 'relative'
          }}
        >
          <div 
            ref={canvasRef}
            id="promo-canvas-capture"
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
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:italic&family=Inter:wght@400;700;900&display=swap');
            * { -webkit-font-smoothing: antialiased; }
            .grain {
              position: absolute;
              inset: 0;
              background-image: url("https://www.transparenttextures.com/patterns/carbon-fibre.png");
              opacity: 0.05;
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
                    {artist.toUpperCase()} RECORDS
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
                    {/* OPTIONAL: SCANLINE OVER COVER */}
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
                    fontWeight: 400,
                    lineHeight: 0.8,
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: textColor,
                    letterSpacing: '-2px',
                    WebkitTextStroke: stroke ? `2px ${contrastColor}` : 'none',
                    textShadow: stroke || glow ? `0px 20px 50px ${contrastColor}99` : "none",
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
                <div style={{ 
                    marginTop: 10,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 15,
                    fontSize: config.title * 0.3, 
                    color: '#c5a059',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 900,
                    letterSpacing: '0.3em'
                }}>
                   <div style={{ height: 2, flex: 1, background: 'linear-gradient(to right, transparent, #c5a059)', width: 60 }}></div>
                   <span>PLATAFORMAS DIGITALES</span>
                   <div style={{ height: 2, flex: 1, background: 'linear-gradient(to left, transparent, #c5a059)', width: 60 }}></div>
                </div>
              )}

              {mode === "album" && (
                <div style={{ marginTop: 30, color: textColor, fontSize: config.title * 0.25, textAlign: 'left', width: '90%', margin: '20px auto' }}>
                  {trackList.map((t,i)=>(
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', borderTop: '1px solid rgba(197, 160, 89, 0.2)', pt: 15 }}>
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
                  <div style={{ fontSize: config.title * 0.12, opacity: 0.3, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}>BPM: 128 // ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
               </div>
            </div>

          </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default PromoImageApp;
