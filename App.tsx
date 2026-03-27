/** Version: 3.0.0 - Tactical War-Room & Unified Diagnostic **/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { ContentPost, AppState, AppView } from './types';

// Tactical Components
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import CategoryBar from './components/CategoryBar';

const VERSES = [
  { t: "MIRA QUE TE MANDO QUE TE ESFUERCES Y SEAS VALIENTE; NO TEMAS NI DESMAYES.", r: "JOSUÉ 1:9" },
  { t: "NO TEMAS, PORQUE YO ESTOY CONTIGO; NO DESMAYES, PORQUE YO SOY TU DIOS.", r: "ISAÍAS 41:10" },
  { t: "TODO LO PUEDO EN CRISTO QUE ME FORTALECE.", r: "FILIPENSES 4:13" },
  { t: "JEHOVÁ ES MI LUZ Y MI SALVACIÓN; ¿DE QUIÉN TEMERÉ?", r: "SALMOS 27:1" }
];

const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

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

  const [streak, setStreak] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('dg_streak') || '0') || 0; } catch (e) { return 0; }
  });

  const [showSplash, setShowSplash] = useState(true);
  const [verse, setVerse] = useState(VERSES[0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  const navigate = useNavigate();

  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    return url.split('/').pop()?.replace('.html', '') || '';
  };

  const changeView = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view, selectedPost: null }));
    navigate(`/${view === 'inicio' ? '' : view}`);
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
        const result20 = await fetchArsenalData(20);
        setState(prev => ({ 
          ...prev, 
          allPosts: result20.posts.length > 0 ? result20.posts : prev.allPosts, 
          loading: false,
          error: result20.posts.length === 0 && prev.allPosts.length === 0 ? "SINCRONIZACIÓN DE ARSENAL FALLIDA" : null
        }));
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
      } catch (err: any) {
        setState(prev => ({ ...prev, loading: false, error: err.message || "ERROR DE TRANSMISIÓN" }));
        setShowSplash(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('dg_favs', JSON.stringify(state.favorites));
    localStorage.setItem('dg_history', JSON.stringify(readingHistory));
    localStorage.setItem('dg_streak', streak.toString());
  }, [state.favorites, readingHistory, streak]);

  const onLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount >= 5) {
      setShowDiagnostic(true);
      setLogoClicks(0);
    }
  };

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
      <div className="bg-bg-deep fixed inset-0 z-[10000] flex flex-col items-center justify-center p-10 font-['Rajdhani']">
        <div className="scanline"></div>
        <img src={LOGO_URL} className="w-64 md:w-80 relative z-10 animate-pulse contrast-150" alt="Logo" />
        <div className="mt-20 flex flex-col items-center gap-6 relative z-10 w-full max-w-sm">
           <div className="h-[1px] w-full bg-white/5 relative">
             <div className="absolute inset-0 bg-accent-blue shadow-[0_0_20px_var(--accent-blue)] animate-[loading_2s_infinite]"></div>
           </div>
           <p className="tech-text text-[10px] tracking-[1em] text-accent-blue-bright">INICIALIZANDO COMANDO TÁCTICO</p>
        </div>
        <style>{`@keyframes loading { 0% { left: 0%; width: 0%; } 50% { left: 0%; width: 100%; } 100% { left: 100%; width: 0%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-bg-deep text-text-primary overflow-hidden font-['Poppins'] relative">
      <div className="scanline"></div>
      
      <Sidebar 
        currentView={state.currentView} 
        setSelectedCategory={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))}
        selectedCategory={state.selectedCategory}
        changeView={changeView}
        topCategories={categories.slice(0, 5)}
        streak={streak}
        onLogoClick={onLogoClick}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden backdrop-blur-sm">
        <header className="lg:hidden bg-bg-panel border-b border-white/5 px-8 py-6 flex justify-between items-center z-50">
          <img src={LOGO_URL} className="h-8" alt="Logo" onClick={() => navigate('/')} />
          <div className="flex items-center gap-4">
             <span className="status-light online h-2 w-2"></span>
             <button onClick={() => setIsSearchOpen(true)} className="text-accent-blue text-xl"><i className="fas fa-search"></i></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="max-w-[1400px] mx-auto p-6 md:p-16">
            <Routes>
              <Route path="/" element={
                 <div className="space-y-32">
                    <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                        const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                        if (r) navigate(`/post/${getSlugFromUrl(r.url)}`);
                    }} />

                    {state.error && state.allPosts.length === 0 && (
                      <div className="tactical-box p-12 text-center border-red-500/30">
                        <i className="fas fa-satellite-dish text-6xl text-red-500/50 mb-8 animate-pulse"></i>
                        <h2 className="tech-text text-3xl mb-4 text-red-500">ERROR DE ENLACE</h2>
                        <p className="text-text-dim tech-text text-[11px] mb-8">NO SE DETECTA ARSENAL EN LA NUBE. VERIFICA DIAGNÓSTICO (5 CLICKS EN LOGO).</p>
                        <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-black tech-text text-xs font-bold hover:bg-accent-blue hover:text-white transition-all">REINTENTAR</button>
                      </div>
                    )}

                    <section>
                      <div className="flex items-center gap-8 mb-16 tech-text">
                        <span className="h-4 w-1.5 bg-accent-blue"></span>
                        <h2 className="text-3xl font-bold tracking-widest text-accent-blue-bright">BASE DE DATOS // ENTRADAS RECIENTES</h2>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                      </div>
                      
                      <div className="tactical-grid">
                        {state.allPosts.slice(0, 12).map((p, idx) => (
                           <div key={p.id} className={idx % 7 === 0 ? 'span-2 row-2 hidden md:block' : ''}>
                             <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                               isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                 ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                               })); }} />
                           </div>
                        ))}
                      </div>
                    </section>
                 </div>
              } />
              <Route path="/post/:slug" element={
                <PostView state={state} setState={setState} readingHistory={readingHistory} setReadingHistory={setReadingHistory} />
              } />
              <Route path="/reflexiones" element={
                <div className="space-y-16 animate-fade-in-up">
                  <div className="flex flex-col gap-10">
                    <h1 className="h1-tactical opacity-10 select-none absolute top-10 right-10">DATABASE</h1>
                    <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} />
                    <div className="max-w-xl w-full">
                       <input 
                         type="text" value={state.searchTerm} onChange={e => setState(p => ({ ...p, searchTerm: e.target.value }))}
                         placeholder="BUSCAR EN EL ARCHIVO..." 
                         className="w-full bg-white/5 border border-white/10 p-5 tech-text text-sm focus:border-accent-blue outline-none transition-all placeholder-white/20"
                       />
                    </div>
                  </div>
                  <div className="tactical-grid">
                     {filteredPosts.map(p => (
                        <PostCard key={p.id} post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                     ))}
                  </div>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>

      {showDiagnostic && (
        <div className="fixed inset-0 z-[11000] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-10 font-['Rajdhani']">
           <div className="tactical-box max-w-2xl w-full p-12 bg-bg-panel animate-fade-in">
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-3xl font-bold text-accent-blue-bright tech-text tracking-widest">DIAGNÓSTICO DEL SISTEMA</h2>
                 <button onClick={() => setShowDiagnostic(false)} className="text-white hover:text-red-500 transition-colors"><i className="fas fa-times text-2xl"></i></button>
              </div>
              <div className="space-y-6 tech-text text-sm mb-12 border-y border-white/5 py-8">
                 <div className="flex justify-between"><span>MODO:</span> <span className="text-blue-400">OPERACIONES TÁCTICAS</span></div>
                 <div className="flex justify-between"><span>VERCEL PROXY:</span> <span className={state.allPosts.length > 0 ? "text-green-500" : "text-red-500"}>{state.allPosts.length > 0 ? "ENLAZADO" : "DESCONECTADO (404/500)"}</span></div>
                 <div className="flex justify-between"><span>ARSENAL CACHE:</span> <span>{state.allPosts.length} ITEMS</span></div>
                 <div className="flex justify-between"><span>ESTADO API:</span> <span className="text-orange-500">{state.error || "SIN ERRORES"}</span></div>
              </div>
              <p className="text-[11px] text-text-dim leading-relaxed mb-10 opacity-70">
                 DATO CRÍTICO: SI LOS ARTÍCULOS NO APARECEN, ASEGÚRESE QUE 'BLOGGER_API_KEY' Y 'BLOG_ID' ESTÉN CONFIGURADAS EN VERCEL. SI TRABAJA CON VITE, RECUERDE QUE EL PROXY SOLO FUNCIONA EN PRODUCCIÓN.
              </p>
              <button onClick={() => window.location.reload()} className="w-full bg-accent-blue py-5 tech-text font-bold tracking-widest hover:bg-white hover:text-black transition-all">REINICIAR ESCANEO</button>
           </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-[12000] bg-bg-deep/95 backdrop-blur-2xl flex items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-4xl">
             <input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }}
               placeholder="IDENTIFIQUE OBJETIVO..." 
               className="w-full bg-transparent border-b-4 border-accent-blue py-10 tech-text text-5xl md:text-8xl focus:outline-none placeholder-white/5 italic" />
             <button onClick={() => setIsSearchOpen(false)} className="mt-10 tech-text text-accent-blue hover:text-white transition-all text-xs tracking-widest">[ CERRAR RASTREO ]</button>
           </div>
        </div>
      )}
    </div>
  );
};

// Simplified PostView for Tactical Look
const PostView: React.FC<{ state: AppState; setState: any; readingHistory: string[]; setReadingHistory: any }> = ({ state, setState, readingHistory, setReadingHistory }) => {
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
  }, [slug]);

  if (!state.selectedPost) return <div className="py-80 text-center tech-text text-accent-blue animate-pulse">CARGANDO TRANSMISIÓN...</div>;

  return (
    <div className="animate-fade-in-up pb-40">
      <button onClick={() => navigate(-1)} className="mb-12 tech-text text-[10px] text-accent-blue hover:text-white transition-all"> <i className="fas fa-angle-left"></i> VOLVER A LA BASE </button>
      
      <div className="tactical-box relative h-96 md:h-[500px] mb-16 overflow-hidden">
         <img src={state.selectedPost.images?.[0]?.url || ''} className="w-full h-full object-cover opacity-30 grayscale" alt="" />
         <div className="absolute inset-x-8 bottom-8">
            <h1 className="tech-text text-4xl md:text-7xl font-bold italic tracking-tighter leading-tight">{state.selectedPost.title}</h1>
            <div className="flex gap-6 mt-6 tech-text text-[10px] opacity-40">
               <span>FECHA: {new Date(state.selectedPost.published).toLocaleDateString()}</span>
               <span>ID: {state.selectedPost.id}</span>
            </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto blogger-body opacity-90 leading-relaxed text-lg pb-40" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>
    </div>
  );
};

export default App;
