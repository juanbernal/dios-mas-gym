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
        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
          !selectedCategory 
            ? 'bg-accent-blue text-white shadow-lg shadow-blue-600/20' 
            : 'bg-glass-bg border border-glass-border text-text-secondary hover:text-white hover:border-accent-blue'
        }`}
      >
        Todo el Arsenal
      </button>
      
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            selectedCategory === cat 
              ? 'bg-accent-blue text-white shadow-lg shadow-blue-600/20' 
              : 'bg-glass-bg border border-glass-border text-text-secondary hover:text-white hover:border-accent-blue'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
