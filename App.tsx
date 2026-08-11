import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Hero from './components/Hero';
import MusicCard from './components/MusicCard';
import GlobalPlayer from './components/GlobalPlayer';
import ArtistPromo from './components/ArtistPromo';
import SmartLinkView from "./components/SmartLinkView";
import AdminAuthWrapper from "./components/admin/AdminAuthWrapper";
import LinkBioPublic from "./components/LinkBioPublic";
import UpcomingReleases from "./components/UpcomingReleases";
import TemploGuerrero from "./components/TemploGuerrero";
import ArmaduraPromo from "./components/ArmaduraPromo";
import Footer from './components/Footer';
import MusicSection from './components/MusicSection';
import { fetchMusicCatalog } from './services/musicService';
import { AppState, AppView, MusicItem } from './types';
import SocialPopup, { InlineSocialBanner, InlineFollowNetworks } from './components/SocialPromo';
import { HomeMusicSections } from './components/HomeMusicSections';
import { useAnalytics } from './hooks/useAnalytics';
import { safeStorage } from './services/safeStorage';

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
const MunicionFe = React.lazy(() => import('./components/admin/MunicionFe'));
const Top5SocialGenerator = React.lazy(() => import('./components/admin/Top5SocialGenerator'));
const AppleMusicImporter = React.lazy(() => import('./components/admin/AppleMusicImporter'));
const StoryCountdownCreator = React.lazy(() => import('./components/admin/StoryCountdownCreator'));
const PostScheduler = React.lazy(() => import('./components/admin/PostScheduler'));
const MusicPromoHub = React.lazy(() => import('./components/admin/MusicPromoHub'));
const SEODashboard = React.lazy(() => import('./components/admin/SEODashboard'));

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

interface DiagnosticInfo {
  musicStatus: string;
  apiBase: string;
  hostname: string;
}

interface DiagnosticConsoleProps {
  appError?: string | null;
}

const DiagnosticConsole: React.FC<DiagnosticConsoleProps> = ({ appError }) => {
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const getApiBase = () => {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
        const isVercel = hostname.endsWith('.vercel.app') || hostname.includes('vercel');
        const isProdDomain = hostname === 'diosmasgym.com' || hostname.endsWith('.diosmasgym.com');
        return (isLocal || isVercel || isProdDomain) ? window.location.origin : 'https://app.diosmasgym.com';
      };

      const apiBase = getApiBase();
      let bloggerStatus = 'Verificando...';
      let musicStatus = 'Verificando...';

      try {
        const musicRes = await fetch(`${apiBase}/api/music?artist=diosmasgym`);
        musicStatus = `HTTP ${musicRes.status}`;
        if (!musicRes.ok) {
          const txt = await musicRes.text();
          musicStatus += ` - Info: ${txt.slice(0, 50)}`;
        }
      } catch (e: any) {
        musicStatus = `Error de red: ${e.message}`;
      }

      setInfo({
        musicStatus,
        apiBase,
        hostname: window.location.hostname
      });
      setLoading(false);
    };

    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-[#0f111a] border border-white/5 rounded-2xl text-center max-w-md mx-auto">
        <p className="text-xs text-white/40 animate-pulse">Iniciando diagnóstico táctico...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-red-950/20 border border-red-900/30 rounded-[2rem] text-left max-w-md mx-auto backdrop-blur-md">
      <div className="flex items-center gap-3 mb-4 text-red-400">
        <i className="fas fa-triangle-exclamation text-lg"></i>
        <h4 className="font-serif italic text-lg">Consola de Diagnóstico</h4>
      </div>
      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Información de conectividad con la Central de Datos</p>
      
      <div className="space-y-3 font-mono text-[10px] text-white/70">
        <div className="flex justify-between border-b border-white/5 pb-2">
          <span className="text-white/40">HOST LOCAL:</span>
          <span>{info?.hostname}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-2">
          <span className="text-white/40">API BASE URL:</span>
          <span>{info?.apiBase}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-2">
          <span className="text-white/40">MÚSICA (Sheets API):</span>
          <span className={info?.musicStatus.includes('200') ? 'text-green-400 font-bold' : 'text-red-400'}>{info?.musicStatus}</span>
        </div>
      </div>

      {appError && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-200">
          <p className="text-[7.5px] uppercase tracking-wider text-red-400 font-bold mb-1">Error Crítico Detectado:</p>
          <p className="font-mono text-[9px] break-all leading-normal">{appError}</p>
        </div>
      )}
      
      <p className="mt-4 text-[9px] text-white/35 leading-relaxed">
        ⚠️ Si las pruebas de red reportan HTTP 404, tu dominio no está mapeado a las APIs de Vercel. Si reportan errores de red (CORS), limpia la caché del navegador.
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    return {
      currentView: 'inicio',
      musicDiosmasgym: [],
      musicJuan614: [],
      activeSong: null,
      loading: true,
      error: null
    };
  });

  

  const [showSplash, setShowSplash] = useState(true);
  const [verse, setVerse] = useState(VERSES[0]);
  
  const [maintenance, setMaintenance] = useState({ enabled: false, videoUrl: '' });

  const [randomMusicSong, setRandomMusicSong] = useState<MusicItem | null>(null);
  const [randomJuan614Song, setRandomJuan614Song] = useState<MusicItem | null>(null);
  
  const dailyRecommendations = useMemo(() => {
    const dm = state.musicDiosmasgym.filter(s => s && typeof s === 'object' && s.name && s.url);
    const j6 = state.musicJuan614.filter(s => s && typeof s === 'object' && s.name && s.url);
    
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

  // Memoizar el catálogo combinado para evitar recrearlo en cada render
  // (evita que topDeLaSemana recalcule con Math.random() y cambie canciones)
  const combinedCatalog = useMemo(() =>
    [...state.musicDiosmasgym, ...state.musicJuan614].filter(s => s && typeof s === 'object' && s.name && s.url),
    [state.musicDiosmasgym, state.musicJuan614]
  );
  
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();


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
      // Fallback para ocultar el splash si la API tarda demasiado
      const splashTimeout = setTimeout(() => {
         setShowSplash(false);
      }, 2500);

      try {
        const [musicD, musicJ, maintStatus] = await Promise.all([
          fetchMusicCatalog('diosmasgym').catch(err => {
            console.error("Music Diosmasgym fetch failed:", err);
            return [];
          }),
          fetchMusicCatalog('juan614').catch(err => {
            console.error("Music Juan614 fetch failed:", err);
            return [];
          }),
          fetchMaintenanceStatus().catch(err => {
            console.error("Maintenance fetch failed:", err);
            return { enabled: false, videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4' };
          })
        ]);

        if (maintStatus) {
          setMaintenance(maintStatus);
        }

        setState(prev => ({ 
          ...prev, 
          musicDiosmasgym: musicD,
          musicJuan614: musicJ,
          loading: false,
          error: null
        }));

        if (musicD.length > 0) setRandomMusicSong(musicD[Math.floor(Math.random() * musicD.length)]);
        if (musicJ.length > 0) setRandomJuan614Song(musicJ[Math.floor(Math.random() * musicJ.length)]);
        setVerse(VERSES[Math.floor(Math.random() * VERSES.length)]);
        clearTimeout(splashTimeout);
        setShowSplash(false);
      } catch (err: any) {
        console.error("Critical error during app initialization:", err);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: err?.message || String(err)
        }));
        clearTimeout(splashTimeout);
        setShowSplash(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    // Redirect legacy HashRouter paths to clean paths
    if (window.location.hash.startsWith('#/')) {
      const cleanPath = window.location.hash.substring(1); // removes the '#'
      window.location.replace(window.location.origin + cleanPath);
      return;
    }

    const path = location.pathname;
    const bloggerPathMatch = path.match(/\/\d{4}\/\d{2}\/(.+)\.html/);
    if (bloggerPathMatch && bloggerPathMatch[1]) { navigate(`/post/${bloggerPathMatch[1]}`, { replace: true }); return; }
    
    const bloggerPageMatch = path.match(/^\/p\/(.+)\.html$/);
    if (bloggerPageMatch && bloggerPageMatch[1]) { navigate(`/post/${bloggerPageMatch[1]}`, { replace: true }); return; }

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
      <div className="bg-[#05070a] fixed inset-0 z-[10000] flex flex-col items-center justify-center select-none overflow-hidden backdrop-blur-3xl">
        <div className="relative animate-pulse flex flex-col items-center">
           <img src="/logo-diosmasgym.png" alt="Diosmasgym" className="w-40 h-40 md:w-56 md:h-56 rounded-3xl object-cover shadow-[0_0_100px_rgba(197,160,89,0.25)] ring-1 ring-[#4a90d9]/30" />
           <div className="absolute inset-0 rounded-3xl ring-2 ring-[#4a90d9]/10 animate-ping opacity-20"></div>
        </div>
        <div className="mt-16 flex flex-col items-center gap-6">
            <div className="w-64 h-[1px] bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-[#4a90d9] to-transparent w-1/2 animate-[progress_2s_ease-in-out_infinite]"></div>
            </div>
            <div className="text-[11px] font-black uppercase tracking-[0.8em] text-[#4a90d9] animate-pulse drop-shadow-[0_0_15px_rgba(197,160,89,0.8)]">
              Entrando al Templo
            </div>
        </div>
        <style>{`
            @keyframes progress {
                0% { transform: translateX(-150%); }
                100% { transform: translateX(250%); }
            }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-[#f8fafc] font-sans selection:bg-[#4a90d9] selection:text-black cinematic-grain relative">
      <div className="stripe-accent"></div>
      {!hideGlobalUI && <SocialPopup />}
      {!hideGlobalUI && <Navbar currentView={state.currentView} changeView={changeView} />}
      <main className={!hideGlobalUI ? "pt-20 pb-24 md:pb-0" : ""}>
        <Routes>
          <Route path="/" element={
            <>
              <Hero verse={verse} onEntrenar={() => { document.getElementById('arsenal-content')?.scrollIntoView({behavior: 'smooth'}) }} onAleatorio={() => {}} />

              {/* TEMPLO DEL GUERRERO */}
              <TemploGuerrero catalog={combinedCatalog} onPlaySong={(song) => setState(p => ({ ...p, activeSong: song }))} />

              
              <section id="arsenal-content"><UpcomingReleases /></section>

              

              {/* NUEVAS SECCIONES DE MUSICA Y BANNER REFLEXIONES */}
              <HomeMusicSections 
                catalog={combinedCatalog} 
                onPlaySong={(song) => setState((p: any) => ({ ...p, activeSong: song }))} 
              />

              {/* MÚSICA */}
              {state.musicDiosmasgym.length > 0 && <MusicSection artist="diosmasgym" catalog={state.musicDiosmasgym.filter(s => s && typeof s === 'object' && s.name && s.url)} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomMusicSong} />}
              {state.musicJuan614.length > 0 && <MusicSection artist="juan614" catalog={state.musicJuan614.filter(s => s && typeof s === 'object' && s.name && s.url)} onPlay={(song) => setState(p => ({ ...p, activeSong: song }))} randomSong={randomJuan614Song} />}

              <ArmaduraPromo />


            </>
          } />

          {/* Admin Routes with Lazy Loading and Suspense */}
          <Route path="/admin/*" element={
            <React.Suspense fallback={<div className="min-h-screen bg-[#05070a] flex items-center justify-center text-[#4a90d9] font-serif italic text-4xl animate-pulse">Cargando Módulo...</div>}>
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
                <Route path="municion-fe" element={<AdminAuthWrapper><MunicionFe/></AdminAuthWrapper>} />
                <Route path="top5-social" element={<AdminAuthWrapper><Top5SocialGenerator/></AdminAuthWrapper>} />
                <Route path="apple-music" element={<AdminAuthWrapper><AppleMusicImporter/></AdminAuthWrapper>} />
                <Route path="story-countdown" element={<AdminAuthWrapper><StoryCountdownCreator/></AdminAuthWrapper>} />
                <Route path="post-scheduler" element={<AdminAuthWrapper><PostScheduler/></AdminAuthWrapper>} />
                <Route path="music-promo-hub" element={<AdminAuthWrapper><MusicPromoHub/></AdminAuthWrapper>} />
                <Route path="seo-dashboard" element={<AdminAuthWrapper><SEODashboard/></AdminAuthWrapper>} />
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
      
      {!hideGlobalUI && <Footer />}
      

    </div>
  );
};
export default App;
