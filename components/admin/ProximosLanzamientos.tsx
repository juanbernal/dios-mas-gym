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
                
                // Normalización robusta
                const normalized = (data as any[]).map(r => {
                    const findKey = (keys: string[]) => {
                        const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
                        return k ? r[k] : '';
                    };
                    return {
                        Artista: findKey(['artista']),
                        name: findKey(['name', 'nombre', 'titulo', 'título']),
                        releaseDate: findKey(['releasedate', 'fecha']),
                        preSaveLink: findKey(['presavelink', 'spotify', 'presave']),
                        audioUrl: findKey(['audiourl', 'youtube', 'audio']),
                        coverImageUr: findKey(['coverimageur', 'coverimageurl', 'imagen', 'portada'])
                    } as ReleaseData;
                });
                
                setCurrentReleases(normalized);
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const params = new URLSearchParams();
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
                body: params.toString(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
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
            setStatus({ type: 'error', message: 'La sincronización se envió, pero el servidor tarda en responder. Verifica la lista en unos segundos.' });
            setTimeout(fetchCurrentReleases, 4000);
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
                    <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">Sincronización Crítica con Google Sheets</p>
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
                                    <input type="url" name="spotify" value={formData.spotify} onChange={handleChange} placeholder="https://distrokid.com/..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Portada Cover URL (Direct Link)</label>
                                    <input type="url" name="imagen" value={formData.imagen} onChange={handleChange} placeholder="https://i.ibb.co/..." className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white focus:border-[#c5a059] outline-none" />
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
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl h-full flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-8 flex items-center gap-4"><i className="fas fa-database"></i> Base de Datos</h3>
                            {loadingReleases ? (
                                <div className="py-20 text-center animate-pulse"><i className="fas fa-circle-notch animate-spin text-white/20 text-3xl"></i></div>
                            ) : (
                                <div className="space-y-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                                    {currentReleases.length === 0 ? (
                                        <p className="text-[10px] text-white/20 uppercase text-center py-10">Sin lanzamientos activos</p>
                                    ) : (
                                        currentReleases.map((rev, idx) => (
                                            <div key={idx} className="bg-black/40 border border-white/5 p-6 rounded-2xl hover:border-[#c5a059]/20 transition-all group">
                                                <div className="flex items-start gap-4 mb-4">
                                                    {rev.coverImageUr && (
                                                        <img src={rev.coverImageUr} alt="" className="w-12 h-12 rounded object-cover border border-white/10" />
                                                    )}
                                                    <div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] mb-1">{rev.Artista}</div>
                                                        <div className="text-sm font-bold text-white line-clamp-1">{rev.name}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-[9px] text-white/40 uppercase font-bold tracking-widest mb-4">
                                                    <div className="flex items-center gap-2"><i className="far fa-calendar text-[#c5a059]"></i> {rev.releaseDate}</div>
                                                </div>
                                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                                    {rev.preSaveLink && <a href={rev.preSaveLink} target="_blank" rel="noreferrer" className="text-white/20 hover:text-[#1DB954] transition-colors"><i className="fab fa-spotify text-base"></i></a>}
                                                    {rev.audioUrl && <a href={rev.audioUrl} target="_blank" rel="noreferrer" className="text-white/20 hover:text-[#ff0000] transition-colors"><i className="fab fa-youtube text-base"></i></a>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(197, 160, 89, 0.4); }
            `}</style>
        </div>
    );
};

export default ProximosLanzamientos;
