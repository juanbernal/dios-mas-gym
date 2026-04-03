import React from 'react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ selected, onSelect }) => {
  const categories = ['Todos', 'Fe', 'Fortaleza', 'Disciplina', 'Espíritu', 'Mentalidad'];

  return (
    <div className="sticky top-24 z-[900] py-12 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="section-container flex items-center justify-center gap-4 md:gap-12 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat === 'Todos' ? null : cat)}
            className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all whitespace-nowrap px-4 py-2 rounded-full ${
              (selected === cat || (selected === null && cat === 'Todos'))
                ? 'text-[#c5a059] bg-[#c5a059]/10 shadow-[0_0_20px_rgba(197,160,89,0.1)]'
                : 'text-white/30 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryBar;
