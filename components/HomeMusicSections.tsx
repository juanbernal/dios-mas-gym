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
          // Combinar ambas listas, dando prioridad a las reproducciones, y quitar duplicados
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
      const matched = topAnalytics.map(t => catalog.find(c => c.name.toLowerCase() === t.toLowerCase())).filter(Boolean) as MusicItem[];
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
    <div className="flex flex-col gap-12 md:gap-24 mb-24">
      
      {/* FEATURED RELEASE */}
      <section className="relative w-full overflow-hidden rounded-3xl mx-auto max-w-[1400px] border border-white/10 group mt-12 px-4 md:px-0">
        <div className="absolute inset-0">
          <img loading="lazy" src={featured.cover} alt="Background" className="w-full h-full object-cover blur-3xl opacity-30 group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070a] via-[#05070a]/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-8 md:p-16 flex flex-col md:flex-row items-center gap-10 md:gap-20">
          <div className="w-64 h-64 md:w-96 md:h-96 flex-shrink-0 relative cursor-pointer" onClick={() => onPlaySong(featured)}>
            <div className="absolute inset-0 bg-[#c5a059] blur-[100px] opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
            <img 
              src={featured.cover} 
              alt={featured.name} 
              className="w-full h-full object-cover rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-2 group-hover:rotate-0 transition-transform duration-500 border border-white/10 relative z-10"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <div className="w-20 h-20 bg-[#c5a059] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(197,160,89,0.8)]">
                <i className="fas fa-play text-black text-2xl ml-2"></i>
              </div>
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <span className="inline-block py-2 px-6 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 text-[9px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 shadow-[0_0_20px_rgba(197,160,89,0.1)]">
              Destacado
            </span>
            <h2 className="font-serif italic text-5xl md:text-7xl mb-4 text-white drop-shadow-lg">{featured.name}</h2>
            <p className="text-xl font-black uppercase tracking-[0.3em] text-white/50 mb-10">{featured.artist}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <button 
                onClick={() => onPlaySong(featured)}
                className="px-10 py-5 rounded-full bg-[#c5a059] text-black text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(197,160,89,0.3)]"
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

      {/* TOP DE LA SEMANA */}
      <section className="py-12 section-container">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="font-serif italic text-4xl text-[#c5a059]">Top de la Semana</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-[#c5a059]/20 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {topDeLaSemana.map((song, i) => (
            <div key={song.id || song.name || i} className="group bg-[#0f111a] border border-white/5 rounded-2xl p-4 hover:border-[#c5a059]/40 transition-colors cursor-pointer flex flex-col" onClick={() => onPlaySong(song)}>
              <div className="relative aspect-square rounded-xl overflow-hidden mb-4 border border-white/5">
                <img loading="lazy" src={song.cover} alt={song.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#c5a059] text-black font-black text-[10px] flex items-center justify-center shadow-lg">
                  {i + 1}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="w-10 h-10 rounded-full bg-[#c5a059] flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.5)]">
                    <i className="fas fa-play text-black ml-1"></i>
                  </div>
                </div>
              </div>
              <h4 className="font-serif text-lg text-white mb-1 truncate group-hover:text-[#c5a059] transition-colors">{song.name}</h4>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">{song.artist}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLAYLISTS OFICIALES */}
      <section className="py-12 section-container">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
          <h2 className="font-serif italic text-4xl text-white">Listas de Entrenamiento</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {playlists.map((pl, i) => (
            <div key={i} className="group relative overflow-hidden rounded-[2rem] border border-white/5 aspect-[4/3] cursor-pointer" onClick={() => {
              const match = catalog.find(s => pl.keywords.some(k => s.name.toLowerCase().includes(k))) || catalog[0];
              onPlaySong(match);
            }}>
              <img loading="lazy" src={pl.image} alt={pl.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="w-12 h-12 rounded-full bg-[#c5a059] text-black flex items-center justify-center mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_20px_rgba(197,160,89,0.5)]">
                  <i className="fas fa-play ml-1"></i>
                </div>
                <h3 className="font-serif text-3xl font-bold text-white mb-2">{pl.title}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{pl.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REFLEXIONES BANNER */}
      <section className="my-12 px-4 md:px-0">
        <div className="relative rounded-[3rem] overflow-hidden border border-[#c5a059]/30 bg-[#0a0c14] group max-w-[1200px] mx-auto cursor-pointer" onClick={onNavigateReflexiones}>
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#c5a059]/10 blur-md rounded-full -translate-y-1/2"></div>
            <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/10 blur-md rounded-full -translate-y-1/2"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 md:p-20 text-center md:text-left gap-10">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full border border-white/20 bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-white/70 mb-6 group-hover:border-[#c5a059]/50 transition-colors">
                Material Espiritual
              </span>
              <h2 className="font-serif italic text-4xl md:text-6xl text-white mb-4 group-hover:text-[#c5a059] transition-colors">El Arsenal de Reflexiones</h2>
              <p className="text-white/40 text-sm md:text-base max-w-xl font-bold tracking-wide">
                Artículos, meditaciones y enseñanzas para fortalecer tu espíritu tanto como tu cuerpo. Explora nuestro contenido completo y encuentra tu inspiración diaria.
              </p>
            </div>
            
            <button 
              className="flex-shrink-0 px-10 py-5 rounded-full border-2 border-[#c5a059] text-[#c5a059] text-[10px] font-black uppercase tracking-[0.3em] group-hover:bg-[#c5a059] group-hover:text-black transition-all group-hover:shadow-[0_0_40px_rgba(197,160,89,0.3)]"
            >
              Leer Reflexiones <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
      </section>

      {/* MUSIC VIDEOS */}
      {musicVideos.length > 0 && (
        <section className="py-12 section-container">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="font-serif italic text-4xl text-[#c5a059]">Videoclips Oficiales</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[#c5a059]/20 to-transparent"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {musicVideos.map((video, idx) => (
              <a 
                key={idx} 
                href={video.url} 
                target="_blank" 
                rel="noreferrer"
                className="group relative rounded-2xl overflow-hidden border border-white/10 aspect-video bg-[#0a0c14]"
              >
                <img loading="lazy" src={video.cover} alt={video.name} className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-40 transition-all duration-700" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center text-xl shadow-[0_0_30px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform">
                    <i className="fab fa-youtube"></i>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                  <h4 className="font-bold text-white text-sm truncate">{video.name}</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50">{video.artist}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
