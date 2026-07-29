import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';
import { getCorsFriendlyUrl } from '../../services/imageHelpers';
import html2canvas from 'html2canvas';

interface CampaignStrategy {
  phase: string;
  days: string;
  actions: string[];
  suggestedCaption: string;
  hashtags: string[];
}

export const MusicPromoHub: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);

  // States
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);

  // Custom configuration states
  const [campaignGoal, setCampaignGoal] = useState<'lanzamiento' | 'lanzado' | 'aniversario' | 'viral'>('lanzamiento');
  const [targetAudience, setTargetAudience] = useState('Jóvenes con Fe, Atletas, amantes del Trap/Urbano Cristiano');
  const [customHook, setCustomHook] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [promoStyle, setPromoStyle] = useState<'minimal' | 'gold' | 'neon' | 'grunge'>('gold');

  // Generator states
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignOutput, setCampaignOutput] = useState<{
    pitchEmail: string;
    pressRelease: string;
    tiktokHooks: string[];
    socialCaptions: { platform: string; text: string }[];
    strategies: CampaignStrategy[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'campaign' | 'kit' | 'pitch' | 'social'>('campaign');
  const [toast, setToast] = useState('');
  const [isExportingBanner, setIsExportingBanner] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Fetch catalog on load
  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614')
        ]);
        const full = [...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCatalog(full);
        if (full.length > 0) {
          setSelectedSongId(full[0].id);
          setSelectedSong(full[0]);
        }
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, []);

  // Update selected song when dropdown changes
  const handleSelectSong = (id: string) => {
    setSelectedSongId(id);
    const found = catalog.find(s => s.id === id);
    if (found) {
      setSelectedSong(found);
      setCustomHook(`"Escucha ${found.name} en todas las plataformas de streaming"`);
    }
  };

  // AI-Powered Campaign & Strategy Generator
  const handleGeneratePromoHub = async () => {
    if (!selectedSong) {
      showToast('⚠️ Selecciona una canción del catálogo');
      return;
    }
    setIsGenerating(true);
    setCampaignOutput(null);

    const songTitle = selectedSong.name;
    const artistName = selectedSong.artist || 'Diosmasgym';
    const songUrl = selectedSong.url || `https://diosmasgym.com/link/custom?title=${encodeURIComponent(songTitle)}`;

    try {
      // Direct prompt simulation with rich structured data & AI API call
      const prompt = `Crea un Hub Estratégico de Promoción Musical Completo para la canción:
Título: "${songTitle}"
Artista: "${artistName}"
Objetivo: "${campaignGoal}"
Público Objetivo: "${targetAudience}"
Mensaje clave: "${keyMessage || 'Fe, superación y fuerza interior'}"

Genera lo siguiente en JSON estricto:
{
  "pitchEmail": "Email profesional formateado para playlist curators de Spotify/Apple Music",
  "pressRelease": "Comunicado de Prensa Oficial listo para blogs de música urbana/religiosa",
  "tiktokHooks": ["3 hooks virales para TikTok/Reels de 3 segundos"],
  "socialCaptions": [
    {"platform": "Instagram", "text": "Texto para Instagram con emojis y hashtags"},
    {"platform": "TikTok", "text": "Texto corto y directo para TikTok"},
    {"platform": "Facebook", "text": "Publicación inspiradora más larga para Facebook"}
  ],
  "strategies": [
    {
      "phase": "Fase 1: Pre-Lanzamiento",
      "days": "Días -7 a 0",
      "actions": ["3 acciones concretas de intriga y pre-saves"],
      "suggestedCaption": "Frase de intriga",
      "hashtags": ["#Diosmasgym", "#MusicaCristiana"]
    },
    {
      "phase": "Fase 2: Día de Estreno",
      "days": "Día 0",
      "actions": ["3 acciones para maximizar reproducciones el primer día"],
      "suggestedCaption": "Frase de estreno oficial",
      "hashtags": ["#NuevoLanzamiento", "#Estreno"]
    },
    {
      "phase": "Fase 3: Mantenimiento & Viralización",
      "days": "Días +1 a +15",
      "actions": ["3 acciones de UGC, retos y clips de testimonio"],
      "suggestedCaption": "Frase para mantener el impulso",
      "hashtags": ["#FeYMusica", "#Viral"]
    }
  ]
}`;

      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': localStorage.getItem('admin_password') || ''
        },
        body: JSON.stringify({ content: prompt })
      });

      if (res.ok) {
        const data = await res.json();
        let parsed;
        try {
          // Extraer JSON si la respuesta viene dentro de md codeblocks
          const cleanedText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleanedText);
        } catch {
          // Fallback estructurado de alta calidad si la IA devuelve texto
          parsed = generateFallbackCampaign(songTitle, artistName, songUrl);
        }
        setCampaignOutput(parsed);
      } else {
        setCampaignOutput(generateFallbackCampaign(songTitle, artistName, songUrl));
      }
    } catch (error) {
      console.error('Error generando campaña:', error);
      setCampaignOutput(generateFallbackCampaign(songTitle, artistName, songUrl));
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback generator when offline or API fails
  const generateFallbackCampaign = (song: string, artist: string, url: string) => {
    return {
      pitchEmail: `Asunto: Pitch para Playlist - Nuevo Sencillo de ${artist} "${song}"\n\nHola Equipo de Curatoría,\n\nEspero que se encuentren muy bien. Les escribo para presentarles "${song}", el nuevo sencillo de ${artist}.\n\nEsta canción combina una producción urbana de primer nivel con un mensaje inspirador de fe, fuerza y superación personal. Ha sido producida pensando en playlists de motivación, entrenamiento y fe urbana.\n\nEnlace oficial / Pre-Save: ${url}\n\nGracias por su tiempo y consideración para incluirla en sus listas de reproducción.\n\nAtentamente,\n${artist} Team`,
      pressRelease: `PARA PUBLICACIÓN INMEDIATA\n\n${artist} ANUNCIA EL LANZAMIENTO OFICIAL DE SU NUEVO SENCILLO "${song.toUpperCase()}"\n\nChihuahua, México — El artista de música urbana y motivación ${artist} ha presentado su más reciente sencillo titulado "${song}". Este tema promete ser un himno de fe, superación y disciplina personal para miles de oyentes en plataformas digitales.\n\n"Queremos que cada persona que escuche este tema recuerde que con fe y disciplina no hay obstáculo inalcanzable", comentó el equipo del artista.\n\nEl sencillo ya está disponible para escuchar en todas las plataformas digitales de streaming.`,
      tiktokHooks: [
        `🔥 "Si estás pasando por una prueba difícil, escucha esta canción los primeros 5 segundos..."`,
        `⚡ "La canción que estabas buscando para motivarte en tu entrenamiento diario..."`,
        `🙏 "Cuando sientas que ya no puedes más, dale play a este verso..."`
      ],
      socialCaptions: [
        {
          platform: 'Instagram',
          text: `🔥 ¡YA DISPONIBLE! "${song}" de ${artist} ya está lista en Spotify, Apple Music y YouTube. 🎧\n\nNo dejes que las dudas frenen tu camino. ¡Eleva tu espíritu y entrena con el alma!\n\n👉 Enlace directo en nuestro perfil.\n#Diosmasgym #${artist.replace(/\s+/g, '')} #NuevaMusica #FeYDisciplina`
        },
        {
          platform: 'TikTok',
          text: `Escucha "${song}" 🎵 Link en la bio para guardarla en tu playlist favorita! 🙌🔥 #fe #gymmotivation #trapcristiano`
        },
        {
          platform: 'Facebook',
          text: `¡Familia! Estamos muy emocionados de compartirles el lanzamiento de "${song}". Una producción hecha con todo el corazón para fortalecer tu fe y tu espíritu. ¡Compártela con quien necesite una palabra de aliento hoy! 🚀🎧`
        }
      ],
      strategies: [
        {
          phase: 'Fase 1: Intrigas & Pre-Saves',
          days: 'Días -7 a 0',
          actions: [
            'Publicar Reel/Story de 15s con el beat principal sin revelar la letra completa.',
            'Generar Smart Link de Pre-Save y compartirlo en la biografía de Instagram y TikTok.',
            'Enviar notificación Push a los usuarios registrados en la app Diosmasgym.'
          ],
          suggestedCaption: 'Algo grande se aproxima... ¿Estás listo para lo nuevo?',
          hashtags: ['#Diosmasgym', '#Próximamente', '#Fe']
        },
        {
          phase: 'Fase 2: Estreno Masivo',
          days: 'Día 0',
          actions: [
            'Publicar la portada oficial en Instagram, Facebook y TikTok simultáneamente.',
            'Lanzar video con letra (Lyric Studio) en el canal oficial de YouTube.',
            'Compartir la Smart Card en Stories con enlace directo de reproducción.'
          ],
          suggestedCaption: `¡YA ES UNA REALIDAD! Escucha "${song}" ahora mismo. Link en bio!`,
          hashtags: ['#Estreno', '#NuevoLanzamiento', '#MusicaCristiana']
        },
        {
          phase: 'Fase 3: Expansión & Reels UGC',
          days: 'Días +1 a +15',
          actions: [
            'Incentivar a la comunidad a usar el audio oficial en sus rutinas de entrenamiento.',
            'Publicar el detrás de cámaras o historias sobre la creación del tema.',
            'Enviar el Pitch oficial a curatorías independientes de Spotify.'
          ],
          suggestedCaption: `Muestra cómo entrenas o te motivas con "${song}". ¡Usa nuestro audio!`,
          hashtags: ['#GymMotivation', '#UGC', '#Viral']
        }
      ]
    };
  };

  // Quick tools redirection helpers
  const handleOpenTool = (route: string) => {
    navigate(route, { state: { song: selectedSong } });
  };

  // Export Banner
  const handleExportPromoCard = async () => {
    if (!previewRef.current) return;
    setIsExportingBanner(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null
      });
      const link = document.createElement('a');
      link.download = `Promo_${selectedSong?.name || 'Cancion'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('✅ Banner promocional descargado en Alta Res');
    } catch (err) {
      console.error(err);
      showToast('❌ Error descargando banner');
    } finally {
      setIsExportingBanner(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white pt-24 pb-32 px-4 md:px-8 font-['Poppins']">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 bg-[#c5a059] text-black font-bold px-6 py-3 rounded-xl shadow-2xl animate-bounce flex items-center gap-2">
          <span>✨</span> {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button 
              onClick={() => navigate('/admin')} 
              className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-3 hover:text-white transition-all group"
            >
              <div className="w-8 h-px bg-[#c5a059] group-hover:w-14 transition-all"></div>
              Volver al Panel Principal
            </button>
            <h1 className="font-serif italic text-4xl md:text-6xl text-white">
              Centro de <span className="text-[#c5a059]">Promoción Musical</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-2xl">
              Suite profesional todo-en-uno para promocionar tus sencillos y álbumes. Genera estrategias virales, comunicados de prensa, pitch para playlists y banners de alto impacto visual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></span>
              SUITE PRO v2.5
            </span>
          </div>
        </div>

        {/* Quick Launchpad to Other Tools */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
          <button 
            onClick={() => handleOpenTool('/admin/custom-promo')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#c5a059]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-[#c5a059] fa-wand-magic-sparkles text-[#c5a059] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Custom Promo Studio</div>
            <div className="text-[9px] text-gray-400">Scrapbook, Vinyl, Cyberpunk</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/promo-image')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#c5a059]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-image text-[#4a90d9] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Promo Image</div>
            <div className="text-[9px] text-gray-400">Generar Portadas</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/smart-links')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#3b82f6]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-link text-[#3b82f6] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Smart Links</div>
            <div className="text-[9px] text-gray-400">Pre-Saves Landing</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/story-countdown')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#f97316]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-hourglass-half text-[#f97316] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Countdowns</div>
            <div className="text-[9px] text-gray-400">Cuenta Regresiva</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/lyric-studio')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#00ffcc]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-clapperboard text-[#00ffcc] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Lyric Studio</div>
            <div className="text-[9px] text-gray-400">Video Lirico HD</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/epk-generator')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#a855f7]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-file-pdf text-[#a855f7] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Press Kit EPK</div>
            <div className="text-[9px] text-gray-400">Dossier de Prensa</div>
          </button>

          <button 
            onClick={() => handleOpenTool('/admin/top5-social')}
            className="bg-[#0f111a] hover:bg-[#181b29] border border-white/10 hover:border-[#38bdf8]/50 p-4 rounded-xl text-left transition-all group"
          >
            <i className="fa-solid fa-list-ol text-[#38bdf8] text-xl mb-2 group-hover:scale-110 transition-transform"></i>
            <div className="font-bold text-xs">Top 5 Social</div>
            <div className="text-[9px] text-gray-400">Banner de Éxitos</div>
          </button>
        </div>

        {/* MAIN PROMO ENGINE CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

          {/* Left Column: Configuration & Song Picker */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#c5a059]/20 flex items-center gap-0 justify-center text-[#c5a059]">
                  <i className="fa-solid fa-compact-disc text-xl animate-spin-slow"></i>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">1. Configurar Lanzamiento</h3>
                  <p className="text-[10px] text-gray-400">Selecciona la canción y ajusta los parámetros de campaña</p>
                </div>
              </div>

              {/* Select Song */}
              <div className="mb-5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#c5a059] mb-2">
                  Seleccionar Canción / Álbum
                </label>
                {loadingCatalog ? (
                  <div className="p-3 bg-[#05070a] border border-white/10 rounded-xl text-xs text-gray-400 animate-pulse">
                    Cargando catálogo musical...
                  </div>
                ) : (
                  <select 
                    value={selectedSongId}
                    onChange={(e) => handleSelectSong(e.target.value)}
                    className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-white text-xs outline-none cursor-pointer"
                  >
                    {catalog.map(song => (
                      <option key={song.id} value={song.id}>
                        {song.name} — {song.artist} ({song.type || 'Sencillo'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Song Preview Card */}
              {selectedSong && (
                <div className="mb-5 p-3 bg-[#05070a] border border-white/10 rounded-xl flex items-center gap-3">
                  <img 
                    src={getCorsFriendlyUrl(selectedSong.cover)} 
                    alt={selectedSong.name} 
                    className="w-14 h-14 rounded-lg object-cover border border-white/10"
                    onError={(e) => { (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'); }}
                  />
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs text-white truncate">{selectedSong.name}</div>
                    <div className="text-[11px] text-[#c5a059] truncate">{selectedSong.artist}</div>
                    <div className="text-[9px] text-gray-400 mt-1">Lanzamiento: {selectedSong.date || 'Reciente'}</div>
                  </div>
                </div>
              )}

              {/* Goal Selector */}
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#c5a059] mb-2">
                  Objetivo de la Campaña
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'lanzamiento', label: '🚀 Próximo Estreno' },
                    { id: 'lanzado', label: '🔥 Canción Ya Lanzada' },
                    { id: 'aniversario', label: '🎉 Aniversario / Hito' },
                    { id: 'viral', label: '⚡ Reto Viral TikTok' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setCampaignGoal(item.id as any)}
                      className={`p-2.5 rounded-xl text-[11px] font-bold border transition-all text-left ${
                        campaignGoal === item.id 
                          ? 'bg-[#c5a059] text-black border-[#c5a059]' 
                          : 'bg-[#05070a] text-gray-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience */}
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#c5a059] mb-2">
                  Audiencia Objetivo
                </label>
                <input 
                  type="text" 
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-white text-xs outline-none"
                  placeholder="Ej: Amantes de Trap Cristiano, deportistas, etc."
                />
              </div>

              {/* Key Message */}
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#c5a059] mb-2">
                  Mensaje Clave o Eslogan (Opcional)
                </label>
                <input 
                  type="text" 
                  value={keyMessage}
                  onChange={(e) => setKeyMessage(e.target.value)}
                  className="w-full bg-[#05070a] border border-white/10 focus:border-[#c5a059] rounded-xl p-3 text-white text-xs outline-none"
                  placeholder="Ej: 'Nunca te rindas, mantén la fe firme'"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleGeneratePromoHub}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-[#c5a059] via-[#e5c178] to-[#c5a059] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-[0_0_25px_rgba(197,160,89,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin text-base"></i>
                  <span>Generando Estrategia IA...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles text-base"></i>
                  <span>Generar Plan de Promoción IA</span>
                </>
              )}
            </button>
          </div>

          {/* Center Column: Interactive Visual Promo Banner Creator */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <i className="fa-solid fa-palette text-xl"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">2. Banner Promocional Live</h3>
                    <p className="text-[10px] text-gray-400">Previsualiza y descarga la tarjeta oficial en Alta Res</p>
                  </div>
                </div>

                {/* Style Toggle */}
                <div className="flex gap-1 bg-[#05070a] p-1 rounded-lg border border-white/10">
                  {(['gold', 'neon', 'minimal', 'grunge'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setPromoStyle(style)}
                      className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                        promoStyle === style ? 'bg-[#c5a059] text-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Render Node */}
              <div 
                ref={previewRef}
                className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border flex flex-col justify-between p-6 transition-all ${
                  promoStyle === 'gold' ? 'border-[#c5a059]/40 bg-gradient-to-br from-[#0c0e17] via-[#141726] to-[#05070a]' :
                  promoStyle === 'neon' ? 'border-[#00ffcc]/40 bg-gradient-to-br from-[#05131a] via-[#09222c] to-[#05070a]' :
                  promoStyle === 'minimal' ? 'border-white/20 bg-[#09090b]' :
                  'border-red-500/40 bg-gradient-to-br from-[#1a0808] via-[#0f0505] to-[#05070a]'
                }`}
              >
                {/* Background Cover Blur */}
                {selectedSong?.cover && (
                  <div 
                    className="absolute inset-0 opacity-25 bg-cover bg-center blur-xl scale-125"
                    style={{ backgroundImage: `url(${getCorsFriendlyUrl(selectedSong.cover)})` }}
                  />
                )}

                {/* Top Badge */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className={`text-[9px] font-black tracking-[0.3em] uppercase px-3 py-1 rounded-full border backdrop-blur-md ${
                    promoStyle === 'gold' ? 'bg-[#c5a059]/20 text-[#c5a059] border-[#c5a059]/40' :
                    promoStyle === 'neon' ? 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/40' :
                    promoStyle === 'minimal' ? 'bg-white/10 text-white border-white/20' :
                    'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}>
                    {campaignGoal === 'lanzamiento' ? '⚡ PRÓXIMO LANZAMIENTO' : '🔥 YA DISPONIBLE'}
                  </span>
                  <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">DIOSMASGYM</div>
                </div>

                {/* Central Album Artwork & Vinyl effect */}
                <div className="relative z-10 my-auto flex flex-col items-center text-center">
                  <div className="relative group cursor-pointer">
                    <img 
                      src={getCorsFriendlyUrl(selectedSong?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600')} 
                      alt="Cover"
                      className="w-40 h-40 md:w-48 md:h-48 rounded-xl object-cover shadow-2xl border border-white/20 relative z-10 transition-transform group-hover:scale-105"
                      onError={(e) => { (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'); }}
                    />
                    <div className="absolute top-0 -right-6 w-40 h-40 md:w-48 md:h-48 rounded-full bg-black border-4 border-gray-800 flex items-center justify-center opacity-80 animate-spin-slow">
                      <div className="w-12 h-12 rounded-full border-2 border-amber-500/50 bg-black flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                      </div>
                    </div>
                  </div>

                  <h2 className="font-serif italic font-black text-2xl md:text-3xl text-white mt-5 leading-tight drop-shadow-md">
                    {selectedSong?.name || 'TÍTULO DE LA CANCIÓN'}
                  </h2>
                  <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                    promoStyle === 'gold' ? 'text-[#c5a059]' :
                    promoStyle === 'neon' ? 'text-[#00ffcc]' :
                    'text-gray-300'
                  }`}>
                    {selectedSong?.artist || 'DIOSMASGYM'}
                  </p>
                </div>

                {/* Bottom Platform Icons & Call To Action */}
                <div className="relative z-10 flex flex-col items-center gap-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] text-gray-300 font-medium italic">
                    {customHook || `"Disponible en Spotify, Apple Music y YouTube"`}
                  </p>
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <i className="fa-brands fa-spotify hover:text-green-500 transition-colors"></i>
                    <i className="fa-brands fa-apple hover:text-white transition-colors"></i>
                    <i className="fa-brands fa-youtube hover:text-red-500 transition-colors"></i>
                    <i className="fa-brands fa-amazon hover:text-amber-400 transition-colors"></i>
                    <i className="fa-solid fa-music hover:text-pink-500 transition-colors"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Control Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleExportPromoCard}
                disabled={isExportingBanner}
                className="flex-1 py-3 bg-[#05070a] hover:bg-[#141724] border border-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download text-[#c5a059]"></i>
                <span>{isExportingBanner ? 'Exportando PNG...' : 'Descargar Banner HD'}</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedSong?.url || window.location.href);
                  showToast('📋 Link oficial copiado al portapapeles');
                }}
                className="px-4 py-3 bg-[#05070a] hover:bg-[#141724] border border-white/20 text-white font-bold text-xs rounded-xl transition-all"
                title="Copiar Link"
              >
                <i className="fa-solid fa-link text-[#3b82f6]"></i>
              </button>
            </div>
          </div>

          {/* Right Column: AI Output Results & Campaign Hub */}
          <div className="bg-[#0f111a] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <i className="fa-solid fa-bullhorn text-xl"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">3. Hub Estratégico IA</h3>
                    <p className="text-[10px] text-gray-400">Pitches, comunicados y cronograma viral</p>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for Campaign Outputs */}
              <div className="flex border-b border-white/10 mb-4 overflow-x-auto no-scrollbar">
                {[
                  { id: 'campaign', label: '📅 Plan 15 Días' },
                  { id: 'kit', label: '🔥 Hooks TikTok' },
                  { id: 'pitch', label: '✉️ Pitch Playlist' },
                  { id: 'social', label: '📲 Redes Social' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-[#c5a059] text-[#c5a059]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {!campaignOutput ? (
                <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-xl">
                  <i className="fa-solid fa-wand-magic-sparkles text-3xl text-gray-600 mb-3"></i>
                  <div className="text-xs font-bold text-gray-300">Aún no se ha generado la campaña</div>
                  <p className="text-[10px] text-gray-500 mt-1">Haz clic en "Generar Plan de Promoción IA" para construir la estrategia completa.</p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4 no-scrollbar">
                  
                  {/* Tab 1: 15-Day Strategy */}
                  {activeTab === 'campaign' && (
                    <div className="space-y-4">
                      {campaignOutput.strategies.map((strat, idx) => (
                        <div key={idx} className="p-4 bg-[#05070a] border border-white/10 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-xs text-[#c5a059]">{strat.phase}</span>
                            <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded text-gray-300">{strat.days}</span>
                          </div>
                          <ul className="text-[11px] text-gray-300 space-y-1.5 list-disc list-inside mb-3">
                            {strat.actions.map((act, i) => (
                              <li key={i}>{act}</li>
                            ))}
                          </ul>
                          <div className="p-2 bg-black/40 rounded border border-white/5 text-[10px] text-gray-400 italic">
                            💡 Copy sugerido: "{strat.suggestedCaption}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Viral Hooks */}
                  {activeTab === 'kit' && (
                    <div className="space-y-3">
                      <div className="text-[11px] text-gray-400 mb-2">
                        Utiliza estos hooks de 3 segundos para capturar la atención en TikTok e Instagram Reels:
                      </div>
                      {campaignOutput.tiktokHooks.map((hook, i) => (
                        <div key={i} className="p-3 bg-[#05070a] border border-white/10 rounded-xl flex items-center justify-between gap-3">
                          <p className="text-xs text-white font-medium">{hook}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(hook);
                              showToast('Copiaste el hook');
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                          >
                            <i className="fa-solid fa-copy text-xs"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Pitch Email & Press Release */}
                  {activeTab === 'pitch' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-[#c5a059]">Email para Curatoría de Playlists</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(campaignOutput.pitchEmail);
                              showToast('Email de pitch copiado');
                            }}
                            className="text-[10px] text-[#c5a059] font-bold hover:underline"
                          >
                            Copiar Email
                          </button>
                        </div>
                        <pre className="p-3 bg-[#05070a] border border-white/10 rounded-xl text-[10px] text-gray-300 whitespace-pre-wrap font-sans">
                          {campaignOutput.pitchEmail}
                        </pre>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-[#c5a059]">Comunicado de Prensa Oficial (PR)</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(campaignOutput.pressRelease);
                              showToast('Comunicado copiado');
                            }}
                            className="text-[10px] text-[#c5a059] font-bold hover:underline"
                          >
                            Copiar PR
                          </button>
                        </div>
                        <pre className="p-3 bg-[#05070a] border border-white/10 rounded-xl text-[10px] text-gray-300 whitespace-pre-wrap font-sans">
                          {campaignOutput.pressRelease}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Social Media Texts */}
                  {activeTab === 'social' && (
                    <div className="space-y-4">
                      {campaignOutput.socialCaptions.map((item, i) => (
                        <div key={i} className="p-3 bg-[#05070a] border border-white/10 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              {item.platform === 'Instagram' && <i className="fa-brands fa-instagram text-pink-500"></i>}
                              {item.platform === 'TikTok' && <i className="fa-brands fa-tiktok text-cyan-400"></i>}
                              {item.platform === 'Facebook' && <i className="fa-brands fa-facebook text-blue-500"></i>}
                              {item.platform}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.text);
                                showToast(`Copy para ${item.platform} copiado`);
                              }}
                              className="text-[10px] text-[#c5a059] font-bold hover:underline"
                            >
                              Copiar Copy
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-300 whitespace-pre-line">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Bottom Integration Action */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
              <span>Sincronizado con Google Catalog</span>
              <button 
                onClick={() => navigate('/admin/proximos-lanzamientos')} 
                className="text-[#c5a059] font-bold hover:underline"
              >
                Ver Próximos Estrenos →
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MusicPromoHub;
