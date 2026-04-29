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
                const fullCatalog = [...dM, ...j6].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setCatalog(fullCatalog);
            } catch (err: any) {
                console.error("Error loading catalog:", err);
                // Si falla el primero, probaremos mostrar el error en consola, pero no crashear
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, []);

    const [manualForm, setManualForm] = useState({
        title: '',
        artist: 'diosmasgym',
        coverUrl: '',
        targetUrl: ''
    });

    const handleCopyManualLink = () => {
        if (!manualForm.title || !manualForm.coverUrl) {
            alert("El título y la URL de la portada son obligatorios.");
            return;
        }
        
        const params = new URLSearchParams({
            title: manualForm.title,
            artist: manualForm.artist,
            cover: manualForm.coverUrl,
            url: manualForm.targetUrl
        });
        
        const url = `${window.location.origin}/#/link/custom?${params.toString()}`;
        navigator.clipboard.writeText(url)
            .then(() => alert(`¡Enlace manual copiado al portapapeles!\n${url}`))
            .catch(() => alert('Error al copiar el enlace'));
    };

    const handlePreviewManual = () => {
        if (!manualForm.title || !manualForm.coverUrl) {
            alert("El título y la URL de la portada son obligatorios.");
            return;
        }
        
        const params = new URLSearchParams({
            title: manualForm.title,
            artist: manualForm.artist,
            cover: manualForm.coverUrl,
            url: manualForm.targetUrl
        });
        
        window.open(`/#/link/custom?${params.toString()}`, '_blank');
    };

    const filteredCatalog = catalog.filter(song => 
        song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}/#/link/${id}`;
        navigator.clipboard.writeText(url)
            .then(() => alert(`¡Enlace copiado al portapapeles!\n${url}`))
            .catch(() => alert('Error al copiar el enlace'));
    };

    const handlePreview = (id: string) => {
        window.open(`/#/link/${id}`, '_blank');
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
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Smart <span className="text-[#c5a059]">Links</span> <span className="text-white/20 ml-2">v1.2</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-8 max-w-5xl mx-auto">
                <div className="mb-12 text-center">
                    <i className="fas fa-link text-6xl text-[#c5a059] mb-6"></i>
                    <h2 className="text-3xl font-serif italic mb-4">Generador de Enlaces Inteligentes</h2>
                    <p className="text-white/40 text-sm max-w-xl mx-auto">Selecciona una canción de tu catálogo para generar su "Smart Link" (Pre-save / Multi-plataforma). El diseño se adaptará automáticamente si es de Diosmasgym o Juan 614.</p>
                </div>

                {/* Sección Manual para Próximos Lanzamientos */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm mb-12">
                    <h3 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                        <i className="fas fa-plus-circle mr-2"></i> Link Manual (Próximos Lanzamientos)
                    </h3>
                    <p className="text-white/50 text-[10px] uppercase tracking-widest mb-6">Usa esto si la canción aún no está en el catálogo oficial.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Título de la Canción *</label>
                            <input 
                                type="text" 
                                value={manualForm.title}
                                onChange={e => setManualForm({...manualForm, title: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                                placeholder="Ej. El Comienzo"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Artista *</label>
                            <select 
                                value={manualForm.artist}
                                onChange={e => setManualForm({...manualForm, artist: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                            >
                                <option value="diosmasgym">Diosmasgym</option>
                                <option value="juan614">Juan 614</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">URL de la Portada (Imagen) *</label>
                            <input 
                                type="text" 
                                value={manualForm.coverUrl}
                                onChange={e => setManualForm({...manualForm, coverUrl: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">URL de Destino (Opcional)</label>
                            <input 
                                type="text" 
                                value={manualForm.targetUrl}
                                onChange={e => setManualForm({...manualForm, targetUrl: e.target.value})}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                                placeholder="Link de Pre-Save / Spotify..."
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={handlePreviewManual}
                            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 border border-white/20 rounded-xl transition-all"
                        >
                            <i className="fas fa-eye mr-2"></i> Previsualizar
                        </button>
                        <button 
                            onClick={handleCopyManualLink}
                            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-black bg-[#c5a059] hover:bg-white rounded-xl transition-all"
                        >
                            <i className="fas fa-copy mr-2"></i> Generar & Copiar Link
                        </button>
                    </div>
                </div>

                {/* Sección Catálogo */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm mb-12">
                    <h3 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
                        <i className="fas fa-database mr-2"></i> Desde el Catálogo Oficial
                    </h3>
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
