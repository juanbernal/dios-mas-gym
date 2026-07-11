import React from 'react';
import MusicCard from './MusicCard';
import { MusicItem } from '../types';

interface MusicSectionProps {
  artist: string;
  catalog: MusicItem[];
  onPlay: (song: MusicItem) => void;
  randomSong?: MusicItem | null;
}

const MusicSection: React.FC<MusicSectionProps> = ({ artist, catalog, onPlay, randomSong }) => {
  const isDios = artist === 'diosmasgym';
  const description = isDios
    ? "Urbano cristiano, disciplina y fe en movimiento"
    : "Corridos, banda sinaloense y calle con propósito";
  const artistLogo = isDios ? '/logo-diosmasgym.png' : '/logo-juan614-v2.jpg';
  const artistUrl = isDios ? 'https://musica.diosmasgym.com/' : 'https://juan614.diosmasgym.com/';
  const accentBlue = isDios ? '#2563a8' : '#1e3a5f';

  return (
    <section className="relative overflow-hidden py-24"
      style={{ background: isDios ? 'linear-gradient(160deg,#020d1a,#071325)' : 'linear-gradient(160deg,#040a14,#0b1929)' }}>

      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${accentBlue},transparent)` }}></div>

      {/* BG glow */}
      <div className="absolute pointer-events-none"
        style={{
          [isDios ? 'right' : 'left']: '-100px',
          top: '50%', transform: 'translateY(-50%)',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, ${accentBlue}22 0%, transparent 70%)`,
          filter: 'blur(60px)'
        }}>
      </div>

      <div className="section-container relative z-10">

        {/* === HEADER === */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-16 pb-8"
          style={{ borderBottom: '1px solid rgba(37,99,168,0.12)' }}>

          {/* Artist info */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="relative flex-shrink-0 group cursor-pointer">
              <img src={artistLogo} alt={artist}
                className="w-20 h-20 md:w-28 md:h-28 object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ borderRadius: '4px', border: `2px solid ${accentBlue}55` }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle, ${accentBlue}30, transparent)`, borderRadius: '4px' }}>
              </div>
            </div>

            {/* Text */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-px" style={{ background: accentBlue }}></div>
                <span className="label-tag" style={{ color: '#4a90d9' }}>Catálogo Oficial</span>
              </div>
              <h2 className="h2-display text-white capitalize" style={{ marginBottom: '0.5rem' }}>
                {artist === 'diosmasgym' ? 'Diosmasgym' : 'Juan 614'}
              </h2>
              <p className="label-tag" style={{ color: 'rgba(200,205,212,0.4)', letterSpacing: '0.2em' }}>
                {description}
              </p>
            </div>
          </div>

          {/* Right: Random + Link */}
          <div className="flex flex-col gap-3 min-w-[220px]">
            {randomSong && (
              <div className="p-4"
                style={{
                  background: 'rgba(37,99,168,0.07)',
                  border: '1px solid rgba(37,99,168,0.2)',
                  borderLeft: `3px solid ${accentBlue}`,
                  borderRadius: '2px'
                }}>
                <p className="label-tag mb-1" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.5rem' }}>Sugerencia del día</p>
                <p className="text-white font-bold truncate mb-3" style={{ fontFamily: 'var(--font-gothic)', fontSize: '1rem' }}>
                  {randomSong.name}
                </p>
                <button onClick={() => onPlay(randomSong)} className="btn-primary w-full" style={{ clipPath: 'none', borderRadius: '2px', padding: '0.6rem 1rem', fontSize: '0.55rem' }}>
                  <i className="fas fa-play mr-2"></i>Reproducir
                </button>
              </div>
            )}
            <a href={artistUrl} target="_blank" rel="noreferrer"
              className="btn-secondary text-center"
              style={{ clipPath: 'none', borderRadius: '2px', textDecoration: 'none', display: 'block', padding: '0.7rem 1.5rem', fontSize: '0.6rem' }}>
              Ver Página del Artista →
            </a>
          </div>
        </div>

        {/* === MUSIC GRID === */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalog.slice(0, 6).map((item, idx) => (
            <div key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
              <MusicCard item={item} onPlay={() => onPlay(item)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MusicSection;
