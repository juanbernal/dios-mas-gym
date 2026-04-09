import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ReleaseData {
    Artista: string;
    name: string;
    releaseDate: string;
    preSaveLink?: string;
    audioUrl?: string;
    coverImageUr?: string;
}

const ProximosLanzamientos: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
    const [currentReleases, setCurrentReleases] = useState<ReleaseData[]>([]);
    const [loadingReleases, setLoadingReleases] = useState(true);
    
    const [formData, setFormData] = useState({
        artista: 'Diosmasgym',
        titulo: '',
        fecha: '',
        spotify: '',
        youtube: '',
        apple: '',
        imagen: ''
    });

    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

    const fetchCurrentReleases = async () => {
        setLoadingReleases(true);
        try {
            const response = await fetch(`${googleScriptUrl}?read=true`);
            if (response.ok) {
                const data = await response.json();
                setCurrentReleases(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error fetching admin releases:", error);
        } finally {
            setLoadingReleases(false);
        }
    };

    useEffect(() => {
        fetchCurrentReleases();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'loading' });

        try {
            const params = new URLSearchParams();
            // Map keys to match the spreadsheet headers exactly as in the .gs script
            // MAPEO EXACTO SEGÚN TUS CABECERAS DE EXCEL:
            // name, releaseDate, coverImageUr, preSaveLink, audioUrl, Artista
            params.append('name', formData.titulo);
            params.append('releaseDate', formData.fecha);
            params.append('coverImageUr', formData.imagen);
            params.append('preSaveLink', formData.spotify);
            params.append('audioUrl', formData.youtube);
            params.append('Artista', formData.artista);

            await fetch(googleScriptUrl, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            setStatus({ type: 'success', message: '¡Lanzamiento sincronizado con éxito!' });
            setFormData({
                artista: 'Diosmasgym',
                titulo: '',
                fecha: '',
                spotify: '',
                youtube: '',
                apple: '',
                imagen: ''
            });
            
            setTimeout(() => {
                setStatus({ type: 'idle' });
                fetchCurrentReleases();
            }, 3000);

        } catch (error) {
            console.error('Error al enviar:', error);
            setStatus({ type: 'error', message: 'Error de conexión. Inténtalo de nuevo.' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8 font-['Poppins']">
            <div className="max-w-6xl mx-auto">
                <button 
                    onClick={() => navigate('/admin')}
                    className="mb-12 text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] hover:text-white transition-all flex items-center gap-4 group"
                >
                    <i className="fas fa-arrow-left group-hover:-translate-x-2 transition-all"></i>
                    Volver al Panel
                </button>

                <div className="mb-20">
                    <h1 className="font-serif italic text-6xl md:text-8xl text-white mb-6">Próximos <br /><span className="text-[#c5a059]">Lanzamientos</span></h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">Despliegue Estratégico de Artillería Musical</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                        <div className="bg-[#0f111a] border border-white/5 p-8 md:p-16 rounded-3xl shadow-2xl relative overflow-hidden">
                            <form onSubmit={handleSubmit} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Artista Principal</label>
                                    <select name="artista" value={formData.artista} onChange={handleChange} className="w-full bg-black/40 border-b border-white/10 py-4 text-xl text-white focus:border-[#c5a059] outline-none appearance-none cursor-pointer">
                                        <option value="Diosmasgym">Diosmasgym</option>
                                        <option value="Juan 614">Juan 614</option>
                                        <option value="Otro / Colaboración">Otro / Colaboración</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Título del Lanzamiento</label>
                                    <input required type="text" name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Nombre del single..." className="w-full bg-transparent border-b border-white/10 py-4 text-xl text-white focus:border-[#c5a059] outline-none placeholder:text-white/5" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Fecha de Estreno</label>
                                    <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full bg-transparent border-b border-white/10 py-4 text-xl text-white focus:border-[#c5a059] outline-none [color-scheme:dark]" />
                                </div>

                                <div className="col-span-1 md:col-span-2">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mt-10 mb-8 border-b border-white/5 pb-4">Recursos Multimedia</h3>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Spotify URL</label>
                                    <input type="url" name="spotify" value={formData.spotify} onChange={handleChange} placeholder="https://open.spotify.com/..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">YouTube URL</label>
                                    <input type="url" name="youtube" value={formData.youtube} onChange={handleChange} placeholder="https://youtube.com/..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Apple Music URL</label>
                                    <input type="url" name="apple" value={formData.apple} onChange={handleChange} placeholder="https://music.apple.com/..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Portada Cover URL</label>
                                    <input type="url" name="imagen" value={formData.imagen} onChange={handleChange} placeholder="https://..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
                                </div>

                                <div className="col-span-1 md:col-span-2 mt-12">
                                    <button disabled={status.type === 'loading'} type="submit" className={`w-full py-8 text-[11px] font-black uppercase tracking-[0.5em] transition-all relative overflow-hidden group ${status.type === 'loading' ? 'bg-white/10 text-white/40 cursor-wait' : 'bg-[#c5a059] text-black hover:bg-white hover:scale-[1.01]'}`}>
                                        {status.type === 'loading' ? 'Sincronizando...' : 'Programar Lanzamiento'}
                                    </button>
                                    {status.message && <div className={`mt-8 p-6 text-[10px] font-bold uppercase tracking-widest text-center ${status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{status.message}</div>}
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl h-full">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-8 flex items-center gap-4"><i className="fas fa-list-ul"></i> Base de Datos</h3>
                            {loadingReleases ? (
                                <div className="py-20 text-center animate-pulse"><i className="fas fa-circle-notch animate-spin text-white/20 text-3xl"></i></div>
                            ) : (
                                <div className="space-y-6">
                                    {currentReleases.length === 0 ? (
                                        <p className="text-[10px] text-white/20 uppercase text-center py-10">Sin lanzamientos activos o acceso denegado</p>
                                    ) : (
                                        currentReleases.map((rev, idx) => (
                                            <div key={idx} className="bg-black/40 border border-white/5 p-6 rounded-2xl hover:border-[#c5a059]/20 transition-all">
                                                <div className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] mb-2">{rev.Artista}</div>
                                                <div className="text-sm font-bold text-white mb-2">{rev.Titulo}</div>
                                                <div className="text-[10px] text-white/40">{rev.Fecha}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProximosLanzamientos;
