import React from 'react';
import { ContentPost } from '../types';
import PostCard from './PostCard';

interface RelatedPostsProps {
  currentPost: ContentPost;
  allPosts: ContentPost[];
  favorites: string[];
  readingHistory: string[];
  onNavigate: (slug: string) => void;
  onFav: (e: React.MouseEvent, post: ContentPost) => void;
}

const RelatedPosts: React.FC<RelatedPostsProps> = ({ currentPost, allPosts, favorites, readingHistory, onNavigate, onFav }) => {
  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    return url.split('/').pop()?.replace('.html', '') || '';
  };

  const related = allPosts
    .filter(p => p.id !== currentPost.id)
    .filter(p => p.labels?.some(l => currentPost.labels?.includes(l)))
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="py-24 bg-[#0a0c14] border-t border-[#4a90d9]/10">
      <div className="section-container">
        <div className="flex items-center gap-6 mb-16">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#4a90d9]/20 to-transparent"></div>
          <h3 className="font-serif italic text-3xl md:text-4xl text-[#4a90d9] text-center">
            Relacionado
          </h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#4a90d9]/20 to-transparent"></div>
        </div>
        <div className="grid grid-cols-12 gap-8">
          {related.map(p => (
            <div key={p.id} className="col-span-12 md:col-span-4 transition-all hover:-translate-y-2 duration-500">
              <PostCard
                post={p}
                onClick={() => onNavigate(getSlugFromUrl(p.url))}
                isFav={favorites.includes(p.id)}
                isRead={readingHistory.includes(p.id)}
                onFav={(e) => onFav(e, p)}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedPosts;