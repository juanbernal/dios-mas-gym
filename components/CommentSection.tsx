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
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use production domain for localhost testing so FB doesn't block it
  const displayUrl = url.includes('localhost') 
    ? `https://diosmasgym.com${new URL(url).pathname}`
    : url;

  useEffect(() => {
    // 1. Load SDK directly with xfbml=1 (Often more reliable than manual init)
    const loadSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        if (window.FB && window.FB.XFBML) {
          window.FB.XFBML.parse();
        }
        return;
      }

      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script') as HTMLScriptElement;
      js.id = 'facebook-jssdk';
      // Added xfbml=1 to the URL for automatic parsing
      js.src = "https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v20.0&appId=809015114144186";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      fjs.parentNode?.insertBefore(js, fjs);
    };

    loadSDK();

    // 2. More aggressive detection of failure
    // If after 4 seconds we don't see an iframe from Facebook, show fallback
    const checkTimer = setInterval(() => {
        const container = document.querySelector('.fb-comments');
        const hasIframe = container?.querySelector('iframe') || container?.querySelector('span');
        
        if (hasIframe) {
            setHasLoaded(true);
            clearInterval(checkTimer);
        }
    }, 1000);

    // Hard fallback after 5 seconds total
    const hardFallback = setTimeout(() => {
        if (!hasLoaded) {
            setShowFallback(true);
            setHasLoaded(false);
        }
    }, 5000);

    return () => {
        clearInterval(checkTimer);
        clearTimeout(hardFallback);
    };
  }, [displayUrl, hasLoaded]);

  const handleShare = (platform: string) => {
    const text = encodeURIComponent("Mira esta reflexión en El Arsenal de Dios Más Gym:");
    const encodedUrl = encodeURIComponent(displayUrl);
    
    let shareUrl = "";
    switch(platform) {
        case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`; break;
        case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`; break;
        case 'twitter': shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`; break;
        case 'copy': 
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="mt-20 py-20 border-t border-white/5">
      
      {/* SHARING BAR */}
      <div className="mb-16">
        <div className="text-center mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-8">Compartir Reflexión</h4>
            <div className="flex flex-wrap justify-center gap-6">
                <button onClick={() => handleShare('whatsapp')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#25D366] hover:border-[#25D366]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.181-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.982-.364-1.737-.756-2.871-2.516-2.957-2.63-.088-.113-.719-.951-.719-1.814 0-.862.453-1.287.614-1.45.16-.163.355-.204.474-.204.118 0 .237 0 .341.005.111.004.259-.042.405.311.147.355.503 1.229.547 1.32.044.091.074.197.014.316-.06.118-.089.191-.177.293-.089.102-.187.228-.266.305-.097.104-.199.218-.086.414.114.195.505.833 1.083 1.348.747.665 1.374.872 1.57.97.195.097.311.081.424-.052.114-.132.482-.562.61-.754.128-.191.256-.161.433-.097.177.064 1.124.53 1.317.627.193.097.322.144.368.224.047.08.047.464-.097.87zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.658 1.438 5.161l-1.291 4.717 4.825-1.268C8.411 21.492 10.137 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                </button>
                <button onClick={() => handleShare('facebook')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#1877F2] hover:border-[#1877F2]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </button>
                <button onClick={() => handleShare('twitter')} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all hover:scale-110 bg-[#0a0c14]">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button onClick={() => handleShare('copy')} className={`w-14 h-14 rounded-full border border-white/10 flex items-center justify-center transition-all hover:scale-110 bg-[#0a0c14] ${copied ? 'text-[#c5a059] border-[#c5a059]' : 'text-white/40 hover:text-[#c5a059] hover:border-[#c5a059]/40'}`}>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 21H8V7h11m0-2H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2m-3-4H4a2 2 0 00-2 2v14h2V3h12V1z"/></svg>
                </button>
            </div>
            {copied && <p className="mt-4 text-[8px] font-black uppercase tracking-[0.3em] text-[#c5a059] animate-bounce">¡Enlace Copiado!</p>}
        </div>
      </div>

      <div className="mb-10 flex items-center justify-center gap-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-[#c5a059]">Comunidad El Arsenal</h3>
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
      </div>
      
      <div className="bg-[#0a0c14] rounded-sm p-4 md:p-8 min-h-[400px] border border-white/5 relative shadow-2xl overflow-hidden">
        
        {/* Loading / Spinner State */}
        {!hasLoaded && !showFallback && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#0a0c14]">
                <div className="w-10 h-10 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full mb-4"></div>
                <p className="text-[#c5a059] font-serif italic text-sm tracking-widest uppercase animate-pulse">Sincronizando Conversación...</p>
            </div>
        )}

        {/* Fallback Action */}
        {showFallback && !hasLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-[#0a0c14] p-8 text-center animate-fade-in transition-all">
                <div className="w-20 h-20 rounded-full bg-[#1877F2]/10 flex items-center justify-center mb-8 border border-[#1877F2]/20">
                    <svg className="w-10 h-10 fill-[#1877F2]" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </div>
                <h4 className="text-white font-serif italic text-2xl mb-4">¡Únete al debate!</h4>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-10 max-w-sm leading-relaxed">
                    Parece que tu navegador bloqueó el widget de comentarios. No te pierdas la charla en nuestra página oficial de Facebook.
                </p>
                <button 
                  onClick={() => window.open(displayUrl, '_blank')}
                  className="px-12 py-5 bg-[#1877F2] text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-[#1877F2] transition-all rounded-sm shadow-xl active:scale-95"
                >
                    Abrir en Facebook
                </button>
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

      <div className="mt-12 text-center">
         <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.4em]">
           El Arsenal de Dios Más Gym &copy; 2026
         </p>
      </div>
    </div>
  );
};

export default CommentSection;
