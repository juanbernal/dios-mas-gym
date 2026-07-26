import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';

// Versículos de fuerza/valentía — fallback local si la API falla
const FALLBACK_VERSES = [
  { text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.', ref: 'JOSUÉ 1:9' },
  { text: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.', ref: 'ISAÍAS 41:10' },
  { text: 'Todo lo puedo en Cristo que me fortalece.', ref: 'FILIPENSES 4:13' },
  { text: 'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?', ref: 'SALMOS 27:1' },
  { text: 'El hierro con hierro se afila, y el hombre con el rostro de su amigo se afila.', ref: 'PROVERBIOS 27:17' },
  { text: 'No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.', ref: 'GÁLATAS 6:9' },
  { text: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.', ref: '2 TIMOTEO 1:7' },
  { text: 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.', ref: 'ISAÍAS 40:31' },
  { text: 'Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas.', ref: 'ISAÍAS 40:29' },
  { text: 'Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos, porque Jehová tu Dios es el que va contigo; no te dejará, ni te desamparará.', ref: 'DEUTERONOMIO 31:6' },
  { text: 'Pelea la buena batalla de la fe, echa mano de la vida eterna, a la cual asimismo fuiste llamado.', ref: '1 TIMOTEO 6:12' },
  { text: 'Mas gracias sean dadas a Dios, que nos da la victoria por medio de nuestro Señor Jesucristo.', ref: '1 CORINTIOS 15:57' },
];

// Referencias bíblicas para la API de bible-api.com
const VERSE_REFS = [
  'joshua 1:9', 'isaiah 41:10', 'philippians 4:13', 'psalm 27:1',
  'galatians 6:9', '2 timothy 1:7', 'isaiah 40:31', 'isaiah 40:29',
  'deuteronomy 31:6', '1 timothy 6:12', '1 corinthians 15:57',
];

interface Verse {
  text: string;
  ref: string;
}

export default function StoryCountdownCreator() {
  const navigate = useNavigate();
  const storyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [songName, setSongName] = useState('NUEVA CANCIÓN');
  const [artist, setArtist] = useState<'Dios Mas Gym' | 'Juan 614'>('Dios Mas Gym');
  const [releaseDate, setReleaseDate] = useState('');
  const [coverImage, setCoverImage] = useState('');      // URL o dataURL
  const [coverImageUrl, setCoverImageUrl] = useState(''); // solo campo URL
  const [bgStyle, setBgStyle] = useState<'fuego' | 'hielo' | 'oro' | 'oscuro'>('oro');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [showVerse, setShowVerse] = useState(true);
  const [verse, setVerse] = useState<Verse>(FALLBACK_VERSES[0]);
  const [verseLoading, setVerseLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: false });

  // ── Fetch random verse from bible-api.com ──────────────────────────────────
  const fetchRandomVerse = useCallback(async () => {
    setVerseLoading(true);
    const ref = VERSE_REFS[Math.floor(Math.random() * VERSE_REFS.length)];
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=rvr1960`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data?.text && data?.reference) {
        setVerse({
          text: data.text.trim().replace(/\n/g, ' '),
          ref: data.reference.toUpperCase(),
        });
      } else {
        throw new Error('No data');
      }
    } catch {
      // Fallback aleatorio local
      const random = FALLBACK_VERSES[Math.floor(Math.random() * FALLBACK_VERSES.length)];
      setVerse(random);
    } finally {
      setVerseLoading(false);
    }
  }, []);

  // Carga versículo inicial al montar
  useEffect(() => { fetchRandomVerse(); }, [fetchRandomVerse]);

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!releaseDate) return;
    const update = () => {
      const diff = new Date(releaseDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isReady: false,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [releaseDate]);

  // ── Image upload handler ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCoverImage(dataUrl);
      setCoverImageUrl(''); // limpiar campo URL
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (val: string) => {
    setCoverImageUrl(val);
    setCoverImage(val);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  // Converts any external image URL to a dataURL to avoid CORS taint in html2canvas
  const toDataUrl = async (src: string): Promise<string> => {
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
    try {
      const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`);
      if (!res.ok) throw new Error('proxy');
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  };

  const handleExport = async () => {
    if (!storyRef.current) return;
    setExporting(true);
    try {
      // ── Step 1: Convert cover to dataURL so canvas is never tainted
      let exportCover = coverImage;
      if (coverImage && !coverImage.startsWith('data:') && !coverImage.startsWith('blob:')) {
        exportCover = await toDataUrl(coverImage);
      }

      // ── Step 2: Clone the story div at FULL size (remove the scale transform)
      //   html2canvas captures the clone at true 1080×1920, giving full quality.
      const original = storyRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      // Remove the CSS scale — capture at native resolution
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top left';
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '1080px';
      clone.style.height = '1920px';
      clone.style.zIndex = '-1';
      clone.style.pointerEvents = 'none';

      // Replace cover image src with the pre-fetched dataURL
      if (exportCover && exportCover !== coverImage) {
        const imgs = clone.querySelectorAll('img');
        imgs.forEach(img => { img.src = exportCover; });
      }

      document.body.appendChild(clone);

      // ── Step 3: Give the browser a frame to render the clone
      await new Promise(r => setTimeout(r, 400));

      // ── Step 4: Capture the off-screen clone at 2× (→ 2160×3840 px)
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        backgroundColor: '#05070a',
        width: 1080,
        height: 1920,
        scrollX: 0,
        scrollY: 0,
      });

      // ── Step 5: Clean up clone
      document.body.removeChild(clone);

      // ── Step 6: Download
      const url = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = url;
      a.download = `countdown-${songName.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getOverlayGradient = () => {
    const o = overlayOpacity.toFixed(2);
    const oPlus = Math.min(parseFloat(o) + 0.2, 1).toFixed(2);
    switch (bgStyle) {
      case 'fuego': return `linear-gradient(to bottom, rgba(200,50,0,${o}), rgba(0,0,0,${oPlus}))`;
      case 'hielo': return `linear-gradient(to bottom, rgba(0,50,150,${o}), rgba(0,0,0,${oPlus}))`;
      case 'oro':   return `linear-gradient(to bottom, rgba(197,160,89,${o}), rgba(0,0,0,${oPlus}))`;
      default:      return `rgba(0,0,0,${o})`;
    }
  };

  const formatDate = (d: string) => {
    if (!d) return 'FECHA NO DEFINIDA';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return 'FECHA NO DEFINIDA';
    const days = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
    const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    return `${days[dt.getDay()]} ${dt.getDate()} · ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-6 md:p-8 font-['Poppins',sans-serif]">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-[#c5a059]" />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-0.5">Contenido Audiovisual</p>
            <h1 className="text-2xl md:text-3xl font-serif italic text-white">Story <span className="text-[#c5a059]">Countdown</span> Creator</h1>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-[#c5a059] text-black px-6 md:px-8 py-3 rounded-2xl tracking-widest uppercase text-[10px] font-black hover:bg-[#d4b472] transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {exporting ? <><i className="fa-solid fa-spinner fa-spin" /> Exportando...</> : <><i className="fa-solid fa-download" /> Descargar Story</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">

        {/* ── Left Panel: Controls ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-[#0f111a] rounded-[2rem] p-8 border border-white/5 shadow-2xl space-y-6">

            {/* Song name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Nombre de la Canción</label>
              <input
                type="text"
                value={songName}
                onChange={e => setSongName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors text-lg font-bold"
                placeholder="Ej. LEÓN DE JUDÁ"
              />
            </div>

            {/* Artist */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Artista</label>
              <div className="flex gap-4">
                {(['Dios Mas Gym', 'Juan 614'] as const).map(a => (
                  <label key={a} className={`flex items-center gap-3 cursor-pointer px-5 py-3 rounded-xl border transition-all ${artist === a ? 'border-[#c5a059] bg-[#c5a059]/10 text-white' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                    <input type="radio" name="artist" value={a} checked={artist === a} onChange={() => setArtist(a)} className="accent-[#c5a059]" />
                    <span className="text-sm font-bold">{a}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Release date */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Fecha y Hora de Lanzamiento</label>
              <input
                type="datetime-local"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-[#c5a059]/50 transition-colors [color-scheme:dark]"
              />
            </div>

            {/* ── Cover Image: Upload + URL ────────────────────────────────── */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Imagen de Portada</label>
              <div className="flex gap-3 mb-3">
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#c5a059] text-[10px] font-black uppercase tracking-widest hover:bg-[#c5a059]/20 transition-all shrink-0"
                >
                  <i className="fa-solid fa-upload" />
                  Subir Archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {/* URL field */}
                <input
                  type="text"
                  value={coverImageUrl}
                  onChange={e => handleUrlChange(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors text-sm"
                  placeholder="O pega una URL de imagen..."
                />
              </div>
              {/* Image preview */}
              {coverImage && (
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                  <button
                    onClick={() => { setCoverImage(''); setCoverImageUrl(''); }}
                    className="text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-trash" /> Quitar imagen
                  </button>
                </div>
              )}
            </div>

            {/* BG Style */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Estilo de Fondo</label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'fuego', label: 'Fuego', gradient: 'from-red-700 to-orange-900' },
                  { id: 'hielo', label: 'Hielo',  gradient: 'from-blue-700 to-blue-950' },
                  { id: 'oro',   label: 'Oro',    gradient: 'from-yellow-600 to-yellow-900' },
                  { id: 'oscuro',label: 'Oscuro', gradient: 'from-gray-800 to-black' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setBgStyle(s.id as any)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${bgStyle === s.id ? 'border-[#c5a059] bg-white/5' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.gradient} shadow-lg`} />
                    <span className="text-[10px] tracking-wider uppercase text-white/70">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay opacity */}
            <div>
              <label className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <span>Opacidad del Filtro</span>
                <span className="text-[#c5a059]">{Math.round(overlayOpacity * 100)}%</span>
              </label>
              <input type="range" min="0.2" max="0.95" step="0.05" value={overlayOpacity}
                onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#c5a059]" />
            </div>

            {/* Verse toggle + random button */}
            <div className="p-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVerse}
                    onChange={e => setShowVerse(e.target.checked)}
                    className="w-5 h-5 accent-[#c5a059] rounded"
                  />
                  <span className="text-sm font-bold text-white/80">Mostrar versículo bíblico</span>
                </label>
                <button
                  onClick={fetchRandomVerse}
                  disabled={verseLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c5a059]/30 bg-[#c5a059]/10 text-[#c5a059] text-[9px] font-black uppercase tracking-widest hover:bg-[#c5a059]/20 transition-all disabled:opacity-40"
                >
                  {verseLoading
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Cargando...</>
                    : <><i className="fa-solid fa-shuffle" /> Aleatorio</>}
                </button>
              </div>
              {showVerse && (
                <div className="mt-2 p-3 bg-black/30 rounded-lg border border-white/5">
                  <p className="text-white/70 text-xs italic leading-relaxed mb-1">"{verse.text}"</p>
                  <p className="text-[#c5a059] text-[10px] font-black tracking-widest">{verse.ref}</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Right Panel: Preview ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center">
          <div className="bg-[#0f111a] rounded-[2rem] p-6 border border-white/5 shadow-2xl flex flex-col items-center w-full sticky top-8">
            <h2 className="text-[#c5a059] text-[10px] font-black tracking-widest uppercase mb-4">Vista Previa · 9:16</h2>

            {/* Scaled preview wrapper */}
            <div className="relative w-[270px] h-[480px] overflow-hidden rounded-xl border-2 border-white/10 shadow-2xl bg-black shrink-0">
              {/* Actual full-res canvas (1080×1920) scaled down to fit */}
              <div
                ref={storyRef}
                style={{
                  width: '1080px',
                  height: '1920px',
                  transform: 'scale(0.25)',
                  transformOrigin: 'top left',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: '#05070a',
                  fontFamily: '"Poppins", sans-serif',
                  overflow: 'hidden',
                }}
              >
                {/* Background image */}
                {coverImage && (
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <img src={coverImage} crossOrigin="anonymous" alt="bg"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Color overlay */}
                <div style={{ position: 'absolute', inset: 0, background: getOverlayGradient() }} />

                {/* Content */}
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '100px 60px 80px' }}>

                  {/* Top label */}
                  <div style={{ color: '#c5a059', fontSize: '28px', fontWeight: 900, letterSpacing: '10px', textTransform: 'uppercase', textAlign: 'center' }}>
                    EL ARSENAL · DIOS MAS GYM
                  </div>

                  {/* Song title */}
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '110px', color: 'white', textAlign: 'center', lineHeight: 1.1, textShadow: '0 10px 40px rgba(0,0,0,0.9)', padding: '0 20px' }}>
                    {songName || 'NUEVA CANCIÓN'}
                  </div>

                  {/* Countdown */}
                  <div>
                    {timeLeft.isReady ? (
                      <div style={{ fontSize: '80px', fontWeight: 900, color: '#c5a059', letterSpacing: '4px', padding: '50px 80px', backgroundColor: 'rgba(0,0,0,0.7)', border: '6px solid #c5a059', borderRadius: '40px', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                        ¡YA DISPONIBLE!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
                        {[{ n: pad(timeLeft.days), label: 'DÍAS' }, { n: pad(timeLeft.hours), label: 'HRS' }, { n: pad(timeLeft.minutes), label: 'MIN' }].map(({ n, label }) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', border: '5px solid #c5a059', borderRadius: '36px', padding: '40px 50px', minWidth: '240px', backdropFilter: 'blur(10px)' }}>
                            <span style={{ fontSize: '110px', fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                            <span style={{ fontSize: '26px', color: '#c5a059', fontWeight: 900, letterSpacing: '6px', marginTop: '12px' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Release label */}
                  <div style={{ color: 'white', fontSize: '34px', letterSpacing: '6px', fontWeight: 600, textAlign: 'center', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>
                    <span style={{ color: '#c5a059' }}>LLEGA EL </span>{formatDate(releaseDate)}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                    <div style={{ color: 'white', fontSize: '40px', fontWeight: 700, letterSpacing: '4px' }}>{artist}</div>
                    <div style={{ display: 'flex', gap: '50px', fontSize: '54px', color: 'white' }}>
                      <i className="fa-brands fa-spotify" />
                      <i className="fa-brands fa-apple" />
                      <i className="fa-brands fa-youtube" />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '22px', letterSpacing: '6px', fontWeight: 600 }}>
                      DISPONIBLE EN TODAS LAS PLATAFORMAS
                    </div>
                  </div>

                  {/* Verse */}
                  {showVerse && (
                    <div style={{ borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: '40px', textAlign: 'center', width: '85%' }}>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '26px', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '14px' }}>
                        "{verse.text}"
                      </div>
                      <div style={{ color: '#c5a059', fontSize: '22px', fontWeight: 900, letterSpacing: '5px' }}>
                        {verse.ref}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <p className="text-white/20 text-[9px] uppercase tracking-widest mt-4">Exporta en 1080×1920 px</p>
          </div>
        </div>

      </div>
    </div>
  );
}
