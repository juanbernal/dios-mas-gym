// Rutinas Fe + Gym: por parte del cuerpo, en casa (sin equipo o con lo que hay en casa) y en el gym,
// en tres niveles. Esta es la PLANTILLA: el admin la edita desde /admin/rutinas y lo que guarda
// vive en Vercel Blob; mientras no haya nada guardado se usa esto tal cual.

export type Lugar = 'casa' | 'gym';
export type Nivel = 'Principiante' | 'Intermedio' | 'Avanzado';
export const NIVELES: Nivel[] = ['Principiante', 'Intermedio', 'Avanzado'];

export interface Ejercicio {
  nombre: string;
  series: number;
  reps: string;       // "12", "10-12", "30 s", "Al fallo"
  descanso: number;   // segundos
  tip: string;
  musculo?: string;
  imagen?: string;    // foto o GIF de la tecnica
  video?: string;     // enlace de YouTube
}

export interface Rutina {
  id: string;
  parte: string;      // id de ParteCuerpo
  lugar: Lugar;
  nivel: Nivel;
  titulo: string;
  minutos: number;
  objetivo?: string;
  descripcion?: string;
  imagen?: string;
  calentamiento?: string[];
  ejercicios: Ejercicio[];
  destacada?: boolean; // la que se abre primero para esa parte y lugar
  oculta?: boolean;
}

export interface ParteCuerpo {
  id: string;
  nombre: string;
  icono: string;      // Font Awesome
  frase: string;
  versiculo: { texto: string; cita: string };
  imagen?: string;
}

export interface RutinasData {
  partes: ParteCuerpo[];
  rutinas: Rutina[];
  updatedAt?: number;
}

export const OBJETIVOS = ['Fuerza', 'Hipertrofia', 'Resistencia', 'Quemar grasa', 'Movilidad', 'Técnica'];

export const ICONOS_PARTE = [
  'fa-shield-halved', 'fa-person-hiking', 'fa-person-running', 'fa-person-walking', 'fa-hands-holding',
  'fa-hand-fist', 'fa-dumbbell', 'fa-fire', 'fa-fire-flame-curved', 'fa-heart-pulse', 'fa-spa',
  'fa-person-praying', 'fa-bolt', 'fa-weight-hanging', 'fa-crown', 'fa-stopwatch', 'fa-trophy', 'fa-cross',
];

export const CALENTAMIENTO_GENERAL = [
  '2 min de trote suave o saltos en el lugar',
  '10 círculos de brazos hacia adelante y hacia atrás',
  '10 sentadillas al aire lentas',
  '10 rotaciones de cadera por lado',
  '1 serie ligera del primer ejercicio',
];

const e = (nombre: string, series: number, reps: string, descanso: number, tip: string, musculo?: string): Ejercicio =>
  musculo ? { nombre, series, reps, descanso, tip, musculo } : { nombre, series, reps, descanso, tip };

export const PARTES_BASE: ParteCuerpo[] = [
  {
    id: 'pecho', nombre: 'Pecho', icono: 'fa-shield-halved',
    frase: 'Un pecho fuerte para cargar la coraza de justicia.',
    versiculo: { texto: 'Estad, pues, firmes, ceñidos vuestros lomos con la verdad, y vestidos con la coraza de justicia.', cita: 'Efesios 6:14' },
  },
  {
    id: 'espalda', nombre: 'Espalda', icono: 'fa-person-hiking',
    frase: 'Espalda firme para cargar tu cruz cada día.',
    versiculo: { texto: 'Si alguno quiere venir en pos de mí, niéguese a sí mismo, tome su cruz cada día, y sígame.', cita: 'Lucas 9:23' },
  },
  {
    id: 'piernas', nombre: 'Piernas', icono: 'fa-person-running',
    frase: 'Pies firmes como de ciervo para correr la carrera.',
    versiculo: { texto: 'Jehová el Señor es mi fortaleza, el cual hace mis pies como de ciervas, y en mis alturas me hace andar.', cita: 'Habacuc 3:19' },
  },
  {
    id: 'gluteo', nombre: 'Glúteo', icono: 'fa-person-walking',
    frase: 'Fuerza desde la base: edifica sobre la roca.',
    versiculo: { texto: 'Cualquiera, pues, que me oye estas palabras, y las hace, le compararé a un hombre prudente, que edificó su casa sobre la roca.', cita: 'Mateo 7:24' },
  },
  {
    id: 'hombros', nombre: 'Hombros', icono: 'fa-hands-holding',
    frase: 'Hombros que levantan al hermano caído.',
    versiculo: { texto: 'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.', cita: 'Gálatas 6:2' },
  },
  {
    id: 'brazos', nombre: 'Brazos', icono: 'fa-hand-fist',
    frase: 'Brazos que se adiestran para la batalla.',
    versiculo: { texto: 'Quien adiestra mis manos para la batalla, para entesar con mis brazos el arco de bronce.', cita: 'Salmos 18:34' },
  },
  {
    id: 'abdomen', nombre: 'Abdomen', icono: 'fa-dumbbell',
    frase: 'Un centro firme: dominio propio por dentro y por fuera.',
    versiculo: { texto: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.', cita: '2 Timoteo 1:7' },
  },
  {
    id: 'completo', nombre: 'Cuerpo completo', icono: 'fa-fire',
    frase: 'Corre la carrera con todo: de pies a cabeza.',
    versiculo: { texto: 'Corramos con paciencia la carrera que tenemos por delante, puestos los ojos en Jesús.', cita: 'Hebreos 12:1-2' },
  },
  {
    id: 'cardio', nombre: 'Cardio y HIIT', icono: 'fa-heart-pulse',
    frase: 'Pulmones y corazón listos para no rendirse.',
    versiculo: { texto: '¿No sabéis que los que corren en el estadio, todos a la verdad corren, pero uno solo se lleva el premio? Corred de tal manera que lo obtengáis.', cita: '1 Corintios 9:24' },
  },
  {
    id: 'movilidad', nombre: 'Movilidad', icono: 'fa-spa',
    frase: 'El cuerpo también necesita reposo: descansa en Él.',
    versiculo: { texto: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.', cita: 'Mateo 11:28' },
  },
];

export const RUTINAS_BASE: Rutina[] = [
  // ───────────────────────── PECHO ─────────────────────────
  {
    id: 'pecho-casa-1', parte: 'pecho', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: coraza', minutos: 20, objetivo: 'Técnica',
    descripcion: 'Aprende a hacer lagartijas bien hechas desde cero. Si no te sale una completa, aquí empiezas.',
    ejercicios: [
      e('Lagartijas inclinadas (manos en mesa)', 3, '10-12', 60, 'Mientras más alta la superficie, más fácil. Cuerpo recto de cabeza a talones.', 'Pecho'),
      e('Lagartijas de rodillas', 3, '8-12', 60, 'Rodillas en una toalla; baja hasta casi tocar el piso con el pecho.', 'Pecho'),
      e('Lagartijas negativas', 3, '5', 60, 'Baja en 4 segundos desde arriba; sube como puedas (de rodillas vale).', 'Pecho y tríceps'),
      e('Apretón de palmas isométrico', 3, '20 s', 30, 'Palmas juntas frente al pecho; empuja una contra otra con todo.', 'Pecho'),
      e('Aperturas en el piso con botellas', 3, '12', 45, 'Acostado, brazos abiertos con codos suaves; junta las botellas arriba.', 'Pecho'),
    ],
  },
  {
    id: 'pecho-casa-2', parte: 'pecho', lugar: 'casa', nivel: 'Intermedio', titulo: 'Coraza en casa', minutos: 25, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Variantes de lagartija para trabajar todo el pecho sin equipo.',
    ejercicios: [
      e('Lagartijas (flexiones)', 4, '10-15', 60, 'Cuerpo recto como tabla; baja hasta que el pecho casi toque el piso.', 'Pecho'),
      e('Lagartijas inclinadas (manos en silla o sillón)', 3, '12-15', 45, 'Trabaja la parte baja del pecho. Aprieta al subir.', 'Pecho bajo'),
      e('Lagartijas declinadas (pies en silla)', 3, '8-12', 60, 'Más difícil: enfoca la parte alta del pecho.', 'Pecho alto'),
      e('Lagartijas con manos abiertas', 3, '10-12', 45, 'Manos más anchas que los hombros; baja lento en 3 segundos.', 'Pecho'),
      e('Fondos en silla', 3, '10-12', 60, 'Silla firme contra la pared. Inclina el torso para usar más pecho.', 'Pecho y tríceps'),
    ],
  },
  {
    id: 'pecho-casa-3', parte: 'pecho', lugar: 'casa', nivel: 'Avanzado', titulo: 'Coraza de fuego', minutos: 35, objetivo: 'Fuerza',
    descripcion: 'Lagartijas de alto nivel, potencia y una mochila con peso. Para quien ya hace 25 lagartijas seguidas.',
    ejercicios: [
      e('Lagartijas arqueras', 4, '6-8 por lado', 90, 'Un brazo hace el trabajo y el otro va estirado de apoyo.', 'Pecho'),
      e('Lagartijas pliométricas (con palmada)', 4, '6-8', 90, 'Empuja explosivo; aterriza suave con codos flexionados.', 'Pecho (potencia)'),
      e('Lagartijas declinadas con pausa', 4, '10-12', 75, 'Pies en silla, pausa de 2 s abajo sin descansar en el piso.', 'Pecho alto'),
      e('Fondos entre dos sillas', 4, 'Al fallo', 90, 'Sillas firmes; baja hasta que el hombro quede a la altura del codo.', 'Pecho y tríceps'),
      e('Lagartijas con mochila cargada', 3, '10-12', 75, 'Mete libros o garrafas; abrocha la mochila al pecho para que no se mueva.', 'Pecho'),
      e('Lagartijas lentas 3-1-3', 1, 'Al fallo', 0, 'Final: 3 s bajando, 1 s de pausa, 3 s subiendo hasta no poder.', 'Pecho'),
    ],
  },
  {
    id: 'pecho-gym-1', parte: 'pecho', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de pecho', minutos: 40, objetivo: 'Técnica',
    descripcion: 'Máquinas guiadas para aprender a sentir el pecho con seguridad.',
    ejercicios: [
      e('Press de pecho en máquina', 3, '10-12', 90, 'Asiento a la altura del pecho medio; no despegues la espalda.', 'Pecho'),
      e('Press inclinado en máquina Smith', 3, '10-12', 90, 'Banco a 30°; la barra baja a la parte alta del pecho.', 'Pecho alto'),
      e('Aperturas en máquina (pec deck)', 3, '12-15', 60, 'Codos ligeramente flexionados; aprieta 1 segundo al cerrar.', 'Pecho'),
      e('Cruce de poleas de abajo hacia arriba', 2, '15', 60, 'Sube las manos hasta la barbilla como si dieras un abrazo.', 'Pecho alto'),
      e('Lagartijas', 2, 'Al fallo', 60, 'Cierra con tu propio peso y técnica perfecta.', 'Pecho'),
    ],
  },
  {
    id: 'pecho-gym-2', parte: 'pecho', lugar: 'gym', nivel: 'Intermedio', titulo: 'Coraza de acero', minutos: 50, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Barra, mancuernas y poleas: el clásico día de pecho bien armado.',
    ejercicios: [
      e('Press de banca con barra', 4, '8-10', 120, 'Escápulas juntas y pies firmes. Baja la barra a la mitad del pecho.', 'Pecho'),
      e('Press inclinado con mancuernas', 4, '10-12', 90, 'Banco a 30°. Junta las mancuernas arriba sin chocarlas.', 'Pecho alto'),
      e('Aperturas en máquina (pec deck)', 3, '12-15', 60, 'Codos ligeramente flexionados; aprieta 1 segundo al cerrar.', 'Pecho'),
      e('Fondos en paralelas', 3, 'Al fallo', 90, 'Inclínate hacia adelante para cargar el pecho y no solo el tríceps.', 'Pecho bajo'),
      e('Cruce de poleas', 3, '12-15', 60, 'Cruza las manos al final para una contracción completa.', 'Pecho'),
    ],
  },
  {
    id: 'pecho-gym-3', parte: 'pecho', lugar: 'gym', nivel: 'Avanzado', titulo: 'Templo de bronce', minutos: 65, objetivo: 'Fuerza',
    descripcion: 'Fuerza pesada en banca y volumen de calidad. Deja 1-2 repeticiones en reserva excepto en la última serie.',
    calentamiento: ['5 min de remo o bicicleta', 'Rotaciones de hombro con liga o palo', '2 series de banca con la barra sola x 10', 'Series de aproximación: 50% x 8, 70% x 4, 85% x 2'],
    ejercicios: [
      e('Press de banca con barra', 5, '5', 180, 'Pesado: busca 80-85% de tu máximo. Pies clavados, glúteo en el banco.', 'Pecho'),
      e('Press inclinado con barra', 4, '6-8', 150, 'Baja controlado a la clavícula; no rebotes.', 'Pecho alto'),
      e('Press plano con mancuernas', 3, '8-10', 120, 'Más rango que la barra: baja hasta sentir el estiramiento.', 'Pecho'),
      e('Fondos con lastre', 3, '6-10', 120, 'Cinturón con disco; torso inclinado al frente.', 'Pecho bajo'),
      e('Aperturas con mancuernas', 3, '12', 75, 'Arco amplio y controlado; piensa en abrazar un árbol.', 'Pecho'),
      e('Cruce de poleas (serie descendente)', 2, '12 + 12', 60, 'Al terminar baja el peso a la mitad y sigue sin descansar.', 'Pecho'),
    ],
  },

  // ───────────────────────── ESPALDA ─────────────────────────
  {
    id: 'espalda-casa-1', parte: 'espalda', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: espalda', minutos: 20, objetivo: 'Técnica',
    descripcion: 'Despierta la espalda y corrige la postura de estar sentado todo el día.',
    ejercicios: [
      e('Superman en el piso', 3, '12', 45, 'Boca abajo, levanta brazos y piernas y sostén 2 segundos.', 'Espalda baja'),
      e('Remo con toalla en el marco de la puerta', 3, '12', 60, 'Toalla alrededor del marco, inclínate atrás y jálate hacia la puerta.', 'Dorsales'),
      e('Ángeles en el piso (Y-T-W)', 3, '8 de cada una', 45, 'Boca abajo, dibuja las letras con los brazos apretando la espalda alta.', 'Espalda alta'),
      e('Remo con mochila', 3, '12', 60, 'Torso inclinado y espalda recta; jala la mochila hacia la cadera.', 'Dorsales'),
      e('Bird-dog (perro de caza)', 3, '10 por lado', 30, 'En cuatro puntos, estira brazo y pierna contrarios sin mover la cadera.', 'Zona media'),
    ],
  },
  {
    id: 'espalda-casa-2', parte: 'espalda', lugar: 'casa', nivel: 'Intermedio', titulo: 'Carga tu cruz', minutos: 25, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Remos y trabajo de espalda alta con lo que tienes en casa.',
    ejercicios: [
      e('Remo con mochila cargada', 4, '12-15', 60, 'Mete libros o garrafas. Torso inclinado, jala hacia la cadera.', 'Dorsales'),
      e('Superman en el piso', 3, '15', 45, 'Boca abajo, levanta brazos y piernas y sostén 2 segundos.', 'Espalda baja'),
      e('Remo invertido bajo una mesa', 3, '8-12', 60, 'Mesa resistente. Cuerpo recto, jala el pecho hacia la orilla.', 'Dorsales'),
      e('Ángeles en el piso (Y-T-W)', 3, '10 de cada una', 45, 'Boca abajo, dibuja las letras con los brazos apretando la espalda alta.', 'Espalda alta'),
      e('Buenos días sin peso', 3, '15', 45, 'Manos en la nuca, espalda recta, inclínate desde la cadera.', 'Espalda baja y femoral'),
    ],
  },
  {
    id: 'espalda-casa-3', parte: 'espalda', lugar: 'casa', nivel: 'Avanzado', titulo: 'Cruz pesada', minutos: 35, objetivo: 'Fuerza',
    descripcion: 'Con barra de puerta: dominadas, remo invertido difícil y espalda alta.',
    ejercicios: [
      e('Dominadas en barra de puerta', 5, 'Al fallo (5-10)', 120, 'De brazos estirados a barbilla arriba; sin patear.', 'Dorsales'),
      e('Remo invertido con pies elevados', 4, '10-12', 90, 'Pies en una silla para cargar más peso del cuerpo.', 'Espalda media'),
      e('Remo a una mano con garrafa o mochila', 4, '12 por lado', 60, 'Apoya mano y rodilla en el sillón; jala con el codo.', 'Dorsales'),
      e('Pull-over con mochila en el piso', 3, '12-15', 60, 'Acostado, lleva la mochila de atrás de la cabeza hasta el pecho con brazos casi rectos.', 'Dorsales'),
      e('Superman con pausa', 3, '12 (3 s arriba)', 45, 'Aprieta glúteo y espalda baja arriba.', 'Espalda baja'),
      e('Colgado activo en la barra', 3, '30-45 s', 60, 'Cuelga y baja los hombros lejos de las orejas.', 'Agarre y escápulas'),
    ],
  },
  {
    id: 'espalda-gym-1', parte: 'espalda', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de espalda', minutos: 40, objetivo: 'Técnica',
    descripcion: 'Poleas y máquinas para aprender a jalar con la espalda y no con los brazos.',
    ejercicios: [
      e('Jalón al pecho', 3, '10-12', 90, 'Saca el pecho, jala la barra a la clavícula y baja los codos a las costillas.', 'Dorsales'),
      e('Remo sentado en polea', 3, '10-12', 90, 'Espalda recta; lleva el agarre al ombligo y junta los omóplatos.', 'Espalda media'),
      e('Remo en máquina con apoyo de pecho', 3, '12', 60, 'El pecho no se despega del apoyo: así no haces trampa.', 'Espalda media'),
      e('Hiperextensiones', 3, '12-15', 60, 'Sube hasta quedar en línea recta, no te pases hacia atrás.', 'Espalda baja'),
      e('Face pull en polea', 2, '15', 45, 'Cuerda a la altura de la cara, abre las manos al jalar.', 'Hombro posterior'),
    ],
  },
  {
    id: 'espalda-gym-2', parte: 'espalda', lugar: 'gym', nivel: 'Intermedio', titulo: 'Espalda de guerrero', minutos: 55, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Dominadas, remos pesados y trabajo de detalle para una espalda ancha y gruesa.',
    ejercicios: [
      e('Dominadas (o jalón asistido)', 4, '6-10', 120, 'Pecho hacia la barra; baja controlado hasta estirar los brazos.', 'Dorsales'),
      e('Remo con barra', 4, '8-10', 120, 'Espalda neutra a 45°. Jala la barra hacia el ombligo.', 'Espalda media'),
      e('Jalón al pecho agarre cerrado', 3, '10-12', 90, 'Saca el pecho y lleva los codos hacia atrás y abajo.', 'Dorsales'),
      e('Remo con mancuerna a una mano', 3, '10-12 por lado', 60, 'Codo pegado al cuerpo; piensa en jalar con el codo.', 'Dorsales'),
      e('Face pull en polea', 3, '15', 60, 'Cuerda a la altura de la cara, abre las manos al jalar.', 'Hombro posterior'),
    ],
  },
  {
    id: 'espalda-gym-3', parte: 'espalda', lugar: 'gym', nivel: 'Avanzado', titulo: 'Muralla de Nehemías', minutos: 65, objetivo: 'Fuerza',
    descripcion: 'Peso muerto pesado, dominadas con lastre y remos estrictos. Reconstruye la muralla ladrillo por ladrillo.',
    calentamiento: ['5 min de remo ergómetro', '10 buenos días con barra vacía', 'Colgado en barra 30 s', 'Aproximación al peso muerto: 40% x 5, 60% x 3, 75% x 2'],
    ejercicios: [
      e('Peso muerto convencional', 5, '3-5', 180, 'Barra pegada a las espinillas; empuja el piso y bloquea con glúteo.', 'Cadena posterior'),
      e('Dominadas con lastre', 4, '5-8', 150, 'Cinturón con disco; rango completo siempre.', 'Dorsales'),
      e('Remo Pendlay', 4, '6-8', 120, 'Cada repetición parte del piso; torso paralelo al suelo.', 'Espalda media'),
      e('Remo en T', 3, '8-10', 90, 'Pecho alto; jala hacia el abdomen.', 'Espalda media'),
      e('Pull-over en polea (brazos rectos)', 3, '12-15', 60, 'Brazos casi rectos; lleva la barra a los muslos con los dorsales.', 'Dorsales'),
      e('Encogimientos con barra', 3, '10-12', 60, 'Sube hacia las orejas y pausa 1 s arriba.', 'Trapecio'),
    ],
  },

  // ───────────────────────── PIERNAS ─────────────────────────
  {
    id: 'piernas-casa-1', parte: 'piernas', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: piernas', minutos: 20, objetivo: 'Técnica',
    descripcion: 'Sentadilla bien hecha y piernas firmes, sin equipo.',
    ejercicios: [
      e('Sentadilla a la silla', 3, '12-15', 60, 'Siéntate apenas tocando la silla y levántate empujando con los talones.', 'Cuádriceps y glúteo'),
      e('Puente de glúteo', 3, '15', 45, 'Aprieta el glúteo arriba, no arquees la espalda baja.', 'Glúteo'),
      e('Zancada estática (split squat)', 3, '10 por pierna', 60, 'Pies separados como en un paso largo; sube y baja en el mismo lugar.', 'Cuádriceps'),
      e('Sentadilla isométrica en la pared', 3, '30 s', 45, 'Espalda en la pared y muslos paralelos al piso.', 'Cuádriceps'),
      e('Elevación de talones', 3, '20', 30, 'Sube lo más alto posible y baja lento.', 'Pantorrilla'),
    ],
  },
  {
    id: 'piernas-casa-2', parte: 'piernas', lugar: 'casa', nivel: 'Intermedio', titulo: 'Pies de ciervo', minutos: 30, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Trabajo unilateral y volumen para piernas fuertes sin pisar un gym.',
    ejercicios: [
      e('Sentadillas', 4, '15-20', 60, 'Pecho arriba, rodillas en línea con la punta de los pies.', 'Cuádriceps'),
      e('Zancadas alternas', 3, '12 por pierna', 60, 'Paso largo; la rodilla de atrás casi toca el piso.', 'Cuádriceps y glúteo'),
      e('Sentadilla búlgara (pie en silla)', 3, '10 por pierna', 60, 'El peso en la pierna de adelante. Baja lento.', 'Cuádriceps y glúteo'),
      e('Puente de glúteo', 4, '15-20', 45, 'Aprieta el glúteo 2 segundos arriba.', 'Glúteo'),
      e('Elevación de talones en escalón', 4, '20', 30, 'En la orilla de un escalón para más recorrido.', 'Pantorrilla'),
    ],
  },
  {
    id: 'piernas-casa-3', parte: 'piernas', lugar: 'casa', nivel: 'Avanzado', titulo: 'Monte Sion', minutos: 40, objetivo: 'Fuerza',
    descripcion: 'Pistols, nórdicos y búlgaras con peso: piernas de montaña sin máquinas.',
    ejercicios: [
      e('Sentadilla búlgara con mochila', 4, '10-12 por pierna', 90, 'Mochila al pecho o en la espalda; baja 3 s.', 'Cuádriceps y glúteo'),
      e('Sentadilla pistol asistida', 4, '5-8 por pierna', 90, 'Agárrate de una puerta y baja en una pierna lo más profundo que controles.', 'Cuádriceps'),
      e('Peso muerto rumano a una pierna', 3, '10 por pierna', 60, 'Cadera cuadrada; siente el estiramiento en la parte de atrás.', 'Femoral y glúteo'),
      e('Curl nórdico (negativas con el sofá)', 3, '5-6', 90, 'Pies atorados bajo el sofá; baja lo más lento posible y apóyate con las manos.', 'Femoral'),
      e('Sentadilla con salto', 4, '12', 60, 'Explota hacia arriba y cae suave.', 'Potencia'),
      e('Pantorrilla a una pierna en escalón', 3, '15 por pierna', 45, 'Pausa abajo, sin rebotar.', 'Pantorrilla'),
      e('Sentadilla en la pared (final)', 1, 'Al fallo', 0, 'Aguanta hasta que ya no puedas. Ora mientras aguantas.', 'Cuádriceps'),
    ],
  },
  {
    id: 'piernas-gym-1', parte: 'piernas', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de piernas', minutos: 45, objetivo: 'Técnica',
    descripcion: 'Máquinas para construir fuerza y aprender el patrón de sentadilla.',
    ejercicios: [
      e('Prensa de piernas', 3, '12', 90, 'No despegues la espalda baja ni bloquees las rodillas.', 'Cuádriceps y glúteo'),
      e('Sentadilla goblet con mancuerna', 3, '10-12', 90, 'Mancuerna pegada al pecho; codos por dentro de las rodillas al bajar.', 'Cuádriceps'),
      e('Extensión de cuádriceps', 3, '12-15', 60, 'Pausa 1 s arriba apretando.', 'Cuádriceps'),
      e('Curl femoral acostado', 3, '12', 60, 'Cadera pegada al banco; baja en 3 s.', 'Femoral'),
      e('Pantorrilla en máquina', 3, '15', 45, 'Rango completo, sin rebotar.', 'Pantorrilla'),
    ],
  },
  {
    id: 'piernas-gym-2', parte: 'piernas', lugar: 'gym', nivel: 'Intermedio', titulo: 'Piernas de Gedeón', minutos: 55, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Sentadilla hack, rumano y zancadas: volumen completo para cuádriceps, femoral y glúteo.',
    ejercicios: [
      e('Sentadilla hack o en Smith', 4, '8-10', 120, 'Pies un poco al frente; baja profundo con la espalda pegada.', 'Cuádriceps'),
      e('Peso muerto rumano con mancuernas', 4, '10', 90, 'Mancuernas pegadas a las piernas; cadera atrás.', 'Femoral y glúteo'),
      e('Zancadas caminando con mancuernas', 3, '12 por pierna', 90, 'Pasos largos y torso erguido.', 'Cuádriceps y glúteo'),
      e('Extensión de cuádriceps', 3, '12-15', 60, 'Última serie: al fallo.', 'Cuádriceps'),
      e('Curl femoral sentado', 3, '12', 60, 'Controla la vuelta.', 'Femoral'),
      e('Pantorrilla de pie', 4, '12-15', 45, 'Pausa 2 s abajo estirando.', 'Pantorrilla'),
    ],
  },
  {
    id: 'piernas-gym-3', parte: 'piernas', lugar: 'gym', nivel: 'Avanzado', titulo: 'Columnas del templo', minutos: 60, objetivo: 'Fuerza',
    descripcion: 'Sentadilla pesada y básicos. Piernas como las columnas de Jaquín y Boaz.',
    calentamiento: ['5 min de bicicleta', '10 sentadillas profundas sostenidas 2 s', '10 puentes de glúteo', 'Aproximación: barra x 10, 50% x 5, 70% x 3, 85% x 1'],
    ejercicios: [
      e('Sentadilla con barra', 4, '6-8', 150, 'Respira y bloquea el abdomen antes de bajar. Baja al menos a paralelo.', 'Cuádriceps y glúteo'),
      e('Peso muerto rumano', 4, '8-10', 120, 'Barra pegada a las piernas; siente el estiramiento en femorales.', 'Femoral'),
      e('Prensa de piernas', 3, '10-12', 90, 'No despegues la espalda baja ni bloquees las rodillas.', 'Cuádriceps'),
      e('Hip thrust con barra', 3, '10-12', 90, 'Barbilla al pecho y empuja con los talones.', 'Glúteo'),
      e('Curl femoral en máquina', 3, '12', 60, 'Baja en 3 segundos.', 'Femoral'),
      e('Pantorrilla en máquina', 4, '15', 45, 'Pausa abajo y arriba, sin rebotar.', 'Pantorrilla'),
    ],
  },

  // ───────────────────────── GLÚTEO ─────────────────────────
  {
    id: 'gluteo-casa-1', parte: 'gluteo', lugar: 'casa', nivel: 'Principiante', titulo: 'Sobre la roca', minutos: 25, objetivo: 'Técnica',
    descripcion: 'Activa y fortalece el glúteo en casa, ideal para empezar.',
    ejercicios: [
      e('Puente de glúteo', 4, '15-20', 45, 'Talones cerca de la cadera; aprieta 2 s arriba.', 'Glúteo mayor'),
      e('Patada de glúteo en cuatro puntos', 3, '15 por pierna', 30, 'Rodilla a 90° y empuja el talón hacia el techo.', 'Glúteo mayor'),
      e('Almeja (clamshell) acostado de lado', 3, '20 por lado', 30, 'Pies juntos; abre la rodilla sin girar la cadera.', 'Glúteo medio'),
      e('Sentadilla sumo', 3, '15', 45, 'Pies más abiertos que los hombros y puntas hacia fuera.', 'Glúteo y aductores'),
      e('Fire hydrant (patada lateral)', 3, '15 por lado', 30, 'En cuatro puntos, abre la rodilla al lado.', 'Glúteo medio'),
    ],
  },
  {
    id: 'gluteo-casa-2', parte: 'gluteo', lugar: 'casa', nivel: 'Avanzado', titulo: 'Cimientos firmes', minutos: 35, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Hip thrust a una pierna, búlgaras con peso y tensión constante.',
    ejercicios: [
      e('Hip thrust a una pierna en el sofá', 4, '12 por pierna', 60, 'Espalda alta en el sofá; pausa arriba 2 s.', 'Glúteo mayor'),
      e('Sentadilla búlgara con mochila (torso inclinado)', 4, '10 por pierna', 75, 'Inclínate un poco al frente para cargar el glúteo.', 'Glúteo'),
      e('Peso muerto rumano a una pierna con mochila', 3, '10 por pierna', 60, 'Cadera atrás y espalda recta.', 'Glúteo y femoral'),
      e('Puente de glúteo con mochila y pausa', 3, '15 (3 s arriba)', 45, 'Mochila sobre la cadera.', 'Glúteo mayor'),
      e('Caminata lateral en media sentadilla', 3, '20 pasos', 45, 'Con liga en las rodillas si tienes; no te levantes.', 'Glúteo medio'),
      e('Frog pumps', 2, '30', 30, 'Plantas de los pies juntas, rodillas abiertas; sube rápido apretando.', 'Glúteo'),
    ],
  },
  {
    id: 'gluteo-gym-1', parte: 'gluteo', lugar: 'gym', nivel: 'Intermedio', titulo: 'Casa sobre la roca', minutos: 50, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Hip thrust, búlgaras y poleas: la rutina de glúteo que funciona.',
    ejercicios: [
      e('Hip thrust con barra', 4, '8-12', 120, 'Espinillas verticales arriba; barbilla al pecho.', 'Glúteo mayor'),
      e('Sentadilla búlgara con mancuernas', 3, '10 por pierna', 90, 'Paso largo y torso un poco inclinado.', 'Glúteo'),
      e('Peso muerto rumano con barra', 3, '8-10', 120, 'Empuja la cadera atrás hasta sentir el estiramiento.', 'Glúteo y femoral'),
      e('Patada de glúteo en polea', 3, '12-15 por pierna', 60, 'Tobillera en la polea baja; extiende la cadera sin arquear.', 'Glúteo mayor'),
      e('Abducción en máquina', 3, '15-20', 45, 'Inclínate al frente para enfocar el glúteo medio.', 'Glúteo medio'),
      e('Hiperextensión enfocada a glúteo', 3, '15', 45, 'Espalda redondeada y pies girados hacia fuera.', 'Glúteo'),
    ],
  },
  {
    id: 'gluteo-gym-2', parte: 'gluteo', lugar: 'gym', nivel: 'Avanzado', titulo: 'Roca inconmovible', minutos: 60, objetivo: 'Fuerza',
    descripcion: 'Fuerza pesada de cadera: sentadilla profunda, hip thrust y sumo.',
    ejercicios: [
      e('Sentadilla profunda con barra', 4, '6-8', 150, 'Baja por debajo de paralelo con control.', 'Glúteo y cuádriceps'),
      e('Hip thrust pesado con pausa', 4, '6-8', 120, 'Pausa 2 s arriba en cada repetición.', 'Glúteo mayor'),
      e('Peso muerto sumo', 3, '5-6', 150, 'Pies muy abiertos; empuja las rodillas hacia fuera.', 'Glúteo y aductores'),
      e('Zancada inversa en déficit', 3, '10 por pierna', 90, 'Pie de adelante sobre un disco para más rango.', 'Glúteo'),
      e('Pull-through en polea', 3, '12-15', 60, 'De espaldas a la polea; bisagra de cadera.', 'Glúteo'),
      e('Abducción en máquina', 3, '20', 45, 'Última serie con pausas de 2 s abierto.', 'Glúteo medio'),
    ],
  },

  // ───────────────────────── HOMBROS ─────────────────────────
  {
    id: 'hombros-casa-1', parte: 'hombros', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: hombros', minutos: 18, objetivo: 'Técnica',
    descripcion: 'Hombros sanos y fuertes con botellas de agua.',
    ejercicios: [
      e('Lagartija pica inclinada (manos en silla)', 3, '8-10', 60, 'Cadera arriba; baja la cabeza hacia la silla.', 'Hombro frontal'),
      e('Elevaciones laterales con botellas', 3, '12-15', 45, 'Sube hasta la altura de los hombros; meñique un poco arriba.', 'Hombro lateral'),
      e('Elevaciones frontales con botellas', 3, '12', 45, 'Sin balancearte; sube controlado.', 'Hombro frontal'),
      e('Pájaros con botellas', 3, '12-15', 45, 'Torso inclinado; abre los brazos apretando la espalda alta.', 'Hombro posterior'),
      e('Círculos de brazos', 2, '30 s', 30, 'Brazos estirados; círculos pequeños y rápidos.', 'Hombro'),
    ],
  },
  {
    id: 'hombros-casa-2', parte: 'hombros', lugar: 'casa', nivel: 'Intermedio', titulo: 'Lleva la carga', minutos: 20, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Lagartijas pica, laterales y estabilidad para hombros redondos.',
    ejercicios: [
      e('Lagartijas pica (pike push-up)', 4, '8-12', 60, 'Cadera arriba en V; baja la cabeza entre las manos.', 'Hombro frontal'),
      e('Elevaciones laterales con botellas', 3, '15', 45, 'Botellas o garrafas con agua; sube hasta la altura de los hombros.', 'Hombro lateral'),
      e('Elevaciones frontales con mochila', 3, '12', 45, 'Sin balancearte; sube controlado.', 'Hombro frontal'),
      e('Círculos de brazos', 3, '30 s cada sentido', 30, 'Brazos estirados; círculos pequeños y rápidos.', 'Hombro'),
      e('Plancha con toque de hombro', 3, '20 toques', 45, 'Cadera quieta; no te balancees.', 'Hombro y zona media'),
    ],
  },
  {
    id: 'hombros-casa-3', parte: 'hombros', lugar: 'casa', nivel: 'Avanzado', titulo: 'Hombros de Sansón', minutos: 35, objetivo: 'Fuerza',
    descripcion: 'Parada de manos, pica con pies elevados y series descendentes.',
    ejercicios: [
      e('Parada de manos contra la pared', 4, '20-40 s', 90, 'Abdomen apretado y brazos bloqueados; mira entre las manos.', 'Hombro'),
      e('Lagartijas pica con pies elevados', 4, '6-10', 90, 'Pies en silla; torso lo más vertical posible.', 'Hombro frontal'),
      e('Press de hombro con mochila de pie', 3, '10-12', 75, 'Agarra la mochila de las correas; empuja sobre la cabeza.', 'Hombro'),
      e('Laterales con garrafa (serie descendente)', 4, '15 + al fallo', 45, 'Al terminar suelta peso y sigue sin descansar.', 'Hombro lateral'),
      e('Elevación en Y boca abajo', 3, '12', 45, 'Pulgares arriba; sube los brazos en Y.', 'Hombro posterior'),
      e('Plancha con toque de hombro', 3, '30 toques', 45, 'Pies juntos para más difícil.', 'Hombro y zona media'),
    ],
  },
  {
    id: 'hombros-gym-1', parte: 'hombros', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de hombros', minutos: 35, objetivo: 'Técnica',
    descripcion: 'Máquinas y poleas para hombros sin lastimarte.',
    ejercicios: [
      e('Press de hombro en máquina', 3, '10-12', 90, 'Agarre a la altura de los hombros; no arquees la espalda.', 'Hombro frontal'),
      e('Elevaciones laterales con mancuernas', 3, '12-15', 60, 'Peso ligero, técnica perfecta.', 'Hombro lateral'),
      e('Pec deck inverso', 3, '15', 60, 'Abre los brazos apretando la espalda alta.', 'Hombro posterior'),
      e('Elevación frontal en polea', 2, '12', 45, 'Sube hasta la altura de los ojos.', 'Hombro frontal'),
      e('Face pull en polea', 2, '15', 45, 'Lleva la cuerda a la frente con codos altos.', 'Hombro posterior'),
    ],
  },
  {
    id: 'hombros-gym-2', parte: 'hombros', lugar: 'gym', nivel: 'Intermedio', titulo: 'Hombros de bronce', minutos: 45, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Press, laterales y deltoide posterior: hombros completos.',
    ejercicios: [
      e('Press militar con barra', 4, '8-10', 120, 'Abdomen y glúteo apretados para proteger la espalda baja.', 'Hombro frontal'),
      e('Elevaciones laterales con mancuernas', 4, '12-15', 60, 'Codos ligeramente doblados; sube con los codos, no con las manos.', 'Hombro lateral'),
      e('Press Arnold', 3, '10', 90, 'Gira las palmas mientras subes.', 'Hombro'),
      e('Pájaros (deltoide posterior)', 3, '15', 60, 'Torso inclinado; abre los brazos apretando la espalda alta.', 'Hombro posterior'),
      e('Encogimientos con mancuernas', 3, '12-15', 60, 'Sube los hombros hacia las orejas y pausa.', 'Trapecio'),
    ],
  },
  {
    id: 'hombros-gym-3', parte: 'hombros', lugar: 'gym', nivel: 'Avanzado', titulo: 'Hombros de acero', minutos: 55, objetivo: 'Fuerza',
    descripcion: 'Press pesado de pie y volumen alto de laterales.',
    ejercicios: [
      e('Press militar de pie con barra', 5, '5', 150, 'Glúteo apretado; mete la cabeza al pasar la barra.', 'Hombro'),
      e('Press con mancuernas sentado', 3, '8-10', 120, 'Baja hasta la altura de las orejas.', 'Hombro frontal'),
      e('Elevación lateral en polea a un brazo', 4, '12-15', 60, 'La polea cruza por detrás del cuerpo.', 'Hombro lateral'),
      e('Laterales con mancuernas (triple descendente)', 3, '10 + 10 + 10', 75, 'Tres pesos seguidos sin descansar.', 'Hombro lateral'),
      e('Remo al mentón agarre ancho', 3, '10-12', 75, 'Agarre ancho y solo hasta el pecho para cuidar el hombro.', 'Hombro y trapecio'),
      e('Face pull con rotación externa', 3, '15', 60, 'Al final, gira los puños hacia atrás como mostrando bíceps.', 'Hombro posterior'),
    ],
  },

  // ───────────────────────── BRAZOS ─────────────────────────
  {
    id: 'brazos-casa-1', parte: 'brazos', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: brazos', minutos: 15, objetivo: 'Técnica',
    descripcion: 'Bíceps y tríceps con mochila, botellas y una toalla.',
    ejercicios: [
      e('Lagartijas cerradas de rodillas', 3, '10', 60, 'Manos debajo de los hombros y codos pegados.', 'Tríceps'),
      e('Curl con mochila', 3, '12', 45, 'Codos fijos a los lados; baja lento.', 'Bíceps'),
      e('Fondos en silla con rodillas dobladas', 3, '10', 60, 'Torso vertical; baja hasta 90° de codo.', 'Tríceps'),
      e('Curl martillo con botellas', 3, '12', 45, 'Palmas mirándose entre sí.', 'Bíceps y antebrazo'),
      e('Curl isométrico con toalla', 3, '20 s', 30, 'Pisa la toalla y jala con todo a 90° de codo.', 'Bíceps'),
    ],
  },
  {
    id: 'brazos-casa-2', parte: 'brazos', lugar: 'casa', nivel: 'Intermedio', titulo: 'Manos para la batalla', minutos: 20, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Diamante, fondos y curls con lo que tienes a la mano.',
    ejercicios: [
      e('Lagartijas diamante', 4, '8-12', 60, 'Manos juntas formando un diamante; codos pegados al cuerpo.', 'Tríceps'),
      e('Curl con mochila o garrafas', 4, '12-15', 45, 'Codos fijos a los lados; baja lento.', 'Bíceps'),
      e('Fondos en silla', 3, '12-15', 60, 'Torso vertical para cargar el tríceps.', 'Tríceps'),
      e('Curl martillo con botellas', 3, '12', 45, 'Palmas mirándose entre sí.', 'Bíceps y antebrazo'),
      e('Extensión de tríceps en el piso', 3, '10', 45, 'Desde plancha sobre antebrazos, empuja hasta estirar los brazos.', 'Tríceps'),
    ],
  },
  {
    id: 'brazos-casa-3', parte: 'brazos', lugar: 'casa', nivel: 'Avanzado', titulo: 'Arco de bronce', minutos: 35, objetivo: 'Hipertrofia',
    descripcion: 'Dominadas supinas, 21s y fondos con pies elevados. Brazos para entesar el arco de bronce.',
    ejercicios: [
      e('Dominadas supinas (chin-ups)', 4, '6-10', 90, 'Palmas hacia ti; baja completamente estirado.', 'Bíceps y dorsales'),
      e('Lagartijas diamante con pausa', 4, '10-15', 60, 'Pausa 1 s abajo sin tocar el piso.', 'Tríceps'),
      e('Fondos entre sillas con pies elevados', 4, '12-15', 60, 'Pies en otra silla para más carga.', 'Tríceps'),
      e('Curl 21s con garrafa', 3, '21', 60, '7 abajo-mitad, 7 mitad-arriba y 7 completas.', 'Bíceps'),
      e('Extensión sobre la cabeza con mochila', 3, '12-15', 45, 'Codos apuntando al techo; estira bien atrás.', 'Tríceps cabeza larga'),
      e('Curl concentrado con mochila', 3, '12 por brazo', 45, 'Codo apoyado en el muslo; aprieta arriba.', 'Bíceps'),
    ],
  },
  {
    id: 'brazos-gym-1', parte: 'brazos', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de brazos', minutos: 35, objetivo: 'Técnica',
    descripcion: 'Curls y extensiones con técnica limpia.',
    ejercicios: [
      e('Curl alterno con mancuernas', 3, '10-12', 60, 'Gira la palma hacia arriba al subir.', 'Bíceps'),
      e('Jalón de tríceps en polea con barra', 3, '12', 60, 'Codos pegados; solo se mueve el antebrazo.', 'Tríceps'),
      e('Curl en máquina predicador', 3, '12', 60, 'Baja hasta casi estirar el brazo.', 'Bíceps'),
      e('Extensión de tríceps con mancuerna a dos manos', 3, '12', 60, 'Sentado, mancuerna detrás de la cabeza.', 'Tríceps'),
      e('Curl martillo', 2, '12', 45, 'Palmas mirándose entre sí.', 'Braquial'),
    ],
  },
  {
    id: 'brazos-gym-2', parte: 'brazos', lugar: 'gym', nivel: 'Intermedio', titulo: 'Brazos de guerra', minutos: 45, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Barra, mancuernas y poleas para bíceps y tríceps completos.',
    ejercicios: [
      e('Curl con barra', 4, '8-10', 90, 'Sin columpiarte; codos quietos.', 'Bíceps'),
      e('Press francés con barra Z', 4, '10', 90, 'Baja la barra a la frente con codos apuntando arriba.', 'Tríceps'),
      e('Curl inclinado con mancuernas', 3, '10-12', 60, 'Brazos colgando detrás del cuerpo para más estiramiento.', 'Bíceps'),
      e('Jalón de tríceps en polea con cuerda', 3, '12-15', 60, 'Abre la cuerda al final.', 'Tríceps'),
      e('Curl martillo', 3, '12', 60, 'Trabaja antebrazo y braquial.', 'Braquial'),
      e('Fondos en banco con peso', 3, 'Al fallo', 60, 'Disco en las piernas si ya es fácil.', 'Tríceps'),
    ],
  },
  {
    id: 'brazos-gym-3', parte: 'brazos', lugar: 'gym', nivel: 'Avanzado', titulo: 'Quebrar el arco', minutos: 50, objetivo: 'Fuerza',
    descripcion: 'Básicos pesados para brazos y superseries para terminar.',
    ejercicios: [
      e('Press de banca agarre cerrado', 4, '6-8', 120, 'Manos al ancho de hombros; codos cerca del cuerpo.', 'Tríceps'),
      e('Curl con barra recta', 4, '6-8', 90, 'Pesado y estricto, espalda en la pared si hace falta.', 'Bíceps'),
      e('Fondos con lastre en paralelas', 3, '8-10', 90, 'Torso vertical para el tríceps.', 'Tríceps'),
      e('Curl predicador con barra Z', 3, '10', 75, 'Baja controlado sin soltar la tensión.', 'Bíceps'),
      e('Extensión en polea sobre la cabeza', 3, '12', 60, 'De espaldas a la polea; estira bien.', 'Tríceps cabeza larga'),
      e('Curl bayesiano en polea', 3, '12', 60, 'De espaldas a la polea baja, brazo atrás del cuerpo.', 'Bíceps'),
      e('Superserie: martillo + jalón con cuerda', 2, '12 + 12', 60, 'Uno tras otro sin descansar.', 'Brazos'),
    ],
  },

  // ───────────────────────── ABDOMEN ─────────────────────────
  {
    id: 'abdomen-casa-1', parte: 'abdomen', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: abdomen', minutos: 12, objetivo: 'Técnica',
    descripcion: 'Zona media firme y espalda baja protegida.',
    ejercicios: [
      e('Dead bug (bicho muerto)', 3, '10 por lado', 30, 'Espalda baja pegada al piso todo el tiempo.', 'Abdomen profundo'),
      e('Plancha', 3, '20-30 s', 30, 'Glúteo apretado; no dejes caer la cadera.', 'Zona media'),
      e('Crunch', 3, '15', 30, 'Sube con el abdomen, no jales del cuello.', 'Recto abdominal'),
      e('Elevación de rodillas acostado', 3, '12', 30, 'Rodillas dobladas; lleva las rodillas al pecho.', 'Abdomen bajo'),
      e('Plancha lateral de rodillas', 2, '20 s por lado', 30, 'Cadera arriba en línea recta.', 'Oblicuos'),
    ],
  },
  {
    id: 'abdomen-casa-2', parte: 'abdomen', lugar: 'casa', nivel: 'Intermedio', titulo: 'Dominio propio', minutos: 15, objetivo: 'Resistencia', destacada: true,
    descripcion: 'Circuito de abdomen completo en 15 minutos.',
    ejercicios: [
      e('Plancha', 3, '30-45 s', 30, 'Glúteo apretado; no dejes caer la cadera.', 'Zona media'),
      e('Crunch', 3, '20', 30, 'Sube con el abdomen, no jales del cuello.', 'Recto abdominal'),
      e('Elevación de piernas acostado', 3, '12-15', 45, 'Espalda baja pegada al piso.', 'Abdomen bajo'),
      e('Bicicleta', 3, '30 s', 30, 'Codo hacia la rodilla contraria, lento y controlado.', 'Oblicuos'),
      e('Escaladores (mountain climbers)', 3, '30 s', 30, 'Rápido, con la cadera baja.', 'Zona media'),
      e('Plancha lateral', 2, '30 s por lado', 30, 'Cuerpo en línea recta.', 'Oblicuos'),
    ],
  },
  {
    id: 'abdomen-casa-3', parte: 'abdomen', lugar: 'casa', nivel: 'Avanzado', titulo: 'Templo firme', minutos: 25, objetivo: 'Fuerza',
    descripcion: 'Hollow, V-ups y dragon flag: abdomen de gimnasta.',
    ejercicios: [
      e('Hollow hold (barquito)', 4, '30-45 s', 30, 'Espalda baja pegada, brazos y piernas estirados cerca del piso.', 'Abdomen'),
      e('V-ups', 4, '12-15', 45, 'Toca los pies arriba y baja sin descansar.', 'Recto abdominal'),
      e('Plancha RKC (máxima tensión)', 3, '20 s', 45, 'Aprieta todo como si te fueran a golpear el abdomen.', 'Zona media'),
      e('Dragon flag negativas (agarrado del sofá)', 3, '5', 60, 'Cuerpo recto; baja lo más lento posible.', 'Abdomen'),
      e('Plancha lateral con elevación de cadera', 3, '12 por lado', 30, 'Baja la cadera y sube con los oblicuos.', 'Oblicuos'),
      e('Escaladores cruzados', 3, '40 s', 30, 'Rodilla al codo contrario.', 'Oblicuos'),
    ],
  },
  {
    id: 'abdomen-gym-1', parte: 'abdomen', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de abdomen', minutos: 15, objetivo: 'Técnica',
    descripcion: 'Para terminar cualquier día de gym.',
    ejercicios: [
      e('Crunch en máquina', 3, '12-15', 45, 'Enróllate; no jales con los brazos.', 'Recto abdominal'),
      e('Elevación de rodillas en silla romana', 3, '10-12', 45, 'Espalda pegada al respaldo.', 'Abdomen bajo'),
      e('Plancha', 3, '30-45 s', 30, 'Línea recta de cabeza a talones.', 'Zona media'),
      e('Giros rusos con disco', 3, '20', 30, 'Gira desde el torso, no solo los brazos.', 'Oblicuos'),
    ],
  },
  {
    id: 'abdomen-gym-2', parte: 'abdomen', lugar: 'gym', nivel: 'Intermedio', titulo: 'Centro de acero', minutos: 25, objetivo: 'Hipertrofia', destacada: true,
    descripcion: 'Abdomen con carga: colgado, polea y rueda.',
    ejercicios: [
      e('Elevación de piernas colgado', 4, '10-12', 60, 'Sin balanceo; sube las rodillas al pecho o las piernas rectas.', 'Abdomen bajo'),
      e('Crunch en polea alta (de rodillas)', 4, '12-15', 60, 'Enróllate llevando los codos a las rodillas.', 'Recto abdominal'),
      e('Rueda abdominal', 3, '8-12', 60, 'Desde rodillas; avanza solo hasta donde controles la espalda.', 'Zona media'),
      e('Pallof press en polea', 3, '12 por lado', 45, 'Resiste el giro: el abdomen trabaja para no moverte.', 'Oblicuos'),
      e('Plancha con peso', 3, '45 s', 45, 'Disco en la espalda, con ayuda de alguien.', 'Zona media'),
    ],
  },
  {
    id: 'abdomen-gym-3', parte: 'abdomen', lugar: 'gym', nivel: 'Avanzado', titulo: 'Núcleo de hierro', minutos: 30, objetivo: 'Fuerza',
    descripcion: 'Zona media de atleta: carga, anti-rotación y agarre.',
    ejercicios: [
      e('Pies a la barra colgado (toes to bar)', 4, '8-12', 75, 'Sube los pies hasta tocar la barra sin columpiarte.', 'Abdomen'),
      e('Rueda abdominal larga', 4, '8-10', 75, 'Desde rodillas al máximo rango o de pie si puedes.', 'Zona media'),
      e('Crunch en polea pesado', 4, '10-12', 60, 'Pesado pero sin jalar con los brazos.', 'Recto abdominal'),
      e('Leñador en polea (alto a bajo)', 3, '12 por lado', 45, 'Gira desde el torso con brazos estirados.', 'Oblicuos'),
      e('Caminata del granjero', 3, '40 m', 75, 'Mancuernas pesadas; camina erguido y lento.', 'Zona media y agarre'),
      e('Plancha Copenhague', 3, '20 s por lado', 45, 'Pierna de arriba en el banco; sostén la cadera alta.', 'Oblicuos y aductores'),
    ],
  },

  // ───────────────────────── CUERPO COMPLETO ─────────────────────────
  {
    id: 'completo-casa-1', parte: 'completo', lugar: 'casa', nivel: 'Principiante', titulo: 'Primeros pasos: todo el cuerpo', minutos: 20, objetivo: 'Resistencia',
    descripcion: 'Si solo vas a entrenar 3 días a la semana, empieza aquí.',
    ejercicios: [
      e('Sentadillas', 3, '12', 45, 'Pecho arriba, cadera atrás.', 'Piernas'),
      e('Lagartijas inclinadas', 3, '10', 45, 'Manos en mesa o sillón.', 'Pecho'),
      e('Remo con mochila', 3, '12', 45, 'Espalda recta; jala hacia la cadera.', 'Espalda'),
      e('Zancada hacia atrás', 3, '8 por pierna', 45, 'Da el paso atrás y baja controlado.', 'Piernas'),
      e('Plancha', 3, '20-30 s', 30, 'Cadera alineada.', 'Zona media'),
      e('Marcha con rodillas altas', 3, '30 s', 30, 'Brazos activos; respira.', 'Cardio'),
    ],
  },
  {
    id: 'completo-casa-2', parte: 'completo', lugar: 'casa', nivel: 'Intermedio', titulo: 'La carrera (circuito)', minutos: 25, objetivo: 'Quemar grasa', destacada: true,
    descripcion: 'Circuito intenso de cuerpo completo para sudar en casa.',
    ejercicios: [
      e('Burpees', 4, '10', 45, 'Pecho al piso y salto arriba con las manos al cielo.', 'Todo el cuerpo'),
      e('Sentadilla con salto', 4, '15', 45, 'Cae suave, con las rodillas flexionadas.', 'Piernas'),
      e('Lagartijas', 4, '12', 45, 'Rango completo.', 'Pecho'),
      e('Escaladores', 4, '30 s', 30, 'Mantén el ritmo.', 'Zona media'),
      e('Jumping jacks', 4, '40', 30, 'Cardio para cerrar fuerte.', 'Cardio'),
    ],
  },
  {
    id: 'completo-casa-3', parte: 'completo', lugar: 'casa', nivel: 'Avanzado', titulo: 'Guerra espiritual (EMOM)', minutos: 30, objetivo: 'Resistencia',
    descripcion: 'Cada serie empieza al inicio de cada minuto: lo que te sobre del minuto es tu descanso.',
    ejercicios: [
      e('Thrusters con mochila', 5, '12', 60, 'Sentadilla y al subir empuja la mochila sobre la cabeza.', 'Todo el cuerpo'),
      e('Burpees con salto alto', 5, '10', 60, 'Rodillas al pecho en el salto.', 'Todo el cuerpo'),
      e('Zancadas con salto', 5, '10 por pierna', 60, 'Cambia de pierna en el aire.', 'Piernas'),
      e('Dominadas o remo invertido', 5, '8', 60, 'Barra de puerta o bajo una mesa.', 'Espalda'),
      e('Lagartijas pliométricas', 5, '8', 60, 'Explosivas.', 'Pecho'),
      e('Plancha (final)', 1, 'Al fallo', 0, 'Cierra con todo lo que te quede.', 'Zona media'),
    ],
  },
  {
    id: 'completo-gym-1', parte: 'completo', lugar: 'gym', nivel: 'Principiante', titulo: 'Base de cuerpo completo', minutos: 45, objetivo: 'Técnica',
    descripcion: 'Rutina para tus primeras semanas en el gym, 3 veces por semana.',
    ejercicios: [
      e('Sentadilla goblet', 3, '10-12', 90, 'Mancuerna pegada al pecho.', 'Piernas'),
      e('Press de pecho en máquina', 3, '10-12', 75, 'Espalda pegada al respaldo.', 'Pecho'),
      e('Jalón al pecho', 3, '10-12', 75, 'Jala con los codos, no con las manos.', 'Espalda'),
      e('Peso muerto rumano con mancuernas', 3, '10', 90, 'Espalda recta, cadera atrás.', 'Femoral y glúteo'),
      e('Press de hombro con mancuernas', 2, '10-12', 75, 'Sentado con respaldo.', 'Hombros'),
      e('Plancha', 2, '30 s', 30, 'Línea recta.', 'Zona media'),
    ],
  },
  {
    id: 'completo-gym-2', parte: 'completo', lugar: 'gym', nivel: 'Intermedio', titulo: 'Armadura completa', minutos: 55, objetivo: 'Fuerza', destacada: true,
    descripcion: 'Los básicos con barra en una sola sesión. Ideal 3 días por semana (lunes, miércoles, viernes).',
    ejercicios: [
      e('Sentadilla con barra', 4, '6-8', 150, 'Abdomen bloqueado; baja a paralelo.', 'Piernas'),
      e('Press de banca', 4, '6-8', 120, 'Escápulas juntas.', 'Pecho'),
      e('Remo con barra', 4, '8', 120, 'Torso a 45°.', 'Espalda'),
      e('Press militar', 3, '8-10', 90, 'Glúteo apretado.', 'Hombros'),
      e('Peso muerto rumano', 3, '8-10', 120, 'Siente el femoral.', 'Femoral'),
      e('Caminata del granjero', 3, '40 m', 60, 'Pesado y erguido.', 'Agarre y zona media'),
    ],
  },
  {
    id: 'completo-gym-3', parte: 'completo', lugar: 'gym', nivel: 'Avanzado', titulo: 'Guerra total', minutos: 50, objetivo: 'Fuerza',
    descripcion: 'Peso muerto, banca y dominadas con un final de cardio que pone a prueba la fe.',
    ejercicios: [
      e('Peso muerto', 4, '5', 150, 'Espalda neutra; empuja el piso con los pies.', 'Cadena posterior'),
      e('Press de banca', 3, '8', 120, 'Control en la bajada.', 'Pecho'),
      e('Dominadas', 3, 'Al fallo', 90, 'Completas, de brazos estirados a barbilla arriba.', 'Espalda'),
      e('Zancadas con mancuernas', 3, '10 por pierna', 90, 'Torso erguido.', 'Piernas'),
      e('Kettlebell swing', 3, '15', 60, 'La fuerza sale de la cadera, no de los brazos.', 'Cadera'),
      e('Remo en máquina (cardio)', 1, '5 min', 0, 'Final a ritmo fuerte.', 'Cardio'),
    ],
  },

  // ───────────────────────── CARDIO Y HIIT ─────────────────────────
  {
    id: 'cardio-casa-1', parte: 'cardio', lugar: 'casa', nivel: 'Principiante', titulo: 'Primera vuelta', minutos: 15, objetivo: 'Quemar grasa',
    descripcion: 'Cardio de bajo impacto: sin saltos, cuida rodillas y vecinos.',
    calentamiento: ['1 min de caminar en el lugar', '10 círculos de brazos', '10 rotaciones de cadera'],
    ejercicios: [
      e('Marcha con rodillas altas', 3, '40 s', 20, 'Sube las rodillas a la cadera; brazos activos.', 'Cardio'),
      e('Jumping jacks sin salto', 3, '30 s', 20, 'Paso al lado mientras subes los brazos.', 'Cardio'),
      e('Sentadilla al aire', 3, '30 s', 20, 'Ritmo constante.', 'Piernas'),
      e('Boxeo de sombra', 3, '40 s', 20, 'Golpes rápidos al frente; mueve los pies.', 'Cardio y hombros'),
      e('Escaladores lentos', 3, '20 s', 20, 'Lleva una rodilla al pecho a la vez.', 'Zona media'),
    ],
  },
  {
    id: 'cardio-casa-2', parte: 'cardio', lugar: 'casa', nivel: 'Intermedio', titulo: 'Tabata del estadio', minutos: 20, objetivo: 'Quemar grasa', destacada: true,
    descripcion: '4 bloques Tabata: 20 s a tope y 10 s de descanso, 8 veces. Descansa 1 min entre bloques.',
    ejercicios: [
      e('Burpees', 8, '20 s', 10, 'A tope los 20 s; respira en los 10 s.', 'Todo el cuerpo'),
      e('Sentadilla con salto', 8, '20 s', 10, 'Cae suave.', 'Piernas'),
      e('Escaladores', 8, '20 s', 10, 'Cadera baja y rápido.', 'Zona media'),
      e('Saltos de patinador', 8, '20 s', 10, 'Salta de lado a lado cayendo en una pierna.', 'Piernas y equilibrio'),
    ],
  },
  {
    id: 'cardio-casa-3', parte: 'cardio', lugar: 'casa', nivel: 'Avanzado', titulo: 'Corre por el premio', minutos: 30, objetivo: 'Quemar grasa',
    descripcion: 'HIIT largo y exigente. Mide tu respiración: al final de cada bloque casi no deberías poder hablar.',
    ejercicios: [
      e('Burpees con salto lateral', 5, '45 s', 15, 'Burpee y salto al lado de una línea imaginaria.', 'Todo el cuerpo'),
      e('Sprint en el lugar', 5, '30 s', 15, 'Rodillas altas a máxima velocidad.', 'Cardio'),
      e('Lagartija + 2 escaladores', 5, '40 s', 20, 'Una lagartija y dos escaladores, sin parar.', 'Todo el cuerpo'),
      e('Zancadas con salto', 5, '40 s', 20, 'Cambia de pierna en el aire.', 'Piernas'),
      e('Plancha con jack', 5, '40 s', 20, 'En plancha, abre y cierra los pies saltando.', 'Zona media'),
      e('Jumping jacks (final)', 1, '2 min', 0, 'Termina sin parar.', 'Cardio'),
    ],
  },
  {
    id: 'cardio-gym-1', parte: 'cardio', lugar: 'gym', nivel: 'Intermedio', titulo: 'Intervalos en caminadora', minutos: 30, objetivo: 'Quemar grasa', destacada: true,
    descripcion: 'Intervalos en máquinas: corto, intenso y muy efectivo.',
    ejercicios: [
      e('Caminata inclinada (calentar)', 1, '5 min', 0, 'Inclinación 8-10%, ritmo cómodo.', 'Cardio'),
      e('Sprint en caminadora', 8, '30 s', 60, 'Rápido de verdad; descansa caminando o sobre los rieles.', 'Cardio'),
      e('Bicicleta estática a tope', 6, '40 s', 40, 'Resistencia alta y pedaleo rápido.', 'Piernas y cardio'),
      e('Remo ergómetro', 1, '500 m', 60, 'Piernas, cadera y brazos en ese orden.', 'Todo el cuerpo'),
      e('Caminata suave (enfriar)', 1, '5 min', 0, 'Baja las pulsaciones y da gracias.', 'Recuperación'),
    ],
  },
  {
    id: 'cardio-gym-2', parte: 'cardio', lugar: 'gym', nivel: 'Avanzado', titulo: 'Metcon del guerrero', minutos: 35, objetivo: 'Resistencia',
    descripcion: 'Acondicionamiento metabólico con kettlebell, cajón, cuerdas y remo.',
    ejercicios: [
      e('Kettlebell swing', 5, '20', 45, 'Cadera explosiva; brazos solo guían.', 'Cadera'),
      e('Wall balls', 5, '15', 45, 'Sentadilla y lanza el balón al objetivo.', 'Todo el cuerpo'),
      e('Saltos al cajón', 5, '10', 45, 'Cae suave arriba y baja caminando.', 'Potencia'),
      e('Remo ergómetro', 5, '250 m', 60, 'A ritmo fuerte.', 'Cardio'),
      e('Cuerdas de batalla', 5, '30 s', 30, 'Ondas rápidas con las dos manos.', 'Hombros y cardio'),
      e('Caminata del granjero', 3, '40 m', 60, 'Pesado al final para la mente.', 'Agarre'),
    ],
  },

  // ───────────────────────── MOVILIDAD ─────────────────────────
  {
    id: 'movilidad-casa-1', parte: 'movilidad', lugar: 'casa', nivel: 'Principiante', titulo: 'Venid a mí (estiramiento)', minutos: 15, objetivo: 'Movilidad', destacada: true,
    descripcion: 'Estiramiento suave para tus días de descanso o antes de dormir. Respira lento y ora.',
    calentamiento: ['1 min de respiración profunda: 4 s inhalar, 6 s exhalar'],
    ejercicios: [
      e('Gato-camello', 2, '10', 15, 'En cuatro puntos, redondea y arquea la espalda lento.', 'Columna'),
      e('Postura del niño', 2, '45 s', 15, 'Rodillas abiertas y brazos estirados al frente.', 'Espalda'),
      e('Estiramiento de flexor de cadera', 2, '40 s por lado', 15, 'En zancada con rodilla en el piso, empuja la cadera al frente.', 'Cadera'),
      e('Estiramiento de femoral sentado', 2, '40 s', 15, 'Piernas estiradas; lleva el pecho a las rodillas.', 'Femoral'),
      e('Libro abierto (rotación torácica)', 2, '10 por lado', 15, 'Acostado de lado, abre el brazo de arriba siguiendo la mano con la mirada.', 'Espalda alta'),
      e('Estiramiento de pecho en el marco de la puerta', 2, '30 s por lado', 15, 'Antebrazo en el marco y gira el torso al lado contrario.', 'Pecho'),
    ],
  },
  {
    id: 'movilidad-casa-2', parte: 'movilidad', lugar: 'casa', nivel: 'Intermedio', titulo: 'Movilidad del guerrero', minutos: 20, objetivo: 'Movilidad',
    descripcion: 'Movilidad activa de cadera, hombros y columna. Perfecta como calentamiento largo.',
    ejercicios: [
      e('Sentadilla profunda sostenida', 3, '45 s', 15, 'Talones en el piso; empuja las rodillas con los codos.', 'Cadera y tobillos'),
      e('90/90 de cadera', 3, '8 por lado', 15, 'Sentado con las dos piernas a 90°; cambia de lado sin manos si puedes.', 'Cadera'),
      e('Dislocaciones con palo de escoba', 3, '10', 15, 'Agarre ancho; pasa el palo de enfrente hacia atrás con brazos rectos.', 'Hombros'),
      e('Gusano (inchworm)', 3, '6', 20, 'Camina con las manos hasta plancha y regresa.', 'Cadena posterior'),
      e('El mejor estiramiento del mundo', 3, '5 por lado', 15, 'Zancada, codo al piso y rota abriendo el brazo al cielo.', 'Todo el cuerpo'),
      e('Puente de glúteo con pausa', 2, '10', 15, 'Pausa 3 s arriba.', 'Glúteo'),
    ],
  },
  {
    id: 'movilidad-gym-1', parte: 'movilidad', lugar: 'gym', nivel: 'Principiante', titulo: 'Recuperación activa', minutos: 25, objetivo: 'Movilidad', destacada: true,
    descripcion: 'Para el día después de piernas o espalda: suelta, recupera y vuelve más fuerte.',
    ejercicios: [
      e('Bicicleta suave', 1, '8 min', 0, 'Ritmo de conversación.', 'Recuperación'),
      e('Rodillo de espuma en piernas', 1, '3 min', 0, 'Cuádriceps, femoral y pantorrilla; detente en los puntos tensos.', 'Piernas'),
      e('Rodillo de espuma en espalda alta', 1, '2 min', 0, 'Brazos cruzados; rueda de omóplatos a media espalda.', 'Espalda alta'),
      e('Dislocaciones con liga', 2, '12', 15, 'Brazos rectos de adelante hacia atrás.', 'Hombros'),
      e('Colgado pasivo en barra', 3, '30 s', 30, 'Suelta los hombros y respira: descomprime la columna.', 'Columna y hombros'),
      e('Estiramiento de pantorrilla en escalón', 2, '40 s', 15, 'Talón abajo de la orilla.', 'Pantorrilla'),
    ],
  },
];

export const DEFAULT_RUTINAS: RutinasData = { partes: PARTES_BASE, rutinas: RUTINAS_BASE };

// Dia del año local: una parte del cuerpo por dia, igual para todos
const diaLocal = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);

export const rutinasVisibles = (data: RutinasData, parte: string, lugar: Lugar): Rutina[] =>
  data.rutinas
    .filter(r => r.parte === parte && r.lugar === lugar && !r.oculta)
    .sort((a, b) => NIVELES.indexOf(a.nivel) - NIVELES.indexOf(b.nivel));

// Solo cuentan para "hoy" las partes que tienen alguna rutina publicada
export const parteDelDia = (data: RutinasData): ParteCuerpo => {
  const conRutinas = data.partes.filter(p => data.rutinas.some(r => r.parte === p.id && !r.oculta));
  const lista = conRutinas.length ? conRutinas : data.partes;
  return lista[diaLocal() % lista.length];
};

// La rutina que se abre primero: la destacada, si no la intermedia, si no la primera
export const rutinaPrincipal = (data: RutinasData, parte: string, lugar: Lugar): Rutina | undefined => {
  const list = rutinasVisibles(data, parte, lugar);
  return list.find(r => r.destacada) || list.find(r => r.nivel === 'Intermedio') || list[0];
};
