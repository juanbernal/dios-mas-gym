/** Version: 2.1.0 - Warrior Brutalism & Robust Feedback **/
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
  const [copyFeedback, setCopyFeedback] = useState(false);

  const readerRef = useRef<HTMLDivElement>(null);
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
      // 1. Splash & Cache
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

      // 2. Fresh Data
      try {
        const result20 = await fetchArsenalData(20);
        setState(prev => ({ 
          ...prev, 
          allPosts: result20.posts.length > 0 ? result20.posts : prev.allPosts, 
          loading: false,
          error: result20.posts.length === 0 && prev.allPosts.length === 0 ? "Sin arsenal disponible. Verifica la API." : null
        }));
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: "Error de conexión con el arsenal." }));
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
    const text = `🔥 Mensaje de DiosMasGym: ${title}`;
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
        <h1 className="h1-brutal text-8xl md:text-[15rem] opacity-5 absolute select-none text-white overflow-hidden whitespace-nowrap">DIOSMASGYM DIOSMASGYM</h1>
        <img src={LOGO_URL} className="w-64 md:w-80 relative z-10 drop-shadow-[0_0_100px_rgba(59,130,246,0.3)] animate-pulse" alt="Logo" />
        <div className="mt-20 flex flex-col items-center gap-6 relative z-10">
           <div className="h-[2px] w-64 bg-white/5 overflow-hidden">
             <div className="h-full bg-accent-blue shadow-[0_0_20px_var(--accent-blue)] animate-[load_1.5s_infinite]"></div>
           </div>
           <p className="text-[10px] font-black tracking-[0.8em] text-accent-blue uppercase">Preparando el Arsenal</p>
        </div>
        <style>{`@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
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
        <header className="lg:hidden bg-bg-deep/90 border-b border-white/5 px-6 py-6 flex justify-between items-center z-50">
          <img src={LOGO_URL} className="h-8" alt="Logo" onClick={() => navigate('/')} />
          <button onClick={() => setIsSearchOpen(true)} className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-accent-blue">
            <i className="fas fa-search"></i>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <div className="max-w-[1600px] mx-auto p-6 md:p-20">
            {state.error && state.allPosts.length === 0 ? (
              <WarriorEmptyState error={state.error} onRetry={() => window.location.reload()} />
            ) : (
              <Routes>
                <Route path="/" element={
                  <div className="space-y-40">
                    <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => {
                        const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
                        if (r) navigate(`/post/${getSlugFromUrl(r.url)}`);
                    }} />

                    <section className="animate-fade-in-up">
                      <div className="flex items-center gap-8 mb-20 group">
                        <div className="h-12 w-2 bg-accent-blue"></div>
                        <h2 className="h1-brutal text-4xl md:text-6xl tracking-tighter">EL ARSENAL</h2>
                        <div className="h-[2px] flex-1 bg-white/5"></div>
                      </div>
                      
                      <div className="warrior-grid">
                        {state.allPosts.slice(0, 12).map((p, idx) => (
                           <div key={p.id} className={idx % 5 === 0 ? 'magazine-span-2 magazine-row-2' : ''}>
                             <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                               isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => toggleFavorite(p.id, e)} />
                           </div>
                        ))}
                      </div>
                    </section>
                  </div>
                } />
                <Route path="/post/:slug" element={
                  <PostView 
                    state={state} setState={setState} 
                    readingHistory={readingHistory} setReadingHistory={setReadingHistory} 
                    setStreak={setStreak} readerRef={readerRef} sharePost={sharePost} copyFeedback={copyFeedback}
                  />
                } />
                <Route path="/reflexiones" element={
                  <div className="animate-fade-in-up pb-40">
                    <div className="mb-32">
                      <h1 className="h1-brutal text-8xl md:text-[12rem] text-stroke mb-8">ARCHIVO</h1>
                      <div className="flex flex-col md:flex-row gap-8 justify-between items-end">
                        <CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} />
                        <div className="relative w-full md:w-96">
                           <input 
                              type="text" value={state.searchTerm} 
                              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                              placeholder="BUSCAR EN EL ARCHIVO..." 
                              className="w-full bg-white/5 border-2 border-white/10 p-6 text-sm font-black focus:border-accent-blue transition-all uppercase italic" 
                           />
                        </div>
                      </div>
                    </div>
                    <div className="warrior-grid">
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
        <div className="fixed inset-0 z-[6000] bg-bg-deep/98 backdrop-blur-3xl p-10 flex flex-col items-center justify-center animate-fade-in">
           <button onClick={() => setIsSearchOpen(false)} className="absolute top-10 right-10 text-4xl text-accent-blue hover:scale-125 transition-all"><i className="fas fa-times"></i></button>
           <h2 className="text-[10px] font-black tracking-[1em] text-accent-blue mb-10 uppercase italic">Iniciando Rastreo</h2>
           <input 
              autoFocus type="text" value={state.searchTerm} 
              onChange={(e) => { setState(prev => ({ ...prev, searchTerm: e.target.value })); navigate('/reflexiones'); }}
              placeholder="¿BUSCANDO ALGO?" 
              className="w-full max-w-4xl bg-transparent border-b-8 border-accent-blue py-10 text-6xl md:text-[10rem] font-black uppercase italic tracking-tighter text-white focus:outline-none placeholder-white/5"
           />
        </div>
      )}
    </div>
  );
};

const WarriorEmptyState: React.FC<{ error: string, onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-60 text-center animate-fade-in">
    <div className="w-32 h-32 border-4 border-dashed border-red-500/50 rounded-full flex items-center justify-center mb-12 animate-spin-slow">
       <i className="fas fa-exclamation-triangle text-4xl text-red-500"></i>
    </div>
    <h2 className="h1-brutal text-5xl mb-6 text-red-500">ARSENAL VACÍO</h2>
    <p className="text-text-secondary max-w-xl mb-12 font-black uppercase tracking-widest text-xs leading-relaxed">
       {error}. REQUERIDO: Clave de API en Vercel. Si acabas de configurar, espera 2 minutos y reintenta.
    </p>
    <button onClick={onRetry} className="px-12 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.4em] hover:bg-accent-blue hover:text-white transition-all">
       REINTENTAR CONEXIÓN
    </button>
  </div>
);

const PostView: React.FC<{
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>;
  readingHistory: string[]; setReadingHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  readerRef: React.RefObject<HTMLDivElement>;
  sharePost: (p: 'wa' | 'copy' | 'native') => void; copyFeedback: boolean;
}> = ({ state, setState, readingHistory, setReadingHistory, setStreak, readerRef, sharePost, copyFeedback }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const getSlug = (url: string) => url.split('/').pop()?.replace('.html', '') || '';

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const cached = state.allPosts.find(p => getSlug(p.url) === slug);
      if (cached && cached.content && !cached.content.endsWith('...')) {
        setState(prev => ({ ...prev, selectedPost: cached }));
        return;
      }
      const fetched = cached ? await fetchPostById(cached.id) : await fetchPostBySlug(slug);
      if (fetched) setState(prev => ({ 
        ...prev, selectedPost: fetched,
        allPosts: prev.allPosts.some(p => p.id === fetched.id) ? prev.allPosts.map(p => p.id === fetched.id ? fetched : p) : [fetched, ...prev.allPosts]
      }));
    };
    load();
  }, [slug, state.allPosts.length]);

  if (!state.selectedPost) return <div className="py-80 text-center"><div className="w-20 h-20 border-8 border-accent-blue/20 border-t-accent-blue mx-auto animate-spin"></div></div>;

  return (
    <div className="animate-fade-in-up pb-80" ref={readerRef}>
      <button onClick={() => navigate(-1)} className="mb-20 flex items-center gap-6 text-accent-blue hover:translate-x-[-8px] transition-all font-black uppercase text-[10px] tracking-widest italic">
        <i className="fas fa-arrow-left"></i> VOLVER AL ARCHIVO
      </button>
      
      <div className="warrior-frame relative h-[500px] md:h-[700px] mb-20">
        <img src={state.selectedPost.images?.[0]?.url || ''} className="w-full h-full object-cover grayscale opacity-50" alt="" />
        <div className="absolute inset-x-0 bottom-0 p-12 md:p-24 bg-gradient-to-t from-bg-deep to-transparent">
          <h1 className="h1-brutal text-5xl md:text-[8rem] mb-10 leading-[0.85]">{state.selectedPost.title}</h1>
          <div className="flex flex-wrap items-center gap-10">
             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent-blue italic">// {state.selectedPost.author.displayName}</span>
             <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{new Date(state.selectedPost.published).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto blogger-body font-light text-xl leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>

      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-[4000]">
          <button onClick={() => sharePost('native')} className="w-16 h-16 bg-accent-blue text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl">
            <i className="fas fa-share-nodes text-xl"></i>
          </button>
          <button onClick={() => sharePost('copy')} className={`w-16 h-16 flex items-center justify-center transition-all ${copyFeedback ? 'bg-green-600' : 'bg-white/10 hover:bg-white/20'}`}>
            <i className={copyFeedback ? "fas fa-check" : "fas fa-link"}></i>
          </button>
      </div>
    </div>
  );
};

export default App;
