import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';

interface VersiculoPredefinido {
  versiculo: string;
  cita: string;
  categoria: string;
}

const VERSICULOS_PREDEFINIDOS: VersiculoPredefinido[] = [
  {
    versiculo: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.",
    cita: "JOSUÉ 1:9",
    categoria: "Valentía / Esfuerzo"
  },
  {
    versiculo: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.",
    cita: "ISAÍAS 41:10",
    categoria: "Fortaleza"
  },
  {
    versiculo: "Todo lo puedo en Cristo que me fortalece.",
    cita: "FILIPENSES 4:13",
    categoria: "Fortaleza"
  },
  {
    versiculo: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?",
    cita: "SALMOS 27:1",
    categoria: "Confianza"
  },
  {
    versiculo: "El hierro con hierro se afila, y el hombre con el rostro de su amigo se afila.",
    cita: "PROVERBIOS 27:17",
    categoria: "Disciplina"
  },
  {
    versiculo: "No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.",
    cita: "GÁLATAS 6:9",
    categoria: "Perseverancia"
  },
  {
    versiculo: "Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.",
    cita: "2 TIMOTEO 1:7",
    categoria: "Valentía"
  },
  {
    versiculo: "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.",
    cita: "ISAÍAS 40:31",
    categoria: "Fortaleza"
  },
  {
    versiculo: "Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas.",
    cita: "ISAÍAS 40:29",
    categoria: "Fortaleza"
  },
  {
    versiculo: "Dios es el que me ciñe de fuerza, y hace perfecto mi camino.",
    cita: "SALMOS 18:32",
    categoria: "Fuerza / Fe"
  },
  {
    versiculo: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.",
    cita: "FILIPENSES 4:6",
    categoria: "Paz"
  },
  {
    versiculo: "Sino que golpeo mi cuerpo, y lo pongo en servidumbre, no sea que habiendo sido heraldo para otros, yo mismo venga a ser eliminado.",
    cita: "1 CORINTIOS 9:27",
    categoria: "Disciplina"
  },
  {
    versiculo: "Mas gracias sean dadas a Dios, que nos da la victoria por medio de nuestro Señor Jesucristo.",
    cita: "1 CORINTIOS 15:57",
    categoria: "Victoria"
  },
  {
    versiculo: "Antes, en todas estas cosas somos más que vencedores por medio de aquel que nos amó.",
    cita: "ROMANOS 8:37",
    categoria: "Victoria"
  },
  {
    versiculo: "Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.",
    cita: "1 PEDRO 5:7",
    categoria: "Paz"
  }
];

interface ParsedReference {
  book: string;
  chapter: number;
  verse: number;
}

const parseReference = (ref: string): ParsedReference | null => {
  const cleaned = ref.trim();
  const regex = /^((?:\d+\s+)?[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]+?)\s+(\d+):(\d+)$/;
  const match = cleaned.match(regex);
  if (!match) return null;

  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10)
  };
};

const getAPIBookName = (book: string): string => {
  return book
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase();
};

const FONDO_ESTILOS = [
  { id: 'carbon', name: '🖤 Negro Carbón', bgClass: 'bg-[#05070a]' },
  { id: 'diosmasgym', name: '⚜️ Cruz Dios Mas Gym', bgClass: 'bg-[#05070a]', watermark: '/logo-diosmasgym.png' },
  { id: 'mando', name: '🛡️ Mando Ejecutivo', bgClass: 'bg-[#05070a]', watermark: '/logo-mando-ejecutivo.png' },
  { id: 'juan614', name: '🤠 Juan 614', bgClass: 'bg-[#05070a]', watermark: '/logo-juan614-v2.jpg' },
  { id: 'metal', name: '⚡ Grano de Acero', bgClass: 'bg-gradient-to-b from-[#080b11] to-[#030406]', grain: true }
];

const MunicionFe: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  const initialIndex = useRef(Math.floor(Math.random() * VERSICULOS_PREDEFINIDOS.length));

  const [texto, setTexto] = useState(VERSICULOS_PREDEFINIDOS[initialIndex.current].versiculo);
  const [cita, setCita] = useState(VERSICULOS_PREDEFINIDOS[initialIndex.current].cita);
  const [styleFondo, setStyleFondo] = useState(FONDO_ESTILOS[0]);
  const [format, setFormat] = useState<'story' | 'post' | 'ig_portrait'>('ig_portrait');
  const [colorAccent, setColorAccent] = useState('#c5a059'); // Gold
  const [fontSize, setFontSize] = useState(24);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('center');
  const [logoSize, setLogoSize] = useState(80);
  const [generating, setGenerating] = useState(false);

  const handleSelectPredefinido = (v: VersiculoPredefinido) => {
    setTexto(v.versiculo);
    setCita(v.cita);
  };

  const [loadingBible, setLoadingBible] = useState(false);

  const handleFetchFromBible = async () => {
    if (!cita || !cita.trim()) {
      alert("Por favor, escribe una cita en el campo 'Cita / Autor' (ej. Josué 1:9, Filipenses 4:13).");
      return;
    }

    setLoadingBible(true);
    try {
      const parsed = parseReference(cita);
      if (!parsed) {
        throw new Error("Formato de cita no reconocido. Usa el formato 'Libro Capítulo:Versículo' (ej: Josue 1:9 o 1 Corintios 9:27).");
      }

      const apiBook = getAPIBookName(parsed.book);
      const url = `https://bible-api.deno.dev/api/read/rv1960/${apiBook}/${parsed.chapter}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("No se pudo conectar con la API de la Biblia o el libro/capítulo es inválido.");
      }

      const data = await res.json();
      if (!data.vers || !Array.isArray(data.vers)) {
        throw new Error("Respuesta de la API inválida.");
      }

      const verseObj = data.vers.find((v: any) => v.number === parsed.verse);
      if (!verseObj) {
        throw new Error(`No se encontró el versículo ${parsed.verse} en el capítulo ${parsed.chapter}.`);
      }

      setTexto(verseObj.verse);
      setCita(cita.toUpperCase().trim());
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al buscar el versículo.");
    } finally {
      setLoadingBible(false);
    }
  };

  const handleRandomPredefinido = () => {
    const rand = VERSICULOS_PREDEFINIDOS[Math.floor(Math.random() * VERSICULOS_PREDEFINIDOS.length)];
    setTexto(rand.versiculo);
    setCita(rand.cita);
  };

  const handleDownload = async () => {
    const element = previewRef.current;
    if (!element) return;
    setGenerating(true);

    // Save original styles
    const originalWidth = element.style.width;
    const originalHeight = element.style.height;
    const originalMaxWidth = element.style.maxWidth;

    // Force absolute dimensions for clean high-res export (360px scaled by 3 = 1080px)
    if (format === 'story') {
      element.style.width = '360px';
      element.style.height = '640px';
      element.style.maxWidth = 'none';
    } else if (format === 'ig_portrait') {
      element.style.width = '360px';
      element.style.height = '450px';
      element.style.maxWidth = 'none';
    } else {
      element.style.width = '360px';
      element.style.height = '360px';
      element.style.maxWidth = 'none';
    }

    try {
      // Sleep 50ms to allow browser layout reflow
      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: false,
        scale: 4, // 360 * 4 = 1440px (ultra high resolution, premium quality)
        backgroundColor: '#05070a',
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png'); // Lossless PNG for perfectly sharp text and details
      const link = document.createElement('a');
      link.download = `municion-fe-${cita.replace(/[^a-zA-Z0-9]/g, '_') || 'cita'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error al generar la imagen. Inténtalo de nuevo.');
    } finally {
      // Restore original styles
      element.style.width = originalWidth;
      element.style.height = originalHeight;
      element.style.maxWidth = originalMaxWidth;
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins'] text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-left">
          <h1 
            onClick={() => navigate('/admin')}
            className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3 cursor-pointer hover:text-[#c5a059] transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i> Volver al Mando Ejecutivo
          </h1>
          <h2 className="font-serif italic text-3xl md:text-5xl text-white leading-tight">
            Centro de <span className="text-[#c5a059]">Munición de Fe</span>
          </h2>
          <p className="text-white/40 text-[10px] uppercase tracking-wider mt-2">
            Generador de gráficos premium con versículos y barras para redes sociales.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Controls Panel */}
          <div className="lg:col-span-6 flex flex-col gap-8 bg-[#0f111a] border border-[#c5a059]/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
            
            {/* Quick Presets selector */}
            <div className="flex flex-col gap-3">
              <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Biblioteca de Munición Rápida</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  type="button"
                  onClick={handleRandomPredefinido}
                  className="shrink-0 px-4 py-2.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 text-[9px] font-black uppercase tracking-wider hover:border-[#c5a059] hover:bg-[#c5a059]/20 transition-all text-[#c5a059]"
                >
                  🎲 Aleatorio
                </button>
                {VERSICULOS_PREDEFINIDOS.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPredefinido(v)}
                    className="shrink-0 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider hover:border-[#c5a059]/40 hover:bg-[#c5a059]/10 transition-all text-white/80 hover:text-white"
                  >
                    {v.cita} ({v.categoria})
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Mensaje / Versículo</label>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={4}
                maxLength={400}
                className="w-full bg-[#05070a] border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#c5a059]/40 transition-colors resize-none"
                placeholder="Escribe el mensaje motivador o versículo bíblico..."
              />
              <div className="text-right text-[8px] text-white/30 font-bold">
                {texto.length} / 400 caracteres
              </div>
            </div>

            {/* Cita Reference Input */}
            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Cita / Autor</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cita}
                  onChange={e => setCita(e.target.value)}
                  className="flex-1 bg-[#05070a] border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-[#c5a059]/40 transition-colors"
                  placeholder="Ej: JOSUÉ 1:9 o DIOS MAS GYM"
                />
                <button
                  type="button"
                  onClick={handleFetchFromBible}
                  disabled={loadingBible}
                  className="px-4 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 hover:border-[#c5a059] text-[#c5a059] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Cargar texto desde la Biblia Reina Valera 1960"
                >
                  {loadingBible ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-cloud-arrow-down"></i>
                  )}
                  {loadingBible ? "Buscando..." : "Cargar Biblia"}
                </button>
              </div>
            </div>

            {/* Grid settings */}
            <div className="grid grid-cols-2 gap-6">
              
              {/* Format Select */}
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Formato de Redes</label>
                <div className="flex bg-[#05070a] p-1 rounded-2xl border border-white/10 flex-col md:flex-row gap-1 md:gap-0">
                  <button
                    type="button"
                    onClick={() => setFormat('story')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      format === 'story' ? 'bg-[#c5a059] text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    📱 Reels (9:16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('ig_portrait')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      format === 'ig_portrait' ? 'bg-[#c5a059] text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    📸 IG Post (4:5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('post')}
                    className={`flex-1 py-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      format === 'post' ? 'bg-[#c5a059] text-black' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    🖼️ Cuadrado (1:1)
                  </button>
                </div>
              </div>

              {/* Text Align Select */}
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Alineación del Texto</label>
                <div className="flex bg-[#05070a] p-1 rounded-2xl border border-white/10">
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAlign(a)}
                      className={`flex-1 py-3 text-xs rounded-xl transition-all ${
                        align === a ? 'bg-[#c5a059] text-black font-bold' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <i className={`fas fa-align-${a}`}></i>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Background design selector */}
            <div className="flex flex-col gap-2">
              <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Marca de Agua / Fondo</label>
              <div className="grid grid-cols-2 gap-3">
                {FONDO_ESTILOS.map(estilo => (
                  <button
                    key={estilo.id}
                    type="button"
                    onClick={() => setStyleFondo(estilo)}
                    className={`px-4 py-3 rounded-2xl border text-left text-[10px] font-bold transition-all ${
                      styleFondo.id === estilo.id 
                        ? 'border-[#c5a059] bg-[#c5a059]/10 text-[#c5a059]' 
                        : 'border-white/10 bg-[#05070a] hover:border-white/20 text-white/70'
                    }`}
                  >
                    {estilo.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders group */}
            <div className="grid grid-cols-2 gap-6">
              
              {/* Font Size slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Tamaño de Letra</label>
                  <span className="text-[10px] font-bold text-[#c5a059]">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={42}
                  value={fontSize}
                  onChange={e => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-[#c5a059]"
                />
              </div>

              {/* Accent Color picker */}
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Color de Cita / Detalles</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorAccent}
                    onChange={e => setColorAccent(e.target.value)}
                    className="w-12 h-10 bg-transparent border border-white/15 rounded-xl cursor-pointer"
                  />
                  <div className="flex gap-2">
                    {['#c5a059', '#00ffcc', '#ffffff', '#ff4b2b'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColorAccent(c)}
                        className="w-6 h-6 rounded-full border border-white/20"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Logo Size slider (Only if watermark exists) */}
            {styleFondo.watermark && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Tamaño de Logo</label>
                  <span className="text-[10px] font-bold text-[#c5a059]">{logoSize}px</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={180}
                  value={logoSize}
                  onChange={e => setLogoSize(parseInt(e.target.value))}
                  className="w-full accent-[#c5a059]"
                />
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={generating}
              className="mt-4 py-5 rounded-2xl bg-[#c5a059] text-black font-black text-[10px] uppercase tracking-[0.25em] hover:bg-white transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Generando Imagen...
                </>
              ) : (
                <>
                  <i className="fas fa-cloud-arrow-down"></i> Descargar Imagen
                </>
              )}
            </button>

          </div>

          {/* Interactive Live Preview Panel */}
          <div className="lg:col-span-6 flex flex-col items-center justify-start">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-4 align-self-start">Vista Previa (En Vivo)</span>
            
            {/* Resolution boundary box wrapper */}
            <div className="w-full max-w-[360px] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative bg-[#05070a]">
              
              {/* Render Canvas */}
              <div
                ref={previewRef}
                style={{ 
                  textAlign: align,
                  width: '100%',
                  aspectRatio: format === 'story' ? '9/16' : format === 'ig_portrait' ? '4/5' : '1/1'
                }}
                className={`relative flex flex-col items-center justify-between ${
                  format === 'story' ? 'p-10' : format === 'ig_portrait' ? 'p-8' : 'p-6'
                } ${styleFondo.bgClass} overflow-hidden select-none`}
              >
                
                {/* Grain Effect */}
                {styleFondo.grain && (
                  <div 
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='noiseFilter'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noiseFilter)' opacity='0.04'/></svg>")` }}
                  ></div>
                )}

                {/* Watermark Watermark background overlay */}
                {styleFondo.watermark && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
                    <img 
                      src={styleFondo.watermark} 
                      alt="watermark" 
                      style={{ width: '75%', height: 'auto', maxHeight: '75%' }}
                      className="object-contain"
                    />
                  </div>
                )}

                {/* Header (Logo small top) */}
                <div className="w-full flex justify-center pt-2">
                  {styleFondo.watermark ? (
                    <img 
                      src={styleFondo.watermark} 
                      alt="logo header" 
                      style={{ width: `${logoSize}px`, height: 'auto' }}
                      className="object-contain"
                    />
                  ) : (
                    <span 
                      style={{ color: colorAccent }}
                      className="text-[8px] font-black uppercase tracking-[0.5em]"
                    >
                      Mando Ejecutivo
                    </span>
                  )}
                </div>

                {/* Center Content: The quote text */}
                <div className={`w-full flex-1 flex flex-col justify-center ${
                  format === 'story' ? 'py-8' : format === 'ig_portrait' ? 'py-4' : 'py-2'
                }`}>
                  
                  {/* Decorative quotes icons */}
                  <div className={`text-white/10 ${
                    format === 'story' ? 'text-4xl mb-4' : format === 'ig_portrait' ? 'text-3xl mb-3' : 'text-2xl mb-2'
                  } font-serif text-left`}>
                    <i className="fas fa-quote-left"></i>
                  </div>

                  <p
                    style={{ 
                      fontSize: `${fontSize}px`,
                      lineHeight: format === 'story' ? '1.5' : '1.3',
                      color: '#ffffff'
                    }}
                    className="font-serif italic font-bold break-words"
                  >
                    {texto || 'Escribe algo...'}
                  </p>

                  <div className={`text-right text-white/10 ${
                    format === 'story' ? 'text-4xl mt-4' : format === 'ig_portrait' ? 'text-3xl mt-3' : 'text-2xl mt-2'
                  } font-serif`}>
                    <i className="fas fa-quote-right"></i>
                  </div>
                </div>

                {/* Footer details (Cita references) */}
                <div className={`w-full border-t border-white/5 ${
                  format === 'story' ? 'pt-6 pb-2' : format === 'ig_portrait' ? 'pt-4 pb-1' : 'pt-3 pb-0'
                } flex flex-col items-center gap-1.5`}>
                  <span 
                    style={{ color: colorAccent }}
                    className="text-[10px] font-black uppercase tracking-[0.25em] drop-shadow-[0_0_10px_rgba(197,160,89,0.15)]"
                  >
                    {cita || 'BÍBLIA'}
                  </span>
                  
                  {/* Small link logo signature watermark */}
                  <span className="text-[6.5px] font-black uppercase tracking-[0.4em] text-white/25">
                    diosmasgym.com
                  </span>

                  {/* Social media handles to follow */}
                  <div className="flex items-center gap-3 text-white/30 text-[6px] font-black uppercase tracking-wider mt-1.5 select-none">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-[7px] h-[7px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                      </svg>
                      @diosmasgym
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-[7px] h-[7px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.024 0 12 0 12s0 3.976.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.475 20.455 12 20.455 12 20.455s7.524 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.976 24 12 24 12s0-3.976-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      @diosmasgym
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-[7px] h-[7px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.52-4.06-1.39v7.76c-.05 2.12-.86 4.07-2.46 5.28-1.95 1.55-4.79 1.97-7.14 1.07-2.67-1.02-4.48-3.77-4.45-6.66.07-3.02 2.11-5.74 5.09-6.26.82-.16 1.66-.18 2.49-.07v4.21c-.89-.28-1.91-.12-2.61.54-.7.63-.89 1.7-.56 2.58.33.89 1.34 1.46 2.29 1.37.94-.09 1.67-.84 1.71-1.78.02-3.12.01-6.23.02-9.35C12.54 5.02 12.53 2.52 12.525.02z"/>
                      </svg>
                      @diosmasgym
                    </span>
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

export default MunicionFe;
