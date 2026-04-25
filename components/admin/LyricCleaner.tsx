import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LyricCleaner: React.FC = () => {
    const navigate = useNavigate();
    const [rawLyrics, setRawLyrics] = useState('');
    const [finalLyrics, setFinalLyrics] = useState('');
    const [toastMsg, setToastMsg] = useState('');

    const copyText = (text: string, label: string = "Copiado") => {
        navigator.clipboard.writeText(text).then(() => {
            setToastMsg(label);
            setTimeout(() => {
                setToastMsg('');
            }, 2000);
        }).catch(err => {
            console.error('Error al copiar', err);
        });
    };

    const cleanAndTransferLyrics = () => {
        let text = rawLyrics;
        if (!text) { 
            alert("Pega algo arriba primero."); 
            return; 
        }

        // eliminar etiquetas [Intro] etc
        let previousText = "";
        while (text !== previousText) {
            previousText = text;
            text = text.replace(/\[[^[\]]*\]/g, "");
        }

        const normalizeLine = (line: string) => {
            let t = line.trim();
            if (!t) return "";

            // Reemplazar comillas raras por estándar
            t = t.replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"');

            // Eliminar espacios de cero ancho y espacios no divisibles
            t = t.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');

            // Eliminar caracteres que no sean estándar
            t = t.replace(/[^a-zA-Z0-9\s.,!?'"()áéíóúÁÉÍÓÚñÑüÜ¿¡-]/g, "");

            // Reemplazar múltiples espacios por uno solo
            t = t.replace(/\s+/g, ' ');

            // Quitar ABSOLUTAMENTE cualquier puntuación al inicio o final
            t = t.replace(/^[.,;:\-!?"'()[\]]+/, "");
            t = t.replace(/[.,;:\-!?"'()[\]]+$/, "");

            const letters = t.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, "");
            const upperCount = letters.split('').filter(l => l === l.toUpperCase()).length;

            if (letters.length > 0 && (upperCount / letters.length) > 0.6) {
                t = t.toLowerCase();
            }

            t = t.trim();
            if (t.length > 0) {
                // primera letra mayúscula
                t = t.charAt(0).toUpperCase() + t.slice(1);
            }

            return t;
        };

        let rawLines = text.split('\n');
        let splitRawLines: string[] = [];

        rawLines.forEach(l => {
            let remaining = l;
            while (remaining.length > 65) {
                let splitIndex = remaining.lastIndexOf(' ', 65);
                if (splitIndex === -1) {
                    splitIndex = 65; // Force split if no spaces 
                }
                splitRawLines.push(remaining.substring(0, splitIndex));
                remaining = remaining.substring(splitIndex);
            }
            if (remaining.trim().length > 0) {
                splitRawLines.push(remaining);
            }
        });

        const lines = splitRawLines
            .map(normalizeLine)
            .filter(l => l.trim() !== "");

        // insertar espacio entre versos cada 4 líneas
        const formatted: string[] = [];
        lines.forEach((line, i) => {
            formatted.push(line);
            if ((i + 1) % 4 === 0 && i !== lines.length - 1) {
                formatted.push("");
            }
        });

        let finalOutput = formatted.join('\n');
        // Remover líneas en blanco consecutivas fuertemente (si las hubiera)
        finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n'); 
        // Remover cualquier salto de línea final o inicial
        finalOutput = finalOutput.trim();

        setFinalLyrics(finalOutput);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <button 
                    onClick={() => navigate('/admin')}
                    className="mb-8 text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-2 hover:translate-x-1"
                >
                    <i className="fas fa-arrow-left"></i> Volver al Panel
                </button>
                
                <h1 className="text-3xl md:text-5xl font-['Poppins'] font-bold mb-8 text-white uppercase tracking-wider">
                    Limpiador de Letras <span className="text-[#00ffcc]">Musixmatch</span>
                </h1>

                {/* Global Toast Notification */}
                {toastMsg && (
                    <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 z-[200] flex items-center gap-2">
                        <i className="fas fa-check-circle"></i> <span>{toastMsg}</span>
                    </div>
                )}

                <div className="flex-grow flex flex-col space-y-4 bg-[#0f111a] p-8 rounded-2xl border border-white/5 shadow-2xl">
                    {/* BOX 1: RAW INPUT */}
                    <div>
                        <label className="block text-sm text-[#00ffcc] mb-3 font-bold tracking-widest uppercase">
                            1. Borrador (Suno/IA)
                        </label>
                        <textarea 
                            value={rawLyrics}
                            onChange={(e) => setRawLyrics(e.target.value)}
                            rows={8} 
                            placeholder="[Intro] Pega aquí..." 
                            className="w-full bg-[#05070a]/50 border border-white/10 rounded-xl px-6 py-4 text-slate-300 focus:border-[#00ffcc] focus:outline-none resize-y text-sm leading-relaxed custom-scrollbar"
                        ></textarea>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="flex justify-center py-4 relative z-10">
                        <button 
                            type="button" 
                            onClick={cleanAndTransferLyrics} 
                            className="bg-[#c5a059] hover:bg-[#d6b06a] text-black text-[10px] uppercase font-black tracking-widest py-4 px-10 rounded-full shadow-lg flex items-center gap-3 transition transform hover:scale-105"
                        >
                            <i className="fas fa-arrow-down"></i> Limpiar y Estructurar
                        </button>
                    </div>

                    {/* BOX 2: FINAL OUTPUT */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm text-emerald-400 font-bold tracking-widest uppercase">
                                2. Letra Final
                            </label>
                            <button 
                                onClick={() => copyText(finalLyrics, 'Letra Copiada')} 
                                className="text-[10px] font-black tracking-widest uppercase bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <i className="fas fa-copy"></i> Copiar
                            </button>
                        </div>
                        <textarea 
                            value={finalLyrics}
                            onChange={(e) => setFinalLyrics(e.target.value)}
                            rows={12} 
                            placeholder="Letra limpia y estructurada..." 
                            className="w-full bg-[#05070a] border border-emerald-500/30 rounded-xl px-6 py-4 text-white focus:border-emerald-500 focus:outline-none resize-y shadow-inner text-sm leading-relaxed custom-scrollbar"
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LyricCleaner;
