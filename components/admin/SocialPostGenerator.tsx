import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSocialPost } from '../../services/geminiService';

const SocialPostGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Questions, 2: Result
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const VERSION = "v1.2.4 Final-Engine";

    // Questionnaire State
    const [formData, setFormData] = useState({
        input: '',
        platform: 'Instagram/TikTok',
        goal: 'Inspirar y Viralizar',
        tone: 'Épico y Motivador'
    });

    const handleGenerate = async () => {
        if (!formData.input.trim()) return;
        setLoading(true);
        setError('');
        setCopied(false);
        try {
            const context = `
                CONTENIDO BASE: ${formData.input}
                PLATAFORMA: ${formData.platform}
                OBJETIVO: ${formData.goal}
                TONO: ${formData.tone}
            `;
            const post = await generateSocialPost(context);
            setResult(post);
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Error al generar el post.');
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
        setError('');
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
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
                        </div>
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full">
                            {VERSION}
                        </span>
                    </div>
                    <p className="text-[#94a3b8] text-sm tracking-widest uppercase font-bold">
                        Estrategia Digital Personalizada
                    </p>
                </div>

                {step === 1 ? (
                    <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                            <i className="fas fa-bullhorn text-[120px]"></i>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            {/* Question 1 */}
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">
                                    1. Contenido Base (Letra, Título o Idea principal)
                                </label>
                                <textarea 
                                    value={formData.input}
                                    onChange={(e) => setFormData({...formData, input: e.target.value})}
                                    placeholder="Pega aquí la letra o la idea que quieres viralizar..."
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white font-['Poppins'] min-h-[150px] focus:border-[#c5a059]/50 outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Question 2 */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">
                                    2. ¿En qué plataforma publicarás?
                                </label>
                                <select 
                                    value={formData.platform}
                                    onChange={(e) => setFormData({...formData, platform: e.target.value})}
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white font-['Poppins'] focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                >
                                    <option>Instagram/TikTok</option>
                                    <option>Facebook</option>
                                    <option>Twitter/X</option>
                                    <option>YouTube Shorts</option>
                                    <option>Todas las anteriores</option>
                                </select>
                            </div>

                            {/* Question 3 */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">
                                    3. ¿Cuál es el objetivo del post?
                                </label>
                                <select 
                                    value={formData.goal}
                                    onChange={(e) => setFormData({...formData, goal: e.target.value})}
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white font-['Poppins'] focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                >
                                    <option>Inspirar y Viralizar</option>
                                    <option>Promocionar nueva canción</option>
                                    <option>Generar controversia positiva</option>
                                    <option>Compartir testimonio personal</option>
                                </select>
                            </div>

                            {/* Question 4 */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">
                                    4. Tono del mensaje
                                </label>
                                <select 
                                    value={formData.tone}
                                    onChange={(e) => setFormData({...formData, tone: e.target.value})}
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white font-['Poppins'] focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                >
                                    <option>Épico y Motivador</option>
                                    <option>Reflexivo y Espiritual</option>
                                    <option>Directo y Agresivo (Gym-style)</option>
                                    <option>Cercano y Amigable</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !formData.input.trim()}
                            className="w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_30px_rgba(197,160,89,0.2)]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-4">
                                    <i className="fas fa-circle-notch animate-spin"></i>
                                    Diseñando Estrategia Maestra...
                                </span>
                            ) : (
                                'Generar Propuesta Viral'
                            )}
                        </button>

                        {error && (
                            <p className="mt-6 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                                <i className="fas fa-exclamation-triangle mr-2"></i> {error}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="bg-[#0f111a] border border-[#c5a059]/20 p-10 rounded-2xl shadow-2xl animate-fade-in-up relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">
                                Estrategia de Contenido Generada
                            </span>
                            <div className="flex gap-8">
                                <button 
                                    onClick={copyToClipboard}
                                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}
                                >
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                                <button 
                                    onClick={reset}
                                    className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                                >
                                    <i className="fas fa-redo"></i> Nueva Consulta
                                </button>
                            </div>
                        </div>
                        
                        <div className="text-white/90 font-['Poppins'] leading-relaxed whitespace-pre-wrap text-lg min-h-[300px]">
                            {result}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialPostGenerator;
