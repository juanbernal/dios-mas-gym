import React, { useRef, useEffect, useState } from 'react';

interface CategoryBarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string | null) => void;
}

const DEFAULT_CATEGORIES = ['Fe', 'Fortaleza', 'Disciplina', 'Espíritu', 'Mentalidad'];

const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategory, onSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [categories]);

  const displayCats = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  return (
    <div className="sticky top-24 z-[900] py-12 bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="relative">
        {canScroll && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#05070a] to-transparent pointer-events-none z-10"></div>
        )}
        <div ref={scrollRef} className="section-container flex items-center justify-center gap-4 md:gap-12 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelect(null)}
            className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all whitespace-nowrap px-4 py-2 rounded-full ${
              !selectedCategory
                ? 'text-[#c5a059] bg-[#c5a059]/10 shadow-[0_0_20px_rgba(197,160,89,0.1)]'
                : 'text-white/30 hover:text-white'
            }`}
          >
            Todos
          </button>
          {displayCats.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all whitespace-nowrap px-4 py-2 rounded-full ${
                selectedCategory === cat
                  ? 'text-[#c5a059] bg-[#c5a059]/10 shadow-[0_0_20px_rgba(197,160,89,0.1)]'
                  : 'text-white/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {canScroll && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#05070a] to-transparent pointer-events-none z-10"></div>
        )}
      </div>
    </div>
  );
};

export default CategoryBar;
