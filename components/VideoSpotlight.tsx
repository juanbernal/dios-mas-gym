import React, { useMemo, useState } from 'react';

// Videos recientes de YouTube. El reproductor se carga solo al darle play (antes es una
// miniatura), para no hacer lenta la portada.

const ytId = (url?: string) => url?.match(/(?:v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/)?.[1] || null;
const time = (d?: string) => { const n = new Date(d || '').getTime(); return isNaN(n) ? 0 : n; };

const VideoSpotlight: React.FC<{ catalog: any[] }> = ({ catalog }) => {
  const videos = useMemo(() => {
    const seen = new Set<string>();
    return catalog
      .filter(s => s && s.name && time(s.date) <= Date.now())
      .sort((a, b) => time(b.date) - time(a.date))
      .map(s => ({ id: ytId(s.url), title: s.name as string, artist: s.artist as string }))
      .filter(v => v.id && !seen.has(v.id) && seen.add(v.id))
      .slice(0, 6) as { id: string; title: string; artist: string }[];
  }, [catalog]);

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  if (videos.length === 0) return null;
  const main = videos[Math.min(current, videos.length - 1)];

  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-[#05070a] border-t border-white/5">
      <div className="absolute -right-40 top-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10">
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-10">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-red-400 mb-2">
              <i className="fab fa-youtube text-sm"></i>Videos
            </div>
            <h2 className="font-serif italic text-4xl md:text-6xl text-white leading-none">
              Míralo <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-300">ahora</span>
            </h2>
          </div>
          <a
            href="https://www.youtube.com/@Diosmasgym?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.15em] transition-colors"
          >
            <i className="fab fa-youtube"></i>Suscribirme
          </a>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-4 md:gap-6">
          <div className="relative aspect-video rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
            {playing ? (
              <iframe
                key={main.id}
                src={`https://www.youtube-nocookie.com/embed/${main.id}?autoplay=1&rel=0`}
                title={main.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 w-full h-full" aria-label={`Ver el video de ${main.title}`}>
                <img src={`https://i.ytimg.com/vi/${main.id}/hqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></span>
                <span className="absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.7)] group-hover:scale-110 transition-transform">
                  <i className="fas fa-play text-xl md:text-2xl ml-1"></i>
                </span>
                <span className="absolute left-4 right-4 bottom-4 md:left-6 md:bottom-6 text-left">
                  {current === 0 && <span className="inline-block mb-2 px-2.5 py-1 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.2em]">Lo más nuevo</span>}
                  <span className="block font-black text-white text-lg md:text-2xl leading-tight line-clamp-2">{main.title}</span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mt-1">{main.artist}</span>
                </span>
              </button>
            )}
          </div>

          <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-px-6 lg:scroll-px-0 -mx-6 px-6 lg:mx-0 lg:px-0 pb-1 scrollbar-none">
            {videos.map((v, i) => i === current ? null : (
              <button
                key={v.id}
                type="button"
                onClick={() => { setCurrent(i); setPlaying(true); }}
                className="group snap-start flex-shrink-0 w-[60%] sm:w-[40%] lg:w-full flex flex-col lg:flex-row gap-2 lg:gap-3 text-left rounded-xl lg:p-2 hover:bg-white/5 transition-colors"
              >
                <span className="relative block aspect-video lg:w-36 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                  <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i className="fas fa-play text-white"></i>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-red-400 transition-colors">{v.title}</span>
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mt-1">{v.artist}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSpotlight;
