import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PushNotificationsAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [url, setUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingTest, setLoadingTest] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [subscribers, setSubscribers] = useState<number | null>(null);

    useEffect(() => {
        // Fetch stats
        fetch('/api/send-notification')
            .then(res => res.json())
            .then(data => {
                if (data.subscribers !== undefined) setSubscribers(data.subscribers);
            })
            .catch(err => console.error("Error fetching subscribers:", err));
    }, []);

    const sendPush = async (isTest: boolean) => {
        if (!title || !message) {
            setStatus({ type: 'error', msg: 'El título y el mensaje son obligatorios.' });
            return;
        }

        let testPlayerId = null;
        if (isTest) {
            testPlayerId = (window as any).OneSignal?.User?.PushSubscription?.id;
            if (!testPlayerId) {
                setStatus({ type: 'error', msg: 'No se pudo obtener tu ID de suscripción para la prueba. ¿Has aceptado las notificaciones en este dispositivo?' });
                return;
            }
        }

        isTest ? setLoadingTest(true) : setLoading(true);
        setStatus(null);

        try {
            const response = await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message, url, imageUrl, testPlayerId })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setStatus({ type: 'success', msg: isTest ? 'Prueba enviada exitosamente a tu dispositivo.' : 'Notificación enviada exitosamente a todos los usuarios.' });
                if (!isTest) {
                    setTitle('');
                    setMessage('');
                    setUrl('');
                    setImageUrl('');
                }
            } else {
                setStatus({ type: 'error', msg: data.error || 'Hubo un error al enviar la notificación.' });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: error.message || 'Error de conexión.' });
        } finally {
            isTest ? setLoadingTest(false) : setLoading(false);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        sendPush(false);
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 font-['Poppins']">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/admin')} className="mb-12 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                    <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Dashboard
                </button>
                <div className="mb-12">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.6em] text-[#c5a059] mb-4 flex items-center gap-4">
                        <span className="w-12 h-px bg-[#c5a059]/30"></span> Módulo de Comunicación
                    </h1>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h2 className="font-serif italic text-5xl md:text-7xl text-white leading-tight">
                                Push <span className="text-[#c5a059]">Notifications</span>
                            </h2>
                            <p className="text-white/40 mt-4 max-w-2xl text-sm leading-relaxed">
                                Envía alertas instantáneas a todos los usuarios que han instalado la aplicación o aceptado notificaciones en su navegador.
                            </p>
                        </div>
                        <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 px-6 py-4 rounded-2xl flex items-center gap-4 shrink-0">
                            <i className="fas fa-users text-[#c5a059] text-2xl"></i>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Audiencia Total</p>
                                <p className="text-2xl font-bold text-white">{subscribers !== null ? subscribers.toLocaleString() : '...'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Formulario */}
                    <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                        
                        <form onSubmit={handleSend} className="relative z-10 flex flex-col gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Título de la Notificación *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ej: 🚀 ¡Nuevo Lanzamiento!"
                                    maxLength={50}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors"
                                    required
                                />
                                <div className="text-right mt-1 text-[9px] text-white/30">{title.length}/50</div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Mensaje *</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Ej: Ya está disponible la nueva canción. ¡Ve a escucharla ahora!"
                                    maxLength={150}
                                    rows={3}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors resize-none"
                                    required
                                />
                                <div className="text-right mt-1 text-[9px] text-white/30">{message.length}/150</div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">URL de Destino (Opcional)</label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder="https://app.diosmasgym.com/..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors"
                                />
                                <p className="text-[9px] text-white/30 mt-2">A dónde irá el usuario cuando toque la notificación. Por defecto abre la app.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">URL de Imagen Grande (Opcional)</label>
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={e => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 transition-colors"
                                />
                                <p className="text-[9px] text-white/30 mt-2">Aparecerá como una imagen expandida en dispositivos que lo soporten (Android/Windows).</p>
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                                    <i className={`fas ${status.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                                    {status.msg}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => sendPush(true)}
                                    disabled={loadingTest || loading || !title || !message}
                                    className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${loadingTest || loading || !title || !message ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {loadingTest ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Probando...</>
                                    ) : (
                                        <><i className="fas fa-mobile-screen"></i> Enviar Prueba (A mí)</>
                                    )}
                                </button>
                                
                                <button
                                    type="submit"
                                    disabled={loading || loadingTest || !title || !message}
                                    className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all ${loading || loadingTest || !title || !message ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-[#c5a059] text-black hover:bg-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(197,160,89,0.3)]'}`}
                                >
                                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                                    ) : (
                                        <><i className="fas fa-paper-plane"></i> Lanzar a Todos</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Preview (Simulación de iOS/Android) */}
                    <div className="flex flex-col items-center justify-center relative">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-8 absolute top-0">Previsualización</p>
                        
                        <div className="w-[320px] bg-[#1a1b23] rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden relative mt-12">
                            {/* Status Bar Mock */}
                            <div className="bg-[#1a1b23] px-6 py-3 flex justify-between items-center text-[10px] text-white/50 border-b border-white/5">
                                <span>9:41</span>
                                <div className="flex gap-2">
                                    <i className="fas fa-signal"></i>
                                    <i className="fas fa-wifi"></i>
                                    <i className="fas fa-battery-full"></i>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-gradient-to-b from-[#1a1b23] to-black min-h-[400px]">
                                {/* Notification Bubble */}
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden mt-4 shadow-xl">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border-b border-white/5">
                                        <div className="w-4 h-4 rounded bg-[#c5a059] flex items-center justify-center">
                                            <i className="fas fa-crown text-[8px] text-black"></i>
                                        </div>
                                        <span className="text-[10px] text-white/60 uppercase tracking-widest font-black">Dios Mas Gym</span>
                                        <span className="text-[10px] text-white/30 ml-auto">ahora</span>
                                    </div>
                                    
                                    <div className="p-4 flex gap-4">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-white mb-1">{title || 'Título de Notificación'}</h4>
                                            <p className="text-xs text-white/70 leading-relaxed">{message || 'Aquí irá el mensaje que motivará a los usuarios a entrar a la aplicación.'}</p>
                                        </div>
                                    </div>
                                    
                                    {imageUrl && (
                                        <div className="w-full h-32 bg-black/50 border-t border-white/5">
                                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PushNotificationsAdmin;
