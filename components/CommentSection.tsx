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
  useEffect(() => {
    // 1. Initialize FB SDK if not exists
    const initFacebookSDK = () => {
      if (window.FB) {
        window.FB.XFBML.parse();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v19.0';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.FB) {
          window.FB.XFBML.parse();
        }
      };
      document.body.appendChild(script);
    };

    initFacebookSDK();
  }, [url]);

  return (
    <div className="mt-20 py-16 border-t border-zinc-100">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059]"></div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Comentarios</h3>
      </div>
      
      {/* Container for FB Comments */}
      <div className="bg-white rounded-xl p-4 overflow-hidden min-h-[200px]">
        <div 
          className="fb-comments" 
          data-href={url} 
          data-width="100%" 
          data-numposts="10"
          data-colorscheme="light"
        ></div>
      </div>

      <p className="mt-6 text-[9px] text-zinc-400 font-bold uppercase tracking-wider text-center bg-zinc-50 py-3 rounded-lg border border-dashed border-zinc-200">
        ¡Comparte tu reflexión con nosotros abajo!
      </p>
    </div>
  );
};

export default CommentSection;
