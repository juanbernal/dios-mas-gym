import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

const BIBLE_VERSES = [
  { ref: "JOSUÉ 1:9", text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo." },
  { ref: "ISAÍAS 41:10", text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo." },
  { ref: "FILIPENSES 4:13", text: "Todo lo puedo en Cristo que me fortalece." },
  { ref: "SALMOS 27:1", text: "Jehová es mi luz y mi salvación; ¿de quién temeré?" }
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("no src"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const copy = new Image();
      copy.onload = () => resolve(copy);
      copy.onerror = reject;
      copy.src = src;
    };
    img.src = src;
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Data States
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [title, setTitle] = useState("TITULO DE TU CANCIÓN");
  const [artist, setArtist] = useState("DIOSMASGYM");
  const [releaseStatus, setReleaseStatus] = useState<"disponible" | "proximamente">("disponible");
  const [verseText, setVerseText] = useState("Todo lo puedo en Cristo que me fortalece. — FILIPENSES 4:13");
  const [songLyric, setSongLyric] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200");

  // Style Themes
  const [styleMode, setStyleMode] = useState<"modern-dark" | "luxury-gold" | "clean-minimal" | "cyber-neon">("modern-dark");

  // Toggles
  const [showVerse, setShowVerse] = useState(true);
  const [showLyric, setShowLyric] = useState(true);
  const [showPlatforms, setShowPlatforms] = useState(true);

  // Status
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    fetchMusicCatalog("diosmasgym").then((dM) => {
      fetchMusicCatalog("juan614").then((j6) => {
        const full = [...dM, ...j6];
        setCatalog(full);
        if (full.length > 0) handleSelectSong(full[0]);
      });
    });
  }, []);

  const handleSelectSong = (song: MusicItem) => {
    setTitle(song.name.toUpperCase());
    setArtist((song.artist || "DIOSMASGYM").toUpperCase());
    if (song.cover) setCoverUrl(song.cover);
    setIsSearchOpen(false);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setCoverUrl(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🎨 CANVAS GRAPHICS RENDER ENGINE (1920 x 1920 HD ULTRA CRISP RENDER)
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1920;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    // Background Base Color
    ctx.fillStyle = styleMode === "clean-minimal" ? "#0a0c10" : "#05070a";
    ctx.fillRect(0, 0, W, H);

    // Dynamic Cover Ambient Blur
    if (coverUrl) {
      try {
        const coverImg = await loadImage(coverUrl);
        ctx.save();
        ctx.filter = "blur(70px) brightness(0.35)";
        ctx.drawImage(coverImg, -200, -200, W + 400, H + 400);
        ctx.restore();
      } catch {}
    }

    // Gradient Overlay
    const grad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200);
    if (styleMode === "luxury-gold") {
      grad.addColorStop(0, "rgba(197, 160, 89, 0.2)");
      grad.addColorStop(1, "rgba(5, 7, 10, 0.95)");
    } else if (styleMode === "cyber-neon") {
      grad.addColorStop(0, "rgba(0, 242, 255, 0.2)");
      grad.addColorStop(1, "rgba(3, 10, 20, 0.96)");
    } else {
      grad.addColorStop(0, "rgba(0, 0, 0, 0.2)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.92)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Frame Border
    ctx.lineWidth = 12;
    ctx.strokeStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "rgba(255, 255, 255, 0.15)";
    drawRoundedRect(ctx, 40, 40, W - 80, H - 80, 36);
    ctx.stroke();

    // 1. TOP BRAND HEADER
    ctx.font = "900 32px 'Inter', sans-serif";
    ctx.fillStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("DIOSMASGYM RECORDS", 100, 110);

    // Top Right Badge
    const statusText = releaseStatus === "disponible" ? "🔥 YA DISPONIBLE" : "⚡ PRÓXIMAMENTE";
    drawRoundedRect(ctx, W - 420, 75, 320, 65, 30);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "800 24px 'Inter', sans-serif";
    ctx.fillStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(statusText, W - 260, 115);

    // 2. MAIN CENTER COVER ARTWORK (HD BIG SQUARE)
    const coverW = 860;
    const coverH = 860;
    const coverX = (W - coverW) / 2;
    const coverY = 220;

    // Glowing Cover Box
    ctx.shadowColor = styleMode === "luxury-gold" ? "rgba(197, 160, 89, 0.5)" : styleMode === "cyber-neon" ? "rgba(0, 242, 255, 0.5)" : "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 40;
    drawRoundedRect(ctx, coverX, coverY, coverW, coverH, 32);
    ctx.lineWidth = 6;
    ctx.strokeStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "rgba(255,255,255,0.3)";
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (coverUrl) {
      try {
        const coverImg = await loadImage(coverUrl);
        drawRoundedRect(ctx, coverX + 4, coverY + 4, coverW - 8, coverH - 8, 28);
        ctx.save();
        ctx.clip();
        ctx.drawImage(coverImg, coverX + 4, coverY + 4, coverW - 8, coverH - 8);
        ctx.restore();
      } catch {}
    }

    // 3. SONG TITLE & ARTIST
    let textY = coverY + coverH + 110;
    ctx.font = "900 88px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 20;
    ctx.fillText((title || "NOMBRE DE LA CANCIÓN").toUpperCase(), W / 2, textY);
    ctx.shadowBlur = 0;

    textY += 60;
    ctx.font = "800 36px 'Inter', sans-serif";
    ctx.fillStyle = styleMode === "luxury-gold" ? "#c5a059" : styleMode === "cyber-neon" ? "#00f2ff" : "#94a3b8";
    ctx.fillText((artist || "DIOSMASGYM").toUpperCase(), W / 2, textY);

    // 4. LYRIC OR BIBLE VERSE
    textY += 70;
    if (showLyric && songLyric) {
      drawRoundedRect(ctx, 200, textY, W - 400, 110, 20);
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fill();
      ctx.strokeStyle = styleMode === "luxury-gold" ? "rgba(197, 160, 89, 0.3)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "italic 500 32px Georgia, serif";
      ctx.fillStyle = "#fef3c7";
      ctx.fillText(songLyric, W / 2, textY + 65);
      textY += 130;
    } else if (showVerse && verseText) {
      drawRoundedRect(ctx, 200, textY, W - 400, 110, 20);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "italic 500 30px 'Inter', sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(verseText, W / 2, textY + 65);
      textY += 130;
    }

    // 5. FOOTER STREAMING PLATFORMS
    if (showPlatforms) {
      const footerY = H - 140;
      ctx.font = "800 26px 'Inter', sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("DISPONIBLE EN SPOTIFY · APPLE MUSIC · YOUTUBE · AMAZON", W / 2, footerY);

      ctx.font = "600 20px monospace";
      ctx.fillStyle = "#64748b";
      ctx.fillText("PRODUCIDO EN CHIHUAHUA, MX", W / 2, footerY + 45);
    }

  }, [coverUrl, styleMode, releaseStatus, title, artist, showLyric, songLyric, showVerse, verseText, showPlatforms]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDirectDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    showToast("⚡ Exportando Imagen Ultra HD 100% Nítida...");

    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("❌ Error al exportar");
          setIsDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `PROMO_NIDA_${title.replace(/\s+/g, "_")}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast("🎉 ¡Banner HD descargado con éxito!");
        setIsDownloading(false);
      }, "image/png", 1.0);
    }, 300);
  };

  const filteredCatalog = catalog.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#030508] text-white pt-20 pb-32 px-4 md:px-8 font-['Poppins']">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[300] bg-[#c5a059] text-black font-bold px-6 py-3.5 rounded-2xl shadow-[0_0_40px_rgba(197,160,89,0.5)] animate-bounce flex items-center gap-3 border border-amber-300">
          <span className="text-xl">✨</span> {toast}
        </div>
      )}

      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => navigate("/admin")}
          className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-3 hover:text-white transition-all group"
        >
          <div className="w-8 h-px bg-[#c5a059] group-hover:w-14 transition-all"></div>
          Volver al Panel Principal
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-serif italic text-4xl md:text-6xl text-white">
              Diseñador de <span className="text-[#c5a059]">Banners Limpios HD</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Estilo moderno, elegante y limpio de disquera profesional. Sin recargados innecesarios.
            </p>
          </div>

          <button
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="px-8 py-5 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-[0_0_40px_rgba(197,160,89,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i> Exportando HD...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download text-base"></i> Descargar Banner HD Nítido
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT PANEL: CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Seleccionar Canción / Portada */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-compact-disc text-base"></i> 1. Canción o Imagen de Portada
            </h3>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                placeholder="Buscar canción en el catálogo..."
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3.5 text-xs text-white outline-none"
              />
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0c0e17] border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                  {filteredCatalog.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelectSong(song)}
                      className="w-full p-3 hover:bg-white/10 flex items-center gap-3 border-b border-white/5 text-left transition-colors"
                    >
                      <img src={song.cover} className="w-10 h-10 rounded-md object-cover" />
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-white truncate">{song.name}</div>
                        <div className="text-[10px] text-[#c5a059] truncate">{song.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="w-full py-3 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-[11px] font-bold text-gray-300 flex items-center justify-center gap-2 cursor-pointer transition-all">
              <i className="fa-solid fa-cloud-arrow-up text-[#c5a059]"></i> Subir Foto de Galería
              <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
            </label>
          </div>

          {/* 2. ESTILOS LIMPIOS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-palette text-base"></i> 2. Estilo de Color y Fondo
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "modern-dark", name: "🖤 Modern Dark", desc: "Oscuro elegante" },
                { id: "luxury-gold", name: "🏆 Gold Luxury", desc: "Dorado exclusivo" },
                { id: "cyber-neon", name: "⚡ Cyber Cyan", desc: "Brillo cian futurista" },
                { id: "clean-minimal", name: "✨ Clean Minimal", desc: "Sencillo y directo" }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setStyleMode(style.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    styleMode === style.id
                      ? "bg-[#c5a059] text-black border-[#c5a059] font-bold shadow-lg"
                      : "bg-[#05070a] text-gray-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-xs font-bold">{style.name}</div>
                  <div className={`text-[9px] ${styleMode === style.id ? "text-black/70" : "text-gray-500"}`}>
                    {style.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. TEXTOS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-base"></i> 3. Textos Principales
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Nombre de la Canción</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Artista</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value.toUpperCase())}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Estado</label>
                <select
                  value={releaseStatus}
                  onChange={(e) => setReleaseStatus(e.target.value as any)}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="disponible">🔥 YA DISPONIBLE</option>
                  <option value="proximamente">⚡ PRÓXIMAMENTE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Frase / Letra / Versículo</label>
              <input
                type="text"
                value={songLyric}
                onChange={(e) => setSongLyric(e.target.value)}
                placeholder="Escribe una frase o versículo..."
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE CANVAS PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-400">
              VISTA PREVIA EN VIVO
            </span>
            <span className="text-[10px] font-black uppercase text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              1920 x 1920 PX HD
            </span>
          </div>

          {/* Canvas Render Frame */}
          <div className="w-full bg-[#05070a] border border-white/10 p-4 md:p-6 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full max-w-[480px] aspect-square rounded-2xl shadow-2xl object-contain bg-black"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomPromoCreator;
