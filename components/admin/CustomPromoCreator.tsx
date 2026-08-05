import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";

// ─── Types ───────────────────────────────────────────────────────────────────
type StyleId = "dark-cinematic" | "gold-luxury" | "neon-noir" | "minimal-type" | "grunge-press" | "film-grain" | "editorial-white" | "deep-purple" | "chrome-metal" | "blood-red";
type AspectId = "1:1" | "4:5" | "9:16" | "16:9";
type LayoutId = "cover-center" | "cover-left" | "cover-right" | "fullbleed";
type VerseStyleId = "pill" | "framed" | "inline" | "minimal";
type FontId = "inter" | "georgia" | "mono" | "impact";
type Tab = "cancion" | "texto" | "estilo" | "layout" | "elementos" | "quote";

interface StyleDef { id: StyleId; name: string; accent: string; bg: string; emoji: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const STYLES: StyleDef[] = [
  { id: "dark-cinematic",  name: "Dark Cinematic",  accent: "#c5a059", bg: "#050709", emoji: "🎬" },
  { id: "gold-luxury",     name: "Gold Luxury",     accent: "#f3d38e", bg: "#07060a", emoji: "👑" },
  { id: "neon-noir",       name: "Neon Noir",        accent: "#00f2ff", bg: "#020810", emoji: "⚡" },
  { id: "minimal-type",    name: "Minimal Type",     accent: "#ffffff", bg: "#0a0a0a", emoji: "✦" },
  { id: "grunge-press",    name: "Grunge Press",     accent: "#ff4b2b", bg: "#080503", emoji: "🔥" },
  { id: "film-grain",      name: "Film Grain",       accent: "#e8dcc8", bg: "#100e09", emoji: "🎞" },
  { id: "editorial-white", name: "Editorial White",  accent: "#111111", bg: "#f5f5f0", emoji: "📰" },
  { id: "deep-purple",     name: "Deep Purple",      accent: "#a78bfa", bg: "#06040f", emoji: "🌌" },
  { id: "chrome-metal",    name: "Chrome Metal",     accent: "#94a3b8", bg: "#0a0c10", emoji: "🔩" },
  { id: "blood-red",       name: "Blood Red",        accent: "#ef4444", bg: "#0a0404", emoji: "💀" },
];

const ASPECT_DIMS: Record<AspectId, [number, number]> = {
  "1:1": [1920, 1920], "4:5": [1920, 2400], "9:16": [1080, 1920], "16:9": [1920, 1080],
};

const PLATFORMS_TEXT = "SPOTIFY · APPLE MUSIC · YOUTUBE · AMAZON · DEEZER";

const PRESET_VERSES = [
  { ref: "Fil. 4:13",    text: "Todo lo puedo en Cristo que me fortalece." },
  { ref: "Is. 41:10",   text: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios." },
  { ref: "Jos. 1:9",    text: "Esfuérzate y sé valiente; no temas ni desmayes." },
  { ref: "Sal. 27:1",   text: "Jehová es mi luz y mi salvación; ¿de quién temeré?" },
  { ref: "Prov. 3:5",   text: "Confía en Jehová con todo tu corazón, y no te apoyes en tu propia prudencia." },
  { ref: "Rom. 8:31",   text: "Si Dios es por nosotros, ¿quién contra nosotros?" },
  { ref: "Sal. 46:1",   text: "Dios es nuestro refugio y fortaleza, nuestro pronto auxilio en las tribulaciones." },
  { ref: "Mat. 19:26",  text: "Para los hombres esto es imposible; mas para Dios todo es posible." },
  { ref: "2 Tim. 1:7",  text: "No nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio." },
  { ref: "Isa. 40:31",  text: "Los que esperan en Jehová tendrán nuevas fuerzas; levantarán alas como las águilas." },
  { ref: "Sal. 23:1",   text: "Jehová es mi pastor; nada me faltará." },
  { ref: "Jer. 29:11",  text: "Porque yo sé los planes que tengo para vosotros, planes de bienestar y no de calamidad." },
];

const FONTS: Record<FontId, string> = {
  inter: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', 'Lucida Console', monospace",
  impact: "Impact, 'Arial Black', sans-serif",
};

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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, align: CanvasTextAlign = "left"): number {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  ctx.textAlign = align;
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

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ─── Component ───────────────────────────────────────────────────────────────
const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("cancion");

  // ── Song / Image
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [title, setTitle] = useState("NOMBRE DE LA CANCIÓN");
  const [artist, setArtist] = useState("DIOSMASGYM");

  // ── Style
  const [styleId, setStyleId] = useState<StyleId>("dark-cinematic");
  const [customAccent, setCustomAccent] = useState("");  // empty = use style default
  const [overlayOpacity, setOverlayOpacity] = useState(75);
  const [blurIntensity, setBlurIntensity] = useState(60);

  // ── Layout
  const [aspect, setAspect] = useState<AspectId>("1:1");
  const [layout, setLayout] = useState<LayoutId>("cover-center");
  const [coverScale, setCoverScale] = useState(50); // % of canvas width

  // ── Text
  const [tagline, setTagline] = useState("");
  const [fontId, setFontId] = useState<FontId>("inter");
  const [titleSize, setTitleSize] = useState(100); // % relative to default

  // ── Quote / Verse
  const [showQuote, setShowQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("Todo lo puedo en Cristo que me fortalece.");
  const [quoteRef, setQuoteRef] = useState("Filipenses 4:13");
  const [quoteStyle, setQuoteStyle] = useState<VerseStyleId>("pill");
  const [showVerseModal, setShowVerseModal] = useState(false);

  // ── Elements
  const [showBadge, setShowBadge] = useState(true);
  const [badgeText, setBadgeText] = useState("YA DISPONIBLE");
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showDivider, setShowDivider] = useState(true);
  const [showDecor, setShowDecor] = useState(true);

  // ── Status
  const [isDownloading, setIsDownloading] = useState(false);
  const [toast, setToast] = useState("");

  const style = STYLES.find(s => s.id === styleId)!;
  const accentColor = customAccent || style.accent;
  const isLight = styleId === "editorial-white";

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    Promise.all([fetchMusicCatalog("diosmasgym"), fetchMusicCatalog("juan614")]).then(([dM, j6]) => {
      const full = [...dM, ...j6];
      setCatalog(full);
      if (full.length > 0) {
        setTitle(full[0].name.toUpperCase());
        setArtist((full[0].artist || "DIOSMASGYM").toUpperCase());
        if (full[0].cover) setCoverUrl(full[0].cover);
      }
    });
  }, []);

  // ─── Canvas Render Engine ─────────────────────────────────────────────────
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [W, H] = ASPECT_DIMS[aspect];
    canvas.width = W;
    canvas.height = H;

    const PAD = Math.round(W * 0.055);
    const accent = accentColor;
    const [aR, aG, aB] = hexToRgb(accent);
    const textColor = isLight ? "#111111" : "#ffffff";
    const subColor = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.42)";
    const font = FONTS[fontId];
    const lineThick = Math.max(3, Math.round(W * 0.0025));
    const ovOpacity = overlayOpacity / 100;

    // ── 1. Background fill ──────────────────────────────────────────────────
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Ambient blurred cover ────────────────────────────────────────────
    if (coverUrl) {
      try {
        const img = await loadImage(coverUrl);
        ctx.save();
        const blur = Math.round((blurIntensity / 100) * W * 0.06);
        ctx.filter = `blur(${blur}px) brightness(${isLight ? 0.55 : 0.22}) saturate(1.6)`;
        ctx.drawImage(img, -W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
        ctx.restore();
      } catch {}
    }

    // ── 3. Style-specific gradient overlay ──────────────────────────────────
    const applyOverlay = () => {
      ctx.save();
      let grad: CanvasGradient;
      switch (styleId) {
        case "neon-noir": {
          grad = ctx.createRadialGradient(W * 0.25, H * 0.25, 0, W / 2, H / 2, W * 0.9);
          grad.addColorStop(0, `rgba(${aR},${aG},${aB},0.15)`);
          grad.addColorStop(0.5, `rgba(0,0,20,${ovOpacity * 0.75})`);
          grad.addColorStop(1, `rgba(2,8,16,${ovOpacity})`);
          break;
        }
        case "deep-purple": {
          grad = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H / 2, W * 0.85);
          grad.addColorStop(0, `rgba(${aR},${aG},${aB},0.2)`);
          grad.addColorStop(1, `rgba(6,4,15,${ovOpacity})`);
          break;
        }
        case "grunge-press": {
          grad = ctx.createLinearGradient(0, 0, W, H);
          grad.addColorStop(0, `rgba(255,30,0,0.18)`);
          grad.addColorStop(0.4, `rgba(10,5,2,${ovOpacity * 0.8})`);
          grad.addColorStop(1, `rgba(5,3,2,${ovOpacity})`);
          break;
        }
        case "editorial-white": {
          grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, `rgba(245,245,240,0.94)`);
          grad.addColorStop(1, `rgba(225,225,220,0.98)`);
          break;
        }
        case "gold-luxury": {
          grad = ctx.createLinearGradient(0, H, W, 0);
          grad.addColorStop(0, `rgba(7,6,10,${ovOpacity})`);
          grad.addColorStop(0.5, `rgba(${aR},${aG},${aB},0.08)`);
          grad.addColorStop(1, `rgba(7,6,10,${ovOpacity})`);
          break;
        }
        case "chrome-metal": {
          grad = ctx.createLinearGradient(0, 0, W, H);
          grad.addColorStop(0, `rgba(10,12,16,${ovOpacity})`);
          grad.addColorStop(0.5, `rgba(30,35,45,${ovOpacity * 0.6})`);
          grad.addColorStop(1, `rgba(10,12,16,${ovOpacity})`);
          break;
        }
        default: {
          grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, `rgba(0,0,0,${ovOpacity * 0.4})`);
          grad.addColorStop(0.55, `rgba(0,0,0,${ovOpacity * 0.72})`);
          grad.addColorStop(1, `rgba(0,0,0,${ovOpacity})`);
        }
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    };
    applyOverlay();

    // ── 4. Film grain ───────────────────────────────────────────────────────
    if (styleId === "film-grain") {
      const gd = ctx.createImageData(W, H);
      for (let i = 0; i < gd.data.length; i += 4) {
        const v = (Math.random() * 50 - 25) | 0;
        gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = 128 + v;
        gd.data[i + 3] = 20;
      }
      ctx.putImageData(gd, 0, 0);
    }

    // ── 5. Decorative elements (style-specific) ─────────────────────────────
    if (showDecor) {
      ctx.save();
      switch (styleId) {
        case "grunge-press": {
          // Grunge horizontal bars
          ctx.globalAlpha = 0.08;
          for (let i = 0; i < H; i += Math.round(H * 0.025)) {
            if (Math.random() > 0.7) {
              ctx.fillStyle = "#ff4b2b";
              ctx.fillRect(0, i, W * (0.3 + Math.random() * 0.7), Math.round(H * 0.002));
            }
          }
          ctx.globalAlpha = 1;
          // Bold X marks
          ctx.strokeStyle = accent;
          ctx.lineWidth = lineThick * 4;
          ctx.globalAlpha = 0.06;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.2, H * 0.18); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W * 0.2, 0); ctx.lineTo(0, H * 0.18); ctx.stroke();
          break;
        }
        case "neon-noir": {
          // Scanlines
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = "#00f2ff";
          for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
          ctx.globalAlpha = 1;
          // Neon corner accents
          ctx.strokeStyle = accent;
          ctx.lineWidth = lineThick * 2;
          ctx.globalAlpha = 0.35;
          const cs = Math.round(W * 0.07);
          // top-left
          ctx.beginPath(); ctx.moveTo(PAD, PAD + cs); ctx.lineTo(PAD, PAD); ctx.lineTo(PAD + cs, PAD); ctx.stroke();
          // top-right
          ctx.beginPath(); ctx.moveTo(W - PAD - cs, PAD); ctx.lineTo(W - PAD, PAD); ctx.lineTo(W - PAD, PAD + cs); ctx.stroke();
          // bottom-left
          ctx.beginPath(); ctx.moveTo(PAD, H - PAD - cs); ctx.lineTo(PAD, H - PAD); ctx.lineTo(PAD + cs, H - PAD); ctx.stroke();
          // bottom-right
          ctx.beginPath(); ctx.moveTo(W - PAD - cs, H - PAD); ctx.lineTo(W - PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD - cs); ctx.stroke();
          break;
        }
        case "gold-luxury": {
          // Thin diamond border
          ctx.strokeStyle = accent;
          ctx.lineWidth = lineThick;
          ctx.globalAlpha = 0.18;
          const m = PAD * 0.6;
          ctx.beginPath();
          ctx.moveTo(W / 2, m); ctx.lineTo(W - m, H / 2);
          ctx.lineTo(W / 2, H - m); ctx.lineTo(m, H / 2);
          ctx.closePath(); ctx.stroke();
          ctx.globalAlpha = 0.1;
          const m2 = PAD * 1.1;
          ctx.beginPath();
          ctx.moveTo(W / 2, m2); ctx.lineTo(W - m2, H / 2);
          ctx.lineTo(W / 2, H - m2); ctx.lineTo(m2, H / 2);
          ctx.closePath(); ctx.stroke();
          break;
        }
        case "chrome-metal": {
          // Metal gradient lines
          ctx.globalAlpha = 0.07;
          for (let i = 0; i < 12; i++) {
            const y = (H / 12) * i;
            const metalGrad = ctx.createLinearGradient(0, y, W, y + H / 12);
            metalGrad.addColorStop(0, "transparent");
            metalGrad.addColorStop(0.5, "#ffffff");
            metalGrad.addColorStop(1, "transparent");
            ctx.fillStyle = metalGrad;
            ctx.fillRect(0, y, W, H / 12);
          }
          break;
        }
        case "deep-purple": {
          // Starfield
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 120; i++) {
            const sx = Math.random() * W;
            const sy = Math.random() * H;
            const sr = Math.random() * 2;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        default: {
          // Subtle thin border frame
          ctx.strokeStyle = accent;
          ctx.lineWidth = lineThick;
          ctx.globalAlpha = 0.12;
          const bm = PAD * 0.55;
          roundedRect(ctx, bm, bm, W - bm * 2, H - bm * 2, Math.round(W * 0.025));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ── 6. Cover Artwork ────────────────────────────────────────────────────
    const coverMaxFraction = coverScale / 100;
    const isPortrait = aspect === "9:16";
    const isWide = aspect === "16:9";

    let coverSize: number, coverX: number, coverY: number;

    if (layout === "fullbleed") {
      // Cover fills the entire canvas
      if (coverUrl) {
        try {
          const img = await loadImage(coverUrl);
          ctx.save();
          ctx.filter = "brightness(0.35) saturate(1.3)";
          ctx.drawImage(img, 0, 0, W, H);
          ctx.restore();
          // Extra overlay for text readability
          const ol = ctx.createLinearGradient(0, 0, 0, H);
          ol.addColorStop(0, "rgba(0,0,0,0.3)");
          ol.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = ol;
          ctx.fillRect(0, 0, W, H);
        } catch {}
      }
      coverSize = 0;
      coverX = 0;
      coverY = 0;
    } else {
      // Calculate cover dimensions based on layout
      if (layout === "cover-center") {
        coverSize = Math.round((isPortrait ? W : Math.min(W, H)) * coverMaxFraction);
        coverX = (W - coverSize) / 2;
        coverY = isPortrait
          ? Math.round(H * 0.1)
          : (H - coverSize) / 2;
      } else if (layout === "cover-left") {
        coverSize = Math.round((isWide ? H * 0.75 : Math.min(W, H) * 0.55) * coverMaxFraction * 1.4);
        coverX = PAD;
        coverY = (H - coverSize) / 2;
      } else { // cover-right
        coverSize = Math.round((isWide ? H * 0.75 : Math.min(W, H) * 0.55) * coverMaxFraction * 1.4);
        coverX = W - PAD - coverSize;
        coverY = (H - coverSize) / 2;
      }

      if (coverUrl) {
        try {
          const img = await loadImage(coverUrl);
          // Glow
          ctx.save();
          ctx.shadowColor = `rgba(${aR},${aG},${aB},0.5)`;
          ctx.shadowBlur = Math.round(W * 0.045);
          roundedRect(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
          ctx.fillStyle = "rgba(0,0,0,0.01)";
          ctx.fill();
          ctx.restore();
          // Image
          ctx.save();
          roundedRect(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
          ctx.clip();
          ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
          // Subtle vignette on cover
          const vig = ctx.createRadialGradient(
            coverX + coverSize / 2, coverY + coverSize / 2, coverSize * 0.3,
            coverX + coverSize / 2, coverY + coverSize / 2, coverSize * 0.72
          );
          vig.addColorStop(0, "rgba(0,0,0,0)");
          vig.addColorStop(1, "rgba(0,0,0,0.38)");
          ctx.fillStyle = vig;
          ctx.fillRect(coverX, coverY, coverSize, coverSize);
          ctx.restore();
          // Border on cover
          ctx.save();
          roundedRect(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
          ctx.strokeStyle = `rgba(${aR},${aG},${aB},0.3)`;
          ctx.lineWidth = lineThick * 2;
          ctx.stroke();
          ctx.restore();
        } catch {}
      } else {
        ctx.save();
        roundedRect(ctx, coverX, coverY, coverSize, coverSize, Math.round(coverSize * 0.04));
        ctx.fillStyle = `rgba(${aR},${aG},${aB},0.08)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${aR},${aG},${aB},0.25)`;
        ctx.lineWidth = lineThick * 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── 7. Text Block ───────────────────────────────────────────────────────
    let textX: number, textMaxW: number, textAlign: CanvasTextAlign, textY: number;

    if (layout === "cover-left") {
      const textStart = coverX + coverSize + PAD * 1.5;
      textX = textStart;
      textMaxW = W - textStart - PAD;
      textAlign = "left";
      textY = H * 0.25;
    } else if (layout === "cover-right") {
      textX = PAD;
      textMaxW = coverX - PAD * 1.5;
      textAlign = "left";
      textY = H * 0.25;
    } else if (layout === "fullbleed") {
      textX = W / 2;
      textMaxW = W - PAD * 2;
      textAlign = "center";
      textY = H * 0.55;
    } else {
      // cover-center: text below cover
      textX = W / 2;
      textMaxW = W - PAD * 2.5;
      textAlign = "center";
      textY = (coverSize > 0 ? coverY + coverSize : H * 0.35) + Math.round(H * 0.055);
    }

    const baseTitleSize = isPortrait
      ? Math.round(W * 0.085)
      : Math.round(Math.min(W * 0.065, H * 0.11));
    const titleFontSize = Math.round(baseTitleSize * (titleSize / 100));
    const artistFontSize = Math.round(titleFontSize * 0.36);
    const subFontSize = Math.round(titleFontSize * 0.22);

    // Artist name
    ctx.save();
    ctx.font = `900 ${artistFontSize}px ${font}`;
    ctx.fillStyle = accent;
    ctx.textAlign = textAlign;
    ctx.shadowColor = `rgba(${aR},${aG},${aB},0.6)`;
    ctx.shadowBlur = 20;
    ctx.fillText(artist, textX, textY);
    ctx.restore();
    textY += Math.round(artistFontSize * 1.4);

    // Title divider
    if (showDivider) {
      ctx.save();
      const divLen = Math.min(textMaxW * 0.4, Math.round(W * 0.15));
      ctx.strokeStyle = accent;
      ctx.lineWidth = lineThick * 1.5;
      ctx.globalAlpha = 0.4;
      const divX = textAlign === "center" ? textX - divLen / 2 : textX;
      ctx.beginPath(); ctx.moveTo(divX, textY - Math.round(artistFontSize * 0.3)); ctx.lineTo(divX + divLen, textY - Math.round(artistFontSize * 0.3)); ctx.stroke();
      ctx.restore();
      textY += Math.round(artistFontSize * 0.3);
    }

    // Song title
    ctx.save();
    ctx.font = `900 ${titleFontSize}px ${font}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = textAlign;
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 30;
    textY = wrapText(ctx, title, textX, textY, textMaxW, titleFontSize * 1.08, textAlign);
    ctx.restore();
    textY += Math.round(titleFontSize * 0.15);

    // Tagline
    if (tagline) {
      ctx.save();
      ctx.font = `italic 400 ${Math.round(subFontSize * 1.3)}px Georgia, serif`;
      ctx.fillStyle = subColor;
      ctx.textAlign = textAlign;
      textY = wrapText(ctx, `"${tagline}"`, textX, textY, textMaxW, subFontSize * 1.65, textAlign);
      ctx.restore();
      textY += subFontSize * 0.5;
    }

    // ── 8. Quote / Verse Block ──────────────────────────────────────────────
    if (showQuote && quoteText) {
      const fullQuote = quoteRef ? `${quoteText} — ${quoteRef}` : quoteText;
      const qFontSize = Math.round(subFontSize * 1.15);
      textY += subFontSize * 0.8;

      if (quoteStyle === "pill") {
        // Pill-shaped background
        ctx.save();
        ctx.font = `italic 500 ${qFontSize}px Georgia, serif`;
        const qWidth = Math.min(ctx.measureText(fullQuote).width + PAD * 1.6, textMaxW + PAD);
        const qHeight = Math.round(qFontSize * 2.5);
        const qX = textAlign === "center" ? textX - qWidth / 2 : textX;
        roundedRect(ctx, qX, textY - Math.round(qFontSize * 1.1), qWidth, qHeight, qHeight / 2);
        ctx.fillStyle = `rgba(${aR},${aG},${aB},0.12)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${aR},${aG},${aB},0.3)`;
        ctx.lineWidth = lineThick;
        ctx.stroke();
        ctx.fillStyle = isLight ? "rgba(0,0,0,0.75)" : `rgba(${aR},${aG},${aB},0.9)`;
        ctx.textAlign = "center";
        ctx.fillText(fullQuote, qX + qWidth / 2, textY + Math.round(qFontSize * 0.35));
        ctx.restore();
        textY += qHeight + subFontSize * 0.5;

      } else if (quoteStyle === "framed") {
        // Left-bar framed block
        ctx.save();
        const barW = Math.round(lineThick * 3.5);
        const qX = textAlign === "center" ? textX - textMaxW * 0.5 : textX;
        ctx.fillStyle = accent;
        ctx.fillRect(qX, textY - qFontSize, barW, qFontSize * 2.8);
        ctx.font = `italic 400 ${qFontSize}px Georgia, serif`;
        ctx.fillStyle = isLight ? "#111111" : "#ffffff";
        ctx.globalAlpha = 0.7;
        ctx.textAlign = "left";
        wrapText(ctx, fullQuote, qX + barW + Math.round(W * 0.02), textY, textMaxW - barW - Math.round(W * 0.02), qFontSize * 1.45, "left");
        ctx.restore();
        textY += qFontSize * 3.2;

      } else if (quoteStyle === "inline") {
        // Just italic text, no background
        ctx.save();
        ctx.font = `italic 400 ${qFontSize}px Georgia, serif`;
        ctx.fillStyle = `rgba(${aR},${aG},${aB},0.8)`;
        ctx.textAlign = textAlign;
        textY = wrapText(ctx, `❝ ${fullQuote} ❞`, textX, textY, textMaxW, qFontSize * 1.5, textAlign);
        ctx.restore();
        textY += subFontSize * 0.3;

      } else { // minimal
        ctx.save();
        ctx.font = `600 ${Math.round(qFontSize * 0.88)}px ${font}`;
        ctx.fillStyle = subColor;
        ctx.textAlign = textAlign;
        ctx.letterSpacing = "2px";
        textY = wrapText(ctx, fullQuote.toUpperCase(), textX, textY, textMaxW, qFontSize * 1.4, textAlign);
        ctx.restore();
        textY += subFontSize * 0.3;
      }
    }

    // ── 9. Status Badge ─────────────────────────────────────────────────────
    if (showBadge && badgeText) {
      textY += subFontSize * 0.8;
      ctx.save();
      ctx.font = `900 ${Math.round(subFontSize * 0.9)}px ${font}`;
      const bPad = Math.round(W * 0.022);
      const bW = ctx.measureText(badgeText.toUpperCase()).width + bPad * 2;
      const bH = Math.round(subFontSize * 1.9);
      const bX = textAlign === "center" ? textX - bW / 2 : textX;
      roundedRect(ctx, bX, textY - bH + Math.round(bH * 0.2), bW, bH, bH / 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.fillStyle = isLight ? "#ffffff" : "#000000";
      ctx.textAlign = "center";
      ctx.fillText(badgeText.toUpperCase(), bX + bW / 2, textY);
      ctx.restore();
    }

    // ── 10. Footer ──────────────────────────────────────────────────────────
    const footerY = H - Math.round(H * 0.048);

    // Footer separator
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = lineThick;
    ctx.beginPath();
    ctx.moveTo(PAD, footerY - Math.round(H * 0.028));
    ctx.lineTo(W - PAD, footerY - Math.round(H * 0.028));
    ctx.stroke();
    ctx.restore();

    // Brand logo text
    if (showLogo) {
      ctx.save();
      ctx.font = `900 ${Math.round(subFontSize * 0.8)}px ${font}`;
      ctx.letterSpacing = `${Math.round(subFontSize * 0.15)}px`;
      ctx.fillStyle = isLight ? "#111111" : "#ffffff";
      ctx.globalAlpha = 0.45;
      ctx.textAlign = "left";
      ctx.fillText("DIOSMASGYM RECORDS", PAD, footerY);
      ctx.restore();
    }

    // Platforms
    if (showPlatforms) {
      ctx.save();
      ctx.font = `600 ${Math.round(subFontSize * 0.7)}px ${font}`;
      ctx.fillStyle = subColor;
      ctx.textAlign = "right";
      ctx.fillText(PLATFORMS_TEXT, W - PAD, footerY);
      ctx.restore();
    }

  }, [
    coverUrl, styleId, accentColor, aspect, layout, coverScale,
    title, artist, tagline, fontId, titleSize,
    showQuote, quoteText, quoteRef, quoteStyle,
    showBadge, badgeText, showPlatforms, showLogo, showDivider, showDecor,
    overlayOpacity, blurIntensity, isLight, style
  ]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // ─── Download ─────────────────────────────────────────────────────────────
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
        const [W, H] = ASPECT_DIMS[aspect];
        a.download = `PROMO_${title.replace(/\s+/g, "_").slice(0, 25)}_${W}x${H}.png`;
        a.href = url;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast("🎉 ¡Banner HD descargado!");
        setIsDownloading(false);
      }, "image/png", 1.0);
    }, 300);
  };

  const filteredCatalog = catalog
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 8);

  const [W, H] = ASPECT_DIMS[aspect];

  // ─── Tab definitions ──────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "cancion",   label: "Canción",   icon: "fa-compact-disc" },
    { id: "texto",     label: "Texto",     icon: "fa-pen-nib" },
    { id: "estilo",    label: "Estilo",    icon: "fa-palette" },
    { id: "layout",    label: "Layout",    icon: "fa-table-cells-large" },
    { id: "quote",     label: "Versículo", icon: "fa-book-bible" },
    { id: "elementos", label: "Extras",    icon: "fa-sliders" },
  ];

  return (
    <div className="min-h-screen bg-[#030407] text-white font-sans">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[400] bg-[#c5a059] text-black font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-[0_0_60px_rgba(197,160,89,0.4)] flex items-center gap-3 animate-bounce">
          <i className="fas fa-sparkles" /> {toast}
        </div>
      )}

      {/* Verse Modal */}
      {showVerseModal && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowVerseModal(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <i className="fas fa-book-bible text-[#c5a059]" /> Biblioteca de Versículos
                </h3>
                <p className="text-white/30 text-xs mt-1">Selecciona uno para cargarlo en el diseño</p>
              </div>
              <button onClick={() => setShowVerseModal(false)} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all">
                <i className="fas fa-xmark" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {PRESET_VERSES.map((v, i) => (
                <button
                  key={i}
                  onClick={() => { setQuoteText(v.text); setQuoteRef(v.ref); setShowQuote(true); setShowVerseModal(false); showToast("✝️ Versículo cargado"); }}
                  className="w-full text-left p-4 bg-white/[0.03] hover:bg-[#c5a059]/10 border border-white/[0.05] hover:border-[#c5a059]/30 rounded-2xl transition-all group"
                >
                  <p className="text-white/80 text-sm leading-relaxed group-hover:text-white transition-colors">"{v.text}"</p>
                  <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mt-2">{v.ref}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[#030407]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1500px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/25 hover:text-white/70 transition-all group">
              <i className="fas fa-chevron-left text-[#c5a059]" /> Admin
            </button>
            <span className="w-px h-5 bg-white/10" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059]">Studio HD v2.1</p>
              <h1 className="text-sm font-black text-white leading-none">Centro de Creación Promo</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Style quick-switch */}
            <div className="hidden md:flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
              {STYLES.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  title={s.name}
                  className={`w-7 h-7 rounded-lg text-xs transition-all ${styleId === s.id ? "bg-[#c5a059] text-black" : "text-white/50 hover:text-white"}`}
                >
                  {s.emoji}
                </button>
              ))}
              <span className="w-px h-4 bg-white/10 mx-1" />
              {STYLES.slice(5).map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  title={s.name}
                  className={`w-7 h-7 rounded-lg text-xs transition-all ${styleId === s.id ? "bg-[#c5a059] text-black" : "text-white/50 hover:text-white"}`}
                >
                  {s.emoji}
                </button>
              ))}
            </div>

            {/* Format pills */}
            <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
              {(["1:1", "4:5", "9:16", "16:9"] as AspectId[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={`px-3 h-7 rounded-lg text-[9px] font-black transition-all ${aspect === a ? "bg-[#c5a059] text-black" : "text-white/40 hover:text-white"}`}
                >
                  {a}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.25em] rounded-xl hover:shadow-[0_0_40px_rgba(197,160,89,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isDownloading ? <i className="fas fa-circle-notch animate-spin" /> : <i className="fas fa-arrow-down-to-line" />}
              <span className="hidden sm:inline">Descargar PNG HD</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div className="max-w-[1500px] mx-auto flex flex-col xl:flex-row gap-0" style={{ minHeight: "calc(100vh - 57px)" }}>

        {/* ─── Left Panel: Controls ──────────────────────────────────────────── */}
        <div className="xl:w-[380px] shrink-0 border-r border-white/[0.06] flex flex-col">

          {/* Tabs */}
          <div className="border-b border-white/[0.06] px-3 py-2 flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? "bg-[#c5a059]/15 text-[#c5a059] border border-[#c5a059]/30"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                <i className={`fas ${tab.icon} text-[11px]`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── TAB: CANCIÓN ── */}
            {activeTab === "cancion" && (
              <>
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Buscar en el catálogo</p>
                  <div className="relative">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(e.target.value.length > 0); }}
                      onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                      placeholder="Buscar canción..."
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none transition-colors"
                    />
                    {isSearchOpen && filteredCatalog.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f1220] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl max-h-52 overflow-y-auto">
                        {filteredCatalog.map(song => (
                          <button
                            key={song.id}
                            onClick={() => { setTitle(song.name.toUpperCase()); setArtist((song.artist || "DIOSMASGYM").toUpperCase()); if (song.cover) setCoverUrl(song.cover); setIsSearchOpen(false); setSearchQuery(""); }}
                            className="w-full p-3 hover:bg-white/[0.06] flex items-center gap-3 border-b border-white/[0.04] text-left transition-colors"
                          >
                            {song.cover ? <img src={song.cover} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" /> : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><i className="fas fa-music text-white/20 text-xs" /></div>}
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">{song.name}</div>
                              <div className="text-[10px] text-[#c5a059] truncate">{song.artist}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center justify-center gap-2 w-full py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-dashed border-white/10 hover:border-[#c5a059]/40 rounded-xl text-xs font-bold text-white/35 hover:text-white/60 cursor-pointer transition-all">
                    <i className="fas fa-cloud-arrow-up text-[#c5a059]" /> Subir imagen de portada
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { if (ev.target?.result) setCoverUrl(ev.target.result as string); }; r.readAsDataURL(f); }} className="hidden" />
                  </label>

                  {/* Cover preview */}
                  {coverUrl && (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                      <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
                      <button onClick={() => setCoverUrl("")} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white/60 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <i className="fas fa-xmark text-xs" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TAB: TEXTO ── */}
            {activeTab === "texto" && (
              <>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Título de la canción</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-3 text-sm text-white outline-none font-black tracking-wide transition-colors" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Artista</label>
                  <input type="text" value={artist} onChange={e => setArtist(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-black tracking-widest transition-colors" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Tagline / Frase corta</label>
                  <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Opcional..."
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors" />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Tipografía</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["inter", "Modern Sans"], ["georgia", "Serif Clásica"], ["mono", "Monospace"], ["impact", "Impact Bold"]] as [FontId, string][]).map(([id, name]) => (
                      <button key={id} onClick={() => setFontId(id)} className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${fontId === id ? "bg-[#c5a059] text-black border-[#c5a059]" : "bg-white/[0.03] text-white/50 border-white/[0.06] hover:border-white/20 hover:text-white"}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Tamaño del título</label>
                    <span className="text-[10px] font-black text-[#c5a059]">{titleSize}%</span>
                  </div>
                  <input type="range" min={60} max={160} value={titleSize} onChange={e => setTitleSize(Number(e.target.value))}
                    className="w-full accent-[#c5a059] cursor-pointer" />
                </div>
              </>
            )}

            {/* ── TAB: ESTILO ── */}
            {activeTab === "estilo" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setStyleId(s.id)}
                      className={`relative h-16 rounded-2xl border overflow-hidden flex items-end px-3 pb-2.5 transition-all ${styleId === s.id ? "border-[#c5a059] ring-2 ring-[#c5a059]/25" : "border-white/[0.06] hover:border-white/20"}`}
                    >
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${s.bg}, ${s.accent}22)` }} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 text-3xl">{s.emoji}</div>
                      {styleId === s.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#c5a059] flex items-center justify-center"><i className="fas fa-check text-black text-[8px]" /></div>}
                      <span className="relative text-[10px] font-black text-white drop-shadow-lg">{s.name}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Color de acento personalizado</label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <input type="color" value={customAccent || style.accent} onChange={e => setCustomAccent(e.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                      <div className="w-full h-full rounded-xl" style={{ background: customAccent || style.accent }} />
                    </div>
                    <div className="flex-1">
                      <input type="text" value={customAccent} onChange={e => setCustomAccent(e.target.value)} placeholder={style.accent}
                        className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono transition-colors" />
                    </div>
                    {customAccent && <button onClick={() => setCustomAccent("")} className="text-white/30 hover:text-white text-xs transition-colors"><i className="fas fa-rotate-left" /></button>}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Intensidad de overlay</label>
                    <span className="text-[10px] font-black text-[#c5a059]">{overlayOpacity}%</span>
                  </div>
                  <input type="range" min={20} max={98} value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-[#c5a059] cursor-pointer" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Desenfoque de fondo</label>
                    <span className="text-[10px] font-black text-[#c5a059]">{blurIntensity}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={blurIntensity} onChange={e => setBlurIntensity(Number(e.target.value))}
                    className="w-full accent-[#c5a059] cursor-pointer" />
                </div>
              </>
            )}

            {/* ── TAB: LAYOUT ── */}
            {activeTab === "layout" && (
              <>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-3">Composición</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "cover-center", name: "Centrado",      icon: "⬛", desc: "Portada arriba, texto abajo" },
                      { id: "cover-left",   name: "Portada Izq.",  icon: "⬜", desc: "Portada a la izquierda" },
                      { id: "cover-right",  name: "Portada Der.",  icon: "▪️", desc: "Portada a la derecha" },
                      { id: "fullbleed",    name: "Full Bleed",    icon: "🌆", desc: "Portada cubre todo el fondo" },
                    ] as { id: LayoutId; name: string; icon: string; desc: string }[]).map(l => (
                      <button key={l.id} onClick={() => setLayout(l.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${layout === l.id ? "bg-[#c5a059]/12 border-[#c5a059]/40 text-[#c5a059]" : "bg-white/[0.03] border-white/[0.06] hover:border-white/20 text-white/50"}`}
                      >
                        <div className="text-xl mb-2">{l.icon}</div>
                        <div className="text-[10px] font-black">{l.name}</div>
                        <div className="text-[9px] opacity-60 mt-0.5">{l.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-3">Formato de exportación</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "1:1",  name: "Cuadrado",     dims: "1920×1920", desc: "Feed Instagram" },
                      { id: "4:5",  name: "Retrato",       dims: "1920×2400", desc: "Feed Portrait" },
                      { id: "9:16", name: "Stories",       dims: "1080×1920", desc: "Stories / Reels" },
                      { id: "16:9", name: "Horizontal",    dims: "1920×1080", desc: "YouTube Banner" },
                    ] as { id: AspectId; name: string; dims: string; desc: string }[]).map(a => (
                      <button key={a.id} onClick={() => setAspect(a.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${aspect === a.id ? "bg-[#c5a059]/12 border-[#c5a059]/40 text-[#c5a059]" : "bg-white/[0.03] border-white/[0.06] hover:border-white/20 text-white/50"}`}
                      >
                        <div className="text-[11px] font-black mb-0.5">{a.name}</div>
                        <div className="text-[9px] font-mono opacity-70">{a.dims}</div>
                        <div className="text-[9px] opacity-45 mt-0.5">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {layout !== "fullbleed" && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Tamaño de portada</label>
                      <span className="text-[10px] font-black text-[#c5a059]">{coverScale}%</span>
                    </div>
                    <input type="range" min={25} max={90} value={coverScale} onChange={e => setCoverScale(Number(e.target.value))}
                      className="w-full accent-[#c5a059] cursor-pointer" />
                  </div>
                )}
              </>
            )}

            {/* ── TAB: QUOTE / VERSÍCULO ── */}
            {activeTab === "quote" && (
              <>
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-white">Mostrar versículo / cita</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Aparecerá en el banner</p>
                  </div>
                  <button onClick={() => setShowQuote(!showQuote)} className={`w-12 h-6 rounded-full border transition-all relative ${showQuote ? "bg-[#c5a059] border-[#c5a059]" : "bg-white/5 border-white/10"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${showQuote ? "left-6" : "left-0.5"}`} />
                  </button>
                </div>

                {showQuote && (
                  <>
                    {/* Presets button */}
                    <button onClick={() => setShowVerseModal(true)}
                      className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#c5a059]/10 hover:bg-[#c5a059]/18 border border-[#c5a059]/30 rounded-2xl text-[#c5a059] text-[11px] font-black uppercase tracking-widest transition-all">
                      <i className="fas fa-book-bible" /> Ver Biblioteca de Versículos
                    </button>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Texto del versículo / cita</label>
                      <textarea
                        value={quoteText}
                        onChange={e => setQuoteText(e.target.value)}
                        rows={3}
                        placeholder="Escribe tu versículo o frase aquí..."
                        className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Referencia (ej: Filipenses 4:13)</label>
                      <input type="text" value={quoteRef} onChange={e => setQuoteRef(e.target.value)} placeholder="Libro Capítulo:Versículo"
                        className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-3 text-xs text-white outline-none font-mono transition-colors" />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Estilo visual del versículo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { id: "pill",    name: "Píldora",   desc: "Fondo redondeado con borde" },
                          { id: "framed",  name: "Enmarcado", desc: "Barra lateral de acento" },
                          { id: "inline",  name: "Cursiva",   desc: "Texto cursivo libre" },
                          { id: "minimal", name: "Minimal",   desc: "Solo texto en mayúsculas" },
                        ] as { id: VerseStyleId; name: string; desc: string }[]).map(vs => (
                          <button key={vs.id} onClick={() => setQuoteStyle(vs.id)}
                            className={`p-3 rounded-2xl border text-left transition-all ${quoteStyle === vs.id ? "bg-[#c5a059]/12 border-[#c5a059]/40 text-[#c5a059]" : "bg-white/[0.03] border-white/[0.06] hover:border-white/20 text-white/50"}`}
                          >
                            <div className="text-[10px] font-black">{vs.name}</div>
                            <div className="text-[9px] opacity-55 mt-0.5">{vs.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview text */}
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Vista previa del texto</p>
                      <p className="text-white/70 text-xs italic leading-relaxed">"{quoteText}"</p>
                      {quoteRef && <p className="text-[#c5a059] text-[10px] font-black mt-2 uppercase tracking-widest">— {quoteRef}</p>}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── TAB: ELEMENTOS ── */}
            {activeTab === "elementos" && (
              <>
                <div className="space-y-2">
                  {[
                    { label: "Badge de estado",       sublabel: "Etiqueta de disponibilidad",  val: showBadge,     set: setShowBadge },
                    { label: "Plataformas streaming", sublabel: "Spotify, Apple Music, etc.",   val: showPlatforms, set: setShowPlatforms },
                    { label: "Logo de marca",         sublabel: "DIOSMASGYM RECORDS",           val: showLogo,      set: setShowLogo },
                    { label: "Línea separadora",      sublabel: "Divider entre artista y título", val: showDivider, set: setShowDivider },
                    { label: "Elementos decorativos", sublabel: "Esquinas, grain, líneas etc.", val: showDecor,     set: setShowDecor },
                  ].map(({ label, sublabel, val, set }) => (
                    <div key={label} className="flex items-center justify-between p-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl hover:border-white/10 transition-all">
                      <div>
                        <p className="text-xs font-bold text-white/75">{label}</p>
                        <p className="text-[9px] text-white/30 mt-0.5">{sublabel}</p>
                      </div>
                      <button onClick={() => set(!val)} className={`w-11 h-5.5 h-6 rounded-full border transition-all relative shrink-0 ${val ? "bg-[#c5a059] border-[#c5a059]" : "bg-white/[0.05] border-white/10"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${val ? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {showBadge && (
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Texto del badge</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {["YA DISPONIBLE", "PRÓXIMAMENTE", "ESTRENO HOY", "NUEVO", "EXCLUSIVO"].map(p => (
                        <button key={p} onClick={() => setBadgeText(p)}
                          className={`px-3 py-1.5 rounded-full text-[9px] font-black border transition-all ${badgeText === p ? "bg-[#c5a059] text-black border-[#c5a059]" : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:border-white/20 hover:text-white"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={badgeText} onChange={e => setBadgeText(e.target.value)} placeholder="O escribe uno personalizado..."
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-[#c5a059]/50 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors" />
                  </div>
                )}
              </>
            )}

          </div>
        </div>

        {/* ─── Right Panel: Canvas Preview ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-start p-6 gap-4 min-w-0">

          {/* Canvas info bar */}
          <div className="w-full flex items-center justify-between max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.45em] text-white/25">Vista Previa en Vivo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/20 text-[9px] font-black text-[#c5a059] uppercase tracking-widest">
                {W}×{H}px
              </span>
              <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] font-black text-white/30 uppercase tracking-widest">
                {style.emoji} {style.name}
              </span>
            </div>
          </div>

          {/* Canvas */}
          <div className="w-full max-w-3xl flex items-center justify-center bg-[#07090f] border border-white/[0.05] rounded-3xl p-6 shadow-2xl overflow-hidden"
            style={{ aspectRatio: W / H > 1.2 ? `${W}/${H}` : undefined, minHeight: 320 }}>
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-2xl shadow-2xl object-contain"
              style={{
                aspectRatio: `${W}/${H}`,
                maxHeight: W / H < 0.7 ? "72vh" : W / H > 1.5 ? "300px" : "65vh",
              }}
            />
          </div>

          {/* Download button secondary */}
          <button onClick={handleDownload} disabled={isDownloading}
            className="w-full max-w-3xl flex items-center justify-center gap-3 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-[#c5a059]/35 text-white/45 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all disabled:opacity-40">
            <i className="fas fa-arrow-down-to-line" />
            Descargar {aspect} — PNG Ultra HD Nítido
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomPromoCreator;
