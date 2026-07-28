import React, { useState, useEffect, useMemo } from 'react';
import { MusicItem } from '../types';

interface HomeMusicSectionsProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
  onNavigateReflexiones: () => void;
}

export const HomeMusicSections: React.FC<HomeMusicSectionsProps> = ({ catalog, onPlaySong, onNavigateReflexiones }) => {
  if (!catalog || catalog.length === 0) return null;

  // 1. Featured Release (Latest)
  const featured = catalog[0];

  const [topAnalytics, setTopAnalytics] = useState<string[]>([]);
  
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
    fetchTop();
  }, []);

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
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop",
      keywords: ["gym", "fuerza", "poder", "entrenar"]
    },
    {
      title: "Adoración y Fe",
      description: "Momentos de intimidad y fortaleza espiritual.",
      image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2070&auto=format&fit=crop",
      keywords: ["dios", "luz", "paz", "salvacion"]
    },
    {
      title: "Combate Espiritual",
      description: "Para cuando la batalla arrecia y necesitas fe.",
      image: "https://images.unsplash.com/photo-1525268323446-0b8d28e75e11?q=80&w=2070&auto=format&fit=crop",
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

      {/* REFLEXIONES BANNER — corrido tumbado: diagonal dividers + texto grande */}
      <section
        className="relative py-20 md:py-32 overflow-hidden cursor-pointer group"
        style={{ background: 'linear-gradient(135deg, #060810 0%, #0a0e1a 50%, #05070a 100%)' }}
        onClick={onNavigateReflexiones}
      >
        {/* Líneas diagonales decorativas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(74,144,217,0.03) 60px, rgba(74,144,217,0.03) 61px)' }}></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4a90d9]/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4a90d9]/20 to-transparent"></div>

        {/* Glows */}
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 bg-[#4a90d9]/10 rounded-full blur-3xl group-hover:bg-[#4a90d9]/20 transition-all duration-700 pointer-events-none"></div>
        <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          <div className="flex-1">
            <span className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-white/50 mb-8 group-hover:border-[#4a90d9]/40 group-hover:text-[#4a90d9]/70 transition-all">
              ✦ Material Espiritual ✦
            </span>
            <h2 className="font-serif italic text-5xl md:text-7xl lg:text-8xl text-white mb-6 leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[#4a90d9] transition-all duration-700">
              El Arsenal de<br /><span className="text-[#4a90d9]">Reflexiones</span>
            </h2>
            <p className="text-white/30 text-sm md:text-base max-w-xl font-bold tracking-wide leading-relaxed group-hover:text-white/50 transition-colors">
              Artículos, meditaciones y enseñanzas para fortalecer tu espíritu tanto como tu cuerpo. Explora el contenido y encuentra tu inspiración diaria.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#4a90d9]/10 rounded-full blur-xl group-hover:bg-[#4a90d9]/20 transition-all duration-500"></div>
              <button className="relative px-12 py-6 rounded-full border-2 border-[#4a90d9]/50 text-[#4a90d9] text-[11px] font-black uppercase tracking-[0.4em] group-hover:bg-[#4a90d9] group-hover:text-black group-hover:border-[#4a90d9] transition-all duration-300 group-hover:shadow-[0_0_50px_rgba(37,99,168,0.4)]">
                Leer Reflexiones <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
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

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
