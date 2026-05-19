import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { generateSocialCaption } from "../../services/geminiService";

const sizes = {
  instagram: { w: 500, h: 650, label: "Instagram Post" },
  story: { w: 500, h: 900, label: "Story / Reels" },
  post: { w: 900, h: 600, label: "Landscape" },
};

const MASTER_W = 3840;

const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const masterRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [bg, setBg] = useState<string | null>(null);
  const [title, setTitle] = useState("TÍTULO DE LA CANCIÓN");
  const [artist, setArtist] = useState("Diosmasgym");
  const [mode, setMode] = useState<"disponible" | "proximamente">("disponible");
  const [size, setSize] = useState<keyof typeof sizes>("instagram");
  const [overlay, setOverlay] = useState(0.6);
  const [textColor, setTextColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#c5a059");
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Share panel
  const [showShare, setShowShare] = useState(false);
  const [isGenCaption, setIsGenCaption] = useState(false);
  const [aiCaption, setAiCaption] = useState("");
  const [aiHashtags, setAiHashtags] = useState("");
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const cfg = sizes[size];

  // ── Image upload ──────────────────────────────────────
  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setBg(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  // ── Canvas capture ────────────────────────────────────
  const capture = async (targetW: number): Promise<HTMLCanvasElement> => {
    const el = masterRef.current?.querySelector(".cp-master") as HTMLElement;
    if (!el) throw new Error("No master element");
    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 600));
    return html2canvas(el, {
      scale: targetW / MASTER_W,
      useCORS: true, allowTaint: false, backgroundColor: null,
      onclone: (doc) => {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@700;900&display=swap";
        doc.head.appendChild(link);
      }
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = await capture(2160);
      const url = URL.createObjectURL(await new Promise<Blob>(r => canvas.toBlob(b => r(b!), "image/png", 1)));
      const a = document.createElement("a"); a.download = `CUSTOM-${title.replace(/\s+/g,"-")}.png`; a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) { alert("Error al exportar"); } finally { setIsExporting(false); }
  };

  const handleOpenShare = async () => {
    setShowShare(true); setAiCaption(""); setAiHashtags(""); setShareBlob(null); setIsGenCaption(true);
    const smartLink = `${window.location.origin}/#/`;
    try {
      const [result, canvas] = await Promise.all([
        generateSocialCaption(title, artist, smartLink),
        capture(1440)
      ]);
      setAiCaption(result.caption); setAiHashtags(result.hashtags);
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png", 0.92));
      if (blob) setShareBlob(blob);
    } catch {
      setAiCaption(`🎵 "${title}" de ${artist} — ¡Ya disponible!`);
      setAiHashtags(`#${title.replace(/\s+/g,"")} #${artist.replace(/\s+/g,"")} #DiosMasGym #NuevaMusica`);
    } finally { setIsGenCaption(false); }
  };

  const handleShare = async (platform: "facebook"|"twitter"|"instagram"|"tiktok") => {
    const smartLink = `${window.location.origin}/#/`;
    const shareText = `${aiCaption}\n\n${aiHashtags}`;
    const fullText = `${aiCaption}\n\n${smartLink}\n\n${aiHashtags}`;
    const fileName = `CUSTOM-${title.replace(/\s+/g,"-")}.png`;

    if (shareBlob && navigator.share && navigator.canShare) {
      const file = new File([shareBlob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files:[file], title, text: shareText, url: smartLink }); return; } catch {}
      }
    }

    let copied = false;
    if (shareBlob && typeof ClipboardItem !== "undefined") {
      try { await navigator.clipboard.write([new ClipboardItem({"image/png": shareBlob})]); copied = true; } catch {}
    }
    if (shareBlob) {
      const u = URL.createObjectURL(shareBlob); const a = document.createElement("a");
      a.download = fileName; a.href = u; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
    }
    try { await navigator.clipboard.writeText(fullText); } catch {}

    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.substring(0,220))}&url=${encodeURIComponent(smartLink)}`, "_blank");
    } else {
      const urls: Record<string,string> = { facebook:"https://www.facebook.com/", instagram:"https://www.instagram.com/", tiktok:"https://www.tiktok.com/upload" };
      window.open(urls[platform], "_blank");
    }
    const names: Record<string,string> = { facebook:"Facebook", twitter:"Twitter/X", instagram:"Instagram", tiktok:"TikTok" };
    setCopyMsg(copied ? `🖼️ Imagen copiada + descargada. ¡Pégala en ${names[platform]}!` : `📥 Imagen descargada. Súbela en ${names[platform]}.`);
    setTimeout(() => setCopyMsg(""), 5000);
  };

  // ── Render ────────────────────────────────────────────
  const ratio = cfg.w / cfg.h;
  const previewW = 360;
  const previewH = Math.round(previewW / ratio);

  return (
    <div className="min-h-screen bg-[#05070a] text-white font-['Inter']">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => navigate("/admin")} className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20">
          <i className="fas fa-chevron-left mr-2"></i>Panel
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
          Custom <span className="text-[#c5a059]">Promo</span> Creator
        </h1>
        <div className="w-20"/>
      </div>

      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Controls */}
        <div className="space-y-6">
          {/* Background Upload */}
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="relative rounded-2xl overflow-hidden transition-all cursor-pointer"
            style={{ border: `2px dashed ${isDragging ? "#c5a059" : "rgba(255,255,255,0.1)"}`, background: isDragging ? "rgba(197,160,89,0.05)" : "rgba(255,255,255,0.02)" }}
            onClick={() => document.getElementById("bg-file-input")?.click()}
          >
            <input id="bg-file-input" type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files?.[0]) loadFile(e.target.files[0]); }} />
            {bg ? (
              <div className="relative">
                <img src={bg} className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Cambiar Fondo</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <i className="fas fa-cloud-upload-alt text-4xl text-white/20"></i>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Arrastra o haz clic para subir tu fondo</div>
                <div className="text-[9px] text-white/15">JPG · PNG · WEBP</div>
              </div>
            )}
          </div>

          {/* Text Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Título de la Canción</label>
              <input value={title} onChange={e => setTitle(e.target.value.toUpperCase())} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all font-bold tracking-wider" />
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Artista</label>
              <select value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all">
                <option value="Diosmasgym">Diosmasgym</option>
                <option value="Juan 614">Juan 614</option>
              </select>
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Formato</label>
              <select value={size} onChange={e => setSize(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all">
                {Object.entries(sizes).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Estado</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all">
                <option value="disponible">Ya Disponible</option>
                <option value="proximamente">Próximo Estreno</option>
              </select>
            </div>
          </div>

          {/* Color controls */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Overlay</label>
              <input type="range" min="0" max="1" step="0.05" value={overlay} onChange={e => setOverlay(Number(e.target.value))} className="w-full accent-[#c5a059]" />
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Texto</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Acento</label>
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleDownload} disabled={!bg || isExporting} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-black transition-all active:scale-95 disabled:opacity-30" style={{ background: "#c5a059" }}>
              <i className="fas fa-download mr-2"></i>{isExporting ? "Exportando..." : "Descargar HD"}
            </button>
            <button onClick={handleOpenShare} disabled={!bg} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white transition-all active:scale-95 disabled:opacity-30" style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}>
              <i className="fas fa-rocket mr-2"></i>Compartir
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-[9px] uppercase font-black tracking-widest text-white/30">Vista Previa</div>
          <div style={{ width: previewW, height: previewH, position: "relative", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
            {bg && <img src={bg} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}
            <div style={{ position:"absolute", inset:0, background:`rgba(0,0,0,${overlay})` }} />
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:20 }}>
              <div style={{ fontSize:10, fontWeight:900, letterSpacing:"0.4em", color:accentColor, marginBottom:8 }}>{artist.toUpperCase()} RECORDS</div>
              <div style={{ fontSize:28, fontWeight:900, lineHeight:0.9, textAlign:"center", color:textColor, fontFamily:"'Bebas Neue',sans-serif" }}>{title}</div>
              <div style={{ marginTop:10, fontSize:8, fontWeight:900, letterSpacing:"0.4em", color:accentColor, padding:"4px 12px", border:`1px solid ${accentColor}44`, borderRadius:100 }}>
                {mode === "disponible" ? "YA DISPONIBLE" : "PRÓXIMO ESTRENO"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden master render for export */}
      <div ref={masterRef} style={{ position:"fixed", left:-99999, top:0, pointerEvents:"none", zIndex:-1 }}>
        <div className="cp-master" style={{ width:MASTER_W, height:Math.round(MASTER_W*(sizes[size].h/sizes[size].w)), position:"relative", overflow:"hidden" }}>
          {bg && <img src={bg} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} crossOrigin="anonymous" />}
          <div style={{ position:"absolute", inset:0, background:`rgba(0,0,0,${overlay})` }} />
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:MASTER_W*0.06 }}>
            <div style={{ fontSize:MASTER_W*0.018, fontWeight:900, letterSpacing:"0.4em", color:accentColor, marginBottom:MASTER_W*0.015 }}>{artist.toUpperCase()} RECORDS</div>
            <div style={{ fontSize:MASTER_W*0.1, fontWeight:900, lineHeight:0.85, textAlign:"center", color:textColor, fontFamily:"'Bebas Neue',sans-serif", textShadow:`0 0 80px ${accentColor}88` }}>{title}</div>
            <div style={{ marginTop:MASTER_W*0.02, fontSize:MASTER_W*0.014, fontWeight:900, letterSpacing:"0.5em", color:accentColor, padding:`${MASTER_W*0.008}px ${MASTER_W*0.03}px`, border:`2px solid ${accentColor}55`, borderRadius:MASTER_W }}>
              {mode === "disponible" ? "YA DISPONIBLE" : "PRÓXIMO ESTRENO"}
            </div>
            <div style={{ marginTop:MASTER_W*0.01, fontSize:MASTER_W*0.01, fontWeight:900, letterSpacing:"0.3em", color:textColor, opacity:0.5 }}>
              {artist.toLowerCase().includes("juan") ? "juan614.diosmasgym.com" : "musica.diosmasgym.com"}
            </div>
          </div>
        </div>
      </div>

      {/* SHARE PANEL */}
      {showShare && (
        <div className="fixed inset-0 z-[500] flex items-end lg:items-center justify-center" style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)" }} onClick={e => { if(e.target===e.currentTarget) setShowShare(false); }}>
          <div className="w-full max-w-2xl mx-auto rounded-t-[40px] lg:rounded-[32px] overflow-hidden" style={{ background:"linear-gradient(180deg,#0a0f1d 0%,#020617 100%)", border:"1px solid rgba(197,160,89,0.25)", maxHeight:"95vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}><i className="fas fa-rocket text-white"></i></div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest">Preparar para Redes</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">IA · Hashtags · Compartir</div>
                </div>
              </div>
              <button onClick={() => setShowShare(false)} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white"><i className="fas fa-times text-xs"></i></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Caption */}
              <div>
                <label className="text-[9px] uppercase font-black tracking-widest text-[#c5a059] flex items-center gap-2 mb-2"><i className="fas fa-wand-magic-sparkles"></i> Descripción IA</label>
                {isGenCaption ? (
                  <div className="space-y-2 p-5 rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                    {[1,0.85,0.7].map((w,i) => <div key={i} className="h-3 bg-white/5 rounded animate-pulse" style={{ width:`${w*100}%` }}/>)}
                  </div>
                ) : (
                  <textarea value={aiCaption} onChange={e => setAiCaption(e.target.value)} rows={5} className="w-full rounded-2xl p-4 text-[11px] text-white/80 leading-relaxed resize-none outline-none" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }} />
                )}
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-2">
                {aiHashtags.split(" ").filter(h => h.startsWith("#")).map((tag,i) => (
                  <span key={i} onClick={() => navigator.clipboard.writeText(tag)} className="px-3 py-1 rounded-full text-[9px] font-black cursor-pointer transition-all hover:scale-105" style={{ background:"rgba(197,160,89,0.15)", border:"1px solid rgba(197,160,89,0.25)", color:"#c5a059" }}>{tag}</span>
                ))}
              </div>

              {/* Toast */}
              {copyMsg && <div className="text-center py-3 rounded-xl text-[10px] font-black animate-pulse" style={{ background:"rgba(197,160,89,0.1)", color:"#c5a059", border:"1px solid rgba(197,160,89,0.2)" }}>{copyMsg}</div>}

              {/* Buttons */}
              <div className="space-y-3">
                <button onClick={async () => { try { await navigator.clipboard.writeText(`${aiCaption}\n\n${window.location.origin}/#/\n\n${aiHashtags}`); setCopyMsg("✅ Texto copiado"); setTimeout(()=>setCopyMsg(""),2500); } catch {} }} className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2" style={{ background:"rgba(197,160,89,0.12)", border:"1px solid rgba(197,160,89,0.3)", color:"#c5a059" }}>
                  <i className="fas fa-clipboard"></i> Copiar Descripción + Hashtags
                </button>
                <button onClick={async () => {
                  if (!shareBlob) return;
                  try { await navigator.clipboard.write([new ClipboardItem({"image/png":shareBlob})]); setCopyMsg("🖼️ ¡Imagen copiada!"); }
                  catch { const u=URL.createObjectURL(shareBlob),a=document.createElement("a"); a.download=`CUSTOM-${title}.png`; a.href=u; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000); setCopyMsg("📥 Imagen descargada"); }
                  setTimeout(()=>setCopyMsg(""),3000);
                }} disabled={!shareBlob} className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-40" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"white" }}>
                  <i className="fas fa-image"></i> {shareBlob ? "Copiar Imagen al Portapapeles" : "Generando imagen..."}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {([["facebook","Facebook","#1877F2,#0d5ebc","fa-facebook-f"],["twitter","Twitter/X","#111,#222","fa-x-twitter"],["instagram","Instagram","#833ab4,#fd1d1d,#fcb045","fa-instagram"],["tiktok","TikTok","#010101,#1a1a2e","fa-tiktok"]] as const).map(([p,label,grad,icon]) => (
                    <button key={p} onClick={() => handleShare(p as any)} disabled={isGenCaption} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 text-white disabled:opacity-40 transition-all active:scale-95" style={{ background:`linear-gradient(135deg,${grad})` }}>
                      <i className={`fab ${icon}`}></i>{label}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[8px] text-white/20 tracking-widest uppercase">📱 Móvil: comparte directo · 💻 Escritorio: descarga + copia texto</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPromoCreator;
