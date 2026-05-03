import React from 'react';
import { MusicItem } from '../types';

interface MusicCardProps {
  item: MusicItem;
  onPlay: () => void;
}

const MusicCard: React.FC<MusicCardProps> = ({ item, onPlay }) => {
  const isJuan = item.artist.toLowerCase().includes('juan');
  const artistUrl = isJuan ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/';
  const accent = isJuan ? '#8B5A2B' : '#c5a059';

  return (
    <div className="group relative bg-[#0f111a]/80 border border-white/5 rounded-[1.75rem] p-4 hover:border-[#c5a059]/40 transition-all duration-500 overflow-hidden gold-border-glow">
      <div className="absolute -top-24 -right-24 w-56 h-56 blur-[90px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${accent}22` }}></div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c5a059]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex gap-5 md:gap-6 items-center">
        <div 
          className="relative w-28 h-28 md:w-32 md:h-32 flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-700 cursor-pointer rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          onClick={onPlay}
        >
          <img 
            src={item.cover} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/25 transition-colors"></div>
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(197,160,89,0.5)]">
              <i className="fas fa-play text-black text-xs ml-0.5"></i>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/15 text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059]">
               {item.type || 'Single'}
              </span>
              {item.date && (
                 <span className="text-[8px] font-black uppercase tracking-widest text-white/25">
                   {new Date(item.date).getFullYear()}
                 </span>
              )}
          </div>
          
          <h4 className="font-serif text-2xl font-bold text-white/95 truncate group-hover:text-[#c5a059] transition-colors leading-tight">
            {item.name}
          </h4>
          
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
            {item.artist}
          </p>
          
          <div className="flex gap-4 mt-5">
            <button 
              onClick={onPlay}
              className="px-4 py-2 rounded-full bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-white transition-colors"
            >
              <i className="fas fa-play text-[10px]"></i>
              Play
            </button>
            
            <a 
              href={artistUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/20 text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:text-[#c5a059] transition-colors ml-auto"
            >
              Ver más
              <i className="fas fa-external-link-alt text-[8px]"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicCard;
