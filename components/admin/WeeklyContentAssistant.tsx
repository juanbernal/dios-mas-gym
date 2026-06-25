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
    onMarkCompleted: () => void;
    onAction: (route: string) => void;
    title: string;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onNext, onMarkCompleted, onAction, title }) => {
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

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                                onClick={onMarkCompleted}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                                title="Marcar como usado (Desaparece de los estrenos)"
                            >
                                <i className="fas fa-check text-[10px]"></i>
                                <span className="text-[8px] font-black uppercase tracking-widest">Usado ✓</span>
                            </button>
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
                                title="Saltar al siguiente sin marcar como usado"
                            >
                                <span className="text-[8px] font-black uppercase tracking-widest">Saltar</span>
                                <i className="fas fa-angles-right text-[8px]"></i>
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
                    <button onClick={() => onAction('/admin/social-post')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        <i className="fas fa-share-nodes text-[10px]"></i>
                        <span>Viral Post</span>
                    </button>
                    <button onClick={() => onAction('/admin/smartlink-video')} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-[8px] font-black uppercase tracking-widest">
                        <i className="fas fa-mobile-screen text-[10px]"></i>
                        <span>SL Creator</span>
                    </button>
                    <button 
                        onClick={() => {
                            if (suggestion.song) {
                                const url = `${window.location.origin}/link/${suggestion.song.id}`;
                                copyText(url, 'sl');
                            }
                        }} 
                        disabled={!suggestion.song}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-[8px] font-black uppercase tracking-widest disabled:opacity-40"
                        style={{ 
                            backgroundColor: copied === 'sl' ? '#10b981' : 'rgba(255,255,255,0.05)', 
                            borderColor: copied === 'sl' ? '#10b981' : 'rgba(255,255,255,0.05)',
                            color: copied === 'sl' ? '#fff' : 'rgba(255,255,255,0.6)' 
                        }}
                    >
                        <i className="fas fa-link text-[10px]"></i>
                        <span>{copied === 'sl' ? '✓ Copiado' : 'Copiar Link'}</span>
                    </button>
                    <button 
                        onClick={async () => {
                            if (suggestion.song && navigator.share) {
                                const url = `${window.location.origin}/link/${suggestion.song.id}`;
                                const fullText = `${aiCaptions?.ig || suggestion.caption}\n\n${suggestion.hashtags}`;
                                
                                // Apps como Instagram o Facebook bloquean el parámetro "text" nativo.
                                // Copiamos el texto al portapapeles primero para que el usuario solo tenga que "Pegar"
                                try {
                                    await navigator.clipboard.writeText(`${fullText}\n\n${url}`);
                                } catch (e) {
                                    console.log('Clipboard copy failed');
                                }

                                navigator.share({
                                    title: suggestion.song.name,
                                    text: fullText,
                                    url: url
                                }).catch(() => console.log('Share canceled or failed'));
                            } else {
                                alert('Compartir no está soportado en este navegador de escritorio. Usa el móvil o copia los textos.');
                            }
                        }} 
                        disabled={!suggestion.song}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#8B5A2B] text-black hover:scale-[1.02] transition-all text-[8px] font-black uppercase tracking-widest disabled:opacity-40"
                    >
                        <i className="fas fa-share text-[10px]"></i>
                        <span>Preparar P/ Redes</span>
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

    const [slot1Skips, setSlot1Skips] = useState<number>(() => {
        try {
            return parseInt(localStorage.getItem('content_assistant_slot1_skips') || '0', 10);
        } catch { return 0; }
    });

    const [slot2Skips, setSlot2Skips] = useState<number>(() => {
        try {
            return parseInt(localStorage.getItem('content_assistant_slot2_skips') || '0', 10);
        } catch { return 0; }
    });

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const res = await fetch("/api/sheet-proxy?read=true").then(r => r.json());
                const filtered = (res || []).filter((r: any) => !r.Artista || !r.Artista.toLowerCase().startsWith('config'));
                setReleases(filtered);
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

        const freshCatalog = catalog.filter(s => !promotedIds.includes(s.id));
        const pool = freshCatalog.length >= 2 ? freshCatalog : catalog;

        if (pool.length === 0) return null;

        // Slot 1 Pick
        const idx1 = ((dayOfYear * 17) + slot1Skips) % pool.length;
        const song1 = pool[idx1];

        // Slot 2 Pick
        let idx2 = ((dayOfYear * 31) + slot2Skips + 1) % pool.length;
        let song2 = pool[idx2];
        if (song1.id === song2.id && pool.length > 1) {
            idx2 = (idx2 + 1) % pool.length;
            song2 = pool[idx2];
        }

        const createSuggestion = (song: MusicItem, type: 'recent' | 'rotation'): Suggestion => {
            const caps = CAPTIONS_BY_TYPE[type](song.name, song.artist);
            const cleanTitle = song.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '').toLowerCase();
            const dynamicHashtags = `#${cleanTitle} #musica${cleanTitle} #diosmasgym`;
            const finalHashtags = `${HASHTAG_SETS[type]} ${dynamicHashtags}`;
            
            return {
                song,
                reason: `Recomendación aleatoria del día: "${song.name}" de ${song.artist}. Mantén tu perfil activo publicando contenido a diario.`,
                type,
                caption: caps.ig,
                tiktokCaption: caps.tt,
                hashtags: finalHashtags,
            };
        };

        const suggestionNew = createSuggestion(song1, 'recent');
        const suggestionOld = createSuggestion(song2, 'rotation');

        return { suggestionNew, suggestionOld };
    }, [catalog, promotedIds, slot1Skips, slot2Skips, dayOfYear, releases]);

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

    const handleNextSlot1 = (suggestion: Suggestion) => {
        const nextSkips = slot1Skips + 1;
        setSlot1Skips(nextSkips);
        localStorage.setItem('content_assistant_slot1_skips', nextSkips.toString());
    };

    const handleMarkCompletedSlot1 = (suggestion: Suggestion) => {
        handleNext(suggestion);
        const nextSkips = slot1Skips + 1;
        setSlot1Skips(nextSkips);
        localStorage.setItem('content_assistant_slot1_skips', nextSkips.toString());
    };

    const handleNextSlot2 = (suggestion: Suggestion) => {
        const nextSkips = slot2Skips + 1;
        setSlot2Skips(nextSkips);
        localStorage.setItem('content_assistant_slot2_skips', nextSkips.toString());
    };

    const handleMarkCompletedSlot2 = (suggestion: Suggestion) => {
        handleNext(suggestion);
        const nextSkips = slot2Skips + 1;
        setSlot2Skips(nextSkips);
        localStorage.setItem('content_assistant_slot2_skips', nextSkips.toString());
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-pulse"></div>
                    <h2 className="font-serif italic text-3xl text-white">Aprovisionamiento Diario de Contenido</h2>
                </div>
                <button 
                    onClick={() => {
                        setPromotedIds([]);
                        setSlot1Skips(0);
                        setSlot2Skips(0);
                        localStorage.removeItem(PROMOTED_KEY);
                        localStorage.removeItem('content_assistant_slot1_skips');
                        localStorage.removeItem('content_assistant_slot2_skips');
                    }}
                    className="text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/40 hover:text-red-400 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
                    title="Reiniciar historial y skips para volver a ver todo desde el principio"
                >
                    <i className="fas fa-arrow-rotate-left text-[9px]"></i>
                    <span>Reiniciar Pruebas</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {suggestions.suggestionNew && (
                    <SuggestionCard 
                        title="Slot 1: Novedades / Tendencias" 
                        suggestion={suggestions.suggestionNew} 
                        onNext={() => handleNextSlot1(suggestions.suggestionNew!)} 
                        onMarkCompleted={() => handleMarkCompletedSlot1(suggestions.suggestionNew!)}
                        onAction={(route) => handleAction(route, suggestions.suggestionNew!)} 
                    />
                )}
                {suggestions.suggestionOld && (
                    <SuggestionCard 
                        title="Slot 2: Clásicos / Rotación" 
                        suggestion={suggestions.suggestionOld} 
                        onNext={() => handleNextSlot2(suggestions.suggestionOld!)} 
                        onMarkCompleted={() => handleMarkCompletedSlot2(suggestions.suggestionOld!)}
                        onAction={(route) => handleAction(route, suggestions.suggestionOld!)} 
                    />
                )}
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
