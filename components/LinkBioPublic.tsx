import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LinkBioData, MusicItem } from '../types';
import { fetchMusicCatalog } from '../services/musicService';
import InlineAudioPlayer from './InlineAudioPlayer';
import { useAnalytics } from '../hooks/useAnalytics';

const FALLBACK_DATA: LinkBioData = {
    profile: {
        name: "Dios Mas Gym",
        bio: "El Arsenal de Fe | Música, Disciplina y Transformación",
        avatar: "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600"
    },
    links: [
        { id: "1", title: "Escuchar en Spotify", url: "https://open.spotify.com/intl-es/artist/2mEoedcjDJ7x6SCVLMI4Do", icon: "fab fa-spotify", enabled: true, type: "special" },
        { id: "2", title: "Suscríbete en YouTube", url: "https://www.youtube.com/@Diosmasgym", icon: "fab fa-youtube", enabled: true, type: "primary" },
        { id: "3", title: "Sígueme en Instagram", url: "https://instagram.com/diosmasgym", icon: "fab fa-instagram", enabled: true, type: "primary" },
        { id: "6", title: "Catálogo de Música", url: "https://musica.diosmasgym.com", icon: "fas fa-globe", enabled: true, type: "secondary" }
    ]
};

const LinkBioPublic: React.FC = () => {
    const { artist } = useParams<{ artist?: string }>();
    const [data, setData] = useState<LinkBioData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [randomSong, setRandomSong] = useState<MusicItem | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const { trackEvent } = useAnalytics();

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
                            profile: { name: "Juan 614", bio: "Corridos, banda sinaloense y calle con propósito", avatar: "/logo-juan614-v2.jpg" },
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
                        profile: { name: "Juan 614", bio: "Corridos, banda sinaloense y calle con propósito", avatar: "/logo-juan614-v2.jpg" },
                        links: []
                    });
                } else {
                    setData(FALLBACK_DATA);
                }
                setIsLoading(false);
            });

        // Fetch random song from music catalog
        const actualArtist = artist === 'juan614' ? 'juan614' : 'diosmasgym';
        fetchMusicCatalog(actualArtist).then(catalog => {
            if (catalog && catalog.length > 0) {
                const song = catalog[Math.floor(Math.random() * catalog.length)];
                setRandomSong(song);
            }
        }).catch(err => console.error("Error loading music catalog for bio:", err));
    }, [artist]);

    useEffect(() => {
        if (data && data.profile) {
            const pageTitle = `${data.profile.name} | Bio`;
            document.title = pageTitle;
            trackEvent('post_view', {
                title: `${data.profile.name} (Bio Link)`,
                artist: artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym'
            });
        }
    }, [data, artist]);

    if (!data || !data.profile) return (
        <div className="min-h-screen bg-[#05070a] text-white flex items-center justify-center p-8 text-center font-['Poppins']">
            <div>
                <i className="fas fa-spinner fa-spin text-[#4a90d9] text-4xl mb-4"></i>
                <h1 className="text-xl font-bold mb-2">Cargando Bio...</h1>
                <p className="text-white/40 text-sm">Si esto tarda mucho, refresca la página.</p>
                <div className="mt-8 text-[8px] text-white/10 uppercase tracking-widest">v1.6 PRODUCTION FALLBACK</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins'] relative overflow-x-hidden">
            {/* Background elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4a90d9]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-[480px] mx-auto px-6 py-16 relative z-10 flex flex-col items-center min-h-screen">
                {/* Profile Section */}
                <div className="w-24 h-24 rounded-full border-2 border-[#4a90d9] p-1 mb-6 shadow-[0_0_30px_rgba(37,99,168,0.2)]">
                    <img src={data.profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                </div>
                
                <h1 className="text-2xl font-black mb-2 tracking-tight">{data.profile.name}</h1>
                <p className="text-sm text-white/60 mb-10 text-center leading-relaxed max-w-[300px]">
                    {data.profile.bio}
                </p>

                {/* Music Preview Section */}
                {randomSong && (
                    <div className="w-full mb-12 bg-white/5 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <i className="fas fa-headphones text-8xl"></i>
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#4a90d9] mb-6 text-center flex items-center justify-center gap-3">
                            <div className="w-4 h-px bg-[#4a90d9]"></div>
                            Prueba un poco de mi música
                            <div className="w-4 h-px bg-[#4a90d9]"></div>
                        </h3>
                        
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group-hover:border-[#4a90d9]/40 transition-colors">
                                <img src={randomSong.cover} alt={randomSong.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-base leading-tight mb-1 truncate group-hover:text-[#4a90d9] transition-colors">{randomSong.name}</h4>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">{randomSong.artist}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <InlineAudioPlayer url={randomSong.url} isJuan={artist === 'juan614'} />
                        </div>
                        
                        <div className="mt-6 text-center">
                            <a 
                                href={artist === 'juan614' ? 'https://juan614.diosmasgym.com/' : 'https://musica.diosmasgym.com/'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-[#4a90d9] transition-colors border-b border-transparent hover:border-[#4a90d9]/50 pb-1"
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
                                    artist: artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym'
                                });
                            }}
                            className={`
                                w-full py-5 px-6 rounded-2xl flex items-center gap-4 transition-all duration-300 border backdrop-blur-md group
                                ${link.type === 'special' 
                                    ? 'bg-gradient-to-r from-[#4a90d9] to-[#d6b06a] text-black border-[#4a90d9] shadow-[0_10px_30px_rgba(37,99,168,0.3)] hover:scale-[1.03] scale-[1.01]' 
                                    : link.type === 'primary'
                                        ? 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20'
                                        : 'bg-transparent text-white/70 border-white/5 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${link.type === 'special' ? 'bg-black/10' : 'bg-white/5 group-hover:bg-[#4a90d9]/10 transition-colors'}`}>
                                <i className={`${link.icon} ${link.type === 'special' ? 'text-black' : 'text-[#4a90d9]'} text-lg`}></i>
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] flex-1 text-center pr-10 ${link.type === 'special' ? 'text-black' : 'text-white'}`}>
                                {link.title}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Notifications Button */}
                <div className="w-full mb-16 flex flex-col items-center">
                    <button 
                        onClick={async () => {
                            if ((window as any).OneSignal) {
                                await (window as any).OneSignal.Notifications.requestPermission();
                                const optedIn = await (window as any).OneSignal.User?.PushSubscription?.optedIn;
                                setIsSubscribed(optedIn || false);
                            }
                        }}
                        className={`w-full py-6 px-6 rounded-2xl border transition-all flex items-center justify-center gap-4 group ${isSubscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-white/[0.03] border-white/10 hover:border-[#4a90d9]/50'}`}
                    >
                        <i className={`fas ${isSubscribed ? 'fa-check-circle text-green-500' : 'fa-bell text-[#4a90d9] group-hover:animate-bounce'}`}></i>
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isSubscribed ? 'text-green-500' : 'text-white/60 group-hover:text-white'}`}>
                            {isSubscribed ? '¡Suscrito! Pronto música nueva' : 'Avísame de nuevos estrenos'}
                        </span>
                    </button>
                    <p className="mt-3 text-[7px] font-bold uppercase tracking-widest text-white/20">Recibe una notificación push cuando haya música nueva</p>
                    {isSubscribed && (
                        <button 
                            onClick={async () => {
                                if ((window as any).OneSignal) {
                                    await (window as any).OneSignal.User?.PushSubscription?.optOut();
                                    setIsSubscribed(false);
                                }
                            }}
                            className="mt-4 text-[7px] font-bold uppercase tracking-widest text-white/10 hover:text-red-500 transition-all underline underline-offset-4"
                        >
                            Dejar de recibir avisos
                        </button>
                    )}
                </div>


                {/* Social Footer */}
                <div className="mt-auto flex gap-8 text-white/30 text-2xl mb-8">
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-instagram"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-spotify"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-youtube"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-tiktok"></i></a>
                </div>

                <div className="text-[9px] font-black uppercase tracking-[0.6em] text-white/10 italic">
                    {artist === 'juan614' ? 'Juan 614' : 'Dios Mas Gym'} Records v1.6
                </div>
            </div>
        </div>
    );
};

export default LinkBioPublic;
