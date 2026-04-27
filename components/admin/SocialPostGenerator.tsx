import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSocialPost } from '../../services/geminiService';

const SocialPostGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        setError('');
        setCopied(false);
        try {
            const post = await generateSocialPost(input);
            setResult(post);
        } catch (err: any) {
            setError(err.message || 'Error al generar el post. Verifica tu API Key.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group"
                    >
                        <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> 
                        Volver al Panel
                    </button>
                    <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">
                        Post Viral <span className="text-[#c5a059]">Generator</span>
                    </h1>
                    <p className="text-[#94a3b8] text-sm tracking-widest uppercase font-bold">
                        Estrategia Digital de Alto Impacto
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {/* Input Section */}
                    <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                            <i className="fas fa-bullhorn text-[120px]"></i>
                        </div>
                        
                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6">
                            Contenido Base (Letra o Título)
                        </label>
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pega aquí la letra de la canción o el título para el post..."
                            className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white font-['Poppins'] min-h-[150px] focus:border-[#c5a059]/50 outline-none transition-all resize-none"
                        />

                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !input.trim()}
                            className="mt-8 w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_30px_rgba(197,160,89,0.2)]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-4">
                                    <i className="fas fa-circle-notch animate-spin"></i>
                                    Analizando Estrategia...
                                </span>
                            ) : (
                                'Generar Post Viral'
                            )}
                        </button>

                        {error && (
                            <p className="mt-6 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                            </p>
                        )}
                    </div>

                    {/* Result Section */}
                    {result && (
                        <div className="bg-[#0f111a] border border-[#c5a059]/20 p-10 rounded-2xl shadow-2xl animate-fade-in relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">
                                    Propuesta Estratégica AI
                                </span>
                                <button 
                                    onClick={copyToClipboard}
                                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}
                                >
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                                    {copied ? 'Copiado' : 'Copiar Texto'}
                                </button>
                            </div>
                            
                            <div className="text-white/90 font-['Poppins'] leading-relaxed whitespace-pre-wrap text-lg min-h-[200px]">
                                {result}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialPostGenerator;
