import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EPKGenerator: React.FC = () => {
    const navigate = useNavigate();
    
    const [artist, setArtist] = useState<'diosmasgym' | 'juan614'>('diosmasgym');
    const [bio, setBio] = useState('Somos una disquera independiente enfocada en llevar un mensaje de fe, disciplina y motivación a través de ritmos urbanos y regionales. Creemos que la música es el mejor vehículo para transformar mentes y corazones.');
    
    const [stats, setStats] = useState({
        spotify: '10K+',
        youtube: '50K+',
        instagram: '12K+',
        tiktok: '25K+'
    });

    const [contact, setContact] = useState({
        email: 'contacto@diosmasgym.com',
        phone: '+52 1 614 123 4567',
        manager: 'Juan Bernal'
    });

    const [songs, setSongs] = useState([
        { title: 'El Comienzo', streams: '100K' },
        { title: 'Fe Intacta', streams: '85K' },
        { title: 'Disciplina', streams: '50K' }
    ]);

    const handlePrint = () => {
        window.print();
    };

    const isJuan = artist === 'juan614';

    const theme = {
        bg: isJuan ? '#FAF9F6' : '#05070a',
        text: isJuan ? '#2c2c2c' : '#ffffff',
        accent: isJuan ? '#8B5A2B' : '#c5a059',
        border: isJuan ? 'border-[#8B5A2B]/20' : 'border-[#c5a059]/20',
        card: isJuan ? 'bg-white shadow-xl' : 'bg-white/5 border border-white/10',
        font: isJuan ? 'font-serif' : 'font-sans uppercase tracking-widest'
    };

    return (
        <div className="min-h-screen bg-[#0a0f1d] text-white font-['Poppins'] print:bg-white print:text-black">
            {/* Controles de Administración (Ocultos en impresión) */}
            <div className="print:hidden">
                <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                    >
                        <i className="fas fa-chevron-left text-[8px]"></i>
                        Volver al Panel
                    </button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">EPK <span className="text-[#c5a059]">Generator</span></h1>
                    </div>
                    <button onClick={handlePrint} className="bg-[#c5a059] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all">
                        <i className="fas fa-file-pdf mr-2"></i> Exportar PDF
                    </button>
                </div>

                <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panel de Edición */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">1. Identidad</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Artista</label>
                                    <select 
                                        value={artist} 
                                        onChange={(e) => setArtist(e.target.value as any)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                                    >
                                        <option value="diosmasgym">Diosmasgym</option>
                                        <option value="juan614">Juan 614</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Biografía Corta</label>
                                    <textarea 
                                        rows={4} 
                                        value={bio} 
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-xs focus:border-[#c5a059]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">2. Métricas</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(stats).map(([key, val]) => (
                                    <div key={key}>
                                        <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block capitalize">{key}</label>
                                        <input 
                                            type="text" 
                                            value={val} 
                                            onChange={(e) => setStats({...stats, [key]: e.target.value})}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059] text-center"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 border-b border-white/10 pb-4">3. Contacto</h2>
                            <div className="space-y-4">
                                {Object.entries(contact).map(([key, val]) => (
                                    <div key={key}>
                                        <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block capitalize">{key}</label>
                                        <input 
                                            type="text" 
                                            value={val} 
                                            onChange={(e) => setContact({...contact, [key]: e.target.value})}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none text-sm focus:border-[#c5a059]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="text-center text-white/30 text-xs">
                            <i className="fas fa-info-circle mr-2"></i> Usa Ctrl+P o CMD+P si el botón falla. Asegúrate de activar "Gráficos de fondo" en la ventana de impresión.
                        </div>
                    </div>

                    {/* Previsualización del PDF */}
                    <div className="lg:col-span-8 flex justify-center overflow-auto pb-20">
                        <div id="epk-document" className="w-[800px] min-h-[1130px] shadow-2xl relative transition-all duration-500 overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
                            {/* Diseño Interno del Documento */}
                            
                            {/* Cabecera / Portada */}
                            <div className="h-[400px] relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-black/40 z-10"></div>
                                {/* Usando imágenes genéricas placeholder para el EPK. En el futuro se pueden conectar al storage. */}
                                <img 
                                    src={isJuan ? "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" : "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600"} 
                                    className="absolute inset-0 w-full h-full object-cover" 
                                    style={{ filter: isJuan ? 'sepia(30%)' : 'grayscale(100%)' }} 
                                    alt="Hero" 
                                />
                                
                                <div className="relative z-20 text-center px-12">
                                    <h3 className="text-white text-sm font-bold tracking-[0.5em] uppercase mb-4 opacity-80 border-b border-white/20 pb-2 inline-block">Electronic Press Kit</h3>
                                    <h1 className={`text-6xl md:text-8xl text-white ${isJuan ? "font-['Playfair_Display'] italic" : "font-['Bebas_Neue'] tracking-wider"} drop-shadow-2xl`}>
                                        {artist === 'diosmasgym' ? 'DIOSMASGYM' : 'JUAN 614'}
                                    </h1>
                                </div>
                            </div>

                            {/* Contenido Principal */}
                            <div className="p-12">
                                <div className="grid grid-cols-12 gap-12">
                                    {/* Izquierda: Bio y Canciones */}
                                    <div className="col-span-7 space-y-10">
                                        <section>
                                            <h2 className={`text-2xl mb-4 ${theme.font}`} style={{ color: theme.accent }}>Biografía</h2>
                                            <p className="text-sm leading-relaxed opacity-80" style={{ color: theme.text }}>{bio}</p>
                                        </section>

                                        <section>
                                            <h2 className={`text-2xl mb-6 ${theme.font}`} style={{ color: theme.accent }}>Top Canciones</h2>
                                            <div className="space-y-4">
                                                {songs.map((s, i) => (
                                                    <div key={i} className={`flex justify-between items-center p-4 rounded-xl ${theme.card}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: theme.accent, color: isJuan ? '#fff' : '#000' }}>{i + 1}</div>
                                                            <span className="font-bold">{s.title}</span>
                                                        </div>
                                                        <span className="text-xs font-bold opacity-50">{s.streams} Streams</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Derecha: Métricas y Contacto */}
                                    <div className="col-span-5 space-y-10">
                                        <section>
                                            <h2 className={`text-2xl mb-6 ${theme.font}`} style={{ color: theme.accent }}>Métricas Clave</h2>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className={`p-4 rounded-xl text-center ${theme.card}`}>
                                                    <i className="fab fa-spotify text-2xl mb-2" style={{ color: theme.accent }}></i>
                                                    <div className="text-xl font-bold">{stats.spotify}</div>
                                                    <div className="text-[9px] uppercase tracking-widest opacity-50">Oyentes</div>
                                                </div>
                                                <div className={`p-4 rounded-xl text-center ${theme.card}`}>
                                                    <i className="fab fa-youtube text-2xl mb-2" style={{ color: theme.accent }}></i>
                                                    <div className="text-xl font-bold">{stats.youtube}</div>
                                                    <div className="text-[9px] uppercase tracking-widest opacity-50">Views</div>
                                                </div>
                                                <div className={`p-4 rounded-xl text-center ${theme.card}`}>
                                                    <i className="fab fa-instagram text-2xl mb-2" style={{ color: theme.accent }}></i>
                                                    <div className="text-xl font-bold">{stats.instagram}</div>
                                                    <div className="text-[9px] uppercase tracking-widest opacity-50">Seguidores</div>
                                                </div>
                                                <div className={`p-4 rounded-xl text-center ${theme.card}`}>
                                                    <i className="fab fa-tiktok text-2xl mb-2" style={{ color: theme.accent }}></i>
                                                    <div className="text-xl font-bold">{stats.tiktok}</div>
                                                    <div className="text-[9px] uppercase tracking-widest opacity-50">Fans</div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className={`p-6 rounded-2xl ${theme.border} border-2`}>
                                            <h2 className={`text-xl mb-6 text-center ${theme.font}`} style={{ color: theme.accent }}>Contacto Oficial</h2>
                                            <div className="space-y-4 text-sm">
                                                <div className="flex items-center gap-4">
                                                    <i className="fas fa-envelope w-6 text-center opacity-50"></i>
                                                    <span>{contact.email}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <i className="fab fa-whatsapp w-6 text-center opacity-50"></i>
                                                    <span>{contact.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <i className="fas fa-user-tie w-6 text-center opacity-50"></i>
                                                    <span>{contact.manager} (Management)</span>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>

                            {/* Footer del PDF */}
                            <div className="absolute bottom-0 left-0 w-full p-8 text-center border-t opacity-30" style={{ borderColor: theme.accent }}>
                                <p className="text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} {artist === 'diosmasgym' ? 'Diosmasgym Records' : 'Juan 614 Music'}. Documento oficial para prensa.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VISTA EXCLUSIVA PARA IMPRESIÓN */}
            <div className="hidden print:block">
                {/* 
                    Aquí clonamos la estructura visual, pero sin contenedores con scroll.
                    Tailwind 'print:' maneja la visibilidad. 
                    El #epk-document ya tiene el tamaño de un A4/Carta (800x1130 aprox).
                    Cuando se hace window.print(), el navegador solo imprimirá lo que esté visible.
                    Para asegurar que el fondo se imprima, el navegador requiere que el usuario
                    marque la casilla "Imprimir gráficos de fondo".
                */}
            </div>
            
            {/* 
               Estilo global para la impresión. 
               Ocultamos TODO el body EXCEPTO el epk-document.
            */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    body * { visibility: hidden; }
                    #epk-document, #epk-document * { visibility: visible; }
                    #epk-document { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100% !important; 
                        height: 100% !important; 
                        box-shadow: none !important;
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                }
            `}} />
        </div>
    );
};

export default EPKGenerator;
