import React from 'react';
import { ContentPost } from '../types';

interface PostCardProps {
  post: ContentPost;
  onClick: () => void;
  isFav: boolean;
  isRead: boolean;
  onFav: (e: React.MouseEvent) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick, isFav, isRead, onFav }) => {
  return (
    <div 
      className="group relative flex flex-col h-full bg-[#0f111a]/90 border border-white/5 rounded-[1.75rem] overflow-hidden cursor-pointer hover:shadow-[0_35px_90px_-25px_rgba(197,160,89,0.28)] hover:border-[#c5a059]/25 transition-all duration-500 gold-border-glow" 
      onClick={onClick}
    >
      <div className="relative h-[360px] md:h-[440px] overflow-hidden">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x1200/05070a/c5a059?text=Reflections'} 
          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/35 to-transparent opacity-95 group-hover:opacity-65 transition-opacity"></div>
        <div className="absolute left-6 bottom-6 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl text-[8px] font-black uppercase tracking-[0.35em] text-[#c5a059]">
          Lectura
        </div>
        
        <button 
          onClick={onFav} 
          className={`absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full transition-all backdrop-blur-xl border border-white/10 ${
            isFav 
              ? 'bg-[#c5a059] text-black scale-110 shadow-[0_0_20px_rgba(197,160,89,0.4)]' 
              : 'bg-black/20 text-white/40 hover:bg-white hover:text-black'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star text-xs`}></i>
        </button>
      </div>

      <div className="p-7 md:p-8 flex-1 flex flex-col relative z-10">
        <div className="flex gap-4 mb-4">
           {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[9px] font-black uppercase tracking-[0.5em] text-[#c5a059]">
                {l}
              </span>
           ))}
        </div>
        
        <h4 className="font-serif text-2xl md:text-3xl font-bold mb-8 leading-[1.12] text-white/95 group-hover:text-[#c5a059] transition-colors">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
             <span className="h-1 w-1 bg-[#c5a059] rounded-full"></span>
             Reflexión Activa
          </div>
          <div className="text-[#c5a059] font-black uppercase text-[9px] tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
             Leer más
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
