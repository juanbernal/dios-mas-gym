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
      className="zen-card group relative flex flex-col h-full animate-zen overflow-hidden" 
      onClick={onClick}
    >
      <div className="relative h-72 overflow-hidden">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x600/1e293b/3b82f6?text=DiosMasGym'} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-60"></div>
        
        <button 
          onClick={onFav} 
          className={`absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full transition-all ${
            isFav 
              ? 'bg-white text-black shadow-lg scale-110' 
              : 'bg-black/20 text-white/50 backdrop-blur-md border border-white/10 hover:text-white hover:bg-black/40'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star`}></i>
        </button>
      </div>

      <div className="p-10 flex-1 flex flex-col">
        <div className="flex gap-2 mb-4">
           {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[10px] font-bold uppercase tracking-widest text-accent-blue/60">
                {l}
              </span>
           ))}
        </div>
        
        <h4 className="font-bold text-xl mb-12 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
          <div className="text-text-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
             <i className="far fa-clock"></i> {post.readingTime || 5} MIN
          </div>
          <div className="flex items-center gap-2 text-white font-bold uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
             LEER MÁS <i className="fas fa-chevron-right text-[8px]"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
