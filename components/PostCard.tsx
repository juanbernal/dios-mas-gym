import React from 'react';
import { ContentPost } from '../types';

interface PostCardProps {
  post: ContentPost;
  onClick: () => void;
  isFav: boolean;
  isRead: boolean;
  onFav: (e: React.MouseEvent) => void;
  size?: 'lg' | 'md' | 'sm';
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, isFav, isRead, onFav, size = 'md' }) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const imgHeight = isLg ? 'h-[500px] md:h-[600px]' : isSm ? 'h-[200px] md:h-[240px]' : 'h-[360px] md:h-[440px]';
  const titleSize = isLg ? 'text-3xl md:text-5xl' : isSm ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl';
  const padding = isSm ? 'p-4 md:p-5' : 'p-7 md:p-8';
  const badgeSize = isSm ? 'text-[7px]' : 'text-[8px]';

  return (
    <div 
      className={`group relative flex flex-col h-full bg-[#0f111a]/90 border border-white/5 rounded-[1.75rem] overflow-hidden cursor-pointer hover:shadow-[0_35px_90px_-25px_rgba(37,99,168,0.28)] hover:border-[#4a90d9]/25 transition-all duration-500 gold-border-glow ${isSm ? 'min-h-[320px]' : ''}`}
      onClick={onClick}
    >
      <div className={`relative ${imgHeight} overflow-hidden`}>
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x1200/05070a/c5a059?text=Reflections'} 
          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" 
          alt={post.title}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/35 to-transparent opacity-95 group-hover:opacity-65 transition-opacity"></div>
        <div className="absolute left-6 bottom-6 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl text-[8px] font-black uppercase tracking-[0.35em] text-[#4a90d9] flex items-center gap-2">
          <span>Lectura</span>
          {post.readingTime && <span className="opacity-60">· {post.readingTime} min</span>}
        </div>
        
        <button 
          onClick={onFav} 
          className={`absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full transition-all backdrop-blur-xl border border-white/10 ${
            isFav 
              ? 'bg-[#4a90d9] text-black scale-110 shadow-[0_0_20px_rgba(37,99,168,0.4)]' 
              : 'bg-black/20 text-white/40 hover:bg-white hover:text-black'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star text-xs`}></i>
        </button>
        {isRead && (
          <div className="absolute top-6 left-6 px-3 py-1.5 rounded-full bg-[#4a90d9]/20 border border-[#4a90d9]/30 backdrop-blur-xl text-[7px] font-black uppercase tracking-[0.2em] text-[#4a90d9]">
            <i className="fas fa-check mr-1"></i> Leído
          </div>
        )}
      </div>

      <div className={`${padding} flex-1 flex flex-col relative z-10 -mt-1`}>
        <div className="flex gap-4 mb-4 flex-wrap">
           {post.labels?.slice(0, 2).map(l => (
              <span key={l} className={`${badgeSize} font-black uppercase tracking-[0.5em] text-[#4a90d9]`}>
                {l}
              </span>
           ))}
        </div>
        
        <h4 className={`font-serif font-bold mb-4 leading-[1.12] text-white/95 group-hover:text-[#4a90d9] transition-colors ${titleSize}`}>
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
             <span className="h-1 w-1 bg-[#4a90d9] rounded-full"></span>
             {new Date(post.published).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-[#4a90d9] font-black uppercase text-[9px] tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
             Leer más
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
