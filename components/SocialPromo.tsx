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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#05070a] border border-[#c5a059]/40 rounded-3xl max-w-sm w-full p-8 shadow-[0_0_80px_rgba(197,160,89,0.15)] relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                
                <button onClick={dismissPopup} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/5">
                    <i className="fas fa-times text-xs"></i>
                </button>

                <div className="w-16 h-16 mx-auto bg-transparent border border-[#c5a059]/30 rounded-2xl flex items-center justify-center shadow-xl mb-6 relative">
                    <div className="absolute inset-0 bg-[#c5a059]/10 rounded-2xl blur-md"></div>
                    <i className="fas fa-crown text-[#c5a059] text-2xl relative z-10"></i>
                </div>

                <h3 className="font-serif italic text-3xl text-white mb-2">Comunidad <span className="text-[#c5a059]">Exclusiva</span></h3>
                <p className="text-white/40 text-[11px] leading-relaxed mb-8 uppercase tracking-widest font-black">
                    Acceso anticipado a música y material reservado.
                </p>

                <div className="flex flex-col gap-3">
                    <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30 font-black text-[10px] uppercase tracking-widest hover:bg-[#c5a059] hover:text-black transition-all">
                        <i className="fab fa-telegram text-lg"></i>
                        Telegram VIP
                    </a>
                    <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-white/5 text-white/60 border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                        <i className="fab fa-whatsapp text-lg"></i>
                        WhatsApp
                    </a>
                </div>
                
                <button onClick={dismissPopup} className="mt-8 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors border-b border-white/10 pb-1">
                    Cerrar y continuar
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
