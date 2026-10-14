import React, { useMemo, useState } from 'react';
import { Rutina, RutinasData } from '../../data/rutinas';

interface Props {
  data: RutinasData;
  onPick: (r: Rutina) => void;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

// Busca en todas las rutinas visibles por titulo, objetivo o nombre de ejercicio
const BuscadorRutinas: React.FC<Props> = ({ data, onPick }) => {
  const [q, setQ] = useState('');

  const resultados = useMemo(() => {
    const t = norm(q.trim());
    if (t.length < 2) return [];
    const palabras = t.split(/\s+/);
    return data.rutinas
      .filter(r => !r.oculta)
      .map(r => {
        const ej = r.ejercicios.find(e => palabras.every(p => norm(e.nombre).includes(p)));
        const texto = norm(`${r.titulo} ${r.objetivo || ''} ${r.descripcion || ''} ${data.partes.find(p => p.id === r.parte)?.nombre || ''} ${r.lugar} ${r.nivel}`);
        const enTexto = palabras.every(p => texto.includes(p));
        return enTexto || ej ? { r, ej, peso: enTexto ? 0 : 1 } : null;
      })
      .filter((x): x is { r: Rutina; ej: Rutina['ejercicios'][number] | undefined; peso: number } => !!x)
      .sort((a, b) => a.peso - b.peso)
      .slice(0, 8);
  }, [q, data]);

  return (
    <div className="relative mb-5">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 focus-within:border-[#4a90d9]/60 transition-colors">
        <i className="fas fa-magnifying-glass text-white/40 text-sm"></i>
        <input
          type="text"
          enterKeyHint="search"
          value={q}
          onChange={ev => setQ(ev.target.value)}
          onKeyDown={ev => { if (ev.key === 'Escape') setQ(''); if (ev.key === 'Enter' && resultados[0]) { onPick(resultados[0].r); setQ(''); } }}
          placeholder="Busca una rutina o ejercicio: sentadilla, dominadas, abdomen…"
          aria-label="Buscar rutinas o ejercicios"
          className="flex-1 min-w-0 bg-transparent py-3.5 text-sm text-white placeholder:text-white/30 outline-none"
        />
        {q && <button onClick={() => setQ('')} className="text-white/40 hover:text-white w-8 h-8" aria-label="Borrar búsqueda"><i className="fas fa-xmark"></i></button>}
      </div>
      {q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-white/10 bg-[#0a1322]/98 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {resultados.length === 0 ? (
            <p className="p-4 text-sm text-white/45">Nada con "{q}". Prueba con otra palabra.</p>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {resultados.map(({ r, ej }) => {
                const parte = data.partes.find(p => p.id === r.parte);
                return (
                  <li key={r.id}>
                    <button onClick={() => { onPick(r); setQ(''); }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0">
                      <span className="w-9 h-9 rounded-lg bg-[#4a90d9]/15 text-[#7eb8f7] flex items-center justify-center flex-shrink-0"><i className={`fas ${parte?.icono || 'fa-dumbbell'} text-sm`}></i></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-white truncate">{r.titulo}</span>
                        <span className="block text-[10px] text-white/45 truncate">
                          {parte?.nombre} · {r.lugar === 'casa' ? 'Casa' : 'Gym'} · {r.nivel} · {r.minutos} min
                          {ej && <> · <span className="text-[#7eb8f7]">{ej.nombre}</span></>}
                        </span>
                      </span>
                      <i className="fas fa-arrow-right text-[10px] text-white/30"></i>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorRutinas;
