import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';

export default function StoryCountdownCreator() {
  const navigate = useNavigate();
  const storyRef = useRef<HTMLDivElement>(null);

  const [songName, setSongName] = useState('NUEVA CANCIÓN');
  const [artist, setArtist] = useState<'Dios Mas Gym' | 'Juan 614'>('Dios Mas Gym');
  const [releaseDate, setReleaseDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [bgStyle, setBgStyle] = useState<'fuego' | 'hielo' | 'oro' | 'oscuro'>('oro');
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [showVerse, setShowVerse] = useState(true);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: false });

  useEffect(() => {
    if (!releaseDate) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(releaseDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isReady: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [releaseDate]);

  const handleExport = async () => {
    if (!storyRef.current) return;
    try {
      const canvas = await html2canvas(storyRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#05070a'
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `countdown-${songName.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getOverlayGradient = () => {
    const opacity = overlayOpacity.toFixed(2);
    switch (bgStyle) {
      case 'fuego':
        return `linear-gradient(to bottom, rgba(200, 50, 0, ${opacity}), rgba(0, 0, 0, ${parseFloat(opacity) + 0.2}))`;
      case 'hielo':
        return `linear-gradient(to bottom, rgba(0, 50, 150, ${opacity}), rgba(0, 0, 0, ${parseFloat(opacity) + 0.2}))`;
      case 'oro':
        return `linear-gradient(to bottom, rgba(197, 160, 89, ${opacity}), rgba(0, 0, 0, ${parseFloat(opacity) + 0.2}))`;
      case 'oscuro':
        return `rgba(0, 0, 0, ${opacity})`;
      default:
        return `rgba(0, 0, 0, ${opacity})`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'FECHA NO DEFINIDA';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'FECHA NO DEFINIDA';
    
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    
    return `${days[d.getDay()]} ${d.getDate()} · ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-8 font-['Poppins',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-[#c5a059]"></i>
          </button>
          <h1 className="text-3xl font-serif italic text-white">Story Countdown</h1>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#c5a059] text-black px-8 py-3 rounded-2xl tracking-widest uppercase text-[10px] font-black hover:bg-[#d4b472] transition-colors shadow-[0_0_20px_rgba(197,160,89,0.3)]"
        >
          <i className="fa-solid fa-download mr-2"></i>
          Descargar Story
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0f111a] rounded-[2rem] p-8 border border-white/5 shadow-2xl space-y-6">
            
            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-2">Nombre de la canción</label>
              <input 
                type="text" 
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                className="w-full bg-[#05070a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c5a059] transition-colors"
                placeholder="Ej. LEÓN DE JUDÁ"
              />
            </div>

            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-2">Artista</label>
              <div className="flex gap-4">
                {['Dios Mas Gym', 'Juan 614'].map((a) => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="artist" 
                      value={a}
                      checked={artist === a}
                      onChange={(e) => setArtist(e.target.value as any)}
                      className="accent-[#c5a059]"
                    />
                    <span className="text-sm">{a}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-2">Fecha de Lanzamiento</label>
              <input 
                type="datetime-local" 
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-[#05070a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c5a059] transition-colors [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-2">URL de la Portada</label>
              <input 
                type="text" 
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full bg-[#05070a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#c5a059] transition-colors mb-2"
                placeholder="https://..."
              />
              {coverImage && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-white/10 mt-2">
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-3">Estilo de Fondo</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'fuego', label: 'Fuego', color: 'bg-red-900' },
                  { id: 'hielo', label: 'Hielo', color: 'bg-blue-900' },
                  { id: 'oro', label: 'Oro', color: 'bg-[#c5a059]' },
                  { id: 'oscuro', label: 'Oscuro', color: 'bg-black' }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setBgStyle(style.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${bgStyle === style.id ? 'border-[#c5a059] bg-white/5' : 'border-white/5 bg-[#05070a] hover:border-white/20'}`}
                  >
                    <div className={`w-8 h-8 rounded-full mb-2 ${style.color} shadow-lg`} />
                    <span className="text-[10px] tracking-wider uppercase text-white/70">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-2 flex justify-between">
                <span>Opacidad del Filtro</span>
                <span className="text-white">{Math.round(overlayOpacity * 100)}%</span>
              </label>
              <input 
                type="range" 
                min="0.3" 
                max="0.9" 
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#c5a059]"
              />
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-[#05070a] rounded-xl border border-white/5">
                <input 
                  type="checkbox" 
                  checked={showVerse}
                  onChange={(e) => setShowVerse(e.target.checked)}
                  className="w-5 h-5 accent-[#c5a059] rounded"
                />
                <span className="text-sm font-medium">Mostrar versículo (Josué 1:9)</span>
              </label>
            </div>

          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex flex-col items-center">
          <div className="bg-[#0f111a] rounded-[2rem] p-6 border border-white/5 shadow-2xl flex flex-col items-center w-full max-w-[340px]">
            <h2 className="text-[#c5a059] text-[10px] font-black tracking-widest uppercase mb-6">Vista Previa</h2>
            
            {/* The Scaled Wrapper */}
            <div className="relative w-[270px] h-[480px] overflow-hidden rounded-xl border-4 border-black shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0 bg-black">
              {/* Actual Canvas Container */}
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
                  fontFamily: '"Poppins", sans-serif'
                }}
              >
                {/* Background Image */}
                {coverImage && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <img src={coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" alt="bg" />
                  </div>
                )}
                
                {/* Background Overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: getOverlayGradient() }} />

                {/* Content Wrapper */}
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '120px 80px' }}>
                  
                  {/* Top Logo */}
                  <div style={{ color: '#c5a059', fontSize: '24px', fontWeight: 900, letterSpacing: '12px', marginTop: '40px', textTransform: 'uppercase' }}>
                    EL ARSENAL · DIOS MAS GYM
                  </div>

                  {/* Spacer */}
                  <div style={{ flex: '1' }} />

                  {/* Song Title */}
                  <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '110px', color: 'white', textAlign: 'center', lineHeight: '1.1', textShadow: '0 10px 30px rgba(0,0,0,0.8)', marginBottom: '80px' }}>
                    {songName || 'NUEVA CANCIÓN'}
                  </div>

                  {/* Countdown Box */}
                  <div style={{ display: 'flex', gap: '40px', marginBottom: '80px' }}>
                    {timeLeft.isReady ? (
                      <div style={{ fontSize: '90px', fontWeight: 900, color: '#c5a059', letterSpacing: '4px', textShadow: '0 10px 30px rgba(0,0,0,0.8)', padding: '60px 100px', backgroundColor: 'rgba(0,0,0,0.6)', border: '6px solid #c5a059', borderRadius: '40px', backdropFilter: 'blur(10px)' }}>
                        ¡YA DISPONIBLE!
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', border: '6px solid #c5a059', borderRadius: '40px', padding: '40px 60px', width: '260px', backdropFilter: 'blur(10px)' }}>
                          <span style={{ fontSize: '100px', fontWeight: 900, color: 'white', lineHeight: '1' }}>{timeLeft.days.toString().padStart(2, '0')}</span>
                          <span style={{ fontSize: '24px', color: '#c5a059', fontWeight: 900, letterSpacing: '6px', marginTop: '10px' }}>DÍAS</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', border: '6px solid #c5a059', borderRadius: '40px', padding: '40px 60px', width: '260px', backdropFilter: 'blur(10px)' }}>
                          <span style={{ fontSize: '100px', fontWeight: 900, color: 'white', lineHeight: '1' }}>{timeLeft.hours.toString().padStart(2, '0')}</span>
                          <span style={{ fontSize: '24px', color: '#c5a059', fontWeight: 900, letterSpacing: '6px', marginTop: '10px' }}>HRS</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', border: '6px solid #c5a059', borderRadius: '40px', padding: '40px 60px', width: '260px', backdropFilter: 'blur(10px)' }}>
                          <span style={{ fontSize: '100px', fontWeight: 900, color: 'white', lineHeight: '1' }}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
                          <span style={{ fontSize: '24px', color: '#c5a059', fontWeight: 900, letterSpacing: '6px', marginTop: '10px' }}>MIN</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Release Date Text */}
                  <div style={{ color: 'white', fontSize: '32px', letterSpacing: '8px', fontWeight: 600, textTransform: 'uppercase', textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>
                    <span style={{ color: '#c5a059' }}>LLEGA EL</span> {formatDate(releaseDate)}
                  </div>

                  {/* Spacer */}
                  <div style={{ flex: '1' }} />

                  {/* Platforms Footer */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', marginBottom: '60px' }}>
                    <div style={{ color: 'white', fontSize: '36px', fontWeight: 700, letterSpacing: '4px' }}>
                      {artist}
                    </div>
                    <div style={{ display: 'flex', gap: '40px', fontSize: '50px', color: 'white' }}>
                      <i className="fa-brands fa-spotify"></i>
                      <i className="fa-brands fa-apple"></i>
                      <i className="fa-brands fa-youtube"></i>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px', letterSpacing: '6px', fontWeight: 600 }}>
                      DISPONIBLE EN TODAS LAS PLATAFORMAS
                    </div>
                  </div>

                  {/* Optional Verse */}
                  {showVerse && (
                    <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '40px', textAlign: 'center', width: '80%' }}>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '24px', fontStyle: 'italic', marginBottom: '10px', lineHeight: '1.4' }}>
                        "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas."
                      </div>
                      <div style={{ color: '#c5a059', fontSize: '20px', fontWeight: 700, letterSpacing: '4px' }}>
                        JOSUÉ 1:9
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
