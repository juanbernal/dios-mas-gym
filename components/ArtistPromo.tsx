import React from 'react';
import { MusicItem } from '../types';

interface ArtistPromoProps {
  artist: 'diosmasgym' | 'juan614';
  mode?: 'full' | 'social';
  musicCatalog?: MusicItem[];
  onPlaySong?: (song: MusicItem) => void;
}

const ArtistPromo: React.FC<ArtistPromoProps> = ({ 
  artist, 
  mode = 'full', 
  musicCatalog = [], 
  onPlaySong 
}) => {
  const isDios = artist === 'diosmasgym';
  const name = isDios ? 'Diosmasgym' : 'Juan 614';
  const genre = isDios ? 'Música Urbana' : 'Corridos Tumbados';
  const url = isDios ? 'https://musica.diosmasgym.com/' : 'https://juan614.diosmasgym.com/';
  
  const socialLinks = isDios ? {
    youtube: 'https://www.youtube.com/@DiosmasgymRecords',
    instagram: 'https://www.instagram.com/diosmasgym/'
  } : {
    youtube: 'https://www.youtube.com/@Juan614',
    instagram: 'https://www.instagram.com/juan614_oficial/'
  };

  // Pick a random song from the catalog for recommendation
  const recommendedSong = musicCatalog.length > 0 
    ? musicCatalog[Math.floor(Math.random() * musicCatalog.length)] 
    : null;

  return (
    <div className="my-24 p-8 md:p-16 bg-[#0a0c14] border border-[#c5a059]/10 rounded-xl relative overflow-hidden group shadow-2xl">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none transition-transform duration-1000 group-hover:rotate-12 translate-x-1/4 -translate-y-1/4">
        <div className="text-[240px] font-black">{isDios ? 'URBAN' : 'BELICO'}</div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
        {/* Left Side: Info & Socials */}
        <div className="text-center lg:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-6">
             <span className="px-4 py-1 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-widest rounded-full">
               {genre}
             </span>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{mode === 'social' ? 'Sigue al Artista' : 'Promoción Oficial'}</span>
          </div>

          <h3 className="font-serif italic text-5xl md:text-7xl text-white mb-8 leading-tight">
            {mode === 'social' ? `Únete a la familia de` : `Escucha a`} <br /> <span className="text-[#c5a059]">{name}</span>
          </h3>
          
          <div className="flex items-center justify-center lg:justify-start gap-6 mb-12">
             <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-red-500 hover:border-red-500/30 transition-all hover:scale-110">
                <i className="fab fa-youtube text-xl"></i>
             </a>
             <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-pink-500 hover:border-pink-500/30 transition-all hover:scale-110">
                <i className="fab fa-instagram text-xl"></i>
             </a>
          </div>

          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-12 py-5 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.4em] hover:bg-white transition-all transform hover:scale-105 shadow-[0_20px_40px_rgba(197,160,89,0.2)] rounded-full"
          >
            Portal de {name}
          </a>
        </div>
        
        {/* Right Side: Recommendation */}
        {mode === 'full' && (
        <div className="w-full lg:w-96">
           {recommendedSong ? (
             <div className="bg-white/5 border border-white/10 p-8 rounded-2xl relative group/card">
                <div className="absolute -top-4 -left-4 px-4 py-2 bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-widest shadow-xl">
                   Recomendación
                </div>
                
                <div className="flex flex-col items-center">
                   <div className="w-32 h-32 rounded-xl overflow-hidden mb-6 shadow-2xl relative group/img">
                      <img src={recommendedSong.cover} alt={recommendedSong.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                         <button 
                            onClick={() => onPlaySong?.(recommendedSong)}
                            className="w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center transform scale-75 group-hover/img:scale-100 transition-transform"
                         >
                            <i className="fas fa-play text-black"></i>
                         </button>
                      </div>
                   </div>
                   
                   <h4 className="font-serif text-xl font-bold text-white text-center mb-1 group-hover/card:text-[#c5a059] transition-colors">{recommendedSong.name}</h4>
                   <p className="text-[10px] text-white/40 uppercase tracking-widest mb-6">Escucha esta canción ahora</p>
                   
                   <button 
                      onClick={() => onPlaySong?.(recommendedSong)}
                      className="w-full py-4 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all"
                   >
                      Reproducir en el Hub
                   </button>
                </div>
             </div>
           ) : (
             <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-[#c5a059]/20 to-transparent border border-[#c5a059]/10 rounded-full flex items-center justify-center relative mx-auto">
                <div className="absolute inset-4 border border-white/5 rounded-full animate-spin-slow"></div>
                <i className={`fas ${isDios ? 'fa-headphones' : 'fa-music'} text-5xl text-[#c5a059]`}></i>
             </div>
           )}
        </div>
        )}
      </div>
    </div>
  );
};

export default ArtistPromo;
