import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TESTIMONIES } from './TestimoniosView';

export const HomeTestimonios: React.FC = () => {
  const navigate = useNavigate();
  const items = TESTIMONIES.slice(0, 3);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-[#05070a] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-16">
        <div className="text-center mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3">
            <i className="fas fa-heart mr-2"></i>Testimonios
          </div>
          <h2 className="font-serif italic text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
            Vidas <span className="text-[#4a90d9]">Transformadas</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(t => (
            <figure key={t.id} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <blockquote className="text-sm text-white/70 leading-relaxed line-clamp-6 flex-1">
                “{t.text}”
              </blockquote>
              <p className="font-serif italic text-xs text-[#7eb8f7] mt-4">
                {t.verse} <span className="text-white/40">— {t.verseRef}</span>
              </p>
              <figcaption className="mt-4 pt-4 border-t border-white/10 text-xs">
                <span className="font-bold text-white">{t.name}</span>
                <span className="text-white/40"> · {t.location}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => navigate('/testimonios')}
            className="px-8 py-3 rounded-full border border-[#4a90d9]/40 text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7] hover:bg-[#4a90d9]/10 transition-colors"
          >
            Ver más testimonios
          </button>
        </div>
      </div>
    </section>
  );
};
