import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  changeView: (view: AppView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, changeView }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Inicio',
      icon: 'fa-house',
      action: () => changeView('inicio'),
      isActive: location.pathname === '/' || currentView === 'inicio',
    },
    {
      label: 'Buscar',
      icon: 'fa-search',
      action: () => navigate('/buscar'),
      isActive: location.pathname === '/buscar',
    },
    {
      label: 'Testimonios',
      icon: 'fa-hands-praying',
      action: () => navigate('/testimonios'),
      isActive: location.pathname === '/testimonios',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[5000] md:hidden bg-[#0a0f1a]/96 backdrop-blur-2xl border-t border-white/10">
      <div className="flex items-center justify-around py-2 pb-safe">
        {navItems.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
              item.isActive
                ? 'text-[#4a90d9]'
                : 'text-white/35 hover:text-white/60'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`} />
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;