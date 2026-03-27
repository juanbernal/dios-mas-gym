import React from 'react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategory, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button 
        onClick={() => onSelect(null)}
        className={`px-6 py-3 tech-text text-[9px] font-black tracking-[0.2em] transition-all ${
          !selectedCategory 
            ? 'bg-accent-blue-bright text-white shadow-[0_0_15px_var(--accent-blue-dim)]' 
            : 'border border-white/10 text-text-dim hover:text-white hover:border-accent-blue/40'
        }`}
      >
        ARCHIVO COMPLETO
      </button>
      
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-6 py-3 tech-text text-[9px] font-black tracking-[0.2em] transition-all ${
            selectedCategory === cat 
              ? 'bg-accent-blue-bright text-white shadow-[0_0_15px_var(--accent-blue-dim)]' 
              : 'border border-white/10 text-text-dim hover:text-white hover:border-accent-blue/40'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
