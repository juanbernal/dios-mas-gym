import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicItem } from '../types';
import { fetchSavedLyrics } from '../services/musicService';

interface HomeLyricsSectionProps {
  catalog: MusicItem[];
  onPlaySong: (song: MusicItem) => void;
}

interface LyricCardData {
  id: string;
  slug: string;
  title: string;
  artist: string;
  content: string;
  excerpt: string;
  cover: string;
  songMatch?: MusicItem | null;
  isReflection: boolean;
}

const generateSlug = (text: string) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const normalize = (text: string) =>
  (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Extracts a poetic, clean 2-3 line excerpt from lyric content
 */
const extractMeaningfulExcerpt = (content: string): string => {
  if (!content) return '';
  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      const lower = l.toLowerCase();
      if (lower.startsWith('intro') || lower.startsWith('verso') || lower.startsWith('coro') || lower.startsWith('puente') || lower.startsWith('outro')) return false;
      if (lower.startsWith('[') && lower.endsWith(']')) return false;
      return true;
    });

  if (lines.length === 0) {
    return content.slice(0, 140) + '...';
  }

  // Take up to 2-3 impactful lines
  return lines.slice(0, 2).join(' / ');
};

export const HomeLyricsSection: React.FC<HomeLyricsSectionProps> = ({ catalog, onPlaySong }) => {
  const navigate = useNavigate();
  const [savedLyrics, setSavedLyrics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'juan614' | 'diosmasgym' | 'reflexiones'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchSavedLyrics()
      .then(data => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setSavedLyrics(data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Process and combine lyrics from both saved database & catalog
  const allLyricsData = useMemo<LyricCardData[]>(() => {
    const list: LyricCardData[] = [];
    const seenTitles = new Set<string>();

    // 1. Add saved lyrics from database (highest fidelity for text)
    savedLyrics.forEach(l => {
      const title = (l.title || '').trim();
      const normTitle = normalize(title);
      if (!title || seenTitles.has(normTitle)) return;
      seenTitles.add(normTitle);

      const artist = (l.artist || 'Dios Mas Gym').trim();
      const slug = l.slug || l.id || generateSlug(title);
      const isReflection = title.toLowerCase().includes('reflexi') || l.content?.length > 4000;

      // Match with catalog to get audio URL and cover art
      const matchedSong = catalog.find(s => {
        const sNorm = normalize(s.name);
        return sNorm === normTitle || (s.id && s.id === l.id) || generateSlug(s.name) === slug;
      });

      const isJuan = artist.toLowerCase().includes('juan');
      const fallbackCover = isJuan ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png';

      list.push({
        id: l.id || slug,
        slug,
        title,
        artist,
        content: l.content || '',
        excerpt: extractMeaningfulExcerpt(l.content || ''),
        cover: matchedSong?.cover || fallbackCover,
        songMatch: matchedSong || null,
        isReflection,
      });
    });

    // 2. Add any songs from catalog that have embedded lyrics not yet indexed
    catalog.forEach(s => {
      if (s.lyrics && s.lyrics.trim().length > 30) {
        const normTitle = normalize(s.name);
        if (seenTitles.has(normTitle)) return;
        seenTitles.add(normTitle);

        const isJuan = s.artist.toLowerCase().includes('juan');
        const fallbackCover = isJuan ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png';
        const slug = s.id || generateSlug(s.name);

        list.push({
          id: s.id || slug,
          slug,
          title: s.name,
          artist: s.artist,
          content: s.lyrics,
          excerpt: extractMeaningfulExcerpt(s.lyrics),
          cover: s.cover || fallbackCover,
          songMatch: s,
          isReflection: false,
        });
      }
    });

    return list;
  }, [savedLyrics, catalog]);

  // Filtered by tab and search
  const filteredLyrics = useMemo(() => {
    let result = allLyricsData;

    // Filter by tab
    if (activeTab === 'juan614') {
      result = result.filter(l => l.artist.toLowerCase().includes('juan'));
    } else if (activeTab === 'diosmasgym') {
      result = result.filter(l => !l.artist.toLowerCase().includes('juan') && !l.isReflection);
    } else if (activeTab === 'reflexiones') {
      result = result.filter(l => l.isReflection);
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = normalize(searchQuery);
      result = result.filter(l =>
        normalize(l.title).includes(q) ||
        normalize(l.artist).includes(q) ||
        normalize(l.content).includes(q)
      );
    }

    return result;
  }, [allLyricsData, activeTab, searchQuery]);

  return (
    <section id="seccion-letras" className="relative py-16 md:py-24 overflow-hidden bg-[#030711] border-y border-white/5">
      {/* Dynamic background glow and grid */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#2563a8]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[#4a90d9]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative lateral bar */}
      <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-blue-500 via-[#4a90d9]/40 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10">

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/25 text-[#4a90d9] text-[9px] font-black uppercase tracking-[0.25em] mb-4">
              <i className="fas fa-file-lines text-xs" />
              Líricas del Templo &bull; Letras Oficiales
            </div>
            <h2 className="font-serif italic text-4xl sm:text-5xl md:text-7xl text-white leading-tight">
              Barras de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] via-blue-300 to-cyan-300">Fe & Guerra</span>
            </h2>
            <p className="text-xs md:text-sm text-white/50 max-w-2xl mt-3 font-normal leading-relaxed">
              No solo es entrenar el músculo, es blindar el espíritu. Explora las letras completas, 
              conoce los versos que inspiran cada barra y entra a cantar cada alabanza con propósito.
            </p>
          </div>

          {/* Quick search input */}
          <div className="w-full sm:w-80 lg:w-96 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por verso, rima o título..."
              className="w-full bg-white/5 hover:bg-white/10 focus:bg-black/80 text-xs text-white placeholder:text-white/40 pl-10 pr-9 py-3 rounded-2xl border border-white/10 focus:border-[#4a90d9]/60 focus:outline-none transition-all shadow-lg"
            />
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-[#4a90d9] text-black shadow-[0_0_20px_rgba(74,144,217,0.4)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <i className="fas fa-fire-flame-curved" />
            Todas las Letras ({allLyricsData.length})
          </button>

          <button
            onClick={() => setActiveTab('juan614')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'juan614'
                ? 'bg-[#4a90d9] text-black shadow-[0_0_20px_rgba(74,144,217,0.4)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <i className="fas fa-microphone" />
            Juan 614
          </button>

          <button
            onClick={() => setActiveTab('diosmasgym')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'diosmasgym'
                ? 'bg-[#4a90d9] text-black shadow-[0_0_20px_rgba(74,144,217,0.4)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <i className="fas fa-dumbbell" />
            Dios Mas Gym
          </button>

          <button
            onClick={() => setActiveTab('reflexiones')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'reflexiones'
                ? 'bg-[#4a90d9] text-black shadow-[0_0_20px_rgba(74,144,217,0.4)]'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            <i className="fas fa-book-bible" />
            Reflexiones & Mensajes
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4a90d9]/10 border border-[#4a90d9]/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <i className="fas fa-music text-[#4a90d9] text-lg" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Cargando líricas del templo...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredLyrics.length === 0 && (
          <div className="py-16 text-center bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-md mx-auto">
            <i className="fas fa-magnifying-glass text-white/30 text-2xl mb-3" />
            <p className="text-sm font-bold text-white mb-1">No se encontraron letras</p>
            <p className="text-xs text-white/40 mb-4">Intenta con otra búsqueda o selecciona otra categoría.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="px-5 py-2 rounded-full bg-[#4a90d9]/20 text-[#4a90d9] text-xs font-bold hover:bg-[#4a90d9] hover:text-black transition-all"
            >
              Restablecer filtros
            </button>
          </div>
        )}

        {/* Lyrics Grid */}
        {!loading && filteredLyrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredLyrics.slice(0, 6).map((item, idx) => (
              <div
                key={item.id || idx}
                className={`${idx >= 3 ? 'hidden md:flex' : ''} group relative rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden`}
                style={{
                  background: 'linear-gradient(145deg, rgba(11,20,38,0.85) 0%, rgba(5,10,20,0.95) 100%)',
                  border: '1px solid rgba(74,144,217,0.18)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                }}
              >
                {/* Subtle top neon border on hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4a90d9] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  {/* Top bar: Artist & Badge */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#4a90d9] shadow-[0_0_8px_#4a90d9]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#4a90d9]">
                        {item.artist}
                      </span>
                    </div>

                    {item.isReflection ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase tracking-wider">
                        Reflexión
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#4a90d9]/10 border border-[#4a90d9]/25 text-[#4a90d9] text-[8px] font-black uppercase tracking-wider">
                        Lírica Oficial
                      </span>
                    )}
                  </div>

                  {/* Header: Cover + Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-[#4a90d9]/40 transition-colors shadow-md">
                      <img
                        loading="lazy"
                        src={item.cover}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const isJuan = item.artist.toLowerCase().includes('juan');
                          e.currentTarget.src = isJuan ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif italic text-xl md:text-2xl text-white font-bold truncate group-hover:text-blue-300 transition-colors leading-tight mb-1">
                        {item.title}
                      </h3>
                      <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                        <i className="fas fa-lines-leaning text-[9px] text-[#4a90d9]" />
                        {item.content.split('\n').filter(Boolean).length} versos disponibles
                      </p>
                    </div>
                  </div>

                  {/* Excerpt box / Barra de Fe */}
                  {item.excerpt && (
                    <div className="relative p-4 rounded-2xl bg-white/[0.03] border border-white/5 mb-5 group-hover:border-[#4a90d9]/20 transition-colors">
                      <i className="fas fa-quote-left absolute -top-2 left-4 text-[#4a90d9]/40 text-xs" />
                      <p className="font-serif italic text-xs text-white/80 line-clamp-3 leading-relaxed pt-1">
                        "{item.excerpt}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Enter Lyrics & Play */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  {/* Main CTA: Entrar a la letra */}
                  <button
                    onClick={() => navigate(`/letra/${item.slug}`)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#4a90d9] text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(74,144,217,0.3)]"
                  >
                    <i className="fas fa-book-open text-xs" />
                    Entrar a la Letra
                    <i className="fas fa-arrow-right text-[9px] ml-0.5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Play button if song is matched */}
                  {item.songMatch && (
                    <button
                      onClick={() => onPlaySong(item.songMatch!)}
                      title="Escuchar canción"
                      className="w-11 h-11 rounded-xl bg-white/10 hover:bg-[#4a90d9]/20 border border-white/10 hover:border-[#4a90d9]/40 text-white hover:text-[#4a90d9] flex items-center justify-center transition-all"
                    >
                      <i className="fas fa-play text-xs ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All / Explore Full Catalog Link */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 rounded-3xl bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-blue-950/40 border border-[#4a90d9]/25 backdrop-blur-md">
            <div className="text-center sm:text-left">
              <h4 className="font-serif italic text-xl text-white font-bold">
                ¿Buscas una letra en específico?
              </h4>
              <p className="text-xs text-white/50">
                Accede al buscador con más de 50 letras y reflexiones indexadas.
              </p>
            </div>
            <button
              onClick={() => navigate('/buscar')}
              className="px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-[#4a90d9] text-white hover:text-black border border-white/20 hover:border-transparent text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
            >
              <i className="fas fa-search text-xs" />
              Explorar Todas las Letras
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomeLyricsSection;
