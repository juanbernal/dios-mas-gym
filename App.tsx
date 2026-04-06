import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import MusicCard from './components/MusicCard';
import CategoryBar from './components/CategoryBar';
import GlobalPlayer from './components/GlobalPlayer';
import ArtistPromo from './components/ArtistPromo';
import AdminDashboard from "./components/admin/AdminDashboard";
import PromoImageApp from "./components/admin/PromoImageApp";
import LyricStudio from "./components/admin/LyricStudio";
import AdminAuthWrapper from "./components/admin/AdminAuthWrapper";
import ProximosLanzamientos from "./components/admin/ProximosLanzamientos";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
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
      nextPageToken: undefined,
      mainNextPageToken: undefined,
      searchNextPageToken: undefined,
      searchResults: [],
      isSearching: false
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
          error: null,
          nextPageToken: arsenalResult.nextPageToken,
          mainNextPageToken: arsenalResult.nextPageToken
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

  const loadMore = async () => {
    const currentToken = state.searchTerm ? state.searchNextPageToken : state.nextPageToken;
    if (!currentToken || state.loading) return;
    
    setState(p => ({ ...p, loading: true }));
    try {
      const result = await fetchArsenalData(30, currentToken, state.searchTerm || undefined);
      setState(prev => ({
        ...prev,
        allPosts: state.searchTerm ? prev.allPosts : [...prev.allPosts, ...result.posts],
        searchResults: state.searchTerm ? [...prev.searchResults, ...result.posts] : prev.searchResults,
        // Sincronizamos los tokens correspondientes
        nextPageToken: state.searchTerm ? prev.nextPageToken : result.nextPageToken,
        mainNextPageToken: state.searchTerm ? prev.mainNextPageToken : result.nextPageToken,
        searchNextPageToken: state.searchTerm ? result.nextPageToken : prev.searchNextPageToken,
        loading: false
      }));
    } catch (e) {
      setState(p => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    localStorage.setItem('dg_favs', JSON.stringify(state.favorites));
    localStorage.setItem('dg_history', JSON.stringify(readingHistory));
  }, [state.favorites, readingHistory]);

  const filteredPosts = useMemo(() => {
    let posts = state.allPosts;
    
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      // 1. Filtrar coincidencias locales
      const localMatches = posts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term) || 
        p.labels?.some(l => l.toLowerCase().includes(term))
      );
      
      // 2. Combinar con resultados remotos asegurando UNICIDAD por ID
      const seenIds = new Set<string>();
      const combinedResults = [...state.searchResults];
      combinedResults.forEach(p => seenIds.add(p.id));
      
      localMatches.forEach(p => {
         if (!seenIds.has(p.id)) {
            combinedResults.push(p);
            seenIds.add(p.id);
         }
      });
      
      return combinedResults;
    }

    if (state.currentView === 'favoritos') posts = posts.filter(p => state.favorites.includes(p.id));
    if (state.selectedCategory) posts = posts.filter(p => p.labels?.includes(state.selectedCategory!));
    return posts;
  }, [state.allPosts, state.searchTerm, state.searchResults, state.selectedCategory, state.currentView, state.favorites]);

  // Efecto de búsqueda profunda (Deep Search) - Debounced
  useEffect(() => {
    const term = state.searchTerm.trim();
    if (term.length < 3) {
      if (state.searchResults.length > 0) {
         setState(p => ({ 
            ...p, 
            searchResults: [], 
            isSearching: false, 
            searchNextPageToken: undefined 
         }));
      }
      return;
    }

    const handler = setTimeout(async () => {
       setState(p => ({ ...p, isSearching: true }));
       try {
          const result = await fetchArsenalData(40, undefined, term);
          setState(p => ({ 
            ...p, 
            searchResults: result.posts, 
            isSearching: false, 
            searchNextPageToken: result.nextPageToken 
          }));
       } catch (e) {
          setState(p => ({ ...p, isSearching: false }));
       }
    }, 600);

    return () => clearTimeout(handler);
  }, [state.searchTerm]);

  const categories = useMemo(() => {
    const labelCounts: Record<string, number> = {};
    state.allPosts.forEach(p => p.labels?.forEach(label => labelCounts[label] = (labelCounts[label] || 0) + 1));
    return Object.entries(labelCounts).sort((a, b) => b[1] - a[1]).map(([label]) => label).slice(0, 10);
  }, [state.allPosts]);
  
  useEffect(() => {
    const path = location.pathname;
    const bloggerPathMatch = path.match(/\/\d{4}\/\d{2}\/(.+)\.html/);
    if (bloggerPathMatch && bloggerPathMatch[1]) {
      const slug = bloggerPathMatch[1];
      navigate(`/post/${slug}`, { replace: true });
      return;
    }
    if (location.search.includes('m=1') && path === '/') {
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

              {/* Section: Daily Inspiration */}
              <section className="py-32 bg-[#0a0c14]">
                 <div className="section-container">
                    <div className="flex items-center gap-6 mb-16">
                       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
                       <h2 className="font-serif italic text-4xl text-[#c5a059]">Inspiración Diaria</h2>
                       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 gap-8">
                       {randomPosts.map((p, idx) => (
                          <div key={p.id} className="col-span-12 md:col-span-4 transition-all hover:scale-105 duration-300">
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

              {/* Music Sections */}
              {state.musicDiosmasgym.length > 0 && <MusicSection artist="diosmasgym" catalog={state.musicDiosmasgym} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomMusicSong} />}
              {state.musicJuan614.length > 0 && <MusicSection artist="juan614" catalog={state.musicJuan614} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} />}

              {/* Latest Inspiration */}
              <section className="py-32 bg-[#05070a] border-y border-white/5">
                 <div className="section-container">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                       <h2 className="font-serif text-5xl md:text-7xl leading-tight">Última <br /> <span className="italic text-[#c5a059]">Inspiración</span></h2>
                       <p className="text-[#94a3b8] max-w-sm pb-4 font-bold uppercase tracking-[0.3em] text-[10px] leading-relaxed">Artillería pesada para el espíritu guerrero.</p>
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
                                <div key={p.id} className="transition-all hover:translate-x-2 duration-300">
                                  <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                                    isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                                      ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                                    })); }} />
                                </div>
                             ))}
                          </div>
                       </div>
                    )}
                 </div>
              </section>

              {categories.slice(1, 4).map((tag, sIdx) => (
                <section key={tag} className={`py-32 ${sIdx % 2 === 0 ? 'bg-[#0a0c14]' : 'bg-[#05070a]'}`}>
                   <div className="section-container">
                      <div className="flex items-center justify-between mb-16 px-4 border-l-4 border-[#c5a059]">
                         <h3 className="font-serif italic text-4xl md:text-6xl text-white">{tag}</h3>
                         <button onClick={() => { setState(p => ({ ...p, selectedCategory: tag })); navigate('/reflexiones'); }} className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] hover:text-white transition-all underline decoration-[#c5a059]/30 underline-offset-8">Material Completo</button>
                      </div>
                      <div className="magazine-grid">
                         {state.allPosts.filter(p => p.labels?.includes(tag)).slice(0, 3).map(p => (
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

                <div className="magazine-grid mb-32">
                   {state.isSearching && (
                      <div className="col-span-12 py-20 text-center animate-pulse">
                         <div className="inline-block w-12 h-12 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full mb-6"></div>
                         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Rescatando el Arsenal de Fe...</p>
                         <p className="text-[8px] text-white/20 uppercase tracking-widest mt-2">(Escaneando el archivo histórico)</p>
                      </div>
                   )}
                   {filteredPosts.map(p => (
                      <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                      </div>
                   ))}
                   {filteredPosts.length === 0 && !state.isSearching && (
                      <div className="col-span-12 py-40 text-center">
                         <p className="font-serif italic text-4xl opacity-20 text-white mb-8">Objetivo no localizado.</p>
                         <button onClick={() => setState(p => ({ ...p, searchTerm: '' }))} className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest border-b border-[#c5a059] pb-1">Resetear Rastreador</button>
                      </div>
                   )}
                </div>

                {(state.searchTerm ? state.searchNextPageToken : state.mainNextPageToken) && (
                  <div className="text-center py-20 border-t border-white/5">
                    <button 
                      onClick={loadMore}
                      disabled={state.loading}
                      className="group relative px-12 py-6 bg-transparent border border-[#c5a059] overflow-hidden transition-all hover:bg-[#c5a059] duration-500 disabled:opacity-30"
                    >
                      <div className="absolute inset-0 w-0 bg-[#c5a059] group-hover:w-full transition-all duration-500"></div>
                      <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] group-hover:text-black transition-colors">
                        {state.loading ? 'Sincronizando...' : 'Cargar Más Material'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          } />

          <Route path="/favoritos" element={
            <section className="py-32 min-h-screen bg-[#05070a]">
              <div className="section-container">
                <h1 className="font-serif text-7xl md:text-9xl mb-32 italic text-[#c5a059]">Mis Favoritos</h1>
                <div className="magazine-grid">
                   {filteredPosts.map(p => (
                      <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4 transition-all duration-500">
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                          isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ 
                            ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                          })); }} />
                      </div>
                   ))}
                   {filteredPosts.length === 0 && <div className="col-span-12 py-40 text-center font-serif italic text-4xl opacity-20 text-white">Archivo vacío.</div>}
                </div>
              </div>
            </section>
          } />

          <Route path="/post/:slug" element={<PostView state={state} setState={setState} getSlugFromUrl={getSlugFromUrl} readingHistory={readingHistory} setReadingHistory={setReadingHistory} />} />
          <Route path="/admin" element={<AdminAuthWrapper><AdminDashboard/></AdminAuthWrapper>} />
          <Route path="/admin/promo-image" element={<AdminAuthWrapper><PromoImageApp/></AdminAuthWrapper>} />
          <Route path="/admin/lyric-studio" element={<AdminAuthWrapper><LyricStudio/></AdminAuthWrapper>} />
          <Route path="/admin/proximos-lanzamientos" element={<AdminAuthWrapper><ProximosLanzamientos/></AdminAuthWrapper>} />
        </Routes>
      </main>

      <GlobalPlayer activeSong={state.activeSong} onClear={() => setState(p => ({ ...p, activeSong: null }))} />
      <PWAInstallPrompt />

      <footer className="py-40 bg-[#05070a] border-t border-white/5 relative overflow-hidden text-center">
         <h2 className="font-serif italic text-6xl md:text-8xl mb-16 text-white/90">Dios Más Gym</h2>
         <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black tracking-[0.5em] text-[#c5a059] uppercase opacity-40"><span>Fe</span><span>Valentía</span><span>Disciplina</span></div>
         <div className="mt-24 h-px w-40 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto"></div>
         <p className="mt-12 text-[9px] font-bold tracking-[0.4em] text-white/20 uppercase">&copy; 2026 REFLECTIONS HUB PRO</p>
         <button onClick={() => navigate('/admin')} className="mt-8 text-[8px] font-black uppercase tracking-[0.5em] text-white/[0.03] hover:text-[#c5a059]/40 transition-all">[ MODO OPERADOR ]</button>
      </footer>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[2000] bg-[#05070a]/98 backdrop-blur-2xl flex items-center justify-center p-10 animate-fade-in">
           <div className="w-full max-w-5xl text-center">
             <input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }}
               placeholder="IDENTIFIQUE OBJETIVO..." 
               className="w-full bg-transparent border-b-2 border-[#c5a059] py-12 text-6xl md:text-8xl font-serif italic text-white focus:outline-none placeholder-white/5" />
             <button onClick={() => setIsSearchOpen(false)} className="mt-20 text-[10px] font-black uppercase tracking-[0.8em] text-[#c5a059] hover:text-white transition-all active:scale-95">[ DESACTIVAR RASTREO ]</button>
           </div>
        </div>
      )}
    </div>
  );
};

const MusicSection: React.FC<{ artist: string; catalog: MusicItem[]; onPlay: (s: MusicItem) => void; randomSong?: MusicItem | null }> = ({ artist, catalog, onPlay, randomSong }) => {
  return (
    <section className={`py-32 ${artist === 'diosmasgym' ? 'bg-[#05070a] border-y border-[#c5a059]/10' : 'bg-[#0a0c14]'}`}>
      <div className="section-container relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
           <div className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-full border-2 border-[#c5a059] flex items-center justify-center animate-spin-slow">
                 <div className="w-4 h-4 bg-[#c5a059] rounded-full"></div>
              </div>
              <h2 className="font-serif italic text-5xl md:text-7xl capitalize">{artist} <span className="text-[#c5a059]">{artist === 'diosmasgym' ? 'Records' : ''}</span></h2>
           </div>
           {randomSong && (
             <div className="bg-[#c5a059]/5 border border-[#c5a059]/20 p-6 rounded-sm max-w-sm w-full">
               <h5 className="font-serif text-xl font-bold mb-1 truncate">{randomSong.name}</h5>
               <button onClick={() => onPlay(randomSong)} className="inline-block w-full py-3 bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white mt-4">Reproducir Sugerencia</button>
             </div>
           )}
        </div>
        <div className="grid grid-cols-12 gap-6">
           {catalog.slice(0, 6).map(item => <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4"><MusicCard item={item} onPlay={() => onPlay(item)} /></div>)}
        </div>
      </div>
    </section>
  );
};

const PostView: React.FC<{ state: AppState; setState: any; getSlugFromUrl: (url: string) => string; readingHistory: string[]; setReadingHistory: any }> = ({ state, setState, getSlugFromUrl, readingHistory, setReadingHistory }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setError(null);
      const cached = [...state.allPosts, ...state.searchResults].find(p => getSlugFromUrl(p.url) === slug);
      if (cached && cached.content && !cached.content.endsWith('...')) {
        setState((p: any) => ({ ...p, selectedPost: cached }));
        if (!readingHistory.includes(cached.id)) setReadingHistory((prev: string[]) => [...prev, cached.id]);
        return;
      }
      
      const fetched = cached ? await fetchPostById(cached.id) : await fetchPostBySlug(slug);
      if (fetched) {
        setState((p: any) => ({ ...p, selectedPost: fetched }));
        if (!readingHistory.includes(fetched.id)) setReadingHistory((prev: string[]) => [...prev, fetched.id]);
      } else {
        setError("Lo sentimos, no pudimos encontrar esta reflexión en El Arsenal.");
      }
    };
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (error) return <div className="py-80 bg-[#05070a] text-center px-8 text-white"><h2 className="font-serif italic text-4xl text-[#c5a059] mb-8">{error}</h2><button onClick={() => navigate('/reflexiones')} className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 border-b border-[#c5a059]">Regresar al Arsenal</button></div>;
  if (!state.selectedPost) return <div className="py-80 bg-[#05070a] text-center font-serif italic text-5xl opacity-20 text-[#c5a059] animate-pulse">Sincronizando sabiduría...</div>;

  return (
    <div className="bg-[#05070a] animate-fade-in-up">
      <div className="relative min-h-[70vh] flex items-center overflow-hidden">
         <img src={state.selectedPost.images?.[0]?.url || ''} className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 scale-105" alt="" />
         <div className="absolute inset-0 bg-gradient-to-t from-[#05070a]"></div>
         <div className="section-container relative z-10 pt-40 pb-20">
            <button onClick={() => navigate(-1)} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group"><div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Hub</button>
            <h1 className="font-serif italic text-5xl md:text-8xl mb-12 text-white leading-[1.1] max-w-5xl transition-all duration-1000">{state.selectedPost.title}</h1>
            <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]/50"><span>{new Date(state.selectedPost.published).toLocaleDateString()}</span> {state.selectedPost.labels?.[0] && <span>TEMA: {state.selectedPost.labels[0]}</span>}</div>
         </div>
      </div>
      <article className="py-24 md:py-40 bg-white">
          <div className="max-w-4xl mx-auto px-8 md:px-0">
            <ArtistPromo artist={Math.random() > 0.5 ? 'diosmasgym' : 'juan614'} mode="social" musicCatalog={state.musicDiosmasgym} onPlaySong={(s) => setState((p: any) => ({ ...p, activeSong: s }))} />
            <div className="blogger-body text-black text-xl md:text-2xl leading-[1.8] font-light mt-16 text-justify" dangerouslySetInnerHTML={{ __html: state.selectedPost.content || '' }}></div>
          </div>
      </article>
      <section className="py-32 bg-[#0a0c14] border-t border-[#c5a059]/10">
         <div className="section-container">
            <h3 className="font-serif italic text-4xl mb-16 text-white/40">Más del Arsenal</h3>
            <div className="grid grid-cols-12 gap-8">
               {state.allPosts.filter(p => p.id !== state.selectedPost?.id).slice(0, 3).map(p => (
                  <div key={p.id} className="col-span-12 lg:col-span-4 transition-all hover:-translate-y-2 duration-500"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} /></div>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
};

export default App;
