import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import LyricCleaner from "./components/admin/LyricCleaner";
import SocialPostGenerator from "./components/admin/SocialPostGenerator";
import UpcomingReleases from "./components/UpcomingReleases";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import Footer from './components/Footer';
import CommentSection from './components/CommentSection';
import RecommendedSongs from './components/RecommendedSongs';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { fetchMusicCatalog } from './services/musicService';
import { ContentPost, AppState, AppView, MusicItem } from './types';

const VERSES = [
  { t: "MIRA QUE TE MANDO QUE TE ESFUERCES Y SEAS VALIENTE; NO TEMAS NI DESMAYES.", r: "JOSUÉ 1:9" },
  { t: "NO TEMAS, PORQUE YO ESTOY CONTIGO; NO DESMAYES, PORQUE YO SOY TU DIOS.", r: "ISAÍAS 41:10" },
  { t: "TODO LO PUEDO EN CRISTO QUE ME FORTALECE.", r: "FILIPENSES 4:13" },
  { t: "JEHOVÁ ES MI LUZ Y MI SALVACIÓN; ¿DE QUIÉN TEMERÉ?", r: "SALMOS 27:1" }
];

const normalizeText = (text: string) => {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const getRandomSample = <T,>(arr: T[], count: number): T[] => {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
};

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

  const syncLocked = useRef(false);

  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    return url.split('/').pop()?.replace('.html', '') || '';
  };

  const changeView = (view: AppView) => {
    setState(prev => ({ ...prev, currentView: view, selectedPost: null }));
    navigate(`/${view === 'inicio' ? '' : view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial Data Fetch
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

        if (posts.length > 0) setRandomPosts(getRandomSample(posts, 3));
        if (musicD.length > 0) setRandomMusicSong(musicD[Math.floor(Math.random() * musicD.length)]);
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        setShowSplash(false);
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: "Error de conexión con el Hub." }));
        setShowSplash(false);
      }
    };
    init();
  }, []);

  // BACKGROUND SYNC: Scans the entire history silently (only 548 posts = quick!)
  useEffect(() => {
    if (showSplash || syncLocked.current || !state.mainNextPageToken) return;

    const backgroundSync = async () => {
       syncLocked.current = true;
       try {
          const result = await fetchArsenalData(50, state.mainNextPageToken);
          if (result.posts.length > 0) {
             setState(prev => {
                const combined = [...prev.allPosts];
                result.posts.forEach(np => {
                   if (!combined.some(cp => cp.id === np.id)) combined.push(np);
                });
                return {
                   ...prev,
                   allPosts: combined,
                   mainNextPageToken: result.nextPageToken,
                   nextPageToken: prev.searchTerm ? prev.nextPageToken : result.nextPageToken
                };
             });
             
             // Update random posts as more articles come in (gives a "live" feel)
             setRandomPosts(prev => getRandomSample([...state.allPosts], 3));
          } else {
             setState(prev => ({ ...prev, mainNextPageToken: undefined }));
          }
       } catch (e) { } finally {
          syncLocked.current = false;
       }
    };

    const timer = setTimeout(backgroundSync, 3000); // Fetch next page every 3 seconds
    return () => clearTimeout(timer);
  }, [state.mainNextPageToken, state.allPosts.length, showSplash]);

  const loadMore = async () => {
    if ((!state.nextPageToken && !state.searchNextPageToken) || state.loading) return;
    
    const token = state.searchTerm ? state.searchNextPageToken : state.nextPageToken;
    if (!token) return;

    setState(p => ({ ...p, loading: true }));
    try {
      const result = await fetchArsenalData(40, token, state.searchTerm || undefined);
      setState(prev => {
        const isSearch = !!state.searchTerm;
        const targetList = isSearch ? [...prev.searchResults] : [...prev.allPosts];
        
        result.posts.forEach(np => {
           if (!targetList.some(tp => tp.id === np.id)) targetList.push(np);
        });

        return {
           ...prev,
           allPosts: isSearch ? prev.allPosts : targetList,
           searchResults: isSearch ? targetList : prev.searchResults,
           nextPageToken: isSearch ? prev.nextPageToken : result.nextPageToken,
           mainNextPageToken: isSearch ? prev.mainNextPageToken : result.nextPageToken,
           searchNextPageToken: isSearch ? result.nextPageToken : prev.searchNextPageToken,
           loading: false
        };
      });
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
      const term = normalizeText(state.searchTerm);
      
      // Combinar coincidencias locales de TODO el arsenal (incluye lo que cargamos en background)
      const localMatches = posts.filter(p => 
        normalizeText(p.title).includes(term) || 
        normalizeText(p.content).includes(term) ||
        p.labels?.some(l => normalizeText(l).includes(term))
      );
      
      // Combinar con resultados profundos de la API (si hay)
      const seenIds = new Set<string>();
      const combined = [...state.searchResults];
      combined.forEach(p => seenIds.add(p.id));
      
      localMatches.forEach(p => {
         if (!seenIds.has(p.id)) {
            combined.push(p);
            seenIds.add(p.id);
         }
      });
      
      // Ordenar por fecha descending
      return combined.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    }

    if (state.currentView === 'favoritos') posts = posts.filter(p => state.favorites.includes(p.id));
    if (state.selectedCategory) posts = posts.filter(p => p.labels?.includes(state.selectedCategory!));
    return posts;
  }, [state.allPosts, state.searchTerm, state.searchResults, state.selectedCategory, state.currentView, state.favorites]);

  // Remote Search Backup (for items not yet synced to background)
  useEffect(() => {
    const term = state.searchTerm.trim();
    if (term.length < 3) return;

    const handler = setTimeout(async () => {
       setState(p => ({ ...p, isSearching: true }));
       try {
          const result = await fetchArsenalData(30, undefined, term);
          setState(prev => {
             const newSearch = [...prev.searchResults];
             result.posts.forEach(np => {
                if (!newSearch.some(sp => sp.id === np.id)) newSearch.push(np);
             });
             return {
                ...prev,
                searchResults: newSearch,
                isSearching: false,
                searchNextPageToken: result.nextPageToken
             };
          });
       } catch (e) {
          setState(p => ({ ...p, isSearching: false }));
       }
    }, 1000);

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
    if (bloggerPathMatch && bloggerPathMatch[1]) { navigate(`/post/${bloggerPathMatch[1]}`, { replace: true }); return; }
    if (location.search.includes('m=1') && path === '/') { navigate('/', { replace: true }); }
  }, [location.pathname, location.search, navigate]);

  if (showSplash) {
    return (
      <div className="bg-[#05070a] fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none overflow-hidden">
        <div className="relative"><div className="text-[#c5a059] font-serif italic text-8xl md:text-9xl opacity-20 animate-pulse">Reflections</div><div className="absolute inset-0 flex items-center justify-center"><div className="h-px w-32 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent"></div></div></div>
        <div className="mt-12 text-[9px] font-black uppercase tracking-[1em] text-[#c5a059]/40 animate-fade-in">Cargando el Arsenal</div>
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
              <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => { const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)]; if (r) navigate(`/post/${getSlugFromUrl(r.url)}`); }} />
              <UpcomingReleases />
              <section className="py-32 bg-[#0a0c14]"><div className="section-container"><div className="flex items-center gap-6 mb-16"><div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div><h2 className="font-serif italic text-4xl text-[#c5a059]">Inspiración Diaria</h2><div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div></div><div className="grid grid-cols-12 gap-8">{randomPosts.map((p, idx) => ( <div key={p.id} className="col-span-12 md:col-span-4 transition-all hover:scale-105 duration-300"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] })); }} /></div>))}</div></div></section>
              {state.musicDiosmasgym.length > 0 && <MusicSection artist="diosmasgym" catalog={state.musicDiosmasgym} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomMusicSong} />}
              {state.musicJuan614.length > 0 && <MusicSection artist="juan614" catalog={state.musicJuan614} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} />}
              <section className="py-32 bg-[#05070a] border-y border-white/5"><div className="section-container"><div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12"><h2 className="font-serif text-5xl md:text-7xl leading-tight">Última <br /> <span className="italic text-[#c5a059]">Inspiración</span></h2><p className="text-[#94a3b8] max-w-sm pb-4 font-bold uppercase tracking-[0.3em] text-[10px] leading-relaxed">Artillería pesada para el espíritu guerrero.</p></div>               {state.allPosts[0] && ( <div className="grid grid-cols-12 gap-8 md:gap-16"><div className="col-span-12 lg:col-span-7"><PostCard post={state.allPosts[0]} onClick={() => navigate(`/post/${getSlugFromUrl(state.allPosts[0].url)}`)} isFav={state.favorites.includes(state.allPosts[0].id)} isRead={readingHistory.includes(state.allPosts[0].id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ ...prev, favorites: prev.favorites.includes(state.allPosts[0].id) ? prev.favorites.filter(id => id !== state.allPosts[0].id) : [...prev.favorites, state.allPosts[0].id] })); }} /></div><div className="col-span-12 lg:col-span-5 flex flex-col gap-16">{state.allPosts.slice(1, 3).map(p => ( <div key={p.id} className="transition-all hover:translate-x-2 duration-300"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] })); }} /></div>))}</div></div>)}
              </div></section>
              {categories.slice(1, 4).map((tag, sIdx) => {
                 const tagPosts = state.allPosts.filter(p => p.labels?.includes(tag));
                 const sample: ContentPost[] = getRandomSample(tagPosts, 3);
                 return (
                   <section key={tag} className={`py-32 ${sIdx % 2 === 0 ? 'bg-[#0a0c14]' : 'bg-[#05070a]'}`}>
                     <div className="section-container">
                       <div className="flex items-center justify-between mb-16 px-4 border-l-4 border-[#c5a059]">
                         <h3 className="font-serif italic text-4xl md:text-6xl text-white">{tag}</h3>
                         <button 
                           onClick={() => { setState(p => ({ ...p, selectedCategory: tag })); navigate('/reflexiones'); }} 
                           className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] hover:text-white transition-all underline decoration-[#c5a059]/30 underline-offset-8"
                         >
                           Material Completo
                         </button>
                       </div>
                       <div className="magazine-grid">
                         {sample.map(p => (
                            <div key={p.id} className="col-span-12 lg:col-span-4">
                              <PostCard 
                                post={p} 
                                onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} 
                                isFav={state.favorites.includes(p.id)} 
                                isRead={readingHistory.includes(p.id)} 
                                onFav={(e) => { 
                                  e.stopPropagation(); 
                                  setState(prev => ({ 
                                    ...prev, 
                                    favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] 
                                  })); 
                                }} 
                              />
                            </div>
                         ))}
                       </div>
                     </div>
                   </section>
                 );
               })}
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
                {state.mainNextPageToken && !state.searchTerm && (
                   <div className="mb-8 flex items-center gap-3 text-[8px] font-black uppercase tracking-widest text-[#c5a059]/40 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-[#c5a059]"></div>
                      Sincronizando archivo histórico... ({state.allPosts.length} artículos listos)
                   </div>
                )}
                <div className="mb-24 px-4"><CategoryBar categories={categories} selectedCategory={state.selectedCategory} onSelect={(cat) => setState(prev => ({ ...prev, selectedCategory: cat }))} /></div>
                <div className="magazine-grid mb-32">
                   {state.isSearching && ( <div className="col-span-12 py-20 text-center animate-pulse"><div className="inline-block w-12 h-12 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full mb-6"></div><p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Rescatando el Arsenal de Fe...</p></div> )}
                   {filteredPosts.map(p => ( <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4 transition-all duration-500"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] })); }} /></div> ))}
                   {filteredPosts.length === 0 && !state.isSearching && (
                      <div className="col-span-12 py-40 text-center"><p className="font-serif italic text-4xl opacity-20 text-white mb-8">Objetivo no localizado.</p><button onClick={() => setState(p => ({ ...p, searchTerm: '' }))} className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest border-b border-[#c5a059] pb-1">Resetear Rastreador</button></div>
                   )}
                </div>
                {(state.searchTerm ? state.searchNextPageToken : state.nextPageToken) && (
                  <div className="text-center py-20 border-t border-white/5"><button onClick={loadMore} disabled={state.loading} className="group relative px-12 py-6 bg-transparent border border-[#c5a059] overflow-hidden transition-all hover:bg-[#c5a059] duration-500 disabled:opacity-30"><div className="absolute inset-0 w-0 bg-[#c5a059] group-hover:w-full transition-all duration-500"></div><span className="relative z-10 text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] group-hover:text-black transition-colors">{state.loading ? 'Sincronizando...' : 'Cargar Más Material'}</span></button></div>
                )}
              </div>
            </section>
          } />
          <Route path="/favoritos" element={ <section className="py-32 min-h-screen bg-[#05070a]"><div className="section-container"><h1 className="font-serif text-7xl md:text-9xl mb-32 italic text-[#c5a059]">Mis Favoritos</h1><div className="magazine-grid">{filteredPosts.map(p => ( <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-4 transition-all duration-500"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState(prev => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter(id => id !== p.id) : [...prev.favorites, p.id] })); }} /></div> ))}{filteredPosts.length === 0 && <div className="col-span-12 py-40 text-center font-serif italic text-4xl opacity-20 text-white">Archivo vacío.</div>}</div></div></section> } />
          <Route path="/post/:slug" element={<PostView state={state} setState={setState} getSlugFromUrl={getSlugFromUrl} readingHistory={readingHistory} setReadingHistory={setReadingHistory} />} />
          <Route path="/admin" element={<AdminAuthWrapper><AdminDashboard/></AdminAuthWrapper>} />
          <Route path="/admin/promo-image" element={<AdminAuthWrapper><PromoImageApp/></AdminAuthWrapper>} />
          <Route path="/admin/lyric-studio" element={<AdminAuthWrapper><LyricStudio/></AdminAuthWrapper>} />
          <Route path="/admin/lyric-cleaner" element={<AdminAuthWrapper><LyricCleaner/></AdminAuthWrapper>} />
          <Route path="/admin/proximos-lanzamientos" element={<AdminAuthWrapper><ProximosLanzamientos/></AdminAuthWrapper>} />
          <Route path="/admin/social-post" element={<AdminAuthWrapper><SocialPostGenerator/></AdminAuthWrapper>} />
        </Routes>
      </main>
      <GlobalPlayer activeSong={state.activeSong} onClear={() => setState(p => ({ ...p, activeSong: null }))} />
      <PWAInstallPrompt />
      <Footer />
      {isSearchOpen && ( <div className="fixed inset-0 z-[2000] bg-[#05070a]/98 backdrop-blur-2xl flex items-center justify-center p-10 animate-fade-in"><div className="w-full max-w-5xl text-center"><input autoFocus type="text" value={state.searchTerm} onChange={e => { setState(p => ({ ...p, searchTerm: e.target.value })); navigate('/reflexiones'); }} placeholder="IDENTIFIQUE OBJETIVO..." className="w-full bg-transparent border-b-2 border-[#c5a059] py-12 text-6xl md:text-8xl font-serif italic text-white focus:outline-none placeholder-white/5" /><button onClick={() => setIsSearchOpen(false)} className="mt-20 text-[10px] font-black uppercase tracking-[0.8em] text-[#c5a059] hover:text-white transition-all active:scale-95">[ DESACTIVAR RASTREO ]</button></div></div> )}
    </div>
  );
};

const MusicSection: React.FC<{ artist: string; catalog: MusicItem[]; onPlay: (song: MusicItem) => void; randomSong?: MusicItem | null }> = ({ artist, catalog, onPlay, randomSong }) => {
  const isDios = artist === 'diosmasgym';
  const description = isDios 
    ? "Musica urbana" 
    : "música de corridos tumbados, banda sinaloense";

  return (
    <section className={`py-32 relative overflow-hidden transition-all duration-1000 ${isDios ? 'bg-[#05070a] border-y border-[#c5a059]/10' : 'bg-[#0a0c14]'}`}>
      {/* Visual Effect: Background Glow */}
      <div className={`absolute top-0 ${isDios ? 'right-0' : 'left-0'} w-[500px] h-[500px] bg-[#c5a059]/5 blur-[120px] rounded-full -translate-y-1/2 opacity-50`}></div>
      
      <div className="section-container relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
          <div className="flex items-center gap-8 group">
            <div className="w-20 h-20 rounded-full border-2 border-[#c5a059]/30 flex items-center justify-center relative overflow-hidden group-hover:border-[#c5a059] transition-all duration-700">
              <div className="absolute inset-0 bg-[#c5a059]/5 group-hover:animate-pulse"></div>
              <div className="w-6 h-6 bg-[#c5a059] rounded-full animate-spin-slow shadow-[0_0_20px_rgba(197,160,89,0.5)]"></div>
            </div>
            <div>
              <h2 className="font-serif italic text-5xl md:text-7xl capitalize mb-2 group-hover:tracking-wider transition-all duration-700">
                {artist}
              </h2>
              <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-[0.4em] opacity-60 group-hover:opacity-100 transition-opacity">
                {description}
              </p>
            </div>
          </div>
          
          {randomSong && ( 
            <div className="bg-[#c5a059]/5 border border-[#c5a059]/10 p-6 rounded-sm max-w-sm w-full backdrop-blur-sm hover:border-[#c5a059]/40 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-1 h-8 bg-[#c5a059]"></div>
                <h5 className="font-serif text-xl font-bold truncate text-white/90 group-hover:text-[#c5a059] transition-colors">{randomSong.name}</h5>
              </div>
              <button 
                onClick={() => onPlay(randomSong)} 
                className="relative overflow-hidden inline-block w-full py-4 bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl"
              >
                <span className="relative z-10">Reproducir Sugerencia</span>
              </button>
            </div> 
          )}
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {catalog.slice(0, 6).map((item, idx) => (
            <div 
              key={item.id} 
              className="col-span-12 md:col-span-6 lg:col-span-4 transition-all duration-700 hover:-translate-y-2"
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <MusicCard item={item} onPlay={() => onPlay(item)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const PostView: React.FC<{ state: AppState; setState: any; getSlugFromUrl: (url: string) => string; readingHistory: string[]; setReadingHistory: any }> = ({ state, setState, getSlugFromUrl, readingHistory, setReadingHistory }) => {
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
  }, [slug]);

  // 2. SCROLL TO TOP ON NAVIGATION
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // 2. DYNAMIC META TAGS (Professional Social Sharing)
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
          </div>
      </article>
      <section className="py-32 bg-[#0a0c14] border-t border-[#c5a059]/10"><div className="section-container"><h3 className="font-serif italic text-4xl mb-16 text-white/40">Más del Arsenal</h3><div className="grid grid-cols-12 gap-8">{state.allPosts.filter(p => p.id !== state.selectedPost?.id).slice(0, 3).map(p => ( <div key={p.id} className="col-span-12 lg:col-span-4 transition-all hover:-translate-y-2 duration-500"><PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} /></div> ))}</div></div></section>
    </div>
  );
};

export default App;
