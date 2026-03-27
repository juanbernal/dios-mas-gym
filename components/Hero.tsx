import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <header className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden border-b border-white/5">
      {/* Background Glows */}
      <div className="gradient-glow w-[600px] h-[600px] bg-blue-900/10 top-[-200px] left-[-200px]"></div>
      <div className="gradient-glow w-[800px] h-[800px] bg-indigo-900/10 bottom-[-200px] right-[-200px]"></div>

      <div className="section-container relative z-10 animate-zen">
        <div className="mb-10 text-[11px] font-extrabold uppercase tracking-[0.8em] text-accent-blue opacity-50 animate-pulse">
           DIOS MÁS GYM // REFLECTIONS HUB
        </div>
        
        <h1 className="h1-display mb-16 text-white drop-shadow-2xl">
          Forjando el <br /> 
          <span className="serif-italic pr-4 text-accent-blue drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]">Espíritu</span> 
          Valiente.
        </h1>
        
        <div className="max-w-3xl mx-auto mb-20 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
           <p className="text-2xl md:text-3xl font-light leading-relaxed text-white/80 italic serif-italic border-l-2 border-accent-blue pl-8 italic mb-6">
             "{verse.t}"
           </p>
           <span className="block text-[12px] font-black tracking-widest text-accent-blue uppercase">— {verse.r}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <button 
            onClick={onEntrenar} 
            className="px-14 py-6 bg-white text-black font-extrabold uppercase text-[11px] tracking-[0.4em] hover:bg-accent-blue hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-2xl"
          >
            Sumergirse en el Arsenal
          </button>
          <button 
            onClick={onAleatorio} 
            className="px-14 py-6 border border-white/10 text-white font-extrabold uppercase text-[11px] tracking-[0.4em] hover:bg-white/5 transition-all rounded-full"
          >
            Inspiración Aleatoria
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-bounce flex flex-col items-center gap-4 opacity-30">
         <span className="text-[10px] font-black uppercase tracking-widest">Scroll</span>
         <i className="fas fa-chevron-down text-xl"></i>
      </div>
    </header>
  );
};

export default Hero;
