import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Hero from './components/Hero';
import PostCard from './components/PostCard';
import MusicCard from './components/MusicCard';
import CategoryBar from './components/CategoryBar';
import GlobalPlayer from './components/GlobalPlayer';
import ArtistPromo from './components/ArtistPromo';
import SmartLinkView from "./components/SmartLinkView";
import AdminAuthWrapper from "./components/admin/AdminAuthWrapper";
import LinkBioPublic from "./components/LinkBioPublic";
import UpcomingReleases from "./components/UpcomingReleases";
import TemploGuerrero from "./components/TemploGuerrero";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import Footer from './components/Footer';
import CommentSection from './components/CommentSection';
import RecommendedSongs from './components/RecommendedSongs';
import RelatedPosts from './components/RelatedPosts';
import MusicSection from './components/MusicSection';
import PostView from './components/PostView';
import { fetchArsenalData, fetchPostBySlug, fetchPostById } from './services/contentService';
import { fetchMusicCatalog } from './services/musicService';
import { ContentPost, AppState, AppView, MusicItem } from './types';
import SocialPopup, { InlineSocialBanner } from './components/SocialPromo';
import { useAnalytics } from './hooks/useAnalytics';

// Lazy load admin tools to reduce initial bundle size (Performance Audit)
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const PromoImageApp = React.lazy(() => import('./components/admin/PromoImageApp'));
const SmartLinksAdmin = React.lazy(() => import('./components/admin/SmartLinksAdmin'));
const EPKGenerator = React.lazy(() => import('./components/admin/EPKGenerator'));
const CanvasCreator = React.lazy(() => import('./components/admin/CanvasCreator'));
const LyricStudio = React.lazy(() => import('./components/admin/LyricStudio'));
const ProximosLanzamientos = React.lazy(() => import('./components/admin/ProximosLanzamientos'));
const LyricCleaner = React.lazy(() => import('./components/admin/LyricCleaner'));
const SocialPostGenerator = React.lazy(() => import('./components/admin/SocialPostGenerator'));
const AIPressRelease = React.lazy(() => import('./components/admin/AIPressRelease'));
const MetadataTagger = React.lazy(() => import('./components/admin/MetadataTagger'));
const LinkBioAdmin = React.lazy(() => import('./components/admin/LinkBioAdmin'));
const VideoSnippetCreator = React.lazy(() => import('./components/admin/VideoSnippetCreator'));
const SmartLinkVideoGenerator = React.lazy(() => import('./components/admin/SmartLinkVideoGenerator'));
const LyricsManager = React.lazy(() => import('./components/admin/LyricsManager'));
const ContentCalendar = React.lazy(() => import('./components/admin/ContentCalendar'));
const AntiAIWatermark = React.lazy(() => import('./components/admin/AntiAIWatermark'));
const PushNotificationsAdmin = React.lazy(() => import('./components/admin/PushNotificationsAdmin'));
const AnalyticsDashboard = React.lazy(() => import('./components/admin/AnalyticsDashboard'));
const MusicVideoPromptGenerator = React.lazy(() => import('./components/admin/MusicVideoPromptGenerator'));
const CustomPromoCreator = React.lazy(() => import('./components/admin/CustomPromoCreator'));
const SplitSheetGenerator = React.lazy(() => import('./components/admin/SplitSheetGenerator'));
const MaintenanceAdmin = React.lazy(() => import('./components/admin/MaintenanceAdmin'));

import MaintenanceView from './components/MaintenanceView';
import { fetchMaintenanceStatus } from './services/maintenanceService';

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
  const [maintenance, setMaintenance] = useState({ enabled: false, videoUrl: '' });
  const [randomPosts, setRandomPosts] = useState<ContentPost[]>([]);
  const [randomMusicSong, setRandomMusicSong] = useState<MusicItem | null>(null);
  const [randomJuan614Song, setRandomJuan614Song] = useState<MusicItem | null>(null);
  
  const dailyRecommendations = useMemo(() => {
    const dm = state.musicDiosmasgym;
    const j6 = state.musicJuan614;
    
    if (dm.length === 0 && j6.length === 0) return null;
    
    // Deterministic seed based on YYYY-MM-DD
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const getNewAndOld = (catalog: MusicItem[], seed: number) => {
      if (catalog.length === 0) return { newSong: null, oldSong: null };
      
      // Sort by date to get newest.
      const sorted = [...catalog].sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      const newSong = sorted[0];
      const remainder = sorted.slice(1);
      
      let oldSong = null;
      if (remainder.length > 0) {
        const oldIndex = Math.abs(seed) % remainder.length;
        oldSong = remainder[oldIndex];
      } else {
        oldSong = newSong; // Fallback
      }
      
      return { newSong, oldSong };
    };
    
    const dmSongs = getNewAndOld(dm, hash);
    const j6Songs = getNewAndOld(j6, hash + 7); // offset seed for second artist
    
    return {
      dmNew: dmSongs.newSong,
      dmOld: dmSongs.oldSong,
      j6New: j6Songs.newSong,
      j6Old: j6Songs.oldSong,
    };
  }, [state.musicDiosmasgym, state.musicJuan614]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();

  const syncLocked = useRef(false);

  const refreshRandomPosts = useCallback(() => {
    if (state.allPosts.length > 0) setRandomPosts(getRandomSample(state.allPosts, 3));
  }, [state.allPosts]);

  // Scroll-based infinite load for home
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (location.pathname !== '/') return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [location.pathname, state.nextPageToken, state.loading]);

  const getSlugFromUrl = (url: string) => {
    if (!url) return '';
    return url.split('/').pop()?.replace('.html', '') || '';
  };

  useEffect(() => {
    if (state.activeSong) {
      trackEvent('song_play', { 
        title: state.activeSong.name, 
        artist: state.activeSong.artist 
      });
    }
  }, [state.activeSong]);

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
        const [arsenalResult, musicD, musicJ, maintStatus] = await Promise.all([
          fetchArsenalData(50),
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614'),
          fetchMaintenanceStatus().catch(() => ({ enabled: false, videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4' }))
        ]);

        if (maintStatus) {
          setMaintenance(maintStatus);
        }

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
        if (musicJ.length > 0) setRandomJuan614Song(musicJ[Math.floor(Math.random() * musicJ.length)]);
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
      // Función para calcular relevancia
      const getRelevanceScore = (post: typeof state.allPosts[0], query: string) => {
         const titleNormalized = normalizeText(post.title);
         const queryNormalized = normalizeText(query);
         let score = 0;

         // 1. Coincidencia en el Título
         if (titleNormalized === queryNormalized) {
            score += 200; // Coincidencia exacta
         } else if (titleNormalized.startsWith(queryNormalized)) {
            score += 150; // Empieza con el término
         } else if (titleNormalized.includes(queryNormalized)) {
            score += 100; // Contiene el término
         }

         // 2. Coincidencia en Etiquetas/Categorías
         if (post.labels) {
            const hasExactLabel = post.labels.some(l => normalizeText(l) === queryNormalized);
            if (hasExactLabel) {
               score += 80;
            } else {
               const hasPartialLabel = post.labels.some(l => normalizeText(l).includes(queryNormalized));
               if (hasPartialLabel) {
                  score += 40;
               }
            }
         }

         // 3. Coincidencia en el Cuerpo del Artículo
         if (post.content) {
            const contentNormalized = normalizeText(post.content);
            if (contentNormalized.includes(queryNormalized)) {
               score += 10; // Coincidencia básica
               const occurrences = contentNormalized.split(queryNormalized).length - 1;
               score += Math.min(occurrences * 5, 30); // Frecuencia de aparición (max 30)
            }
         }

         return score;
      };

      // Ordenar por relevancia descendente, usando la fecha de publicación como desempate
      return combined.sort((a, b) => {
         const scoreA = getRelevanceScore(a, state.searchTerm);
         const scoreB = getRelevanceScore(b, state.searchTerm);
         if (scoreB !== scoreA) {
            return scoreB - scoreA;
         }
         return new Date(b.published).getTime() - new Date(a.published).getTime();
      });
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

  const readingCounts = useMemo(() => {
    const map: Record<string, number> = {};
    readingHistory.forEach(id => { map[id] = (map[id] || 0) + 1; });
    return map;
  }, [readingHistory]);

  const recentPosts = useMemo(() => {
    const weekAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return state.allPosts.filter(p => new Date(p.published).getTime() > weekAgo).slice(0, 4);
  }, [state.allPosts]);

  const continueReading = useMemo(() => {
    return readingHistory.map(id => state.allPosts.find(p => p.id === id)).filter((p): p is ContentPost => !!p).reverse().slice(0, 3);
  }, [readingHistory, state.allPosts]);

  const popularPosts = useMemo(() => {
    return [...state.allPosts]
      .filter(p => readingCounts[p.id] > 0)
      .sort((a, b) => (readingCounts[b.id] || 0) - (readingCounts[a.id] || 0))
      .slice(0, 3);
  }, [state.allPosts, readingCounts]);

  const unreadPosts = useMemo(() => {
    return state.allPosts
      .filter(p => !readingHistory.includes(p.id))
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, 3);
  }, [state.allPosts, readingHistory]);
  
  useEffect(() => {
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
      window.location.replace(window.location.origin + '/#/admin');
      return;
    }
    const path = location.pathname;
    const bloggerPathMatch = path.match(/\/\d{4}\/\d{2}\/(.+)\.html/);
    if (bloggerPathMatch && bloggerPathMatch[1]) { navigate(`/post/${bloggerPathMatch[1]}`, { replace: true }); return; }
    if (location.search.includes('m=1') && path === '/') { navigate('/', { replace: true }); }
  }, [location.pathname, location.search, navigate]);

  const isSmartLinkRoute = location.pathname.startsWith('/link/');
  const isToolRoute = location.pathname.startsWith('/admin');
  const isBioRoute = location.pathname.startsWith('/bio');
  const hideGlobalUI = isSmartLinkRoute || isToolRoute || isBioRoute;

  if (maintenance.enabled && !isToolRoute) {
    return <MaintenanceView videoUrl={maintenance.videoUrl} />;
  }

  if (showSplash && !isBioRoute && !isSmartLinkRoute) {
    return (
      <div className="bg-[#05070a] fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none overflow-hidden">
        <div className="relative"><div className="text-[#c5a059] font-serif italic text-8xl md:text-9xl opacity-20 animate-pulse">Reflections</div><div className="absolute inset-0 flex items-center justify-center"><div className="h-px w-32 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent"></div></div></div>
        <div className="mt-12 text-[9px] font-black uppercase tracking-[1em] text-[#c5a059]/40 animate-fade-in">Cargando el Arsenal</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-[#f8fafc] font-sans selection:bg-[#c5a059] selection:text-black">
      {!hideGlobalUI && <SocialPopup />}
      {!hideGlobalUI && <Navbar currentView={state.currentView} changeView={changeView} onSearch={() => setIsSearchOpen(true)} />}
      <main className={!hideGlobalUI ? "pt-20 pb-24 md:pb-0" : ""}>
        <Routes>
          <Route path="/" element={
            <>
              <Hero verse={verse} onEntrenar={() => changeView('reflexiones')} onAleatorio={() => { const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)]; if (r) navigate(`/post/${getSlugFromUrl(r.url)}`); }} />
              <section id="arsenal-content"><UpcomingReleases /></section>

              <div className="px-4 md:px-0">
                  <InlineSocialBanner />
              </div>

              {/* CONTINUAR LEYENDO */}
              {continueReading.length > 0 && (
                <section className="py-24 bg-[#05070a] border-b border-white/5">
                  <div className="section-container">
                    <div className="flex items-center gap-4 mb-12">
                      <div className="w-10 h-10 rounded-full bg-[#c5a059]/20 flex items-center justify-center text-[#c5a059]">
                        <i className="fas fa-book-open text-sm"></i>
                      </div>
                      <h2 className="font-serif italic text-3xl text-white">Continuar Leyendo</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 gap-8">
                      {continueReading.map(p => (
                        <div key={p.id} className="col-span-12 md:col-span-4">
                          <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={true} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* INSPIRACIÓN DIARIA */}
              <section className="py-28 bg-[#0a0c14]">
                <div className="section-container">
                  <div className="flex items-center gap-6 mb-16">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
                    <div className="flex items-center gap-4">
                      <h2 className="font-serif italic text-4xl text-[#c5a059]">Inspiración Diaria</h2>
                      <button onClick={refreshRandomPosts} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/30 hover:text-[#c5a059] hover:border-[#c5a059]/30 transition-all text-xs" title="Refrescar">
                        <i className="fas fa-shuffle"></i>
                      </button>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#c5a059]/20 via-transparent to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-8">
                    {randomPosts.length > 0 ? randomPosts.slice(0, 3).map((p, idx) => (
                      <div key={p.id} className={`col-span-12 ${idx === 0 ? 'md:col-span-6' : 'md:col-span-3'} transition-all hover:scale-[1.02] duration-300`}>
                        <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size={idx === 0 ? 'lg' : 'md'} />
                      </div>
                    )) : (
                      <div className="col-span-12 py-20 text-center text-white/20 font-serif italic text-2xl">Cargando arsenal...</div>
                    )}
                  </div>
                </div>
              </section>

              {/* RECIÉN LLEGADOS */}
              {recentPosts.length > 0 && (
                <section className="py-28 bg-[#05070a] border-y border-white/5">
                  <div className="section-container">
                    <div className="flex items-center gap-4 mb-16">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <i className="fas fa-clock text-sm"></i>
                      </div>
                      <h2 className="font-serif italic text-3xl md:text-4xl text-white">Recién Llegados</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                      <button onClick={() => changeView('reflexiones')} className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] hover:text-white transition-all underline decoration-[#c5a059]/30 underline-offset-8 flex-shrink-0">
                        Ver Todo
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-8">
                      {recentPosts.map(p => (
                        <div key={p.id} className="col-span-12 md:col-span-6 lg:col-span-3">
                          <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* RECOMENDACIÓN DIARIA DE MÚSICA */}
              {dailyRecommendations && (
                <section className="py-24 bg-[#0a0c14] border-t border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#c5a059]/3 blur-[140px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                  <div className="section-container relative z-10">
                    <div className="flex flex-col items-center mb-14 text-center">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
                        <h2 className="font-serif italic text-4xl text-[#c5a059]">Las Recomendaciones de Hoy</h2>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
                      </div>
                      <p className="text-[10px] text-white/45 font-black uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
                        Lo nuevo y lo clásico de cada artista. Una selección diaria rotativa para difundir todo nuestro arsenal.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { song: dailyRecommendations.dmNew, isNew: true, label: "Dios Mas Gym" },
                        { song: dailyRecommendations.dmOld, isNew: false, label: "Dios Mas Gym" },
                        { song: dailyRecommendations.j6New, isNew: true, label: "Juan614" },
                        { song: dailyRecommendations.j6Old, isNew: false, label: "Juan614" }
                      ].map(({ song, isNew, label }) => {
                        if (!song) return null;
                        const isJuan = song.artist.toLowerCase().includes('juan');
                        return (
                          <div 
                            key={`${song.id}-${isNew ? 'new' : 'old'}`} 
                            className="group relative bg-[#0f111a]/85 border border-white/5 rounded-[2rem] p-5 hover:border-[#c5a059]/40 transition-all duration-500 overflow-hidden gold-border-glow flex flex-col justify-between h-full"
                          >
                            <div className="absolute -top-24 -right-24 w-56 h-56 blur-[90px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: isJuan ? '#8B5A2B22' : '#c5a05922' }}></div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-4 gap-2">
                                <span className={`px-3 py-1 rounded-full text-[7.5px] font-black uppercase tracking-[0.2em] ${isNew ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059]'}`}>
                                  {isNew ? '🚀 LO NUEVO' : '💎 CLÁSICO / TBT'}
                                </span>
                                <span className="text-[7.5px] font-black uppercase tracking-widest text-white/20">
                                  {label}
                                </span>
                              </div>
                              
                              <div 
                                className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.4)] group-hover:scale-[1.02] transition-transform duration-700 cursor-pointer mb-5"
                                onClick={() => setState((p: any) => ({ ...p, activeSong: song }))}
                              >
                                <img src={song.cover} alt={song.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors"></div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(197,160,89,0.6)]">
                                    <i className="fas fa-play text-black text-xs ml-0.5"></i>
                                  </div>
                                </div>
                              </div>
                              
                              <h4 className="font-serif text-xl font-bold text-white mb-1 truncate group-hover:text-[#c5a059] transition-colors leading-tight">
                                {song.name}
                              </h4>
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-5">
                                {song.artist}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setState((p: any) => ({ ...p, activeSong: song }))}
                                className="flex-1 py-3 rounded-full bg-[#c5a059] text-black text-[8.5px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:scale-102 active:scale-95 transition-all shadow-md"
                              >
                                <i className="fas fa-play"></i>
                                Escuchar
                              </button>
                              <a 
                                href={`/link/${song.id}`} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-full border border-white/10 text-white/50 hover:bg-white hover:text-black transition-all flex items-center justify-center"
                                title="Smart Link"
                              >
                                <i className="fas fa-link text-[10px]"></i>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* TEMPLO DEL GUERRERO */}
              <TemploGuerrero catalog={[...state.musicDiosmasgym, ...state.musicJuan614]} onPlaySong={(song) => setState(p => ({ ...p, activeSong: song }))} />

              {/* MÚSICA */}
              {state.musicDiosmasgym.length > 0 && <MusicSection artist="diosmasgym" catalog={state.musicDiosmasgym} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomMusicSong} />}
              {state.musicJuan614.length > 0 && <MusicSection artist="juan614" catalog={state.musicJuan614} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomJuan614Song} />}

              {/* ÚLTIMA INSPIRACIÓN */}
              <section className="py-32 bg-[#05070a] border-y border-white/5">
                <div className="section-container">
                  <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
                    <h2 className="font-serif text-5xl md:text-7xl leading-tight">Última <br /> <span className="italic text-[#c5a059]">Inspiración</span></h2>
                    <p className="text-[#94a3b8] max-w-sm pb-4 font-bold uppercase tracking-[0.3em] text-[10px] leading-relaxed">Artillería pesada para el espíritu guerrero.</p>
                  </div>
                  {state.allPosts[0] && (
                    <div className="grid grid-cols-12 gap-8 md:gap-16">
                      <div className="col-span-12 lg:col-span-7">
                        <PostCard post={state.allPosts[0]} onClick={() => navigate(`/post/${getSlugFromUrl(state.allPosts[0].url)}`)} isFav={state.favorites.includes(state.allPosts[0].id)} isRead={readingHistory.includes(state.allPosts[0].id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(state.allPosts[0].id) ? prev.favorites.filter((id: string) => id !== state.allPosts[0].id) : [...prev.favorites, state.allPosts[0].id] })); }} size="lg" />
                      </div>
                      <div className="col-span-12 lg:col-span-5 flex flex-col gap-16">
                        {state.allPosts.slice(1, 3).map(p => (
                          <div key={p.id} className="transition-all hover:translate-x-2 duration-300">
                            <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* LO MÁS LEÍDO */}
              {popularPosts.length > 0 && (
                <section className="py-28 bg-[#0a0c14]">
                  <div className="section-container">
                    <div className="flex items-center gap-4 mb-16">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                        <i className="fas fa-fire text-sm"></i>
                      </div>
                      <h2 className="font-serif italic text-3xl md:text-4xl text-white">Lo Más Leído</h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-12 gap-8">
                      {popularPosts.map(p => (
                        <div key={p.id} className="col-span-12 md:col-span-4">
                          <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size="md" />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* CATEGORÍAS */}
              {categories.slice(1, 6).map((tag, sIdx) => {
                 const tagPosts = state.allPosts.filter(p => p.labels?.includes(tag));
                 const sample: ContentPost[] = getRandomSample(tagPosts, 3);
                 return (
                   <section key={tag} className={`py-28 ${sIdx % 2 === 0 ? 'bg-[#0a0c14]' : 'bg-[#05070a]'}`}>
                     <div className="section-container">
                       <div className="flex items-center justify-between mb-16 px-4 border-l-4 border-[#c5a059]">
                         <div className="flex items-center gap-4">
                           <h3 className="font-serif italic text-3xl md:text-5xl text-white">{tag}</h3>
                           <span className="text-[9px] font-black text-white/20 bg-white/5 px-3 py-1 rounded-full">{tagPosts.length} posts</span>
                         </div>
                         <button 
                           onClick={() => { setState((p: any) => ({ ...p, selectedCategory: tag })); navigate('/reflexiones'); }} 
                           className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] hover:text-white transition-all underline decoration-[#c5a059]/30 underline-offset-8"
                         >
                           Material Completo
                         </button>
                       </div>
                       <div className="magazine-grid">
                         {sample.length > 0 ? sample.map(p => (
                            <div key={p.id} className="col-span-12 lg:col-span-4">
                              <PostCard post={p} onClick={() => navigate(`/post/${getSlugFromUrl(p.url)}`)} isFav={state.favorites.includes(p.id)} isRead={readingHistory.includes(p.id)} onFav={(e) => { e.stopPropagation(); setState((prev: any) => ({ ...prev, favorites: prev.favorites.includes(p.id) ? prev.favorites.filter((id: string) => id !== p.id) : [...prev.favorites, p.id] })); }} size="sm" />
                            </div>
                         )) : (
                           <div className="col-span-12 py-16 text-center text-white/20 font-serif italic text-xl">Explorando esta categoría...</div>
                         )}
                       </div>
                     </div>
                   </section>
                 );
               })}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-10"></div>
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
          
          {/* Admin Routes with Lazy Loading and Suspense */}
          <Route path="/admin/*" element={
            <React.Suspense fallback={<div className="min-h-screen bg-[#05070a] flex items-center justify-center text-[#c5a059] font-serif italic text-4xl animate-pulse">Cargando Módulo...</div>}>
              <Routes>
                <Route path="" element={<AdminAuthWrapper><AdminDashboard/></AdminAuthWrapper>} />
                <Route path="promo-image" element={<AdminAuthWrapper><PromoImageApp/></AdminAuthWrapper>} />
                <Route path="smart-links" element={<AdminAuthWrapper><SmartLinksAdmin/></AdminAuthWrapper>} />
                <Route path="epk-generator" element={<AdminAuthWrapper><EPKGenerator/></AdminAuthWrapper>} />
                <Route path="canvas-creator" element={<AdminAuthWrapper><CanvasCreator/></AdminAuthWrapper>} />
                <Route path="lyric-studio" element={<AdminAuthWrapper><LyricStudio/></AdminAuthWrapper>} />
                <Route path="lyric-cleaner" element={<AdminAuthWrapper><LyricCleaner/></AdminAuthWrapper>} />
                <Route path="proximos-lanzamientos" element={<AdminAuthWrapper><ProximosLanzamientos/></AdminAuthWrapper>} />
                <Route path="social-post" element={<AdminAuthWrapper><SocialPostGenerator/></AdminAuthWrapper>} />
                <Route path="press-release" element={<AdminAuthWrapper><AIPressRelease/></AdminAuthWrapper>} />
                <Route path="metadata-tagger" element={<AdminAuthWrapper><MetadataTagger/></AdminAuthWrapper>} />
                <Route path="links" element={<AdminAuthWrapper><LinkBioAdmin/></AdminAuthWrapper>} />
                <Route path="video-snippet" element={<AdminAuthWrapper><VideoSnippetCreator/></AdminAuthWrapper>} />
                <Route path="smartlink-video" element={<AdminAuthWrapper><SmartLinkVideoGenerator/></AdminAuthWrapper>} />
                <Route path="lyrics-manager" element={<AdminAuthWrapper><LyricsManager/></AdminAuthWrapper>} />
                <Route path="content-calendar" element={<AdminAuthWrapper><ContentCalendar/></AdminAuthWrapper>} />
                <Route path="watermark" element={<AdminAuthWrapper><AntiAIWatermark/></AdminAuthWrapper>} />
                <Route path="push-notifications" element={<AdminAuthWrapper><PushNotificationsAdmin/></AdminAuthWrapper>} />
                <Route path="analytics" element={<AdminAuthWrapper><AnalyticsDashboard/></AdminAuthWrapper>} />
                <Route path="music-video-prompt" element={<AdminAuthWrapper><MusicVideoPromptGenerator/></AdminAuthWrapper>} />
                <Route path="custom-promo" element={<AdminAuthWrapper><CustomPromoCreator/></AdminAuthWrapper>} />
                <Route path="split-sheet" element={<AdminAuthWrapper><SplitSheetGenerator/></AdminAuthWrapper>} />
                <Route path="maintenance" element={<AdminAuthWrapper><MaintenanceAdmin/></AdminAuthWrapper>} />
              </Routes>
            </React.Suspense>
          } />

          <Route path="/link/:id" element={<SmartLinkView />} />
          <Route path="/bio" element={<LinkBioPublic />} />
          <Route path="/bio/:artist" element={<LinkBioPublic />} />
        </Routes>
      </main>
      {!hideGlobalUI && <BottomNav currentView={state.currentView} changeView={changeView} />}
      {!hideGlobalUI && <GlobalPlayer activeSong={state.activeSong} onClear={() => setState(p => ({ ...p, activeSong: null }))} />}
      {!hideGlobalUI && state.allPosts.length > 0 && (
        <button
          onClick={() => { const r = state.allPosts[Math.floor(Math.random() * state.allPosts.length)]; if (r) navigate(`/post/${getSlugFromUrl(r.url)}`); }}
          className="fixed bottom-28 md:bottom-8 right-6 z-[100] w-14 h-14 rounded-full bg-[#c5a059] text-black shadow-xl hover:bg-white transition-all hover:scale-110 flex items-center justify-center"
          title="Post Aleatorio"
        >
          <i className="fas fa-shuffle text-lg"></i>
        </button>
      )}
      {location.pathname.startsWith('/admin') && <PWAInstallPrompt />}
      {!hideGlobalUI && <Footer />}
      {isSearchOpen && !hideGlobalUI && (
        <div className="fixed inset-0 z-[2000] bg-[#05070a]/98 backdrop-blur-2xl flex flex-col items-center justify-start p-6 md:p-24 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-5xl text-center mt-12 md:mt-20">
            <input 
              autoFocus 
              type="text" 
              value={state.searchTerm} 
              onChange={e => { 
                setState(p => ({ ...p, searchTerm: e.target.value })); 
                navigate('/reflexiones'); 
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
              placeholder="IDENTIFIQUE OBJETIVO..." 
              className="w-full bg-transparent border-b-2 border-[#c5a059] py-8 md:py-12 text-3xl md:text-7xl font-serif italic text-white focus:outline-none placeholder-white/5 uppercase" 
            />
            
            {/* Live Search Results Grid (Real-time cards with images) */}
            {state.searchTerm.trim().length >= 2 && (
              <div className="mt-12 text-left w-full animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#c5a059]">
                    Objetivos Localizados ({filteredPosts.length})
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 font-mono">
                    Haga clic para entrenar / Presione Enter para ver todo
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[55vh] overflow-y-auto pr-2 py-2">
                  {filteredPosts.slice(0, 6).map(p => (
                    <div key={p.id} className="transition-all duration-300 hover:scale-[1.01]">
                      <PostCard 
                        post={p} 
                        onClick={() => {
                          navigate(`/post/${getSlugFromUrl(p.url)}`);
                          setIsSearchOpen(false);
                        }} 
                        isFav={state.favorites.includes(p.id)} 
                        isRead={readingHistory.includes(p.id)} 
                        onFav={(e) => { 
                          e.stopPropagation(); 
                          setState((prev: any) => ({ 
                            ...prev, 
                            favorites: prev.favorites.includes(p.id) 
                              ? prev.favorites.filter((id: string) => id !== p.id) 
                              : [...prev.favorites, p.id] 
                          })); 
                        }} 
                        size="sm" 
                      />
                    </div>
                  ))}
                  {filteredPosts.length === 0 && (
                    <p className="text-center py-20 col-span-1 md:col-span-2 lg:col-span-3 text-white/30 font-serif italic text-base">
                      No se localizaron objetivos en el archivo para esta búsqueda.
                    </p>
                  )}
                </div>
              </div>
            )}

            <button 
              onClick={() => setIsSearchOpen(false)} 
              className="mt-16 px-8 py-3.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] hover:bg-[#c5a059] hover:text-black hover:border-transparent transition-all active:scale-95"
            >
              [ CERRAR BUSCADOR ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
