import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AIPressRelease: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    const VERSION = "v1.0.0 PR-Gen";

    const [formData, setFormData] = useState({
        input: '',
        platform: 'Prensa/Blog', // Fake platform for the backend
        goal: 'Comunicado de Prensa (Press Release) formal y profesional',
        tone: 'Profesional y Persuasivo'
    });

    const handleGenerate = async () => {
        if (!formData.input.trim()) return;
        setLoading(true);
        setError(null);
        setCopied(false);
        try {
            // Reutilizamos el endpoint existente pero le pasamos instrucciones para un Press Release
            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: `Actúa como un experto relacionista público (PR). Crea un Comunicado de Prensa Oficial basado en esta información: "${formData.input}". Tono: ${formData.tone}. Debe incluir título, ciudad/fecha de lanzamiento, cuerpo de la noticia, citas del artista y contacto al final.` 
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                setError(data);
                setLoading(false);
                return;
            }

            setResult(data.text);
            setStep(2);
        } catch (err: any) {
            setError({ error: 'Error de red', details: err.message });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setStep(1);
        setResult('');
        setError(null);
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8 font-['Poppins']">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
                            <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                                <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                            </button>
                            <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">AI Press <span className="text-[#c5a059]">Release</span></h1>
                        </div>
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full">{VERSION}</span>
                    </div>
                </div>

                {step === 1 ? (
                    <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">Información del Lanzamiento</label>
                                <textarea 
                                    value={formData.input} onChange={(e) => setFormData({...formData, input: e.target.value})}
                                    placeholder="Ej: Nuevo sencillo 'El Comienzo' de Diosmasgym. Combina trap con mensaje de disciplina y fe. Sale el próximo viernes. Producido en Chihuahua." className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white min-h-[150px] focus:border-[#c5a059]/50 outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">Tono del Comunicado</label>
                                <select 
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                    onChange={(e) => setFormData({...formData, tone: e.target.value})}
                                    value={formData.tone}
                                >
                                    <option>Profesional y Persuasivo</option>
                                    <option>Épico y Emocionante</option>
                                    <option>Íntimo y Reflexivo</option>
                                    <option>Urbano y Directo</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} disabled={loading || !formData.input.trim()}
                            className="w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl"
                        >
                            {loading ? 'REDACTANDO NOTICIA...' : 'GENERAR COMUNICADO (PR)'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-[#0f111a] border border-[#c5a059]/20 p-10 rounded-2xl shadow-2xl animate-fade-in-up relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">COMUNICADO LISTO</span>
                            <div className="flex gap-8">
                                <button onClick={copyToClipboard} className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}>
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'COPIADO' : 'COPIAR'}
                                </button>
                                <button onClick={reset} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                    <i className="fas fa-redo"></i> NUEVO
                                </button>
                            </div>
                        </div>
                        <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-sm md:text-base font-serif min-h-[300px]">{result}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIPressRelease;
