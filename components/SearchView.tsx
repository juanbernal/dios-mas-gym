import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MusicCard from './MusicCard';
import { MusicItem } from '../types';
import { fetchSavedLyrics } from '../services/musicService';

interface SearchViewProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

type ArtistFilter = 'all' | 'diosmasgym' | 'juan614';
type TypeFilter = 'all' | string;

const SearchView: React.FC<SearchViewProps> = ({ catalog, onPlaySong }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('q') || '';
  });
  const [artistFilter, setArtistFilter] = useState<ArtistFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [savedLyrics, setSavedLyrics] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get('q');
    if (qParam !== null && qParam !== query) {
      setQuery(qParam);
    }
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;
    fetchSavedLyrics()
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setSavedLyrics(data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Enrich catalog with saved lyrics from database
  const enrichedCatalog = useMemo(() => {
    if (!savedLyrics || savedLyrics.length === 0) return catalog;
    const norm = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return catalog.map(song => {
      if (song.lyrics && song.lyrics.trim().length > 50) return song;
      const sNameNorm = norm(song.name);
      const sIdNorm = norm(song.id);
      const matched = savedLyrics.find(l => {
        const lTitleNorm = norm(l.title || '');
        return l.id === song.id || (sIdNorm && l.id === sIdNorm) || (lTitleNorm && sNameNorm && (lTitleNorm === sNameNorm || sNameNorm.includes(lTitleNorm) || lTitleNorm.includes(sNameNorm)));
      });
      if (matched?.content) {
        return { ...song, lyrics: matched.content };
      }
      return song;
    });
  }, [catalog, savedLyrics]);

  // Get unique types from catalog
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    enrichedCatalog.forEach(s => { if (s.type) types.add(s.type); });
    return Array.from(types).sort();
  }, [enrichedCatalog]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return enrichedCatalog.filter(song => {
      const matchQuery = !q
        || song.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        || song.artist?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        || song.album?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
        || song.lyrics?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);

      const matchArtist = artistFilter === 'all'
        || (artistFilter === 'diosmasgym' && !song.artist?.toLowerCase().includes('juan'))
        || (artistFilter === 'juan614' && song.artist?.toLowerCase().includes('juan'));

      const matchType = typeFilter === 'all' || song.type === typeFilter;

      return matchQuery && matchArtist && matchType;
    });
  }, [enrichedCatalog, query, artistFilter, typeFilter]);

  const clearAll = useCallback(() => {
    setQuery('');
    setArtistFilter('all');
    setTypeFilter('all');
  }, []);

  const hasFilters = query || artistFilter !== 'all' || typeFilter !== 'all';

  return (
    <section
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }} />

      {/* BG glow */}
      <div className="absolute pointer-events-none"
        style={{
          top: '-10%', right: '-10%',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(37,99,168,0.1) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      <div className="section-container relative z-10 py-20">

        {/* === HEADER === */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="label-tag mb-6 flex items-center gap-2 hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(200,205,212,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <i className="fas fa-arrow-left" />
            Volver
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-[2px]" style={{ background: '#2563a8' }} />
            <span className="label-tag" style={{ color: '#4a90d9' }}>✝ Arsenal Musical ✝</span>
          </div>

          <h1 className="h2-display text-white" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', marginBottom: '0.5rem' }}>
            Buscar Música
          </h1>
          <p className="label-tag" style={{ color: 'rgba(200,205,212,0.35)', letterSpacing: '0.25em' }}>
            {catalog.length} canciones disponibles
          </p>
        </div>

        {/* === SEARCH INPUT === */}
        <div className="relative mb-8">
          <div
            className="flex items-center gap-4 px-6 py-4"
            style={{
              background: 'rgba(8,24,48,0.8)',
              border: '1px solid rgba(37,99,168,0.25)',
              borderRadius: '3px',
              backdropFilter: 'blur(16px)',
            }}
          >
            <i className="fas fa-search text-lg flex-shrink-0" style={{ color: '#4a90d9' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por título, artista, álbum o letra..."
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f1f5f9',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(200,205,212,0.4)' }}
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>

        {/* === FILTERS === */}
        <div className="flex flex-wrap gap-3 mb-10">
          {/* Artist filter */}
          <div className="flex items-center gap-2">
            <span className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>ARTISTA:</span>
            {([
              { val: 'all', label: 'Todos' },
              { val: 'diosmasgym', label: 'Diosmasgym' },
              { val: 'juan614', label: 'Juan 614' },
            ] as { val: ArtistFilter; label: string }[]).map(opt => (
              <button
                key={opt.val}
                onClick={() => setArtistFilter(opt.val)}
                className="label-tag px-3 py-1.5 transition-all"
                style={{
                  background: artistFilter === opt.val ? 'rgba(37,99,168,0.3)' : 'rgba(8,24,48,0.6)',
                  border: `1px solid ${artistFilter === opt.val ? '#4a90d9' : 'rgba(37,99,168,0.2)'}`,
                  color: artistFilter === opt.val ? '#7eb8f7' : 'rgba(200,205,212,0.4)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '0.5rem',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          {availableTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.5rem' }}>TIPO:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className="label-tag px-3 py-1.5 transition-all"
                style={{
                  background: typeFilter === 'all' ? 'rgba(37,99,168,0.3)' : 'rgba(8,24,48,0.6)',
                  border: `1px solid ${typeFilter === 'all' ? '#4a90d9' : 'rgba(37,99,168,0.2)'}`,
                  color: typeFilter === 'all' ? '#7eb8f7' : 'rgba(200,205,212,0.4)',
                  borderRadius: '2px', cursor: 'pointer', fontSize: '0.5rem',
                }}
              >
                Todos
              </button>
              {availableTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className="label-tag px-3 py-1.5 transition-all"
                  style={{
                    background: typeFilter === type ? 'rgba(37,99,168,0.3)' : 'rgba(8,24,48,0.6)',
                    border: `1px solid ${typeFilter === type ? '#4a90d9' : 'rgba(37,99,168,0.2)'}`,
                    color: typeFilter === type ? '#7eb8f7' : 'rgba(200,205,212,0.4)',
                    borderRadius: '2px', cursor: 'pointer', fontSize: '0.5rem',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Clear all */}
          {hasFilters && (
            <button
              onClick={clearAll}
              className="label-tag px-3 py-1.5 transition-all"
              style={{
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.25)',
                color: 'rgba(220,38,38,0.7)',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '0.5rem',
                marginLeft: 'auto',
              }}
            >
              <i className="fas fa-times mr-1" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* === RESULTS COUNT === */}
        <div className="flex items-center gap-3 mb-8 pb-4"
          style={{ borderBottom: '1px solid rgba(37,99,168,0.1)' }}>
          <div className="w-4 h-[2px]" style={{ background: '#2563a8' }} />
          <span className="label-tag" style={{ color: 'rgba(200,205,212,0.4)' }}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
            {query && ` para "${query}"`}
          </span>
        </div>

        {/* === RESULTS GRID === */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((song, idx) => {
              const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
              let lyricMatchSnippet: string | null = null;
              if (q && q.length >= 2 && song.lyrics) {
                const lines = song.lyrics.split('\n');
                const matchedLine = lines.find(l => 
                  l.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
                );
                if (matchedLine) {
                  lyricMatchSnippet = matchedLine.trim();
                }
              }

              return (
                <div key={song.id} className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}>
                  <MusicCard item={song} onPlay={() => onPlaySong(song)} />
                  {lyricMatchSnippet && (
                    <div 
                      onClick={() => navigate(`/letra/${song.id}`)}
                      className="cursor-pointer px-3.5 py-2 rounded-xl bg-[#4a90d9]/10 hover:bg-[#4a90d9]/20 border border-[#4a90d9]/30 text-xs text-[#7eb8f7] transition-all flex items-center justify-between gap-3 group shadow-sm"
                      title="Ver letra completa"
                    >
                      <span className="truncate italic">
                        <i className="fas fa-quote-left text-[9px] text-[#4a90d9] mr-1.5 opacity-70"></i>
                        "{lyricMatchSnippet}"
                      </span>
                      <span className="not-italic text-[9px] font-black uppercase text-[#4a90d9] tracking-wider shrink-0 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Ver Letra <i className="fas fa-arrow-right text-[8px]"></i>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-24 text-center">
            <div
              className="w-20 h-20 flex items-center justify-center mb-6"
              style={{ background: 'rgba(37,99,168,0.08)', border: '1px solid rgba(37,99,168,0.2)', borderRadius: '4px' }}
            >
              <i className="fas fa-music text-3xl" style={{ color: 'rgba(74,144,217,0.4)' }} />
            </div>
            <h3 className="h2-display text-white mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
              Sin resultados
            </h3>
            <p style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.9rem' }}>
              No hay canciones que coincidan con tu búsqueda.
            </p>
            <button onClick={clearAll} className="btn-secondary mt-6"
              style={{ clipPath: 'none', borderRadius: '2px' }}>
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchView;
