import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MusicItem } from '../../types';
import { adminHeaders } from '../../services/adminSync';
import { getCorsFriendlyUrl } from '../../services/imageHelpers';
import { fetchSavedLyrics } from '../../services/musicService';
import { getGeneratedImagesForSong, GeneratedImage } from '../../services/generatedImages';

type Platform = 'ig' | 'tt' | 'wa' | 'fb';
const PLATFORMS: { id: Platform; label: string; icon: string; color: string; upload: string }[] = [
    { id: 'ig', label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C', upload: 'https://www.instagram.com/' },
    { id: 'fb', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2', upload: 'https://www.facebook.com/' },
    { id: 'tt', label: 'TikTok', icon: 'fab fa-tiktok', color: '#ffffff', upload: 'https://www.tiktok.com/upload' },
    { id: 'wa', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', upload: 'https://web.whatsapp.com/' },
];
const isMobileDevice = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

type MetaAccount = { connected: boolean; pageName?: string; igUser?: string; igId?: string; error?: string };
type DirectResult = { ok: boolean; url?: string; error?: string };

// La API de Instagram solo acepta JPG con proporcion entre 4:5 y 1.91:1.
// Si la imagen es mas alta (p. ej. una story 9:16) se centra sobre su propia version difuminada.
const toInstagramJpeg = async (blob: Blob): Promise<string> => {
    const bmp = await createImageBitmap(blob);
    const ratio = bmp.width / bmp.height;
    const target = Math.min(1.91, Math.max(0.8, ratio));
    const W = Math.min(1440, Math.max(1080, bmp.width));
    const H = Math.round(W / target);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (Math.abs(ratio - target) > 0.01) {
        const cover = Math.max(W / bmp.width, H / bmp.height);
        ctx.filter = 'blur(40px) brightness(0.55)';
        ctx.drawImage(bmp, (W - bmp.width * cover) / 2, (H - bmp.height * cover) / 2, bmp.width * cover, bmp.height * cover);
        ctx.filter = 'none';
    }
    const fit = Math.min(W / bmp.width, H / bmp.height);
    ctx.drawImage(bmp, (W - bmp.width * fit) / 2, (H - bmp.height * fit) / 2, bmp.width * fit, bmp.height * fit);
    bmp.close?.();
    return canvas.toDataURL('image/jpeg', 0.9);
};

interface ReleaseData {
    name: string;
    Artista: string;
    releaseDate: string;
}

interface Suggestion {
    song: MusicItem | null;
    reason: string;
    type: 'new_release' | 'recent' | 'rotation' | 'old_gem';
    caption: string;
    tiktokCaption: string;
    whatsappCaption: string;
    hashtags: string;
    releaseName?: string;
}

const PROMOTED_KEY = 'content_assistant_promoted_ids';
const SKIPS_KEY = 'content_assistant_skips_by_day';
const dayKey = () => new Date().toDateString();

const HASHTAG_SETS = {
    new_release: "#estreno #musicanueva #estrenomusical #diosmasgym #juan614 #vivaelrey",
    recent: "#tendencia #viral #musica #reel #tiktokmusic",
    rotation: "#disciplina #gymmotivation #fe #musicaurbana",
    old_gem: "#tbt #clasico #joya #musicaquetoca",
};

const CAPTIONS_BY_TYPE = {
    new_release: (name: string, artist: string, link: string) => ({
        ig: `¡Acaba de salir! 🚀 "${name}" de ${artist}.\n\nYa disponible en todas las plataformas digitales. Escúchala ahora en el link:\n👉 ${link}\n\n¡No te quedes fuera del movimiento! 🔥`,
        tt: `¿Ya escuchaste lo nuevo? 🔥 "${name}" - ${artist}. Dale amor al audio, guárdalo y únete al trend. Escúchala completa aquí 👉 ${link}`,
        wa: `🎵 ¡Escucha "${name}" de ${artist}! Ya disponible en todas las plataformas.\n👉 ${link}`
    }),
    recent: (name: string, artist: string, link: string) => ({
        ig: `El fuego sigue encendido con "${name}" de ${artist}. ⚡️\n\nSi no la tienes en tu playlist de entrenamiento y motivación, te falta disciplina.\n🎧 Escúchala aquí: ${link}`,
        tt: `Esta canción está rompiendo. 📈 "${name}" de ${artist}. Úsala para tus videos de entrenamiento y fe. 🥊 👉 ${link}`,
        wa: `🔥 Te recomiendo escuchar "${name}" de ${artist}. ¡Motivación y fe pura!\n👉 ${link}`
    }),
    rotation: (name: string, artist: string, link: string) => ({
        ig: `Disciplina sobre motivación. 🥊\nHoy toca darle duro con "${name}" de ${artist}.\n\nEncuéntrala en Spotify, Apple Music y YouTube:\n👉 ${link}`,
        tt: `El ritmo y la fuerza que necesitas para hoy. 😤 "${name}" - ${artist}. Dale play al link 👉 ${link}`,
        wa: `🥊 Dale play a "${name}" de ${artist} para entrenar con todo hoy:\n👉 ${link}`
    }),
    old_gem: (name: string, artist: string, link: string) => ({
        ig: `Un clásico que nunca falla. 💎\n¿Te acuerdas de "${name}" de ${artist}? Sigue pegando igual de fuerte.\n👉 ${link}`,
        tt: `Joyas que no pasan de moda. ✨ "${name}" de ${artist}. 👉 ${link}`,
        wa: `💎 Una joya que nunca pasa de moda: "${name}" de ${artist}.\n👉 ${link}`
    })
};

// LETRAS: fragmentos (de preferencia el coro) para armar el texto del post
const stripHtml = (s: string) => s
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const normTitle = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/[^a-z0-9]+/g, '');
const isLyricLine = (l: string) => {
    const t = l.trim();
    if (t.length < 12 || t.length > 90) return false;
    if (/^\[.*\]$|^\(.*\)$/.test(t)) return false; // [Coro], (x2)
    if (/^(coro|verso|intro|outro|puente|estribillo|pre-?coro|letra|autor|prod)\b/i.test(t)) return false;
    if (/https?:|www\.|#|@/.test(t)) return false;
    return true;
};
const extractLyricFragments = (raw: string): string[] => {
    const lines = stripHtml(raw || '').replace(/\r/g, '').split('\n').map(l => {
        let t = l.replace(/\s+/g, ' ').trim();
        // La transcripcion automatica deja "¡" o "¿" sin cerrar
        if (t.startsWith('¡') && !t.includes('!')) t = t.slice(1);
        if (t.startsWith('¿') && !t.includes('?')) t = t.slice(1);
        return t.charAt(0).toUpperCase() + t.slice(1);
    });
    const valid = lines.filter(isLyricLine);
    if (valid.length < 2) return [];
    // Las lineas que mas se repiten suelen ser el coro: esas van primero
    const count = new Map<string, number>();
    valid.forEach(l => count.set(l.toLowerCase(), (count.get(l.toLowerCase()) || 0) + 1));
    const seen = new Set<string>();
    const frags: { text: string; score: number }[] = [];
    for (let i = 0; i < lines.length - 1; i++) {
        const a = lines[i], b = lines[i + 1];
        if (!isLyricLine(a) || !isLyricLine(b)) continue;
        const key = `${a}|${b}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        frags.push({ text: `${a}\n${b}`, score: (count.get(a.toLowerCase()) || 1) + (count.get(b.toLowerCase()) || 1) });
    }
    // Sin lineas repetidas entre fragmentos, asi "Otra frase" siempre trae algo distinto
    const used = new Set<string>();
    const out: string[] = [];
    for (const f of frags.sort((x, y) => y.score - x.score)) {
        const ls = f.text.split('\n').map(l => l.toLowerCase());
        if (ls.some(l => used.has(l))) continue;
        ls.forEach(l => used.add(l));
        out.push(f.text);
        if (out.length >= 10) break;
    }
    return out;
};
const LYRIC_CAPTIONS = (frag: string, name: string, artist: string, link: string) => {
    const first = frag.split('\n')[0];
    return {
        ig: `“${frag}” 🎶\n\n${name} · ${artist}\n\n¿Con qué frase te quedas? 👇\n🎧 Escúchala completa: ${link}`,
        tt: `“${first}” 🔥 ${name} - ${artist}. Escúchala completa 👉 ${link}`,
        wa: `🎵 “${frag}”\n\n${name} de ${artist}\n👉 ${link}`
    };
};

const WeeklyContentAssistant: React.FC<{ catalog: MusicItem[] }> = ({ catalog = [] }) => {
    const navigate = useNavigate();
    const [releases, setReleases] = useState<ReleaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [platformTab, setPlatformTab] = useState<'ig' | 'tt' | 'wa'>('ig');
    const [copiedStatus, setCopiedStatus] = useState<string>('');
    const [aiLoading, setAiLoading] = useState(false);
    const [customAiText, setCustomAiText] = useState<string>('');

    // IMAGEN QUE SE PUBLICA: portada de la cancion (por defecto) o una propia de la galeria
    const [shareBlob, setShareBlob] = useState<Blob | null>(null);
    const [sharePreview, setSharePreview] = useState<string>('');
    const [shareSource, setShareSource] = useState<'cover' | 'upload' | 'promo' | 'smartlink'>('cover');
    const [generated, setGenerated] = useState<GeneratedImage[]>([]);

    // LETRA: fragmento que se usa en el texto del post
    const [savedLyrics, setSavedLyrics] = useState<any[]>([]);
    const [fragIdx, setFragIdx] = useState(0);
    const [useLyrics, setUseLyrics] = useState(true);
    const [imageLoading, setImageLoading] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [publishedTo, setPublishedTo] = useState<Platform[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PUBLICACION DIRECTA (Meta Graph API desde el servidor)
    const [metaAccounts, setMetaAccounts] = useState<Record<string, MetaAccount>>({});
    const [directPublishing, setDirectPublishing] = useState(false);
    const [directResults, setDirectResults] = useState<Partial<Record<Platform, DirectResult>>>({});

    const [promotedIds, setPromotedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(PROMOTED_KEY) || '[]');
        } catch { return []; }
    });

    const [skipCount, setSkipCount] = useState<number>(() => {
        // Los saltos valen solo para el dia en que se hicieron: cada dia arranca en 0
        // y todos los dispositivos muestran la misma cancion hasta que se pulsa "Cambiar".
        try {
            const saved = JSON.parse(localStorage.getItem(SKIPS_KEY) || 'null');
            return saved && saved.day === dayKey() ? Number(saved.count) || 0 : 0;
        } catch { return 0; }
    });

    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

    useEffect(() => {
        const loadReleases = async () => {
            try {
                const res = await fetch("/api/sheet-proxy?read=true").then(r => r.json());
                const filtered = (res || []).filter((r: any) => !r.Artista || !r.Artista.toLowerCase().startsWith('config'));
                setReleases(filtered);
            } catch (err) {
                console.error("Error loading releases:", err);
            } finally {
                setLoading(false);
            }
        };
        loadReleases();
    }, []);

    const suggestion = useMemo<Suggestion | null>(() => {
        if (!catalog || catalog.length === 0) return null;

        // Orden fijo por id y sin filtros locales: asi la eleccion depende solo de la fecha
        // y sale la misma en la PC y en el celular.
        const used = new Set(promotedIds);
        const all = [...catalog].filter(s => s.id);
        const fresh = all.filter(s => !used.has(s.id));
        const pool = (fresh.length > 0 ? fresh : all).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

        if (pool.length === 0) return null;

        // Aleatorio (no recorre el catalogo por orden de fecha): semilla fija por dia + saltos,
        // asi la sugerencia no cambia al recargar pero cada 'Cambiar cancion' da otra distinta.
        const seed = today.getFullYear() * 1000 + dayOfYear + skipCount * 7919;
        let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        h ^= h >>> 16;
        const idx = (h >>> 0) % pool.length;
        const song = pool[idx];

        const smartLink = song.id ? `${window.location.origin}/link/${song.id}` : 'https://diosmasgym.com';
        const type: 'recent' | 'rotation' = idx % 2 === 0 ? 'recent' : 'rotation';
        const caps = CAPTIONS_BY_TYPE[type](song.name, song.artist, smartLink);
        
        // Un solo hashtag con el titulo (#ElQueNoBrinque...), no uno por palabra
        const titleTag = song.name.replace(/\s*[([][^)\]]*[)\]]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
            .split(/[^a-zA-Z0-9ñÑ]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
        const titleHashtags = titleTag && titleTag.length <= 40 ? `#${titleTag}` : '';
        const dynamicHashtags = `${titleHashtags} #musica #diosmasgym #juan614`;
        const finalHashtags = `${HASHTAG_SETS[type]} ${dynamicHashtags}`;

        return {
            song,
            reason: `Recomendación destacada de hoy para ${song.artist}. Mantén tus redes activas con este tema.`,
            type,
            caption: caps.ig,
            tiktokCaption: caps.tt,
            whatsappCaption: caps.wa,
            hashtags: finalHashtags
        };
    }, [catalog, promotedIds, skipCount, dayOfYear]);

    useEffect(() => {
        fetchSavedLyrics().then(list => setSavedLyrics(Array.isArray(list) ? list : [])).catch(() => {});
    }, []);

    // Letra de la columna del Excel o, si no, la guardada en el Gestor de Letras
    const lyricFragments = useMemo(() => {
        const song = suggestion?.song;
        if (!song) return [];
        let raw = song.lyrics || '';
        if (!raw.trim()) {
            const k = normTitle(song.name);
            raw = savedLyrics.find(l => l?.title && l?.content && normTitle(l.title) === k)?.content || '';
        }
        return extractLyricFragments(raw);
    }, [suggestion?.song, savedLyrics]);
    useEffect(() => { setFragIdx(0); }, [suggestion?.song?.id]);
    const fragment = useLyrics && lyricFragments.length > 0 ? lyricFragments[fragIdx % lyricFragments.length] : '';

    // Estado compartido entre dispositivos (saltos del dia y canciones usadas).
    // Si el servidor no lo tiene configurado, se sigue usando solo el guardado local.
    const pushState = (skips: number, promoted: string[]) => {
        fetch('/api/common?action=daily-post', {
            method: 'POST',
            headers: adminHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ day: dayKey(), skips, promoted })
        }).catch(() => { /* sin conexion: queda el guardado local */ });
    };

    useEffect(() => {
        const pull = async () => {
            try {
                const res = await fetch('/api/common?action=daily-post', { headers: adminHeaders() });
                if (!res.ok) return;
                const remote = await res.json();
                const promoted: string[] = Array.isArray(remote.promoted) ? remote.promoted : [];
                setPromotedIds(prev => (JSON.stringify(prev) === JSON.stringify(promoted) ? prev : promoted));
                setSkipCount(remote.day === dayKey() ? Number(remote.skips) || 0 : 0);
            } catch { /* se queda con lo local */ }
        };
        pull();
        const onVisible = () => { if (document.visibilityState === 'visible') pull(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    // Clear custom AI text when song changes
    useEffect(() => {
        setCustomAiText('');
    }, [suggestion?.song?.id]);

    const handleNextSong = () => {
        const next = skipCount + 1;
        setSkipCount(next);
        localStorage.setItem(SKIPS_KEY, JSON.stringify({ day: dayKey(), count: next }));
        pushState(next, promotedIds);
    };

    const handleMarkUsed = () => {
        if (!suggestion?.song) return;
        const nextPromoted = [...promotedIds, suggestion.song.id];
        setPromotedIds(nextPromoted);
        localStorage.setItem(PROMOTED_KEY, JSON.stringify(nextPromoted));
        // Al salir del catalogo disponible la cancion usada, la sugerencia cambia sola
        pushState(skipCount, nextPromoted);
        setCopiedStatus('✅ Canción marcada como publicada');
        setTimeout(() => setCopiedStatus(''), 2500);
    };

    const handleResetAll = () => {
        setPromotedIds([]);
        setSkipCount(0);
        localStorage.removeItem(PROMOTED_KEY);
        localStorage.removeItem(SKIPS_KEY);
        pushState(0, []);
        setCopiedStatus('🔄 Historial reiniciado');
        setTimeout(() => setCopiedStatus(''), 2000);
    };

    const getPostText = (platform: Platform) => {
        if (!suggestion || !suggestion.song) return '';
        const smartLink = `${window.location.origin}/link/${suggestion.song.id}`;

        if (customAiText) {
            return platform === 'wa' ? `${customAiText}\n\n${smartLink}` : `${customAiText}\n\n${smartLink}\n\n${suggestion.hashtags}`;
        }

        if (fragment) {
            const caps = LYRIC_CAPTIONS(fragment, suggestion.song.name, suggestion.song.artist, smartLink);
            if (platform === 'tt') return `${caps.tt}\n\n${suggestion.hashtags} #fyp #parati`;
            if (platform === 'wa') return caps.wa;
            return `${caps.ig}\n\n${suggestion.hashtags}`;
        }

        if (platform === 'ig' || platform === 'fb') {
            return `${suggestion.caption}\n\n${suggestion.hashtags}`;
        }
        if (platform === 'tt') {
            return `${suggestion.tiktokCaption}\n\n${suggestion.hashtags} #fyp #parati`;
        }
        return `${suggestion.whatsappCaption}`;
    };
    const getActivePostText = () => getPostText(platformTab);

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStatus(`✓ ¡${label} copiado! Listo para pegar`);
        } catch {
            setCopiedStatus('⚠️ Error al copiar');
        }
        setTimeout(() => setCopiedStatus(''), 2500);
    };

    // La portada se descarga en cuanto cambia la cancion: el menu de compartir del celular
    // exige que navigator.share se llame justo al tocar el boton, sin esperas de red.
    const songKey = suggestion?.song?.id || '';
    const coverUrl = suggestion?.song?.cover || '';
    useEffect(() => {
        setShareSource('cover');
        setPublishedTo([]);
    }, [songKey]);

    useEffect(() => {
        if (shareSource !== 'cover') return;
        let cancelled = false;
        setShareBlob(null);
        setSharePreview(coverUrl);
        if (!coverUrl) return;
        setImageLoading(true);
        fetch(getCorsFriendlyUrl(coverUrl))
            .then(r => (r.ok ? r.blob() : null))
            .then(blob => { if (!cancelled && blob && blob.type.startsWith('image/')) setShareBlob(blob); })
            .catch(() => { /* sin imagen: se comparte solo el texto */ })
            .finally(() => { if (!cancelled) setImageLoading(false); });
        return () => { cancelled = true; };
    }, [coverUrl, shareSource]);

    useEffect(() => () => { if (sharePreview.startsWith('blob:')) URL.revokeObjectURL(sharePreview); }, [sharePreview]);

    const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !file.type.startsWith('image/')) return;
        setShareSource('upload');
        setShareBlob(file);
        setSharePreview(URL.createObjectURL(file));
    };

    // Imagenes hechas en Studio PRO / SmartLink Image Creator para esta cancion (guardadas en este dispositivo)
    useEffect(() => {
        if (!songKey) { setGenerated([]); return; }
        let cancelled = false;
        const load = () => getGeneratedImagesForSong(songKey).then(list => {
            if (cancelled) return;
            setGenerated(list);
            // Si acabas de crearla ("Usar en Publicacion Rapida"), se elige sola
            const fresh = list.find(g => Date.now() - g.createdAt < 10 * 60 * 1000);
            if (fresh) selectGenerated(fresh);
        });
        load();
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
    }, [songKey]);

    const selectGenerated = (g: GeneratedImage) => {
        setShareSource(g.source);
        setShareBlob(g.blob);
        setSharePreview(URL.createObjectURL(g.blob));
    };

    const pickToolImage = (source: 'promo' | 'smartlink') => {
        const g = generated.find(x => x.source === source);
        if (g) { selectGenerated(g); return; }
        // Aun no hay: se abre la herramienta con la cancion; al tocar "Usar en Publicacion Rapida" vuelve aqui
        navigate(source === 'promo' ? '/admin/promo-image' : '/admin/smartlink-video', { state: { song: suggestion?.song } });
    };

    const shareFileName = () => {
        const base = (suggestion?.song?.name || 'post').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const ext = shareBlob?.type === 'image/png' ? 'png' : shareBlob?.type === 'image/webp' ? 'webp' : 'jpg';
        return `${base || 'post'}.${ext}`;
    };

    const downloadImage = () => {
        if (!shareBlob) return;
        const url = URL.createObjectURL(shareBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = shareFileName();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    };

    const flash = (msg: string, ms = 3500) => {
        setCopiedStatus(msg);
        setTimeout(() => setCopiedStatus(''), ms);
    };

    const markPublished = (platform: Platform) =>
        setPublishedTo(list => (list.includes(platform) ? list : [...list, platform]));

    // Publica imagen + texto en una red.
    // Celular: abre el menu nativo con la imagen adjunta (eliges la app; el texto ya va copiado para pegarlo).
    // Computadora: descarga la imagen, copia el texto y abre la red para subirla.
    const shareTo = async (platform: Platform) => {
        if (!suggestion?.song) return;
        const text = getPostText(platform);
        const name = PLATFORMS.find(p => p.id === platform)!.label;
        // Instagram y TikTok ignoran el texto que llega por el menu de compartir: se deja en el portapapeles
        navigator.clipboard?.writeText(text).catch(() => {});

        const file = shareBlob ? new File([shareBlob], shareFileName(), { type: shareBlob.type || 'image/jpeg' }) : null;
        if (isMobileDevice() && file && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file], text });
                markPublished(platform);
                flash(`✓ Listo · si ${name} no puso el texto, mantén presionado y pega`);
            } catch (e) {
                if ((e as Error)?.name !== 'AbortError') flash('⚠️ No se pudo abrir el menú de compartir');
            }
            return;
        }

        if (platform === 'wa') {
            // El smart link lleva la portada como vista previa: WhatsApp la muestra sola al pegar el link
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            markPublished(platform);
            flash('✓ Elige el chat y envía · la portada sale como vista previa del link');
            return;
        }
        if (platform === 'fb') {
            // Facebook si deja publicar desde la compu con su ventana de compartir: el link sale con la portada
            const smartLink = `${window.location.origin}/link/${suggestion.song.id}`;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(smartLink)}`, '_blank', 'width=640,height=720');
            markPublished(platform);
            flash('✓ Pega el texto (Ctrl+V) en la ventana de Facebook y toca Publicar', 6000);
            return;
        }
        if (file) downloadImage();
        window.open(PLATFORMS.find(p => p.id === platform)!.upload, '_blank');
        markPublished(platform);
        flash(file ? `✓ Imagen descargada y texto copiado · súbela en ${name} y pega el texto` : `✓ Texto copiado · pégalo en ${name}`, 5000);
    };

    useEffect(() => {
        fetch('/api/common?action=social-publish', { headers: adminHeaders() })
            .then(r => (r.ok ? r.json() : {}))
            .then(data => setMetaAccounts(data || {}))
            .catch(() => { /* sin conexion directa: queda el modo manual */ });
    }, []);

    useEffect(() => { setDirectResults({}); }, [songKey]);

    const metaKey = suggestion?.song?.artist?.toLowerCase().includes('juan') ? 'juan614' : 'diosmasgym';
    const meta = metaAccounts[metaKey];
    const directReady = !!meta?.connected;

    const publishDirect = async (targets: ('ig' | 'fb')[]) => {
        if (!suggestion?.song || !shareBlob || directPublishing) return;
        const where = targets.map(t => (t === 'ig' ? `Instagram${meta?.igUser ? ` (@${meta.igUser})` : ''}` : `Facebook${meta?.pageName ? ` (${meta.pageName})` : ''}`)).join(' y ');
        if (!window.confirm(`¿Publicar ahora en ${where}?\n\nSe publica de inmediato y queda visible para todos.`)) return;
        setDirectPublishing(true);
        try {
            const imageBase64 = await toInstagramJpeg(shareBlob);
            const res = await fetch('/api/common?action=social-publish', {
                method: 'POST',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ account: metaKey, targets, caption: getPostText('ig'), imageBase64 })
            });
            const data = await res.json().catch(() => ({}));
            if (!data?.results) throw new Error(data?.error || `Error ${res.status}`);
            setDirectResults(prev => ({ ...prev, ...data.results }));
            (Object.entries(data.results) as [Platform, DirectResult][]).forEach(([p, r]) => { if (r.ok) markPublished(p); });
            const failed = (Object.entries(data.results) as [Platform, DirectResult][]).filter(([, r]) => !r.ok);
            flash(failed.length ? `⚠️ ${failed.map(([p]) => PLATFORMS.find(x => x.id === p)?.label).join(', ')} falló · revisa el detalle` : '✅ ¡Publicado!', 5000);
        } catch (e) {
            flash(`⚠️ No se pudo publicar: ${(e as Error).message}`, 6000);
        } finally {
            setDirectPublishing(false);
        }
    };

    // Windows/Mac tambien tienen menu de compartir (WhatsApp de escritorio, Correo, etc.)
    const canShareFilesHere = !!shareBlob && typeof navigator !== 'undefined' && !!navigator.canShare
        && navigator.canShare({ files: [new File([shareBlob], 'x.jpg', { type: shareBlob.type || 'image/jpeg' })] });
    const shareWithSystem = async () => {
        if (!shareBlob) return;
        const text = getPostText('ig');
        navigator.clipboard?.writeText(text).catch(() => {});
        try {
            await navigator.share({ files: [new File([shareBlob], shareFileName(), { type: shareBlob.type || 'image/jpeg' })], text });
        } catch (e) {
            if ((e as Error)?.name !== 'AbortError') flash('⚠️ Esta compu no dejó compartir la imagen');
        }
    };

    const handleFinishPublishing = () => {
        setPublishOpen(false);
        handleMarkUsed();
    };

    const handleAiRegenerate = async () => {
        if (!suggestion?.song) return;
        setAiLoading(true);
        try {
            const prompt = {
                input: `Genera un post viral MUY impactante y listo para publicar sobre la canción "${suggestion.song.name}" de ${suggestion.song.artist}. Estilo directo, épico, de motivación, fe y disciplina.`
                    + (lyricFragments.length ? ` Básate en la letra: cita textual este fragmento entre comillas y habla de su mensaje: "${(fragment || lyricFragments[0]).replace(/\n/g, ' / ')}". No inventes otras frases de la canción.` : ''),
                platform: platformTab === 'tt' ? 'TikTok' : 'Instagram',
                goal: 'Inspirar y Viralizar',
                tone: 'Épico y Motivador'
            };

            const response = await fetch('/api/generate-post', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-admin-password': localStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({ content: JSON.stringify(prompt) })
            });
            const data = await response.json();
            if (data.text) {
                setCustomAiText(data.text);
                setCopiedStatus('✨ ¡Nuevo copy generado con IA!');
                setTimeout(() => setCopiedStatus(''), 2500);
            }
        } catch (e) {
            console.error("AI Generation failed", e);
        } finally {
            setAiLoading(false);
        }
    };

    if (loading) return (
        <div className="mb-10 bg-[#0f111a] border border-white/5 rounded-3xl p-6 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronizando Asistente...</p>
        </div>
    );

    if (!suggestion || !suggestion.song) return null;

    const smartLinkUrl = `${window.location.origin}/link/${suggestion.song.id}`;

    return (
        <div className="mb-12">
            {/* COMPACT HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c5a059] animate-pulse shadow-[0_0_12px_#c5a059]"></div>
                    <h2 className="font-serif italic text-2xl text-white">
                        Publicación Rápida del Día
                    </h2>
                    <span className="hidden sm:inline-block text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20">
                        1-Click Post
                    </span>
                </div>
                
                {/* QUICK SHUFFLE & ACTIONS */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleNextSong}
                        className="text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-[#c5a059] hover:text-black hover:border-[#c5a059] transition-all flex items-center gap-2"
                        title="Ver otra canción sugerida del catálogo"
                    >
                        <i className="fas fa-dice text-[#c5a059]"></i>
                        <span>Cambiar Canción</span>
                    </button>

                    <button 
                        onClick={handleMarkUsed}
                        className="text-[9px] font-black uppercase tracking-widest px-3.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-all flex items-center gap-1.5"
                        title="Marcar como publicada y pasar a la siguiente"
                    >
                        <i className="fas fa-check text-[9px]"></i>
                        <span>Usado ✓</span>
                    </button>

                    <button 
                        onClick={handleResetAll}
                        className="text-[9px] font-black uppercase tracking-widest p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all"
                        title="Reiniciar lista de canciones usadas"
                    >
                        <i className="fas fa-arrow-rotate-left"></i>
                    </button>
                </div>
            </div>

            {/* SINGLE ALL-IN-ONE CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0f111a] to-[#080b12] border border-[#c5a059]/25 shadow-2xl p-6 lg:p-8">
                {/* Glow decorativo de fondo */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                    
                    {/* LEFT COLUMN: SONG INFO & COVER (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black">
                            <img
                                src={sharePreview || suggestion.song.cover}
                                alt={suggestion.song.name}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                            
                            <div className="absolute top-3 left-3">
                                <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[#c5a059] border border-[#c5a059]/30">
                                    {suggestion.type === 'new_release' ? '🚀 Estreno' : suggestion.type === 'recent' ? '🔥 Tendencia' : '🔄 Rotación'}
                                </span>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-base font-serif italic text-white font-bold leading-tight truncate">
                                    {suggestion.song.name}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mt-0.5">
                                    {suggestion.song.artist}
                                </p>
                            </div>
                        </div>

                        {/* IMAGEN A PUBLICAR */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Imagen a publicar</span>
                                <button
                                    onClick={downloadImage}
                                    disabled={!shareBlob}
                                    className="text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-30"
                                >
                                    <i className={`fas ${imageLoading ? 'fa-spinner fa-spin' : 'fa-download'} mr-1`}></i> Bajar
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: 'cover', label: 'Portada', icon: 'fa-compact-disc', onClick: () => setShareSource('cover') },
                                    { id: 'promo', label: 'Studio PRO', icon: 'fa-palette', onClick: () => pickToolImage('promo') },
                                    { id: 'smartlink', label: 'SmartLink', icon: 'fa-mobile-screen', onClick: () => pickToolImage('smartlink') },
                                    { id: 'upload', label: 'Mi imagen', icon: 'fa-images', onClick: () => fileInputRef.current?.click() },
                                ] as const).map(opt => {
                                    const active = shareSource === opt.id;
                                    const missing = (opt.id === 'promo' || opt.id === 'smartlink') && !generated.some(g => g.source === opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={opt.onClick}
                                            title={missing ? 'Aún no la has creado: se abre la herramienta con esta canción' : undefined}
                                            className={`py-2.5 px-2 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${active ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                                        >
                                            <i className={`fas ${opt.icon} mr-1`}></i> {opt.label}
                                            {missing && <span className="block text-[7px] font-bold opacity-60 normal-case tracking-normal">+ crear</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
                        </div>
                        {!imageLoading && !shareBlob && (
                            <p className="text-[8px] text-amber-400/70 font-bold uppercase tracking-widest -mt-2">
                                <i className="fas fa-triangle-exclamation mr-1"></i> No se pudo cargar la portada · usa "Mi imagen"
                            </p>
                        )}

                        {/* SMART LINK PILL */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                                <i className="fas fa-link text-[#c5a059] text-xs shrink-0"></i>
                                <span className="text-[9px] font-mono text-white/70 truncate">{smartLinkUrl.replace(/^https?:\/\//, '')}</span>
                            </div>
                            <button
                                onClick={() => copyToClipboard(smartLinkUrl, 'SmartLink')}
                                className="shrink-0 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all ml-2"
                            >
                                Copiar
                            </button>
                        </div>

                        {/* STUDIO PRO SHORTCUTS */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button 
                                onClick={() => navigate('/admin/promo-image', { 
                                    state: { 
                                        song: suggestion.song, 
                                        presetCaption: suggestion.caption, 
                                        presetHashtags: suggestion.hashtags, 
                                        autoShare: false 
                                    } 
                                })}
                                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:border-[#c5a059] hover:text-[#c5a059] transition-all text-[8px] font-black uppercase tracking-wider text-center"
                            >
                                <i className="fas fa-palette text-[#c5a059]"></i>
                                <span>Flyer 4K</span>
                            </button>
                            <button 
                                onClick={() => navigate('/admin/video-snippet', { 
                                    state: { song: suggestion.song } 
                                })}
                                className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:border-[#c5a059] hover:text-[#c5a059] transition-all text-[8px] font-black uppercase tracking-wider text-center"
                            >
                                <i className="fas fa-video text-[#c5a059]"></i>
                                <span>Video Snippet</span>
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: READY-TO-POST CONTENT & 1-CLICK SHARE (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-5">
                        
                        {/* PLATFORM TABS */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                {[
                                    { id: 'ig', label: 'Instagram / FB', icon: 'fa-brands fa-instagram', color: '#E1306C' },
                                    { id: 'tt', label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#ffffff' },
                                    { id: 'wa', label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setPlatformTab(tab.id as any); setCustomAiText(''); }}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${platformTab === tab.id ? 'bg-white text-black border-white shadow-lg' : 'bg-black/30 text-white/50 border-white/5 hover:text-white'}`}
                                    >
                                        <i className={`${tab.icon}`} style={{ color: platformTab === tab.id ? '#000' : tab.color }}></i>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* REGENERATE WITH AI */}
                            <button
                                onClick={handleAiRegenerate}
                                disabled={aiLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#c5a059]/20 to-[#8B5A2B]/20 border border-[#c5a059]/40 text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all text-[8px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-sparkles'}`}></i>
                                <span>{aiLoading ? 'Creando...' : '✨ Variar Copy con IA'}</span>
                            </button>
                        </div>

                        {/* FRAGMENTO DE LA LETRA */}
                        {lyricFragments.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 bg-[#c5a059]/5 border border-[#c5a059]/20 rounded-2xl p-3">
                                <button
                                    onClick={() => { setUseLyrics(v => !v); setCustomAiText(''); }}
                                    className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all ${useLyrics ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/50 border-white/10'}`}
                                >
                                    <i className="fas fa-microphone-lines mr-1"></i> {useLyrics ? 'Con letra' : 'Sin letra'}
                                </button>
                                <span className="flex-1 min-w-0 text-[10px] italic text-white/70 truncate">
                                    {useLyrics ? `“${fragment.replace(/\n/g, ' / ')}”` : 'Texto genérico (sin frase de la canción)'}
                                </span>
                                {useLyrics && lyricFragments.length > 1 && (
                                    <button
                                        onClick={() => { setFragIdx(i => i + 1); setCustomAiText(''); }}
                                        className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white/70 hover:text-white"
                                    >
                                        <i className="fas fa-shuffle mr-1"></i> Otra frase ({(fragIdx % lyricFragments.length) + 1}/{lyricFragments.length})
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-[9px] text-white/30">
                                <i className="fas fa-microphone-lines-slash mr-1"></i> Esta canción aún no tiene letra guardada · agrégala en el Gestor de Letras para usar frases en el post
                            </p>
                        )}

                        {/* LIVE TEXT BOX WITH THE ENTIRE READY-TO-POST COPY */}
                        <div className="relative bg-black/50 border border-white/10 rounded-2xl p-5 group">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
                                    Texto Listo para el Post
                                </span>
                                <button
                                    onClick={() => copyToClipboard(getActivePostText(), 'Texto completo')}
                                    className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] hover:underline flex items-center gap-1"
                                >
                                    <i className="fas fa-copy"></i>
                                    Copiar
                                </button>
                            </div>
                            
                            <p className="text-white/90 text-xs leading-relaxed font-sans whitespace-pre-wrap select-all">
                                {getActivePostText()}
                            </p>
                        </div>

                        {/* TOAST FEEDBACK */}
                        {copiedStatus && (
                            <div className="p-3 rounded-xl bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-widest text-center shadow-lg animate-fade-in">
                                {copiedStatus}
                            </div>
                        )}

                        {/* MAIN ACTION BAR: 1-CLICK POST BUTTONS */}
                        <div className="space-y-3 pt-2">
                            {/* MASTER BUTTON: PUBLICAR EN TODAS */}
                            <button
                                onClick={() => { setPublishOpen(true); navigator.clipboard?.writeText(getPostText('ig')).catch(() => {}); }}
                                className="w-full py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-3 bg-gradient-to-r from-[#c5a059] to-[#d4af37] text-black hover:scale-[1.01] active:scale-95 transition-all shadow-[0_10px_30px_rgba(197,160,89,0.25)]"
                            >
                                <i className="fas fa-rocket text-sm"></i>
                                🚀 Publicar en todas las redes (imagen + texto)
                            </button>

                            {/* UNA RED A LA VEZ: imagen + texto de esa red */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {PLATFORMS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => shareTo(p.id)}
                                        style={{ color: p.color, borderColor: `${p.color}4d`, background: `${p.color}1a` }}
                                        className="relative flex items-center justify-center gap-2 py-3 px-3 rounded-xl border hover:brightness-150 transition-all text-[9px] font-black uppercase tracking-wider"
                                    >
                                        <i className={`${p.icon} text-sm`}></i>
                                        <span>{p.label}</span>
                                        {publishedTo.includes(p.id) && <i className="fas fa-circle-check text-green-400 text-[10px] absolute top-1.5 right-1.5"></i>}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => copyToClipboard(getActivePostText(), 'Texto completo')}
                                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                <i className="fas fa-copy mr-2"></i> Solo copiar texto + link + tags
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* PUBLICAR EN TODAS: una red tras otra con la misma imagen */}
            {publishOpen && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setPublishOpen(false)}>
                    <div className="w-full max-w-md bg-[#0f111a] border border-[#c5a059]/30 rounded-3xl p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4">
                            {sharePreview && <img src={sharePreview} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">Publicar en todas</p>
                                <p className="text-sm font-serif italic text-white truncate">{suggestion.song.name}</p>
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{publishedTo.length} de {PLATFORMS.length} listas</p>
                            </div>
                            <button onClick={() => setPublishOpen(false)} className="w-8 h-8 rounded-full bg-white/5 text-white/50 hover:text-white"><i className="fas fa-xmark"></i></button>
                        </div>

                        {isMobileDevice() ? (
                            <p className="text-[10px] text-white/50 leading-relaxed">
                                Toca cada red: se abre el menú para compartir con la imagen y el texto de esa red ya copiado (si no aparece, mantén presionado y pega).
                            </p>
                        ) : (
                            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                                    <i className="fas fa-desktop mr-1"></i>
                                    Desde la computadora, Instagram y TikTok no dejan que una página suba la imagen por ti: se descarga y tú la subes.
                                    Facebook y WhatsApp sí se envían con la portada como vista previa del link.
                                </p>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(`${window.location.origin}/admin`)}`}
                                        alt="QR para abrir en el celular"
                                        className="w-20 h-20 rounded-lg bg-white p-1 shrink-0"
                                    />
                                    <p className="text-[9px] text-white/50 leading-relaxed">
                                        <b className="text-white/80">Para que se mande sola con imagen a todas las apps</b>, escanea con el celular y usa este mismo botón ahí.
                                        O conecta Meta para que Instagram y Facebook se publiquen directo.
                                    </p>
                                </div>
                                {canShareFilesHere && (
                                    <button
                                        onClick={shareWithSystem}
                                        className="w-full py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white text-[9px] font-black uppercase tracking-widest"
                                    >
                                        <i className="fas fa-share-nodes mr-2"></i> Compartir con las apps de esta compu
                                    </button>
                                )}
                            </div>
                        )}

                        {/* PUBLICACION DIRECTA EN INSTAGRAM + FACEBOOK */}
                        {directReady ? (
                            <button
                                onClick={() => publishDirect(['ig', 'fb'].filter(t => !directResults[t as Platform]?.ok) as ('ig' | 'fb')[])}
                                disabled={directPublishing || !shareBlob || (!!directResults.ig?.ok && !!directResults.fb?.ok)}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#E1306C] to-[#1877F2] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                            >
                                <i className={`fas ${directPublishing ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                                {directPublishing ? 'Publicando…' : (directResults.ig?.ok && directResults.fb?.ok) ? 'Publicado en Instagram y Facebook' : 'Publicar directo en Instagram + Facebook'}
                            </button>
                        ) : (
                            <p className="text-[9px] text-white/30 leading-relaxed border border-white/5 rounded-xl p-2.5">
                                <i className="fas fa-plug mr-1"></i>
                                {meta?.error ? `Conexión con Meta falló: ${meta.error}` : 'Instagram y Facebook aún no están conectados para publicar directo (falta el token de Meta en Vercel).'}
                            </p>
                        )}

                        <div className="space-y-2">
                            {PLATFORMS.map((p, i) => {
                                const done = publishedTo.includes(p.id);
                                const isNext = !done && PLATFORMS.findIndex(x => !publishedTo.includes(x.id)) === i;
                                const direct = directResults[p.id];
                                if (direct) {
                                    return (
                                        <div key={p.id} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border ${direct.ok ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${p.color}22`, color: p.color }}>
                                                <i className={p.icon}></i>
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[11px] font-black uppercase tracking-wider text-white">{i + 1}. {p.label}</span>
                                                <span className={`block text-[9px] ${direct.ok ? 'text-green-400' : 'text-red-300'} break-words`}>{direct.ok ? 'Publicado directo' : direct.error}</span>
                                            </span>
                                            {direct.ok && direct.url && (
                                                <a href={direct.url} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white px-2 py-1 rounded-md border border-white/10">Ver</a>
                                            )}
                                            {!direct.ok && (
                                                <button onClick={() => shareTo(p.id)} className="text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white px-2 py-1 rounded-md border border-white/10">Manual</button>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => shareTo(p.id)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${done ? 'bg-green-500/10 border-green-500/30' : isNext ? 'bg-white/10 border-[#c5a059]/60' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                                    >
                                        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${p.color}22`, color: p.color }}>
                                            <i className={p.icon}></i>
                                        </span>
                                        <span className="flex-1">
                                            <span className="block text-[11px] font-black uppercase tracking-wider text-white">{i + 1}. {p.label}</span>
                                            <span className="block text-[9px] text-white/40">{done ? (isMobileDevice() ? 'Hecho · toca para repetir' : 'Abierto · termina de publicar allá') : isNext ? 'Siguiente' : 'Pendiente'}</span>
                                        </span>
                                        <i className={`fas ${done ? 'fa-circle-check text-green-400' : 'fa-arrow-up-right-from-square text-white/30'}`}></i>
                                    </button>
                                );
                            })}
                        </div>

                        {copiedStatus && (
                            <div className="p-2.5 rounded-xl bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-widest text-center">{copiedStatus}</div>
                        )}

                        <button
                            onClick={handleFinishPublishing}
                            disabled={publishedTo.length === 0}
                            className="w-full py-3.5 rounded-xl bg-green-500 text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all"
                        >
                            <i className="fas fa-check mr-2"></i> Terminé · marcar canción como usada
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyContentAssistant;
