import { Carga, dibujar } from './motor';
import { PATRONES } from './patrones';

// Elige el movimiento y el equipo de un ejercicio a partir de su nombre.
// El orden importa: las reglas mas especificas van primero.
const REGLAS: [RegExp, string][] = [
  // Estiramientos y movilidad
  [/c[ií]rculos de brazos/, 'circulosBrazos'],
  [/dislocacion/, 'dislocaciones'],
  [/gato.?camello/, 'gatoCamello'],
  [/postura del ni[nñ]o/, 'nino'],
  [/mejor estiramiento/, 'mejorEstiramiento'],
  [/flexor de cadera/, 'flexorCadera'],
  [/femoral sentado|pancake|pike stretch/, 'isquiosSentado'],
  [/estiramiento de pantorrilla/, 'pantorrillaEscalon'],
  [/estiramiento de pecho/, 'pechoMarco'],
  [/estiramiento de dorsal/, 'dorsalEstiramiento'],
  [/libro abierto/, 'libroAbierto'],
  [/90\/90/, 'noventa'],
  [/rodillo de espuma en piernas/, 'rodilloPiernas'],
  [/rodillo de espuma/, 'rodilloEspalda'],
  [/jefferson/, 'jefferson'],
  [/puente completo/, 'puenteCompleto'],
  [/split asistido/, 'split'],
  [/cosaca/, 'cosaca'],
  [/buenos d[ií]as/, 'buenosDias'],
  [/apret[oó]n de palmas/, 'palmas'],
  // Cardio
  [/burpee/, 'burpee'],
  [/caminadora inclinada|caminata inclinada/, 'correrCintaInclinada'],
  [/caminadora/, 'correrCinta'],
  [/trote|sprint en el lugar/, 'correr'],
  [/rodillas altas/, 'marcha'],
  [/jumping jack/, 'jumpingJack'],
  [/bicicleta (est[aá]tica|de aire|suave)/, 'bici'],
  [/bicicleta/, 'bicicletaAbs'],
  [/remo erg[oó]metro|remo en m[aá]quina \(cardio\)/, 'remoErg'],
  [/cuerdas de batalla/, 'cuerdas'],
  [/boxeo/, 'boxeo'],
  [/gusano|inchworm/, 'gusano'],
  [/caminata de oso/, 'osoCaminata'],
  [/caminata lateral/, 'caminataLateral'],
  [/caminata con maleta/, 'maleta'],
  [/granjero/, 'granjero'],
  [/caminata/, 'caminar'],
  [/patinador/, 'patinador'],
  [/saltos al caj[oó]n/, 'cajon'],
  [/saltos de rana/, 'ranas'],
  [/wall ball/, 'wallBall'],
  [/thruster|complejo con barra|push press/, 'thruster'],
  // Piernas
  [/pistol/, 'pistol'],
  [/b[uú]lgara/, 'bulgara'],
  [/sentadilla isom[eé]trica|sentadilla en la pared/, 'isoPared'],
  [/sentadilla con salto/, 'saltoSentadilla'],
  [/sentadilla profunda sostenida/, 'sentadillaFija'],
  [/sentadilla (con barra|trasera|hack|profunda con barra)/, 'sentadillaBarra'],
  [/sentadilla (frontal|goblet)/, 'sentadillaFrontal'],
  [/sentadilla a la silla/, 'sentadillaSilla'],
  [/sentadilla/, 'sentadilla'],
  [/zancadas? con salto/, 'zancadaSalto'],
  [/zancada/, 'zancada'],
  [/step.?up/, 'stepUp'],
  [/prensa/, 'prensa'],
  [/extensi[oó]n de cu[aá]driceps/, 'extCuad'],
  [/curl femoral sentado/, 'curlFemSentado'],
  [/curl femoral/, 'curlFemAcostado'],
  [/curl n[oó]rdico/, 'nordico'],
  [/pantorrilla sentado/, 'pantorrillaSentado'],
  [/escal[oó]n/, 'pantorrillaEscalon'],
  [/pantorrilla|elevaci[oó]n de talones/, 'pantorrilla'],
  [/hip thrust a una pierna/, 'hipThrustUna'],
  [/hip thrust/, 'hipThrust'],
  [/puente (de gl[uú]teo|femoral) a una pierna/, 'puenteUna'],
  [/puente|frog pumps/, 'puente'],
  [/patada de gl[uú]teo en (polea|m[aá]quina)/, 'patadaPie'],
  [/patada de gl[uú]teo/, 'patadaCuadrupedia'],
  [/fire hydrant/, 'fireHydrant'],
  [/bird.?dog/, 'birdDog'],
  [/almeja|clamshell/, 'abdLado'],
  [/abducci[oó]n/, 'abdSentadoFrente'],
  // Bisagra
  [/rumano a una pierna/, 'rumanoUna'],
  [/rumano/, 'rumano'],
  [/rack pull/, 'rackPull'],
  [/peso muerto/, 'pesoMuerto'],
  [/kettlebell swing/, 'kbSwing'],
  [/pull.?through/, 'pullThrough'],
  [/hiperextensi/, 'hiper'],
  // Espalda
  [/pies a la barra|toes to bar/, 'toesToBar'],
  [/elevaci[oó]n de piernas colgado/, 'elevPiernasColgado'],
  [/silla romana/, 'rodillasParalelas'],
  [/l.?sit/, 'lsit'],
  [/colgado/, 'colgado'],
  [/dominada|chin.?up/, 'dominada'],
  [/jal[oó]n de tr[ií]ceps/, 'jalonTriceps'],
  [/jal[oó]n/, 'jalon'],
  [/remo al ment[oó]n/, 'remoMenton'],
  [/remo invertido bajo una mesa/, 'remoMesa'],
  [/remo invertido/, 'remoInvertido'],
  [/remo con toalla/, 'remoPuerta'],
  [/remo (sentado|en m[aá]quina)/, 'remoPolea'],
  [/remo (con mancuerna a una mano|a una mano|meadows)/, 'remoUnaMano'],
  [/remo/, 'remoInclinado'],
  [/face pull|rotaci[oó]n externa/, 'facePull'],
  [/p[aá]jaros en polea|pec deck|aperturas en (m[aá]quina|polea)|cruce de poleas/, 'aperturaFrente'],
  [/p[aá]jaros/, 'pajaros'],
  [/pull.?over en polea/, 'pulloverPolea'],
  [/pull.?over/, 'pulloverPiso'],
  [/encogimiento/, 'encogimientos'],
  [/superman|elevaci[oó]n en y boca abajo/, 'superman'],
  [/[aá]ngeles|y-t-w/, 'angeles'],
  // Pecho y empuje
  [/pallof/, 'pallof'],
  [/press franc[eé]s/, 'frances'],
  [/extensi[oó]n de tr[ií]ceps en el piso/, 'francesPiso'],
  [/esfinge/, 'esfinge'],
  [/extensi[oó]n (en polea )?sobre la cabeza|extensi[oó]n en polea sobre/, 'tricepsCabezaPolea'],
  [/extensi[oó]n de tr[ií]ceps a una mano en polea/, 'jalonTriceps'],
  [/extensi[oó]n/, 'tricepsCabeza'],
  [/press de pecho en m[aá]quina/, 'pressPechoMaquina'],
  [/press inclinado/, 'inclinado'],
  [/press (de banca|plano)/, 'banca'],
  [/press z|sentado en el piso/, 'pressPiso'],
  [/press (de hombro con mancuernas|de hombro en m[aá]quina|con mancuernas sentado|arnold)/, 'pressSentado'],
  [/press/, 'pressMilitar'],
  [/aperturas en el piso/, 'aperturasPiso'],
  [/aperturas/, 'aperturaFrente'],
  [/parada de manos/, 'paradaManos'],
  [/pica (con pies elevados|inclinada)|pike push-up con d[eé]ficit/, 'picaElevada'],
  [/pica|pike/, 'pica'],
  [/lagartija isom[eé]trica/, 'lagartijaIso'],
  [/lagartijas? (pliom|con palmada)/, 'lagartijaPlio'],
  [/lagartijas?( cerradas)? de rodillas/, 'lagartijaRodillas'],
  [/lagartijas? inclinadas?/, 'lagartijaInclinada'],
  [/lagartijas? declinadas?/, 'lagartijaDeclinada'],
  [/lagartija/, 'lagartija'],
  [/fondos entre sillas con pies|fondos? .*pies elevados/, 'fondosSillaPies'],
  [/fondos (en silla|entre|en banco)/, 'fondosSilla'],
  [/fondos/, 'fondos'],
  // Hombro y brazos
  [/elevaci[oó]n(es)? lateral|laterales isom[eé]tricas/, 'lateral'],
  [/laterales/, 'lateral'],
  [/elevaci[oó]n frontal en polea/, 'frontalPolea'],
  [/elevaci[oó]n(es)? frontal/, 'frontal'],
  [/curl isom[eé]trico/, 'curlIso'],
  [/curl bayesiano/, 'curlBayesiano'],
  [/curl en polea/, 'curlPolea'],
  [/curl (predicador|en m[aá]quina predicador)/, 'curlPredicador'],
  [/curl inclinado/, 'curlInclinado'],
  [/curl concentrado/, 'curlConcentrado'],
  [/curl ara[nñ]a/, 'curlArana'],
  [/curl inverso/, 'curlAntebrazo'],
  [/curl|martillo/, 'curl'],
  // Core
  [/plancha copenhague/, 'copenhague'],
  [/plancha lateral con elevaci[oó]n/, 'planchaLateralCadera'],
  [/plancha lateral con rotaci[oó]n/, 'planchaRotacion'],
  [/plancha lateral/, 'planchaLateral'],
  [/plancha con toque/, 'planchaToque'],
  [/plancha con jack/, 'planchaJack'],
  [/plancha/, 'plancha'],
  [/escaladores lentos/, 'escaladoresLentos'],
  [/escaladores/, 'escaladores'],
  [/crunch en polea/, 'crunchPolea'],
  [/crunch en m[aá]quina/, 'crunchMaquina'],
  [/crunch/, 'crunch'],
  [/elevaci[oó]n de rodillas/, 'elevRodillas'],
  [/elevaci[oó]n de piernas/, 'elevPiernas'],
  [/dragon flag/, 'dragonFlag'],
  [/v.?ups/, 'vups'],
  [/hollow/, 'hollow'],
  [/dead bug/, 'deadBug'],
  [/giros rusos/, 'girosRusos'],
  [/rueda abdominal de pie/, 'ruedaPie'],
  [/rueda abdominal|rollout/, 'rueda'],
  [/le[nñ]ador/, 'lenador'],
];

const norm = (s: string) => s.toLowerCase();

// La carga que se ve en las manos: lo que dice el nombre manda sobre lo del movimiento
const cargaDelNombre = (n: string): Carga | 'nada' | undefined => {
  if (/al aire|sin peso|sin salto/.test(n)) return 'nada';
  if (/mochila/.test(n)) return 'mochila';
  if (/garrafa/.test(n)) return 'garrafa';
  if (/botella/.test(n)) return 'botella';
  if (/kettlebell|goblet/.test(n)) return 'kb';
  if (/disco|lastre|con peso/.test(n)) return 'disco';
  if (/mancuerna/.test(n)) return 'mancuerna';
  if (/barra|smith|pendlay|rack pull|remo en t|hack/.test(n)) return 'barra';
  return undefined;
};

export const patronDe = (nombre: string): string | null => {
  const n = norm(nombre);
  return REGLAS.find(([re]) => re.test(n))?.[1] ?? null;
};

const cache = new Map<string, string | null>();

// SVG del ejercicio (o null si no hay figura para ese nombre)
export function figuraSVG(nombre: string, animado = true): string | null {
  const key = `${animado ? 1 : 0}|${nombre}`;
  if (cache.has(key)) return cache.get(key)!;
  const id = patronDe(nombre);
  const pat = id ? PATRONES[id] : undefined;
  let svg: string | null = null;
  if (pat) {
    const n = norm(nombre);
    const delNombre = cargaDelNombre(n);
    const carga = !pat.carga ? null : delNombre === 'nada' ? null : delNombre ?? pat.carga.def;
    svg = dibujar(pat, carga, animado);
  }
  cache.set(key, svg);
  return svg;
}
