
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchArsenalData } from './services/contentService';
import { ContentPost, AppState, AppView } from './types';

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

  const changeView = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Safety timeout: hide splash after 4 seconds no matter what (reduced from 6)
    const safetyTimer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    const init = async () => {
      // Safety timeout: force loading to false after 5 seconds
      const forceLoadTimer = setTimeout(() => {
        setState(prev => ({ ...prev, loading: false }));
        setShowSplash(false);
      }, 5000);

      // 0. Carga inmediata desde caché si existe
      const cached = localStorage.getItem('dg_posts_cache');
      let initialPosts: ContentPost[] = [];
      if (cached) {
        try {
          initialPosts = JSON.parse(cached);
          if (initialPosts.length > 0) {
            setState(prev => ({ ...prev, allPosts: initialPosts, loading: false }));
            setShowSplash(false);
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }

      try {
        // Etapa 1: Carga relámpago de los primeros 20 posts
        const result20 = await fetchArsenalData(20);
        const freshPosts = result20.posts;
        
        setState(prev => ({ 
          ...prev, 
          allPosts: freshPosts.length > 0 ? freshPosts : prev.allPosts, 
          loading: false,
          nextPageToken: result20.nextPageToken 
        }));
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
        clearTimeout(forceLoadTimer);

        // Etapa 2: Carga masiva en segundo plano (500 posts)
        setTimeout(async () => {
          try {
            const result500 = await fetchArsenalData(500);
            if (result500.posts.length > 0) {
              setState(prev => ({ 
                ...prev, 
                allPosts: result500.posts,
                nextPageToken: result500.nextPageToken
              }));
            }
          } catch (e) {
            console.warn("Background bulk load failed.");
          }
        }, 2000);

      } catch (err) {
        console.error("Init error:", err);
        setState(prev => ({ ...prev, loading: false }));
        setShowSplash(false);
      }
    };
    init();
    
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!showSplash) {
      const lastShown = localStorage.getItem('dg_popup_last_shown');
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      if (!lastShown || (now - parseInt(lastShown)) > oneDay) {
        const timer = setTimeout(() => {
          setShowFollowPopup(true);
          localStorage.setItem('dg_popup_last_shown', now.toString());
        }, 30000); // Show after 30 seconds instead of 15
        return () => clearTimeout(timer);
      }
    }
  }, [showSplash]);

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

  const [shuffleKey, setShuffleKey] = useState(0);

  const trendingPosts = useMemo(() => {
    return [...state.allPosts].sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [state.allPosts, shuffleKey]);

  const randomDiscovery = useMemo(() => {
    return [...state.allPosts].sort(() => 0.5 - Math.random()).slice(0, 6);
  }, [state.allPosts, shuffleKey]);

  const warriorChallenge = useMemo(() => {
    if (state.allPosts.length === 0) return null;
    // Prefer posts with 'reflexiones' or 'ejercicio' labels if they exist
    const filtered = state.allPosts.filter(p => p.labels?.some(l => l.toLowerCase().includes('reflexion') || l.toLowerCase().includes('ejercicio')));
    const source = filtered.length > 0 ? filtered : state.allPosts;
    return source[Math.floor(Math.random() * source.length)];
  }, [state.allPosts, shuffleKey]);

  const testimoniosPosts = useMemo(() => {
    return state.allPosts.filter(p => p.labels?.some(l => l.toLowerCase().includes('testimonio')));
  }, [state.allPosts]);

  const categories = useMemo(() => {
    const labelCounts: Record<string, number> = {};
    state.allPosts.forEach(p => {
      p.labels?.forEach(label => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });
    
    return Object.entries(labelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label)
      .slice(0, 10);
  }, [state.allPosts]);

  const topSidebarCategories = useMemo(() => {
    return categories.slice(0, 5);
  }, [categories]);

  const recommendedPost = useMemo(() => {
    if (state.allPosts.length === 0) return null;
    return state.allPosts[Math.floor(Math.random() * state.allPosts.length)];
  }, [state.allPosts, shuffleKey]);

  const toggleFavorite = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState(prev => {
      const isFav = prev.favorites.includes(postId);
      const newFavs = isFav ? prev.favorites.filter(id => id !== postId) : [...prev.favorites, postId];
      return { ...prev, favorites: newFavs };
    });
  };

  const loadMorePosts = async () => {
    if (!state.nextPageToken || state.loading) return;
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const result = await fetchArsenalData(50, state.nextPageToken);
      setState(prev => ({
        ...prev,
        allPosts: [...prev.allPosts, ...result.posts],
        nextPageToken: result.nextPageToken,
        loading: false
      }));
    } catch (e) {
      console.error("Error loading more posts:", e);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSelectPost = (post: ContentPost) => {
    setState(prev => ({ ...prev, selectedPost: post }));
    setReadProgress(0);
    if (!readingHistory.includes(post.id)) {
      setReadingHistory(prev => [post.id, ...prev].slice(0, 30));
      setStreak(s => s + 1);
      localStorage.setItem('dg_last_read', new Date().toDateString());
    }
    setTimeout(() => readerRef.current?.scrollTo(0, 0), 50);
  };

  const sharePost = async (platform: 'wa' | 'fb' | 'ig' | 'tg' | 'x' | 'pi' | 'li' | 'em' | 'copy') => {
    if (!state.selectedPost) return;
    const url = state.selectedPost.url;
    const title = state.selectedPost.title;
    const text = `💪 Forjando mi fe en DiosMasGym: ${title}`;
    
    const actions = {
      wa: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank'),
      fb: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
      tg: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank'),
      x: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank'),
      pi: () => window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`, '_blank'),
      li: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'),
      em: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`, '_self'),
      ig: async () => {
        await navigator.clipboard.writeText(`${text}\n\nLee más aquí: ${url}`);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      },
      copy: async () => {
        await navigator.clipboard.writeText(url);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    };
    actions[platform]?.();
  };

  if (showSplash) {
    return (
      <div className="bg-[#020617] fixed inset-0 z-[10000] flex flex-col items-center justify-center p-10">
        <div className="relative mb-12 animate-pulse flex flex-col items-center">
           <img src={LOGO_URL} className="w-64 md:w-80 drop-shadow-[0_0_40px_rgba(59,130,246,0.5)]" alt="DiosMasGym Logo" />
           <div className="mt-8 flex flex-col items-center gap-3">
              <div className="h-1.5 w-48 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[loading_2s_ease-in-out]"></div>
              </div>
              <p className="text-blue-400 font-black uppercase text-[10px] tracking-[0.6em]">Cargando Poder</p>
           </div>
        </div>
        <style>{`@keyframes loading { 0% { width: 0; } 100% { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 overflow-hidden font-['Poppins']">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-80 bg-slate-950 border-r border-slate-800/60 p-8 z-50 overflow-y-auto no-scrollbar">
        <div className="mb-10 cursor-pointer flex flex-col items-center group" onClick={() => changeView('inicio')}>
          <img src={LOGO_URL} className="w-48 mb-4 group-hover:scale-105 transition-transform drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]" alt="Logo" />
          <div className="h-0.5 w-16 bg-blue-600 rounded-full group-hover:w-32 transition-all"></div>
        </div>

        {/* Search Bar Sidebar */}
        <div className="mb-10 relative group">
           <input 
              type="text" 
              value={state.searchTerm}
              onChange={(e) => {
                 setState(prev => ({ ...prev, searchTerm: e.target.value }));
                 if (state.currentView !== 'reflexiones') changeView('reflexiones');
              }}
              placeholder="Buscar en el arsenal..." 
              className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl py-4 px-6 text-[10px] focus:outline-none focus:border-blue-500 transition-all text-white placeholder-slate-700 font-black uppercase tracking-widest" 
           />
           <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors"></i>
        </div>
        
        <nav className="flex-1 space-y-4">
          <NavItem active={state.currentView === 'inicio'} onClick={() => changeView('inicio')} icon="fa-bolt" label="Dashboard" />
          <NavItem active={state.currentView === 'reflexiones' && !state.selectedCategory} onClick={() => { setState(prev => ({ ...prev, selectedCategory: null })); changeView('reflexiones'); }} icon="fa-book-bible" label="Todos los Mensajes" />
          
          <div className="pt-6 pb-2 px-7">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">Top Categorías</h4>
          </div>
          
          {topSidebarCategories.map(cat => (
            <NavItem 
              key={cat}
              active={state.currentView === 'reflexiones' && state.selectedCategory === cat} 
              onClick={() => {
                setState(prev => ({ ...prev, selectedCategory: cat }));
                changeView('reflexiones');
              }} 
              icon="fa-tag" 
              label={cat} 
            />
          ))}

          <div className="pt-6 pb-2 px-7">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">Personal</h4>
          </div>
          <NavItem active={state.currentView === 'favoritos'} onClick={() => changeView('favoritos')} icon="fa-star" label="Mis Favoritos" />
          <NavItem active={state.currentView === 'testimonios'} onClick={() => changeView('testimonios')} icon="fa-comment-dots" label="Testimonios" />
          <NavItem active={state.currentView === 'comunidad'} onClick={() => changeView('comunidad')} icon="fa-users" label="Comunidad" />
          <NavItem active={state.currentView === 'musica'} onClick={() => changeView('musica')} icon="fa-music" label="Radio en Vivo" />
        </nav>

        {/* SOCIAL LINKS SIDEBAR */}
        <div className="mt-12 pt-8 border-t border-slate-900">
           <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-6 text-center">Nuestra Comunidad</h4>
           <div className="grid grid-cols-4 gap-3">
              <SocialIcon icon="fab fa-instagram" color="bg-gradient-to-tr from-purple-600 to-pink-500" url="https://instagram.com/diosmasgym" />
              <SocialIcon icon="fab fa-tiktok" color="bg-slate-900 border border-slate-800" url="https://tiktok.com/@diosmasgym" />
              <SocialIcon icon="fab fa-youtube" color="bg-red-600" url="https://youtube.com/@diosmasgym" />
              <SocialIcon icon="fab fa-whatsapp" color="bg-green-600" url="https://whatsapp.com/channel/0029VaFfS6uL2AU1eH2mK73f" />
              <SocialIcon icon="fab fa-facebook-f" color="bg-blue-700" url="https://facebook.com/diosmasgym" />
              <SocialIcon icon="fab fa-telegram-plane" color="bg-sky-500" url="https://t.me/diosmasgym" />
              <SocialIcon icon="fab fa-threads" color="bg-black" url="https://threads.net/@diosmasgym" />
              <SocialIcon icon="fab fa-x-twitter" color="bg-slate-800" url="https://twitter.com/diosmasgym" />
           </div>
           <div className="mt-8 p-5 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 flex items-center justify-between shadow-inner">
              <div className="flex flex-col">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Racha Diaria</span>
                 <span className="font-black text-white text-base">{streak} <span className="text-xs text-blue-400">Días</span></span>
              </div>
              <i className="fas fa-fire text-orange-500 text-xl animate-bounce"></i>
           </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* MOBILE HEADER */}
        <header className="lg:hidden bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-50">
          <img src={LOGO_URL} className="h-10 drop-shadow-lg" alt="Logo" onClick={() => changeView('inicio')} />
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 active:scale-90 transition-all"
             >
                <i className="fas fa-search"></i>
             </button>
             <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-lg">
                <i className="fas fa-fire text-orange-500 text-xs animate-pulse"></i>
                <span className="text-xs font-black text-white">{streak}</span>
             </div>
          </div>
        </header>

        {/* MOBILE SEARCH OVERLAY */}
        {isSearchOpen && (
           <div className="fixed inset-0 z-[6000] bg-slate-950/95 backdrop-blur-xl p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-12">
                 <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Buscador</h3>
                 <button onClick={() => setIsSearchOpen(false)} className="text-slate-500 text-2xl"><i className="fas fa-times"></i></button>
              </div>
              <div className="relative">
                 <input 
                    autoFocus
                    type="text" 
                    value={state.searchTerm}
                    onChange={(e) => {
                       setState(prev => ({ ...prev, searchTerm: e.target.value }));
                       if (state.currentView !== 'reflexiones') changeView('reflexiones');
                    }}
                    placeholder="¿Qué buscas, guerrero?" 
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl py-6 px-8 text-lg focus:outline-none focus:border-blue-500 transition-all text-white placeholder-slate-700 font-black uppercase tracking-widest" 
                 />
                 <i className="fas fa-search absolute right-8 top-1/2 -translate-y-1/2 text-slate-700"></i>
              </div>
              <div className="mt-12">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-6">Sugerencias</p>
                 <div className="flex flex-wrap gap-3">
                    {['Oración', 'Fuerza', 'Disciplina', 'Ayuno', 'Mentalidad'].map(s => (
                       <button 
                          key={s}
                          onClick={() => {
                             setState(prev => ({ ...prev, searchTerm: s }));
                             changeView('reflexiones');
                             setIsSearchOpen(false);
                          }}
                          className="px-6 py-3 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-800"
                       >
                          {s}
                       </button>
                    ))}
                 </div>
              </div>
              <button 
                 onClick={() => setIsSearchOpen(false)}
                 className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                 Ver Resultados
              </button>
           </div>
        )}

        <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-14 pb-32 lg:pb-14 bg-[#020617] relative">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="max-w-7xl mx-auto">
            {state.loading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8"></div>
                <p className="text-blue-400 font-black uppercase text-[10px] tracking-[0.6em]">Sincronizando Arsenal...</p>
              </div>
            ) : state.allPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 text-center animate-slide-up">
                 <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 text-4xl mb-8 border border-slate-800">
                    <i className="fas fa-plug"></i>
                 </div>
                 <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Sincronización Pendiente</h2>
                 <p className="text-slate-500 max-w-sm mx-auto leading-relaxed mb-8">Estamos conectando con el arsenal de fe. Si eres el administrador, verifica la configuración de los secretos.</p>
                 <button 
                   onClick={() => {
                     setState(prev => ({ ...prev, loading: true }));
                     fetchArsenalData().then(res => {
                       setState(prev => ({ 
                         ...prev, 
                         allPosts: res.posts, 
                         loading: false,
                         nextPageToken: res.nextPageToken
                       }));
                     });
                   }}
                   className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
                 >
                   <i className="fas fa-sync-alt mr-2"></i> Reintentar Conexión
                 </button>
              </div>
            ) : (
              <>
                {state.currentView === 'inicio' && (
                  <div className="animate-slide-up space-y-24">
                    {/* Hero Section */}
                    <div className="flex flex-col lg:flex-row gap-12 items-center">
                       <div className="flex-1 text-center lg:text-left">
                          <span className="bg-blue-600/10 text-blue-500 px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.5em] mb-6 inline-block border border-blue-500/20">Cuerpo y Espíritu</span>
                          <h1 className="text-5xl md:text-9xl font-black text-white tracking-tighter mb-10 leading-[0.85]">
                            Forja tu <br/> <span className="text-blue-500 italic">Destino</span>
                          </h1>
                          <div className="flex flex-wrap justify-center lg:justify-start gap-5">
                             <button onClick={() => changeView('reflexiones')} className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all flex items-center gap-4">
                                <i className="fas fa-dumbbell"></i> Entrenar Hoy
                             </button>
                             <button onClick={() => state.allPosts.length > 0 && handleSelectPost(state.allPosts[Math.floor(Math.random()*state.allPosts.length)])} className="bg-slate-900 border border-slate-800 px-12 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:border-blue-500 transition-all flex items-center gap-4">
                                <i className="fas fa-shuffle"></i> Aleatorio
                             </button>
                          </div>
                       </div>
                       <div className="lg:w-[35rem] glass-card p-14 rounded-[4rem] border border-white/5 relative shadow-2xl group overflow-hidden">
                          <div className="absolute -top-10 -right-10 text-blue-500/10 text-[12rem] group-hover:rotate-12 transition-transform"><i className="fas fa-cross"></i></div>
                          <i className="fas fa-quote-left text-4xl text-blue-500 mb-10"></i>
                          <p className="text-2xl md:text-3xl italic text-white leading-relaxed font-bold mb-10 z-10 relative">"{verse.t}"</p>
                          <div className="flex items-center gap-4">
                             <div className="h-px flex-1 bg-slate-800"></div>
                             <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/5 px-6 py-2.5 rounded-2xl border border-blue-500/10">{verse.r}</span>
                          </div>
                       </div>
                    </div>

                    {/* TE RECOMIENDO ESTO */}
                    {recommendedPost && (
                      <div className="animate-slide-up">
                         <div className="flex items-center gap-4 mb-10">
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                               <i className="fas fa-crown text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"></i> Bendición del Día
                            </h2>
                            <div className="h-px flex-1 bg-slate-900"></div>
                         </div>
                         <div 
                           className="relative w-full h-[500px] rounded-[5rem] overflow-hidden group cursor-pointer border-2 border-blue-500/20 shadow-[0_50px_100px_rgba(0,0,0,0.6)]"
                           onClick={() => handleSelectPost(recommendedPost)}
                         >
                            <img src={recommendedPost.images?.[0]?.url || 'https://placehold.co/1200x800/1e293b/3b82f6?text=DiosMasGym'} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
                            <div className="absolute inset-0 flex flex-col justify-end p-12 lg:p-20">
                               <div className="flex items-center gap-4 mb-8">
                                  <span className="bg-yellow-500 text-slate-950 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl">RECOMENDACIÓN ELITE</span>
                                  <span className="bg-blue-600 text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">ESPÍRITU FUERTE</span>
                               </div>
                               <h3 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 leading-[1] uppercase group-hover:text-blue-400 transition-colors">{recommendedPost.title}</h3>
                               <button className="w-fit bg-white text-slate-950 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center gap-4 shadow-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                                  <i className="fas fa-book-open"></i> Leer Ahora
                               </button>
                            </div>
                         </div>
                      </div>
                    )}

                    {/* CATEGORÍAS (ETIQUETAS) */}
                    {categories.length > 0 && (
                       <div className="animate-slide-up">
                          <div className="flex items-center gap-4 mb-10">
                             <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                                <i className="fas fa-tags text-blue-500"></i> Explorar por Etiquetas
                             </h2>
                             <div className="h-px flex-1 bg-slate-900"></div>
                          </div>
                          <div className="flex flex-wrap gap-4">
                             {categories.map(cat => (
                                <button 
                                   key={cat}
                                   onClick={() => {
                                      setState(prev => ({ ...prev, selectedCategory: cat, currentView: 'reflexiones' }));
                                   }}
                                   className="px-8 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:border-blue-500 hover:text-white hover:bg-blue-600/10 transition-all"
                                >
                                   {cat}
                                </button>
                             ))}
                             <button 
                                onClick={() => setState(prev => ({ ...prev, selectedCategory: null, currentView: 'reflexiones' }))}
                                className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 transition-all"
                             >
                                Ver Todo
                             </button>
                          </div>
                       </div>
                    )}
                    <div className="animate-slide-up">
                       <div className="flex items-center justify-between mb-12">
                          <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4 uppercase">
                             <i className="fas fa-fire-alt text-orange-500"></i> Lo más visitado de la semana
                          </h2>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                          {trendingPosts.map((p, idx) => (
                            <div 
                              key={p.id} 
                              className="group relative h-[420px] rounded-[4rem] overflow-hidden cursor-pointer border border-white/5 shadow-2xl transition-all hover:-translate-y-4 hover:border-blue-500/50"
                              onClick={() => handleSelectPost(p)}
                            >
                               <img src={p.images?.[0]?.url || 'https://placehold.co/600x800/1e293b/3b82f6?text=DiosMasGym'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                               <div className="absolute top-8 left-8 w-14 h-14 rounded-3xl bg-blue-600/90 backdrop-blur-md flex items-center justify-center font-black text-white text-xl shadow-2xl border border-white/20">0{idx + 1}</div>
                               <div className="absolute bottom-0 left-0 p-10">
                                  <h4 className="font-black text-white text-xl leading-tight uppercase line-clamp-2 group-hover:text-blue-400 transition-colors mb-4">{p.title}</h4>
                                  <div className="flex items-center gap-3 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                     <i className="fas fa-bolt text-yellow-500"></i> Tendencia Elite
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* DESAFÍO DEL GUERRERO */}
                    {warriorChallenge && (
                       <div className="animate-slide-up bg-gradient-to-br from-blue-900/20 to-slate-900/40 rounded-[5rem] p-12 lg:p-20 border border-blue-500/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                             <i className="fas fa-shield-halved text-[15rem] rotate-12"></i>
                          </div>
                          <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
                             <div className="flex-1">
                                <span className="bg-orange-600 text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest mb-8 inline-block shadow-lg shadow-orange-600/20">Desafío del Guerrero</span>
                                <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-tight uppercase">¿Estás listo para el siguiente nivel?</h3>
                                <p className="text-slate-400 text-xl mb-12 leading-relaxed">Acepta el reto de hoy y fortalece tu espíritu con esta enseñanza profunda.</p>
                                <button 
                                  onClick={() => handleSelectPost(warriorChallenge)}
                                  className="bg-white text-slate-950 px-12 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-2xl"
                                >
                                   Aceptar Desafío
                                </button>
                             </div>
                             <div className="w-full lg:w-96 aspect-square rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-2xl">
                                <img src={warriorChallenge.images?.[0]?.url || 'https://placehold.co/800x800/1e293b/3b82f6?text=Desafio'} className="w-full h-full object-cover" alt="" />
                             </div>
                          </div>
                       </div>
                    )}

                    {/* DESCUBRIMIENTO ALEATORIO */}
                    <div className="animate-slide-up">
                       <div className="flex items-center justify-between mb-12">
                          <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4 uppercase">
                             <i className="fas fa-dice text-blue-500"></i> Descubrimiento Aleatorio
                          </h2>
                          <button 
                             onClick={() => setShuffleKey(prev => prev + 1)} 
                             className="text-[10px] font-black uppercase text-slate-500 tracking-widest hover:text-blue-500 transition-colors"
                          >
                             <i className="fas fa-redo-alt mr-2"></i> Mezclar
                          </button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                          {randomDiscovery.map(p => (
                             <div 
                                key={p.id + '_rand'} 
                                className="bg-slate-900/20 border border-slate-800/40 rounded-[3rem] p-8 flex items-center gap-6 group cursor-pointer hover:border-blue-500/20 transition-all"
                                onClick={() => handleSelectPost(p)}
                             >
                                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                                   <img src={p.images?.[0]?.url || 'https://placehold.co/200x200/1e293b/3b82f6?text=DMG'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                                </div>
                                <div className="flex-1">
                                   <h4 className="font-black text-white text-sm uppercase line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">{p.title}</h4>
                                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2 block">Explorar</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* ARSENAL GENERAL */}
                    <div className="animate-slide-up pb-20">
                       <div className="flex items-center justify-between mb-12">
                          <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4 uppercase">
                             <span className="w-2.5 h-12 bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></span> Arsenal de Fe
                          </h2>
                          <button onClick={() => changeView('reflexiones')} className="text-[10px] font-black uppercase text-blue-500 tracking-widest hover:underline">Explorar todo</button>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
                         {state.allPosts.slice(0, 9).map(p => (
                           <PostCard 
                             key={p.id} 
                             post={p} 
                             onClick={() => handleSelectPost(p)} 
                             isFav={state.favorites.includes(p.id)} 
                             isRead={readingHistory.includes(p.id)}
                             onFav={(e) => toggleFavorite(p.id, e)} 
                           />
                         ))}
                       </div>
                    </div>
                  </div>
                )}

                {/* VIEWS REMAINING (Reflexiones, Favorites) */}
                {(state.currentView === 'reflexiones' || state.currentView === 'favoritos') && (
                  <div className="animate-slide-up">
                     <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
                        <div>
                           <h3 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-3 capitalize">{state.currentView === 'reflexiones' ? 'Biblioteca' : 'Favoritos'}</h3>
                           <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em] ml-2">Equipo de combate espiritual</p>
                        </div>
                        {state.currentView === 'reflexiones' && (
                           <div className="relative w-full md:w-[400px]">
                              <input 
                                 type="text" 
                                 value={state.searchTerm}
                                 onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                                 placeholder="Buscar en el arsenal..." 
                                 className="w-full bg-slate-900/40 border-2 border-slate-800 rounded-[2rem] py-5 px-8 text-sm focus:outline-none focus:border-blue-500 transition-all text-white placeholder-slate-700 shadow-xl" 
                              />
                              <i className="fas fa-search absolute right-8 top-1/2 -translate-y-1/2 text-slate-700"></i>
                           </div>
                        )}
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-20">
                        {filteredPosts.map(p => (
                           <PostCard key={p.id} post={p} onClick={() => handleSelectPost(p)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => toggleFavorite(p.id, e)} />
                        ))}
                     </div>

                     {state.nextPageToken && state.currentView === 'reflexiones' && !state.searchTerm && (
                        <div className="flex justify-center pb-32">
                           <button 
                              onClick={loadMorePosts}
                              disabled={state.loading}
                              className="bg-slate-900 border border-slate-800 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-blue-600 hover:border-blue-500 transition-all shadow-2xl disabled:opacity-50 flex items-center gap-4"
                           >
                              {state.loading ? (
                                 <><i className="fas fa-spinner animate-spin"></i> Cargando Munición...</>
                              ) : (
                                 <><i className="fas fa-plus"></i> Cargar más del Arsenal</>
                              )}
                           </button>
                        </div>
                     )}
                  </div>
                )}
              </>
            )}

            {state.currentView === 'musica' && (
              <div className="h-[75vh] rounded-[4rem] overflow-hidden border-2 border-slate-800/60 shadow-2xl bg-black relative animate-slide-up">
                 <iframe className="w-full h-full border-none" src="https://musica.diosmasgym.com/" allow="autoplay"></iframe>
              </div>
            )}

            {state.currentView === 'comunidad' && (
               <div className="animate-slide-up space-y-16">
                  <div className="text-center max-w-2xl mx-auto">
                     <h2 className="text-6xl font-black text-white mb-6 tracking-tighter uppercase">Comunidad</h2>
                     <p className="text-slate-500 text-lg">Únete a la legión en nuestras redes sociales y no te pierdas nada.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                     <CommunityCard icon="fab fa-instagram" label="Instagram" color="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" url="https://www.instagram.com/diosmasgym" />
                     <CommunityCard icon="fab fa-facebook" label="Facebook" color="bg-[#1877F2]" url="https://www.facebook.com/diosmasgym" />
                     <CommunityCard icon="fab fa-youtube" label="YouTube" color="bg-[#FF0000]" url="https://www.youtube.com/@diosmasgym" />
                     <CommunityCard icon="fab fa-tiktok" label="TikTok" color="bg-black" url="https://www.tiktok.com/@diosmasgym" />
                  </div>

                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-[4rem] p-12 lg:p-20 text-center">
                     <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-6">¿Quieres ser parte activa?</h3>
                     <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Comparte tus progresos usando el hashtag <span className="text-blue-500 font-black">#DiosMasGym</span> y etiquétanos para aparecer en nuestras historias.</p>
                     <button onClick={() => window.open('https://wa.me/tu_numero', '_blank')} className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:scale-105 transition-all">
                        <i className="fab fa-whatsapp mr-3"></i> Contacto Directo
                     </button>
                  </div>
               </div>
            )}

            {state.currentView === 'testimonios' && (
               <div className="animate-slide-up space-y-16">
                  <div className="text-center max-w-2xl mx-auto">
                     <h2 className="text-6xl font-black text-white mb-6 tracking-tighter uppercase">Testimonios</h2>
                     <p className="text-slate-500 text-lg">Historias reales de transformación física y espiritual compartidas por la legión DiosMasGym.</p>
                  </div>
                  
                  {testimoniosPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-32">
                       {testimoniosPosts.map(p => (
                          <PostCard key={p.id} post={p} onClick={() => handleSelectPost(p)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => toggleFavorite(p.id, e)} />
                       ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-900/20 rounded-[4rem] border border-slate-800">
                       <i className="fas fa-comment-slash text-5xl text-slate-700 mb-6"></i>
                       <p className="text-slate-500 font-black uppercase tracking-widest">Aún no hay testimonios publicados</p>
                    </div>
                  )}
               </div>
            )}
          </div>
        </main>

        {/* BOTTOM NAV (Mobile) */}
        <nav className="lg:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/60 px-6 py-6 flex justify-around items-center z-[100] shadow-[0_-20px_50px_rgba(0,0,0,1)] absolute bottom-0 w-full overflow-x-auto no-scrollbar">
           <NavItem active={state.currentView === 'inicio'} onClick={() => changeView('inicio')} icon="fa-bolt" label="" />
           <NavItem active={state.currentView === 'reflexiones'} onClick={() => changeView('reflexiones')} icon="fa-book-bible" label="" />
           <NavItem active={state.currentView === 'favoritos'} onClick={() => changeView('favoritos')} icon="fa-star" label="" />
           <NavItem active={state.currentView === 'testimonios'} onClick={() => changeView('testimonios')} icon="fa-comment-dots" label="" />
           <NavItem active={state.currentView === 'comunidad'} onClick={() => changeView('comunidad')} icon="fa-users" label="" />
           <NavItem active={state.currentView === 'musica'} onClick={() => changeView('musica')} icon="fa-music" label="" />
        </nav>
      </div>

      {/* READER OVERLAY */}
      {state.selectedPost && (
        <div className="fixed inset-0 bg-[#020617] z-[2000] flex flex-col animate-slide-up">
           <header className="bg-slate-950 border-b border-slate-800/60 px-6 py-6 flex items-center justify-between sticky top-0 z-[2100]">
              <div className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-200 z-[2200]" style={{ width: `${readProgress}%` }}></div>
              <button onClick={() => setState(prev => ({ ...prev, selectedPost: null }))} className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white border border-slate-800 hover:text-blue-500 transition-all active:scale-90">
                  <i className="fas fa-chevron-left text-xl"></i>
              </button>
              <h2 className="font-black text-white text-base md:text-xl truncate flex-1 mx-8 tracking-tighter text-center uppercase">{state.selectedPost.title}</h2>
              <button onClick={() => toggleFavorite(state.selectedPost!.id)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${state.favorites.includes(state.selectedPost.id) ? 'bg-blue-600 text-white shadow-blue-600/40 border border-blue-400' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                  <i className={`${state.favorites.includes(state.selectedPost.id) ? 'fas' : 'far'} fa-star text-xl`}></i>
              </button>
           </header>
           
           <div 
              ref={readerRef} 
              onScroll={(e) => {
                 const target = e.currentTarget;
                 const progress = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
                 setReadProgress(progress);
              }}
              className="flex-1 overflow-y-auto px-6 py-16 no-scrollbar max-w-5xl mx-auto w-full"
           >
              {state.selectedPost.images?.[0]?.url && (
                <div className="relative mb-16 group">
                   <img src={state.selectedPost.images[0].url} className="w-full h-auto rounded-[4rem] shadow-2xl border border-white/5 transition-all group-hover:scale-[1.01]" alt="" />
                   <div className="absolute inset-0 rounded-[4rem] shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]"></div>
                </div>
              )}
              <h1 className="text-4xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter uppercase">{state.selectedPost.title}</h1>
              <div className="flex items-center gap-6 mb-14 text-slate-500 text-xs font-black uppercase tracking-widest">
                 <div className="flex items-center gap-2">
                    <i className="far fa-clock text-blue-500"></i> {state.selectedPost.readingTime || 5} min de lectura
                 </div>
                 <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                 <div className="flex items-center gap-2">
                    <i className="far fa-calendar text-blue-500"></i> {new Date(state.selectedPost.published).toLocaleDateString()}
                 </div>
              </div>
              <div className="blogger-body pb-64" dangerouslySetInnerHTML={{ __html: state.selectedPost.content }}></div>
           </div>

           {/* SHARE PANEL */}
           <div className="absolute bottom-6 left-0 w-full px-6 md:px-12 z-[2200]">
              <div className="max-w-4xl mx-auto glass-card rounded-[3rem] p-4 border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden">
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-6 pt-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Compartir Palabra</span>
                       {copyFeedback && <span className="text-[9px] font-black text-green-500 uppercase tracking-widest animate-pulse">¡Enlace Copiado!</span>}
                    </div>
                    
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-2">
                       <ShareActionBtn onClick={() => sharePost('wa')} icon="fab fa-whatsapp" color="bg-[#25D366]" label="WhatsApp" />
                       <ShareActionBtn onClick={() => sharePost('tg')} icon="fab fa-telegram-plane" color="bg-[#0088cc]" label="Telegram" />
                       <ShareActionBtn onClick={() => sharePost('fb')} icon="fab fa-facebook-f" color="bg-[#1877F2]" label="Facebook" />
                       <ShareActionBtn onClick={() => sharePost('x')} icon="fab fa-x-twitter" color="bg-black" label="X Twitter" />
                       <ShareActionBtn onClick={() => sharePost('ig')} icon="fab fa-instagram" color="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" label="InstaStory" />
                       <ShareActionBtn onClick={() => sharePost('li')} icon="fab fa-linkedin-in" color="bg-[#0077b5]" label="LinkedIn" />
                       <ShareActionBtn onClick={() => sharePost('pi')} icon="fab fa-pinterest" color="bg-[#E60023]" label="Pinterest" />
                       <ShareActionBtn onClick={() => sharePost('em')} icon="fas fa-envelope" color="bg-slate-700" label="Email" />
                       <div className="min-w-[1px] h-10 bg-white/10 mx-2"></div>
                       <ShareActionBtn onClick={() => sharePost('copy')} icon={copyFeedback ? "fas fa-check" : "fas fa-link"} color={copyFeedback ? "bg-green-600" : "bg-blue-600"} label="Copiar" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* POPUP: FOLLOW THE ARMY */}
      {showFollowPopup && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 md:p-6 bg-slate-950/98 backdrop-blur-xl animate-fade-in overflow-y-auto">
           <div className="bg-slate-900 border border-white/5 p-8 md:p-16 rounded-[3rem] md:rounded-[5rem] max-w-2xl w-full text-center relative shadow-[0_0_150px_rgba(59,130,246,0.2)] overflow-hidden my-auto">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full"></div>
              <button onClick={() => setShowFollowPopup(false)} className="absolute top-6 right-6 md:top-12 md:right-12 text-slate-600 hover:text-white transition-all z-50 p-2">
                <i className="fas fa-times text-2xl md:text-3xl"></i>
              </button>
              
              <img src={LOGO_URL} className="w-40 md:w-56 mx-auto mb-8 md:mb-12 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]" alt="Logo" />
              <h3 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-tighter uppercase italic">¡Únete a la Legión!</h3>
              <p className="text-slate-500 mb-8 md:mb-14 leading-relaxed font-light text-lg md:text-xl px-2 md:px-6">Sigue a la comunidad que entrena cuerpo y espíritu. Elige tu arsenal favorito:</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
                 <SocialPopupBtn onClick={() => window.open('https://instagram.com/diosmasgym', '_blank')} icon="fab fa-instagram" color="bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500" label="Instagram" />
                 <SocialPopupBtn onClick={() => window.open('https://tiktok.com/@diosmasgym', '_blank')} icon="fab fa-tiktok" color="bg-slate-950 border border-slate-800" label="TikTok" />
                 <SocialPopupBtn onClick={() => window.open('https://youtube.com/@diosmasgym', '_blank')} icon="fab fa-youtube" color="bg-red-600" label="YouTube" />
                 <SocialPopupBtn onClick={() => window.open('https://whatsapp.com/channel/0029VaFfS6uL2AU1eH2mK73f', '_blank')} icon="fab fa-whatsapp" color="bg-green-600" label="Canal WA" />
                 <SocialPopupBtn onClick={() => window.open('https://facebook.com/diosmasgym', '_blank')} icon="fab fa-facebook-f" color="bg-blue-700" label="Facebook" />
                 <SocialPopupBtn onClick={() => window.open('https://t.me/diosmasgym', '_blank')} icon="fab fa-telegram-plane" color="bg-sky-500" label="Telegram" />
                 <SocialPopupBtn onClick={() => window.open('https://threads.net/@diosmasgym', '_blank')} icon="fab fa-threads" color="bg-slate-900" label="Threads" />
                 <SocialPopupBtn onClick={() => window.open('https://twitter.com/diosmasgym', '_blank')} icon="fab fa-x-twitter" color="bg-slate-800" label="X Twitter" />
              </div>
              
              <button onClick={() => setShowFollowPopup(false)} className="text-[10px] md:text-[11px] text-slate-700 font-black uppercase tracking-widest hover:text-blue-500 transition-all underline underline-offset-8">Continuar solo por ahora</button>
           </div>
        </div>
      )}

    </div>
  );
};

// HELPERS
const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-6 px-7 py-5 rounded-[2rem] transition-all w-full text-left group ${active ? 'bg-blue-600 text-white shadow-[0_15px_30px_rgba(59,130,246,0.3)]' : 'text-slate-500 hover:text-white hover:bg-slate-900/50'}`}
  >
    <i className={`fas ${icon} text-xl ${active ? 'text-white' : 'group-hover:text-blue-400'} transition-colors`}></i>
    {label && <span className="font-black uppercase text-[12px] tracking-[0.25em]">{label}</span>}
  </button>
);

const SocialIcon = ({ icon, color, url }: { icon: string, color: string, url: string }) => (
  <button onClick={() => window.open(url, '_blank')} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${color} hover:scale-115 active:scale-90 transition-all shadow-xl hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]`}>
     <i className={`${icon} text-lg`}></i>
  </button>
);

const SocialPopupBtn = ({ onClick, icon, color, label }: { onClick: () => void, icon: string, color: string, label: string }) => (
   <button onClick={onClick} className="flex flex-col items-center gap-3 group active:scale-95 transition-all">
      <div className={`w-16 h-16 md:w-20 md:h-20 ${color} rounded-[2rem] flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl group-hover:-translate-y-2 transition-all border border-white/5`}>
         <i className={`${icon} text-2xl md:text-3xl`}></i>
      </div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white">{label}</span>
   </button>
);

const ShareActionBtn = ({ onClick, icon, color, label }: { onClick: () => void, icon: string, color: string, label: string }) => (
   <button onClick={onClick} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform flex-shrink-0">
      <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/5 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all`}>
         <i className={`${icon} text-xl md:text-2xl`}></i>
      </div>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
   </button>
);

const CommunityCard = ({ icon, label, color, url }: { icon: string, label: string, color: string, url: string }) => (
   <button onClick={() => window.open(url, '_blank')} className="bg-slate-900/40 border border-slate-800 p-10 rounded-[3rem] flex flex-col items-center gap-6 group hover:border-blue-500/30 transition-all">
      <div className={`w-20 h-20 ${color} rounded-[2rem] flex items-center justify-center text-white text-3xl shadow-xl group-hover:scale-110 transition-transform`}>
         <i className={icon}></i>
      </div>
      <span className="font-black text-white uppercase text-xs tracking-widest">{label}</span>
   </button>
);

const PostCard: React.FC<{ post: ContentPost, onClick: () => void, isFav: boolean, isRead: boolean, onFav: (e: React.MouseEvent) => void }> = ({ post, onClick, isFav, isRead, onFav }) => (
  <div 
    className="card-tap bg-slate-900/40 border-2 border-slate-800/40 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col relative group h-full hover:border-blue-500/30 transition-all backdrop-blur-sm" 
    onClick={onClick}
  >
    <div className="relative h-72 overflow-hidden">
      <img src={post.images?.[0]?.url || 'https://placehold.co/800x600/1e293b/3b82f6?text=DiosMasGym'} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-95"></div>
      
      {isRead && (
        <div className="absolute top-8 left-8 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-5 py-2 rounded-full shadow-2xl border border-white/10">
           <i className="fas fa-check mr-2"></i> Hecho
        </div>
      )}

      <button onClick={onFav} className={`absolute top-8 right-8 w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-3xl shadow-2xl transition-all active:scale-90 ${isFav ? 'bg-blue-600 text-white shadow-blue-600/40 border border-blue-400/50' : 'bg-black/30 text-white border border-white/10 hover:bg-black/50'}`}>
        <i className={`${isFav ? 'fas' : 'far'} fa-star text-2xl`}></i>
      </button>
    </div>
    <div className="p-10 lg:p-12 flex-1 flex flex-col">
      <div className="flex gap-2 mb-8">
         {post.labels?.slice(0, 1).map(l => (
            <span key={l} className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-500/10 px-4 py-1.5 rounded-lg border border-blue-500/10">{l}</span>
         ))}
      </div>
      <h4 className="font-black text-white text-2xl lg:text-3xl leading-[1.1] mb-10 line-clamp-2 tracking-tighter group-hover:text-blue-400 transition-colors uppercase">{post.title}</h4>
      <div className="mt-auto flex items-center justify-between pt-8 border-t border-slate-800/50">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
           <i className="far fa-clock text-blue-500"></i> {post.readingTime || 5} min
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
           <i className="fas fa-arrow-right text-sm"></i>
        </div>
      </div>
    </div>
  </div>
);

export default App;
