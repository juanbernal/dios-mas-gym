import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parteDelDia, rutinaPrincipal, rutinasVisibles, Lugar } from '../data/rutinas';
import { useRutinas } from '../services/rutinaService';
import { Oracion, fetchOraciones } from '../services/oracionService';
import { OracionCard } from './OracionView';

// Portada: "Entrena hoy" (rutina del dia) y "Oramos juntos" (muro de oracion) lado a lado
const HomeComunidad: React.FC = () => {
  const navigate = useNavigate();
  const data = useRutinas();
  const parte = parteDelDia(data);
  const [lugar, setLugar] = useState<Lugar>('casa');
  const rutina = rutinaPrincipal(data, parte.id, lugar) || rutinaPrincipal(data, parte.id, lugar === 'casa' ? 'gym' : 'casa');
  const [oraciones, setOraciones] = useState<Oracion[]>([]);

  useEffect(() => { fetchOraciones().then(l => setOraciones(l.slice(0, 2))); }, []);

  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-[#05070a] border-t border-white/5">
      <div className="absolute -left-40 top-10 w-[500px] h-[500px] rounded-full bg-[#4a90d9]/10 blur-3xl pointer-events-none"></div>
      <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10 grid lg:grid-cols-2 gap-6 md:gap-8">

        {/* Entrena hoy */}
        <div className="relative overflow-hidden rounded-[2rem] border border-[#4a90d9]/30 p-6 md:p-8" style={{ background: 'linear-gradient(150deg, rgba(37,99,168,0.25), rgba(5,10,20,0.95) 60%)' }}>
          {(rutina?.imagen || parte.imagen) ? <>
            <img src={rutina?.imagen || parte.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/75 to-[#05070a]/95"></div>
          </> : <i className={`fas ${parte.icono} absolute -right-6 -bottom-6 text-[160px] text-white/[0.04]`} aria-hidden="true"></i>}
          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                <i className="fas fa-fire"></i>Rutina del día
              </span>
              <div className="inline-flex p-0.5 rounded-full bg-black/40 border border-white/10">
                {(['casa', 'gym'] as const).map(l => (
                  <button key={l} onClick={() => setLugar(l)} className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${lugar === l ? 'bg-white text-black' : 'text-white/60'}`}>
                    {l === 'casa' ? 'Casa' : 'Gym'}
                  </button>
                ))}
              </div>
            </div>
            <h2 className="font-serif italic text-4xl md:text-6xl text-white leading-none">Entrena <span className="text-[#7eb8f7]">{parte.nombre.toLowerCase()}</span></h2>
            <p className="text-sm text-white/55 mt-3">{parte.frase}</p>
            {rutina && <>
            <p className="mt-4 text-sm font-bold text-white">{rutina.titulo}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] font-bold text-white/70">
              <span><i className="fas fa-clock text-[#4a90d9] mr-1.5"></i>{rutina.minutos} min</span>
              <span><i className="fas fa-signal text-[#4a90d9] mr-1.5"></i>{rutina.nivel}</span>
              <span><i className="fas fa-list-check text-[#4a90d9] mr-1.5"></i>{rutina.ejercicios.length} ejercicios</span>
              {rutinasVisibles(data, parte.id, lugar).length > 1 && <span><i className="fas fa-layer-group text-[#4a90d9] mr-1.5"></i>{rutinasVisibles(data, parte.id, lugar).length} rutinas</span>}
            </div>
            <ol className="mt-5 flex flex-col gap-2">
              {rutina.ejercicios.slice(0, 3).map((e, i) => (
                <li key={e.nombre} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="w-7 h-7 rounded-lg bg-[#4a90d9]/20 text-[#9cc8f5] text-xs font-black flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-white truncate">{e.nombre}</span>
                  <span className="text-[11px] font-bold text-white/50 whitespace-nowrap">{e.series} × {e.reps}</span>
                </li>
              ))}
              {rutina.ejercicios.length > 3 && <li className="text-[11px] text-white/40 pl-1">+ {rutina.ejercicios.length - 3} ejercicios más</li>}
            </ol>
            </>}
            <button
              onClick={() => navigate(`/rutinas?parte=${parte.id}&lugar=${rutina?.lugar || lugar}${rutina ? `&r=${rutina.id}` : ''}`)}
              className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#4a90d9] text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors shadow-[0_10px_30px_rgba(74,144,217,0.35)]"
            >
              <i className="fas fa-play"></i>Empezar rutina
            </button>
            <div className="mt-5 flex flex-wrap gap-2">
              {data.partes.filter(p => p.id !== parte.id).map(p => (
                <button key={p.id} onClick={() => navigate(`/rutinas?parte=${p.id}&lugar=${lugar}`)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-white hover:border-white/30 transition-colors">
                  <i className={`fas ${p.icono} mr-1.5`}></i>{p.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Oramos juntos */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 p-6 md:p-8 bg-gradient-to-br from-white/[0.05] to-transparent flex flex-col">
          <span className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4a90d9]/15 border border-[#4a90d9]/40 text-[#9cc8f5] text-[9px] font-black uppercase tracking-[0.2em] mb-4">
            <i className="fas fa-hands-praying"></i>Muro de oración
          </span>
          <h2 className="font-serif italic text-4xl md:text-6xl text-white leading-none">Oramos <span className="text-[#7eb8f7]">juntos</span></h2>
          <p className="text-sm text-white/55 mt-3">"Orad unos por otros." — Santiago 5:16. Deja tu petición o levanta en oración a un hermano.</p>
          <div className="mt-5 flex-1">
            {oraciones.length > 0 ? (
              oraciones.map(o => <OracionCard key={o.id} o={o} compact />)
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
                🙏 Sé el primero en dejar una petición. La comunidad orará por ti.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('/oracion')} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#4a90d9] transition-colors">
              <i className="fas fa-pen"></i>Pedir oración
            </button>
            <button onClick={() => navigate('/oracion')} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-white/15 text-white/80 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-colors">
              Ver el muro <i className="fas fa-arrow-right text-[9px]"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeComunidad;
