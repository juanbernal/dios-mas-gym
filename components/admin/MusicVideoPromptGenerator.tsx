import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

interface VideoPromptResult {
    songAnalysis: string;
    suggestedStyle: string;
    mainConcept: string;
    colorPalette: {
        description: string;
        colors: string[];
    };
    suggestedVibe: string;
    masterPrompt: string;
    scenes: {
        timeframe: string;
        lyricsSnippet: string;
        visualDescription: string;
        aiPrompt: string;
    }[];
}

interface HistoryItem {
    id: string;
    timestamp: string;
    title: string;
    artist: string;
    style: string;
    data: VideoPromptResult;
}

const MusicVideoPromptGenerator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // UI Navigation State
    const [step, setStep] = useState(1); // 1: Form, 2: Loader, 3: Results
    const [activeTab, setActiveTab] = useState('concept'); // concept, scenes, guide, history
    const [loading, setLoading] = useState(false);
    const [loaderMessage, setLoaderMessage] = useState('Iniciando análisis artístico...');
    const [error, setError] = useState<any>(null);
    const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
    
    // Catalog State
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [selectedSongId, setSelectedSongId] = useState('');
    
    // Form Inputs
    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        lyrics: ''
    });

    // Final Prompt Data
    const [result, setResult] = useState<VideoPromptResult | null>(null);

    // Generation History
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('pwa_video_prompts_history') || '[]');
        } catch {
            return [];
        }
    });

    const VERSION = "v2.1.0 Auto-Style";

    const loadingMessages = [
        "Iniciando análisis artístico...",
        "Analizando el significado de la letra y su trasfondo emocional...",
        "Mapeando los picos de intensidad lírica y tempo visual...",
        "Determinando el estilo narrativo ideal según la letra...",
        "Diseñando la paleta de iluminación y color cinematográfico...",
        "Formulando la metáfora visual central del video...",
        "Escribiendo la dirección de cámara escena por escena en español...",
        "Estructurando prompts técnicos en inglés para Runway Gen-3 y Sora...",
        "Finalizando empaquetado de guion técnico..."
    ];

    // Load music catalog
    useEffect(() => {
        const loadCatalog = async () => {
            setCatalogLoading(true);
            try {
                const [diosmasgym, juan614] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                const fullCatalog = [...diosmasgym, ...juan614];
                setCatalog(fullCatalog);

                // Check for incoming song from Weekly Assistant
                const incomingSong = location.state?.song as MusicItem;
                if (incomingSong) {
                    setTimeout(() => {
                        handleSongSelect(incomingSong.id, fullCatalog);
                    }, 100);
                }
            } catch (err) {
                console.error('Error cargando catálogo musical:', err);
            } finally {
                setCatalogLoading(false);
            }
        };
        loadCatalog();
    }, [location.state]);

    // Handle catalog selection
    const handleSongSelect = (songId: string, customCatalog?: MusicItem[]) => {
        setSelectedSongId(songId);
        const pool = customCatalog || catalog;
        const song = pool.find(item => item.id === songId);
        if (!song) return;

        setFormData({
            title: song.name,
            artist: song.artist,
            lyrics: song.lyrics || ''
        });
    };

    // Cycle through loading messages
    useEffect(() => {
        let interval: any;
        if (loading) {
            let index = 0;
            interval = setInterval(() => {
                index = (index + 1) % loadingMessages.length;
                setLoaderMessage(loadingMessages[index]);
            }, 2200);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Trigger Prompt Generation
    const handleGenerate = async () => {
        if (!formData.title.trim() || !formData.lyrics.trim()) return;

        // Clean Suno/AI annotations: [Verse], [Chorus], etc.
        const cleanLyrics = formData.lyrics.replace(/\[[^[\]]*\]/g, "").trim();

        setLoading(true);
        setStep(2);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/generate-video-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    artist: formData.artist,
                    lyrics: cleanLyrics
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw data;
            }

            setResult(data);
            
            // Add to history
            const newHistoryItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleDateString('es-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                title: formData.title,
                artist: formData.artist,
                style: data.suggestedStyle || 'Narrativa',
                data: data
            };
            const updatedHistory = [newHistoryItem, ...history].slice(0, 15);
            setHistory(updatedHistory);
            localStorage.setItem('pwa_video_prompts_history', JSON.stringify(updatedHistory));

            setStep(3);
            setActiveTab('concept');
        } catch (err: any) {
            setError(err);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    // Clipboard copy helper
    const handleCopyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [key]: false }));
        }, 2000);
    };

    // Load an item from history
    const handleLoadFromHistory = (item: HistoryItem) => {
        setFormData({
            title: item.title,
            artist: item.artist,
            lyrics: item.data.scenes.map(s => s.lyricsSnippet).join('\n')
        });
        setResult(item.data);
        setStep(3);
        setActiveTab('concept');
    };

    // Delete an item from history
    const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedHistory = history.filter(item => item.id !== id);
        setHistory(updatedHistory);
        localStorage.setItem('pwa_video_prompts_history', JSON.stringify(updatedHistory));
    };

    const resetForm = () => {
        setStep(1);
        setResult(null);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
            <div className="max-w-5xl mx-auto">
                
                {/* Header */}
                <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                            <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                        </button>
                        <h1 className="font-serif italic text-4xl md:text-6xl text-white">
                            AI Music Video <span className="text-[#c5a059]">Prompt</span>
                        </h1>
                        <p className="text-white/40 text-xs mt-2 max-w-xl">
                            Transforma las letras de tus canciones en guiones visuales y prompts cinemáticos escena por escena para generadores de video de IA.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full select-none">
                            {VERSION}
                        </span>
                        {history.length > 0 && step === 1 && (
                            <button
                                onClick={() => { setStep(3); setActiveTab('history'); }}
                                className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:underline"
                            >
                                <i className="fas fa-history mr-2"></i> Ver Historial ({history.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* STEP 1: FORM */}
                {step === 1 && (
                    <div className="bg-[#0f111a] border border-white/5 p-8 md:p-10 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-[100px] pointer-events-none"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            {/* Autocompleter */}
                            <div className="col-span-1 md:col-span-2 bg-[#05070a] border border-[#c5a059]/20 rounded-2xl p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-1">
                                            Cargar desde tu Catálogo
                                        </label>
                                        <p className="text-white/30 text-[10px]">
                                            Selecciona una canción registrada para cargar su letra y detalles automáticamente.
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setCatalogLoading(true);
                                            try {
                                                const [diosmasgym, juan614] = await Promise.all([
                                                    fetchMusicCatalog('diosmasgym', true),
                                                    fetchMusicCatalog('juan614', true)
                                                ]);
                                                setCatalog([...diosmasgym, ...juan614]);
                                            } finally {
                                                setCatalogLoading(false);
                                            }
                                        }}
                                        disabled={catalogLoading}
                                        className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:text-white transition-all disabled:opacity-40"
                                    >
                                        <i className={`fas ${catalogLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`}></i>
                                        Sincronizar Catálogo
                                    </button>
                                </div>
                                <select
                                    value={selectedSongId}
                                    onChange={(e) => handleSongSelect(e.target.value)}
                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-[#c5a059]/50 outline-none cursor-pointer"
                                >
                                    <option value="">{catalogLoading ? 'Cargando catálogo...' : 'Seleccionar canción existente...'}</option>
                                    {catalog.map(song => (
                                        <option key={song.id} value={song.id}>{song.artist} - {song.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Inputs manuales */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-3">Título de la Canción</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ej: Guerrero de Luz"
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-[#c5a059]/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-3">Artista / Grupo</label>
                                <input
                                    type="text"
                                    value={formData.artist}
                                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                                    placeholder="Ej: Dios Mas Gym"
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-[#c5a059]/50 outline-none transition-all"
                                />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a059]">Letra de la Canción</label>
                                    <span className="text-[9px] text-white/30 font-mono">💡 La Inteligencia Artificial determinará el estilo visual exacto según el significado de la letra</span>
                                </div>
                                <textarea
                                    value={formData.lyrics}
                                    onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                                    placeholder="Pega la letra aquí..."
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-5 text-xs text-white min-h-[220px] focus:border-[#c5a059]/50 outline-none transition-all resize-none font-sans leading-relaxed"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!formData.title.trim() || !formData.lyrics.trim() || loading}
                            className="w-full py-5 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    <span>ANALIZANDO LÍRICAS...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-wand-magic-sparkles text-xs"></i>
                                    <span>AUTODETECTAR ESTILO Y GENERAR GUION</span>
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="mt-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs flex items-center gap-3">
                                <i className="fas fa-circle-exclamation text-sm"></i>
                                <div className="flex-1">
                                    <p className="font-bold">Error en la Generación</p>
                                    <p className="opacity-80 mt-0.5">{error.error || error.message || 'Error al conectar con la API de Gemini.'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: LOADER */}
                {step === 2 && (
                    <div className="py-28 text-center space-y-8 animate-fade-in-up bg-[#0f111a] border border-white/5 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-[80px] pointer-events-none"></div>
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 rounded-full border-2 border-[#c5a059]/10"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-t-[#c5a059] animate-spin"></div>
                            <div className="absolute inset-4 rounded-full bg-[#05070a] flex items-center justify-center text-[#c5a059]">
                                <i className="fas fa-wand-magic-sparkles text-xl animate-pulse"></i>
                            </div>
                        </div>
                        <div className="space-y-3 max-w-md mx-auto px-6">
                            <h3 className="font-serif italic text-2xl text-white">Diseñando Guion de Video...</h3>
                            <p className="text-[#c5a059] text-[10px] font-mono uppercase tracking-widest min-h-[1.5rem] transition-all">
                                {loaderMessage}
                            </p>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-6">
                                <div className="bg-[#c5a059] h-full animate-progress-bar rounded-full"></div>
                            </div>
                        </div>
                        <p className="text-white/30 text-[10px] max-w-xs mx-auto leading-relaxed font-sans">
                            Esto puede demorar hasta 20 segundos mientras el modelo analiza las metáforas líricas e ilumina tu concepto.
                        </p>
                    </div>
                )}

                {/* STEP 3: RESULTS & DASHBOARD */}
                {step === 3 && result && (
                    <div className="space-y-8 animate-fade-in-up">
                        
                        {/* Control Bar */}
                        <div className="flex flex-wrap justify-between items-center bg-[#0f111a] border border-white/5 p-4 rounded-2xl gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                                    Estilo: {result.suggestedStyle || 'Determinado por IA'} • Look: {result.suggestedVibe}
                                </span>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={resetForm}
                                    className="text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <i className="fas fa-redo"></i> Nueva Canción
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px scrollbar-none">
                            {[
                                { id: 'concept', label: 'Concepto & Arte', icon: 'fa-palette' },
                                { id: 'scenes', label: 'Guion por Escenas', icon: 'fa-timeline' },
                                { id: 'guide', label: 'Guía de IAs (Runway/Sora)', icon: 'fa-book-open' },
                                { id: 'history', label: 'Historial Local', icon: 'fa-history' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                                        activeTab === tab.id 
                                            ? 'border-[#c5a059] text-[#c5a059] bg-white/[0.02]' 
                                            : 'border-transparent text-white/40 hover:text-white/80'
                                    }`}
                                >
                                    <i className={`fas ${tab.icon} text-xs`}></i>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENT: CONCEPT */}
                        {activeTab === 'concept' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Analysis & Concept */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">
                                            <i className="fas fa-brain mr-2"></i> Análisis del Mensaje Lírico
                                        </h4>
                                        <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line font-sans">
                                            {result.songAnalysis}
                                        </p>
                                    </div>

                                    <div className="bg-[#0f111a] border border-[#c5a059]/20 p-8 rounded-3xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full blur-[40px] pointer-events-none"></div>
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">
                                            <i className="fas fa-quote-left mr-2"></i> Metáfora Visual Central
                                        </h4>
                                        <blockquote className="font-serif italic text-lg text-white leading-relaxed mb-4">
                                            "{result.mainConcept}"
                                        </blockquote>
                                    </div>
                                </div>

                                {/* Art Direction Parameters */}
                                <div className="space-y-8">
                                    {/* Color Palette Card */}
                                    <div className="bg-[#0f111a] border border-white/5 p-6 rounded-3xl space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">
                                            <i className="fas fa-eye mr-2"></i> Paleta Cinematográfica
                                        </h4>
                                        
                                        {/* Color Blocks */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {result.colorPalette.colors.map((color, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => handleCopyToClipboard(color, `color-${i}`)}
                                                    className="group cursor-pointer flex flex-col items-center gap-1.5"
                                                >
                                                    <div 
                                                        className="w-full h-12 rounded-lg border border-white/15 transition-transform hover:scale-105"
                                                        style={{ backgroundColor: color }}
                                                    ></div>
                                                    <span className="text-[8px] font-mono text-white/50 group-hover:text-[#c5a059]">
                                                        {copiedStates[`color-${i}`] ? 'Copied' : color}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-[11px] leading-relaxed text-white/60 space-y-2 pt-2 border-t border-white/5">
                                            <p className="font-bold text-white">Estética de Iluminación:</p>
                                            <p className="italic font-sans">{result.colorPalette.description}</p>
                                        </div>
                                    </div>

                                    {/* Style Summary */}
                                    <div className="bg-[#0f111a] border border-white/5 p-6 rounded-3xl flex justify-between items-center">
                                        <div>
                                            <h5 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Estilo Determinado</h5>
                                            <p className="text-white text-xs font-bold font-mono">{result.suggestedStyle || 'Narrativa lírica'}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-[#c5a059]/10 flex items-center justify-center text-[#c5a059]">
                                            <i className="fas fa-wand-magic-sparkles text-sm"></i>
                                        </div>
                                    </div>

                                    {/* Vibe Summary */}
                                    <div className="bg-[#0f111a] border border-white/5 p-6 rounded-3xl flex justify-between items-center">
                                        <div>
                                            <h5 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Look Sugerido</h5>
                                            <p className="text-white text-xs font-bold font-mono">{result.suggestedVibe}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-[#c5a059]/10 flex items-center justify-center text-[#c5a059]">
                                            <i className="fas fa-camera text-sm"></i>
                                        </div>
                                    </div>
                                </div>

                                {/* Master Prompt Global */}
                                <div className="lg:col-span-3 bg-[#0a0c14] border border-[#c5a059]/20 p-8 rounded-3xl space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-1">
                                                Master Prompt (Estilo Visual Global)
                                            </h4>
                                            <p className="text-white/40 text-[10px]">
                                                Copia este prompt base e inyéctalo en tu generador de video de IA para definir la iluminación, cámara y texturas de todo el video.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCopyToClipboard(result.masterPrompt, 'master')}
                                            className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                                copiedStates['master'] 
                                                    ? 'bg-green-500 border-green-500 text-black' 
                                                    : 'bg-[#c5a059]/10 border-[#c5a059]/30 text-[#c5a059] hover:bg-white hover:text-black hover:border-white'
                                            }`}
                                        >
                                            <i className={`fas ${copiedStates['master'] ? 'fa-check' : 'fa-copy'}`}></i>
                                            {copiedStates['master'] ? 'COPIADO' : 'COPIAR MASTER PROMPT'}
                                        </button>
                                    </div>
                                    <div className="bg-[#05070a] border border-white/5 p-6 rounded-xl font-mono text-xs text-white/90 leading-relaxed break-words whitespace-pre-wrap select-all">
                                        {result.masterPrompt}
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* TAB CONTENT: SCENES TIMELINE */}
                        {activeTab === 'scenes' && (
                            <div className="space-y-8">
                                <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-2">
                                        <i className="fas fa-film mr-2"></i> Timeline de Escenas y Prompts de Video
                                    </h4>
                                    <p className="text-white/40 text-xs leading-relaxed max-w-2xl">
                                        Aquí tienes el desglose técnico escena por escena del video musical. Copia los prompts en inglés individuales para generar cada toma en Runway Gen-3 o Sora.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    {result.scenes.map((scene, i) => (
                                        <div 
                                            key={i} 
                                            className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-[#c5a059]/25 transition-all"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full blur-[40px] pointer-events-none"></div>
                                            
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-white/5">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-3 py-1 bg-[#c5a059]/10 text-[#c5a059] font-mono text-[9px] font-black uppercase rounded-full border border-[#c5a059]/20">
                                                            Escena {i+1} • {scene.timeframe}
                                                        </span>
                                                    </div>
                                                    <blockquote className="font-serif italic text-sm text-white/50 pl-4 border-l-2 border-[#c5a059] mt-2">
                                                        "{scene.lyricsSnippet}"
                                                    </blockquote>
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleCopyToClipboard(scene.aiPrompt, `scene-${i}`)}
                                                    className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${
                                                        copiedStates[`scene-${i}`] 
                                                            ? 'bg-green-500 border-green-500 text-black' 
                                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white hover:text-black hover:border-white'
                                                    }`}
                                                >
                                                    <i className={`fas ${copiedStates[`scene-${i}`] ? 'fa-check' : 'fa-copy'}`}></i>
                                                    {copiedStates[`scene-${i}`] ? 'COPIADO' : 'COPIAR PROMPT DE IA'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 font-sans text-xs">
                                                <div className="space-y-2.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Dirección de Arte y Toma (Español)</span>
                                                    <p className="text-white/80 leading-relaxed font-sans">{scene.visualDescription}</p>
                                                </div>
                                                <div className="space-y-2.5 bg-[#05070a] p-5 rounded-xl border border-white/5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] block">Technical Video Prompt (Runway / Sora)</span>
                                                    <p className="font-mono text-white/70 leading-relaxed break-words select-all">{scene.aiPrompt}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: IA GENERATOR GUIDE */}
                        {activeTab === 'guide' && (
                            <div className="space-y-8">
                                <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">
                                        <i className="fas fa-book-open mr-2"></i> Guía de Uso del Guion con IAs de Video
                                    </h4>
                                    <p className="text-white/40 text-xs leading-relaxed max-w-2xl">
                                        Aprende a transformar estos prompts de texto en secuencias de video hiperrealistas utilizando las plataformas líderes de la industria.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        {
                                            name: 'Runway Gen-3 Alpha',
                                            logo: 'R',
                                            tips: [
                                                'Excelente para control cinematográfico y texturas detalladas.',
                                                'Copia el Master Prompt en el campo "System Prompt" o "Settings" si la plataforma lo permite.',
                                                'Pega el prompt de la escena individual en el campo de texto de generación principal.',
                                                'Utiliza un ratio de 16:9 y activa "Upscale" para máxima nitidez.',
                                                'Establece la duración a 5 o 10 segundos según el tempo lírico de la escena.'
                                            ]
                                        },
                                        {
                                            name: 'Sora (OpenAI) / Kling',
                                            logo: 'S',
                                            tips: [
                                                'Comprenden perfectamente la física y los planos complejos. Describe la profundidad de campo y la ambientación sin miedo.',
                                                'Excelente fidelidad a las especificaciones líricas y simbolismos poéticos.',
                                                'Enfatiza la estética y las texturas: "rich textures, detailed hyperrealistic skin pore rendering, cinematic color grade".'
                                            ]
                                        }
                                    ].map((platform, i) => (
                                        <div key={i} className="bg-[#0f111a] border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-xl bg-[#c5a059]/10 text-[#c5a059] flex items-center justify-center font-mono font-bold text-xs">
                                                        {platform.logo}
                                                    </div>
                                                    <h5 className="text-white text-xs font-bold">{platform.name}</h5>
                                                </div>
                                                <ul className="space-y-3.5 list-disc pl-4">
                                                    {platform.tips.map((tip, idx) => (
                                                        <li key={idx} className="text-white/40 text-[10px] leading-relaxed font-sans">
                                                            {tip}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="pt-4 border-t border-white/5 text-[9px] text-[#c5a059] font-black uppercase tracking-widest">
                                                Recomendado
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: LOCAL HISTORY */}
                        {activeTab === 'history' && (
                            <div className="space-y-8">
                                <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">
                                        <i className="fas fa-history mr-2"></i> Historial de Conceptos de Video Musical Generados
                                    </h4>
                                    <p className="text-white/40 text-xs leading-relaxed max-w-2xl">
                                        Aquí se guardan las últimas {history.length} propuestas que has diseñado en este navegador. Puedes recuperarlas de inmediato sin consumir llamadas de IA de nuevo.
                                    </p>
                                </div>

                                {history.length === 0 ? (
                                    <div className="py-20 text-center text-white/20 font-serif italic text-xl border border-white/5 rounded-3xl">
                                        El historial está vacío. Comienza generando tu primer prompt.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleLoadFromHistory(item)}
                                                className="group bg-[#0f111a] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:border-[#c5a059]/40 transition-all"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 text-[#c5a059] flex items-center justify-center">
                                                        <i className="fas fa-wand-magic-sparkles text-sm"></i>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-white text-xs font-bold group-hover:text-[#c5a059] transition-colors">
                                                            {item.title} <span className="text-white/30 font-normal text-[10px] ml-2">de {item.artist}</span>
                                                        </h5>
                                                        <p className="text-white/35 text-[9px] mt-1 font-mono uppercase tracking-widest">
                                                            Estilo: {item.style} • Generado el {item.timestamp}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 shrink-0 justify-end">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] opacity-40 group-hover:opacity-100 transition-opacity">
                                                        Cargar Propuesta
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                                                        className="w-8 h-8 rounded-full border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-all flex items-center justify-center"
                                                        title="Eliminar del historial"
                                                    >
                                                        <i className="fas fa-trash text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}

            </div>
        </div>
    );
};

export default MusicVideoPromptGenerator;
