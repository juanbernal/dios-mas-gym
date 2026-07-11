import React from 'react';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  changeView: (view: AppView) => void;
}

const navItems: { view: AppView; label: string; icon: string }[] = [
  { view: 'inicio', label: 'Inicio', icon: 'fa-house' },
  { view: 'reflexiones', label: 'Arsenal', icon: 'fa-book-bible' },
  { view: 'favoritos', label: 'Favoritos', icon: 'fa-star' },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, changeView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[5000] md:hidden bg-[#0f111a]/95 backdrop-blur-2xl border-t border-white/10">
      <div className="flex items-center justify-around py-2 pb-safe">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => changeView(item.view)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
              currentView === item.view
                ? 'text-[#4a90d9]'
                : 'text-white/35 hover:text-white/60'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;