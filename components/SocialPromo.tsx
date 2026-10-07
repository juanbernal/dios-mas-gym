import React, { useState, useEffect } from 'react';
import { safeStorage } from '../services/safeStorage';

// El Popup Inteligente Premium (Comunidad + Redes Sociales)
export const SocialPopup: React.FC = () => {
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const popupDismissed = safeStorage.getItem('dg_popup_dismissed');
        if (!popupDismissed || Date.now() > parseInt(popupDismissed)) {
            // No interrumpir: es una tarjeta pequeña abajo (no tapa la pagina) que sale cuando
            // la persona ya recorrio buena parte de la portada o tras 45 s, lo que pase primero.
            let shown = false;
            const show = () => {
                if (shown) return;
                shown = true;
                setShowPopup(true);
                cleanup();
            };
            const onScroll = () => { if (window.scrollY > window.innerHeight * 2.5) show(); };
            const timer = setTimeout(show, 45000);
            const cleanup = () => {
                clearTimeout(timer);
                window.removeEventListener('scroll', onScroll);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            return cleanup;
        }
    }, []);

    useEffect(() => {
        if (!showPopup) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissPopup(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showPopup]);

    const dismissPopup = () => {
        setShowPopup(false);
        // Volver a mostrar después de 3 días si se cierra
        safeStorage.setItem('dg_popup_dismissed', (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
    };

    if (!showPopup) return null;

    return (
        <div role="dialog" aria-label="Únete a la Tropa" className="fixed left-3 right-3 bottom-[84px] md:left-auto md:right-6 md:bottom-6 md:w-[380px] z-[9000] animate-fade-in-up">
            <div className="relative overflow-hidden rounded-3xl border border-[#4a90d9]/40 bg-gradient-to-br from-[#121624] via-[#090b14] to-[#05070a] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(37,99,168,0.25)]">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#4a90d9] to-transparent"></div>
                <button onClick={dismissPopup} aria-label="Cerrar" className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                    <i className="fas fa-times text-xs"></i>
                </button>
                <div className="flex items-center gap-3 pr-8 mb-3">
                    <img src="/logo-diosmasgym-sm.webp" alt="" className="w-11 h-11 rounded-xl object-cover border border-[#4a90d9]/50 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="font-serif italic text-xl text-white leading-tight">Únete a la <span className="text-[#7eb8f7]">Tropa</span></p>
                        <p className="text-[10px] text-white/50 leading-snug">Entérate primero de cada estreno.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="py-2.5 rounded-xl flex items-center justify-center gap-2 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider hover:bg-emerald-400 transition-colors">
                        <i className="fab fa-whatsapp text-base"></i>WhatsApp
                    </a>
                    <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="py-2.5 rounded-xl flex items-center justify-center gap-2 bg-[#4a90d9] text-black font-black text-[10px] uppercase tracking-wider hover:bg-white transition-colors">
                        <i className="fab fa-telegram text-base"></i>Telegram
                    </a>
                </div>
            </div>
        </div>
    );
};

// El Banner Integrado en el Layout (Comunidad Telegram & WhatsApp)
export const InlineSocialBanner: React.FC = () => {
    return (
        <div className="bg-[#0f111a] border border-[#4a90d9]/20 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 w-full max-w-4xl mx-auto my-12 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4a90d9]/5 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="flex items-center gap-6 relative z-10 text-center md:text-left flex-col md:flex-row">
                <div className="w-16 h-16 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/30 flex items-center justify-center shrink-0 mx-auto md:mx-0">
                    <i className="fas fa-users text-[#4a90d9] text-2xl"></i>
                </div>
                <div>
                    <h4 className="font-serif italic text-2xl md:text-3xl text-white mb-1">Únete a la Tropa</h4>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Recibe material exclusivo en tu celular</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10">
                <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-3 bg-[#4a90d9] text-black font-black text-[10px] uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(37,99,168,0.3)]">
                    <i className="fab fa-telegram text-sm"></i> Telegram
                </a>
                <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-3 bg-white/5 text-white/80 border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                    <i className="fab fa-whatsapp text-sm"></i> WhatsApp
                </a>
            </div>
        </div>
    );
};

// Nuevo Banner de Redes Sociales (Instagram, TikTok, YouTube, Spotify, Facebook)
export const InlineFollowNetworks: React.FC = () => {
    const socialLinks = [
        { name: 'YouTube', icon: 'fab fa-youtube', url: 'https://www.youtube.com/@Diosmasgym', color: 'hover:bg-red-600 hover:text-white hover:border-red-500' },
        { name: 'Instagram', icon: 'fab fa-instagram', url: 'https://www.instagram.com/diosmasgym', color: 'hover:bg-pink-600 hover:text-white hover:border-pink-500' },
        { name: 'TikTok', icon: 'fab fa-tiktok', url: 'https://www.tiktok.com/@diosmasgym', color: 'hover:bg-white hover:text-black hover:border-white' },
        { name: 'Spotify', icon: 'fab fa-spotify', url: 'https://open.spotify.com/artist/2mEoedcjDJ7x6SCVLMI4Do', color: 'hover:bg-emerald-500 hover:text-black hover:border-emerald-400' },
        { name: 'Facebook', icon: 'fab fa-facebook', url: 'https://www.facebook.com/diosmasgym', color: 'hover:bg-blue-600 hover:text-white hover:border-blue-500' },
    ];

    return (
        <div className="bg-gradient-to-r from-[#0a0d17] via-[#101424] to-[#0a0d17] border border-white/10 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 w-full max-w-4xl mx-auto my-12 shadow-2xl">
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#4a90d9]/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="flex items-center gap-6 relative z-10 text-center md:text-left flex-col md:flex-row">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mx-auto md:mx-0 shadow-inner">
                    <i className="fas fa-share-nodes text-[#4a90d9] text-2xl"></i>
                </div>
                <div>
                    <h4 className="font-serif italic text-2xl md:text-3xl text-white mb-1">Síguenos en Redes</h4>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Mantente al día con videos, reflexiones y lanzamientos</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto relative z-10">
                {socialLinks.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-5 py-3 rounded-2xl flex items-center justify-center gap-2.5 bg-white/5 text-white/80 border border-white/10 font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${item.color} hover:scale-105 hover:shadow-lg`}
                    >
                        <i className={`${item.icon} text-sm`}></i>
                        <span>{item.name}</span>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default SocialPopup;

