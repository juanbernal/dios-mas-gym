import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

const sizes = {
  instagram: { w: 500, h: 650, title: 32 },
  story: { w: 500, h: 900, title: 42 },
  post: { w: 900, h: 600, title: 36 },
};

const PromoImageApp: React.FC = () => {
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
      const canvas = await html2canvas(canvasRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: null,
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

  const website = artist === "Diosmasgym"
    ? "🔥 BUSCA AQUÍ: musica.diosmasgym.com"
    : "🔥 BUSCA AQUÍ: juan614.diosmasgym.com";

  const trackList = tracks.split("\n");
  const config = sizes[size];

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
    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-[#020617] min-h-screen text-white">
      {/* PANEL */}
      <div className="p-6 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl h-fit sticky top-24">
        <h2 className="text-xl font-bold mb-6 text-[#c5a059]">Configuración de Imagen</h2>
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
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-xs font-black uppercase tracking-[0.5em] text-white/20">Vista Previa (Master)</h2>
        <div 
          ref={canvasRef} 
          style={{ width: config.w, height: config.h, borderRadius: 30, position: "relative", overflow: "hidden", display: 'block' }}
        >
          {bg && (
            <img src={bg} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
          )}

          <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${overlay})` }} />

          <div style={{ position: "relative", padding: 24, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>

            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: config.title * 0.28, color: textColor }}>
              <div style={{ fontWeight: "bold", letterSpacing: 1 }}>{artist.toUpperCase()}</div>
              <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.1)" }}>
                {mode === "proximamente" ? "PRÓXIMO ESTRENO" : mode === "disponible" ? "YA DISPONIBLE" : "NUEVO ÁLBUM"}
              </div>
            </div>

            {/* CENTER */}
            <div style={{ textAlign: "center" }}>

              {bg && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <img
                    src={bg}
                    style={{
                      width: config.title * 5,
                      height: config.title * 5,
                      borderRadius: 20,
                      boxShadow: "0 20px 60px rgba(0,0,0,0.8)"
                    }}
                  />
                </div>
              )}

              <h1 style={{
                fontSize: config.title,
                fontWeight: 900,
                lineHeight: 1.1,
                fontFamily: 'Montserrat, sans-serif',
                color: textColor,
                marginBottom: 10,
                textShadow: glow ? `0 0 25px ${contrastColor}` : "none",
                WebkitTextStroke: stroke ? `1px ${contrastColor}` : "0px"
              }}>{title}</h1>

              {mode === "proximamente" && (
                <div style={{ fontSize: config.title * 0.45, color: textColor, opacity: 0.9, fontWeight: 'bold' }}>
                  {formatDate()}
                </div>
              )}

              {mode === "disponible" && (
                <div style={{ fontSize: config.title * 0.5, color: "#22c55e", fontWeight: "black" }}>
                  YA DISPONIBLE
                </div>
              )}

              {mode === "album" && (
                <div style={{ marginTop: 15, color: textColor, fontSize: config.title * 0.35, textAlign: 'left', maxWidth: '80%', margin: '0 auto' }}>
                  {trackList.map((t,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '4px 0' }}>
                      <span style={{ opacity: 0.5 }}>{String(i+1).padStart(2,"0")}</span>
                      <span style={{ fontWeight: 'bold' }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* FOOTER CTA */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                display: "inline-block",
                padding: "8px 16px",
                borderRadius: 20,
                fontWeight: "bold",
                fontSize: config.title * 0.35,
                color: textColor,
                background: "rgba(255,255,255,0.1)",
                backdropFilter: 'blur(10px)',
                boxShadow: glow ? `0 0 20px ${contrastColor}` : "none"
              }}>
                {website}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default PromoImageApp;
