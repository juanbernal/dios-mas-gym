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
      className="post-card-premium group relative flex flex-col h-full cyber-glass cyber-glass-hover animate-fade-in-up" 
      onClick={onClick}
    >
      <div className="relative h-64 md:h-72 overflow-hidden">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x600/1e293b/3b82f6?text=DiosMasGym'} 
          className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent opacity-80"></div>
        
        {isRead && (
          <div className="absolute top-6 left-6 bg-accent-blue/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg border border-white/10">
             <i className="fas fa-check mr-2"></i> Completado
          </div>
        )}

        <button 
          onClick={onFav} 
          className={`absolute top-6 right-6 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all active:scale-90 ${
            isFav 
              ? 'bg-accent-blue text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/50' 
              : 'bg-black/20 text-white/70 border border-white/10 hover:bg-black/40 hover:text-white'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star text-xl`}></i>
        </button>
      </div>

      <div className="p-8 md:p-10 flex-1 flex flex-col">
        <div className="flex gap-2 mb-6">
           {post.labels?.slice(0, 2).map(l => (
              <span key={l} className="text-[9px] font-black uppercase tracking-widest text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-lg border border-accent-blue/20">
                {l}
              </span>
           ))}
        </div>
        
        <h4 className="h1-cyber text-xl md:text-2xl mb-8 group-hover:text-accent-blue transition-colors line-clamp-2">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-glass-border">
          <div className="flex items-center gap-3 text-text-secondary text-[10px] font-black uppercase tracking-widest">
             <i className="far fa-clock text-accent-blue"></i> {post.readingTime || 5} MIN
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:bg-accent-blue group-hover:text-white transition-all shadow-lg">
             <i className="fas fa-chevron-right text-xs"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
