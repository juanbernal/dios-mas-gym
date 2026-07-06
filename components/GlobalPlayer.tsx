import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MusicItem } from '../types';

interface GlobalPlayerProps {
  activeSong: MusicItem | null;
  onClear: () => void;
}

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ activeSong, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevSongRef = useRef<string>('');

  const getVideoId = (url: string) => {
    try {
      if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
      return null;
    } catch { return null; }
  };

  const videoId = getVideoId(activeSong?.url || '');
  const isJuan = activeSong?.artist.toLowerCase().includes('juan') || false;

  const visualizerBars = useMemo(() =>
    [...Array(16)].map((_, i) => ({
      delay: `${(i % 5) * 0.15 + (i * 0.037) % 0.2}s`,
      duration: `${0.5 + (i * 0.031) % 0.5}s`
    })),
  []);

  useEffect(() => {
    const songKey = activeSong?.id || '';
    if (songKey !== prevSongRef.current) {
      setIsPlaying(true);
      prevSongRef.current = songKey;
      
      // Track song play
      if (typeof window !== 'undefined' && (window as any).gtag && activeSong) {
        (window as any).gtag('event', 'play_song', {
          song_title: activeSong.name,
          song_artist: activeSong.artist
        });
      }
    }
  }, [activeSong?.id, activeSong]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    try {
      const player = document.getElementById('yt-player-iframe') as HTMLIFrameElement;
      if (player?.contentWindow) {
        player.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: nextState ? 'playVideo' : 'pauseVideo' }),
          '*'
        );
      }
    } catch {}
    
    if (nextState && typeof window !== 'undefined' && (window as any).gtag && activeSong) {
        (window as any).gtag('event', 'play_song', {
            song_title: activeSong.name,
            song_artist: activeSong.artist
        });
    }
  };

  if (!activeSong) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[3000] p-3 md:p-5 transition-transform duration-500 ${isMinimized ? 'translate-y-[calc(100%-10px)]' : 'translate-y-0'}`}>
      <div className="max-w-5xl mx-auto bg-[#0f111a]/95 backdrop-blur-2xl border border-[#c5a059]/20 rounded-[1.75rem] shadow-[0_-25px_80px_rgba(0,0,0,0.55)] overflow-hidden relative">
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-r ${isJuan ? 'from-[#8B5A2B]/30' : 'from-[#c5a059]/30'} via-transparent to-transparent`}></div>
        
        <div className="relative z-10 h-2 bg-white/5 cursor-pointer hover:bg-[#c5a059]/40 transition-colors" onClick={() => setIsMinimized(!isMinimized)}></div>

        <div className="relative z-10 p-4 md:p-6 flex items-center justify-between gap-4 md:gap-6">
          <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
            {videoId && (
              <iframe 
                ref={iframeRef}
                id="yt-player-iframe"
                width="1" height="1" 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&controls=0&enablejsapi=1`}
                title="Audio Player"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            )}
          </div>

          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] relative group cursor-pointer" onClick={togglePlay}>
              <img src={activeSong.cover} alt={activeSong.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
              <div className="absolute inset-0 bg-[#c5a059]/20 mix-blend-overlay"></div>
              <div className="absolute inset-0 flex items-center justify-center transition-all group-hover:scale-110">
                <div className="w-8 h-8 rounded-full bg-[#c5a059] text-black flex items-center justify-center shadow-lg">
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-[10px] ${isPlaying ? '' : 'ml-0.5'}`}></i>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-8">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/25 mb-1">Reproduciendo ahora</p>
                <h5 className="text-[#c5a059] font-serif text-lg md:text-2xl font-bold truncate tracking-tight">{activeSong.name}</h5>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mt-1">{activeSong.artist}</p>
              </div>

              <div className="hidden sm:flex items-end gap-[3px] h-6 opacity-70">
                <style>{`
                  @keyframes bounceBar {
                    0%, 100% { transform: scaleY(0.2); }
                    50% { transform: scaleY(1); }
                  }
                  .visualizer-bar {
                    transform-origin: bottom;
                    animation: bounceBar infinite ease-in-out;
                  }
                `}</style>
                {visualizerBars.map((bar, i) => (
                  <div 
                    key={i} 
                    className="w-[3px] h-full bg-gradient-to-t from-[#c5a059]/20 to-[#c5a059] rounded-t-sm visualizer-bar"
                    style={{
                      animationDelay: bar.delay,
                      animationDuration: bar.duration,
                      animationPlayState: isPlaying ? 'running' : 'paused'
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-[#c5a059]/20 hover:text-[#c5a059] transition-all border border-white/10"
                title={isPlaying ? 'Pausar' : 'Reproducir'}
             >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${isPlaying ? '' : 'ml-0.5'}`}></i>
             </button>
             <a 
                href={isJuan ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/'}
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

        <div className="relative z-10 h-1 bg-white/5 overflow-hidden">
           <div 
              className="absolute inset-0 bg-gradient-to-r from-[#c5a059] to-[#c5a059]/30"
              style={{
                animation: isPlaying ? 'progressBar 30s linear' : 'none',
                width: isPlaying ? '100%' : '0%',
                transition: 'width 0.3s'
              }}
           ></div>
           <style>{`@keyframes progressBar { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;
