import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MusicItem } from '../types';
import { fetchSavedLyrics } from '../services/musicService';

interface LyricsViewProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

const generateSlug = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

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
    (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

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
        (lTitleNorm && slugNorm && lTitleNorm === slugNorm) ||
        (matched && (
          generateSlug(l.title || '') === generateSlug(matched.name) ||
          (lTitleNorm && mNameNorm && lTitleNorm === mNameNorm)
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
        cover: '/logo-diosmasgym-sm.webp',
        url: '',
        type: 'Single',
        lyrics: matchedSaved.content,
        date: matchedSaved.date || new Date().toISOString()
      } as MusicItem;
    }

    return null;
  }, [catalog, slug, savedLyrics]);

  // Otras letras del mismo artista, para invitar a seguir explorando el catálogo
  const relatedSongs = useMemo(() => {
    if (!song) return [];
    return catalog
      .filter(s => s.id !== song.id && s.artist === song.artist && s.lyrics && s.lyrics.trim().length > 0)
      .slice(0, 4);
  }, [catalog, song]);

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
      <div className="min-h-screen flex flex-col items-center justify-center relative bg-[#030711] overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#4a90d9]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="text-center px-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#4a90d9]/10 border border-[#4a90d9]/25 flex items-center justify-center mx-auto mb-5 animate-pulse shadow-[0_0_30px_rgba(74,144,217,0.25)]">
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
      <div className="min-h-screen flex flex-col items-center justify-center relative bg-[#030711] overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#4a90d9]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="text-center px-6 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/25 text-[#4a90d9] text-[9px] font-black uppercase tracking-[0.25em] mb-6">
            <i className="fas fa-triangle-exclamation text-xs" />
            Letra no encontrada
          </div>
          <h1 className="font-serif italic text-white mb-4" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
            Esta canción no está disponible
          </h1>
          <p className="text-white/40 text-sm mb-10 leading-relaxed">
            La letra que buscas no existe o aún no fue agregada al templo lírico.
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
  const isJuan = song.artist.toLowerCase().includes('juan');

  // Update page title for SEO
  if (typeof document !== 'undefined') {
    document.title = `${song.name} - Letra | ${song.artist} | Dios Más Gym`;
  }

  return (
    <div className="min-h-screen relative bg-[#030711] overflow-hidden">
      {/* Dynamic background glows (mismo lenguaje visual que la seccion de letras del home) */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#2563a8]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[#4a90d9]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative lateral bar */}
      <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-blue-500 via-[#4a90d9]/40 to-transparent" />

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }} />

      <div className="section-container relative z-10 py-16 md:py-20">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#4a90d9]/40 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <i className="fas fa-arrow-left" />
          Volver
        </button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* === LEFT: SONG INFO CARD === */}
          <div className="lg:w-80 flex-shrink-0">
            <div
              className="sticky top-24 rounded-3xl p-5 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(11,20,38,0.85) 0%, rgba(5,10,20,0.95) 100%)',
                border: '1px solid rgba(74,144,217,0.18)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4a90d9] to-transparent" />

              {/* Cover art */}
              <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10" style={{ aspectRatio: '1' }}>
                <img
                  src={song.cover}
                  alt={song.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.85)' }}
                  onError={(e) => { e.currentTarget.src = isJuan ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'; }}
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(2,13,26,0.85) 0%, transparent 55%)' }} />
                {/* Play button overlay */}
                <button
                  onClick={() => onPlaySong(song)}
                  className="absolute bottom-4 right-4 w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: 'linear-gradient(135deg, #2563a8, #4a90d9)',
                    boxShadow: '0 8px 30px rgba(37,99,168,0.6)',
                  }}
                >
                  <i className="fas fa-play text-white text-lg ml-1" />
                </button>
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-[8px] font-black uppercase tracking-widest text-[#4a90d9] flex items-center gap-1.5">
                  <i className="fas fa-music text-[8px]" />
                  {song.type || 'Single'}
                </div>
              </div>

              {/* Song metadata */}
              <h1 className="font-serif italic text-white font-bold mb-2 leading-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)' }}>
                {song.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4a90d9] shadow-[0_0_8px_#4a90d9]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#4a90d9]">
                  {song.artist}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {song.album && (
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-bold flex items-center gap-1.5">
                    <i className="fas fa-compact-disc text-[8px]" />
                    {song.album}
                  </span>
                )}
                {song.date && (
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] font-bold flex items-center gap-1.5">
                    <i className="fas fa-calendar text-[8px]" />
                    {new Date(song.date).getFullYear()}
                  </span>
                )}
                {hasLyrics && (
                  <span className="px-2.5 py-1 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/25 text-[#4a90d9] text-[9px] font-bold flex items-center gap-1.5">
                    <i className="fas fa-lines-leaning text-[8px]" />
                    {lyricsLines.filter(Boolean).length} versos
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => onPlaySong(song)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#4a90d9] text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(74,144,217,0.3)]"
                >
                  <i className="fas fa-play text-xs" />
                  Reproducir
                </button>
                <button
                  onClick={handleShare}
                  className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#4a90d9]/40 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  <i className={`fas ${copied ? 'fa-check' : 'fa-share-nodes'} text-xs`} style={copied ? { color: '#4ade80' } : undefined} />
                  {copied ? '¡Enlace copiado!' : 'Compartir letra'}
                </button>
                {(song.url.includes('youtube') || song.url.includes('youtu.be')) && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/40 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all no-underline"
                  >
                    <i className="fab fa-youtube text-sm" style={{ color: '#ef4444' }} />
                    Ver en YouTube
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT: LYRICS CARD === */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-3xl p-6 md:p-10 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(11,20,38,0.7) 0%, rgba(5,10,20,0.85) 100%)',
                border: '1px solid rgba(74,144,217,0.15)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
              }}
            >
              <i className="fas fa-quote-left absolute top-6 right-8 text-[#4a90d9]/10 text-6xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-white/5 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/25 text-[#4a90d9] text-[9px] font-black uppercase tracking-[0.25em]">
                  <i className="fas fa-file-lines text-xs" />
                  Letra Oficial
                </div>
                {hasLyrics && (
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(song.lyrics || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    style={{
                      background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(74,144,217,0.12)',
                      border: `1px solid ${copied ? 'rgba(74,222,128,0.35)' : 'rgba(74,144,217,0.25)'}`,
                      color: copied ? '#4ade80' : '#4a90d9',
                    }}
                  >
                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
                    {copied ? '¡Letra Copiada!' : 'Copiar Toda la Letra'}
                  </button>
                )}
              </div>

              {hasLyrics ? (
                <div
                  className="space-y-1 relative z-10"
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
                      <p key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/20 text-[#4a90d9] text-[10px] font-black uppercase tracking-widest mt-6 mb-3">
                        <i className="fas fa-star text-[8px]" />
                        {line.replace(/[\[\]]/g, '')}
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
                        className="transition-colors hover:text-blue-300 cursor-pointer select-text relative -mx-3 px-3 rounded-lg hover:bg-white/[0.03]"
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
                <div className="flex flex-col items-center py-20 text-center relative z-10">
                  <div className="w-16 h-16 flex items-center justify-center mb-6 rounded-2xl bg-[#4a90d9]/8 border border-[#4a90d9]/20">
                    <i className="fas fa-file-lines text-2xl" style={{ color: 'rgba(74,144,217,0.4)' }} />
                  </div>
                  <h3 className="font-serif italic text-white font-bold mb-2 text-2xl">
                    Letra no disponible
                  </h3>
                  <p className="text-white/35 text-sm max-w-[300px]">
                    La letra de esta canción aún no ha sido agregada al sistema.
                  </p>
                </div>
              )}
            </div>

            {/* === RELATED SONGS === */}
            {relatedSongs.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-6 h-[2px]" style={{ background: '#2563a8' }} />
                  <span className="label-tag" style={{ color: '#4a90d9' }}>
                    Más letras de {song.artist}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedSongs.map(rs => (
                    <button
                      key={rs.id}
                      onClick={() => navigate(`/letra/${generateSlug(rs.name)}`)}
                      className="group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#4a90d9]/30 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                        <img
                          src={rs.cover}
                          alt={rs.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">{rs.name}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Ver letra completa</p>
                      </div>
                      <i className="fas fa-arrow-right text-white/20 group-hover:text-[#4a90d9] group-hover:translate-x-1 transition-all text-xs" />
                    </button>
                  ))}
                </div>
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
