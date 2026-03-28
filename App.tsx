/** Version: 5.0.1 - Reflections Hub Magazine (Refinement) **/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import MusicCard from './components/MusicCard';
import CategoryBar from './components/CategoryBar';
import GlobalPlayer from './components/GlobalPlayer';
import ArtistPromo from './components/ArtistPromo';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { fetchMusicCatalog } from './services/musicService';
import { ContentPost, AppState, AppView, MusicItem } from './types';

const VERSES = [
  { t: "MIRA QUE TE MANDO QUE TE ESFUERCES Y SEAS VALIENTE; NO TEMAS NI DESMAYES.", r: "JOSUÉ 1:9" },
  { t: "NO TEMAS, PORQUE YO ESTOY CONTIGO; NO DESMAYES, PORQUE YO SOY TU DIOS.", r: "ISAÍAS 41:10" },
  { t: "TODO LO PUEDO EN CRISTO QUE ME FORTALECE.", r: "FILIPENSES 4:13" },
  { t: "JEHOVÁ ES MI LUZ Y MI SALVACIÓN; ¿DE QUIÉN TEMERÉ?", r: "SALMOS 27:1" }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    let favs = [];
    try {
      favs = JSON.parse(localStorage.getItem('dg_favs') || '[]');
      if (!Array.isArray(favs)) favs = [];
    } catch (e) { favs = []; }
    
    return {
      currentView: 'inicio',
      allPosts: [],
      musicDiosmasgym: [],
      musicJuan614: [],
      activeSong: null,
      loading: true,
      selectedPost: null,
      searchTerm: '',
      favorites: favs,
      selectedCategory: null,
      error: null,
    };
  });

  const [readingHistory, setReadingHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dg_history') || '[]'); } catch (e) { return []; }
  });

  const [showSplash, setShowSplash] = useState(true);
  const [verse, setVerse] = useState(VERSES[0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [randomPosts, setRandomPosts] = useState<ContentPost[]>([]);
  const [randomMusicSong, setRandomMusicSong] = useState<MusicItem | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    return url.split('/').pop()?.replace('.html', '') || '';
  };

  const changeView = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view, selectedPost: null }));
    navigate(`/${view === 'inicio' ? '' : view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const init = async () => {
      const cached = localStorage.getItem('dg_posts_cache');
      if (cached) {
        try {
          const initialPosts = JSON.parse(cached);
          if (initialPosts.length > 0) {
            setState(prev => ({ ...prev, allPosts: initialPosts, loading: false }));
            setShowSplash(false);
          }
        } catch (e) { }
      }

      try {
        const [arsenalResult, musicD, musicJ] = await Promise.all([
          fetchArsenalData(50),
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614')
        ]);

        const posts = arsenalResult.posts;
        
        setState(prev => ({ 
          ...prev, 
          allPosts: posts, 
          musicDiosmasgym: musicD,
          musicJuan614: musicJ,
          loading: false,
          error: null
        }));

        if (posts.length > 0) {
          const shuffled = [...posts].sort(() => 0.5 - Math.random());
          setRandomPosts(shuffled.slice(0, 3));
        }

        if (musicD.length > 0) {
          setRandomMusicSong(musicD[Math.floor(Math.random() * musicD.length)]);
        }

        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: "Error de conexión con el Hub." }));
        setShowSplash(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('dg_favs', JSON.stringify(state.favorites));
    localStorage.setItem('dg_history', JSON.stringify(readingHistory));
  }, [state.favorites, readingHistory]);

  const filteredPosts = useMemo(() => {
    let posts = state.allPosts;
    if (state.currentView === 'favoritos') posts = posts.filter(p => state.favorites.includes(p.id));
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term));
    }
    if (state.selectedCategory) posts = posts.filter(p => p.labels?.includes(state.selectedCategory!));
    return posts;
  }, [state.allPosts, state.searchTerm, state.selectedCategory, state.currentView, state.favorites]);

  const categories = useMemo(() => {
    const labelCounts: Record<string, number> = {};
    state.allPosts.forEach(p => p.labels?.forEach(label => labelCounts[label] = (labelCounts[label] || 0) + 1));
    return Object.entries(labelCounts).sort((a, b) => b[1] - a[1]).map(([label]) => label).slice(0, 10);
  }, [state.allPosts]);
  
  // SEO & Redirección de URLs antiguas (Blogger/Google)
  useEffect(() => {
    const path = location.pathname;
    
    // 1. Manejar formato de Blogger: /YYYY/MM/slug.html
    const bloggerPathMatch = path.match(/\/\d{4}\/\d{2}\/(.+)\.html/);
    if (bloggerPathMatch && bloggerPathMatch[1]) {
      const slug = bloggerPathMatch[1];
      navigate(`/post/${slug}`, { replace: true });
      return;
    }

    // 2. Manejar parámetros de móviles antiguos (?m=1)
    if (location.search.includes('m=1') && path === '/') {
      // Limpiar el parámetro m=1 para una URL más limpia
      navigate('/', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  if (showSplash) {
    return (
      <div className="bg-[#05070a] fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none overflow-hidden">
        <div className="relative">
          <div className="text-[#c5a059] font-serif italic text-8xl md:text-9xl opacity-20 animate-pulse">
            Reflections
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent"></div>
          </div>
        </div>
        <div className="mt-12 text-[9px] font-black uppercase tracking-[1em] text-[#c5a059]/40 animate-fade-in">
           Cargando el Arsenal
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-[#f8fafc] font-sans selection:bg-[#c5a059] selection:text-black">
      <Navbar currentView={state.currentView} changeView={changeView} onSearch={() => setIsSearchOpen(true)} />

      <main className="pt-20">
        <Routes>
          <Route path="/" element={
            <>
              <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                  const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                  if (r) navigate(`/post/${getSlugFromUrl(r.url)}`);
              }} />

              {/* Section: Daily Inspiration (Randomized) */}
              <section className="py-32 bg-[#0a0c14]">
                 <div className="section-container">
                    <div className="flex items-center gap-6 mb-16">
                       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
                       <h2 className="font-serif italic text-4xl text-[#c5a059]">Inspiración Diaria</h2>
                       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 gap-8 md:gap-12">
                       {randomPosts.map((p, idx) => (
                          <div key={p.id} className="col-span-12 md:col-span-4" style={{ animationDelay: `${idx * 0.2}s` }}>
                             <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                               isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} 
                               onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                 ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                               })); }} />
                          </div>
                       ))}
                    </div>
                 </div>
              </section>

              {/* Pillar: Diosmasgym Records - MUSIC CATALOG */}
              {state.musicDiosmasgym.length > 0 && (
                <section className="py-32 bg-[#05070a] border-y border-[#c5a059]/10 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
                      <div className="text-[200px] font-black leading-none">RECORDS</div>
                   </div>
                   <div className="section-container relative z-10">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
                         <div className="flex items-center gap-8">
                            <div className="w-16 h-16 rounded-full border-2 border-[#c5a059] flex items-center justify-center animate-spin-slow">
                               <div className="w-4 h-4 bg-[#c5a059] rounded-full"></div>
                            </div>
                            <div>
                               <h2 className="font-serif italic text-5xl md:text-7xl">Diosmasgym <span className="text-[#c5a059]">Records</span></h2>
                               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-2">Catálogo Musical Oficial</p>
                            </div>
                         </div>
                         
                         {/* Random Song Feature for Diosmasgym */}
                         {randomMusicSong && (
                           <div className="bg-[#c5a059]/5 border border-[#c5a059]/20 p-6 rounded-sm max-w-sm w-full animate-fade-in">
                             <div className="flex items-center gap-4 mb-4">
                                <div className="p-2 bg-[#c5a059] text-black">
                                  <i className="fas fa-random text-xs"></i>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c5a059]">Elección del Guerrero</span>
                             </div>
                             <h5 className="font-serif text-xl font-bold mb-1 truncate">{randomMusicSong.name}</h5>
                             <p className="text-[9px] text-white/40 uppercase tracking-widest mb-4">Sugerencia Aleatoria</p>
                             <button 
                                onClick={() => setState(p => ({ ...p, activeSong: randomMusicSong }))}
                                className="inline-block w-full text-center py-3 bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white transition-colors"
                             >
                               Reproducir Ahora
                             </button>
                           </div>
                         )}
                      </div>
                      
                      <div className="grid grid-cols-12 gap-6">
                         {state.musicDiosmasgym.slice(0, 6).map(item => (
                            <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                               <MusicCard 
                                 item={item} 
                                 onPlay={() => setState(p => ({ ...p, activeSong: item }))} 
                               />
                            </div>
                         ))}
                      </div>
                      
                      {state.musicDiosmasgym.length > 6 && (
                        <div className="mt-16 text-center">
                          <button 
                            onClick={() => navigate('/musica')}
                            className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] border-b border-[#c5a059]/30 pb-2 hover:text-white hover:border-white transition-all"
                          >
                            Ver Todo el Catálogo ({state.musicDiosmasgym.length})
                          </button>
                        </div>
                      )}
                   </div>
                </section>
              )}

              {/* Pillar: Juan 614 - MUSIC CATALOG */}
              {state.musicJuan614.length > 0 && (
                <section className="py-32 bg-[#0a0c14] border-b border-white/5">
                   <div className="section-container">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8">
                         <div>
                            <span className="bg-[#c5a059] text-black text-[9px] font-black px-4 py-1 tracking-[0.3em] uppercase mb-4 inline-block">Misión Especial</span>
                            <h2 className="font-serif text-5xl md:text-8xl italic">Juan 614</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-4">Discografía Estratégica</p>
                         </div>
                         <p className="text-[#94a3b8] max-w-sm text-xs leading-relaxed font-medium italic">
                            Reportes tácticos y enseñanzas directas bajo la frecuencia 6:14 para el fortalecimiento del espíritu.
                         </p>
                      </div>
                      <div className="grid grid-cols-12 gap-6">
                         {state.musicJuan614.slice(0, 6).map(item => (
                            <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                               <MusicCard 
                                 item={item} 
                                 onPlay={() => setState(p => ({ ...p, activeSong: item }))} 
                               />
                            </div>
                         ))}
                      </div>
                      {state.musicJuan614.length > 6 && (
                        <div className="mt-16 text-center">
                          <button 
                            onClick={() => navigate('/musica')}
                            className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 border-b border-white/10 pb-2 hover:text-white hover:border-white transition-all"
                          >
                            Ver Discografía Completa ({state.musicJuan614.length})
                          </button>
                        </div>
                      )}
                   </div>
                </section>
              )}

              {/* Section 1: Featured (Latest) */}
              <section className="py-32 bg-[#05070a] border-y border-white/5">
                 <div className="section-container">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                       <h2 className="font-serif text-5xl md:text-7xl leading-tight">Última <br /> <span className="italic text-[#c5a059]">Inspiración</span></h2>
                       <p className="text-[#94a3b8] max-w-sm pb-4 font-bold uppercase tracking-[0.3em] text-[10px] leading-relaxed">
                          Descubra las últimas revelaciones estratégicas para el fortalecimiento del espíritu valiente.
                       </p>
                    </div>
                    {state.allPosts[0] && (
                       <div className="grid grid-cols-12 gap-8 md:gap-16">
                          <div className="col-span-12 lg:col-span-7">
                             <PostCard post={state.allPosts[0]} onClick={() => navigate(`/post/${getSlugFromUrl(state.allPosts[0].url)}`)} 
                                isFav={state.favorites.includes(state.allPosts[0].id)} isRead={readingHistory.includes(state.allPosts[0].id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                 ...prev, favorites: prev.favorites.includes(state.allPosts[0].id) ? prev.favorites.filter(id => id !== state.allPosts[0].id) : [...prev.favorites, state.allPosts[0].id] 
                               })); }} />
                          </div>
                          <div className="col-span-12 lg:col-span-5 flex flex-col gap-16">
                             {state.allPosts.slice(1, 3).map(p => (
                                <PostCard key={p.id} post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                                  isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                    ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                                  })); }} />
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              </section>

              {/* Section: Top Tags Dynamic Blocks */}
              {categories.slice(1, 3).map((tag, sIdx) => (
                <section key={tag} className={`py-32 ${sIdx % 2 === 0 ? 'bg-[#0a0c14]' : 'bg-[#05070a]'}`}>
                   <div className="section-container">
                      <div className="flex items-center justify-between mb-16 px-4 border-l-4 border-[#c5a059]">
                         <h3 className="font-serif italic text-4xl md:text-6xl text-white">{tag}</h3>
                         <button onClick={() => { setState(p => ({ ...p, selectedCategory: tag })); navigate('/reflexiones'); }} className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] hover:text-white transition-all underline decoration-[#c5a059]/30 underline-offset-8">Material Completo</button>
                      </div>
                      <div className="magazine-grid">
                         {state.allPosts.filter(p => p.labels?.includes(tag)).slice(0, 3).map((p, idx) => (
                            <div key={p.id} className="col-span-12 lg:col-span-4">
                               <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                                 isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                   ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                                 })); }} />
                            </div>
                         ))}
                      </div>
                   </div>
                </section>
              ))}

              {/* Section: Explora por Temas Cloud */}
              <section className="py-40 bg-[#05070a] border-t border-white/5 relative overflow-hidden">
                 <div className="section-container relative z-10">
                    <div className="text-center mb-24">
                       <h2 className="font-serif italic text-6xl mb-6">Explora por Temas</h2>
                       <p className="text-[#c5a059] font-black uppercase tracking-[0.5em] text-[10px]">Identifica tu campo de batalla espiritual</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
                       {categories.map(cat => (
                          <button 
                             key={cat}
                             onClick={() => { setState(p => ({ ...p, selectedCategory: cat })); navigate('/reflexiones'); }}
                             className="px-10 py-5 bg-[#0f111a] border border-white/5 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#c5a059] hover:text-black transition-all hover:scale-110 shadow-xl rounded-full"
                          >
                             {cat}
                          </button>
                       ))}
                    </div>
                 </div>
              </section>
            </>
          } />

          <Route path="/reflexiones" element={
            <section className="py-32 min-h-screen bg-[#05070a]">
              <div className="section-container">
                <div className="mb-32 flex flex-col md:flex-row justify-between items-start md:items-end gap-16 border-b border-white/5 pb-16">
                   <h1 className="font-serif text-6xl md:text-8xl leading-none">Arsenal <br /> <span className="italic text-[#c5a059]">Completo</span></h1>
                   <div className="w-full md:w-96 relative group">
                      <input 
                         type="text" value={state.searchTerm} onChange={e => setState(p => ({ ...p, searchTerm: e.target.value }))}
                         placeholder="IDENTIFICAR OBJETIVO..." 
                         className="w-full bg-[#0f111a] border border-white/10 p-6 text-[10px] font-black tracking-[0.4em] outline-none focus:border-[#c5a059] transition-all rounded-sm uppercase"
                      />
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#c5a059] group-focus-within:w-full transition-all duration-500"></div>
                   </div>
                </div>
                
                <div className="mb-24 px-4">
                   <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} />
                </div>

                <div className="magazine-grid">
                   {filteredPosts.map(p => (
                      <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                      </div>
                   ))}
                </div>
              </div>
            </section>
          } />

          <Route path="/favoritos" element={
            <section className="py-32 min-h-screen bg-[#05070a]">
              <div className="section-container">
                <h1 className="font-serif text-7xl md:text-9xl mb-32 italic text-[#c5a059]">Mis Favoritos</h1>
                <div className="magazine-grid">
                   {filteredPosts.map(p => (
                      <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                      </div>
                   ))}
                   {filteredPosts.length === 0 && <div className="col-span-12 py-40 text-center font-serif italic text-4xl opacity-20 text-white">No tienes reflexiones guardadas aún.</div>}
                </div>
              </div>
            </section>
          } />

          <Route path="/post/:slug" element={
            <PostView state={state} setState={setState} getSlugFromUrl={getSlugFromUrl} readingHistory={readingHistory} />
          } />
        </Routes>
      </main>

      <GlobalPlayer 
        activeSong={state.activeSong} 
        onClear={() => setState(p => ({ ...p, activeSong: null }))} 
      />

      {/* Footer */}
      <footer className="py-40 bg-[#05070a] relative overflow-hidden border-t border-white/5">
         <div className="section-container text-center relative z-10">
            <h2 className="font-serif italic text-6xl md:text-8xl mb-16 text-white/90">Dios Más Gym</h2>
            <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black tracking-[0.5em] text-[#c5a059] uppercase opacity-60">
               <span>Fe</span>
               <span className="text-white/10">•</span>
               <span>Valentía</span>
               <span className="text-white/10">•</span>
               <span>Disciplina</span>
            </div>
            <div className="mt-24 h-px w-40 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto"></div>
            <p className="mt-16 text-[9px] font-bold tracking-[0.4em] text-white/20 uppercase">&copy; 2026 REFLECTIONS HUB PRO // COMANDO TÁCTICO</p>
         </div>
      </footer>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[2000] bg-[#05070a]/98 backdrop-blur-2xl flex items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-5xl text-center">
             <input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }}
               placeholder="IDENTIFIQUE OBJETIVO..." 
               className="w-full bg-transparent border-b-2 border-[#c5a059] py-12 text-6xl md:text-8xl font-serif italic text-white focus:outline-none placeholder-white/5" />
             <button onClick={() => setIsSearchOpen(false)} className="mt-20 text-[10px] font-black uppercase tracking-[0.8em] text-[#c5a059] hover:text-white transition-all animate-pulse">[ DESACTIVAR RASTREO ]</button>
           </div>
        </div>
      )}
    </div>
  );
};

const PostView: React.FC<{ state: AppState; setState: any; getSlugFromUrl: (url: string) => string; readingHistory: string[] }> = ({ state, setState, getSlugFromUrl, readingHistory }) => {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const cached = state.allPosts.find(p => getSlugFromUrl(p.url) === slug);
      if (cached && cached.content && !cached.content.endsWith('...')) {
        setState((p: any) => ({ ...p, selectedPost: cached }));
        return;
      }
      const fetched = cached ? await fetchPostById(cached.id) : await fetchPostBySlug(slug);
      if (fetched) setState((p: any) => ({ ...p, selectedPost: fetched }));
    };
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (!state.selectedPost) return <div className="py-80 bg-[#05070a] text-center font-serif italic text-5xl opacity-20 text-[#c5a059] animate-pulse">Cargando la inspiración...</div>;

  return (
    <div className="animate-fade-in-up bg-[#05070a]">
      <div className="relative min-h-[70vh] flex items-center overflow-hidden">
         <img src={state.selectedPost.images?.[0]?.url || ''} className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 transition-all duration-1000 scale-105" alt="" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/60 to-transparent"></div>
         <div className="section-container relative z-10 pt-40 pb-20">
            <button onClick={() => navigate(-1)} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] hover:text-white transition-all flex items-center gap-4 group"> 
               <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div>
               Volver al Hub 
            </button>
            <h1 className="font-serif italic text-5xl md:text-8xl mb-12 text-white leading-[1.1] drop-shadow-2xl max-w-5xl">{state.selectedPost.title}</h1>
            <div className="flex flex-wrap gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]/50">
               <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></div> PUESTA: {new Date(state.selectedPost.published).toLocaleDateString()}</span>
               {state.selectedPost.labels?.[0] && <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></div> TEMA: {state.selectedPost.labels[0]}</span>}
            </div>
         </div>
      </div>

      <article className="py-24 md:py-40 bg-white">
         <div className="max-w-4xl mx-auto px-8 md:px-0">
            <div className="blogger-body text-black text-xl md:text-2xl leading-[1.8] font-light selection:bg-[#c5a059]/30" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>
            
            {/* Promotional Banner (Randomized Artist) */}
            <ArtistPromo artist={Math.random() > 0.5 ? 'diosmasgym' : 'juan614'} />
         </div>
      </article>

      {/* Related Content */}
      <section className="py-32 bg-[#0a0c14] border-t border-[#c5a059]/10">
         <div className="section-container">
            <h3 className="font-serif italic text-4xl mb-16 text-white/40">Continuar el Entrenamiento</h3>
            <div className="grid grid-cols-12 gap-8">
               {state.allPosts
                  .filter(p => p.id !== state.selectedPost?.id && p.labels?.some(l => state.selectedPost?.labels?.includes(l)))
                  .slice(0, 3)
                  .map(p => (
                     <div key={p.id} className="col-span-12 lg:col-span-4">
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} 
                          onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                     </div>
                  ))}
            </div>
         </div>
      </section>

      <section className="py-40 bg-[#05070a] border-t border-[#c5a059]/10 relative overflow-hidden">
         <div className="gradient-glow w-[600px] h-[600px] bg-[#c5a059]/5 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
         <div className="section-container text-center relative z-10">
            <h3 className="font-serif italic text-6xl md:text-8xl mb-20 text-white/90">¿Listo para más?</h3>
            <button onClick={() => navigate('/reflexiones')} className="px-16 py-6 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.5em] hover:bg-white hover:scale-110 transition-all shadow-[0_20px_50px_rgba(197,160,89,0.2)]">Ir al Arsenal Completo</button>
         </div>
      </section>
    </div>
  );
};

export default App;
