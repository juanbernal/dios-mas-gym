import React from 'react';
import { useNavigate } from 'react-router-dom';

const VERSES = [
  { t: 'Yo soy el camino, la verdad y la vida.', r: 'Juan 14:6' },
  { t: 'No temas, porque yo estoy contigo.', r: 'Isaías 41:10' },
  { t: 'En ti confían los que conocen tu nombre.', r: 'Salmos 9:10' },
];

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const verse = VERSES[Math.floor(Math.random() * VERSES.length)];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '30%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37,99,168,0.12) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-5%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(30,58,95,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        
        {/* Giant 404 */}
        <div className="relative mb-2 select-none">
          <span
            className="h1-gothic"
            style={{
              fontSize: 'clamp(8rem, 25vw, 18rem)',
              color: 'rgba(255,255,255,0.04)',
              WebkitTextStroke: '1px rgba(74,144,217,0.3)',
              lineHeight: 1,
              display: 'block',
            }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-cross text-4xl" style={{ color: 'rgba(74,144,217,0.4)' }} />
          </div>
        </div>

        {/* Label */}
        <div className="label-tag mb-6" style={{ color: '#4a90d9' }}>
          ✝ Página no encontrada ✝
        </div>

        {/* Title */}
        <h1
          className="h2-display text-white mb-4"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}
        >
          Esta ruta no existe
        </h1>

        <p className="mb-8" style={{ color: 'rgba(200,205,212,0.45)', lineHeight: 1.7, fontSize: '0.9rem' }}>
          Quizás el enlace cambió o fue removido. Regresa al inicio para continuar explorando el arsenal.
        </p>

        {/* Verse card */}
        <div
          className="w-full mb-10 p-6 text-left"
          style={{
            background: 'rgba(8,24,48,0.6)',
            border: '1px solid rgba(37,99,168,0.2)',
            borderLeft: '3px solid #2563a8',
            borderRadius: '2px',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="label-tag mb-3" style={{ color: '#4a90d9' }}>
            <i className="fas fa-bible mr-2" />
            Mientras tanto...
          </div>
          <blockquote
            className="italic mb-3"
            style={{
              fontFamily: 'var(--font-gothic)',
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
            }}
          >
            "{verse.t}"
          </blockquote>
          <span
            className="label-tag px-3 py-1 inline-block"
            style={{
              background: 'rgba(37,99,168,0.15)',
              color: '#7eb8f7',
              border: '1px solid rgba(37,99,168,0.3)',
              borderRadius: '2px',
            }}
          >
            {verse.r}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={() => navigate('/')} className="btn-primary">
            <i className="fas fa-house mr-2" />
            Volver al Inicio
          </button>
          <button onClick={() => navigate('/buscar')} className="btn-secondary">
            <i className="fas fa-search mr-2" />
            Buscar Música
          </button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,168,0.3), transparent)' }} />
    </div>
  );
};

export default NotFound;
