import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const SocialPostGenerator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState<any>(null);
    const [copiedBlog, setCopiedBlog] = useState(false);
    const [copiedSocial, setCopiedSocial] = useState(false);
    const [copiedTags, setCopiedTags] = useState(false);
    const [isSavingBlogger, setIsSavingBlogger] = useState(false);
    const [bloggerStatus, setBloggerStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [selectedSongId, setSelectedSongId] = useState('');
    const [searchingLyrics, setSearchingLyrics] = useState(false);
    const [songSearch, setSongSearch] = useState('');

    const VERSION = "v1.5.0 Gemini-Flash (Cloud Integrated)";

    const [formData, setFormData] = useState({
        input: '',
        lyrics: '',
        platform: 'Instagram/TikTok',
        goal: 'Inspirar y Viralizar',
        tone: 'Épico y Motivador'
    });

    useEffect(() => {
        const loadCatalog = async () => {
            setCatalogLoading(true);
            try {
                const [diosmasgym, juan614] = await Promise.all([
                    fetchMusicCatalog('diosmasgym'),
                    fetchMusicCatalog('juan614')
                ]);
                const fullCatalog = [...diosmasgym, ...juan614];
                setCatalog(fullCatalog);

                // Auto-selección desde el Asistente
                const incomingSong = location.state?.song as MusicItem;
                if (incomingSong) {
                    // Esperamos un pequeño delay para asegurar que el catálogo esté listo para handleSongSelect
                    setTimeout(() => {
                        handleSongSelect(incomingSong.id, fullCatalog);
                    }, 100);
                }
            } catch (err) {
                console.error('Error loading music catalog:', err);
            } finally {
                setCatalogLoading(false);
            }
        };
        loadCatalog();
    }, [location.state]);

    const handleSongSelect = async (songId: string, customCatalog?: MusicItem[]) => {
        setSelectedSongId(songId);
        const pool = customCatalog || catalog;
        const song = pool.find(item => item.id === songId);
        if (!song) return;

        setFormData(prev => ({
            ...prev,
            input: `Crear una promo para la canción "${song.name}" de ${song.artist}. Link principal: ${song.url}. Tipo: ${song.type || 'lanzamiento musical'}. Fecha: ${song.date || 'disponible ahora'}.`,
            lyrics: '', // Reset first
            platform: 'Instagram/TikTok',
            goal: 'Promocionar canción',
            tone: 'Épico y Motivador'
        }));

        setSearchingLyrics(true);
        try {
            const response = await fetch('/api/search-lyrics', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({ name: song.name, artist: song.artist })
            });
            const data = await response.json();
            if (response.ok && data.lyrics && data.lyrics !== "LETRA_NO_ENCONTRADA") {
                setFormData(prev => ({ ...prev, lyrics: data.lyrics }));
            }
        } catch (err) {
            console.warn("No se pudo buscar la letra automáticamente en internet:", err);
        } finally {
            setSearchingLyrics(false);
        }
    };

    const parseResult = (text: string) => {
        let blog = '';
        let social = '';
        let hashtags = '';

        const blogMatch = text.match(/🌟?\s*ARTÍCULO DE BLOG[\s\S]*?(?=📱?\s*PUBLICACIÓN|$)/i);
        const socialMatch = text.match(/📱?\s*PUBLICACIÓN[\s\S]*?(?=🏷️?\s*ESTRATEGIA|🏷️?\s*HASHTAGS|$)/i);
        const hashtagsMatch = text.match(/(?:🏷️?\s*ESTRATEGIA DE HASHTAGS|🏷️?\s*HASHTAGS)[\s\S]*/i);

        if (blogMatch) {
            blog = blogMatch[0]
                .replace(/🌟?\s*ARTÍCULO DE BLOG.*?\n/, '')
                .trim();
        }
        if (socialMatch) {
            social = socialMatch[0]
                .replace(/📱?\s*PUBLICACIÓN.*?\n/, '')
                .trim();
        }
        if (hashtagsMatch) {
            hashtags = hashtagsMatch[0]
                .replace(/(?:🏷️?\s*ESTRATEGIA DE HASHTAGS|🏷️?\s*HASHTAGS).*?\n/, '')
                .trim();
        }

        if (!blog && !social) {
            return { blog: text, social: '', hashtags: '' };
        }

        return { blog, social, hashtags };
    };

    const cleanHashtagsForBlogger = (hashtagsText: string) => {
        if (!hashtagsText) return '';
        return hashtagsText
            .split(/[\s,]+/)
            .map(tag => tag.replace(/#/g, '').trim())
            .filter(tag => tag.length > 0)
            .join(', ');
    };

    const handleUploadToBlogger = async (blogText: string, hashtagsText = '') => {
        const song = catalog.find(item => item.id === selectedSongId);
        if (!song) return;

        setIsSavingBlogger(true);
        setBloggerStatus('idle');

        try {
            const sheetsSyncUrl = localStorage.getItem('lyrics_sheets_sync_url') || "/api/sheet-proxy?script=lyrics";
            const SYNC_SECRET = "DMG_SYNC_2026";
            const smartLink = `${window.location.origin}/#/link/${song.id}`;

            const paragraphs = blogText
                .split(/\n\n+/)
                .map(p => `<p style="margin:0 0 1.5em 0; font-size:19px; line-height:1.8; color:#333; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p.replace(/\n/g, '<br/>')}</p>`)
                .join('\n');
            
            const thumbHtml = song.cover
                ? `<div style="text-align:center; margin:0 0 40px 0; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.15);"><img src="${song.cover}" alt="${song.name}" style="max-width:100%; height:auto; display:block; margin:0 auto;" /></div>`
                : '';
            
            const smartLinkHtml = `<div style="text-align:center; margin:45px 0;">
                <a href="${smartLink}" style="display:inline-block; background:linear-gradient(135deg, #c5a059 0%, #a68545 100%); color:#fff; padding:18px 45px; font-size:17px; font-weight:900; text-decoration:none; text-transform:uppercase; border-radius:50px; box-shadow:0 8px 20px rgba(197, 160, 89, 0.3); letter-spacing:1px; transition:all 0.3s ease;">
                    <span style="margin-right:10px;">▶</span> Escuchar "${song.name}"
                </a>
               </div>`;

            const fullHtml = `
<div style="max-width:800px; margin:0 auto; padding:20px; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#222; background:#fff;">
    <h1 style="font-size:36px; font-weight:900; margin:0 0 30px 0; text-align:center; color:#111; letter-spacing:-1px; line-height:1.1; text-transform:uppercase; font-style:italic;">${song.name} - ${song.artist}</h1>
    
    ${thumbHtml}
    
    <div style="margin-bottom:40px;">
        ${paragraphs}
    </div>

    ${smartLinkHtml}
    
    <div style="margin-top:40px; text-align:center; font-size:12px; color:#aaa; text-transform:uppercase; letter-spacing:3px;">
        &copy; ${new Date().getFullYear()} Dios Mas Gym Records
    </div>
</div>`;

            const aiLabels = hashtagsText
                ? hashtagsText.split(/[\s,]+/).map(tag => tag.replace(/#/g, '').trim()).filter(Boolean)
                : [];
            const autoLabels = [song.artist, "Reflexiones", "Música", ...aiLabels]
                .filter((v, i, a) => v && a.indexOf(v) === i); // Unique labels

            const res = await fetch(sheetsSyncUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'blogger',
                    secret: SYNC_SECRET,
                    title: `Reflexión: ${song.name}`,
                    artist: song.artist,
                    content: fullHtml,
                    date: new Date().toISOString(),
                    labels: autoLabels,
                    tags: autoLabels,
                    labelsString: autoLabels.join(', ')
                })
            });

            if (res.ok) {
                setBloggerStatus('success');
                alert("🚀 ¡Borrador enviado a Blogger Cloud con éxito!");
            } else {
                setBloggerStatus('error');
                alert("❌ Error al subir borrador a Blogger Cloud.");
            }
        } catch (e: any) {
            console.error(e);
            setBloggerStatus('error');
            alert("❌ Error: " + e.message);
        } finally {
            setIsSavingBlogger(false);
        }
    };

    const handleGenerate = async () => {
        if (!formData.input.trim()) return;

        // Limpiar etiquetas de Suno/IA [Verse], [Chorus], etc.
        const cleanInput = formData.input.replace(/\[[^[\]]*\]/g, "").trim();
        
        // Auto-construir SmartLink si hay canción
        const song = catalog.find(item => item.id === selectedSongId);
        const smartLink = song ? `${window.location.origin}/#/link/${song.id}` : '';
        
        let finalInput = cleanInput;
        if (smartLink) {
            finalInput += `\n\n[INSTRUCCIÓN CRÍTICA DE FORMATO]: Debes incluir el enlace exacto de SmartLink de la canción: ${smartLink} tanto de forma natural al final del ARTÍCULO DE BLOG como de forma directa y atractiva al final de la PUBLICACIÓN PARA REDES SOCIALES.`;
        }

        const cleanFormData = { ...formData, input: finalInput };

        setLoading(true);
        setError(null);
        setBloggerStatus('idle');
        try {
            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({ content: JSON.stringify(cleanFormData) })
            });

            const data = await response.json();
            
            if (!response.ok) {
                setError(data); // Store the whole error object for inspection
                setLoading(false);
                return;
            }

            setResult(data.text);
            setStep(2);
        } catch (err: any) {
            setError({ error: 'Error de red', details: err.message });
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep(1);
        setResult('');
        setError(null);
        setBloggerStatus('idle');
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8 font-['Poppins']">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
                            <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                                <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                            </button>
                            <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">Post Viral <span className="text-[#c5a059]">Generator</span></h1>
                        </div>
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full">{VERSION}</span>
                    </div>
                </div>

                {step === 1 ? (
                    <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                            <div className="col-span-2 bg-[#05070a] border border-[#c5a059]/20 rounded-2xl p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-2">Promo automática desde canción</label>
                                        <p className="text-white/35 text-xs">Selecciona una canción y el generador prepara el brief promocional solo.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setCatalogLoading(true);
                                            try {
                                                const [diosmasgym, juan614] = await Promise.all([
                                                    fetchMusicCatalog('diosmasgym', true),
                                                    fetchMusicCatalog('juan614', true)
                                                ]);
                                                setCatalog([...diosmasgym, ...juan614]);
                                            } finally {
                                                setCatalogLoading(false);
                                            }
                                        }}
                                        disabled={catalogLoading}
                                        className="text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:text-white transition-all disabled:opacity-40"
                                    >
                                        <i className={`fas ${catalogLoading ? 'fa-spinner fa-spin' : 'fa-rotate'} mr-2`}></i>
                                        Actualizar catálogo
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    value={songSearch}
                                    onChange={e => setSongSearch(e.target.value)}
                                    placeholder="Buscar canción..."
                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-5 py-3 text-white text-xs focus:border-[#c5a059]/50 outline-none mb-2"
                                />
                                <select
                                    value={selectedSongId}
                                    onChange={(e) => handleSongSelect(e.target.value)}
                                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl p-5 text-white focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">{catalogLoading ? 'Cargando canciones...' : 'Elegir canción del catálogo'}</option>
                                    {catalog
                                        .filter(song => !songSearch || `${song.artist} - ${song.name}`.toLowerCase().includes(songSearch.toLowerCase()))
                                        .map(song => <option key={song.id} value={song.id}>{song.artist} - {song.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">1. Contenido Base / Promo</label>
                                <textarea 
                                    value={formData.input} onChange={(e) => setFormData({...formData, input: e.target.value})}
                                    placeholder="Detalles sobre el lanzamiento..." className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white min-h-[100px] focus:border-[#c5a059]/50 outline-none transition-all resize-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">Letra de la Canción (Opcional pero Recomendado)</label>
                                    {searchingLyrics && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-[#c5a059] animate-pulse flex items-center gap-2">
                                            <i className="fas fa-spinner fa-spin animate-spin"></i> Buscando letra en internet...
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/35 text-xs mb-3">Si la letra ya está en internet se cargará automáticamente. Si no, puedes pegarla aquí.</p>
                                <textarea 
                                    value={formData.lyrics} onChange={(e) => setFormData({...formData, lyrics: e.target.value})}
                                    placeholder={searchingLyrics ? "🔍 Buscando la letra en internet automáticamente con IA..." : "Pega la letra de la canción aquí..."}
                                    disabled={searchingLyrics}
                                    className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white min-h-[150px] focus:border-[#c5a059]/50 outline-none transition-all resize-none disabled:opacity-55"
                                />
                            </div>
                            {['plataforma', 'objetivo', 'tono'].map((key, idx) => (
                                <div key={key}>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">{idx + 2}. {key.toUpperCase()}</label>
                                    <select 
                                        className="w-full bg-[#05070a] border border-white/10 rounded-xl p-6 text-white focus:border-[#c5a059]/50 outline-none appearance-none cursor-pointer"
                                        onChange={(e) => setFormData({...formData, [key === 'plataforma' ? 'platform' : key === 'objetivo' ? 'goal' : 'tone']: e.target.value})}
                                    >
                                        {key === 'plataforma' && ['Instagram/TikTok', 'Facebook', 'Twitter/X', 'YouTube Shorts'].map(o => <option key={o}>{o}</option>)}
                                        {key === 'objetivo' && ['Inspirar y Viralizar', 'Promocionar canción', 'Controversia positiva', 'Testimonio'].map(o => <option key={o}>{o}</option>)}
                                        {key === 'tono' && ['Épico y Motivador', 'Reflexivo y Espiritual', 'Directo y Agresivo', 'Amigable'].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleGenerate} disabled={loading || !formData.input.trim()}
                            className="w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl"
                        >
                            {loading ? 'ANALIZANDO...' : 'GENERAR POST'}
                        </button>

                        {error && (
                            <div className="mt-10 p-8 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <h3 className="text-red-500 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-3">
                                    <i className="fas fa-bug"></i> DETALLES DEL ERROR
                                </h3>
                                <pre className="text-[11px] text-red-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                                    {JSON.stringify(error, null, 2)}
                                </pre>
                                <div className="mt-8 text-[10px] text-white/40 leading-relaxed italic">
                                    * Este error viene directamente de Google. Verifica tu API Key en Vercel.
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Control Bar */}
                        <div className="flex justify-between items-center bg-[#0f111a] border border-white/5 p-6 rounded-2xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">Resultado del Análisis</span>
                            <button onClick={reset} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all bg-white/5 px-6 py-3 rounded-xl border border-white/10">
                                <i className="fas fa-redo"></i> Generar Nuevo
                            </button>
                        </div>

                        {(() => {
                            const parsed = parseResult(result);
                            return (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
                                    {/* 1. BLOG ARTICLE CARD */}
                                    <div className="bg-[#0f111a] border border-white/5 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#c5a059]/5 rounded-full blur-3xl pointer-events-none"></div>
                                        <div>
                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2">
                                                    <i className="fas fa-newspaper"></i> 🌟 Artículo para Blog
                                                </h3>
                                                <div className="flex gap-4">
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(parsed.blog);
                                                            setCopiedBlog(true);
                                                            setTimeout(() => setCopiedBlog(false), 2000);
                                                        }} 
                                                        className={`text-[9px] font-black uppercase tracking-widest transition-all ${copiedBlog ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}
                                                    >
                                                        <i className={`fas ${copiedBlog ? 'fa-check' : 'fa-copy'} mr-1`}></i> {copiedBlog ? 'Copiado' : 'Copiar'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm min-h-[250px] font-light max-h-[350px] overflow-y-auto pr-2 custom-scrollbar mb-6">{parsed.blog}</div>
                                            {parsed.hashtags && (
                                                <div className="mt-6 pt-4 border-t border-white/5 bg-black/20 p-4 rounded-xl border border-white/5">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                                            <i className="fas fa-tags text-[#c5a059]"></i> Etiquetas Blogger (Sin # y con comas)
                                                        </span>
                                                        <button 
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(cleanHashtagsForBlogger(parsed.hashtags));
                                                                setCopiedTags(true);
                                                                setTimeout(() => setCopiedTags(false), 2000);
                                                            }} 
                                                            className={`text-[8px] font-black uppercase tracking-widest transition-all ${copiedTags ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}
                                                        >
                                                            <i className={`fas ${copiedTags ? 'fa-check' : 'fa-copy'} mr-1`}></i> {copiedTags ? 'Copiado' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                    <p className="text-white/60 text-xs font-mono select-all truncate">{cleanHashtagsForBlogger(parsed.hashtags)}</p>
                                                </div>
                                            )}
                                        </div>
                                        {selectedSongId && (
                                            <div className="mt-8 pt-6 border-t border-white/5">
                                                <button 
                                                    onClick={() => handleUploadToBlogger(parsed.blog, parsed.hashtags)}
                                                    disabled={isSavingBlogger}
                                                    className={`w-full py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                                        bloggerStatus === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-400' :
                                                        bloggerStatus === 'error' ? 'bg-red-500/20 border border-red-500/40 text-red-400' :
                                                        'bg-[#c5a059] hover:bg-white text-black'
                                                    }`}
                                                >
                                                    <i className={`fas ${isSavingBlogger ? 'fa-spinner fa-spin' : bloggerStatus === 'success' ? 'fa-check' : 'fa-cloud-arrow-up'}`}></i>
                                                    {isSavingBlogger ? 'Enviando a la Nube...' : bloggerStatus === 'success' ? '¡Enviado a Blogger Cloud!' : bloggerStatus === 'error' ? 'Reintentar Subida' : 'Subir Borrador a Blogger Cloud'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. SOCIAL MEDIA CARD */}
                                    <div className="bg-[#0f111a] border border-white/5 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                        <div>
                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                                <h3 className="text-sm font-black uppercase tracking-widest text-[#c5a059] flex items-center gap-2">
                                                    <i className="fab fa-instagram"></i> 📱 Redes (IG/TikTok)
                                                </h3>
                                                <button 
                                                    onClick={() => {
                                                        const fullSocialText = `${parsed.social}\n\n${parsed.hashtags}`;
                                                        navigator.clipboard.writeText(fullSocialText);
                                                        setCopiedSocial(true);
                                                        setTimeout(() => setCopiedSocial(false), 2000);
                                                    }} 
                                                    className={`text-[9px] font-black uppercase tracking-widest transition-all ${copiedSocial ? 'text-green-500' : 'text-[#c5a059] hover:text-white'}`}
                                                >
                                                    <i className={`fas ${copiedSocial ? 'fa-check' : 'fa-copy'} mr-1`}></i> {copiedSocial ? 'Copiado' : 'Copiar Copy'}
                                                </button>
                                            </div>
                                            <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                                <div className="text-white/80 leading-relaxed whitespace-pre-wrap text-sm font-light">{parsed.social}</div>
                                                {parsed.hashtags && (
                                                    <div className="pt-4 border-t border-white/5">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Hashtags Estratégicos</p>
                                                        <p className="text-[#c5a059] text-xs leading-relaxed font-mono">{parsed.hashtags}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SocialPostGenerator;
