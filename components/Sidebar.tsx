import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  selectedCategory: string | null;
  changeView: (view: AppView) => void;
  setSelectedCategory: (cat: string | null) => void;
  topCategories: string[];
  streak: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, selectedCategory, changeView, setSelectedCategory, topCategories, streak }) => {
  const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

  return (
    <aside className="hidden lg:flex flex-col w-80 bg-bg-deep border-r border-white/5 p-12 z-50 overflow-y-auto no-scrollbar">
      <div className="mb-20 flex flex-col items-center cursor-pointer" onClick={() => changeView('inicio')}>
        <img src={LOGO_URL} className="w-48 mb-6" alt="Logo" />
      </div>

      <nav className="flex-1 space-y-2">
        <MenuItem active={currentView === 'inicio'} onClick={() => changeView('inicio')} label="Inicio" />
        <MenuItem active={currentView === 'reflexiones' && !selectedCategory} onClick={() => { setSelectedCategory(null); changeView('reflexiones'); }} label="Arsenal" />
        
        <div className="pt-10 pb-4">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Categorías</span>
        </div>
        
        {topCategories.map(cat => (
          <MenuItem 
            key={cat} 
            active={currentView === 'reflexiones' && selectedCategory === cat} 
            onClick={() => { setSelectedCategory(cat); changeView('reflexiones'); }} 
            label={cat} 
          />
        ))}

        <div className="pt-10 pb-4">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Colección</span>
        </div>
        <MenuItem active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} label="Favoritos" />
      </nav>

      <div className="mt-20 pt-10 border-t border-white/5">
         <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Racha de lectura</span>
            <div className="text-2xl font-bold text-white italic">
               {streak} <span className="text-[10px] opacity-40 font-normal">DÍAS</span>
            </div>
         </div>
      </div>
    </aside>
  );
};

const MenuItem: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center px-6 py-4 transition-all w-full text-left rounded-xl ${
      active 
        ? 'bg-white/5 text-white font-bold' 
        : 'text-text-secondary hover:text-white hover:bg-white/5'
    }`}
  >
    <span className="text-[12px] tracking-wide uppercase">{label}</span>
  </button>
);

export default Sidebar;
