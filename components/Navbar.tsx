import React from 'react';
import { AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  changeView: (view: AppView) => void;
  onSearch: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, changeView, onSearch }) => {
  const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

  return (
    <nav className="fixed top-5 inset-x-4 md:inset-x-12 lg:inset-x-20 h-20 rounded-[1.75rem] nav-blur z-[1000] flex items-center justify-between px-5 md:px-10 backdrop-blur-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-8 lg:gap-12 min-w-0">
        <img 
          src={LOGO_URL} 
          className="h-7 md:h-8 cursor-pointer hover:scale-105 transition-transform drop-shadow-[0_0_25px_rgba(197,160,89,0.25)]" 
          alt="Logo" 
          onClick={() => changeView('inicio')} 
        />
        
        <div className="hidden md:flex items-center gap-8">
          <NavLink active={currentView === 'inicio'} onClick={() => changeView('inicio')} label="Inicio" />
          <NavLink active={currentView === 'reflexiones'} onClick={() => changeView('reflexiones')} label="Arsenal" />
          <NavLink active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} label="Favoritos" />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <button 
          onClick={onSearch} 
          className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/10 text-white/45 hover:text-[#c5a059] hover:border-[#c5a059]/30 transition-colors"
        >
          <i className="fas fa-search"></i>
        </button>
        <a
          href="https://musica.diosmasgym.com/"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex px-6 py-3 border border-[#c5a059]/25 bg-[#c5a059]/10 text-[#c5a059] font-extrabold uppercase text-[9px] tracking-[0.2em] rounded-full hover:bg-[#c5a059] hover:text-black transition-all"
        >
          Música
        </a>
        <button 
          className="hidden md:block px-7 py-3 bg-[#c5a059] text-black font-extrabold uppercase text-[9px] tracking-[0.2em] rounded-full hover:scale-105 hover:bg-white transition-all shadow-lg"
          onClick={() => changeView('reflexiones')}
        >
          Arsenal
        </button>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`text-[10px] font-bold uppercase tracking-[0.25em] transition-all hover:text-[#c5a059] relative py-2 ${
      active ? 'text-[#c5a059]' : 'text-white/40'
    }`}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#c5a059] shadow-[0_0_10px_#c5a059]" />
    )}
  </button>
);

export default Navbar;
