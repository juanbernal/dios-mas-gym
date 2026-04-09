import React, { useEffect } from 'react';

interface CommentSectionProps {
  url: string;
}

declare global {
  interface Window {
    FB: any;
  }
}

const CommentSection: React.FC<CommentSectionProps> = ({ url }) => {
  // Use production domain for localhost testing so FB doesn't block it
  const displayUrl = url.includes('localhost') 
    ? `https://diosmasgym.com${new URL(url).pathname}`
    : url;

  useEffect(() => {
    // 1. Define Initialization Function
    (window as any).fbAsyncInit = function() {
      window.FB.init({
        appId: '809015114144186', // Standard App ID for community comments
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      });
      window.FB.XFBML.parse();
    };

    // 2. Load SDK
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
      js.src = "https://connect.facebook.net/es_LA/sdk.js";
      js.async = true;
      js.defer = true;
      js.crossOrigin = "anonymous";
      fjs.parentNode?.insertBefore(js, fjs);
    };

    loadSDK();

    // Re-parse when URL changes (for SPA navigation)
    const timer = setTimeout(() => {
      if (window.FB && window.FB.XFBML) {
        window.FB.XFBML.parse();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [displayUrl]);

  return (
    <div className="mt-20 py-20 border-t border-white/5">
      <div className="mb-10 flex items-center justify-center gap-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-[#c5a059]">Comunidad El Arsenal</h3>
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
      </div>
      
      <div className="bg-[#0a0c14] rounded-sm p-4 md:p-8 min-h-[400px] border border-white/5 relative shadow-2xl">
        {/* Loading Indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
           <div className="w-10 h-10 border-2 border-[#c5a059] border-t-transparent animate-spin rounded-full mb-4"></div>
           <p className="text-[#c5a059] font-serif italic text-sm tracking-widest uppercase">Sincronizando Conversación...</p>
        </div>

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
         <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.4em] mb-4">
           ¿No aparece el cuadro? Verifica que no tengas un AdBlocker activo.
         </p>
         <div className="h-px w-20 bg-white/5 mx-auto"></div>
      </div>
    </div>
  );
};

export default CommentSection;
