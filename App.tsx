/** Version: 2.0.1 - Cyber-Warrior Redesign **/
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { ContentPost, AppState, AppView } from './types';

// New Components
import Sidebar from './components/Sidebar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import CategoryBar from './components/CategoryBar';

const VERSES = [
  { t: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.", r: "Isaías 41:10" },
  { t: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.", r: "Proverbios 3:5" },
  { t: "Pero los que esperan en el Señor renovarán sus fuerzas; volarán como águilas.", r: "Isaías 40:31" },
  { t: "Jehová es mi fortaleza y mi cántico; él ha sido mi salvación.", r: "Éxodo 15:2" },
  { t: "Todo lo puedo en Cristo que me fortalece.", r: "Filipenses 4:13" }
];

const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    let favs = [];
    try {
      favs = JSON.parse(localStorage.getItem('dg_favs') || '[]');
      if (!Array.isArray(favs)) favs = [];
    } catch (e) {
      favs = [];
    }
    
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
    try {
      const hist = JSON.parse(localStorage.getItem('dg_history') || '[]');
      return Array.isArray(hist) ? hist : [];
    } catch (e) {
      return [];
    }
  });

  const [streak, setStreak] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('dg_streak') || '0') || 0;
    } catch (e) {
      return 0;
    }
  });

  const [showSplash, setShowSplash] = useState(true);
  const [verse, setVerse] = useState(VERSES[0]);
  const [showFollowPopup, setShowFollowPopup] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const readerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart.replace('.html', '');
  };

  const changeView = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view, selectedPost: null }));
    navigate(`/${view === 'inicio' ? '' : view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const path = location.pathname;
    const validViews: AppView[] = ['inicio', 'reflexiones', 'categorias', 'favoritos', 'musica', 'testimonios', 'comunidad', 'acerca'];
    const currentPathView = path.substring(1) as AppView;

    if (path === '/' || path === '') {
      setState(prev => ({ ...prev, currentView: 'inicio' }));
    } else if (validViews.includes(currentPathView)) {
      setState(prev => ({ ...prev, currentView: currentPathView }));
    }
  }, [location.pathname]);

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
          nextPageToken: result20.nextPageToken 
        }));
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);

        setTimeout(async () => {
          try {
            const result500 = await fetchArsenalData(500);
            if (result500.posts.length > 0) {
              setState(prev => ({ ...prev, allPosts: result500.posts }));
            }
          } catch (e) { }
        }, 2000);
      } catch (err) {
        setState(prev => ({ ...prev, loading: false }));
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
    if (state.currentView === 'favoritos') {
      posts = posts.filter(p => state.favorites.includes(p.id));
    }
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      posts = posts.filter(p => p.title.toLowerCase().includes(term) || p.content.toLowerCase().includes(term));
    }
    if (state.selectedCategory) {
      posts = posts.filter(p => p.labels?.includes(state.selectedCategory!));
    }
    return posts;
  }, [state.allPosts, state.searchTerm, state.selectedCategory, state.currentView, state.favorites]);

  const categories = useMemo(() => {
    const labelCounts: Record<string, number> = {};
    state.allPosts.forEach(p => p.labels?.forEach(label => labelCounts[label] = (labelCounts[label] || 0) + 1));
    return Object.entries(labelCounts).sort((a, b) => b[1] - a[1]).map(([label]) => label).slice(0, 10);
  }, [state.allPosts]);

  const toggleFavorite = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState(prev => {
      const isFav = prev.favorites.includes(postId);
      return { ...prev, favorites: isFav ? prev.favorites.filter(id => id !== postId) : [...prev.favorites, postId] };
    });
  };

  const sharePost = async (platform: 'wa' | 'copy' | 'native') => {
    if (!state.selectedPost) return;
    const { url, title } = state.selectedPost;
    const text = `💪 Forjando mi fe en DiosMasGym: ${title}`;
    
    if (platform === 'native' && navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) { }
    }

    if (platform === 'wa') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    if (platform === 'copy') {
      await navigator.clipboard.writeText(url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  if (showSplash) {
    return (
      <div className="bg-bg-deep fixed inset-0 z-[10000] flex flex-col items-center justify-center p-10">
        <div className="relative mb-12 flex flex-col items-center">
           <img src={LOGO_URL} className="w-64 md:w-80 drop-shadow-[0_0_40px_rgba(59,130,246,0.5)] animate-pulse" alt="Logo" />
           <div className="mt-12 flex flex-col items-center gap-3">
              <div className="h-1.5 w-48 bg-slate-900 rounded-full overflow-hidden border border-glass-border">
                <div className="h-full bg-accent-blue shadow-[0_0_15px_var(--accent-blue)] animate-[loading_2s_ease-in-out]"></div>
              </div>
              <p className="subtitle-cyber opacity-50 mt-4">Sincronizando Poder</p>
           </div>
        </div>
        <style>{`@keyframes loading { 0% { width: 0; } 100% { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-bg-deep text-text-primary overflow-hidden font-['Poppins']">
      
      <Sidebar 
        currentView={state.currentView} 
        selectedCategory={state.selectedCategory}
        changeView={changeView}
        setSelectedCategory={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))}
        topCategories={categories.slice(0, 5)}
        streak={streak}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Mobile Header Simplified */}
        <header className="lg:hidden bg-bg-deep/80 backdrop-blur-xl border-b border-glass-border px-6 py-5 flex justify-between items-center z-50 sticky top-0">
          <div className="flex items-center gap-3" onClick={() => navigate('/')}>
            <img src={LOGO_URL} className="h-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" alt="Logo" />
          </div>
          <button onClick={() => setIsSearchOpen(true)} className="w-11 h-11 rounded-2xl bg-glass-bg border border-glass-border flex items-center justify-center text-accent-blue">
            <i className="fas fa-search"></i>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-20 bg-[#020617] relative no-scrollbar">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-blue/5 blur-[120px] rounded-full -z-10 translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="max-w-7xl mx-auto">
            {state.loading && state.allPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-16 h-16 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin mb-8"></div>
                <p className="subtitle-cyber">Escaneando Arsenal...</p>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={
                  <div className="space-y-32">
                    <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                        const random = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                        if (random) navigate(`/post/${getSlugFromUrl(random.url)}`);
                    }} />

                    <section className="animate-fade-in-up">
                      <div className="flex items-center gap-4 mb-12">
                        <h2 className="h1-cyber text-3xl"><i className="fas fa-crown text-accent-orange mr-4"></i>Bendición Elite</h2>
                        <div className="h-px flex-1 bg-glass-border"></div>
                      </div>
                      <CategoryBar 
                        categories={categories} 
                        selectedCategory={state.selectedCategory} 
                        onSelect={(cat) => { setState(prev => ({ ...prev, selectedCategory: cat })); navigate('/reflexiones'); }} 
                      />
                    </section>

                    <section className="animate-fade-in-up">
                      <div className="flex items-center justify-between mb-16">
                        <h2 className="h1-cyber text-3xl"><i className="fas fa-bolt text-accent-blue mr-4"></i>Arsenal Reciente</h2>
                        <button onClick={() => navigate('/reflexiones')} className="subtitle-cyber hover:text-white transition-colors">Ver Todo</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {state.allPosts.slice(0, 6).map(p => (
                          <PostCard key={p.id} post={p} onClick={() => {
                            const slug = getSlugFromUrl(p.url);
                            navigate(`/post/${slug}`);
                          }} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => toggleFavorite(p.id, e)} />
                        ))}
                      </div>
                    </section>
                  </div>
                } />
                <Route path="/post/:slug" element={
                  <PostView 
                    state={state} 
                    setState={setState} 
                    readingHistory={readingHistory} 
                    setReadingHistory={setReadingHistory} 
                    setStreak={setStreak} 
                    readerRef={readerRef} 
                    setReadProgress={setReadProgress} 
                    getSlugFromUrl={getSlugFromUrl} 
                    sharePost={sharePost}
                    copyFeedback={copyFeedback}
                  />
                } />
                <Route path="/reflexiones" element={
                  <div className="animate-fade-in-up">
                    <div className="mb-20">
                      <h1 className="h1-cyber text-7xl md:text-9xl mb-6">Arsenal</h1>
                      <div className="flex flex-col md:flex-row gap-8 justify-between items-end">
                        <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} />
                        <div className="relative w-full md:w-96">
                           <input 
                              type="text" value={state.searchTerm} 
                              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                              placeholder="Buscar en el arsenal..." 
                              className="w-full bg-glass-bg border border-glass-border rounded-2xl py-4 px-6 text-sm focus:border-accent-blue transition-all" 
                           />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-32">
                        {filteredPosts.map(p => (
                           <PostCard key={p.id} post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => toggleFavorite(p.id, e)} />
                        ))}
                    </div>
                  </div>
                } />
              </Routes>
            )}
          </div>
        </main>
      </div>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[6000] bg-bg-deep/95 backdrop-blur-3xl p-8 flex flex-col items-center justify-center animate-fade-in">
           <button onClick={() => setIsSearchOpen(false)} className="absolute top-10 right-10 text-3xl"><i className="fas fa-times"></i></button>
           <input 
              autoFocus type="text" value={state.searchTerm} 
              onChange={(e) => { setState(prev => ({ ...prev, searchTerm: e.target.value })); navigate('/reflexiones'); }}
              placeholder="¿Qué buscas, guerrero?" 
              className="w-full max-w-2xl bg-transparent border-b-4 border-accent-blue py-8 text-4xl md:text-6xl font-black uppercase tracking-tighter text-white focus:outline-none placeholder-slate-800"
           />
           <button onClick={() => setIsSearchOpen(false)} className="mt-20 btn-cyber bg-accent-blue px-12 py-6 rounded-3xl h1-cyber text-sm tracking-widest">Ver Resultados</button>
        </div>
      )}
    </div>
  );
};

// Simplified PostView
const PostView: React.FC<{
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  readingHistory: string[];
  setReadingHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  readerRef: React.RefObject<HTMLDivElement>;
  setReadProgress: React.Dispatch<React.SetStateAction<number>>;
  getSlugFromUrl: (url: string) => string;
  sharePost: (p: 'wa' | 'copy' | 'native') => void;
  copyFeedback: boolean;
}> = ({ state, setState, readingHistory, setReadingHistory, setStreak, readerRef, setReadProgress, getSlugFromUrl, sharePost, copyFeedback }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const loadPost = async () => {
      if (!slug) return;
      const existingPost = state.allPosts.find(p => getSlugFromUrl(p.url) === slug);
      if (existingPost && existingPost.content && !existingPost.content.endsWith('...')) {
        setState(prev => ({ ...prev, selectedPost: existingPost }));
        return;
      }
      
      const fetched = existingPost ? await fetchPostById(existingPost.id) : await fetchPostBySlug(slug);
      if (fetched) {
        setState(prev => ({ 
          ...prev, selectedPost: fetched,
          allPosts: prev.allPosts.some(p => p.id === fetched.id) ? prev.allPosts.map(p => p.id === fetched.id ? fetched : p) : [fetched, ...prev.allPosts]
        }));
      }
    };
    loadPost();
  }, [slug, state.allPosts.length]);

  if (!state.selectedPost) return <div className="py-40 text-center"><i className="fas fa-spinner animate-spin text-4xl text-accent-blue"></i></div>;

  return (
    <div className="animate-fade-in-up pb-40" ref={readerRef}>
      <button onClick={() => navigate(-1)} className="mb-12 flex items-center gap-4 text-text-secondary hover:text-accent-blue transition-colors subtitle-cyber">
        <i className="fas fa-arrow-left"></i> Volver al Arsenal
      </button>
      
      <div className="relative h-[400px] md:h-[600px] rounded-[4rem] overflow-hidden mb-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border border-glass-border">
        <img src={state.selectedPost.images?.[0]?.url || ''} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/20 to-transparent"></div>
        <div className="absolute bottom-16 left-16 right-16">
          <h1 className="h1-cyber text-4xl md:text-8xl mb-4">{state.selectedPost.title}</h1>
          <div className="flex items-center gap-6">
             <span className="subtitle-cyber text-accent-blue">{state.selectedPost.author.displayName}</span>
             <span className="w-1 h-1 bg-glass-border rounded-full"></span>
             <span className="subtitle-cyber opacity-50">{new Date(state.selectedPost.published).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div 
        className="max-w-4xl mx-auto blogger-body prose prose-invert prose-blue" 
        dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}
      ></div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 cyber-glass p-3 rounded-[3rem] border border-accent-blue/20 shadow-2xl flex items-center gap-3 z-[3000]">
          <button onClick={() => sharePost('native')} className="btn-cyber bg-accent-blue px-12 py-5 rounded-[2rem] h1-cyber text-[10px] tracking-widest flex items-center gap-4">
            <i className="fas fa-share-nodes"></i> Compartir
          </button>
          <button onClick={() => sharePost('copy')} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${copyFeedback ? 'bg-green-600' : 'bg-white/5 hover:bg-white/10'}`}>
            <i className={copyFeedback ? "fas fa-check" : "fas fa-link"}></i>
          </button>
      </div>
    </div>
  );
};

export default App;
