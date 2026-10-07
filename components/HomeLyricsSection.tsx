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
    .map(l => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(l => {
      if (!l) return false;
      const lower = l.toLowerCase();
      if (/^(intro|verso|coro|puente|outro|pre-?coro|estribillo)\b/.test(lower)) return false;
      if (lower.startsWith('[') && lower.endsWith(']')) return false;
      if (lower.startsWith('(') && lower.endsWith(')')) return false;
      return true;
    });

  if (lines.length === 0) return content.slice(0, 120).trim();

  // La "barra" es el gancho: la linea que mas se repite (el coro). Si nada se repite,
  // la primera linea con fuerza.
  const counts = new Map<string, { line: string; n: number }>();
  for (const l of lines) {
    if (l.length < 14 || l.length > 95) continue;
    const key = l.toLowerCase().replace(/[^a-záéíóúñü0-9 ]/gi, '');
    const c = counts.get(key);
    if (c) c.n++; else counts.set(key, { line: l, n: 1 });
  }
  const best = [...counts.values()].sort((x, y) => y.n - x.n)[0];
  if (best && best.n >= 2) {
    const i = lines.indexOf(best.line);
    const next = lines[i + 1];
    return next && next.length <= 80 && best.line.length + next.length < 120 ? `${best.line} / ${next}` : best.line;
  }
  const first = lines.find(l => l.length >= 14) || lines[0];
  return first.length > 120 ? first.slice(0, 117) + '…' : first;
};

export const HomeLyricsSection: React.FC<HomeLyricsSectionProps> = ({ catalog, onPlaySong }) => {
  const navigate = useNavigate();
  const [savedLyrics, setSavedLyrics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'juan614' | 'diosmasgym' | 'reflexiones'>('all');
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

      const artist = (l.artist || 'Diosmasgym').trim();
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

    return result;
  }, [allLyricsData, activeTab]);

  return (
    <section id="seccion-letras" className="relative py-12 md:py-20 overflow-hidden bg-[#030711] border-y border-white/5">
      {/* Dynamic background glow and grid */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#2563a8]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[#4a90d9]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative lateral bar */}
      <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-blue-500 via-[#4a90d9]/40 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-16 relative z-10">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 md:mb-10">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3">
              <i className="fas fa-microphone-lines mr-2" />Letras oficiales
            </div>
            <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-none">
              Barras de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] via-blue-300 to-cyan-300">Fe & Guerra</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-6 px-6 md:mx-0 md:px-0">
            {([
              ['all', 'Todas'],
              ['diosmasgym', 'Diosmasgym'],
              ['juan614', 'Juan 614'],
              ['reflexiones', 'Reflexiones'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                  activeTab === id ? 'bg-white text-black' : 'bg-white/5 text-white/60 border border-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => <div key={i} className="h-72 rounded-3xl bg-white/[0.04] animate-pulse" />)}
          </div>
        )}

        {!loading && filteredLyrics.length === 0 && (
          <p className="py-12 text-center text-sm text-white/50">No hay letras en esta categoría todavía.</p>
        )}

        {/* Tarjetas: la barra en grande sobre la portada */}
        {!loading && filteredLyrics.length > 0 && (
          <div className="flex md:grid md:grid-cols-3 md:grid-rows-2 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-6 -mx-6 px-6 md:mx-0 md:px-0 pb-2 scrollbar-none">
            {filteredLyrics.slice(0, 5).map((item, idx) => {
              const featured = idx === 0;
              return (
                <article
                  key={item.id || idx}
                  onClick={() => navigate(`/letra/${item.slug}`)}
                  className={`group relative flex-shrink-0 w-[85%] sm:w-[60%] md:w-auto snap-center cursor-pointer overflow-hidden rounded-3xl border border-white/10 hover:border-[#4a90d9]/50 transition-colors ${featured ? 'md:row-span-2 min-h-[340px] md:min-h-[520px]' : 'min-h-[340px] md:min-h-[250px]'}`}
                >
                  <img
                    loading="lazy"
                    src={item.cover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-110 opacity-50 group-hover:opacity-65 group-hover:scale-125 transition-all duration-700"
                    onError={(e) => {
                      const isJuan = item.artist.toLowerCase().includes('juan');
                      e.currentTarget.src = isJuan ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030711] via-[#030711]/85 to-[#030711]/30" />

                  <div className="relative h-full flex flex-col justify-end p-6 md:p-7">
                    <i className="fas fa-quote-left text-[#4a90d9] text-2xl mb-3" aria-hidden="true" />
                    <p className={`font-serif text-white leading-[1.15] mb-5 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] ${featured ? 'text-3xl md:text-5xl line-clamp-5' : 'text-2xl md:text-[1.6rem] line-clamp-3'}`}>
                      {item.excerpt.split(' / ').map((l, i) => <span key={i} className="block">{l}</span>)}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-sm md:text-base truncate group-hover:text-[#7eb8f7] transition-colors">{item.title}</h3>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/45 mt-0.5">
                          {item.isReflection ? 'Reflexión' : item.artist}
                        </p>
                      </div>
                      {item.songMatch && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onPlaySong(item.songMatch!); }}
                          aria-label={`Escuchar ${item.title}`}
                          className="w-11 h-11 flex-shrink-0 rounded-full bg-[#4a90d9] text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(74,144,217,0.5)]"
                        >
                          <i className="fas fa-play text-xs ml-0.5" />
                        </button>
                      )}
                      <span className="w-11 h-11 flex-shrink-0 rounded-full border border-white/20 text-white/80 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors" aria-hidden="true">
                        <i className="fas fa-arrow-right text-xs" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/buscar')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/80 hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
          >
            Ver todas las letras ({allLyricsData.length}) <i className="fas fa-arrow-right text-[9px]" />
          </button>
        </div>

      </div>
    </section>
  );
};

export default HomeLyricsSection;
