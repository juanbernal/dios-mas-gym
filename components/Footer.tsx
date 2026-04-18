import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-32 bg-[#05070a] border-t border-white/5 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-[0.02] pointer-events-none">
        <div className="text-[200px] font-black text-center leading-none select-none">
          DIOS MAS GYM
        </div>
      </div>

      <div className="section-container relative z-10 flex flex-col items-center">
        <h2 className="font-serif italic text-6xl md:text-8xl mb-12 text-white/90 text-center">
          Dios Más Gym
        </h2>
        
        <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black tracking-[0.6em] text-[#c5a059] uppercase opacity-60 mb-20">
          <span className="hover:text-white transition-colors cursor-default">Fe</span>
          <span className="hover:text-white transition-colors cursor-default">Valentía</span>
          <span className="hover:text-white transition-colors cursor-default">Disciplina</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 w-full max-w-4xl text-center md:text-left mb-20 border-y border-white/5 py-16">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-6">Misión</h4>
            <p className="text-white/40 text-xs leading-relaxed font-medium">
              Fortaleciendo el cuerpo y el espíritu a través de la fe y la disciplina diaria.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-6">Música</h4>
            <div className="flex flex-col gap-3 text-white/40 text-xs font-bold font-black tracking-widest uppercase">
              <a href="https://musica.diosmasgym.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Diosmasgym</a>
              <a href="https://juan614.diosmasgym.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Juan 614</a>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-6">Plataformas</h4>
            <div className="flex gap-6 text-white/40 text-xl">
              <a href="#" className="hover:text-white transition-colors"><i className="fab fa-youtube"></i></a>
              <a href="#" className="hover:text-white transition-colors"><i className="fab fa-spotify"></i></a>
              <a href="#" className="hover:text-white transition-colors"><i className="fab fa-instagram"></i></a>
              <a href="#" className="hover:text-white transition-colors"><i className="fab fa-tiktok"></i></a>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent mx-auto mb-10"></div>
          <p className="text-[9px] font-black tracking-[0.5em] text-white/20 uppercase mb-4">
            &copy; {new Date().getFullYear()} REFLECTIONS HUB PRO
          </p>
          <div className="text-[8px] font-bold tracking-[0.3em] text-white/10 uppercase">
             Armando guerreros de luz
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
