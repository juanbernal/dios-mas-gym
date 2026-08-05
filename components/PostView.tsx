import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import ArtistPromo from './ArtistPromo';
import RecommendedSongs from './RecommendedSongs';
import CommentSection from './CommentSection';
import RelatedPosts from './RelatedPosts';
import { ContentPost, AppState } from '../types';
import { fetchPostBySlug } from '../services/contentService';
import { InlineSocialBanner } from './SocialPromo';
import { useAnalytics } from '../hooks/useAnalytics';

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
  const { trackEvent } = useAnalytics();
  const [error, setError] = useState<string | null>(null);
  const [amenCount, setAmenCount] = useState(0);
  const [hasSaidAmen, setHasSaidAmen] = useState(false);

  // Load/save Amén state from localStorage per post
  useEffect(() => {
    if (!slug) return;
    const storageKey = `amen_${slug}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const { count, given } = JSON.parse(stored);
      setAmenCount(count || 0);
      setHasSaidAmen(!!given);
    } else {
      setAmenCount(Math.floor(Math.random() * 120) + 20); // random seed for social proof
      setHasSaidAmen(false);
    }
  }, [slug]);

  const handleAmen = () => {
    if (!slug) return;
    const storageKey = `amen_${slug}`;
    const newCount = hasSaidAmen ? amenCount - 1 : amenCount + 1;
    const newGiven = !hasSaidAmen;
    setAmenCount(newCount);
    setHasSaidAmen(newGiven);
    localStorage.setItem(storageKey, JSON.stringify({ count: newCount, given: newGiven }));
    if (newGiven) trackEvent('amen_given', { slug });
  };

  const handleShareWhatsApp = () => {
    if (!state.selectedPost) return;
    const url = `https://app.diosmasgym.com/post/${slug}`;
    const text = `"${state.selectedPost.title}" — reflexión de fe de Dios Más Gym ✝️\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    trackEvent('share_whatsapp', { slug });
  };

  const handleShareGeneral = async () => {
    if (!state.selectedPost) return;
    const url = `https://app.diosmasgym.com/post/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: state.selectedPost.title,
          text: 'Reflexión de fe — Dios Más Gym',
          url,
        });
        trackEvent('share_native', { slug });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      alert('¡Enlace copiado al portapapeles!');
    }
  };

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
        setState((p: any) => {
          if (p.selectedPost?.id === cached.id) return p;
          return { ...p, selectedPost: cached };
        });
        setReadingHistory((prev: string[]) => prev.includes(cached.id) ? prev : [...prev, cached.id]);
        return;
      }

      // If not in cache or incomplete, fetch from API
      try {
        const fetched = await fetchPostBySlug(slug);
        if (fetched) {
          setState((p: any) => {
            if (p.selectedPost?.id === fetched.id) return p;
            return { ...p, selectedPost: fetched };
          });
          setReadingHistory((prev: string[]) => prev.includes(fetched.id) ? prev : [...prev, fetched.id]);
        } else {
          setError("Lo sentimos, no pudimos encontrar esta reflexión en El Arsenal.");
        }
      } catch (e) {
        setError("Error al conectar con el servidor de contenidos.");
      }
    };
    
    load();
  }, [slug]);

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

      const canonicalPostUrl = `https://app.diosmasgym.com/post/${slug}`;

      updateMeta('og:title', title);
      updateMeta('og:description', description);
      updateMeta('og:url', canonicalPostUrl);
      updateMeta('og:image', image);
      updateMeta('description', description);

      // Dynamic Canonical Tag Injection
      if (slug) {
        let canonicalEl = document.querySelector('link[rel="canonical"]');
        if (!canonicalEl) {
          canonicalEl = document.createElement('link');
          canonicalEl.setAttribute('rel', 'canonical');
          document.head.appendChild(canonicalEl);
        }
        canonicalEl.setAttribute('href', `https://app.diosmasgym.com/post/${slug}`);
      }

      trackEvent('post_view', { title, id: p.id });
    }
  }, [state.selectedPost]);

  // Stable artist choice for the banner
  const randomArtist = useMemo(() => Math.random() > 0.5 ? 'diosmasgym' : 'juan614', [slug]);

  if (error) return <div className="py-80 bg-[#05070a] text-center px-8 text-white"><h2 className="font-serif italic text-4xl text-[#4a90d9] mb-8">{error}</h2><button onClick={() => navigate('/reflexiones')} className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 border-b border-[#4a90d9]">Regresar al Arsenal</button></div>;
  if (!state.selectedPost) return <div className="py-80 bg-[#05070a] text-center font-serif italic text-5xl opacity-20 text-[#4a90d9] animate-pulse">Sincronizando sabiduría...</div>;

  return (
    <div className="bg-[#05070a] animate-fade-in-up">
      <Helmet>
        <title>{state.selectedPost.title} | Reflexiones | Dios Mas Gym</title>
        <meta name="description" content={state.selectedPost.content.substring(0, 150).replace(/<[^>]+>/g, '') + '...'} />
        <meta property="og:title" content={`${state.selectedPost.title} | Dios Mas Gym`} />
        <meta property="og:description" content={state.selectedPost.content.substring(0, 150).replace(/<[^>]+>/g, '') + '...'} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={state.selectedPost.images?.[0]?.url || 'https://app.diosmasgym.com/logo-diosmasgym.png'} />
      </Helmet>
      <div className="relative min-h-[70vh] flex items-center overflow-hidden">
        <img src={state.selectedPost.images?.[0]?.url || ''} className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 scale-105" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a]"></div>
        <div className="section-container relative z-10 pt-40 pb-20">
          <button onClick={() => navigate(-1)} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#4a90d9] flex items-center gap-4 group">
            <div className="w-12 h-px bg-[#4a90d9] group-hover:w-20 transition-all"></div> Volver al Hub
          </button>
          <h1 className="font-serif italic text-5xl md:text-8xl mb-12 text-white leading-[1.1] max-w-5xl transition-all duration-1000">
            {state.selectedPost.title}
          </h1>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-[#4a90d9]/50">
            <span>{new Date(state.selectedPost.published).toLocaleDateString()}</span> 
            {state.selectedPost.labels?.[0] && <span>TEMA: {state.selectedPost.labels[0]}</span>}
          </div>
        </div>
      </div>
      
      <article className="py-24 md:py-40 bg-white">
          <div className="max-w-4xl mx-auto px-8 md:px-0">
              <div 
                className="blogger-body text-black text-xl md:text-2xl leading-[1.8] font-light text-justify" 
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(state.selectedPost.content || '') }}
              ></div>

              {/* ===== AMÉN + COMPARTIR ===== */}
              <div className="my-16 py-10 border-t border-b border-black/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Amén Button */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleAmen}
                    className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 shadow-lg ${
                      hasSaidAmen
                        ? 'bg-[#4a90d9] text-white shadow-[0_8px_30px_rgba(74,144,217,0.5)]'
                        : 'bg-[#f1f5f9] text-[#0b1929] hover:bg-[#4a90d9] hover:text-white hover:shadow-[0_8px_30px_rgba(74,144,217,0.3)]'
                    }`}
                  >
                    <span className={`text-2xl transition-transform duration-300 ${hasSaidAmen ? 'scale-125' : 'group-hover:scale-110'}`}>
                      {hasSaidAmen ? '🙌' : '🙏'}
                    </span>
                    <span>{hasSaidAmen ? '¡Amén dicho!' : '¡Amén!'}</span>
                  </button>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                    {amenCount.toLocaleString()} hermanos lo dijeron
                  </p>
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-black/25 mr-1 hidden sm:block">Compartir</p>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25d366] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-[#1da851] transition-all active:scale-95 shadow-md"
                  >
                    <i className="fab fa-whatsapp text-base" />
                    WhatsApp
                  </button>
                  <button
                    onClick={handleShareGeneral}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-black/5 text-black/60 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-[#0b1929] hover:text-white transition-all active:scale-95"
                  >
                    <i className="fas fa-share-nodes text-base" />
                    Compartir
                  </button>
                </div>
              </div>
              
              <div className="my-20 opacity-90">
                <ArtistPromo 
                  artist={randomArtist as any} 
                  mode="social" 
                  musicCatalog={state.musicDiosmasgym} 
                  onPlaySong={(s) => setState((p: any) => ({ ...p, activeSong: s }))} 
                />
              </div>

              <div className="my-12">
                <InlineSocialBanner />
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
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#4a90d9]/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="section-container relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                  <div>
                    <h2 className="font-serif italic text-4xl md:text-5xl text-white mb-4">Sigue Entrenando</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4a90d9]/60">Más reflexiones del Arsenal</p>
                  </div>
                  <button onClick={() => navigate('/reflexiones')} className="text-[9px] font-black uppercase tracking-[0.4em] text-white/50 border border-white/10 px-6 py-3 rounded-full hover:bg-white/5 transition-all">
                      Volver al Índice
                  </button>
              </div>

              <RelatedPosts 
                  currentPost={state.selectedPost}
                  allPosts={state.allPosts}
                  favorites={state.favorites}
                  readingHistory={readingHistory}
                  onNavigate={(slug) => navigate(`/post/${slug}`)}
                  onFav={(e, post) => {
                    e.stopPropagation();
                    setState((prev: any) => ({
                      ...prev,
                      favorites: prev.favorites.includes(post.id)
                        ? prev.favorites.filter((id: string) => id !== post.id)
                        : [...prev.favorites, post.id]
                    }));
                  }}
              />
          </div>
      </section>
    </div>
  );
};

export default PostView;
