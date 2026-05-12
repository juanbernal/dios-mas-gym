import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicItem } from '../../types';

interface ReleaseData {
    name: string;
    Artista: string;
    releaseDate: string;
}

interface Suggestion {
    song: MusicItem | null;
    reason: string;
    type: 'new_release' | 'recent' | 'rotation' | 'old_gem';
    caption: string;
    tiktokCaption: string;
    hashtags: string;
}

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby5C_0B369l_t69r7x7o7y5K-C9X9xX9x/exec"; // Placeholder, real one is in the file
const PROMOTED_KEY = 'content_assistant_promoted_ids';

const HASHTAG_SETS = {
    new_release: "#estreno #musicanueva #estrenomusical #diosmasgym #juan614 #vivaelrey",
    recent: "#tendencia #viral #musica #reel #tiktokmusic",
    rotation: "#disciplina #gymmotivation #fe #musicaurbana",
    old_gem: "#tbt #clasico #joya #musicaquetoca",
};

const CAPTIONS_BY_TYPE = {
    new_release: (name: string, artist: string) => ({
        ig: `¡Acaba de salir! 🚀 "${name}" de ${artist}. Ya disponible en todas las plataformas. No te quedes fuera del movimiento.`,
        tt: `¿Ya escuchaste lo nuevo? 🔥 "${name}" - ${artist}. Dale amor al audio y únete al trend.`
    }),
    recent: (name: string, artist: string) => ({
        ig: `El fuego sigue encendido con "${name}". ⚡️ Si no la tienes en tu playlist de entrenamiento, te falta disciplina.`,
        tt: `Esta canción está rompiendo. 📈 "${name}" de ${artist}. Úsala para tus videos.`
    }),
    rotation: (name: string, artist: string) => ({
        ig: `Disciplina sobre motivación. 🥊 Hoy toca darle duro con "${name}" de ${artist}.`,
        tt: `El ritmo que necesitas para hoy. 😤 "${name}" - ${artist}.`
    }),
    old_gem: (name: string, artist: string) => ({
        ig: `Un clásico que nunca falla. 💎 ¿Te acuerdas de "${name}"? Sigue pegando igual de fuerte.`,
        tt: `Joyas que no pasan de moda. ✨ "${name}" de ${artist}.`
    })
};

const WeeklyContentAssistant: React.FC<{ catalog: MusicItem[] }> = ({ catalog = [] }) => {
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<'ig' | 'tt' | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCaptions, setAiCaptions] = useState<{ ig: string; tt: string } | null>(null);
    const [promotedIds, setPromotedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(PROMOTED_KEY) || '[]');
        } catch { return []; }
    });

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    const markAsPromoted = (id: string) => {
        const next = [...promotedIds, id];
        setPromotedIds(next);
        localStorage.setItem(PROMOTED_KEY, JSON.stringify(next));
    };

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const res = await fetch("https://script.google.com/macros/s/AKfycby5-Y8O5uI2-B3wXmX2v8B3z-z-z/exec").then(r => r.json());
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
        if (!catalog || catalog.length === 0) return null;

        const freshCatalog = catalog.filter(s => !promotedIds.includes(s.id));
        const pool = freshCatalog.length > 0 ? freshCatalog : catalog;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const isDiosmasgymDay = dayOfYear % 2 === 0;
        const dailyArtistName = isDiosmasgymDay ? 'Diosmasgym' : 'Juan 614';
        const dMSongs = pool.filter(s => s.artist.toLowerCase().includes('dios'));
        const j6Songs = pool.filter(s => s.artist.toLowerCase().includes('juan'));
        const dailyPool = isDiosmasgymDay ? (dMSongs.length > 0 ? dMSongs : pool) : (j6Songs.length > 0 ? j6Songs : pool);

        // 1. New release this week
        let releaseThisWeek = null;
        try {
            releaseThisWeek = (releases || []).find(r => {
                const d = new Date(r.releaseDate);
                return d >= startOfWeek && d <= now;
            });
        } catch(e) {}

        if (releaseThisWeek && !promotedIds.includes(releaseThisWeek.name)) {
            const matchedSong = catalog.find(s =>
                s.name.toLowerCase().includes(releaseThisWeek.name.toLowerCase().slice(0, 6))
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

        // 2. Recent
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

        // 3. Rotation
        const rotationIdx = dayOfYear % dailyPool.length;
        const picked = dailyPool[rotationIdx];
        if (picked) {
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

        // 4. Old gem
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
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Sincronizando Asistente...</p>
        </div>
    );

    if (!suggestion) return null;

    const typeInfo = TYPE_LABELS[suggestion.type];

    return (
        <div className="mb-16 relative overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
            <div className="absolute -top-20 -left-10 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ backgroundColor: typeInfo.color }} />

            <div className="bg-[#0f111a] border rounded-[2rem] overflow-hidden shadow-2xl"
                style={{ borderColor: `${typeInfo.color}30` }}>

                {/* Header Section */}
                <div className="px-8 py-8 border-b"
                    style={{ borderColor: `${typeInfo.color}15`, background: `linear-gradient(135deg, ${typeInfo.color}08, transparent)` }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                                className="flex-1 md:flex-none text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all px-4 py-3 rounded-2xl border border-white/10 flex items-center justify-center gap-2"
                            >
                                <i className={`fas ${isExpanded ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                <span>{isExpanded ? 'Ocultar' : 'Textos'}</span>
                            </button>
                            <button
                                onClick={() => { if(suggestion?.song) markAsPromoted(suggestion.song.id); }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all"
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest">Siguiente</span>
                                <i className="fas fa-arrow-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 flex items-start gap-6">
                            {suggestion.song?.cover && (
                                <div className="relative shrink-0">
                                    <img src={suggestion.song.cover} alt={suggestion.song.name} className="w-24 h-24 rounded-2xl object-cover border border-white/10" />
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs"
                                        style={{ backgroundColor: typeInfo.color, color: '#000' }}>
                                        <i className={`fas ${typeInfo.icon}`}></i>
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Recomendación Estratégica</p>
                                <p className="text-white/80 text-sm md:text-base leading-relaxed font-light italic">
                                    "{suggestion.reason}"
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:w-56 shrink-0">
                            <button onClick={() => handleAction('/admin/promo-image')} className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-left">Imagen Promo</span>
                                <i className="fas fa-image text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button onClick={() => handleAction('/admin/video-snippet')} className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-left">Video Snippet</span>
                                <i className="fas fa-video text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button onClick={() => handleAction('/admin/social-post')} className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-left">Viral Post</span>
                                <i className="fas fa-share-nodes text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button onClick={() => handleAction('/admin/smart-links')} className="flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-left">Smart Link</span>
                                <i className="fas fa-link text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-instagram text-lg" style={{ color: '#E1306C' }}></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption Instagram</span>
                                    </div>
                                    <button onClick={() => copyText(`${aiCaptions?.ig || suggestion.caption}\n\n${suggestion.hashtags}`, 'ig')} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full" style={{ backgroundColor: copied === 'ig' ? '#10b981' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                        {copied === 'ig' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans mb-4">{aiCaptions?.ig || suggestion.caption}</pre>
                                <div className="pt-4 border-t border-white/5"><p className="text-[#c5a059] text-[10px]">{suggestion.hashtags}</p></div>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <i className="fab fa-tiktok text-lg text-white"></i>
                                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/40">Caption TikTok</span>
                                    </div>
                                    <button onClick={() => copyText(`${aiCaptions?.tt || suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`, 'tt')} className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full" style={{ backgroundColor: copied === 'tt' ? '#10b981' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                        {copied === 'tt' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans mb-4">{aiCaptions?.tt || suggestion.tiktokCaption}</pre>
                                <div className="pt-4 border-t border-white/5"><p className="text-[#c5a059] text-[10px]">{suggestion.hashtags} #fyp #parati</p></div>
                            </div>
                        </div>
                    )}

                    {isExpanded && (
                        <div className="mt-6 flex justify-center pb-4">
                            <button onClick={handleAiGenerate} disabled={aiLoading} className={`flex items-center gap-4 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] ${aiLoading ? 'bg-white/10 text-white/30' : 'bg-gradient-to-r from-[#c5a059] to-[#8B5A2B] text-black hover:scale-105 transition-all'}`}>
                                {aiLoading ? 'Generando...' : '✨ Mejorar con IA'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
