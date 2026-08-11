import React, { useState, useEffect, useMemo } from 'react';
import { MusicItem } from '../types';

interface HomeMusicSectionsProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

interface YTVideo {
  id: string;
  title: string;
  thumb: string;
  url: string;
  views?: number;
  viewsFormatted?: string;
  channel: string;
  handle?: string;
}

export const HomeMusicSections: React.FC<HomeMusicSectionsProps> = ({ catalog, onPlaySong }) => {
  if (!catalog || catalog.length === 0) return null;

  // 1. Featured Release (Latest)
  const featured = catalog[0];

  const [topAnalytics, setTopAnalytics] = useState<string[]>([]);
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([]);
  
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
      try {
        const res = await fetch('/api/youtube-top');
        if (res.ok) {
          const data = await res.json();
          if (data.videos?.length > 0) {
            setYtVideos(data.videos);
            return;
          }
        }
      } catch (e) {
        console.warn('YouTube API failed, falling back to catalog', e);
      }
      // Fallback: use catalog videos with YouTube links
      const catalogYT = catalog
        .filter(s => s.url && s.url.includes('youtube'))
        .slice(0, 8)
        .map(s => {
          const urlMatch = s.url?.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
          const vid = urlMatch?.[1] || '';
          return {
            id: vid || s.id,
            title: s.name,
            thumb: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : (s.cover || ''),
            url: s.url || '',
            channel: s.artist || 'Dios Mas Gym',
            handle: '@diosmasgym',
            views: 0,
            viewsFormatted: '',
          } as YTVideo;
        })
        .filter(v => v.url);
      setYtVideos(catalogYT);
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

      {/* TOP DE LA SEMANA — estilo corrido tumbado: lista numerada horizontal con barra lateral inclinada */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[#05070a]">
        {/* Barra decorativa inclinada */}
        <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-[#4a90d9] via-[#4a90d9]/40 to-transparent"></div>
        <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#4a90d9]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-8 md:px-16">
          {/* Header inclinado */}
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

          {/* Lista horizontal scrollable estilo ranking */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
            {topDeLaSemana.map((song, i) => (
              <div
                key={song.id || song.name || i}
                onClick={() => onPlaySong(song)}
                className="group snap-start flex-shrink-0 w-[200px] md:w-[220px] cursor-pointer"
              >
                {/* Número grande superpuesto */}
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
                    {/* Rank badge */}
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

          {/* Tarjetas grandes inclinadas */}
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


      {/* VIDEOCLIPS OFICIALES — corrido tumbado: grid con tarjetas superpuestas y play centrado grande */}
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


      {/* MÁS VISTO EN YOUTUBE — carrusel horizontal con thumbnails reales */}
      {ytVideos.length > 0 && (
        <section className="relative py-16 md:py-24 overflow-hidden bg-[#060810] border-t border-white/5">
          {/* Línea roja lateral */}
          <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-b from-red-600/50 via-red-600/20 to-transparent"></div>
          <div className="absolute -right-60 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/8 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-[1400px] mx-auto px-8 md:px-16">
            {/* Header */}
            <div className="flex items-end justify-between gap-6 mb-10">
              <div className="flex items-end gap-5">
                <div className="relative">
                  <div className="absolute -inset-2 bg-red-700/15 rounded-lg skew-x-3"></div>
                  <h2 className="relative font-serif italic text-5xl md:text-7xl text-white leading-none">
                    Más Visto en <span className="text-red-500">YouTube</span>
                  </h2>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 pb-2">
                <a
                  href="https://www.youtube.com/@Diosmasgym"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600/10 border border-red-600/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300"
                >
                  <i className="fab fa-youtube text-sm"></i> @Diosmasgym
                </a>
                <a
                  href="https://www.youtube.com/@Juan614oficial"
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600/10 border border-red-600/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300"
                >
                  <i className="fab fa-youtube text-sm"></i> @Juan614
                </a>
              </div>
            </div>

            {/* Carrusel horizontal */}
            <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
              {ytVideos.map((vid, idx) => (
                <a
                  key={vid.id}
                  href={vid.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group snap-start flex-shrink-0 w-[280px] md:w-[320px] cursor-pointer"
                >
                  {/* Thumbnail 16:9 */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 group-hover:border-red-500/40 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.5)] mb-3">
                    <img
                      loading="lazy"
                      src={vid.thumb}
                      alt={vid.title}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                      onError={(e) => {
                        // Fallback to hqdefault if maxresdefault fails
                        const vidId = vid.url?.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
                        if (vidId && !(e.currentTarget.src.includes('hqdefault'))) {
                          e.currentTarget.src = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center text-lg shadow-[0_0_30px_rgba(220,38,38,0.6)] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                        <i className="fas fa-play ml-0.5"></i>
                      </div>
                    </div>
                    {/* Position number */}
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-white font-black text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </div>
                    {/* Views badge */}
                    {vid.viewsFormatted && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[8px] font-black tracking-widest text-white/80 flex items-center gap-1">
                          <i className="fas fa-eye text-[7px]"></i> {vid.viewsFormatted}
                        </span>
                      </div>
                    )}
                    {/* Channel badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-red-600/80 backdrop-blur-sm text-[8px] font-black uppercase tracking-widest text-white">
                        <i className="fab fa-youtube mr-1"></i>YT
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <h4 className="font-serif italic text-base md:text-lg text-white line-clamp-2 group-hover:text-red-400 transition-colors leading-snug">{vid.title}</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-1">{vid.channel}</p>
                </a>
              ))}
            </div>

            {/* Botones suscripción mobile */}
            <div className="flex md:hidden items-center justify-center gap-4 mt-8">
              <a href="https://www.youtube.com/@Diosmasgym" target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                <i className="fab fa-youtube"></i> @Diosmasgym
              </a>
              <a href="https://www.youtube.com/@Juan614oficial" target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600/20 border border-red-600/40 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                <i className="fab fa-youtube"></i> @Juan614
              </a>
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
