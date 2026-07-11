import React from 'react';
import MusicCard from './MusicCard';
import { MusicItem } from '../types';

interface MusicSectionProps {
  artist: string;
  catalog: MusicItem[];
  onPlay: (song: MusicItem) => void;
  randomSong?: MusicItem | null;
}

const MusicSection: React.FC<MusicSectionProps> = ({ artist, catalog, onPlay, randomSong }) => {
  const isDios = artist === 'diosmasgym';
  const description = isDios 
    ? "Urbano cristiano, disciplina y fe en movimiento" 
    : "Corridos, banda sinaloense y calle con propósito";
  const artistLogo = isDios ? '/logo-diosmasgym.png' : '/logo-juan614-v2.jpg';
  const artistUrl = isDios ? 'https://musica.diosmasgym.com/' : 'https://juan614.diosmasgym.com/';

  return (
    <section className={`py-28 md:py-36 relative overflow-hidden transition-all duration-1000 ${isDios ? 'bg-[#05070a] border-y border-[#4a90d9]/10' : 'bg-[#0a0c14]'}`}>
      <div className={`absolute top-0 ${isDios ? 'right-0' : 'left-0'} w-[720px] h-[720px] ${isDios ? 'bg-[#4a90d9]/8' : 'bg-[#1e4a7a]/12'} blur-[130px] rounded-full -translate-y-1/2 opacity-70`}></div>
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(115deg,#fff_1px,transparent_1px)] bg-[size:36px_36px]"></div>
      
      <div className="section-container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-end mb-16">
          <div className="lg:col-span-8 flex items-center gap-6 md:gap-8 group">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-[2rem] overflow-hidden border border-[#4a90d9]/30 shadow-[0_30px_80px_rgba(0,0,0,0.45)] group-hover:rotate-2 transition-transform duration-700">
              <img src={artistLogo} alt={artist} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.6em] text-[#4a90d9] mb-3">Catálogo oficial</p>
              <h2 className="font-serif italic text-5xl md:text-8xl capitalize mb-3 group-hover:tracking-wide transition-all duration-700">
                {artist}
              </h2>
              <p className="text-white/45 text-xs md:text-sm font-bold uppercase tracking-[0.25em] max-w-xl leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          
          <div className="lg:col-span-4 grid gap-4">
            {randomSong && ( 
            <div className="bg-[#4a90d9]/8 border border-[#4a90d9]/15 p-6 rounded-[1.5rem] w-full backdrop-blur-sm hover:border-[#4a90d9]/40 transition-all duration-500 group gold-border-glow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-1 h-8 bg-[#4a90d9]"></div>
                <h5 className="font-serif text-xl font-bold truncate text-white/90 group-hover:text-[#4a90d9] transition-colors">{randomSong.name}</h5>
              </div>
              <button 
                onClick={() => onPlay(randomSong)} 
                className="relative overflow-hidden inline-block w-full py-4 bg-[#4a90d9] text-black text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl"
              >
                <span className="relative z-10">Reproducir Sugerencia</span>
              </button>
            </div> 
            )}
            <a href={artistUrl} target="_blank" rel="noreferrer" className="text-center py-4 rounded-full border border-white/10 bg-white/[0.03] text-[9px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-black hover:bg-[#4a90d9] transition-all">Ver página del artista</a>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {catalog.slice(0, 6).map((item, idx) => (
            <div 
              key={item.id} 
              className="col-span-12 md:col-span-6 lg:col-span-4 transition-all duration-700 hover:-translate-y-2"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <MusicCard item={item} onPlay={() => onPlay(item)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MusicSection;
