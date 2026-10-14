import { Lim, Patron, Pose, Ref, eq } from './motor';

// Biblioteca de movimientos. Coordenadas en un lienzo de 200x150 con el piso en y=132;
// la figura mira a la derecha. Ver motor.ts para la convencion de angulos.

const pie = (x: number, y = 129, b?: number): Lim => ({ x, y, b });
const rel = (r: Ref, x: number, y: number, b?: number): Lim => ({ r, x, y, b });
const po = (h: [number, number], t: number, o: Partial<Pose> = {}): Pose => ({ h, t, ...o });
// Variante de una pose cambiando solo algunos campos
const con = (p: Pose, o: Partial<Pose>): Pose => ({ ...p, ...o });

// ── Poses que se reutilizan ──
const DE_PIE = po([98, 82], 180, { ln: pie(104), lf: pie(98), an: [2, 2], af: [-3, -3] });
const SENT_ABAJO = po([82, 106], 142, { ln: pie(104), lf: pie(98), an: [94, 94], af: [90, 90] });
const PLANCHA_ALTA = po([96.8, 110.6], 113.6, { ln: pie(52, 126), lf: pie(49, 126), an: { x: 130, y: 131 }, af: { x: 126, y: 131 }, fn: 20, ff: 20 });
const PLANCHA_BAJA = po([100.4, 120.3], 99, { ln: pie(52, 126), lf: pie(49, 126), an: { x: 130, y: 131 }, af: { x: 126, y: 131 }, fn: 20, ff: 20 });
const CUADRUPEDIA = po([82, 104], 103, { ln: [4, -90], lf: [0, -90], an: [0, 0], af: [-2, -2] });
const ACOSTADO = po([86, 125], 270, { ln: pie(114, 129), lf: pie(110, 129), an: [90, 90], af: [88, 88] });
const SENTADO = po([92, 104], 182, { ln: [90, 0], lf: [88, 2] });
const SENTADO_PISO = po([78, 124], 178, { ln: [90, 90], lf: [90, 90] });
const ASIENTO = (x1: number, x2: number, y = 108, resp = true) => eq.banco(x1, x2, y) + (resp ? eq.respaldo(x1 + 2, y, x1 - 4, y - 44) : '');

const piernasFrente = { ln: pie(106), lf: pie(94) };
const DE_FRENTE = po([100, 82], 180, { ...piernasFrente, an: [10, 4], af: [-10, -4] });

export const PATRONES: Record<string, Patron> = {
  // ── Piernas ──
  sentadilla: { k: [con(DE_PIE, { an: [86, 86], af: [82, 82] }), SENT_ABAJO], foco: ['muslo', 'cadera'] },
  sentadillaSilla: { k: [con(DE_PIE, { an: [86, 86], af: [82, 82] }), SENT_ABAJO], foco: ['muslo', 'cadera'], est: eq.silla(52, 106, 28) },
  sentadillaFija: { k: [con(SENT_ABAJO, { an: rel('h', 14, 14), af: rel('h', 12, 14) }), con(SENT_ABAJO, { h: [82, 107], an: rel('h', 14, 14), af: rel('h', 12, 14) })], foco: ['muslo', 'cadera'] },
  sentadillaBarra: {
    k: [con(DE_PIE, { t: 178, an: rel('h', -4, 2, 1), af: rel('h', -6, 2, 1) }), con(SENT_ABAJO, { h: [80, 106], t: 138, an: rel('h', -4, 2, 1), af: rel('h', -6, 2, 1) })],
    foco: ['muslo', 'cadera'], carga: { at: 'h', def: 'barra', dx: -2, dy: -6 },
  },
  sentadillaFrontal: {
    k: [con(DE_PIE, { an: rel('h', 9, 8), af: rel('h', 7, 8) }), con(SENT_ABAJO, { t: 152, an: rel('h', 9, 8), af: rel('h', 7, 8) })],
    foco: ['muslo', 'cadera'], carga: { at: 'm', def: 'kb', dy: 2 },
  },
  thruster: {
    k: [con(SENT_ABAJO, { t: 150, an: rel('h', 8, -2), af: rel('h', 6, -2) }), con(DE_PIE, { an: [176, 176], af: [174, 174] })],
    foco: ['muslo', 'brazo', 'hombro'], carga: { at: 'manos', def: 'barra' }, dur: 2,
  },
  wallBall: {
    k: [con(SENT_ABAJO, { t: 150, an: rel('h', 9, 0), af: rel('h', 7, 0) }), con(DE_PIE, { an: [172, 172], af: [170, 170] })],
    foco: ['muslo', 'hombro'], carga: { at: 'm', def: 'balon', dy: -6 }, est: eq.pared(176), dur: 1.8,
  },
  saltoSentadilla: {
    k: [con(SENT_ABAJO, { an: [-35, -30], af: [-30, -25] }), po([100, 66], 178, { ln: pie(104, 114), lf: pie(98, 114), an: [170, 172], af: [166, 168], fn: 50, ff: 50 })],
    foco: ['muslo', 'cadera'], dur: 1.4,
  },
  ranas: {
    k: [po([76, 110], 128, { ln: pie(96), lf: pie(90), an: [-30, -20], af: [-26, -18] }), po([112, 70], 168, { ln: pie(112, 114), lf: pie(106, 114), an: [150, 160], af: [146, 156], fn: 50, ff: 50 })],
    foco: ['muslo', 'cadera'], dur: 1.5,
  },
  isoPared: {
    k: [po([82, 104], 180, { ln: pie(108), lf: pie(104), an: [40, 10], af: [36, 8] }), po([82, 105], 180, { ln: pie(108), lf: pie(104), an: [40, 10], af: [36, 8] })],
    foco: ['muslo'], est: eq.pared(66), carga: { at: 'c', def: null, dx: 10, dy: -4 },
  },
  pistol: {
    k: [po([98, 82], 180, { ln: pie(102), lf: [18, 6], an: [80, 80], af: [76, 76] }), po([84, 110], 136, { ln: pie(102), lf: [86, 88], an: [94, 94], af: [90, 90] })],
    foco: ['muslo', 'cadera'], dur: 3,
  },
  zancada: {
    k: [po([104, 82], 180, { ln: pie(110), lf: pie(100), an: [2, 2], af: [-2, -2] }), po([96, 103], 180, { ln: pie(112), lf: { x: 64, y: 126 }, an: [2, 2], af: [-2, -2], ff: 15 })],
    foco: ['muslo', 'cadera'], carga: { at: 'manos', def: null },
  },
  zancadaSalto: {
    k: [po([96, 103], 178, { ln: pie(112), lf: { x: 64, y: 126 }, an: [-30, 20], af: [40, 90], ff: 15 }), po([100, 103], 178, { lf: pie(116), ln: { x: 68, y: 126 }, af: [-30, 20], an: [40, 90], fn: 15 })],
    foco: ['muslo', 'cadera'], dur: 1.3,
  },
  bulgara: {
    k: [po([106, 84], 178, { ln: pie(118), lf: { x: 64, y: 102 }, ff: -100, an: [2, 2], af: [-2, -2] }), po([100, 104], 166, { ln: pie(118), lf: { x: 64, y: 102 }, ff: -100, an: [2, 2], af: [-2, -2] })],
    foco: ['muslo', 'cadera'], est: eq.banco(30, 72, 106), carga: { at: 'manos', def: null },
  },
  stepUp: {
    k: [po([92, 86], 178, { ln: pie(122, 105), lf: pie(90), an: [2, 2], af: [-2, -2] }), po([116, 60], 178, { ln: pie(122, 105), lf: { x: 112, y: 98 }, an: [2, 2], af: [-2, -2] })],
    foco: ['muslo', 'cadera'], est: eq.cajon(104, 48, 24), carga: { at: 'manos', def: null },
  },
  cajon: {
    k: [po([76, 106], 140, { ln: pie(100), lf: pie(94), an: [-35, -30], af: [-30, -25] }), po([120, 82], 152, { ln: pie(140, 103), lf: pie(136, 103), an: [96, 96], af: [92, 92] })],
    foco: ['muslo', 'cadera'], est: eq.cajon(122, 40, 26), dur: 1.8,
  },
  prensa: {
    k: [po([66, 108], 225, { ln: { x: 84, y: 82 }, lf: { x: 82, y: 84 }, an: [20, 0], af: [16, 0] }), po([66, 108], 225, { ln: { x: 98, y: 74 }, lf: { x: 96, y: 76 }, an: [20, 0], af: [16, 0] })],
    foco: ['muslo', 'cadera'], props: [{ k: 'plataforma', at: 'pN', dx: 4, dy: -3 }],
    est: eq.respaldo(36, 66, 62, 112) + `<rect x="54" y="110" width="24" height="5" rx="2" fill="#15243a" stroke="#4c6a8c" stroke-width="1.6"/><path d="M60 115 V132 M74 115 V132" stroke="#4c6a8c" stroke-width="2.4"/>`,
  },
  extCuad: {
    k: [con(SENTADO, { h: [80, 104], t: 186, an: [10, 10], af: [8, 8] }), con(SENTADO, { h: [80, 104], t: 186, ln: [90, 82], lf: [88, 80], an: [10, 10], af: [8, 8] })],
    foco: ['muslo'], props: [{ k: 'almohadilla', at: 'pN', dx: 0, dy: -5 }], est: ASIENTO(64, 104),
  },
  curlFemAcostado: {
    k: [po([82, 102], 90, { ln: [-90, -90], lf: [-90, -90], an: [10, 10], af: [8, 8] }), po([82, 102], 90, { ln: [-90, 150], lf: [-90, 146], an: [10, 10], af: [8, 8] })],
    foco: ['muslo'], props: [{ k: 'almohadilla', at: 'pN', dx: 0, dy: -5 }], est: eq.banco(38, 128, 108),
  },
  curlFemSentado: {
    k: [con(SENTADO, { h: [80, 104], t: 182, ln: [90, 78], lf: [88, 76], an: [10, 10], af: [8, 8] }), con(SENTADO, { h: [80, 104], t: 182, ln: [90, -10], lf: [88, -12], an: [10, 10], af: [8, 8] })],
    foco: ['muslo'], props: [{ k: 'almohadilla', at: 'pN', dx: 0, dy: 4 }], est: ASIENTO(64, 104),
  },
  nordico: {
    k: [po([100, 102], 180, { ln: [0, -90], lf: [0, -90], an: [10, 10], af: [6, 6] }), po([115, 108], 140, { ln: [-40, -90], lf: [-40, -90], an: [110, 110], af: [106, 106] })],
    foco: ['muslo'], est: eq.colch(60, 140) + eq.ancla(76, 122), dur: 3,
  },
  pantorrilla: {
    k: [con(DE_PIE, { fn: 90, ff: 90 }), po([98, 76], 180, { ln: pie(104, 123), lf: pie(98, 123), an: [2, 2], af: [-3, -3], fn: 50, ff: 50 })],
    foco: ['pierna'], carga: { at: 'manos', def: null }, dur: 1.8,
  },
  pantorrillaEscalon: {
    k: [po([98, 66], 180, { ln: pie(104, 113), lf: pie(98, 113), an: [2, 2], af: [-3, -3], fn: 120, ff: 120 }), po([98, 58], 180, { ln: pie(104, 106), lf: pie(98, 106), an: [2, 2], af: [-3, -3], fn: 50, ff: 50 })],
    foco: ['pierna'], est: eq.cajon(100, 34, 16), dur: 1.8,
  },
  pantorrillaSentado: {
    k: [con(SENTADO, { h: [84, 100], ln: pie(108, 129), lf: pie(104, 129), an: [40, 40], af: [36, 36] }), con(SENTADO, { h: [84, 96], ln: pie(108, 123), lf: pie(104, 123), an: [40, 40], af: [36, 36], fn: 50, ff: 50 })],
    foco: ['pierna'], est: eq.banco(60, 96, 104), carga: { at: 'c', def: 'disco', dx: 22, dy: -6 },
  },
  hipThrust: {
    k: [po([86, 118], 228, { ln: pie(122), lf: pie(118), an: rel('c', 4, -6), af: rel('c', 2, -6) }), po([90, 100], 268, { ln: pie(122), lf: pie(118), an: rel('c', 4, -6), af: rel('c', 2, -6) })],
    foco: ['cadera'], est: eq.banco(18, 60, 102), carga: { at: 'c', def: 'barra', dy: -10 },
  },
  hipThrustUna: {
    k: [po([86, 118], 228, { ln: pie(122), lf: [140, 100], an: [40, 40], af: [36, 36] }), po([90, 100], 268, { ln: pie(122), lf: [100, 100], an: [40, 40], af: [36, 36] })],
    foco: ['cadera'], est: eq.banco(18, 60, 102),
  },
  puente: {
    k: [ACOSTADO, con(ACOSTADO, { h: [84, 108], t: 296 })],
    foco: ['cadera'], est: eq.colch(30, 150), carga: { at: 'c', def: null, dy: -8 },
  },
  puenteUna: {
    k: [con(ACOSTADO, { lf: [130, 110] }), con(ACOSTADO, { h: [84, 108], t: 296, lf: [110, 110] })],
    foco: ['cadera'], est: eq.colch(30, 150),
  },
  patadaCuadrupedia: {
    k: [CUADRUPEDIA, con(CUADRUPEDIA, { ln: [-98, -96] })],
    foco: ['cadera'], est: eq.colch(40, 150), carga: { at: 'pN', def: null },
  },
  fireHydrant: {
    k: [CUADRUPEDIA, con(CUADRUPEDIA, { ln: [-50, -90] })],
    foco: ['cadera'], est: eq.colch(40, 150),
  },
  birdDog: {
    k: [CUADRUPEDIA, con(CUADRUPEDIA, { an: [96, 96], lf: [-96, -96] })],
    foco: ['torso', 'cadera'], est: eq.colch(40, 150), dur: 3,
  },
  patadaPie: {
    k: [po([100, 82], 168, { ln: [6, 4], lf: pie(98), an: { x: 136, y: 76 }, af: { x: 134, y: 78 } }), po([100, 82], 160, { ln: [-42, -40], lf: pie(98), an: { x: 136, y: 76 }, af: { x: 134, y: 78 } })],
    foco: ['cadera'], est: eq.columna(160, 126), cables: [{ desde: [160, 126], at: 'pN' }],
  },
  abdLado: {
    k: [po([90, 124], 270, { ln: [90, 90], lf: [90, 90], an: [180, 250], af: [90, 90] }), po([90, 124], 270, { ln: [124, 124], lf: [90, 90], an: [180, 250], af: [90, 90] })],
    foco: ['cadera'], est: eq.colch(30, 160),
  },
  abdSentadoFrente: {
    k: [po([100, 84], 180, { ln: [12, 2], lf: [-12, -2], an: [24, 10], af: [-24, -10] }), po([100, 84], 180, { ln: [36, 6], lf: [-36, -6], an: [24, 10], af: [-24, -10] })],
    foco: ['cadera'], fr: true, est: `<rect x="80" y="88" width="40" height="6" rx="2" fill="#15243a" stroke="#4c6a8c" stroke-width="1.6"/><path d="M100 94 V132" stroke="#4c6a8c" stroke-width="3"/>`,
  },
  caminataLateral: {
    k: [po([94, 100], 180, { ln: pie(106), lf: pie(84), an: [24, 160], af: [-24, -160] }), po([106, 100], 180, { ln: pie(122), lf: pie(96), an: [24, 160], af: [-24, -160] })],
    foco: ['cadera', 'muslo'], fr: true, dur: 1.6,
  },
  jumpingJack: {
    k: [con(DE_FRENTE, {}), po([100, 78], 180, { ln: pie(124, 126), lf: pie(76, 126), an: [158, 170], af: [-158, -170] })],
    fr: true, dur: 1.1,
  },
  patinador: {
    k: [po([82, 100], 176, { ln: pie(90), lf: { x: 104, y: 120 }, an: [-30, -20], af: [-50, -40] }), po([118, 100], 184, { lf: pie(110), ln: { x: 96, y: 120 }, an: [50, 40], af: [30, 20] })],
    foco: ['muslo', 'cadera'], fr: true, dur: 1.3,
  },
  cosaca: {
    k: [po([80, 110], 180, { ln: pie(140), lf: pie(74), an: rel('h', 4, 22), af: rel('h', -4, 22) }), po([120, 110], 180, { ln: pie(126), lf: pie(60), an: rel('h', 4, 22), af: rel('h', -4, 22) })],
    foco: ['muslo', 'cadera'], fr: true, dur: 3.2,
  },

  // ── Bisagra de cadera ──
  pesoMuerto: {
    k: [po([78, 100], 122, { ln: pie(102), lf: pie(96), an: [0, 0], af: [-2, -2] }), con(DE_PIE, { t: 182, an: [0, 0], af: [-2, -2] })],
    foco: ['cadera', 'torso'], carga: { at: 'manos', def: 'barra' },
  },
  rackPull: {
    k: [po([86, 90], 140, { ln: pie(102), lf: pie(96), an: [0, 0], af: [-2, -2] }), con(DE_PIE, { t: 182, an: [0, 0], af: [-2, -2] })],
    foco: ['cadera', 'torso'], carga: { at: 'manos', def: 'barra' },
  },
  rumano: {
    k: [con(DE_PIE, { an: [0, 0], af: [-2, -2] }), po([80, 86], 100, { ln: pie(104), lf: pie(98), an: [0, 0], af: [-2, -2] })],
    foco: ['cadera', 'muslo'], carga: { at: 'manos', def: 'barra' }, dur: 3,
  },
  rumanoUna: {
    k: [po([98, 82], 180, { ln: pie(104), lf: [4, 4], an: [0, 0], af: [-2, -2] }), po([88, 86], 100, { ln: pie(104), lf: [-80, -80], an: [0, 0], af: [-2, -2] })],
    foco: ['cadera', 'muslo'], carga: { at: 'manos', def: null }, dur: 3,
  },
  buenosDias: {
    k: [con(DE_PIE, { an: rel('cab', -4, 2), af: rel('cab', -6, 2) }), po([82, 86], 104, { ln: pie(104), lf: pie(98), an: rel('cab', -4, 2), af: rel('cab', -6, 2) })],
    foco: ['cadera', 'torso'], dur: 3,
  },
  jefferson: {
    k: [po([98, 66], 180, { ln: pie(104, 105), lf: pie(98, 105), an: [0, 0], af: [-2, -2] }), po([94, 68], 18, { hd: 10, ln: pie(104, 105), lf: pie(98, 105), an: [0, 0], af: [-2, -2] })],
    foco: ['torso'], est: eq.cajon(84, 40, 24), carga: { at: 'manos', def: 'disco' }, dur: 4,
  },
  kbSwing: {
    k: [po([80, 90], 112, { ln: pie(100), lf: pie(94), an: [-18, -18], af: [-14, -14] }), po([96, 82], 184, { ln: pie(100), lf: pie(94), an: [92, 92], af: [90, 90] })],
    foco: ['cadera'], carga: { at: 'm', def: 'kb' }, dur: 1.4,
  },
  pullThrough: {
    k: [po([82, 88], 108, { ln: pie(102), lf: pie(96), an: [-14, -14], af: [-12, -12] }), po([96, 82], 182, { ln: pie(102), lf: pie(96), an: [6, 6], af: [4, 4] })],
    foco: ['cadera'], est: eq.columna(24, 124), cables: [{ desde: [24, 124], at: 'm' }],
  },
  hiper: {
    k: [po([92, 98], 22, { ar: true, ln: pie(60, 128), lf: pie(58, 128), an: [30, 150], af: [26, 146], fn: 10, ff: 10 }), po([92, 98], 134, { ar: true, ln: pie(60, 128), lf: pie(58, 128), an: [30, 150], af: [26, 146], fn: 10, ff: 10 })],
    foco: ['torso', 'cadera'], est: eq.respaldo(56, 128, 96, 100) + `<path d="M96 104 L108 132" stroke="#4c6a8c" stroke-width="3"/>`, carga: { at: 'm', def: null },
  },

  // ── Espalda ──
  dominada: {
    k: [po([100, 92], 180, { an: { x: 108, y: 24 }, af: { x: 104, y: 24 }, ln: [0, -18], lf: [-4, -34] }), po([100, 62], 180, { an: { x: 108, y: 24 }, af: { x: 104, y: 24 }, ln: [6, -18], lf: [0, -34] })],
    foco: ['torso', 'brazo'], est: eq.barra(106, 22), carga: { at: 'c', def: null, dy: 14 }, dur: 2.8,
  },
  colgado: {
    k: [po([100, 92], 180, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [0, -10], lf: [-4, -18] }), po([100, 89], 180, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [2, -10], lf: [-2, -18] })],
    foco: ['antebrazo', 'torso'], est: eq.barra(104, 22), dur: 3,
  },
  elevPiernasColgado: {
    k: [po([100, 92], 180, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [0, 0], lf: [-2, -2] }), po([100, 90], 176, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [96, 96], lf: [92, 92] })],
    foco: ['torso'], est: eq.barra(104, 22), carga: { at: 'pN', def: null }, dur: 2.6,
  },
  toesToBar: {
    k: [po([100, 92], 180, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [0, 0], lf: [-2, -2] }), po([100, 90], 176, { an: { x: 104, y: 24 }, af: { x: 102, y: 24 }, ln: [150, 150], lf: [146, 146] })],
    foco: ['torso'], est: eq.barra(104, 22), dur: 2.4,
  },
  rodillasParalelas: {
    k: [po([100, 96], 180, { an: [0, 90], af: [-2, 88], ln: [0, 0], lf: [-2, -2] }), po([100, 96], 178, { an: [0, 90], af: [-2, 88], ln: [96, 0], lf: [92, -2] })],
    foco: ['torso'], est: eq.respaldo(88, 30, 88, 126) + eq.paralelas(94, 126, 80),
  },
  lsit: {
    k: [po([100, 100], 180, { ln: [90, 90], lf: [90, 90], an: { x: 100, y: 102 }, af: { x: 98, y: 102 } }), po([100, 99], 180, { ln: [92, 92], lf: [92, 92], an: { x: 100, y: 102 }, af: { x: 98, y: 102 } })],
    foco: ['torso', 'muslo'], est: eq.silla(86, 104, 26, null),
  },
  jalon: {
    k: [po([96, 104], 178, { ...SENTADO, h: [96, 104], t: 178, an: { x: 108, y: 30 }, af: { x: 104, y: 30 } }), po([96, 104], 192, { ...SENTADO, h: [96, 104], t: 192, an: { x: 106, y: 74 }, af: { x: 104, y: 74 } })],
    foco: ['torso', 'brazo'], est: eq.banco(80, 116, 108) + eq.ancla(106, 8), cables: [{ desde: [106, 8], at: 'm' }],
  },
  remoPolea: {
    k: [po([62, 110], 150, { ln: pie(120, 118), lf: pie(118, 118), an: { x: 134, y: 102 }, af: { x: 132, y: 102 }, fn: 160, ff: 160 }), po([62, 110], 194, { ln: pie(120, 118), lf: pie(118, 118), an: { x: 86, y: 98 }, af: { x: 84, y: 98 }, fn: 160, ff: 160 })],
    foco: ['torso', 'brazo'], est: eq.banco(36, 78, 114) + eq.columna(168, 102) + `<rect x="124" y="112" width="6" height="20" fill="#15243a" stroke="#4c6a8c" stroke-width="1.6"/>`,
    cables: [{ desde: [168, 102], at: 'm' }],
  },
  remoErg: {
    k: [po([98, 114], 148, { ln: pie(128, 114), lf: pie(126, 114), an: { x: 136, y: 102 }, af: { x: 134, y: 102 }, fn: 160, ff: 160 }), po([82, 114], 202, { ln: pie(128, 114), lf: pie(126, 114), an: { x: 86, y: 96 }, af: { x: 84, y: 96 }, fn: 160, ff: 160 })],
    foco: ['muslo', 'torso'], est: eq.remo(), cables: [{ desde: [150, 106], at: 'm' }], dur: 2,
  },
  remoInclinado: {
    k: [po([86, 84], 114, { ln: pie(104), lf: pie(98), an: [0, 0], af: [-2, -2] }), po([86, 84], 114, { ln: pie(104), lf: pie(98), an: rel('h', -10, 16), af: rel('h', -12, 16) })],
    foco: ['torso', 'brazo'], carga: { at: 'manos', def: 'barra' }, dur: 2.2,
  },
  remoUnaMano: {
    k: [po([82, 84], 104, { ln: pie(100), lf: pie(90), an: [0, 0], af: { x: 130, y: 106 } }), po([82, 84], 104, { ln: pie(100), lf: pie(90), an: rel('h', -12, 14), af: { x: 130, y: 106 } })],
    foco: ['torso', 'brazo'], est: eq.banco(118, 170, 106), carga: { at: 'mN', def: 'mancuerna' }, dur: 2.2,
  },
  remoInvertido: {
    k: [po([86.6, 122.6], 97.8, { ln: pie(40, 127), lf: pie(38, 127), an: { x: 120, y: 85 }, af: { x: 118, y: 85 }, fn: 170, ff: 170 }), po([82, 108], 116.6, { ln: pie(40, 127), lf: pie(38, 127), an: { x: 120, y: 85 }, af: { x: 118, y: 85 }, fn: 170, ff: 170 })],
    foco: ['torso', 'brazo'], est: eq.barra(122, 84, 36),
  },
  remoMesa: {
    k: [po([86.6, 122.6], 97.8, { ln: pie(40, 127), lf: pie(38, 127), an: { x: 120, y: 87 }, af: { x: 118, y: 87 }, fn: 170, ff: 170 }), po([82, 108], 116.6, { ln: pie(40, 127), lf: pie(38, 127), an: { x: 120, y: 87 }, af: { x: 118, y: 87 }, fn: 170, ff: 170 })],
    foco: ['torso', 'brazo'], est: `<rect x="104" y="80" width="70" height="6" rx="2" fill="#15243a" stroke="#4c6a8c" stroke-width="1.6"/><path d="M168 86 V132" stroke="#4c6a8c" stroke-width="3"/>`,
  },
  remoPuerta: {
    k: [po([98, 84], 196, { ln: pie(110), lf: pie(106), an: { x: 126, y: 62 }, af: { x: 124, y: 64 } }), po([104, 82], 186, { ln: pie(110), lf: pie(106), an: { x: 126, y: 62 }, af: { x: 124, y: 64 } })],
    foco: ['torso', 'brazo'], est: eq.pared(130),
  },
  facePull: {
    k: [po([96, 82], 186, { ln: pie(106), lf: pie(84), an: { x: 136, y: 52 }, af: { x: 134, y: 52 } }), po([96, 82], 188, { ln: pie(106), lf: pie(84), an: { x: 114, y: 42, b: 1 }, af: { x: 112, y: 42, b: 1 } })],
    foco: ['hombro', 'torso'], est: eq.columna(170, 48), cables: [{ desde: [170, 48], at: 'm' }],
  },
  pajaros: {
    k: [po([86, 86], 106, { ln: pie(104), lf: pie(98), an: [6, 6], af: [2, 2] }), po([86, 86], 106, { ln: pie(104), lf: pie(98), an: [-62, -58], af: [-58, -54] })],
    foco: ['hombro', 'torso'], carga: { at: 'manos', def: 'mancuerna' },
  },
  aperturaFrente: {
    k: [con(DE_FRENTE, { an: [92, 100], af: [-92, -100] }), con(DE_FRENTE, { an: [26, -4], af: [-26, 4] })],
    foco: ['torso'], fr: true, carga: { at: 'manos', def: null },
  },
  pulloverPolea: {
    k: [po([94, 84], 156, { ln: pie(102), lf: pie(96), an: [142, 142], af: [138, 138] }), po([94, 84], 160, { ln: pie(102), lf: pie(96), an: [8, 8], af: [4, 4] })],
    foco: ['torso'], est: eq.columna(164, 22), cables: [{ desde: [164, 22], at: 'm' }],
  },
  pulloverPiso: {
    k: [con(ACOSTADO, { an: [270, 270], af: [268, 268] }), con(ACOSTADO, { an: [180, 180], af: [178, 178] })],
    foco: ['torso'], est: eq.colch(20, 150), carga: { at: 'm', def: 'mochila' },
  },
  encogimientos: {
    k: [con(DE_PIE, { an: [0, 0], af: [-2, -2], hd: 0 }), con(DE_PIE, { an: [0, 0], af: [-2, -2], tl: 1.1, hd: 0 })],
    foco: ['hombro'], carga: { at: 'manos', def: 'mancuerna' }, dur: 1.8,
  },
  superman: {
    k: [po([84, 126], 90, { ln: [-90, -90], lf: [-90, -90], an: [90, 90], af: [90, 90] }), po([84, 126], 100, { ln: [-102, -102], lf: [-100, -100], an: [104, 104], af: [102, 102] })],
    foco: ['torso', 'cadera'], est: eq.colch(20, 170), carga: { at: 'h', def: null, dx: -14, dy: -6 }, dur: 2.6,
  },
  angeles: {
    k: [po([84, 126], 90, { ln: [-90, -90], lf: [-90, -90], an: [-90, -90], af: [-90, -90] }), po([84, 126], 94, { ln: [-90, -90], lf: [-90, -90], an: [-262, -262], af: [-262, -262] })],
    foco: ['hombro', 'torso'], est: eq.colch(20, 170), dur: 3,
  },

  // ── Pecho ──
  banca: {
    k: [po([100, 102], 270, { ln: pie(126), lf: pie(122), an: [180, 180], af: [178, 178] }), po([100, 102], 270, { ln: pie(126), lf: pie(122), an: { x: 70, y: 96 }, af: { x: 68, y: 96 } })],
    foco: ['torso', 'brazo'], est: eq.banco(44, 116, 108), carga: { at: 'manos', def: 'barra' },
  },
  inclinado: {
    k: [po([90, 106], 224, { ln: pie(126), lf: pie(122), an: [178, 178], af: [176, 176] }), po([90, 106], 224, { ln: pie(126), lf: pie(122), an: { x: 70, y: 80 }, af: { x: 68, y: 80 } })],
    foco: ['torso', 'brazo'], est: eq.respaldo(56, 66, 84, 112) + eq.banco(80, 112, 110), carga: { at: 'manos', def: 'barra' },
  },
  pressPechoMaquina: {
    k: [con(SENTADO, { h: [84, 104], an: rel('h', 8, 6), af: rel('h', 6, 6) }), con(SENTADO, { h: [84, 104], an: [92, 92], af: [90, 90] })],
    foco: ['torso', 'brazo'], est: ASIENTO(66, 100),
  },
  aperturasPiso: {
    k: [po([92, 125], 270, { ln: pie(118), lf: pie(114), an: [180, 180], af: [178, 178] }), po([92, 125], 270, { ln: pie(118), lf: pie(114), an: [240, 210], af: [236, 206] })],
    foco: ['torso'], est: eq.colch(20, 150), carga: { at: 'manos', def: 'mancuerna' },
  },
  lagartija: { k: [PLANCHA_ALTA, PLANCHA_BAJA], foco: ['torso', 'brazo'], carga: { at: 'h', def: null, dx: -14, dy: -8 }, dur: 2.2 },
  lagartijaIso: { k: [PLANCHA_BAJA, con(PLANCHA_BAJA, { h: [100.4, 119.5] })], foco: ['torso', 'brazo'], dur: 2.5 },
  lagartijaPlio: { k: [PLANCHA_BAJA, con(PLANCHA_ALTA, { h: [96.8, 104], an: { x: 130, y: 122 }, af: { x: 126, y: 122 } })], foco: ['torso', 'brazo'], dur: 1.3 },
  lagartijaRodillas: {
    k: [po([96, 110], 112, { ln: [-52, -150], lf: [-50, -150], an: { x: 128, y: 131 }, af: { x: 124, y: 131 } }), po([100, 121], 100, { ln: [-75, -150], lf: [-73, -150], an: { x: 128, y: 131 }, af: { x: 124, y: 131 } })],
    foco: ['torso', 'brazo'], est: eq.colch(50, 150), dur: 2.2,
  },
  lagartijaInclinada: {
    k: [po([95.7, 98.5], 130.5, { ln: pie(60, 126), lf: pie(57, 126), an: { x: 130, y: 103 }, af: { x: 126, y: 103 }, fn: 20, ff: 20 }), po([102.5, 108.9], 115.3, { ln: pie(60, 126), lf: pie(57, 126), an: { x: 130, y: 103 }, af: { x: 126, y: 103 }, fn: 20, ff: 20 })],
    foco: ['torso', 'brazo'], est: eq.silla(122, 104, 30, 'der'), dur: 2.2,
  },
  lagartijaDeclinada: {
    k: [po([93, 99.1], 93.5, { ln: pie(46, 100), lf: pie(43, 100), an: { x: 130, y: 131 }, af: { x: 126, y: 131 }, fn: 20, ff: 20 }), po([92.6, 108.1], 82.5, { ln: pie(46, 100), lf: pie(43, 100), an: { x: 130, y: 131 }, af: { x: 126, y: 131 }, fn: 20, ff: 20 })],
    foco: ['torso', 'brazo'], est: eq.silla(26, 104, 30, 'izq'), dur: 2.2,
  },
  pica: {
    k: [po([96, 86], 62, { ln: pie(72, 127), lf: pie(69, 127), an: { x: 128, y: 131 }, af: { x: 124, y: 131 }, fn: 20, ff: 20 }), po([98, 94], 52, { ln: pie(72, 127), lf: pie(69, 127), an: { x: 128, y: 131 }, af: { x: 124, y: 131 }, fn: 20, ff: 20 })],
    foco: ['hombro', 'brazo'], dur: 2.4,
  },
  picaElevada: {
    k: [po([96, 74], 40, { ln: pie(66, 101), lf: pie(63, 101), an: { x: 116, y: 131 }, af: { x: 112, y: 131 }, fn: 20, ff: 20 }), po([98, 82], 30, { ln: pie(66, 101), lf: pie(63, 101), an: { x: 116, y: 131 }, af: { x: 112, y: 131 }, fn: 20, ff: 20 })],
    foco: ['hombro', 'brazo'], est: eq.silla(44, 104, 30, 'izq'), dur: 2.4,
  },
  paradaManos: {
    k: [po([100, 63], 0, { ln: [180, 180], lf: [178, 178], an: { x: 104, y: 131 }, af: { x: 100, y: 131 } }), po([100, 78], 0, { ln: [180, 180], lf: [178, 178], an: { x: 104, y: 131 }, af: { x: 100, y: 131 } })],
    foco: ['hombro', 'brazo'], est: eq.pared(80), dur: 3,
  },
  fondos: {
    k: [po([103, 74], 178, { an: { x: 110, y: 76 }, af: { x: 108, y: 76 }, ln: [0, -70], lf: [6, -80] }), po([96, 92], 160, { an: { x: 110, y: 76 }, af: { x: 108, y: 76 }, ln: [0, -70], lf: [6, -80] })],
    foco: ['brazo', 'torso'], est: eq.paralelas(98, 130, 78), carga: { at: 'c', def: null, dy: 14 }, dur: 2.4,
  },
  fondosSilla: {
    k: [po([90, 106], 183, { ln: pie(128), lf: pie(124), an: { x: 82, y: 104 }, af: { x: 80, y: 104 } }), po([92, 122], 182, { ln: pie(128), lf: pie(124), an: { x: 82, y: 104 }, af: { x: 80, y: 104 } })],
    foco: ['brazo'], est: eq.silla(56, 104, 28, 'izq'), carga: { at: 'c', def: null, dx: 10, dy: -6 }, dur: 2.2,
  },
  fondosSillaPies: {
    k: [po([90, 106], 183, { ln: pie(136, 102), lf: pie(132, 102), an: { x: 82, y: 104 }, af: { x: 80, y: 104 } }), po([92, 120], 182, { ln: pie(136, 102), lf: pie(132, 102), an: { x: 82, y: 104 }, af: { x: 80, y: 104 } })],
    foco: ['brazo'], est: eq.silla(56, 104, 28, 'izq') + eq.silla(128, 104, 28, 'der'), dur: 2.2,
  },
  palmas: {
    k: [con(DE_FRENTE, { an: { x: 100, y: 70, b: 1 }, af: { x: 100, y: 70, b: -1 } }), con(DE_FRENTE, { an: { x: 100, y: 71, b: 1 }, af: { x: 100, y: 71, b: -1 } })],
    foco: ['torso'], fr: true,
  },

  // ── Hombros ──
  pressMilitar: {
    k: [con(DE_PIE, { an: rel('h', 8, -1), af: rel('h', 6, -1) }), con(DE_PIE, { an: [178, 178], af: [176, 176] })],
    foco: ['hombro', 'brazo'], carga: { at: 'manos', def: 'barra' },
  },
  pressSentado: {
    k: [con(SENTADO, { h: [92, 104], an: rel('h', 8, -1), af: rel('h', 6, -1) }), con(SENTADO, { h: [92, 104], an: [178, 178], af: [176, 176] })],
    foco: ['hombro', 'brazo'], est: ASIENTO(76, 108), carga: { at: 'manos', def: 'mancuerna' },
  },
  pressPiso: {
    k: [con(SENTADO_PISO, { an: rel('h', 8, -1), af: rel('h', 6, -1) }), con(SENTADO_PISO, { an: [178, 178], af: [176, 176] })],
    foco: ['hombro', 'brazo'], est: eq.colch(60, 140), carga: { at: 'manos', def: 'mochila' },
  },
  lateral: {
    k: [con(DE_FRENTE, { an: [10, 6], af: [-10, -6] }), con(DE_FRENTE, { an: [88, 92], af: [-88, -92] })],
    foco: ['hombro'], fr: true, carga: { at: 'manos', def: 'mancuerna' },
  },
  lateralIso: {
    k: [con(DE_FRENTE, { an: [84, 88], af: [-84, -88] }), con(DE_FRENTE, { an: [88, 92], af: [-88, -92] })],
    foco: ['hombro'], fr: true, carga: { at: 'manos', def: 'mochila' },
  },
  frontal: {
    k: [con(DE_PIE, { an: [6, 6], af: [2, 2] }), con(DE_PIE, { an: [94, 94], af: [90, 90] })],
    foco: ['hombro'], carga: { at: 'manos', def: 'mancuerna' },
  },
  frontalPolea: {
    k: [con(DE_PIE, { an: [6, 6], af: [2, 2] }), con(DE_PIE, { an: [94, 94], af: [90, 90] })],
    foco: ['hombro'], est: eq.columna(30, 126), cables: [{ desde: [30, 126], at: 'm' }],
  },
  remoMenton: {
    k: [con(DE_PIE, { an: [4, 4], af: [0, 0] }), con(DE_PIE, { an: rel('h', 6, 4, 1), af: rel('h', 4, 4, 1) })],
    foco: ['hombro'], carga: { at: 'manos', def: 'barra' },
  },

  // ── Brazos ──
  curl: {
    k: [con(DE_PIE, { an: [2, 2], af: [-2, -2] }), con(DE_PIE, { an: [2, 150], af: [-2, 146] })],
    foco: ['brazo'], carga: { at: 'manos', def: 'mancuerna' },
  },
  curlAntebrazo: {
    k: [con(DE_PIE, { an: [2, 2], af: [-2, -2] }), con(DE_PIE, { an: [2, 150], af: [-2, 146] })],
    foco: ['antebrazo', 'brazo'], carga: { at: 'manos', def: 'barra' },
  },
  curlIso: {
    k: [con(DE_PIE, { an: [2, 88], af: [-2, 86] }), con(DE_PIE, { an: [2, 92], af: [-2, 90] })],
    foco: ['brazo'], dur: 2,
  },
  curlPolea: {
    k: [con(DE_PIE, { an: [4, 8], af: [0, 4] }), con(DE_PIE, { an: [4, 150], af: [0, 146] })],
    foco: ['brazo'], est: eq.columna(160, 126), cables: [{ desde: [160, 126], at: 'm' }],
  },
  curlBayesiano: {
    k: [po([104, 82], 176, { ln: pie(116), lf: pie(94), an: [-30, -30], af: [-32, -32] }), po([104, 82], 176, { ln: pie(116), lf: pie(94), an: [-30, 110], af: [-32, 108] })],
    foco: ['brazo'], est: eq.columna(34, 70), cables: [{ desde: [34, 70], at: 'mN' }],
  },
  curlPredicador: {
    k: [con(SENTADO, { h: [86, 104], t: 168, an: [46, 50], af: [44, 48] }), con(SENTADO, { h: [86, 104], t: 168, an: [46, 162], af: [44, 160] })],
    foco: ['brazo'], est: eq.banco(70, 102, 108) + eq.respaldo(108, 98, 124, 76), carga: { at: 'manos', def: 'barra' },
  },
  curlInclinado: {
    k: [po([92, 106], 218, { ln: pie(126), lf: pie(122), an: [0, 0], af: [-2, -2] }), po([92, 106], 218, { ln: pie(126), lf: pie(122), an: [0, 140], af: [-2, 136] })],
    foco: ['brazo'], est: eq.respaldo(58, 70, 84, 112) + eq.banco(82, 112, 110), carga: { at: 'manos', def: 'mancuerna' },
  },
  curlConcentrado: {
    k: [con(SENTADO, { h: [84, 104], t: 140, an: [16, 16], af: [12, 12] }), con(SENTADO, { h: [84, 104], t: 140, an: [16, 152], af: [12, 148] })],
    foco: ['brazo'], est: eq.banco(66, 100, 108), carga: { at: 'manos', def: 'mancuerna' },
  },
  curlArana: {
    k: [po([84, 94], 132, { ln: pie(70), lf: pie(66), an: [0, 0], af: [-2, -2] }), po([84, 94], 132, { ln: pie(70), lf: pie(66), an: [0, 145], af: [-2, 141] })],
    foco: ['brazo'], est: eq.respaldo(84, 106, 118, 76) + `<path d="M100 92 L100 132" stroke="#4c6a8c" stroke-width="3"/>`, carga: { at: 'manos', def: 'barra' },
  },
  tricepsCabeza: {
    k: [con(DE_PIE, { an: [174, -12], af: [170, -16] }), con(DE_PIE, { an: [174, 174], af: [170, 170] })],
    foco: ['brazo'], carga: { at: 'm', def: 'mancuerna' },
  },
  tricepsCabezaPolea: {
    k: [po([96, 84], 150, { ln: pie(110), lf: pie(84), an: [162, -24], af: [158, -28] }), po([96, 84], 150, { ln: pie(110), lf: pie(84), an: [162, 160], af: [158, 156] })],
    foco: ['brazo'], est: eq.columna(30, 100), cables: [{ desde: [30, 100], at: 'm' }],
  },
  frances: {
    k: [po([100, 102], 270, { ln: pie(126), lf: pie(122), an: [196, 196], af: [194, 194] }), po([100, 102], 270, { ln: pie(126), lf: pie(122), an: [196, 290], af: [194, 288] })],
    foco: ['brazo'], est: eq.banco(44, 116, 108), carga: { at: 'manos', def: 'barra' },
  },
  francesPiso: {
    k: [po([92, 125], 270, { ln: pie(118), lf: pie(114), an: [194, 194], af: [192, 192] }), po([92, 125], 270, { ln: pie(118), lf: pie(114), an: [194, 280], af: [192, 278] })],
    foco: ['brazo'], est: eq.colch(20, 150), carga: { at: 'manos', def: 'mochila' },
  },
  esfinge: {
    k: [po([90.4, 117.3], 100.6, { ln: pie(44, 126), lf: pie(41, 126), an: { x: 140, y: 128, b: 1 }, af: { x: 136, y: 128, b: 1 }, fn: 20, ff: 20 }), po([88.5, 110.8], 108.9, { ln: pie(44, 126), lf: pie(41, 126), an: { x: 140, y: 128 }, af: { x: 136, y: 128 }, fn: 20, ff: 20 })],
    foco: ['brazo'], est: eq.colch(30, 160), dur: 2.4,
  },
  jalonTriceps: {
    k: [po([96, 82], 172, { ln: pie(104), lf: pie(98), an: [4, 120], af: [2, 118] }), po([96, 82], 172, { ln: pie(104), lf: pie(98), an: [4, 4], af: [2, 2] })],
    foco: ['brazo'], est: eq.columna(146, 18), cables: [{ desde: [146, 18], at: 'm' }],
  },

  // ── Core ──
  plancha: {
    k: [po([95, 117], 105.4, { an: [0, 90], af: [-2, 92], ln: pie(52, 126), lf: pie(49, 126), fn: 20, ff: 20 }), po([95, 116], 105.8, { an: [0, 90], af: [-2, 92], ln: pie(52, 126), lf: pie(49, 126), fn: 20, ff: 20 })],
    foco: ['torso'], est: eq.colch(40, 160), carga: { at: 'c', def: null, dx: 16, dy: -10 }, dur: 3,
  },
  planchaLateral: {
    k: [po([94, 114], 106.8, { an: [176, 178], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) }), po([94, 113], 107, { an: [176, 178], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) })],
    foco: ['torso'], est: eq.colch(40, 160), carga: { at: 'mN', def: null }, dur: 3,
  },
  planchaLateralCadera: {
    k: [po([94, 114], 106.8, { an: [176, 178], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) }), po([96, 121], 101, { an: [176, 178], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) })],
    foco: ['torso'], est: eq.colch(40, 160), dur: 2.2,
  },
  planchaRotacion: {
    k: [po([94, 114], 106.8, { an: [176, 178], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) }), po([96, 116], 104, { an: [30, 60], af: [0, 70], ln: pie(52, 127), lf: pie(49, 128) })],
    foco: ['torso'], est: eq.colch(40, 160), dur: 2.4,
  },
  copenhague: {
    k: [po([96, 108], 104, { an: [176, 178], af: [0, 70], ln: pie(48, 103), lf: [-100, -40] }), po([96, 106], 104, { an: [176, 178], af: [0, 70], ln: pie(48, 103), lf: [-96, -40] })],
    foco: ['muslo', 'torso'], est: eq.banco(22, 64, 106), dur: 3,
  },
  planchaToque: {
    k: [PLANCHA_ALTA, con(PLANCHA_ALTA, { an: rel('h', -2, 6, 1) })],
    foco: ['torso', 'hombro'], dur: 1.6,
  },
  planchaJack: {
    k: [PLANCHA_ALTA, con(PLANCHA_ALTA, { ln: pie(60, 124), lf: pie(42, 124) })],
    foco: ['torso'], dur: 1,
  },
  escaladores: {
    k: [con(PLANCHA_ALTA, { ln: { x: 102, y: 122 } }), con(PLANCHA_ALTA, { lf: { x: 100, y: 122 } })],
    foco: ['torso', 'muslo'], dur: 0.9,
  },
  escaladoresLentos: {
    k: [con(PLANCHA_ALTA, { ln: { x: 102, y: 122 } }), con(PLANCHA_ALTA, { lf: { x: 100, y: 122 } })],
    foco: ['torso', 'muslo'], dur: 2.4,
  },
  osoCaminata: {
    k: [po([84, 98], 98, { an: { x: 126, y: 131 }, af: { x: 112, y: 131 }, ln: pie(66, 128), lf: pie(80, 128), fn: 20, ff: 20 }), po([88, 98], 98, { an: { x: 114, y: 131 }, af: { x: 128, y: 131 }, ln: pie(82, 128), lf: pie(68, 128), fn: 20, ff: 20 })],
    foco: ['torso', 'hombro'], dur: 1.2,
  },
  crunch: {
    k: [con(ACOSTADO, { an: rel('cab', -2, 2), af: rel('cab', -4, 2) }), con(ACOSTADO, { t: 236, an: rel('cab', -2, 2), af: rel('cab', -4, 2) })],
    foco: ['torso'], est: eq.colch(20, 150), dur: 2,
  },
  crunchMaquina: {
    k: [con(SENTADO, { h: [90, 104], an: rel('h', 8, -2), af: rel('h', 6, -2) }), con(SENTADO, { h: [90, 104], t: 136, an: rel('h', 8, -2), af: rel('h', 6, -2) })],
    foco: ['torso'], est: ASIENTO(74, 106),
  },
  crunchPolea: {
    k: [po([96, 102], 166, { ln: [0, -90], lf: [-2, -90], an: rel('cab', 4, -6), af: rel('cab', 2, -6) }), po([92, 104], 84, { ln: [-8, -90], lf: [-10, -90], an: rel('cab', 4, -6), af: rel('cab', 2, -6) })],
    foco: ['torso'], est: eq.colch(50, 150) + eq.ancla(118, 8), cables: [{ desde: [118, 8], at: 'm' }],
  },
  elevPiernas: {
    k: [po([96, 126], 270, { ln: [90, 90], lf: [90, 90], an: [90, 90], af: [88, 88] }), po([96, 126], 270, { ln: [178, 178], lf: [176, 176], an: [90, 90], af: [88, 88] })],
    foco: ['torso'], est: eq.colch(30, 160),
  },
  elevRodillas: {
    k: [po([96, 126], 270, { ln: [92, 90], lf: [90, 88], an: [90, 90], af: [88, 88] }), po([96, 126], 270, { ln: [156, 66], lf: [154, 64], an: [90, 90], af: [88, 88] })],
    foco: ['torso'], est: eq.colch(30, 160),
  },
  dragonFlag: {
    k: [po([94, 102], 270, { ln: [90, 90], lf: [90, 90], an: { x: 44, y: 106 }, af: { x: 42, y: 106 } }), po([71.6, 70], 340, { ln: [160, 160], lf: [160, 160], an: { x: 44, y: 106 }, af: { x: 42, y: 106 } })],
    foco: ['torso'], est: eq.banco(40, 124, 108), dur: 3.4,
  },
  vups: {
    k: [po([92, 125], 270, { ln: [90, 90], lf: [90, 90], an: [270, 270], af: [268, 268] }), po([92, 122], 226, { ln: [138, 138], lf: [136, 136], an: [130, 130], af: [128, 128] })],
    foco: ['torso'], est: eq.colch(20, 170), dur: 1.8,
  },
  hollow: {
    k: [po([92, 124], 256, { ln: [102, 102], lf: [102, 102], an: [256, 256], af: [254, 254] }), po([92, 124], 260, { ln: [98, 98], lf: [98, 98], an: [260, 260], af: [258, 258] })],
    foco: ['torso'], est: eq.colch(20, 170), dur: 1.6,
  },
  deadBug: {
    k: [po([92, 126], 270, { ln: [180, 90], lf: [178, 88], an: [180, 180], af: [178, 178] }), po([92, 126], 270, { ln: [180, 90], lf: [100, 100], an: [262, 262], af: [178, 178] })],
    foco: ['torso'], est: eq.colch(20, 170), dur: 2.4,
  },
  bicicletaAbs: {
    k: [po([92, 125], 250, { ln: [152, 62], lf: [100, 100], an: rel('cab', 2, 2), af: rel('cab', 0, 2) }), po([92, 125], 250, { ln: [100, 100], lf: [152, 62], an: rel('cab', 2, 2), af: rel('cab', 0, 2) })],
    foco: ['torso'], est: eq.colch(20, 170), dur: 1.4,
  },
  girosRusos: {
    k: [po([100, 116], 180, { ln: [60, -20], lf: [-60, 20], an: { x: 76, y: 104 }, af: { x: 78, y: 104 } }), po([100, 116], 180, { ln: [60, -20], lf: [-60, 20], an: { x: 124, y: 104 }, af: { x: 122, y: 104 } })],
    foco: ['torso'], fr: true, carga: { at: 'm', def: 'disco' }, dur: 1.6,
  },
  rueda: {
    k: [po([92, 102], 148, { ln: [0, -90], lf: [-2, -90], an: { x: 118, y: 124 }, af: { x: 116, y: 124 } }), po([104, 114], 100, { ln: [-45, -90], lf: [-47, -90], an: { x: 160, y: 124 }, af: { x: 158, y: 124 } })],
    foco: ['torso'], est: eq.colch(60, 180), carga: { at: 'm', def: 'rueda' }, dur: 3,
  },
  ruedaPie: {
    k: [po([80, 82], 40, { ln: pie(90), lf: pie(86), an: { x: 110, y: 124 }, af: { x: 108, y: 124 } }), po([96, 104], 98, { ln: pie(70), lf: pie(66), an: { x: 168, y: 124 }, af: { x: 166, y: 124 } })],
    foco: ['torso'], carga: { at: 'm', def: 'rueda' }, dur: 3.2,
  },
  pallof: {
    k: [con(DE_PIE, { an: rel('h', 8, 12), af: rel('h', 6, 12) }), con(DE_PIE, { an: [92, 92], af: [90, 90] })],
    foco: ['torso'], est: eq.columna(28, 64), cables: [{ desde: [28, 64], at: 'm' }],
  },
  lenador: {
    k: [po([100, 82], 180, { ...piernasFrente, an: { x: 70, y: 32 }, af: { x: 72, y: 32 } }), po([100, 84], 180, { ...piernasFrente, an: { x: 130, y: 112 }, af: { x: 128, y: 112 } })],
    foco: ['torso'], fr: true, est: eq.columna(28, 22), cables: [{ desde: [28, 22], at: 'm' }], dur: 2,
  },

  // ── Cardio y cuerpo completo ──
  burpee: {
    k: [
      po([98, 82], 180, { ln: pie(104), lf: pie(98), an: rel('h', 2, 34), af: rel('h', -2, 34) }),
      po([84, 108], 118, { ln: pie(104), lf: pie(98), an: { x: 118, y: 130 }, af: { x: 114, y: 130 } }),
      po([82.8, 110.6], 113.6, { ln: pie(38, 126), lf: pie(35, 126), an: { x: 118, y: 131 }, af: { x: 114, y: 131 }, fn: 20, ff: 20 }),
      po([84, 108], 118, { ln: pie(104), lf: pie(98), an: { x: 118, y: 130 }, af: { x: 114, y: 130 } }),
      po([100, 68], 178, { ln: pie(104, 115), lf: pie(98, 115), an: [168, 170], af: [164, 166], fn: 50, ff: 50 }),
    ],
    foco: ['torso', 'muslo'], dur: 3.4,
  },
  correr: {
    k: [po([100, 82], 176, { ln: [72, -12], lf: [0, 0], an: [-36, 50], af: [40, 130] }), po([100, 82], 176, { lf: [72, -12], ln: [0, 0], af: [-36, 50], an: [40, 130] })],
    foco: ['muslo'], dur: 0.8,
  },
  marcha: {
    k: [po([100, 82], 178, { ln: [82, -6], lf: [0, 0], an: [-30, 60], af: [36, 130] }), po([100, 82], 178, { lf: [82, -6], ln: [0, 0], af: [-30, 60], an: [36, 130] })],
    foco: ['muslo'], dur: 1.4,
  },
  correrCinta: {
    k: [po([100, 80], 172, { ln: [44, -10], lf: [-26, -60], an: [-36, 50], af: [40, 130] }), po([100, 80], 172, { lf: [44, -10], ln: [-26, -60], af: [-36, 50], an: [40, 130] })],
    foco: ['muslo'], est: eq.cinta(), dur: 0.8,
  },
  correrCintaInclinada: {
    k: [po([100, 76], 170, { ln: [44, -10], lf: [-26, -60], an: [-36, 50], af: [40, 130] }), po([100, 76], 170, { lf: [44, -10], ln: [-26, -60], af: [-36, 50], an: [40, 130] })],
    foco: ['muslo'], est: eq.cinta(5), dur: 0.8,
  },
  caminar: {
    k: [po([100, 83], 180, { ln: [22, 6], lf: [-18, -28], an: [-18, -10], af: [18, 30] }), po([100, 83], 180, { lf: [22, 6], ln: [-18, -28], af: [-18, -10], an: [18, 30] })],
    dur: 1.6,
  },
  caminarCinta: {
    k: [po([100, 79], 176, { ln: [22, 6], lf: [-18, -28], an: [-18, -10], af: [18, 30] }), po([100, 79], 176, { lf: [22, 6], ln: [-18, -28], af: [-18, -10], an: [18, 30] })],
    est: eq.cinta(5), dur: 1.6,
  },
  granjero: {
    k: [po([100, 83], 180, { ln: [22, 6], lf: [-18, -28], an: [0, 0], af: [-2, -2] }), po([100, 83], 180, { lf: [22, 6], ln: [-18, -28], an: [0, 0], af: [-2, -2] })],
    foco: ['antebrazo', 'torso'], carga: { at: 'manos', def: 'mancuerna' }, dur: 1.6,
  },
  maleta: {
    k: [po([100, 83], 180, { ln: [22, 6], lf: [-18, -28], an: [0, 0], af: [20, 30] }), po([100, 83], 180, { lf: [22, 6], ln: [-18, -28], an: [0, 0], af: [-16, -8] })],
    foco: ['torso', 'antebrazo'], carga: { at: 'mN', def: 'kb' }, dur: 1.6,
  },
  bici: {
    k: Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45) * Math.PI / 180;
      return po([86, 80], 150, {
        an: { x: 128, y: 66 }, af: { x: 126, y: 66 },
        ln: pie(104 + 11 * Math.cos(a), 112 + 11 * Math.sin(a)),
        lf: pie(104 - 11 * Math.cos(a), 112 - 11 * Math.sin(a)),
      });
    }),
    foco: ['muslo'], est: eq.bici(), dur: 1.2,
  },
  cuerdas: {
    k: [po([88, 98], 160, { ln: pie(104), lf: pie(94), an: [116, 116], af: [56, 56] }), po([88, 98], 160, { ln: pie(104), lf: pie(94), an: [56, 56], af: [116, 116] })],
    foco: ['hombro', 'brazo'], cables: [{ desde: [190, 128], at: 'mN', cuerda: true }, { desde: [190, 128], at: 'mF', cuerda: true }], est: eq.ancla(190, 128), dur: 0.6,
  },
  boxeo: {
    k: [po([96, 84], 174, { ln: pie(112), lf: pie(84), an: [90, 90], af: [24, 164] }), po([96, 84], 174, { ln: pie(112), lf: pie(84), an: [24, 164], af: [90, 90] })],
    foco: ['hombro'], dur: 0.8,
  },
  gusano: {
    k: [
      po([56, 82], 180, { ln: pie(62), lf: pie(56), an: rel('h', 2, 34), af: rel('h', -2, 34) }),
      po([52, 82], 24, { ln: pie(62), lf: pie(56), an: { x: 80, y: 130 }, af: { x: 76, y: 130 } }),
      po([104.8, 110.6], 113.6, { ln: pie(60, 126), lf: pie(57, 126), an: { x: 138, y: 131 }, af: { x: 134, y: 131 }, fn: 20, ff: 20 }),
      po([52, 82], 24, { ln: pie(62), lf: pie(56), an: { x: 80, y: 130 }, af: { x: 76, y: 130 } }),
    ],
    foco: ['torso', 'muslo'], dur: 5,
  },

  // ── Movilidad y estiramientos ──
  circulosBrazos: {
    k: [0, 90, 180, 270].map(a => con(DE_PIE, { an: [a, a], af: [a - 4, a - 4] })),
    foco: ['hombro'], corto: true, dur: 1.6,
  },
  dislocaciones: {
    k: [con(DE_PIE, { an: [20, 20], af: [18, 18] }), con(DE_PIE, { an: [330, 330], af: [328, 328] })],
    foco: ['hombro'], dur: 3,
  },
  gatoCamello: {
    k: [con(CUADRUPEDIA, { hd: -35, t: 98, h: [82, 102] }), con(CUADRUPEDIA, { hd: 40, t: 108, h: [82, 106] })],
    foco: ['torso'], est: eq.colch(40, 150), dur: 3.4,
  },
  nino: {
    k: [CUADRUPEDIA, po([68, 116], 92, { hd: 20, ln: [70, -90], lf: [68, -90], an: [94, 94], af: [92, 92] })],
    foco: ['torso'], est: eq.colch(40, 160), dur: 4,
  },
  mejorEstiramiento: {
    k: [po([92, 108], 150, { ln: pie(126), lf: { x: 54, y: 127 }, ff: 15, an: [10, 10], af: { x: 116, y: 131 } }), po([92, 108], 160, { ln: pie(126), lf: { x: 54, y: 127 }, ff: 15, an: [182, 182], af: { x: 116, y: 131 } })],
    foco: ['cadera', 'torso'], dur: 3.6,
  },
  flexorCadera: {
    k: [po([96, 102], 180, { ln: pie(124), lf: [-6, -90], an: [10, 10], af: [6, 6] }), po([104, 104], 188, { ln: pie(124), lf: [-20, -90], an: [10, 10], af: [196, 196] })],
    foco: ['cadera'], est: eq.colch(50, 150), dur: 3.6,
  },
  isquiosSentado: {
    k: [con(SENTADO_PISO, { an: [174, 174], af: [172, 172] }), con(SENTADO_PISO, { t: 106, an: [94, 94], af: [92, 92] })],
    foco: ['muslo'], est: eq.colch(40, 150), dur: 4,
  },
  noventa: {
    k: [po([100, 122], 180, { ln: [96, 10], lf: [-96, -10], an: [30, 30], af: [-30, -30] }), po([100, 122], 166, { ln: [96, 10], lf: [-96, -10], an: [60, 60], af: [0, 0] })],
    foco: ['cadera'], fr: true, est: eq.colch(40, 160), dur: 3.4,
  },
  libroAbierto: {
    k: [po([96, 124], 270, { ln: [124, 40], lf: [120, 36], an: [150, 150], af: [146, 146] }), po([96, 124], 270, { ln: [124, 40], lf: [120, 36], an: [300, 300], af: [146, 146] })],
    foco: ['torso'], est: eq.colch(30, 160), dur: 3.6,
  },
  pechoMarco: {
    k: [po([96, 82], 180, { ln: pie(102), lf: pie(94), an: [-90, 180], af: [0, 0] }), po([102, 82], 172, { ln: pie(106), lf: pie(94), an: [-90, 180], af: [0, 0] })],
    foco: ['torso'], est: eq.pared(68), dur: 3.6,
  },
  dorsalEstiramiento: {
    k: [po([84, 84], 104, { ln: pie(102), lf: pie(96), an: { x: 150, y: 70 }, af: { x: 148, y: 70 } }), po([80, 86], 98, { ln: pie(102), lf: pie(96), an: { x: 150, y: 70 }, af: { x: 148, y: 70 } })],
    foco: ['torso'], est: eq.columna(160, 70), dur: 3.6,
  },
  rodilloPiernas: {
    k: [po([70, 118], 210, { ln: [84, 90], lf: [86, 92], an: { x: 50, y: 131 }, af: { x: 48, y: 131 } }), po([84, 118], 210, { ln: [84, 90], lf: [86, 92], an: { x: 64, y: 131 }, af: { x: 62, y: 131 } })],
    foco: ['muslo'], est: `<circle cx="112" cy="124" r="7" fill="#1e3a5f" stroke="#a3b3c6" stroke-width="1.6"/>`, dur: 2.6,
  },
  rodilloEspalda: {
    k: [po([98, 112], 280, { ln: pie(126), lf: pie(122), an: rel('cab', -2, 2), af: rel('cab', -4, 2) }), po([104, 110], 278, { ln: pie(126), lf: pie(122), an: rel('cab', -2, 2), af: rel('cab', -4, 2) })],
    foco: ['torso'], est: `<circle cx="66" cy="124" r="7" fill="#1e3a5f" stroke="#a3b3c6" stroke-width="1.6"/>`, dur: 2.6,
  },
  puenteCompleto: {
    k: [con(ACOSTADO, { ln: pie(116), lf: pie(112), an: { x: 52, y: 131 }, af: { x: 50, y: 131 } }), po([92, 90], 304, { ln: pie(116), lf: pie(112), an: { x: 52, y: 131 }, af: { x: 50, y: 131 } })],
    foco: ['torso', 'cadera'], est: eq.colch(30, 150), dur: 3.6,
  },
  split: {
    k: [po([98, 96], 180, { ln: pie(132), lf: { x: 62, y: 128 }, ff: 15, an: rel('h', 4, 30), af: rel('h', -4, 30) }), po([98, 112], 180, { ln: pie(142), lf: { x: 50, y: 128 }, ff: 15, an: rel('h', 4, 30), af: rel('h', -4, 30) })],
    foco: ['cadera', 'muslo'], dur: 4,
  },
};
