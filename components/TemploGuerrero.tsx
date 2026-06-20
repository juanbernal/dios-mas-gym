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
    color: '#c5a059'
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

const TemploGuerrero: React.FC<TemploGuerreroProps> = ({ catalog, onPlaySong }) => {
  const [selectedEstado, setSelectedEstado] = useState<EstadoCombate | null>(null);
  const [copied, setCopied] = useState(false);

  const getRecommendedSong = (stateKey: string): MusicItem | null => {
    if (!catalog || catalog.length === 0) return null;

    let keywords: string[] = [];
    if (stateKey === 'bajo_fuego') keywords = ['batalla', 'fuego', 'resistir', 'fe', 'guerra', 'combate', 'soldado', 'espada'];
    else if (stateKey === 'fuerza_maxima') keywords = ['entrenar', 'fuerza', 'disciplina', 'poder', 'gym', 'pesas', 'himno', 'ganar'];
    else if (stateKey === 'escudo_fe') keywords = ['luz', 'salvacion', 'paz', 'escudo', 'ansiedad', 'victoria', 'fe', 'dios'];
    else if (stateKey === 'victoria') keywords = ['victoria', 'gloria', 'rey', 'gracias', 'ganar', 'campeon', 'nini', 'estrena'];

    // Find a matching song
    const match = catalog.find(song =>
      keywords.some(kw => song.name.toLowerCase().includes(kw))
    );

    if (match) return match;

    // Fallbacks
    if (stateKey === 'bajo_fuego' || stateKey === 'fuerza_maxima') {
      const dmSong = catalog.find(s => s.artist.toLowerCase().includes('dios'));
      if (dmSong) return dmSong;
    } else {
      const j6Song = catalog.find(s => s.artist.toLowerCase().includes('juan'));
      if (j6Song) return j6Song;
    }

    return catalog[0];
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-[#05070a] border-t border-white/5 relative overflow-hidden">
      {/* Background lights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c5a059]/3 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="section-container relative z-10 px-4 md:px-0">
        {/* Title */}
        <div className="flex flex-col items-center mb-16 text-center">
          <h2 className="font-serif italic text-4xl text-[#c5a059] mb-3">El Templo del Guerrero</h2>
          <div className="w-16 h-px bg-[#c5a059]/40 mb-4"></div>
          <p className="text-[9px] text-white/50 font-black uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
            Reporta tu estado de batalla espiritual para recibir munición de fe y música de combate personalizada.
          </p>
        </div>

        {/* States grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ESTADOS.map((estado) => (
            <button
              key={estado.key}
              onClick={() => setSelectedEstado(estado)}
              className="bg-[#0f111a]/60 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 text-left hover:border-[#c5a059]/40 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
            >
              <div 
                className="absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity" 
                style={{ backgroundColor: estado.color }}
              ></div>
              <div className="text-3xl mb-4">{estado.emoji}</div>
              <h3 className="font-serif text-xl text-white mb-2 group-hover:text-[#c5a059] transition-colors">{estado.titulo}</h3>
              <p className="text-white/40 text-[10px] leading-relaxed uppercase tracking-wider">{estado.descripcion}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal View */}
      {selectedEstado && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0f111a] border border-[#c5a059]/20 rounded-[2.5rem] p-8 md:p-12 max-w-2xl w-full relative overflow-hidden shadow-2xl">
            <div 
              className="absolute -top-32 -right-32 w-64 h-64 blur-[90px] opacity-15"
              style={{ backgroundColor: selectedEstado.color }}
            ></div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedEstado(null)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center justify-center text-xs"
            >
              <i className="fas fa-xmark"></i>
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl">{selectedEstado.emoji}</span>
              <div>
                <span className="text-[7.5px] font-black uppercase tracking-[0.3em] text-[#c5a059]">ORDEN DE COMBATE</span>
                <h3 className="font-serif italic text-3xl text-white mt-1">{selectedEstado.titulo}</h3>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6 mb-10">
              <div className="border-l-2 border-[#c5a059] pl-6 py-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Instrucción Táctica</p>
                <p className="text-white/80 text-sm leading-relaxed">{selectedEstado.mensaje}</p>
              </div>

              <div className="bg-black/35 rounded-3xl p-6 border border-white/5 relative group">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]/60 mb-3">Versículo de Cobertura</p>
                <p className="font-serif italic text-lg text-white leading-relaxed mb-4">
                  "{selectedEstado.versiculo}"
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black tracking-widest text-white/40">{selectedEstado.cita}</span>
                  <button
                    onClick={() => handleCopy(`"${selectedEstado.versiculo}" - ${selectedEstado.cita}`)}
                    className="text-[8px] font-black uppercase tracking-wider text-[#c5a059] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                    {copied ? 'Copiado' : 'Copiar Versículo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer with Song Recommendation */}
            {getRecommendedSong(selectedEstado.key) && (
              <div className="bg-[#05070a]/80 rounded-3xl p-5 border border-white/5 flex flex-col sm:flex-row items-center gap-5 justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-lg">
                    <img 
                      src={getRecommendedSong(selectedEstado.key)!.cover} 
                      alt={getRecommendedSong(selectedEstado.key)!.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left truncate">
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-white/20">Música de Combate</span>
                    <h4 className="font-serif text-md font-bold text-white truncate leading-snug">
                      {getRecommendedSong(selectedEstado.key)!.name}
                    </h4>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                      {getRecommendedSong(selectedEstado.key)!.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      onPlaySong(getRecommendedSong(selectedEstado.key)!);
                      setSelectedEstado(null);
                    }}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-full bg-[#c5a059] text-black text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white transition-all shadow-md"
                  >
                    <i className="fas fa-play"></i>
                    Escuchar
                  </button>
                  <a
                    href={`/link/${getRecommendedSong(selectedEstado.key)!.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full border border-white/10 text-white/40 hover:bg-white hover:text-black transition-all flex items-center justify-center"
                    title="Smart Link"
                  >
                    <i className="fas fa-link text-[10px]"></i>
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
