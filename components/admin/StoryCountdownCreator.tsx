import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const FALLBACK_VERSES = [
  { text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.', ref: 'JOSUÉ 1:9' },
  { text: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.', ref: 'ISAÍAS 41:10' },
  { text: 'Todo lo puedo en Cristo que me fortalece.', ref: 'FILIPENSES 4:13' },
  { text: 'Jehová es mi luz y mi salvación; ¿de quién temeré?', ref: 'SALMOS 27:1' },
  { text: 'No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.', ref: 'GÁLATAS 6:9' },
  { text: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.', ref: '2 TIMOTEO 1:7' },
  { text: 'Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.', ref: 'ISAÍAS 40:31' },
  { text: 'Pelea la buena batalla de la fe, echa mano de la vida eterna.', ref: '1 TIMOTEO 6:12' },
  { text: 'Mas gracias sean dadas a Dios, que nos da la victoria por medio de nuestro Señor Jesucristo.', ref: '1 CORINTIOS 15:57' },
];

const VERSE_REFS = [
  'joshua 1:9', 'isaiah 41:10', 'philippians 4:13', 'psalm 27:1',
  'galatians 6:9', '2 timothy 1:7', 'isaiah 40:31', '1 timothy 6:12',
];

interface Verse { text: string; ref: string; }

async function urlToDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  try {
    const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`);
    if (!res.ok) throw new Error('proxy ' + res.status);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return ''; }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) { reject(new Error('no src')); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// Wrap text and return lines array
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export default function StoryCountdownCreator() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [songName, setSongName] = useState('NUEVA CANCIÓN');
  const [artist, setArtist] = useState<'Dios Mas Gym' | 'Juan 614'>('Dios Mas Gym');
  const [releaseDate, setReleaseDate] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverDataUrl, setCoverDataUrl] = useState(''); // always a dataURL or ''
  const [coverLoading, setCoverLoading] = useState(false);
  const [bgStyle, setBgStyle] = useState<'fuego' | 'hielo' | 'oro' | 'oscuro'>('oro');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [showVerse, setShowVerse] = useState(true);
  const [verse, setVerse] = useState<Verse>(FALLBACK_VERSES[0]);
  const [verseLoading, setVerseLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, isReady: false });

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!releaseDate) return;
    const update = () => {
      const diff = new Date(releaseDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, isReady: true }); return; }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), isReady: false });
    };
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [releaseDate]);

  // ── URL → dataURL (debounced) ──────────────────────────────────────────────
  useEffect(() => {
    if (!coverUrlInput) { setCoverDataUrl(''); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setCoverLoading(true);
      const d = await urlToDataUrl(coverUrlInput);
      if (!cancelled) { setCoverDataUrl(d); setCoverLoading(false); }
    }, 700);
    return () => { cancelled = true; clearTimeout(t); };
  }, [coverUrlInput]);

  // ── Random verse ───────────────────────────────────────────────────────────
  const fetchRandomVerse = useCallback(async () => {
    setVerseLoading(true);
    const ref = VERSE_REFS[Math.floor(Math.random() * VERSE_REFS.length)];
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=rvr1960`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data?.text) setVerse({ text: data.text.trim().replace(/\n/g, ' '), ref: (data.reference || ref).toUpperCase() });
      else throw new Error();
    } catch {
      setVerse(FALLBACK_VERSES[Math.floor(Math.random() * FALLBACK_VERSES.length)]);
    } finally { setVerseLoading(false); }
  }, []);
  useEffect(() => { fetchRandomVerse(); }, [fetchRandomVerse]);

  // ── File upload → FileReader (already gives dataURL) ─────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCoverDataUrl(ev.target?.result as string); setCoverUrlInput(''); };
    reader.readAsDataURL(file);
  };

  // ── Pure Canvas 2D Export ─────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const W = 1080, H = 1920;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d')!;

      // 1. Dark base
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, W, H);

      // 2. Cover image (full bleed)
      if (coverDataUrl) {
        try {
          const bg = await loadImage(coverDataUrl);
          ctx.drawImage(bg, 0, 0, W, H);
        } catch {}
      }

      // 3. Color overlay
      const o = overlayOpacity, op = Math.min(o + 0.2, 1);
      let fill: string | CanvasGradient;
      if (bgStyle === 'fuego') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, `rgba(200,50,0,${o})`); g.addColorStop(1, `rgba(0,0,0,${op})`); fill = g;
      } else if (bgStyle === 'hielo') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, `rgba(0,50,150,${o})`); g.addColorStop(1, `rgba(0,0,0,${op})`); fill = g;
      } else if (bgStyle === 'oro') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, `rgba(197,160,89,${o})`); g.addColorStop(1, `rgba(0,0,0,${op})`); fill = g;
      } else {
        fill = `rgba(0,0,0,${o})`;
      }
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, W, H);

      // 4. Top label
      ctx.font = 'bold 26px Arial,sans-serif';
      ctx.fillStyle = '#c5a059';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('EL ARSENAL  ·  DIOS MAS GYM', W / 2, 95);

      // 5. Song title (wrapped, up to 2 lines)
      ctx.font = 'italic bold 108px Georgia,"Times New Roman",serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 35;
      const titleLines = wrapText(ctx, (songName || 'NUEVA CANCIÓN').toUpperCase(), W - 120);
      titleLines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 220 + i * 118));
      ctx.shadowBlur = 0;

      // 6. Countdown boxes
      const boxTop = 560;
      if (timeLeft.isReady) {
        rrPath(ctx, 80, boxTop, W - 160, 190, 40);
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fill();
        ctx.strokeStyle = '#c5a059'; ctx.lineWidth = 6; ctx.stroke();
        ctx.font = 'bold 88px Arial,sans-serif';
        ctx.fillStyle = '#c5a059';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('¡YA DISPONIBLE!', W / 2, boxTop + 95);
      } else {
        const bW = 270, bH = 195, gap = 27;
        const total = 3 * bW + 2 * gap;
        const sx = (W - total) / 2;
        const labels = ['DÍAS', 'HRS', 'MIN'];
        const vals = [String(timeLeft.days).padStart(2,'0'), String(timeLeft.hours).padStart(2,'0'), String(timeLeft.minutes).padStart(2,'0')];
        for (let i = 0; i < 3; i++) {
          const bx = sx + i * (bW + gap);
          rrPath(ctx, bx, boxTop, bW, bH, 36);
          ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.fill();
          ctx.strokeStyle = '#c5a059'; ctx.lineWidth = 5; ctx.stroke();
          ctx.font = 'bold 108px Arial,sans-serif';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(vals[i], bx + bW / 2, boxTop + 85);
          ctx.font = 'bold 24px Arial,sans-serif';
          ctx.fillStyle = '#c5a059';
          ctx.textBaseline = 'bottom';
          ctx.fillText(labels[i], bx + bW / 2, boxTop + bH - 12);
        }
      }

      // 7. Release date
      const DAYS = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
      const MONTHS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      let dateStr = 'FECHA NO DEFINIDA';
      if (releaseDate) {
        const dt = new Date(releaseDate);
        if (!isNaN(dt.getTime())) dateStr = `${DAYS[dt.getDay()]} ${dt.getDate()} · ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
      }
      ctx.font = 'bold 32px Arial,sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 12;
      ctx.fillText('LLEGA EL  ' + dateStr, W / 2, 820);
      ctx.shadowBlur = 0;

      // 8. Artist + platform footer
      const footerY = 1570;
      ctx.font = 'bold 42px Arial,sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(artist.toUpperCase(), W / 2, footerY);

      // Platform circles
      const platCenters = [W / 2 - 130, W / 2, W / 2 + 130];
      const platColors = ['#1DB954', '#fc3c44', '#FF0000'];
      const platLabels = ['S', '♪', '▶'];
      platCenters.forEach((px, i) => {
        ctx.beginPath();
        ctx.arc(px, footerY + 80, 28, 0, Math.PI * 2);
        ctx.fillStyle = platColors[i];
        ctx.fill();
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(platLabels[i], px, footerY + 80);
      });

      ctx.font = '22px Arial,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('DISPONIBLE EN TODAS LAS PLATAFORMAS', W / 2, footerY + 122);

      // 9. Verse (if enabled)
      if (showVerse && verse.text) {
        const vY = 1750;
        // Separator line
        const sg = ctx.createLinearGradient(60, 0, W - 60, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = sg; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(80, vY); ctx.lineTo(W - 80, vY); ctx.stroke();

        ctx.font = 'italic 25px Georgia,serif';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const verseLines = wrapText(ctx, `"${verse.text}"`, W - 160);
        verseLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, vY + 20 + i * 34));

        ctx.font = 'bold 22px Arial,sans-serif';
        ctx.fillStyle = '#c5a059';
        const verseCount = Math.min(verseLines.length, 3);
        ctx.fillText(verse.ref, W / 2, vY + 20 + verseCount * 34 + 10);
      }

      // 10. Download
      cv.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `countdown-${(songName || 'story').toLowerCase().replace(/\s+/g, '-')}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }, 'image/png', 1.0);

    } catch (err) {
      console.error('Canvas export failed:', err);
    } finally { setExporting(false); }
  }, [songName, artist, releaseDate, coverDataUrl, bgStyle, overlayOpacity, showVerse, verse, timeLeft, overlayOpacity]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const getOverlay = () => {
    const o = overlayOpacity.toFixed(2), op = Math.min(overlayOpacity + 0.2, 1).toFixed(2);
    switch (bgStyle) {
      case 'fuego': return `linear-gradient(to bottom, rgba(200,50,0,${o}), rgba(0,0,0,${op}))`;
      case 'hielo': return `linear-gradient(to bottom, rgba(0,50,150,${o}), rgba(0,0,0,${op}))`;
      case 'oro':   return `linear-gradient(to bottom, rgba(197,160,89,${o}), rgba(0,0,0,${op}))`;
      default:      return `rgba(0,0,0,${o})`;
    }
  };
  const formatDate = (d: string) => {
    if (!d) return 'FECHA NO DEFINIDA';
    const dt = new Date(d); if (isNaN(dt.getTime())) return 'FECHA NO DEFINIDA';
    const DD = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
    const MM = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    return `${DD[dt.getDay()]} ${dt.getDate()} · ${MM[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-6 md:p-8 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <i className="fa-solid fa-arrow-left text-[#c5a059]" />
          </button>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-0.5">Contenido Audiovisual</p>
            <h1 className="text-2xl md:text-3xl font-serif italic">Story <span className="text-[#c5a059]">Countdown</span> Creator</h1>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="bg-[#c5a059] text-black px-6 py-3 rounded-2xl tracking-widest uppercase text-[10px] font-black hover:bg-white transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)] disabled:opacity-50 flex items-center gap-2">
          {exporting ? <><i className="fa-solid fa-spinner fa-spin" /> Generando...</> : <><i className="fa-solid fa-download" /> Descargar Story (1080×1920)</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Controls */}
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-[#0f111a] rounded-[2rem] p-8 border border-white/5 shadow-2xl space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Nombre de la Canción</label>
              <input type="text" value={songName} onChange={e => setSongName(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors text-lg font-bold"
                placeholder="Ej. LEÓN DE JUDÁ" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Artista</label>
              <div className="flex gap-4">
                {(['Dios Mas Gym', 'Juan 614'] as const).map(a => (
                  <label key={a} className={`flex items-center gap-3 cursor-pointer px-5 py-3 rounded-xl border transition-all ${artist === a ? 'border-[#c5a059] bg-[#c5a059]/10' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                    <input type="radio" name="artist" value={a} checked={artist === a} onChange={() => setArtist(a)} className="accent-[#c5a059]" />
                    <span className="text-sm font-bold">{a}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Fecha y Hora de Lanzamiento</label>
              <input type="datetime-local" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-[#c5a059]/50 transition-colors [color-scheme:dark]" />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                Imagen de Portada
                {coverLoading && <span className="ml-3 text-[#c5a059] normal-case font-normal text-[9px]">Cargando...</span>}
                {coverDataUrl && !coverLoading && <span className="ml-3 text-green-400 normal-case font-normal text-[9px]"><i className="fa-solid fa-check mr-1"/>Lista</span>}
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#c5a059] text-[10px] font-black uppercase tracking-widest hover:bg-[#c5a059]/20 transition-all shrink-0">
                  <i className="fa-solid fa-upload" /> Subir Archivo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <input type="text" value={coverUrlInput} onChange={e => setCoverUrlInput(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 text-sm"
                  placeholder="O pega una URL..." />
              </div>
              {coverDataUrl && (
                <div className="flex items-center gap-3 mt-3">
                  <img src={coverDataUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                  <button onClick={() => { setCoverDataUrl(''); setCoverUrlInput(''); }} className="text-[9px] font-black uppercase text-red-400 hover:text-red-300 flex items-center gap-1">
                    <i className="fa-solid fa-trash" /> Quitar
                  </button>
                </div>
              )}
            </div>

            {/* BG Style */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Estilo de Fondo</label>
              <div className="grid grid-cols-4 gap-3">
                {[{ id:'fuego', l:'Fuego', g:'from-red-700 to-orange-900' }, { id:'hielo', l:'Hielo', g:'from-blue-700 to-blue-950' }, { id:'oro', l:'Oro', g:'from-yellow-600 to-yellow-900' }, { id:'oscuro', l:'Oscuro', g:'from-gray-800 to-black' }].map(s => (
                  <button key={s.id} onClick={() => setBgStyle(s.id as any)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${bgStyle === s.id ? 'border-[#c5a059] bg-white/5' : 'border-white/5 bg-black/20 hover:border-white/20'}`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.g}`} />
                    <span className="text-[10px] uppercase text-white/70">{s.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                <span>Opacidad del Filtro</span><span className="text-[#c5a059]">{Math.round(overlayOpacity * 100)}%</span>
              </label>
              <input type="range" min="0.2" max="0.95" step="0.05" value={overlayOpacity}
                onChange={e => setOverlayOpacity(parseFloat(e.target.value))} className="w-full accent-[#c5a059]" />
            </div>

            {/* Verse */}
            <div className="p-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={showVerse} onChange={e => setShowVerse(e.target.checked)} className="w-5 h-5 accent-[#c5a059]" />
                  <span className="text-sm font-bold text-white/80">Versículo bíblico aleatorio</span>
                </label>
                <button onClick={fetchRandomVerse} disabled={verseLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c5a059]/30 bg-[#c5a059]/10 text-[#c5a059] text-[9px] font-black uppercase tracking-widest hover:bg-[#c5a059]/20 disabled:opacity-40">
                  {verseLoading ? <><i className="fa-solid fa-spinner fa-spin" /> Cargando...</> : <><i className="fa-solid fa-shuffle" /> Aleatorio</>}
                </button>
              </div>
              {showVerse && (
                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                  <p className="text-white/70 text-xs italic leading-relaxed mb-1">"{verse.text}"</p>
                  <p className="text-[#c5a059] text-[10px] font-black tracking-widest">{verse.ref}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview (HTML only — export uses Canvas 2D) */}
        <div className="flex flex-col items-center">
          <div className="bg-[#0f111a] rounded-[2rem] p-6 border border-white/5 shadow-2xl flex flex-col items-center w-full sticky top-8">
            <h2 className="text-[#c5a059] text-[10px] font-black tracking-widest uppercase mb-4">Vista Previa</h2>
            <div className="relative w-[270px] h-[480px] overflow-hidden rounded-xl border-2 border-white/10 bg-black shrink-0">
              <div style={{ width:'1080px', height:'1920px', transform:'scale(0.25)', transformOrigin:'top left', position:'absolute', top:0, left:0, backgroundColor:'#05070a', fontFamily:'"Poppins",sans-serif', overflow:'hidden' }}>
                {coverDataUrl && <img src={coverDataUrl} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
                <div style={{ position:'absolute', inset:0, background: getOverlay() }} />
                <div style={{ position:'relative', width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'100px 60px 80px' }}>
                  <div style={{ color:'#c5a059', fontSize:'26px', fontWeight:900, letterSpacing:'10px', textTransform:'uppercase', textAlign:'center' }}>EL ARSENAL · DIOS MAS GYM</div>
                  <div style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'108px', color:'white', textAlign:'center', lineHeight:1.1, textShadow:'0 10px 40px rgba(0,0,0,0.9)' }}>{songName || 'NUEVA CANCIÓN'}</div>
                  <div>
                    {timeLeft.isReady ? (
                      <div style={{ fontSize:'76px', fontWeight:900, color:'#c5a059', padding:'40px 60px', backgroundColor:'rgba(0,0,0,0.7)', border:'6px solid #c5a059', borderRadius:'40px', textAlign:'center' }}>¡YA DISPONIBLE!</div>
                    ) : (
                      <div style={{ display:'flex', gap:'26px' }}>
                        {[{ n: pad(timeLeft.days), l:'DÍAS' }, { n: pad(timeLeft.hours), l:'HRS' }, { n: pad(timeLeft.minutes), l:'MIN' }].map(({ n, l }) => (
                          <div key={l} style={{ display:'flex', flexDirection:'column', alignItems:'center', backgroundColor:'rgba(0,0,0,0.68)', border:'5px solid #c5a059', borderRadius:'36px', padding:'36px 46px', minWidth:'230px' }}>
                            <span style={{ fontSize:'108px', fontWeight:900, color:'white', lineHeight:1 }}>{n}</span>
                            <span style={{ fontSize:'24px', color:'#c5a059', fontWeight:900, letterSpacing:'6px', marginTop:'10px' }}>{l}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ color:'white', fontSize:'32px', letterSpacing:'6px', fontWeight:600, textAlign:'center', textShadow:'0 4px 10px rgba(0,0,0,0.8)' }}>
                    <span style={{ color:'#c5a059' }}>LLEGA EL </span>{formatDate(releaseDate)}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'20px' }}>
                    <div style={{ color:'white', fontSize:'38px', fontWeight:700, letterSpacing:'4px' }}>{artist}</div>
                    <div style={{ display:'flex', gap:'46px', fontSize:'50px', color:'white' }}>
                      <i className="fa-brands fa-spotify" /><i className="fa-brands fa-apple" /><i className="fa-brands fa-youtube" />
                    </div>
                    <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'20px', letterSpacing:'6px', fontWeight:600 }}>DISPONIBLE EN TODAS LAS PLATAFORMAS</div>
                  </div>
                  {showVerse && (
                    <div style={{ borderTop:'2px solid rgba(255,255,255,0.15)', paddingTop:'40px', textAlign:'center', width:'85%' }}>
                      <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'24px', fontStyle:'italic', lineHeight:1.5, marginBottom:'12px' }}>"{verse.text}"</div>
                      <div style={{ color:'#c5a059', fontSize:'20px', fontWeight:900, letterSpacing:'5px' }}>{verse.ref}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-white/20 text-[9px] uppercase tracking-widest mt-4 text-center">
              Exporta en 1080 × 1920 px · Canvas 2D
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
