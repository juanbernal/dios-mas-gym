import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MusicItem } from '../types';
import { fetchSavedLyrics } from '../services/musicService';

interface LyricsViewProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

const generateSlug = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const LyricsView: React.FC<LyricsViewProps> = ({ catalog, onPlaySong }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedVerse, setCopiedVerse] = useState<number | null>(null);
  const [savedLyrics, setSavedLyrics] = useState<any[]>([]);
  const [loadingLyrics, setLoadingLyrics] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchSavedLyrics()
      .then(data => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setSavedLyrics(data);
          }
          setLoadingLyrics(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingLyrics(false);
      });
    return () => { isMounted = false; };
  }, []);

  const normalize = (text: string) =>
    (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  const song = useMemo(() => {
    if (!slug) return null;
    const slugNorm = normalize(slug);

    // 1. Match from catalog (by exact ID, slug, artist-name, or normalized title)
    const matched = catalog.find(s =>
      s.id === slug ||
      generateSlug(s.name) === slug ||
      generateSlug(`${s.artist}-${s.name}`) === slug ||
      normalize(s.name) === slugNorm ||
      (s.id && normalize(s.id) === slugNorm)
    );

    // 2. Match from savedLyrics (by exact ID, catalog match ID, slug, or normalized title)
    const matchedSaved = savedLyrics.find(l => {
      const lTitleNorm = normalize(l.title || '');
      const mNameNorm = matched ? normalize(matched.name || '') : '';
      return (
        l.id === slug ||
        (matched && l.id === matched.id) ||
        generateSlug(l.title || '') === slug ||
        generateSlug(`${l.artist || ''}-${l.title || ''}`) === slug ||
        (lTitleNorm && slugNorm && (lTitleNorm === slugNorm || slugNorm.includes(lTitleNorm))) ||
        (matched && (
          generateSlug(l.title || '') === generateSlug(matched.name) ||
          (lTitleNorm && mNameNorm && (lTitleNorm === mNameNorm || mNameNorm.includes(lTitleNorm) || lTitleNorm.includes(mNameNorm)))
        ))
      );
    });

    if (matched) {
      if (matchedSaved?.content && (!matched.lyrics || matched.lyrics.trim().length === 0 || matched.lyrics.length < matchedSaved.content.length)) {
        return { ...matched, lyrics: matchedSaved.content };
      }
      return matched;
    }

    if (matchedSaved) {
      return {
        id: matchedSaved.id || slug,
        name: matchedSaved.title,
        artist: matchedSaved.artist || 'Dios Mas Gym',
        cover: '/logo-diosmasgym.png',
        url: '',
        type: 'Single',
        lyrics: matchedSaved.content,
        date: matchedSaved.date || new Date().toISOString()
      } as MusicItem;
    }

    return null;
  }, [catalog, slug, savedLyrics]);

  const handleShare = async () => {
    const shareData = {
      title: song ? `${song.name} - ${song.artist}` : 'Dios Más Gym',
      text: song ? `Letra de "${song.name}" por ${song.artist}` : 'Dios Más Gym',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) {}
  };

  // Si está cargando y aún no encontramos letra, mostrar loader temporal para no parpadear
  if (loadingLyrics && (!song || !song.lyrics)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative"
        style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 100%)' }}
      >
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#4a90d9]/10 border border-[#4a90d9]/25 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <i className="fas fa-music text-[#4a90d9] text-xl" />
          </div>
          <p className="text-sm font-bold text-white mb-1">Cargando letra oficial...</p>
          <p className="text-xs text-white/40">Sincronizando con el catálogo web</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative"
        style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 100%)' }}
      >
        <div className="text-center px-6">
          <div className="label-tag mb-4" style={{ color: '#4a90d9' }}>✝ Letra no encontrada ✝</div>
          <h1 className="h2-display text-white mb-4" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
            Esta canción no está disponible
          </h1>
          <p style={{ color: 'rgba(200,205,212,0.4)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            La letra que buscas no existe o aún no fue agregada.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => navigate('/buscar')} className="btn-primary">
              <i className="fas fa-search mr-2" />
              Buscar Canciones
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              <i className="fas fa-house mr-2" />
              Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasLyrics = song.lyrics && song.lyrics.trim().length > 0;
  const lyricsLines = hasLyrics ? song.lyrics!.split('\n') : [];

  // Update page title for SEO
  if (typeof document !== 'undefined') {
    document.title = `${song.name} - Letra | ${song.artist} | Dios Más Gym`;
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 50%, #0b1929 100%)' }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }} />

      {/* BG Glow */}
      <div className="absolute pointer-events-none"
        style={{
          top: 0, right: '-15%',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(37,99,168,0.12) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      <div className="section-container relative z-10 py-20">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="label-tag mb-10 flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(200,205,212,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <i className="fas fa-arrow-left" />
          Volver
        </button>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* === LEFT: SONG INFO === */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="sticky top-24">
              {/* Cover art */}
              <div className="relative mb-6 overflow-hidden" style={{ borderRadius: '3px', aspectRatio: '1' }}>
                <img
                  src={song.cover}
                  alt={song.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.85)' }}
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(2,13,26,0.8) 0%, transparent 50%)' }} />
                {/* Play button overlay */}
                <button
                  onClick={() => onPlaySong(song)}
                  className="absolute bottom-4 right-4 w-14 h-14 flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #2563a8, #4a90d9)',
                    borderRadius: '3px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(37,99,168,0.6)',
                  }}
                >
                  <i className="fas fa-play text-white text-lg ml-1" />
                </button>
              </div>

              {/* Song metadata */}
              <div className="label-tag mb-2" style={{ color: '#4a90d9' }}>
                <i className="fas fa-music mr-2" />
                {song.type || 'Single'}
              </div>
              <h1
                className="text-white font-bold mb-2 leading-tight"
                style={{ fontFamily: 'var(--font-gothic)', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)' }}
              >
                {song.name}
              </h1>
              <p className="label-tag mb-1" style={{ color: 'rgba(200,205,212,0.5)' }}>
                {song.artist}
              </p>
              {song.album && (
                <p className="label-tag mb-1" style={{ color: 'rgba(200,205,212,0.3)' }}>
                  <i className="fas fa-compact-disc mr-1" />
                  {song.album}
                </p>
              )}
              {song.date && (
                <p className="label-tag mb-6" style={{ color: 'rgba(200,205,212,0.25)' }}>
                  <i className="fas fa-calendar mr-1" />
                  {new Date(song.date).getFullYear()}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button onClick={() => onPlaySong(song)} className="btn-primary"
                  style={{ clipPath: 'none', borderRadius: '2px', textAlign: 'center' }}>
                  <i className="fas fa-play mr-2" />
                  Reproducir
                </button>
                <button
                  onClick={handleShare}
                  className="btn-secondary"
                  style={{ clipPath: 'none', borderRadius: '2px', textAlign: 'center' }}
                >
                  <i className={`fas ${copied ? 'fa-check' : 'fa-share-nodes'} mr-2`} />
                  {copied ? '¡Enlace copiado!' : 'Compartir letra'}
                </button>
                {(song.url.includes('youtube') || song.url.includes('youtu.be')) && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ clipPath: 'none', borderRadius: '2px', textAlign: 'center', textDecoration: 'none' }}
                  >
                    <i className="fab fa-youtube mr-2" style={{ color: '#ef4444' }} />
                    Ver en YouTube
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT: LYRICS === */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-8 pb-6"
              style={{ borderBottom: '1px solid rgba(37,99,168,0.15)' }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-[2px]" style={{ background: '#2563a8' }} />
                <span className="label-tag" style={{ color: '#4a90d9' }}>Letra Oficial</span>
              </div>
              {hasLyrics && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(song.lyrics || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="label-tag flex items-center gap-1.5 hover:text-white transition-colors"
                  style={{ background: 'rgba(37,99,168,0.12)', border: '1px solid rgba(37,99,168,0.25)', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', color: copied ? '#4ade80' : '#4a90d9', fontSize: '0.65rem' }}
                >
                  <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
                  {copied ? '¡Letra Copiada!' : 'Copiar Toda la Letra'}
                </button>
              )}
            </div>

            {hasLyrics ? (
              <div
                className="space-y-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
                  lineHeight: 1.9,
                  color: 'rgba(241,245,249,0.85)',
                }}
              >
                {lyricsLines.map((line, i) => {
                  const isEmpty = !line.trim();
                  const isChorus = line.trim().toLowerCase().startsWith('[') && line.includes(']');
                  return isEmpty ? (
                    <div key={i} style={{ height: '1.2rem' }} />
                  ) : isChorus ? (
                    <p key={i} className="label-tag mt-6 mb-2 font-bold tracking-wider" style={{ color: '#4a90d9', fontSize: '0.65rem' }}>
                      {line}
                    </p>
                  ) : (
                    <p 
                      key={i}
                      onClick={async () => {
                        await navigator.clipboard.writeText(`"${line}" - ${song.name} (${song.artist})`);
                        setCopiedVerse(i);
                        setTimeout(() => setCopiedVerse(null), 1500);
                      }}
                      title="Haz clic para copiar este verso"
                      className="transition-colors hover:text-blue-300 cursor-pointer select-text relative group/line"
                    >
                      {line}
                      {copiedVerse === i && (
                        <span className="ml-3 text-xs text-green-400 font-mono">✓ copiado</span>
                      )}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-20 text-center">
                <div
                  className="w-16 h-16 flex items-center justify-center mb-6"
                  style={{ background: 'rgba(37,99,168,0.08)', border: '1px solid rgba(37,99,168,0.2)', borderRadius: '4px' }}
                >
                  <i className="fas fa-file-lines text-2xl" style={{ color: 'rgba(74,144,217,0.4)' }} />
                </div>
                <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'var(--font-gothic)', fontSize: '1.5rem' }}>
                  Letra no disponible
                </h3>
                <p style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.85rem', maxWidth: '300px' }}>
                  La letra de esta canción aún no ha sido agregada al sistema.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,168,0.3), transparent)' }} />
    </div>
  );
};

export default LyricsView;
