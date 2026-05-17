import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArtistPromo from './ArtistPromo';
import RecommendedSongs from './RecommendedSongs';
import CommentSection from './CommentSection';
import RelatedPosts from './RelatedPosts';
import { ContentPost, AppState } from '../types';
import { fetchPostBySlug } from '../services/contentService';

interface PostViewProps {
  state: AppState;
  setState: any;
  getSlugFromUrl: (url: string) => string;
  readingHistory: string[];
  setReadingHistory: any;
}

const PostView: React.FC<PostViewProps> = ({ state, setState, getSlugFromUrl, readingHistory, setReadingHistory }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // 0. PRECOMPUTE RECOMMENDED SONGS (Hooks must be at the top level)
  const recommendedSongs = useMemo(() => {
    return [...state.musicDiosmasgym, ...state.musicJuan614]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
  }, [slug, state.musicDiosmasgym.length, state.musicJuan614.length]);

  // 1. LOAD POST LOGIC
  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setError(null);
      
      // Try to find in cache first (allPosts or searchResults)
      const allPossiblePosts = [...state.allPosts, ...state.searchResults];
      const cached = allPossiblePosts.find(p => getSlugFromUrl(p.url) === slug);
      
      if (cached && cached.content && !cached.content.endsWith('...')) {
        setState((p: any) => ({ ...p, selectedPost: cached }));
        if (!readingHistory.includes(cached.id)) setReadingHistory((prev: string[]) => [...prev, cached.id]);
        return;
      }

      // If not in cache or incomplete, fetch from API
      try {
        const fetched = await fetchPostBySlug(slug);
        if (fetched) {
          setState((p: any) => ({ ...p, selectedPost: fetched }));
          if (!readingHistory.includes(fetched.id)) setReadingHistory((prev: string[]) => [...prev, fetched.id]);
        } else {
          setError("Lo sentimos, no pudimos encontrar esta reflexión en El Arsenal.");
        }
      } catch (e) {
        setError("Error al conectar con el servidor de contenidos.");
      }
    };
    
    load();
  }, [slug, state.allPosts, state.searchResults, getSlugFromUrl, readingHistory, setReadingHistory, setState]);

  // 2. SCROLL TO TOP ON NAVIGATION
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // 3. DYNAMIC META TAGS (Professional Social Sharing)
  useEffect(() => {
    if (state.selectedPost) {
      const p = state.selectedPost;
      const title = p.title;
      const description = (p.content || "").replace(/<[^>]*>/g, '').slice(0, 160) + '...';
      const image = p.images?.[0]?.url || "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";
      const url = window.location.href;

      document.title = `${title} | El Arsenal`;

      const updateMeta = (prop: string, content: string) => {
        let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(prop.includes('og:') ? 'property' : 'name', prop);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      updateMeta('og:title', title);
      updateMeta('og:description', description);
      updateMeta('og:url', url);
      updateMeta('og:image', image);
      updateMeta('description', description);
    }
  }, [state.selectedPost]);

  // Stable artist choice for the banner
  const randomArtist = useMemo(() => Math.random() > 0.5 ? 'diosmasgym' : 'juan614', [slug]);

  if (error) return <div className="py-80 bg-[#05070a] text-center px-8 text-white"><h2 className="font-serif italic text-4xl text-[#c5a059] mb-8">{error}</h2><button onClick={() => navigate('/reflexiones')} className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 border-b border-[#c5a059]">Regresar al Arsenal</button></div>;
  if (!state.selectedPost) return <div className="py-80 bg-[#05070a] text-center font-serif italic text-5xl opacity-20 text-[#c5a059] animate-pulse">Sincronizando sabiduría...</div>;

  return (
    <div className="bg-[#05070a] animate-fade-in-up">
      <div className="relative min-h-[70vh] flex items-center overflow-hidden">
        <img src={state.selectedPost.images?.[0]?.url || ''} className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 scale-105" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a]"></div>
        <div className="section-container relative z-10 pt-40 pb-20">
          <button onClick={() => navigate(-1)} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
            <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Hub
          </button>
          <h1 className="font-serif italic text-5xl md:text-8xl mb-12 text-white leading-[1.1] max-w-5xl transition-all duration-1000">
            {state.selectedPost.title}
          </h1>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]/50">
            <span>{new Date(state.selectedPost.published).toLocaleDateString()}</span> 
            {state.selectedPost.labels?.[0] && <span>TEMA: {state.selectedPost.labels[0]}</span>}
          </div>
        </div>
      </div>
      
      <article className="py-24 md:py-40 bg-white">
          <div className="max-w-4xl mx-auto px-8 md:px-0">
              <div 
                className="blogger-body text-black text-xl md:text-2xl leading-[1.8] font-light text-justify" 
                dangerouslySetInnerHTML={{ __html: state.selectedPost.content || '' }}
              ></div>
              
              <div className="my-20 opacity-90">
                <ArtistPromo 
                  artist={randomArtist as any} 
                  mode="social" 
                  musicCatalog={state.musicDiosmasgym} 
                  onPlaySong={(s) => setState((p: any) => ({ ...p, activeSong: s }))} 
                />
              </div>

              {/* Sección de Canciones Recomendadas que sustituye a Disqus */}
              <RecommendedSongs 
                 songs={recommendedSongs}
                 onPlay={(s) => setState((p: any) => ({ ...p, activeSong: s }))}
              />

              {/* Sección de Comentarios Integrada */}
              {state.selectedPost && (
                <div className="mt-16">
                  <CommentSection url={`https://app.diosmasgym.com/post/${getSlugFromUrl(state.selectedPost.url)}`} />
                </div>
              )}
          </div>
      </article>

      {/* FOOTER AREA DE POST */}
      <section className="py-24 md:py-32 bg-[#05070a] border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="section-container relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                  <div>
                    <h2 className="font-serif italic text-4xl md:text-5xl text-white mb-4">Sigue Entrenando</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]/60">Más reflexiones del Arsenal</p>
                  </div>
                  <button onClick={() => navigate('/reflexiones')} className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 transition-all">
                      Volver al Índice
                  </button>
              </div>

              <RelatedPosts 
                  currentPostId={state.selectedPost.id}
                  allPosts={state.allPosts}
                  labels={state.selectedPost.labels || []}
                  onSelectPost={(p) => navigate(`/post/${getSlugFromUrl(p.url)}`)}
              />
          </div>
      </section>
    </div>
  );
};

export default PostView;
