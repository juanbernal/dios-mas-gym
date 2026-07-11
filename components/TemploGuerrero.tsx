import React, { useState } from 'react';
import { MusicItem } from '../types';

interface TemploGuerreroProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

interface EstadoCombate {
  key: string;
  emoji: string;
  titulo: string;
  descripcion: string;
  mensaje: string;
  versiculo: string;
  cita: string;
  color: string;
}

const ESTADOS: EstadoCombate[] = [
  {
    key: 'bajo_fuego',
    emoji: '⚔️',
    titulo: 'Bajo Fuego',
    descripcion: 'Debilidad o pruebas difíciles en el frente.',
    mensaje: 'En las batallas más duras, cuando sientes que no quedan fuerzas, recuerda que no peleas con tus armas humanas, sino con el poder del Altísimo. ¡Vuelve a levantarte, guerrero!',
    versiculo: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.',
    cita: 'ISAÍAS 41:10',
    color: '#ff4b2b'
  },
  {
    key: 'fuerza_maxima',
    emoji: '🏋️‍♂️',
    titulo: 'Fuerza Máxima',
    descripcion: 'Listo para entrenar y romper límites.',
    mensaje: 'El entrenamiento físico es el templo de tu espíritu. La disciplina edifica el carácter de un soldado de fe. ¡Es hora de empujar la barra para la gloria de Dios!',
    versiculo: 'Todo lo puedo en Cristo que me fortalece.',
    cita: 'FILIPENSES 4:13',
    color: '#2563a8'
  },
  {
    key: 'escudo_fe',
    emoji: '🛡️',
    titulo: 'Escudo de Fe',
    descripcion: 'Batallando contra la duda o la ansiedad.',
    mensaje: 'Cuando la mente se llene de ruidos y el enemigo intente sembrar ansiedad, levanta el escudo de la fe. Tu paz ya está firmada y tu victoria garantizada.',
    versiculo: 'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?',
    cita: 'SALMOS 27:1',
    color: '#3b82f6'
  },
  {
    key: 'victoria',
    emoji: '👑',
    titulo: 'Victoria',
    descripcion: 'Avanzando con gratitud y alabanza.',
    mensaje: 'Para avanzar con paso firme, el soldado debe escuchar la voz de su General. Camina con valentía en la victoria que ya te fue otorgada.',
    versiculo: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.',
    cita: 'JOSUÉ 1:9',
    color: '#10b981'
  }
];


const LIBROS_DATOS: Record<string, { apiName: string; prettyName: string; chapters: number }> = {
  genesis: { apiName: "genesis", prettyName: "Génesis", chapters: 50 },
  josue: { apiName: "josue", prettyName: "Josué", chapters: 24 },
  salmos: { apiName: "salmos", prettyName: "Salmos", chapters: 150 },
  proverbios: { apiName: "proverbios", prettyName: "Proverbios", chapters: 31 },
  isaias: { apiName: "isaias", prettyName: "Isaías", chapters: 66 },
  romanos: { apiName: "romanos", prettyName: "Romanos", chapters: 16 },
  "1-corintios": { apiName: "1-corintios", prettyName: "1 Corintios", chapters: 16 },
  "2-corintios": { apiName: "2-corintios", prettyName: "2 Corintios", chapters: 13 },
  efesios: { apiName: "efesios", prettyName: "Efesios", chapters: 6 },
  filipenses: { apiName: "filipenses", prettyName: "Filipenses", chapters: 4 },
  "1-pedro": { apiName: "1-pedro", prettyName: "1 Pedro", chapters: 5 },
  "2-pedro": { apiName: "2-pedro", prettyName: "2 Pedro", chapters: 3 },
  "1-juan": { apiName: "1-juan", prettyName: "1 Juan", chapters: 5 },
  santiago: { apiName: "santiago", prettyName: "Santiago", chapters: 5 },
  hebreos: { apiName: "hebreos", prettyName: "Hebreos", chapters: 13 },
  apocalipsis: { apiName: "apocalipsis", prettyName: "Apocalipsis", chapters: 22 }
};

const ESTADOS_LIBROS: Record<string, string[]> = {
  bajo_fuego: ["salmos", "isaias", "santiago", "1-pedro", "hebreos"],
  fuerza_maxima: ["proverbios", "josue", "1-corintios", "filipenses", "efesios"],
  escudo_fe: ["salmos", "romanos", "1-juan", "2-corintios"],
  victoria: ["salmos", "romanos", "1-corintios", "apocalipsis"]
};

const LOCAL_FALLBACKS: Record<string, { versiculo: string; cita: string }[]> = {
  bajo_fuego: [
    {
      versiculo: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.",
      cita: "ISAÍAS 41:10"
    },
    {
      versiculo: "Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?",
      cita: "SALMOS 27:1"
    },
    {
      versiculo: "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.",
      cita: "SALMOS 91:1"
    }
  ],
  fuerza_maxima: [
    {
      versiculo: "Todo lo puedo en Cristo que me fortalece.",
      cita: "FILIPENSES 4:13"
    },
    {
      versiculo: "El hierro con hierro se afila, y el hombre con el rostro de su amigo se afila.",
      cita: "PROVERBIOS 27:17"
    },
    {
      versiculo: "Dios es el que me ciñe de fuerza, y hace perfecto mi camino.",
      cita: "SALMOS 18:32"
    }
  ],
  escudo_fe: [
    {
      versiculo: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.",
      cita: "FILIPENSES 4:6"
    },
    {
      versiculo: "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.",
      cita: "PROVERBIOS 3:5"
    },
    {
      versiculo: "Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.",
      cita: "1 PEDRO 5:7"
    }
  ],
  victoria: [
    {
      versiculo: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.",
      cita: "JOSUÉ 1:9"
    },
    {
      versiculo: "Mas gracias sean dadas a Dios, que nos da la victoria por medio de nuestro Señor Jesucristo.",
      cita: "1 CORINTIOS 15:57"
    },
    {
      versiculo: "Antes, en todas estas cosas somos más que vencedores por medio de aquel que nos amó.",
      cita: "ROMANOS 8:37"
    }
  ]
};

const TemploGuerrero: React.FC<TemploGuerreroProps> = ({ catalog, onPlaySong }) => {
  const [selectedEstado, setSelectedEstado] = useState<EstadoCombate | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeVersiculo, setActiveVersiculo] = useState<{ versiculo: string; cita: string } | null>(null);
  const [loadingVersiculo, setLoadingVersiculo] = useState(false);
  const [verseHistory, setVerseHistory] = useState<string[]>([]);

  const fetchRandomVerseForState = async (stateKey: string) => {
    setLoadingVersiculo(true);
    const books = ESTADOS_LIBROS[stateKey];
    if (!books || books.length === 0) {
      const fallbackList = LOCAL_FALLBACKS[stateKey] || [];
      const availableFallbacks = fallbackList.filter(f => !verseHistory.includes(f.cita));
      const chosenList = availableFallbacks.length > 0 ? availableFallbacks : fallbackList;
      const rand = chosenList[Math.floor(Math.random() * chosenList.length)];
      setActiveVersiculo(rand);
      setVerseHistory(prev => [...prev.slice(-29), rand.cita]);
      setLoadingVersiculo(false);
      return;
    }

    let attempts = 0;
    let selectedVerseText = "";
    let selectedCitation = "";
    let success = false;

    while (attempts < 5 && !success) {
      attempts++;
      const randomBookKey = books[Math.floor(Math.random() * books.length)];
      const bookData = LIBROS_DATOS[randomBookKey];
      if (!bookData) continue;

      const randomChapter = Math.floor(Math.random() * bookData.chapters) + 1;
      const url = `https://bible-api.deno.dev/api/read/rv1960/${bookData.apiName}/${randomChapter}`;

      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.vers && Array.isArray(data.vers) && data.vers.length > 0) {
          const randomVerseObj = data.vers[Math.floor(Math.random() * data.vers.length)];
          const citationCandidate = `${bookData.prettyName.toUpperCase()} ${randomChapter}:${randomVerseObj.number}`;
          
          if (!verseHistory.includes(citationCandidate) || attempts === 5) {
            selectedVerseText = randomVerseObj.verse;
            selectedCitation = citationCandidate;
            success = true;
          }
        }
      } catch (error) {
        console.warn(`Attempt ${attempts} failed:`, error);
      }
    }

    if (success) {
      setActiveVersiculo({ versiculo: selectedVerseText, cita: selectedCitation });
      setVerseHistory(prev => [...prev.slice(-29), selectedCitation]);
    } else {
      console.warn("Could not fetch a non-repeated verse from API, using fallback.");
      const fallbackList = LOCAL_FALLBACKS[stateKey] || [];
      const availableFallbacks = fallbackList.filter(f => !verseHistory.includes(f.cita));
      const chosenList = availableFallbacks.length > 0 ? availableFallbacks : fallbackList;
      const rand = chosenList[Math.floor(Math.random() * chosenList.length)];
      setActiveVersiculo(rand);
      setVerseHistory(prev => [...prev.slice(-29), rand.cita]);
    }
    setLoadingVersiculo(false);
  };

  const handleSelectEstado = (estado: EstadoCombate) => {
    setSelectedEstado(estado);
    fetchRandomVerseForState(estado.key);
  };


    const getRecommendedSong = (stateKey: string): MusicItem | null => {
    if (!catalog || catalog.length === 0) return null;

    let keywords: string[] = [];
    if (stateKey === 'bajo_fuego') keywords = ['batalla', 'fuego', 'resistir', 'fe', 'guerra', 'combate', 'soldado', 'espada'];
    else if (stateKey === 'fuerza_maxima') keywords = ['entrenar', 'fuerza', 'disciplina', 'poder', 'gym', 'pesas', 'himno', 'ganar'];
    else if (stateKey === 'escudo_fe') keywords = ['luz', 'salvacion', 'paz', 'escudo', 'ansiedad', 'victoria', 'fe', 'dios'];
    else if (stateKey === 'victoria') keywords = ['victoria', 'gloria', 'rey', 'gracias', 'ganar', 'campeon', 'nini', 'estrena'];

    // Find all matching songs and pick one randomly
    const matches = catalog.filter(song =>
      keywords.some(kw => song.name.toLowerCase().includes(kw))
    );

    if (matches.length > 0) {
        return matches[Math.floor(Math.random() * matches.length)];
    }

    // Fallbacks
    if (stateKey === 'bajo_fuego' || stateKey === 'fuerza_maxima') {
      const dmSongs = catalog.filter(s => s.artist.toLowerCase().includes('dios'));
      if (dmSongs.length > 0) return dmSongs[Math.floor(Math.random() * dmSongs.length)];
    } else {
      const j6Songs = catalog.filter(s => s.artist.toLowerCase().includes('juan'));
      if (j6Songs.length > 0) return j6Songs[Math.floor(Math.random() * j6Songs.length)];
    }

    return catalog[Math.floor(Math.random() * catalog.length)];
  };

  const currentRecommendedSong = React.useMemo(() => {
    if (!selectedEstado) return null;
    return getRecommendedSong(selectedEstado.key);
  }, [selectedEstado?.key, catalog]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden py-24" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}>

      {/* Top line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#2563a8,transparent)' }}></div>

      {/* BG Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }}>
      </div>

      <div className="section-container relative z-10">

        {/* === HEADER === */}
        <div className="flex flex-col items-start mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px" style={{ background: '#2563a8' }}></div>
            <span className="label-tag" style={{ color: '#4a90d9' }}>Estado de Combate Espiritual</span>
          </div>
          <h2 className="h2-display text-white">El Templo del <span className="text-blue-gradient">Guerrero</span></h2>
          <p className="label-tag mt-3" style={{ color: 'rgba(200,205,212,0.4)', letterSpacing: '0.2em', maxWidth: '500px', lineHeight: 1.8 }}>
            Reporta tu estado y recibe munición de fe y música personalizada.
          </p>
        </div>

        {/* === STATES GRID === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ESTADOS.map((estado) => {
            const isActive = selectedEstado?.key === estado.key;
            return (
              <button
                key={estado.key}
                onClick={() => handleSelectEstado(estado)}
                className="text-left transition-all duration-300 group"
                style={{
                  background: isActive ? 'rgba(37,99,168,0.1)' : 'rgba(8,24,48,0.6)',
                  border: isActive ? `1px solid #2563a8` : '1px solid rgba(37,99,168,0.1)',
                  borderLeft: isActive ? `3px solid #2563a8` : `3px solid rgba(37,99,168,0.2)`,
                  borderRadius: '3px',
                  padding: '1.5rem',
                  boxShadow: isActive ? '0 0 30px rgba(37,99,168,0.2)' : 'none'
                }}
              >
                <div className="text-3xl mb-4">{estado.emoji}</div>
                <h3 className="text-white font-bold mb-2 group-hover:text-blue-300 transition-colors"
                  style={{ fontFamily: 'var(--font-gothic)', fontSize: '1.2rem' }}>
                  {estado.titulo}
                </h3>
                <p className="label-tag" style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.5rem', lineHeight: 1.8 }}>
                  {estado.descripcion}
                </p>
                {isActive && (
                  <div className="mt-4 h-px w-full" style={{ background: 'linear-gradient(90deg, #2563a8, transparent)' }}></div>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* === MODAL === */}
      {selectedEstado && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}>

          <div className="relative w-full max-w-2xl my-auto p-6 md:p-10"
            style={{
              background: 'linear-gradient(135deg, #071325 0%, #020d1a 100%)',
              border: '1px solid rgba(37,99,168,0.3)',
              borderTop: '3px solid #2563a8',
              borderRadius: '3px',
              boxShadow: '0 40px 80px rgba(0,0,0,0.8)'
            }}>

            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${selectedEstado.color}22 0%, transparent 70%)`, filter: 'blur(60px)' }}>
            </div>

            {/* Close */}
            <button onClick={() => setSelectedEstado(null)}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', color: 'rgba(255,255,255,0.4)' }}
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 pb-6" style={{ borderBottom: '1px solid rgba(37,99,168,0.15)' }}>
              <span className="text-4xl">{selectedEstado.emoji}</span>
              <div>
                <span className="label-tag block mb-1" style={{ color: '#4a90d9', fontSize: '0.5rem' }}>ORDEN DE COMBATE</span>
                <h3 className="text-white" style={{ fontFamily: 'var(--font-gothic)', fontSize: '2rem' }}>{selectedEstado.titulo}</h3>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-5 mb-8">
              {/* Message */}
              <div className="p-5" style={{ borderLeft: '3px solid #2563a8', background: 'rgba(37,99,168,0.06)', borderRadius: '0 3px 3px 0' }}>
                <span className="label-tag block mb-2" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>Instrucción Táctica</span>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{selectedEstado.mensaje}</p>
              </div>

              {/* Verse */}
              <div className="p-5" style={{ background: 'rgba(8,24,48,0.8)', border: '1px solid rgba(37,99,168,0.15)', borderRadius: '3px' }}>
                <span className="label-tag block mb-3" style={{ color: '#4a90d9', fontSize: '0.5rem' }}>Versículo de Cobertura</span>
                {loadingVersiculo ? (
                  <div className="flex items-center gap-3 py-4">
                    <i className="fas fa-spinner fa-spin" style={{ color: '#2563a8' }}></i>
                    <span className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>Cargando munición de fe...</span>
                  </div>
                ) : (
                  <p className="leading-relaxed mb-4" style={{ fontFamily: 'var(--font-gothic)', fontSize: 'clamp(1.1rem,2.5vw,1.4rem)', color: 'rgba(255,255,255,0.85)' }}>
                    "{activeVersiculo?.versiculo}"
                  </p>
                )}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.55rem' }}>
                    {loadingVersiculo ? 'Buscando...' : activeVersiculo?.cita}
                  </span>
                  <div className="flex gap-4">
                    <button onClick={() => fetchRandomVerseForState(selectedEstado.key)} disabled={loadingVersiculo}
                      className="label-tag transition-colors" style={{ background: 'none', border: 'none', color: 'rgba(200,205,212,0.4)', cursor: 'pointer', fontSize: '0.5rem' }}
                    >
                      <i className={`fas fa-dice mr-1 ${loadingVersiculo ? 'fa-spin' : ''}`}></i>Otro Versículo
                    </button>
                    <button onClick={() => activeVersiculo && handleCopy(`"${activeVersiculo.versiculo}" - ${activeVersiculo.cita}`)} disabled={loadingVersiculo || !activeVersiculo}
                      className="label-tag transition-colors" style={{ background: 'none', border: 'none', color: '#4a90d9', cursor: 'pointer', fontSize: '0.5rem' }}
                    >
                      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-1`}></i>{copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Song Recommendation */}
            {currentRecommendedSong && (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4"
                style={{ background: 'rgba(8,24,48,0.6)', border: '1px solid rgba(37,99,168,0.15)', borderRadius: '3px' }}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <img src={currentRecommendedSong.cover} alt={currentRecommendedSong.name}
                    className="w-12 h-12 object-cover flex-shrink-0" style={{ borderRadius: '2px', border: '1px solid rgba(37,99,168,0.3)' }} />
                  <div className="min-w-0">
                    <span className="label-tag block" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>Música de Combate</span>
                    <p className="text-white font-bold truncate" style={{ fontFamily: 'var(--font-gothic)', fontSize: '1rem' }}>{currentRecommendedSong.name}</p>
                    <p className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>{currentRecommendedSong.artist}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { onPlaySong(currentRecommendedSong); setSelectedEstado(null); }} className="btn-primary" style={{ clipPath: 'none', borderRadius: '2px', padding: '0.6rem 1.2rem', fontSize: '0.55rem' }}>
                    <i className="fas fa-play mr-1"></i>Escuchar
                  </button>
                  <a href={`/link/${currentRecommendedSong.id}`} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary" style={{ clipPath: 'none', borderRadius: '2px', padding: '0.6rem 1rem', fontSize: '0.55rem', textDecoration: 'none' }}>
                    <i className="fas fa-link"></i>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TemploGuerrero;
