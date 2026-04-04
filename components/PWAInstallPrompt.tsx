import React, { useState, useEffect } from 'react';

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect if already installed/standalone
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (standalone) {
            setIsStandalone(true);
            return;
        }

        // Detect Mobile & OS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const mobile = /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
        setIsIOS(ios);

        const handler = (e: any) => {
            e.preventDefault();
            console.log("PWA: beforeinstallprompt event captured");
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // FALLBACK: If on mobile and it hasn't appeared, force it after some time
        if (mobile && !standalone) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 12000); // 12 seconds to give more time to native event
            return () => {
                window.removeEventListener('beforeinstallprompt', handler);
                clearTimeout(timer);
            };
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (isStandalone || !isVisible) return null;

    return (
        <div className="fixed bottom-32 left-6 right-6 md:left-auto md:right-12 md:max-w-sm z-[2000] animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-[#0f111a]/95 backdrop-blur-2xl border border-[#c5a059]/30 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                >
                    <i className="fas fa-times text-xs"></i>
                </button>

                <div className="flex items-start gap-5 relative z-10">
                    <div className="w-14 h-14 bg-[#c5a059] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_10px_20px_rgba(197,160,89,0.3)]">
                        <i className="fas fa-download text-black text-xl"></i>
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-1">App Oficial</h3>
                        <p className="text-sm font-bold text-white mb-4 leading-tight">Instala Diosmasgym Records en tu dispositivo</p>
                        
                        {isIOS ? (
                            <div className="space-y-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                                    Toca <i className="fas fa-share-square mx-1 text-white/60"></i> y luego <br/>
                                    <span className="text-white/60 font-black">"Añadir a pantalla de inicio"</span>
                                </p>
                            </div>
                        ) : deferredPrompt ? (
                            <button 
                                onClick={handleInstall}
                                className="w-full py-3 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-white transition-all shadow-lg active:scale-95"
                            >
                                Descargar Ahora
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                                    Toca los <i className="fas fa-ellipsis-v mx-1 text-white/60"></i> y selecciona <br/>
                                    <span className="text-white/60 font-black">"Instalar Aplicación"</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar-like accent */}
                <div className="absolute bottom-0 left-0 h-1 bg-[#c5a059]/20 w-full overflow-hidden">
                    <div className="h-full bg-[#c5a059] w-1/3 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
