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
    const [copied, setCopied] = useState<'ig' | 'tt' | 'sl' | null>(null);
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

    const suggestion = useMemo<Suggestion | null>(() => {
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

        // Dynamic alternation flag: swaps priority every time a song is promoted (clicking Siguiente)
        const alternateFlag = (dayOfYear + promotedIds.length) % 2 === 0;

        // Smart Weekly Scheduling System (Prevents getting stuck on a single category)
        // - Viernes, Sábado, Domingo (5, 6, 0): Prioridad Lanzamientos
        // - Lunes, Martes (1, 2): Prioridad Recientes (Últimos 30 días)
        // - Miércoles (3): Prioridad Rotación Diaria
        // - Jueves (4): Prioridad Joya del Archivo (TBT)
        const dayOfWeek = today.getDay();

        // 1. Pre-calculate all categories
        
        // --- LANZAMIENTOS ---
        let newReleasesDM: ReleaseData[] = [];
        let newReleasesJ6: ReleaseData[] = [];
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        
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

        // Rotate among recent songs if there are multiple, to prevent getting stuck
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

        // 2. Select based on Smart Weekly Schedule
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) { // Fri, Sat, Sun -> Lanzamientos
            return newReleaseSuggestion || recentSuggestion || rotationSuggestion || gemSuggestion;
        } else if (dayOfWeek === 1 || dayOfWeek === 2) { // Mon, Tue -> Recientes
            return recentSuggestion || rotationSuggestion || newReleaseSuggestion || gemSuggestion;
        } else if (dayOfWeek === 3) { // Wed -> Rotación Diaria
            return rotationSuggestion || gemSuggestion || recentSuggestion || newReleaseSuggestion;
        } else { // Thu -> TBT / Joya del archivo
            return gemSuggestion || rotationSuggestion || recentSuggestion || newReleaseSuggestion;
        }

        return null;
    }, [catalog, releases, dayOfYear, promotedIds]);

    const handleAiGenerate = async () => {
        if (!suggestion?.song) return;
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

    const copyText = (text: string, type: 'ig' | 'tt' | 'sl') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleNext = () => {
        if (!suggestion) return;
        let idsToMark: string[] = [];
        if (suggestion.song) idsToMark.push(suggestion.song.id);
        if (suggestion.releaseName) idsToMark.push(suggestion.releaseName);
        
        if (idsToMark.length > 0) {
            const next = [...promotedIds, ...idsToMark];
            setPromotedIds(next);
            localStorage.setItem(PROMOTED_KEY, JSON.stringify(next));
        } else if (suggestion.type === 'new_release' && releases.length > 0) {
            // Fallback for releases
            const activeRelease = releases.find(r => {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                const d = new Date(r.releaseDate);
                return d >= startOfWeek && d <= now;
            });
            if (activeRelease) {
                const next = [...promotedIds, activeRelease.name];
                setPromotedIds(next);
                localStorage.setItem(PROMOTED_KEY, JSON.stringify(next));
            }
        }
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
                <div className="px-6 md:px-8 py-6 md:py-8 border-b"
                    style={{ borderColor: `${typeInfo.color}15`, background: `linear-gradient(135deg, ${typeInfo.color}08, transparent)` }}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 md:mb-3">
                                <i className={`fas ${typeInfo.icon}`} style={{ color: typeInfo.color }}></i>
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest" style={{ color: typeInfo.color }}>
                                    {typeInfo.label}
                                </span>
                            </div>
                            <h3 className="text-xl md:text-3xl font-serif italic text-white leading-tight">
                                {suggestion.song?.name || 'Inspiración Diaria'}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex-1 md:flex-none text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-white/10 flex items-center justify-center gap-2"
                            >
                                <i className={`fas ${isExpanded ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                <span>{isExpanded ? 'Ocultar' : 'Textos'}</span>
                            </button>
                            <button
                                onClick={handleNext}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-5 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all"
                            >
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Siguiente</span>
                                <i className="fas fa-arrow-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 flex items-start gap-4 md:gap-6">
                            {suggestion.song?.cover && (
                                <div className="relative shrink-0">
                                    <img src={suggestion.song.cover} alt={suggestion.song.name} className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl object-cover border border-white/10" />
                                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[8px] md:text-xs"
                                        style={{ backgroundColor: typeInfo.color, color: '#000' }}>
                                        <i className={`fas ${typeInfo.icon}`}></i>
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-white/40 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">Recomendación Estratégica</p>
                                <p className="text-white/80 text-sm md:text-base leading-relaxed font-light italic">
                                    "{suggestion.reason}"
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-col gap-2 md:gap-3 lg:w-56 shrink-0">
                            <button onClick={() => handleAction('/admin/promo-image')} className="flex flex-col md:flex-row items-center justify-center md:justify-between p-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center md:text-left mb-2 md:mb-0">Imagen</span>
                                <i className="fas fa-image text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button onClick={() => handleAction('/admin/video-snippet')} className="flex flex-col md:flex-row items-center justify-center md:justify-between p-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center md:text-left mb-2 md:mb-0">Video</span>
                                <i className="fas fa-video text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <button onClick={() => handleAction('/admin/social-post')} className="flex flex-col md:flex-row items-center justify-center md:justify-between p-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center md:text-left mb-2 md:mb-0">Viral Post</span>
                                <i className="fas fa-share-nodes text-xs group-hover:scale-110 transition-transform"></i>
                            </button>
                            <div className="flex gap-2 col-span-1 md:col-span-1">
                                <button onClick={() => window.open(`/#/link/${suggestion.song?.id}`, '_blank')} className="flex-1 flex flex-col md:flex-row items-center justify-center md:justify-between p-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all group">
                                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center md:text-left mb-2 md:mb-0">Smart</span>
                                    <i className="fas fa-eye text-xs group-hover:scale-110 transition-transform"></i>
                                </button>
                                <button onClick={() => { if(suggestion.song) copyText(`${window.location.origin}/#/link/${suggestion.song.id}`, 'sl'); }} className={`p-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl border transition-all flex items-center justify-center ${copied === 'sl' ? 'bg-green-500/20 border-green-500/40 text-green-500' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-[#c5a059]'}`}>
                                    <i className={`fas ${copied === 'sl' ? 'fa-check' : 'fa-copy'} text-xs`}></i>
                                </button>
                            </div>
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
