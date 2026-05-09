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
        const fetchReleases = async () => {
            try {
                // 1. Fetch Manual Releases (Google Script)
                const manualResponse = await fetch(`${googleScriptUrl}?read=true`);
                let manualData: ReleaseData[] = [];
                if (manualResponse.ok) {
                    const json = await manualResponse.json();
                    manualData = (json as any[]).map(r => {
                        const findKey = (keys: string[]) => {
                            const k = Object.keys(r).find(key => keys.includes(key.trim().toLowerCase()));
                            return k ? r[k] : undefined;
                        };
                        return {
                            Artista: findKey(['artista', 'artist']),
                            name: findKey(['name', 'nombre', 'titulo', 'título']),
                            releaseDate: findKey(['releasedate', 'fecha']),
                            preSaveLink: findKey(['presavelink', 'spotify', 'presave']),
                            audioUrl: findKey(['audiourl', 'youtube', 'audio']),
                            coverImageUrl: findKey(['coverimageurl', 'coverimageur', 'imagen', 'portada']),
                            isFromCatalog: false
                        } as ReleaseData;
                    });
                }

                // 2. Fetch Catalog Releases (Automated Detection)
                const [dM, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                
                const catalogItems = [...dM, ...j6];
                
                // Detection logic: 
                // - Future releases in catalog (if any)
                // - Recent releases (last 15 days)
                // - At least the newest 1 for each artist if nothing else found
                const now = new Date();
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(now.getDate() - 15);

                const catalogReleases: ReleaseData[] = catalogItems
                    .filter(item => {
                        const itemDate = new Date(item.date);
                        return itemDate >= fifteenDaysAgo || itemDate > now;
                    })
                    .map(item => ({
                        Artista: item.artist,
                        name: item.name,
                        releaseDate: item.date,
                        coverImageUrl: item.cover,
                        preSaveLink: `/#/link/${item.id}`, // Automated Smart Link
                        audioUrl: item.url,
                        id: item.id,
                        isFromCatalog: true
                    }));

                // Ensure we have at least one from each artist if they aren't already there
                ['Diosmasgym', 'Juan 614'].forEach(artistName => {
                    const artistKey = artistName.toLowerCase();
                    const alreadyPresent = [...manualData, ...catalogReleases].some(r => r.Artista.toLowerCase().includes(artistKey));
                    
                    if (!alreadyPresent) {
                        const latest = catalogItems.find(item => item.artist.toLowerCase().includes(artistKey));
                        if (latest) {
                            catalogReleases.push({
                                Artista: latest.artist,
                                name: latest.name,
                                releaseDate: latest.date,
                                coverImageUrl: latest.cover,
                                preSaveLink: `/#/link/${latest.id}`,
                                audioUrl: latest.url,
                                id: latest.id,
                                isFromCatalog: true
                            });
                        }
                    }
                });

                // 3. Merge and Sort
                const combined = [...manualData, ...catalogReleases];
                
                // Remove duplicates (by name/artist)
                const unique = combined.reduce((acc, current) => {
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

        fetchReleases();
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
        <section className="relative py-32 overflow-hidden bg-[#05070a] border-b border-white/5 font-['Poppins']">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#c5a059]/5 rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse"></div>
            
            <div className="section-container relative z-10">
                <div className="flex items-center justify-between mb-20">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="w-12 h-px bg-[#c5a059]"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">PRÓXIMOS ESTRENOS GLOBALES</span>
                        </div>
                        <h2 className="font-serif italic text-5xl md:text-7xl text-white">Próxima <span className="text-[#c5a059]">Artillería</span> <span className="text-[10px] font-black tracking-widest text-white/10 ml-4 not-italic">v2.4</span></h2>
                    </div>
                </div>

                <div className="space-y-32">
                    {releases.map((release, index) => (
                        <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16 md:gap-24 opacity-0 animate-fade-in-up`} style={{ animationDelay: `${index * 200}ms`, animationFillMode: 'forwards' }}>
                            <div className="flex-1 w-full max-w-xl">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-[#c5a059] to-transparent opacity-10 blur group-hover:opacity-30 transition duration-1000"></div>
                                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0a0c14] border border-white/5 shadow-2xl">
                                        <img 
                                            src={release.coverImageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'} 
                                            alt={release.name}
                                            className="w-full h-full object-cover grayscale opacity-40 transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent"></div>
                                        <div className="absolute bottom-0 left-0 right-0 p-8">
                                            <CountdownUnit targetDate={release.releaseDate} currentTime={currentTime} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-block py-2 px-6 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-8">
                                    {new Date(release.releaseDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>

                                <h3 className="font-serif italic text-5xl md:text-7xl text-white mb-6 leading-tight">
                                    {release.name}
                                </h3>
                                
                                <div className="text-xl md:text-2xl font-light text-white/40 mb-12 uppercase tracking-[0.3em]">
                                    {release.Artista}
                                </div>

                                <div className="grid grid-cols-3 md:grid-cols-5 gap-6 mb-16 p-6 border-y border-white/5 bg-white/low-opacity">
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
