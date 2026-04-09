import React, { useState, useEffect, useMemo } from 'react';

interface ReleaseData {
    Artista: string;
    Titulo: string;
    Fecha: string; // yyyy-MM-dd
    Spotify?: string;
    YouTube?: string;
    Apple?: string;
    Imagen?: string;
}

const UpcomingReleases: React.FC = () => {
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';

    useEffect(() => {
        const fetchReleases = async () => {
            try {
                // Fetch using the new ?read=true parameter
                const response = await fetch(`${googleScriptUrl}?read=true`);
                if (!response.ok) throw new Error('Fetch failed');
                const data = await response.json();
                
                // Filter and sort releases (only future or today)
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                const upcoming = (data as ReleaseData[])
                    .filter(r => r.Fecha && new Date(r.Fecha + 'T00:00:00') >= now)
                    .sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());
                
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

    const nextRelease = releases[0];

    // Countdown logic
    const countdown = useMemo(() => {
        if (!nextRelease) return null;
        const target = new Date(nextRelease.Fecha + 'T00:00:00');
        const diff = target.getTime() - currentTime.getTime();

        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true };

        return {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / 1000 / 60) % 60),
            seconds: Math.floor((diff / 1000) % 60),
            finished: false
        };
    }, [nextRelease, currentTime]);

    if (loading || !nextRelease) return null; // Hide if no upcoming releases

    const timeZones = [
        { city: 'MEX', time: '00:00' },
        { city: 'COL', time: '01:00' },
        { city: 'ARG', time: '03:00' },
        { city: 'ESP', time: '07:00' },
        { city: 'USA (EST)', time: '01:00' }
    ];

    return (
        <section className="relative py-40 overflow-hidden bg-[#05070a] border-b border-white/5 font-['Poppins']">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#c5a059]/5 rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#c5a059]/5 rounded-full blur-[100px] -ml-72 -mb-72"></div>

            <div className="section-container relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-20">
                    
                    {/* Left Side: Visual & Countdown */}
                    <div className="flex-1 w-full max-w-2xl">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#c5a059] to-transparent opacity-20 blur group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#0a0c14] border border-white/5 shadow-2xl">
                                <img 
                                    src={nextRelease.Imagen || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2070&auto=format&fit=crop'} 
                                    alt={nextRelease.Titulo}
                                    className="w-full h-full object-cover grayscale opacity-50 transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-80"
                                />
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent"></div>
                                
                                {/* Countdown Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-12">
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        {[
                                            { label: 'DÍAS', val: countdown?.days },
                                            { label: 'HORAS', val: countdown?.hours },
                                            { label: 'MINUTOS', val: countdown?.minutes },
                                            { label: 'SEGUNDOS', val: countdown?.seconds }
                                        ].map((unit, i) => (
                                            <div key={i} className="bg-[#05070a]/60 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                                                <div className="font-serif text-3xl md:text-5xl text-white font-black mb-1">{unit.val?.toString().padStart(2, '0') || '00'}</div>
                                                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#c5a059]">{unit.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Info & Release Schedule */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
                            <span className="w-12 h-px bg-[#c5a059]"></span>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">PRÓXIMO ESTRENO GLOBAL</span>
                        </div>

                        <h2 className="font-serif italic text-6xl md:text-8xl text-white mb-8 leading-tight">
                            {nextRelease.Titulo}
                        </h2>
                        
                        <div className="text-2xl md:text-3xl font-light text-white/60 mb-12 uppercase tracking-[0.2em]">
                            {nextRelease.Artista} <span className="text-[#c5a059]/40 px-4">/</span> {new Date(nextRelease.Fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-16 px-4 py-8 border-y border-white/5">
                            {timeZones.map((tz, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] mb-2">{tz.city}</div>
                                    <div className="text-xl font-bold text-white transition-all hover:text-[#c5a059] cursor-default">{tz.time}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap justify-center lg:justify-start gap-10">
                            {nextRelease.Spotify && (
                                <a href={nextRelease.Spotify} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#1DB954] transition-all">
                                    <i className="fab fa-spotify text-xl"></i> Pre-Save
                                </a>
                            )}
                            {nextRelease.YouTube && (
                                <a href={nextRelease.YouTube} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#ff0000] transition-all">
                                    <i className="fab fa-youtube text-xl"></i> Reminder
                                </a>
                            )}
                            {nextRelease.Apple && (
                                <a href={nextRelease.Apple} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#fc3c44] transition-all">
                                    <i className="fab fa-apple text-xl"></i> Pre-Add
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Animated Bottom Border */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#c5a059]/20 to-transparent"></div>
        </section>
    );
};

export default UpcomingReleases;
