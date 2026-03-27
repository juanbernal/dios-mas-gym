/** Version: 4.0.0 - Zen-Warrior Ultra-Premium **/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { ContentPost, AppState, AppView } from './types';

// Zen Components
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import CategoryBar from './components/CategoryBar';

const VERSES = [
  { t: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes.", r: "Josué 1:9" },
  { t: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.", r: "Isaías 41:10" },
  { t: "Todo lo puedo en Cristo que me fortalece.", r: "Filipenses 4:13" },
  { t: "Jehová es mi luz y mi salvación; ¿de quién temeré?", r: "Salmos 27:1" }
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
          error: result20.posts.length === 0 && prev.allPosts.length === 0 ? "No se pudo cargar el arsenal." : null
        }));
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: "Error de conexión." }));
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
      <div className="bg-bg-deep fixed inset-0 z-[10000] flex flex-col items-center justify-center p-10 animate-zen">
        <img src={LOGO_URL} className="w-48 md:w-64 opacity-20 contrast-0 grayscale" alt="Logo" />
        <div className="mt-20 w-48 h-[1px] bg-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-white/40 animate-[load_1.5s_infinite]"></div>
        </div>
        <style>{`@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-bg-deep text-text-primary overflow-hidden font-['Inter']">
      <Sidebar 
        currentView={state.currentView} 
        setSelectedCategory={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))}
        selectedCategory={state.selectedCategory}
        changeView={changeView}
        topCategories={categories.slice(0, 5)}
        streak={streak}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="lg:hidden bg-bg-deep border-b border-white/5 px-8 py-6 flex justify-between items-center z-50">
          <img src={LOGO_URL} className="h-6" alt="Logo" onClick={() => navigate('/')} />
          <button onClick={() => setIsSearchOpen(true)} className="text-white text-lg"><i className="fas fa-search"></i></button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="max-w-[1200px] mx-auto p-10 md:p-20">
            <Routes>
              <Route path="/" element={
                 <div className="space-y-40">
                    <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                        const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                        if (r) navigate(`/post/${getSlugFromUrl(r.url)}`);
                    }} />

                    <section className="animate-zen">
                      <div className="flex items-center justify-between mb-16 px-4">
                        <h2 className="text-3xl font-extrabold tracking-tight">Recientes</h2>
                        <button onClick={() => changeView('reflexiones')} className="text-xs font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-all">Ver todo</button>
                      </div>
                      
                      <div className="zen-grid px-4">
                        {state.allPosts.slice(0, 9).map((p) => (
                           <PostCard key={p.id} post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                             isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                               ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                             })); }} />
                        ))}
                      </div>
                    </section>
                 </div>
              } />
              <Route path="/post/:slug" element={
                <PostView state={state} setState={setState} />
              } />
              <Route path="/reflexiones" element={
                <div className="space-y-16 animate-zen">
                  <div className="flex flex-col gap-10 px-4">
                    <h1 className="text-6xl font-extrabold tracking-tight">Arsenal</h1>
                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                       <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} />
                       <input 
                         type="text" value={state.searchTerm} onChange={e => setState(p => ({ ...p, searchTerm: e.target.value }))}
                         placeholder="Buscar..." 
                         className="bg-white/5 border border-white/5 p-3 rounded-xl text-sm focus:border-white/10 outline-none transition-all w-full md:w-64"
                       />
                    </div>
                  </div>
                  <div className="zen-grid px-4">
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

      {isSearchOpen && (
        <div className="fixed inset-0 z-[12000] bg-bg-deep/98 flex items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-4xl text-center">
             <input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }}
               placeholder="Buscar..." 
               className="w-full bg-transparent border-b border-white/20 py-8 text-6xl md:text-8xl focus:outline-none placeholder-white/5" />
             <button onClick={() => setIsSearchOpen(false)} className="mt-12 text-xs font-bold uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-all">Cerrar</button>
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
  }, [slug]);

  if (!state.selectedPost) return <div className="py-80 text-center opacity-30 animate-pulse">Cargando...</div>;

  return (
    <div className="animate-zen pb-40 px-4">
      <button onClick={() => navigate(-1)} className="mb-12 text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"> <i className="fas fa-arrow-left"></i> Volver </button>
      
      <div className="zen-card relative h-[500px] mb-16 overflow-hidden">
         <img src={state.selectedPost.images?.[0]?.url || ''} className="w-full h-full object-cover" alt="" />
         <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent"></div>
         <div className="absolute inset-x-12 bottom-12">
            <h1 className="text-5xl md:text-8xl font-black mb-6 tracking-tight">{state.selectedPost.title}</h1>
            <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest opacity-60">
               <span>PUESTA: {new Date(state.selectedPost.published).toLocaleDateString()}</span>
            </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto blogger-body opacity-90 leading-relaxed text-xl font-light pb-40" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>
    </div>
  );
};

export default App;
