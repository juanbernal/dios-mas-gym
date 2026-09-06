import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog, deduplicateCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getHighResUrl } from "../../services/imageHelpers";

async function urlToDataUrl(src: string): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(getHighResUrl(src))}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("proxy " + res.status);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) { reject(new Error("no src")); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load error"));
    img.src = src;
  });
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function resolveTopWeeklySongs(items: MusicItem[], analyticsTitles: string[]): MusicItem[] {
  const dedup = deduplicateCatalog(items);
  if (analyticsTitles.length > 0) {
    const matched: MusicItem[] = [];
    for (const title of analyticsTitles) {
      if (!title || matched.length >= 5) break;
      const cleanTitle = title.trim().toLowerCase();
      const match = dedup.find(c => {
        const cName = (c.name || '').trim().toLowerCase();
        return cName === cleanTitle || cName.includes(cleanTitle) || cleanTitle.includes(cName);
      });
      if (match && !matched.some(m => m.id === match.id)) {
        matched.push(match);
      }
    }
    if (matched.length >= 5) return matched.slice(0, 5);
    const leftovers = dedup.filter(c => !matched.some(m => m.id === c.id));
    return [...matched, ...leftovers].slice(0, 5);
  }
  return dedup.slice(0, 5);
}

const Top5SocialGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [topSongs, setTopSongs] = useState<MusicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtitle, setSubtitle] = useState("DE LA SEMANA");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const [coversReady, setCoversReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [dM, j6] = await Promise.all([
        fetchMusicCatalog("diosmasgym").catch(() => []),
        fetchMusicCatalog("juan614").catch(() => [])
      ]);
      const full = deduplicateCatalog([...dM, ...j6]);
      setCatalog(full);

      // Obtener Top de la semana directamente de Analytics
      let analyticsTitles: string[] = [];
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            const songs = json.data.topSongs ? json.data.topSongs.map((s: any) => s.title) : [];
            const pages = json.data.topPages ? json.data.topPages.map((p: any) => p.title) : [];
            analyticsTitles = Array.from(new Set([...songs, ...pages])) as string[];
          }
        }
      } catch (err) {
        console.warn("Error cargando analíticas semanales:", err);
      }

      if (full.length > 0) {
        const top5 = resolveTopWeeklySongs(full, analyticsTitles);
        setTopSongs(top5);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (topSongs.length === 0) return;
    setCoversReady(false);
    const needed = topSongs.filter(s => s.cover && !coverDataUrls[s.id]);
    if (needed.length === 0) {
      setCoversReady(true);
      return;
    }

    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted) setCoversReady(true); // Don't block forever if a cover hangs
    }, 4500);

    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        needed.map(async s => {
          updates[s.id] = await urlToDataUrl(s.cover);
        })
      );
      if (isMounted) {
        setCoverDataUrls(prev => ({ ...prev, ...updates }));
        setCoversReady(true);
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [topSongs]);

  const handleAutoFill = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          const songs = json.data.topSongs ? json.data.topSongs.map((s: any) => s.title) : [];
          const pages = json.data.topPages ? json.data.topPages.map((p: any) => p.title) : [];
          const combined = Array.from(new Set([...songs, ...pages])) as string[];
          if (combined.length > 0) {
            const newTop = resolveTopWeeklySongs(catalog, combined);
            if (newTop.length > 0) {
              setTopSongs(newTop);
              setSubtitle("DE LA SEMANA");
              return;
            }
          }
        }
      }
      // Si no hay analíticas aún, usar las canciones principales deduplicadas
      const fallbackTop = deduplicateCatalog(catalog).slice(0, 5);
      if (fallbackTop.length > 0) {
        setTopSongs(fallbackTop);
        setSubtitle("DE LA SEMANA");
      } else {
        alert("Sin datos suficientes en catálogo.");
      }
    } catch {
      const fallbackTop = deduplicateCatalog(catalog).slice(0, 5);
      if (fallbackTop.length > 0) {
        setTopSongs(fallbackTop);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCatalog = catalog.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const handleSelectSong = (song: MusicItem) => {
    if (topSongs.length >= 5) { alert("Elimina una canción primero."); return; }
    if (topSongs.find(s => s.id === song.id)) return;
    setTopSongs([...topSongs, song]);
    setSearchQuery(""); setIsSearchOpen(false);
  };

  const moveSong = (i: number, dir: "up" | "down") => {
    const arr = [...topSongs];
    if (dir === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    else if (dir === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    setTopSongs(arr);
  };

  // ── Pure Canvas 2D export — no html2canvas ─────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (topSongs.length === 0) return;
    setIsGenerating(true);
    try {
      const W = 1080, H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // 1. Black base
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, W, H);

      // 2. Blurred background (first cover)
      const firstCover = coverDataUrls[topSongs[0]?.id];
      if (firstCover) {
        try {
          const bg = await loadImage(firstCover);
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.filter = "blur(40px)";
          ctx.drawImage(bg, -80, -80, W + 160, H + 160);
          ctx.restore();
          ctx.filter = "none";
        } catch {}
      }

      // 3. Dark gradient overlay
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0.88)");
      grad.addColorStop(0.45, "rgba(0,0,0,0.40)");
      grad.addColorStop(1, "rgba(0,0,0,0.97)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 4. Title "TOP 5"
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 20;
      ctx.font = "italic bold 155px Georgia,'Times New Roman',serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "right";
      ctx.fillText("TOP", W / 2 - 10, 60);
      ctx.fillStyle = "#c5a059";
      ctx.textAlign = "left";
      ctx.fillText("5", W / 2 + 10, 60);
      ctx.shadowBlur = 0;

      // 5. Subtitle pill
      if (subtitle) {
        const tx = subtitle;
        ctx.font = "bold 34px Arial,sans-serif";
        const tw = ctx.measureText(tx).width;
        const px = 50, py = 12, rx = (W - tw) / 2 - px, ry = 245;
        rrPath(ctx, rx, ry, tw + px * 2, 54, 27);
        ctx.fillStyle = "rgba(197,160,89,0.15)";
        ctx.fill();
        ctx.strokeStyle = "rgba(197,160,89,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tx, W / 2, ry + 27);
      }

      // 6. Song rows
      const rowH = 148, rowGap = 18, startY = 330, pad = 55;
      for (let i = 0; i < topSongs.length; i++) {
        const song = topSongs[i];
        const y = startY + i * (rowH + rowGap);

        // Row background
        rrPath(ctx, pad, y, W - pad * 2, rowH, 22);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fill();

        // Gold left border
        ctx.fillStyle = "#c5a059";
        ctx.fillRect(pad, y, 6, rowH);

        // Number
        ctx.font = "italic bold 74px Georgia,serif";
        ctx.fillStyle = "#c5a059";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), pad + 66, y + rowH / 2);

        // Cover thumbnail
        const cx = pad + 125, cy = y + 14, cs = rowH - 28;
        let coverDrawn = false;
        if (coverDataUrls[song.id]) {
          try {
            const img = await loadImage(coverDataUrls[song.id]);
            ctx.save();
            rrPath(ctx, cx, cy, cs, cs, 14);
            ctx.clip();
            ctx.drawImage(img, cx, cy, cs, cs);
            ctx.restore();
            coverDrawn = true;
          } catch {
            coverDrawn = false;
          }
        }

        if (!coverDrawn && song.cover) {
          try {
            const fallbackSrc = `/api/image-proxy?url=${encodeURIComponent(getHighResUrl(song.cover))}`;
            const img = await loadImage(fallbackSrc);
            ctx.save();
            rrPath(ctx, cx, cy, cs, cs, 14);
            ctx.clip();
            ctx.drawImage(img, cx, cy, cs, cs);
            ctx.restore();
            coverDrawn = true;
          } catch {
            coverDrawn = false;
          }
        }

        if (!coverDrawn) {
          ctx.fillStyle = "#161922";
          rrPath(ctx, cx, cy, cs, cs, 14);
          ctx.fill();
          ctx.fillStyle = "rgba(197,160,89,0.5)";
          ctx.font = "bold 38px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("♪", cx + cs / 2, cy + cs / 2);
        }

        // Song name
        const maxTW = W - pad * 2 - cs - 175;
        ctx.font = "bold 30px Arial,sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        let name = (song.name || "").toUpperCase();
        while (name.length > 3 && ctx.measureText(name).width > maxTW) name = name.slice(0, -4) + "…";
        ctx.fillText(name, cx + cs + 28, y + rowH / 2 - 22);

        // Artist
        ctx.font = "500 24px Arial,sans-serif";
        ctx.fillStyle = "#c5a059";
        let artist = (song.artist || "DIOS MAS GYM").toUpperCase();
        while (artist.length > 3 && ctx.measureText(artist).width > maxTW) artist = artist.slice(0, -4) + "…";
        ctx.fillText(artist, cx + cs + 28, y + rowH / 2 + 22);
      }

      // 7. Footer separator
      const footY = startY + 5 * (rowH + rowGap) + 24;
      const sepGrad = ctx.createLinearGradient(pad, 0, W - pad, 0);
      sepGrad.addColorStop(0, "rgba(255,255,255,0)");
      sepGrad.addColorStop(0.5, "rgba(255,255,255,0.22)");
      sepGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = sepGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, footY);
      ctx.lineTo(W - pad, footY);
      ctx.stroke();

      // Logo
      try {
        const logo = await loadImage("/logo-diosmasgym.png");
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.filter = "grayscale(1) brightness(3)";
        ctx.drawImage(logo, pad + 5, footY + 22, 66, 66);
        ctx.restore();
        ctx.filter = "none";
      } catch {}

      ctx.font = "bold 26px Arial,sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("DIOSMASGYM", pad + 82, footY + 55);

      // Platform dots
      const dots = [{ c: "#1DB954", x: W - 200 }, { c: "#FF0000", x: W - 145 }, { c: "#fc3c44", x: W - 90 }];
      dots.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, footY + 55, 22, 0, Math.PI * 2);
        ctx.fillStyle = d.c;
        ctx.fill();
      });
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", W - 200, footY + 55);
      ctx.fillText("▶", W - 145, footY + 55);
      ctx.fillText("♪", W - 90, footY + 55);

      // Trigger download reliably (support Blob with DataURL fallback)
      const downloadFileName = `TOP-5-${subtitle.replace(/[^a-zA-Z0-9]/g, "-") || "SEMANA"}-${Date.now()}.png`;

      const triggerDownload = (url: string) => {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        }, 1500);
      };

      try {
        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            triggerDownload(url);
          } else {
            const dataUrl = canvas.toDataURL("image/png");
            triggerDownload(dataUrl);
          }
        }, "image/png", 1.0);
      } catch {
        const dataUrl = canvas.toDataURL("image/png");
        triggerDownload(dataUrl);
      }

    } catch (e) {
      console.error("Canvas export error:", e);
      alert("Error al generar imagen: " + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [topSongs, coverDataUrls, subtitle]);

  const coverPreview = (song: MusicItem) =>
    coverDataUrls[song.id] || `/api/image-proxy?url=${encodeURIComponent(getHighResUrl(song.cover))}`;

  return (
    <div className="flex flex-col bg-[#05070a] min-h-screen text-white font-['Poppins'] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => navigate("/admin")}
          className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20">
          <i className="fas fa-chevron-left text-[8px]" /> Volver
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">
          TOP 5 <span className="text-[#c5a059]">CUSTOM MAKER</span>
        </h1>
        <div className="w-20" />
      </div>

      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#c5a059] mb-6">Configurar Top 5</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest mb-2 block">Subtítulo</label>
                <input className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-sm font-bold uppercase transition-all"
                  value={subtitle} onChange={e => setSubtitle(e.target.value.toUpperCase())} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleAutoFill} disabled={isLoading || catalog.length === 0}
                  className="w-full py-3 bg-[#c5a059]/15 border border-[#c5a059]/30 rounded-xl text-[10px] font-bold text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-colors flex items-center justify-center gap-2">
                  <i className={`fas ${isLoading ? "fa-spinner fa-spin" : "fa-chart-line"}`} /> Top Semanal (Analíticas)
                </button>
                <button onClick={loadInitialData} disabled={isLoading}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center gap-2">
                  <i className="fas fa-rotate-right" /> Recargar Todo
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest mb-2 block">
                  Agregar Canción ({topSongs.length}/5)
                </label>
                <div className="relative">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#c5a059]/40 text-xs pointer-events-none" />
                  <input type="text" placeholder="BUSCAR EN CATÁLOGO..."
                    className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest transition-all"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(e.target.value.length > 0); }}
                    disabled={topSongs.length >= 5} />
                </div>
                {isSearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl max-h-64 overflow-y-auto">
                    {filteredCatalog.map(song => (
                      <button key={song.id} onClick={() => handleSelectSong(song)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left">
                        <img src={coverPreview(song)} className="w-10 h-10 rounded-lg object-cover bg-black" alt="" />
                        <div>
                          <div className="text-[10px] font-black text-white/90 uppercase tracking-widest">{song.name}</div>
                          <div className="text-[8px] font-bold text-[#c5a059] uppercase">{song.artist}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected songs */}
              <div className="space-y-3">
                {topSongs.map((song, i) => (
                  <div key={song.id} className="flex items-center gap-3 bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-xs font-black text-[#c5a059] w-5 text-center">{i + 1}</span>
                    <div className="w-10 h-10 rounded overflow-hidden bg-black shrink-0 flex items-center justify-center">
                      {coverDataUrls[song.id]
                        ? <img src={coverDataUrls[song.id]} className="w-full h-full object-cover" alt="" />
                        : <i className="fas fa-spinner fa-spin text-[#c5a059]/40 text-[10px]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate uppercase">{song.name}</p>
                      <p className="text-[8px] text-white/50 truncate uppercase">{song.artist}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveSong(i, "up")} disabled={i === 0} className="text-white/30 hover:text-white disabled:opacity-20"><i className="fas fa-chevron-up text-[10px]" /></button>
                      <button onClick={() => moveSong(i, "down")} disabled={i === topSongs.length - 1} className="text-white/30 hover:text-white disabled:opacity-20"><i className="fas fa-chevron-down text-[10px]" /></button>
                    </div>
                    <button onClick={() => setTopSongs(topSongs.filter(s => s.id !== song.id))}
                      className="w-8 h-8 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10">
                      <i className="fas fa-times" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Status + Download */}
              {topSongs.length > 0 && (
                <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${coversReady ? "text-green-400" : "text-[#c5a059]"}`}>
                  <i className={`fas ${coversReady ? "fa-check-circle" : "fa-spinner fa-spin"}`} />
                  {coversReady ? "Imágenes listas · Canvas 2D export" : "Pre-cargando imágenes..."}
                </p>
              )}

              <button onClick={handleDownload}
                disabled={isLoading || isGenerating || topSongs.length === 0 || !coversReady}
                className="w-full py-5 bg-[#c5a059] text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-3 shadow-lg disabled:opacity-40">
                {isGenerating ? <><i className="fas fa-spinner fa-spin" /> Generando...</> : <><i className="fas fa-download" /> Descargar Imagen HD</>}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-7 flex justify-center items-start overflow-hidden">
          <div ref={previewRef} style={{ width:"1080px", transformOrigin:"top center" }} className="scale-[0.45] md:scale-[0.55] lg:scale-[0.6] origin-top">
            <div className="relative bg-[#020202] overflow-hidden" style={{ width:"1080px", height:"1350px" }}>
              {topSongs[0] && coverDataUrls[topSongs[0].id] && (
                <img src={coverDataUrls[topSongs[0].id]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" style={{ filter:"blur(30px)", transform:"scale(1.1)" }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-black/95" />

              <div className="relative z-10 flex flex-col items-center h-full py-12 px-16">
                <div className="text-center mb-8">
                  <h1 className="text-[140px] font-serif italic text-white leading-[1] tracking-tighter drop-shadow-2xl">
                    TOP <span className="text-[#c5a059]">5</span>
                  </h1>
                  {subtitle && (
                    <p className="text-4xl font-black uppercase tracking-[0.4em] text-white/70 mt-4 bg-[#c5a059]/10 py-3 px-8 rounded-full border border-[#c5a059]/30 inline-block">{subtitle}</p>
                  )}
                </div>

                <div className="w-full max-w-4xl space-y-4 flex-1 flex flex-col justify-center">
                  {topSongs.map((song, i) => (
                    <div key={song.id} className="flex items-center gap-8 bg-white/10 p-5 rounded-3xl border-l-4 border-[#c5a059] shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />
                      <div className="text-6xl font-serif italic text-[#c5a059] w-16 text-center shrink-0">{i + 1}</div>
                      <div className="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-black flex items-center justify-center z-10">
                        {coverDataUrls[song.id]
                          ? <img src={coverDataUrls[song.id]} className="w-full h-full object-cover" alt="" />
                          : <i className="fas fa-music text-white/20 text-3xl" />}
                      </div>
                      <div className="flex-1 z-10 min-w-0 pr-4">
                        <h3 className="text-3xl font-bold text-white mb-2 uppercase tracking-wide leading-tight truncate">{song.name}</h3>
                        <p className="text-xl font-medium text-[#c5a059] uppercase tracking-widest">{song.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-full mt-auto flex flex-col items-center pt-6">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />
                  <div className="flex items-center justify-between w-full max-w-4xl px-4">
                    <div className="flex items-center gap-5">
                      <img src="/logo-diosmasgym.png" className="w-16 h-16 grayscale brightness-200" alt="" />
                      <span className="text-2xl font-black uppercase tracking-widest text-white">DIOSMASGYM</span>
                    </div>
                    <div className="flex items-center gap-4 text-4xl">
                      <i className="fa-brands fa-spotify text-[#1DB954]" />
                      <i className="fa-brands fa-youtube text-[#FF0000]" />
                      <i className="fa-brands fa-apple text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Top5SocialGenerator;
