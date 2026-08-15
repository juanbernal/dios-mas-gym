import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicItem } from '../types';

interface MusicCardProps {
  item: MusicItem;
  onPlay: () => void;
}

const generateSlug = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const MusicCard: React.FC<MusicCardProps> = ({ item, onPlay }) => {
  const isJuan = item.artist.toLowerCase().includes('juan');
  const accentColor = isJuan ? '#1e3a5f' : '#2563a8';
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const hasLyrics = item.lyrics && item.lyrics.trim().length > 0;
  const lyricsSlug = item.id || generateSlug(`${item.artist}-${item.name}`);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `${item.name} - ${item.artist}`,
      text: `Escucha "${item.name}" de ${item.artist} 🙏`,
      url: `${window.location.origin}/link/${item.id}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) {}
  }, [item]);

  const handleLyrics = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/letra/${lyricsSlug}`);
  }, [lyricsSlug, navigate]);

  return (
    <div className="group relative overflow-hidden transition-all duration-400 hover:-translate-y-1"
      style={{
        background: 'linear-gradient(135deg, rgba(8,24,48,0.9) 0%, rgba(5,15,30,0.95) 100%)',
        border: '1px solid rgba(37,99,168,0.15)',
        borderRadius: '3px',
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Hover top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(90deg, transparent, #4a90d9, transparent)' }} />

      <div className="flex gap-4 p-4">
        {/* Cover art */}
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden cursor-pointer" style={{ borderRadius: '2px' }} onClick={onPlay}>
          <img src={item.cover} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
          <div className="absolute inset-0 transition-all duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="w-10 h-10 flex items-center justify-center"
              style={{ background: '#2563a8', borderRadius: '2px', boxShadow: '0 0 20px rgba(37,99,168,0.6)' }}>
              <i className="fas fa-play text-white text-xs ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          <div>
            {/* Type badge + year */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-tag px-2 py-0.5" style={{
                background: 'rgba(37,99,168,0.12)',
                border: '1px solid rgba(37,99,168,0.2)',
                color: '#4a90d9',
                borderRadius: '2px',
                fontSize: '0.5rem'
              }}>
                {item.type || 'Single'}
              </span>
              {item.date && (
                <span className="label-tag" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.5rem' }}>
                  {new Date(item.date).getFullYear()}
                </span>
              )}
              {hasLyrics && (
                <span className="label-tag px-2 py-0.5" style={{
                  background: 'rgba(22,101,52,0.12)',
                  border: '1px solid rgba(22,101,52,0.25)',
                  color: '#4ade80',
                  borderRadius: '2px',
                  fontSize: '0.45rem',
                }}>
                  <i className="fas fa-file-lines mr-1" />
                  Letra
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="text-white font-bold truncate mb-1 transition-colors group-hover:text-blue-300"
              style={{ fontFamily: 'var(--font-gothic)', fontSize: '1.15rem', lineHeight: 1.2 }}>
              {item.name}
            </h4>

            {/* Artist */}
            <p className="label-tag" style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.5rem' }}>{item.artist}</p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.url.includes('youtube.com') || item.url.includes('youtu.be') ? (
              <button onClick={onPlay} className="btn-primary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.5rem', clipPath: 'none', borderRadius: '2px' }}>
                <i className="fas fa-play mr-1.5" />Reproducir
              </button>
            ) : (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-primary"
                style={{ background: '#c5a059', padding: '0.45rem 0.8rem', fontSize: '0.5rem', clipPath: 'none', borderRadius: '2px', textDecoration: 'none' }}>
                <i className="fab fa-apple mr-1.5" />Escuchar
              </a>
            )}

            {/* Share button */}
            <button
              onClick={handleShare}
              title="Compartir"
              className="transition-all hover:opacity-80"
              style={{
                padding: '0.45rem 0.7rem',
                background: 'rgba(37,99,168,0.1)',
                border: '1px solid rgba(37,99,168,0.2)',
                borderRadius: '2px',
                cursor: 'pointer',
                color: copied ? '#4ade80' : '#4a90d9',
                fontSize: '0.7rem',
              }}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-share-nodes'}`} />
            </button>

            {/* Lyrics button */}
            {hasLyrics && (
              <button
                onClick={handleLyrics}
                title="Ver letra"
                className="transition-all hover:opacity-80"
                style={{
                  padding: '0.45rem 0.7rem',
                  background: 'rgba(22,101,52,0.08)',
                  border: '1px solid rgba(22,101,52,0.2)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  color: '#4ade80',
                  fontSize: '0.7rem',
                }}
              >
                <i className="fas fa-file-lines" />
              </button>
            )}

            <a href={`/link/${item.id}`} target="_blank" rel="noopener noreferrer"
              className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.5rem', clipPath: 'none', borderRadius: '2px', textDecoration: 'none' }}>
              <i className="fas fa-link mr-1.5" />Link
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicCard;
