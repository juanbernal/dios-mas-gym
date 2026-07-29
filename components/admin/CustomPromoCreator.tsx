import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { fetchMusicCatalog } from "../../services/musicService";
import { MusicItem } from "../../types";
import { getCorsFriendlyUrl } from "../../services/imageHelpers";

const SIZES = {
  instagram: { w: 1080, h: 1350, ratio: "4:5", label: "Instagram Post (4:5 HD)" },
  story: { w: 1080, h: 1920, ratio: "9:16", label: "Story / Reels / TikTok (9:16)" },
  post: { w: 1920, h: 1080, ratio: "16:9", label: "YouTube / Facebook (16:9)" },
  square: { w: 1080, h: 1080, ratio: "1:1", label: "Cuadrado Perfecto (1:1)" }
};

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

const FONTS = [
  { id: "serif-luxury", name: "DM Serif Luxury", class: "font-serif italic" },
  { id: "sans-bebas", name: "Bebas Poster Impact", class: "font-['Bebas_Neue'] tracking-wider uppercase font-black" },
  { id: "handwritten", name: "Caveat Script", class: "font-['Caveat'] text-3xl font-bold" },
  { id: "tech-mono", name: "Tech Cyber Mono", class: "font-mono font-bold uppercase tracking-widest" },
  { id: "classic-cinzel", name: "Cinzel Gold Roman", class: "font-['Cinzel'] font-bold tracking-widest" }
];

export const CustomPromoCreator: React.FC = () => {
  const navigate = useNavigate();
  const renderNodeRef = useRef<HTMLDivElement>(null);

  // Catalog
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);

  // Content Fields
  const [title, setTitle] = useState("TÍTULO DE TU CANCIÓN");
  const [artist, setArtist] = useState("Diosmasgym");
  const [releaseStatus, setReleaseStatus] = useState<"disponible" | "proximamente" | "preventa">("disponible");
  const [customPhrase, setCustomPhrase] = useState("Una producción de fe, superación y disciplina.");
  const [verseText, setVerseText] = useState("Todo lo puedo en Cristo que me fortalece. — FILIPENSES 4:13");
  const [songLyric, setSongLyric] = useState("");
  const [badgeText, setBadgeText] = useState("MANDO EJECUTIVO");
  const [producerText, setProducerText] = useState("PRODUCIDO EN CHIHUAHUA, MX");

  // Typography & Layout Controls
  const [selectedFont, setSelectedFont] = useState<string>("serif-luxury");
  const [activeTemplate, setActiveTemplate] = useState<"vinyl" | "scrapbook" | "cyberpunk" | "editorial" | "neon" | "grunge" | "glass" | "poster">("vinyl");
  const [sizeKey, setSizeKey] = useState<keyof typeof SIZES>("instagram");
  const [coverUrl, setCoverUrl] = useState<string>("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200");

  // Visual Decorators (MÁS ELEMENTOS CHIDOS)
  const [showGoldFrame, setShowGoldFrame] = useState<boolean>(true);
  const [showVinylSparks, setShowVinylSparks] = useState<boolean>(true);
  const [showRibbonBadge, setShowRibbonBadge] = useState<boolean>(true);
  const [showEqWaves, setShowEqWaves] = useState<boolean>(true);

  // Lighting & Effects
  const [bgBlur, setBgBlur] = useState<number>(20);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.55);
  const [accentColor, setAccentColor] = useState<string>("#c5a059");

  // Visibility Toggles
  const [showVerse, setShowVerse] = useState<boolean>(true);
  const [showLyric, setShowLyric] = useState<boolean>(true);
  const [showPlatforms, setShowPlatforms] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Status & Export
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentSize = SIZES[sizeKey];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  // Load Catalog
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
        if (full.length > 0) handleSelectSong(full[0]);
      } catch (err) {
        console.error("Error al cargar catálogo:", err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, []);

  const fetchLyricsForSong = async (songName: string, songArtist: string) => {
    setIsSearchingLyrics(true);
    try {
      const res = await fetch("/api/search-lyrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": localStorage.getItem("admin_password") || ""
        },
        body: JSON.stringify({ name: songName, artist: songArtist })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lyrics && data.lyrics !== "LETRA_NO_ENCONTRADA") {
          const lines = data.lyrics.split("\n")
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0 && !l.startsWith("["));
          if (lines.length > 0) {
            setSongLyric(`"${lines.slice(0, 2).join(" / ")}"`);
            setShowLyric(true);
            showToast("✨ Letra oficial auto-detectada");
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener la letra:", e);
    } finally {
      setIsSearchingLyrics(false);
    }
  };

  const handleSelectSong = (song: MusicItem) => {
    setSelectedSong(song);
    setTitle(song.name.toUpperCase());
    setArtist(song.artist || "Diosmasgym");
    if (song.cover) setCoverUrl(song.cover);
    setCustomPhrase(`Escucha "${song.name}" de ${song.artist || 'Diosmasgym'} en todas las plataformas.`);
    setIsSearchOpen(false);
    fetchLyricsForSong(song.name, song.artist || "Diosmasgym");
  };

  const handleRandomVerse = () => {
    const random = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
    setVerseText(`"${random.text}" — ${random.ref}`);
    setShowVerse(true);
    showToast(`📖 Versículo de Fe: ${random.ref}`);
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

  // ULTRA HD HIGH PRECISION RENDERER & DIRECT BLOB DOWNLOAD
  const handleExportUltraHD = async () => {
    if (!renderNodeRef.current) return;
    setIsExporting(true);
    showToast("⚡ Masterizando imagen en Ultra HD 4K... Por favor espera.");

    try {
      const targetNode = renderNodeRef.current;

      // Force Preload Images for CORS Safety
      const images = Array.from(targetNode.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          return new Promise((resolve) => {
            if (img.complete && img.naturalWidth !== 0) return resolve(true);
            const copy = new Image();
            copy.crossOrigin = "anonymous";
            copy.onload = () => resolve(true);
            copy.onerror = () => resolve(false);
            copy.src = img.src;
          });
        })
      );

      await document.fonts.ready;
      await new Promise((res) => setTimeout(res, 600));

      // Render at High Scale for crisp 4K Output
      const canvas = await html2canvas(targetNode, {
        scale: 4, // 4X Scale for Maximum Sharpness
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#05070a",
        logging: false,
      });

      // Direct Blob Stream Download
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("❌ Error al convertir imagen.");
          setIsExporting(false);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = `BANNER_4K_${title.replace(/\s+/g, "_")}_${activeTemplate.toUpperCase()}.png`;
        a.href = blobUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        showToast("🎉 ¡Banner Master Ultra HD 4K descargado con máxima calidad!");
        setIsExporting(false);
      }, "image/png", 1.0);

    } catch (err) {
      console.error("Export error:", err);
      showToast("❌ Error al exportar.");
      setIsExporting(false);
    }
  };

  const filteredCatalog = catalog.filter(song =>
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const activeFontClass = FONTS.find(f => f.id === selectedFont)?.class || "font-serif italic";

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
              Studio PRO de <span className="text-[#c5a059]">Banners HD 4K</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
              Diseña banners impactantes con marcos dorados, versículos de fe, ecualizadores visuales y letras oficiales.
            </p>
          </div>

          <button
            onClick={handleExportUltraHD}
            disabled={isExporting}
            className="px-8 py-5 bg-gradient-to-r from-[#c5a059] via-[#f3d38e] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:shadow-[0_0_40px_rgba(197,160,89,0.5)] transition-all flex items-center gap-3 disabled:opacity-50 transform hover:scale-105 active:scale-95"
          >
            {isExporting ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i> Renderizando 4K...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download text-base"></i> Descargar Banner Master 4K
              </>
            )}
          </button>
        </div>
      </div>

      {/* Studio Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT PANEL: CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* 1. Song & Image Picker */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-4 flex items-center gap-2">
              <i className="fa-solid fa-compact-disc text-base"></i> 1. Canción o Imagen Principal
            </h3>

            {/* Catalog Search */}
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

            {/* Custom Upload */}
            <label className="w-full py-3.5 bg-[#05070a] hover:bg-[#151828] border border-dashed border-white/20 hover:border-[#c5a059] rounded-xl text-xs font-bold text-gray-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all">
              <i className="fa-solid fa-cloud-arrow-up text-[#c5a059]"></i> Subir Imagen de Galería / Portada
              <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
            </label>
          </div>

          {/* 2. PLANTILLAS & ELEMENTOS DECORATIVOS CHIDOS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-[#c5a059] fa-wand-magic-sparkles text-base"></i> 2. Estilos & Adornos Gráficos
            </h3>

            {/* Templates Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "vinyl", name: "📀 Vinilo 3D Premium", desc: "Acetato giratorio en vivo" },
                { id: "scrapbook", name: "📸 Scrapbook Polaroid", desc: "Foto instantánea con cinta" },
                { id: "glass", name: "💎 Glassmorphism", desc: "Efecto cristal de lujo" },
                { id: "cyberpunk", name: "⚡ Cyberpunk 2077", desc: "Marco neón futurista" },
                { id: "editorial", name: "🖤 Editorial Vogue", desc: "Revista luxury Serif" },
                { id: "poster", name: "🎨 Póster de Concierto", desc: "Estética flyer oficial" }
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

            {/* Decorator Toggles */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 block mb-1">Elementos Gráficos Adicionales</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2 rounded-lg border border-white/5">
                  <input type="checkbox" checked={showGoldFrame} onChange={(e) => setShowGoldFrame(e.target.checked)} className="accent-[#c5a059]" />
                  Marco Dorado Luxury
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2 rounded-lg border border-white/5">
                  <input type="checkbox" checked={showEqWaves} onChange={(e) => setShowEqWaves(e.target.checked)} className="accent-[#c5a059]" />
                  Ecualizador Visual
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2 rounded-lg border border-white/5">
                  <input type="checkbox" checked={showRibbonBadge} onChange={(e) => setShowRibbonBadge(e.target.checked)} className="accent-[#c5a059]" />
                  Listón de Fe Oficial
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-[#05070a] p-2 rounded-lg border border-white/5">
                  <input type="checkbox" checked={showPlatforms} onChange={(e) => setShowPlatforms(e.target.checked)} className="accent-[#c5a059]" />
                  Iconos Streaming
                </label>
              </div>
            </div>

            {/* Typography Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Tipografía del Título</label>
              <select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-xs text-white outline-none cursor-pointer"
              >
                {FONTS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. BIBLE VERSES & SONG LYRICS */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] flex items-center gap-2">
              <i className="fa-solid fa-book-bible text-base"></i> 3. Versículos & Letra Oficial
            </h3>

            {/* Versículo de la Biblia */}
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
                placeholder="Escribe un versículo..."
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVerse}
                  onChange={(e) => setShowVerse(e.target.checked)}
                  className="accent-[#c5a059]"
                />
                Mostrar Versículo en el Banner
              </label>
            </div>

            {/* Letra de la Canción */}
            <div className="p-3.5 bg-[#05070a] border border-white/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-quote-left text-[#c5a059]"></i> Frase / Letra Destacada
                </span>
                {isSearchingLyrics && (
                  <span className="text-[9px] text-[#c5a059] animate-pulse">Buscando letra...</span>
                )}
              </div>
              <textarea
                value={songLyric}
                onChange={(e) => setSongLyric(e.target.value)}
                rows={2}
                className="w-full bg-[#090c14] border border-white/10 focus:border-[#c5a059] rounded-lg p-2.5 text-[11px] text-gray-300 outline-none resize-none"
                placeholder="Frase o coro de la canción..."
              />
              <label className="flex items-center gap-2 text-[10px] text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLyric}
                  onChange={(e) => setShowLyric(e.target.checked)}
                  className="accent-[#c5a059]"
                />
                Mostrar Frase de Letra
              </label>
            </div>
          </div>

          {/* 4. TEXTS & TUNING */}
          <div className="bg-[#0b0e17] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#c5a059] mb-2 flex items-center gap-2">
              <i className="fa-solid fa-[#c5a059] fa-sliders text-base"></i> 4. Textos Básicos y Color
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

            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Color de Acento Neón</span>
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

        {/* RIGHT PANEL: LIVE MASTER RENDER NODE (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-gray-400">
              VISTA PREVIA EN VIVO DE ALTA CALIDAD
            </span>
            <span className="text-[10px] font-black uppercase text-[#c5a059] bg-[#c5a059]/10 border border-[#c5a059]/30 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              RENDER MASTER 4K (3840px)
            </span>
          </div>

          {/* Render Master Frame Node */}
          <div className="w-full bg-[#05070a] border border-white/10 p-4 md:p-8 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
            
            {/* Target Node Captured by html2canvas */}
            <div
              ref={renderNodeRef}
              style={{
                width: "100%",
                maxWidth: `${currentSize.w / 3.5}px`,
                aspectRatio: currentSize.aspect,
                position: "relative",
                overflow: "hidden",
                borderRadius: "28px"
              }}
              className={`shadow-2xl flex flex-col justify-between p-6 md:p-10 transition-all ${
                showGoldFrame ? "border-4 border-[#c5a059]" : "border-2 border-white/10"
              } ${
                activeTemplate === "vinyl" ? "bg-gradient-to-br from-[#0c0e17] via-[#141726] to-[#05070a]" :
                activeTemplate === "scrapbook" ? "bg-[#181512]" :
                activeTemplate === "glass" ? "bg-black/70 backdrop-blur-3xl" :
                activeTemplate === "cyberpunk" ? "bg-[#030d14] shadow-[0_0_60px_rgba(0,255,255,0.25)]" :
                activeTemplate === "poster" ? "bg-[#140808]" :
                "bg-[#08080a]"
              }`}
            >
              {/* Dynamic Background Image with Blur */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all"
                style={{
                  backgroundImage: `url(${getCorsFriendlyUrl(coverUrl)})`,
                  filter: `blur(${bgBlur}px)`,
                  opacity: 1 - overlayOpacity
                }}
              />

              {/* Dynamic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />

              {/* Ambient Glow Aura */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full blur-[100px] pointer-events-none opacity-40 z-0"
                style={{ backgroundColor: accentColor }}
              />

              {/* TOP HEADER BAR */}
              <div className="relative z-10 flex justify-between items-center">
                <span className={`text-[9px] md:text-[11px] font-black tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border backdrop-blur-md ${
                  releaseStatus === "disponible" ? "bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059]/40" :
                  releaseStatus === "proximamente" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" :
                  "bg-purple-500/20 text-purple-300 border-purple-500/40"
                }`}>
                  {releaseStatus === "disponible" ? "🔥 YA DISPONIBLE" : releaseStatus === "proximamente" ? "⚡ PRÓXIMAMENTE" : "💎 PRE-SAVE"}
                </span>

                {showRibbonBadge && (
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-black bg-[#c5a059] px-3.5 py-1 rounded-full shadow-lg">
                    FE Y DISCIPLINA
                  </span>
                )}
              </div>

              {/* CENTER ARTWORK & TEXT CONTENT */}
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

                {/* Standard Covers */}
                {(activeTemplate === "glass" || activeTemplate === "cyberpunk" || activeTemplate === "neon" || activeTemplate === "editorial" || activeTemplate === "poster") && (
                  <div className="relative mb-6">
                    <img
                      src={getCorsFriendlyUrl(coverUrl)}
                      alt={title}
                      className={`w-52 h-52 md:w-72 md:h-72 object-cover rounded-2xl shadow-2xl border-2 ${
                        activeTemplate === "cyberpunk" ? "border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.4)]" :
                        activeTemplate === "neon" ? "border-fuchsia-400 shadow-[0_0_30px_rgba(217,70,239,0.4)]" :
                        activeTemplate === "poster" ? "border-red-500/60 shadow-2xl" :
                        "border-white/30"
                      }`}
                    />
                  </div>
                )}

                {/* Equalizer Visual Waves */}
                {showEqWaves && (
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[40, 70, 30, 90, 50, 80, 40, 60].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#c5a059] rounded-full animate-pulse"
                        style={{ height: `${h / 4}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}

                {/* Title & Artist */}
                <h2 className={`font-black text-3xl md:text-5xl text-white leading-tight drop-shadow-2xl ${activeFontClass}`}>
                  {title}
                </h2>

                <p className="text-sm md:text-base font-bold uppercase tracking-widest mt-2" style={{ color: accentColor }}>
                  {artist}
                </p>

                {/* Custom Lyric Quote Box */}
                {showLyric && songLyric && (
                  <div className="mt-4 p-3.5 bg-black/70 backdrop-blur-md border border-[#c5a059]/40 rounded-2xl max-w-md shadow-2xl">
                    <p className="text-xs md:text-sm font-serif italic text-amber-200">
                      {songLyric}
                    </p>
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] block mt-1">LETRA OFICIAL</span>
                  </div>
                )}

                {/* Bible Verse Box */}
                {showVerse && verseText && (
                  <div className="mt-3 p-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl max-w-md shadow-2xl">
                    <p className="text-[11px] md:text-xs text-gray-200 italic">
                      {verseText}
                    </p>
                  </div>
                )}
              </div>

              {/* BOTTOM FOOTER PLATFORMS & PRODUCER FOOTER */}
              <div className="relative z-10 border-t border-white/10 pt-4 flex flex-col items-center gap-2">
                {showPlatforms && (
                  <div className="flex items-center gap-6 text-xl text-gray-300">
                    <i className="fa-brands fa-spotify hover:text-green-500 transition-colors"></i>
                    <i className="fa-brands fa-apple hover:text-white transition-colors"></i>
                    <i className="fa-brands fa-youtube hover:text-red-500 transition-colors"></i>
                    <i className="fa-brands fa-amazon hover:text-amber-400 transition-colors"></i>
                    <i className="fa-solid fa-music hover:text-pink-500 transition-colors"></i>
                  </div>
                )}
                <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-gray-400">
                  {producerText}
                </span>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomPromoCreator;
