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

const WeeklyContentAssistant: React.FC<{ catalog: MusicItem[] }> = ({ catalog }) => {
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<'ig' | 'tt' | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCaptions, setAiCaptions] = useState<{ ig: string; tt: string } | null>(null);

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const weekNum = getWeekNumber(today);
    
    // Almacenamos canciones promocionadas para no repetirlas
    const PROMOTED_KEY = 'dg_assistant_promoted_ids';
    const [promotedIds, setPromotedIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem(PROMOTED_KEY) || '[]'); } catch { return []; }
    });

    const markAsPromoted = (id: string) => {
        const next = [...promotedIds, id];
        setPromotedIds(next);
        localStorage.setItem(PROMOTED_KEY, JSON.stringify(next));
    };

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const res = await fetch(GOOGLE_SHEET_URL).then(r => r.json());
                setReleases(res || []);
            } catch (err) {
                console.error("Error loading releases:", err);
            } finally {
                setLoading(false);
            }
        };
        loadReleases();
    }, []);

    const suggestion = useMemo<Suggestion | null>(() => {
        if (catalog.length === 0) return null;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        // Filter out promoted songs
        const freshCatalog = catalog.filter(s => !promotedIds.includes(s.id));
        const pool = freshCatalog.length > 0 ? freshCatalog : catalog; // Fallback if all promoted

        const isDiosmasgymDay = dayOfYear % 2 === 0;
        const dailyArtistName = isDiosmasgymDay ? 'Diosmasgym' : 'Juan 614';
        const dMSongs = pool.filter(s => s.artist.toLowerCase().includes('dios'));
        const j6Songs = pool.filter(s => s.artist.toLowerCase().includes('juan'));
        const dailyPool = isDiosmasgymDay ? (dMSongs.length > 0 ? dMSongs : pool) : (j6Songs.length > 0 ? j6Songs : pool);

        // 1️⃣ New release THIS WEEK from sheet (any artist)
        let releaseThisWeek = null;
        try {
            releaseThisWeek = (releases || []).find(r => {
                const d = new Date(r.releaseDate);
                return d >= startOfWeek && d <= now;
            });
        } catch(e) {}
        if (releaseThisWeek && !promotedIds.includes(releaseThisWeek.name)) {
            const matchedSong = catalog.find(s =>
                s.name.toLowerCase().includes(releaseThisWeek.name.toLowerCase().slice(0, 6)) ||
                releaseThisWeek.name.toLowerCase().includes(s.name.toLowerCase().slice(0, 6))
            );
            const caps = CAPTIONS_BY_TYPE.new_release(releaseThisWeek.name, releaseThisWeek.Artista);
            return {
                song: matchedSong || null,
                reason: `¡Estreno reciente! "${releaseThisWeek.name}" acaba de salir — es el momento ideal para darle fuego.`,
                type: 'new_release',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.new_release,
            };
        }

        // 2️⃣ Recent song (<7 days)
        const recentSong = pool
            .filter(s => s.date && new Date(s.date) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (recentSong) {
            const caps = CAPTIONS_BY_TYPE.recent(recentSong.name, recentSong.artist);
            return {
                song: recentSong,
                reason: `"${recentSong.name}" es tendencia. Aprovecha el impulso de esta semana para maximizar el alcance.`,
                type: 'recent',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.recent,
            };
        }

        // 3️⃣ Rotation: daily artist alternation
        if (dailyPool.length > 0) {
            const idx = dayOfYear % dailyPool.length;
            const picked = dailyPool[idx] || dailyPool[0];
            const caps = CAPTIONS_BY_TYPE.rotation(picked.name, picked.artist);
            return {
                song: picked,
                reason: `Hoy el algoritmo favorece a ${dailyArtistName}. Promociona "${picked.name}" para mantener tu perfil activo.`,
                type: 'rotation',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.rotation,
            };
        }

        // 4️⃣ Old gem
        const gemIdx = (dayOfYear + 10) % pool.length;
        const gem = pool[gemIdx] || pool[0];
        const caps = CAPTIONS_BY_TYPE.old_gem(gem.name, gem.artist);
        return {
            song: gem,
            reason: `Recomendación diaria: Reactiva "${gem.name}". Una joya del catálogo que merece volver a ser escuchada.`,
            type: 'old_gem',
            caption: caps.ig,
            tiktokCaption: caps.tt,
            hashtags: HASHTAG_SETS.old_gem,
        };
        // FINAL FALLBACK: Si nada de lo anterior funcionó (raro), devolvemos la primera del pool
        const fallback = pool[0];
        const fCaps = CAPTIONS_BY_TYPE.rotation(fallback.name, fallback.artist);
        return {
            song: fallback,
            reason: `Promoción del día: "${fallback.name}". Mantén tu catálogo en movimiento.`,
            type: 'rotation',
            caption: fCaps.ig,
            tiktokCaption: fCaps.tt,
            hashtags: HASHTAG_SETS.rotation,
        };
    }, [catalog, releases, dayOfYear, promotedIds]);


    const handleAiGenerate = async () => {
        if (!suggestion?.song) return;
        setAiLoading(true);
        try {
            const prompt = {
                input: `Genera un post viral para redes sociales sobre la canción "${suggestion.song.name}" de ${suggestion.song.artist}. Motivo de la recomendación: ${suggestion.reason}. Incluye una versión para Instagram y otra para TikTok. Mantén un tono épico, de fe y disciplina.`,
                platform: 'Instagram/TikTok',
                goal: 'Inspirar y Viralizar',
                tone: 'Épico y Motivador'
            };

            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify(prompt) })
            });
            const data = await response.json();
            if (data.text) {
                // Dividimos el texto en IG y TT (simple split por keywords o solo mostramos el resultado)
                setAiCaptions({ ig: data.text, tt: data.text });
            }
        } catch (e) {
            console.error("AI Generation failed", e);
        } finally {
            setAiLoading(false);
        }
    };

    const copyText = (text: string, type: 'ig' | 'tt') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleAction = (route: string) => {
        if (suggestion?.song) {
            navigate(route, { state: { song: suggestion.song } });
        } else {
            navigate(route);
        }
    };

    const TYPE_LABELS: Record<Suggestion['type'], { label: string; color: string; icon: string }> = {
        new_release: { label: '🚀 Lanzamiento', color: '#ff4b2b', icon: 'fa-rocket' },
        recent: { label: '🔥 Reciente', color: '#c5a059', icon: 'fa-fire' },
        rotation: { label: '🔄 Rotación Diaria', color: '#3b82f6', icon: 'fa-rotate' },
        old_gem: { label: '💎 Joya del Archivo', color: '#a855f7', icon: 'fa-gem' },
    };

    if (loading) return (
        <div className="mb-16 bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 flex items-center justify-center gap-4">
            <div className="w-5 h-5 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Sincronizando Asistente Inteligente...</p>
        </div>
    );

    if (!suggestion) return null;

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
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <i className={`fas ${typeInfo.icon}`} style={{ color: typeInfo.color }}></i>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: typeInfo.color }}>
                                {typeInfo.label}
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-serif italic text-white leading-tight">
                            {suggestion.song?.name || 'Inspiración Diaria'}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex-1 md:flex-none text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all px-4 py-3 rounded-2xl border border-white/10 hover:border-white/20 flex items-center justify-center gap-2"
                        >
                            <i className={`fas ${isExpanded ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            <span>{isExpanded ? 'Ocultar' : 'Textos'}</span>
                        </button>
                        <button
                            onClick={() => { if(suggestion?.song) markAsPromoted(suggestion.song.id); }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all group"
                        >
                            <span className="text-[9px] font-black uppercase tracking-widest">Siguiente</span>
                            <i className="fas fa-arrow-right text-[10px]"></i>
                        </button>
                    </div>
                </div>

                {/* Song Card */}
                <div className="p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Song info + reason */}
                        <div className="flex-1 flex items-start gap-6">
                            {suggestion.song?.cover && (
                                <div className="relative shrink-0 group">
                                    <img
                                        src={suggestion.song.cover}
                                        alt={suggestion.song.name}
                                        className="w-24 h-24 rounded-2xl object-cover border border-white/10 shadow-xl group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg"
                                        style={{ backgroundColor: typeInfo.color, color: '#000' }}>
                                        <i className={`fas ${typeInfo.icon}`}></i>
                                    </div>
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">
                                    Te sugerimos promocionar
                                </p>
                                <h4 className="text-white text-2xl font-bold truncate mb-1">
                                    {suggestion.song?.name || 'Sin canción'}
                                </h4>
                                <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-4">
                                    {suggestion.song?.artist}
                                </p>
                                <p className="text-white/60 text-sm leading-relaxed max-w-md italic">
                                    "{suggestion.reason}"
                                </p>
                            </div>
                        </div>

                        {/* Right: Quick actions */}
                        <div className="flex flex-col gap-3 lg:w-56 shrink-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Cargar en herramienta</p>
                            <button
                                onClick={() => handleAction('/admin/video-snippet')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059] hover:text-black transition-all group"
                            >
                                <i className="fas fa-film text-[#c5a059] group-hover:text-black w-4"></i>
                                Video Snippet
                            </button>
                            <button
                                onClick={() => handleAction('/admin/promo-image')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059] hover:text-black transition-all group"
                            >
                                <i className="fas fa-image text-[#c5a059] group-hover:text-black w-4"></i>
                                Imagen Promo
                            </button>
                            <button
                                onClick={() => handleAction('/admin/social-post')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059] hover:text-black transition-all group"
                            >
                                <i className="fas fa-bullhorn text-[#c5a059] group-hover:text-black w-4"></i>
                                Post Viral
                            </button>
                            <button
                                onClick={() => handleAction('/admin/lyric-studio')}
                                className="flex items-center gap-3 py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#c5a059] hover:text-black transition-all group"
                            >
                                <i className="fas fa-clapperboard text-[#c5a059] group-hover:text-black w-4"></i>
                                Lyric Studio
                            </button>
                        </div>
                    </div>


                    {/* Expandable: Caption texts */}
                    {isExpanded && (
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                            {/* Instagram */}
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-instagram text-lg" style={{ color: '#E1306C' }}></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption Instagram</span>
                                    </div>
                                    <button
                                        onClick={() => copyText(`${aiCaptions?.ig || suggestion.caption}\n\n${suggestion.hashtags}`, 'ig')}
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
                                <div className="flex-1 overflow-auto max-h-48 mb-4">
                                    <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                        {aiCaptions?.ig || suggestion.caption}
                                    </pre>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[#c5a059] text-[10px] leading-relaxed font-medium break-words">
                                        {suggestion.hashtags}
                                    </p>
                                </div>
                            </div>

                            {/* TikTok */}
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-tiktok text-lg text-white"></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption TikTok</span>
                                    </div>
                                    <button
                                        onClick={() => copyText(`${aiCaptions?.tt || suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`, 'tt')}
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
                                <div className="flex-1 overflow-auto max-h-48 mb-4">
                                    <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                        {aiCaptions?.tt || suggestion.tiktokCaption}
                                    </pre>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[#c5a059] text-[10px] leading-relaxed font-medium break-words">
                                        {suggestion.hashtags} #fyp #parati
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Button */}
                    {isExpanded && (
                        <div className="mt-6 flex justify-center pb-8 px-8">
                            <button
                                onClick={handleAiGenerate}
                                disabled={aiLoading}
                                className={`flex items-center gap-4 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl ${aiLoading ? 'bg-white/10 text-white/30' : 'bg-gradient-to-r from-[#c5a059] to-[#8B5A2B] text-black hover:scale-105 active:scale-95'}`}
                            >
                                {aiLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                        <span>Generando Magia...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-wand-magic-sparkles"></i>
                                        <span>Mejorar textos con IA</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
