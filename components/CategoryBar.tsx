import React from 'react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategory, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button 
        onClick={() => onSelect(null)}
        className={`px-6 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all ${
          !selectedCategory 
            ? 'bg-white text-black' 
            : 'text-text-secondary hover:text-white hover:bg-white/5'
        }`}
      >
        Todo
      </button>
      
      {categories.map(cat => (
        <button 
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-6 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all ${
            selectedCategory === cat 
              ? 'bg-white text-black' 
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryBar;
