import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMusicCatalog } from '../../services/musicService';
import { MusicItem } from '../../types';

const VideoSnippetCreator: React.FC = () => {
    const navigate = useNavigate();
    const [catalog, setCatalog] = useState<MusicItem[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Video States
    const [startTime, setStartTime] = useState(0);
    const [duration, setDuration] = useState(60); 
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        fetchMusicCatalog('diosmasgym').then(data => {
            setCatalog(data);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        if ((selectedSong || localFileUrl) && audioRef.current) {
            audioRef.current.currentTime = startTime;
            if (isPlaying) audioRef.current.play().catch(e => console.error("Auto-play blocked or failed", e));
        }
    }, [startTime, selectedSong, localFileUrl]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLocalFileUrl(url);
            setSelectedSong({
                id: 'local',
                name: selectedSong?.id === 'local' ? selectedSong.name : file.name.split('.')[0],
                artist: selectedSong?.id === 'local' ? selectedSong.artist : 'Archivo Local',
                cover: localCoverUrl || selectedSong?.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1080',
                url: url,
                type: 'Local',
                date: new Date().toISOString()
            });
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
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.currentTime = startTime;
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    // Canvas Animation logic
    const draw = () => {
        if (!canvasRef.current || !selectedSong) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const w = 1080;
        const h = 1920;
        const time = Date.now() / 1000;
        const zoom = Math.sin(time * 0.3) * 50;

        // Background: Desenfoque de la portada
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = selectedSong.cover;
        if (!img.complete) {
            requestRef.current = requestAnimationFrame(draw);
            return;
        }

        // 1. Fondo base negro
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, w, h);

        // 2. Imagen de fondo escalada y desenfocada (Simulada con opacidad)
        ctx.globalAlpha = 0.3;
        const bgZoom = 1.2 + Math.sin(time * 0.1) * 0.1;
        ctx.drawImage(img, (w - w*bgZoom)/2, (h - h*bgZoom)/2, w*bgZoom, h*bgZoom);
        ctx.globalAlpha = 1.0;

        // 3. Gradiente de viñeta
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0,0,0,0.4)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(5,7,10,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 4. Portada con Glow Dinámico
        ctx.save();
        ctx.shadowBlur = 100 + Math.sin(time * 3) * 30;
        ctx.shadowColor = '#c5a059';
        ctx.beginPath();
        ctx.roundRect(140, 460, 800, 800, 80);
        ctx.clip();
        ctx.drawImage(img, 140 - 50 - zoom, 460 - 50 - zoom, 900 + zoom*2, 900 + zoom*2);
        ctx.restore();

        // 5. Partículas de polvo/oro
        ctx.fillStyle = 'rgba(197, 160, 89, 0.3)';
        for(let i=0; i<30; i++) {
            const px = ((Math.sin(time * 0.2 + i * 1.5) + 1) / 2) * w;
            const py = ((Math.cos(time * 0.15 + i * 2.1) + 1) / 2) * h;
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. Textos Motivacionales
        ctx.textAlign = 'center';
        
        // Tagline
        ctx.fillStyle = '#c5a059';
        ctx.font = '900 40px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '12px';
        ctx.fillText('EL ARSENAL DE FE', 540, 1400);

        // Song Name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 90px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '2px';
        ctx.fillText(selectedSong.name.toUpperCase(), 540, 1530);

        // Artist
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '400 35px Poppins';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '15px';
        ctx.fillText((selectedSong.artist || 'DIOS MAS GYM').toUpperCase(), 540, 1600);

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

        requestRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        if (selectedSong) {
            requestRef.current = requestAnimationFrame(draw);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [selectedSong, isPlaying]);

    const startRecording = async () => {
        if (!canvasRef.current || !audioRef.current) return;
        
        try {
            setIsRecording(true);
            const canvas = canvasRef.current;
            
            // Forzar carga de imagen antes de empezar para evitar parpadeos
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = selectedSong!.cover;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            const stream = canvas.captureStream(60); // 60 FPS para máxima fluidez
            
            // Audio Capture con AudioContext para mayor compatibilidad
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audioRef.current);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioCtx.destination); // Para que el usuario también escuche
            
            destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));

            const recorder = new MediaRecorder(stream, { 
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 5000000 // 5Mbps para alta calidad
            });
            
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Snippet_${selectedSong?.name.replace(/\s/g, '_')}_HQ.webm`;
                a.click();
                setIsRecording(false);
                // Limpiar
                audioCtx.close();
            };

            audioRef.current.currentTime = startTime;
            audioRef.current.play();
            setIsPlaying(true);
            recorder.start(100); // Grabar en trozos de 100ms para mayor estabilidad

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
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Snippet <span className="text-[#c5a059]">Creator</span> <span className="text-white/20 ml-2">v2.5</span></h1>
                </div>
                <div className="w-20"></div>
            </div>

            <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Selector Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-6">1. Seleccionar Canción</h3>
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
                                <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-4">Paso 2: Subir Portada (Opcional)</h3>
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#c5a059]/40 hover:bg-white/5 transition-all">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <i className="fas fa-image text-xl text-[#c5a059] mb-2"></i>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-white/40">{localCoverUrl ? "Portada Cargada" : "Seleccionar Imagen"}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                                </label>
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
                                className="w-[300px] h-[533px] bg-black rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-[2rem] pointer-events-none">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Vista Previa Vertical (9:16)</span>
                            </div>
                            
                            <audio 
                                ref={audioRef} 
                                src={selectedSong.url} 
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
                        <div className="absolute inset-0 flex items-center justify-center text-[#c5a059] font-black text-xl">REC</div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-[0.5em] mb-4">Grabando Snippet</h2>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-8">No cierres esta pestaña hasta que la descarga comience.</p>
                    <div className="w-64 bg-white/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-[#c5a059] h-full transition-all duration-100" style={{ width: `${((audioRef.current?.currentTime || 0) - startTime) / duration * 100}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoSnippetCreator;
