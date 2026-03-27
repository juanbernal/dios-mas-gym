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
    <aside className="hidden lg:flex flex-col w-96 bg-bg-slate/95 border-r border-white/5 p-12 z-50 overflow-y-auto no-scrollbar backdrop-blur-3xl animate-fade-in-up">
      <div className="mb-20 flex flex-col items-center group cursor-pointer" onClick={() => changeView('inicio')}>
        <img src={LOGO_URL} className="w-56 mb-8 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_50px_rgba(59,130,246,0.2)]" alt="Logo" />
        <div className="h-1 w-16 bg-accent-blue group-hover:w-40 transition-all shadow-[0_0_15px_var(--accent-blue)]"></div>
      </div>

      <nav className="flex-1 space-y-6">
        <NavItem active={currentView === 'inicio'} onClick={() => changeView('inicio')} icon="fa-bolt" label="Dashboard" />
        <NavItem active={currentView === 'reflexiones' && !selectedCategory} onClick={() => { setSelectedCategory(null); changeView('reflexiones'); }} icon="fa-book" label="Arsenal Completo" />
        
        <div className="pt-12 pb-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent-blue opacity-50 italic">Filtros de Guerra</h4>
        </div>
        
        {topCategories.map(cat => (
          <NavItem key={cat} active={currentView === 'reflexiones' && selectedCategory === cat} onClick={() => { setSelectedCategory(cat); changeView('reflexiones'); }} icon="fa-tag" label={cat} />
        ))}

        <div className="pt-12 pb-4">
          <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent-blue opacity-50 italic">Arsenal Personal</h4>
        </div>
        <NavItem active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} icon="fa-star" label="Favoritos" />
        <NavItem active={currentView === 'testimonios'} onClick={() => changeView('testimonios')} icon="fa-comment-dots" label="Testimonios" />
      </nav>

      <div className="mt-20 pt-12 border-t border-white/5">
         <div className="warrior-frame p-8 flex items-center justify-between group">
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Racha de Fe</span>
               <span className="font-black text-white text-3xl italic">{streak} <span className="text-xs text-accent-blue opacity-50">DÍAS</span></span>
            </div>
            <i className="fas fa-fire-flame-curved text-accent-orange text-3xl animate-pulse"></i>
         </div>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-8 px-8 py-5 transition-all w-full text-left group ${
      active 
        ? 'bg-accent-blue text-white shadow-[8px_8px_0px_rgba(255,255,255,0.1)] translate-x-1' 
        : 'text-text-secondary hover:text-white border-l-4 border-transparent hover:border-accent-blue hover:bg-white/5'
    }`}
  >
    <i className={`fas ${icon} text-lg ${active ? 'text-white' : 'group-hover:text-accent-blue'} transition-colors`}></i>
    <span className="font-black uppercase text-[12px] tracking-[0.2em] italic">{label}</span>
  </button>
);

export default Sidebar;
