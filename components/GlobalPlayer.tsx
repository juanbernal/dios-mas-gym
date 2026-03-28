import React, { useEffect, useState } from 'react';
import { MusicItem } from '../types';

interface GlobalPlayerProps {
  activeSong: MusicItem | null;
  onClear: () => void;
}

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ activeSong, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!activeSong) return null;

  // Extract YouTube ID
  const getVideoId = (url: string) => {
    try {
      if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
      return null;
    } catch (e) {
      return null;
    }
  };

  const videoId = getVideoId(activeSong.url);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[3000] p-4 transition-transform duration-500 ${isMinimized ? 'translate-y-[calc(100%-10px)]' : 'translate-y-0'}`}>
      <div className="max-w-5xl mx-auto bg-[#0f111a]/95 backdrop-blur-2xl border border-white/10 rounded-t-xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Toggle Bar */}
        <div className="h-1 bg-white/5 cursor-pointer hover:bg-[#c5a059]/40 transition-colors" onClick={() => setIsMinimized(!isMinimized)}></div>

        <div className="p-4 md:p-6 flex items-center justify-between gap-6">
          {/* Hidden YouTube Iframe (Audio only) */}
          <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
            {videoId && (
              <iframe 
                width="1" height="1" 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&controls=0`}
                title="Audio Player"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            )}
          </div>

          <div className="flex items-center gap-6 flex-1 min-w-0">
            {/* Cover Small */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
              <img src={activeSong.cover} alt={activeSong.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-[#c5a059] font-serif text-lg font-bold truncate tracking-tight">{activeSong.name}</h5>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">{activeSong.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Link to Official Site */}
             <a 
                href={activeSong.artist.toLowerCase().includes('juan') ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#c5a059] hover:text-black transition-all"
             >
                Ver más de {activeSong.artist}
             </a>

             <button 
                onClick={onClear}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"
             >
                <i className="fas fa-times"></i>
             </button>
          </div>
        </div>

        {/* Playback Simulation Bar (Visual only) */}
        <div className="h-1 bg-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-[#c5a059] to-[#c5a059]/30 animate-progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;
