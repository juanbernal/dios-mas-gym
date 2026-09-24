import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LinkBioData, MusicItem } from '../types';
import { fetchMusicCatalog } from '../services/musicService';
import InlineAudioPlayer from './InlineAudioPlayer';
import { useAnalytics } from '../hooks/useAnalytics';

const ARTIST_CONFIG = {
  diosmasgym: {
    primaryColor: '#4a90d9',
    accentColor: '#d6b06a',
    socialLinks: {
      instagram: 'https://instagram.com/diosmasgym',
      spotify: 'https://open.spotify.com/intl-es/artist/2mEoedcjDJ7x6SCVLMI4Do',
      youtube: 'https://www.youtube.com/@Diosmasgym',
      tiktok: 'https://www.tiktok.com/@diosmasgym'
    }
  },
  juan614: {
    primaryColor: '#c5a059',
    accentColor: '#4a90d9',
    socialLinks: {
      instagram: 'https://instagram.com/juan614oficial',
      spotify: 'https://open.spotify.com/intl-es/artist/0vEKa5AOcBkQVXNfGb2FNh',
      youtube: 'https://www.youtube.com/@Juan614oficial',
      tiktok: 'https://www.tiktok.com/@juan614oficial'
    }
  }
};

const FALLBACK_DATA: LinkBioData = {
    profile: {
        name: "Dios Mas Gym",
        bio: "El Arsenal de Fe | Música, Disciplina y Transformación",
        avatar: "/logo-diosmasgym.png"
    },
    links: [
        { id: "1", title: "Escuchar en Spotify", url: "https://open.spotify.com/intl-es/artist/2mEoedcjDJ7x6SCVLMI4Do", icon: "fab fa-spotify", enabled: true, type: "special" },
        { id: "2", title: "Suscríbete en YouTube", url: "https://www.youtube.com/@Diosmasgym", icon: "fab fa-youtube", enabled: true, type: "primary" },
        { id: "3", title: "Sígueme en Instagram", url: "https://instagram.com/diosmasgym", icon: "fab fa-instagram", enabled: true, type: "primary" },
        { id: "6", title: "Catálogo de Música", url: "https://diosmasgym.com", icon: "fas fa-globe", enabled: true, type: "secondary" }
    ]
};

const LinkBioPublic: React.FC = () => {
    const { artist } = useParams<{ artist?: string }>();
    const [data, setData] = useState<LinkBioData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recentSongs, setRecentSongs] = useState<MusicItem[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const { trackEvent } = useAnalytics();
    const artistKey = artist === 'juan614' ? 'juan614' : 'diosmasgym';
    const config = ARTIST_CONFIG[artistKey as keyof typeof ARTIST_CONFIG];

    useEffect(() => {
        const checkSub = async () => {
            if ((window as any).OneSignal) {
                try {
                    const optedIn = await (window as any).OneSignal.User?.PushSubscription?.optedIn;
                    setIsSubscribed(optedIn || false);
                } catch (e) { /* ignore */ }
            }
        };
        checkSub();
        const timer = setTimeout(checkSub, 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const query = artist ? `?artist=${artist}` : '';
        fetch(`/api/links${query}`)
            .then(res => {
                if (!res.ok) throw new Error("API failed");
                return res.json();
            })
            .then(json => {
                console.log("Public Bio API response:", json);
                if (json && json.profile && json.links && json.links.length > 0) {
                    setData(json);
                } else {
                    console.warn("API returned empty data, using fallback.");
                    if (artist === 'juan614') {
                        setData({
                            profile: { name: "Juan 614", bio: "Corridos, banda sinaloense y calle con propósito", avatar: "/logo-juan614-v2.png" },
                            links: []
                        });
                    } else {
                        setData(FALLBACK_DATA);
                    }
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error loading bio links, using fallback:", err);
                if (artist === 'juan614') {
                    setData({
                        profile: { name: "Juan 614", bio: "Corridos, banda sinaloense y calle con propósito", avatar: "/logo-juan614-v2.png" },
                        links: []
                    });
                } else {
                    setData(FALLBACK_DATA);
                }
                setIsLoading(false);
            });

        // Fetch recent songs from music catalog
        const actualArtist = artist === 'juan614' ? 'juan614' : 'diosmasgym';
        fetchMusicCatalog(actualArtist).then(catalog => {
            if (catalog && catalog.length > 0) {
                const sorted = [...catalog].sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                });
                const recent = sorted.slice(0, 3).filter(s => s && s.name && s.url);
                setRecentSongs(recent.length > 0 ? recent : [sorted[0]]);
            }
        }).catch(err => console.error("Error loading music catalog for bio:", err));
    }, [artist]);

    useEffect(() => {
        if (data && data.profile) {
            const pageTitle = `${data.profile.name} | Bio — El Arsenal de Fe`;
            const pageDesc = data.profile.bio || 'El Arsenal de Fe — Música cristiana y reflexiones de fe.';
            const pageImg = data.profile.avatar || 'https://www.diosmasgym.com/icon-512.png';
            const pageUrl = `https://www.diosmasgym.com/bio/${artist || 'diosmasgym'}`;

            document.title = pageTitle;

            // Inject dynamic OG/meta tags for social sharing
            const setMeta = (selector: string, attr: string, val: string) => {
                let el = document.querySelector(selector) as HTMLMetaElement;
                if (!el) { el = document.createElement('meta') as any; document.head.appendChild(el); }
                (el as any)[attr] = val;
            };
            setMeta('meta[name="description"]', 'content', pageDesc);
            setMeta('meta[property="og:title"]', 'content', pageTitle);
            setMeta('meta[property="og:description"]', 'content', pageDesc);
            setMeta('meta[property="og:image"]', 'content', pageImg);
            setMeta('meta[property="og:url"]', 'content', pageUrl);
            setMeta('meta[name="twitter:title"]', 'content', pageTitle);
            setMeta('meta[name="twitter:description"]', 'content', pageDesc);
            setMeta('meta[name="twitter:image"]', 'content', pageImg);
            const canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
            if (canonicalEl) canonicalEl.href = pageUrl;

            trackEvent('post_view', {
                title: `${data.profile.name} (Bio Link)`,
                artist: artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym'
            });
        }
    }, [data, artist]);

    const currentSong = recentSongs[currentSongIndex] || null;

    if (!data || !data.profile) return (
        <div className="min-h-screen bg-[#05070a] text-white flex items-center justify-center p-8 text-center font-['Poppins']">
            <div>
                {/* Skeleton loading */}
                <div className="mb-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-white/5 animate-pulse mb-4"></div>
                    <div className="h-8 w-48 mx-auto rounded bg-white/5 animate-pulse mb-3"></div>
                    <div className="h-4 w-64 mx-auto rounded bg-white/5 animate-pulse mb-6"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-12 w-72 mx-auto rounded-2xl bg-white/5 animate-pulse"></div>
                    <div className="h-12 w-72 mx-auto rounded-2xl bg-white/5 animate-pulse"></div>
                </div>
                <div className="mt-8 text-[8px] text-white/10 uppercase tracking-widest">v2.0 CARGANDO...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins'] relative overflow-x-hidden">
            {/* Background elements con colores dinámicos */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none opacity-10" style={{backgroundColor: config.primaryColor}}></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none opacity-10" style={{backgroundColor: config.accentColor}}></div>

            <div className="max-w-[480px] mx-auto px-6 py-16 relative z-10 flex flex-col items-center min-h-screen">
                {/* Profile Section */}
                <div className="w-24 h-24 rounded-full border-2 p-1 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all" style={{borderColor: config.primaryColor, boxShadow: `0 0 30px ${config.primaryColor}33`}}>
                    <img src={data.profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                </div>

                <h1 className="text-2xl font-black mb-2 tracking-tight">{data.profile.name}</h1>
                <p className="text-sm text-white/60 mb-10 text-center leading-relaxed max-w-[300px]">
                    {data.profile.bio}
                </p>

                {/* Music Preview Section */}
                {currentSong && (
                    <div className="w-full mb-12 bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group transition-all duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <i className="fas fa-headphones text-8xl"></i>
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-center flex items-center justify-center gap-3" style={{color: config.primaryColor}}>
                            <div className="w-4 h-px" style={{backgroundColor: config.primaryColor}}></div>
                            {recentSongs.length > 1 ? 'Últimos Estrenos' : 'Prueba un poco de mi música'}
                            <div className="w-4 h-px" style={{backgroundColor: config.primaryColor}}></div>
                        </h3>

                        <div className="relative mb-6">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group-hover:border-opacity-40 transition-colors relative">
                                    <img src={currentSong.cover} alt={currentSong.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-base leading-tight mb-1 truncate group-hover:transition-colors" style={{color: 'white'}}>{currentSong.name}</h4>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">{currentSong.artist}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4" data-play-bio>
                            <InlineAudioPlayer url={currentSong.url} isJuan={artist === 'juan614'} />
                        </div>

                        {/* Navigation for multiple songs */}
                        {recentSongs.length > 1 && (
                            <div className="flex gap-2 justify-center mb-4">
                                {recentSongs.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentSongIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === currentSongIndex ? 'w-6' : 'opacity-50'}`}
                                        style={{backgroundColor: config.primaryColor}}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="mt-6 text-center">
                            <a
                                href={artist === 'juan614' ? 'https://juan614.diosmasgym.com/' : 'https://diosmasgym.com/'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackEvent('music_catalog_click', {artist: artist || 'diosmasgym'})}
                                className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors border-b border-transparent hover:border-white/40 pb-1"
                            >
                                Ver catálogo completo
                            </a>
                        </div>
                    </div>
                )}

                {/* Links Section */}
                <div className="w-full space-y-4 mb-10">
                    {data.links.filter(l => l.enabled).map(link => (
                        <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                                trackEvent('link_click', {
                                    title: link.title,
                                    url: link.url,
                                    artist: artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym',
                                    type: link.type
                                });
                            }}
                            className={`
                                w-full py-5 px-6 rounded-2xl flex items-center gap-4 transition-all duration-300 border backdrop-blur-md group
                                ${link.type === 'special'
                                    ? 'text-black border shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:scale-[1.03] scale-[1.01]'
                                    : link.type === 'primary'
                                        ? 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20'
                                        : 'bg-transparent text-white/70 border-white/5 hover:bg-white/5 hover:text-white'}
                            `}
                            style={link.type === 'special' ? {
                                backgroundImage: `linear-gradient(to right, ${config.primaryColor}, ${config.accentColor})`,
                                borderColor: config.primaryColor
                            } : {}}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${link.type === 'special' ? 'bg-black/10' : 'bg-white/5 group-hover:bg-opacity-20'}`} style={link.type === 'special' ? {} : {backgroundColor: `${config.primaryColor}15`}}>
                                <i className={`${link.icon} ${link.type === 'special' ? 'text-black' : 'text-lg'} text-lg`} style={link.type !== 'special' ? {color: config.primaryColor} : {}}></i>
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] flex-1 text-center pr-10 ${link.type === 'special' ? 'text-black' : 'text-white'}`}>
                                {link.title}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Share & Notifications Section */}
                <div className="w-full mb-16 flex flex-col items-center gap-4">
                    {/* Share Button */}
                    <button
                        onClick={async () => {
                            const shareUrl = `${window.location.origin}/bio/${artist || 'diosmasgym'}`;
                            const shareText = `${data.profile.name}: ${data.profile.bio}`;

                            if (navigator.share) {
                                try {
                                    await navigator.share({ title: data.profile.name, text: shareText, url: shareUrl });
                                    trackEvent('share_click', {artist: artist || 'diosmasgym', method: 'native'});
                                } catch (err) { /* user cancelled */ }
                            } else {
                                const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                                window.open(whatsapp, '_blank', 'noopener,noreferrer');
                                trackEvent('share_click', {artist: artist || 'diosmasgym', method: 'whatsapp'});
                            }
                        }}
                        className="w-full py-6 px-6 rounded-2xl border transition-all flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
                        style={{borderColor: `${config.primaryColor}50`, backgroundColor: `${config.primaryColor}08`}}
                    >
                        <i className="fas fa-share-nodes text-lg" style={{color: config.primaryColor}}></i>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white group-hover:text-white/80">Compartir mi perfil</span>
                    </button>

                    {/* Notifications Button */}
                    <button
                        onClick={async () => {
                            if ((window as any).OneSignal) {
                                await (window as any).OneSignal.Notifications.requestPermission();
                                const optedIn = await (window as any).OneSignal.User?.PushSubscription?.optedIn;
                                setIsSubscribed(optedIn || false);
                                trackEvent('notification_toggle', {artist: artist || 'diosmasgym', enabled: !isSubscribed});
                            }
                        }}
                        className={`w-full py-6 px-6 rounded-2xl border transition-all flex items-center justify-center gap-4 group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/[0.03] border-white/10 hover:border-opacity-50'}`}
                        style={!isSubscribed ? {borderColor: `${config.primaryColor}50`} : {}}
                    >
                        <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500' : 'fa-bell group-hover:animate-bounce'}`} style={!isSubscribed ? {color: config.primaryColor} : {}}></i>
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isSubscribed ? 'text-green-500' : 'text-white/60 group-hover:text-white'}`}>
                            {isSubscribed ? '¡Suscrito! Pronto música nueva' : 'Avísame de nuevos estrenos'}
                        </span>
                    </button>
                    <p className="mt-2 text-[7px] font-bold uppercase tracking-widest text-white/20">Recibe una notificación push cuando haya música nueva</p>
                    {isSubscribed && (
                        <button
                            onClick={async () => {
                                if ((window as any).OneSignal) {
                                    await (window as any).OneSignal.User?.PushSubscription?.optOut();
                                    setIsSubscribed(false);
                                    trackEvent('notification_toggle', {artist: artist || 'diosmasgym', enabled: false});
                                }
                            }}
                            className="mt-2 text-[7px] font-bold uppercase tracking-widest text-white/10 hover:text-red-500 transition-all underline underline-offset-4"
                        >
                            Dejar de recibir avisos
                        </button>
                    )}
                </div>


                {/* Social Footer */}
                <div className="mt-auto flex gap-8 text-white/30 text-2xl mb-8">
                    <a href={config.socialLinks.instagram} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('social_click', {network: 'instagram', artist: artist || 'diosmasgym'})} className="hover:text-white transition-colors hover:scale-125"><i className="fab fa-instagram"></i></a>
                    <a href={config.socialLinks.spotify} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('social_click', {network: 'spotify', artist: artist || 'diosmasgym'})} className="hover:text-white transition-colors hover:scale-125"><i className="fab fa-spotify"></i></a>
                    <a href={config.socialLinks.youtube} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('social_click', {network: 'youtube', artist: artist || 'diosmasgym'})} className="hover:text-white transition-colors hover:scale-125"><i className="fab fa-youtube"></i></a>
                    <a href={config.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('social_click', {network: 'tiktok', artist: artist || 'diosmasgym'})} className="hover:text-white transition-colors hover:scale-125"><i className="fab fa-tiktok"></i></a>
                </div>

                <div className="text-[9px] font-black uppercase tracking-[0.6em] text-white/10 italic">
                    {artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym'} Records v2.0
                </div>
            </div>
        </div>
    );
};

export default LinkBioPublic;
