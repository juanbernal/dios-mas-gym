import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchArsenalData } from '../../services/contentService';

interface LyricItem {
    id: string;
    title: string;
    artist: string;
    content: string;
    status: 'LIVE' | 'DRAFT' | 'LOCAL';
    date: string;
}

const LyricsManager: React.FC = () => {
    const navigate = useNavigate();
    const [lyrics, setLyrics] = useState<LyricItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLyric, setSelectedLyric] = useState<LyricItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [googleToken, setGoogleToken] = useState(localStorage.getItem('blogger_google_token') || "");
    const [sheetsSyncUrl, setSheetsSyncUrl] = useState(localStorage.getItem('lyrics_sheets_sync_url') || "https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec");
    const [showTokenHelp, setShowTokenHelp] = useState(false);
    const [showSheetsConfig, setShowSheetsConfig] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list'); // Mobile view toggle

    useEffect(() => {
        if (selectedLyric && window.innerWidth < 1024) {
            setViewMode('editor');
        }
    }, [selectedLyric]);

    useEffect(() => {
        const loadAllLyrics = async () => {
            setLoading(true);
            try {
                // 1. Fetch Published
                const published = await fetchArsenalData(50);
                const publishedItems: LyricItem[] = (published.posts || []).map(p => ({
                    id: p.id,
                    title: p.title,
                    artist: p.labels?.find((l: string) => l.includes('Juan') || l.includes('Dios')) || 'Desconocido',
                    content: p.content,
                    status: 'LIVE',
                    date: p.published
                }));

                // 2. Fetch Drafts
                (window as any).BLOGGER_STATUS = 'DRAFT';
                const drafts = await fetchArsenalData(50);
                (window as any).BLOGGER_STATUS = undefined;
                const draftItems: LyricItem[] = (drafts.posts || []).map(p => ({
                    id: p.id,
                    title: p.title,
                    artist: p.labels?.find((l: string) => l.includes('Juan') || l.includes('Dios')) || 'Desconocido',
                    content: p.content,
                    status: 'DRAFT',
                    date: p.published
                }));

                // 4. Fetch from Google Sheets
                let sheetItems: LyricItem[] = [];
                if (sheetsSyncUrl) {
                    try {
                        const res = await fetch(sheetsSyncUrl);
                        if (res.ok) {
                            const data = await res.json();
                            sheetItems = (data || []).map((l: any, i: number) => ({
                                id: `sheet-${i}`,
                                title: l.title,
                                artist: l.artist,
                                content: l.content,
                                status: 'CLOUD',
                                date: l.date
                            }));
                        }
                    } catch (e) {
                        console.error("Sheets sync error", e);
                    }
                }

                setLyrics([...localItems, ...sheetItems, ...draftItems, ...publishedItems]);
            } catch (e) {
                console.error("Error loading lyrics", e);
            } finally {
                setLoading(false);
            }
        };
        loadAllLyrics();
    }, []);

    const filteredLyrics = lyrics.filter(l => 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveLocal = () => {
        if (!selectedLyric) return;
        setIsSaving(true);
        const localRaw = localStorage.getItem('lyric_studio_drafts');
        const local = localRaw ? JSON.parse(localRaw) : [];
        const existingIdx = local.findIndex((l: any) => l.name === selectedLyric.title);
        
        const draftData = {
            name: selectedLyric.title,
            artist: selectedLyric.artist,
            content: selectedLyric.content,
            sync: "", // sync data placeholder
            date: new Date().toISOString()
        };

        if (existingIdx >= 0) local[existingIdx] = draftData;
        else local.unshift(draftData);

        localStorage.setItem('lyric_studio_drafts', JSON.stringify(local));
        
        // Update list if it's a new local one
        if (selectedLyric.status !== 'LOCAL') {
             const newItem: LyricItem = { ...selectedLyric, id: `local-${Date.now()}`, status: 'LOCAL' };
             setLyrics([newItem, ...lyrics]);
        }

        setTimeout(() => {
            setIsSaving(false);
            alert("✅ Guardado en Borradores Locales");
        }, 500);
    };

    const handleSaveToSheets = async () => {
        if (!selectedLyric || !sheetsSyncUrl) return;
        setIsSaving(true);
        try {
            await fetch(sheetsSyncUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: selectedLyric.title,
                    artist: selectedLyric.artist,
                    content: selectedLyric.content,
                    date: new Date().toISOString()
                })
            });
            alert("✅ Sincronizado con Google Sheets");
            if (selectedLyric.status !== 'CLOUD') {
                const newItem: LyricItem = { ...selectedLyric, id: `sheet-${Date.now()}`, status: 'CLOUD' };
                setLyrics([newItem, ...lyrics]);
            }
        } catch (e: any) {
            alert("❌ Error Sheets: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveToBlogger = async () => {
        if (!selectedLyric) return;
        let currentToken = googleToken;

        if (!currentToken) {
            const input = prompt("Pega tu Google Access Token (ya29...):");
            if (!input) return;
            let extractedToken = input.trim();
            if (input.includes('"access_token"')) {
                const match = input.match(/"access_token":\s*"([^"]+)"/);
                if (match && match[1]) extractedToken = match[1];
            }
            currentToken = extractedToken;
            setGoogleToken(currentToken);
            localStorage.setItem('blogger_google_token', currentToken);
        }

        setIsExporting(true);
        try {
            const res = await fetch('/api/arsenal', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    title: selectedLyric.title,
                    content: selectedLyric.content,
                    labels: [selectedLyric.artist, 'Lyrics'],
                    isDraft: true
                })
            });
            const data = await res.json();
            if (data.id) alert("✅ Borrador creado en Blogger");
            else throw new Error(data.error || "Error en Blogger");
        } catch (e: any) {
            alert("❌ Error: " + e.message);
            setGoogleToken(""); 
            localStorage.removeItem('blogger_google_token');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSyncAllLocales = async () => {
        const localDrafts = lyrics.filter(l => l.status === 'LOCAL');
        if (localDrafts.length === 0) {
            alert("No hay borradores locales para sincronizar.");
            return;
        }

        if (!googleToken) {
            alert("Necesitas configurar tu Google Token primero. Intenta guardar uno individualmente o mira la ayuda (?)");
            setShowTokenHelp(true);
            return;
        }

        if (!confirm(`¿Quieres subir ${localDrafts.length} borradores locales a Blogger como borradores?`)) return;

        setIsExporting(true);
        let successCount = 0;
        for (const lyric of localDrafts) {
            try {
                const res = await fetch('/api/arsenal', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${googleToken}`
                    },
                    body: JSON.stringify({
                        title: lyric.title,
                        content: lyric.content,
                        labels: [lyric.artist, 'Lyrics'],
                        isDraft: true
                    })
                });
                if (res.ok) successCount++;
            } catch (e) {
                console.error(`Error syncing ${lyric.title}`, e);
            }
        }
        setIsExporting(false);
        alert(`✅ Sincronización completada: ${successCount} de ${localDrafts.length} letras subidas a Blogger.`);
    };

    const stripHtml = (html: string) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const goToStudio = () => {
        if (!selectedLyric) return;
        navigate('/admin/lyric-studio', { 
            state: { 
                initialLyrics: stripHtml(selectedLyric.content) 
            } 
        });
    };

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins'] flex flex-col">
            {/* Header */}
            <div className="p-4 md:p-8 border-b border-white/5 bg-[#0a0c14] sticky top-0 z-50">
                <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/admin')} className="text-white/20 hover:text-white transition-all p-2">
                                <i className="fas fa-arrow-left"></i>
                            </button>
                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter italic">
                                Gestor de <span className="text-[#00ffcc]">Letras</span>
                                <span className="hidden md:inline text-[10px] not-italic text-white/20 ml-2">Blogger Sync v2.0</span>
                            </h1>
                        </div>
                        
                        {/* Mobile View Toggle */}
                        {selectedLyric && (
                            <button 
                                onClick={() => setViewMode(viewMode === 'list' ? 'editor' : 'list')}
                                className="lg:hidden px-4 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10"
                            >
                                <i className={`fas ${viewMode === 'list' ? 'fa-pen-to-square' : 'fa-list-ul'} mr-2`}></i>
                                {viewMode === 'list' ? 'Editor' : 'Lista'}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <div className="relative flex-1 min-w-[200px] md:flex-none">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                            <input 
                                type="text" 
                                placeholder="Buscar letra..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-full pl-10 pr-6 py-2 text-xs outline-none focus:border-[#00ffcc]/30 w-full md:w-64"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowSheetsConfig(true)}
                                className={`p-2.5 md:px-4 md:py-2 border rounded-full transition-all flex items-center gap-2 ${sheetsSyncUrl ? 'bg-[#c5a059]/10 border-[#c5a059]/40 text-[#c5a059]' : 'bg-white/5 border-white/10 text-white/40'}`}
                                title="Configurar Cloud Sync"
                            >
                                <i className="fas fa-cloud"></i>
                                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{sheetsSyncUrl ? 'Cloud On' : 'Setup Cloud'}</span>
                            </button>
                            <button 
                                onClick={() => {
                                    const title = prompt("Título de la nueva canción:");
                                    if (title) {
                                        setSelectedLyric({ id: 'new', title, artist: 'Dios Mas Gym', content: '', status: 'LOCAL', date: new Date().toISOString() });
                                        setViewMode('editor');
                                    }
                                }}
                                className="p-2.5 md:px-6 md:py-2 bg-[#00ffcc] text-black rounded-full hover:bg-white transition-all shadow-lg shadow-[#00ffcc]/10"
                            >
                                <i className="fas fa-plus md:mr-2"></i>
                                <span className="hidden md:inline text-[10px] font-black uppercase">Nueva</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 overflow-hidden h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
                {/* List Sidebar */}
                <div className={`${viewMode === 'list' ? 'col-span-12' : 'hidden'} lg:flex lg:col-span-4 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/20 flex-col`}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 border-2 border-[#00ffcc] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] uppercase font-black tracking-widest text-white/20">Sincronizando con Blogger...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredLyrics.map((lyric) => (
                                <div 
                                    key={lyric.id}
                                    onClick={() => setSelectedLyric(lyric)}
                                    className={`p-6 cursor-pointer transition-all hover:bg-white/5 ${selectedLyric?.id === lyric.id ? 'bg-[#00ffcc]/5 border-l-4 border-[#00ffcc]' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${
                                            lyric.status === 'LIVE' ? 'bg-green-500/20 text-green-500' : 
                                            lyric.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-500' : 
                                            lyric.status === 'CLOUD' ? 'bg-[#c5a059]/20 text-[#c5a059]' : 'bg-zinc-500/20 text-zinc-500'
                                        }`}>
                                            {lyric.status}
                                        </span>
                                        <span className="text-[8px] text-white/20">{new Date(lyric.date).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-sm font-bold truncate">{lyric.title}</h3>
                                    <p className="text-[10px] text-white/40 line-clamp-1 mt-1 font-light italic">
                                        {stripHtml(lyric.content).slice(0, 100)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor Section */}
                <div className={`${viewMode === 'editor' ? 'col-span-12' : 'hidden'} lg:flex lg:col-span-8 bg-[#05070a] flex flex-col overflow-hidden`}>
                    {selectedLyric ? (
                        <>
                            <div className="p-4 md:p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/20">
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <button 
                                            onClick={() => setViewMode('list')}
                                            className="lg:hidden w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40"
                                        >
                                            <i className="fas fa-arrow-left text-xs"></i>
                                        </button>
                                        <input 
                                            type="text"
                                            value={selectedLyric.title}
                                            onChange={e => setSelectedLyric({...selectedLyric, title: e.target.value})}
                                            className="bg-transparent text-xl md:text-2xl font-black italic uppercase outline-none border-b border-transparent focus:border-[#00ffcc]/20 w-full"
                                            placeholder="Título de la Canción"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <button 
                                            onClick={() => setSelectedLyric({...selectedLyric, artist: 'Dios Mas Gym'})}
                                            className={`text-[7px] md:text-[8px] font-black uppercase px-3 py-1 rounded-full border transition-all ${selectedLyric.artist === 'Dios Mas Gym' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 text-white/40 border-white/10'}`}
                                        >
                                            Dios Mas Gym
                                        </button>
                                        <button 
                                            onClick={() => setSelectedLyric({...selectedLyric, artist: 'Juan 614'})}
                                            className={`text-[7px] md:text-[8px] font-black uppercase px-3 py-1 rounded-full border transition-all ${selectedLyric.artist === 'Juan 614' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 text-white/40 border-white/10'}`}
                                        >
                                            Juan 614
                                        </button>
                                        <input 
                                            type="text"
                                            value={selectedLyric.artist}
                                            onChange={e => setSelectedLyric({...selectedLyric, artist: e.target.value})}
                                            className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#00ffcc] outline-none border-b border-white/10 focus:border-[#00ffcc]/40 min-w-[100px]"
                                            placeholder="Otro Artista..."
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 md:gap-3">
                                    <div className="flex gap-2 w-full md:w-auto">
                                        {sheetsSyncUrl && (
                                            <button 
                                                onClick={handleSaveToSheets}
                                                disabled={isSaving}
                                                className="flex-1 md:flex-none px-4 py-2 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-[9px] font-black uppercase rounded-xl hover:bg-[#c5a059]/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-cloud'}`}></i> Sheets
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleSaveToBlogger}
                                            disabled={isExporting}
                                            className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase rounded-xl hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className={`fab fa-blogger-b ${isExporting ? 'fa-spin' : ''}`}></i> Blogger
                                        </button>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={handleSaveLocal}
                                            disabled={isSaving}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> Local
                                        </button>
                                        <button 
                                            onClick={goToStudio}
                                            className="flex-1 md:flex-none px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black uppercase rounded-xl hover:scale-105 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-wand-magic-sparkles"></i> Studio
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <textarea 
                                value={selectedLyric.content}
                                onChange={e => setSelectedLyric({...selectedLyric, content: e.target.value})}
                                className="flex-1 bg-transparent p-6 md:p-12 text-base md:text-lg leading-relaxed outline-none resize-none custom-scrollbar font-serif italic text-white/80"
                                placeholder="Escribe tu letra aquí..."
                            ></textarea>
                            <div className="p-3 bg-black/40 border-t border-white/5 text-center">
                                <p className="text-[8px] md:text-[9px] uppercase font-black tracking-widest text-white/20">
                                    Autoguardado disponible en Cloud y Local
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 md:p-12">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 md:mb-8">
                                <i className="fas fa-file-lines text-3xl md:text-4xl text-white/10"></i>
                            </div>
                            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 italic">Selecciona una letra</h2>
                            <p className="text-[10px] md:text-xs text-white/40 max-w-sm leading-relaxed font-light">
                                Gestiona todas tus composiciones de Blogger y Google Sheets en un solo lugar optimizado.
                            </p>
                        </div>
                    )}
                </div>
            </div>

        {/* SHEETS CONFIG MODAL */}
        {showSheetsConfig && (
            <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
                <div className="bg-[#0f111a] border border-[#c5a059]/20 rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative">
                    <button onClick={() => setShowSheetsConfig(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-all">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-[#c5a059]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#c5a059] shadow-[0_0_30px_rgba(197,160,89,0.1)]">
                            <i className="fas fa-cloud-arrow-up text-3xl"></i>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Sincronización Cloud</h2>
                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/20">Google Sheets Sync v1.0</p>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">Google Apps Script URL</label>
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={sheetsSyncUrl}
                                    onChange={(e) => {
                                        const url = e.target.value.trim();
                                        setSheetsSyncUrl(url);
                                        localStorage.setItem('lyrics_sheets_sync_url', url);
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#c5a059]/40 transition-all font-mono"
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                />
                                <i className="fas fa-link absolute right-6 top-1/2 -translate-y-1/2 text-white/10"></i>
                            </div>
                            <p className="text-[9px] text-white/30 italic">
                                Pega aquí la URL de implementación de tu Google Apps Script para sincronizar entre dispositivos.
                            </p>
                        </div>

                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-3">
                                <i className="fas fa-info-circle text-[#c5a059]"></i> ¿Cómo funciona?
                            </h4>
                            <ul className="text-[10px] text-white/40 space-y-2 leading-relaxed">
                                <li>1. Crea una hoja de Google Sheets.</li>
                                <li>2. Ve a <span className="text-white/60">Extensiones &gt; Apps Script</span>.</li>
                                <li>3. Pega el código proporcionado por Antigravity.</li>
                                <li>4. Pulsa <span className="text-white/60">Implementar &gt; Nueva Implementación</span>.</li>
                                <li>5. Selecciona "Aplicación Web" y en "Quién puede acceder" pon <span className="text-white/60">Cualquier persona</span>.</li>
                            </ul>
                        </div>

                        <button 
                            onClick={() => setShowSheetsConfig(false)}
                            className="w-full py-5 bg-[#c5a059] text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-white transition-all shadow-xl shadow-[#c5a059]/10"
                        >
                            Confirmar Configuración
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* TOKEN HELP MODAL */}
        {showTokenHelp && (
            <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
                <div className="bg-[#0f111a] border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative">
                    <button onClick={() => setShowTokenHelp(false)} className="absolute top-6 right-6 text-white/20 hover:text-white">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-400 shadow-lg">
                            <i className="fas fa-key text-2xl"></i>
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic mb-2">Google Access Token</h2>
                        <p className="text-[10px] uppercase font-black tracking-widest text-white/20">¿Cómo obtenerlo?</p>
                    </div>

                    <div className="space-y-6 text-xs leading-relaxed text-white/60">
                        <p>Para que la App pueda guardar borradores en tu cuenta de Blogger, necesitas un token temporal de Google:</p>
                        <ol className="list-decimal list-inside space-y-4 font-light">
                            <li>Ve al <a href="https://developers.google.com/oauthplayground/" target="_blank" className="text-blue-400 underline">Google OAuth Playground</a>.</li>
                            <li>En el buscador de la izquierda, busca: <code className="bg-black/40 px-2 py-1 rounded text-blue-300">https://www.googleapis.com/auth/blogger</code></li>
                            <li>Pulsa <b>Authorize APIs</b> e inicia sesión con tu cuenta de Blogger.</li>
                            <li>Pulsa <b>Exchange authorization code for tokens</b>.</li>
                            <li>Copia el <b className="text-white">Access Token</b> que aparece y pégalo en esta App cuando te lo pida.</li>
                        </ol>
                        <p className="pt-4 text-[9px] text-white/20 italic border-t border-white/5">
                            Nota: Este token es temporal y caduca en 1 hora por seguridad. No lo compartas con nadie.
                        </p>
                    </div>
                </div>
            </div>
        )}

      <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 204, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 255, 204, 0.3); }
            `}</style>
        </div>
    );
};

export default LyricsManager;
