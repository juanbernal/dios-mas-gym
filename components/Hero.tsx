import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 lg:py-40 text-center animate-zen px-6">
      <div className="mb-12">
        <span className="subtitle-zen">DIOS MÁS GYM // Misión Alpha</span>
      </div>
      
      <h1 className="h1-hero mb-16 max-w-6xl">
        Transforma <br /> Tu Espíritu.
      </h1>
      
      <p className="text-xl md:text-2xl font-light text-text-secondary max-w-3xl mb-20 leading-relaxed italic">
        "{verse.t}"
      </p>

      <div className="flex flex-wrap justify-center gap-6">
        <button 
          onClick={onEntrenar} 
          className="btn-premium"
        >
          Entrenar Ahora
        </button>
        <button 
          onClick={onAleatorio} 
          className="px-10 py-4 border border-white/10 text-white rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-white/5 transition-all"
        >
          Explorar Arsenal
        </button>
      </div>

      <div className="mt-32 w-[1px] h-20 bg-gradient-to-b from-accent-blue to-transparent opacity-50"></div>
    </div>
  );
};

export default Hero;
