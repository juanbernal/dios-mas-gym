import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  selectedCategory: string | null;
  changeView: (view: AppView) => void;
  setSelectedCategory: (cat: string | null) => void;
  topCategories: string[];
  streak: number;
  onLogoClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, selectedCategory, changeView, setSelectedCategory, topCategories, streak, onLogoClick }) => {
  const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

  return (
    <aside className="hidden lg:flex flex-col w-96 bg-bg-panel border-r border-white/5 p-10 z-50 overflow-y-auto no-scrollbar relative flex-shrink-0">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-[1px] bg-accent-blue opacity-10"></div>
      
      <div className="mb-20 flex flex-col items-center group cursor-pointer" onClick={onLogoClick}>
        <img src={LOGO_URL} className="w-56 mb-8 group-hover:scale-105 transition-transform duration-500 contrast-125" alt="Logo" />
        <div className="flex items-center gap-2">
           <div className="h-1 w-2 bg-accent-blue"></div>
           <span className="tech-text text-[9px] font-black tracking-[0.4em] text-accent-blue-bright">SISTEMA DIOSMASGYM</span>
           <div className="h-1 w-2 bg-accent-blue"></div>
        </div>
      </div>

      <nav className="flex-1 space-y-4">
        <MenuItem active={currentView === 'inicio'} onClick={() => changeView('inicio')} icon="fa-terminal" label="DASHBOARD" />
        <MenuItem active={currentView === 'reflexiones' && !selectedCategory} onClick={() => { setSelectedCategory(null); changeView('reflexiones'); }} icon="fa-database" label="BASE DE DATOS" />
        
        <div className="pt-12 pb-2 px-6">
           <span className="tech-text text-[8px] tracking-[0.6em] text-accent-blue/40 font-black">ENTRADAS POR CATEGORÍA</span>
        </div>
        
        {topCategories.map(cat => (
          <MenuItem 
            key={cat} 
            active={currentView === 'reflexiones' && selectedCategory === cat} 
            onClick={() => { setSelectedCategory(cat); changeView('reflexiones'); }} 
            icon="fa-hashtag" 
            label={cat} 
          />
        ))}

        <div className="pt-12 pb-2 px-6">
           <span className="tech-text text-[8px] tracking-[0.6em] text-accent-blue/40 font-black">PERSONAL</span>
        </div>
        <MenuItem active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} icon="fa-heart" label="ARCHIVOS FAVORITOS" />
      </nav>

      <div className="mt-20">
         <div className="tactical-box p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
               <span className="tech-text text-[9px] text-text-dim">RACHA ACTIVA</span>
               <span className="status-light online h-1.5 w-1.5 flicker-on-hover"></span>
            </div>
            <div className="text-4xl font-bold tech-text italic tracking-tighter text-accent-blue-bright">
               {streak} <span className="text-xs opacity-50">DÍAS</span>
            </div>
         </div>
      </div>
    </aside>
  );
};

const MenuItem: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-6 px-8 py-4 transition-all w-full text-left tech-text ${
      active 
        ? 'bg-accent-blue-dim text-accent-blue-bright border-l-4 border-accent-blue-bright' 
        : 'text-text-dim hover:text-white hover:bg-white/5 border-l-4 border-transparent'
    }`}
  >
    <i className={`fas ${icon} text-sm transition-colors duration-300`}></i>
    <span className="font-bold text-[10px] tracking-[0.2em]">{label}</span>
  </button>
);

export default Sidebar;
