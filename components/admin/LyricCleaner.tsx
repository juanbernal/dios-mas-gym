import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LyricCleaner: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [rawLyrics, setRawLyrics] = useState(() => (location.state as { initialLyrics?: string } | null)?.initialLyrics || '');
    const [finalLyrics, setFinalLyrics] = useState('');
    const [toastMsg, setToastMsg] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Opciones de formato
    const [removeTags, setRemoveTags] = useState(true);
    const [forceCapitalize, setForceCapitalize] = useState(true);
    const [capitalizeDivine, setCapitalizeDivine] = useState(true);
    const [removePunctuation, setRemovePunctuation] = useState(true);

    const copyText = (text: string, label: string = "Copiado") => {
        navigator.clipboard.writeText(text).then(() => {
            setToastMsg(label);
            setTimeout(() => setToastMsg(''), 2500);
        }).catch(err => console.error('Error al copiar', err));
    };

    const cleanAndTransferLyrics = () => {
        if (!rawLyrics.trim()) {
            setToastMsg("⚠️ Pega la letra primero");
            setTimeout(() => setToastMsg(''), 2500);
            return;
        }

        setIsProcessing(true);

        setTimeout(() => {
            let text = rawLyrics;

            // 1. Eliminar etiquetas [Intro], [Chorus], etc.
            if (removeTags) {
                let previousText = "";
                while (text !== previousText) {
                    previousText = text;
                    text = text.replace(/\[[^[\]]*\]/g, "");
                }
            }

            const normalizeLine = (line: string) => {
                let t = line.trim();
                if (!t) return "";

                // Reemplazar comillas raras por estándar
                t = t.replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"');

                // Eliminar espacios de cero ancho y no divisibles
                t = t.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');

                // Reemplazar múltiples espacios por uno solo
                t = t.replace(/\s+/g, ' ');

                // Reglas Musixmatch: NO puntuación al final de las líneas
                if (removePunctuation) {
                    t = t.replace(/^[.,;:\-!?"'()[\]]+/, ""); // inicio
                    t = t.replace(/[.,;:\-!?"'()[\]]+$/, ""); // final
                }

                // Transformar gritos en mayúsculas a minúsculas
                const letters = t.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
                const upperCount = letters.split('').filter(l => l === l.toUpperCase()).length;
                if (letters.length > 0 && (upperCount / letters.length) > 0.6) {
                    t = t.toLowerCase();
                }

                t = t.trim();

                // Primera letra mayúscula (Regla de Musixmatch)
                if (forceCapitalize && t.length > 0) {
                    t = t.charAt(0).toUpperCase() + t.slice(1);
                }
                
                // Asegurar mayúsculas para nombres divinos
                if (capitalizeDivine) {
                    t = t.replace(/\bdios\b/gi, "Dios");
                    t = t.replace(/\bjesucristo\b/gi, "Jesucristo");
                    t = t.replace(/\bjesús\b/gi, "Jesús");
                    t = t.replace(/\bjesus\b/gi, "Jesús"); // autocorregir sin acento
                    t = t.replace(/\bseñor\b/gi, "Señor");
                    t = t.replace(/\bespíritu\s+santo\b/gi, "Espíritu Santo");
                    t = t.replace(/\bespiritu\s+santo\b/gi, "Espíritu Santo");
                }

                return t;
            };

            // Separar líneas muy largas (Musixmatch sugiere evitar líneas kilométricas)
            let rawLines = text.split('\n');
            let splitRawLines: string[] = [];

            rawLines.forEach(l => {
                let remaining = l;
                while (remaining.length > 65) {
                    let splitIndex = remaining.lastIndexOf(' ', 65);
                    if (splitIndex === -1) splitIndex = 65;
                    splitRawLines.push(remaining.substring(0, splitIndex));
                    remaining = remaining.substring(splitIndex);
                }
                if (remaining.trim().length > 0) {
                    splitRawLines.push(remaining);
                }
            });

            // Normalizar y filtrar líneas vacías extrañas
            const lines = splitRawLines
                .map(normalizeLine)
                .filter(l => l.trim() !== "");

            // Reestructurar estrofas (insertar espacio cada 4 líneas si no hay saltos obvios)
            // Si el texto original ya tenía estructura, intentamos respetarla en lo posible, 
            // pero si viene como bloque, forzamos cuartetos.
            const hasExistingStructure = rawLyrics.includes('\n\n');
            const formatted: string[] = [];
            
            if (hasExistingStructure) {
                // Re-procesar respetando bloques
                const blocks = text.split(/\n\s*\n/);
                blocks.forEach(block => {
                    const bLines = block.split('\n').map(normalizeLine).filter(l => l.trim() !== "");
                    if (bLines.length > 0) {
                        formatted.push(...bLines);
                        formatted.push(""); // salto entre bloques
                    }
                });
                if (formatted.length > 0 && formatted[formatted.length - 1] === "") {
                    formatted.pop(); // quitar último salto
                }
            } else {
                // Forzar cuartetos
                lines.forEach((line, i) => {
                    formatted.push(line);
                    if ((i + 1) % 4 === 0 && i !== lines.length - 1) {
                        formatted.push("");
                    }
                });
            }

            let finalOutput = formatted.join('\n');
            
            // Remover líneas en blanco consecutivas excesivas
            finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n'); 
            finalOutput = finalOutput.trim();

            setFinalLyrics(finalOutput);
            setIsProcessing(false);
            setToastMsg("✨ Letra estructurada correctamente");
            setTimeout(() => setToastMsg(''), 2500);

        }, 400); // Simulamos procesamiento para UX
    };

    return (
        <div className="min-h-screen bg-[#030407] text-white pt-24 pb-32 px-4 md:px-6 font-sans">
            
            {/* Toast Notificación */}
            {toastMsg && (
                <div className="fixed bottom-8 right-8 z-[300] bg-[#10b981] text-black font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.4)] flex items-center gap-3 animate-bounce">
                    <i className="fas fa-check-circle" /> {toastMsg}
                </div>
            )}

            <div className="max-w-[1400px] mx-auto">
                {/* ── Header ── */}
                <div className="mb-10">
                    <button
                        onClick={() => navigate("/admin")}
                        className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-[#10b981] transition-all group"
                    >
                        <span className="w-6 h-px bg-current group-hover:w-10 transition-all" />
                        Panel Principal
                    </button>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#10b981] mb-2">
                                Herramienta de Sincronización
                            </p>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
                                Limpiador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#00ffcc]">Letras PRO</span>
                            </h1>
                            <p className="mt-3 text-white/40 text-sm max-w-xl">
                                Formatea automáticamente las letras en bruto (de IA o internet) aplicando las directrices estrictas de Musixmatch y Spotify.
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            <a href="https://studio.musixmatch.com/" target="_blank" rel="noreferrer"
                               className="shrink-0 flex items-center gap-3 px-6 py-3.5 bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white hover:border-[#ff4b2b] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">
                                <i className="fas fa-music" /> Abrir Musixmatch
                            </a>
                            <a href="https://artists.spotify.com/" target="_blank" rel="noreferrer"
                               className="shrink-0 flex items-center gap-3 px-6 py-3.5 bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-[#1DB954] hover:border-[#1DB954] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">
                                <i className="fab fa-spotify" /> Spotify for Artists
                            </a>
                        </div>
                    </div>
                </div>

                {/* ── Main Workspace ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* COL 1: ENTRADA RAW */}
                    <div className="flex flex-col h-full bg-[#0c0e17] border border-white/[0.06] rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#10b981] flex items-center gap-2">
                                <i className="fas fa-file-pen" /> 1. Pegar Borrador (Bruto)
                            </h3>
                            <button onClick={() => setRawLyrics('')} className="text-white/30 hover:text-[#ff4b2b] text-xs transition-colors" title="Limpiar todo">
                                <i className="fas fa-trash-can" />
                            </button>
                        </div>
                        
                        <textarea 
                            value={rawLyrics}
                            onChange={(e) => setRawLyrics(e.target.value)}
                            placeholder="Pega aquí la letra generada por Suno, Udio o copiada de internet..."
                            className="flex-1 min-h-[400px] w-full bg-black/40 border border-white/[0.08] focus:border-[#10b981]/50 rounded-2xl p-5 text-sm text-white/80 outline-none resize-none leading-relaxed custom-scrollbar transition-colors"
                        />

                        {/* Opciones de formateo */}
                        <div className="mt-6 p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={removeTags} onChange={e => setRemoveTags(e.target.checked)} className="accent-[#10b981]" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">Quitar [Tags]</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={forceCapitalize} onChange={e => setForceCapitalize(e.target.checked)} className="accent-[#10b981]" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">Iniciar Mayúscula</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={removePunctuation} onChange={e => setRemovePunctuation(e.target.checked)} className="accent-[#10b981]" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">Quitar Puntuación final</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={capitalizeDivine} onChange={e => setCapitalizeDivine(e.target.checked)} className="accent-[#10b981]" />
                                <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">Nombres Dios en Mayús.</span>
                            </label>
                        </div>
                    </div>

                    {/* BOTÓN PROCESAR (Desktop: Centro, Mobile: Entre cols) */}
                    <div className="lg:absolute lg:left-1/2 lg:top-[60%] lg:-translate-x-1/2 lg:-translate-y-1/2 z-10 flex justify-center py-4 lg:py-0">
                        <button 
                            onClick={cleanAndTransferLyrics}
                            disabled={isProcessing}
                            className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#10b981] to-[#059669] text-white rounded-full shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center text-xl lg:text-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                            title="Procesar Letra"
                        >
                            {isProcessing ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-bolt" />}
                        </button>
                    </div>

                    {/* COL 2: SALIDA LIMPIA */}
                    <div className="flex flex-col h-full bg-[#0c0e17] border border-white/[0.06] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                        {/* Glow verde sutil de fondo */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/5 rounded-full blur-[80px] pointer-events-none" />

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00ffcc] flex items-center gap-2">
                                <i className="fas fa-check-double" /> 2. Resultado (Musixmatch Ready)
                            </h3>
                            <button 
                                onClick={() => copyText(finalLyrics, "¡Letra Copiada!")}
                                className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                <i className="fas fa-copy" /> Copiar Letra
                            </button>
                        </div>
                        
                        <textarea 
                            value={finalLyrics}
                            readOnly
                            placeholder="Aquí aparecerá la letra formateada lista para sincronizar..."
                            className="flex-1 min-h-[400px] w-full bg-[#05070a]/60 border border-[#10b981]/20 rounded-2xl p-5 text-sm text-white outline-none resize-none leading-relaxed custom-scrollbar relative z-10 focus:border-[#10b981]/50 transition-colors"
                        />

                        {/* Checklist directrices */}
                        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-white/30 relative z-10 overflow-x-auto whitespace-nowrap">
                            <span className="flex items-center gap-1.5"><i className="fas fa-check text-[#10b981]" /> Sin etiquetas</span>
                            <span className="flex items-center gap-1.5"><i className="fas fa-check text-[#10b981]" /> Sin puntuación extra</span>
                            <span className="flex items-center gap-1.5"><i className="fas fa-check text-[#10b981]" /> Capitalización correcta</span>
                            <span className="flex items-center gap-1.5"><i className="fas fa-check text-[#10b981]" /> Formato de estrofas</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LyricCleaner;
