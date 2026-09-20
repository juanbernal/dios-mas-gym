import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Testimony, fetchTestimonios } from '../services/testimonioService';

export const HomeTestimonios: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Testimony[]>([]);

  useEffect(() => {
    fetchTestimonios().then(list => setItems(list.slice(0, 3)));
  }, []);

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-[#05070a] border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-16">
        <div className="text-center mb-12">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3">
            <i className="fas fa-heart mr-2"></i>Comunidad
          </div>
          <h2 className="font-serif italic text-4xl sm:text-5xl md:text-6xl text-white leading-tight">
            Tu historia <span className="text-[#4a90d9]">importa</span>
          </h2>
          <p className="text-sm text-white/50 mt-3 max-w-xl mx-auto">
            ¿Cómo ha impactado la música de Diosmasgym o Juan 614 tu vida? Compártelo y puede inspirar a otros.
          </p>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {items.map(t => (
              <figure key={t.id} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <blockquote className="text-sm text-white/70 leading-relaxed line-clamp-6 flex-1">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-4 pt-4 border-t border-white/10 text-xs">
                  <span className="font-bold text-white">{t.name}</span>
                  {t.location && <span className="text-white/40"> · {t.location}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate('/testimonios')}
            className="px-8 py-3 rounded-full bg-[#4a90d9] text-[10px] font-black uppercase tracking-[0.3em] text-white hover:bg-[#5b9de3] transition-colors"
          >
            <i className="fas fa-pen mr-2"></i>Compartir mi testimonio
          </button>
          {items.length > 0 && (
            <button
              onClick={() => navigate('/testimonios')}
              className="ml-3 px-8 py-3 rounded-full border border-[#4a90d9]/40 text-[10px] font-black uppercase tracking-[0.3em] text-[#7eb8f7] hover:bg-[#4a90d9]/10 transition-colors"
            >
              Ver todos
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
