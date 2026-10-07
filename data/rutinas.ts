// Rutinas Fe + Gym: por parte del cuerpo, en casa (sin equipo o con lo que hay en casa) y en el gym.
// Cada rutina trae su versiculo para entrenar el cuerpo y el espiritu al mismo tiempo.

export type Lugar = 'casa' | 'gym';

export interface Ejercicio {
  nombre: string;
  series: number;
  reps: string;       // "12", "10-12", "30 s", "Al fallo"
  descanso: number;   // segundos
  tip: string;
}

export interface Rutina {
  titulo: string;
  minutos: number;
  nivel: 'Principiante' | 'Intermedio' | 'Avanzado';
  ejercicios: Ejercicio[];
}

export interface ParteCuerpo {
  id: string;
  nombre: string;
  icono: string;      // Font Awesome
  frase: string;
  versiculo: { texto: string; cita: string };
  casa: Rutina;
  gym: Rutina;
}

export const PARTES: ParteCuerpo[] = [
  {
    id: 'pecho',
    nombre: 'Pecho',
    icono: 'fa-shield-halved',
    frase: 'Un pecho fuerte para cargar la coraza de justicia.',
    versiculo: { texto: 'Estad, pues, firmes, ceñidos vuestros lomos con la verdad, y vestidos con la coraza de justicia.', cita: 'Efesios 6:14' },
    casa: {
      titulo: 'Coraza en casa',
      minutos: 25,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Lagartijas (flexiones)', series: 4, reps: '10-15', descanso: 60, tip: 'Cuerpo recto como tabla; baja hasta que el pecho casi toque el piso.' },
        { nombre: 'Lagartijas inclinadas (manos en silla o sillón)', series: 3, reps: '12-15', descanso: 45, tip: 'Trabaja la parte baja del pecho. Aprieta al subir.' },
        { nombre: 'Lagartijas declinadas (pies en silla)', series: 3, reps: '8-12', descanso: 60, tip: 'Más difícil: enfoca la parte alta del pecho.' },
        { nombre: 'Lagartijas con manos abiertas', series: 3, reps: '10-12', descanso: 45, tip: 'Manos más anchas que los hombros; baja lento en 3 segundos.' },
        { nombre: 'Fondos en silla', series: 3, reps: '10-12', descanso: 60, tip: 'Silla firme contra la pared. Inclina el torso para usar más pecho.' },
      ],
    },
    gym: {
      titulo: 'Coraza de acero',
      minutos: 50,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Press de banca con barra', series: 4, reps: '8-10', descanso: 120, tip: 'Escápulas juntas y pies firmes. Baja la barra a la mitad del pecho.' },
        { nombre: 'Press inclinado con mancuernas', series: 4, reps: '10-12', descanso: 90, tip: 'Banco a 30°. Junta las mancuernas arriba sin chocarlas.' },
        { nombre: 'Aperturas en máquina (pec deck)', series: 3, reps: '12-15', descanso: 60, tip: 'Codos ligeramente flexionados; aprieta 1 segundo al cerrar.' },
        { nombre: 'Fondos en paralelas', series: 3, reps: 'Al fallo', descanso: 90, tip: 'Inclínate hacia adelante para cargar el pecho y no solo el tríceps.' },
        { nombre: 'Cruce de poleas', series: 3, reps: '12-15', descanso: 60, tip: 'Cruza las manos al final para una contracción completa.' },
      ],
    },
  },
  {
    id: 'espalda',
    nombre: 'Espalda',
    icono: 'fa-person-hiking',
    frase: 'Espalda firme para cargar tu cruz cada día.',
    versiculo: { texto: 'Si alguno quiere venir en pos de mí, niéguese a sí mismo, tome su cruz cada día, y sígame.', cita: 'Lucas 9:23' },
    casa: {
      titulo: 'Carga tu cruz',
      minutos: 25,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Remo con mochila cargada', series: 4, reps: '12-15', descanso: 60, tip: 'Mete libros o garrafas. Torso inclinado, jala hacia la cadera.' },
        { nombre: 'Superman en el piso', series: 3, reps: '15', descanso: 45, tip: 'Boca abajo, levanta brazos y piernas y sostén 2 segundos.' },
        { nombre: 'Remo invertido bajo una mesa', series: 3, reps: '8-12', descanso: 60, tip: 'Mesa resistente. Cuerpo recto, jala el pecho hacia la orilla.' },
        { nombre: 'Ángeles en el piso (Y-T-W)', series: 3, reps: '10 de cada una', descanso: 45, tip: 'Boca abajo, dibuja las letras con los brazos apretando la espalda alta.' },
        { nombre: 'Buenos días sin peso', series: 3, reps: '15', descanso: 45, tip: 'Manos en la nuca, espalda recta, inclínate desde la cadera.' },
      ],
    },
    gym: {
      titulo: 'Espalda de guerrero',
      minutos: 55,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Dominadas (o jalón asistido)', series: 4, reps: '6-10', descanso: 120, tip: 'Pecho hacia la barra; baja controlado hasta estirar los brazos.' },
        { nombre: 'Remo con barra', series: 4, reps: '8-10', descanso: 120, tip: 'Espalda neutra a 45°. Jala la barra hacia el ombligo.' },
        { nombre: 'Jalón al pecho agarre cerrado', series: 3, reps: '10-12', descanso: 90, tip: 'Saca el pecho y lleva los codos hacia atrás y abajo.' },
        { nombre: 'Remo con mancuerna a una mano', series: 3, reps: '10-12 por lado', descanso: 60, tip: 'Codo pegado al cuerpo; piensa en jalar con el codo.' },
        { nombre: 'Face pull en polea', series: 3, reps: '15', descanso: 60, tip: 'Cuerda a la altura de la cara, abre las manos al jalar.' },
      ],
    },
  },
  {
    id: 'piernas',
    nombre: 'Piernas y glúteo',
    icono: 'fa-person-running',
    frase: 'Pies firmes como de ciervo para correr la carrera.',
    versiculo: { texto: 'Jehová el Señor es mi fortaleza, el cual hace mis pies como de ciervas, y en mis alturas me hace andar.', cita: 'Habacuc 3:19' },
    casa: {
      titulo: 'Pies de ciervo',
      minutos: 30,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Sentadillas', series: 4, reps: '15-20', descanso: 60, tip: 'Pecho arriba, rodillas en línea con la punta de los pies.' },
        { nombre: 'Zancadas alternas', series: 3, reps: '12 por pierna', descanso: 60, tip: 'Paso largo; la rodilla de atrás casi toca el piso.' },
        { nombre: 'Sentadilla búlgara (pie en silla)', series: 3, reps: '10 por pierna', descanso: 60, tip: 'El peso en la pierna de adelante. Baja lento.' },
        { nombre: 'Puente de glúteo', series: 4, reps: '15-20', descanso: 45, tip: 'Aprieta el glúteo 2 segundos arriba.' },
        { nombre: 'Elevación de talones (pantorrilla)', series: 4, reps: '20', descanso: 30, tip: 'En la orilla de un escalón para más recorrido.' },
      ],
    },
    gym: {
      titulo: 'Columnas del templo',
      minutos: 60,
      nivel: 'Avanzado',
      ejercicios: [
        { nombre: 'Sentadilla con barra', series: 4, reps: '6-8', descanso: 150, tip: 'Respira y bloquea el abdomen antes de bajar. Baja al menos a paralelo.' },
        { nombre: 'Peso muerto rumano', series: 4, reps: '8-10', descanso: 120, tip: 'Barra pegada a las piernas; siente el estiramiento en femorales.' },
        { nombre: 'Prensa de piernas', series: 3, reps: '10-12', descanso: 90, tip: 'No despegues la espalda baja ni bloquees las rodillas.' },
        { nombre: 'Hip thrust con barra', series: 3, reps: '10-12', descanso: 90, tip: 'Barbilla al pecho y empuja con los talones.' },
        { nombre: 'Curl femoral en máquina', series: 3, reps: '12', descanso: 60, tip: 'Baja en 3 segundos.' },
        { nombre: 'Pantorrilla en máquina', series: 4, reps: '15', descanso: 45, tip: 'Pausa abajo y arriba, sin rebotar.' },
      ],
    },
  },
  {
    id: 'hombros',
    nombre: 'Hombros',
    icono: 'fa-hands-holding',
    frase: 'Hombros que levantan al hermano caído.',
    versiculo: { texto: 'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.', cita: 'Gálatas 6:2' },
    casa: {
      titulo: 'Lleva la carga',
      minutos: 20,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Lagartijas pica (pike push-up)', series: 4, reps: '8-12', descanso: 60, tip: 'Cadera arriba en V; baja la cabeza entre las manos.' },
        { nombre: 'Elevaciones laterales con botellas', series: 3, reps: '15', descanso: 45, tip: 'Botellas o garrafas con agua; sube hasta la altura de los hombros.' },
        { nombre: 'Elevaciones frontales con mochila', series: 3, reps: '12', descanso: 45, tip: 'Sin balancearte; sube controlado.' },
        { nombre: 'Círculos de brazos', series: 3, reps: '30 s cada sentido', descanso: 30, tip: 'Brazos estirados; círculos pequeños y rápidos.' },
        { nombre: 'Plancha con toque de hombro', series: 3, reps: '20 toques', descanso: 45, tip: 'Cadera quieta; no te balancees.' },
      ],
    },
    gym: {
      titulo: 'Hombros de bronce',
      minutos: 45,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Press militar con barra', series: 4, reps: '8-10', descanso: 120, tip: 'Abdomen y glúteo apretados para proteger la espalda baja.' },
        { nombre: 'Elevaciones laterales con mancuernas', series: 4, reps: '12-15', descanso: 60, tip: 'Codos ligeramente doblados; sube con los codos, no con las manos.' },
        { nombre: 'Press Arnold', series: 3, reps: '10', descanso: 90, tip: 'Gira las palmas mientras subes.' },
        { nombre: 'Pájaros (deltoide posterior)', series: 3, reps: '15', descanso: 60, tip: 'Torso inclinado; abre los brazos apretando la espalda alta.' },
        { nombre: 'Encogimientos con mancuernas', series: 3, reps: '12-15', descanso: 60, tip: 'Sube los hombros hacia las orejas y pausa.' },
      ],
    },
  },
  {
    id: 'brazos',
    nombre: 'Brazos',
    icono: 'fa-hand-fist',
    frase: 'Brazos que se adiestran para la batalla.',
    versiculo: { texto: 'Bendito sea Jehová, mi roca, quien adiestra mis manos para la batalla, y mis dedos para la guerra.', cita: 'Salmos 144:1' },
    casa: {
      titulo: 'Manos para la batalla',
      minutos: 20,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Lagartijas diamante', series: 4, reps: '8-12', descanso: 60, tip: 'Manos juntas formando un diamante; codos pegados al cuerpo.' },
        { nombre: 'Curl con mochila o garrafas', series: 4, reps: '12-15', descanso: 45, tip: 'Codos fijos a los lados; baja lento.' },
        { nombre: 'Fondos en silla', series: 3, reps: '12-15', descanso: 60, tip: 'Torso vertical para cargar el tríceps.' },
        { nombre: 'Curl martillo con botellas', series: 3, reps: '12', descanso: 45, tip: 'Palmas mirándose entre sí.' },
        { nombre: 'Extensión de tríceps en el piso', series: 3, reps: '10', descanso: 45, tip: 'Desde plancha sobre antebrazos, empuja hasta estirar los brazos.' },
      ],
    },
    gym: {
      titulo: 'Brazos de guerra',
      minutos: 45,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Curl con barra', series: 4, reps: '8-10', descanso: 90, tip: 'Sin columpiarte; codos quietos.' },
        { nombre: 'Press francés con barra Z', series: 4, reps: '10', descanso: 90, tip: 'Baja la barra a la frente con codos apuntando arriba.' },
        { nombre: 'Curl inclinado con mancuernas', series: 3, reps: '10-12', descanso: 60, tip: 'Brazos colgando detrás del cuerpo para más estiramiento.' },
        { nombre: 'Jalón de tríceps en polea con cuerda', series: 3, reps: '12-15', descanso: 60, tip: 'Abre la cuerda al final.' },
        { nombre: 'Curl martillo', series: 3, reps: '12', descanso: 60, tip: 'Trabaja antebrazo y braquial.' },
        { nombre: 'Fondos en banco con peso', series: 3, reps: 'Al fallo', descanso: 60, tip: 'Disco en las piernas si ya es fácil.' },
      ],
    },
  },
  {
    id: 'abdomen',
    nombre: 'Abdomen',
    icono: 'fa-dumbbell',
    frase: 'Un centro firme: dominio propio por dentro y por fuera.',
    versiculo: { texto: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.', cita: '2 Timoteo 1:7' },
    casa: {
      titulo: 'Dominio propio',
      minutos: 15,
      nivel: 'Principiante',
      ejercicios: [
        { nombre: 'Plancha', series: 3, reps: '30-45 s', descanso: 30, tip: 'Glúteo apretado; no dejes caer la cadera.' },
        { nombre: 'Crunch', series: 3, reps: '20', descanso: 30, tip: 'Sube con el abdomen, no jales del cuello.' },
        { nombre: 'Elevación de piernas acostado', series: 3, reps: '12-15', descanso: 45, tip: 'Espalda baja pegada al piso.' },
        { nombre: 'Bicicleta', series: 3, reps: '30 s', descanso: 30, tip: 'Codo hacia la rodilla contraria, lento y controlado.' },
        { nombre: 'Escaladores (mountain climbers)', series: 3, reps: '30 s', descanso: 30, tip: 'Rápido, con la cadera baja.' },
        { nombre: 'Plancha lateral', series: 2, reps: '30 s por lado', descanso: 30, tip: 'Cuerpo en línea recta.' },
      ],
    },
    gym: {
      titulo: 'Centro de acero',
      minutos: 25,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Elevación de piernas colgado', series: 4, reps: '10-12', descanso: 60, tip: 'Sin balanceo; sube las rodillas al pecho o las piernas rectas.' },
        { nombre: 'Crunch en polea alta (de rodillas)', series: 4, reps: '12-15', descanso: 60, tip: 'Enróllate llevando los codos a las rodillas.' },
        { nombre: 'Rueda abdominal', series: 3, reps: '8-12', descanso: 60, tip: 'Desde rodillas; avanza solo hasta donde controles la espalda.' },
        { nombre: 'Pallof press en polea', series: 3, reps: '12 por lado', descanso: 45, tip: 'Resiste el giro: el abdomen trabaja para no moverte.' },
        { nombre: 'Plancha con peso', series: 3, reps: '45 s', descanso: 45, tip: 'Disco en la espalda, con ayuda de alguien.' },
      ],
    },
  },
  {
    id: 'completo',
    nombre: 'Cuerpo completo',
    icono: 'fa-fire',
    frase: 'Corre la carrera con todo: de pies a cabeza.',
    versiculo: { texto: 'Corramos con paciencia la carrera que tenemos por delante, puestos los ojos en Jesús.', cita: 'Hebreos 12:1-2' },
    casa: {
      titulo: 'La carrera (circuito)',
      minutos: 25,
      nivel: 'Intermedio',
      ejercicios: [
        { nombre: 'Burpees', series: 4, reps: '10', descanso: 45, tip: 'Pecho al piso y salto arriba con las manos al cielo.' },
        { nombre: 'Sentadilla con salto', series: 4, reps: '15', descanso: 45, tip: 'Cae suave, con las rodillas flexionadas.' },
        { nombre: 'Lagartijas', series: 4, reps: '12', descanso: 45, tip: 'Rango completo.' },
        { nombre: 'Escaladores', series: 4, reps: '30 s', descanso: 30, tip: 'Mantén el ritmo.' },
        { nombre: 'Jumping jacks', series: 4, reps: '40', descanso: 30, tip: 'Cardio para cerrar fuerte.' },
      ],
    },
    gym: {
      titulo: 'Guerra total',
      minutos: 50,
      nivel: 'Avanzado',
      ejercicios: [
        { nombre: 'Peso muerto', series: 4, reps: '5', descanso: 150, tip: 'Espalda neutra; empuja el piso con los pies.' },
        { nombre: 'Press de banca', series: 3, reps: '8', descanso: 120, tip: 'Control en la bajada.' },
        { nombre: 'Dominadas', series: 3, reps: 'Al fallo', descanso: 90, tip: 'Completas, de brazos estirados a barbilla arriba.' },
        { nombre: 'Zancadas con mancuernas', series: 3, reps: '10 por pierna', descanso: 90, tip: 'Torso erguido.' },
        { nombre: 'Kettlebell swing', series: 3, reps: '15', descanso: 60, tip: 'La fuerza sale de la cadera, no de los brazos.' },
        { nombre: 'Remo en máquina (cardio)', series: 1, reps: '5 min', descanso: 0, tip: 'Final a ritmo fuerte.' },
      ],
    },
  },
];

// Rutina del dia: una parte del cuerpo por dia, igual para todos
export const parteDelDia = (): ParteCuerpo => {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return PARTES[day % PARTES.length];
};
