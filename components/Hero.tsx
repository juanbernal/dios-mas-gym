import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <header className="relative h-[95vh] flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background Decor */}
      <div className="gradient-glow w-[800px] h-[800px] bg-[#c5a059]/5 top-[-300px] left-[-200px]"></div>
      <div className="gradient-glow w-[800px] h-[800px] bg-[#c5a059]/5 bottom-[-300px] right-[-200px]"></div>

      <div className="section-container relative z-10 animate-zen px-4">
        <div className="mb-8 text-[9px] font-black uppercase tracking-[1em] text-[#c5a059] opacity-80 decoration-gold">
           — DIOS MÁS GYM // REFLECTIONS HUB —
        </div>
        
        <h1 className="h1-display mb-12 text-white drop-shadow-2xl">
          Templando el <br /> 
          <span className="serif-italic pr-4 text-[#c5a059] drop-shadow-[0_0_40px_rgba(197,160,89,0.3)]">Espíritu</span> 
        </h1>
        
        <div className="max-w-3xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative group">
               <p className="text-3xl md:text-5xl font-serif italic text-white/95 leading-tight mb-8 drop-shadow-lg">
                 "{verse.t}"
               </p>
               <span className="inline-block px-4 py-1.5 border-l-2 border-[#c5a059] text-[11px] font-black tracking-[0.5em] text-[#c5a059] uppercase">
                 {verse.r}
               </span>
            </div>
        </div>

        <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <button 
            onClick={onEntrenar} 
            className="px-12 py-5 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:scale-105 transition-all shadow-[0_20px_50px_rgba(197,160,89,0.2)] rounded-sm"
          >
            Explorar el Arsenal
          </button>
          <button 
            onClick={onAleatorio} 
            className="px-12 py-5 border border-white/10 text-white/60 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white/5 hover:text-white transition-all backdrop-blur-md"
          >
            Inspiración Divina
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20">
         <span className="text-[8px] font-black uppercase tracking-[0.4em]">Descubrir</span>
         <div className="w-0.5 h-12 bg-gradient-to-b from-white to-transparent"></div>
      </div>
    </header>
  );
};

export default Hero;
