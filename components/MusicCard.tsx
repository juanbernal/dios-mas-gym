import React from 'react';
import { MusicItem } from '../types';

interface MusicCardProps {
  item: MusicItem;
  onPlay: () => void;
}

const MusicCard: React.FC<MusicCardProps> = ({ item, onPlay }) => {
  const isJuan = item.artist.toLowerCase().includes('juan');
  const artistUrl = isJuan ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/';

  return (
    <div className="group relative bg-[#0f111a] border border-white/5 rounded-sm p-4 hover:border-[#c5a059]/30 transition-all duration-500 overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c5a059]/5 blur-[100px] group-hover:bg-[#c5a059]/10 transition-colors"></div>
      
      <div className="flex gap-6 items-center">
        {/* Cover Image */}
        <div 
          className="relative w-24 h-24 flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-700 cursor-pointer"
          onClick={onPlay}
        >
          <img 
            src={item.cover} 
            alt={item.name} 
            className="w-full h-full object-cover rounded-sm"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
          
          {/* Play Icon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 bg-[#c5a059] rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-play text-black text-[10px] ml-0.5"></i>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059]/60">
              {item.type || 'Single'}
             </span>
             {item.date && (
                <span className="text-[8px] font-medium text-white/20">
                  • {new Date(item.date).getFullYear()}
                </span>
             )}
          </div>
          
          <h4 className="font-serif text-lg font-bold text-white/90 truncate group-hover:text-[#c5a059] transition-colors leading-tight">
            {item.name}
          </h4>
          
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
            {item.artist}
          </p>
          
          <div className="flex gap-4 mt-3">
            <button 
              onClick={onPlay}
              className="text-[#c5a059] text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:text-white transition-colors"
            >
              <i className="fas fa-play text-[10px]"></i>
              Reproducir
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
