/** Version: 5.0.1 - Reflections Hub Magazine (Refinement) **/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { ContentPost, AppState, AppView } from './types';

// Reflections Hub Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import CategoryBar from './components/CategoryBar';

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
        const result20 = await fetchArsenalData(30);
        setState(prev => ({ 
          ...prev, 
          allPosts: result20.posts.length > 0 ? result20.posts : prev.allPosts, 
          loading: false,
          error: result20.posts.length === 0 && prev.allPosts.length === 0 ? "No se pudo sincronizar el archivo." : null
        }));
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

  if (showSplash) {
    return (
      <div className="bg-bg-deep fixed inset-0 z-[10000] flex items-center justify-center font-serif italic text-white/10 text-9xl select-none">
        Reflections
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep text-text-primary font-['Inter'] selection:bg-accent-blue selection:text-white">
      <Navbar currentView={state.currentView} changeView={changeView} onSearch={() => setIsSearchOpen(true)} />

      <main className="pt-24">
        <Routes>
          <Route path="/" element={
            <>
              <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                  const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                  if (r) navigate(`/post/${getSlugFromUrl(r.url)}`);
              }} />

              {/* Section 1: Featured */}
              <section className="section-wrapper bg-bg-accent">
                 <div className="section-container">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                       <h2 className="h2-display max-w-xl pr-10">Última <br /> <span className="serif-italic text-accent-blue">Inspiración</span></h2>
                       <p className="text-white/40 max-w-md pb-4 font-semibold uppercase tracking-widest text-[11px]">Explora el último contenido añadido a nuestro arsenal de fe y valentía.</p>
                    </div>
                    {state.allPosts[0] && (
                       <div className="grid grid-cols-12 gap-10">
                          <div className="col-span-12 lg:col-span-8">
                             <PostCard post={state.allPosts[0]} onClick={() => navigate(`/post/${getSlugFromUrl(state.allPosts[0].url)}`)} 
                               isFav={state.favorites.includes(state.allPosts[0].id)} isRead={readingHistory.includes(state.allPosts[0].id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                 ...prev, favorites: prev.favorites.includes(state.allPosts[0].id) ? prev.favorites.filter(id => id !== state.allPosts[0].id) : [...prev.favorites, state.allPosts[0].id] 
                               })); }} />
                          </div>
                          <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
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

              {/* Section 2: Explorer */}
              <section className="section-wrapper">
                 <div className="section-container">
                    <div className="mb-20">
                       <h2 className="h2-display serif-italic">El Archivo</h2>
                       <div className="border-t border-white/5 pt-10">
                          <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => { setState(p => ({ ...p, selectedCategory: cat })); changeView('reflexiones'); }} />
                       </div>
                    </div>
                    
                    <div className="magazine-grid">
                       {state.allPosts.slice(3, 15).map((p, idx) => (
                          <div key={p.id} className={idx % 5 === 0 ? "col-span-12 lg:col-span-8" : "col-span-12 lg:col-span-4"}>
                             <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                               isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                 ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                               })); }} />
                          </div>
                       ))}
                    </div>
                 </div>
              </section>
            </>
          } />

          <Route path="/reflexiones" element={
            <section className="section-wrapper min-h-screen">
              <div className="section-container">
                <div className="mb-24 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
                   <h1 className="h1-display">Arsenal <br /> <span className="serif-italic text-accent-blue">Completo</span></h1>
                   <div className="w-full md:w-80">
                      <input 
                         type="text" value={state.searchTerm} onChange={e => setState(p => ({ ...p, searchTerm: e.target.value }))}
                         placeholder="IDENTIFICAR OBJETIVO..." 
                         className="w-full bg-white/5 border-b border-white/20 p-4 text-[11px] font-black tracking-widest outline-none focus:border-accent-blue transition-all"
                      />
                   </div>
                </div>
                
                <div className="mb-20">
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

          <Route path="/post/:slug" element={
            <PostView state={state} setState={setState} />
          } />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="py-32 border-t border-white/5 bg-bg-accent">
         <div className="section-container text-center">
            <h2 className="h2-display serif-italic mb-12">Dios Más Gym</h2>
            <div className="flex justify-center gap-10 text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">
               <span>Fe</span>
               <span className="text-accent-blue">•</span>
               <span>Valentía</span>
               <span className="text-accent-blue">•</span>
               <span>Disciplina</span>
            </div>
            <p className="mt-20 opacity-20 text-[9px] font-black tracking-widest">&copy; 2026 COMANDO TÁCTICO ESPIRITUAL</p>
         </div>
      </footer>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[2000] bg-bg-deep/98 flex items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-5xl text-center">
             <input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }}
               placeholder="IDENTIFIQUE OBJETIVO..." 
               className="w-full bg-transparent border-b-2 border-accent-blue py-10 h1-display text-white focus:outline-none placeholder-white/5 italic serif-italic" />
             <button onClick={() => setIsSearchOpen(false)} className="mt-16 text-[10px] font-black uppercase tracking-[0.6em] text-accent-blue hover:text-white transition-all">[ CERRAR RASTREO ]</button>
           </div>
        </div>
      )}
    </div>
  );
};

const PostView: React.FC<{ state: AppState; setState: any }> = ({ state, setState }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const getSlug = (url: string) => url.split('/').pop()?.replace('.html', '') || '';

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const cached = state.allPosts.find(p => getSlug(p.url) === slug);
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

  if (!state.selectedPost) return <div className="py-80 text-center serif-italic text-5xl opacity-20 animate-pulse">Cargando la inspiración...</div>;

  return (
    <div className="animate-fade-in-up">
      <div className="relative h-screen">
         <img src={state.selectedPost.images?.[0]?.url || ''} className="w-full h-full object-cover grayscale opacity-30" alt="" />
         <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent"></div>
         <div className="section-container absolute inset-x-0 bottom-24">
            <button onClick={() => navigate(-1)} className="mb-12 text-[10px] font-black uppercase tracking-widest text-accent-blue hover:text-white transition-all"> <i className="fas fa-arrow-left"></i> Volver al Hub </button>
            <h1 className="h1-display mb-10 text-white drop-shadow-2xl serif-italic">{state.selectedPost.title}</h1>
            <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest text-white/50">
               <span>PUESTA: {new Date(state.selectedPost.published).toLocaleDateString()}</span>
               {state.selectedPost.labels?.[0] && <span>TEMA: {state.selectedPost.labels[0]}</span>}
            </div>
         </div>
      </div>

      <article className="section-wrapper bg-white">
         <div className="max-w-4xl mx-auto blogger-body text-black text-2xl leading-relaxed font-light py-40 selection:bg-accent-blue selection:text-white" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>
      </article>

      <section className="section-wrapper bg-bg-accent">
         <div className="section-container text-center">
            <h3 className="h2-display serif-italic mb-12">¿Listo para más?</h3>
            <button onClick={() => navigate('/reflexiones')} className="px-12 py-5 bg-white text-black font-extrabold uppercase text-[11px] tracking-[0.3em] hover:bg-accent-blue hover:text-white transition-all shadow-2xl">Continuar Explorando</button>
         </div>
      </section>
    </div>
  );
};

export default App;
