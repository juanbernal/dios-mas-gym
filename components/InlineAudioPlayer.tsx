import React, { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface InlineAudioPlayerProps {
    url: string;
    isJuan?: boolean;
}

const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ url, isJuan }) => {
    const accentColor = isJuan ? '#c89d53' : '#c5a059';

    const getEmbedData = () => {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = '';
            try {
                if (url.includes('youtu.be')) videoId = url.split('/').pop()?.split('?')[0] || '';
                else videoId = new URLSearchParams(new URL(url).search).get('v') || '';
            } catch(e) {}
            if (videoId) return { type: 'youtube', id: videoId };
        }
        if (url.includes('spotify.com/track')) {
            const trackId = url.split('track/')[1]?.split('?')[0];
            if (trackId) return { type: 'spotify', url: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator` };
        }
        return null;
    };

    const embedData = getEmbedData();

    if (embedData?.type === 'spotify') {
        return (
            <div className="w-full rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/40 p-2 backdrop-blur-md mb-2">
                <iframe 
                    src={embedData.url} 
                    width="100%" 
                    height="80" 
                    frameBorder="0" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    className="rounded-lg"
                ></iframe>
            </div>
        );
    }

    if (embedData?.type === 'youtube') {
        return <YouTubePlayer videoId={embedData.id} accentColor={accentColor} />;
    }

    return (
        <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#c5a059] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white transition-all shadow-[0_10px_30px_rgba(197,160,89,0.2)] active:scale-95"
            style={{ backgroundColor: accentColor }}
        >
            <i className="fas fa-play text-xs"></i>
            Escuchar Ahora
        </a>
    );
};

const YouTubePlayer = ({ videoId, accentColor }: { videoId: string, accentColor: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const playerRef = useRef<any>(null);
    const playerId = `inline-yt-${videoId}-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }
            
            window.onYouTubeIframeAPIReady = () => {
                initPlayer();
            };
        } else if (window.YT && window.YT.Player) {
            initPlayer();
        }

        function initPlayer() {
            if (playerRef.current) return;
            playerRef.current = new window.YT.Player(playerId, {
                height: '0',
                width: '0',
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1
                },
                events: {
                    onStateChange: (event: any) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        } else {
                            setIsPlaying(false);
                        }
                    }
                }
            });
        }
    }, [videoId]);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                    const time = playerRef.current.getCurrentTime();
                    setProgress((time / 60) * 100);
                    if (time >= 60) {
                        playerRef.current.pauseVideo();
                        playerRef.current.seekTo(0);
                        setIsPlaying(false);
                        setProgress(0);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    const togglePlay = () => {
        if (!playerRef.current || !playerRef.current.playVideo) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    return (
        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-4 relative overflow-hidden backdrop-blur-sm shadow-xl">
            <div id={playerId} className="hidden"></div>
            {isPlaying && <div className="absolute inset-0 opacity-10 animate-pulse" style={{ backgroundColor: accentColor }}></div>}
            
            <button 
                onClick={togglePlay} 
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 flex-shrink-0" 
                style={{ backgroundColor: accentColor }}
            >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-black ${!isPlaying ? 'ml-1' : ''}`}></i>
            </button>
            
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2 text-white/70">
                    <span>{isPlaying ? 'Reproduciendo...' : 'Escuchar Previa'}</span>
                    <span className="font-mono text-white/40">{Math.floor(progress * 0.6)}s</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div className="h-full transition-all duration-1000 ease-linear rounded-full" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: accentColor }}></div>
                </div>
            </div>
        </div>
    );
};

export default InlineAudioPlayer;
