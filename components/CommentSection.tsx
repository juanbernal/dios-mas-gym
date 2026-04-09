import React, { useEffect, useState } from 'react';

interface CommentSectionProps {
  url: string;
}

declare global {
  interface Window {
    FB: any;
  }
}

const CommentSection: React.FC<CommentSectionProps> = ({ url }) => {
  const [activeTab, setActiveTab] = useState<'facebook' | 'whatsapp'>('facebook');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  // The clean URL for sharing
  const displayUrl = url.split('?')[0].split('#')[0];

  useEffect(() => {
    const loadSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        if (window.FB && window.FB.XFBML) window.FB.XFBML.parse();
        return;
      }
      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script') as HTMLScriptElement;
      js.id = 'facebook-jssdk';
      js.src = "https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v20.0";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      fjs.parentNode?.insertBefore(js, fjs);
    };

    if (activeTab === 'facebook') {
      loadSDK();
      
      const checkTimer = setInterval(() => {
          const container = document.querySelector('.fb-comments');
          if (container && (container.querySelector('iframe') || container.querySelector('span'))) {
              setHasLoaded(true);
              clearInterval(checkTimer);
          }
      }, 1000);

      const hardFallback = setTimeout(() => {
          if (!hasLoaded && activeTab === 'facebook') {
              setShowFallback(true);
              // Auto-toggle to WhatsApp if FB is totally blocked
              setTimeout(() => setActiveTab('whatsapp'), 3000);
          }
      }, 6000);

      return () => {
          clearInterval(checkTimer);
          clearTimeout(hardFallback);
      };
    }
  }, [displayUrl, activeTab, hasLoaded]);

  const handleShare = (platform: string) => {
    const text = encodeURIComponent("Mira esta reflexión en El Arsenal de Dios Más Gym:");
    const encodedUrl = encodeURIComponent(displayUrl);
    
    let shareUrl = "";
    switch(platform) {
        case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
        case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`; break;
        case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`; break;
        case 'copy': 
            navigator.clipboard.writeText(displayUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const openWhatsAppComment = () => {
    const phone = "526141393650"; // Based on provided screenshot info
    const text = encodeURIComponent(`¡Hola! Vengo de El Arsenal.\n\nQuiero comentar sobre la reflexión: ${document.title}\n\nMi comentario es: `);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="mt-20 py-20 border-t border-white/5">
      
      {/* SHARING BAR */}
      <div className="mb-16">
        <div className="text-center mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-8">Compartir Reflexión</h4>
            <div className="flex flex-wrap justify-center gap-6">
                <button onClick={() => handleShare('whatsapp')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#25D366] hover:border-[#25D366]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <i className="fab fa-whatsapp text-2xl"></i>
                </button>
                <button onClick={() => handleShare('facebook')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#1877F2] hover:border-[#1877F2]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <i className="fab fa-facebook-f text-2xl"></i>
                </button>
                <button onClick={() => handleShare('twitter')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <i className="fab fa-x-twitter text-xl"></i>
                </button>
                <button onClick={() => handleShare('copy')} className={`w-14 h-14 rounded-full border border-white/10 flex items-center justify-center transition-all hover:scale-110 bg-[#0a0c14] ${copied ? 'text-[#c5a059] border-[#c5a059]' : 'text-white/40 hover:text-[#c5a059] hover:border-[#c5a059]/40'}`}>
                    <i className="fas fa-link text-xl"></i>
                </button>
            </div>
            {copied && <p className="mt-4 text-[8px] font-black uppercase tracking-[0.3em] text-[#c5a059] animate-bounce">¡Enlace Copiado!</p>}
        </div>
      </div>

      {/* COMMENT TABS */}
      <div className="flex flex-col items-center mb-10">
        <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/10 mb-8">
            <button 
                onClick={() => setActiveTab('facebook')}
                className={`px-8 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'facebook' ? 'bg-[#c5a059] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
                Facebook
            </button>
            <button 
                onClick={() => setActiveTab('whatsapp')}
                className={`px-8 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'whatsapp' ? 'bg-[#25D366] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
                WhatsApp Directo
            </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-white/80">
            {activeTab === 'facebook' ? 'Comunidad El Arsenal' : 'Comentar vía WhatsApp'}
          </h3>
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
        </div>
      </div>
      
      <div className="bg-[#0a0c14] rounded-sm min-h-[400px] border border-white/5 relative shadow-2xl overflow-hidden transition-all duration-500">
        
        {/* FACEBOOK VIEW */}
        {activeTab === 'facebook' && (
            <div className="p-4 md:p-8">
                {!hasLoaded && !showFallback && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0a0c14]">
                        <div className="w-10 h-10 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full mb-4"></div>
                        <p className="text-[#c5a059] font-serif italic text-sm tracking-widest uppercase animate-pulse">Conectando con Facebook...</p>
                    </div>
                )}

                {showFallback && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[#0a0c14] p-8 text-center animate-fade-in">
                        <i className="fab fa-facebook-messenger text-[#1877F2] text-6xl mb-6 opacity-20"></i>
                        <h4 className="text-white font-serif italic text-2xl mb-4">Widget Bloqueado</h4>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 max-w-sm leading-relaxed">
                            Tu navegador bloqueó el widget de comentarios de Facebook automáticamente.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                                onClick={() => window.open(displayUrl, '_blank')}
                                className="px-10 py-4 bg-[#1877F2] text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-sm hover:scale-105 transition-all"
                            >
                                Abrir en Facebook
                            </button>
                            <button 
                                onClick={() => setActiveTab('whatsapp')}
                                className="px-10 py-4 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] rounded-sm hover:bg-white/5 transition-all"
                            >
                                Usar WhatsApp
                            </button>
                        </div>
                    </div>
                )}

                <div 
                    className="fb-comments relative z-10 w-full" 
                    data-href={displayUrl} 
                    data-width="100%" 
                    data-numposts="15"
                    data-colorscheme="dark"
                    data-order-by="reverse_time"
                ></div>
            </div>
        )}

        {/* WHATSAPP VIEW */}
        {activeTab === 'whatsapp' && (
            <div className="p-12 md:p-20 flex flex-col items-center text-center animate-fade-in-up">
                <div className="w-24 h-24 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-10 border border-[#25D366]/20 shadow-[0_0_50px_rgba(37,211,102,0.1)]">
                    <i className="fab fa-whatsapp text-[#25D366] text-5xl"></i>
                </div>
                <h4 className="text-white font-serif italic text-4xl mb-6">Chat Comunitario</h4>
                <p className="text-white/50 text-xs font-bold uppercase tracking-[0.3em] mb-12 max-w-md leading-loose">
                    ¿Facebook no carga? No hay problema. Envía tu comentario directamente a nuestra línea oficial y únete al Arsenal de Fe.
                </p>
                <button 
                    onClick={openWhatsAppComment}
                    className="px-16 py-6 bg-[#25D366] text-white text-[11px] font-black uppercase tracking-[0.5em] hover:bg-white hover:text-[#25D366] transition-all rounded-sm shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center gap-4"
                >
                    <i className="fab fa-whatsapp text-lg"></i>
                    Comentar Ahora
                </button>
                <p className="mt-8 text-[8px] text-white/20 font-black uppercase tracking-widest">
                    Seguridad y privacidad garantizada
                </p>
            </div>
        )}
      </div>

      <div className="mt-12 text-center">
         <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.4em]">
           El Arsenal de Fe &copy; 2026 | Dios Mas Gym
         </p>
      </div>
    </div>
  );
};

export default CommentSection;
