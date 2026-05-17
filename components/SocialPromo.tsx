import React, { useState, useEffect } from 'react';

const SocialPromo: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        // Banner logic
        const bannerDismissed = localStorage.getItem('dg_banner_dismissed');
        if (!bannerDismissed || Date.now() > parseInt(bannerDismissed)) {
            setShowBanner(true);
        }

        // Popup logic
        const popupDismissed = localStorage.getItem('dg_popup_dismissed');
        if (!popupDismissed || Date.now() > parseInt(popupDismissed)) {
            const timer = setTimeout(() => {
                setShowPopup(true);
            }, 5000); // Muestra el popup a los 5 segundos de entrar
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissBanner = () => {
        setShowBanner(false);
        // Ocultar por 7 días
        localStorage.setItem('dg_banner_dismissed', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    };

    const dismissPopup = () => {
        setShowPopup(false);
        // Ocultar por 7 días
        localStorage.setItem('dg_popup_dismissed', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    };

    return (
        <>
            {/* Banner Superior Fijo */}
            {showBanner && (
                <div className="fixed top-0 left-0 right-0 z-[60] bg-[#c5a059] text-black px-4 py-2 flex items-center justify-center gap-4 text-xs md:text-sm shadow-md animate-fade-in" style={{ zIndex: 9999 }}>
                    <div className="flex items-center gap-3 font-bold truncate">
                        <span>🚀 Únete a la Comunidad Exclusiva:</span>
                        <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors flex items-center gap-1">
                            <i className="fab fa-telegram"></i> Telegram
                        </a>
                        <span className="opacity-50">|</span>
                        <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors flex items-center gap-1">
                            <i className="fab fa-whatsapp"></i> WhatsApp
                        </a>
                    </div>
                    <button onClick={dismissBanner} className="absolute right-4 hover:opacity-50 transition-opacity">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            )}

            {/* Popup Central */}
            {showPopup && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0f111a] border border-[#c5a059]/30 rounded-3xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(197,160,89,0.1)] relative overflow-hidden text-center transform scale-100 transition-transform">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                        
                        <button onClick={dismissPopup} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-white/5">
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#c5a059] to-[#8B5A2B] rounded-2xl flex items-center justify-center shadow-xl mb-6 rotate-3">
                            <i className="fas fa-users text-black text-2xl"></i>
                        </div>

                        <h3 className="font-serif italic text-3xl text-white mb-2">Únete a la Tropa</h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-8">
                            Recibe las rutinas, estrenos musicales y el arsenal de fe antes que nadie directamente en tu celular.
                        </p>

                        <div className="flex flex-col gap-4">
                            <a href="https://t.me/Diosmasgymbot" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-[#0088cc] text-white font-bold hover:brightness-110 transition-all shadow-lg hover:shadow-[#0088cc]/30">
                                <i className="fab fa-telegram text-xl"></i>
                                Telegram Bot VIP
                            </a>
                            <a href="https://whatsapp.com/channel/0029VbCDSNR3bbUxtipXBJ1q" target="_blank" rel="noopener noreferrer" onClick={dismissPopup} className="w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold hover:brightness-110 transition-all shadow-lg hover:shadow-[#25D366]/30">
                                <i className="fab fa-whatsapp text-xl"></i>
                                Canal de WhatsApp
                            </a>
                        </div>
                        
                        <button onClick={dismissPopup} className="mt-6 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
                            Quizás más tarde
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SocialPromo;
