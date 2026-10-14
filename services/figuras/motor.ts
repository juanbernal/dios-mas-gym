// Motor de las figuras de ejercicios: un muñeco de lado (o de frente) que hace el movimiento en bucle.
// Cada pose se describe con la cadera, el angulo del torso y cada brazo/pierna como angulos o como un
// punto al que debe llegar la mano/pie (se resuelve con cinematica inversa). El SVG se anima con SMIL,
// sin JavaScript corriendo en la pagina.
//
// Angulos: 0 = hacia abajo, 90 = hacia adelante (derecha), 180 = hacia arriba, -90 = hacia atras.

export type P = [number, number];
export type Ref = 'h' | 'c' | 'cab'; // hombro, cadera, cabeza
export type Lim = [number, number] | { x: number; y: number; r?: Ref; b?: number };

export interface Pose {
  h: P;          // cadera
  t: number;     // torso (cadera -> hombro); 180 = erguido
  hd?: number;   // inclinacion extra de la cabeza
  tl?: number;   // largo del torso (encogimientos)
  an?: Lim; af?: Lim; // brazo cercano / lejano
  ln?: Lim; lf?: Lim; // pierna cercana / lejana
  fn?: number; ff?: number; // angulo de cada pie
  ar?: boolean;  // angulos de brazos relativos al torso
}

export type Carga = 'barra' | 'mancuerna' | 'kb' | 'mochila' | 'garrafa' | 'botella' | 'disco' | 'balon' | 'rueda';
export type Punto = 'm' | 'mN' | 'mF' | 'h' | 'c' | 'cab' | 'pN' | 'pF';
export type Foco = 'torso' | 'brazo' | 'antebrazo' | 'muslo' | 'pierna' | 'cadera' | 'hombro';

export interface Prop { k: Carga | 'plataforma' | 'almohadilla' | 'rodillo'; at: Punto; dx?: number; dy?: number }
export interface Cable { desde: P; at: Punto; cuerda?: boolean }

export interface Patron {
  k: Pose[];           // 2 poses = ida y vuelta; mas = secuencia en ciclo
  dur?: number;        // segundos por ciclo
  foco?: Foco[];
  est?: string;        // equipo fijo (banco, barra, pared...)
  props?: Prop[];
  cables?: Cable[];
  carga?: { at: 'manos' | Punto; def: Carga | null; dx?: number; dy?: number };
  fr?: boolean;        // vista de frente
  corto?: boolean;     // angulos por el camino mas corto (circulos de brazos)
}

const L = { t: 34, n: 5, cab: 13.5, ua: 18, fa: 16, th: 24, sh: 23, ft: 8 };
export const PISO = 132;
const R = Math.PI / 180;

const dir = (a: number): P => [Math.sin(a * R), Math.cos(a * R)];
const mov = (p: P, a: number, l: number): P => { const d = dir(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
const ang = (a: P, b: P) => Math.atan2(b[0] - a[0], b[1] - a[1]) / R;
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpP = (a: P, b: P, u: number): P => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// Dos segmentos de root a target; b decide hacia que lado se dobla la articulacion
const ik = (root: P, target: P, l1: number, l2: number, b: number): [P, P] => {
  const d = dist(root, target);
  const base = ang(root, target);
  if (d >= l1 + l2 - 0.01) { const j = mov(root, base, l1); return [j, mov(j, base, l2)]; }
  const dd = Math.max(d, Math.abs(l1 - l2) + 0.01);
  const alfa = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd)))) / R;
  const j = mov(root, base + b * alfa, l1);
  return [j, d < Math.abs(l1 - l2) ? mov(j, ang(j, target), l2) : target];
};

interface Esq { h: P; s: P; cuello: P; cab: P; aN: [P, P]; aF: [P, P]; lN: [P, P, P]; lF: [P, P, P] }

const esAng = (l: Lim | undefined): l is [number, number] => Array.isArray(l) || l === undefined;
const angs = (l: Lim | undefined): [number, number] => (Array.isArray(l) ? l : [0, 0]);

// Punto final absoluto de un miembro en una pose dada (para mezclar angulos y objetivos)
const refPt = (r: Ref | undefined, h: P, s: P, cab: P): P => (r === 'h' ? s : r === 'c' ? h : r === 'cab' ? cab : [0, 0]);

const base = (p: Pose) => {
  const s = mov(p.h, p.t, L.t * (p.tl ?? 1));
  const hd = p.t + (p.hd ?? 0);
  return { s, cuello: mov(s, hd, L.n), cab: mov(s, hd, L.cab) };
};

const finAbs = (p: Pose, l: Lim | undefined, brazo: boolean): P => {
  const { s, cab } = base(p);
  const root = brazo ? s : p.h;
  if (esAng(l)) {
    const [a1, a2] = angs(l);
    const off = brazo && p.ar ? p.t - 180 : 0;
    return mov(mov(root, a1 + off, brazo ? L.ua : L.th), a2 + off, brazo ? L.fa : L.sh);
  }
  const o = refPt(l.r, p.h, s, cab);
  return [o[0] + l.x, o[1] + l.y];
};

const resolver = (p: Pose, ends: { an?: P; af?: P; ln?: P; lf?: P }, bends: { an: number; af: number; ln: number; lf: number }): Esq => {
  const { s, cuello, cab } = base(p);
  const brazo = (l: Lim | undefined, fin: P | undefined, b: number): [P, P] => {
    if (!fin && esAng(l)) {
      const [a1, a2] = angs(l);
      const off = p.ar ? p.t - 180 : 0;
      const codo = mov(s, a1 + off, L.ua);
      return [codo, mov(codo, a2 + off, L.fa)];
    }
    const target = fin ?? finAbs(p, l, true);
    return ik(s, target, L.ua, L.fa, b);
  };
  const pierna = (l: Lim | undefined, fin: P | undefined, b: number, pieAng: number | undefined, def: number): [P, P, P] => {
    let rod: P, tob: P, fa: number;
    if (!fin && esAng(l)) {
      const [a1, a2] = angs(l);
      rod = mov(p.h, a1, L.th);
      tob = mov(rod, a2, L.sh);
      fa = pieAng ?? a2 + 90;
    } else {
      [rod, tob] = ik(p.h, fin ?? finAbs(p, l, false), L.th, L.sh, b);
      fa = pieAng ?? def;
    }
    return [rod, tob, mov(tob, fa, L.ft)];
  };
  return {
    h: p.h, s, cuello, cab,
    aN: brazo(p.an, ends.an, bends.an),
    aF: brazo(p.af, ends.af, bends.af),
    lN: pierna(p.ln, ends.ln, bends.ln, p.fn, 90),
    lF: pierna(p.lf, ends.lf, bends.lf, p.ff, 90),
  };
};

const bendDe = (l: Lim | undefined, def: number) => (!esAng(l) && l.b !== undefined ? l.b : def);
const ease = (u: number) => 0.5 - Math.cos(Math.PI * u) / 2;
const angCorto = (a: number, b: number) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d; };

// Pose intermedia entre A y B (u en 0..1)
const mezclar = (A: Pose, B: Pose, u: number, corto: boolean, fr: boolean): Esq => {
  const la = (a: number | undefined, b: number | undefined, d = 0) => lerp(a ?? d, corto ? angCorto(a ?? d, b ?? d) : b ?? d, u);
  const P: Pose = {
    h: lerpP(A.h, B.h, u), t: la(A.t, B.t), hd: la(A.hd, B.hd), tl: lerp(A.tl ?? 1, B.tl ?? 1, u),
    ar: A.ar && B.ar,
  };
  if (A.fn !== undefined || B.fn !== undefined) P.fn = la(A.fn, B.fn, 90);
  if (A.ff !== undefined || B.ff !== undefined) P.ff = la(A.ff, B.ff, fr ? -90 : 90);
  const ends: { an?: P; af?: P; ln?: P; lf?: P } = {};
  const bends = { an: -1, af: fr ? 1 : -1, ln: 1, lf: fr ? -1 : 1 };
  (['an', 'af', 'ln', 'lf'] as const).forEach(key => {
    const a = A[key], b = B[key];
    const brazo = key[0] === 'a';
    bends[key] = bendDe(b, bendDe(a, bends[key]));
    if (esAng(a) && esAng(b)) {
      const [a1, a2] = angs(a), [b1, b2] = angs(b);
      P[key] = [la(a1, b1), la(a2, b2)];
    } else if (!esAng(a) && !esAng(b) && a.r === b.r) {
      P[key] = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), r: a.r, b: bends[key] };
    } else {
      ends[key] = lerpP(finAbs(A, a, brazo), finAbs(B, b, brazo), u);
    }
  });
  if (fr && P.ff === undefined) P.ff = -90;
  return resolver(P, ends, bends);
};

// Muestras del ciclo: cada tramo tiene una pausa corta y luego el movimiento suavizado
const PASOS = 9;
const muestrear = (pat: Patron): { tiempos: number[]; esq: Esq[] } => {
  const ks = pat.k;
  const n = ks.length;
  const tiempos: number[] = [];
  const esq: Esq[] = [];
  const pausa = 0.18;
  for (let i = 0; i < n; i++) {
    const A = ks[i], B = ks[(i + 1) % n];
    tiempos.push(i);
    esq.push(mezclar(A, B, 0, !!pat.corto, !!pat.fr));
    for (let j = 0; j <= PASOS; j++) {
      const u = j / PASOS;
      tiempos.push(i + pausa + (1 - pausa) * u);
      esq.push(mezclar(A, B, ease(u), !!pat.corto, !!pat.fr));
    }
  }
  return { tiempos: tiempos.map(t => t / n), esq };
};

// ── Dibujo ──
const COL = {
  cerca: '#d9eafc', lejos: '#5d8fc6', frente: '#b9d6f5',
  foco: '#ff9a3c', focoLejos: '#c96c23',
  equipo: '#4c6a8c', relleno: '#15243a', disco: '#334155', aro: '#a3b3c6',
};
const f1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${f1(p[0])} ${f1(p[1])}`;

const CARGAS: Record<string, string> = {
  barra: `<circle r="11" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="2"/><circle r="2.6" fill="${COL.aro}"/>`,
  disco: `<circle r="9" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="2"/><circle r="2.2" fill="${COL.aro}"/>`,
  mancuerna: `<rect x="-5" y="-5" width="10" height="10" rx="3" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="1.6"/>`,
  kb: `<path d="M-4 1 Q0 -7 4 1" fill="none" stroke="${COL.aro}" stroke-width="2"/><circle cy="7" r="6.5" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="1.6"/>`,
  mochila: `<rect x="-6.5" y="-3" width="13" height="15" rx="3.5" fill="#3f4f66" stroke="${COL.aro}" stroke-width="1.4"/><rect x="-4" y="3" width="8" height="5" rx="1.5" fill="none" stroke="${COL.aro}" stroke-width="1"/>`,
  garrafa: `<rect x="-5" y="-1" width="10" height="13" rx="2.5" fill="rgba(147,197,253,.35)" stroke="#93c5fd" stroke-width="1.4"/><path d="M-2 -1 V-4 H2 V-1" fill="none" stroke="#93c5fd" stroke-width="1.4"/>`,
  botella: `<rect x="-2.5" y="-2" width="5" height="12" rx="2" fill="rgba(147,197,253,.35)" stroke="#93c5fd" stroke-width="1.2"/>`,
  balon: `<circle r="7.5" fill="#b45309" stroke="#f59e0b" stroke-width="1.4"/><path d="M-7 0 H7 M0 -7 V7" stroke="#f59e0b" stroke-width=".8"/>`,
  rueda: `<circle r="7.5" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="2"/><circle r="2" fill="${COL.aro}"/>`,
  plataforma: `<line x1="-10" y1="-10" x2="10" y2="10" stroke="${COL.aro}" stroke-width="4" stroke-linecap="round"/>`,
  almohadilla: `<circle r="4.5" fill="${COL.disco}" stroke="${COL.aro}" stroke-width="1.4"/>`,
  rodillo: `<circle r="7" fill="#1e3a5f" stroke="${COL.aro}" stroke-width="1.6"/>`,
};

const puntoDe = (e: Esq, at: Punto): P => {
  switch (at) {
    case 'm': return lerpP(e.aN[1], e.aF[1], 0.5);
    case 'mN': return e.aN[1];
    case 'mF': return e.aF[1];
    case 'h': return e.s;
    case 'c': return e.h;
    case 'cab': return e.cab;
    case 'pN': return e.lN[1];
    case 'pF': return e.lF[1];
  }
};

const anim = (attr: string, vals: string[], dur: number, kt: string) =>
  `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" calcMode="linear" keyTimes="${kt}" values="${vals.join(';')}"/>`;

export function dibujar(pat: Patron, carga: Carga | null, animado: boolean, cuadro = 1): string {
  const { tiempos, esq } = muestrear(pat);
  const dur = pat.dur ?? 2.6 * Math.max(1, pat.k.length / 2);
  const kt = tiempos.map(t => f1(t * 1000) / 1000).concat(1).join(';');
  // Sin animacion se muestra la pose de esfuerzo (la segunda)
  const fija = esq[Math.min(esq.length - 1, (cuadro % pat.k.length) * (PASOS + 2))];
  const cerrar = (vals: string[]) => vals.concat(vals[0]);
  const foco = new Set(pat.foco || []);
  const fr = !!pat.fr;

  const seg = (get: (e: Esq) => P[], color: string, ancho: number) => {
    const d = (e: Esq) => `M${get(e).map(pt).join(' L')}`;
    const a = animado ? anim('d', cerrar(esq.map(d)), dur, kt) : '';
    return `<path d="${d(fija)}" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" fill="none">${a}</path>`;
  };
  const circ = (get: (e: Esq) => P, r: number, fill: string, extra = '') => {
    if (!animado) { const p = get(fija); return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${fill}" ${extra}/>`; }
    const p = get(fija);
    return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${fill}" ${extra}>${anim('cx', cerrar(esq.map(e => String(f1(get(e)[0])))), dur, kt)}${anim('cy', cerrar(esq.map(e => String(f1(get(e)[1])))), dur, kt)}</circle>`;
  };
  const grupo = (get: (e: Esq) => P, inner: string, dx = 0, dy = 0) => {
    const tr = (e: Esq) => { const p = get(e); return `${f1(p[0] + dx)},${f1(p[1] + dy)}`; };
    const a = animado ? `<animateTransform attributeName="transform" type="translate" dur="${dur}s" repeatCount="indefinite" calcMode="linear" keyTimes="${kt}" values="${cerrar(esq.map(tr)).join(';')}"/>` : '';
    return `<g transform="translate(${tr(fija)})">${inner}${a}</g>`;
  };

  const lejos = fr ? COL.frente : COL.lejos;
  const cF = (f: Foco, cerca: boolean) => (foco.has(f) ? (cerca || fr ? COL.foco : COL.focoLejos) : cerca ? COL.cerca : lejos);
  const miembros = (lado: 'N' | 'F') => {
    const cerca = lado === 'N';
    const a = (e: Esq) => (cerca ? e.aN : e.aF);
    const l = (e: Esq) => (cerca ? e.lN : e.lF);
    return {
      pierna: seg(e => [e.h, l(e)[0]], cF('muslo', cerca), 10.5) + seg(e => [l(e)[0], l(e)[1]], cF('pierna', cerca), 8.5) + seg(e => [l(e)[1], l(e)[2]], cerca ? COL.cerca : lejos, 5),
      brazo: seg(e => [e.s, a(e)[0]], cF('brazo', cerca), 8) + seg(e => [a(e)[0], a(e)[1]], cF('antebrazo', cerca), 6.5),
    };
  };
  const N = miembros('N'), F = miembros('F');

  let cargas = '';
  if (carga && pat.carga) {
    const c = pat.carga;
    const unica = c.at !== 'manos' || carga === 'barra' || carga === 'mochila' || carga === 'disco' || carga === 'balon' || carga === 'rueda';
    const ats: Punto[] = c.at === 'manos' ? (unica ? ['m'] : ['mF', 'mN']) : [c.at];
    cargas = ats.map(at => grupo(e => puntoDe(e, at), CARGAS[carga], c.dx ?? 0, c.dy ?? 0)).join('');
  }
  const props = (pat.props || []).map(p => grupo(e => puntoDe(e, p.at), CARGAS[p.k], p.dx ?? 0, p.dy ?? 0)).join('');
  const cables = (pat.cables || []).map(c => {
    const d = (e: Esq) => {
      const p = puntoDe(e, c.at);
      if (!c.cuerda) return `M${pt(c.desde)} L${pt(p)}`;
      const m: P = [(p[0] + c.desde[0]) / 2, (p[1] + c.desde[1]) / 2 + (100 - p[1]) * 1.8];
      return `M${pt(p)} Q${pt(m)} ${pt(c.desde)}`;
    };
    const a = animado ? anim('d', cerrar(esq.map(d)), dur, kt) : '';
    return `<path d="${d(fija)}" stroke="${c.cuerda ? '#a16207' : '#9aa9bb'}" stroke-width="${c.cuerda ? 3 : 1.3}" fill="none" stroke-linecap="round">${a}</path>`;
  }).join('');

  const torsoCol = foco.has('torso') ? COL.foco : COL.cerca;
  const extras = (foco.has('cadera') ? circ(e => e.h, 6.5, COL.foco, 'opacity=".9"') : '') + (foco.has('hombro') ? circ(e => e.s, 5.5, COL.foco, 'opacity=".9"') : '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" role="img">`
    + `<line x1="6" y1="${PISO}" x2="194" y2="${PISO}" stroke="rgba(255,255,255,.16)" stroke-width="1.5"/>`
    + (pat.est || '')
    + cables
    + F.brazo + F.pierna
    + seg(e => [e.h, e.s], torsoCol, 14) + seg(e => [e.s, e.cuello], COL.cerca, 6)
    + circ(e => e.cab, 8.5, COL.cerca)
    + extras
    + N.pierna + N.brazo
    + props + cargas
    + `</svg>`;
}

// ── Equipo fijo ──
const E = `fill="${COL.relleno}" stroke="${COL.equipo}" stroke-width="1.6"`;
export const eq = {
  banco: (x1: number, x2: number, y = 108) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="6" rx="2" ${E}/><path d="M${x1 + 6} ${y + 6} V${PISO} M${x2 - 6} ${y + 6} V${PISO}" stroke="${COL.equipo}" stroke-width="2.5"/>`,
  respaldo: (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COL.equipo}" stroke-width="7" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COL.relleno}" stroke-width="4" stroke-linecap="round"/>`,
  silla: (x: number, y = 104, w = 26, resp: 'izq' | 'der' | null = 'izq') => `<rect x="${x}" y="${y}" width="${w}" height="4" rx="1.5" ${E}/><path d="M${x + 3} ${y + 4} V${PISO} M${x + w - 3} ${y + 4} V${PISO}${resp ? ` M${resp === 'izq' ? x + 2 : x + w - 2} ${y} V${y - 26}` : ''}" stroke="${COL.equipo}" stroke-width="2.4"/>`,
  cajon: (x: number, w: number, h: number) => `<rect x="${x}" y="${PISO - h}" width="${w}" height="${h}" rx="2" ${E}/>`,
  barra: (x: number, y: number, w = 56) => `<line x1="${x - w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y}" stroke="${COL.aro}" stroke-width="3.5" stroke-linecap="round"/><path d="M${x - w / 2} ${y} V6 M${x + w / 2} ${y} V6" stroke="${COL.equipo}" stroke-width="2"/>`,
  pared: (x: number) => `<rect x="${x}" y="8" width="7" height="${PISO - 8}" ${E}/>`,
  columna: (x: number, py: number) => `<rect x="${x - 4}" y="10" width="8" height="${PISO - 10}" rx="2" ${E}/><circle cx="${x}" cy="${py}" r="4" fill="${COL.relleno}" stroke="${COL.aro}" stroke-width="1.6"/>`,
  paralelas: (x1: number, x2: number, y: number) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${COL.aro}" stroke-width="4" stroke-linecap="round"/><path d="M${x2 - 4} ${y} V${PISO} M${x1 + 4} ${y} V${PISO}" stroke="${COL.equipo}" stroke-width="2.4"/>`,
  colch: (x1: number, x2: number) => `<rect x="${x1}" y="${PISO - 2.5}" width="${x2 - x1}" height="3" rx="1.5" fill="#1d3557" opacity=".9"/>`,
  cinta: (inc = 0) => `<g transform="rotate(${-inc} 100 ${PISO})"><rect x="36" y="${PISO - 7}" width="124" height="7" rx="3" ${E}/></g><path d="M156 ${PISO - 7 - inc} L166 70 L156 64" stroke="${COL.equipo}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  bici: () => `<circle cx="138" cy="114" r="16" ${E}/><path d="M86 84 L100 114 L138 114 M100 114 L130 70 M76 82 H96 M124 66 H136" stroke="${COL.equipo}" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="104" cy="112" r="3" fill="${COL.aro}"/><path d="M70 ${PISO} H150" stroke="${COL.equipo}" stroke-width="3"/>`,
  remo: () => `<line x1="28" y1="122" x2="150" y2="122" stroke="${COL.equipo}" stroke-width="3.5"/><circle cx="160" cy="106" r="13" ${E}/><path d="M28 122 V${PISO} M150 122 V${PISO}" stroke="${COL.equipo}" stroke-width="2.4"/><line x1="128" y1="106" x2="136" y2="124" stroke="${COL.aro}" stroke-width="3"/>`,
  ancla: (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${COL.relleno}" stroke="${COL.aro}" stroke-width="1.6"/>`,
};
