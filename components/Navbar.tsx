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
    <nav className="fixed top-0 inset-x-0 h-24 nav-blur z-[1000] flex items-center justify-between px-8 md:px-20">
      <div className="flex items-center gap-12">
        <img 
          src={LOGO_URL} 
          className="h-8 md:h-10 cursor-pointer hover:scale-105 transition-transform" 
          alt="Logo" 
          onClick={() => changeView('inicio')} 
        />
        
        <div className="hidden md:flex items-center gap-10">
          <NavLink active={currentView === 'inicio'} onClick={() => changeView('inicio')} label="Inicio" />
          <NavLink active={currentView === 'reflexiones'} onClick={() => changeView('reflexiones')} label="Arsenal" />
          <NavLink active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} label="Favoritos" />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <button 
          onClick={onSearch} 
          className="p-2 text-white/60 hover:text-white transition-colors"
        >
          <i className="fas fa-search"></i>
        </button>
        <button 
          className="hidden md:block px-6 py-2 border border-white/10 rounded-full text-[10px] font-extrabold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
          onClick={() => changeView('reflexiones')}
        >
          Suscripción
        </button>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`text-[11px] font-extrabold uppercase tracking-[0.2em] transition-all hover:text-white ${
      active ? 'text-white border-b border-accent-blue pb-1' : 'text-white/40'
    }`}
  >
    {label}
  </button>
);

export default Navbar;
