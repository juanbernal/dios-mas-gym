import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

interface ReleaseData {
    Artista: string;
    name: string;
    releaseDate: string;
    preSaveLink?: string;
    audioUrl?: string;
    coverImageUrl?: string;
}

interface Suggestion {
    song: MusicItem | null;
    reason: string;
    type: 'new_release' | 'recent' | 'rotation' | 'old_gem';
    caption: string;
    hashtags: string;
    tiktokCaption: string;
}

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

const CAPTIONS_BY_TYPE: Record<Suggestion['type'], (name: string, artist: string) => { ig: string; tt: string }> = {
    new_release: (name, artist) => ({
        ig: `🔥 ¡NUEVO LANZAMIENTO! «${name}» — ${artist}\n\nEsta canción fue hecha para el que no se rinde. Dale play y siéntelo.\n\n👇 Link en bio para escucharla completa.`,
        tt: `¡${name} ya está disponible! 🎵 Si buscas música que te mueva el alma, esto es para ti. ¡Dale like si te llega al corazón! ❤️‍🔥`,
    }),
    recent: (name, artist) => ({
        ig: `🎵 ¿Ya escuchaste «${name}»?\n\n${artist} lo hizo de nuevo. Una canción que no te puedes perder.\n\n▶️ Disponible en todas las plataformas — Link en bio.`,
        tt: `No pueden perderse «${name}» — ${artist} 🙏 Esta canción dice lo que muchos sienten pero no saben expresar. ¡Compártela!`,
    }),
    rotation: (name, artist) => ({
        ig: `♻️ REACTIVANDO CLÁSICO\n\n«${name}» — ${artist}\n\nHay canciones que nunca pasan de moda. Esta es una de ellas.\n\n🎧 Link en bio.`,
        tt: `¿Ya conocías esta joya? «${name}» de ${artist} 💿 A veces los mejores temas son los que ya tienes guardados.`,
    }),
    old_gem: (name, artist) => ({
        ig: `💎 JOYA DEL ARCHIVO\n\n«${name}» — ${artist}\n\nDe las canciones que no salen del alma. Redescúbrela esta semana.\n\n🎧 Link en bio.`,
        tt: `Desempolvando «${name}» 🎶 ${artist} lo grabó hace tiempo pero sigue pegando fuerte. ¿La habías escuchado?`,
    }),
};

const HASHTAG_SETS: Record<Suggestion['type'], string> = {
    new_release: '#DiosMasGym #NuevoLanzamiento #MusicaCristiana #UrbanoCristiano #Fe #Gym #NuevaMusica #Christian',
    recent: '#DiosMasGym #MusicaCristiana #UrbanoCristiano #Fe #Motivacion #Gym #WorkoutMusic',
    rotation: '#DiosMasGym #MusicaCristiana #Clasico #UrbanoCristiano #Spotify #Playlist #Fe',
    old_gem: '#DiosMasGym #OldGem #MusicaCristiana #Archivo #Joya #UrbanoCristiano #Fe',
};

const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const WeeklyContentAssistant: React.FC = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<'ig' | 'tt' | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const today = new Date();
    const isMonday = today.getDay() === 1;
    const weekNum = getWeekNumber(today);
    const STORAGE_KEY = `dg_assistant_dismissed_w${weekNum}`;
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

    useEffect(() => {
        const load = async () => {
            try {
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614'),
                ]);
                setCatalog([...dM, ...j6]);

                const res = await fetch(`${GOOGLE_SHEET_URL}?read=true&t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json() as any[];
                    const normalized: ReleaseData[] = data.map(r => {
                        const find = (keys: string[]) => {
                            const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
                            return k ? r[k] : '';
                        };
                        return {
                            Artista: find(['artista']),
                            name: find(['name', 'nombre', 'titulo', 'título']),
                            releaseDate: find(['releasedate', 'fecha']),
                            preSaveLink: find(['presavelink', 'spotify']),
                            audioUrl: find(['audiourl', 'youtube']),
                            coverImageUrl: find(['coverimageurl', 'imagen', 'portada']),
                        };
                    });
                    setReleases(normalized);
                }
            } catch (e) {
                console.error('WeeklyAssistant load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const suggestion = useMemo<Suggestion | null>(() => {
        if (catalog.length === 0) return null;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        // Split catalog by artist for alternation
        const dMSongs = catalog.filter(s => s.artist.toLowerCase().includes('dios'));
        const j6Songs = catalog.filter(s => s.artist.toLowerCase().includes('juan'));
        // Even week = Diosmasgym, Odd week = Juan 614
        const thisWeekPool = weekNum % 2 === 0 ? dMSongs : j6Songs;
        const thisWeekName = weekNum % 2 === 0 ? 'Diosmasgym' : 'Juan 614';

        // 1️⃣ New release THIS WEEK from sheet (any artist)
        const releaseThisWeek = releases.find(r => {
            const d = new Date(r.releaseDate);
            return d >= startOfWeek && d <= now;
        });
        if (releaseThisWeek) {
            const matchedSong = catalog.find(s =>
                s.name.toLowerCase().includes(releaseThisWeek.name.toLowerCase().slice(0, 6)) ||
                releaseThisWeek.name.toLowerCase().includes(s.name.toLowerCase().slice(0, 6))
            );
            const caps = CAPTIONS_BY_TYPE.new_release(releaseThisWeek.name, releaseThisWeek.Artista);
            return {
                song: matchedSong || null,
                reason: `¡Estreno esta semana! "${releaseThisWeek.name}" acaba de salir — es el momento ideal para hacer ruido en redes.`,
                type: 'new_release',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.new_release,
            };
        }

        // 2️⃣ Recent song (<7 days) — prefer this week's artist
        const recentFromPool = thisWeekPool
            .filter(s => s.date && new Date(s.date) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const recentAny = catalog
            .filter(s => s.date && new Date(s.date) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const recentSong = recentFromPool || recentAny;
        if (recentSong) {
            const caps = CAPTIONS_BY_TYPE.recent(recentSong.name, recentSong.artist);
            return {
                song: recentSong,
                reason: `"${recentSong.name}" salió hace menos de 7 días. Aprovecha el impulso inicial para maximizar el alcance.`,
                type: 'recent',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.recent,
            };
        }

        // 3️⃣ Rotation: strictly from THIS WEEK's artist (alternates every week)
        const rotPool = thisWeekPool.filter(s => s.date && new Date(s.date) >= thirtyDaysAgo);
        const rotationPool = rotPool.length > 0 ? rotPool : thisWeekPool;
        if (rotationPool.length > 0) {
            const idx = weekNum % rotationPool.length;
            const picked = rotationPool[idx] || rotationPool[0];
            const caps = CAPTIONS_BY_TYPE.rotation(picked.name, picked.artist);
            return {
                song: picked,
                reason: `Esta semana le toca a ${thisWeekName} (semana ${weekNum}). Promociona "${picked.name}" para mantener el algoritmo activo.`,
                type: 'rotation',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.rotation,
            };
        }

        // 4️⃣ Old gem from this week's artist
        const gemPool = thisWeekPool.length > 0 ? thisWeekPool : catalog;
        const gemIdx = weekNum % gemPool.length;
        const gem = gemPool[gemIdx] || gemPool[0];
        const caps = CAPTIONS_BY_TYPE.old_gem(gem.name, gem.artist);
        return {
            song: gem,
            reason: `Turno de ${thisWeekName} esta semana. Reactiva "${gem.name}" — una joya que merece volver a circular.`,
            type: 'old_gem',
            caption: caps.ig,
            tiktokCaption: caps.tt,
            hashtags: HASHTAG_SETS.old_gem,
        };
    }, [catalog, releases, weekNum]);


    const copyText = (text: string, type: 'ig' | 'tt') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const TYPE_LABELS: Record<Suggestion['type'], { label: string; color: string; icon: string }> = {
        new_release: { label: '🚀 Lanzamiento', color: '#ff4b2b', icon: 'fa-rocket' },
        recent: { label: '🔥 Reciente', color: '#c5a059', icon: 'fa-fire' },
        rotation: { label: '🔄 Rotación', color: '#3b82f6', icon: 'fa-rotate' },
        old_gem: { label: '💎 Joya del Archivo', color: '#a855f7', icon: 'fa-gem' },
    };

    if (dismissed || loading || !suggestion) return null;

    const typeInfo = TYPE_LABELS[suggestion.type];

    return (
        <div className="mb-16 relative overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {/* Glow background */}
            <div className="absolute -top-20 -left-10 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ backgroundColor: typeInfo.color }} />

            <div className="bg-[#0f111a] border rounded-[2rem] overflow-hidden shadow-2xl"
                style={{ borderColor: `${typeInfo.color}30` }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b"
                    style={{ borderColor: `${typeInfo.color}15`, background: `linear-gradient(135deg, ${typeInfo.color}08, transparent)` }}>
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                            style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color, border: `1px solid ${typeInfo.color}30` }}>
                            <i className={`fas ${typeInfo.icon}`}></i>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.4em]"
                                    style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                                {isMonday && (
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-[#c5a059]/10 text-[#c5a059] px-3 py-1 rounded-full border border-[#c5a059]/20">
                                        📅 Recomendación del Lunes
                                    </span>
                                )}
                            </div>
                            <h3 className="text-white font-bold text-lg leading-tight">
                                Asistente de Contenido Semanal
                            </h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all px-4 py-2 rounded-full border border-white/10 hover:border-white/20"
                        >
                            {isExpanded ? 'Colapsar' : 'Ver textos'}
                        </button>
                        <button
                            onClick={() => { setDismissed(true); localStorage.setItem(STORAGE_KEY, 'true'); }}
                            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                </div>

                {/* Song Card */}
                <div className="p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Song info + reason */}
                        <div className="flex-1 flex items-start gap-6">
                            {suggestion.song?.cover && (
                                <div className="relative shrink-0">
                                    <img
                                        src={suggestion.song.cover}
                                        alt={suggestion.song.name}
                                        className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-xl"
                                    />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg"
                                        style={{ backgroundColor: typeInfo.color, color: '#000' }}>
                                        <i className={`fas ${typeInfo.icon}`}></i>
                                    </div>
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">
                                    Esta semana promociona
                                </p>
                                <h4 className="text-white text-2xl font-bold truncate mb-1">
                                    {suggestion.song?.name || 'Sin canción'}
                                </h4>
                                <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-4">
                                    {suggestion.song?.artist}
                                </p>
                                <p className="text-white/60 text-sm leading-relaxed max-w-md">
                                    {suggestion.reason}
                                </p>
                            </div>
                        </div>

                        {/* Right: Quick actions */}
                        <div className="flex flex-col gap-3 lg:w-56 shrink-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Acciones Rápidas</p>
                            <button
                                onClick={() => navigate('/admin/video-snippet')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059]/10 hover:border-[#c5a059]/30 transition-all"
                            >
                                <i className="fas fa-film text-[#c5a059] w-4"></i>
                                Video Snippet
                            </button>
                            <button
                                onClick={() => navigate('/admin/promo-image')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059]/10 hover:border-[#c5a059]/30 transition-all"
                            >
                                <i className="fas fa-image text-[#c5a059] w-4"></i>
                                Imagen Promo
                            </button>
                            <button
                                onClick={() => navigate('/admin/social-post')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059]/10 hover:border-[#c5a059]/30 transition-all"
                            >
                                <i className="fas fa-bullhorn text-[#c5a059] w-4"></i>
                                Post Viral
                            </button>
                            <button
                                onClick={() => navigate('/admin/lyric-studio')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059]/10 hover:border-[#c5a059]/30 transition-all"
                            >
                                <i className="fas fa-clapperboard text-[#c5a059] w-4"></i>
                                Lyric Studio
                            </button>
                        </div>
                    </div>

                    {/* Expandable: Caption texts */}
                    {isExpanded && (
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                            {/* Instagram */}
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-instagram text-lg" style={{ color: '#E1306C' }}></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption Instagram</span>
                                    </div>
                                    <button
                                        onClick={() => copyText(`${suggestion.caption}\n\n${suggestion.hashtags}`, 'ig')}
                                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all"
                                        style={{
                                            backgroundColor: copied === 'ig' ? '#10b981' : 'rgba(255,255,255,0.05)',
                                            color: copied === 'ig' ? '#fff' : 'rgba(255,255,255,0.4)',
                                            border: copied === 'ig' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        {copied === 'ig' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                    {suggestion.caption}
                                </pre>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[#c5a059] text-[10px] leading-relaxed font-medium break-words">
                                        {suggestion.hashtags}
                                    </p>
                                </div>
                            </div>

                            {/* TikTok */}
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-tiktok text-lg text-white"></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption TikTok</span>
                                    </div>
                                    <button
                                        onClick={() => copyText(`${suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`, 'tt')}
                                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all"
                                        style={{
                                            backgroundColor: copied === 'tt' ? '#10b981' : 'rgba(255,255,255,0.05)',
                                            color: copied === 'tt' ? '#fff' : 'rgba(255,255,255,0.4)',
                                            border: copied === 'tt' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        {copied === 'tt' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                    {suggestion.tiktokCaption}
                                </pre>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[#c5a059] text-[10px] leading-relaxed font-medium break-words">
                                        {suggestion.hashtags} #fyp #parati
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
