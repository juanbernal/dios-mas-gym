import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const brandingData = {
  none: { name: "", link: "" },
  juan614: { name: "Juan 614", link: "juan614.diosmasgym.com" },
  diosmasgym: { name: "Diosmasgym", link: "musica.diosmasgym.com" }
};

const emojiMap = {
  none: [] as string[],
  fire: ["🔥", "⚡", "💥", "✨"],
  love: ["❤️", "✨", "☁️", "🌸"],
  stars: ["✨", "🌟", "💫", "✨"],
  music: ["🎵", "🎶", "🎧", "✨"]
};

interface LyricLine {
  time: number;
  text: string;
}

const LyricStudio: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncIndex, setSyncIndex] = useState(0);
  const [syncLines, setSyncLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [vibe, setVibe] = useState("cinematic");
  const [emojiPack, setEmojiPack] = useState<keyof typeof emojiMap>("none");
  const [fontSize, setFontSize] = useState(50);
  const [textColor, setTextColor] = useState("#ffffff");
  const [glowToggle, setGlowToggle] = useState(true);
  const [leakToggle, setLeakToggle] = useState(true);
  const [branding, setBranding] = useState<keyof typeof brandingData>("none");
  const [rawLyrics, setRawLyrics] = useState("");
  const [lyricsInput, setLyricsInput] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const imgRef = useRef<HTMLImageElement>(new Image());
  const particlesRef = useRef<any[]>([]);
  
  // Audio Analysis Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Initial Particles
    particlesRef.current = Array.from({length: 25}, () => ({
      x: Math.random() * 720,
      y: Math.random() * 1280 + 1280,
      size: 20 + Math.random() * 30,
      speedY: -0.5 - Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.3,
      char: ""
    }));
  }, []);

  const setupAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      analyserRef.current = audioCtxRef.current!.createAnalyser();
      analyserRef.current.fftSize = 512;
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      if (audioRef.current) {
        sourceRef.current = audioCtxRef.current!.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current!.destination);
      }
    } catch (e) {
      console.error("Audio Context Error", e);
    }
  }, []);

  const parseLyrics = (input: string): LyricLine[] => {
    return input.split('\n').map(line => {
      const parts = line.split('|');
      if (parts.length < 2) return null;
      return { time: parseFloat(parts[0]), text: parts[1].trim() };
    }).filter((l): l is LyricLine => l !== null).sort((a, b) => a.time - b.time);
  };

  const renderFrame = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);

    let audioIntensity = 0;
    let lowEnd = 0;
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      let sum = 0; 
      for(let i=0; i<dataArrayRef.current.length; i++) sum += dataArrayRef.current[i];
      audioIntensity = (sum / dataArrayRef.current.length) / 255;
      
      let lowSum = 0; 
      for(let i=0; i<8; i++) lowSum += dataArrayRef.current[i];
      lowEnd = (lowSum / 8) / 255;
    }

    // 1. Fondo Cinemático
    ctx.save();
    const sourceImg = imgRef.current;
    let scale = Math.max(cw / (sourceImg.width || cw), ch / (sourceImg.height || ch));
    let panX = Math.sin(time * 0.1) * 30;
    let panY = Math.cos(time * 0.08) * 15;
    let shake = (lowEnd > 0.7) ? (Math.random()-0.5) * 6 * lowEnd : 0;
    let zoom = 1.05 + (lowEnd * 0.04) + Math.sin(time * 0.12) * 0.03;

    ctx.translate(cw/2 + panX + shake, ch/2 + panY + shake);
    ctx.scale(scale * zoom, scale * zoom);
    
    if (sourceImg.src) {
      ctx.translate(-sourceImg.width/2, -sourceImg.height/2);
      if (lowEnd > 0.75) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(sourceImg, 4, 0);
        ctx.drawImage(sourceImg, -4, 0);
        ctx.globalAlpha = 1.0;
      }
      ctx.drawImage(sourceImg, 0, 0);
    }
    ctx.restore();

    // Filters
    if (vibe === 'party') ctx.filter = `hue-rotate(${time * 30}deg) saturate(1.2)`;
    if (vibe === 'retro') ctx.filter = `sepia(0.3) contrast(1.1) brightness(0.9)`;
    if (vibe === 'glitch' && Math.random() > 0.96) ctx.filter = `invert(0.1) contrast(2)`;
    
    const vGrad = ctx.createRadialGradient(cw/2, ch/2, cw/4, cw/2, ch/2, ch*0.9);
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vGrad; ctx.fillRect(0,0,cw,ch);
    ctx.filter = 'none';

    // Particles
    const pack = emojiMap[emojiPack];
    particlesRef.current.forEach((p, idx) => {
      p.y += p.speedY * (1 + lowEnd);
      if (p.y < -50) { 
        p.y = ch + 50; 
        p.x = Math.random() * cw; 
        p.char = pack[Math.floor(Math.random()*pack.length)] || ""; 
      }
      
      ctx.save();
      ctx.globalAlpha = p.opacity;
      if (p.char) {
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.char, p.x, p.y);
      } else {
        ctx.fillStyle = vibe === 'party' ? `hsl(${time*100 + idx*10}, 70%, 70%)` : '#fff';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size/10, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    });

    // Branding
    if (branding !== 'none') {
      const b = brandingData[branding];
      ctx.save();
      const bx = cw/2 - 220, by = ch - 120, bw = 440, bh = 70;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); (ctx as any).roundRect(bx, by, bw, bh, 20); ctx.fill(); ctx.stroke();
      
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = '800 24px Montserrat';
      ctx.fillText(b.name.toUpperCase(), cw/2, by + 32);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 14px Inter';
      ctx.fillText(b.link, cw/2, by + 54);
      ctx.restore();
    }

    // Lyrics
    const lyrics = parseLyrics(lyricsInput);
    const active = lyrics.filter(l => time >= l.time).pop();
    if (active) {
      const elapsed = time - active.time;
      let alpha = Math.min(elapsed / 0.45, 1);
      const next = lyrics[lyrics.indexOf(active) + 1];
      if (next && (next.time - time) < 0.3) alpha = Math.max((next.time - time) / 0.3, 0);

      ctx.save();
      const yPos = ch / 2;
      
      if (glowToggle) {
        const glow = ctx.createRadialGradient(cw/2, yPos, 0, cw/2, yPos, cw*0.7);
        glow.addColorStop(0, `rgba(0,0,0,${alpha * 0.8})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, yPos - 200, cw, 400);
      }

      ctx.translate(cw/2, yPos);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;

      const blur = Math.max(0, (1 - alpha) * 15);
      if (blur > 0) ctx.filter = `blur(${blur}px)`;
      ctx.translate(0, (1-alpha) * 20);

      const words = active.text.toUpperCase().split(' ');
      let lineText = '', linesArr: string[] = [];
      ctx.font = `900 ${fontSize}px Montserrat`;
      words.forEach(w => {
        if (ctx.measureText(lineText + w).width > cw * 0.85) { linesArr.push(lineText); lineText = w + ' '; }
        else lineText += w + ' ';
      });
      linesArr.push(lineText);

      linesArr.forEach((l, i) => {
        const ly = (i - (linesArr.length-1)/2) * (fontSize * 1.35);
        ctx.font = `900 ${fontSize + (lowEnd * 4)}px Montserrat`;
        ctx.shadowColor = '#000'; ctx.shadowBlur = 30;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 12;
        ctx.strokeText(l.trim(), 0, ly);
        
        if (glowToggle) {
          ctx.shadowColor = textColor;
          ctx.shadowBlur = 8 + (lowEnd * 15);
        }

        ctx.fillStyle = textColor;
        ctx.fillText(l.trim(), 0, ly);
      });
      ctx.restore();
    }
  };

  const animate = useCallback(() => {
    if (audioRef.current && isPlaying && !isExporting) {
      setCurrentTime(audioRef.current.currentTime);
      renderFrame(audioRef.current.currentTime);
      requestRef.current = requestAnimationFrame(animate);
    } else if (!isExporting) {
      renderFrame(0);
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, isExporting, lyricsInput, vibe, emojiPack, fontSize, textColor, glowToggle, branding]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [animate]);

  const handlePlayToggle = () => {
    setupAudio();
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => imgRef.current.src = ev.target?.result as string;
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);
    }
  };

  const handleExport = async () => {
    const lyrics = parseLyrics(lyricsInput);
    if (!audioRef.current?.src || lyrics.length === 0) return alert("Sincroniza primero.");
    if (!canvasRef.current) return;

    setIsExporting(true); setIsPlaying(false); audioRef.current.pause();
    
    setupAudio();
    const stream = canvasRef.current.captureStream(60); 
    const audioStreamDest = audioCtxRef.current!.createMediaStreamDestination();
    
    sourceRef.current?.disconnect();
    sourceRef.current?.connect(audioStreamDest);
    sourceRef.current?.connect(analyserRef.current!);
    
    stream.addTrack(audioStreamDest.stream.getAudioTracks()[0]);

    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9,opus', 
      videoBitsPerSecond: 20000000 
    });

    const chunksArr: Blob[] = [];
    recorder.ondataavailable = e => chunksArr.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksArr, { type: 'video/webm' });
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob);
      a.download = `master-premium-video.webm`; a.click();
      
      sourceRef.current?.disconnect();
      sourceRef.current?.connect(analyserRef.current!);
      analyserRef.current?.connect(audioCtxRef.current!.destination);
      
      setIsExporting(false);
      setProgress(0);
    };

    const targetDuration = lyrics[lyrics.length - 1].time + 3.0;
    recorder.start(); 
    audioRef.current.currentTime = 0; 
    audioRef.current.play();
    
    const recordLoop = () => {
      if (!audioRef.current) return;
      const cur = audioRef.current.currentTime;
      renderFrame(cur);
      const pct = Math.min((cur / targetDuration) * 100, 100);
      setProgress(pct);
      
      if (cur < targetDuration && !audioRef.current.paused) {
        requestAnimationFrame(recordLoop);
      } else {
        recorder.stop();
      }
    };
    recordLoop();
  };

  const startSync = () => {
    const lines = rawLyrics.split('\n').filter(l => l.trim() !== "");
    if (lines.length === 0) return alert("Pega la letra.");
    setSyncLines(lines);
    setSyncIndex(0);
    setIsSyncing(true);
    setLyricsInput("");
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
        setupAudio();
    }
  };

  const markTime = () => {
    if (!isSyncing || syncIndex >= syncLines.length) return;
    if (!audioRef.current) return;
    
    const time = audioRef.current.currentTime.toFixed(1);
    setLyricsInput(prev => prev + `${time} | ${syncLines[syncIndex]}\n`);
    const nextIdx = syncIndex + 1;
    setSyncIndex(nextIdx);
    
    if (nextIdx >= syncLines.length) {
        setIsSyncing(false);
    }
  };

  const aiSync = async () => {
    if (!rawLyrics.trim()) return;
    alert("Función IA requiere configuración de API Key.");
    // In a real scenario, we would call Gemini here
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#030305] text-white overflow-hidden">
      {/* PREVIEW AREA */}
      <main className="flex-1 flex flex-col items-center justify-center bg-black p-4 relative">
        <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-[24px] shadow-2xl overflow-hidden shadow-cyan-500/10">
          <canvas ref={canvasRef} width="720" height="1280" className="w-full h-full block" />
        </div>
        
        <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="flex items-center justify-between w-full bg-white/5 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-lg">
            <button 
                onClick={handlePlayToggle}
                className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-[#00ffcc] transition-all"
            >
                {isPlaying ? "Pausar" : "Vista Previa"}
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-2"></div>
            <span className="text-[10px] font-mono text-zinc-400">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
          <audio 
            ref={audioRef} 
            className="hidden" 
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
        </div>
      </main>

      {/* CONTROL SIDEBAR */}
      <aside className="w-full md:w-[420px] h-full overflow-y-auto bg-[#0a0a0f] border-l border-white/5 p-8 custom-scrollbar">
        <button 
          onClick={() => navigate('/admin')}
          className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-[#00ffcc] transition-all"
        >
          <i className="fas fa-arrow-left"></i>
          Volver al Panel
        </button>

        <div className="flex items-center gap-3 mb-10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ffcc] shadow-[0_0_15px_#00ffcc]"></div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Lyric Studio <span className="text-[9px] not-italic text-zinc-600 font-bold ml-1">Modern FX / V2</span></h1>
        </div>

        {/* 1. Media */}
        <div className="mb-6 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 block">1. Media & Branding</span>
            <div className="space-y-4">
                <div>
                    <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1 block">Fondo HD</label>
                    <input type="file" onChange={handleImageChange} accept="image/*" className="w-full text-[10px] file:bg-zinc-800 file:border-0 file:text-white file:px-3 file:py-2 file:rounded-lg" />
                </div>
                <div>
                    <label className="text-[9px] text-zinc-400 uppercase font-bold mb-1 block">Audio Master</label>
                    <input type="file" onChange={handleAudioChange} accept="audio/*" className="w-full text-[10px] file:bg-zinc-800 file:border-0 file:text-white file:px-3 file:py-2 file:rounded-lg" />
                </div>
                <select 
                    value={branding} 
                    onChange={(e) => setBranding(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 p-2 text-xs rounded-lg outline-none"
                >
                    <option value="none">Sin Marca de Agua</option>
                    <option value="juan614">Juan 614 - juan614.diosmasgym.com</option>
                    <option value="diosmasgym">Diosmasgym - musica.diosmasgym.com</option>
                </select>
            </div>
        </div>

        {/* 2. Sincronización */}
        <div className="mb-6 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 block">2. Sincronización</span>
            <textarea 
                value={rawLyrics}
                onChange={(e) => setRawLyrics(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-3 text-[10px] rounded-xl h-24 mb-3 outline-none focus:border-cyan-500/30" 
                placeholder="Pega la letra limpia aquí..."
            />
            
            {isSyncing ? (
                <div className="mb-3 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/20 space-y-3 animate-pulse">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-cyan-400 uppercase font-black tracking-widest">Siguiente frase:</span>
                        <span className="text-xs text-white font-bold italic truncate">{syncLines[syncIndex]}</span>
                    </div>
                    <button 
                        onClick={markTime}
                        className="w-full bg-[#00ffcc] text-black font-black py-3 rounded-xl text-[10px] uppercase shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                    >
                        MARCAR TIEMPO (SPACE)
                    </button>
                    <button 
                        onClick={() => setIsSyncing(false)}
                        className="w-full text-[8px] uppercase text-zinc-500 font-bold"
                    >
                        Cancelar
                    </button>
                </div>
            ) : (
                <button 
                    onClick={startSync}
                    className="w-full py-3 bg-zinc-900 border border-white/5 text-[9px] uppercase font-bold rounded-xl hover:bg-zinc-800 transition-all mb-2"
                >
                    Iniciar Sincronización Manual
                </button>
            )}

            <textarea 
                value={lyricsInput}
                onChange={(e) => setLyricsInput(e.target.value)}
                className="w-full bg-black/20 border border-white/5 p-3 text-[10px] font-mono rounded-xl h-32 outline-none" 
                placeholder="0.0 | Letra de ejemplo..."
            />
        </div>

        {/* 3. Estética */}
        <div className="mb-10 p-5 bg-white/5 border border-white/5 rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 block">3. Estética Pro</span>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Vibe FX</label>
                    <select 
                        value={vibe} 
                        onChange={(e) => setVibe(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg"
                    >
                        <option value="cinematic">Cinemático Glow</option>
                        <option value="modern">Modern Minimal</option>
                        <option value="party">Fiesta Beats</option>
                        <option value="retro">Vintage 8mm</option>
                        <option value="glitch">Glitch Art</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Partículas</label>
                    <select 
                        value={emojiPack} 
                        onChange={(e) => setEmojiPack(e.target.value as any)}
                        className="w-full bg-black/40 border border-white/10 p-2 text-[10px] rounded-lg"
                    >
                        <option value="none">Ninguno</option>
                        <option value="fire">🔥 Fuego</option>
                        <option value="love">❤️ Amor</option>
                        <option value="stars">✨ Brillos</option>
                        <option value="music">🎵 Notas</option>
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Tamaño Fuente</label>
                    <input type="range" min="30" max="100" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-full accent-[#00ffcc]" />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] text-zinc-500 uppercase font-bold">Color Texto</label>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 rounded-lg bg-transparent border-0 cursor-pointer" />
                </div>
            </div>

            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={glowToggle} onChange={() => setGlowToggle(!glowToggle)} className="w-4 h-4 accent-[#00ffcc]" />
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Glow Aura</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={leakToggle} onChange={() => setLeakToggle(!leakToggle)} className="w-4 h-4 accent-[#00ffcc]" />
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Light Leaks</span>
                </label>
            </div>
        </div>

        {/* 4. Export */}
        <div className="pb-12">
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-4 bg-[#00ffcc] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-50"
            >
                {isExporting ? "Procesando Master..." : "Exportar Master Final"}
            </button>
            
            {isExporting && (
                <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 animate-fade-in text-center">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#00ffcc]">Rindiendo Frames</span>
                        <span className="text-xs font-black">{Math.floor(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00ffcc] transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="mt-2 text-[8px] text-white/40 uppercase">No cierres esta pestaña hasta finalizar</p>
                </div>
            ) }
        </div>
      </aside>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LyricStudio;
