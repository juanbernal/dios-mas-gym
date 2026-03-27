import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <div className="relative flex flex-col items-center justify-center py-24 lg:py-40 animate-fade-in-up overflow-hidden">
      {/* Radar Pulse Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-20">
         <div className="radar w-full h-full" style={{ animationDelay: '0s' }}></div>
         <div className="radar w-full h-full" style={{ animationDelay: '1.3s' }}></div>
         <div className="radar w-full h-full" style={{ animationDelay: '2.6s' }}></div>
      </div>

      <div className="max-w-5xl w-full text-center relative z-10">
        <div className="flex justify-center mb-10">
           <div className="px-6 py-2 border border-accent-blue/40 bg-accent-blue/5 text-[10px] tech-text tracking-[0.5em] text-accent-blue-bright flex items-center gap-4">
              <span className="status-light online"></span>
              ESTADO: OPERATIVO // MISIÓN EN CURSO
           </div>
        </div>
        
        <h1 className="h1-tactical mb-12 tech-text">
          <span className="opacity-40">DIOS</span> MÁS <span className="text-accent-blue shadow-blue-500/20">GYM</span>
        </h1>
        
        <p className="text-xl md:text-2xl font-black uppercase italic tracking-tighter mb-16 text-text-dim max-w-2xl mx-auto border-x border-white/5 px-10">
          "{verse.t}"
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <button 
            onClick={onEntrenar} 
            className="tactical-box px-12 py-6 flex flex-col items-center gap-3 group hover:border-accent-blue transition-all"
          >
             <span className="tech-text text-[9px] tracking-[0.3em] opacity-50 group-hover:text-accent-blue transition-colors">INICIAR ENTRENAMIENTO</span>
             <span className="text-xl font-bold uppercase italic tracking-widest text-white group-hover:text-accent-blue">ESPÍRITU GUERRERO</span>
          </button>
          <button 
            onClick={onAleatorio} 
            className="tactical-box px-12 py-6 flex flex-col items-center gap-3 group hover:border-accent-blue transition-all"
          >
             <span className="tech-text text-[9px] tracking-[0.3em] opacity-50 group-hover:text-accent-blue transition-colors">OBJETIVO AL AZAR</span>
             <span className="text-xl font-bold uppercase italic tracking-widest text-white group-hover:text-accent-blue">SELECCIÓN ALPHA</span>
          </button>
        </div>
      </div>
      
      <div className="absolute top-10 left-10 tech-text text-[10px] text-white/5 rotate-90 origin-top-left flex gap-10">
         <span>COORD: 31.633 -106.485</span>
         <span>AUTH: DIOSMASGYM-ADMIN</span>
         <span>VER: 3.0.0</span>
      </div>
    </div>
  );
};

export default Hero;
