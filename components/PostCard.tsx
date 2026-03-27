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
      className="magazine-card group relative flex flex-col h-full overflow-hidden cursor-pointer" 
      onClick={onClick}
    >
      <div className="relative h-[450px] overflow-hidden">
        <img 
          src={post.images?.[0]?.url || 'https://placehold.co/800x1200/02040a/3b82f6?text=Reflections'} 
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" 
          alt={post.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/80 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity"></div>
        
        <button 
          onClick={onFav} 
          className={`absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full transition-all ${
            isFav 
              ? 'bg-accent-blue text-white shadow-2xl scale-125' 
              : 'bg-black/40 text-white/50 border border-white/10 backdrop-blur-md hover:bg-white hover:text-black'
          }`}
        >
          <i className={`${isFav ? 'fas' : 'far'} fa-star`}></i>
        </button>
      </div>

      <div className="p-10 flex-1 flex flex-col">
        <div className="flex gap-4 mb-6">
           {post.labels?.slice(0, 1).map(l => (
              <span key={l} className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-blue/80">
                {l}
              </span>
           ))}
        </div>
        
        <h4 className="font-serif text-3xl font-bold mb-10 group-hover:text-accent-blue transition-colors leading-tight serif-italic pr-4">
          {post.title}
        </h4>

        <div className="mt-auto flex items-center justify-between pt-8 border-t border-white/5">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/30 flex items-center gap-3">
             <span className="h-1.5 w-1.5 bg-accent-blue rounded-full animate-pulse"></span>
             Reflexión Activa
          </div>
          <div className="flex items-center gap-2 text-white font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
             Acceder <i className="fas fa-arrow-right text-[8px] text-accent-blue"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
