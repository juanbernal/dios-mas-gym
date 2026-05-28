import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';
import { jsPDF } from 'jspdf';

interface Collaborator {
    id: string;
    name: string;
    email: string;
    role: 'Compositor' | 'Productor' | 'Autor de Letras' | 'Intérprete' | 'Otro';
    pro: string; // ASCAP, BMI, SGAE, SACM, etc.
    ipi: string;  // IPI / CAE Number
    musicSplit: number;  // % of music composition
    lyricsSplit: number; // % of lyrics composition
    performanceSplit: number; // % of performance rights
}

const SplitSheetGenerator: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [songSearch, setSongSearch] = useState('');
    const [selectedSongId, setSelectedSongId] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Form states
    const [songTitle, setSongTitle] = useState('');
    const [artistName, setArtistName] = useState('');
    const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [genre, setGenre] = useState('Urbano Cristiano / Bélico');
    const [distributor, setDistributor] = useState('Dios Mas Gym Records');

    // Collaborators list state (starts with one default entry)
    const [collaborators, setCollaborators] = useState<Collaborator[]>([
        {
            id: 'col-1',
            name: '',
            email: '',
            role: 'Compositor',
            pro: 'BMI',
            ipi: '',
            musicSplit: 50,
            lyricsSplit: 50,
            performanceSplit: 50
        }
    ]);

    const VERSION = "v1.0.0 (jsPDF Powered)";

    useEffect(() => {
        const loadCatalog = async () => {
            setCatalogLoading(true);
            try {
                const [diosmasgym, juan614] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                setCatalog([...diosmasgym, ...juan614]);
            } catch (err) {
                console.error('Error loading catalog:', err);
            } finally {
                setCatalogLoading(false);
            }
        };
        loadCatalog();
    }, []);

    const handleSongSelect = (songId: string) => {
        setSelectedSongId(songId);
        if (!songId) {
            setSongTitle('');
            setArtistName('');
            return;
        }
        const song = catalog.find(item => item.id === songId);
        if (song) {
            setSongTitle(song.name);
            setArtistName(song.artist);
            if (song.date) setReleaseDate(song.date);
        }
    };

    const addCollaborator = () => {
        const newId = `col-${Date.now()}`;
        setCollaborators([
            ...collaborators,
            {
                id: newId,
                name: '',
                email: '',
                role: 'Compositor',
                pro: 'BMI',
                ipi: '',
                musicSplit: 0,
                lyricsSplit: 0,
                performanceSplit: 0
            }
        ]);
    };

    const removeCollaborator = (id: string) => {
        if (collaborators.length <= 1) return;
        setCollaborators(collaborators.filter(c => c.id !== id));
    };

    const updateCollaborator = (id: string, field: keyof Collaborator, value: any) => {
        setCollaborators(
            collaborators.map(c => {
                if (c.id === id) {
                    return { ...c, [field]: value };
                }
                return c;
            })
        );
    };

    // Calculate totals dynamically
    const musicTotal = collaborators.reduce((acc, curr) => acc + (Number(curr.musicSplit) || 0), 0);
    const lyricsTotal = collaborators.reduce((acc, curr) => acc + (Number(curr.lyricsSplit) || 0), 0);
    const performanceTotal = collaborators.reduce((acc, curr) => acc + (Number(curr.performanceSplit) || 0), 0);

    const isValidationOk = musicTotal === 100 && lyricsTotal === 100 && performanceTotal === 100;

    const generatePDF = async () => {
        if (!isValidationOk) return;
        if (!songTitle.trim() || !artistName.trim()) {
            alert('Por favor ingrese el título de la canción y el artista principal.');
            return;
        }

        setIsExporting(true);
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Set Fonts
            doc.setFont("helvetica", "bold");

            // Background accents (gold and dark blocks)
            doc.setFillColor(10, 12, 20); // Dark BG Top bar
            doc.rect(0, 0, pageWidth, 40, 'F');

            // Golden Accent Line
            doc.setFillColor(197, 160, 89); // Gold #c5a059
            doc.rect(0, 40, pageWidth, 2, 'F');

            // Header Text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("SPLIT SHEET DE COAUTORÍA", 15, 18);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(197, 160, 89);
            doc.text("ACUERDO EJECUTIVO DE DIVISIÓN DE REGALÍAS", 15, 25);

            // Document Meta (Top Right)
            doc.setTextColor(255, 255, 255);
            doc.setFont("courier", "bold");
            doc.setFontSize(8);
            doc.text(`CONTRATO REG: DMG-${Date.now().toString().slice(-6)}`, pageWidth - 80, 18);
            doc.text(`FECHA: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 80, 24);

            // Back to Normal Font
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 30, 30);

            // Section 1: Song Information
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(197, 160, 89);
            doc.text("1. DATOS DE LA CANCIÓN", 15, 52);
            
            doc.setDrawColor(230, 230, 230);
            doc.line(15, 54, pageWidth - 15, 54);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);

            doc.text("Título de la Obra:", 15, 62);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 10, 10);
            doc.text(songTitle.toUpperCase(), 45, 62);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("Artista Principal:", 15, 68);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 10, 10);
            doc.text(artistName.toUpperCase(), 45, 68);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("Género:", 15, 74);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 10, 10);
            doc.text(genre, 45, 74);

            // Right side of song meta
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("Fecha Lanzamiento:", pageWidth - 90, 62);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 10, 10);
            doc.text(releaseDate, pageWidth - 55, 62);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("Sello / Distribuidora:", pageWidth - 90, 68);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(10, 10, 10);
            doc.text(distributor, pageWidth - 55, 68);

            // Section 2: Split Table Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(197, 160, 89);
            doc.text("2. DIVISIÓN DE PORCENTAJES DE COAUTORÍA Y EJECUCIÓN", 15, 88);
            doc.line(15, 90, pageWidth - 15, 90);

            // Table Header Background
            doc.setFillColor(245, 245, 248);
            doc.rect(15, 95, pageWidth - 30, 8, 'F');
            doc.setDrawColor(220, 220, 225);
            doc.rect(15, 95, pageWidth - 30, 8, 'S');

            // Table Header Labels
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(60, 60, 60);
            doc.text("COLABORADOR / EMAIL", 18, 100);
            doc.text("ROL PRINCIPAL", 75, 100);
            doc.text("PRO / IPI", 108, 100);
            doc.text("COMP. MÚSICA", 138, 100);
            doc.text("LETRA (LYRICS)", 162, 100);
            doc.text("FONOGRAMA", 185, 100);

            // Table Rows
            let y = 103;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(30, 30, 30);

            collaborators.forEach((c) => {
                doc.setFillColor(255, 255, 255);
                doc.rect(15, y, pageWidth - 30, 12, 'F');
                doc.rect(15, y, pageWidth - 30, 12, 'S');

                // Collaborator Details
                doc.setFont("helvetica", "bold");
                doc.setTextColor(10, 10, 10);
                doc.text(c.name || 'Sin nombre', 18, y + 5);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.text(c.email || 'Sin email', 18, y + 9);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(30, 30, 30);
                doc.text(c.role, 75, y + 7);

                const proInfo = `${c.pro || 'N/A'} - ${c.ipi || 'N/A'}`;
                doc.setFont("helvetica", "normal");
                doc.text(proInfo, 108, y + 7);

                // Splits (bold and gold highlight)
                doc.setFont("helvetica", "bold");
                doc.setTextColor(197, 160, 89);
                doc.text(`${c.musicSplit}%`, 145, y + 7);
                doc.text(`${c.lyricsSplit}%`, 168, y + 7);
                doc.text(`${c.performanceSplit}%`, 190, y + 7);

                y += 12;
            });

            // Table Footer (Total Validation row)
            doc.setFillColor(240, 245, 240);
            doc.rect(15, y, pageWidth - 30, 8, 'F');
            doc.rect(15, y, pageWidth - 30, 8, 'S');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(40, 90, 40);
            doc.text("TOTALES (VALIDACIÓN MATEMÁTICA COMPLETADA)", 18, y + 5);

            doc.text(`${musicTotal}%`, 145, y + 5);
            doc.text(`${lyricsTotal}%`, 168, y + 5);
            doc.text(`${performanceTotal}%`, 190, y + 5);

            y += 18;

            // Section 3: Legal Clauses
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(197, 160, 89);
            doc.text("3. TÉRMINOS Y CONDICIONES LEGALES BÁSICOS", 15, y);
            doc.line(15, y + 2, pageWidth - 15, y + 2);

            y += 8;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(90, 90, 90);

            const clauses = [
                "1. Los firmantes declaran bajo protesta de decir verdad que las contribuciones porcentuales arriba descritas representan fielmente su participación creativa en la composición de la letra, la composición musical y la propiedad/ejecución del fonograma resultante.",
                "2. Cada parte será responsable de registrar su respectiva participación ante sus sociedades de gestión colectiva (PRO) correspondientes de manera alineada con esta hoja de reparto.",
                "3. Ninguna de las partes podrá licenciar la obra de manera exclusiva sin el consentimiento previo y por escrito de los coautores restantes que representen la mayoría de los derechos de autor de la obra.",
                "4. Los firmantes acuerdan de mutuo acuerdo resolver amigablemente cualquier diferencia derivada de la distribución de regalías de esta obra y acuerdan regirse bajo las leyes de la industria musical independiente."
            ];

            clauses.forEach((clause) => {
                const splitText = doc.splitTextToSize(clause, pageWidth - 30);
                doc.text(splitText, 15, y);
                y += (splitText.length * 4);
            });

            y += 10;

            // Section 4: Signatures Blocks
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(197, 160, 89);
            doc.text("4. FIRMAS Y DECLARACIONES FORMALES", 15, y);
            doc.line(15, y + 2, pageWidth - 15, y + 2);

            y += 15;

            // Render Signatures Side-by-Side (Max 2 columns)
            let colWidth = (pageWidth - 30) / 2;
            let startY = y;
            collaborators.forEach((c, idx) => {
                let colX = 15 + (idx % 2) * colWidth;
                let currentY = startY + Math.floor(idx / 2) * 35;

                // Sign Line
                doc.setDrawColor(180, 180, 180);
                doc.line(colX + 5, currentY + 12, colX + colWidth - 10, currentY + 12);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(30, 30, 30);
                doc.text(c.name || 'Coautor sin firma', colX + 5, currentY + 17);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7);
                doc.setTextColor(120, 120, 120);
                doc.text(`Firma Autorizada: ${c.role}`, colX + 5, currentY + 21);
                doc.text(`IPI/CAE: ${c.ipi || 'N/A'} | PRO: ${c.pro || 'N/A'}`, colX + 5, currentY + 25);
            });

            // Save PDF File
            const cleanTitle = songTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            doc.save(`split-sheet-${cleanTitle || 'obra'}.pdf`);

            alert("🚀 ¡Split Sheet generado con éxito!");
        } catch (e: any) {
            console.error(e);
            alert("❌ Error generando PDF: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 border-b border-white/5 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                            <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                        </button>
                        <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">Split Sheet <span className="text-[#c5a059]">Generator</span></h1>
                        <p className="text-white/40 text-xs max-w-xl">Centraliza la propiedad legal de tus canciones con contratos oficiales de reparto de regalías en formato PDF.</p>
                    </div>
                    <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full h-fit">{VERSION}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Form Left Side */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* 1. Song Metadata */}
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a059]/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#c5a059] mb-8 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-[#c5a059]"></span> 1. Información General de la Obra
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2 bg-[#05070a] border border-white/5 rounded-2xl p-5">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-3">Auto-completar desde el catálogo</label>
                                    <input 
                                        type="text" value={songSearch} onChange={e => setSongSearch(e.target.value)}
                                        placeholder="Escribe título de la canción para buscar..."
                                        className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-5 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none mb-3"
                                    />
                                    <select
                                        value={selectedSongId}
                                        onChange={(e) => handleSongSelect(e.target.value)}
                                        className="w-full bg-[#0f111a] border border-white/10 rounded-xl p-4 text-xs text-white focus:border-[#c5a059]/50 outline-none cursor-pointer appearance-none"
                                    >
                                        <option value="">{catalogLoading ? 'Cargando canciones...' : 'Elegir del Catálogo'}</option>
                                        {catalog
                                            .filter(s => !songSearch || `${s.artist} - ${s.name}`.toLowerCase().includes(songSearch.toLowerCase()))
                                            .map(s => <option key={s.id} value={s.id}>{s.artist} - {s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-3">Título de la Canción</label>
                                    <input 
                                        type="text" value={songTitle} onChange={e => setSongTitle(e.target.value)}
                                        placeholder="Ej: El Llorón del Salón"
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl px-5 py-4 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-3">Artista Principal</label>
                                    <input 
                                        type="text" value={artistName} onChange={e => setArtistName(e.target.value)}
                                        placeholder="Ej: Diosmasgym x Juan 614"
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl px-5 py-4 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-3">Fecha de Lanzamiento</label>
                                    <input 
                                        type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)}
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl px-5 py-4 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-3">Género de la Obra</label>
                                    <input 
                                        type="text" value={genre} onChange={e => setGenre(e.target.value)}
                                        placeholder="Ej: Urbano Cristiano / Bélico"
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl px-5 py-4 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Collaborators Form List */}
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-[#c5a059]"></span> 2. Reparto entre Coautores
                                </h3>
                                <button 
                                    onClick={addCollaborator}
                                    className="px-5 py-2.5 bg-[#c5a059]/10 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059] hover:text-black rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <i className="fas fa-plus"></i> Añadir Coautor
                                </button>
                            </div>

                            <div className="space-y-8">
                                {collaborators.map((c, idx) => (
                                    <div key={c.id} className="relative bg-[#05070a] border border-white/5 p-6 rounded-2xl">
                                        <div className="absolute top-4 right-4 flex items-center gap-3">
                                            <span className="text-[8px] font-mono text-white/20 bg-white/5 px-2.5 py-1 rounded-full uppercase"># {idx + 1}</span>
                                            {collaborators.length > 1 && (
                                                <button 
                                                    onClick={() => removeCollaborator(c.id)}
                                                    className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs flex items-center justify-center"
                                                    title="Eliminar coautor"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">Nombre Legal Completo</label>
                                                <input 
                                                    type="text" value={c.name} onChange={e => updateCollaborator(c.id, 'name', e.target.value)}
                                                    placeholder="Ej: Juan Pérez"
                                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">Correo Electrónico</label>
                                                <input 
                                                    type="email" value={c.email} onChange={e => updateCollaborator(c.id, 'email', e.target.value)}
                                                    placeholder="Ej: juan@diosmasgym.com"
                                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">Rol en la Obra</label>
                                                <select 
                                                    value={c.role} onChange={e => updateCollaborator(c.id, 'role', e.target.value)}
                                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none cursor-pointer"
                                                >
                                                    {['Compositor', 'Productor', 'Autor de Letras', 'Intérprete', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">Sociedad Autoral (PRO)</label>
                                                <select 
                                                    value={c.pro} onChange={e => updateCollaborator(c.id, 'pro', e.target.value)}
                                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none cursor-pointer"
                                                >
                                                    {['BMI', 'ASCAP', 'SESAC', 'SGAE', 'SACM', 'SADAIC', 'SAYCO', 'Otro'].map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">Número IPI / CAE</label>
                                                <input 
                                                    type="text" value={c.ipi} onChange={e => updateCollaborator(c.id, 'ipi', e.target.value)}
                                                    placeholder="Ej: 00123456789 (9-11 dígitos)"
                                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none"
                                                />
                                            </div>

                                            <div className="md:col-span-3 border-t border-white/5 pt-6 mt-2 grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">% Composición Música</label>
                                                    <input 
                                                        type="number" value={c.musicSplit} onChange={e => updateCollaborator(c.id, 'musicSplit', parseFloat(e.target.value) || 0)}
                                                        min="0" max="100"
                                                        className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none font-bold"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">% Autoría Letra</label>
                                                    <input 
                                                        type="number" value={c.lyricsSplit} onChange={e => updateCollaborator(c.id, 'lyricsSplit', parseFloat(e.target.value) || 0)}
                                                        min="0" max="100"
                                                        className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none font-bold"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#c5a059] mb-2">% Fonograma / Master</label>
                                                    <input 
                                                        type="number" value={c.performanceSplit} onChange={e => updateCollaborator(c.id, 'performanceSplit', parseFloat(e.target.value) || 0)}
                                                        min="0" max="100"
                                                        className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#c5a059]/50 outline-none font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary Sidebar Right Side */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
                        <div className="bg-[#0f111a] border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#c5a059] mb-6 flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-[#c5a059]"></span> Estado de Validación
                            </h3>

                            <div className="space-y-6">
                                {[
                                    ['Música / Composición', musicTotal],
                                    ['Letra / Lyrics', lyricsTotal],
                                    ['Fonograma / Master', performanceTotal]
                                ].map(([label, total]) => {
                                    const totalVal = Number(total);
                                    const isOk = totalVal === 100;
                                    return (
                                        <div key={label as string} className="bg-[#05070a] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">{label}</p>
                                                <p className={`text-xs font-bold ${isOk ? 'text-green-400' : 'text-amber-500'}`}>
                                                    {isOk ? '✓ Correcto (100%)' : `⚠ Incorrecto (${totalVal}%)`}
                                                </p>
                                            </div>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black border ${isOk ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                                {totalVal}%
                                            </div>
                                        </div>
                                    );
                                })}

                                {isValidationOk ? (
                                    <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl text-center">
                                        <p className="text-xs text-green-400 font-bold uppercase tracking-wider">✓ Validación exitosa</p>
                                        <p className="text-[10px] text-white/40 mt-1">Los porcentajes suman exactamente el 100% en todas las categorías requeridas.</p>
                                    </div>
                                ) : (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl text-center">
                                        <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">⚠ Requiere ajuste</p>
                                        <p className="text-[10px] text-white/40 mt-1">Los porcentajes de coautoría y ejecución deben sumar exactamente el 100% para poder generar el acuerdo.</p>
                                    </div>
                                )}

                                <button 
                                    onClick={generatePDF}
                                    disabled={!isValidationOk || isExporting}
                                    className="w-full py-5 bg-[#c5a059] disabled:opacity-30 disabled:pointer-events-none text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:scale-[1.02] active:scale-95 transition-all shadow-xl rounded-xl flex items-center justify-center gap-2"
                                >
                                    <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                                    {isExporting ? 'GENERATING...' : 'DESCARGAR SPLIT SHEET PDF'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplitSheetGenerator;
