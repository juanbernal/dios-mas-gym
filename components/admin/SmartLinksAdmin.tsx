import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const SmartLinksAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                // Combinar y ordenar por fecha (asumiendo que date es YYYY-MM-DD o similar)
                const fullCatalog = [...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setCatalog(fullCatalog);
            } catch (err) {
                console.error("Error loading catalog:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, []);

    const filteredCatalog = catalog.filter(song => 
        song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}/link/${id}`;
        navigator.clipboard.writeText(url)
            .then(() => alert(`¡Enlace copiado al portapapeles!\n${url}`))
            .catch(() => alert('Error al copiar el enlace'));
    };

    const handlePreview = (id: string) => {
        window.open(`/link/${id}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Panel
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Smart <span className="text-[#c5a059]">Links</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-8 max-w-5xl mx-auto">
                <div className="mb-12 text-center">
                    <i className="fas fa-link text-6xl text-[#c5a059] mb-6"></i>
                    <h2 className="text-3xl font-serif italic mb-4">Generador de Enlaces Inteligentes</h2>
                    <p className="text-white/40 text-sm max-w-xl mx-auto">Selecciona una canción de tu catálogo para generar su "Smart Link" (Pre-save / Multi-plataforma). El diseño se adaptará automáticamente si es de Diosmasgym o Juan 614.</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm mb-12">
                    <div className="relative mb-8">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#c5a059]/40">
                            <i className="fas fa-search"></i>
                        </div>
                        <input 
                            type="text"
                            placeholder="Buscar canción o artista..."
                            className="w-full bg-black/40 border border-white/10 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059] text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 text-[#c5a059] animate-pulse">
                            <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
                            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Catálogo...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCatalog.map(song => (
                                <div key={song.id} className="bg-black/60 border border-white/5 rounded-xl overflow-hidden hover:border-[#c5a059]/30 transition-all group">
                                    <div className="flex items-center p-4 border-b border-white/5">
                                        <img src={song.cover} alt={song.name} className="w-16 h-16 rounded-lg object-cover mr-4" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate text-sm">{song.name}</h3>
                                            <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-wider truncate">{song.artist}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-white/5 bg-white/5">
                                        <button 
                                            onClick={() => handlePreview(song.id)}
                                            className="py-3 text-[9px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-eye"></i> Previsualizar
                                        </button>
                                        <button 
                                            onClick={() => handleCopyLink(song.id)}
                                            className="py-3 text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059]/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-copy"></i> Copiar Link
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredCatalog.length === 0 && (
                                <div className="col-span-full py-12 text-center text-white/30 text-sm">
                                    No se encontraron canciones que coincidan con la búsqueda.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartLinksAdmin;
