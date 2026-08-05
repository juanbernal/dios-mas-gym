import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

// ─── Types ───────────────────────────────────────────────────────────────────
type StyleId =
  | "dark-cinematic"
  | "gold-luxury"
  | "neon-noir"
  | "minimal-type"
  | "grunge-press"
  | "film-grain"
  | "editorial-white"
  | "deep-purple";

type AspectId = "1:1" | "4:5" | "9:16" | "16:9";

interface Style {
  id: StyleId;
  name: string;
  accent: string;
  bg: string;
  preview: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STYLES: Style[] = [
  { id: "dark-cinematic",   name: "Dark Cinematic",   accent: "#c5a059", bg: "#050709", preview: "from-[#050709] to-[#0a0c12]" },
  { id: "gold-luxury",      name: "Gold Luxury",      accent: "#f3d38e", bg: "#07060a", preview: "from-[#07060a] to-[#1a1400]" },
  { id: "neon-noir",        name: "Neon Noir",         accent: "#00f2ff", bg: "#020810", preview: "from-[#020810] to-[#03121e]" },
  { id: "minimal-type",     name: "Minimal Type",      accent: "#ffffff", bg: "#0a0a0a", preview: "from-[#0a0a0a] to-[#111111]" },
  { id: "grunge-press",     name: "Grunge Press",      accent: "#ff4b2b", bg: "#080503", preview: "from-[#080503] to-[#120800]" },
  { id: "film-grain",       name: "Film Grain",        accent: "#e8dcc8", bg: "#100e09", preview: "from-[#100e09] to-[#1a1710]" },
  { id: "editorial-white",  name: "Editorial White",   accent: "#111111", bg: "#f5f5f0", preview: "from-[#f5f5f0] to-[#ededea]" },
  { id: "deep-purple",      name: "Deep Purple",       accent: "#a78bfa", bg: "#06040f", preview: "from-[#06040f] to-[#0d0820]" },
];

const ASPECT_DIMS: Record<AspectId, [number, number]> = {
  "1:1":  [1920, 1920],
  "4:5":  [1920, 2400],
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
};

const PLATFORMS_TEXT = "SPOTIFY  ·  APPLE MUSIC  ·  YOUTUBE  ·  AMAZON  ·  DEEZER";

const VERSES = [
  "Todo lo puedo en Cristo que me fortalece. — Fil. 4:13",
  "No temas, porque yo estoy contigo. — Is. 41:10",
  "Mira que te mando que te esfuerces y seas valiente. — Jos. 1:9",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function drawRounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy + lineH;
}

// ─── Component ───────────────────────────────────────────────────────────────
const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Data
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [title, setTitle] = useState("NOMBRE DE LA CANCIÓN");
  const [artist, setArtist] = useState("DIOSMASGYM");
  const [tagline, setTagline] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Style
  const [styleId, setStyleId] = useState<StyleId>("dark-cinematic");
  const [aspect, setAspect] = useState<AspectId>("1:1");

  // Toggles
  const [showBadge, setShowBadge] = useState(true);
  const [badgeText, setBadgeText] = useState("YA DISPONIBLE");
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showVerse, setShowVerse] = useState(false);
  const [verseText, setVerseText] = useState(VERSES[0]);
  const [showLogo, setShowLogo] = useState(true);

  // Status
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState("");

  const style = STYLES.find((s) => s.id === styleId)!;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    Promise.all([fetchMusicCatalog("diosmasgym"), fetchMusicCatalog("juan614")]).then(
      ([dM, j6]) => {
        const full = [...dM, ...j6];
        setCatalog(full);
        if (full.length > 0) {
          const song = full[0];
          setTitle(song.name.toUpperCase());
          setArtist((song.artist || "DIOSMASGYM").toUpperCase());
          if (song.cover) setCoverUrl(song.cover);
        }
      }
    );
  }, []);

  // ─── Canvas Render ──────────────────────────────────────────────────────────
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [W, H] = ASPECT_DIMS[aspect];
    canvas.width = W;
    canvas.height = H;

    const S = style;
    const isLight = S.id === "editorial-white";
    const textColor = isLight ? "#111111" : "#ffffff";
    const subColor = isLight ? "#444444" : "rgba(255,255,255,0.45)";
    const accent = S.accent;
    const PAD = Math.round(W * 0.06);

    // 1. Background
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, W, H);

    // 2. Ambient cover blur
    if (coverUrl) {
      try {
        const img = await loadImage(coverUrl);
        ctx.save();
        ctx.filter = `blur(${Math.round(W * 0.05)}px) brightness(${isLight ? 0.6 : 0.25}) saturate(1.4)`;
        ctx.drawImage(img, -W * 0.15, -H * 0.15, W * 1.3, H * 1.3);
        ctx.restore();
      } catch {}
    }

    // 3. Gradient overlays (style-specific)
    const makeGrad = () => {
      if (S.id === "grunge-press") {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "rgba(255,40,0,0.15)");
        g.addColorStop(1, "rgba(5,3,2,0.97)");
        return g;
      }
      if (S.id === "neon-noir") {
        const g = ctx.createRadialGradient(W * 0.3, H * 0.3, 0, W / 2, H / 2, W * 0.9);
        g.addColorStop(0, "rgba(0,200,255,0.12)");
        g.addColorStop(0.5, "rgba(0,0,30,0.7)");
        g.addColorStop(1, "rgba(2,8,16,0.97)");
        return g;
      }
      if (S.id === "deep-purple") {
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.85);
        g.addColorStop(0, "rgba(120,60,220,0.2)");
        g.addColorStop(1, "rgba(6,4,15,0.97)");
        return g;
      }
      if (S.id === "editorial-white") {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(245,245,240,0.92)");
        g.addColorStop(1, "rgba(225,225,220,0.98)");
        return g;
      }
      if (S.id === "film-grain") {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "rgba(16,14,9,0.85)");
        g.addColorStop(1, "rgba(16,14,9,0.98)");
        return g;
      }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.6, "rgba(0,0,0,0.7)");
      g.addColorStop(1, "rgba(0,0,0,0.97)");
      return g;
    };
    ctx.fillStyle = makeGrad();
    ctx.fillRect(0, 0, W, H);

    // 4. Film grain overlay (for film-grain style)
    if (S.id === "film-grain") {
      const grainData = ctx.createImageData(W, H);
      for (let i = 0; i < grainData.data.length; i += 4) {
        const v = (Math.random() * 40 - 20) | 0;
        grainData.data[i] = grainData.data[i + 1] = grainData.data[i + 2] = 128 + v;
        grainData.data[i + 3] = 18;
      }
      ctx.putImageData(grainData, 0, 0);
    }

    // 5. Accent line / border element
    const lineThick = Math.max(4, Math.round(W * 0.003));
    if (S.id === "grunge-press") {
      // double diagonal lines top-left
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = lineThick * 2;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.18);
      ctx.lineTo(W * 0.65, H * 0.18);
      ctx.stroke();
      ctx.lineWidth = lineThick;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.18 + lineThick * 4);
      ctx.lineTo(W * 0.45, H * 0.18 + lineThick * 4);
      ctx.stroke();
      ctx.restore();
    } else if (S.id === "editorial-white") {
      ctx.save();
      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, W, Math.round(H * 0.006));
      ctx.fillRect(0, H - Math.round(H * 0.006), W, Math.round(H * 0.006));
      ctx.restore();
    } else {
      // Thin border frame
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = lineThick;
      const m = PAD * 0.5;
      drawRounded(ctx, m, m, W - m * 2, H - m * 2, Math.round(W * 0.02));
      ctx.stroke();
      ctx.restore();
    }

    // 6. Main cover artwork
    const isPortrait = aspect === "9:16";
    const coverSize = isPortrait ? Math.round(W * 0.72) : Math.round(Math.min(W, H) * 0.44);
    const coverX = isPortrait ? (W - coverSize) / 2 : PAD;
    const coverY = isPortrait ? Math.round(H * 0.12) : (H - coverSize) / 2;

    if (coverUrl) {
      try {
        const img = await loadImage(coverUrl);
        // Glow behind cover
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = Math.round(W * 0.04);
        drawRounded(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.045));
        ctx.fillStyle = "transparent";
        ctx.fill();
        ctx.restore();
        // Cover image
        ctx.save();
        drawRounded(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
        ctx.clip();
        ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
        ctx.restore();
        // Subtle vignette on cover
        ctx.save();
        drawRounded(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
        ctx.clip();
        const vig = ctx.createRadialGradient(coverX + coverSize / 2, coverY + coverSize / 2, coverSize * 0.35, coverX + coverSize / 2, coverY + coverSize / 2, coverSize * 0.72);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = vig;
        ctx.fillRect(coverX, coverY, coverSize, coverSize);
        ctx.restore();
      } catch {}
    } else {
      // Placeholder
      ctx.save();
      drawRounded(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
      ctx.fillStyle = `${accent}18`;
      ctx.fill();
      ctx.strokeStyle = `${accent}40`;
      ctx.lineWidth = lineThick * 2;
      ctx.stroke();
      ctx.restore();
    }

    // 7. TEXT BLOCK
    const textX = isPortrait ? W / 2 : coverX + coverSize + PAD;
    const textMaxW = isPortrait ? W - PAD * 2 : W - textX - PAD;
    const textAlign: CanvasTextAlign = isPortrait ? "center" : "left";
    ctx.textAlign = textAlign;

    const titleFontSize = isPortrait ? Math.round(W * 0.092) : Math.round(Math.min(W * 0.065, H * 0.12));
    const artistFontSize = Math.round(titleFontSize * 0.38);
    const smallFontSize = Math.round(titleFontSize * 0.25);

    let textY = isPortrait
      ? coverY + coverSize + Math.round(H * 0.065)
      : coverY + Math.round(coverSize * 0.06);

    // Artist label (small, accent colored, uppercase tracked)
    ctx.save();
    ctx.font = `900 ${artistFontSize}px 'Inter', 'Helvetica Neue', sans-serif`;
    ctx.letterSpacing = `${Math.round(titleFontSize * 0.08)}px`;
    ctx.fillStyle = accent;
    ctx.fillText(artist, textX, textY);
    ctx.restore();
    textY += Math.round(artistFontSize * 1.35);

    // Title
    ctx.save();
    ctx.font = `900 ${titleFontSize}px 'Inter', 'Helvetica Neue', sans-serif`;
    ctx.letterSpacing = "-1px";
    ctx.fillStyle = textColor;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 24;
    textY = wrapText(ctx, title, textX, textY, textMaxW, titleFontSize * 1.1);
    ctx.restore();
    textY += Math.round(titleFontSize * 0.2);

    // Tagline / lyric
    if (tagline) {
      ctx.save();
      ctx.font = `italic 400 ${Math.round(smallFontSize * 1.15)}px 'Georgia', serif`;
      ctx.fillStyle = subColor;
      textY = wrapText(ctx, `"${tagline}"`, textX, textY, textMaxW, smallFontSize * 1.6);
      ctx.restore();
      textY += smallFontSize;
    }

    // Verse
    if (showVerse && verseText) {
      ctx.save();
      ctx.font = `400 ${smallFontSize}px 'Inter', sans-serif`;
      ctx.fillStyle = `${accent}bb`;
      textY = wrapText(ctx, verseText, textX, textY, textMaxW, smallFontSize * 1.5);
      ctx.restore();
      textY += smallFontSize;
    }

    // Status badge
    if (showBadge) {
      const bText = badgeText.toUpperCase();
      ctx.save();
      ctx.font = `900 ${Math.round(smallFontSize * 0.95)}px 'Inter', sans-serif`;
      const bW = ctx.measureText(bText).width + Math.round(W * 0.04);
      const bH = Math.round(smallFontSize * 1.9);
      const bX = isPortrait ? W / 2 - bW / 2 : textX;
      textY += Math.round(smallFontSize * 0.5);
      drawRounded(ctx, bX, textY - bH + Math.round(bH * 0.22), bW, bH, bH / 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = isLight ? "#ffffff" : "#000000";
      ctx.fillText(bText, bX + bW / 2, textY);
      ctx.restore();
      textY += bH + smallFontSize;
    }

    // 8. FOOTER
    const footerY = H - Math.round(H * 0.055);

    // Brand / Logo line
    if (showLogo) {
      ctx.save();
      ctx.font = `900 ${Math.round(smallFontSize * 0.85)}px 'Inter', sans-serif`;
      ctx.letterSpacing = `${Math.round(smallFontSize * 0.15)}px`;
      ctx.fillStyle = isLight ? "#111111" : "#ffffff";
      ctx.globalAlpha = 0.5;
      ctx.textAlign = "left";
      ctx.fillText("DIOSMASGYM RECORDS", PAD, footerY);
      ctx.restore();
    }

    if (showPlatforms) {
      ctx.save();
      ctx.font = `600 ${Math.round(smallFontSize * 0.7)}px 'Inter', sans-serif`;
      ctx.fillStyle = subColor;
      ctx.letterSpacing = `${Math.round(smallFontSize * 0.08)}px`;
      ctx.textAlign = "right";
      ctx.fillText(PLATFORMS_TEXT, W - PAD, footerY);
      ctx.restore();
    }

    // Footer divider
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = lineThick;
    ctx.beginPath();
    ctx.moveTo(PAD, footerY - Math.round(H * 0.03));
    ctx.lineTo(W - PAD, footerY - Math.round(H * 0.03));
    ctx.stroke();
    ctx.restore();

  }, [coverUrl, styleId, aspect, title, artist, tagline, showBadge, badgeText, showPlatforms, showVerse, verseText, showLogo, style]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ─── Download ───────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDownloading(true);
    showToast("⚡ Exportando imagen ultra HD...");
    setTimeout(() => {
      canvas.toBlob((blob) => {
        if (!blob) { showToast("❌ Error al exportar"); setIsDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `BANNER_${title.replace(/\s+/g, "_")}_${aspect.replace(":", "x")}.png`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast("🎉 ¡Banner HD descargado!");
        setIsDownloading(false);
      }, "image/png", 1.0);
    }, 300);
  };

  const filteredCatalog = catalog.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const [W, H] = ASPECT_DIMS[aspect];
  const previewAR = W / H;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030407] text-white pt-24 pb-32 px-4 md:px-6 font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[300] bg-[#c5a059] text-black font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-[0_0_50px_rgba(197,160,89,0.4)] flex items-center gap-3 animate-bounce">
          <i className="fas fa-sparkles" /> {toast}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/admin")}
            className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-[#c5a059] transition-all group"
          >
            <span className="w-6 h-px bg-current group-hover:w-10 transition-all" />
            Panel Principal
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-2">
                Studio HD v2.0
              </p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-none">
                Diseñador de<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059]">Banners Pro</span>
              </h1>
              <p className="mt-3 text-white/30 text-sm">
                8 estilos cinematográficos · 4 formatos · Exportación 1920px ultra nítida
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="shrink-0 flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:shadow-[0_0_50px_rgba(197,160,89,0.5)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDownloading ? (
                <><i className="fas fa-circle-notch animate-spin" /> Exportando...</>
              ) : (
                <><i className="fas fa-arrow-down-to-line" /> Descargar {aspect} PNG</>
              )}
            </button>
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8 items-start">

          {/* ─── LEFT: Control Panel ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Section: Song */}
            <div className="bg-[#0c0e17] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-compact-disc" /> Canción
              </h3>
              {/* Search */}
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(e.target.value.length > 0); }}
                  onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                  placeholder="Buscar en el catálogo..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none transition-colors"
                />
                {isSearchOpen && filteredCatalog.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1220] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-56 overflow-y-auto">
                    {filteredCatalog.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => {
                          setTitle(song.name.toUpperCase());
                          setArtist((song.artist || "DIOSMASGYM").toUpperCase());
                          if (song.cover) setCoverUrl(song.cover);
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full p-3 hover:bg-white/[0.06] flex items-center gap-3 border-b border-white/[0.04] text-left transition-colors"
                      >
                        {song.cover ? (
                          <img src={song.cover} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <i className="fas fa-music text-white/20 text-xs" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate">{song.name}</div>
                          <div className="text-[10px] text-[#c5a059] truncate">{song.artist}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Upload */}
              <label className="flex items-center justify-center gap-2 w-full py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/10 hover:border-[#c5a059]/40 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 cursor-pointer transition-all">
                <i className="fas fa-cloud-arrow-up text-[#c5a059]" /> Subir portada
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => { if (ev.target?.result) setCoverUrl(ev.target.result as string); };
                    reader.readAsDataURL(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Section: Text */}
            <div className="bg-[#0c0e17] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-pen-nib" /> Textos
              </h3>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Título de la canción</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl px-4 py-3 text-sm text-white outline-none font-black tracking-wide transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Artista</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value.toUpperCase())}
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl px-4 py-3 text-xs text-white outline-none font-black tracking-widest transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-1.5">Tagline / Frase (opcional)</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Una frase de la canción..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors"
                />
              </div>
            </div>

            {/* Section: Style */}
            <div className="bg-[#0c0e17] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-palette" /> Estilo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className={`relative h-14 rounded-xl border overflow-hidden flex items-end px-3 pb-2 transition-all ${
                      styleId === s.id
                        ? "border-[#c5a059] ring-1 ring-[#c5a059]/50"
                        : "border-white/[0.06] hover:border-white/20"
                    }`}
                  >
                    {/* Preview gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.preview}`} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${s.accent}22, transparent)` }} />
                    {styleId === s.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#c5a059] flex items-center justify-center">
                        <i className="fas fa-check text-black text-[7px]" />
                      </div>
                    )}
                    <span className="relative text-[10px] font-black text-white drop-shadow-lg">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Format */}
            <div className="bg-[#0c0e17] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-crop-simple" /> Formato
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(["1:1", "4:5", "9:16", "16:9"] as AspectId[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`py-2.5 rounded-xl border text-[10px] font-black transition-all ${
                      aspect === a
                        ? "bg-[#c5a059] text-black border-[#c5a059]"
                        : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/20 font-mono">{W} × {H} px</p>
            </div>

            {/* Section: Toggles */}
            <div className="bg-[#0c0e17] border border-white/[0.06] rounded-2xl p-5 space-y-3">
              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-sliders" /> Elementos
              </h3>
              {[
                { label: "Badge de estado", val: showBadge, set: setShowBadge },
                { label: "Plataformas streaming", val: showPlatforms, set: setShowPlatforms },
                { label: "Versículo bíblico", val: showVerse, set: setShowVerse },
                { label: "Logo marca", val: showLogo, set: setShowLogo },
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-white/50">{label}</span>
                  <button
                    onClick={() => set(!val)}
                    className={`w-10 h-5 rounded-full border transition-all relative ${
                      val ? "bg-[#c5a059] border-[#c5a059]" : "bg-white/[0.05] border-white/10"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${val ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
              {showBadge && (
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Texto del badge..."
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors"
                />
              )}
              {showVerse && (
                <select
                  value={verseText}
                  onChange={(e) => setVerseText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-[#c5a059]/60 rounded-xl px-4 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  {VERSES.map((v) => <option key={v} value={v}>{v.slice(0, 60)}...</option>)}
                </select>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Preview ───────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 xl:sticky xl:top-28">
            {/* Preview header */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Vista Previa en Vivo</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/20 px-3 py-1.5 rounded-full">
                  {W}×{H}px HD
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  {style.name}
                </span>
              </div>
            </div>

            {/* Canvas wrapper */}
            <div
              className="w-full bg-[#07090f] border border-white/[0.06] rounded-3xl p-6 flex items-center justify-center overflow-hidden shadow-2xl"
              style={{ aspectRatio: previewAR > 1 ? "16/9" : "1/1" }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                style={{
                  aspectRatio: `${W}/${H}`,
                  maxHeight: previewAR < 0.7 ? "70vh" : undefined,
                }}
              />
            </div>

            {/* Download CTA secondary */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#c5a059]/40 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all disabled:opacity-40"
            >
              <i className="fas fa-arrow-down-to-line" />
              Descargar {aspect} · PNG Ultra HD
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomPromoCreator;
