import React, { useState, useEffect } from 'react';
import { fetchMusicCatalog } from '../services/musicService';

interface ReleaseData {
    Artista: string;
    name: string;        
    releaseDate: string; 
    preSaveLink?: string; 
    audioUrl?: string;    
    coverImageUrl?: string; 
    id?: string;
    isFromCatalog?: boolean;
}

const CountdownUnit: React.FC<{ targetDate: string, currentTime: Date }> = ({ targetDate, currentTime }) => {
    const target = new Date(targetDate.includes('T') ? targetDate : targetDate + 'T00:00:00');
    const diff = target.getTime() - currentTime.getTime();
    
    if (diff <= 0) return (
        <div className="col-span-4 bg-[#c5a059]/20 backdrop-blur-md border border-[#c5a059]/30 p-4 rounded-xl text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059]">YA DISPONIBLE</span>
        </div>
    );

    const units = [
        { label: 'DÍAS', val: Math.floor(diff / (1000 * 60 * 60 * 24)) },
        { label: 'HORAS', val: Math.floor((diff / (1000 * 60 * 60)) % 24) },
        { label: 'MINUTOS', val: Math.floor((diff / 1000 / 60) % 60) },
        { label: 'SEGUNDOS', val: Math.floor((diff / 1000) % 60) }
    ];

    return (
        <div className="grid grid-cols-4 gap-4 text-center">
            {units.map((unit, i) => (
                <div key={i} className="bg-[#05070a]/60 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                    <div className="font-serif text-2xl md:text-4xl text-white font-black mb-1">{unit.val.toString().padStart(2, '0')}</div>
                    <div className="text-[7px] font-black uppercase tracking-[0.3em] text-[#c5a059]">{unit.label}</div>
                </div>
            ))}
        </div>
    );
};

const UpcomingReleases: React.FC = () => {
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

    useEffect(() => {
        const loadReleases = async () => {
            try {
                // Fetch del catálogo principal
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                
                let combinedCatalog = [...dM, ...j6];

                // Fetch de la hoja de Próximos Lanzamientos
                try {
                    const response = await fetch(`/api/sheet-proxy?read=true`);
                    if (response.ok) {
                        const data = await response.json();
                        const extraReleases = (data as any[]).map(r => {
                            const findKey = (keys: string[]) => {
                                const k = Object.keys(r).find(key => keys.includes(key.replace(/\s+/g, '').trim().toLowerCase()));
                                return k ? r[k] : '';
                            };

                            let rawDate = findKey(['releasedate', 'fecha']);
                            // Convert DD/MM/YYYY to YYYY-MM-DD if needed
                            if (rawDate && rawDate.includes('/') && !rawDate.includes('-')) {
                                const [d, m, y] = rawDate.split('/');
                                if (d && m && y) rawDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            }
                            return {
                                id: `prx-${r.rowId || Math.random().toString(36).substr(2, 9)}`,
                                artist: findKey(['artista']) || 'Desconocido',
                                name: findKey(['name', 'nombre', 'titulo', 'título']),
                                date: rawDate,
                                url: findKey(['audiourl', 'youtube', 'audio']),
                                cover: findKey(['coverimageurl', 'imagen', 'portada']),
                                type: 'Próximo Lanzamiento'
                            };
                        }).filter(r => r.name && r.date && !r.artist.toLowerCase().startsWith('config')); // Solo los que tengan nombre y fecha válidos y no sean config
                        
                        // Añadimos a la lista si no existen ya en el catálogo principal (por nombre y artista)
                        extraReleases.forEach(extra => {
                            const exists = combinedCatalog.some(c => 
                                c.name.toLowerCase() === extra.name.toLowerCase() && 
                                c.artist.toLowerCase() === extra.artist.toLowerCase()
                            );
                            if (!exists) {
                                combinedCatalog.push(extra);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error fetching future releases from sheet:", e);
                }

                // Filter for upcoming releases (date >= today OR up to 15 days ago for recent releases)
                const now = new Date();
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(now.getDate() - 15);

                // Group catalog items by Artist and Date to detect Albums/EPs
                // Lógica original: Todo lo que salga el mismo día del mismo artista se agrupa
                const groupedCatalog: { [key: string]: typeof combinedCatalog } = {};
                combinedCatalog.forEach(item => {
                    const key = `${item.artist}_${item.date}`;
                        
                    if (!groupedCatalog[key]) groupedCatalog[key] = [];
                    groupedCatalog[key].push(item);
                });

                const catalogReleases: ReleaseData[] = Object.values(groupedCatalog)
                    .filter(group => {
                        const itemDate = new Date(group[0].date);
                        return itemDate >= fifteenDaysAgo || itemDate > now;
                    })
                    .map(group => {
                        const isAlbum = group.length > 1 || group[0].type?.toLowerCase().includes('album');
                        const mainItem = group.find(i => i.type?.toLowerCase().includes('album')) || group[0];
                        
                        return {
                            Artista: mainItem.artist,
                            name: isAlbum ? `${mainItem.name} (LP / Álbum)` : mainItem.name,
                            releaseDate: mainItem.date,
                            coverImageUrl: mainItem.cover,
                            preSaveLink: `/link/${mainItem.id}`,
                            audioUrl: mainItem.url,
                            id: mainItem.id,
                            isFromCatalog: true
                        };
                    });

                // Ensure we have at least one from each artist if they aren't already there
                ['Diosmasgym', 'Juan 614'].forEach(artistName => {
                    const artistKey = artistName.toLowerCase();
                    const alreadyPresent = catalogReleases.some(r => r.Artista.toLowerCase().includes(artistKey));
                    
                    if (!alreadyPresent) {
                        const latest = combinedCatalog.find(item => item.artist.toLowerCase().includes(artistKey));
                        if (latest) {
                            catalogReleases.push({
                                Artista: latest.artist,
                                name: latest.name,
                                releaseDate: latest.date,
                                coverImageUrl: latest.cover,
                                preSaveLink: `/link/${latest.id}`,
                                audioUrl: latest.url,
                                id: latest.id,
                                isFromCatalog: true
                            });
                        }
                    }
                });

                // Remove duplicates (by name/artist)
                const unique = catalogReleases.reduce((acc, current) => {
                    const x = acc.find(item => item.name === current.name && item.Artista === current.Artista);
                    if (!x) return acc.concat([current]);
                    else return acc;
                }, [] as ReleaseData[]);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const sorted = unique.sort((a, b) => {
                    const dateA = new Date(a.releaseDate);
                    const dateB = new Date(b.releaseDate);
                    
                    // Future dates first
                    const isFutureA = dateA >= today;
                    const isFutureB = dateB >= today;
                    
                    if (isFutureA && !isFutureB) return -1;
                    if (!isFutureA && isFutureB) return 1;
                    
                    // Then newest first
                    return dateB.getTime() - dateA.getTime();
                });

                setReleases(sorted.slice(0, 4)); // Show top 4
            } catch (error) {
                console.error("Error fetching upcoming releases:", error);
            } finally {
                setLoading(false);
            }
        };

        loadReleases();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading || releases.length === 0) return null;

    const timeZones = [
        { city: 'MEX', time: '00:00' },
        { city: 'COL', time: '01:00' },
        { city: 'ARG', time: '03:00' },
        { city: 'ESP', time: '07:00' },
        { city: 'USA (EST)', time: '01:00' }
    ];

    return (
        <section className="relative py-32 md:py-48 overflow-hidden bg-[#05070a] border-b border-white/5 font-['Poppins']">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-[#c5a059]/10 to-transparent rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#c5a059]/5 to-transparent rounded-full blur-[100px] -ml-64 -mb-64"></div>
            
            <div className="section-container relative z-10 max-w-7xl mx-auto px-6">
                <div className="text-center mb-24 md:mb-32">
                    <div className="inline-flex items-center gap-4 mb-6 px-8 py-3 rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 backdrop-blur-md shadow-[0_0_30px_rgba(197,160,89,0.15)]">
                        <i className="fas fa-satellite-dish text-[#c5a059] animate-ping"></i>
                        <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.5em] text-[#c5a059]">Próximos Estrenos Globales</span>
                    </div>
                    <h2 className="font-serif italic text-6xl md:text-8xl text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                        Próxima <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] via-yellow-400 to-[#c5a059] animate-gradient-x">Artillería</span>
                    </h2>
                    <div className="mt-8 flex justify-center items-center gap-4 text-white/30 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black">
                        <span className="w-16 h-px bg-white/20"></span>
                        Radar de Inteligencia Activado
                        <span className="w-16 h-px bg-white/20"></span>
                    </div>
                </div>

                <div className="space-y-32">
                    {releases.map((release, index) => (
                        <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16 md:gap-24 opacity-0 animate-fade-in-up`} style={{ animationDelay: `${index * 200}ms`, animationFillMode: 'forwards' }}>
                            <div className="flex-1 w-full max-w-xl">
                                <div className="relative group perspective-1000">
                                    <div className="absolute -inset-2 bg-gradient-to-r from-[#c5a059] to-transparent opacity-20 blur-xl group-hover:opacity-40 transition duration-1000 rounded-3xl"></div>
                                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-[#0a0c14] border border-[#c5a059]/20 shadow-[0_30px_60px_rgba(0,0,0,0.6)] transform group-hover:-translate-y-4 group-hover:rotate-x-12 transition-all duration-700">
                                        <img 
                                            src={release.coverImageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'} 
                                            alt={release.name}
                                            className="w-full h-full object-cover grayscale opacity-50 transition-all duration-1000 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/50 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                                            <CountdownUnit targetDate={release.releaseDate} currentTime={currentTime} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-block py-3 px-8 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-8 shadow-[0_0_20px_rgba(197,160,89,0.1)]">
                                    {new Date(release.releaseDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>

                                <h3 className="font-serif italic text-6xl md:text-8xl text-white mb-6 leading-tight drop-shadow-xl">
                                    {release.name}
                                </h3>
                                
                                <div className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30 mb-12 uppercase tracking-[0.4em]">
                                    {release.Artista}
                                </div>

                                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 mb-16 p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                    {timeZones.map((tz, i) => (
                                        <div key={i} className="text-center">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] mb-1">{tz.city}</div>
                                            <div className="text-sm font-bold text-white/60">{tz.time}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap justify-center lg:justify-start gap-10">
                                    {release.preSaveLink && (
                                        <a href={release.preSaveLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#c5a059] transition-all transform hover:scale-110">
                                            <i className={`${release.preSaveLink.includes('spotify') ? 'fab fa-spotify' : 'fas fa-link'} text-xl`}></i> 
                                            {new Date(release.releaseDate + 'T00:00:00') > currentTime ? 'Pre-Save' : 'Escuchar / Smart Link'}
                                        </a>
                                    )}
                                    {release.audioUrl && (
                                        <a href={release.audioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#ff0000] transition-all transform hover:scale-110">
                                            <i className="fab fa-youtube text-xl"></i> 
                                            {new Date(release.releaseDate + 'T00:00:00') > currentTime ? 'Reminder' : 'Video'}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
            `}</style>
        </section>
    );
};

export default UpcomingReleases;
