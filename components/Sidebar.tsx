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

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  selectedCategory, 
  changeView, 
  setSelectedCategory, 
  topCategories, 
  streak 
}) => {
  const LOGO_URL = "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600";

  return (
    <aside className="hidden lg:flex flex-col w-80 bg-slate-950/80 border-r border-glass-border p-8 z-50 overflow-y-auto no-scrollbar backdrop-blur-3xl animate-fade-in-up">
      <div className="mb-12 flex flex-col items-center group cursor-pointer" onClick={() => changeView('inicio')}>
        <img src={LOGO_URL} className="w-48 mb-6 group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]" alt="Logo" />
        <div className="h-0.5 w-12 bg-accent-blue rounded-full group-hover:w-32 transition-all duration-500 shadow-[0_0_10px_var(--accent-blue-glow)]"></div>
      </div>

      <nav className="flex-1 space-y-3">
        <NavItem 
          active={currentView === 'inicio'} 
          onClick={() => changeView('inicio')} 
          icon="fa-bolt" 
          label="Dashboard" 
        />
        <NavItem 
          active={currentView === 'reflexiones' && !selectedCategory} 
          onClick={() => { setSelectedCategory(null); changeView('reflexiones'); }} 
          icon="fa-book-bible" 
          label="Todos los Mensajes" 
        />
        
        <div className="pt-8 pb-3 px-7">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-blue opacity-50">Top Categorías</h4>
        </div>
        
        {topCategories.map(cat => (
          <NavItem 
            key={cat}
            active={currentView === 'reflexiones' && selectedCategory === cat} 
            onClick={() => {
              setSelectedCategory(cat);
              changeView('reflexiones');
            }} 
            icon="fa-tag" 
            label={cat} 
          />
        ))}

        <div className="pt-8 pb-3 px-7">
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-blue opacity-50">Personal</h4>
        </div>
        <NavItem active={currentView === 'favoritos'} onClick={() => changeView('favoritos')} icon="fa-star" label="Mis Favoritos" />
        <NavItem active={currentView === 'testimonios'} onClick={() => changeView('testimonios')} icon="fa-comment-dots" label="Testimonios" />
        <NavItem active={currentView === 'musica'} onClick={() => changeView('musica')} icon="fa-music" label="Radio Elite" />
      </nav>

      <div className="mt-12 pt-10 border-t border-glass-border">
         <div className="cyber-glass p-6 rounded-[2.5rem] border border-accent-blue/10 flex items-center justify-between shadow-inner">
            <div className="flex flex-col">
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary">Racha de Guerrero</span>
               <span className="font-black text-white text-lg">{streak} <span className="text-xs text-accent-blue">Días</span></span>
            </div>
            <div className="w-12 h-12 bg-accent-blue/10 rounded-2xl flex items-center justify-center">
              <i className="fas fa-fire text-accent-orange text-xl animate-bounce"></i>
            </div>
         </div>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{ active: boolean, onClick: () => void, icon: string, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-6 px-7 py-4 rounded-[2rem] transition-all w-full text-left group ${
      active 
        ? 'bg-accent-blue text-white shadow-[0_12px_24px_rgba(59,130,246,0.25)] border border-blue-400/30' 
        : 'text-text-secondary hover:text-white hover:bg-slate-900/40 border border-transparent hover:border-glass-border'
    }`}
  >
    <i className={`fas ${icon} text-lg ${active ? 'text-white' : 'group-hover:text-accent-blue'} transition-colors duration-300`}></i>
    <span className="font-black uppercase text-[10.5px] tracking-[0.2em]">{label}</span>
  </button>
);

export default Sidebar;
