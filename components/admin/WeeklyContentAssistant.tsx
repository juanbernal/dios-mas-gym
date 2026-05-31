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
    releaseName?: string;
}

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

interface SuggestionCardProps {
    suggestion: Suggestion;
    onNext: () => void;
    onAction: (route: string) => void;
    title: string;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onNext, onAction, title }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState<'ig' | 'tt' | 'sl' | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCaptions, setAiCaptions] = useState<{ ig: string; tt: string } | null>(null);

    const TYPE_LABELS: Record<Suggestion['type'], { label: string; color: string; icon: string }> = {
        new_release: { label: '🚀 Lanzamiento', color: '#ff4b2b', icon: 'fa-rocket' },
        recent: { label: '🔥 Reciente', color: '#c5a059', icon: 'fa-fire' },
        rotation: { label: '🔄 Rotación Diaria', color: '#3b82f6', icon: 'fa-rotate' },
        old_gem: { label: '💎 Joya del Archivo', color: '#a855f7', icon: 'fa-gem' },
    };

    const typeInfo = TYPE_LABELS[suggestion.type];

    const copyText = (text: string, type: 'ig' | 'tt' | 'sl') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleAiGenerate = async () => {
        if (!suggestion.song) return;
        setAiLoading(true);
        try {
            const prompt = {
                input: `Genera un post viral para redes sociales sobre la canción "${suggestion.song.name}" de ${suggestion.song.artist}. Motivo de la recomendación: ${suggestion.reason}.\nPor favor, genera estrictamente lo siguiente:\n1. Una versión MUY corta y directa para Instagram.\n2. Una versión MUY corta y directa para TikTok.\nMantén un tono épico, de fe y disciplina.`,
                platform: 'Instagram/TikTok',
                goal: 'Inspirar y Viralizar',
                tone: 'Épico y Motivador'
            };

            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
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

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0f111a] border shadow-2xl flex flex-col justify-between h-full group hover:border-[#c5a059]/20 transition-all duration-500"
            style={{ borderColor: `${typeInfo.color}30`, fontFamily: "'Poppins', sans-serif" }}>
            <div className="absolute -top-20 -left-10 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none"
                style={{ backgroundColor: typeInfo.color }} />

            <div>
                {/* Header Section */}
                <div className="px-6 py-6 border-b"
                    style={{ borderColor: `${typeInfo.color}15`, background: `linear-gradient(135deg, ${typeInfo.color}08, transparent)` }}>
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black tracking-widest text-[#c5a059] uppercase block mb-1">
                                {title}
                            </span>
                            <div className="flex items-center gap-2 mb-2">
                                <i className={`fas ${typeInfo.icon} text-[10px]`} style={{ color: typeInfo.color }}></i>
                                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: typeInfo.color }}>
                                    {typeInfo.label}
                                </span>
                            </div>
                            <h3 className="text-lg font-serif italic text-white leading-tight truncate">
                                {suggestion.song?.name || 'Inspiración Diaria'}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all px-3 py-2 rounded-xl border border-white/10 flex items-center justify-center gap-1.5"
                            >
                                <i className={`fas ${isExpanded ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                <span>{isExpanded ? 'Ocultar' : 'Textos'}</span>
                            </button>
                            <button
                                onClick={onNext}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all"
                            >
                                <span className="text-[8px] font-black uppercase tracking-widest">Siguiente</span>
                                <i className="fas fa-arrow-right text-[8px]"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                    <div className="flex gap-4 items-start mb-6">
                        {suggestion.song?.cover && (
                            <div className="relative shrink-0">
                                <img src={suggestion.song.cover} alt={suggestion.song.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
                                    style={{ backgroundColor: typeInfo.color, color: '#000' }}>
                                    <i className={`fas ${typeInfo.icon}`}></i>
                                </div>
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.2em] mb-1">Recomendación Estratégica</p>
                            <p className="text-white/80 text-xs leading-relaxed font-light italic">
                                "{suggestion.reason}"
                            </p>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 gap-4">
                            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <i className="fab fa-instagram text-base" style={{ color: '#E1306C' }}></i>
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Caption Instagram</span>
                                    </div>
                                    <button onClick={() => copyText(`${aiCaptions?.ig || suggestion.caption}\n\n${suggestion.hashtags}`, 'ig')} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ backgroundColor: copied === 'ig' ? '#10b981' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                        {copied === 'ig' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-[10px] leading-relaxed whitespace-pre-wrap font-sans mb-3">{aiCaptions?.ig || suggestion.caption}</pre>
                                <div className="pt-3 border-t border-white/5"><p className="text-[#c5a059] text-[9px]">{suggestion.hashtags}</p></div>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-5 border border-white/5 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <i className="fab fa-tiktok text-base text-white"></i>
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Caption TikTok</span>
                                    </div>
                                    <button onClick={() => copyText(`${aiCaptions?.tt || suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`, 'tt')} className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ backgroundColor: copied === 'tt' ? '#10b981' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                                        {copied === 'tt' ? '✓ Copiado' : 'Copiar'}
                                    </button>
                                </div>
                                <pre className="text-white/70 text-[10px] leading-relaxed whitespace-pre-wrap font-sans mb-3">{aiCaptions?.tt || suggestion.tiktokCaption}</pre>
                                <div className="pt-3 border-t border-white/5"><p className="text-[#c5a059] text-[9px]">{suggestion.hashtags} #fyp #parati</p></div>
                            </div>
                        </div>
                    )}

                    {isExpanded && (
                        <div className="mt-4 flex justify-center pb-2">
                            <button onClick={handleAiGenerate} disabled={aiLoading} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[8px] font-black uppercase tracking-[0.3em] ${aiLoading ? 'bg-white/10 text-white/30' : 'bg-gradient-to-r from-[#c5a059] to-[#8B5A2B] text-black hover:scale-105 transition-all'}`}>
                                {aiLoading ? 'Generando...' : '✨ Mejorar con IA'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/10">
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onAction('/admin/promo-image')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        <i className="fas fa-image text-[10px]"></i>
                        <span>Imagen</span>
                    </button>
                    <button onClick={() => onAction('/admin/video-snippet')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        <i className="fas fa-video text-[10px]"></i>
                        <span>Video</span>
                    </button>
                    <button onClick={() => onAction('/admin/social-post')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest col-span-2">
                        <i className="fas fa-share-nodes text-[10px]"></i>
                        <span>Viral Post</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const WeeklyContentAssistant: React.FC<{ catalog: MusicItem[] }> = ({ catalog = [] }) => {
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [promotedIds, setPromotedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(PROMOTED_KEY) || '[]');
        } catch { return []; }
    });

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const res = await fetch("/api/sheet-proxy?read=true").then(r => r.json());
                setReleases(res || []);
            } catch (err) {
                console.error("Error loading releases:", err);
            } finally {
                setLoading(false);
            }
        };
        loadReleases();
    }, []);

    const suggestions = useMemo(() => {
        if (!catalog || catalog.length === 0) return null;

        const isDM = (s: MusicItem) => (s as any).artistGroup === 'diosmasgym' || s.artist.toLowerCase().includes('dios');
        const isJ6 = (s: MusicItem) => (s as any).artistGroup === 'juan614' || s.artist.toLowerCase().includes('juan');

        const dmCatalog = catalog.filter(isDM);
        const j6Catalog = catalog.filter(isJ6);

        const dmFresh = dmCatalog.filter(s => !promotedIds.includes(s.id));
        const j6Fresh = j6Catalog.filter(s => !promotedIds.includes(s.id));

        const dmPool = dmFresh.length > 0 ? dmFresh : dmCatalog;
        const j6Pool = j6Fresh.length > 0 ? j6Fresh : j6Catalog;

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());

        // Alternation flag
        const alternateFlag = (dayOfYear + promotedIds.length) % 2 === 0;

        // --- LANZAMIENTOS ---
        let newReleasesDM: ReleaseData[] = [];
        let newReleasesJ6: ReleaseData[] = [];
        try {
            (releases || []).forEach(r => {
                const d = new Date(r.releaseDate);
                if (d >= startOfWeek && d <= now) {
                    const artistLower = r.Artista.toLowerCase();
                    if (artistLower.includes('dios')) newReleasesDM.push(r);
                    if (artistLower.includes('juan')) newReleasesJ6.push(r);
                }
            });
        } catch(e) {}

        const findUnpromotedRelease = (list: ReleaseData[]) => {
            return list.find(r => !promotedIds.includes(r.name));
        };

        const releaseDM = findUnpromotedRelease(newReleasesDM);
        const releaseJ6 = findUnpromotedRelease(newReleasesJ6);

        let activeRelease: ReleaseData | null = null;
        if (releaseDM && releaseJ6) {
            activeRelease = alternateFlag ? releaseDM : releaseJ6;
        } else {
            activeRelease = releaseDM || releaseJ6;
        }

        let newReleaseSuggestion: Suggestion | null = null;
        if (activeRelease) {
            const cleanReleaseName = activeRelease.name.replace(/^(Álbum:|Single:|EP:)\s*/i, '').trim().toLowerCase();
            const matchedSong = catalog.find(s => {
                const cleanSongName = s.name.toLowerCase();
                return cleanSongName.includes(cleanReleaseName) || cleanReleaseName.includes(cleanSongName);
            });
            const caps = CAPTIONS_BY_TYPE.new_release(activeRelease.name, activeRelease.Artista);
            newReleaseSuggestion = {
                song: matchedSong || null,
                reason: `¡Estreno de la semana! "${activeRelease.name}" acaba de salir — es el momento ideal para darle fuego.`,
                type: 'new_release',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.new_release,
                releaseName: activeRelease.name,
            };
        }

        // --- RECIENTES (Últimos 30 días) ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentDM = [...dmPool]
            .filter(s => s.date && new Date(s.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const recentJ6 = [...j6Pool]
            .filter(s => s.date && new Date(s.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const newestDM = recentDM.length > 0 ? recentDM[(dayOfYear + promotedIds.length) % recentDM.length] : null;
        const newestJ6 = recentJ6.length > 0 ? recentJ6[(dayOfYear + promotedIds.length) % recentJ6.length] : null;
        const recentSong = alternateFlag ? (newestDM || newestJ6) : (newestJ6 || newestDM);

        let recentSuggestion: Suggestion | null = null;
        if (recentSong) {
            const caps = CAPTIONS_BY_TYPE.recent(recentSong.name, recentSong.artist);
            recentSuggestion = {
                song: recentSong,
                reason: `"${recentSong.name}" es tendencia reciente de ${recentSong.artist}. Aprovecha el impulso para maximizar el alcance.`,
                type: 'recent',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.recent,
            };
        }

        // --- ROTACIÓN DIARIA ---
        const rotationIdx = dayOfYear + promotedIds.length;
        const picked = alternateFlag
            ? (dmPool[rotationIdx % dmPool.length] || j6Pool[rotationIdx % j6Pool.length])
            : (j6Pool[rotationIdx % j6Pool.length] || dmPool[rotationIdx % dmPool.length]);
        
        let rotationSuggestion: Suggestion | null = null;
        if (picked) {
            const caps = CAPTIONS_BY_TYPE.rotation(picked.name, picked.artist);
            rotationSuggestion = {
                song: picked,
                reason: `Hoy toca promocionar "${picked.name}" de ${picked.artist}. Mantén tu perfil activo con esta rotación diaria.`,
                type: 'rotation',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.rotation,
            };
        }

        // --- JOYA DEL ARCHIVO (TBT) ---
        const gemIdx = dayOfYear + promotedIds.length;
        const gemDM = dmPool[(gemIdx + 10) % (dmPool.length || 1)] || dmCatalog[0] || catalog[0];
        const gemJ6 = j6Pool[(gemIdx + 10) % (j6Pool.length || 1)] || j6Catalog[0] || catalog[0];
        const gem = alternateFlag ? (gemDM || gemJ6) : (gemJ6 || gemDM);

        let gemSuggestion: Suggestion | null = null;
        if (gem) {
            const caps = CAPTIONS_BY_TYPE.old_gem(gem.name, gem.artist);
            gemSuggestion = {
                song: gem,
                reason: `Recomendación TBT: Reactiva "${gem.name}" de ${gem.artist}. Una joya del catálogo que merece volver a ser escuchada.`,
                type: 'old_gem',
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: HASHTAG_SETS.old_gem,
            };
        }

        // Double recommendations: Slot 1 (New/Recent) & Slot 2 (Old/Classic)
        let suggestionNew = newReleaseSuggestion || recentSuggestion;
        let suggestionOld = rotationSuggestion || gemSuggestion;

        // "si ya no hay nueva que sean dos viejas"
        if (!suggestionNew) {
            const nextIdx = (rotationIdx + 1) % dmPool.length;
            const fallbackPicked = alternateFlag
                ? (dmPool[nextIdx] || j6Pool[nextIdx])
                : (j6Pool[nextIdx] || dmPool[nextIdx]);
            if (fallbackPicked) {
                const caps = CAPTIONS_BY_TYPE.old_gem(fallbackPicked.name, fallbackPicked.artist);
                suggestionNew = {
                    song: fallbackPicked,
                    reason: `No hay estrenos recientes, así que reactivamos esta joya: "${fallbackPicked.name}" de ${fallbackPicked.artist}.`,
                    type: 'old_gem',
                    caption: caps.ig,
                    tiktokCaption: caps.tt,
                    hashtags: HASHTAG_SETS.old_gem,
                };
            } else {
                suggestionNew = gemSuggestion;
            }
        }

        // Ensure suggestionOld uses a different song than suggestionNew
        if (suggestionNew && suggestionOld && suggestionNew.song?.id === suggestionOld.song?.id) {
            const nextIdx = (rotationIdx + 2) % dmPool.length;
            const fallbackPicked = alternateFlag
                ? (dmPool[nextIdx] || j6Pool[nextIdx])
                : (j6Pool[nextIdx] || dmPool[nextIdx]);
            if (fallbackPicked) {
                const caps = CAPTIONS_BY_TYPE.rotation(fallbackPicked.name, fallbackPicked.artist);
                suggestionOld = {
                    song: fallbackPicked,
                    reason: `Te recomendamos esta alternativa clásica: "${fallbackPicked.name}" de ${fallbackPicked.artist}.`,
                    type: 'rotation',
                    caption: caps.ig,
                    tiktokCaption: caps.tt,
                    hashtags: HASHTAG_SETS.rotation,
                };
            }
        }

        return { suggestionNew, suggestionOld };
    }, [catalog, releases, dayOfYear, promotedIds]);

    const handleNext = (suggestion: Suggestion) => {
        let idsToMark: string[] = [];
        if (suggestion.song) idsToMark.push(suggestion.song.id);
        if (suggestion.releaseName) idsToMark.push(suggestion.releaseName);
        
        if (idsToMark.length > 0) {
            const next = [...promotedIds, ...idsToMark];
            setPromotedIds(next);
            localStorage.setItem(PROMOTED_KEY, JSON.stringify(next));
        }
    };

    const handleAction = (route: string, suggestion: Suggestion) => {
        if (suggestion.song) {
            navigate(route, { state: { song: suggestion.song } });
        } else {
            navigate(route);
        }
    };

    if (loading) return (
        <div className="mb-16 bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 flex items-center justify-center gap-4">
            <div className="w-5 h-5 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Sincronizando Asistente...</p>
        </div>
    );

    if (!suggestions || (!suggestions.suggestionNew && !suggestions.suggestionOld)) return null;

    return (
        <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
                <h2 className="font-serif italic text-3xl text-white">Aprovisionamiento Diario de Contenido</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {suggestions.suggestionNew && (
                    <SuggestionCard 
                        title="Slot 1: Novedades / Tendencias" 
                        suggestion={suggestions.suggestionNew} 
                        onNext={() => handleNext(suggestions.suggestionNew!)} 
                        onAction={(route) => handleAction(route, suggestions.suggestionNew!)} 
                    />
                )}
                {suggestions.suggestionOld && (
                    <SuggestionCard 
                        title="Slot 2: Clásicos / Rotación" 
                        suggestion={suggestions.suggestionOld} 
                        onNext={() => handleNext(suggestions.suggestionOld!)} 
                        onAction={(route) => handleAction(route, suggestions.suggestionOld!)} 
                    />
                )}
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
