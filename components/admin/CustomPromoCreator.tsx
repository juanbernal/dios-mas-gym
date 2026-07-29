import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-[#c5a059]";
import { useNavigate as useNav } from "react-router-dom";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

const BIBLE_VERSES = [
  { ref: "JOSUÉ 1:9", text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo." },
  { ref: "ISAÍAS 41:10", text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo." },
  { ref: "FILIPENSES 4:13", text: "Todo lo puedo en Cristo que me fortalece." },
  { ref: "SALMOS 27:1", text: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida." },
  { ref: "2 TIMOTEO 1:7", text: "Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio." }
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
  const navigate = useNav();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);

  // Editable Fields
  const [title, setTitle] = useState("NOMBRE DE LA CANCIÓN");
  const [artist, setArtist] = useState("DIOSMASGYM");
  const [slogan, setSlogan] = useState("MÚSICA CON PROPÓSITO");
  const [releaseStatus, setReleaseStatus] = useState<"disponible" | "proximamente">("disponible");
  const [smartLinkCode, setSmartLinkCode] = useState("diosmasgym.com/link");
  const [genre, setGenre] = useState("TRAP / URBANO CRISTIANO");
  const [releaseDateStr, setReleaseDateStr] = useState("29 / 07 / 2026");
  const [producer, setProducer] = useState("DIOSMASGYM RECORDS");
  const [coverUrl, setCoverUrl] = useState<string>("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200");
  const [characterUrl, setCharacterUrl] = useState<string>("");

  // Toggles for Custom elements
  const [showPillars, setShowPillars] = useState(true);
  const [showCharacter, setShowCharacter] = useState(true);
  const [showQrBox, setShowQrBox] = useState(true);

  // Search & Export
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
    setSelectedSong(song);
    setTitle(song.name.toUpperCase());
    setArtist((song.artist || "DIOSMASGYM").toUpperCase());
    if (song.cover) setCoverUrl(song.cover);
    setIsSearchOpen(false);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isCharacter = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          if (isCharacter) setCharacterUrl(ev.target.result as string);
          else setCoverUrl(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 🎨 EXACT HIGH IMPACT FLYER CANVAS RENDERER (2160 x 2160 ULTRA HD SQUARE)
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 2160;
    const H = 2160;
    canvas.width = W;
    canvas.height = H;

    // 1. Black Background
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, W, H);

    // 2. Dynamic Blurred Cover Aura Background
    if (coverUrl) {
      try {
        const coverImg = await loadImage(coverUrl);
        ctx.save();
        ctx.filter = "blur(60px) brightness(0.4)";
        ctx.drawImage(coverImg, -200, -200, W + 400, H + 400);
        ctx.restore();
      } catch {}
    }

    // Radial Lighting Overlay
    const grad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1300);
    grad.addColorStop(0, "rgba(197, 160, 89, 0.15)");
    grad.addColorStop(0.7, "rgba(5, 7, 12, 0.85)");
    grad.addColorStop(1, "rgba(3, 5, 8, 0.98)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Golden Outer Border Frame
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#c5a059";
    drawRoundedRect(ctx, 40, 40, W - 80, H - 80, 40);
    ctx.stroke();

    // ── 3. HEADER SECTION ───────────────────────────────────────────────────
    // Top Left Badge: NUEVA CANCIÓN
    drawRoundedRect(ctx, 90, 90, 320, 100, 24);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.strokeStyle = "#c5a059";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "900 24px 'Inter', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.textAlign = "left";
    ctx.fillText("🎵  NUEVA", 130, 132);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("CANCIÓN", 130, 162);

    // Top Center Brand Logo: DIOSMASGYM + CROWN
    // Draw Crown Symbol
    ctx.fillStyle = "#c5a059";
    ctx.beginPath();
    ctx.moveTo(W / 2 - 40, 110);
    ctx.lineTo(W / 2 - 70, 70);
    ctx.lineTo(W / 2 - 20, 85);
    ctx.lineTo(W / 2, 60);
    ctx.lineTo(W / 2 + 20, 85);
    ctx.lineTo(W / 2 + 70, 70);
    ctx.lineTo(W / 2 + 40, 110);
    ctx.closePath();
    ctx.fill();

    ctx.font = "900 90px 'Bebas Neue', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(197, 160, 89, 0.5)";
    ctx.shadowBlur = 30;
    ctx.fillText("DIOSMASGYM", W / 2, 205);
    ctx.shadowBlur = 0;

    ctx.font = "700 26px 'Inter', sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(slogan.toUpperCase(), W / 2, 245);

    // Top Right Handle: @DIOSMASGYM + Social Icons
    ctx.font = "900 26px 'Inter', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("@DIOSMASGYM", W - 110, 120);

    ctx.font = "24px 'FontAwesome', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.fillText("         ", W - 110, 160);

    // ── 4. LEFT SECTION: YA DISPONIBLE + PILLARS ────────────────────────────
    const leftX = 110;
    let currentY = 380;

    // Big Impact "YA DISPONIBLE"
    ctx.font = "900 160px 'Bebas Neue', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    ctx.fillText("YA", leftX, currentY);
    ctx.shadowBlur = 0;

    currentY += 150;
    ctx.font = "900 130px 'Bebas Neue', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.shadowColor = "rgba(197, 160, 89, 0.4)";
    ctx.shadowBlur = 30;
    ctx.fillText("DISPONIBLE", leftX, currentY);
    ctx.shadowBlur = 0;

    currentY += 50;
    ctx.font = "700 26px 'Inter', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("EN TODAS LAS PLATAFORMAS DIGITALES", leftX, currentY);

    // Horizontal Neon Line Under Status
    currentY += 25;
    const lineGrad = ctx.createLinearGradient(leftX, 0, leftX + 600, 0);
    lineGrad.addColorStop(0, "#c5a059");
    lineGrad.addColorStop(1, "transparent");
    ctx.fillStyle = lineGrad;
    ctx.fillRect(leftX, currentY, 600, 4);

    // 3 Pillars List: MÚSICA / LETRAS / FE
    if (showPillars) {
      currentY += 90;
      const pillars = [
        { icon: "🎵", title: "MÚSICA QUE TE INSPIRA" },
        { icon: "✝", title: "LETRAS QUE FORTALECEN" },
        { icon: "🏋", title: "FE QUE TRANSFORMA" }
      ];

      pillars.forEach((p) => {
        // Circle Icon Box
        ctx.beginPath();
        ctx.arc(leftX + 45, currentY + 30, 40, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "#c5a059";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "28px 'Inter', sans-serif";
        ctx.fillStyle = "#c5a059";
        ctx.textAlign = "center";
        ctx.fillText(p.icon, leftX + 45, currentY + 40);

        ctx.font = "800 24px 'Inter', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(p.title, leftX + 110, currentY + 40);

        currentY += 105;
      });
    }

    // ── 5. CENTER SECTION: COVER ARTWORK BOX ────────────────────────────────
    const coverBoxW = 850;
    const coverBoxH = 850;
    const coverBoxX = (W - coverBoxW) / 2;
    const coverBoxY = 340;

    // Glowing Outer Frame for Cover
    ctx.shadowColor = "rgba(197, 160, 89, 0.6)";
    ctx.shadowBlur = 60;
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#c5a059";
    drawRoundedRect(ctx, coverBoxX, coverBoxY, coverBoxW, coverBoxH, 24);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Main Cover Image Inside
    if (coverUrl) {
      try {
        const coverImg = await loadImage(coverUrl);
        drawRoundedRect(ctx, coverBoxX + 6, coverBoxY + 6, coverBoxW - 12, coverBoxH - 12, 20);
        ctx.save();
        ctx.clip();
        ctx.drawImage(coverImg, coverBoxX + 6, coverBoxY + 6, coverBoxW - 12, coverBoxH - 12);
        ctx.restore();
      } catch {}
    }

    // Horizontal Equalizer Waves Across Center
    const eqY = coverBoxY + coverBoxH / 2;
    ctx.fillStyle = "rgba(197, 160, 89, 0.7)";
    for (let i = 0; i < 40; i++) {
      const h = Math.sin(i * 0.4) * 50 + 20;
      ctx.fillRect(coverBoxX - 120 + i * 28, eqY - h / 2, 6, h);
    }

    // ── 6. RIGHT SECTION: CHARACTER / ARTIST CUTOUT (OPCIONAL) ─────────────
    if (showCharacter && characterUrl) {
      try {
        const charImg = await loadImage(characterUrl);
        ctx.save();
        ctx.shadowColor = "rgba(197, 160, 89, 0.5)";
        ctx.shadowBlur = 50;
        ctx.drawImage(charImg, W - 750, 250, 700, 1050);
        ctx.restore();
      } catch {}
    }

    // ── 7. SONG TITLE & ARTIST BELOW COVER ──────────────────────────────────
    const titleCenterY = coverBoxY + coverBoxH + 100;
    ctx.font = "italic 900 110px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 30;
    ctx.fillText(`"${title}"`, W / 2, titleCenterY);
    ctx.shadowBlur = 0;

    ctx.font = "900 40px 'Inter', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.fillText(`ARTISTA:  ${artist}`, W / 2, titleCenterY + 70);

    // Decorative Line Under Artist
    ctx.fillStyle = "#c5a059";
    ctx.fillRect(W / 2 - 200, titleCenterY + 95, 400, 4);

    // ── 8. SMART LINK QR BOX (RIGHT BOTTOM) ──────────────────────────────────
    if (showQrBox) {
      const qrW = 340;
      const qrH = 400;
      const qrX = W - 110 - qrW;
      const qrY = H - 560;

      drawRoundedRect(ctx, qrX, qrY, qrW, qrH, 24);
      ctx.fillStyle = "rgba(5, 10, 20, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(56, 189, 248, 0.5)";
      ctx.shadowBlur = 30;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = "900 22px 'Inter', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("ESCÚCHALA AQUÍ", qrX + qrW / 2, qrY + 35);

      // QR Code Simulation Image Frame
      drawRoundedRect(ctx, qrX + 35, qrY + 60, 270, 270, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Fake QR pattern draw
      ctx.fillStyle = "#000000";
      ctx.fillRect(qrX + 55, qrY + 80, 70, 70);
      ctx.fillRect(qrX + 215, qrY + 80, 70, 70);
      ctx.fillRect(qrX + 55, qrY + 240, 70, 70);
      ctx.fillRect(qrX + 140, qrY + 140, 60, 60);
      ctx.fillRect(qrX + 180, qrY + 220, 80, 50);

      ctx.font = "800 20px 'Inter', sans-serif";
      ctx.fillStyle = "#c5a059";
      ctx.fillText("TU SMART LINK", qrX + qrW / 2, qrY + 365);
    }

    // ── 9. BOTTOM STREAMING PLATFORMS FOOTER BAR ─────────────────────────────
    const footerY = H - 340;
    const footerW = W - 220;
    const footerX = 110;

    drawRoundedRect(ctx, footerX, footerY, footerW, 170, 32);
    ctx.fillStyle = "rgba(5, 7, 14, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(197, 160, 89, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "800 22px 'Inter', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.textAlign = "center";
    ctx.fillText("DISPONIBLE EN:", W / 2, footerY + 35);

    // Platform Badges Grid (Spotify, Apple Music, YouTube Music, Amazon Music, Deezer)
    const platforms = [
      { name: "SPOTIFY", color: "#1DB954" },
      { name: "APPLE MUSIC", color: "#fc3c44" },
      { name: "YOUTUBE MUSIC", color: "#FF0000" },
      { name: "AMAZON MUSIC", color: "#00a8e1" },
      { name: "DEEZER", color: "#ff0099" }
    ];

    const platSpacing = footerW / platforms.length;
    platforms.forEach((p, idx) => {
      const px = footerX + idx * platSpacing + platSpacing / 2;
      ctx.beginPath();
      ctx.arc(px, footerY + 90, 30, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      ctx.font = "800 18px 'Inter', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(p.name, px, footerY + 145);
    });

    // ── 10. METADATA FOOTER (FECHA / GÉNERO / PRODUCCIÓN) ────────────────────
    const metaY = H - 120;
    ctx.font = "800 22px 'Inter', sans-serif";
    ctx.fillStyle = "#c5a059";
    ctx.textAlign = "center";

    ctx.fillText(`📅 FECHA:  ${releaseDateStr}    |    🎵 GÉNERO:  ${genre}    |    🎙️ PRODUCCIÓN:  ${producer}`, W / 2, metaY);

  }, [coverUrl, characterUrl, releaseStatus, slogan, title, artist, showPillars, showCharacter, showQrBox, genre, releaseDateStr, producer]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // DIRECT PNG ULTRA HD DOWNLOAD (2160 x 2160 FULL NATIVE PNG BLOB STREAM)
  const handleDirectDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    showToast("⚡ Masterizando Flyer Oficial en Ultra HD 4K...");

    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("❌ Error generando imagen");
          setIsDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `FLYER_PROMO_${title.replace(/\s+/g, "_")}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        showToast("🎉 ¡Flyer Oficial Ultra HD 4K descargado con éxito!");
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
              Creador de <span className="text-[#c5a059]">Flyers Oficiales 4K</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Genera imágenes de promoción exactas al estilo oficial de Diosmasgym con QR de SmartLink, pilares, plataformas y descarga Ultra HD.
            </p>
          </div>

          <button
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="px-8 py-5 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-[0_0_40px_rgba(197,160,89,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i> Exportando Flyer 4K...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download text-base"></i> Descargar Flyer Ultra HD 4K
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT PANEL: EDITABLE FIELDS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Seleccionar Canción / Portada */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-compact-disc text-base"></i> 1. Canción & Portada Central
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

            <div className="grid grid-cols-2 gap-2 pt-2">
              <label className="py-3 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-[11px] font-bold text-gray-300 flex items-center justify-center gap-2 cursor-pointer transition-all">
                <i className="fa-solid fa-image text-[#c5a059]"></i> Cambiar Portada
                <input type="file" accept="image/*" onChange={(e) => handleCustomImageUpload(e, false)} className="hidden" />
              </label>

              <label className="py-3 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-[11px] font-bold text-gray-300 flex items-center justify-center gap-2 cursor-pointer transition-all">
                <i className="fa-solid fa-user text-[#c5a059]"></i> Foto Artista 3D
                <input type="file" accept="image/*" onChange={(e) => handleCustomImageUpload(e, true)} className="hidden" />
              </label>
            </div>
          </div>

          {/* 2. DATOS PRINCIPALES DE PROMOCIÓN */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-base"></i> 2. Datos del Lanzamiento
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
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Eslogan Superior</label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value.toUpperCase())}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Género Musical</label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value.toUpperCase())}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Fecha Lanzamiento</label>
                <input
                  type="text"
                  value={releaseDateStr}
                  onChange={(e) => setReleaseDateStr(e.target.value)}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Producción / Sello</label>
                <input
                  type="text"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value.toUpperCase())}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. ELEMENTOS GRÁFICOS MOSTRADOS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-sliders text-base"></i> 3. Activar / Desactivar Bloques
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-3 rounded-xl border border-white/5">
                <input type="checkbox" checked={showPillars} onChange={(e) => setShowPillars(e.target.checked)} className="accent-[#c5a059]" />
                Lista 3 Pilares
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-3 rounded-xl border border-white/5">
                <input type="checkbox" checked={showQrBox} onChange={(e) => setShowQrBox(e.target.checked)} className="accent-[#c5a059]" />
                Caja QR SmartLink
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-3 rounded-xl border border-white/5">
                <input type="checkbox" checked={showCharacter} onChange={(e) => setShowCharacter(e.target.checked)} className="accent-[#c5a059]" />
                Artista 3D Recortado
              </label>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE NATIVE CANVAS PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-400">
              VISTA PREVIA EN VIVO REAL (CANVAS HD)
            </span>
            <span className="text-[10px] font-black uppercase text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              2160 x 2160 PX ULTRA HD
            </span>
          </div>

          {/* Native Canvas Render Frame */}
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
