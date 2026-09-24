import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MusicItem } from '../types';
import { useDominantColor } from '../hooks/useDominantColor';
import { safeStorage } from '../services/safeStorage';

interface GlobalPlayerProps {
  activeSong: MusicItem | null;
  onClear: () => void;
}

const getVideoId = (url: string) => {
  try {
    const match = url.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (match) return match[1];
    if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
    return null;
  } catch { return null; }
};

// Posicion guardada por cancion: si el oyente vuelve a una cancion que dejo a medias, sigue donde se quedo
const POS_KEY = 'dmg_player_positions';
const readPositions = (): Record<string, number> => {
  try { return JSON.parse(safeStorage.getItem(POS_KEY) || '{}') || {}; } catch { return {}; }
};
const writePosition = (id: string, seconds: number | null) => {
  if (!id) return;
  const map = readPositions();
  delete map[id];
  if (seconds !== null) map[id] = Math.floor(seconds);
  // Solo se guardan las ultimas 50 canciones
  const keys = Object.keys(map);
  if (keys.length > 50) keys.slice(0, keys.length - 50).forEach(k => delete map[k]);
  safeStorage.setItem(POS_KEY, JSON.stringify(map));
};

// Punto de arranque al azar dentro de la primera mitad larga de la cancion (evita el final)
const randomStart = (total: number) => Math.floor(total * (0.15 + Math.random() * 0.4));

type StartMode = 'resume' | 'random' | null;

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ activeSong, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startMode, setStartMode] = useState<StartMode>(null);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const songRef = useRef<MusicItem | null>(activeSong);
  // La cancion que aun no se ha movido a su punto al azar (se necesita la duracion para elegirlo)
  const pendingRandomRef = useRef(false);

  const videoId = getVideoId(activeSong?.url || '');
  const accent = useDominantColor(activeSong?.cover);
  songRef.current = activeSong;

  const visualizerBars = useMemo(() =>
    [...Array(16)].map((_, i) => ({
      delay: `${(i % 5) * 0.15 + (i * 0.037) % 0.2}s`,
      duration: `${0.5 + (i * 0.031) % 0.5}s`
    })),
  []);

  // Mueve la cancion a un punto al azar en cuanto se conoce su duracion
  const applyRandomStart = (p: any) => {
    if (!pendingRandomRef.current || !p?.getDuration) return;
    const total = p.getDuration() || 0;
    if (total <= 0) return;
    pendingRandomRef.current = false;
    if (total < 60) return; // canciones muy cortas: desde el inicio
    const t = randomStart(total);
    p.seekTo(t, true);
    setElapsed(t);
    setDuration(total);
  };

  // Al cambiar de cancion se carga el nuevo video en el mismo reproductor de YouTube
  useEffect(() => {
    setIsPlaying(true);
    setElapsed(0);
    setDuration(0);

    if (!videoId) {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) {}
        playerRef.current = null;
        readyRef.current = false;
      }
      return;
    }

    // Si ya la habia escuchado a medias, continua ahi; si no, arranca en una parte al azar
    const saved = activeSong?.id ? readPositions()[activeSong.id] || 0 : 0;
    const startAt = saved > 15 ? saved : 0;
    pendingRandomRef.current = startAt === 0;
    setStartMode(startAt > 0 ? 'resume' : 'random');
    if (startAt > 0) setElapsed(startAt);

    if (playerRef.current && readyRef.current) {
      try { playerRef.current.loadVideoById({ videoId, startSeconds: startAt }); } catch (e) { console.error('YT load error:', e); }
      return;
    }
    if (playerRef.current) return; // se esta creando; onReady cargara la cancion actual

    const tryInit = () => {
        if (!containerRef.current || playerRef.current) return;
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
                    start: startAt,
                    origin: window.location.origin
                },
                events: {
                    onReady: (event: any) => {
                        readyRef.current = true;
                        // Si la cancion cambio mientras se creaba el reproductor, carga la actual
                        const current = getVideoId(songRef.current?.url || '');
                        if (current && current !== videoId) event.target.loadVideoById(current);
                        else event.target.playVideo();
                        setIsPlaying(true);
                    },
                    onStateChange: (event: any) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                            applyRandomStart(event.target);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            setIsPlaying(false);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            // Termino completa: se detiene (no pasa sola a otra cancion)
                            setIsPlaying(false);
                            if (songRef.current?.id) writePosition(songRef.current.id, null);
                        }
                    }
                }
            });
        } catch (e) {
            console.error('YT Init error:', e);
            playerRef.current = null;
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
  }, [videoId, activeSong?.id]);

  // Al cerrar el reproductor se destruye el video
  useEffect(() => () => {
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch (_) {}
      playerRef.current = null;
      readyRef.current = false;
    }
  }, []);

  // Progreso real de la cancion completa + guardado de la posicion cada pocos segundos
  useEffect(() => {
    if (!isPlaying) return;
    let ticks = 0;
    const interval = setInterval(() => {
        const p = playerRef.current;
        if (!p || !p.getCurrentTime) return;
        if (pendingRandomRef.current) { applyRandomStart(p); return; }
        const time = p.getCurrentTime() || 0;
        const total = p.getDuration ? p.getDuration() || 0 : 0;
        setElapsed(time);
        if (total > 0) setDuration(total);
        ticks++;
        const id = songRef.current?.id;
        if (id && ticks % 10 === 0) {
          // Cerca del final no se guarda: la proxima vez vuelve a arrancar en otra parte
          writePosition(id, total > 0 && time > total - 20 ? null : time);
        }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // El aviso de donde empezo se oculta solo despues de unos segundos
  useEffect(() => {
    if (startMode === null) return;
    const t = setTimeout(() => setStartMode(null), 8000);
    return () => clearTimeout(t);
  }, [startMode, activeSong?.id]);

  // Controles en la pantalla de bloqueo y en los audifonos del telefono
  useEffect(() => {
    if (!activeSong || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeSong.name,
        artist: activeSong.artist,
        album: activeSong.album || 'Diosmasgym Records',
        artwork: activeSong.cover ? [{ src: activeSong.cover, sizes: '512x512' }] : []
      });
      navigator.mediaSession.setActionHandler('play', () => playerRef.current?.playVideo?.());
      navigator.mediaSession.setActionHandler('pause', () => playerRef.current?.pauseVideo?.());
    } catch (_) {}
  }, [activeSong?.id]);

  // Escape cierra la pantalla completa
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    } catch (e) {
        console.error('togglePlay error:', e);
    }
  };

  const seekTo = (seconds: number) => {
    if (!playerRef.current?.seekTo) return;
    pendingRandomRef.current = false;
    playerRef.current.seekTo(seconds, true);
    setElapsed(seconds);
    setStartMode(null);
  };

  if (!activeSong) return null;

  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const slug = activeSong.id || activeSong.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const glow = { ['--accent' as any]: accent } as React.CSSProperties;
  const startLabel = startMode === 'resume' ? 'Continuando donde te quedaste' : startMode === 'random' ? 'Empezó en una parte al azar' : null;

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

  // Barra de progreso de la cancion completa; se puede tocar/arrastrar para adelantar o regresar
  const renderProgress = (height: string) => (
    <div className={`relative flex-1 ${height} rounded-full bg-white/10`}>
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: accent }}></div>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.floor(duration))}
        step={1}
        value={Math.floor(elapsed)}
        onChange={e => seekTo(Number(e.target.value))}
        disabled={!duration}
        className="absolute inset-x-0 -inset-y-2 w-full h-[calc(100%+1rem)] opacity-0 cursor-pointer disabled:cursor-default"
        aria-label="Posición de la canción"
        aria-valuetext={`${fmt(elapsed)} de ${fmt(duration)}`}
      />
    </div>
  );

  // Boton para escuchar desde el principio (siempre disponible)
  const renderRestart = (className: string) => (
    <button onClick={() => seekTo(0)} className={className} title="Escuchar desde el inicio" aria-label="Escuchar desde el inicio">
      <i className="fas fa-backward-step"></i>
    </button>
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
              <div className="flex items-center">{renderProgress('h-1.5')}</div>
              <div className="flex justify-between text-[10px] font-bold text-white/40 mt-2 tabular-nums">
                <span>{fmt(elapsed)}</span>
                <span>{duration > 0 ? fmt(duration) : '--:--'}</span>
              </div>
              {startLabel && (
                <p className="text-[10px] text-white/50 mt-2">
                  {startLabel} · <button onClick={() => seekTo(0)} className="underline hover:text-white">Escuchar desde el inicio</button>
                </p>
              )}
            </div>

            <div className="flex items-center gap-5 mt-6">
              {renderBars(8, 'h-8')}
              {renderRestart('w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all')}
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
              <div className="w-11"></div>
              {renderBars(8, 'h-8')}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
              <Link to={`/letra/${slug}`} onClick={() => setExpanded(false)} className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                <i className="fas fa-file-lines"></i> Ver letra
              </Link>
              <Link to={`/link/${slug}`} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:scale-105 transition-transform" style={{ background: accent }}>
                <i className="fab fa-spotify"></i> Guárdala en tu plataforma
              </Link>
            </div>
            <p className="text-[10px] text-white/40 mt-4 max-w-xs">Síguenos en Spotify, Apple Music y YouTube Music para no perderte ningún estreno.</p>
          </div>
        </div>
      )}

      <div className={`fixed bottom-[4.5rem] md:bottom-0 left-0 right-0 z-[3000] p-3 md:p-5 transition-transform duration-500 ${isMinimized ? 'translate-y-[calc(100%-10px)]' : 'translate-y-0'}`} style={glow}>
        <div className="max-w-5xl mx-auto bg-[#0f111a]/95 backdrop-blur-2xl border rounded-[1.75rem] shadow-[0_-25px_80px_rgba(0,0,0,0.55)] overflow-hidden relative" style={{ borderColor: `color-mix(in srgb, ${accent} 30%, transparent)` }}>
          <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 35%, transparent), transparent 55%)` }}></div>

          <div className="relative z-10 h-2 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Mostrar reproductor' : 'Minimizar'}></div>

          <div className="relative z-10 p-4 md:p-5 flex items-center justify-between gap-3 md:gap-6">
            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
              <button onClick={() => setExpanded(true)} className="flex-shrink-0 hover:scale-105 transition-transform" aria-label="Abrir pantalla completa" title="Pantalla completa">
                {renderVinyl('w-14 h-14 md:w-20 md:h-20')}
              </button>

              <div className="flex-1 min-w-0 flex items-center gap-8">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30 mb-1 truncate">
                    {startLabel || 'Reproduciendo ahora'}
                  </p>
                  <h5 className="font-serif text-lg md:text-2xl font-bold truncate tracking-tight" style={{ color: accent }}>{activeSong.name}</h5>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black mt-1 truncate">{activeSong.artist}</p>
                </div>
                <div className="hidden xl:block opacity-80">{renderBars()}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              {renderRestart('w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm')}

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

              <Link
                to={`/letra/${slug}`}
                className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 lg:w-auto lg:px-5 lg:gap-2 items-center justify-center rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all border border-emerald-500/30"
                title="Ver la letra de esta canción"
                aria-label="Ver la letra de esta canción"
              >
                <i className="fas fa-file-lines text-xs md:text-sm"></i>
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-[0.15em]">Letra</span>
              </Link>

              <Link
                to={`/link/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 lg:w-auto lg:px-5 lg:gap-2 items-center justify-center rounded-full bg-[#c5a059]/10 hover:bg-[#c5a059]/20 text-[#c5a059] hover:text-[#dfba6f] transition-all border border-[#c5a059]/30"
                title="Escúchala en Spotify, Apple Music, YouTube Music y más"
                aria-label="Escúchala en Spotify, Apple Music, YouTube Music y más"
              >
                <i className="fab fa-spotify text-xs md:text-sm"></i>
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-[0.15em]">Plataformas</span>
              </Link>

              <button
                onClick={() => setExpanded(true)}
                className="hidden md:flex w-12 h-12 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                title="Ampliar el reproductor a pantalla completa"
                aria-label="Ampliar el reproductor a pantalla completa"
              >
                <i className="fas fa-chevron-up text-sm"></i>
              </button>

              <button
                onClick={onClear}
                className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5"
                title="Cerrar reproductor"
                aria-label="Cerrar reproductor"
              >
                <i className="fas fa-times text-xs md:text-sm"></i>
              </button>
            </div>
          </div>

          {/* Progreso de la canción completa (se puede adelantar o regresar) */}
          <div className="relative z-10 flex items-center gap-3 px-5 md:px-6 pb-3 -mt-1">
            <span className="text-[9px] font-bold text-white/30 tabular-nums w-8">{fmt(elapsed)}</span>
            {renderProgress('h-1')}
            <span className="text-[9px] font-bold text-white/30 tabular-nums w-8 text-right">{duration > 0 ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalPlayer;
