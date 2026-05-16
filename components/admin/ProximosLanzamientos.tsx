import React, { useState, useEffect, useCallback } from 'react';
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

// ─── Push Notification Helpers ────────────────────────────────────────────────
const NOTIF_PREFS_KEY = 'dg_release_notif_prefs'; // { [releaseName]: boolean }

const getNotifPrefs = (): Record<string, boolean> => {
    try { return JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || '{}'); } catch { return {}; }
};
const setNotifPref = (name: string, enabled: boolean) => {
    const prefs = getNotifPrefs();
    prefs[name] = enabled;
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
};
const FIRED_KEY = 'dg_release_notif_fired'; // { [releaseName-date]: true }
const wasFired = (key: string) => localStorage.getItem(`${FIRED_KEY}_${key}`) === 'true';
const markFired = (key: string) => localStorage.setItem(`${FIRED_KEY}_${key}`, 'true');

async function requestNotifPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

async function sendReleaseNotif(release: ReleaseData) {
    const granted = await requestNotifPermission();
    if (!granted) return;
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
        reg.active?.postMessage({
            type: 'SHOW_RELEASE_NOTIFICATION',
            title: `🎵 ¡Hoy sale! ${release.name}`,
            body: `${release.Artista} acaba de lanzar su nueva canción. ¡Es el momento de hacer ruido!`,
            cover: release.coverImageUrl || '',
            url: release.preSaveLink || '/admin/proximos-lanzamientos',
        });
    } else {
        // Fallback: direct Notification API
        new Notification(`🎵 ¡Hoy sale! ${release.name}`, {
            body: `${release.Artista} — ¡Es el momento de hacer ruido!`,
            icon: '/icon-192.png',
        });
    }
}

const ProximosLanzamientos: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
    const [currentReleases, setCurrentReleases] = useState<ReleaseData[]>([]);
    const [loadingReleases, setLoadingReleases] = useState(true);
    const [pendingSync, setPendingSync] = useState<ReleaseData[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [scanLog, setScanLog] = useState<{name: string, artist: string, found: boolean}[]>([]);
    const syncStartedRef = React.useRef(false);
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(getNotifPrefs);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );
    
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

    const checkCatalogSync = async (existing: ReleaseData[], force = false) => {
        if (syncStartedRef.current && !force) return;
        
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
                .replace(/^album/g, '') // Ignore album prefix for matching
                .replace(/[^a-z0-9]+/g, '')
                .trim();


            // Group songs by exact date OR cover: same date = same album → one entry
            const groupIntoAlbums = (songs: typeof dM): typeof dM => {
                const groupMap = new Map<string, typeof dM>();
                songs.forEach(song => {
                    // Precise ISO date is a strong grouping key
                    const key = song.date ? `date-${song.date}` : (song.cover && song.cover.trim() ? song.cover.trim() : `single-${song.id}`);
                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(song);
                });
                const result: typeof dM = [];
                groupMap.forEach((group) => {
                    if (group.length === 1) {
                        result.push(group[0]);
                    } else {
                        const sorted = [...group].sort((a, b) => a.name.length - b.name.length);
                        const rep = { ...sorted[0] };
                        rep.name = rep.name.replace(/\s*\(feat\..*?\)/gi, '').trim();
                        // If it's a significant group, mark as album
                        if (group.length >= 3) {
                            rep.name = `Álbum: ${rep.name}`;
                        }
                        result.push(rep);
                    }
                });
                return result;
            };

            const latestCatalog = [
                ...groupIntoAlbums(dM.slice(0, 20)),
                ...groupIntoAlbums(j6.slice(0, 20))
            ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
            const logs: typeof scanLog = [];
            
            const missing = latestCatalog.filter((cat) => {
                const normCatName = normalize(cat.name);
                const normCatArtist = normalize(cat.artist);
                
                const isFound = existing.some(ex => {
                    const normExName = normalize(ex.name || '');
                    const normExArtist = normalize(ex.Artista || '');
                    return normExName === normCatName && (normExArtist.includes(normCatArtist) || normCatArtist.includes(normExArtist));
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
                preSaveLink: `https://app.diosmasgym.com/#/link/${cat.id}`,
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
            } else if (force) {
                setStatus({ type: 'success', message: 'El catálogo ya está 100% sincronizado.' });
            }
        } catch (e) {
            console.error("Error checking catalog sync:", e);
        }
    };

    const fetchCurrentReleases = async (force = false) => {
        setLoadingReleases(true);
        setStatus({ type: 'idle' });
        try {
            const response = await fetch(`/api/sheet-proxy?read=true&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const normalized = (data as any[]).map(r => {
                    const findKey = (keys: string[]) => {
                        const k = Object.keys(r).find(key => keys.includes(key.replace(/\s+/g, '').trim().toLowerCase()));
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
                checkCatalogSync(normalized, force);
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

    const checkTodaysReleases = useCallback((releases: ReleaseData[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        releases.forEach(r => {
            const key = `${r.name}-${r.releaseDate}`;
            const prefs = getNotifPrefs();
            if (r.releaseDate === todayStr && prefs[r.name] !== false && !wasFired(key)) {
                markFired(key);
                sendReleaseNotif(r);
            }
        });
    }, []);

    useEffect(() => {
        if (currentReleases.length > 0) checkTodaysReleases(currentReleases);
        const interval = setInterval(() => {
            fetchCurrentReleases().then(() => checkTodaysReleases(currentReleases));
        }, 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [currentReleases, checkTodaysReleases]);

    const toggleNotif = async (releaseName: string, current: boolean) => {
        if (!current && notifPermission !== 'granted') {
            const granted = await requestNotifPermission();
            setNotifPermission(granted ? 'granted' : 'denied');
            if (!granted) return;
        }
        const next = !current;
        setNotifPref(releaseName, next);
        setNotifPrefs(prev => ({ ...prev, [releaseName]: next }));
    };

    const handleRequestPermission = async () => {
        const granted = await requestNotifPermission();
        setNotifPermission(granted ? 'granted' : 'denied');
    };

    const handleAutoSync = async (itemsToSync?: ReleaseData[]) => {
        const items = itemsToSync || pendingSync;
        if (items.length === 0) return;
        setIsSyncing(true);
        const failed: ReleaseData[] = [];
        for (let i = 0; i < items.length; i++) {
            const release = items[i];
            setStatus({ type: 'loading', message: `${i+1} de ${items.length}: ${release.name}` });
            try {
                const payload = {
                    Artista: release.Artista,
                    name: release.name,
                    releaseDate: release.releaseDate,
                    preSaveLink: release.preSaveLink || '',
                    audioUrl: release.audioUrl || '',
                    coverImageUrl: release.coverImageUrl || ''
                };
                const queryString = new URLSearchParams(payload as any).toString();
                const res = await fetch(`/api/sheet-proxy?${queryString}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                await new Promise(r => setTimeout(r, 1200));
            } catch (e) {
                failed.push(release);
                console.error("Error syncing item:", release.name, e);
            }
        }
        setIsSyncing(false);
        syncStartedRef.current = false; // Allow next auto-sync attempt if needed
        if (failed.length === 0) {
            setPendingSync([]);
            setStatus({ type: 'success', message: `¡${items.length} canciones sincronizadas correctamente!` });
        } else {
            setPendingSync(failed);
            setStatus({ type: 'error', message: `${failed.length} de ${items.length} canciones no se pudieron sincronizar.` });
        }
        setTimeout(fetchCurrentReleases, 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ type: 'loading' });
        try {
            const payload = {
                Artista: formData.artista,
                name: formData.titulo,
                releaseDate: formData.fecha,
                preSaveLink: formData.spotify,
                audioUrl: formData.youtube,
                coverImageUrl: formData.imagen
            };
            const queryString = new URLSearchParams(payload as any).toString();
            await fetch(`/api/sheet-proxy?${queryString}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setStatus({ type: 'success', message: '¡Lanzamiento sincronizado con éxito!' });
            setFormData({ artista: 'Diosmasgym', titulo: '', fecha: '', spotify: '', youtube: '', apple: '', imagen: '' });
            setTimeout(() => { setStatus({ type: 'idle' }); fetchCurrentReleases(); }, 3000);
        } catch (error) {
            setStatus({ type: 'error', message: 'Error en la sincronización.' });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8 font-['Poppins']">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/admin')} className="mb-12 text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] hover:text-white transition-all flex items-center gap-4 group">
                    <i className="fas fa-arrow-left group-hover:-translate-x-2 transition-all"></i> Volver al Panel
                </button>

                {notifPermission === 'default' && (
                    <div className="mb-8 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-2xl p-5 flex items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <i className="fas fa-bell text-[#c5a059] text-xl"></i>
                            <div>
                                <p className="text-white font-bold text-sm">Activar Notificaciones</p>
                                <p className="text-white/40 text-[10px] uppercase tracking-widest">Recibe una alerta el día de cada estreno.</p>
                            </div>
                        </div>
                        <button onClick={handleRequestPermission} className="px-6 py-3 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-white transition-all shrink-0">
                            Activar
                        </button>
                    </div>
                )}

                <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <h1 className="font-serif italic text-6xl md:text-8xl text-white mb-6">Próximos <br /><span className="text-[#c5a059]">Lanzamientos</span> <span className="text-[10px] font-black tracking-widest text-white/20 not-italic">v4.5</span></h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">Sincronización Crítica</p>
                    </div>
                    <button onClick={() => fetchCurrentReleases(true)} disabled={loadingReleases || isSyncing} className="px-8 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all rounded-full disabled:opacity-30">
                        <i className={`fas fa-sync-alt mr-3 ${loadingReleases ? 'animate-spin' : ''}`}></i> Rastrear de nuevo
                    </button>
                </div>

                {(pendingSync.length > 0 || isSyncing) && (
                    <div className="mb-12 bg-[#c5a059]/10 border border-[#c5a059]/30 p-8 rounded-3xl animate-fade-in">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center text-black shrink-0">
                                    <i className={`fas ${isSyncing ? 'fa-circle-notch animate-spin' : (status.type === 'error' ? 'fa-exclamation-triangle' : 'fa-magic')} text-xl`}></i>
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg">
                                        {isSyncing ? 'Sincronizando...' : (status.type === 'error' ? 'Error al sincronizar' : 'Nueva música detectada')}
                                    </h4>
                                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                                        {isSyncing ? (status.message || 'Sincronizando...') : (status.type === 'error' ? status.message : `${pendingSync.length} canciones listas para sincronizar.`)}
                                    </p>
                                </div>
                            </div>
                            {!isSyncing && (
                                <button onClick={() => handleAutoSync()} className="px-10 py-4 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all rounded-full min-w-[250px] shrink-0">
                                    Sincronizar Todo Ahora
                                </button>
                            )}
                        </div>
                        {!isSyncing && pendingSync.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-[#c5a059]/20">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c5a059] mb-4">
                                    <i className="fas fa-list mr-2"></i>
                                    Canciones detectadas ({pendingSync.length})
                                </p>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {pendingSync.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm bg-black/20 px-4 py-2.5 rounded-xl">
                                            <span className="text-white/30 font-mono text-xs w-5 text-right shrink-0">{i + 1}.</span>
                                            <span className="text-[#c5a059] font-bold shrink-0">{item.Artista}</span>
                                            <span className="text-white/30 shrink-0">—</span>
                                            <span className="text-white/90 truncate">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                        <div className="bg-[#0f111a] border border-white/5 p-8 md:p-16 rounded-3xl shadow-2xl">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Artista Principal</label>
                                    <select name="artista" value={formData.artista} onChange={handleChange} className="w-full bg-black/40 border-b border-white/10 py-4 text-xl text-white outline-none appearance-none cursor-pointer">
                                        <option value="Diosmasgym">Diosmasgym</option>
                                        <option value="Juan 614">Juan 614</option>
                                        <option value="Otro / Colaboración">Otro / Colaboración</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Título del Lanzamiento</label>
                                    <input required type="text" name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Nombre..." className="w-full bg-transparent border-b border-white/10 py-4 text-xl text-white outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Fecha de Estreno</label>
                                    <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full bg-transparent border-b border-white/10 py-4 text-xl text-white outline-none [color-scheme:dark]" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">Spotify URL</label>
                                    <input type="url" name="spotify" value={formData.spotify} onChange={handleChange} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-4">YouTube URL</label>
                                    <input type="url" name="youtube" value={formData.youtube} onChange={handleChange} className="w-full bg-transparent border-b border-white/10 py-4 text-sm text-white outline-none" />
                                </div>
                                <div className="col-span-1 md:col-span-2 mt-12">
                                    <button disabled={status.type === 'loading'} type="submit" className="w-full py-8 text-[11px] font-black uppercase tracking-[0.5em] bg-[#c5a059] text-black hover:bg-white transition-all rounded-full">
                                        {status.type === 'loading' ? 'Sincronizando...' : 'Programar Lanzamiento'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl h-full flex flex-col">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-8"><i className="fas fa-database mr-2"></i> Base de Datos</h3>
                            {loadingReleases ? (
                                <div className="py-20 text-center animate-pulse"><i className="fas fa-circle-notch animate-spin text-white/20 text-3xl"></i></div>
                            ) : (
                                <div className="space-y-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                                    {currentReleases.length === 0 ? (
                                        <p className="text-[10px] text-white/20 uppercase text-center py-10">Sin lanzamientos activos</p>
                                    ) : (
                                        currentReleases.map((rev, idx) => {
                                            const isToday = rev.releaseDate === new Date().toISOString().split('T')[0];
                                            const notifOn = notifPrefs[rev.name] !== false;
                                            return (
                                                <div key={idx} className={`bg-black/40 border p-6 rounded-2xl transition-all ${isToday ? 'border-[#c5a059]/40 shadow-[0_0_20px_rgba(197,160,89,0.1)]' : 'border-white/5'}`}>
                                                    {isToday && <div className="text-[#c5a059] text-[9px] font-black uppercase mb-3 animate-pulse">¡Estreno HOY!</div>}
                                                    <div className="flex items-start gap-4 mb-4">
                                                        {rev.coverImageUrl && <img src={rev.coverImageUrl} className="w-12 h-12 rounded object-cover" />}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[8px] font-black uppercase text-[#c5a059]">{rev.Artista}</div>
                                                            <div className="text-sm font-bold text-white truncate">{rev.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                        <div className="flex gap-4">
                                                            {rev.preSaveLink && <a href={rev.preSaveLink} target="_blank" rel="noreferrer" className="text-white/20 hover:text-[#1DB954]"><i className="fab fa-spotify"></i></a>}
                                                        </div>
                                                        <button onClick={() => toggleNotif(rev.name, notifOn)} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border ${notifOn ? 'border-[#c5a059] text-[#c5a059]' : 'border-white/10 text-white/30'}`}>
                                                            {notifOn ? 'Notif. ON' : 'Notif. OFF'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(197, 160, 89, 0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ProximosLanzamientos;
