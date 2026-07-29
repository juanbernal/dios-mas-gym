import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getCorsFriendlyUrl } from "../../services/imageHelpers";

const SIZES = {
  instagram: { w: 1080, h: 1350, ratio: "4:5", label: "Instagram Post (4:5)" },
  story: { w: 1080, h: 1920, ratio: "9:16", label: "Story / Reels / TikTok (9:16)" },
  post: { w: 1920, h: 1080, ratio: "16:9", label: "YouTube / Facebook (16:9)" },
  square: { w: 1080, h: 1080, ratio: "1:1", label: "Cuadrado Perfecto (1:1)" }
};

export const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const masterRef = useRef<HTMLDivElement>(null);

  // States
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);

  // Banner Content Fields
  const [title, setTitle] = useState("TITULO DE TU CANCIÓN");
  const [artist, setArtist] = useState("Diosmasgym");
  const [releaseStatus, setReleaseStatus] = useState<"disponible" | "proximamente" | "preventa">("disponible");
  const [releaseDate, setReleaseDate] = useState("PRÓXIMAMENTE EN PLATAFORMAS");
  const [customPhrase, setCustomPhrase] = useState("Una melodía inspiradora para transformar tu espíritu y fortalecer tu fe.");
  const [quoteBadge, setQuoteBadge] = useState("EDICIÓN EXCLUSIVA ♡");
  const [sideNote, setSideNote] = useState("Música con propósito y disciplina");

  // Visual Customizations
  const [activeTemplate, setActiveTemplate] = useState<"vinyl" | "scrapbook" | "cyberpunk" | "editorial" | "neon" | "grunge">("vinyl");
  const [sizeKey, setSizeKey] = useState<keyof typeof SIZES>("instagram");
  const [coverUrl, setCoverUrl] = useState<string>("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800");
  const [bgBlur, setBgBlur] = useState<number>(30);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.65);
  const [accentColor, setAccentColor] = useState<string>("#c5a059");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [glowEffect, setGlowEffect] = useState<boolean>(true);
  const [showPlatforms, setShowPlatforms] = useState<boolean>(true);
  const [noiseTexture, setNoiseTexture] = useState<boolean>(true);

  // Status & Export
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentSize = SIZES[sizeKey];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Fetch Catalog
  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog("diosmasgym"),
          fetchMusicCatalog("juan614")
        ]);
        const full = [...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCatalog(full);
        if (full.length > 0) {
          handleSelectSong(full[0]);
        }
      } catch (err) {
        console.error("Error al cargar catálogo:", err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, []);

  const handleSelectSong = (song: MusicItem) => {
    setSelectedSong(song);
    setTitle(song.name.toUpperCase());
    setArtist(song.artist || "Diosmasgym");
    if (song.cover) setCoverUrl(song.cover);
    setCustomPhrase(`Escucha "${song.name}" de ${song.artist || 'Diosmasgym'} en todas las plataformas digitales.`);
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

  // Export Banner
  const handleExportBanner = async () => {
    if (!masterRef.current) return;
    setIsExporting(true);
    try {
      // Allow images and fonts to render
      await document.fonts.ready;
      await new Promise(res => setTimeout(res, 800));

      const canvas = await html2canvas(masterRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null
      });

      const link = document.createElement("a");
      link.download = `BANNER_${title.replace(/\s+/g, "_")}_${activeTemplate.toUpperCase()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      showToast("✨ Banner descargado con éxito en Alta Definición HD");
    } catch (err) {
      console.error(err);
      showToast("❌ Error al exportar el banner");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCatalog = catalog.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#05070a] text-white pt-20 pb-32 px-4 md:px-8 font-['Poppins']">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[200] bg-[#c5a059] text-black font-bold px-6 py-3 rounded-xl shadow-2xl animate-bounce flex items-center gap-2">
          <span>✨</span> {toast}
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
              Diseñador Avanzado de <span className="text-[#c5a059]">Banners</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Crea promocionales espectaculares con estética moderna: Vinilos 3D, Scrapbook Polaroid, Cyberpunk Neón y Minimalismo Editorial.
            </p>
          </div>
          <button
            onClick={handleExportBanner}
            disabled={isExporting}
            className="px-6 py-4 bg-gradient-to-r from-[#c5a059] via-[#e5c178] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_30px_rgba(197,160,89,0.4)] transition-all flex items-center gap-3 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i> Exportando HD...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download"></i> Descargar Banner Ultra HD
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT PANEL: CONTROLS & TEMPLATES (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Song Selector & Image Input */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-4 flex items-center gap-2">
              <i className="fa-solid fa-compact-disc text-base"></i> 1. Selección de Canción o Imagen
            </h3>

            {/* Catalog Search */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
                placeholder="Buscar canción en catálogo..."
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none"
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

            {/* Custom Upload Button */}
            <label className="w-full py-3 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all">
              <i className="fa-solid fa-cloud-arrow-up text-[#c5a059]"></i> Subir Imagen de Galería / Portada
              <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
            </label>
          </div>

          {/* 2. Style & Template Selector */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-4 flex items-center gap-2">
              <i className="fa-solid fa-palette text-base"></i> 2. Estilo Visual del Banner
            </h3>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { id: "vinyl", name: "📀 Vinilo 3D", desc: "Acetato giratorio moderno" },
                { id: "scrapbook", name: "📸 Scrapbook", desc: "Polaroid & cinta artesanal" },
                { id: "cyberpunk", name: "⚡ Cyberpunk", desc: "Neón y estética futurista" },
                { id: "editorial", name: "🖤 Editorial", desc: "Revista luxury Serif" },
                { id: "neon", name: "💡 Glow Neón", desc: "Luces de estudio vibrantes" },
                { id: "grunge", name: "🔥 Grunge", desc: "Textura urbana rebelde" },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setActiveTemplate(tmpl.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activeTemplate === tmpl.id
                      ? "bg-[#c5a059] text-black border-[#c5a059] font-bold shadow-lg"
                      : "bg-[#05070a] text-gray-300 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-xs font-bold">{tmpl.name}</div>
                  <div className={`text-[9px] ${activeTemplate === tmpl.id ? "text-black/70" : "text-gray-500"}`}>
                    {tmpl.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Size / Aspect Ratio Selector */}
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#c5a059] mb-2">
              Formato de Salida
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SIZES) as Array<keyof typeof SIZES>).map((key) => (
                <button
                  key={key}
                  onClick={() => setSizeKey(key)}
                  className={`p-2.5 rounded-xl text-[11px] font-bold border transition-all text-left ${
                    sizeKey === key
                      ? "bg-white text-black border-white"
                      : "bg-[#05070a] text-gray-400 border-white/10 hover:border-white/20"
                  }`}
                >
                  {SIZES[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Text Fields Customization */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-2 flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-base"></i> 3. Textos y Personalización
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
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Estado de Lanzamiento</label>
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

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Frase Promocional o Subtítulo</label>
              <textarea
                value={customPhrase}
                onChange={(e) => setCustomPhrase(e.target.value)}
                rows={2}
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none resize-none"
              />
            </div>

            {/* Advanced Tuning Sliders */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Oscuridad del Fondo (Overlay)</span>
                  <span>{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-[#c5a059]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Desenfoque del Fondo (Blur)</span>
                  <span>{bgBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={bgBlur}
                  onChange={(e) => setBgBlur(parseInt(e.target.value))}
                  className="w-full accent-[#c5a059]"
                />
              </div>

              {/* Color Toggles */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] text-gray-400">Color de Acento</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE HIGH-RES CANVAS PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-400">
              VISTA PREVIA EN VIVO ({currentSize.label})
            </span>
            <span className="text-[10px] font-black uppercase text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3 py-1 rounded-full">
              RENDER HD 2K
            </span>
          </div>

          {/* Render Container Frame */}
          <div className="w-full bg-[#080a10] border border-white/10 p-4 md:p-8 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
            
            {/* The Actual Render Master Node */}
            <div
              ref={masterRef}
              style={{
                width: "100%",
                maxWidth: `${currentSize.w / 2}px`,
                aspectRatio: `${currentSize.w} / ${currentSize.h}`,
                position: "relative",
                overflow: "hidden",
                borderRadius: "24px"
              }}
              className={`shadow-2xl flex flex-col justify-between p-6 md:p-10 transition-all ${
                activeTemplate === "vinyl" ? "bg-gradient-to-br from-[#0c0e17] via-[#141726] to-[#05070a] border border-[#c5a059]/40" :
                activeTemplate === "scrapbook" ? "bg-[#161412] border-2 border-amber-900/40" :
                activeTemplate === "cyberpunk" ? "bg-[#030d14] border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(0,255,255,0.2)]" :
                activeTemplate === "editorial" ? "bg-[#0a0a0c] border border-white/20" :
                activeTemplate === "neon" ? "bg-[#120817] border-2 border-fuchsia-500/40" :
                "bg-[#140c0c] border-2 border-red-600/40"
              }`}
            >
              {/* Dynamic Blurred Background Cover */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all"
                style={{
                  backgroundImage: `url(${getCorsFriendlyUrl(coverUrl)})`,
                  filter: `blur(${bgBlur}px)`,
                  opacity: 1 - overlayOpacity
                }}
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />

              {/* TEMPLATE RENDER VARIATIONS */}
              
              {/* TOP BAR */}
              <div className="relative z-10 flex justify-between items-center">
                <span className={`text-[9px] md:text-[11px] font-black tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border backdrop-blur-md ${
                  releaseStatus === "disponible" ? "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059]/40" :
                  releaseStatus === "proximamente" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" :
                  "bg-purple-500/20 text-purple-300 border-purple-500/40"
                }`}>
                  {releaseStatus === "disponible" ? "🔥 YA DISPONIBLE" : releaseStatus === "proximamente" ? "⚡ PRÓXIMAMENTE" : "💎 PRE-SAVE"}
                </span>

                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-400">
                  DIOSMASGYM
                </span>
              </div>

              {/* CENTER MAIN ARTWORK */}
              <div className="relative z-10 my-auto flex flex-col items-center text-center py-4">

                {/* Vinyl 3D Mode */}
                {activeTemplate === "vinyl" && (
                  <div className="relative group cursor-pointer mb-6">
                    <img
                      src={getCorsFriendlyUrl(coverUrl)}
                      alt={title}
                      className="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-2xl border-2 border-white/20 relative z-10"
                    />
                    <div className="absolute top-0 -right-8 md:-right-12 w-48 h-48 md:w-64 md:h-64 rounded-full bg-black border-8 border-gray-900 flex items-center justify-center shadow-2xl animate-spin-slow">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/40 bg-black flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-amber-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Scrapbook Polaroid Mode */}
                {activeTemplate === "scrapbook" && (
                  <div className="relative bg-white p-4 pb-12 rounded-lg shadow-2xl rotate-[-2deg] mb-6 max-w-[260px] border border-gray-300">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-amber-200/80 backdrop-blur-sm rotate-2 shadow-sm border border-amber-300/50" />
                    <img
                      src={getCorsFriendlyUrl(coverUrl)}
                      alt={title}
                      className="w-full aspect-square object-cover rounded-sm mb-3"
                    />
                    <div className="font-serif italic text-black font-bold text-xs text-center">
                      "{title}" — {artist} ♡
                    </div>
                  </div>
                )}

                {/* Cyberpunk Neón / Modern Frame */}
                {(activeTemplate === "cyberpunk" || activeTemplate === "neon" || activeTemplate === "editorial" || activeTemplate === "grunge") && (
                  <div className="relative mb-6">
                    <img
                      src={getCorsFriendlyUrl(coverUrl)}
                      alt={title}
                      className={`w-52 h-52 md:w-72 md:h-72 object-cover rounded-2xl shadow-2xl border-2 ${
                        activeTemplate === "cyberpunk" ? "border-cyan-400 shadow-cyan-500/50" :
                        activeTemplate === "neon" ? "border-fuchsia-400 shadow-fuchsia-500/50" :
                        activeTemplate === "editorial" ? "border-white/40" :
                        "border-red-500/50 shadow-red-600/40"
                      }`}
                    />
                  </div>
                )}

                {/* Title & Artist Text */}
                <h2 className={`font-serif italic font-black text-3xl md:text-5xl text-white leading-tight drop-shadow-lg ${
                  activeTemplate === "editorial" ? "font-serif text-[#e5c178]" : ""
                }`}>
                  {title}
                </h2>

                <p className="text-sm md:text-base font-bold uppercase tracking-widest mt-2" style={{ color: accentColor }}>
                  {artist}
                </p>

                {/* Custom Phrase */}
                <p className="text-xs md:text-sm text-gray-300 mt-3 max-w-md italic font-light px-4">
                  "{customPhrase}"
                </p>
              </div>

              {/* BOTTOM FOOTER PLATFORMS */}
              <div className="relative z-10 border-t border-white/10 pt-4 flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  DISPONIBLE EN TODAS LAS PLATAFORMAS
                </span>
                <div className="flex items-center gap-6 text-xl text-gray-300">
                  <i className="fa-brands fa-spotify hover:text-green-500 transition-colors"></i>
                  <i className="fa-brands fa-apple hover:text-white transition-colors"></i>
                  <i className="fa-brands fa-youtube hover:text-red-500 transition-colors"></i>
                  <i className="fa-brands fa-amazon hover:text-amber-400 transition-colors"></i>
                  <i className="fa-solid fa-music hover:text-pink-500 transition-colors"></i>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomPromoCreator;
