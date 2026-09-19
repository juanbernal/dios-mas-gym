import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MusicItem } from '../types';
import { useDominantColor } from '../hooks/useDominantColor';

interface GlobalPlayerProps {
  activeSong: MusicItem | null;
  onClear: () => void;
}

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ activeSong, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const initedRef = useRef<boolean>(false);
  const prevSongRef = useRef<string>('');

  const getVideoId = (url: string) => {
    try {
      const match = url.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
      if (match) return match[1];
      if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
      return null;
    } catch { return null; }
  };

  const videoId = getVideoId(activeSong?.url || '');
  const isJuan = activeSong?.artist.toLowerCase().includes('juan') || false;
  const accent = useDominantColor(activeSong?.cover);

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
      setElapsed(0);
      prevSongRef.current = songKey;
      // La reproduccion se cuenta en App.tsx (una vez por cancion, respetando el filtro de administrador)
    }

    if (!videoId || !containerRef.current) return;

    const tryInit = () => {
        if (!containerRef.current || initedRef.current) return;
        initedRef.current = true;
        try {
            const targetDiv = document.createElement('div');
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(targetDiv);

            playerRef.current = new window.YT.Player(targetDiv, {
                height: '200',
                width: '200',
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (event: any) => {
                        event.target.playVideo();
                        setIsPlaying(true);
                    },
                    onStateChange: (event: any) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        } catch (e) {
            console.error('YT Init error:', e);
            initedRef.current = false;
        }
    };

    if (window.YT && window.YT.Player) {
        tryInit();
    } else {
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }
        const prevCb = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (typeof prevCb === 'function') prevCb();
            tryInit();
        };
    }

    return () => {
        if (playerRef.current) {
            try { playerRef.current.destroy(); } catch (_) {}
            playerRef.current = null;
        }
        initedRef.current = false;
    };
  }, [videoId, activeSong?.id]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
        interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime();
                const sinceStart = time - startTime;
                setElapsed(Math.max(0, Math.min(60, sinceStart)));
                if (sinceStart >= 60) {
                    playerRef.current.pauseVideo();
                    playerRef.current.seekTo(startTime);
                    setIsPlaying(false);
                }
            }
        }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startTime]);

  // Escape cierra la pantalla completa
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    const nextState = !isPlaying;
    try {
        if (nextState) {
            playerRef.current.playVideo();
        } else {
            playerRef.current.pauseVideo();
        }
    } catch (e) {
        console.error('togglePlay error:', e);
    }
  };

  if (!activeSong) return null;

  const PREVIEW_SECONDS = 60;
  const pct = Math.min(100, (elapsed / PREVIEW_SECONDS) * 100);
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const slug = activeSong.id || activeSong.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const glow = { ['--accent' as any]: accent } as React.CSSProperties;

  const renderBars = (count = 16, tall = 'h-6') => (
    <div className={`flex items-end gap-[3px] ${tall}`} aria-hidden="true">
      {visualizerBars.slice(0, count).map((bar, i) => (
        <div
          key={i}
          className="w-[3px] h-full rounded-t-sm visualizer-bar"
          style={{
            background: `linear-gradient(to top, transparent, ${accent})`,
            animationDelay: bar.delay,
            animationDuration: bar.duration,
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        ></div>
      ))}
    </div>
  );

  // Disco de vinilo: la portada gira mientras suena y queda quieta en pausa
  const renderVinyl = (size: string) => (
    <div className={`${size} relative rounded-full flex-shrink-0 shadow-[0_15px_40px_rgba(0,0,0,0.55)]`} style={{ boxShadow: `0 0 34px -6px ${accent}, 0 15px 40px rgba(0,0,0,0.55)` }}>
      <div className="absolute inset-0 rounded-full bg-[#0b0d12]"></div>
      <img
        src={activeSong.cover}
        alt={activeSong.name}
        className="absolute inset-[9%] w-[82%] h-[82%] rounded-full object-cover vinyl-spin"
        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
      />
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'repeating-radial-gradient(circle at center, transparent 0 3px, rgba(255,255,255,0.05) 3px 4px)' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[14%] h-[14%] rounded-full bg-[#05070a] border border-white/20"></div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes bounceBar { 0%, 100% { transform: scaleY(0.2); } 50% { transform: scaleY(1); } }
        .visualizer-bar { transform-origin: bottom; animation: bounceBar infinite ease-in-out; }
        @keyframes vinylSpin { to { transform: rotate(360deg); } }
        .vinyl-spin { animation: vinylSpin 9s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .visualizer-bar, .vinyl-spin { animation: none !important; } }
      `}</style>

      {/* Hidden YT iframe container — sized to prevent pausing, but invisible */}
      {videoId && (
        <div
          ref={containerRef}
          className="fixed pointer-events-none"
          style={{ width: '300px', height: '300px', top: 0, left: 0, opacity: 0.01, zIndex: 9999 }}
        />
      )}

      {/* PANTALLA COMPLETA: escuchando ahora */}
      {expanded && (
        <div className="fixed inset-0 z-[3600] bg-[#05070a] flex flex-col items-center justify-center px-6 py-10 overflow-y-auto" style={glow} role="dialog" aria-label="Escuchando ahora">
          <img src={activeSong.cover} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 opacity-40" aria-hidden="true" />
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 35%, color-mix(in srgb, ${accent} 25%, transparent), transparent 60%), linear-gradient(to bottom, rgba(5,7,10,0.65), #05070a 92%)` }}></div>

          <button
            onClick={() => setExpanded(false)}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-colors"
            aria-label="Cerrar pantalla completa"
          >
            <i className="fas fa-chevron-down"></i>
          </button>

          <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40 mb-8">Escuchando ahora</p>
            {renderVinyl('w-60 h-60 md:w-72 md:h-72')}
            <h3 className="font-serif italic text-3xl md:text-4xl text-white mt-9 leading-tight">{activeSong.name}</h3>
            <p className="text-[11px] uppercase tracking-[0.35em] font-black mt-2" style={{ color: accent }}>{activeSong.artist}</p>

            <div className="mt-8 w-full">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: accent }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-white/40 mt-2 tabular-nums">
                <span>{fmt(elapsed)}</span>
                <span>Vista previa · {fmt(PREVIEW_SECONDS)}</span>
              </div>
            </div>

            <div className="flex items-center gap-5 mt-6">
              {renderBars(8, 'h-8')}
              {videoId ? (
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full text-black flex items-center justify-center hover:scale-105 transition-transform"
                  style={{ background: accent, boxShadow: `0 0 40px -6px ${accent}` }}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${isPlaying ? '' : 'ml-1'}`}></i>
                </button>
              ) : (
                <a href={activeSong.url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-full text-black flex items-center justify-center" style={{ background: accent }} aria-label="Escuchar">
                  <i className="fas fa-external-link-alt text-xl"></i>
                </a>
              )}
              {renderBars(8, 'h-8')}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
              <Link to={`/letra/${slug}`} onClick={() => setExpanded(false)} className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                <i className="fas fa-file-lines"></i> Ver letra
              </Link>
              <Link to={`/link/${slug}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:scale-105 transition-transform" style={{ background: accent }}>
                <i className="fas fa-link"></i> Canción completa
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-[4.5rem] md:bottom-0 left-0 right-0 z-[3000] p-3 md:p-5 transition-transform duration-500 ${isMinimized ? 'translate-y-[calc(100%-10px)]' : 'translate-y-0'}`} style={glow}>
        <div className="max-w-5xl mx-auto bg-[#0f111a]/95 backdrop-blur-2xl border rounded-[1.75rem] shadow-[0_-25px_80px_rgba(0,0,0,0.55)] overflow-hidden relative" style={{ borderColor: `color-mix(in srgb, ${accent} 30%, transparent)` }}>
          <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 35%, transparent), transparent 55%)` }}></div>

          <div className="relative z-10 h-2 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Mostrar reproductor' : 'Minimizar'}></div>

          <div className="relative z-10 p-4 md:p-5 flex items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
              <button onClick={() => setExpanded(true)} className="flex-shrink-0 hover:scale-105 transition-transform" aria-label="Abrir pantalla completa" title="Pantalla completa">
                {renderVinyl('w-16 h-16 md:w-20 md:h-20')}
              </button>

              <div className="flex-1 min-w-0 flex items-center gap-8">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30 mb-1">Reproduciendo ahora</p>
                  <h5 className="font-serif text-lg md:text-2xl font-bold truncate tracking-tight" style={{ color: accent }}>{activeSong.name}</h5>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mt-1 truncate">{activeSong.artist}</p>
                </div>
                <div className="hidden sm:block opacity-80">{renderBars()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Link
                to={`/letra/${slug}`}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all border border-emerald-500/30"
                title="Ver Letra Oficial"
              >
                <i className="fas fa-file-lines text-xs md:text-sm"></i>
              </Link>

              <Link
                to={`/link/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 items-center justify-center rounded-full bg-[#c5a059]/10 hover:bg-[#c5a059]/20 text-[#c5a059] hover:text-[#dfba6f] transition-all border border-[#c5a059]/30"
                title="SmartLink (Escuchar canción completa en plataformas)"
              >
                <i className="fas fa-link text-xs md:text-sm"></i>
              </Link>

              {videoId ? (
                <button
                  onClick={togglePlay}
                  className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full text-black hover:scale-105 transition-transform"
                  style={{ background: accent, boxShadow: `0 0 24px -6px ${accent}` }}
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xs md:text-sm ${isPlaying ? '' : 'ml-0.5'}`}></i>
                </button>
              ) : (
                <a
                  href={activeSong.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-[#c5a059]/20 hover:bg-[#c5a059] text-[#c5a059] hover:text-black transition-all border border-[#c5a059]/30"
                  title="Escuchar"
                >
                  <i className="fas fa-external-link-alt text-xs md:text-sm"></i>
                </a>
              )}

              <button
                onClick={() => setExpanded(true)}
                className="hidden md:flex w-12 h-12 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                title="Pantalla completa"
                aria-label="Pantalla completa"
              >
                <i className="fas fa-chevron-up text-sm"></i>
              </button>

              <button
                onClick={onClear}
                className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"
                title="Cerrar reproductor"
                aria-label="Cerrar reproductor"
              >
                <i className="fas fa-times text-xs md:text-sm"></i>
              </button>
            </div>
          </div>

          {/* Progreso real de la vista previa (60 s) */}
          <div className="relative z-10 flex items-center gap-3 px-5 md:px-6 pb-3 -mt-1">
            <span className="text-[9px] font-bold text-white/30 tabular-nums w-8">{fmt(elapsed)}</span>
            <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: accent }}></div>
            </div>
            <span className="text-[9px] font-bold text-white/30 tabular-nums w-8 text-right">{fmt(PREVIEW_SECONDS)}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalPlayer;
