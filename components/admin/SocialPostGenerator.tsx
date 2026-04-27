import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SocialPostGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    const VERSION = "v1.2.6 Inspector-Mode";

    const [formData, setFormData] = useState({
        input: '',
        platform: 'Instagram/TikTok',
        goal: 'Inspirar y Viralizar',
        tone: 'Épico y Motivador'
    });

    const handleGenerate = async () => {
        if (!formData.input.trim()) return;
        setLoading(true);
        setError(null);
        setCopied(false);
        try {
            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify(formData) })
            });

            const data = await response.json();
            
            if (!response.ok) {
                setError(data); // Store the whole error object for inspection
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
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
                            <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                                <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                            </button>
                            <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">Post Viral <span className="text-[#c5a059]">Generator</span></h1>
                        </div>
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full">{VERSION}</span>
                    </div>
                </div>

                {step === 1 ? (
                    <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">1. Contenido Base</label>
                                <textarea 
                                    value={formData.input} onChange={(e) => setFormData({...formData, input: e.target.value})}
                                    placeholder="Letra o idea..." className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white min-h-[150px] focus:border-[#c5a059]/50 outline-none transition-all resize-none"
                                />
                            </div>
                            {['plataforma', 'objetivo', 'tono'].map((key, idx) => (
                                <div key={key}>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">{idx + 2}. {key.toUpperCase()}</label>
                                    <select 
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                        onChange={(e) => setFormData({...formData, [key === 'plataforma' ? 'platform' : key === 'objetivo' ? 'goal' : 'tone']: e.target.value})}
                                    >
                                        {key === 'plataforma' && ['Instagram/TikTok', 'Facebook', 'Twitter/X', 'YouTube Shorts'].map(o => <option key={o}>{o}</option>)}
                                        {key === 'objetivo' && ['Inspirar y Viralizar', 'Promocionar canción', 'Controversia positiva', 'Testimonio'].map(o => <option key={o}>{o}</option>)}
                                        {key === 'tono' && ['Épico y Motivador', 'Reflexivo y Espiritual', 'Directo y Agresivo', 'Amigable'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerate} disabled={loading || !formData.input.trim()}
                            className="w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl"
                        >
                            {loading ? 'ANALIZANDO...' : 'GENERAR POST'}
                        </button>

                        {error && (
                            <div className="mt-10 p-8 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <h3 className="text-red-500 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-3">
                                    <i className="fas fa-bug"></i> DETALLES DEL ERROR
                                </h3>
                                <pre className="text-[11px] text-red-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                    {JSON.stringify(error, null, 2)}
                                </pre>
                                <div className="mt-8 text-[10px] text-white/40 leading-relaxed italic">
                                    * Este error viene directamente de Google. Verifica tu API Key en Vercel.
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#0f111a] border border-[#c5a059]/20 p-10 rounded-2xl shadow-2xl animate-fade-in-up relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">ESTRATEGIA GENERADA</span>
                            <div className="flex gap-8">
                                <button onClick={copyToClipboard} className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}>
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i> {copied ? 'COPIADO' : 'COPIAR'}
                                </button>
                                <button onClick={reset} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                    <i className="fas fa-redo"></i> NUEVO
                                </button>
                            </div>
                        </div>
                        <div className="text-white/90 leading-relaxed whitespace-pre-wrap text-lg min-h-[300px]">{result}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialPostGenerator;
