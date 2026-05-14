import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const noise = (x: number, y: number) => {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
};
const smoothNoise = (t: number) => {
    const t0 = Math.floor(t);
    const t1 = t0 + 1;
    const f = t - t0;
    const u = f * f * (3.0 - 2.0 * f);
    return noise(t0, 0) * (1 - u) + noise(t1, 0) * u;
};

const VideoSnippetCreator: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    
    // Video States
    const [startTime, setStartTime] = useState(0);
    const [duration, setDuration] = useState(60); 
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
    const [promoImageUrl, setPromoImageUrl] = useState<string | null>(location.state?.promoImage || null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    // Animation Refs for state-consistency in requestAnimationFrame
    const titleRef = useRef("");
    const artistRef = useRef("");
    const promoImgRef = useRef<string | null>(null);
    const localCoverRef = useRef<string | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (!bgImageRef.current) {
            bgImageRef.current = new Image();
            bgImageRef.current.crossOrigin = "anonymous";
        }

        return () => {
            audioCtxRef.current?.close().catch(() => {});
            audioCtxRef.current = null;
            sourceRef.current = null;
        };
    }, []);

    useEffect(() => { 
        titleRef.current = customTitle; 
    }, [customTitle]);
    
    useEffect(() => { 
        artistRef.current = customArtist; 
    }, [customArtist]);

    useEffect(() => { 
        const url = promoImageUrl || localCoverUrl || "";
        if (bgImageRef.current && bgImageRef.current.src !== url) {
            bgImageRef.current.src = url;
        }
        promoImgRef.current = promoImageUrl; 
        localCoverRef.current = localCoverUrl;
    }, [promoImageUrl, localCoverUrl]);

    useEffect(() => {
        fetchMusicCatalog('diosmasgym').then(data => {
            setCatalog(data);
            setIsLoading(false);

            // Auto-carga desde el Asistente
            const incomingSong = location.state?.song as MusicItem;
            if (incomingSong) {
                setSelectedSong(incomingSong);
                setCustomTitle(incomingSong.name);
                setCustomArtist(incomingSong.artist || "Dios Mas Gym");
                setStartTime(0);
            }
        });
    }, [location.state]);

    useEffect(() => {
        if ((selectedSong || localFileUrl) && audioRef.current) {
            audioRef.current.currentTime = startTime;
            if (isPlaying) audioRef.current.play().catch(e => console.error("Auto-play blocked or failed", e));
        }
    }, [startTime, selectedSong, localFileUrl]);

    useEffect(() => {
        if (location.state?.song && catalog.length > 0) {
            const matched = catalog.find(s => s.id === location.state.song.id);
            if (matched) {
                setSelectedSong(matched);
                setCustomTitle(matched.name);
                setCustomArtist(matched.artist || "Dios Mas Gym");
                // Auto-load removed per user request
            }
        }
    }, [location.state, catalog]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLocalFileUrl(url);
            setSelectedSong({
                id: 'local',
                name: customTitle || file.name.split('.')[0],
                artist: customArtist || 'Dios Mas Gym',
                cover: promoImageUrl || localCoverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1080',
                url: url,
                type: 'Local',
                date: new Date().toISOString()
            });
            if (!customTitle) setCustomTitle(file.name.split('.')[0]);
            if (!customArtist) setCustomArtist('Dios Mas Gym');
            setStartTime(0);
        }
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLocalCoverUrl(url);
            if (selectedSong) {
                setSelectedSong({ ...selectedSong, cover: url });
            }
        }
    };

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (!localFileUrl) {
            alert("Sube un MP3 local antes de escuchar o exportar el snippet.");
            return;
        }
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.currentTime = startTime;
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Stable Draw Loop
    const drawRef = useRef<() => void>(() => {});

    const draw = () => {
        if (!canvasRef.current || !selectedSong) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false }); // Optimization
        if (!ctx) return;

        const w = 1080;
        const h = 1920;
        const time = Date.now() / 1000;
        
        // Organic Camera Drift (Anti-AI)
        const nX = smoothNoise(time * 0.3) - 0.5;
        const nY = smoothNoise(time * 0.4 + 100) - 0.5;
        const zoom = 50 + (smoothNoise(time * 0.2) * 20);

        // 1. Fondo base negro
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, w, h);

        // Background: Promo image or Cover (ONLY MANUAL)
        const img = bgImageRef.current;
        const isImgReady = img && img.complete && img.naturalWidth !== 0 && img.src !== "";

        if (isImgReady) {
            // 2. Imagen de fondo escalada y desenfocada (Orgánica)
            ctx.globalAlpha = 0.25 + smoothNoise(time * 0.5) * 0.1;
            const bgZoom = 1.2 + smoothNoise(time * 0.1) * 0.15;
            ctx.drawImage(img, (w - w*bgZoom)/2 + (nX * 40), (h - h*bgZoom)/2 + (nY * 40), w*bgZoom, h*bgZoom);
            ctx.globalAlpha = 1.0;
        }

        // 3. Gradiente de viñeta (con ligero parpadeo orgánico)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(0,0,0,${0.3 + smoothNoise(time) * 0.1})`);
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(5,7,10,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        
        // Film Grain Sutil
        ctx.save();
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        ctx.restore();

        // 4. Portada con Glow Dinámico Orgánico (ONLY MANUAL)
        if (isImgReady) {
            ctx.save();
            ctx.shadowBlur = 80 + smoothNoise(time * 2) * 50;
            ctx.shadowColor = '#c5a059';
            ctx.beginPath();
            // Handheld jitter for the cover container
            const coverX = 140 + nX * 15;
            const coverY = 460 + nY * 15;
            ctx.roundRect(coverX, coverY, 800, 800, 80);
            ctx.clip();
            ctx.drawImage(img, coverX - 50 - zoom, coverY - 50 - zoom, 900 + zoom*2, 900 + zoom*2);
            ctx.restore();
        } else {
            // Placeholder si no hay imagen
            ctx.save();
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
            ctx.setLineDash([20, 20]);
            ctx.lineWidth = 4;
            ctx.strokeRect(140, 460, 800, 800);
            ctx.restore();
        }

        // 5. Partículas de polvo/oro (Physics-based)
        ctx.fillStyle = 'rgba(197, 160, 89, 0.4)';
        for(let i=0; i<30; i++) {
            const seedX = smoothNoise(time * 0.1 + i * 5);
            const seedY = smoothNoise(time * 0.15 + i * 10);
            
            // Non-linear floating
            const px = (seedX * 1.5) * w;
            const py = ((seedY * 1.2) % 1) * h;
            
            ctx.save();
            ctx.globalAlpha = 0.2 + smoothNoise(time * 2 + i) * 0.4;
            ctx.beginPath();
            ctx.ellipse(px, py, 2 + seedX * 2, 1.5 + seedY * 2, seedX * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 6. Textos Motivacionales (Kinetic Drift)
        ctx.textAlign = 'center';
        
        // Jitter general para todos los textos
        const textDriftX = nX * 10;
        const textDriftY = nY * 10;
        
        ctx.save();
        ctx.translate(textDriftX, textDriftY);
        
        // Tagline
        ctx.fillStyle = '#c5a059';
        ctx.font = '900 40px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '12px';
        ctx.fillText('EL ARSENAL DE FE', 540, 1400);

        // Song Name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 110px Arial, sans-serif'; 
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'black';
        ctx.textAlign = 'center';
        ctx.fillText((titleRef.current || selectedSong.name || "S/N").toUpperCase(), 540, 1530);

        // Artist
        ctx.fillStyle = '#c5a059'; 
        ctx.font = '900 45px Arial, sans-serif';
        ctx.shadowBlur = 15;
        ctx.fillText((artistRef.current || selectedSong.artist || 'DIOS MAS GYM').toUpperCase(), 540, 1610);
        ctx.shadowBlur = 0;
        
        ctx.restore();

        // 7. Barra de Progreso Premium
        const progress = isRecording ? recordingProgress : ((audioRef.current?.currentTime || 0) - startTime) / duration;
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(140, 1720, 800, 12);
        
        const progressGrad = ctx.createLinearGradient(140, 0, 940, 0);
        progressGrad.addColorStop(0, '#c5a059');
        progressGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = progressGrad;
        ctx.fillRect(140, 1720, 800 * Math.max(0, Math.min(1, progress)), 12);

        if (progress >= 1 && isPlaying && !isRecording) {
            audioRef.current?.pause();
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        drawRef.current = draw;
    });

    useEffect(() => {
        let frameId: number;
        const loop = () => {
            if (selectedSong) {
                drawRef.current();
            }
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [selectedSong]);

    const getSupportedMimeType = () => {
        const candidates = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];

        return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
    };

    const setupRecordingAudio = async () => {
        if (!audioRef.current) throw new Error("Audio element not ready");

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new AudioContextClass();
            sourceRef.current = null;
        }

        if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
        }

        if (!sourceRef.current) {
            sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current);
        }

        const destination = audioCtxRef.current.createMediaStreamDestination();
        sourceRef.current.disconnect();
        sourceRef.current.connect(destination);
        sourceRef.current.connect(audioCtxRef.current.destination);

        return destination;
    };

    const startRecording = async () => {
        if (!canvasRef.current || !audioRef.current) return;
        if (!selectedSong) return;
        if (!localFileUrl) {
            alert("Sube un MP3 local antes de exportar. Los enlaces de Spotify/YouTube no se pueden grabar directamente desde el navegador.");
            return;
        }
        
        try {
            setIsRecording(true);
            setRecordingProgress(0);
            const canvas = canvasRef.current;
            
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = promoImageUrl || selectedSong!.cover;
            await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

            // Stream with explicit video and audio separation
            const stream = canvas.captureStream(30);
            
            // Wait for canvas to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const destination = await setupRecordingAudio();
            destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));

            const mimeType = getSupportedMimeType();
            const recorder = new MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 12000000
            });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const songName = selectedSong?.name.replace(/\s+/g, '_') || 'snippet';
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Snippet_${songName}.webm`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10_000);
                stream.getTracks().forEach(track => track.stop());
                sourceRef.current?.disconnect();
                sourceRef.current?.connect(audioCtxRef.current!.destination);
                setRecordingProgress(0);
                setIsRecording(false);
            };

            audioRef.current.currentTime = startTime;
            await audioRef.current.play();
            setIsPlaying(true);
            recorder.start(100);

            const recordingStartTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = (Date.now() - recordingStartTime) / 1000;
                setRecordingProgress(elapsed / duration);
                if (elapsed >= duration) {
                    clearInterval(interval);
                    if (recorder.state === 'recording') recorder.stop();
                    if (audioRef.current) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                    }
                }
            }, 100);
        } catch (err) {
            console.error("Error en grabación:", err);
            alert("No se pudo iniciar la exportación. Asegúrate de que el navegador permita capturar audio.");
            setIsRecording(false);
        }
    };

    const filteredCatalog = catalog.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Panel
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Snippet <span className="text-[#c5a059]">Creator</span> <span className="text-white/20 ml-2">v2.8</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                {/* Selector Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest">1. Seleccionar Canción</h3>
                            {location.state?.song && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20 animate-pulse">
                                    AUTO-SINC
                                </span>
                            )}
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar en catálogo..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mb-6 outline-none focus:border-[#c5a059]"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {filteredCatalog.map(song => (
                                <button 
                                    key={song.id}
                                    onClick={() => {
                                        setSelectedSong(song);
                                        setCustomTitle(song.name);
                                        setCustomArtist(song.artist || "Dios Mas Gym");
                                        setStartTime(0);
                                    }}
                                    className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all ${selectedSong?.id === song.id ? 'bg-[#c5a059] text-black' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <img src={song.cover} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                    <div className="text-left overflow-hidden">
                                        <div className="text-[11px] font-bold truncate">{song.name}</div>
                                        <div className={`text-[9px] uppercase tracking-widest font-black opacity-60 ${selectedSong?.id === song.id ? 'text-black' : 'text-[#c5a059]'}`}>{song.artist}</div>
                                    </div>
                                </button>
                            ))}
                            {filteredCatalog.length === 0 && (
                                <div className="text-center py-10 opacity-30 text-[10px] uppercase font-black tracking-widest">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>

                        {selectedSong && (
                            <div className="mt-6 pt-6 border-t border-white/5 space-y-4 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Título en Video</label>
                                    <input 
                                        type="text" 
                                        value={customTitle} 
                                        onChange={e => setCustomTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all font-bold"
                                        placeholder="Ej: TITULO DE CANCIÓN"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-black tracking-widest text-white/30">Artista en Video</label>
                                    <input 
                                        type="text" 
                                        value={customArtist} 
                                        onChange={e => setCustomArtist(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-[#c5a059]/40 transition-all"
                                        placeholder="Ej: DIOS MAS GYM"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
                            <div>
                                <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-4">Paso 1: Subir MP3</h3>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <i className="fas fa-music text-xl text-[#c5a059] mb-2"></i>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{localFileUrl ? "Archivo MP3 Cargado" : "Seleccionar MP3"}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <div>
                                <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-4">Paso 2: Subir Imagen (Portada/Fondo)</h3>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <i className="fas fa-image text-xl text-[#c5a059] mb-2"></i>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{promoImageUrl ? "Imagen Cargada" : "Seleccionar Imagen"}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setPromoImageUrl(URL.createObjectURL(file));
                                    }} />
                                </label>
                                {promoImageUrl && (
                                    <button 
                                        onClick={() => {
                                            setPromoImageUrl(null);
                                            setLocalCoverUrl(null);
                                        }}
                                        className="w-full mt-2 text-[8px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all"
                                    >
                                        Quitar Imagen
                                    </button>
                                )}
                            </div>

                            {selectedSong?.id === 'local' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-2">Paso 3: Detalles Personalizados</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] text-white/40 uppercase tracking-widest mb-1 block">Nombre Canción</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedSong.name}
                                                    onChange={e => setSelectedSong({...selectedSong, name: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-[#c5a059] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[8px] text-white/40 uppercase tracking-widest mb-1 block">Artista / Feat</label>
                                                <input 
                                                    type="text" 
                                                    value={selectedSong.artist}
                                                    onChange={e => setSelectedSong({...selectedSong, artist: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-[#c5a059] outline-none"
                                                    placeholder="Ej: Juan 614 ft Dios Mas Gym"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedSong && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-left-4">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-6">2. Configurar Fragmento</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-widest mb-4">
                                        <span className="text-white/40">Inicio del Fragmento</span>
                                        <span className="text-[#c5a059]">{Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={audioRef.current?.duration ? Math.max(0, audioRef.current.duration - 60) : 300}
                                        value={startTime}
                                        onChange={e => setStartTime(parseInt(e.target.value))}
                                        className="w-full accent-[#c5a059] bg-white/10 rounded-lg h-1"
                                    />
                                    <p className="text-[9px] text-white/30 mt-4 leading-relaxed italic">
                                        * El video durará exactamente 60 segundos desde el punto de inicio seleccionado.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={handlePlayPause}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                                    >
                                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                                        {isPlaying ? 'Pausar' : 'Escuchar'}
                                    </button>
                                    <button 
                                        onClick={startRecording}
                                        disabled={isRecording}
                                        className="flex-[1.5] py-4 bg-[#c5a059] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50"
                                    >
                                        {isRecording ? <><i className="fas fa-circle-notch fa-spin mr-2"></i> Grabando...</> : <><i className="fas fa-video mr-2"></i> Exportar Video</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-8 flex flex-col items-center justify-center min-h-[600px] bg-black/40 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    {!selectedSong ? (
                        <div className="text-center text-white/20">
                            <i className="fas fa-film text-6xl mb-6"></i>
                            <p className="text-xs uppercase font-black tracking-[0.3em]">Selecciona una canción para comenzar</p>
                        </div>
                    ) : (
                        <div className="relative group">
                            <canvas 
                                ref={canvasRef}
                                width={1080}
                                height={1920}
                                className="w-[260px] h-[462px] md:w-[300px] md:h-[533px] bg-black rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-[2rem] pointer-events-none">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Vista Previa Vertical (9:16)</span>
                            </div>
                            
                            <audio 
                                ref={audioRef} 
                                src={localFileUrl || ""} 
                                onTimeUpdate={(e) => {
                                    if (!isRecording) {
                                        const curr = e.currentTarget.currentTime;
                                        if (curr > startTime + 60) {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = startTime;
                                            setIsPlaying(false);
                                        }
                                    }
                                }}
                                onEnded={() => setIsPlaying(false)}
                                onError={() => alert("Error al cargar el audio. Verifica el formato o la conexión.")}
                                crossOrigin="anonymous"
                            />
                        </div>
                    )}
                </div>
            </div>

            {isRecording && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-32 h-32 relative mb-8">
                        <div className="absolute inset-0 border-4 border-[#c5a059]/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#c5a059] rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[#c5a059] font-black text-xl">
                            {recordingProgress >= 1 ? '✓' : 'REC'}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-[0.5em] mb-4">
                        {recordingProgress >= 1 ? 'Finalizando descarga...' : 'Grabando Snippet'}
                    </h2>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-8">
                        No cierres esta pestaña hasta que la descarga comience.
                    </p>
                    <div className="w-64 bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-[#c5a059] h-full transition-all duration-100" style={{ width: `${recordingProgress * 100}%` }}></div>
                    </div>
                    {recordingProgress < 1 && (
                        <p className="text-white/20 text-[10px] uppercase tracking-widest mt-4">
                            {Math.round(recordingProgress * duration)}s / {duration}s
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoSnippetCreator;
