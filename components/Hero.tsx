import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <div className="flex flex-col lg:flex-row gap-20 items-center animate-fade-in-up py-10 lg:py-20">
      <div className="flex-1 text-center lg:text-left z-10">
        <div className="inline-flex items-center gap-4 mb-10 overflow-hidden group">
           <div className="h-px w-12 bg-accent-blue group-hover:w-24 transition-all"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent-blue animate-pulse">
              FORJANDO GUERREROS
           </span>
        </div>
        
        <h1 className="h1-brutal text-7xl md:text-[12rem] mb-12 relative">
          D•M•G <br />
          <span className="text-stroke">ARSENAL</span>
        </h1>
        
        <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-20">
          <button 
            onClick={onEntrenar} 
            className="group relative px-12 py-6 bg-accent-blue text-white font-black uppercase text-xs tracking-[0.3em] clip-path-warrior-small overflow-hidden transition-all hover:translate-x-2 active:scale-95"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            <span className="relative flex items-center gap-4">
               Entrenar Espíritu <i className="fas fa-arrow-right"></i>
            </span>
          </button>
          
          <button 
            onClick={onAleatorio} 
            className="px-12 py-6 border-2 border-white/10 text-white font-black uppercase text-xs tracking-[0.3em] hover:border-accent-blue hover:text-accent-blue transition-all"
          >
            Aleatorio
          </button>
        </div>
      </div>

      <div className="lg:w-[40rem] relative">
         <div className="absolute -inset-10 bg-accent-blue/10 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>
         <div className="warrior-frame p-12 md:p-20 relative z-20 group">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent-blue"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent-blue"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent-blue"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent-blue"></div>

            <i className="fas fa-shield-halved text-5xl text-accent-blue/40 mb-12"></i>
            <p className="text-3xl md:text-5xl font-black italic text-white leading-tight mb-12 tracking-tighter">
              "{verse.t}"
            </p>
            
            <div className="flex items-center gap-6">
               <span className="h-px flex-1 bg-white/10"></span>
               <span className="font-black text-accent-blue uppercase tracking-widest text-[11px] bg-accent-blue/5 px-6 py-2 border border-accent-blue/20">
                 {verse.r}
               </span>
            </div>
         </div>
         
         <div className="absolute -bottom-10 -left-10 text-white/5 text-[20rem] font-black -z-10 pointer-events-none select-none">
            WAR
         </div>
      </div>
      
      <style>{`
        .clip-path-warrior-small {
          clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 85% 100%, 0% 100%);
        }
      `}</style>
    </div>
  );
};

export default Hero;
