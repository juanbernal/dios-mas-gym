import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

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
              <a href="https://www.youtube.com/@Diosmasgym" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><i className="fab fa-youtube"></i></a>
              <a href="https://open.spotify.com/intl-es/artist/2mEoedcjDJ7x6SCVLMI4Do" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><i className="fab fa-spotify"></i></a>
              <a href="https://music.apple.com/us/artist/diosmasgym/1789494422" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><i className="fab fa-apple"></i></a>
              <a href="https://www.tiktok.com/@diosmasgym" target="_blank" rel="noreferrer" className="hover:text-white transition-colors"><i className="fab fa-tiktok"></i></a>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#c5a059]/40 to-transparent mx-auto mb-10"></div>
          <p className="text-[9px] font-black tracking-[0.5em] text-white/20 uppercase mb-4">
            &copy; {new Date().getFullYear()} REFLECTIONS HUB PRO
          </p>
          <div className="text-[8px] font-bold tracking-[0.3em] text-white/10 uppercase mb-8">
             Armando guerreros de luz
          </div>
          
          <button 
            onClick={() => navigate('/admin')} 
            className="text-[8px] font-black uppercase tracking-[0.5em] text-white/[0.05] hover:text-[#c5a059]/60 transition-all py-2 px-4 border border-white/[0.03] hover:border-[#c5a059]/20 rounded-sm"
          >
            [ MODO OPERADOR ]
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
