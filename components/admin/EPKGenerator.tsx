import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

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

    const [songs, setSongs] = useState<{title: string, streams: string, cover?: string}[]>([]);
    const [randomCover, setRandomCover] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Auto-Llenado basado en el artista seleccionado
    useEffect(() => {
        const loadArtistData = async () => {
            setIsLoadingData(true);
            
            // Textos automáticos
            if (artist === 'diosmasgym') {
                setBio('Diosmasgym Records es un proyecto urbano enfocado en disciplina, fe y transformación personal. A través de rap, trap y ritmos potentes, llevamos un mensaje directo sobre el crecimiento espiritual y físico.');
                setContact(prev => ({ ...prev, email: 'contacto@diosmasgym.com' }));
            } else {
                setBio('Juan 614 es un ministerio acústico y regional que busca volver a las raíces de la adoración pura. Con guitarras de madera, docerolas y letras sinceras, creamos un ambiente de paz y conexión espiritual profunda.');
                setContact(prev => ({ ...prev, email: 'booking@juan614.com' }));
            }

            try {
                // Sincronizar con catálogo real
                const catalog = await fetchMusicCatalog(artist);
                if (catalog.length > 0) {
                    // Tomar las 3 últimas (más recientes) o aleatorias
                    const top3 = catalog.slice(0, 3).map(song => ({
                        title: song.name,
                        streams: '10K+', // Stream estimado ya que no está en DB
                        cover: song.cover
                    }));
                    
                    // Si no tiene 3, rellenar
                    while (top3.length < 3) {
                        top3.push({ title: 'Próximo Lanzamiento', streams: '---' });
                    }
                    
                    setSongs(top3);

                    // Elegir una portada aleatoria del catálogo para el fondo
                    if (catalog.length > 0) {
                        const random = catalog[Math.floor(Math.random() * catalog.length)];
                        setRandomCover(random.cover);
                    }

                    // Auto-generar métricas basadas en el tamaño del catálogo
                    const numSongs = catalog.length;
                    setStats({
                        spotify: `${Math.round(numSongs * 15.5 + 50)}K+`,
                        youtube: `${Math.round(numSongs * 28.2 + 100)}K+`,
                        instagram: `${Math.round(numSongs * 8.5 + 20)}K+`,
                        tiktok: `${Math.round(numSongs * 25.8 + 80)}K+`
                    });
                } else {
                    setSongs([
                        { title: 'El Comienzo', streams: '100K' },
                        { title: 'Fe Intacta', streams: '85K' },
                        { title: 'Disciplina', streams: '50K' }
                    ]);
                    setRandomCover(isJuan ? "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" : "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600");
                    
                    setStats({
                        spotify: '10K+',
                        youtube: '50K+',
                        instagram: '12K+',
                        tiktok: '25K+'
                    });
                }
            } catch (err) {
                console.error("Error auto-filling EPK data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadArtistData();
    }, [artist, isJuan]);

    const handleExportPDF = async () => {
        const element = document.getElementById('epk-document');
        if (!element) return;

        try {
            setIsExporting(true);
            
            const canvas = await html2canvas(element, {
                scale: 2, // Alta resolución
                useCORS: true,
                allowTaint: true,
                backgroundColor: artist === 'juan614' ? '#FAF9F6' : '#05070a'
            });

            // Dimensiones formato A4
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`EPK_${artist.toUpperCase()}_${new Date().getFullYear()}.pdf`);
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert("Hubo un error al generar el PDF. Esto suele deberse a configuraciones de CORS o red.");
        } finally {
            setIsExporting(false);
        }
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
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">EPK <span className="text-[#c5a059]">Generator</span> <span className="text-white/20 ml-2">v1.4</span></h1>
                </div>
                    <button onClick={handleExportPDF} disabled={isExporting || isLoadingData} className={`bg-[#c5a059] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}>
                        <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'} mr-2`}></i> 
                        {isExporting ? 'Exportando...' : 'Descargar PDF'}
                    </button>
                </div>

                <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Panel de Edición Automático */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <h2 className="text-[#c5a059] text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <i className="fas fa-robot text-sm"></i> Generación Automática
                            </h2>
                            
                            <p className="text-[10px] text-white/50 mb-6 leading-relaxed">
                                El sistema construirá el Press Kit completo obteniendo directamente de la base de datos la biografía, canciones recientes y generando proyecciones de streaming estimadas. No necesitas llenar nada a mano.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-white/50 uppercase tracking-widest mb-2 block font-bold">Selecciona el Artista</label>
                                    <div className="relative">
                                        <select 
                                            value={artist} 
                                            onChange={(e) => setArtist(e.target.value as any)}
                                            className="w-full bg-black/80 border border-[#c5a059]/30 rounded-xl p-4 outline-none text-sm focus:border-[#c5a059] appearance-none font-bold tracking-widest uppercase cursor-pointer transition-colors hover:bg-black"
                                        >
                                            <option value="diosmasgym">Diosmasgym</option>
                                            <option value="juan614">Juan 614</option>
                                        </select>
                                        <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#c5a059] pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3 text-[#10b981] text-[10px] uppercase font-black tracking-widest">
                                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
                                    Sincronizado con Catálogo
                                </div>
                                <p className="text-white/30 text-[9px] mt-2 italic">
                                    {isLoadingData ? 'Obteniendo datos...' : `Última actualización: ${new Date().toLocaleDateString()}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Previsualización del PDF */}
                    <div className="lg:col-span-8 flex justify-center overflow-auto pb-20">
                        {/* scale wrapper for viewing convenience without affecting real export size */}
                        <div className="transform scale-[0.6] sm:scale-75 md:scale-90 lg:scale-100 origin-top">
                            <div id="epk-document" className="w-[794px] h-[1123px] shadow-2xl relative overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
                                {/* Diseño Interno del Documento (A4 Size: 210x297mm -> ~794x1123px a 96DPI) */}
                            
                            {/* Cabecera / Portada */}
                            <div className="h-[400px] relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 bg-black/50 z-10"></div>
                                <img 
                                    src={randomCover || (isJuan ? "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" : "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600")} 
                                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" 
                                    style={{ filter: isJuan ? 'sepia(30%) brightness(0.8)' : 'grayscale(100%) brightness(0.6)' }} 
                                    crossOrigin="anonymous"
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
        </div>
        </div>
    );
};

export default EPKGenerator;
