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
    whatsappCaption: string;
    hashtags: string;
    releaseName?: string;
}

const PROMOTED_KEY = 'content_assistant_promoted_ids';
const SKIPS_KEY = 'content_assistant_skips_by_day';
const dayKey = () => new Date().toDateString();

const HASHTAG_SETS = {
    new_release: "#estreno #musicanueva #estrenomusical #diosmasgym #juan614 #vivaelrey",
    recent: "#tendencia #viral #musica #reel #tiktokmusic",
    rotation: "#disciplina #gymmotivation #fe #musicaurbana",
    old_gem: "#tbt #clasico #joya #musicaquetoca",
};

const CAPTIONS_BY_TYPE = {
    new_release: (name: string, artist: string, link: string) => ({
        ig: `¡Acaba de salir! 🚀 "${name}" de ${artist}.\n\nYa disponible en todas las plataformas digitales. Escúchala ahora en el link:\n👉 ${link}\n\n¡No te quedes fuera del movimiento! 🔥`,
        tt: `¿Ya escuchaste lo nuevo? 🔥 "${name}" - ${artist}. Dale amor al audio, guárdalo y únete al trend. Escúchala completa aquí 👉 ${link}`,
        wa: `🎵 ¡Escucha "${name}" de ${artist}! Ya disponible en todas las plataformas.\n👉 ${link}`
    }),
    recent: (name: string, artist: string, link: string) => ({
        ig: `El fuego sigue encendido con "${name}" de ${artist}. ⚡️\n\nSi no la tienes en tu playlist de entrenamiento y motivación, te falta disciplina.\n🎧 Escúchala aquí: ${link}`,
        tt: `Esta canción está rompiendo. 📈 "${name}" de ${artist}. Úsala para tus videos de entrenamiento y fe. 🥊 👉 ${link}`,
        wa: `🔥 Te recomiendo escuchar "${name}" de ${artist}. ¡Motivación y fe pura!\n👉 ${link}`
    }),
    rotation: (name: string, artist: string, link: string) => ({
        ig: `Disciplina sobre motivación. 🥊\nHoy toca darle duro con "${name}" de ${artist}.\n\nEncuéntrala en Spotify, Apple Music y YouTube:\n👉 ${link}`,
        tt: `El ritmo y la fuerza que necesitas para hoy. 😤 "${name}" - ${artist}. Dale play al link 👉 ${link}`,
        wa: `🥊 Dale play a "${name}" de ${artist} para entrenar con todo hoy:\n👉 ${link}`
    }),
    old_gem: (name: string, artist: string, link: string) => ({
        ig: `Un clásico que nunca falla. 💎\n¿Te acuerdas de "${name}" de ${artist}? Sigue pegando igual de fuerte.\n👉 ${link}`,
        tt: `Joyas que no pasan de moda. ✨ "${name}" de ${artist}. 👉 ${link}`,
        wa: `💎 Una joya que nunca pasa de moda: "${name}" de ${artist}.\n👉 ${link}`
    })
};

const WeeklyContentAssistant: React.FC<{ catalog: MusicItem[] }> = ({ catalog = [] }) => {
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [platformTab, setPlatformTab] = useState<'ig' | 'tt' | 'wa'>('ig');
    const [copiedStatus, setCopiedStatus] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);
    const [customAiText, setCustomAiText] = useState<string>('');

    const [promotedIds, setPromotedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(PROMOTED_KEY) || '[]');
        } catch { return []; }
    });

    const [skipCount, setSkipCount] = useState<number>(() => {
        // Los saltos valen solo para el dia en que se hicieron: cada dia arranca en 0
        // y todos los dispositivos muestran la misma cancion hasta que se pulsa "Cambiar".
        try {
            const saved = JSON.parse(localStorage.getItem(SKIPS_KEY) || 'null');
            return saved && saved.day === dayKey() ? Number(saved.count) || 0 : 0;
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

    const suggestion = useMemo<Suggestion | null>(() => {
        if (!catalog || catalog.length === 0) return null;

        // Orden fijo por id y sin filtros locales: asi la eleccion depende solo de la fecha
        // y sale la misma en la PC y en el celular.
        const pool = [...catalog].filter(s => s.id).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

        if (pool.length === 0) return null;

        // Aleatorio (no recorre el catalogo por orden de fecha): semilla fija por dia + saltos,
        // asi la sugerencia no cambia al recargar pero cada 'Cambiar cancion' da otra distinta.
        const seed = today.getFullYear() * 1000 + dayOfYear + skipCount * 7919;
        let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        h ^= h >>> 16;
        const idx = (h >>> 0) % pool.length;
        const song = pool[idx];

        const smartLink = song.id ? `${window.location.origin}/link/${song.id}` : 'https://diosmasgym.com';
        const type: 'recent' | 'rotation' = idx % 2 === 0 ? 'recent' : 'rotation';
        const caps = CAPTIONS_BY_TYPE[type](song.name, song.artist, smartLink);
        
        const words = song.name.replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]/g, '').trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const titleHashtags = words.map(w => `#${w}`).join(' ');
        const dynamicHashtags = `${titleHashtags} #musica #diosmasgym #juan614`;
        const finalHashtags = `${HASHTAG_SETS[type]} ${dynamicHashtags}`;

        return {
            song,
            reason: `Recomendación destacada de hoy para ${song.artist}. Mantén tus redes activas con este tema.`,
            type,
            caption: caps.ig,
            tiktokCaption: caps.tt,
            whatsappCaption: caps.wa,
            hashtags: finalHashtags
        };
    }, [catalog, skipCount, dayOfYear]);

    // Clear custom AI text when song changes
    useEffect(() => {
        setCustomAiText('');
    }, [suggestion?.song?.id]);

    const handleNextSong = () => {
        const next = skipCount + 1;
        setSkipCount(next);
        localStorage.setItem(SKIPS_KEY, JSON.stringify({ day: dayKey(), count: next }));
    };

    const handleMarkUsed = () => {
        if (!suggestion?.song) return;
        const nextPromoted = [...promotedIds, suggestion.song.id];
        setPromotedIds(nextPromoted);
        localStorage.setItem(PROMOTED_KEY, JSON.stringify(nextPromoted));
        handleNextSong();
        setCopiedStatus('✅ Canción marcada como publicada');
        setTimeout(() => setCopiedStatus(''), 2500);
    };

    const handleResetAll = () => {
        setPromotedIds([]);
        setSkipCount(0);
        localStorage.removeItem(PROMOTED_KEY);
        localStorage.removeItem(SKIPS_KEY);
        setCopiedStatus('🔄 Historial reiniciado');
        setTimeout(() => setCopiedStatus(''), 2000);
    };

    const getActivePostText = () => {
        if (!suggestion || !suggestion.song) return '';
        const smartLink = `${window.location.origin}/link/${suggestion.song.id}`;
        
        if (customAiText) {
            return `${customAiText}\n\n${smartLink}\n\n${suggestion.hashtags}`;
        }

        if (platformTab === 'ig') {
            return `${suggestion.caption}\n\n${suggestion.hashtags}`;
        }
        if (platformTab === 'tt') {
            return `${suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`;
        }
        return `${suggestion.whatsappCaption}`;
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStatus(`✓ ¡${label} copiado! Listo para pegar`);
        } catch {
            setCopiedStatus('⚠️ Error al copiar');
        }
        setTimeout(() => setCopiedStatus(''), 2500);
    };

    const handleShareWhatsApp = () => {
        const text = getActivePostText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleShareInstagram = async () => {
        const text = getActivePostText();
        await copyToClipboard(text, 'Texto de Instagram');
        window.open('https://www.instagram.com', '_blank');
    };

    const handleShareTikTok = async () => {
        const text = getActivePostText();
        await copyToClipboard(text, 'Texto de TikTok');
        window.open('https://www.tiktok.com', '_blank');
    };

    const handleShareFacebook = async () => {
        if (!suggestion?.song) return;
        const smartLink = `${window.location.origin}/link/${suggestion.song.id}`;
        const text = getActivePostText();
        await copyToClipboard(text, 'Texto para Facebook');
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(smartLink)}`, '_blank');
    };

    const handleAiRegenerate = async () => {
        if (!suggestion?.song) return;
        setAiLoading(true);
        try {
            const prompt = {
                input: `Genera un post viral MUY impactante y listo para publicar sobre la canción "${suggestion.song.name}" de ${suggestion.song.artist}. Estilo directo, épico, de motivación, fe y disciplina.`,
                platform: platformTab === 'tt' ? 'TikTok' : 'Instagram',
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
                setCustomAiText(data.text);
                setCopiedStatus('✨ ¡Nuevo copy generado con IA!');
                setTimeout(() => setCopiedStatus(''), 2500);
            }
        } catch (e) {
            console.error("AI Generation failed", e);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return (
        <div className="mb-10 bg-[#0f111a] border border-white/5 rounded-3xl p-6 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronizando Asistente...</p>
        </div>
    );

    if (!suggestion || !suggestion.song) return null;

    const smartLinkUrl = `${window.location.origin}/link/${suggestion.song.id}`;

    return (
        <div className="mb-12">
            {/* COMPACT HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c5a059] animate-pulse shadow-[0_0_12px_#c5a059]"></div>
                    <h2 className="font-serif italic text-2xl text-white">
                        Publicación Rápida del Día
                    </h2>
                    <span className="hidden sm:inline-block text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20">
                        1-Click Post
                    </span>
                </div>
                
                {/* QUICK SHUFFLE & ACTIONS */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleNextSong}
                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-[#c5a059] hover:text-black hover:border-[#c5a059] transition-all flex items-center gap-2"
                        title="Ver otra canción sugerida del catálogo"
                    >
                        <i className="fas fa-dice text-[#c5a059]"></i>
                        <span>Cambiar Canción</span>
                    </button>

                    <button 
                        onClick={handleMarkUsed}
                        className="text-[9px] font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all flex items-center gap-1.5"
                        title="Marcar como publicada y pasar a la siguiente"
                    >
                        <i className="fas fa-check text-[9px]"></i>
                        <span>Usado ✓</span>
                    </button>

                    <button 
                        onClick={handleResetAll}
                        className="text-[9px] font-black uppercase tracking-widest p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all"
                        title="Reiniciar lista de canciones usadas"
                    >
                        <i className="fas fa-arrow-rotate-left"></i>
                    </button>
                </div>
            </div>

            {/* SINGLE ALL-IN-ONE CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0f111a] to-[#080b12] border border-[#c5a059]/25 shadow-2xl p-6 lg:p-8">
                {/* Glow decorativo de fondo */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                    
                    {/* LEFT COLUMN: SONG INFO & COVER (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black">
                            <img 
                                src={suggestion.song.cover} 
                                alt={suggestion.song.name} 
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            
                            <div className="absolute top-3 left-3">
                                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[#c5a059] border border-[#c5a059]/30">
                                    {suggestion.type === 'new_release' ? '🚀 Estreno' : suggestion.type === 'recent' ? '🔥 Tendencia' : '🔄 Rotación'}
                                </span>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-base font-serif italic text-white font-bold leading-tight truncate">
                                    {suggestion.song.name}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mt-0.5">
                                    {suggestion.song.artist}
                                </p>
                            </div>
                        </div>

                        {/* SMART LINK PILL */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                                <i className="fas fa-link text-[#c5a059] text-xs shrink-0"></i>
                                <span className="text-[9px] font-mono text-white/70 truncate">{smartLinkUrl.replace(/^https?:\/\//, '')}</span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(smartLinkUrl, 'SmartLink')}
                                className="shrink-0 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all ml-2"
                            >
                                Copiar
                            </button>
                        </div>

                        {/* STUDIO PRO SHORTCUTS */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button 
                                onClick={() => navigate('/admin/promo-image', { 
                                    state: { 
                                        song: suggestion.song, 
                                        presetCaption: suggestion.caption, 
                                        presetHashtags: suggestion.hashtags, 
                                        autoShare: false 
                                    } 
                                })}
                                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:border-[#c5a059] hover:text-[#c5a059] transition-all text-[8px] font-black uppercase tracking-wider text-center"
                            >
                                <i className="fas fa-palette text-[#c5a059]"></i>
                                <span>Flyer 4K</span>
                            </button>
                            <button 
                                onClick={() => navigate('/admin/video-snippet', { 
                                    state: { song: suggestion.song } 
                                })}
                                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:border-[#c5a059] hover:text-[#c5a059] transition-all text-[8px] font-black uppercase tracking-wider text-center"
                            >
                                <i className="fas fa-video text-[#c5a059]"></i>
                                <span>Video Snippet</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: READY-TO-POST CONTENT & 1-CLICK SHARE (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-5">
                        
                        {/* PLATFORM TABS */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                {[
                                    { id: 'ig', label: 'Instagram / FB', icon: 'fa-brands fa-instagram', color: '#E1306C' },
                                    { id: 'tt', label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#ffffff' },
                                    { id: 'wa', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setPlatformTab(tab.id as any); setCustomAiText(''); }}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${platformTab === tab.id ? 'bg-white text-black border-white shadow-lg' : 'bg-black/30 text-white/50 border-white/5 hover:text-white'}`}
                                    >
                                        <i className={`${tab.icon}`} style={{ color: platformTab === tab.id ? '#000' : tab.color }}></i>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* REGENERATE WITH AI */}
                            <button
                                onClick={handleAiRegenerate}
                                disabled={aiLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c5a059]/20 to-[#8B5A2B]/20 border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all text-[8px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-sparkles'}`}></i>
                                <span>{aiLoading ? 'Creando...' : '✨ Variar Copy con IA'}</span>
                            </button>
                        </div>

                        {/* LIVE TEXT BOX WITH THE ENTIRE READY-TO-POST COPY */}
                        <div className="relative bg-black/50 border border-white/10 rounded-2xl p-5 group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                    Texto Listo para el Post
                                </span>
                                <button
                                    onClick={() => copyToClipboard(getActivePostText(), 'Texto completo')}
                                    className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] hover:underline flex items-center gap-1"
                                >
                                    <i className="fas fa-copy"></i>
                                    Copiar
                                </button>
                            </div>
                            
                            <p className="text-white/90 text-xs leading-relaxed font-sans whitespace-pre-wrap select-all">
                                {getActivePostText()}
                            </p>
                        </div>

                        {/* TOAST FEEDBACK */}
                        {copiedStatus && (
                            <div className="p-3 rounded-xl bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-widest text-center shadow-lg animate-fade-in">
                                {copiedStatus}
                            </div>
                        )}

                        {/* MAIN ACTION BAR: 1-CLICK POST BUTTONS */}
                        <div className="space-y-3 pt-2">
                            {/* MASTER COPY BUTTON */}
                            <button
                                onClick={() => copyToClipboard(getActivePostText(), 'Todo el contenido')}
                                className="w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-3 bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-black hover:scale-[1.01] active:scale-95 transition-all shadow-[0_10px_30px_rgba(197,160,89,0.25)]"
                            >
                                <i className="fas fa-copy text-sm"></i>
                                ⚡ Copiar Todo para Publicar Ya (Texto + Link + Tags)
                            </button>

                            {/* DIRECT ONE-CLICK SOCIAL LAUNCHERS */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-black transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    <i className="fab fa-whatsapp text-sm"></i>
                                    <span>WhatsApp</span>
                                </button>

                                <button
                                    onClick={handleShareInstagram}
                                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    <i className="fab fa-instagram text-sm"></i>
                                    <span>Instagram</span>
                                </button>

                                <button
                                    onClick={handleShareTikTok}
                                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    <i className="fab fa-tiktok text-sm"></i>
                                    <span>TikTok</span>
                                </button>

                                <button
                                    onClick={handleShareFacebook}
                                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider"
                                >
                                    <i className="fab fa-facebook-f text-sm"></i>
                                    <span>Facebook</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyContentAssistant;
