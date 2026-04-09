import React, { useState, useEffect } from 'react';

interface ReleaseData {
    Artista: string;
    name: string;        
    releaseDate: string; 
    preSaveLink?: string; 
    audioUrl?: string;    
    coverImageUrl?: string; 
}

const CountdownUnit: React.FC<{ targetDate: string, currentTime: Date }> = ({ targetDate, currentTime }) => {
    const target = new Date(targetDate + 'T00:00:00');
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
                const response = await fetch(`${googleScriptUrl}?read=true`);
                if (!response.ok) throw new Error('Fetch failed');
                const data = await response.json();
                
                const normalized = (data as any[]).map(r => {
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
                        coverImageUrl: findKey(['coverimageurl', 'coverimageur', 'imagen', 'portada'])
                    } as ReleaseData;
                });
                
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                const upcoming = normalized
                    .filter(r => r.releaseDate && new Date(r.releaseDate + 'T00:00:00') >= now)
                    .sort((a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime());
                
                setReleases(upcoming);
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
                        <h2 className="font-serif italic text-5xl md:text-7xl text-white">Próxima <span className="text-[#c5a059]">Artillería</span></h2>
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
                                        <a href={release.preSaveLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#1DB954] transition-all transform hover:scale-110">
                                            <i className="fab fa-spotify text-xl"></i> Pre-Save
                                        </a>
                                    )}
                                    {release.audioUrl && (
                                        <a href={release.audioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#ff0000] transition-all transform hover:scale-110">
                                            <i className="fab fa-youtube text-xl"></i> Reminder
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
