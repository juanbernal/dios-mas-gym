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
        className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all italic ${
          !selectedCategory 
            ? 'bg-accent-blue text-white shadow-[4px_4px_0px_white]' 
            : 'border-2 border-white/10 text-text-secondary hover:border-accent-blue hover:text-white'
        }`}
      >
        ARCHIVO COMPLETO
      </button>
      
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all italic ${
            selectedCategory === cat 
              ? 'bg-accent-blue text-white shadow-[4px_4px_0px_white]' 
              : 'border-2 border-white/10 text-text-secondary hover:border-accent-blue hover:text-white'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
