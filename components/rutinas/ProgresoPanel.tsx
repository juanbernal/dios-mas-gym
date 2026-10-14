import React, { useMemo, useState } from 'react';
import { Entreno, hoyLocal, logros, mejorRacha } from '../../services/rutinaService';

interface Props {
  hist: Entreno[];
  meta: number;
  onMeta: (n: number) => void;
}

const SEMANAS = 12;
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Calendario de constancia (ultimas 12 semanas), totales y medallas
const ProgresoPanel: React.FC<Props> = ({ hist, meta, onMeta }) => {
  const [verLogros, setVerLogros] = useState(false);

  const { celdas, porDia } = useMemo(() => {
    const porDia = new Map<string, number>();
    hist.forEach(e => porDia.set(e.fecha, (porDia.get(e.fecha) || 0) + 1));
    const hoy = new Date();
    const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7) - (SEMANAS - 1) * 7);
    const celdas: { fecha: string; futuro: boolean }[] = [];
    for (let i = 0; i < SEMANAS * 7; i++) {
      const d = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
      celdas.push({ fecha: hoyLocal(d), futuro: d > hoy });
    }
    return { celdas, porDia };
  }, [hist]);

  const minutos = hist.reduce((a, e) => a + (e.minutos || 0), 0);
  const volumen = hist.reduce((a, e) => a + (e.volumen || 0), 0);
  const medallas = logros(hist);
  const ganadas = medallas.filter(m => m.ok).length;
  const hoy = hoyLocal();

  return (
    <div className="rounded-3xl p-5 border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50"><i className="fas fa-chart-line text-[#4a90d9] mr-2"></i>Tu progreso</p>
        <label className="flex items-center gap-1.5 text-[10px] text-white/50">
          Meta
          <select value={meta} onChange={ev => onMeta(Number(ev.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-white text-[11px] font-bold" aria-label="Días a entrenar por semana">
            {[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n} className="bg-[#0a1322]">{n} días/sem</option>)}
          </select>
        </label>
      </div>

      {/* Calendario */}
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-[3px] text-[8px] text-white/30 font-bold pr-0.5">
          {DIAS.map((d, i) => <span key={i} className="h-[11px] leading-[11px]">{i % 2 === 0 ? d : ''}</span>)}
        </div>
        <div className="grid grid-rows-7 grid-flow-col gap-[3px] flex-1">
          {celdas.map(c => {
            const n = porDia.get(c.fecha) || 0;
            const color = c.futuro ? 'bg-transparent' : n >= 2 ? 'bg-[#9cc8f5]' : n === 1 ? 'bg-[#4a90d9]' : 'bg-white/[0.07]';
            return <span key={c.fecha} title={`${c.fecha.split('-').reverse().join('/')}${n ? ` · ${n} ${n === 1 ? 'entreno' : 'entrenos'}` : ''}`} className={`h-[11px] rounded-[3px] ${color} ${c.fecha === hoy ? 'ring-1 ring-white/70' : ''}`}></span>;
          })}
        </div>
      </div>
      <p className="text-[9px] text-white/30 mt-2">Últimas {SEMANAS} semanas</p>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          [hist.length, 'entrenos'],
          [minutos >= 60 ? `${Math.floor(minutos / 60)}h ${minutos % 60}m` : `${minutos} min`, 'entrenando'],
          [`${mejorRacha(hist)} d`, 'mejor racha'],
        ].map(([v, l]) => (
          <div key={String(l)} className="rounded-xl bg-white/[0.04] border border-white/5 p-2.5 text-center">
            <p className="text-base font-black text-white leading-none tabular-nums">{v}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/40 mt-1">{l}</p>
          </div>
        ))}
      </div>
      {volumen > 0 && <p className="text-[10px] text-white/45 mt-2 text-center"><i className="fas fa-weight-hanging text-[#4a90d9] mr-1"></i>{volumen.toLocaleString('es')} kg levantados en total</p>}

      {/* Medallas */}
      <button onClick={() => setVerLogros(v => !v)} aria-expanded={verLogros} className="w-full mt-4 flex items-center justify-between p-3 rounded-xl bg-amber-500/[0.07] border border-amber-400/20 text-left">
        <span className="text-xs font-bold text-white"><i className="fas fa-trophy text-amber-400 mr-2"></i>Medallas <span className="text-white/50 font-normal">{ganadas}/{medallas.length}</span></span>
        <span className="flex -space-x-1.5">
          {medallas.filter(m => m.ok).slice(0, 4).map(m => (
            <span key={m.id} className="w-6 h-6 rounded-full bg-amber-400 text-black text-[9px] flex items-center justify-center border-2 border-[#05070a]"><i className={`fas ${m.icono}`}></i></span>
          ))}
          <i className={`fas fa-chevron-down text-white/40 text-[10px] ml-3 self-center transition-transform ${verLogros ? 'rotate-180' : ''}`}></i>
        </span>
      </button>
      {verLogros && (
        <ul className="grid grid-cols-2 gap-2 mt-2">
          {medallas.map(m => (
            <li key={m.id} className={`rounded-xl p-2.5 border ${m.ok ? 'border-amber-400/30 bg-amber-500/[0.08]' : 'border-white/5 bg-white/[0.02] opacity-50'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${m.ok ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/40'}`}><i className={`fas ${m.ok ? m.icono : 'fa-lock'}`}></i></span>
              <p className="text-[11px] font-bold text-white mt-1.5 leading-tight">{m.nombre}</p>
              <p className="text-[9px] text-white/45 leading-snug mt-0.5">{m.desc}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[9px] text-white/30 mt-3">Se guarda en este teléfono. Meta actual: {meta} días por semana.</p>
    </div>
  );
};

export default ProgresoPanel;
