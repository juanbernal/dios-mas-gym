import React, { useState, useEffect } from 'react';
import { LinkBioData } from '../types';

const LinkBioPublic: React.FC = () => {
    const [data, setData] = useState<LinkBioData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/links')
            .then(res => res.json())
            .then(json => {
                setData(json);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error loading bio links:", err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) return (
        <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#c5a059]/20 border-t-[#c5a059] rounded-full animate-spin"></div>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-[#05070a] text-white flex items-center justify-center p-8 text-center font-['Poppins']">
            <div>
                <i className="fas fa-exclamation-triangle text-[#c5a059] text-4xl mb-4"></i>
                <h1 className="text-xl font-bold mb-2">Página no disponible</h1>
                <p className="text-white/40 text-sm">Vuelve a intentarlo más tarde.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins'] relative overflow-x-hidden">
            {/* Background elements */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#c5a059]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-[480px] mx-auto px-6 py-16 relative z-10 flex flex-col items-center min-h-screen">
                {/* Profile Section */}
                <div className="w-24 h-24 rounded-full border-2 border-[#c5a059] p-1 mb-6 shadow-[0_0_30px_rgba(197,160,89,0.2)]">
                    <img src={data.profile.avatar} alt="Profile" className="w-full h-full object-cover rounded-full" />
                </div>
                
                <h1 className="text-2xl font-black mb-2 tracking-tight">{data.profile.name}</h1>
                <p className="text-sm text-white/60 mb-10 text-center leading-relaxed max-w-[300px]">
                    {data.profile.bio}
                </p>

                {/* Links Section */}
                <div className="w-full space-y-4 mb-16">
                    {data.links.filter(l => l.enabled).map(link => (
                        <a 
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                                w-full py-5 px-6 rounded-2xl flex items-center gap-4 transition-all duration-300 border backdrop-blur-md group
                                ${link.type === 'special' 
                                    ? 'bg-gradient-to-r from-[#c5a059] to-[#d6b06a] text-black border-[#c5a059] shadow-[0_10px_30px_rgba(197,160,89,0.3)] hover:scale-[1.03] scale-[1.01]' 
                                    : link.type === 'primary'
                                        ? 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20'
                                        : 'bg-transparent text-white/70 border-white/5 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${link.type === 'special' ? 'bg-black/10' : 'bg-white/5 group-hover:bg-[#c5a059]/10 transition-colors'}`}>
                                <i className={`${link.icon} ${link.type === 'special' ? 'text-black' : 'text-[#c5a059]'} text-lg`}></i>
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] flex-1 text-center pr-10 ${link.type === 'special' ? 'text-black' : 'text-white'}`}>
                                {link.title}
                            </span>
                        </a>
                    ))}
                </div>

                {/* Social Footer */}
                <div className="mt-auto flex gap-8 text-white/30 text-2xl mb-8">
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-instagram"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-spotify"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-youtube"></i></a>
                    <a href="#" className="hover:text-white transition-colors"><i className="fab fa-tiktok"></i></a>
                </div>

                <div className="text-[9px] font-black uppercase tracking-[0.6em] text-white/10 italic">
                    Dios Mas Gym Records
                </div>
            </div>
        </div>
    );
};

export default LinkBioPublic;
