import React, { useState, useEffect } from 'react';
import { safeStorage } from '../services/safeStorage';

// El Popup Inteligente Premium (Comunidad + Redes Sociales)
export const SocialPopup: React.FC = () => {
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const popupDismissed = safeStorage.getItem('dg_popup_dismissed');
        if (!popupDismissed || Date.now() > parseInt(popupDismissed)) {
            const timer = setTimeout(() => {
                setShowPopup(true);
            }, 4000); // Aparece a los 4 segundos
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissPopup = () => {
        setShowPopup(false);
        // Volver a mostrar después de 3 días si se cierra
        safeStorage.setItem('dg_popup_dismissed', (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
    };

    if (!showPopup) return null;

    const socialLinks = [
        { name: 'YouTube', icon: 'fab fa-youtube', url: 'https://www.youtube.com/@Diosmasgym', bg: 'hover:bg-red-600 hover:text-white hover:border-red-500' },
        { name: 'Instagram', icon: 'fab fa-instagram', url: 'https://www.instagram.com/diosmasgym', bg: 'hover:bg-pink-600 hover:text-white hover:border-pink-500' },
        { name: 'TikTok', icon: 'fab fa-tiktok', url: 'https://www.tiktok.com/@diosmasgym', bg: 'hover:bg-white hover:text-black hover:border-white' },
        { name: 'Spotify', icon: 'fab fa-spotify', url: 'https://open.spotify.com/artist/4Z10Yx4YjL34q6S8S7W1Xw', bg: 'hover:bg-emerald-500 hover:text-black hover:border-emerald-400' },
        { name: 'Facebook', icon: 'fab fa-facebook', url: 'https://www.facebook.com/diosmasgym', bg: 'hover:bg-blue-600 hover:text-white hover:border-blue-500' },
    ];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
            <div className="bg-gradient-to-br from-[#121624] via-[#090b14] to-[#05070a] border border-[#4a90d9]/40 rounded-[2.5rem] max-w-md w-full p-6 md:p-8 shadow-[0_30px_100px_rgba(37,99,168,0.3)] relative overflow-hidden text-center group">
                {/* Glow decorativo */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4a90d9] to-transparent opacity-80"></div>
                <div className="absolute top-0 right-0 w-72 h-72 bg-[#4a90d9]/15 rounded-full blur-[90px] -mr-24 -mt-24 pointer-events-none group-hover:bg-[#4a90d9]/25 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[90px] -ml-24 -mb-24 pointer-events-none"></div>
                
                {/* Botón Cerrar */}
                <button onClick={dismissPopup} className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/10 transition-all w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 z-20">
                    <i className="fas fa-times text-xs"></i>
                </button>

                {/* Header con Logo */}
                <div className="relative w-20 h-20 mx-auto mb-5">
                    <div className="absolute inset-0 bg-[#4a90d9]/30 rounded-[1.8rem] blur-xl animate-pulse"></div>
                    <img src="/logo-diosmasgym.png" alt="Logo" className="w-full h-full object-cover rounded-[1.8rem] border border-[#4a90d9]/60 shadow-2xl relative z-10" />
                </div>

                <h3 className="font-serif italic text-3xl md:text-4xl text-white mb-2 leading-tight">
                    Únete a la <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] to-blue-300">Tropa</span>
                </h3>
                <p className="text-white/60 text-[10px] md:text-[11px] leading-relaxed mb-6 uppercase tracking-[0.2em] font-black">
                    Recibe lanzamientos, música y contenido exclusivo
                </p>

                {/* 1. Botones Principales (Telegram & WhatsApp) */}
                <div className="flex flex-col gap-3 mb-6 relative z-10">
                    <a 
                        href="https://t.me/Diosmasgymbot" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={dismissPopup} 
                        className="relative group/btn w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 bg-[#4a90d9] text-black font-black text-[11px] uppercase tracking-widest hover:bg-white hover:shadow-[0_0_30px_rgba(37,99,168,0.5)] transition-all overflow-hidden"
                    >
                        <i className="fab fa-telegram text-lg"></i>
                        <span>Grupo Telegram VIP</span>
                    </a>
                    <a 
                        href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={dismissPopup} 
                        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
                    >
                        <i className="fab fa-whatsapp text-lg"></i>
                        <span>Canal Oficial WhatsApp</span>
                    </a>
                </div>

                {/* Separador */}
                <div className="flex items-center gap-3 mb-5 relative z-10">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Síguenos en Redes</span>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>

                {/* 2. Redes Sociales Oficiales */}
                <div className="flex flex-wrap items-center justify-center gap-2 relative z-10 mb-6">
                    {socialLinks.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={dismissPopup}
                            className={`px-3.5 py-2.5 rounded-xl flex items-center gap-2 bg-white/5 text-white/80 border border-white/10 font-black text-[9px] uppercase tracking-wider transition-all duration-300 ${item.bg} hover:scale-105`}
                        >
                            <i className={`${item.icon} text-sm`}></i>
                            <span>{item.name}</span>
                        </a>
                    ))}
                </div>
                
                <button onClick={dismissPopup} className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors border-b border-white/10 hover:border-white/30 pb-0.5 relative z-10">
                    Continuar a la web
                </button>
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
        { name: 'Spotify', icon: 'fab fa-spotify', url: 'https://open.spotify.com/artist/4Z10Yx4YjL34q6S8S7W1Xw', color: 'hover:bg-emerald-500 hover:text-black hover:border-emerald-400' },
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

