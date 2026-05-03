import React from 'react';

interface HeroProps {
  verse: { t: string; r: string };
  onEntrenar: () => void;
  onAleatorio: () => void;
}

const Hero: React.FC<HeroProps> = ({ verse, onEntrenar, onAleatorio }) => {
  return (
    <header className="relative min-h-[96vh] flex flex-col items-center justify-center overflow-hidden cinematic-grain">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(197,160,89,0.16),transparent_34%),linear-gradient(180deg,rgba(5,7,10,0.2),#05070a_92%)]"></div>
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(90deg,#c5a059_1px,transparent_1px),linear-gradient(#c5a059_1px,transparent_1px)] bg-[size:80px_80px]"></div>
      <div className="gradient-glow w-[900px] h-[900px] bg-[#c5a059]/10 top-[-360px] left-[-260px]"></div>
      <div className="gradient-glow w-[700px] h-[700px] bg-[#8B5A2B]/10 bottom-[-260px] right-[-220px]"></div>

      <div className="absolute left-4 md:left-14 top-32 bottom-20 hidden lg:flex flex-col justify-between text-[9px] font-black uppercase tracking-[0.5em] text-white/15">
        <span className="[writing-mode:vertical-rl]">Diosmasgym</span>
        <span className="[writing-mode:vertical-rl]">Juan 614</span>
      </div>

      <div className="absolute right-6 md:right-20 top-32 hidden lg:grid gap-4 w-36">
        <img src="/logo-diosmasgym.png" alt="Diosmasgym" className="w-36 h-36 rounded-[2rem] object-cover border border-[#c5a059]/20 shadow-[0_30px_80px_rgba(0,0,0,0.45)] rotate-3 opacity-90" />
        <img src="/logo-juan614-v2.jpg" alt="Juan 614" className="w-28 h-28 ml-auto rounded-[1.5rem] object-cover border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] -rotate-6 opacity-90" />
      </div>

      <div className="section-container relative z-10 animate-zen px-4 text-center pt-20">
        <div className="inline-flex items-center gap-4 mb-8 px-5 py-3 rounded-full border border-[#c5a059]/20 bg-black/20 backdrop-blur-xl text-[9px] font-black uppercase tracking-[0.5em] text-[#c5a059] opacity-90">
           <span className="w-2 h-2 rounded-full bg-[#c5a059] shadow-[0_0_20px_#c5a059]"></span> Faith · Music · Discipline
        </div>
        
        <h1 className="h1-display mb-10 text-white drop-shadow-2xl max-w-6xl mx-auto">
          Templando el <br />
          <span className="serif-italic pr-4 text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] via-white to-[#8B5A2B] drop-shadow-[0_0_40px_rgba(197,160,89,0.28)]">Espíritu</span>
        </h1>
        
        <div className="max-w-4xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative group bg-white/[0.03] border border-white/10 rounded-[2rem] p-7 md:p-10 backdrop-blur-md shadow-[0_30px_100px_rgba(0,0,0,0.25)]">
               <p className="text-2xl md:text-4xl font-serif italic text-white/95 leading-tight mb-8 drop-shadow-lg">
                  "{verse.t}"
               </p>
               <span className="inline-block px-4 py-1.5 border-l-2 border-[#c5a059] text-[10px] font-black tracking-[0.5em] text-[#c5a059] uppercase">
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
          <a
            href="https://musica.diosmasgym.com/"
            target="_blank"
            rel="noreferrer"
            className="px-12 py-5 border border-[#c5a059]/30 bg-[#c5a059]/10 text-[#c5a059] font-black uppercase text-[10px] tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all backdrop-blur-md"
          >
            Escuchar Música
          </a>
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
