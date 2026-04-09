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
    const initFacebookSDK = () => {
      // 1. Ensure fb-root exists
      if (!document.getElementById('fb-root')) {
        const fbRoot = document.createElement('div');
        fbRoot.id = 'fb-root';
        document.body.appendChild(fbRoot);
      }

      // 2. Load SDK if not present
      if (!document.getElementById('facebook-jssdk')) {
        const fjs = document.getElementsByTagName('script')[0];
        const js = document.createElement('script') as HTMLScriptElement;
        js.id = 'facebook-jssdk';
        js.src = "https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v20.0";
        js.async = true;
        js.defer = true;
        js.crossOrigin = "anonymous";
        js.onload = () => {
          if (window.FB) {
            window.FB.XFBML.parse();
          }
        };
        fjs.parentNode?.insertBefore(js, fjs);
      } else {
        // SDK exists, just re-parse
        if (window.FB) {
          setTimeout(() => window.FB.XFBML.parse(), 1000);
        }
      }
    };

    initFacebookSDK();
  }, [displayUrl]);

  return (
    <div className="mt-20 py-16 border-t border-zinc-100">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Comunidad El Arsenal</h3>
      </div>
      
      <div className="bg-white rounded-xl p-6 overflow-hidden min-h-[300px] shadow-sm border border-zinc-100 flex flex-col items-center justify-center relative">
        {/* Fallback info for developers */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
           <p className="text-zinc-400 font-serif italic text-xl">Cargando conversación...</p>
        </div>

        <div 
          className="fb-comments relative z-10 w-full" 
          data-href={displayUrl} 
          data-width="100%" 
          data-numposts="15"
          data-colorscheme="light"
          data-order-by="reverse_time"
        ></div>
      </div>

      <p className="mt-8 text-[9px] text-zinc-400 font-bold uppercase tracking-[0.3em] text-center bg-zinc-50 py-4 rounded-lg border border-dashed border-zinc-200">
        Únete a la charla. Tu opinión fortalece al Arsenal.
      </p>
    </div>
  );
};

export default CommentSection;
