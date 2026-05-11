import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';

interface ReleaseData {
    Artista: string;
    name: string;
    releaseDate: string;
    preSaveLink?: string;
    audioUrl?: string;
    coverImageUrl?: string;
}

const ProximosLanzamientos: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
    const [currentReleases, setCurrentReleases] = useState<ReleaseData[]>([]);
    const [loadingReleases, setLoadingReleases] = useState(true);
    const [pendingSync, setPendingSync] = useState<ReleaseData[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [forceScan, setForceScan] = useState(false);
    const [scanLog, setScanLog] = useState<{name: string, artist: string, found: boolean}[]>([]);
    const syncStartedRef = React.useRef(false);
    
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

    const checkCatalogSync = async (existing: ReleaseData[]) => {
        if (syncStartedRef.current && !forceScan) return;
        
        try {
            const [dM, j6] = await Promise.all([
                fetchMusicCatalog('diosmasgym', true),
                fetchMusicCatalog('juan614', true)
            ]);
            
            const normalize = (s: string) => s.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\(feat\..*?\)/g, '')
                .replace(/\(ft\..*?\)/g, '')
                .replace(/[^a-z0-9]+/g, '')
                .trim();


            // Extract YouTube video ID from cover URL to detect albums
            const getCoverId = (cover: string): string => {
                if (!cover) return '';
                const match = cover.match(/\/vi\/([^/]+)\//);
                return match ? match[1] : '';
            };

            // Group songs by cover: same thumbnail = same album → one entry
            const groupIntoAlbums = (songs: typeof dM): typeof dM => {
                const coverMap = new Map<string, typeof dM>();
                songs.forEach(song => {
                    const key = getCoverId(song.cover) || `single-${song.id}`;
                    if (!coverMap.has(key)) coverMap.set(key, []);
                    coverMap.get(key)!.push(song);
                });
                const result: typeof dM = [];
                coverMap.forEach((group) => {
                    if (group.length === 1) {
                        result.push(group[0]);
                    } else {
                        const sorted = [...group].sort((a, b) => a.name.length - b.name.length);
                        const rep = { ...sorted[0] };
                        rep.name = rep.name.replace(/\s*\(feat\..*?\)/gi, '').trim();
                        result.push(rep);
                    }
                });
                return result;
            };

            const latestCatalog = [
                ...groupIntoAlbums(dM.slice(0, 20)),
                ...groupIntoAlbums(j6.slice(0, 20))
            ];
            const logs: typeof scanLog = [];
            
            const missing = latestCatalog.filter((cat) => {
                const normCatName = normalize(cat.name);
                const normCatArtist = normalize(cat.artist);
                
                const isFound = existing.some(ex => {
                    const normExName = normalize(ex.name || '');
                    const normExArtist = normalize(ex.Artista || '');
                    const isNameMatch = normExName === normCatName;
                    
                    const isArtistMatch = normExArtist.includes(normCatArtist) || normCatArtist.includes(normExArtist);
                    return isArtistMatch && isNameMatch;
                });
                
                const isDM = cat.artist.toLowerCase().includes('diosmasgym');
                const isJ6 = cat.artist.toLowerCase().includes('juan');
                
                const dMLogsCount = logs.filter(l => l.artist.toLowerCase().includes('diosmasgym')).length;
                const j6LogsCount = logs.filter(l => l.artist.toLowerCase().includes('juan')).length;

                if ((isDM && dMLogsCount < 10) || (isJ6 && j6LogsCount < 10)) {
                    logs.push({ name: cat.name, artist: cat.artist, found: isFound });
                }
                
                return !isFound;
            }).map(cat => ({
                Artista: cat.artist,
                name: cat.name,
                releaseDate: cat.date ? cat.date.split('T')[0] : new Date().toISOString().split('T')[0],
                preSaveLink: `https://musica.diosmasgym.com/#/link/${cat.id}`,
                audioUrl: cat.url,
                coverImageUrl: cat.cover
            }));

            setScanLog(logs);

            if (missing.length > 0) {
                setPendingSync(missing);
                if (!isSyncing && !syncStartedRef.current) {
                    syncStartedRef.current = true;
                    handleAutoSync(missing);
                }
            } else if (forceScan) {
                setStatus({ type: 'success', message: 'El catálogo ya está 100% sincronizado.' });
            }
            setForceScan(false);
        } catch (e) {
            console.error("Error checking catalog sync:", e);
        }
    };

    const fetchCurrentReleases = async () => {
        setLoadingReleases(true);
        try {
            const response = await fetch(`${googleScriptUrl}?read=true&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                
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
                        coverImageUrl: findKey(['coverimageurl', 'imagen', 'portada'])
                    } as ReleaseData;
                });
                
                setCurrentReleases(normalized);
                checkCatalogSync(normalized);
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

    const handleAutoSync = async (itemsToSync?: ReleaseData[]) => {
        const items = itemsToSync || pendingSync;
        if (items.length === 0) return;

        setIsSyncing(true);

        for (let i = 0; i < items.length; i++) {
            const release = items[i];
            setStatus({ 
                type: 'loading', 
                message: `Auto-Sync [${i+1}/${items.length}]: Sincronizando "${release.name}"...` 
            });

            try {
                const params = new URLSearchParams();
                params.append('Artista', release.Artista);
                params.append('name', release.name);
                params.append('releaseDate', release.releaseDate);
                params.append('preSaveLink', release.preSaveLink || '');
                params.append('audioUrl', release.audioUrl || '');
                params.append('coverImageUrl', release.coverImageUrl || '');

                await fetch(googleScriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString()
                });
                await new Promise(r => setTimeout(r, 1200)); 
            } catch (e) {
                console.error("Error syncing item:", e);
            }
        }

        setIsSyncing(false);
        setPendingSync([]);
        setStatus({ type: 'success', message: '¡Catálogo actualizado correctamente en Google Sheets!' });
        
        setTimeout(() => {
            fetchCurrentReleases();
        }, 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'loading' });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const params = new URLSearchParams();
            params.append('Artista', formData.artista);
            params.append('name', formData.titulo);
            params.append('releaseDate', formData.fecha);
            params.append('preSaveLink', formData.spotify);
            params.append('audioUrl', formData.youtube);
            params.append('coverImageUrl', formData.imagen);

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

                <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="font-serif italic text-6xl md:text-8xl text-white mb-6">Próximos <br /><span className="text-[#c5a059]">Lanzamientos</span> <span className="text-[10px] font-black tracking-widest text-white/20 not-italic">v3.8</span></h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">Sincronización Crítica con Google Sheets</p>
                    </div>
                    <button 
                        onClick={() => {
                            setForceScan(true);
                            fetchCurrentReleases();
                        }}
                        disabled={loadingReleases || isSyncing}
                        className="px-8 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all rounded-full disabled:opacity-30"
                    >
                        <i className={`fas fa-sync-alt mr-3 ${loadingReleases ? 'animate-spin' : ''}`}></i>
                        Rastrear de nuevo
                    </button>
                </div>

                {scanLog.length > 0 && (
                    <div className="mb-12 bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h4 className="text-[#c5a059] font-bold text-sm mb-4"><i className="fas fa-search mr-2"></i>Resultados del Escáner (Últimos 10 del Catálogo)</h4>
                        <div className="space-y-2">
                            {scanLog.map((log, i) => (
                                <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded">
                                    <span className="text-white/70">{log.name} <span className="text-white/30 text-[10px]">({log.artist})</span></span>
                                    {log.found ? (
                                        <span className="text-green-500 font-bold"><i className="fas fa-check mr-1"></i>Ya en Sheet</span>
                                    ) : (
                                        <span className="text-red-400 font-bold"><i className="fas fa-times mr-1"></i>Falta en Sheet</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pendingSync.length > 0 ? (
                    <div className="mb-12 bg-[#c5a059]/10 border border-[#c5a059]/30 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(197,160,89,0.4)]">
                                <i className="fas fa-magic text-xl"></i>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Se detectó nueva música en el catálogo</h4>
                                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Hay {pendingSync.length} canciones nuevas listas para sincronizar con la base de datos externa.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleAutoSync()} 
                            disabled={isSyncing}
                            className="px-10 py-4 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all rounded-full shadow-2xl disabled:opacity-50 min-w-[300px]"
                        >
                            {isSyncing ? (status.message || 'Sincronizando...') : 'Sincronizar Todo Ahora'}
                        </button>
                    </div>
                ) : (
                    !loadingReleases && (
                        <div className="mb-12 bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <i className="fas fa-check-circle text-green-500/50"></i>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Catálogo verificado: Todo está sincronizado con Google Sheets</span>
                            </div>
                            <button 
                                onClick={fetchCurrentReleases}
                                className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] hover:text-white transition-colors"
                            >
                                <i className="fas fa-sync-alt mr-2"></i> Rastrear de nuevo
                            </button>
                        </div>
                    )
                )}

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
                                                    {rev.coverImageUrl && (
                                                        <img src={rev.coverImageUrl} alt="" className="w-12 h-12 rounded object-cover border border-white/10" />
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
