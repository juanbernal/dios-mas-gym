import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

const BIBLE_VERSES = [
  { ref: "JOSUÉ 1:9", text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo." },
  { ref: "ISAÍAS 41:10", text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo." },
  { ref: "FILIPENSES 4:13", text: "Todo lo puedo en Cristo que me fortalece." },
  { ref: "SALMOS 27:1", text: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida." },
  { ref: "2 TIMOTEO 1:7", text: "Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio." },
  { ref: "ROMANOS 8:31", text: "Si Dios es por nosotros, ¿quién contra nosotros?" },
  { ref: "PROVERBIOS 3:5", text: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia." },
  { ref: "SALMOS 46:1", text: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio." }
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("no src"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback crossOrigin bypass via Image Object
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);

  // Custom Controls
  const [title, setTitle] = useState("TITULO DE TU CANCIÓN");
  const [artist, setArtist] = useState("Diosmasgym");
  const [releaseStatus, setReleaseStatus] = useState<"disponible" | "proximamente" | "preventa">("disponible");
  const [verseText, setVerseText] = useState("Todo lo puedo en Cristo que me fortalece. — FILIPENSES 4:13");
  const [songLyric, setSongLyric] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200");

  // Aesthetics & Themes
  const [bannerStyle, setBannerStyle] = useState<"gold-edition" | "vinyl-master" | "cyber-neon" | "scrapbook-polaroid" | "vogue-dark">("gold-edition");
  const [overlayDarkness, setOverlayDarkness] = useState<number>(0.65);
  const [showVerse, setShowVerse] = useState<boolean>(true);
  const [showLyric, setShowLyric] = useState<boolean>(true);
  const [showFrame, setShowFrame] = useState<boolean>(true);
  const [showEqualizer, setShowEqualizer] = useState<boolean>(true);

  // Search & Status
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Load Catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog("diosmasgym"),
          fetchMusicCatalog("juan614")
        ]);
        const full = [...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCatalog(full);
        if (full.length > 0) handleSelectSong(full[0]);
      } catch (err) {
        console.error("Error al cargar catálogo:", err);
      }
    };
    loadCatalog();
  }, []);

  const handleSelectSong = (song: MusicItem) => {
    setSelectedSong(song);
    setTitle(song.name.toUpperCase());
    setArtist(song.artist || "Diosmasgym");
    if (song.cover) setCoverUrl(song.cover);
    setIsSearchOpen(false);

    // Auto lyric search
    fetch("/api/search-lyrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": localStorage.getItem("admin_password") || ""
      },
      body: JSON.stringify({ name: song.name, artist: song.artist || "Diosmasgym" })
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.lyrics && data.lyrics !== "LETRA_NO_ENCONTRADA") {
          const lines = data.lyrics.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0 && !l.startsWith("["));
          if (lines.length > 0) {
            setSongLyric(`"${lines.slice(0, 2).join(" / ")}"`);
            setShowLyric(true);
          }
        }
      })
      .catch(() => {});
  };

  const handleRandomVerse = () => {
    const random = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
    setVerseText(`"${random.text}" — ${random.ref}`);
    setShowVerse(true);
    showToast(`📖 Versículo: ${random.ref}`);
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

  // 🎨 CANVAS GRAPHICS RENDER ENGINE (2160 x 2700 HD 4K PERFECT PIXEL RENDER)
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 2160;
    const H = 2700;
    canvas.width = W;
    canvas.height = H;

    // 1. Dark Base Background
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, W, H);

    // 2. Draw Blurred Cover Background
    if (coverUrl) {
      try {
        const coverImg = await loadImage(coverUrl);
        // Draw centered cover covering canvas
        ctx.save();
        ctx.filter = `blur(45px) brightness(${1 - overlayDarkness})`;
        ctx.drawImage(coverImg, -200, -200, W + 400, H + 400);
        ctx.restore();
      } catch (err) {
        console.warn("Cover background fallback", err);
      }
    }

    // 3. Ambient Lighting & Theme Vignettes
    const gradient = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1400);
    if (bannerStyle === "gold-edition") {
      gradient.addColorStop(0, "rgba(197, 160, 89, 0.25)");
      gradient.addColorStop(1, "rgba(5, 7, 10, 0.95)");
    } else if (bannerStyle === "cyber-neon") {
      gradient.addColorStop(0, "rgba(0, 242, 255, 0.25)");
      gradient.addColorStop(1, "rgba(3, 13, 20, 0.98)");
    } else {
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.1)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // 4. Gold Outer Border Frame
    if (showFrame) {
      ctx.lineWidth = 24;
      ctx.strokeStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
      drawRoundedRect(ctx, 40, 40, W - 80, H - 80, 48);
      ctx.stroke();
    }

    // 5. Header Status Badge
    const badgeText = releaseStatus === "disponible" ? "🔥 YA DISPONIBLE" : releaseStatus === "proximamente" ? "⚡ PRÓXIMAMENTE" : "💎 PRE-SAVE";
    ctx.font = "900 36px 'Inter', sans-serif";
    ctx.fillStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    drawRoundedRect(ctx, 90, 90, 420, 80, 40);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
    ctx.fillText(badgeText, 130, 112);

    // Header Right Seal
    ctx.font = "900 34px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#c5a059";
    ctx.fillText("MANDO EJECUTIVO  ·  DIOSMASGYM", W - 90, 112);

    // 6. MAIN CENTER ARTWORK (COVER / VINYL / POLAROID)
    const coverBoxSize = 900;
    const coverX = (W - coverBoxSize) / 2;
    const coverY = 320;

    if (bannerStyle === "vinyl-master") {
      // 3D Vinyl Disc Behind
      ctx.save();
      ctx.beginPath();
      ctx.arc(coverX + coverBoxSize + 160, coverY + coverBoxSize / 2, coverBoxSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#111115";
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.strokeStyle = "#222228";
      ctx.stroke();
      // Center Label
      ctx.beginPath();
      ctx.arc(coverX + coverBoxSize + 160, coverY + coverBoxSize / 2, 140, 0, Math.PI * 2);
      ctx.fillStyle = "#c5a059";
      ctx.fill();
      ctx.restore();

      // Front Cover
      if (coverUrl) {
        try {
          const coverImg = await loadImage(coverUrl);
          drawRoundedRect(ctx, coverX - 100, coverY, coverBoxSize, coverBoxSize, 40);
          ctx.save();
          ctx.clip();
          ctx.drawImage(coverImg, coverX - 100, coverY, coverBoxSize, coverBoxSize);
          ctx.restore();
          ctx.lineWidth = 8;
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.stroke();
        } catch {}
      }
    } else if (bannerStyle === "scrapbook-polaroid") {
      // Polaroid White Frame
      ctx.save();
      ctx.translate(W / 2, coverY + 450);
      ctx.rotate(-0.04);
      drawRoundedRect(ctx, -460, -480, 920, 1060, 24);
      ctx.fillStyle = "#fcfbfa";
      ctx.fill();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 40;

      if (coverUrl) {
        try {
          const coverImg = await loadImage(coverUrl);
          ctx.drawImage(coverImg, -410, -430, 820, 820);
        } catch {}
      }
      ctx.font = "italic bold 44px Georgia, serif";
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.fillText(`"${title}" — ${artist}`, 0, 480);
      ctx.restore();
    } else {
      // Standard & Cyber & Gold Cover Box
      if (coverUrl) {
        try {
          const coverImg = await loadImage(coverUrl);
          drawRoundedRect(ctx, coverX, coverY, coverBoxSize, coverBoxSize, 48);
          ctx.save();
          ctx.clip();
          ctx.drawImage(coverImg, coverX, coverY, coverBoxSize, coverBoxSize);
          ctx.restore();

          ctx.shadowColor = bannerStyle === "cyber-neon" ? "rgba(0,242,255,0.6)" : "rgba(197,160,89,0.5)";
          ctx.shadowBlur = 50;
          ctx.lineWidth = 8;
          ctx.strokeStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
          ctx.stroke();
          ctx.shadowBlur = 0;
        } catch {}
      }
    }

    // 7. Equalizer Audio Waves
    if (showEqualizer) {
      const eqY = coverY + coverBoxSize + 60;
      const barHeights = [40, 80, 120, 60, 100, 140, 70, 110, 50, 90, 130, 60];
      const startX = W / 2 - (barHeights.length * 28) / 2;

      ctx.fillStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
      barHeights.forEach((h, idx) => {
        drawRoundedRect(ctx, startX + idx * 28, eqY - h / 2, 14, h, 6);
        ctx.fill();
      });
    }

    // 8. TITLE & ARTIST TEXT
    const titleY = coverY + coverBoxSize + 180;
    ctx.font = "italic 900 96px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 24;

    const titleLines = wrapText(ctx, (title || "TITULO DE TU CANCIÓN").toUpperCase(), W - 200);
    titleLines.slice(0, 2).forEach((l, i) => {
      ctx.fillText(l, W / 2, titleY + i * 110);
    });
    ctx.shadowBlur = 0;

    // Artist Subtitle
    const artistY = titleY + titleLines.length * 110 + 20;
    ctx.font = "900 48px 'Inter', sans-serif";
    ctx.fillStyle = bannerStyle === "cyber-neon" ? "#00f2ff" : "#c5a059";
    ctx.fillText(artist.toUpperCase(), W / 2, artistY);

    // 9. BIBLE VERSE & LYRIC BOXES
    let boxY = artistY + 90;

    // Lyric Box
    if (showLyric && songLyric) {
      const lyricLines = wrapText(ctx, songLyric, W - 400);
      const boxH = lyricLines.length * 48 + 60;
      drawRoundedRect(ctx, 150, boxY, W - 300, boxH, 24);
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fill();
      ctx.strokeStyle = "rgba(197, 160, 89, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = "italic 600 36px Georgia, serif";
      ctx.fillStyle = "#fef3c7";
      ctx.textAlign = "center";
      lyricLines.forEach((line, idx) => {
        ctx.fillText(line, W / 2, boxY + 30 + idx * 48);
      });

      boxY += boxH + 30;
    }

    // Bible Verse Box
    if (showVerse && verseText) {
      const verseLines = wrapText(ctx, verseText, W - 400);
      const boxH = verseLines.length * 44 + 50;
      drawRoundedRect(ctx, 150, boxY, W - 300, boxH, 24);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "italic 500 32px 'Inter', sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      verseLines.forEach((line, idx) => {
        ctx.fillText(line, W / 2, boxY + 25 + idx * 44);
      });
    }

    // 10. FOOTER STREAMING PLATFORMS
    const footerY = H - 160;
    ctx.font = "900 30px 'Inter', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText("DISPONIBLE EN SPOTIFY  ·  APPLE MUSIC  ·  YOUTUBE", W / 2, footerY);

    ctx.font = "700 24px monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText("PRODUCIDO EN CHIHUAHUA, MX  ·  DIOSMASGYM RECORDS", W / 2, footerY + 50);

  }, [coverUrl, bannerStyle, overlayDarkness, showFrame, releaseStatus, title, artist, showEqualizer, showLyric, songLyric, showVerse, verseText]);

  // Redraw canvas whenever states change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // DIRECT CANVAS DOWNLOAD (100% CRYSTAL CLEAR PNG, 0% BLUR, NATIVE HIGH RES)
  const handleDirectDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    showToast("⚡ Generando archivo PNG en Máxima Resolución Nítida...");

    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("❌ Error generando imagen");
          setIsDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `BANNER_MASTER_${title.replace(/\s+/g, "_")}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast("🎉 ¡Banner en Alta Definición HD 4K descargado con éxito!");
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
              Estudio Profesional de <span className="text-[#c5a059]">Banners HD</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Motor directo de renderizado Canvas HD 4K: Vinilos 3D, Polaroid Scrapbook, Neón Cyber y Versículos Bíblicos.
            </p>
          </div>

          <button
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="px-8 py-5 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-[0_0_40px_rgba(197,160,89,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i> Exportando PNG Nítido...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download text-base"></i> Descargar Banner HD 4K (Máxima Calidad)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT PANEL: CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Song & Image Picker */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-4 flex items-center gap-2">
              <i className="fa-solid fa-compact-disc text-base"></i> 1. Canción o Fotografía
            </h3>

            <div className="relative mb-3">
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
                      <img src={getCorsFriendlyUrl(song.cover)} className="w-10 h-10 rounded-md object-cover" />
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-white truncate">{song.name}</div>
                        <div className="text-[10px] text-[#c5a059] truncate">{song.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="w-full py-3.5 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all">
              <i className="fa-solid fa-cloud-arrow-up text-[#c5a059]"></i> Subir Imagen de Galería / Portada
              <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
            </label>
          </div>

          {/* 2. ESTILOS VISUALES DIVERSOS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-palette text-base"></i> 2. Estilos Visuales & Plantillas
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "gold-edition", name: "🏆 Gold Imperial", desc: "Dorado clásico luxury" },
                { id: "vinyl-master", name: "📀 Vinilo 3D", desc: "Acetato giratorio realista" },
                { id: "scrapbook-polaroid", name: "📸 Polaroid Vintage", desc: "Foto artesanal" },
                { id: "cyber-neon", name: "⚡ Cyber Neón", desc: "Futurista cian briloso" },
                { id: "vogue-dark", name: "🖤 Editorial Dark", desc: "Estilo revista nocturna" }
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setBannerStyle(tmpl.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    bannerStyle === tmpl.id
                      ? "bg-[#c5a059] text-black border-[#c5a059] font-bold shadow-lg"
                      : "bg-[#05070a] text-gray-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-xs font-bold">{tmpl.name}</div>
                  <div className={`text-[9px] ${bannerStyle === tmpl.id ? "text-black/70" : "text-gray-500"}`}>
                    {tmpl.desc}
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2.5 rounded-lg border border-white/5">
                <input type="checkbox" checked={showFrame} onChange={(e) => setShowFrame(e.target.checked)} className="accent-[#c5a059]" />
                Marco Dorado
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2.5 rounded-lg border border-white/5">
                <input type="checkbox" checked={showEqualizer} onChange={(e) => setShowEqualizer(e.target.checked)} className="accent-[#c5a059]" />
                Ondas de Audio
              </label>
            </div>
          </div>

          {/* 3. BIBLE VERSES & LYRIC TOOLS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-book-bible text-base"></i> 3. Versículos & Letra Oficial
            </h3>

            {/* Versículo */}
            <div className="p-3.5 bg-[#05070a] border border-white/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-cross text-[#c5a059]"></i> Versículo de la Biblia
                </span>
                <button
                  onClick={handleRandomVerse}
                  className="px-3 py-1 bg-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black border border-[#c5a059]/30 rounded-lg text-[9px] font-bold uppercase transition-all"
                >
                  🎲 Cambiar Versículo
                </button>
              </div>
              <textarea
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                rows={2}
                className="w-full bg-[#090c14] border border-white/10 focus:border-[#c5a059] rounded-lg p-2.5 text-[11px] text-gray-300 outline-none resize-none"
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={showVerse} onChange={(e) => setShowVerse(e.target.checked)} className="accent-[#c5a059]" />
                Mostrar Versículo
              </label>
            </div>

            {/* Letra */}
            <div className="p-3.5 bg-[#05070a] border border-white/10 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-quote-left text-[#c5a059]"></i> Frase / Letra Destacada
              </span>
              <textarea
                value={songLyric}
                onChange={(e) => setSongLyric(e.target.value)}
                rows={2}
                className="w-full bg-[#090c14] border border-white/10 focus:border-[#c5a059] rounded-lg p-2.5 text-[11px] text-gray-300 outline-none resize-none"
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer">
                <input type="checkbox" checked={showLyric} onChange={(e) => setShowLyric(e.target.checked)} className="accent-[#c5a059]" />
                Mostrar Letra
              </label>
            </div>
          </div>

          {/* 4. TEXTS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-2 flex items-center gap-2">
              <i className="fa-solid fa-[#c5a059] fa-pen-to-square text-base"></i> 4. Textos Principales
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Título de la Canción</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.toUpperCase())}
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Artista</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
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
                  <option value="preventa">💎 PRE-SAVE ACTIVO</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE NATIVE CANVAS PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-400">
              VISTA PREVIA REAL CANVA HD
            </span>
            <span className="text-[10px] font-black uppercase text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              2160 x 2700 PX ULTRA HD
            </span>
          </div>

          {/* Native Canvas Render Frame */}
          <div className="w-full bg-[#05070a] border border-white/10 p-4 md:p-6 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full max-w-[440px] aspect-[4/5] rounded-2xl shadow-2xl object-contain bg-black"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomPromoCreator;
