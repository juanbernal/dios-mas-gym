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
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [googleToken, setGoogleToken] = useState(localStorage.getItem('blogger_google_token') || "");
    const [showTokenHelp, setShowTokenHelp] = useState(false);

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

                // 3. Load Local Drafts
                const localRaw = localStorage.getItem('lyric_studio_drafts');
                const local = localRaw ? JSON.parse(localRaw) : [];
                const localItems: LyricItem[] = local.map((l: any, i: number) => ({
                    id: `local-${i}`,
                    title: l.name,
                    artist: l.artist || 'Desconocido',
                    content: l.content,
                    status: 'LOCAL',
                    date: l.date
                }));

                setLyrics([...localItems, ...draftItems, ...publishedItems]);
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

    const handleSaveToBlogger = async () => {
        if (!selectedLyric) return;
        let currentToken = googleToken;

        if (!currentToken) {
            const input = prompt("Pega tu Google Access Token (o el bloque de JSON que te dio Google):\n(Debe empezar por ya29...)");
            if (!input) return;
            
            let extractedToken = input.trim();

            // Smart Extraction: If user pastes the whole JSON block
            if (input.includes('"access_token"')) {
                try {
                    const match = input.match(/"access_token":\s*"([^"]+)"/);
                    if (match && match[1]) {
                        extractedToken = match[1];
                        // Also try to grab refresh token for future use
                        const refreshMatch = input.match(/"refresh_token":\s*"([^"]+)"/);
                        if (refreshMatch && refreshMatch[1]) {
                            localStorage.setItem('blogger_refresh_token', refreshMatch[1]);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse JSON token", e);
                }
            }

            // Basic validation
            if (extractedToken.includes('http') || extractedToken.includes('code=')) {
                alert("❌ Parece que has pegado una URL o un código de autorización. Necesitas el 'Access Token' (una cadena larga que empieza por ya29...). Mira la ayuda (?)");
                return;
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
            
            if (res.status === 401) {
                throw new Error("El Token ha caducado o es inválido. Por favor, obtén uno nuevo.");
            }

            if (data.id) {
                alert("✅ Borrador creado en Blogger con éxito!");
            } else {
                throw new Error(data.error || "Error desconocido al subir a Blogger");
            }
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
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-[#0a0c14] flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/admin')} className="text-white/20 hover:text-white transition-all">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-tighter italic">Gestor de <span className="text-[#00ffcc]">Letras</span> <span className="text-[10px] not-italic text-white/20 ml-2">Blogger Sync v1.0</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                        <input 
                            type="text" 
                            placeholder="Buscar letra..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-full pl-10 pr-6 py-2 text-xs outline-none focus:border-[#00ffcc]/30 w-64"
                        />
                    </div>
                    <button 
                        onClick={handleSyncAllLocales}
                        disabled={isExporting}
                        className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase rounded-full hover:bg-blue-500/20 transition-all flex items-center gap-2"
                        title="Subir todos los locales a Blogger"
                    >
                        <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                        Sync Locales
                    </button>
                    <button 
                        onClick={() => {
                            const title = prompt("Título de la nueva canción:");
                            if (title) {
                                setSelectedLyric({ id: 'new', title, artist: 'Dios Mas Gym', content: '', status: 'LOCAL', date: new Date().toISOString() });
                            }
                        }}
                        className="px-6 py-2 bg-[#00ffcc] text-black text-[10px] font-black uppercase rounded-full hover:bg-white transition-all"
                    >
                        <i className="fas fa-plus mr-2"></i> Nueva Letra
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 h-[calc(100vh-100px)]">
                {/* List Sidebar */}
                <div className="col-span-12 lg:col-span-4 border-r border-white/5 overflow-y-auto custom-scrollbar bg-black/20">
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
                                            lyric.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-500' : 'bg-zinc-500/20 text-zinc-500'
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
                <div className="col-span-12 lg:col-span-8 bg-[#05070a] flex flex-col">
                    {selectedLyric ? (
                        <>
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                                <div className="flex flex-col flex-1 mr-8">
                                    <input 
                                        type="text"
                                        value={selectedLyric.title}
                                        onChange={e => setSelectedLyric({...selectedLyric, title: e.target.value})}
                                        className="bg-transparent text-2xl font-black italic uppercase outline-none border-b border-transparent focus:border-[#00ffcc]/20 w-full mb-1"
                                        placeholder="Título de la Canción"
                                    />
                                    <div className="flex items-center gap-3 mt-1">
                                        <button 
                                            onClick={() => setSelectedLyric({...selectedLyric, artist: 'Dios Mas Gym'})}
                                            className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border transition-all ${selectedLyric.artist === 'Dios Mas Gym' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 text-white/40 border-white/10'}`}
                                        >
                                            Dios Mas Gym
                                        </button>
                                        <button 
                                            onClick={() => setSelectedLyric({...selectedLyric, artist: 'Juan 614'})}
                                            className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border transition-all ${selectedLyric.artist === 'Juan 614' ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 text-white/40 border-white/10'}`}
                                        >
                                            Juan 614
                                        </button>
                                        <input 
                                            type="text"
                                            value={selectedLyric.artist}
                                            onChange={e => setSelectedLyric({...selectedLyric, artist: e.target.value})}
                                            className="bg-transparent text-[10px] font-black uppercase tracking-[0.3em] text-[#00ffcc] outline-none ml-2 border-b border-white/10 focus:border-[#00ffcc]/40"
                                            placeholder="Otro Artista..."
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleSaveToBlogger}
                                        disabled={isExporting}
                                        className="px-6 py-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-black uppercase rounded-full hover:bg-blue-500/30 transition-all flex items-center gap-2"
                                    >
                                        <i className={`fab fa-blogger-b ${isExporting ? 'fa-spin' : ''}`}></i> {isExporting ? 'Subiendo...' : 'Blogger (Draft)'}
                                    </button>
                                    <button 
                                        onClick={() => setShowTokenHelp(true)}
                                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white transition-all"
                                        title="Ayuda con el Token"
                                    >
                                        <i className="fas fa-question text-[10px]"></i>
                                    </button>
                                    <button 
                                        onClick={handleSaveLocal}
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase rounded-full hover:bg-white/10 transition-all"
                                    >
                                        <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i> {isSaving ? 'Guardando...' : 'Guardar Local'}
                                    </button>
                                    <button 
                                        onClick={goToStudio}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-black uppercase rounded-full hover:scale-105 transition-all shadow-lg shadow-purple-500/20"
                                    >
                                        <i className="fas fa-wand-magic-sparkles mr-2"></i> Crear Video
                                    </button>
                                </div>
                            </div>
                            <textarea 
                                value={selectedLyric.content}
                                onChange={e => setSelectedLyric({...selectedLyric, content: e.target.value})}
                                className="flex-1 bg-transparent p-12 text-lg leading-relaxed outline-none resize-none custom-scrollbar font-serif italic text-white/80"
                                placeholder="Escribe tu letra aquí..."
                            ></textarea>
                            <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                                <p className="text-[9px] uppercase font-black tracking-widest text-white/20">
                                    Sugerencia: Guarda como borrador local antes de enviar al Studio para no perder cambios.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12">
                            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
                                <i className="fas fa-file-lines text-4xl text-white/10"></i>
                            </div>
                            <h2 className="text-xl font-bold mb-4 italic">Selecciona una letra del archivo</h2>
                            <p className="text-xs text-white/40 max-w-sm leading-relaxed font-light">
                                Aquí puedes gestionar todas tus composiciones de Blogger (Publicadas y Borradores) y tus creaciones locales en un solo lugar.
                            </p>
                        </div>
                    )}
                </div>
            </div>

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
