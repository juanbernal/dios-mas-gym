import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { generateSocialCaption } from "../../services/geminiService";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getCorsFriendlyUrl } from "../../services/imageHelpers";

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

  // Template select: modern | scrapbook | grunge | vinyl | cyberpunk | editorial
  const [template, setTemplate] = useState<"modern" | "scrapbook" | "grunge" | "vinyl" | "cyberpunk" | "editorial">("scrapbook");

  // Customized Template Fields
  const [polaroidQuote, setPolaroidQuote] = useState("A veces, una canción dice lo que no podemos explicar. ♡");
  const [sideNote, setSideNote] = useState("Música que se siente, letras que se quedan. ♡");
  const [phrase1, setPhrase1] = useState("No hay montaña lo suficientemente alta...");
  const [phrase2, setPhrase2] = useState("Cada acorde cuenta nuestra historia...");
  const [phrase3, setPhrase3] = useState("El amor es la respuesta a todo...");
  const [footerQuote, setFooterQuote] = useState("Dale play y siente. ♡");
  const [aboutText, setAboutText] = useState("Una melodía inspiradora que habla sobre la fe, la superación y encontrar la luz en los momentos difíciles.");

  // Catalog
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [songId, setSongId] = useState<string>("");
  const [songAbout, setSongAbout] = useState("");
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);

  // Share panel
  const [showShare, setShowShare] = useState(false);
  const [isGenCaption, setIsGenCaption] = useState(false);
  const [aiCaption, setAiCaption] = useState("");
  const [aiHashtags, setAiHashtags] = useState("");
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [aiError, setAiError] = useState("");

  const cfg = sizes[size];

  // Inject Fonts dynamically into main preview window
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=Satisfy&family=Permanent+Marker&family=Special+Elite&family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@700;900&family=Orbitron:wght@700;900&family=Cormorant+Garamond:ital,wght@0,600;1,400&display=swap";
    document.head.appendChild(link);
  }, []);

  // Fetch Catalog
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

  const autoFetchLyrics = async (songName: string, songArtist: string) => {
    setIsSearchingLyrics(true);
    try {
      const response = await fetch("/api/search-lyrics", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": localStorage.getItem("admin_password") || ""
        },
        body: JSON.stringify({ name: songName, artist: songArtist })
      });
      const data = await response.json();
      if (response.ok && data.lyrics && data.lyrics !== "LETRA_NO_ENCONTRADA") {
        setSongAbout(data.lyrics);
        
        // Extract phrases automatically from lyrics
        const lines = data.lyrics.split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith("["));
        
        if (lines.length > 0) setPhrase1(lines[0].length > 42 ? lines[0].substring(0, 40) + "..." : lines[0]);
        if (lines.length > 1) setPhrase2(lines[1].length > 42 ? lines[1].substring(0, 40) + "..." : lines[1]);
        if (lines.length > 2) setPhrase3(lines[2].length > 42 ? lines[2].substring(0, 40) + "..." : lines[2]);
      }
    } catch (e) {
      console.error("Error auto-fetching lyrics:", e);
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  const handleSearchLyrics = async () => {
    if (!title) return;
    setIsSearchingLyrics(true);
    try {
      const response = await fetch("/api/search-lyrics", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-password": localStorage.getItem("admin_password") || ""
        },
        body: JSON.stringify({ name: title, artist })
      });
      const data = await response.json();
      if (response.ok && data.lyrics && data.lyrics !== "LETRA_NO_ENCONTRADA") {
        setSongAbout(data.lyrics);
        
        // Extract phrases automatically from lyrics
        const lines = data.lyrics.split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0 && !l.startsWith("["));
        
        if (lines.length > 0) setPhrase1(lines[0].length > 42 ? lines[0].substring(0, 40) + "..." : lines[0]);
        if (lines.length > 1) setPhrase2(lines[1].length > 42 ? lines[1].substring(0, 40) + "..." : lines[1]);
        if (lines.length > 2) setPhrase3(lines[2].length > 42 ? lines[2].substring(0, 40) + "..." : lines[2]);
        
        alert("¡Letra cargada y frases actualizadas automáticamente!");
      } else {
        alert("No se encontró la letra automática. Puedes escribir de qué trata manualmente.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al buscar la letra. Escríbela manualmente.");
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  const handleSelectSong = (song: MusicItem) => {
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    setTitle(song.name.toUpperCase());
    setArtist(normalizedArtist);
    setSongId(song.id || "");
    if (song.cover) setBg(song.cover);
    setSearchQuery("");
    setIsSearchOpen(false);
    
    // Custom pre-populated values
    setAboutText(`Un gran lanzamiento promocional de ${normalizedArtist} titulado "${song.name}". Escúchalo ahora.`);
    setPhrase1(`Escucha "${song.name}" de ${normalizedArtist}...`);
    setPhrase2("La mejor música para alabar y motivar tu día.");
    setPhrase3("Disponible ahora en todas las plataformas.");
    
    setSongAbout("");
    autoFetchLyrics(song.name, normalizedArtist);
  };

  const getSmartLink = useCallback(() => {
    if (songId) return `${window.location.origin}/#/link/${songId}`;
    return artist.toLowerCase().includes('juan')
      ? 'https://juan614.diosmasgym.com'
      : 'https://musica.diosmasgym.com';
  }, [songId, artist]);

  // Image upload
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

  // Canvas capture
  const capture = async (targetW: number): Promise<HTMLCanvasElement> => {
    const el = masterRef.current?.querySelector(".cp-master") as HTMLElement;
    if (!el) throw new Error("No master element");
    
    // 1. Force Load ALL Images in the Master Render
    const images = Array.from(el.querySelectorAll('img, [style*="background-image"]'));
    await Promise.all(images.map(img => {
      let src = "";
      if (img instanceof HTMLImageElement) {
        src = img.src;
      } else {
        const bgStyle = (img as HTMLElement).style.backgroundImage;
        const match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        src = match ? match[1] : "";
      }
      
      if (!src || src === 'none' || src === '""') return Promise.resolve();
      
      return new Promise(resolve => {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        const t = setTimeout(() => resolve(false), 20000); 
        testImg.onload = () => { clearTimeout(t); resolve(true); };
        testImg.onerror = () => { clearTimeout(t); resolve(false); };
        testImg.src = src;
      });
    }));

    // 1.5 Stabilization Wait (Browser rasterization at high-res)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Wait for fonts
    await document.fonts.ready;
    
    return html2canvas(el, {
      scale: targetW / MASTER_W,
      useCORS: true, allowTaint: false, backgroundColor: null,
      onclone: (doc) => {
        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=Satisfy&family=Permanent+Marker&family=Special+Elite&family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@700;900&family=Orbitron:wght@700;900&family=Cormorant+Garamond:ital,wght@0,600;1,400&display=swap";
        doc.head.appendChild(link);

        const clonedWrapper = doc.querySelector('.cp-master') as HTMLElement;
        if (clonedWrapper) {
          clonedWrapper.style.transform = 'none';
          clonedWrapper.style.boxShadow = 'none';
          clonedWrapper.style.width = `${MASTER_W}px`;
          clonedWrapper.style.height = `${Math.round(MASTER_W * (sizes[size].h / sizes[size].w))}px`;
          clonedWrapper.style.display = 'block';
        }
      }
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = await capture(MASTER_W);
      const url = URL.createObjectURL(await new Promise<Blob>(r => canvas.toBlob(b => r(b!), "image/png", 1)));
      const a = document.createElement("a"); a.download = `CUSTOM-${title.replace(/\s+/g,"-")}.png`; a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) { alert("Error al exportar"); } finally { setIsExporting(false); }
  };

  const handleOpenShare = async () => {
    setShowShare(true); setAiCaption(""); setAiHashtags(""); setShareBlob(null); setAiError(""); setIsGenCaption(true);
    const smartLink = getSmartLink();
    try {
      const capturePromise = bg ? capture(1440) : Promise.resolve(null);
      const [result, canvas] = await Promise.all([
        generateSocialCaption(title, artist, smartLink, 'Instagram/TikTok', songAbout),
        capturePromise
      ]);
      setAiCaption(result.caption); setAiHashtags(result.hashtags);
      if (canvas) {
        const blob = await new Promise<Blob | null>(r => (canvas as HTMLCanvasElement).toBlob(r, "image/png", 0.92));
        if (blob) setShareBlob(blob);
      }
    } catch (err: any) {
      console.error('[Share] AI error:', err);
      const errorMsg = err?.message || 'Error al conectar con la IA';
      setAiError(errorMsg);
      // Fallback text
      setAiCaption(`🎵 "${title}" de ${artist} — ¡Ya disponible! Escúchalo ahora en todas las plataformas.`);
      setAiHashtags(`#${title.replace(/\s+/g,"")} #${artist.replace(/\s+/g,"")} #DiosMasGym #NuevaMusica #MusicaCristiana`);
    } finally { setIsGenCaption(false); }
  };

  const handleShare = async (platform: "facebook"|"twitter"|"instagram"|"tiktok") => {
    const smartLink = getSmartLink();
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

  const filteredCatalog = catalog.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const ratio = cfg.w / cfg.h;
  const previewW = 360;
  const previewH = Math.round(previewW / ratio);

  return (
    <div className="min-h-screen bg-[#05070a] text-white font-['Inter']">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button onClick={() => navigate("/admin")} className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20 transition-all hover:bg-[#c5a059]/20">
          <i className="fas fa-chevron-left mr-2"></i>Volver al Panel
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
          Custom <span className="text-[#c5a059]">Promo</span> Creator
        </h1>
        <div className="w-20"/>
      </div>

      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Visual Template Selector */}
          <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-3">
            <label className="text-[9px] uppercase font-black tracking-widest text-[#c5a059] block">
              <i className="fas fa-palette mr-1.5"></i> Estilos de Plantillas Premium
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: "modern", name: "Modern Minimal", desc: "Diseño minimalista y limpio", icon: "fa-sliders" },
                { id: "scrapbook", name: "Beige Scrapbook", desc: "Polaroid, apuntes y café", icon: "fa-book-open" },
                { id: "grunge", name: "Urban Grunge", desc: "Estilo corrido, banda y oro", icon: "fa-guitar" },
                { id: "vinyl", name: "Retro Vinyl", desc: "Disco de vinilo giratorio", icon: "fa-compact-disc" },
                { id: "cyberpunk", name: "Neon Cyberpunk", desc: "Synthwave, rejilla y glow", icon: "fa-bolt" },
                { id: "editorial", name: "Luxury Editorial", desc: "Minimalista, serif y revista", icon: "fa-newspaper" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id as any)}
                  className={`p-4 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-3 ${
                    template === t.id
                      ? "border-[#c5a059] bg-[#c5a059]/10 text-white shadow-lg shadow-[#c5a059]/10 scale-102"
                      : "border-white/5 bg-white/2 text-white/60 hover:border-white/10 hover:bg-white/4"
                  }`}
                >
                  <i className={`fas ${t.icon} text-lg ${template === t.id ? "text-[#c5a059]" : "text-white/30"}`}></i>
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-wider">{t.name}</div>
                    <div className="text-[7px] text-white/40 font-medium leading-tight mt-0.5">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Song Selector */}
          <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fas fa-music"></i> Seleccionar de Catálogo
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20">
                <i className="fas fa-search text-xs"></i>
              </div>
              <input 
                type="text"
                placeholder="BUSCAR CANCIÓN DEL ARTISTA..."
                className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-3 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-medium tracking-wide transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
              />
              
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl animate-fade-in">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handleSelectSong(song)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left"
                      >
                        <img src={song.cover} className="w-10 h-10 rounded-lg object-cover bg-black" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-white/90 truncate uppercase tracking-widest">{song.name}</div>
                          <div className="text-[8px] font-bold text-[#c5a059] truncate uppercase tracking-widest">{song.artist}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">No se encontraron temas</div>
                  )}
                </div>
              )}
            </div>
          </div>

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
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Cambiar Portada / Fondo</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <i className="fas fa-cloud-upload-alt text-4xl text-white/20"></i>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Arrastra o haz clic para subir Portada</div>
                <div className="text-[9px] text-white/15">JPG · PNG · WEBP</div>
              </div>
            )}
          </div>

          {/* Core Fields */}
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

          {/* Custom Template Editor Fields (Scrapbook, Vinyl, Cyberpunk, Editorial) */}
          {(template === "scrapbook" || template === "vinyl") && (
            <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-4 animate-fade-in">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-pencil-alt"></i> Personalización del Estilo Rústico / Retro
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Nota/Subtítulo (Polaroid / Vinyl Sleeve)</label>
                  <input value={polaroidQuote} onChange={e => setPolaroidQuote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                </div>
                
                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Nota Adhesiva (Top-Right / Retro details)</label>
                  <input value={sideNote} onChange={e => setSideNote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                </div>

                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Sobre la Canción (Texto Ruled)</label>
                  <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80 leading-normal resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Frase 1</label>
                    <input value={phrase1} onChange={e => setPhrase1(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Frase 2</label>
                    <input value={phrase2} onChange={e => setPhrase2(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Frase 3</label>
                    <input value={phrase3} onChange={e => setPhrase3(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Lema/Firma en Pie (Footer)</label>
                  <input value={footerQuote} onChange={e => setFooterQuote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                </div>
              </div>
            </div>
          )}

          {(template === "grunge" || template === "cyberpunk" || template === "editorial") && (
            <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-4 animate-fade-in">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-sliders-h"></i> Personalización de Estilo Urbano / Premium
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Detalle de Resumen / Editorial / Subtítulo</label>
                  <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80 leading-normal resize-none" />
                </div>

                <div>
                  <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Lema Destacado / Firma de Apoyo (Gold / Neon / Serif)</label>
                  <input value={footerQuote} onChange={e => setFooterQuote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Slogan / Código Destacado 1</label>
                    <input value={phrase1} onChange={e => setPhrase1(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black tracking-widest text-white/40 mb-1 block">Slogan / Código Destacado 2</label>
                    <input value={phrase2} onChange={e => setPhrase2(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-xs outline-none focus:border-[#c5a059] text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details and Lyrics fetch */}
          <div className="bg-white/3 p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40">Descripción contextual para IA</label>
              <button 
                type="button"
                onClick={handleSearchLyrics}
                disabled={isSearchingLyrics || !title}
                className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 hover:bg-[#c5a059]/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {isSearchingLyrics ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i> Cargando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-wand-magic-sparkles"></i> Sincronizar Letras
                  </>
                )}
              </button>
            </div>
            <textarea 
              value={songAbout} 
              onChange={e => setSongAbout(e.target.value)} 
              placeholder="Pega la letra o escribe notas adicionales sobre el tema. La IA usará esto para crear captions hiper-enfocadas." 
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-[#c5a059] transition-all text-white/80 leading-relaxed resize-none"
            />
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Formato</label>
              <select value={size} onChange={e => setSize(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all font-bold">
                {Object.entries(sizes).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Estado</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#c5a059] transition-all font-bold">
                <option value="disponible">Ya Disponible</option>
                <option value="proximamente">Próximo Estreno</option>
              </select>
            </div>
          </div>

          {/* Color controls */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Fondo Oscuro</label>
              <input type="range" min="0" max="1" step="0.05" value={overlay} onChange={e => setOverlay(Number(e.target.value))} className="w-full accent-[#c5a059]" />
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Color Texto</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            </div>
            <div>
              <label className="text-[9px] uppercase font-black tracking-widest text-white/40 mb-2 block">Color Acento</label>
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={handleDownload} disabled={!bg || isExporting} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg" style={{ background: "#c5a059" }}>
              <i className="fas fa-download"></i>{isExporting ? "Generando 4K..." : "Descargar Master 4K"}
            </button>
            <button onClick={handleOpenShare} disabled={!title} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg" style={{ background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}>
              <i className="fas fa-paper-plane"></i>Compartir Redes
            </button>
          </div>
        </div>

        {/* RIGHT: Visual Preview (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4 sticky top-24">
          <div className="text-[9px] uppercase font-black tracking-widest text-white/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Vista Previa Escala Real
          </div>
          
          <div style={{ width: previewW, height: previewH, position: "relative", overflow: "hidden", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
            <div style={{
              width: cfg.w,
              height: cfg.h,
              transform: `scale(${previewW / cfg.w})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0
            }}>
              <PromoCard
                width={cfg.w}
                height={cfg.h}
                bg={bg}
                title={title}
                artist={artist}
                mode={mode}
                overlay={overlay}
                textColor={textColor}
                accentColor={accentColor}
                template={template}
                polaroidQuote={polaroidQuote}
                sideNote={sideNote}
                phrase1={phrase1}
                phrase2={phrase2}
                phrase3={phrase3}
                footerQuote={footerQuote}
                aboutText={aboutText}
                getSmartLink={getSmartLink}
                size={size}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden master render for export (High Definition) */}
      <div 
        ref={masterRef} 
        style={{ 
          position: "fixed", 
          left: -8000, 
          top: -8000, 
          width: MASTER_W,
          pointerEvents: "none", 
          zIndex: -5000,
          opacity: 1,
          visibility: "visible",
          overflow: "hidden",
          background: "#000"
        }}
      >
        <div className="cp-master" style={{ width: MASTER_W, height: Math.round(MASTER_W * (sizes[size].h / sizes[size].w)), position: "relative", overflow: "hidden" }}>
          <PromoCard
            width={MASTER_W}
            height={Math.round(MASTER_W * (sizes[size].h / sizes[size].w))}
            bg={bg}
            title={title}
            artist={artist}
            mode={mode}
            overlay={overlay}
            textColor={textColor}
            accentColor={accentColor}
            template={template}
            polaroidQuote={polaroidQuote}
            sideNote={sideNote}
            phrase1={phrase1}
            phrase2={phrase2}
            phrase3={phrase3}
            footerQuote={footerQuote}
            aboutText={aboutText}
            getSmartLink={getSmartLink}
            size={size}
          />
        </div>
      </div>

      {/* SHARE PANEL */}
      {showShare && (
        <div className="fixed inset-0 z-[500] flex items-end lg:items-center justify-center" style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)" }} onClick={e => { if(e.target===e.currentTarget) setShowShare(false); }}>
          <div className="w-full max-w-2xl mx-auto rounded-t-[40px] lg:rounded-[32px] overflow-hidden animate-fade-in-up" style={{ background:"linear-gradient(180deg,#0a0f1d 0%,#020617 100%)", border:"1px solid rgba(197,160,89,0.25)", maxHeight:"95vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" }}><i className="fas fa-rocket text-white"></i></div>
                <div>
                  <div className="text-sm font-black uppercase tracking-widest">Preparar para Redes</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">IA · Hashtags · Compartir</div>
                </div>
              </div>
              <button onClick={() => setShowShare(false)} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"><i className="fas fa-times text-xs"></i></button>
            </div>

            <div className="p-6 space-y-5">
              {aiError && (
                <div className="p-4 rounded-xl text-[10px] font-black uppercase tracking-widest" style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6060" }}>
                  <i className="fas fa-exclamation-triangle mr-2"></i>Error IA: {aiError}
                  <div className="mt-1 text-[9px] opacity-70 normal-case tracking-normal">Se usó un texto alternativo. Puedes editarlo manualmente.</div>
                </div>
              )}
              
              <div>
                <label className="text-[9px] uppercase font-black tracking-widest text-[#c5a059] flex items-center gap-2 mb-2"><i className="fas fa-wand-magic-sparkles"></i> Descripción IA Generada</label>
                {isGenCaption ? (
                  <div className="space-y-2 p-5 rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)" }}>
                    {[1,0.85,0.7].map((w,i) => <div key={i} className="h-3 bg-white/5 rounded animate-pulse" style={{ width:`${w*100}%` }}/>)}
                  </div>
                ) : (
                  <textarea value={aiCaption} onChange={e => setAiCaption(e.target.value)} rows={5} className="w-full rounded-2xl p-4 text-[11px] text-white/80 leading-relaxed resize-none outline-none focus:border-[#c5a059]" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }} />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {aiHashtags.split(" ").filter(h => h.startsWith("#")).map((tag,i) => (
                  <span key={i} onClick={() => { navigator.clipboard.writeText(tag); setCopyMsg(`Copiado: ${tag}`); setTimeout(()=>setCopyMsg(""), 1500); }} className="px-3 py-1 rounded-full text-[9px] font-black cursor-pointer transition-all hover:scale-105 active:scale-95" style={{ background:"rgba(197,160,89,0.15)", border:"1px solid rgba(197,160,89,0.25)", color:"#c5a059" }}>{tag}</span>
                ))}
              </div>

              {copyMsg && <div className="text-center py-3 rounded-xl text-[10px] font-black animate-pulse" style={{ background:"rgba(197,160,89,0.1)", color:"#c5a059", border:"1px solid rgba(197,160,89,0.2)" }}>{copyMsg}</div>}

              <div className="space-y-3">
                <button onClick={async () => { try { await navigator.clipboard.writeText(`${aiCaption}\n\n${getSmartLink()}\n\n${aiHashtags}`); setCopyMsg("✅ Texto copiado"); setTimeout(()=>setCopyMsg(""),2500); } catch {} }} className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-[#c5a059]/20" style={{ background:"rgba(197,160,89,0.12)", border:"1px solid rgba(197,160,89,0.3)", color:"#c5a059" }}>
                  <i className="fas fa-clipboard"></i> Copiar Descripción + Enlace Promocional
                </button>
                <button onClick={async () => {
                  if (!shareBlob) return;
                  try { await navigator.clipboard.write([new ClipboardItem({"image/png":shareBlob})]); setCopyMsg("🖼️ ¡Imagen copiada al portapapeles!"); }
                  catch { const u=URL.createObjectURL(shareBlob),a=document.createElement("a"); a.download=`CUSTOM-${title}.png`; a.href=u; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000); setCopyMsg("📥 Imagen descargada"); }
                  setTimeout(()=>setCopyMsg(""),3000);
                }} disabled={!shareBlob} className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:bg-white/10" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"white" }}>
                  <i className="fas fa-image"></i> {shareBlob ? "Copiar Imagen al Portapapeles" : "Generando imagen..."}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {([["facebook","Facebook","#1877F2,#0d5ebc","fa-facebook-f"],["twitter","Twitter/X","#111,#222","fa-x-twitter"],["instagram","Instagram","#833ab4,#fd1d1d,#fcb045","fa-instagram"],["tiktok","TikTok","#010101,#1a1a2e","fa-tiktok"]] as const).map(([p,label,grad,icon]) => (
                    <button key={p} onClick={() => handleShare(p as any)} disabled={isGenCaption} className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 text-white disabled:opacity-40 transition-all active:scale-95 hover:brightness-110" style={{ background:`linear-gradient(135deg,${grad})` }}>
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

// ── RENDER ENGINE FOR BOTH PREVIEW AND MASTER ────────────────────────────────
const PromoCard: React.FC<{
  width: number;
  height: number;
  bg: string | null;
  title: string;
  artist: string;
  mode: "disponible" | "proximamente";
  overlay: number;
  textColor: string;
  accentColor: string;
  template: "modern" | "scrapbook" | "grunge" | "vinyl" | "cyberpunk" | "editorial";
  polaroidQuote: string;
  sideNote: string;
  phrase1: string;
  phrase2: string;
  phrase3: string;
  footerQuote: string;
  aboutText: string;
  getSmartLink: () => string;
  size: "instagram" | "story" | "post";
}> = ({
  width, height, bg, title, artist, mode, overlay, textColor, accentColor, template,
  polaroidQuote, sideNote, phrase1, phrase2, phrase3, footerQuote, aboutText, getSmartLink, size
}) => {
  const scale = width / 1080;
  const isStory = size === "story";
  const isLandscape = size === "post";

  // ── 1. BEIGE SCRAPBOOK TEMPLATE (UPGRADED HIGH FIDELITY) ──────────────────────
  if (template === "scrapbook") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(circle, #f4eee1 0%, #dbcea9 100%)",
        color: "#4e3f30",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Fine paper grain structure */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />

        {/* Coffee cup stain ring (High-fidelity rústico detail) */}
        <div style={{
          position: "absolute",
          right: -40 * scale,
          bottom: 120 * scale,
          width: 250 * scale,
          height: 250 * scale,
          borderRadius: "50%",
          border: `${3 * scale}px solid rgba(92, 77, 60, 0.08)`,
          transform: "rotate(35deg)",
          pointerEvents: "none",
          filter: "blur(0.5px)"
        }} />
        <div style={{
          position: "absolute",
          right: -32 * scale,
          bottom: 128 * scale,
          width: 232 * scale,
          height: 232 * scale,
          borderRadius: "50%",
          border: `${1.5 * scale}px dashed rgba(92, 77, 60, 0.05)`,
          transform: "rotate(10deg)",
          pointerEvents: "none"
        }} />

        {/* Hanging Ivy/Leaf sprigs SVGs */}
        <svg style={{ position: "absolute", right: 25 * scale, top: 45 * scale, width: 150 * scale, height: 150 * scale, opacity: 0.14, pointerEvents: "none" }} viewBox="0 0 100 100" fill="none" stroke="#5c4d3c" strokeWidth="1.5">
          <path d="M10,90 Q40,60 90,10 M30,70 Q20,50 15,55 M50,50 Q40,30 35,35 M70,30 Q60,10 55,15 M90,10 Q80,-5 78,0" />
        </svg>

        {/* Hearts and sparkles */}
        <div style={{ position: "absolute", left: "6%", top: "7%", fontFamily: "'Caveat', cursive", fontSize: 32 * scale, opacity: 0.4, color: "#8a583a" }}>♡</div>
        <div style={{ position: "absolute", right: "12%", bottom: "16%", fontFamily: "'Caveat', cursive", fontSize: 36 * scale, opacity: 0.4, color: "#8a583a" }}>♡</div>
        <div style={{ position: "absolute", left: "42%", top: "25%", fontFamily: "'Caveat', cursive", fontSize: 24 * scale, opacity: 0.3, color: "#7a6953" }}>✦</div>
        <div style={{ position: "absolute", right: "32%", bottom: "35%", fontFamily: "'Caveat', cursive", fontSize: 28 * scale, opacity: 0.3, color: "#7a6953" }}>✦</div>

        {/* TOP HEADER */}
        <div style={{
          position: "absolute",
          left: 50 * scale,
          top: isStory ? 70 * scale : 45 * scale,
          width: 980 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24 * scale,
            fontWeight: "bold",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#6e5d48"
          }}>
            Te Recomiendo
          </div>
          <div style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: 54 * scale,
            color: "#8b6f4e",
            marginTop: -8 * scale,
            transform: "rotate(-1.5deg)"
          }}>
            esta canción
          </div>
        </div>

        {/* TOP RIGHT MASKING TAPE STICKY NOTE */}
        {(!isLandscape) && (
          <div style={{
            position: "absolute",
            right: isStory ? 50 * scale : 70 * scale,
            top: isStory ? 200 * scale : 130 * scale,
            width: 210 * scale,
            padding: 15 * scale,
            background: "#ebe2cf",
            border: `${1 * scale}px solid #d4c7b0`,
            borderRadius: "3px 15px 5px 12px / 10px 5px 12px 15px", // Hand torn paper outline
            boxShadow: `3px 5px 15px rgba(92,77,60,0.08)`,
            transform: "rotate(3deg)",
            zIndex: 15
          }}>
            {/* Masking tape top center */}
            <div style={{
              position: "absolute",
              top: -14 * scale,
              left: "25%",
              width: 90 * scale,
              height: 22 * scale,
              background: "linear-gradient(135deg, rgba(235,220,195,0.85) 0%, rgba(225,210,180,0.85) 100%)",
              transform: "rotate(-2deg)",
              borderLeft: "1px dashed rgba(0,0,0,0.1)",
              borderRight: "1px dashed rgba(0,0,0,0.1)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }} />
            <div style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 18 * scale,
              lineHeight: 1.2,
              color: "#5c4d3c",
              textAlign: "center"
            }}>
              {sideNote}
            </div>
          </div>
        )}

        {/* POLAROID FRAME (Organic hand-cut borders) */}
        <div style={{
          position: "absolute",
          background: "#fffbf2",
          border: `${1 * scale}px solid rgba(92, 77, 60, 0.1)`,
          padding: `${14 * scale}px ${14 * scale}px ${42 * scale}px ${14 * scale}px`,
          boxShadow: `0 ${12 * scale}px ${35 * scale}px rgba(92,77,60,0.12)`,
          borderRadius: "5px 15px 4px 10px / 12px 4px 15px 5px", // Realistic raw paper look
          transform: isStory ? "rotate(1.5deg)" : "rotate(-3deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 320 * scale : 60 * scale,
          top: isStory ? 220 * scale : 140 * scale,
          width: isStory ? 440 * scale : isLandscape ? 280 * scale : 340 * scale,
          height: isStory ? 520 * scale : isLandscape ? 335 * scale : 405 * scale,
          zIndex: 12
        }}>
          {/* Jagged Tape */}
          <div style={{
            position: "absolute",
            top: -15 * scale,
            left: "30%",
            width: 120 * scale,
            height: 25 * scale,
            background: "linear-gradient(135deg, rgba(235,220,195,0.9) 0%, rgba(225,210,180,0.9) 100%)",
            boxShadow: "1px 2px 3px rgba(0,0,0,0.05)",
            transform: "rotate(-3deg)",
            borderLeft: "2px dashed rgba(0,0,0,0.15)",
            borderRight: "2px dashed rgba(0,0,0,0.15)"
          }} />

          {/* Polaroid Image */}
          <div style={{
            width: "100%",
            aspectRatio: "1/1",
            backgroundImage: bg ? `url("${getCorsFriendlyUrl(bg)}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#eae5da",
            borderRadius: 2 * scale,
            border: `${1 * scale}px solid rgba(92, 77, 60, 0.08)`
          }} />

          {/* Cursive quote inside Polaroid bottom */}
          <div style={{
            marginTop: isLandscape ? 8 * scale : 15 * scale,
            fontFamily: "'Caveat', cursive",
            fontSize: isLandscape ? 15 * scale : 18 * scale,
            fontWeight: "bold",
            color: "#6e5d48",
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: "92%"
          }}>
            {polaroidQuote}
          </div>
        </div>

        {/* SONG TITLE SECTION (Kraft Paper Ripped Look) */}
        <div style={{
          position: "absolute",
          background: "#fbf6ec",
          padding: `${20 * scale}px ${25 * scale}px`,
          borderRadius: "15px 4px 12px 6px / 5px 12px 4px 15px", // Jagged ripped edge
          border: `${1 * scale}px dashed #c0b49c`,
          boxShadow: `3px 5px 15px rgba(92,77,60,0.05), inset 0 0 ${15 * scale}px rgba(92,77,60,0.03)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 100 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 790 * scale : isLandscape ? 130 * scale : 150 * scale,
          width: isStory ? 880 * scale : isLandscape ? 340 * scale : 560 * scale,
          zIndex: 10
        }}>
          {/* Metal Paperclip holding the cardboard note */}
          <div style={{
            position: "absolute",
            top: -18 * scale,
            left: 20 * scale,
            width: 14 * scale,
            height: 38 * scale,
            border: `${2.5 * scale}px solid #948b7b`,
            borderRadius: 10 * scale,
            background: "transparent",
            transform: "rotate(15deg)",
            boxShadow: "1px 2px 4px rgba(92,77,60,0.2)",
            zIndex: 25
          }} />

          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 16 * scale,
            color: "#83705b",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: "bold",
            marginBottom: 2 * scale
          }}>
            Nombre de la canción:
          </div>
          <div style={{
            fontFamily: "'Special Elite', monospace",
            fontSize: isStory ? 38 * scale : isLandscape ? 24 * scale : 32 * scale,
            fontWeight: "900",
            color: "#4a3c2e",
            textAlign: "center",
            lineHeight: 1.1,
            wordBreak: "break-word"
          }}>
            {title}
          </div>

          {/* Media Player Control Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 20 * scale,
            marginTop: 15 * scale,
            color: "#7e6c58"
          }}>
            <i className="fas fa-shuffle" style={{ fontSize: 13 * scale, opacity: 0.6 }}></i>
            <i className="fas fa-backward-step" style={{ fontSize: 16 * scale }}></i>
            <div style={{
              width: 32 * scale,
              height: 32 * scale,
              borderRadius: "50%",
              background: "#7e6c58",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <i className="fas fa-play" style={{ fontSize: 10 * scale, marginLeft: 2 * scale }}></i>
            </div>
            <i className="fas fa-forward-step" style={{ fontSize: 16 * scale }}></i>
            <i className="fas fa-repeat" style={{ fontSize: 13 * scale, opacity: 0.6 }}></i>
          </div>
        </div>

        {/* ESCUCHALA EN PLATAFORMAS (Torn Light-beige sheet) */}
        <div style={{
          position: "absolute",
          background: "#fefbfa",
          border: `${1 * scale}px solid #e2d7be`,
          borderRadius: "8px 12px 15px 4px / 12px 4px 10px 15px",
          padding: 18 * scale,
          boxShadow: `0 ${6 * scale}px ${20 * scale}px rgba(92,77,60,0.06)`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1010 * scale : isLandscape ? 130 * scale : 310 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14 * scale,
            fontWeight: "bold",
            letterSpacing: "0.2em",
            color: "#6e5d48",
            borderBottom: `1px dashed #eae2cd`,
            paddingBottom: 8 * scale,
            marginBottom: 10 * scale,
            textTransform: "uppercase"
          }}>
            Escúchala en:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Spotify", i: "fa-spotify", c: "#1DB954" },
              { n: "YouTube", i: "fa-youtube", c: "#FF0000" },
              { n: "Apple Music", i: "fa-apple", c: "#FC3C44" },
              { n: "Amazon Music", i: "fa-amazon", c: "#00A8E1" }
            ].map((p, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13 * scale,
                fontWeight: "bold",
                color: "#5c4d3c",
                padding: `${4 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${p.i}`} style={{ color: p.c, fontSize: 16 * scale }}></i>
                  {p.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dotted #dcd5c0`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13 * scale, color: "#8a755d" }}>{mode === "disponible" ? "Listo" : "05 Abr"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIGUEME EN (SOCIAL NETWORKS) */}
        <div style={{
          position: "absolute",
          background: "#fefbfa",
          border: `${1 * scale}px solid #e2d7be`,
          borderRadius: "6px 15px 5px 12px / 10px 5px 12px 15px",
          padding: 16 * scale,
          boxShadow: `0 ${6 * scale}px ${20 * scale}px rgba(92,77,60,0.06)`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1280 * scale : isLandscape ? 390 * scale : 565 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 13 * scale,
            fontWeight: "bold",
            letterSpacing: "0.2em",
            color: "#6e5d48",
            borderBottom: `1px dashed #eae2cd`,
            paddingBottom: 6 * scale,
            marginBottom: 8 * scale,
            textTransform: "uppercase"
          }}>
            Sígueme en:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Instagram", i: "fa-instagram", handle: `@${artist.toLowerCase()}` },
              { n: "TikTok", i: "fa-tiktok", handle: `@${artist.toLowerCase()}` }
            ].map((s, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12 * scale,
                fontWeight: "bold",
                color: "#5c4d3c",
                padding: `${3 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${s.i}`} style={{ color: "#7a6953", fontSize: 14 * scale }}></i>
                  {s.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dotted #dcd5c0`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Caveat', cursive", fontSize: 13 * scale, color: "#8a755d" }}>{s.handle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SOBRE LA CANCION CARD (RULED LINED PAPER) */}
        <div style={{
          position: "absolute",
          background: "#fffeec",
          border: `${1 * scale}px solid #dbcfaf`,
          borderRadius: "2px 10px 5px 8px / 8px 5px 10px 2px",
          boxShadow: `3px 5px 20px rgba(92,77,60,0.06)`,
          transform: "rotate(1.2deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 100 * scale : 60 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 500 * scale : 575 * scale,
          width: isStory ? 420 * scale : isLandscape ? 320 * scale : 340 * scale,
          height: isStory ? 230 * scale : isLandscape ? 140 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 18 * scale,
            fontWeight: "bold",
            color: "#5c4d3c",
            marginBottom: 6 * scale,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            Sobre la canción:
          </div>
          <div style={{
            flex: 1,
            backgroundImage: `linear-gradient(#ece1c5 1px, transparent 1px)`,
            backgroundSize: `100% ${24 * scale}px`,
            lineHeight: `${24 * scale}px`,
            fontFamily: "'Caveat', cursive",
            fontSize: 16 * scale,
            color: "#7c6a56",
            paddingTop: 2 * scale,
            overflow: "hidden"
          }}>
            {aboutText}
          </div>
        </div>

        {/* FRASES DE LA CANCION CARD (NOTES RIPPED WITH PEN BLEED SHADOW) */}
        <div style={{
          position: "absolute",
          background: "#fffeec",
          border: `${1 * scale}px solid #dbcfaf`,
          borderRadius: "5px 12px 4px 10px / 12px 4px 8px 5px",
          boxShadow: `3px 5px 20px rgba(92,77,60,0.06)`,
          transform: "rotate(-1deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 560 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 370 * scale : 830 * scale,
          width: isStory ? 420 * scale : isLandscape ? 340 * scale : 560 * scale,
          height: isStory ? 230 * scale : isLandscape ? 270 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 18 * scale,
            fontWeight: "bold",
            color: "#5c4d3c",
            marginBottom: 6 * scale,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            Frases de la canción:
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 * scale, overflow: "hidden" }}>
            {[phrase1, phrase2, phrase3].map((ph, idx) => (
              <div key={idx} style={{
                fontFamily: "'Caveat', cursive",
                fontSize: 17 * scale,
                color: "#7c6a56",
                lineHeight: 1.1,
                borderLeft: `${2.5 * scale}px solid #b8a688`,
                paddingLeft: 10 * scale,
                fontStyle: "italic"
              }}>
                "{ph}"
              </div>
            ))}
          </div>
        </div>

        {/* Elegant Wild Flowers drawing (Right center bottom) */}
        {(!isLandscape && !isStory) && (
          <svg style={{ position: "absolute", right: 20 * scale, bottom: 250 * scale, width: 80 * scale, height: 160 * scale, opacity: 0.7, zIndex: 5 }} viewBox="0 0 50 100">
            <path d="M25,100 Q20,60 25,10" fill="none" stroke="#5c4d3c" strokeWidth="1.2" />
            <path d="M25,80 Q10,72 15,65" fill="none" stroke="#5c4d3c" strokeWidth="1.2" />
            <path d="M25,60 Q40,52 35,45" fill="none" stroke="#5c4d3c" strokeWidth="1.2" />
            <circle cx="15" cy="65" r="3.5" fill="#8b6f4e" />
            <circle cx="35" cy="45" r="3.5" fill="#8b6f4e" />
            <circle cx="25" cy="10" r="4.5" fill="#8b6f4e" />
          </svg>
        )}

        {/* BOTTOM TORN PAPER FOOTER */}
        <div style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          right: 0,
          height: isLandscape ? 90 * scale : 130 * scale,
          background: "#5c4d3c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 -5px 25px rgba(92,77,60,0.15)`,
          zIndex: 15
        }}>
          {/* Wavy hand torn layout */}
          <div style={{
            position: "absolute",
            top: -10 * scale,
            left: 0,
            right: 0,
            height: 12 * scale,
            backgroundImage: `radial-gradient(circle, transparent 72%, #5c4d3c 72%)`,
            backgroundSize: `20 * ${scale}px 20 * ${scale}px`,
            backgroundRepeat: "repeat-x"
          }} />

          {/* Mountains & pine trees stylized SVGs at the bottom */}
          <svg style={{ position: "absolute", left: 30 * scale, bottom: 5 * scale, width: 180 * scale, height: 60 * scale, opacity: 0.22 }} viewBox="0 0 100 50" fill="none" stroke="#fff" strokeWidth="1">
            <path d="M10,50 L40,10 L70,50" />
            <path d="M50,50 L75,25 L95,50" />
            <path d="M15,50 L20,38 L25,50 M22,50 L25,30 L28,50" />
          </svg>

          {/* Cursive signature quote in the center */}
          <div style={{
            fontFamily: "'Caveat', cursive",
            fontSize: isLandscape ? 28 * scale : 34 * scale,
            color: "#f5efe2",
            fontWeight: "bold",
            letterSpacing: "0.05em",
            zIndex: 20
          }}>
            {footerQuote}
          </div>
        </div>

      </div>
    );
  }

  // ── 2. URBAN GRUNGE BANDA TEMPLATE (UPGRADED GOLD/DUCT TAPE) ─────────────────
  if (template === "grunge") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(circle at center, #1b1b1b 0%, #060606 100%)",
        color: "#ffffff",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Distressed metallic mesh screen overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L100 100 M100 0 L0 100' stroke='%23fff' strokeWidth='0.6'/%3E%3C/svg%3E")`,
          backgroundSize: `${16 * scale}px ${16 * scale}px`
        }} />

        {/* Realistic Golden Crown Vector (Distressed Banda) */}
        <div style={{ position: "absolute", left: 35 * scale, top: 40 * scale, width: 85 * scale, height: 60 * scale, opacity: 0.2, transform: "rotate(-12deg)" }}>
          <svg viewBox="0 0 100 70" fill="none" stroke="url(#goldGradient)" strokeWidth="3.5">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#fff" />
                <stop offset="100%" stopColor="#8a6c11" />
              </linearGradient>
            </defs>
            <path d="M10,60 L20,20 L40,35 L50,10 L60,35 L80,20 L90,60 Z M10,60 L90,60" />
            <circle cx="20" cy="20" r="4" fill="url(#goldGradient)" />
            <circle cx="50" cy="10" r="4" fill="url(#goldGradient)" />
            <circle cx="80" cy="20" r="4" fill="url(#goldGradient)" />
          </svg>
        </div>

        {/* Silhouetted pickup truck or Banda musicians silhouette */}
        <svg style={{ position: "absolute", right: 30 * scale, top: 35 * scale, width: 140 * scale, height: 120 * scale, opacity: 0.12 }} viewBox="0 0 100 80" fill="url(#goldGradient)">
          <path d="M5,45 Q15,43 25,35 L40,25 Q55,25 70,30 L85,45 L95,45 L95,58 L5,58 Z" />
          <circle cx="25" cy="58" r="8" fill="#111" stroke="url(#goldGradient)" strokeWidth="2" />
          <circle cx="75" cy="58" r="8" fill="#111" stroke="url(#goldGradient)" strokeWidth="2" />
        </svg>

        {/* Golden paint drops down */}
        <div style={{ position: "absolute", left: "18%", top: 0, width: "3px", height: "180px", background: "linear-gradient(to bottom, #d4af37 0%, transparent 100%)", opacity: 0.25 }} />
        <div style={{ position: "absolute", right: "22%", top: 0, width: "2px", height: "130px", background: "linear-gradient(to bottom, #d4af37 0%, transparent 100%)", opacity: 0.2 }} />

        {/* HEADER: Permanent distressed gold brush title */}
        <div style={{
          position: "absolute",
          left: 50 * scale,
          top: isStory ? 70 * scale : 45 * scale,
          width: 980 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: isLandscape ? 42 * scale : 54 * scale,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#ffffff",
            textShadow: `0 0 20px rgba(0,0,0,0.8), 3px 3px 0px #d4af37`
          }}>
            Te Recomiendo
          </div>
          <div style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: isLandscape ? 40 * scale : 48 * scale,
            color: "#d4af37",
            marginTop: -8 * scale,
            transform: "rotate(-2deg)",
            textShadow: "2px 2px 8px rgba(0,0,0,0.9)"
          }}>
            esta canción
          </div>
        </div>

        {/* SONG COVER IN DISTRESSED SHADOW BOX FRAME */}
        <div style={{
          position: "absolute",
          background: "#121212",
          border: `${3 * scale}px solid #282828`,
          padding: `${12 * scale}px`,
          boxShadow: `0 20px 45px rgba(0,0,0,0.85)`,
          transform: isStory ? "rotate(-1deg)" : "rotate(-3deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 320 * scale : 60 * scale,
          top: isStory ? 220 * scale : 140 * scale,
          width: isStory ? 440 * scale : isLandscape ? 280 * scale : 340 * scale,
          height: isStory ? 520 * scale : isLandscape ? 335 * scale : 405 * scale,
          zIndex: 12
        }}>
          {/* Black Duct Tape Top-Left with jagged ends */}
          <div style={{
            position: "absolute",
            left: -28 * scale,
            top: -24 * scale,
            width: 120 * scale,
            height: 38 * scale,
            background: "linear-gradient(to bottom, #222 0%, #3a3a3a 50%, #151515 100%)",
            opacity: 0.95,
            transform: "rotate(-26deg)",
            boxShadow: "2px 3px 8px rgba(0,0,0,0.6)",
            borderLeft: "3px dashed rgba(255,255,255,0.05)",
            borderRight: "3px dashed rgba(255,255,255,0.05)"
          }} />

          {/* Cover Image */}
          <div style={{
            width: "100%",
            aspectRatio: "1/1",
            backgroundImage: bg ? `url("${getCorsFriendlyUrl(bg)}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#111",
            borderRadius: 2 * scale,
            border: `${1 * scale}px solid rgba(255,255,255,0.05)`
          }} />

          {/* Distressed slogan in Polaroid bottom */}
          <div style={{
            marginTop: isLandscape ? 8 * scale : 15 * scale,
            fontFamily: "'Permanent Marker', cursive",
            fontSize: isLandscape ? 14 * scale : 16 * scale,
            color: "#d4af37",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "0.05em",
            maxWidth: "92%"
          }}>
            {polaroidQuote}
          </div>
        </div>

        {/* SONG TITLE SECTION (Realistic Kraft Cardboard with shiny black Duct Tape) */}
        <div style={{
          position: "absolute",
          background: "radial-gradient(circle, #cca67c 0%, #a27a51 100%)",
          padding: `${20 * scale}px ${25 * scale}px`,
          borderRadius: 2 * scale,
          boxShadow: `0 15px 30px rgba(0,0,0,0.5), inset 0 0 25px rgba(0,0,0,0.25)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 100 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 790 * scale : isLandscape ? 130 * scale : 150 * scale,
          width: isStory ? 880 * scale : isLandscape ? 340 * scale : 560 * scale,
          zIndex: 10
        }}>
          {/* Black Duct Tape Top-Right */}
          <div style={{
            position: "absolute",
            right: -25 * scale,
            top: -20 * scale,
            width: 100 * scale,
            height: 34 * scale,
            background: "linear-gradient(to bottom, #111 0%, #2a2a2a 50%, #0d0d0d 100%)",
            opacity: 0.95,
            transform: "rotate(32deg)",
            boxShadow: "2px 2px 6px rgba(0,0,0,0.5)",
            borderLeft: "2px dashed #444",
            borderRight: "2px dashed #444"
          }} />

          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 13 * scale,
            color: "#302214",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 4 * scale
          }}>
            Nombre de la canción:
          </div>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: isStory ? 44 * scale : isLandscape ? 26 * scale : 36 * scale,
            color: "#121212",
            textAlign: "center",
            lineHeight: 1.0,
            wordBreak: "break-word",
            textShadow: "1px 1px 0px rgba(255,255,255,0.2)"
          }}>
            {title}
          </div>
        </div>

        {/* ESCUCHALA EN PLATAFORMAS (GOLD BOX BORDER METAL PANEL) */}
        <div style={{
          position: "absolute",
          background: "linear-gradient(to bottom, #121212 0%, #080808 100%)",
          border: `${2.5 * scale}px solid #d4af37`,
          borderRadius: 12 * scale,
          padding: 18 * scale,
          boxShadow: `0 12px 30px rgba(0,0,0,0.85)`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1010 * scale : isLandscape ? 130 * scale : 310 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 15 * scale,
            letterSpacing: "0.15em",
            color: "#d4af37",
            borderBottom: `2px solid #d4af3733`,
            paddingBottom: 8 * scale,
            marginBottom: 12 * scale,
            textTransform: "uppercase",
            textShadow: "2px 2px 4px rgba(0,0,0,0.6)"
          }}>
            Escúchala en:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Spotify", i: "fa-spotify", c: "#1DB954" },
              { n: "YouTube", i: "fa-youtube", c: "#FF0000" },
              { n: "Apple Music", i: "fa-apple", c: "#FC3C44" },
              { n: "Amazon Music", i: "fa-amazon", c: "#00A8E1" }
            ].map((p, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13 * scale,
                fontWeight: "bold",
                color: "#e8e8e8",
                padding: `${4 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${p.i}`} style={{ color: p.c, fontSize: 16 * scale }}></i>
                  {p.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dashed rgba(212, 175, 55, 0.25)`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Special Elite', monospace", fontSize: 11 * scale, color: "#d4af37" }}>{mode === "disponible" ? "LISTO" : "05 ABR"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIGUEME EN (GOLD BOX BORDER METAL PANEL) */}
        <div style={{
          position: "absolute",
          background: "linear-gradient(to bottom, #121212 0%, #080808 100%)",
          border: `${2.5 * scale}px solid #d4af37`,
          borderRadius: 12 * scale,
          padding: 16 * scale,
          boxShadow: `0 12px 30px rgba(0,0,0,0.85)`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1280 * scale : isLandscape ? 390 * scale : 565 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 14 * scale,
            letterSpacing: "0.15em",
            color: "#d4af37",
            borderBottom: `2px solid #d4af3733`,
            paddingBottom: 6 * scale,
            marginBottom: 10 * scale,
            textTransform: "uppercase"
          }}>
            Sígueme en:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Instagram", i: "fa-instagram", handle: `@${artist.toUpperCase()}` },
              { n: "TikTok", i: "fa-tiktok", handle: `@${artist.toUpperCase()}` }
            ].map((s, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12 * scale,
                fontWeight: "bold",
                color: "#e8e8e8",
                padding: `${3 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${s.i}`} style={{ color: "#d4af37", fontSize: 14 * scale }}></i>
                  {s.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dashed rgba(212, 175, 55, 0.25)`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Special Elite', monospace", fontSize: 11 * scale, color: "#d4af37" }}>{s.handle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SOBRE LA CANCION WAVEFORM (BANDA/CORRIDO PANEL) */}
        <div style={{
          position: "absolute",
          background: "linear-gradient(135deg, #181818 0%, #0c0c0c 100%)",
          border: `${1 * scale}px solid #d4af3733`,
          borderRadius: 8 * scale,
          boxShadow: `0 10px 30px rgba(0,0,0,0.7)`,
          transform: "rotate(1deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 100 * scale : 60 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 500 * scale : 575 * scale,
          width: isStory ? 420 * scale : isLandscape ? 320 * scale : 340 * scale,
          height: isStory ? 230 * scale : isLandscape ? 140 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 15 * scale,
            color: "#d4af37",
            marginBottom: 6 * scale,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>
            Sobre la canción:
          </div>
          
          {/* Gold Audio Waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 * scale, height: 40 * scale, margin: `${8 * scale}px 0` }}>
            {[0.3, 0.6, 0.8, 0.4, 0.9, 0.7, 0.5, 0.8, 0.9, 0.3, 0.4, 0.7, 0.9, 0.8, 0.5, 0.4, 0.6, 0.8, 0.5, 0.9, 0.3].map((hVal, idx) => (
              <div key={idx} style={{ flex: 1, height: `${hVal * 100}%`, background: "linear-gradient(to top, #d4af37, #f6e6aa)", borderRadius: 100 }} />
            ))}
          </div>

          <div style={{
            flex: 1,
            lineHeight: `${18 * scale}px`,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11 * scale,
            color: "#cccccc",
            overflow: "hidden",
            marginTop: 5 * scale
          }}>
            {aboutText}
          </div>
        </div>

        {/* FRASES DE LA CANCION BOX (BANDA/CORRIDO PANEL) */}
        <div style={{
          position: "absolute",
          background: "linear-gradient(135deg, #181818 0%, #0c0c0c 100%)",
          border: `${1 * scale}px solid #d4af3733`,
          borderRadius: 8 * scale,
          boxShadow: `0 10px 30px rgba(0,0,0,0.7)`,
          transform: "rotate(-1.2deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 560 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 370 * scale : 830 * scale,
          width: isStory ? 420 * scale : isLandscape ? 340 * scale : 560 * scale,
          height: isStory ? 230 * scale : isLandscape ? 270 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: 15 * scale,
            color: "#d4af37",
            marginBottom: 10 * scale,
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>
            Líricas destacadas:
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 * scale, overflow: "hidden" }}>
            {[phrase1, phrase2].map((ph, idx) => (
              <div key={idx} style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 15 * scale,
                color: "#ffffff",
                lineHeight: 1.2,
                borderLeft: `${3 * scale}px solid #d4af37`,
                paddingLeft: 12 * scale,
                letterSpacing: "0.02em"
              }}>
                "{ph.toUpperCase()}"
              </div>
            ))}
          </div>
        </div>

        {/* Ammo bullet casings decoration 3D-styled (Bottom left edge) */}
        {(!isLandscape && !isStory) && (
          <div style={{ display: "flex", gap: 12 * scale, zIndex: 15, position: "absolute", left: 60 * scale, bottom: 250 * scale }}>
            {[0, 15].map((rot, idx) => (
              <div key={idx} style={{
                width: 10 * scale,
                height: 32 * scale,
                background: "linear-gradient(to right, #e5c060 0%, #f3e5ab 30%, #b8860b 70%, #996515 100%)",
                borderRadius: `${2 * scale}px ${2 * scale}px 0 0`,
                boxShadow: "2px 3px 5px rgba(0,0,0,0.5)",
                transform: `rotate(${rot}deg)`,
                position: "relative"
              }}>
                {/* Bullet Tip */}
                <div style={{
                  position: "absolute",
                  top: -6 * scale,
                  left: 1 * scale,
                  width: 8 * scale,
                  height: 8 * scale,
                  background: "linear-gradient(to right, #c5a059, #aa7c11)",
                  borderRadius: "50% 50% 0 0"
                }} />
                {/* Base cap line */}
                <div style={{
                  position: "absolute",
                  bottom: 1 * scale,
                  left: 0,
                  right: 0,
                  height: 2 * scale,
                  background: "#333"
                }} />
              </div>
            ))}
          </div>
        )}

        {/* BOTTOM GOLD BRAND FOOTER */}
        <div style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          right: 0,
          height: isLandscape ? 90 * scale : 130 * scale,
          background: "#080808",
          borderTop: `${3 * scale}px solid #d4af37`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 -10px 35px rgba(0,0,0,0.95)`,
          zIndex: 15
        }}>
          {/* Gold Baseball cap LA icon stylized */}
          <div style={{
            position: "absolute",
            left: 50 * scale,
            display: "flex",
            alignItems: "center",
            gap: 15 * scale,
            opacity: 0.75
          }}>
            <svg style={{ width: 42 * scale, height: 42 * scale }} viewBox="0 0 50 50" fill="url(#goldGradient)">
              <path d="M10,35 C15,20 35,20 40,35 C42,38 45,39 48,39 L48,41 C35,41 25,38 10,35 Z" />
              <rect x="23" y="15" width="4" height="12" fill="url(#goldGradient)" transform="rotate(-15)" />
            </svg>
          </div>

          {/* Gold Cursive text slogan */}
          <div style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: isLandscape ? 24 * scale : 32 * scale,
            color: "#d4af37",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            textAlign: "center",
            zIndex: 20
          }}>
            {footerQuote}
          </div>
        </div>

      </div>
    );
  }

  // ── 3. NEW! RETRO VINYL RECORD TEMPLATE ──────────────────────────────────────
  if (template === "vinyl") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(circle, #2d241c 0%, #110e0b 100%)",
        color: "#f6eccb",
        overflow: "hidden",
        fontFamily: "'Playfair Display', serif"
      }}>
        {/* Distressed vintage paper texture overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />

        {/* TOP HEADER: Warm Mustard Retro */}
        <div style={{
          position: "absolute",
          left: 50 * scale,
          top: isStory ? 70 * scale : 45 * scale,
          width: 980 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 24 * scale,
            color: "#d3af5d",
            letterSpacing: "0.2em"
          }}>
            Colección Especial // Vinilo
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 60 * scale,
            color: "#ffffff",
            letterSpacing: "0.15em",
            marginTop: -5 * scale
          }}>
            TE RECOMIENDO ESTA CANCIÓN
          </div>
        </div>

        {/* VINYL RECORD CONTAINER (SPINNING GROOVE DISK) */}
        <div style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Layout based on size
          left: isStory ? 340 * scale : 60 * scale,
          top: isStory ? 240 * scale : 140 * scale,
          width: isStory ? 400 * scale : isLandscape ? 300 * scale : 360 * scale,
          height: isStory ? 400 * scale : isLandscape ? 300 * scale : 360 * scale,
          zIndex: 12
        }}>
          {/* Black Vinyl Grooved Disk */}
          <div style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "repeating-radial-gradient(circle, #181818, #181818 2.5px, #0e0e0e 2.5px, #0e0e0e 5px)",
            boxShadow: `0 ${15 * scale}px ${45 * scale}px rgba(0,0,0,0.85)`,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${4 * scale}px solid #111`
          }}>
            {/* Inner vinyl grooves highlight */}
            <div style={{
              position: "absolute",
              inset: "15%",
              borderRadius: "50%",
              border: `${2 * scale}px solid rgba(255,255,255,0.03)`,
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)"
            }} />

            {/* Turntable Label (Centered Album Cover Art) */}
            <div style={{
              width: "35%",
              height: "35%",
              borderRadius: "50%",
              backgroundImage: bg ? `url("${getCorsFriendlyUrl(bg)}")` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: `${4 * scale}px solid #d3af5d`,
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}>
              {/* Spindle Hole */}
              <div style={{
                width: 14 * scale,
                height: 14 * scale,
                borderRadius: "50%",
                background: "#080808",
                border: `${2 * scale}px solid rgba(255,255,255,0.2)`
              }} />
            </div>
          </div>

          {/* Realistic Gold Turntable Tonearm (Stylus resting on vinyl) */}
          <svg style={{
            position: "absolute",
            right: -30 * scale,
            top: -20 * scale,
            width: 140 * scale,
            height: 180 * scale,
            pointerEvents: "none",
            zIndex: 15,
            filter: "drop-shadow(2px 5px 5px rgba(0,0,0,0.5))"
          }} viewBox="0 0 100 150">
            {/* Gold Pivot Joint Base */}
            <circle cx="75" cy="25" r="14" fill="#a48135" stroke="#333" strokeWidth="2" />
            <circle cx="75" cy="25" r="6" fill="#111" />
            {/* Curved tonearm body */}
            <path d="M75,25 Q50,70 45,100 L38,125" fill="none" stroke="#d3af5d" strokeWidth="4.5" strokeLinecap="round" />
            {/* Stylus Head Shell */}
            <rect x="30" y="122" width="12" height="18" rx="2" fill="#222" stroke="#a48135" strokeWidth="1" transform="rotate(-15, 36, 131)" />
          </svg>
        </div>

        {/* SONG RETRO SLEEVE TEXT PANEL */}
        <div style={{
          position: "absolute",
          background: "#ece3cc",
          color: "#2a2219",
          padding: `${20 * scale}px ${25 * scale}px`,
          borderRadius: 2 * scale,
          border: `${2 * scale}px solid #2a2219`,
          boxShadow: `0 10px 25px rgba(0,0,0,0.5)`,
          left: isStory ? 100 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 790 * scale : isLandscape ? 130 * scale : 150 * scale,
          width: isStory ? 880 * scale : isLandscape ? 340 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 13 * scale,
            color: "#83705b",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 2 * scale
          }}>
            Grabación Original // {artist.toUpperCase()}
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isStory ? 36 * scale : isLandscape ? 24 * scale : 30 * scale,
            fontWeight: "900",
            letterSpacing: "0.02em",
            lineHeight: 1.1,
            wordBreak: "break-word"
          }}>
            {title}
          </div>
          
          {/* Cursive subtitle */}
          <div style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: 18 * scale,
            color: "#a48135",
            marginTop: 5 * scale
          }}>
            "{polaroidQuote}"
          </div>
        </div>

        {/* ESCUCHALA EN PLATAFORMAS (VINTAGE TICKET STYLE) */}
        <div style={{
          position: "absolute",
          background: "#ece3cc",
          color: "#2a2219",
          border: `${2 * scale}px solid #2a2219`,
          borderRadius: 4 * scale,
          padding: 18 * scale,
          boxShadow: `0 10px 25px rgba(0,0,0,0.5)`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1010 * scale : isLandscape ? 130 * scale : 330 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14 * scale,
            fontWeight: "bold",
            letterSpacing: "0.15em",
            borderBottom: `2 * ${scale}px solid #2a2219`,
            paddingBottom: 6 * scale,
            marginBottom: 10 * scale,
            textTransform: "uppercase"
          }}>
            Ediciones Digitales:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Spotify", i: "fa-spotify" },
              { n: "YouTube", i: "fa-youtube" },
              { n: "Apple Music", i: "fa-apple" },
              { n: "Amazon Music", i: "fa-amazon" }
            ].map((p, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13 * scale,
                fontWeight: "bold",
                color: "#2a2219",
                padding: `${4 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${p.i}`} style={{ color: "#2a2219", fontSize: 16 * scale }}></i>
                  {p.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1.5px dotted #2a2219`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Special Elite', monospace", fontSize: 11 * scale }}>REGISTRO</span>
              </div>
            ))}
          </div>
        </div>

        {/* RETRO VINTAGE BIO CARD (LINED NOTE) */}
        <div style={{
          position: "absolute",
          background: "#ece3cc",
          border: `${2 * scale}px solid #2a2219`,
          color: "#2a2219",
          borderRadius: 2 * scale,
          boxShadow: `0 10px 25px rgba(0,0,0,0.5)`,
          transform: "rotate(1deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 100 * scale : 60 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 500 * scale : 575 * scale,
          width: isStory ? 420 * scale : isLandscape ? 320 * scale : 340 * scale,
          height: isStory ? 230 * scale : isLandscape ? 140 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 16 * scale,
            fontWeight: "bold",
            marginBottom: 6 * scale,
            textTransform: "uppercase"
          }}>
            Reseña del Disco:
          </div>
          <div style={{
            flex: 1,
            backgroundImage: `linear-gradient(#d3af5d 1px, transparent 1px)`,
            backgroundSize: `100% ${24 * scale}px`,
            lineHeight: `${24 * scale}px`,
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontSize: 14 * scale,
            color: "#4a3c2e",
            paddingTop: 2 * scale,
            overflow: "hidden"
          }}>
            {aboutText}
          </div>
        </div>

        {/* FRASES RETRO VINYL LIST */}
        <div style={{
          position: "absolute",
          background: "#ece3cc",
          border: `${2 * scale}px solid #2a2219`,
          color: "#2a2219",
          borderRadius: 2 * scale,
          boxShadow: `0 10px 25px rgba(0,0,0,0.5)`,
          transform: "rotate(-1deg)",
          display: "flex",
          flexDirection: "column",
          padding: 15 * scale,
          left: isStory ? 560 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 370 * scale : 830 * scale,
          width: isStory ? 420 * scale : isLandscape ? 340 * scale : 560 * scale,
          height: isStory ? 230 * scale : isLandscape ? 270 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 16 * scale,
            fontWeight: "bold",
            marginBottom: 10 * scale,
            textTransform: "uppercase"
          }}>
            Sección de Citas:
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 * scale, overflow: "hidden" }}>
            {[phrase1, phrase2].map((ph, idx) => (
              <div key={idx} style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontSize: 14 * scale,
                color: "#2a2219",
                lineHeight: 1.2,
                borderLeft: `${3 * scale}px solid #d3af5d`,
                paddingLeft: 10 * scale
              }}>
                "{ph}"
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM RETRO MUSTARD FOOTER */}
        <div style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          right: 0,
          height: isLandscape ? 90 * scale : 130 * scale,
          background: "#d3af5d",
          borderTop: `${3 * scale}px solid #2a2219`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 -10px 30px rgba(0,0,0,0.6)`,
          zIndex: 15
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: isLandscape ? 24 * scale : 30 * scale,
            color: "#2a2219",
            fontWeight: "900",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>
            {footerQuote}
          </div>
        </div>

      </div>
    );
  }

  // ── 4. NEW! NEON CYBERPUNK / SYNTHWAVE TEMPLATE ──────────────────────────────
  if (template === "cyberpunk") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "radial-gradient(circle at center, #11001c 0%, #030008 100%)",
        color: "#ffffff",
        overflow: "hidden",
        fontFamily: "'Orbitron', sans-serif"
      }}>
        {/* Glowing synthwave pink grid horizon receding */}
        <div style={{
          position: "absolute",
          left: "-10%",
          bottom: "-10%",
          width: "120%",
          height: "60%",
          opacity: 0.25,
          backgroundImage: "linear-gradient(rgba(255, 0, 128, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 0, 128, 0.4) 1px, transparent 1px)",
          backgroundSize: `${35 * scale}px ${35 * scale}px`,
          transform: "perspective(300px) rotateX(60deg)",
          transformOrigin: "bottom center",
          pointerEvents: "none"
        }} />

        {/* Hot pink neon glowing synthwave sun */}
        <div style={{
          position: "absolute",
          left: "25%",
          top: "15%",
          width: 540 * scale,
          height: 540 * scale,
          borderRadius: "50%",
          background: "linear-gradient(to bottom, #ff007f 0%, #ffaa00 100%)",
          opacity: 0.15,
          filter: `blur(${20 * scale}px)`,
          pointerEvents: "none"
        }} />

        {/* Cyberpunk HUD framing markers */}
        <div style={{ position: "absolute", left: 30 * scale, top: 30 * scale, fontSize: 12 * scale, fontFamily: "monospace", color: "#00f2ff", opacity: 0.5 }}>[ SYSTEM_ONLINE ]</div>
        <div style={{ position: "absolute", right: 30 * scale, top: 30 * scale, fontSize: 12 * scale, fontFamily: "monospace", color: "#ff007f", opacity: 0.5 }}>SYS_V4.5 // LINK</div>

        {/* TITLE: Neon Cyan Glowing Font */}
        <div style={{
          position: "absolute",
          left: 50 * scale,
          top: isStory ? 70 * scale : 45 * scale,
          width: 980 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isLandscape ? 38 * scale : 50 * scale,
            fontWeight: "900",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#00f2ff",
            textShadow: "0 0 10px #00f2ff, 0 0 30px rgba(0,242,255,0.6)"
          }}>
            Te Recomiendo
          </div>
          <div style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: isLandscape ? 36 * scale : 44 * scale,
            color: "#ff007f",
            marginTop: -5 * scale,
            transform: "rotate(-1.5deg)",
            textShadow: "0 0 8px #ff007f, 0 0 20px rgba(255,0,127,0.6)"
          }}>
            esta canción
          </div>
        </div>

        {/* SONG COVER (Neon glowing cyberbox frame) */}
        <div style={{
          position: "absolute",
          background: "#05000a",
          border: `${3 * scale}px solid #ff007f`,
          boxShadow: "0 0 20px rgba(255,0,127,0.4), inset 0 0 15px rgba(255,0,127,0.3)",
          borderRadius: 16 * scale,
          padding: `${12 * scale}px`,
          transform: "rotate(-1.5deg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 320 * scale : 60 * scale,
          top: isStory ? 220 * scale : 140 * scale,
          width: isStory ? 440 * scale : isLandscape ? 280 * scale : 340 * scale,
          height: isStory ? 520 * scale : isLandscape ? 335 * scale : 405 * scale,
          zIndex: 12
        }}>
          {/* Cybernetic Corner HUD brackets */}
          <div style={{ position: "absolute", top: -8 * scale, left: -8 * scale, width: 25 * scale, height: 25 * scale, borderTop: `${3 * scale}px solid #00f2ff`, borderLeft: `${3 * scale}px solid #00f2ff` }} />
          <div style={{ position: "absolute", bottom: -8 * scale, right: -8 * scale, width: 25 * scale, height: 25 * scale, borderBottom: `${3 * scale}px solid #00f2ff`, borderRight: `${3 * scale}px solid #00f2ff` }} />

          {/* Cover Image */}
          <div style={{
            width: "100%",
            aspectRatio: "1/1",
            backgroundImage: bg ? `url("${getCorsFriendlyUrl(bg)}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#11001c",
            borderRadius: 8 * scale
          }} />

          {/* Slogan text */}
          <div style={{
            marginTop: isLandscape ? 8 * scale : 15 * scale,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isLandscape ? 12 * scale : 14 * scale,
            fontWeight: "bold",
            color: "#00f2ff",
            textShadow: "0 0 8px rgba(0,242,255,0.5)",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "0.05em",
            maxWidth: "92%"
          }}>
            {polaroidQuote.toUpperCase()}
          </div>
        </div>

        {/* SONG CYBER HUD PANEL */}
        <div style={{
          position: "absolute",
          background: "rgba(5, 0, 15, 0.8)",
          border: `${2 * scale}px solid #00f2ff`,
          boxShadow: "0 0 15px rgba(0,242,255,0.2)",
          padding: `${20 * scale}px ${25 * scale}px`,
          borderRadius: 12 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 100 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 790 * scale : isLandscape ? 130 * scale : 150 * scale,
          width: isStory ? 880 * scale : isLandscape ? 340 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11 * scale,
            color: "#ff007f",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 4 * scale,
            textShadow: "0 0 5px rgba(255,0,127,0.5)"
          }}>
            // DIGITAL TRANS-LINK ACTIVE
          </div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isStory ? 38 * scale : isLandscape ? 24 * scale : 32 * scale,
            fontWeight: "900",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.0,
            letterSpacing: "0.05em",
            textShadow: "0 0 10px rgba(255,255,255,0.3)"
          }}>
            {title}
          </div>
        </div>

        {/* ESCUCHALA EN PLATAFORMAS (CYBER GLOW BOX) */}
        <div style={{
          position: "absolute",
          background: "rgba(5, 0, 15, 0.8)",
          border: `${2 * scale}px solid #ff007f`,
          boxShadow: "0 0 15px rgba(255,0,127,0.2)",
          borderRadius: 16 * scale,
          padding: 18 * scale,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1010 * scale : isLandscape ? 130 * scale : 310 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 13 * scale,
            fontWeight: "900",
            letterSpacing: "0.2em",
            color: "#ff007f",
            borderBottom: `2px solid rgba(255,0,127,0.3)`,
            paddingBottom: 8 * scale,
            marginBottom: 12 * scale,
            textTransform: "uppercase",
            textShadow: "0 0 8px rgba(255,0,127,0.6)"
          }}>
            PLATFORM_INTERFACE:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Spotify", i: "fa-spotify", c: "#1DB954" },
              { n: "YouTube", i: "fa-youtube", c: "#FF0000" },
              { n: "Apple Music", i: "fa-apple", c: "#FC3C44" },
              { n: "Amazon Music", i: "fa-amazon", c: "#00A8E1" }
            ].map((p, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12 * scale,
                fontWeight: "bold",
                color: "#00f2ff",
                padding: `${4 * scale}px 0`,
                textShadow: "0 0 5px rgba(0,242,255,0.4)"
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${p.i}`} style={{ color: p.c, fontSize: 16 * scale }}></i>
                  {p.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1.5px dashed rgba(0,242,255,0.25)`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "monospace", fontSize: 11 * scale, color: "#ffffff" }}>ONLINE</span>
              </div>
            ))}
          </div>
        </div>

        {/* NEON SOCIAL PANEL */}
        <div style={{
          position: "absolute",
          background: "rgba(5, 0, 15, 0.8)",
          border: `${2 * scale}px solid #00f2ff`,
          boxShadow: "0 0 15px rgba(0,242,255,0.2)",
          borderRadius: 16 * scale,
          padding: 16 * scale,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 460 * scale,
          top: isStory ? 1280 * scale : isLandscape ? 390 * scale : 565 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 12 * scale,
            fontWeight: "900",
            letterSpacing: "0.2em",
            color: "#00f2ff",
            borderBottom: `2px solid rgba(0,242,255,0.3)`,
            paddingBottom: 6 * scale,
            marginBottom: 10 * scale,
            textTransform: "uppercase"
          }}>
            SOCIAL_NODE_NETS:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 8 * scale
          }}>
            {[
              { n: "Instagram", i: "fa-instagram", handle: `@${artist.toLowerCase()}` },
              { n: "TikTok", i: "fa-tiktok", handle: `@${artist.toLowerCase()}` }
            ].map((s, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12 * scale,
                fontWeight: "bold",
                color: "#e0e0e0",
                padding: `${3 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${s.i}`} style={{ color: "#ff007f", fontSize: 14 * scale }}></i>
                  {s.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1.5px dashed rgba(255,0,127,0.25)`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "monospace", fontSize: 11 * scale, color: "#ffffff" }}>{s.handle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NEON METADATA DESCRIPTION BOX */}
        <div style={{
          position: "absolute",
          background: "rgba(5, 0, 15, 0.8)",
          border: `${1 * scale}px solid #00f2ff33`,
          borderRadius: 8 * scale,
          padding: 15 * scale,
          left: isStory ? 100 * scale : 60 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 500 * scale : 575 * scale,
          width: isStory ? 420 * scale : isLandscape ? 320 * scale : 340 * scale,
          height: isStory ? 230 * scale : isLandscape ? 140 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 13 * scale,
            color: "#ff007f",
            marginBottom: 6 * scale,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            // DATA_STREAM:
          </div>
          <div style={{
            lineHeight: `${18 * scale}px`,
            fontFamily: "monospace",
            fontSize: 11 * scale,
            color: "#e0e0e0",
            overflow: "hidden"
          }}>
            {aboutText}
          </div>
        </div>

        {/* NEON GLITCH FRASES */}
        <div style={{
          position: "absolute",
          background: "rgba(5, 0, 15, 0.8)",
          border: `${1 * scale}px solid #ff007f33`,
          borderRadius: 8 * scale,
          padding: 15 * scale,
          left: isStory ? 560 * scale : isLandscape ? 400 * scale : 460 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 370 * scale : 830 * scale,
          width: isStory ? 420 * scale : isLandscape ? 340 * scale : 560 * scale,
          height: isStory ? 230 * scale : isLandscape ? 270 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 13 * scale,
            color: "#00f2ff",
            marginBottom: 10 * scale,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            // NEON_DECAL_WORDS:
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 * scale, overflow: "hidden" }}>
            {[phrase1, phrase2].map((ph, idx) => (
              <div key={idx} style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 13 * scale,
                color: "#ffffff",
                lineHeight: 1.2,
                borderLeft: `${3 * scale}px solid #00f2ff`,
                paddingLeft: 12 * scale,
                textShadow: "0 0 5px rgba(0,242,255,0.5)"
              }}>
                "{ph.toUpperCase()}"
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM SYNTHWAVE PINK GLOW FOOTER */}
        <div style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          right: 0,
          height: isLandscape ? 90 * scale : 130 * scale,
          background: "#030008",
          borderTop: `${3 * scale}px solid #ff007f`,
          boxShadow: "0 0 25px rgba(255,0,127,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 15
        }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: isLandscape ? 22 * scale : 28 * scale,
            color: "#ffffff",
            fontWeight: "900",
            letterSpacing: "0.15em",
            textShadow: "0 0 10px #ff007f, 0 0 20px rgba(255,0,127,0.5)"
          }}>
            {footerQuote.toUpperCase()}
          </div>
        </div>

      </div>
    );
  }

  // ── 5. NEW! LUXURY EDITORIAL / VOGUE TEMPLATE ────────────────────────────────
  if (template === "editorial") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#fafaf8", // Ivory clean background
        color: "#1c1c1c",
        overflow: "hidden",
        fontFamily: "'Cormorant Garamond', serif"
      }}>
        {/* Elegant thin inner double border frame */}
        <div style={{
          position: "absolute",
          inset: 24 * scale,
          border: `${1 * scale}px solid #e2e2e0`,
          pointerEvents: "none",
          zIndex: 5
        }} />
        <div style={{
          position: "absolute",
          inset: 32 * scale,
          border: `${1.5 * scale}px solid #1c1c1c`,
          pointerEvents: "none",
          zIndex: 5
        }} />

        {/* TOP HEADER: Thin clean luxurious typography */}
        <div style={{
          position: "absolute",
          left: 50 * scale,
          top: isStory ? 80 * scale : 55 * scale,
          width: 980 * scale,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 26 * scale,
            letterSpacing: "0.15em",
            color: "#837568",
            textTransform: "uppercase"
          }}>
            Recomendación Editorial
          </div>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: isLandscape ? 40 * scale : 48 * scale,
            fontWeight: "900",
            letterSpacing: "0.3em",
            color: "#1c1c1c",
            marginTop: 4 * scale
          }}>
            DIOSMASGYM PRESENTA
          </div>
        </div>

        {/* ALBUM COVER (Perfect bordered museum frame) */}
        <div style={{
          position: "absolute",
          background: "#ffffff",
          border: `${1 * scale}px solid #1c1c1c`,
          padding: `${12 * scale}px`,
          boxShadow: `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.06)`,
          // Layout based on size
          left: isStory ? 320 * scale : 80 * scale,
          top: isStory ? 240 * scale : 160 * scale,
          width: isStory ? 440 * scale : isLandscape ? 280 * scale : 320 * scale,
          height: isStory ? 520 * scale : isLandscape ? 335 * scale : 380 * scale,
          zIndex: 12
        }}>
          {/* Cover Art */}
          <div style={{
            width: "100%",
            aspectRatio: "1/1",
            backgroundImage: bg ? `url("${getCorsFriendlyUrl(bg)}")` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#eaeaea"
          }} />

          {/* Minimal Slogan */}
          <div style={{
            marginTop: 15 * scale,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15 * scale,
            fontWeight: "600",
            fontStyle: "italic",
            color: "#1c1c1c",
            textAlign: "center"
          }}>
            {polaroidQuote}
          </div>
        </div>

        {/* SONG LUXURY TITLE BOX */}
        <div style={{
          position: "absolute",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          left: isStory ? 100 * scale : isLandscape ? 400 * scale : 450 * scale,
          top: isStory ? 810 * scale : isLandscape ? 160 * scale : 160 * scale,
          width: isStory ? 880 * scale : isLandscape ? 340 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15 * scale,
            color: "#837568",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 2 * scale
          }}>
            EDICIÓN PREMIUM // TEMA RECOMENDADO
          </div>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: isStory ? 40 * scale : isLandscape ? 26 * scale : 34 * scale,
            fontWeight: "900",
            letterSpacing: "0.15em",
            color: "#1c1c1c",
            textAlign: "center",
            lineHeight: 1.1,
            wordBreak: "break-word"
          }}>
            {title}
          </div>
        </div>

        {/* ESCUCHALA EN PLATAFORMAS (CLEAN SERIF TICKET) */}
        <div style={{
          position: "absolute",
          background: "transparent",
          borderTop: `${1.5 * scale}px solid #1c1c1c`,
          borderBottom: `${1.5 * scale}px solid #1c1c1c`,
          padding: `${12 * scale}px 0`,
          left: isStory ? 100 * scale : isLandscape ? 770 * scale : 450 * scale,
          top: isStory ? 1010 * scale : isLandscape ? 160 * scale : 310 * scale,
          width: isStory ? 880 * scale : isLandscape ? 260 * scale : 560 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15 * scale,
            fontWeight: "bold",
            letterSpacing: "0.2em",
            color: "#1c1c1c",
            marginBottom: 8 * scale,
            textTransform: "uppercase",
            textAlign: "center"
          }}>
            Soportes y Transmisión:
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isStory ? "repeat(2, 1fr)" : "1fr",
            gap: 6 * scale
          }}>
            {[
              { n: "Spotify", i: "fa-spotify" },
              { n: "YouTube", i: "fa-youtube" },
              { n: "Apple Music", i: "fa-apple" },
              { n: "Amazon Music", i: "fa-amazon" }
            ].map((p, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13 * scale,
                fontWeight: "bold",
                color: "#1c1c1c",
                padding: `${3 * scale}px 0`
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 * scale }}>
                  <i className={`fab ${p.i}`} style={{ color: "#1c1c1c", fontSize: 15 * scale }}></i>
                  {p.n}
                </span>
                <span style={{
                  flex: 1,
                  borderBottom: `1px dotted #1c1c1c`,
                  margin: `0 ${8 * scale}px`,
                  alignSelf: "flex-end",
                  marginBottom: 3 * scale
                }}></span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13 * scale }}>ACTIVO</span>
              </div>
            ))}
          </div>
        </div>

        {/* LITERARY EDITORIAL DESCRIPTIONS */}
        <div style={{
          position: "absolute",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          padding: 10 * scale,
          left: isStory ? 100 * scale : 80 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 500 * scale : 570 * scale,
          width: isStory ? 420 * scale : isLandscape ? 320 * scale : 320 * scale,
          height: isStory ? 230 * scale : isLandscape ? 140 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16 * scale,
            fontWeight: "bold",
            color: "#837568",
            marginBottom: 6 * scale,
            textTransform: "uppercase"
          }}>
            Nota de Prensa:
          </div>
          <div style={{
            flex: 1,
            lineHeight: `${20 * scale}px`,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 14 * scale,
            color: "#444442",
            overflow: "hidden"
          }}>
            {aboutText}
          </div>
        </div>

        {/* EDITORIAL FRASES CARD */}
        <div style={{
          position: "absolute",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          padding: 10 * scale,
          left: isStory ? 560 * scale : isLandscape ? 400 * scale : 450 * scale,
          top: isStory ? 1490 * scale : isLandscape ? 380 * scale : 830 * scale,
          width: isStory ? 420 * scale : isLandscape ? 340 * scale : 560 * scale,
          height: isStory ? 230 * scale : isLandscape ? 260 * scale : 240 * scale,
          zIndex: 10
        }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 16 * scale,
            fontWeight: "bold",
            color: "#837568",
            marginBottom: 8 * scale,
            textTransform: "uppercase"
          }}>
            Líricas Destacadas:
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 * scale, overflow: "hidden" }}>
            {[phrase1, phrase2].map((ph, idx) => (
              <div key={idx} style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 15 * scale,
                color: "#1c1c1c",
                lineHeight: 1.2,
                borderLeft: `${1 * scale}px solid #1c1c1c`,
                paddingLeft: 12 * scale
              }}>
                "{ph}"
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ELEGANT BLACK FOOTER */}
        <div style={{
          position: "absolute",
          left: 32 * scale,
          bottom: 32 * scale,
          right: 32 * scale,
          height: isLandscape ? 50 * scale : 70 * scale,
          background: "transparent",
          borderTop: `${1.5 * scale}px solid #1c1c1c`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 15
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: isLandscape ? 16 * scale : 20 * scale,
            color: "#1c1c1c",
            fontWeight: "900",
            letterSpacing: "0.4em",
            textTransform: "uppercase"
          }}>
            {footerQuote}
          </div>
        </div>

      </div>
    );
  }

  // ── 6. DEFAULT MODERN MINIMAL LAYOUT ───────────────────────────────────────
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#000" }}>
      {bg && (
        <div 
          style={{ 
            position: "absolute", 
            inset: 0, 
            width: "100%", 
            height: "100%", 
            backgroundImage: `url("${getCorsFriendlyUrl(bg)}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'high-quality'
          }} 
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${overlay})` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: width * 0.06 }}>
        <div style={{ fontSize: width * 0.02, fontWeight: 900, letterSpacing: "0.4em", color: accentColor, marginBottom: width * 0.015, textTransform: "uppercase" }}>{artist} RECORDS</div>
        <div style={{ fontSize: width * 0.08, fontWeight: 900, lineHeight: 0.85, textAlign: "center", color: textColor, fontFamily: "'Bebas Neue',sans-serif", textShadow: `0 0 ${80 * scale}px ${accentColor}88` }}>{title}</div>
        <div style={{ marginTop: width * 0.02, fontSize: width * 0.014, fontWeight: 900, letterSpacing: "0.5em", color: accentColor, padding: `${width * 0.008}px ${width * 0.03}px`, border: `2px solid ${accentColor}55`, borderRadius: width }}>
          {mode === "disponible" ? "YA DISPONIBLE" : "PRÓXIMO ESTRENO"}
        </div>
        <div style={{ marginTop: width * 0.015, fontSize: width * 0.012, fontWeight: 900, letterSpacing: "0.3em", color: textColor, opacity: 0.5, textTransform: "lowercase" }}>
          {getSmartLink()}
        </div>
      </div>
    </div>
  );
};

export default CustomPromoCreator;
