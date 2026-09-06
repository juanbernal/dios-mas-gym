import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  changeView: (view: AppView) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, changeView }) => {
  const LOGO_URL = "/logo-diosmasgym.png";
  const navigate = useNavigate();
  const location = useLocation();
  const [navSearch, setNavSearch] = useState('');

  const isHome = location.pathname === '/' || currentView === 'inicio';
  const isSearch = location.pathname === '/buscar';
  const isTestimonios = location.pathname === '/testimonios';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(navSearch.trim())}`);
    } else {
      navigate('/buscar');
    }
  };

  return (
    <nav className="fixed top-5 inset-x-4 md:inset-x-12 lg:inset-x-20 h-20 rounded-[1.75rem] nav-blur z-[1000] flex items-center justify-between px-5 md:px-10 backdrop-blur-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-6 lg:gap-10 min-w-0">
        <img 
          src={LOGO_URL} 
          className="h-7 md:h-8 cursor-pointer hover:scale-105 transition-transform drop-shadow-[0_0_25px_rgba(37,99,168,0.25)] shrink-0" 
          alt="Dios Mas Gym Logo"
          width="32"
          height="32"
          fetchPriority="high"
          onClick={() => { changeView('inicio'); navigate('/'); }} 
        />
        
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <NavLink active={isHome} onClick={() => { changeView('inicio'); navigate('/'); }} label="Inicio" />
          <NavLink active={isSearch} onClick={() => navigate('/buscar')} label="Buscar" />
          <NavLink active={isTestimonios} onClick={() => navigate('/testimonios')} label="Testimonios" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Barra de búsqueda rápida para escritorio */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder="Buscar canción, letra..."
            className="w-32 sm:w-44 md:w-52 lg:w-64 bg-white/5 hover:bg-white/10 focus:bg-black/70 text-xs text-white placeholder:text-white/40 pl-8 md:pl-9 pr-3 py-2 rounded-full border border-white/10 focus:border-[#4a90d9]/60 focus:outline-none transition-all"
          />
          <i className="fas fa-search absolute left-3 text-white/40 text-xs pointer-events-none"></i>
          {navSearch && (
            <button
              type="button"
              onClick={() => setNavSearch('')}
              className="absolute right-2.5 text-white/40 hover:text-white text-xs"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </form>

        <a
          href="https://musica.diosmasgym.com/"
          target="_blank"
          rel="noreferrer"
          className="hidden lg:flex px-5 py-2.5 border border-[#4a90d9]/25 bg-[#4a90d9]/10 text-[#4a90d9] font-extrabold uppercase text-[9px] tracking-[0.2em] rounded-full hover:bg-[#4a90d9] hover:text-black transition-all shrink-0"
        >
          Música
        </a>
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`text-[10px] font-bold uppercase tracking-[0.25em] transition-all hover:text-[#4a90d9] relative py-2 ${
      active ? 'text-[#4a90d9]' : 'text-white/40'
    }`}
  >
    {label}
    {active && (
      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4a90d9] shadow-[0_0_10px_#4a90d9]" />
    )}
  </button>
);

export default Navbar;
