import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchArsenalData } from '../../services/contentService';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

interface LyricItem {
    id: string;
    title: string;
    artist: string;
    content: string;
    status: 'LIVE' | 'DRAFT' | 'LOCAL' | 'CLOUD';
    date: string;
}

const SYNC_SECRET = "DMG_SYNC_2026";

const LyricsManager: React.FC = () => {
    const navigate = useNavigate();
    const [lyrics, setLyrics] = useState<LyricItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLyric, setSelectedLyric] = useState<LyricItem | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [sheetsSyncUrl, setSheetsSyncUrl] = useState(localStorage.getItem('lyrics_sheets_sync_url') || "/api/sheet-proxy?script=lyrics");
    const [showSheetsConfig, setShowSheetsConfig] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list'); // Mobile view toggle
    const [toast, setToast] = useState<{message: string, show: boolean}>({message: "", show: false});
    const [statusFilter, setStatusFilter] = useState<LyricItem['status'] | 'ALL'>('ALL');
    const [sortMode, setSortMode] = useState<'recent' | 'title' | 'artist' | 'status'>('recent');
    const [previewMode, setPreviewMode] = useState(false);
    const [savedSignature, setSavedSignature] = useState('');
    const [showStoryBuilder, setShowStoryBuilder] = useState(false);
    const [storyTitle, setStoryTitle] = useState('');
    const [storyCatalog, setStoryCatalog] = useState<MusicItem[]>([]);
    const [storySongId, setStorySongId] = useState('');
    const [storyThumbnail, setStoryThumbnail] = useState('');
    const [storyGenerated, setStoryGenerated] = useState(false);
    const [storyCatalogLoading, setStoryCatalogLoading] = useState(false);
    const [storyCatalogError, setStoryCatalogError] = useState('');
    const [storyAiLoading, setStoryAiLoading] = useState(false);
    const [storyPostHtml, setStoryPostHtml] = useState('');
    const [storySearchQuery, setStorySearchQuery] = useState('');
    const [storyShowResults, setStoryShowResults] = useState(false);
    const [storyPreviewMode, setStoryPreviewMode] = useState<'preview' | 'html' | 'edit'>('preview');
    const [storyEditHtml, setStoryEditHtml] = useState('');

    const showNotification = (msg: string) => {
        setToast({message: msg, show: true});
        setTimeout(() => setToast({message: "", show: false}), 3000);
    };

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

                // 5. Fetch Local Items
                const localRaw = localStorage.getItem('lyric_studio_drafts');
                const local = localRaw ? JSON.parse(localRaw) : [];
                const localItems: LyricItem[] = local.map((l: any, i: number) => ({
                    id: `local-${i}`,
                    title: l.name,
                    artist: l.artist || 'Dios Mas Gym',
                    content: l.content,
                    status: 'LOCAL',
                    date: l.date
                }));

                setLyrics([...localItems, ...sheetItems, ...draftItems, ...publishedItems]);
            } catch (e) {
                console.error("Error loading lyrics", e);
            } finally {
                setLoading(false);
            }
        };
        loadAllLyrics();
    }, []);

    const stripHtml = (html: string) => {
        if (typeof document === 'undefined') return html.replace(/<[^>]*>?/gm, '');
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    const cleanLyrics = (text: string) => {
        return text
            .replace(/\[.*?\]/g, '') // Remove [Verse], [Chorus], etc.
            .replace(/\n{3,}/g, '\n\n') // Normalize spacing
            .trim();
    };

    const getSignature = (lyric: LyricItem | null) => lyric ? `${lyric.title}|${lyric.artist}|${lyric.content}` : '';

    const lyricsStats = {
        total: lyrics.length,
        live: lyrics.filter(l => l.status === 'LIVE').length,
        draft: lyrics.filter(l => l.status === 'DRAFT').length,
        cloud: lyrics.filter(l => l.status === 'CLOUD').length,
        local: lyrics.filter(l => l.status === 'LOCAL').length,
        unsynced: lyrics.filter(l => l.status === 'LOCAL').length
    };

    const duplicateTitles = lyrics.reduce((acc, lyric) => {
        const key = lyric.title.trim().toLowerCase();
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const filteredLyrics = lyrics
        .filter(l => {
            const term = searchTerm.toLowerCase();
            const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
            const matchesSearch = !term ||
                l.title.toLowerCase().includes(term) ||
                l.artist.toLowerCase().includes(term) ||
                l.status.toLowerCase().includes(term) ||
                stripHtml(l.content).toLowerCase().includes(term);
            return matchesStatus && matchesSearch;
        })
        .sort((a, b) => {
            if (sortMode === 'title') return a.title.localeCompare(b.title);
            if (sortMode === 'artist') return a.artist.localeCompare(b.artist);
            if (sortMode === 'status') return a.status.localeCompare(b.status);
            return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        });

    const selectedText = stripHtml(selectedLyric?.content || '');
    const selectedMetrics = {
        lines: selectedText.split('\n').filter(line => line.trim()).length,
        words: selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0,
        estimatedMinutes: Math.max(1, Math.ceil((selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0) / 150)),
        duplicate: selectedLyric ? duplicateTitles[selectedLyric.title.trim().toLowerCase()] > 1 : false
    };
    const hasUnsavedChanges = !!selectedLyric && getSignature(selectedLyric) !== savedSignature;

    const selectLyric = (lyric: LyricItem) => {
        setSelectedLyric(lyric);
        setSavedSignature(getSignature(lyric));
        setPreviewMode(false);
    };

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
        
        // Auto-sync to cloud if available
        if (sheetsSyncUrl) {
            handleSaveToSheets();
        }

        // Update list if it's a new local one
        if (selectedLyric.status !== 'LOCAL') {
             const newItem: LyricItem = { ...selectedLyric, id: `local-${Date.now()}`, status: 'LOCAL' };
             setLyrics([newItem, ...lyrics]);
        }

        setTimeout(() => {
            setIsSaving(false);
            setSavedSignature(getSignature(selectedLyric));
            showNotification("✅ Guardado en Borradores Locales");
        }, 500);
    };

    const handleSaveToSheets = async () => {
        if (!selectedLyric || !sheetsSyncUrl) return;
        setIsSaving(true);
        try {
            // Usamos text/plain para evitar problemas de CORS preflight con Apps Script
            // El script recibirá el JSON string en e.postData.contents
            const queryString = new URLSearchParams({
                action: 'save',
                secret: SYNC_SECRET,
                title: selectedLyric.title,
                artist: selectedLyric.artist,
                date: new Date().toISOString()
                // Content is not included in query string to avoid length limits
            }).toString();
            await fetch(`${sheetsSyncUrl}${sheetsSyncUrl.includes('?') ? '&' : '?'}${queryString}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save',
                    secret: SYNC_SECRET,
                    title: selectedLyric.title,
                    artist: selectedLyric.artist,
                    content: selectedLyric.content,
                    date: new Date().toISOString()
                })
            });
            
            showNotification("✅ Sincronizado con Google Sheets");
            setSavedSignature(getSignature(selectedLyric));
            
            // Actualizar estado local para reflejar que ahora es 'CLOUD'
            if (selectedLyric.status !== 'CLOUD') {
                const newItem: LyricItem = { ...selectedLyric, id: `sheet-${Date.now()}`, status: 'CLOUD' };
                setLyrics(prev => [newItem, ...prev.filter(l => l.id !== selectedLyric.id)]);
                setSelectedLyric(newItem);
            }
        } catch (e: any) {
            showNotification("❌ Error Sheets: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveToBloggerCloud = async () => {
        if (!selectedLyric || !sheetsSyncUrl) return;
        setIsSaving(true);
        try {
            const queryString = new URLSearchParams({
                action: 'blogger',
                secret: SYNC_SECRET,
                title: selectedLyric.title,
                artist: selectedLyric.artist,
                date: new Date().toISOString()
            }).toString();
            await fetch(`${sheetsSyncUrl}${sheetsSyncUrl.includes('?') ? '&' : '?'}${queryString}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'blogger',
                    secret: SYNC_SECRET,
                    title: selectedLyric.title,
                    artist: selectedLyric.artist,
                    content: selectedLyric.content,
                    date: new Date().toISOString()
                })
            });
            showNotification("🚀 [V3.6] ¡CONECTADO A LA NUBE!\nBorrador enviado a Blogger.");
        } catch (e: any) {
            showNotification("❌ Error: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };



    const handleSyncAllLocales = async () => {
        const localDrafts = lyrics.filter(l => l.status === 'LOCAL');
        if (localDrafts.length === 0) {
            showNotification("No hay borradores locales.");
            return;
        }

        if (!sheetsSyncUrl) {
            showNotification("Configura Cloud Sync primero.");
            setShowSheetsConfig(true);
            return;
        }

        if (!confirm(`¿Quieres subir ${localDrafts.length} borradores locales a la nube (Blogger Cloud)?`)) return;

        setIsExporting(true);
        let successCount = 0;
        for (const lyric of localDrafts) {
            try {
                const queryString = new URLSearchParams({
                    action: 'blogger',
                    secret: SYNC_SECRET,
                    title: lyric.title,
                    artist: lyric.artist,
                    date: lyric.date || new Date().toISOString()
                }).toString();
                const res = await fetch(`${sheetsSyncUrl}${sheetsSyncUrl.includes('?') ? '&' : '?'}${queryString}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'blogger',
                        secret: SYNC_SECRET,
                        title: lyric.title,
                        artist: lyric.artist,
                        content: lyric.content,
                        date: lyric.date || new Date().toISOString()
                    })
                });
                successCount++;
            } catch (e) {
                console.error(`Error syncing ${lyric.title}`, e);
            }
        }
        setIsExporting(false);
        showNotification(`✅ Sincronización completada: ${successCount} letras.`);
    };

    const goToStudio = () => {
        if (!selectedLyric) return;
        navigate('/admin/lyric-studio', { 
            state: { 
                initialLyrics: stripHtml(selectedLyric.content) 
            } 
        });
    };

    const copySelectedLyric = async () => {
        if (!selectedLyric) return;
        await navigator.clipboard.writeText(selectedText);
        showNotification("Letra copiada al portapapeles.");
    };

    const exportSelectedLyric = () => {
        if (!selectedLyric) return;
        const blob = new Blob([selectedText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedLyric.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'letra'}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const goToCleaner = () => {
        if (!selectedLyric) return;
        navigate('/admin/lyric-cleaner', { state: { initialLyrics: selectedText } });
    };

    const openStoryBuilder = async () => {
        if (!selectedLyric) return;
        setShowStoryBuilder(true);
        setStoryTitle(selectedLyric.title);
        setStorySongId('');
        setStorySearchQuery('');
        setStoryShowResults(false);
        setStoryGenerated(false);
        setStoryPostHtml('');
        setStoryCatalogError('');
        const savedThumb = localStorage.getItem('last_generated_promo') || '';
        setStoryThumbnail(savedThumb);
        if (storyCatalog.length === 0) {
            setStoryCatalogLoading(true);
            try {
                const [dm, j6] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                setStoryCatalog([...dm, ...j6]);
                setStoryCatalogLoading(false);
            } catch (e) {
                console.error('Error loading catalog for story', e);
                setStoryCatalogError('No se pudo cargar el catálogo. Verifica tu conexión.');
                setStoryCatalogLoading(false);
            }
        }
    };

    const getSmartLink = (songId: string) => {
        if (!songId) return '';
        const song = storyCatalog.find(s => s.id === songId);
        if (!song) return '';
        return `${window.location.origin}/#/link/${song.id}`;
    };

    const handleStorySongSelect = (songId: string) => {
        setStorySongId(songId);
        const song = storyCatalog.find(s => s.id === songId);
        if (song) {
            if (song.cover) setStoryThumbnail(song.cover);
            setStoryTitle(song.name);
        }
        setStoryShowResults(false);
        setStorySearchQuery(song ? `${song.artist} - ${song.name}` : '');
    };

    const generateStoryPost = async () => {
        if (!selectedLyric || !storyTitle.trim()) return;
        setStoryAiLoading(true);
        try {
            const smartLink = storySongId ? getSmartLink(storySongId) : '';
            const songName = storySongId ? storyCatalog.find(s => s.id === storySongId)?.name : selectedLyric.title;
            const cleanedLyrics = cleanLyrics(selectedText);
            
            const prompt = `Escribe 3 o 4 párrafos de reflexión espiritual para un blog cristiano sobre la canción "${songName}" de ${selectedLyric.artist}. La reflexión debe ser emotiva, conectar con el lector y estar basada en el mensaje de la letra. Importante: NO incluyas título, NO uses markdown ni formato especial, NO incluyas hashtags ni tips de marketing. Solo texto plano con párrafos separados por saltos de línea.

Letra de la canción:
${cleanedLyrics}`;

            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: JSON.stringify({ input: prompt }) })
            });
            const data = await response.json();
            
            const createPremiumHtml = (text: string, lyrics: string) => {
                const paragraphs = text.split(/\n\n+/).map(p => `<p style="margin:0 0 1.5em 0; font-size:19px; line-height:1.8; color:#333; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
                
                const thumbHtml = storyThumbnail
                    ? `<div style="text-align:center; margin:0 0 40px 0; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.15);"><img src="${storyThumbnail}" alt="${storyTitle}" style="max-width:100%; height:auto; display:block; margin:0 auto;" /></div>`
                    : '';
                
                const smartLinkHtml = smartLink
                    ? `<div style="text-align:center; margin:45px 0;">
                        <a href="${smartLink}" style="display:inline-block; background:linear-gradient(135deg, #c5a059 0%, #a68545 100%); color:#fff; padding:18px 45px; font-size:17px; font-weight:900; text-decoration:none; text-transform:uppercase; border-radius:50px; box-shadow:0 8px 20px rgba(197, 160, 89, 0.3); letter-spacing:1px; transition:all 0.3s ease;">
                            <span style="margin-right:10px;">▶</span> Escuchar "${songName}"
                        </a>
                       </div>`
                    : '';

                const lyricContentHtml = lyrics.split('\n').map(line => line.trim() ? line : '<br/>').join('\n');
                
                return `
<div style="max-width:800px; margin:0 auto; padding:20px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#222; background:#fff;">
    <h1 style="font-size:36px; font-weight:900; margin:0 0 30px 0; text-align:center; color:#111; letter-spacing:-1px; line-height:1.1; text-transform:uppercase; font-style:italic;">${storyTitle}</h1>
    
    ${thumbHtml}
    
    <div style="margin-bottom:40px;">
        ${paragraphs}
    </div>

    ${smartLinkHtml}

    <div style="margin-top:60px; padding:40px; background:#f9f9f9; border-radius:24px; border:1px solid #eee; position:relative;">
        <div style="position:absolute; top:-15px; left:40px; background:#c5a059; color:#fff; padding:4px 20px; font-size:12px; font-weight:900; border-radius:20px; text-transform:uppercase; letter-spacing:2px;">Letra Oficial</div>
        <div style="font-family:Georgia, 'Times New Roman', Times, serif; font-size:18px; line-height:1.9; color:#444; text-align:center; white-space:pre-wrap; font-style:italic;">${lyrics}</div>
    </div>
    
    <div style="margin-top:40px; text-align:center; font-size:12px; color:#aaa; text-transform:uppercase; letter-spacing:3px;">
        &copy; ${new Date().getFullYear()} Dios Mas Gym Records
    </div>
</div>`;
            };

            if (data.text) {
                setStoryGenerated(true);
                const bodyText = data.text
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/###?\s*/g, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                const fullHtml = createPremiumHtml(bodyText, cleanedLyrics);
                setStoryPostHtml(fullHtml);
                setStoryEditHtml(fullHtml);
            } else {
                setStoryGenerated(true);
                const fallback = `${storyTitle}\n\nUna canción que toca el corazón y nos recuerda el amor de Dios. Disponible ahora en todas las plataformas.`;
                const fullHtml = createPremiumHtml(fallback, cleanedLyrics);
                setStoryPostHtml(fullHtml);
                setStoryEditHtml(fullHtml);
            }
        } catch (e) {
            showNotification('Error generando la historia.');
        } finally {
            setStoryAiLoading(false);
        }
    };

    const saveStoryAsDraft = async () => {
        if (!selectedLyric || !storyPostHtml) return;
        if (!sheetsSyncUrl) {
            showNotification('Configura Cloud Sync primero.');
            setShowSheetsConfig(true);
            return;
        }
        setIsSaving(true);
        try {
            await fetch(sheetsSyncUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'blogger',
                    secret: SYNC_SECRET,
                    title: storyTitle,
                    artist: selectedLyric.artist,
                    content: storyPostHtml,
                    date: new Date().toISOString()
                })
            });
            showNotification('Historia guardada como borrador en Blogger Cloud.');
            setShowStoryBuilder(false);
        } catch (e: any) {
            showNotification('Error: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const copyStoryHtml = () => {
        if (!storyEditHtml) return;
        navigator.clipboard.writeText(storyEditHtml);
        showNotification('HTML del post copiado al portapapeles.');
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
                                <span className="hidden md:inline text-[8px] not-italic text-[#00ffcc]/60 bg-[#00ffcc]/10 px-2 py-0.5 rounded-full ml-3 border border-[#00ffcc]/20">v3.5 - PREMIUM CLOUD</span>
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
                                placeholder="Buscar letra, artista o estado..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-full pl-10 pr-6 py-2 text-xs outline-none focus:border-[#00ffcc]/30 w-full md:w-64"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSyncAllLocales}
                                className="p-2.5 md:px-4 md:py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full transition-all flex items-center gap-2"
                                title="Sincronizar todo a Blogger Cloud"
                            >
                                <i className="fas fa-cloud-arrow-up"></i>
                                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">Sincronizar Todo</span>
                            </button>
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
                                        const newLyric = { id: 'new', title, artist: 'Dios Mas Gym', content: '', status: 'LOCAL' as const, date: new Date().toISOString() };
                                        setSelectedLyric(newLyric);
                                        setSavedSignature(getSignature(newLyric));
                                        setPreviewMode(false);
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

            <div className="px-4 md:px-8 py-4 border-b border-white/5 bg-[#05070a]">
                <div className="max-w-screen-2xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 flex-1">
                        {[
                            ['Total', lyricsStats.total],
                            ['Live', lyricsStats.live],
                            ['Draft', lyricsStats.draft],
                            ['Cloud', lyricsStats.cloud],
                            ['Local', lyricsStats.local],
                            ['Sin sync', lyricsStats.unsynced]
                        ].map(([label, value]) => (
                            <div key={label as string} className="bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3">
                                <p className="text-lg font-serif italic text-white">{value}</p>
                                <p className="text-[7px] font-black uppercase tracking-widest text-white/25">{label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {(['ALL', 'LIVE', 'DRAFT', 'CLOUD', 'LOCAL'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-[#00ffcc] text-black border-[#00ffcc]' : 'bg-white/5 text-white/35 border-white/10 hover:text-white'}`}
                            >
                                {status === 'ALL' ? 'Todas' : status}
                            </button>
                        ))}
                        <select
                            value={sortMode}
                            onChange={e => setSortMode(e.target.value as typeof sortMode)}
                            className="bg-black/40 border border-white/10 rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white/60 outline-none focus:border-[#00ffcc]/40"
                        >
                            <option value="recent">Recientes</option>
                            <option value="title">Título</option>
                            <option value="artist">Artista</option>
                            <option value="status">Estado</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 overflow-hidden h-[calc(100vh-270px)] md:h-[calc(100vh-210px)]">
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
                                    onClick={() => selectLyric(lyric)}
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
                                        {duplicateTitles[lyric.title.trim().toLowerCase()] > 1 && (
                                            <span className="text-[8px] font-black uppercase px-2 py-1 rounded bg-red-500/15 text-red-400">Duplicada</span>
                                        )}
                                        <span className="text-[8px] text-white/20">{new Date(lyric.date).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-sm font-bold truncate">{lyric.title}</h3>
                                    <p className="text-[9px] text-[#00ffcc]/50 font-black uppercase tracking-widest mt-1">{lyric.artist}</p>
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
                                        {hasUnsavedChanges && (
                                            <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-widest shrink-0">
                                                Cambios pendientes
                                            </span>
                                        )}
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
                                     <div className="flex flex-wrap gap-2 mt-4">
                                        {[
                                            ['Líneas', selectedMetrics.lines],
                                            ['Palabras', selectedMetrics.words],
                                            ['Min est.', selectedMetrics.estimatedMinutes],
                                            ['Duplicada', selectedMetrics.duplicate ? 'Sí' : 'No']
                                        ].map(([label, value]) => (
                                            <div key={label as string} className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                                                <p className="text-xs font-bold text-white/80">{value}</p>
                                                <p className="text-[7px] font-black uppercase tracking-widest text-white/20">{label}</p>
                                            </div>
                                        ))}
                                     </div>
                                 </div>
                                 
                                 <div className="flex flex-wrap gap-2 md:gap-3">
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={() => setPreviewMode(!previewMode)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className={`fas ${previewMode ? 'fa-pen' : 'fa-eye'}`}></i> {previewMode ? 'Editar' : 'Vista'}
                                        </button>
                                        <button 
                                            onClick={copySelectedLyric}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-copy"></i> Copiar
                                        </button>
                                    </div>
                                     <div className="flex gap-2 w-full md:w-auto">
                                         {sheetsSyncUrl && (
                                            <button 
                                                onClick={handleSaveToSheets}
                                                disabled={isSaving}
                                                className="flex-1 md:flex-none px-4 py-2 bg-[#c5a059]/10 border border-[#c5a059]/30 text-[#c5a059] text-[9px] font-black uppercase rounded-xl hover:bg-[#c5a059]/20 transition-all flex items-center justify-center gap-2"
                                                title="Sincronizar en Google Sheet"
                                            >
                                                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-cloud'}`}></i> Sheets
                                            </button>
                                        )}
                                        {sheetsSyncUrl && (
                                            <button 
                                                onClick={handleSaveToBloggerCloud}
                                                disabled={isSaving}
                                                className="flex-1 md:flex-none px-6 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[10px] font-black uppercase rounded-xl hover:bg-purple-500/30 transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-3"
                                                title="Publicar en Blogger sin Token"
                                            >
                                                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i> Blogger Cloud
                                            </button>
                                        )}
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
                                         <button 
                                            onClick={goToCleaner}
                                            className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase rounded-xl hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-broom"></i> Limpiar
                                        </button>
                                        <button 
                                            onClick={exportSelectedLyric}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-download"></i> TXT
                                        </button>
                                     </div>
                                  </div>
                                  <button 
                                      onClick={openStoryBuilder}
                                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-2xl hover:from-white hover:to-white transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20"
                                  >
                                      <i className="fas fa-newspaper text-sm"></i> Historia Blogger
                                  </button>
                              </div>
                            {previewMode ? (
                                <div className="flex-1 bg-white/[0.03] p-10 md:p-16 text-white text-lg md:text-2xl leading-[1.8] overflow-y-auto custom-scrollbar whitespace-pre-wrap font-sans font-semibold tracking-tight">
                                    {selectedText || <span className="text-white/10">Sin contenido para previsualizar.</span>}
                                </div>
                            ) : (
                                <textarea 
                                    value={selectedLyric.content}
                                    onChange={e => setSelectedLyric({...selectedLyric, content: e.target.value})}
                                    className="flex-1 bg-white/[0.03] p-10 md:p-16 text-white text-lg md:text-2xl leading-[1.8] outline-none resize-none custom-scrollbar font-sans font-semibold tracking-tight placeholder:text-white/5"
                                    style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
                                    placeholder="Escribe la letra de tu próximo éxito aquí..."
                                ></textarea>
                            )}
                            <div className="p-3 bg-black/40 border-t border-white/5 text-center">
                                <p className="text-[8px] md:text-[9px] uppercase font-black tracking-widest text-white/20">
                                    {hasUnsavedChanges ? 'Guarda para sincronizar los cambios pendientes' : 'Autoguardado disponible en Cloud y Local'}
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



        {/* STORY BUILDER MODAL */}
        {showStoryBuilder && selectedLyric && (
            <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 overflow-y-auto">
                <div className="bg-[#0f111a] border border-white/10 rounded-[2.5rem] w-full max-w-5xl shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar">
                    <button onClick={() => setShowStoryBuilder(false)} className="sticky top-6 z-10 float-right mr-6 mt-6 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                    
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 text-2xl">
                                <i className="fas fa-newspaper"></i>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-1">Historia <span className="text-[#c5a059]">Blogger</span></h2>
                                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-white/20">Genera un post con historia + smart link + letra</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Left Column: Config */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 block">Título del Post</label>
                                    <input 
                                        type="text"
                                        value={storyTitle}
                                        onChange={e => setStoryTitle(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500/40 transition-all"
                                        placeholder="Título de la historia..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 block">Canción Relacionada (para Smart Link)</label>
                                    {storyCatalogLoading ? (
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl text-[10px] text-white/40">
                                            <i className="fas fa-spinner fa-spin"></i> Cargando catálogo...
                                        </div>
                                    ) : storyCatalogError ? (
                                        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] text-red-400">
                                            <i className="fas fa-exclamation-triangle"></i> {storyCatalogError}
                                            <button
                                                onClick={async () => {
                                                    setStoryCatalogError('');
                                                    setStoryCatalogLoading(true);
                                                    try {
                                                        const [dm, j6] = await Promise.all([
                                                            fetchMusicCatalog('diosmasgym'),
                                                            fetchMusicCatalog('juan614')
                                                        ]);
                                                        setStoryCatalog([...dm, ...j6]);
                                                        setStoryCatalogLoading(false);
                                                    } catch (e) {
                                                        setStoryCatalogError('No se pudo cargar el catálogo. Verifica tu conexión.');
                                                        setStoryCatalogLoading(false);
                                                    }
                                                }}
                                                className="ml-auto px-3 py-1 bg-white/10 rounded-full text-white/70 hover:bg-white/20 transition-all"
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    ) : storyCatalog.length === 0 ? (
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl text-[10px] text-white/40">
                                            <i className="fas fa-info-circle"></i> Catálogo vacío
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                                                <input
                                                    type="text"
                                                    value={storySearchQuery}
                                                    onChange={e => {
                                                        setStorySearchQuery(e.target.value);
                                                        setStoryShowResults(true);
                                                        if (!e.target.value) {
                                                            setStorySongId('');
                                                        }
                                                    }}
                                                    onFocus={() => storySearchQuery && setStoryShowResults(true)}
                                                    placeholder="Buscar canción o artista..."
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-sm outline-none focus:border-amber-500/40 transition-all"
                                                />
                                                {storySongId && (
                                                    <button
                                                        onClick={() => {
                                                            setStorySongId('');
                                                            setStorySearchQuery('');
                                                            setStoryShowResults(false);
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                )}
                                            </div>
                                            {storyShowResults && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f111a] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                                    {storyCatalog
                                                        .filter(song => {
                                                            const q = storySearchQuery.toLowerCase();
                                                            return !q || song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
                                                        })
                                                        .slice(0, 8)
                                                        .map(song => (
                                                            <button
                                                                key={song.id}
                                                                onClick={() => handleStorySongSelect(song.id)}
                                                                className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-all text-left ${storySongId === song.id ? 'bg-amber-500/10' : ''}`}
                                                            >
                                                                {song.cover && (
                                                                    <img src={song.cover} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] font-bold text-white/90 truncate">{song.name}</p>
                                                                    <p className="text-[9px] text-amber-400/70 truncate">{song.artist}</p>
                                                                </div>
                                                                {storySongId === song.id && (
                                                                    <i className="fas fa-check text-amber-400 text-xs"></i>
                                                                )}
                                                            </button>
                                                        ))}
                                                    {storyCatalog.filter(song => {
                                                        const q = storySearchQuery.toLowerCase();
                                                        return !q || song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
                                                    }).length === 0 && (
                                                        <div className="px-5 py-8 text-center text-[10px] text-white/30">Sin resultados</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {storySongId && (
                                        <p className="mt-2 text-[9px] text-amber-400/60 break-all">
                                            <i className="fas fa-link mr-1"></i> {getSmartLink(storySongId)}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3 block">Miniatura del Post</label>
                                    {storyThumbnail ? (
                                        <div className="relative group">
                                            <img src={storyThumbnail} alt="Thumbnail" className="w-full h-40 object-cover rounded-2xl border border-white/10" />
                                            <button
                                                onClick={() => {
                                                    const url = prompt('URL de la miniatura (dejar vacío para usar portada de la canción):');
                                                    if (url) setStoryThumbnail(url);
                                                    else if (storySongId) {
                                                        const s = storyCatalog.find(x => x.id === storySongId);
                                                        if (s?.cover) setStoryThumbnail(s.cover);
                                                    }
                                                }}
                                                className="absolute top-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur rounded-full text-[8px] font-black uppercase tracking-widest text-white/80 hover:text-white border border-white/10"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const url = prompt('Pega URL de la imagen para el post:');
                                                if (url) setStoryThumbnail(url);
                                            }}
                                            className="w-full h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-white/30 hover:border-amber-500/40 hover:text-amber-400 transition-all"
                                        >
                                            <i className="fas fa-image text-2xl"></i>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Agregar Miniatura</span>
                                        </button>
                                    )}
                                    <p className="mt-2 text-[8px] text-white/20">
                                        Usa Studio PRO Generator v4.3.1 para crear una imagen y automáticamente aparecerá aquí.
                                    </p>
                                </div>
                            </div>

                            {/* Right Column: Preview & Actions */}
                            <div className="space-y-6">
                                {!storyGenerated ? (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl mb-6">
                                            <i className="fas fa-wand-magic-sparkles"></i>
                                        </div>
                                        <p className="text-sm text-white/60 mb-2">Genera la historia con IA</p>
                                        <p className="text-[9px] text-white/30 max-w-xs">Completa los campos de la izquierda y presiona "Generar Historia".</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2 mb-4">
                                            <button
                                                onClick={() => setStoryPreviewMode('preview')}
                                                className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${storyPreviewMode === 'preview' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
                                            >
                                                <i className="fas fa-eye mr-1"></i> Vista Previa
                                            </button>
                                            <button
                                                onClick={() => setStoryPreviewMode('html')}
                                                className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${storyPreviewMode === 'html' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
                                            >
                                                <i className="fas fa-code mr-1"></i> HTML
                                            </button>
                                            <button
                                                onClick={() => setStoryPreviewMode('edit')}
                                                className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${storyPreviewMode === 'edit' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
                                            >
                                                <i className="fas fa-pen mr-1"></i> Editar
                                            </button>
                                        </div>
                                        {storyPreviewMode === 'preview' && (
                                            <div className="bg-white border border-gray-200 rounded-2xl p-8 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                                                <div className="text-black" style={{ fontSize: '16px', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: storyPostHtml }} />
                                            </div>
                                        )}
                                        {storyPreviewMode === 'html' && (
                                            <div className="bg-[#1a1b2e] border border-white/10 rounded-2xl p-6 min-h-[300px] max-h-[500px] overflow-y-auto custom-scrollbar">
                                                <pre className="text-[11px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap">{storyPostHtml}</pre>
                                            </div>
                                        )}
                                        {storyPreviewMode === 'edit' && (
                                            <textarea
                                                value={storyEditHtml}
                                                onChange={e => {
                                                    setStoryEditHtml(e.target.value);
                                                    setStoryPostHtml(e.target.value);
                                                }}
                                                className="w-full bg-[#1a1b2e] border border-white/10 rounded-2xl p-6 min-h-[300px] max-h-[500px] text-[11px] text-green-400 font-mono leading-relaxed outline-none resize-y custom-scrollbar"
                                                spellCheck={false}
                                            />
                                        )}
                                    </>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={generateStoryPost}
                                        disabled={storyAiLoading || !storyTitle.trim()}
                                        className="flex-1 px-6 py-4 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all disabled:opacity-30 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-3"
                                    >
                                        {storyAiLoading ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                                        ) : (
                                            <><i className="fas fa-wand-magic-sparkles"></i> Generar Historia</>
                                        )}
                                    </button>
                                    {storyGenerated && (
                                        <>
                                            <button
                                                onClick={copyStoryHtml}
                                                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                            >
                                                <i className="fas fa-copy"></i> Copiar HTML
                                            </button>
                                            <button
                                                onClick={saveStoryAsDraft}
                                                disabled={isSaving}
                                                className="flex-1 px-6 py-4 bg-purple-500/20 border border-purple-500/40 text-purple-400 text-[9px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-500/30 transition-all shadow-lg shadow-purple-500/10 flex items-center justify-center gap-3"
                                            >
                                                <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i> Borrador Cloud
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toast.show && (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-in">
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4">
                    <div className="w-8 h-8 bg-[#00ffcc]/10 rounded-full flex items-center justify-center text-[#00ffcc]">
                        <i className="fas fa-check text-xs"></i>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 whitespace-pre-line">
                        {toast.message}
                    </p>
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
