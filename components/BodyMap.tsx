import React, { useState } from 'react';
import { MUSCULOS, Musculo } from '../data/rutinas';

// Mapa del cuerpo (frente y espalda). Los musculos se dibujan del lado izquierdo de la figura
// y el derecho es el mismo dibujo en espejo. Cada musculo se pinta si esta en `activos`.

type Forma = { m: Musculo; d: string };

const FRENTE: Forma[] = [
  { m: 'hombros', d: 'M76 86 C60 86 49 98 48 118 L63 117 C63 103 67 94 78 90 Z' },
  { m: 'pecho', d: 'M98 89 L80 89 C69 95 65 109 67 123 C77 131 91 131 98 125 Z' },
  { m: 'biceps', d: 'M48 123 C45 138 45 152 48 165 L60 165 C63 151 64 136 62 121 Z' },
  { m: 'antebrazos', d: 'M48 170 C43 189 41 208 42 228 L52 228 C56 209 60 190 60 170 Z' },
  { m: 'oblicuos', d: 'M68 129 C75 133 81 134 85 134 L85 198 C78 194 73 185 71 172 C69 158 67 143 68 129 Z' },
  { m: 'abdomen', d: 'M88 132 L99 132 L99 208 C94 208 90 205 88 200 Z' },
  { m: 'cuadriceps', d: 'M73 220 C66 246 66 274 72 302 L95 302 C99 274 99 246 97 226 C89 228 79 226 73 220 Z' },
  { m: 'pantorrillas', d: 'M74 314 C70 338 72 361 76 384 L89 384 C93 361 94 338 92 314 Z' },
];

const ESPALDA: Forma[] = [
  { m: 'trapecio', d: 'M99 64 L88 74 L72 86 L99 112 Z' },
  { m: 'hombros', d: 'M72 88 C58 88 49 99 48 118 L63 117 C63 104 67 96 77 92 Z' },
  { m: 'dorsales', d: 'M98 116 L77 93 C69 106 67 128 73 150 C81 160 91 166 98 168 Z' },
  { m: 'triceps', d: 'M48 123 C45 138 45 152 48 165 L60 165 C63 151 64 136 62 121 Z' },
  { m: 'antebrazos', d: 'M48 170 C43 189 41 208 42 228 L52 228 C56 209 60 190 60 170 Z' },
  { m: 'espalda-baja', d: 'M86 170 L99 172 L99 202 L84 202 C84 192 85 180 86 170 Z' },
  { m: 'gluteos', d: 'M71 202 C66 216 68 234 80 240 C91 243 98 236 99 226 L99 204 Z' },
  { m: 'femorales', d: 'M72 246 C68 268 69 288 73 302 L95 302 C99 284 98 262 96 244 C88 248 79 248 72 246 Z' },
  { m: 'pantorrillas', d: 'M73 314 C66 332 68 354 76 374 L90 374 C94 352 94 332 90 314 Z' },
];

// Cabeza, cuello, manos, cadera y pies: la silueta que no se pinta
const SILUETA = (
  <>
    <ellipse cx="100" cy="38" rx="21" ry="26" />
    <path d="M90 60 L110 60 L112 80 L88 80 Z" />
    <ellipse cx="47" cy="238" rx="7" ry="10" />
    <ellipse cx="153" cy="238" rx="7" ry="10" />
    <path d="M70 196 L130 196 L128 222 C118 226 108 228 100 234 C92 228 82 226 72 222 Z" />
    <path d="M73 302 L95 302 L92 314 L74 314 Z" />
    <path d="M127 302 L105 302 L108 314 L126 314 Z" />
    <ellipse cx="82" cy="394" rx="11" ry="7" />
    <ellipse cx="118" cy="394" rx="11" ry="7" />
  </>
);

interface Props {
  activos: Set<string>;
  onPick?: (m: Musculo) => void;
  className?: string;
  corazon?: boolean;
  alto?: number; // alto de cada figura en px
}

const Figura: React.FC<{ alto: number; formas: Forma[]; label: string; activos: Set<string>; hover: Musculo | null; setHover: (m: Musculo | null) => void; onPick?: (m: Musculo) => void; corazon?: boolean }> = ({ alto, formas, label, activos, hover, setHover, onPick, corazon }) => {
  const pieza = (f: Forma, i: number, espejo: boolean) => {
    const on = activos.has(f.m);
    const hv = hover === f.m;
    return (
      <path
        key={`${espejo ? 'd' : 'i'}${i}`}
        d={f.d}
        transform={espejo ? 'translate(200,0) scale(-1,1)' : undefined}
        fill={on ? '#4a90d9' : hv ? 'rgba(126,184,247,0.35)' : 'rgba(255,255,255,0.09)'}
        stroke={on ? '#9cc8f5' : 'rgba(255,255,255,0.18)'}
        strokeWidth="1"
        style={{ cursor: onPick ? 'pointer' : undefined, transition: 'fill .25s, stroke .25s', filter: on ? 'drop-shadow(0 0 6px rgba(74,144,217,0.8))' : undefined }}
        onMouseEnter={() => setHover(f.m)}
        onMouseLeave={() => setHover(null)}
        onClick={onPick ? () => onPick(f.m) : undefined}
      >
        <title>{MUSCULOS[f.m]}</title>
      </path>
    );
  };
  return (
    <figure className="flex flex-col items-center min-w-0">
      <svg viewBox="30 0 140 410" style={{ height: alto, width: '100%' }} role="img" aria-label={`Cuerpo ${label}`}>
        <g fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" strokeWidth="1">{SILUETA}</g>
        {formas.map((f, i) => pieza(f, i, false))}
        {formas.map((f, i) => pieza(f, i, true))}
        {label === 'frente' && (
          <g opacity={0.35} stroke="rgba(0,0,0,0.6)" strokeWidth="1" pointerEvents="none">
            <path d="M100 132 L100 206 M89 150 L111 150 M89 168 L111 168 M89 186 L111 186" fill="none" />
          </g>
        )}
        {corazon && label === 'frente' && (
          <path d="M113 104 c0-5 6-8 9-3 c3-5 9-2 9 3 c0 6-9 11-9 11 s-9-5-9-11 Z" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.9))' }} className="animate-pulse" pointerEvents="none" />
        )}
      </svg>
      <figcaption className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35 mt-1">{label}</figcaption>
    </figure>
  );
};

const BodyMap: React.FC<Props> = ({ activos, onPick, className, corazon, alto = 230 }) => {
  const [hover, setHover] = useState<Musculo | null>(null);
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        <Figura alto={alto} formas={FRENTE} label="frente" activos={activos} hover={hover} setHover={setHover} onPick={onPick} corazon={corazon} />
        <Figura alto={alto} formas={ESPALDA} label="espalda" activos={activos} hover={hover} setHover={setHover} onPick={onPick} />
      </div>
      <p className="text-center text-[11px] font-bold text-white/60 mt-2 min-h-[1.25em]">
        {hover ? MUSCULOS[hover] : onPick ? 'Toca un músculo' : ''}
      </p>
    </div>
  );
};

export default BodyMap;
