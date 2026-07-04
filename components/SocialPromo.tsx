import React, { useState, useEffect } from 'react';
import { safeStorage } from '../services/safeStorage';

// El Popup Inteligente Premium
export const SocialPopup: React.FC = () => {
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const popupDismissed = safeStorage.getItem('dg_popup_dismissed');
        if (!popupDismissed || Date.now() > parseInt(popupDismissed)) {
            const timer = setTimeout(() => {
                setShowPopup(true);
            }, 8000); // 8 seconds
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissPopup = () => {
        setShowPopup(false);
        safeStorage.setItem('dg_popup_dismissed', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    };

    if (!showPopup) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-gradient-to-br from-[#12141c] to-[#05070a] border border-[#c5a059]/30 rounded-[2.5rem] max-w-sm w-full p-8 md:p-10 shadow-[0_30px_100px_rgba(197,160,89,0.2)] relative overflow-hidden text-center group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-50"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-[#c5a059]/20 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none group-hover:bg-[#c5a059]/10 transition-all duration-700"></div>
                
                <button onClick={dismissPopup} className="absolute top-5 right-5 text-white/30 hover:text-white hover:bg-white/10 transition-all w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5 z-10">
                    <i className="fas fa-times text-xs"></i>
                </button>

                <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 bg-[#c5a059]/20 rounded-[2rem] blur-xl animate-pulse"></div>
                    <img src="/logo-diosmasgym.png" alt="Logo" className="w-full h-full object-cover rounded-[2rem] border border-[#c5a059]/50 shadow-2xl relative z-10" />
                </div>

                <h3 className="font-serif italic text-3xl md:text-4xl text-white mb-3">Comunidad <span className="text-[#c5a059] block mt-1">Exclusiva</span></h3>
                <p className="text-white/50 text-[10px] md:text-[11px] leading-relaxed mb-8 uppercase tracking-[0.2em] font-black">
                    Acceso anticipado a música, lanzamientos y material reservado.
                </p>

                <div className="flex flex-col gap-4 relative z-10">
                    <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="relative group/btn w-full py-4 rounded-2xl flex items-center justify-center gap-3 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/40 font-black text-[11px] uppercase tracking-widest hover:bg-[#c5a059] hover:text-black hover:shadow-[0_0_30px_rgba(197,160,89,0.4)] transition-all overflow-hidden">
                        <div className="absolute inset-0 w-0 bg-[#c5a059] group-hover/btn:w-full transition-all duration-500 ease-out"></div>
                        <i className="fab fa-telegram text-lg relative z-10"></i>
                        <span className="relative z-10">Telegram VIP</span>
                    </a>
                    <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 bg-white/5 text-white/70 border border-white/10 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-white/20 transition-all">
                        <i className="fab fa-whatsapp text-lg"></i>
                        WhatsApp
                    </a>
                </div>
                
                <button onClick={dismissPopup} className="mt-8 text-[9px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors border-b border-white/10 hover:border-white/30 pb-1 relative z-10">
                    No por ahora
                </button>
            </div>
        </div>
    );
};

// El Banner Integrado en el Layout
export const InlineSocialBanner: React.FC = () => {
    return (
        <div className="bg-[#0f111a] border border-[#c5a059]/20 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 w-full max-w-4xl mx-auto my-16 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="flex items-center gap-6 relative z-10 text-center md:text-left flex-col md:flex-row">
                <div className="w-16 h-16 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center shrink-0 mx-auto md:mx-0">
                    <i className="fas fa-users text-[#c5a059] text-2xl"></i>
                </div>
                <div>
                    <h4 className="font-serif italic text-2xl md:text-3xl text-white mb-1">Únete a la Tropa</h4>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/40">Recibe material exclusivo en tu celular</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10">
                <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-3 bg-[#c5a059] text-black font-black text-[10px] uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)]">
                    <i className="fab fa-telegram text-sm"></i> Telegram
                </a>
                <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3 rounded-xl flex items-center justify-center gap-3 bg-white/5 text-white/80 border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                    <i className="fab fa-whatsapp text-sm"></i> WhatsApp
                </a>
            </div>
        </div>
    );
};

export default SocialPopup;
