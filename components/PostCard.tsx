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
      className="warrior-card group relative flex flex-col h-full animate-fade-in-up" 
      onClick={onClick}
    >
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x600/1e293b/3b82f6?text=DiosMasGym'} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-slate via-transparent to-transparent opacity-90"></div>
        
        {isRead && (
          <div className="absolute top-4 left-4 bg-accent-blue text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-lg border border-white/20">
             <i className="fas fa-check mr-2"></i> LEÍDO
          </div>
        )}

        <button 
          onClick={onFav} 
          className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center transition-all active:scale-90 ${
            isFav 
              ? 'bg-accent-blue text-white shadow-lg' 
              : 'bg-black/40 text-white/50 border border-white/10 hover:bg-black/60 hover:text-white'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star text-lg`}></i>
        </button>
      </div>

      <div className="p-8 md:p-10 flex-1 flex flex-col">
        <div className="flex gap-4 mb-6">
           {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[10px] font-black uppercase tracking-widest text-accent-blue">
                // {l}
              </span>
           ))}
        </div>
        
        <h4 className="font-black text-2xl mb-8 group-hover:text-accent-blue transition-colors line-clamp-2 uppercase italic tracking-tighter">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5 grayscale group-hover:grayscale-0 transition-all">
          <div className="flex items-center gap-3 text-text-secondary text-[10px] font-black uppercase tracking-widest">
             <i className="far fa-clock text-accent-blue"></i> {post.readingTime || 5} MIN
          </div>
          <div className="flex items-center gap-2 text-accent-blue font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
             MOSTRAR <i className="fas fa-arrow-right"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
