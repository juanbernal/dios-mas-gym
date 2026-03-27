import React from 'react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategory, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-4 items-center">
      <button 
        onClick={() => onSelect(null)}
        className={`px-8 py-3 text-[11px] font-black uppercase tracking-[0.4em] border-b-2 transition-all ${
          !selectedCategory 
            ? 'border-accent-blue text-white' 
            : 'border-transparent text-white/40 hover:text-white'
        }`}
      >
        ARCHIVO COMPLETO
      </button>
      
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-8 py-3 text-[11px] font-black uppercase tracking-[0.4em] border-b-2 transition-all ${
            selectedCategory === cat 
              ? 'border-accent-blue text-white' 
              : 'border-transparent text-white/40 hover:text-white'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
