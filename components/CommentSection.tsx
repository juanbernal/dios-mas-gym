import React, { useEffect, useState } from 'react';

interface CommentSectionProps {
  url: string;
}

declare global {
  interface Window {
    DISQUS: any;
    disqus_config: any;
  }
}

const CommentSection: React.FC<CommentSectionProps> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Clean URL for sharing
  const displayUrl = url.split('?')[0].split('#')[0];
  const postSlug = displayUrl.split('/').pop() || 'home';

  useEffect(() => {
    // Check if the browser supports Native Share API
    if (navigator.share) {
      setCanNativeShare(true);
    }

    // DISQUS Initialization Logic
    const loadDisqus = () => {
      const shortname = 'diosmasgym';
      
      if (document.getElementById('disqus-script')) {
        if (window.DISQUS) {
            window.DISQUS.reset({
                reload: true,
                config: function () {
                    this.page.identifier = postSlug;
                    this.page.url = displayUrl;
                    this.page.title = document.title;
                }
            });
        }
        return;
      }

      window.disqus_config = function () {
        this.page.url = displayUrl;
        this.page.identifier = postSlug;
        this.page.title = document.title;
      };

      const d = document, s = d.createElement('script');
      s.id = 'disqus-script';
      s.src = `https://${shortname}.disqus.com/embed.js`;
      s.setAttribute('data-timestamp', (+new Date()).toString());
      (d.head || d.body).appendChild(s);
    };

    const timer = setTimeout(loadDisqus, 500);
    return () => clearTimeout(timer);
  }, [displayUrl, postSlug]);

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: document.title,
        text: 'Mira esta reflexión en El Arsenal de Dios Más Gym:',
        url: displayUrl,
      });
    } catch (err) {
      console.log('Error al compartir:', err);
      // Fallback to clipboard if share failed or cancelled
      handleManualShare('copy');
    }
  };

  const handleManualShare = (platform: string) => {
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

  return (
    <div className="mt-20 py-20 border-t border-white/5">
      
      {/* SHARING ACTIONS */}
      <div className="mb-20">
        <div className="text-center mb-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] mb-8">Viralizar Reflexión</h4>
            
            <div className="flex flex-col items-center gap-8">
                {/* PRIMARY NATIVE SHARE BUTTON (Only if supported) */}
                {canNativeShare && (
                    <button 
                        onClick={handleNativeShare}
                        className="group relative px-12 py-5 bg-[#c5a059] text-black font-black uppercase text-[11px] tracking-[0.5em] hover:bg-white transition-all transform hover:scale-105 shadow-[0_20px_50px_rgba(197,160,89,0.2)] rounded-sm flex items-center gap-4 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <i className="fas fa-share-alt text-lg"></i>
                        <span>Compartir Ahora</span>
                    </button>
                )}

                {/* DESKTOP/FALLBACK SOCIAL ROW */}
                <div className="flex flex-wrap justify-center gap-6">
                    <button onClick={() => handleManualShare('whatsapp')} title="Compartir en WhatsApp" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#25D366] hover:border-[#25D366]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                        <i className="fab fa-whatsapp text-xl"></i>
                    </button>
                    <button onClick={() => handleManualShare('facebook')} title="Compartir en Facebook" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#1877F2] hover:border-[#1877F2]/40 transition-all hover:scale-110 bg-[#0a0c14]">
                        <i className="fab fa-facebook-f text-xl"></i>
                    </button>
                    <button onClick={() => handleManualShare('twitter')} title="Compartir en X" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/40 transition-all hover:scale-110 bg-[#0a0c14]">
                        <i className="fab fa-x-twitter text-lg"></i>
                    </button>
                    <button onClick={() => handleManualShare('copy')} title="Copiar Enlace" className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center transition-all hover:scale-110 bg-[#0a0c14] ${copied ? 'text-[#c5a059] border-[#c5a059]' : 'text-white/40 hover:text-[#c5a059] hover:border-[#c5a059]/40'}`}>
                        <i className="fas fa-link text-lg"></i>
                    </button>
                </div>
            </div>
            
            {copied && <p className="mt-4 text-[8px] font-black uppercase tracking-[0.3em] text-[#c5a059] animate-bounce">¡Enlace Copiado al Portapapeles!</p>}
        </div>
      </div>

      {/* COMMUNITY HEADER */}
      <div className="mb-12 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-[#c5a059]">Reflexiones de la Comunidad</h3>
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
        </div>
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em]">Poder por Disqus</p>
      </div>
      
      {/* DISQUS CONTAINER */}
      <div className="bg-white/5 md:bg-white/5 rounded-sm min-h-[500px] border border-white/5 p-4 md:p-10 relative shadow-2xl">
         <div id="disqus_thread" className="w-full"></div>
         <noscript>Por favor habilita JavaScript para ver la conversación de la comunidad.</noscript>
      </div>

      <div className="mt-16 text-center border-t border-white/5 pt-12">
         <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.5em]">
           El Arsenal de Fe | Dios Mas Gym &copy; 2026
         </p>
      </div>
    </div>
  );
};

export default CommentSection;
