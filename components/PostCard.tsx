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
      className="tactical-box group relative flex flex-col h-full animate-fade-in-up overflow-hidden" 
      onClick={onClick}
    >
      <div className="relative h-64 overflow-hidden border-b border-white/5">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x600/1e293b/3b82f6?text=DiosMasGym'} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-panel via-transparent to-transparent opacity-80"></div>
        
        <div className="absolute top-4 left-4 flex gap-2">
           {isRead && (
             <div className="bg-accent-blue/80 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 tech-text">
                CARGADO
             </div>
           )}
           <div className="bg-black/40 text-blue-400 text-[8px] font-black px-2 py-1 tech-text border border-blue-900">
              ID: {post.id.substring(0, 8)}
           </div>
        </div>

        <button 
          onClick={onFav} 
          className={`absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-all ${
            isFav 
              ? 'bg-accent-blue text-white shadow-[0_0_15px_var(--accent-blue-dim)]' 
              : 'bg-black/20 text-white/30 border border-white/10 hover:text-white'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star text-sm`}></i>
        </button>
      </div>

      <div className="p-8 flex-1 flex flex-col relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <i className="fas fa-microchip text-4xl"></i>
        </div>

        <div className="mb-6">
           {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[10px] font-black tech-text text-accent-blue tracking-widest">
                [{l}]
              </span>
           ))}
        </div>
        
        <h4 className="font-bold text-xl mb-10 group-hover:text-accent-blue-bright transition-colors line-clamp-2 uppercase italic tracking-tighter leading-tight">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
          <div className="text-text-dim text-[9px] font-black uppercase tech-text tracking-widest flex items-center gap-2">
             <span className="status-light online h-1.5 w-1.5 animate-pulse"></span>
             DATOS LISTOS
          </div>
          <div className="flex items-center gap-2 text-accent-blue-bright font-black uppercase text-[10px] tracking-widest opacity-30 group-hover:opacity-100 transition-all">
             ACCEDER <i className="fas fa-angle-right"></i>
          </div>
        </div>
      </div>
      
      {/* Simulation scanline on hover */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-accent-blue/40 -translate-y-full group-hover:animate-[scan_2s_linear_infinite] pointer-events-none"></div>
    </div>
  );
};

export default PostCard;
