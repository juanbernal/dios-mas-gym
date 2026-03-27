import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <div className="flex flex-col lg:flex-row gap-16 items-center animate-fade-in-up">
      <div className="flex-1 text-center lg:text-left">
        <span className="subtitle-cyber mb-8 inline-block drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
          Cuerpo y Espíritu • El Arsenal de Fe
        </span>
        <h1 className="h1-cyber text-6xl md:text-9xl mb-12 leading-[0.8] tracking-[-0.06em]">
          Forja tu <br />
          <span className="text-accent-blue italic relative">
            Destino
            <svg className="absolute -bottom-4 left-0 w-full h-4 text-accent-blue/40" viewBox="0 0 200 20" preserveAspectRatio="none">
              <path d="M0,10 Q50,0 100,10 T200,10" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
          </span>
        </h1>
        
        <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-16">
          <button 
            onClick={onEntrenar} 
            className="btn-cyber bg-accent-blue text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
          >
            <i className="fas fa-dumbbell group-hover:rotate-12 transition-transform"></i>
            Entrenar Hoy
          </button>
          <button 
            onClick={onAleatorio} 
            className="btn-cyber bg-glass-bg border border-glass-border px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-accent-blue hover:bg-slate-900 transition-all flex items-center gap-4"
          >
            <i className="fas fa-shuffle"></i>
            Aleatorio
          </button>
        </div>
      </div>

      <div className="lg:w-[35rem] cyber-glass p-12 md:p-16 rounded-[4rem] relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 text-accent-blue/5 text-[15rem] group-hover:scale-110 group-hover:rotate-6 transition-transform pointer-events-none">
          <i className="fas fa-cross"></i>
        </div>
        
        <i className="fas fa-quote-left text-4xl text-accent-blue mb-10 opacity-50"></i>
        <p className="text-2xl md:text-3xl italic text-white leading-relaxed font-bold mb-10 relative z-10">
          "{verse.t}"
        </p>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-px flex-1 bg-glass-border"></div>
          <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest bg-accent-blue/5 px-6 py-2.5 rounded-2xl border border-accent-blue/10">
            {verse.r}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Hero;
