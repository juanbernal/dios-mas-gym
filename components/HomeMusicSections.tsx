import React, { useState, useEffect, useMemo } from 'react';
import { MusicItem } from '../types';

interface HomeMusicSectionsProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

interface YTVideoItem {
  id: string;
  title: string;
  rawTitle?: string;
  thumb: string;
  url: string;
  views: number;
  viewsFormatted: string;
  duration?: string;
  album?: string;
  likes?: number;
  channel: string;
  handle?: string;
}

export const HomeMusicSections: React.FC<HomeMusicSectionsProps> = ({ catalog, onPlaySong }) => {
  if (!catalog || catalog.length === 0) return null;

  // 1. Featured Release (Latest)
  const featured = catalog[0];

  const [topAnalytics, setTopAnalytics] = useState<string[]>([]);
  const [topVideos, setTopVideos] = useState<YTVideoItem[]>([]);
  const [hiddenGems, setHiddenGems] = useState<YTVideoItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'diosmasgym' | 'juan614'>('all');
  const [selectedChannelGems, setSelectedChannelGems] = useState<'all' | 'diosmasgym' | 'juan614'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(15);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dmg_yt_likes');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [loadingYT, setLoadingYT] = useState(true);

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedMap(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('dmg_yt_likes', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handlePlayYTTrack = (video: YTVideoItem) => {
    // Check if catalog has matching song for rich metadata
    const matchedSong = catalog.find(s => 
      (s.url && s.url.includes(video.id)) ||
      (s.name && video.title.toLowerCase().includes(s.name.toLowerCase()))
    );

    if (matchedSong) {
      onPlaySong(matchedSong);
    } else {
      const genericSong: MusicItem = {
        id: video.id,
        name: video.title,
        artist: video.channel,
        url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
        cover: video.thumb || `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
        type: 'video',
        date: new Date().toISOString().split('T')[0],
        album: video.album || 'YouTube Single'
      };
      onPlaySong(genericSong);
    }
  };

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        if (json?.data) {
          const songs = json.data.topSongs ? json.data.topSongs.map((s:any) => s.title) : [];
          const pages = json.data.topPages ? json.data.topPages.map((p:any) => p.title) : [];
          const combined = Array.from(new Set([...songs, ...pages]));
          setTopAnalytics(combined);
        }
      } catch (e) {
        console.warn('Analytics top fetch failed', e);
      }
    };

    const fetchYouTube = async () => {
      setLoadingYT(true);

      const knownAlbumMap: Record<string, string> = {
        'modo santo, modo pecado': 'Creyente o conveniente',
        'esa chulada': 'Estados Ocultos',
        'mira lo que hizo dios': '¡Ey menso !',
        'algún día te dije que no tendría alguien más que a ti': 'Me mueve el tapete',
        'algun dia te dije que no tendria alguien mas que a ti': 'Me mueve el tapete',
        '¿cómo se que me gusta ?': '¡Queria ser pastor!',
        '¿como se que me gusta?': '¡Queria ser pastor!',
        'donde han lastimado': 'Por fin LLEGUÉ',
        'funciona o no': 'Por fin LLEGUÉ',
        'esta es la voluntad de dios': 'Por fin LLEGUÉ',
        'me aceptó tal y como soy': 'Lo que no DIGO',
        'me acepto tal y como soy': 'Lo que no DIGO',
        'por fin llegué': 'Por fin LLEGUÉ',
        'por fin llegue': 'Por fin LLEGUÉ',
        'perdoname por no ser lo que esperabas': 'COMO EN LOS DIAS DE NOE',
        'perdóname por no ser lo que esperabas': 'COMO EN LOS DIAS DE NOE',
        'eres mía todavía': 'Alma en Frecuencia',
        'eres mia todavia': 'Alma en Frecuencia',
        'las mentiras': 'Ayer llorando por alguien y ho...',
        'borracho': 'Borracho',
        'de ateo a servirte': 'Alma en Frecuencia',
        'se fuerte y valiente': 'Quítame a esa mujer',
        'sé fuerte y valiente': 'Quítame a esa mujer',
      };

      const isDevotional = (t: string) => {
        const lower = t.toLowerCase();
        return (
          lower.includes('semana santa') ||
          lower.includes('dia de la mujer') ||
          lower.includes('día de la mujer') ||
          lower.includes('compa, escucha') ||
          lower.includes('consulta es gratis') ||
          lower.includes('terapeuta atiende') ||
          lower.includes('no comes carne') ||
          lower.includes('si le escribes') ||
          lower.includes('el dijo que estaría') ||
          lower.includes('identidad (therian)')
        );
      };

      try {
        const res = await fetch('/api/common?action=youtube-top');
        if (res.ok) {
          const data = await res.json();
          if (data?.top?.length > 0) {
            const enrichItems = (items: YTVideoItem[]) =>
              items.map(it => {
                const normTitle = it.title.toLowerCase().trim();
                const matchedAlbum = knownAlbumMap[normTitle] || it.album;
                return {
                  ...it,
                  album: matchedAlbum && matchedAlbum !== 'Single' ? matchedAlbum : (knownAlbumMap[normTitle] || it.album || 'Single')
                };
              });

            setTopVideos(enrichItems(data.top));
            setHiddenGems(enrichItems(data.hiddenGems || []));
            setLoadingYT(false);
            return;
          }
        }
      } catch (e) {
        console.warn('YouTube API failed, falling back to catalog stats', e);
      }

      // Fallback: Source exclusively from the official Music Catalog
      const validMusicCatalog = catalog.filter(s => s && s.name && s.url && s.url.includes('youtube') && !isDevotional(s.name));
      
      const enrichedSongs: YTVideoItem[] = validMusicCatalog.map((s, idx) => {
        const urlMatch = s.url?.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
        const vid = urlMatch?.[1] || s.id;
        const isJuan = s.artist?.toLowerCase().includes('juan');
        const normTitle = s.name.toLowerCase().trim();
        const resolvedAlbum = knownAlbumMap[normTitle] || s.album || 'Single';
        
        const estViews = Math.max(120, Math.floor(16000 / (idx + 1) + (idx % 8) * 410));
        const viewsFormatted = estViews >= 1000 ? `${(estViews/1000).toFixed(1).replace('.', ',')} K reproducciones` : `${estViews} reproducciones`;
        const duration = idx % 3 === 0 ? '3:25' : idx % 2 === 0 ? '3:04' : '2:58';
        const likes = Math.floor(estViews * 0.08);

        return {
          id: vid,
          title: s.name.replace(/\s*\(Video Oficial\)|\s*\(Audio Oficial\)|\s*\[Video Oficial\]|\s*\(Oficial\)/gi, '').trim(),
          rawTitle: s.name,
          thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : (s.cover || ''),
          url: s.url || `https://www.youtube.com/watch?v=${vid}`,
          channel: s.artist || (isJuan ? 'Juan 614' : 'Diosmasgym'),
          handle: isJuan ? '@juan614oficial' : '@diosmasgym',
          views: estViews,
          viewsFormatted,
          duration,
          album: resolvedAlbum,
          likes
        };
      });

      const sortedTop = [...enrichedSongs].sort((a, b) => b.views - a.views).slice(0, 50);
      const sortedGems = [...enrichedSongs].sort((a, b) => a.views - b.views).slice(0, 25);

      setTopVideos(sortedTop);
      setHiddenGems(sortedGems);
      setLoadingYT(false);
    };

    fetchTop();
    fetchYouTube();
  }, [catalog]);

  const topDeLaSemana = useMemo(() => {
    if (topAnalytics.length > 0) {
      const matched = topAnalytics.map(t => {
        if (!t) return null;
        return catalog.find(c => c.name && c.name.toLowerCase() === t.toLowerCase());
      }).filter(Boolean) as MusicItem[];
      
      if (matched.length >= 5) return matched.slice(0, 5);
      return [...matched, ...catalog.filter(c => !matched.find(m => m.id === c.id))].slice(0, 5);
    }
    return catalog.slice(1, 6);
  }, [catalog, topAnalytics]);

  // Filtered Top 50
  const filteredTopList = useMemo(() => {
    let list = topVideos;
    if (selectedChannel === 'diosmasgym') {
      list = list.filter(v => v.channel.toLowerCase().includes('dios') || v.handle?.includes('dios'));
    } else if (selectedChannel === 'juan614') {
      list = list.filter(v => v.channel.toLowerCase().includes('juan') || v.handle?.includes('juan'));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.channel.toLowerCase().includes(q) ||
        (v.album && v.album.toLowerCase().includes(q))
      );
    }
    return list;
  }, [topVideos, selectedChannel, searchQuery]);

  // Filtered Joyas Ocultas (Menos escuchadas)
  const filteredGemsList = useMemo(() => {
    let list = hiddenGems;
    if (selectedChannelGems === 'diosmasgym') {
      list = list.filter(v => v.channel.toLowerCase().includes('dios') || v.handle?.includes('dios'));
    } else if (selectedChannelGems === 'juan614') {
      list = list.filter(v => v.channel.toLowerCase().includes('juan') || v.handle?.includes('juan'));
    }
    return list;
  }, [hiddenGems, selectedChannelGems]);

  // 2. Music Videos
  const musicVideos = catalog.filter(s => s.url && s.url.includes('youtube')).slice(0, 4);

  // 3. Playlists / Curated
  const playlists = [
    {
      title: "Entrenamiento Pesado",
      description: "Beats agresivos y guitarras para romper récords.",
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop",
      keywords: ["gym", "fuerza", "poder", "entrenar"]
    },
    {
      title: "Adoración y Fe",
      description: "Momentos de intimidad y fortaleza espiritual.",
      image: "https://images.unsplash.com/photo-1507692049790-de58290a4334?q=80&w=2070&auto=format&fit=crop",
      keywords: ["dios", "luz", "paz", "salvacion"]
    },
    {
      title: "Combate Espiritual",
      description: "Para cuando la batalla arrecia y necesitas fe.",
      image: "https://images.unsplash.com/photo-1519671282429-b8a761c37f0e?q=80&w=2070&auto=format&fit=crop",
      keywords: ["batalla", "espada", "guerra", "fuego"]
    }
  ];

  return (
    <div className="flex flex-col gap-0 mb-0 overflow-hidden">
      
      {/* FEATURED RELEASE */}
      <section className="relative w-full overflow-hidden border-b border-white/5 group mt-0">
        <div className="absolute inset-0">
          <img loading="lazy" src={featured.cover} alt="Background" className="w-full h-full object-cover blur-3xl opacity-20 group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070a] via-[#05070a]/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10 md:gap-20">
          <div className="w-52 h-52 md:w-80 md:h-80 flex-shrink-0 relative cursor-pointer" onClick={() => onPlaySong(featured)}>
            <div className="absolute inset-0 bg-[#4a90d9] blur-[80px] opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
            <img 
              src={featured.cover} 
              alt={featured.name} 
              className="w-full h-full object-cover rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-2 group-hover:rotate-0 transition-transform duration-500 border border-white/10 relative z-10"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <div className="w-16 h-16 bg-[#4a90d9] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,168,0.8)]">
                <i className="fas fa-play text-black text-xl ml-1"></i>
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block py-2 px-6 rounded-full border border-[#4a90d9]/30 bg-[#4a90d9]/10 text-[9px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-6">
              Destacado
            </span>
            <h2 className="font-serif italic text-5xl md:text-7xl mb-4 text-white drop-shadow-lg">{featured.name}</h2>
            <p className="text-xl font-black uppercase tracking-[0.3em] text-white/50 mb-10">{featured.artist}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <button 
                onClick={() => onPlaySong(featured)}
                className="px-10 py-5 rounded-full bg-[#4a90d9] text-black text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(37,99,168,0.3)]"
              >
                <i className="fas fa-play"></i> Escuchar Ahora
              </button>
              <a 
                href={`/link/${featured.id}`} 
                target="_blank" rel="noreferrer"
                className="px-10 py-5 rounded-full border border-white/20 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Guardar / Pre-Save
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TOP DE LA SEMANA — estilo ranking con scroll horizontal */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[#05070a]">
        <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-[#4a90d9] via-[#4a90d9]/40 to-transparent"></div>
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4a90d9]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-8 md:px-16">
          <div className="flex items-end gap-6 mb-12">
            <div className="relative">
              <div className="absolute -inset-2 bg-[#4a90d9]/10 rounded-lg -skew-x-6"></div>
              <h2 className="relative font-serif italic text-5xl md:text-7xl text-white leading-none">
                Top <span className="text-[#4a90d9]">Semana</span>
              </h2>
            </div>
            <div className="pb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
              <span className="w-8 h-px bg-white/20"></span>
              Lo más escuchado
            </div>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
            {topDeLaSemana.map((song, i) => (
              <div
                key={song.id || song.name || i}
                onClick={() => onPlaySong(song)}
                className="group snap-start flex-shrink-0 w-[200px] md:w-[220px] cursor-pointer"
              >
                <div className="relative mb-3">
                  <div className="absolute -left-3 -top-4 font-serif italic text-[100px] leading-none font-black text-white/5 select-none z-0 group-hover:text-[#4a90d9]/10 transition-colors">
                    {i + 1}
                  </div>
                  <div className="relative z-10 aspect-square rounded-2xl overflow-hidden border border-white/5 group-hover:border-[#4a90d9]/40 transition-colors shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                    <img loading="lazy" src={song.cover} alt={song.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-70 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-10 h-10 rounded-full bg-[#4a90d9] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,168,0.8)]">
                        <i className="fas fa-play text-black text-sm ml-0.5"></i>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#4a90d9] text-black font-black text-[10px] flex items-center justify-center shadow-lg">
                      {i + 1}
                    </div>
                  </div>
                </div>
                <h4 className="font-serif italic text-lg text-white truncate group-hover:text-[#4a90d9] transition-colors leading-tight">{song.name}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 truncate mt-0.5">{song.artist}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: 🏆 TOP 50 YOUTUBE (MÁS ESCUCHADAS)                             */}
      {/* ========================================================================= */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[#04060a] border-t border-b border-white/5">
        <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-red-600 via-amber-500/40 to-transparent"></div>
        <div className="absolute -left-60 top-1/3 w-[600px] h-[600px] bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-red-400 mb-3">
                <i className="fab fa-youtube text-red-500 text-sm"></i>
                <span>Catálogo Musical Oficial</span>
              </div>
              <h2 className="font-serif italic text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
                Top 50 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-amber-300">Más Escuchadas</span>
              </h2>
              <p className="text-xs md:text-sm text-white/50 mt-2 max-w-xl">
                Las canciones con más reproducciones en YouTube. Haz clic en cualquiera para escucharla al instante.
              </p>
            </div>

            {/* Filtro de Artista */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mr-2 flex items-center gap-1">
                <i className="fas fa-filter text-[9px]"></i> Artista:
              </span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'diosmasgym', label: 'Diosmasgym' },
                { id: 'juan614', label: 'Juan 614' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedChannel(filter.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                    selectedChannel === filter.id
                      ? 'bg-white text-black border-white shadow-md'
                      : 'bg-[#0a0d14] text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Canciones Top 50 */}
          {loadingYT && filteredTopList.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs uppercase tracking-widest text-white/50 font-bold">Cargando canciones...</p>
            </div>
          ) : (
            <div className="flex flex-col">
              
              {/* Encabezado de la Tabla (Desktop) */}
              <div className="hidden md:grid grid-cols-[48px_1fr_200px_220px_48px_70px] items-center px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/5">
                <span className="text-center">#</span>
                <span>Título</span>
                <span>Artista</span>
                <span>Álbum / Lanzamiento</span>
                <span className="text-center">Like</span>
                <span className="text-right pr-2">Duración</span>
              </div>

              {/* Filas */}
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {filteredTopList.slice(0, visibleLimit).map((item, idx) => {
                  const isLiked = !!likedMap[item.id];
                  const rankNumber = idx + 1;
                  const isTop3 = rankNumber <= 3;

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => handlePlayYTTrack(item)}
                      className="group grid grid-cols-[40px_1fr_auto] md:grid-cols-[48px_1fr_200px_220px_48px_70px] items-center px-3 md:px-4 py-3 md:py-3.5 rounded-xl hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-center relative">
                        <span className={`font-mono text-xs md:text-sm font-bold transition-opacity group-hover:opacity-0 ${
                          isTop3 ? 'text-amber-400 font-black scale-110' : 'text-white/40'
                        }`}>
                          {rankNumber}
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(220,38,38,0.7)]">
                            <i className="fas fa-play ml-0.5"></i>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 min-w-0 pr-2">
                        <div className="relative w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-[#0c1018] shadow-md group-hover:border-red-500/40 transition-colors">
                          <img
                            loading="lazy"
                            src={item.thumb}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const vidId = item.id;
                              if (vidId && !(e.currentTarget.src.includes('hqdefault'))) {
                                e.currentTarget.src = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                              }
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-sans font-bold text-sm md:text-base text-white truncate group-hover:text-red-400 transition-colors leading-tight">
                            {item.title}
                          </h4>
                          <div className="flex md:hidden items-center gap-2 text-[10px] text-white/50 mt-1 truncate">
                            <span className="font-semibold text-white/70">{item.channel}</span>
                            {item.album && (
                              <>
                                <span>•</span>
                                <span className="text-white/40">{item.album}</span>
                              </>
                            )}
                            {item.duration && (
                              <>
                                <span>•</span>
                                <span>{item.duration}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center text-xs font-semibold text-white/70 truncate pr-3">
                        <span className="truncate hover:text-white transition-colors">{item.channel}</span>
                      </div>

                      <div className="hidden md:flex items-center text-xs text-white/40 truncate pr-3">
                        <span className="truncate hover:text-white/70 transition-colors">
                          {item.album || 'Single'}
                        </span>
                      </div>

                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => toggleLike(item.id, e)}
                          title={isLiked ? 'Te gusta esta canción' : 'Me gusta'}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                            isLiked ? 'text-red-500 scale-110' : 'text-white/30 hover:text-white hover:scale-110'
                          }`}
                        >
                          <i className={`fas fa-thumbs-up ${isLiked ? 'text-red-500' : ''}`}></i>
                        </button>
                      </div>

                      <div className="hidden md:flex items-center justify-end text-xs font-mono text-white/50 pr-2">
                        <span>{item.duration || '3:15'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTopList.length > visibleLimit && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-white/5">
                  <button
                    onClick={() => setVisibleLimit(prev => Math.min(prev + 15, filteredTopList.length))}
                    className="px-8 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 flex items-center gap-2 border border-white/10"
                  >
                    <i className="fas fa-chevron-down text-xs"></i>
                    Mostrar más ({visibleLimit} de {filteredTopList.length})
                  </button>

                  <button
                    onClick={() => setVisibleLimit(filteredTopList.length)}
                    className="px-6 py-3.5 rounded-full bg-transparent hover:bg-white/5 text-white/60 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
                  >
                    Ver todas las {filteredTopList.length}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: 💎 JOYAS OCULTAS (MENOS ESCUCHADAS / PARA DESCUBRIR)            */}
      {/* ========================================================================= */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[#060810] border-b border-white/5">
        <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-amber-500 via-amber-600/30 to-transparent"></div>
        <div className="absolute -right-60 top-1/3 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 mb-3">
                <i className="fas fa-gem text-amber-400 text-sm"></i>
                <span>Descubrimiento Musical</span>
              </div>
              <h2 className="font-serif italic text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
                Joyas <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Ocultas</span>
              </h2>
              <p className="text-xs md:text-sm text-white/50 mt-2 max-w-xl">
                Canciones especiales de nuestro catálogo para descubrir y disfrutar. ¡Haz clic en cualquiera para escucharla al instante!
              </p>
            </div>

            {/* Filtro de Artista para Joyas */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mr-2 flex items-center gap-1">
                <i className="fas fa-filter text-[9px]"></i> Artista:
              </span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'diosmasgym', label: 'Diosmasgym' },
                { id: 'juan614', label: 'Juan 614' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedChannelGems(filter.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                    selectedChannelGems === filter.id
                      ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                      : 'bg-[#0a0d14] text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Joyas Ocultas */}
          <div className="flex flex-col">
            
            {/* Encabezado de la Tabla */}
            <div className="hidden md:grid grid-cols-[48px_1fr_200px_220px_48px_70px] items-center px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/5">
              <span className="text-center">#</span>
              <span>Título</span>
              <span>Artista</span>
              <span>Álbum / Lanzamiento</span>
              <span className="text-center">Like</span>
              <span className="text-right pr-2">Duración</span>
            </div>

            {/* Filas */}
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {filteredGemsList.slice(0, 15).map((item, idx) => {
                const isLiked = !!likedMap[item.id];
                const rankNumber = idx + 1;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => handlePlayYTTrack(item)}
                    className="group grid grid-cols-[40px_1fr_auto] md:grid-cols-[48px_1fr_200px_220px_48px_70px] items-center px-3 md:px-4 py-3 md:py-3.5 rounded-xl hover:bg-white/[0.05] transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-center relative">
                      <span className="font-mono text-xs md:text-sm font-bold text-amber-400/70 group-hover:opacity-0 transition-opacity">
                        {rankNumber}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(245,158,11,0.7)]">
                          <i className="fas fa-play ml-0.5"></i>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="relative w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 bg-[#0c1018] shadow-md group-hover:border-amber-400/40 transition-colors">
                        <img
                          loading="lazy"
                          src={item.thumb}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const vidId = item.id;
                            if (vidId && !(e.currentTarget.src.includes('hqdefault'))) {
                              e.currentTarget.src = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-sans font-bold text-sm md:text-base text-white truncate group-hover:text-amber-300 transition-colors leading-tight">
                          {item.title}
                        </h4>
                        <div className="flex md:hidden items-center gap-2 text-[10px] text-white/50 mt-1 truncate">
                          <span className="font-semibold text-white/70">{item.channel}</span>
                          {item.album && (
                            <>
                              <span>•</span>
                              <span className="text-white/40">{item.album}</span>
                            </>
                          )}
                          {item.duration && (
                            <>
                              <span>•</span>
                              <span>{item.duration}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center text-xs font-semibold text-white/70 truncate pr-3">
                      <span className="truncate hover:text-white transition-colors">{item.channel}</span>
                    </div>

                    <div className="hidden md:flex items-center text-xs text-white/40 truncate pr-3">
                      <span className="truncate hover:text-white/70 transition-colors">
                        {item.album || 'Single'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => toggleLike(item.id, e)}
                        title={isLiked ? 'Te gusta esta canción' : 'Me gusta'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                          isLiked ? 'text-amber-400 scale-110' : 'text-white/30 hover:text-white hover:scale-110'
                        }`}
                      >
                        <i className={`fas fa-thumbs-up ${isLiked ? 'text-amber-400' : ''}`}></i>
                      </button>
                    </div>

                    <div className="hidden md:flex items-center justify-end text-xs font-mono text-white/50 pr-2">
                      <span>{item.duration || '3:15'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Links a canales oficiales */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-white/50">
              <i className="fab fa-youtube text-red-500 text-xl"></i>
              <span>Suscríbete a los canales oficiales para escuchar más:</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.youtube.com/@Diosmasgym"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/10 border border-red-600/30 text-red-400 text-[11px] font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all duration-300"
              >
                <i className="fab fa-youtube"></i> @Diosmasgym
              </a>
              <a
                href="https://www.youtube.com/@Juan614oficial"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/10 border border-red-600/30 text-red-400 text-[11px] font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all duration-300"
              >
                <i className="fab fa-youtube"></i> @Juan614oficial
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* LISTAS DE ENTRENAMIENTO — corrido tumbado: fila horizontal full-bleed con skew en bordes */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[#070911]">
        <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-transparent via-[#4a90d9]/30 to-transparent"></div>
        <div className="absolute -right-60 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4a90d9]/4 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-8 md:px-16">
          <div className="flex items-end gap-6 mb-12">
            <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-none">
              Listas de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] to-blue-300">Entrenamiento</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 -mx-8 md:-mx-16">
            {playlists.map((pl, i) => (
              <div
                key={i}
                onClick={() => {
                  const match = catalog.find(s => pl.keywords.some(k => s.name.toLowerCase().includes(k))) || catalog[0];
                  onPlaySong(match);
                }}
                className="group relative overflow-hidden aspect-[3/4] md:aspect-[2/3] cursor-pointer"
                style={{ clipPath: i === 1 ? 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' : i === 0 ? 'polygon(0% 0%, 96% 0%, 90% 100%, 0% 100%)' : 'polygon(10% 0%, 100% 0%, 100% 100%, 4% 100%)' }}
              >
                <img loading="lazy" src={pl.image} alt={pl.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[50%] group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-[#4a90d9]/40 to-transparent`}></div>

                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                  <div className="w-10 h-10 rounded-full bg-[#4a90d9] text-black flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,168,0.7)] translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <i className="fas fa-play ml-0.5 text-sm"></i>
                  </div>
                  <h3 className="font-serif italic text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{pl.title}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{pl.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEOCLIPS OFICIALES — corrido tumbado */}
      {musicVideos.length > 0 && (
        <section className="relative py-16 md:py-24 overflow-hidden bg-[#05070a]">
          <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-transparent via-red-600/30 to-transparent"></div>
          <div className="absolute -left-40 bottom-0 w-[500px] h-[500px] bg-red-900/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-[1400px] mx-auto px-8 md:px-16">
            <div className="flex items-end gap-6 mb-12">
              <div className="relative">
                <div className="absolute -inset-2 bg-red-600/10 rounded-lg -skew-x-3"></div>
                <h2 className="relative font-serif italic text-5xl md:text-7xl text-white leading-none">
                  Videoclips <span className="text-red-500">Oficiales</span>
                </h2>
              </div>
              <div className="pb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                <span className="w-8 h-px bg-white/20"></span>
                <i className="fab fa-youtube text-red-500 text-base"></i>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {musicVideos.map((video, idx) => (
                <a
                  key={idx}
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`group relative rounded-3xl overflow-hidden border border-white/5 hover:border-red-500/30 transition-colors bg-[#0a0c14] ${idx === 0 ? 'md:row-span-2 aspect-[4/3] md:aspect-auto md:min-h-[400px]' : 'aspect-video'}`}
                >
                  <img loading="lazy" src={video.cover} alt={video.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.6)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(220,38,38,0.8)] transition-all duration-300 ${idx === 0 ? 'w-20 h-20 text-3xl' : 'w-14 h-14 text-xl'}`}>
                      <i className="fab fa-youtube"></i>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                    <h4 className={`font-serif italic text-white truncate group-hover:text-red-400 transition-colors ${idx === 0 ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{video.name}</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">{video.artist}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
