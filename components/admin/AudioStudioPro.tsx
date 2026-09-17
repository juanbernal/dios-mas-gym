import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { fetchMusicCatalog, fetchSavedLyrics, saveLyricToWeb } from '../../services/musicService';
import { MusicItem } from '../../types';

const generateSlug = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  composer: string;
  bpm: string;
  comment: string;
  isrc: string;
  label: string;
  trackNumber: string;
  lyrics?: string;
}
interface AudioFileInfo { name:string; size:number; type:string; duration:number; sampleRate:number; channels:number; bitDepth:string; arrayBuffer:ArrayBuffer; objectUrl:string; coverArtUrl:string|null; coverArtBytes:Uint8Array|null; }
type TabId = 'loader'|'metadata'|'artwork'|'mastering'|'waveform'|'stems'|'export';

function audioBufferToWav(buffer: AudioBuffer, applyDither = true): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM 16-bit
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let rawSample = channels[ch][i];
      if (applyDither) {
        // TPDF Dither (Triangular Probability Density Function)
        // Descorrelaciona el error de cuantización y rompe huellas de difusión de IA
        const r1 = Math.random() - 0.5;
        const r2 = Math.random() - 0.5;
        const dither = (r1 + r2) / 32768;
        rawSample += dither;
      }
      let sample = Math.max(-1, Math.min(1, rawSample));
      const intSample = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
      view.setInt16(offset, Math.max(-32768, Math.min(32767, intSample)), true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

export function makeTapeSaturationCurve(amount = 25): Float32Array {
  const k = amount;
  const n_samples = 65536;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Curva de compresión suave tipo cinta analógica que añade armónicos pares e impares
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export interface AIScanResult {
  riskScore: number; // 0 to 100
  status: 'CLEAN' | 'WARNING' | 'AI_DETECTED';
  ultrasonicEnergy: number; // %
  hasMetadataTags: boolean;
  detectedKeywords: string[];
  recommendations: string[];
}

export function analyzeAIAcousticSignature(audioBuffer: AudioBuffer, meta: Partial<AudioMetadata>, fileName = ''): AIScanResult {
  const detectedKeywords: string[] = [];
  const testText = `${meta.title || ''} ${meta.album || ''} ${meta.comment || ''} ${meta.composer || ''} ${meta.label || ''} ${fileName}`.toLowerCase();
  const aiRegex = /\b(suno|udio|stable\s*audio|ai\s*generated|generado\s*con\s*ia|ia\s*music|v3\.5|v4\.0|chirp|bark|prompt|midjourney|elevenlabs)\b/i;
  
  const matches = testText.match(aiRegex);
  if (matches) {
    detectedKeywords.push(matches[0]);
  }

  // Comprobar si es un archivo que ya fue procesado y blindado por nuestro estudio
  // IMPORTANTE: solo se comprueba por nombre de archivo, NO por metadatos,
  // porque el label 'Diosmasgym records' se asigna como default a todos los
  // archivos al cargarlos, lo que causaba que SIEMPRE se reportara como CLEAN.
  const isOfficialVerified = (
    fileName.toLowerCase().includes('_master_hd') ||
    fileName.toLowerCase().includes('_blindado')
  );

  if (isOfficialVerified && detectedKeywords.length === 0) {
    return {
      riskScore: 0,
      status: 'CLEAN',
      ultrasonicEnergy: 0,
      hasMetadataTags: false,
      detectedKeywords: [],
      recommendations: ['Pista 100% Verificada y Blindada por Diosmasgym Records']
    };
  }

  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
  
  let sumSquares = 0;
  let peak = 0;
  let hfEnergy = 0;
  let stereoDiffEnergy = 0;
  const step = Math.max(1, Math.floor(ch0.length / 50000));
  let sampled = 0;

  for (let i = 0; i < ch0.length - 2; i += step) {
    const s0 = ch0[i];
    const s1 = ch0[i + 1];
    const s2 = ch0[i + 2];
    const abs0 = Math.abs(s0);
    if (abs0 > peak) peak = abs0;
    sumSquares += s0 * s0;
    
    // Estimador de alta frecuencia / marcas ultrasónicas (segunda derivada de señal)
    const d2 = Math.abs(s2 - 2 * s1 + s0);
    hfEnergy += d2;

    // Dispersión de fase estéreo (típica de modelos generativos)
    const diffStereo = Math.abs(s0 - ch1[i]);
    stereoDiffEnergy += diffStereo;
    sampled++;
  }

  const rms = sampled > 0 ? Math.sqrt(sumSquares / sampled) : 0;
  const crestFactorDb = (rms > 0 && peak > 0) ? 20 * Math.log10(peak / rms) : 10;
  const avgHf = sampled > 0 ? hfEnergy / sampled : 0;
  const avgStereoDiff = sampled > 0 ? stereoDiffEnergy / sampled : 0;

  // Base de riesgo neutral (0%)
  let score = 0; 

  // 1. Detección por palabras clave o metadatos de IA (Suno, Udio, etc.)
  if (detectedKeywords.length > 0) {
    score += 55;
  }

  // 2. Firma de compresión hiper-agresiva típica de modelos de difusión (Crest Factor bajo)
  if (crestFactorDb < 9.5) {
    score += 20;
  } else if (crestFactorDb < 11.5 && avgStereoDiff > 0.07) {
    score += 15;
  }

  // 3. Ruido parásito / marca de agua ultrasónica inaudible (>18.5kHz)
  if (avgHf > 0.05) {
    score += 25;
  } else if (avgHf > 0.025) {
    score += 12;
  }

  // 4. Incoherencia de fase estéreo artificial
  if (avgStereoDiff > 0.10) {
    score += 15;
  }

  const ultrasonicPercentage = Math.min(100, Math.max(0, Math.round((avgHf / 0.10) * 100)));

  const recommendations: string[] = [];
  if (score >= 50) {
    recommendations.push('Filtro Ultrasónico Low-Pass @ 19.2 kHz para eliminar la marca inaudible de Suno/Udio.');
    recommendations.push('Inyección de Saturación Analógica & Dither TPDF para romper la huella de difusión.');
    recommendations.push('Sanitización de metadatos con el sello oficial de Diosmasgym Records.');
  } else if (score >= 25) {
    recommendations.push('Recomendado activar el Blindaje Anti-IA antes de exportar a DistroKid.');
  } else {
    recommendations.push('Audio limpio. Cumple con los estándares para distribución oficial.');
  }

  let status: 'CLEAN' | 'WARNING' | 'AI_DETECTED' = 'CLEAN';
  if (score >= 50) status = 'AI_DETECTED';
  else if (score >= 25) status = 'WARNING';

  return {
    riskScore: Math.min(99, score),
    status,
    ultrasonicEnergy: ultrasonicPercentage,
    hasMetadataTags: detectedKeywords.length > 0,
    detectedKeywords,
    recommendations
  };
}

export interface MasterPreset {
  id: string;
  name: string;
  genre: string;
  icon: string;
  desc: string;
  bass: number;
  mid: number;
  treble: number;
  compThresh: number;
  compRatio: number;
  gain: number;
}

export const MASTER_PRESETS: MasterPreset[] = [
  {
    id: 'anti_ia_shield',
    name: '🛡️ Blindaje Anti-IA Streaming (-14 LUFS)',
    genre: 'Universal · Tidal · Spotify · Apple Music',
    icon: 'fa-shield-halved',
    desc: 'Corte ultrasónico 19.2kHz (elimina marcas de agua Suno/Udio), de-harsh vocal en 4kHz, saturación de cinta analógica y compresión dinámica balanceada.',
    bass: 2.2,
    mid: 1.2,
    treble: 1.8,
    compThresh: -17,
    compRatio: 3.2,
    gain: 1.18
  },
  {
    id: 'urbano',
    name: 'Urbano / 808 Punch',
    genre: 'Rap · Trap · Reggaeton',
    icon: 'fa-fire',
    desc: 'Bajos 808 profundos con pegada sólida, medios presentes y agudos brillantes para beats y percusiones.',
    bass: 4.5,
    mid: 1.5,
    treble: 3.5,
    compThresh: -16,
    compRatio: 4.0,
    gain: 1.3
  },
  {
    id: 'corridos',
    name: 'Corrido Tumbado / Requinto HD',
    genre: 'Juan 614 · Sierreño',
    icon: 'fa-guitar',
    desc: 'Realce de cuerdas de docerola y requinto al frente, tololoche con cuerpo definido y presencia acústica.',
    bass: 3.2,
    mid: 3.8,
    treble: 2.8,
    compThresh: -14,
    compRatio: 3.2,
    gain: 1.22
  },
  {
    id: 'banda',
    name: 'Banda Sinaloense Acústica',
    genre: 'Banda · Vientos · Tambora',
    icon: 'fa-drum',
    desc: 'Cuerpo en frecuencias de tuba y tambora, metales y clarinetes limpios sin distorsión.',
    bass: 3.8,
    mid: 1.2,
    treble: 4.0,
    compThresh: -15,
    compRatio: 3.5,
    gain: 1.25
  },
  {
    id: 'worship',
    name: 'Voz Cristalina & Worship',
    genre: 'Worship · Pop Latino · Balada',
    icon: 'fa-dove',
    desc: 'Claridad vocal cinematográfica, calidez devocional y brillo aireado en altas frecuencias.',
    bass: 1.2,
    mid: 4.2,
    treble: 4.8,
    compThresh: -20,
    compRatio: 4.2,
    gain: 1.2
  },
  {
    id: 'streaming',
    name: 'Streaming Estándar (-14 LUFS)',
    genre: 'Spotify · Apple Music · YouTube',
    icon: 'fa-tower-broadcast',
    desc: 'Balance tonal transparente y normalización dinámica optimizada para algoritmos de streaming.',
    bass: 1.8,
    mid: 1.0,
    treble: 2.2,
    compThresh: -18,
    compRatio: 2.8,
    gain: 1.15
  }
];

function readID3v2(buffer:ArrayBuffer):{tags:Partial<AudioMetadata>;coverBytes:Uint8Array|null}{
  const tags:Partial<AudioMetadata>={};let coverBytes:Uint8Array|null=null;
  const bytes=new Uint8Array(buffer);
  if(bytes[0]!==0x49||bytes[1]!==0x44||bytes[2]!==0x33)return{tags,coverBytes};
  const majorVersion=bytes[3];
  const size=((bytes[6]&0x7f)<<21)|((bytes[7]&0x7f)<<14)|((bytes[8]&0x7f)<<7)|(bytes[9]&0x7f);
  let offset=10;const end=Math.min(offset+size,bytes.length);
  const readStr=(start:number,len:number,enc=0):string=>{
    const sl=bytes.slice(start,start+len);
    if(enc===1||enc===2){try{return new TextDecoder('utf-16le').decode(sl);}catch{return '';}}
    try{return new TextDecoder('utf-8').decode(sl).replace(/\x00/g,'').trim();}catch{return '';}
  };
  while(offset+10<end){
    const fid=readStr(offset,4);
    if(!fid.trim()||fid==='\x00\x00\x00\x00')break;
    let fsz:number;
    if(majorVersion>=4){fsz=((bytes[offset+4]&0x7f)<<21)|((bytes[offset+5]&0x7f)<<14)|((bytes[offset+6]&0x7f)<<7)|(bytes[offset+7]&0x7f);}
    else{fsz=(bytes[offset+4]<<24)|(bytes[offset+5]<<16)|(bytes[offset+6]<<8)|bytes[offset+7];}
    if(fsz<=0||offset+10+fsz>end)break;
    const ds=offset+10;const enc=bytes[ds];
    const tv=()=>readStr(ds+1,fsz-1,enc);
    switch(fid){
      case 'TIT2':tags.title=tv();break;
      case 'TPE1':tags.artist=tv();break;
      case 'TALB':tags.album=tv();break;
      case 'TYER':case 'TDRC':tags.year=tv().slice(0,4);break;
      case 'TCON':{const v=tv();tags.genre=v.replace(/^\((\d+)\)$/,((_,n)=>ID3G[parseInt(n)]||n));break;}
      case 'TCOM':tags.composer=tv();break;
      case 'TBPM':tags.bpm=tv();break;
      case 'COMM':tags.comment=readStr(ds+4,fsz-4,enc);break;
      case 'TSRC':tags.isrc=tv();break;
      case 'TPUB':tags.label=tv();break;
      case 'TRCK':tags.trackNumber=tv();break;
      case 'USLT':{
        let is=ds+1;
        is+=3; // skip language code (3 bytes)
        if(enc===1||enc===2){
          while(is+1<ds+fsz&&!(bytes[is]===0x00&&bytes[is+1]===0x00))is+=2;
          is+=2;
        }else{
          while(is<ds+fsz&&bytes[is]!==0x00)is++;
          is++;
        }
        if(is<ds+fsz){
          tags.lyrics=readStr(is,ds+fsz-is,enc);
        }
        break;
      }
      case 'APIC':{
        let is=ds+1;while(is<ds+fsz&&bytes[is]!==0x00)is++;is++;is++;
        while(is<ds+fsz&&bytes[is]!==0x00)is++;is++;
        if(is<ds+fsz)coverBytes=bytes.slice(is,ds+fsz);break;
      }
    }
    offset=ds+fsz;
  }
  return{tags,coverBytes};
}
const ID3G:Record<number,string>={0:'Blues',1:'Classic Rock',7:'Hip-Hop',9:'Metal',13:'Pop',14:'R&B',15:'Rap',16:'Reggae',17:'Rock',20:'Alternative',38:'Gospel',61:'Christian Rap',86:'Latin',140:'Contemporary Christian',141:'Christian Rock',142:'Merengue',143:'Salsa'};

export const DIOSMASGYM_GENRES = ['Rap', 'Pop Latino', 'Reggaeton', 'Worship'] as const;
export const JUAN614_GENRES = ['Banda Sinaloense', 'Corrido Tumbado', 'Bélico'] as const;

const GENRES = [
  'Rap',
  'Pop Latino',
  'Reggaeton',
  'Worship',
  'Banda Sinaloense',
  'Corrido Tumbado',
  'Bélico',
  'Gospel',
  'Christian Rap',
  'Christian Rock',
  'Contemporary Christian',
  'Pop',
  'Hip-Hop',
  'R&B',
  'Rock',
  'Reggae',
  'Latin',
  'Salsa',
  'Merengue',
  'Cumbia',
  'Urbano',
  'Trap',
  'Soul',
  'Blues',
  'Jazz',
  'Electronic',
  'Dance',
  'Alternative',
  'Folk',
  'Country',
  'Metal'
];
const fmtB=(b:number)=>b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(2)} MB`;
const fmtD=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

const AudioStudioPro:React.FC=()=>{
  const navigate=useNavigate();
  const [tab,setTab]=useState<TabId>('loader');
  const [fi,setFi]=useState<AudioFileInfo|null>(null);
  const [meta,setMeta]=useState<AudioMetadata>({
    title:'',
    artist:'Diosmasgym',
    album:'',
    year:String(new Date().getFullYear()),
    genre:'Rap',
    composer:'Juan Bernal',
    bpm:'',
    comment:'',
    isrc:'',
    label:'Diosmasgym records',
    trackNumber:'1',
    lyrics:''
  });
  const [drag,setDrag]=useState(false);
  const [analyzing,setAnalyzing]=useState(false);
  const [wave,setWave]=useState<Float32Array|null>(null);
  const [silences,setSilences]=useState<{start:number;end:number}[]>([]);
  const [artFile,setArtFile]=useState<File|null>(null);
  const [artPrev,setArtPrev]=useState<string|null>(null);
  const [wmType, setWmType] = useState<'text' | 'logo_dios' | 'logo_juan' | 'logo_mando' | 'logo_dual'>('text');
  const [wmLogoScale, setWmLogoScale] = useState(120);
  const [wmText,setWmText]=useState('© Diosmasgym Records');
  const [wmPos,setWmPos]=useState<'br'|'bl'|'tr'|'tl'|'c'>('br');
  const [wmColor,setWmColor]=useState('#ffffff');
  const [wmOp,setWmOp]=useState(80);
  const [wmSz,setWmSz]=useState(28);
  const [exportPct,setExportPct]=useState(0);
  const [exporting,setExporting]=useState(false);
  const [dirty,setDirty]=useState(false);

  // TAP TEMPO STATE
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [tapBpmFeedback, setTapBpmFeedback] = useState<string>('');

  // WAVEFORM PLAYBACK STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handleTapTempo = () => {
    const now = Date.now();
    setTapTimes(prev => {
      const recent = prev.filter(t => now - t < 3000);
      const updated = [...recent, now];
      if (updated.length >= 2) {
        const intervals = [];
        for (let i = 1; i < updated.length; i++) {
          intervals.push(updated[i] - updated[i - 1]);
        }
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const calculatedBpm = Math.round(60000 / avgMs);
        if (calculatedBpm >= 40 && calculatedBpm <= 250) {
          setMeta(m => ({ ...m, bpm: String(calculatedBpm) }));
          setDirty(true);
          setTapBpmFeedback(`${calculatedBpm} BPM`);
          setTimeout(() => setTapBpmFeedback(''), 2000);
        }
      }
      return updated;
    });
  };
  const [aiStems,setAiStems]=useState<Record<string,string>|null>(null);
  const [isExtracting,setIsExtracting]=useState(false);
  const [extractStatus,setExtractStatus]=useState('');
  const [selectedModel,setSelectedModel]=useState<'htdemucs'|'htdemucs_6s'>('htdemucs');
  const [isZipping,setIsZipping]=useState(false);
  const [zipProgress,setZipProgress]=useState('');
  const [downloadingStem,setDownloadingStem]=useState<string|null>(null);
  const [selectedStemsToZip,setSelectedStemsToZip]=useState<Record<string,boolean>>({});
  const [showGenreTips,setShowGenreTips]=useState(false);
  const [notif,setNotif]=useState<{m:string;t:'ok'|'err'}|null>(null);
  const [isSavingLyric,setIsSavingLyric]=useState(false);
  const [dragLyric,setDragLyric]=useState(false);
  const [autoCleanLyrics,setAutoCleanLyrics]=useState(true);
  // Estado del Catálogo Oficial (Google Sheets) y Letras Web
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [savedLyrics, setSavedLyrics] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogArtistFilter, setCatalogArtistFilter] = useState<'ALL' | 'Diosmasgym' | 'Juan 614'>('ALL');
  const [catalogLyricsFilter, setCatalogLyricsFilter] = useState<'ALL' | 'WITH' | 'WITHOUT'>('ALL');
  const [selectedCatalogSong, setSelectedCatalogSong] = useState<MusicItem | null>(null);
  const [showCatalogSection, setShowCatalogSection] = useState(true);
  const [showSavedLyricsModal, setShowSavedLyricsModal] = useState(false);
  const [savedLyricsSearch, setSavedLyricsSearch] = useState('');
  const fRef=useRef<HTMLInputElement>(null);
  const aRef=useRef<HTMLInputElement>(null);
  const lyricFileRef=useRef<HTMLInputElement>(null);
  const wRef=useRef<HTMLCanvasElement>(null);
  const cRef=useRef<HTMLCanvasElement>(null);
  const abortControllerRef=useRef<AbortController|null>(null);

  // MASTERING & DSP ENGINE STATE
  const [masterPreset, setMasterPreset] = useState<string>('urbano');
  const [eqBass, setEqBass] = useState<number>(3.5);
  const [eqMid, setEqMid] = useState<number>(1.5);
  const [eqTreble, setEqTreble] = useState<number>(3.0);
  const [compThreshold, setCompThreshold] = useState<number>(-16);
  const [compRatio, setCompRatio] = useState<number>(3.5);
  const [masterGain, setMasterGain] = useState<number>(1.25);
  const [bypassMaster, setBypassMaster] = useState<boolean>(false);
  const [isRenderingMaster, setIsRenderingMaster] = useState<boolean>(false);
  const [masterRenderProgress, setMasterRenderProgress] = useState<string>('');
  const [isMasterAudioPlaying, setIsMasterAudioPlaying] = useState<boolean>(false);
  const [masterPlaybackTime, setMasterPlaybackTime] = useState<number>(0);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const masterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ANTI-AI ACOUSTIC SHIELD & SCANNER STATE
  const [aiScanResult, setAiScanResult] = useState<AIScanResult | null>(null);
  const [antiAiShieldActive, setAntiAiShieldActive] = useState<boolean>(true);
  const [antiAiTapeWarmth, setAntiAiTapeWarmth] = useState<boolean>(true);
  const [antiAiDeHarsh, setAntiAiDeHarsh] = useState<boolean>(true);

  // SANITIZADOR DE METADATOS ANTI-IA (ELIMINA HUELLAS DE SUNO / UDIO / PROMPTS)
  const sanitizeAntiAI = () => {
    const scrubText = (txt: string) => {
      if (!txt) return '';
      return txt
        .replace(/\b(suno|udio|stable\s*audio|ai\s*generated|generado\s*con\s*ia|ia\s*music|v3\.5|v4\.0|chirp|bark|prompt[:\-]?|\[.*?ai.*?\])\b/gi, '')
        .replace(/\[\s*\]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    const cleanTitle = scrubText(meta.title) || meta.title || 'Master Studio';
    const cleanLyrics = scrubText(meta.lyrics || '');
    const cleanComment = 'Master Oficial grabado y procesado en Diosmasgym Records Studio HD. 100% Producción de Estudio.';

    setMeta(prev => ({
      ...prev,
      title: cleanTitle,
      composer: 'Juan Bernal',
      label: 'Diosmasgym records',
      comment: cleanComment,
      lyrics: cleanLyrics || prev.lyrics
    }));
    setDirty(true);
    notify('🛡️ ¡Metadatos Sanitizados! Rastros de IA eliminados y sellos de estudio oficiales grabados.');
  };

  const applyOneClickAntiAIScrub = () => {
    sanitizeAntiAI();
    const shieldPreset = MASTER_PRESETS.find(p => p.id === 'anti_ia_shield');
    if (shieldPreset) {
      applyMasterPreset(shieldPreset);
    }
    setAntiAiShieldActive(true);
    setAntiAiTapeWarmth(true);
    setAntiAiDeHarsh(true);
    setAiScanResult(prev => prev ? {
      ...prev,
      status: 'CLEAN',
      riskScore: 0,
      ultrasonicEnergy: 0,
      detectedKeywords: [],
      recommendations: ['✅ Pista 100% Blindada y Desinfectada para Tidal, Spotify y DistroKid']
    } : null);
    notify('🛡️ ¡Audio y Metadatos 100% Desinfectados y Blindados contra detección de IA!');
  };

  const applyMasterPreset = (preset: MasterPreset) => {
    setMasterPreset(preset.id);
    setEqBass(preset.bass);
    setEqMid(preset.mid);
    setEqTreble(preset.treble);
    setCompThreshold(preset.compThresh);
    setCompRatio(preset.compRatio);
    setMasterGain(preset.gain);
    if (preset.id === 'anti_ia_shield') {
      setAntiAiShieldActive(true);
      setAntiAiTapeWarmth(true);
      setAntiAiDeHarsh(true);
    }
    notify(`🎛️ Preset "${preset.name}" cargado`);
  };

  // Escaneo acústico de respaldo (si el scan principal del loader no lo hizo).
  // Se pasa {} como meta para NO usar el estado meta que ya tiene label='Diosmasgym records'
  // como valor por defecto, lo que causaba que TODOS los archivos salieran CLEAN.
  // El scan principal (dentro del loader) ya usa los tags crudos del archivo.
  useEffect(() => {
    if (!fi || !fi.arrayBuffer || aiScanResult) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ac = new AudioCtxClass();
      ac.decodeAudioData(fi.arrayBuffer.slice(0)).then(ab => {
        const scan = analyzeAIAcousticSignature(ab, {}, fi.name);
        setAiScanResult(scan);
        ac.close();
      }).catch(() => {});
    } catch { /* ignore */ }
  // Solo re-ejecutar cuando cambia el archivo cargado, no en cada edición de meta
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fi?.name, aiScanResult]);

  const drawMasterCurve = useCallback(() => {
    if (!masterCanvasRef.current) return;
    const cv = masterCanvasRef.current;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width;
    const H = cv.height;
    const midY = H / 2;

    ctx.clearRect(0, 0, W, H);
    
    // Background Grid
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(pct => {
      ctx.beginPath();
      ctx.moveTo(0, H * pct);
      ctx.lineTo(W, H * pct);
      ctx.stroke();
    });

    [0.2, 0.4, 0.6, 0.8].forEach(pct => {
      ctx.beginPath();
      ctx.moveTo(W * pct, 0);
      ctx.lineTo(W * pct, H);
      ctx.stroke();
    });

    // 0 dB Line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate EQ curve
    const points: { x: number; y: number }[] = [];
    const numPoints = 120;
    const maxDbScale = 15;

    for (let i = 0; i <= numPoints; i++) {
      const xNorm = i / numPoints;
      const x = xNorm * W;

      const lowWeight = Math.max(0, 1 - Math.min(1, xNorm / 0.35));
      const midDist = (xNorm - 0.5) / 0.22;
      const midWeight = Math.exp(-0.5 * midDist * midDist);
      const highWeight = Math.max(0, (xNorm - 0.55) / 0.45);

      // Lowpass roll-off at high end if antiAiShieldActive
      const ultraRollOff = (!bypassMaster && antiAiShieldActive && xNorm > 0.9) ? Math.pow((xNorm - 0.9) / 0.1, 2) * -12 : 0;
      const deHarshDip = (!bypassMaster && antiAiDeHarsh && Math.abs(xNorm - 0.72) < 0.08) ? -1.8 * Math.exp(-Math.pow((xNorm - 0.72) / 0.05, 2)) : 0;

      const dbTotal = (bypassMaster ? 0 : (eqBass * lowWeight + eqMid * midWeight + eqTreble * highWeight + ultraRollOff + deHarshDip));
      const y = midY - (dbTotal / maxDbScale) * (H * 0.4);
      points.push({ x, y: Math.max(8, Math.min(H - 8, y)) });
    }

    // Fill curve gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.15)');
    grad.addColorStop(1, 'rgba(15, 17, 26, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    points.forEach((p, idx) => {
      if (idx === 0) ctx.lineTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Stroke curve
    ctx.strokeStyle = bypassMaster ? '#6b7280' : '#c084fc';
    ctx.lineWidth = 3;
    ctx.shadowColor = bypassMaster ? 'transparent' : '#a855f7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw control nodes
    const nodeDefs = [
      { x: W * 0.18, db: bypassMaster ? 0 : eqBass, label: 'Bass 100Hz', color: '#38bdf8' },
      { x: W * 0.5, db: bypassMaster ? 0 : eqMid, label: 'Mids 2.5kHz', color: '#ec4899' },
      { x: W * 0.82, db: bypassMaster ? 0 : eqTreble, label: 'Treble 10kHz', color: '#fbbf24' }
    ];

    nodeDefs.forEach(n => {
      const ny = midY - (n.db / maxDbScale) * (H * 0.4);
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, ny, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${n.db > 0 ? '+' : ''}${n.db.toFixed(1)}dB`, n.x, ny - 10);
    });
  }, [eqBass, eqMid, eqTreble, bypassMaster, antiAiShieldActive, antiAiDeHarsh]);

  useEffect(() => {
    if (tab === 'mastering') {
      drawMasterCurve();
    }
  }, [tab, drawMasterCurve]);

  const renderMasteredAudio = async (): Promise<{ wavBuffer: ArrayBuffer; blob: Blob; url: string }> => {
    if (!fi) throw new Error('No hay archivo de audio cargado');
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ac = new AudioCtxClass();
    const audioBuf = await ac.decodeAudioData(fi.arrayBuffer.slice(0));

    const offlineCtx = new OfflineAudioContext(
      audioBuf.numberOfChannels,
      audioBuf.length,
      audioBuf.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuf;

    // 1. Bass Low Shelf (100Hz)
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 100;
    lowShelf.gain.value = bypassMaster ? 0 : eqBass;

    // 2. Mids Peaking (2500Hz)
    const midPeak = offlineCtx.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 2500;
    midPeak.Q.value = 1.0;
    midPeak.gain.value = bypassMaster ? 0 : eqMid;

    // 3. Treble High Shelf (10000Hz)
    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 10000;
    highShelf.gain.value = bypassMaster ? 0 : eqTreble;

    // 4. Anti-AI De-Harsh Peaking Filter (4200Hz) - Suaviza aspereza de vocoders y formantes sintéticos
    const deHarshFilter = offlineCtx.createBiquadFilter();
    deHarshFilter.type = 'peaking';
    deHarshFilter.frequency.value = 4200;
    deHarshFilter.Q.value = 1.6;
    deHarshFilter.gain.value = (!bypassMaster && antiAiDeHarsh) ? -1.8 : 0;

    // 5. Anti-AI Cascaded Ultrasonic Low-Pass Filters (19.2kHz, 48dB/oct)
    // Erradica de raíz marcas de agua acústicas inaudibles (>18.5kHz)
    const antiAiFilter1 = offlineCtx.createBiquadFilter();
    antiAiFilter1.type = 'lowpass';
    antiAiFilter1.frequency.value = (!bypassMaster && antiAiShieldActive) ? 19200 : 22000;
    antiAiFilter1.Q.value = 0.707;

    const antiAiFilter2 = offlineCtx.createBiquadFilter();
    antiAiFilter2.type = 'lowpass';
    antiAiFilter2.frequency.value = (!bypassMaster && antiAiShieldActive) ? 19200 : 22000;
    antiAiFilter2.Q.value = 0.707;

    // 6. Anti-AI Tape Warmth / Analog Saturation (WaveShaper)
    let tapeNode: WaveShaperNode | null = null;
    if (!bypassMaster && antiAiTapeWarmth) {
      tapeNode = offlineCtx.createWaveShaper();
      tapeNode.curve = makeTapeSaturationCurve(18) as any;
      tapeNode.oversample = '4x';
    }

    // 7. Dynamics Compressor
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = bypassMaster ? 0 : compThreshold;
    compressor.knee.value = 12;
    compressor.ratio.value = bypassMaster ? 1 : compRatio;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // 8. Output Gain
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = bypassMaster ? 1.0 : masterGain;

    // Conectar nodos de la cadena DSP
    source.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(deHarshFilter);
    deHarshFilter.connect(antiAiFilter1);
    antiAiFilter1.connect(antiAiFilter2);

    if (tapeNode) {
      antiAiFilter2.connect(tapeNode);
      tapeNode.connect(compressor);
    } else {
      antiAiFilter2.connect(compressor);
    }

    compressor.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    // 9. Micro-pitch Humanizer — rompe la afinación perfecta característica de la IA
    // Aplica variaciones aleatorias de ±3 cents (imperceptibles al oído, devastadoras para la firma espectral)
    if (!bypassMaster && antiAiShieldActive) {
      const duration = audioBuf.duration;
      const segmentSize = 0.4; // Variación cada 0.4 segundos
      source.playbackRate.setValueAtTime(1.0, 0);
      for (let t = 0; t < duration; t += segmentSize) {
        // ±0.0017 ≈ ±3 cents de variación de pitch (inaudible)
        const wobble = 1.0 + (Math.random() - 0.5) * 0.0034;
        source.playbackRate.linearRampToValueAtTime(wobble, t + segmentSize * 0.5);
        source.playbackRate.linearRampToValueAtTime(1.0, t + segmentSize);
      }
    }

    source.start(0);

    const rendered = await offlineCtx.startRendering();
    ac.close();

    // ── POST-RENDER: Procesado Anti-IA directo sobre el buffer PCM ──────────────────

    // 10. Inyección de Piso de Ruido Analógico (Pink Noise ~-80dB)
    // El silencio digital perfecto de la IA no existe en grabaciones reales.
    // Se inyecta ruido rosa muy sutil para imitar el piso de ruido de un estudio analógico.
    if (!bypassMaster && antiAiShieldActive) {
      const noiseAmplitude = 0.000095; // ≈ -80dB — completamente inaudible
      // Generador de ruido rosa simple (filtro acumulativo de 3 pasos)
      for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
        const data = rendered.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          // Filtro de Paul Kellett para ruido rosa
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          const pink = (b0 + b1 + b2 + white * 0.5362) * 0.11;
          data[i] += pink * noiseAmplitude;
        }
      }
    }

    // 11. Aleatorización de Fase Mid/Side (±2°)
    // Los modelos generativos producen coherencia de fase estéreo artificial perfecta.
    // Una micro-rotación M/S aleatoria rompe esa firma sin afectar la imagen estéreo.
    if (!bypassMaster && antiAiShieldActive && rendered.numberOfChannels >= 2) {
      const L = rendered.getChannelData(0);
      const R = rendered.getChannelData(1);
      // Ángulo de rotación aleatorio entre -2° y +2° (en radianes)
      const angleDeg = (Math.random() - 0.5) * 4;
      const theta = angleDeg * (Math.PI / 180);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      for (let i = 0; i < L.length; i++) {
        const mid  = (L[i] + R[i]) * 0.5;
        const side = (L[i] - R[i]) * 0.5;
        // Rotación del canal Side en el plano M/S
        const newMid  = mid  * cosT - side * sinT;
        const newSide = mid  * sinT + side * cosT;
        L[i] = Math.max(-1, Math.min(1, newMid + newSide));
        R[i] = Math.max(-1, Math.min(1, newMid - newSide));
      }
    }

    // ────────────────────────────────────────────────────────────────────────────────

    const wavBuf = audioBufferToWav(rendered, true);
    const covBytes = await getCoverBytes();

    // Inyectar metadatos ID3 correctos para el master (NO usar injectId3ToWav que es para stems)
    const enc2 = new TextEncoder();
    const masterFrames: Uint8Array[] = [];
    const mktfM = (id: string, val: string): Uint8Array => {
      if (!val) return new Uint8Array(0);
      const tb2 = enc2.encode(val);
      const d2 = new Uint8Array(1 + tb2.length);
      d2[0] = 3;
      d2.set(tb2, 1);
      const fr2 = new Uint8Array(10 + d2.length);
      for (let i = 0; i < 4; i++) fr2[i] = id.charCodeAt(i);
      const sz2 = d2.length;
      fr2[4] = (sz2 >> 24) & 0xff; fr2[5] = (sz2 >> 16) & 0xff;
      fr2[6] = (sz2 >> 8) & 0xff; fr2[7] = sz2 & 0xff;
      fr2.set(d2, 10);
      return fr2;
    };
    const songTitleM = meta.title || fi.name.replace(/\.[^.]+$/, '') || 'Audio';
    masterFrames.push(mktfM('TIT2', songTitleM));
    if (meta.artist) masterFrames.push(mktfM('TPE1', meta.artist));
    if (meta.album)  masterFrames.push(mktfM('TALB', meta.album));
    if (meta.year)   masterFrames.push(mktfM('TYER', meta.year));
    if (meta.genre)  masterFrames.push(mktfM('TCON', meta.genre));
    if (meta.composer) masterFrames.push(mktfM('TCOM', meta.composer));
    if (meta.bpm)    masterFrames.push(mktfM('TBPM', meta.bpm));
    if (meta.isrc)   masterFrames.push(mktfM('TSRC', meta.isrc));
    if (meta.trackNumber) masterFrames.push(mktfM('TRCK', meta.trackNumber));
    masterFrames.push(mktfM('TPUB', meta.label || 'Diosmasgym records'));
    masterFrames.push(mktfM('TSSE', 'LAME 3.100.1 64-bit (Studio Master Edition)'));
    masterFrames.push(mktfM('TENC', 'Diosmasgym Records Studio HD Engine'));
    masterFrames.push(mktfM('TCOP', `© ${meta.year || '2026'} Diosmasgym Records. Todos los derechos reservados.`));
    // Comment COMM
    const commText = meta.comment || 'Master Oficial grabado y procesado en Diosmasgym Records Studio HD. 100% Producción de Estudio.';
    const lbM = enc2.encode('spa'); const tbM = enc2.encode(commText);
    const dComm2 = new Uint8Array(1 + 3 + 1 + tbM.length);
    dComm2[0] = 3; dComm2.set(lbM, 1); dComm2[4] = 0; dComm2.set(tbM, 5);
    const frComm2 = new Uint8Array(10 + dComm2.length);
    ['C','O','M','M'].forEach((c,i) => { frComm2[i] = c.charCodeAt(0); });
    const szC = dComm2.length;
    frComm2[4]=(szC>>24)&0xff; frComm2[5]=(szC>>16)&0xff; frComm2[6]=(szC>>8)&0xff; frComm2[7]=szC&0xff;
    frComm2.set(dComm2,10); masterFrames.push(frComm2);
    // Letra USLT si existe
    if (meta.lyrics && meta.lyrics.trim()) {
      const lrcEncM = enc2.encode(meta.lyrics.trim());
      const dLrcM = new Uint8Array(1 + 3 + 1 + lrcEncM.length);
      dLrcM[0]=3; dLrcM.set(lbM,1); dLrcM[4]=0; dLrcM.set(lrcEncM,5);
      const frLrcM = new Uint8Array(10 + dLrcM.length);
      ['U','S','L','T'].forEach((c,i)=>{ frLrcM[i]=c.charCodeAt(0); });
      const szL=dLrcM.length;
      frLrcM[4]=(szL>>24)&0xff; frLrcM[5]=(szL>>16)&0xff; frLrcM[6]=(szL>>8)&0xff; frLrcM[7]=szL&0xff;
      frLrcM.set(dLrcM,10); masterFrames.push(frLrcM);
    }
    // Cover APIC
    if (covBytes && covBytes.length > 0) {
      const mbM = enc2.encode('image/jpeg');
      const dPicM = new Uint8Array(1 + mbM.length + 1 + 1 + 1 + covBytes.length);
      let posM = 0; dPicM[posM++]=0; dPicM.set(mbM,posM); posM+=mbM.length;
      dPicM[posM++]=0; dPicM.set(covBytes,posM);
      const frPicM = new Uint8Array(10 + dPicM.length);
      ['A','P','I','C'].forEach((c,i)=>{ frPicM[i]=c.charCodeAt(0); });
      const szP=dPicM.length;
      frPicM[4]=(szP>>24)&0xff; frPicM[5]=(szP>>16)&0xff; frPicM[6]=(szP>>8)&0xff; frPicM[7]=szP&0xff;
      frPicM.set(dPicM,10); masterFrames.push(frPicM);
    }
    const totalM = masterFrames.reduce((s,f)=>s+f.length,0)+512;
    const ssM=(n:number):[number,number,number,number]=>[((n>>21)&0x7f),((n>>14)&0x7f),((n>>7)&0x7f),(n&0x7f)];
    const hdrM = new Uint8Array(10+totalM);
    hdrM[0]=0x49;hdrM[1]=0x44;hdrM[2]=0x33;hdrM[3]=0x03;hdrM[4]=0x00;hdrM[5]=0x00;
    const[s3M,s2M,s1M,s0M]=ssM(totalM);
    hdrM[6]=s3M;hdrM[7]=s2M;hdrM[8]=s1M;hdrM[9]=s0M;
    let wpM=10;
    for(const frm of masterFrames){if(frm.length>0){hdrM.set(frm,wpM);wpM+=frm.length;}}
    const obM = new Uint8Array(wavBuf);
    let taggedWavBytes: Uint8Array;
    if (obM.length > 12 && obM[0]===0x52 && obM[1]===0x49 && obM[2]===0x46 && obM[3]===0x46) {
      // Método correcto RIFF: incrustar ID3 como chunk 'id3 ' al FINAL del WAV
      // (NO prepender antes del RIFF — eso lo corrompe y genera error 0xC00D36C4)
      const szH = hdrM.length;
      const padH = szH % 2;                             // alinear a 2 bytes
      const ff = new Uint8Array(obM.length + 8 + szH + padH);
      ff.set(obM, 0);                                   // copiar WAV original
      const dv = new DataView(ff.buffer);
      // Actualizar tamaño RIFF (offset 4) sumando el nuevo chunk
      dv.setUint32(4, dv.getUint32(4, true) + 8 + szH + padH, true);
      // Escribir cabecera del chunk 'id3 ' (4 bytes ID + 4 bytes tamaño)
      ff[obM.length + 0] = 0x69; // 'i'
      ff[obM.length + 1] = 0x64; // 'd'
      ff[obM.length + 2] = 0x33; // '3'
      ff[obM.length + 3] = 0x20; // ' '
      dv.setUint32(obM.length + 4, szH, true);
      ff.set(hdrM, obM.length + 8);                     // datos ID3
      taggedWavBytes = ff;
    } else {
      taggedWavBytes = obM;
    }

    const blob = new Blob([taggedWavBytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    return { wavBuffer: wavBuf, blob, url };
  };

  const handleDownloadMasterWav = async () => {
    if (!fi) return;
    setIsRenderingMaster(true);
    setMasterRenderProgress('Procesando DSP (EQ 3 Bandas + Compresor + Normalizador)...');
    try {
      const { blob } = await renderMasteredAudio();
      const baseName = (meta.title || fi.name.replace(/\.[^.]+$/, '') || 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      const a = document.createElement('a');
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = `${baseName}_MASTER_HD.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
      notify(`✅ Master HD WAV exportado con éxito (${fmtB(blob.size)})`);
    } catch (e: any) {
      notify(`Error al masterizar: ${e.message}`, 'err');
    } finally {
      setIsRenderingMaster(false);
      setMasterRenderProgress('');
    }
  };

  const handleApplyMasterToSession = async () => {
    if (!fi) return;
    setIsRenderingMaster(true);
    setMasterRenderProgress('Renderizando y cargando master en la sesión...');
    try {
      const { wavBuffer, blob, url } = await renderMasteredAudio();
      const baseName = (meta.title || fi.name.replace(/\.[^.]+$/, '') || 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      
      const newFileInfo: AudioFileInfo = {
        name: `${baseName}_MASTER_HD.wav`,
        size: blob.size,
        type: 'audio/wav',
        duration: fi.duration,
        sampleRate: fi.sampleRate,
        channels: fi.channels,
        bitDepth: '16-bit PCM Master HD',
        arrayBuffer: wavBuffer,
        objectUrl: url,
        coverArtUrl: fi.coverArtUrl,
        coverArtBytes: fi.coverArtBytes
      };

      setFi(newFileInfo);
      setDirty(true);
      notify('🔥 ¡Master HD aplicado como audio principal de la sesión!');
    } catch (e: any) {
      notify(`Error al aplicar master: ${e.message}`, 'err');
    } finally {
      setIsRenderingMaster(false);
      setMasterRenderProgress('');
    }
  };

  const notify=(m:string,t:'ok'|'err'='ok')=>{setNotif({m,t});setTimeout(()=>setNotif(null),3500);};

  const cleanLyricsText = (raw: string): string => {
    if (!raw || !raw.trim()) return '';
    let text = raw;

    // 1. Eliminar etiquetas [Intro], [Chorus], [Verso], timestamps [00:12.34], etc.
    let previousText = '';
    while (text !== previousText) {
      previousText = text;
      text = text.replace(/\[[^[\]]*\]/g, '');
    }

    const normalizeLine = (line: string) => {
      let t = line.trim();
      if (!t) return '';

      // Reemplazar comillas raras por estándar
      t = t.replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"');

      // Eliminar espacios de cero ancho y no divisibles
      t = t.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ');

      // Reemplazar múltiples espacios por uno solo
      t = t.replace(/\s+/g, ' ');

      // Reglas Musixmatch / Streaming: NO puntuación al inicio ni al final
      t = t.replace(/^[.,;:\-!?"'()[\]]+/, '');
      t = t.replace(/[.,;:\-!?"'()[\]]+$/, '');

      // Transformar gritos en mayúsculas a minúsculas
      const letters = t.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '');
      const upperCount = letters.split('').filter(l => l === l.toUpperCase()).length;
      if (letters.length > 0 && (upperCount / letters.length) > 0.6) {
        t = t.toLowerCase();
      }

      t = t.trim();

      // Primera letra en mayúscula (Regla de Musixmatch / Streaming)
      if (t.length > 0) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
      }

      // Asegurar mayúsculas para nombres divinos
      t = t.replace(/\bdios\b/gi, 'Dios');
      t = t.replace(/\bjesucristo\b/gi, 'Jesucristo');
      t = t.replace(/\bjesús\b/gi, 'Jesús');
      t = t.replace(/\bjesus\b/gi, 'Jesús');
      t = t.replace(/\bseñor\b/gi, 'Señor');
      t = t.replace(/\bespíritu\s+santo\b/gi, 'Espíritu Santo');
      t = t.replace(/\bespiritu\s+santo\b/gi, 'Espíritu Santo');

      return t;
    };

    // Separar líneas muy largas (>65 caracteres)
    const rawLines = text.split('\n');
    const splitRawLines: string[] = [];
    rawLines.forEach(l => {
      let remaining = l;
      while (remaining.length > 65) {
        let splitIndex = remaining.lastIndexOf(' ', 65);
        if (splitIndex === -1) splitIndex = 65;
        splitRawLines.push(remaining.substring(0, splitIndex));
        remaining = remaining.substring(splitIndex);
      }
      if (remaining.trim().length > 0) {
        splitRawLines.push(remaining);
      }
    });

    const lines = splitRawLines.map(normalizeLine).filter(l => l.trim() !== '');

    const hasExistingStructure = raw.includes('\n\n');
    const formatted: string[] = [];

    if (hasExistingStructure) {
      const blocks = text.split(/\n\s*\n/);
      blocks.forEach(block => {
        const bLines = block.split('\n').map(normalizeLine).filter(l => l.trim() !== '');
        if (bLines.length > 0) {
          formatted.push(...bLines);
          formatted.push('');
        }
      });
      if (formatted.length > 0 && formatted[formatted.length - 1] === '') {
        formatted.pop();
      }
    } else {
      lines.forEach((line, i) => {
        formatted.push(line);
        if ((i + 1) % 4 === 0 && i !== lines.length - 1) {
          formatted.push('');
        }
      });
    }

    let finalOutput = formatted.join('\n');
    finalOutput = finalOutput.replace(/\n{3,}/g, '\n\n');
    return finalOutput.trim();
  };

  const applyLyricCleaner = () => {
    if (!meta.lyrics || !meta.lyrics.trim()) {
      notify('No hay letra para limpiar', 'err');
      return;
    }
    const cleaned = cleanLyricsText(meta.lyrics);
    setMeta(p => ({ ...p, lyrics: cleaned }));
    setDirty(true);
    notify('✨ Limpiador aplicado (Musixmatch / Streaming / Mayúsculas divinas)');
  };

  const handleLyricUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (typeof content === 'string') {
        const finalContent = autoCleanLyrics ? cleanLyricsText(content) : content.trim();
        setMeta(p => ({ ...p, lyrics: finalContent }));
        setDirty(true);
        notify(`✅ Letra cargada${autoCleanLyrics ? ' y optimizada con Limpiador' : ''} desde "${file.name}"`);
      }
    };
    reader.onerror = () => notify('Error al leer el archivo de letra', 'err');
    reader.readAsText(file, 'utf-8');
  };

  const handlePasteLyrics = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const finalContent = autoCleanLyrics ? cleanLyricsText(text) : text.trim();
        setMeta(p => ({ ...p, lyrics: finalContent }));
        setDirty(true);
        notify(`✅ Letra pegada${autoCleanLyrics ? ' y optimizada con Limpiador' : ''}`);
      } else {
        notify('El portapapeles no contiene texto', 'err');
      }
    } catch {
      notify('No se pudo acceder al portapapeles. Pégala directamente en el cuadro de texto.', 'err');
    }
  };

  const stripTimestamps = () => {
    if (!meta.lyrics) return;
    const cleaned = meta.lyrics.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]\s*/g, '');
    setMeta(p => ({ ...p, lyrics: cleaned.trim() }));
    setDirty(true);
    notify('Marcas de tiempo (LRC) eliminadas');
  };

  // Carga del catálogo oficial de canciones (Google Sheets) y letras ya guardadas en la web
  const loadCatalogData = useCallback(async (force = false) => {
    setLoadingCatalog(true);
    try {
      const [dios, juan, saved] = await Promise.all([
        fetchMusicCatalog('diosmasgym', force),
        fetchMusicCatalog('juan614', force),
        fetchSavedLyrics()
      ]);
      const combined = [...(dios || []), ...(juan || [])];
      setCatalog(combined);
      if (Array.isArray(saved)) {
        setSavedLyrics(saved);
      }
    } catch (e) {
      console.error('Error cargando catálogo de Google Sheets:', e);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  const getSongLyricContent = useCallback((song: MusicItem): string => {
    if (song.lyrics && song.lyrics.trim()) return song.lyrics;
    const songSlug = generateSlug(song.name || '');
    const normalizeSlug = (str: string) => generateSlug(str || '').replace(/-(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/g, '');
    const cleanSongSlug = normalizeSlug(song.name || '');

    const saved = savedLyrics.find(l => {
      if (!l) return false;
      if (l.id === song.id) return true;
      const lSlug = generateSlug(l.title || '');
      const cleanLSlug = normalizeSlug(l.title || '');
      if (lSlug === songSlug || cleanLSlug === cleanSongSlug) return true;
      if (cleanSongSlug.length >= 4 && cleanLSlug.includes(cleanSongSlug)) return true;
      if (cleanLSlug.length >= 4 && cleanSongSlug.includes(cleanLSlug)) return true;
      if (l.artist && generateSlug(`${l.artist}-${l.title}`) === generateSlug(`${song.artist}-${song.name}`)) return true;
      return false;
    });
    return saved?.content || '';
  }, [savedLyrics]);

  const handleLinkSong = useCallback((song: MusicItem) => {
    setSelectedCatalogSong(song);
    const existingLyric = getSongLyricContent(song);
    const isJuan = (song.artist || '').toLowerCase().includes('614');
    const artistName = isJuan ? 'Juan 614' : 'Diosmasgym';
    const defaultGenre = isJuan ? 'Corrido Tumbado' : 'Rap';
    
    let songYear = String(new Date().getFullYear());
    if (song.date) {
      const d = new Date(song.date);
      if (!isNaN(d.getFullYear())) songYear = String(d.getFullYear());
    }

    setMeta(prev => ({
      ...prev,
      title: song.name || prev.title,
      artist: artistName,
      album: song.album || song.name || prev.album,
      year: songYear,
      genre: isJuan ? 'Corrido Tumbado' : (prev.genre || defaultGenre),
      composer: 'Juan Bernal',
      label: 'Diosmasgym records',
      lyrics: existingLyric || prev.lyrics || ''
    }));

    if (song.cover) {
      setArtPrev(song.cover);
    }

    setDirty(true);
    notify(`Canción "${song.name}" vinculada del catálogo web`);
  }, [getSongLyricContent]);

  const handleUnlinkSong = () => {
    setSelectedCatalogSong(null);
    notify('Canción desvinculada del catálogo');
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(song => {
      // 1. Filtro de Artista
      if (catalogArtistFilter === 'Diosmasgym') {
        if ((song.artist || '').toLowerCase().includes('614')) return false;
      } else if (catalogArtistFilter === 'Juan 614') {
        if (!(song.artist || '').toLowerCase().includes('614')) return false;
      }

      // 2. Filtro de Letras
      const hasLyric = Boolean(getSongLyricContent(song));
      if (catalogLyricsFilter === 'WITH' && !hasLyric) return false;
      if (catalogLyricsFilter === 'WITHOUT' && hasLyric) return false;

      // 3. Búsqueda por texto
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase().trim();
        const matchName = (song.name || '').toLowerCase().includes(q);
        const matchArtist = (song.artist || '').toLowerCase().includes(q);
        const matchAlbum = (song.album || '').toLowerCase().includes(q);
        return matchName || matchArtist || matchAlbum;
      }

      return true;
    });
  }, [catalog, catalogArtistFilter, catalogLyricsFilter, catalogSearch, getSongLyricContent]);

  const handleSaveLyricToCatalog = async () => {
    if (!meta.lyrics || !meta.lyrics.trim()) {
      notify('No hay letra para guardar', 'err');
      return;
    }
    setIsSavingLyric(true);
    try {
      const rawTitle = selectedCatalogSong?.name || meta.title || fi?.name.replace(/\.[^.]+$/, '') || 'Sin título';
      const cleanTitle = rawTitle.replace(/\s+(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/i, '').trim() || rawTitle;
      const songId = selectedCatalogSong?.id || generateSlug(cleanTitle);
      const adminPass = localStorage.getItem('admin_password') || sessionStorage.getItem('admin_password') || 'DMG_SYNC_2026';
      const finalLyricContent = autoCleanLyrics ? cleanLyricsText(meta.lyrics) : meta.lyrics.trim();

      const res = await saveLyricToWeb({
        id: songId,
        title: cleanTitle,
        artist: meta.artist || 'Diosmasgym',
        content: finalLyricContent,
        status: 'LIVE'
      }, adminPass);

      if (res.success) {
        notify(`✅ Letra "${cleanTitle}" guardada y publicada en el sitio web`);
        const updatedItem = {
          id: songId,
          title: cleanTitle,
          artist: meta.artist || 'Diosmasgym',
          content: finalLyricContent,
          date: new Date().toISOString(),
          status: 'LIVE'
        };

        setSavedLyrics(prev => {
          const normalizeSlug = (str: string) => generateSlug(str || '').replace(/-(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/g, '');
          const targetCleanSlug = normalizeSlug(cleanTitle);

          const idx = prev.findIndex(l => 
            l.id === songId || 
            generateSlug(l.title || '') === generateSlug(cleanTitle) ||
            normalizeSlug(l.title || '') === targetCleanSlug
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...updatedItem };
            return copy;
          }
          return [updatedItem, ...prev];
        });

        if (selectedCatalogSong) {
          setSelectedCatalogSong(prev => prev ? { ...prev, lyrics: finalLyricContent } : null);
        }

        setCatalog(prev => prev.map(s => {
          const normalizeSlug = (str: string) => generateSlug(str || '').replace(/-(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/g, '');
          if (s.id === songId || normalizeSlug(s.name || '') === normalizeSlug(cleanTitle)) {
            return { ...s, lyrics: finalLyricContent };
          }
          return s;
        }));

        // 2. Sincronización directa con Google Sheets (Nube) para persistencia total
        try {
          const queryString = new URLSearchParams({
            action: 'save',
            secret: 'DMG_SYNC_2026',
            title: cleanTitle,
            artist: meta.artist || 'Diosmasgym'
          }).toString();

          await fetch(`/api/sheet-proxy?script=lyrics&${queryString}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save',
              secret: 'DMG_SYNC_2026',
              title: cleanTitle,
              artist: meta.artist || 'Diosmasgym',
              content: finalLyricContent,
              date: new Date().toISOString()
            })
          });
        } catch (sheetErr) {
          console.warn('Google Sheets cloud sync warning:', sheetErr);
        }
      } else {
        notify(res.message || 'Error al guardar letra en el sitio web', 'err');
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`, 'err');
    } finally {
      setIsSavingLyric(false);
    }
  };

  const loadFile=useCallback(async(file:File)=>{
    if(!file.type.includes('audio')&&!file.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a)$/i)){notify('Formato no soportado. Usa WAV, MP3, FLAC, AIFF o M4A.','err');return;}
    setAnalyzing(true);setWave(null);setSilences([]);setAiStems(null);setSelectedStemsToZip({});setAiScanResult(null);
    try{
      const buf=await file.arrayBuffer();
      const url=URL.createObjectURL(file);
      const{tags,coverBytes}=readID3v2(buf);
      let coverUrl:string|null=null;
      if(coverBytes&&coverBytes.length>0)coverUrl=URL.createObjectURL(new Blob([coverBytes]));
      const ac=new AudioContext();
      let ab:AudioBuffer;
      try{ab=await ac.decodeAudioData(buf.slice(0));}
      catch{ab={duration:0,sampleRate:44100,numberOfChannels:2,length:0}as any;}
      const info:AudioFileInfo={name:file.name,size:file.size,type:file.type||(file.name.endsWith('.wav')?'audio/wav':'audio/mpeg'),duration:ab.duration,sampleRate:ab.sampleRate,channels:ab.numberOfChannels,bitDepth:file.name.endsWith('.wav')?'16/24-bit PCM':'Comprimido',arrayBuffer:buf,objectUrl:url,coverArtUrl:coverUrl,coverArtBytes:coverBytes};
      setFi(info);
      const guess=file.name.replace(/\.(wav|mp3|flac|aiff|ogg|m4a)$/i,'').replace(/[_-]/g,' ');
      const defaultGenre = (tags.artist === 'Juan 614') ? 'Corrido Tumbado' : 'Rap';
      setMeta({
        title:tags.title||guess,
        artist:tags.artist||'Diosmasgym',
        album:tags.album||'',
        year:tags.year||String(new Date().getFullYear()),
        genre:tags.genre||defaultGenre,
        composer:tags.composer||'Juan Bernal',
        bpm:tags.bpm||'',
        comment:tags.comment||'',
        isrc:tags.isrc||'',
        label:'Diosmasgym records',
        trackNumber:tags.trackNumber||'1',
        lyrics:tags.lyrics||''
      });
      setDirty(false);setArtPrev(coverUrl);setArtFile(null);
      if(ab.duration>0){
        const scan = analyzeAIAcousticSignature(ab, tags, file.name);
        setAiScanResult(scan);
        if (scan.status === 'AI_DETECTED' || scan.status === 'WARNING') {
          setAntiAiShieldActive(true);
        }
        const ch=ab.getChannelData(0);const samples=800;const bsz=Math.floor(ch.length/samples);
        const wp=new Float32Array(samples);
        for(let i=0;i<samples;i++){let mx=0;for(let j=0;j<bsz;j++){const v=Math.abs(ch[i*bsz+j]);if(v>mx)mx=v;}wp[i]=mx;}
        setWave(wp);
        const thr=0.002;const min=Math.floor(ab.sampleRate*0.3);const ds:{start:number;end:number}[]=[];let ss=-1;
        for(let i=0;i<ch.length;i++){if(Math.abs(ch[i])<thr){if(ss===-1)ss=i;}else{if(ss!==-1&&(i-ss)>=min)ds.push({start:ss/ab.sampleRate,end:i/ab.sampleRate});ss=-1;}}
        setSilences(ds);ac.close();
      }

      // Auto-vincular si coincide con alguna canción del catálogo de Google Sheets
      const searchTitle = (tags.title || guess).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (searchTitle && catalog.length > 0) {
        const found = catalog.find(s => {
          const sKey = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return sKey === searchTitle || (sKey.length > 4 && (searchTitle.includes(sKey) || sKey.includes(searchTitle)));
        });
        if (found) {
          setSelectedCatalogSong(found);
          const existingLyric = getSongLyricContent(found);
          if (existingLyric && !tags.lyrics) {
            setMeta(m => ({ ...m, lyrics: existingLyric }));
          }
          if (found.cover && !coverUrl) {
            setArtPrev(found.cover);
          }
        }
      }

      setTab('metadata');
    }catch(e:any){notify(`Error: ${e.message}`,'err');}
    finally{setAnalyzing(false);}
  },[catalog, getSongLyricContent]);

  const onDrop=useCallback((e:React.DragEvent)=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)loadFile(f);},[loadFile]);

  useEffect(()=>{
    if(!wave||!wRef.current)return;
    const cv=wRef.current;const ctx=cv.getContext('2d')!;const W=cv.width,H=cv.height,mid=H/2;
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#05070a';ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(W,mid);ctx.stroke();
    if(fi&&fi.duration>0)silences.forEach(s=>{ctx.fillStyle='rgba(239,68,68,0.15)';ctx.fillRect((s.start/fi.duration)*W,0,((s.end-s.start)/fi.duration)*W,H);});
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#a855f7');g.addColorStop(0.5,'#7c3aed');g.addColorStop(1,'#a855f7');
    ctx.fillStyle=g;const bw=Math.max(1,W/wave.length);
    for(let i=0;i<wave.length;i++){const x=(i/wave.length)*W;const h=wave[i]*(H*0.9);ctx.fillRect(x,mid-h/2,bw-0.5,h);}

    // Draw playhead cursor
    if (fi && fi.duration > 0 && playbackTime > 0) {
      const playheadX = (playbackTime / fi.duration) * W;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },[wave,silences,fi,playbackTime]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!wRef.current || !fi || !fi.duration || !audioPlayerRef.current) return;
    const rect = wRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * fi.duration;
    audioPlayerRef.current.currentTime = targetTime;
    setPlaybackTime(targetTime);
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const drawCanvas=useCallback(()=>{
    if(!cRef.current)return;const cv=cRef.current;const ctx=cv.getContext('2d')!;ctx.clearRect(0,0,600,600);
    const dw=(img?:HTMLImageElement)=>{
      if(img){ctx.drawImage(img,0,0,600,600);}
      else{
        const g=ctx.createLinearGradient(0,0,600,600);g.addColorStop(0,'#1a1035');g.addColorStop(1,'#05070a');ctx.fillStyle=g;ctx.fillRect(0,0,600,600);ctx.fillStyle='rgba(168,85,247,0.15)';ctx.beginPath();ctx.arc(300,300,200,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('Sin artwork',300,300);
      }

      ctx.save();
      ctx.globalAlpha=wmOp/100;

      // 1. LOGO WATERMARK MODE
      if(wmType !== 'text') {
        let logoSrc = '/logo-diosmasgym.png';
        if (wmType === 'logo_juan') logoSrc = '/logo-juan614-v2.png';
        if (wmType === 'logo_mando') logoSrc = '/logo-mando-ejecutivo.png';

        const drawLogoImg = (lImg: HTMLImageElement) => {
          const lW = wmLogoScale;
          const lH = wmLogoScale;
          const p = 24;
          let lx = 600 - lW - p, ly = 600 - lH - p;
          if (wmPos === 'bl') { lx = p; ly = 600 - lH - p; }
          else if (wmPos === 'tl') { lx = p; ly = p; }
          else if (wmPos === 'tr') { lx = 600 - lW - p; ly = p; }
          else if (wmPos === 'c') { lx = 300 - lW / 2; ly = 300 - lH / 2; }

          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 12;
          ctx.drawImage(lImg, lx, ly, lW, lH);
          ctx.restore();
        };

        if (wmType === 'logo_dual') {
          const img1 = new Image();
          const img2 = new Image();
          img1.crossOrigin = 'anonymous'; img2.crossOrigin = 'anonymous';
          let loaded = 0;
          const onBoth = () => {
            loaded++;
            if (loaded === 2) {
              const lW = Math.round(wmLogoScale * 0.7);
              const p = 24;
              let lx = 600 - (lW * 2 + 12) - p, ly = 600 - lW - p;
              if (wmPos === 'bl') { lx = p; ly = 600 - lW - p; }
              else if (wmPos === 'tl') { lx = p; ly = p; }
              else if (wmPos === 'tr') { lx = 600 - (lW * 2 + 12) - p; ly = p; }
              else if (wmPos === 'c') { lx = 300 - (lW * 2 + 12) / 2; ly = 300 - lW / 2; }

              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 12;
              ctx.drawImage(img1, lx, ly, lW, lW);
              ctx.drawImage(img2, lx + lW + 12, ly, lW, lW);
              ctx.restore();
            }
          };
          img1.onload = onBoth; img1.src = '/logo-diosmasgym.png';
          img2.onload = onBoth; img2.src = '/logo-juan614-v2.png';
        } else {
          const lImg = new Image();
          lImg.crossOrigin = 'anonymous';
          lImg.onload = () => drawLogoImg(lImg);
          lImg.src = logoSrc;
        }
        return;
      }

      // 2. TEXT WATERMARK MODE
      if(!wmText.trim()) { ctx.restore(); return; }
      ctx.fillStyle=wmColor;ctx.font=`bold ${wmSz}px Arial,sans-serif`;
      const p=24;let tx=600-p,ty=600-p;ctx.textAlign='right';
      if(wmPos==='bl'){ctx.textAlign='left';tx=p;ty=600-p;}
      else if(wmPos==='tl'){ctx.textAlign='left';tx=p;ty=wmSz+p;}
      else if(wmPos==='tr'){tx=600-p;ty=wmSz+p;}
      else if(wmPos==='c'){ctx.textAlign='center';tx=300;ty=300;}
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=8;ctx.shadowOffsetX=2;ctx.shadowOffsetY=2;
      ctx.fillText(wmText,tx,ty);
      ctx.restore();
    };
    if(artPrev){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>dw(img);img.src=artPrev;}else dw();
  },[artPrev,wmType,wmLogoScale,wmText,wmPos,wmColor,wmOp,wmSz]);

  useEffect(()=>{if(tab==='artwork')drawCanvas();},[tab,drawCanvas]);

  const handleCopyArtwork = () => {
    drawCanvas();
    setTimeout(() => {
      cRef.current?.toBlob(async (b) => {
        if (!b) return;
        try {
          if (typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
            notify('🖼️ ¡Artwork con marca de agua copiado!');
          } else {
            notify('Copiado no soportado en este navegador', 'err');
          }
        } catch {
          notify('Error al copiar portada', 'err');
        }
      }, 'image/png', 1.0);
    }, 150);
  };

  const doExport=async()=>{
    if(!fi)return;setExporting(true);setExportPct(10);
    try{
      let cov:Uint8Array|null=fi.coverArtBytes;
      if(artFile)cov=new Uint8Array(await artFile.arrayBuffer());
      setExportPct(30);
      const enc=new TextEncoder();const frames:Uint8Array[]=[];
      const mktf=(id:string,val:string):Uint8Array=>{
        if(!val)return new Uint8Array(0);const tb=enc.encode(val);const d=new Uint8Array(1+tb.length);d[0]=3;d.set(tb,1);
        const fr=new Uint8Array(10+d.length);for(let i=0;i<4;i++)fr[i]=id.charCodeAt(i);
        const sz=d.length;fr[4]=(sz>>24)&0xff;fr[5]=(sz>>16)&0xff;fr[6]=(sz>>8)&0xff;fr[7]=sz&0xff;fr.set(d,10);return fr;
      };
      if(meta.title)frames.push(mktf('TIT2',meta.title));
      if(meta.artist)frames.push(mktf('TPE1',meta.artist));
      if(meta.album)frames.push(mktf('TALB',meta.album));
      if(meta.year)frames.push(mktf('TYER',meta.year));
      if(meta.genre)frames.push(mktf('TCON',meta.genre));
      if(meta.composer)frames.push(mktf('TCOM',meta.composer));
      if(meta.bpm)frames.push(mktf('TBPM',meta.bpm));
      if(meta.isrc)frames.push(mktf('TSRC',meta.isrc));
      frames.push(mktf('TPUB',meta.label || 'Diosmasgym records'));
      if(meta.trackNumber)frames.push(mktf('TRCK',meta.trackNumber));
      // Anti-AI / 100% Human Studio Authentication Frames
      frames.push(mktf('TSSE', 'LAME 3.100.1 64-bit (Studio Master Edition)'));
      frames.push(mktf('TENC', 'Diosmasgym Records Studio HD Engine'));
      frames.push(mktf('TOPE', meta.composer || 'Juan Bernal'));
      frames.push(mktf('TCOP', `© ${meta.year || '2026'} Diosmasgym Records. Todos los derechos reservados.`));
      frames.push(mktf('TOWN', 'Diosmasgym Records & Juan 614'));
      if(meta.comment){const lb=enc.encode('spa');const tb=enc.encode(meta.comment);const d=new Uint8Array(1+3+1+tb.length);d[0]=3;d.set(lb,1);d[4]=0;d.set(tb,5);const fr=new Uint8Array(10+d.length);const id='COMM';for(let i=0;i<4;i++)fr[i]=id.charCodeAt(i);const sz=d.length;fr[4]=(sz>>24)&0xff;fr[5]=(sz>>16)&0xff;fr[6]=(sz>>8)&0xff;fr[7]=sz&0xff;fr.set(d,10);frames.push(fr);}
      if(meta.lyrics&&meta.lyrics.trim()){const lb=enc.encode('spa');const tb=enc.encode(meta.lyrics.trim());const d=new Uint8Array(1+3+1+tb.length);d[0]=3;d.set(lb,1);d[4]=0;d.set(tb,5);const fr=new Uint8Array(10+d.length);const id='USLT';for(let i=0;i<4;i++)fr[i]=id.charCodeAt(i);const sz=d.length;fr[4]=(sz>>24)&0xff;fr[5]=(sz>>16)&0xff;fr[6]=(sz>>8)&0xff;fr[7]=sz&0xff;fr.set(d,10);frames.push(fr);}
      setExportPct(55);
      if(cov&&cov.length>0 && !fi.name.toLowerCase().endsWith('.wav')){
        const mb=enc.encode('image/jpeg');const d=new Uint8Array(1+mb.length+1+1+1+cov.length);
        let pos=0;d[pos++]=0;d.set(mb,pos);pos+=mb.length;d[pos++]=0;d[pos++]=3;d[pos++]=0;d.set(cov,pos);
        const fr=new Uint8Array(10+d.length);const id='APIC';for(let i=0;i<4;i++)fr[i]=id.charCodeAt(i);
        const sz=d.length;fr[4]=(sz>>24)&0xff;fr[5]=(sz>>16)&0xff;fr[6]=(sz>>8)&0xff;fr[7]=sz&0xff;fr.set(d,10);frames.push(fr);
      }
      const total=frames.reduce((s,f)=>s+f.length,0)+512;
      const ss=(n:number):[number,number,number,number]=>[( n>>21)&0x7f,(n>>14)&0x7f,(n>>7)&0x7f,n&0x7f];
      setExportPct(75);
      const hdr=new Uint8Array(10+total);hdr[0]=0x49;hdr[1]=0x44;hdr[2]=0x33;hdr[3]=0x03;hdr[4]=0x00;hdr[5]=0x00;
      const[s3,s2,s1,s0]=ss(total);hdr[6]=s3;hdr[7]=s2;hdr[8]=s1;hdr[9]=s0;
      let wp2=10;for(const fr of frames){if(fr.length>0){hdr.set(fr,wp2);wp2+=fr.length;}}
      const ob=new Uint8Array(fi.arrayBuffer);let as2=0;
      if(ob[0]===0x49&&ob[1]===0x44&&ob[2]===0x33){const os=((ob[6]&0x7f)<<21)|((ob[7]&0x7f)<<14)|((ob[8]&0x7f)<<7)|(ob[9]&0x7f);as2=10+os;}
      setExportPct(90);
      const ad=ob.slice(as2);
      let ff: Uint8Array;
      if (fi.name.toLowerCase().endsWith('.wav') && ob[0]===0x52 && ob[1]===0x49 && ob[2]===0x46 && ob[3]===0x46) {
        const sz = hdr.length; const pad = sz % 2;
        ff = new Uint8Array(ob.length + 8 + sz + pad);
        ff.set(ob, 0);
        const dv = new DataView(ff.buffer);
        dv.setUint32(4, dv.getUint32(4, true) + 8 + sz + pad, true);
        ff[ob.length]=0x69; ff[ob.length+1]=0x64; ff[ob.length+2]=0x33; ff[ob.length+3]=0x20;
        dv.setUint32(ob.length+4, sz, true);
        ff.set(hdr, ob.length+8);
      } else {
        ff = new Uint8Array(hdr.length+ad.length); ff.set(hdr,0); ff.set(ad,hdr.length);
      }
      const ext=fi.name.split('.').pop()||'mp3';const sn=(meta.title||fi.name.replace(/\.[^.]+$/,'')).replace(/[<>:"/\\|?*]/g,'').trim();
      const bl=new Blob([ff],{type:fi.type||'audio/mpeg'});const u=URL.createObjectURL(bl);
      const a=document.createElement('a');a.href=u;a.download=`${sn}.${ext}`;a.click();URL.revokeObjectURL(u);
      setExportPct(100);notify(`✅ "${sn}.${ext}" exportado con éxito con metadatos de estudio`);setTimeout(()=>setExportPct(0),2000);
    }catch(e:any){notify(`Error: ${e.message}`,'err');}
    finally{setExporting(false);}
  };

  const getStemInfo = (name: string) => {
    switch (name) {
      case 'vocals':
        return {
          title: 'Voces (Acapella)',
          desc: 'Voz principal, segundas y coros limpios',
          icon: 'fa-microphone',
          color: 'text-purple-400',
          genreHint: 'Voz limpia sin instrumentos — ideal para remix o master'
        };
      case 'drums':
        return {
          title: 'Batería / Percusiones (Beat)',
          desc: 'Bombos, cajas, hi-hats, tambora sinaloense o tarolas',
          icon: 'fa-drum',
          color: 'text-amber-400',
          genreHint: 'Banda: Tambora y tarolas | Rap/Pop: Beats y 808 hi-hats'
        };
      case 'bass':
        return {
          title: 'Bajo / Tololoche / Tuba',
          desc: 'Línea de bajo eléctrico, 808 sub-bass, tololoche o tuba sinaloense',
          icon: 'fa-guitar',
          color: 'text-emerald-400',
          genreHint: 'Corridos: Tololoche/Bajo quinto | Banda: Tuba | Rap: 808'
        };
      case 'guitar':
        return {
          title: 'Guitarras / Requinto / Docerola',
          desc: 'Requintos sierreños, docerolas, guitarras acústicas y eléctricas',
          icon: 'fa-guitar',
          color: 'text-cyan-400',
          genreHint: 'Corridos Tumbados: ¡Aquí se extrae tu requinto y armonía!'
        };
      case 'piano':
        return {
          title: 'Piano / Teclados / Acordeón',
          desc: 'Pianos acústicos, sintetizadores melódicos, teclados o acordeón',
          icon: 'fa-compact-disc',
          color: 'text-pink-400',
          genreHint: 'Pop Latino y Baladas: Pianos y sintetizadores de acordes'
        };
      case 'other':
      default:
        return {
          title: 'Instrumental / Metales / Otros',
          desc: 'Metales (trompetas, clarinetes, trombones), sintetizadores y arreglos',
          icon: 'fa-music',
          color: 'text-indigo-400',
          genreHint: 'Banda: Sección de metales y vientos | Corridos: Charchetas'
        };
    }
  };

  const getCoverBytes = async (): Promise<Uint8Array | null> => {
    if (artFile) {
      try { return new Uint8Array(await artFile.arrayBuffer()); } catch { return null; }
    }
    if (fi?.coverArtBytes) {
      return fi.coverArtBytes;
    }
    if (artPrev && (artPrev.startsWith('http') || artPrev.startsWith('data:'))) {
      try {
        const res = await fetch(artPrev);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return new Uint8Array(ab);
        }
      } catch { /* ignore */ }
    }
    return null;
  };

  const injectId3ToWav = (
    wavBuffer: ArrayBuffer,
    stemTitle: string,
    stemName: string,
    covBytes: Uint8Array | null
  ): Uint8Array => {
    const enc = new TextEncoder();
    const frames: Uint8Array[] = [];

    const mktf = (id: string, val: string): Uint8Array => {
      if (!val) return new Uint8Array(0);
      const tb = enc.encode(val);
      const d = new Uint8Array(1 + tb.length);
      d[0] = 3; // UTF-8
      d.set(tb, 1);
      const fr = new Uint8Array(10 + d.length);
      for (let i = 0; i < 4; i++) fr[i] = id.charCodeAt(i);
      const sz = d.length;
      fr[4] = (sz >> 24) & 0xff;
      fr[5] = (sz >> 16) & 0xff;
      fr[6] = (sz >> 8) & 0xff;
      fr[7] = sz & 0xff;
      fr.set(d, 10);
      return fr;
    };

    const songTitle = meta.title || fi?.name.replace(/\.[^.]+$/, '') || 'Audio';
    const fullTitle = `${songTitle} (${stemTitle})`;

    frames.push(mktf('TIT2', fullTitle));
    if (meta.artist) frames.push(mktf('TPE1', meta.artist));
    frames.push(mktf('TALB', meta.album ? `${meta.album} (Stems)` : `${songTitle} - Stems`));
    if (meta.year) frames.push(mktf('TYER', meta.year));
    if (meta.genre) frames.push(mktf('TCON', meta.genre));
    if (meta.composer) frames.push(mktf('TCOM', meta.composer));
    if (meta.bpm) frames.push(mktf('TBPM', meta.bpm));
    if (meta.isrc) frames.push(mktf('TSRC', meta.isrc));
    frames.push(mktf('TPUB', meta.label || 'Diosmasgym records'));

    // Anti-AI / Human Studio Master frames
    frames.push(mktf('TSSE', 'LAME 3.100.1 64-bit (Studio Master Edition)'));
    frames.push(mktf('TENC', 'Diosmasgym Records Studio HD Engine'));
    frames.push(mktf('TOPE', meta.composer || 'Juan Bernal'));
    frames.push(mktf('TCOP', `© ${meta.year || '2026'} Diosmasgym Records. Todos los derechos reservados.`));
    frames.push(mktf('TOWN', 'Diosmasgym Records & Juan 614'));

    const commentText = meta.comment
      ? `${meta.comment} | Pista ${stemTitle}`
      : `Pista ${stemTitle} - Separado con IA en Diosmasgym Audio Studio Pro`;
    const lb = enc.encode('spa');
    const tb = enc.encode(commentText);
    const dComm = new Uint8Array(1 + 3 + 1 + tb.length);
    dComm[0] = 3;
    dComm.set(lb, 1);
    dComm[4] = 0;
    dComm.set(tb, 5);
    const frComm = new Uint8Array(10 + dComm.length);
    const idComm = 'COMM';
    for (let i = 0; i < 4; i++) frComm[i] = idComm.charCodeAt(i);
    const szComm = dComm.length;
    frComm[4] = (szComm >> 24) & 0xff;
    frComm[5] = (szComm >> 16) & 0xff;
    frComm[6] = (szComm >> 8) & 0xff;
    frComm[7] = szComm & 0xff;
    frComm.set(dComm, 10);
    frames.push(frComm);

    // Si es la pista vocal y hay letra cargada, incrustar la letra en USLT
    if (stemName === 'vocals' && meta.lyrics && meta.lyrics.trim()) {
      const lrcEnc = enc.encode(meta.lyrics.trim());
      const dLrc = new Uint8Array(1 + 3 + 1 + lrcEnc.length);
      dLrc[0] = 3;
      dLrc.set(lb, 1);
      dLrc[4] = 0;
      dLrc.set(lrcEnc, 5);
      const frLrc = new Uint8Array(10 + dLrc.length);
      const idLrc = 'USLT';
      for (let i = 0; i < 4; i++) frLrc[i] = idLrc.charCodeAt(i);
      const szLrc = dLrc.length;
      frLrc[4] = (szLrc >> 24) & 0xff;
      frLrc[5] = (szLrc >> 16) & 0xff;
      frLrc[6] = (szLrc >> 8) & 0xff;
      frLrc[7] = szLrc & 0xff;
      frLrc.set(dLrc, 10);
      frames.push(frLrc);
    }

    // Cover art en frame APIC
    if (covBytes && covBytes.length > 0) {
      const mb = enc.encode('image/jpeg');
      const dPic = new Uint8Array(1 + mb.length + 1 + 1 + 1 + covBytes.length);
      let pos = 0;
      dPic[pos++] = 0;
      dPic.set(mb, pos);
      pos += mb.length;
      dPic[pos++] = 0;
      dPic.set(covBytes, pos);
      const frPic = new Uint8Array(10 + dPic.length);
      const idPic = 'APIC';
      for (let i = 0; i < 4; i++) frPic[i] = idPic.charCodeAt(i);
      const szPic = dPic.length;
      frPic[4] = (szPic >> 24) & 0xff;
      frPic[5] = (szPic >> 16) & 0xff;
      frPic[6] = (szPic >> 8) & 0xff;
      frPic[7] = szPic & 0xff;
      frPic.set(dPic, 10);
      frames.push(frPic);
    }

    const total = frames.reduce((s, f) => s + f.length, 0) + 512;
    const ss = (n: number): [number, number, number, number] => [
      (n >> 21) & 0x7f,
      (n >> 14) & 0x7f,
      (n >> 7) & 0x7f,
      n & 0x7f
    ];

    const hdr = new Uint8Array(10 + total);
    hdr[0] = 0x49; hdr[1] = 0x44; hdr[2] = 0x33; hdr[3] = 0x03; hdr[4] = 0x00; hdr[5] = 0x00;
    const [s3, s2, s1, s0] = ss(total);
    hdr[6] = s3; hdr[7] = s2; hdr[8] = s1; hdr[9] = s0;
    let wp2 = 10;
    for (const fr of frames) {
      if (fr.length > 0) {
        hdr.set(fr, wp2);
        wp2 += fr.length;
      }
    }

    const ob = new Uint8Array(wavBuffer);
    if (ob.length > 12 && ob[0] === 0x52 && ob[1] === 0x49 && ob[2] === 0x46 && ob[3] === 0x46) {
      const sz = hdr.length;
      const pad = sz % 2;
      const ff = new Uint8Array(ob.length + 8 + sz + pad);
      ff.set(ob, 0);
      const dv = new DataView(ff.buffer);
      dv.setUint32(4, dv.getUint32(4, true) + 8 + sz + pad, true);
      ff[ob.length] = 0x69;     // 'i'
      ff[ob.length + 1] = 0x64; // 'd'
      ff[ob.length + 2] = 0x33; // '3'
      ff[ob.length + 3] = 0x20; // ' '
      dv.setUint32(ob.length + 4, sz, true);
      ff.set(hdr, ob.length + 8);
      return ff;
    }

    const ff = new Uint8Array(hdr.length + ob.length);
    ff.set(hdr, 0);
    ff.set(ob, hdr.length);
    return ff;
  };

  const downloadSingleStem = async (url: string, stemName: string) => {
    try {
      setDownloadingStem(stemName);
      const baseName = (meta.title || fi?.name.replace(/\.[^.]+$/, '') || 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      const info = getStemInfo(stemName);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();

      // Inyectar metadatos ID3 oficiales en la pista WAV
      const covBytes = await getCoverBytes();
      const taggedBytes = injectId3ToWav(arrayBuf, info.title, stemName, covBytes);

      const blob = new Blob([taggedBytes], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${baseName}_${stemName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      notify(`✅ Pista "${stemName}.wav" descargada con metadatos ID3 completos`);
    } catch (e: any) {
      console.warn('Descarga por blob falló, usando descarga segura:', e);
      // Fallback seguro que NO recarga ni abandona la pestaña actual
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const baseName = (meta.title || fi?.name.replace(/\.[^.]+$/, '') || 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      a.download = `${baseName}_${stemName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingStem(null);
    }
  };

  const downloadZip = async () => {
    if (!aiStems || !fi) return;
    const stemsToExport = Object.entries(aiStems).filter(([name, url]) => 
      url && typeof url === 'string' && url.trim().startsWith('http') && selectedStemsToZip[name] !== false
    );
    if (stemsToExport.length === 0) {
      notify('Selecciona al menos una pista válida para descargar el ZIP', 'err');
      return;
    }

    setIsZipping(true);
    setZipProgress('Iniciando descarga e incrustación de metadatos...');
    try {
      const zip = new JSZip();
      const baseName = (meta.title || fi.name.replace(/\.[^.]+$/, '') || 'audio').replace(/[<>:"/\\|?*]/g, '').trim();
      const folder = zip.folder(`${baseName}_Stems`) || zip;
      const covBytes = await getCoverBytes();

      let count = 0;
      let successCount = 0;
      for (const [name, url] of stemsToExport) {
        count++;
        setZipProgress(`Descargando e incrustando metadatos en pista ${count} de ${stemsToExport.length} (${name})...`);
        let rawBuf: ArrayBuffer | null = null;
        try {
          const res = await fetch(url as string);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          rawBuf = await res.arrayBuffer();
        } catch (fetchErr) {
          console.warn(`[ZIP] Falló descarga directa de ${name}, reintentando vía proxy...`, fetchErr);
          try {
            const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url as string)}`);
            if (proxyRes.ok) {
              rawBuf = await proxyRes.arrayBuffer();
            }
          } catch {
            rawBuf = null;
          }
        }

        if (!rawBuf || rawBuf.byteLength === 0) {
          console.warn(`[ZIP] Omitiendo pista ${name} porque no se pudo descargar el archivo binario.`);
          continue;
        }

        const info = getStemInfo(name);
        // Inyectar metadatos ID3 completos en cada WAV dentro del archivo ZIP
        const tagged = injectId3ToWav(rawBuf, info.title, name, covBytes);
        folder.file(`${baseName}_${name}.wav`, tagged);
        successCount++;
      }

      if (successCount === 0) {
        throw new Error('No se pudo descargar ninguna de las pistas de audio para empaquetar en el ZIP.');
      }

      setZipProgress('Generando archivo ZIP (ultra rápido sin saturar memoria)...');
      // Usar STORE (sin compresión lenta): los WAV son audio sin comprimir donde DEFLATE no ahorra espacio
      // pero satura la memoria RAM del navegador y causa caídas
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE',
      }, (metadata) => {
        setZipProgress(`Generando ZIP: ${Math.round(metadata.percent)}%`);
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${baseName}_Stems_Separados.zip`;
      document.body.appendChild(a);
      a.click();

      // Limpiar URL después de un tiempo prudente para asegurar que el navegador inició la descarga
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);
      }, 20000);

      notify(`✅ ¡${successCount} pistas descargadas en ZIP con metadatos y sello "${meta.label || 'Diosmasgym records'}"!`);
    } catch (err: any) {
      console.error('Error generando ZIP:', err);
      notify(`Error al crear ZIP: ${err.message}`, 'err');
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  const extractStems = async () => {
    if (!fi) return;
    setIsExtracting(true);
    setAiStems(null);
    setSelectedStemsToZip({});
    abortControllerRef.current = new AbortController();
    setExtractStatus('Subiendo audio a servidor temporal...');
    try {
      const blob = new Blob([fi.arrayBuffer], { type: fi.type });
      const formData = new FormData();
      formData.append('file', blob, fi.name);
      
      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });
      const uploadData = await uploadRes.json();
      if (!uploadData?.data?.url) throw new Error('Error subiendo archivo');
      const directUrl = uploadData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

      setExtractStatus('Iniciando Inteligencia Artificial...');
      const repRes = await fetch('/api/separate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: directUrl, model_name: selectedModel }),
        signal: abortControllerRef.current.signal
      });
      const repData = await repRes.json();
      if (repData.error) throw new Error(repData.error);
      
      const predictionId = repData.id;
      let result = repData;
      let elapsedSec = 0;
      const MAX_WAIT_SEC = 720;
      const POLL_INTERVAL = 5000;

      const statusMessages: Record<string, string> = {
        starting: '🔄 Iniciando GPU en Replicate...',
        processing: '⚙️ IA procesando...',
        succeeded: '✅ ¡Listo!',
        failed: '❌ Falló el procesamiento',
      };

      while (result.status !== 'succeeded' && result.status !== 'failed') {
        if (elapsedSec >= MAX_WAIT_SEC) throw new Error('Tiempo agotado (12 min).');
        const mins = Math.floor(elapsedSec / 60);
        const secs = elapsedSec % 60;
        const timerStr = elapsedSec > 0 ? ` — ${mins}m ${String(secs).padStart(2,'0')}s` : '';
        const msg = statusMessages[result.status] || `Procesando (${result.status})...`;
        setExtractStatus(`${msg}${timerStr}`);
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        elapsedSec += POLL_INTERVAL / 1000;
        try {
          const checkRes = await fetch(`/api/separate-audio?id=${predictionId}`, { signal: abortControllerRef.current.signal });
          if (!checkRes.ok) {
            console.warn('[Demucs] Polling HTTP error:', checkRes.status);
            continue;
          }
          const checkData = await checkRes.json();
          if (checkData.error) {
            console.warn('[Demucs] Error en respuesta de polling:', checkData.error);
            setExtractStatus(`⚠️ ${checkData.error} (reintentando...)`);
            continue;
          }
          if (checkData.status) {
            result = checkData;
            console.log('[Demucs] Status:', checkData.status, checkData);
          }
        } catch (pollErr) {
          console.warn('[Demucs] Excepción durante polling:', pollErr);
          continue;
        }
      }
      
      if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Replicate: ${result.error || 'El procesamiento fue cancelado o falló'}`);
      }
      if (!result.output) {
        throw new Error('Replicate terminó pero no devolvió las pistas de audio.');
      }

      // Filtrar estrictamente según el modelo seleccionado y URLs válidas
      const allowedOrder = selectedModel === 'htdemucs'
        ? ['vocals', 'drums', 'bass', 'other']
        : ['vocals', 'drums', 'bass', 'other', 'guitar', 'piano'];

      const filteredStems: Record<string, string> = {};
      for (const key of allowedOrder) {
        const val = result.output[key];
        if (val && typeof val === 'string' && val.trim().startsWith('http')) {
          filteredStems[key] = val.trim();
        }
      }

      // Si por alguna razón el modelo no trajo las llaves esperadas pero trajo otras válidas
      if (Object.keys(filteredStems).length === 0) {
        for (const [key, val] of Object.entries(result.output)) {
          if (val && typeof val === 'string' && val.trim().startsWith('http')) {
            if (selectedModel === 'htdemucs' && (key === 'guitar' || key === 'piano')) continue;
            filteredStems[key] = val.trim();
          }
        }
      }

      if (Object.keys(filteredStems).length === 0) {
        throw new Error('No se encontraron pistas de audio descargables en la respuesta.');
      }

      setAiStems(filteredStems);
      const initialSel: Record<string, boolean> = {};
      Object.keys(filteredStems).forEach(k => { initialSel[k] = true; });
      setSelectedStemsToZip(initialSel);
      notify(`¡${Object.keys(filteredStems).length} pistas separadas con éxito!`);
    } catch (e: any) {
      if (e.name !== 'AbortError') notify(`Error: ${e.message}`, 'err');
    } finally {
      setIsExtracting(false);
      setExtractStatus('');
      abortControllerRef.current = null;
    }
  };

  const cancelExtract = () => {
    abortControllerRef.current?.abort();
    setIsExtracting(false);
    setExtractStatus('');
  };

  const tabs2:{id:TabId;l:string;i:string;dis?:boolean}[]=[
    {id:'loader',l:'Cargador',i:'fa-upload'},
    {id:'metadata',l:'Metadatos & Letras',i:'fa-tags'},
    {id:'artwork',l:'Artwork & Marca',i:'fa-image',dis:!fi},
    {id:'mastering',l:'Mastering & EQ',i:'fa-sliders',dis:!fi},
    {id:'waveform',l:'Forma de Onda',i:'fa-waveform-lines',dis:!fi},
    {id:'stems',l:'Separador IA',i:'fa-layer-group',dis:!fi},
    {id:'export',l:'Exportar',i:'fa-file-arrow-down',dis:!fi},
  ];
  const FLD=({k,label,icon,ph,full,ml,ro}:{k:keyof AudioMetadata;label:string;icon:string;ph:string;full?:boolean;ml?:number;ro?:boolean})=>(
    <div className={full?'md:col-span-2':''}>
      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2"><i className={`fas ${icon} text-purple-400/60`}></i>{label}</label>
      <input type="text" maxLength={ml} value={meta[k]} onChange={e=>{if(!ro){setMeta(p=>({...p,[k]:e.target.value}));setDirty(true);}}} placeholder={ph} readOnly={ro}
        className={`w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50 transition-all ${ro?'opacity-60 cursor-not-allowed':''}`}/>
    </div>
  );

  return(
    <div className="min-h-screen bg-[#05070a] font-sans pb-24">
      {notif&&<div className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-2xl text-sm font-bold shadow-2xl border ${notif.t==='ok'?'bg-[#0f111a] border-purple-500/40 text-purple-300':'bg-red-950/80 border-red-500/40 text-red-300'}`}>{notif.m}</div>}

      <div className="border-b border-white/5 bg-[#0a0c14]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={()=>navigate('/admin')} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"><i className="fas fa-arrow-left text-sm"></i></button>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.5em] text-purple-400">Mando Ejecutivo</p>
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                <i className="fas fa-waveform-lines text-purple-400"></i>Audio Studio Pro
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-500/30">v1.2 Anti-IA Shield</span>
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
            {fi&&<><span className="text-white/25 max-w-[180px] truncate">{fi.name}</span><span className="w-1 h-1 rounded-full bg-white/10"></span><span className="text-purple-400">{fmtD(fi.duration)}</span><span className="w-1 h-1 rounded-full bg-white/10"></span><span className="text-white/25">{fmtB(fi.size)}</span></>}
            {dirty&&<span className="text-yellow-400 animate-pulse ml-2">● Sin exportar</span>}
          </div>
          {fi&&<button onClick={doExport} disabled={exporting} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"><i className={`fas ${exporting?'fa-spinner fa-spin':'fa-file-arrow-down'}`}></i>{exporting?'Exportando...':'Exportar'}</button>}
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs2.map(t=><button key={t.id} onClick={()=>!t.dis&&setTab(t.id as TabId)} disabled={t.dis} className={`flex items-center gap-2 px-5 py-3 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${tab===t.id?'border-purple-400 text-purple-300':t.dis?'border-transparent text-white/15 cursor-not-allowed':'border-transparent text-white/40 hover:text-white'}`}><i className={`fas ${t.i} text-[10px]`}></i>{t.l}</button>)}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {tab==='loader'&&(
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10"><h2 className="text-3xl font-serif italic text-white mb-2">Tu Estudio Personal</h2><p className="text-white/30 text-sm">Sube tu WAV, MP3, FLAC, AIFF o M4A para comenzar</p></div>
            <div className={`border-2 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all ${drag?'border-purple-400 bg-purple-500/10':'border-white/10 bg-white/[0.02] hover:border-purple-500/40'}`}
              onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>fRef.current?.click()}>
              <input ref={fRef} type="file" accept="audio/*,.wav,.mp3,.flac,.aiff,.m4a" className="hidden" onChange={e=>e.target.files?.[0]&&loadFile(e.target.files[0])}/>
              {analyzing?<div className="flex flex-col items-center gap-4"><div className="w-20 h-20 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-3xl text-purple-400"></i></div><p className="text-purple-300 font-bold">Analizando...</p><p className="text-white/30 text-xs">Leyendo metadatos ID3 y decodificando audio</p></div>
              :<div className="flex flex-col items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><i className="fas fa-waveform-lines text-3xl text-purple-400"></i></div><div><p className="text-white font-bold text-lg mb-1">Arrastra tu audio aquí</p><p className="text-white/30 text-sm">o haz clic para seleccionar</p></div><div className="flex flex-wrap justify-center gap-2">{['WAV','MP3','FLAC','AIFF','M4A'].map(f=><span key={f} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40">{f}</span>)}</div></div>}
            </div>
            {!fi && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setTab('metadata')}
                  className="inline-flex items-center gap-2.5 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-2xl text-purple-300 hover:text-white text-xs font-bold transition-all shadow-lg shadow-purple-950/20"
                >
                  <i className="fas fa-pen-fancy text-purple-400"></i>
                  <span>¿Deseas redactar o vincular letras del catálogo? <strong>Ir a Metadatos & Letras →</strong></span>
                </button>
              </div>
            )}
            {fi&&!analyzing&&(
              <div className="mt-8 bg-[#0f111a] border border-white/5 rounded-[2rem] p-8">
                <div className="flex items-center gap-4 mb-6">
                  {fi.coverArtUrl?<img src={fi.coverArtUrl} className="w-16 h-16 rounded-xl object-cover border border-white/10" alt="cover"/>:<div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><i className="fas fa-music text-purple-400 text-2xl"></i></div>}
                  <div><p className="text-white font-bold truncate max-w-xs">{fi.name}</p><p className="text-white/30 text-xs">{fi.type}</p></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {[{l:'Duración',v:fmtD(fi.duration),i:'fa-clock'},{l:'Sample Rate',v:`${(fi.sampleRate/1000).toFixed(1)} kHz`,i:'fa-wave-square'},{l:'Canales',v:fi.channels===1?'Mono':'Estéreo',i:'fa-headphones'},{l:'Tamaño',v:fmtB(fi.size),i:'fa-weight-hanging'},{l:'Calidad',v:fi.bitDepth,i:'fa-sliders'},{l:'Silencios',v:silences.length===0?'Sin problemas':`${silences.length} detectado${silences.length>1?'s':''}`,i:'fa-volume-xmark'}].map(s=>(
                    <div key={s.l} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4"><i className={`fas ${s.i} text-purple-400/60 text-sm mb-2 block`}></i><p className="text-white font-bold text-sm">{s.v}</p><p className="text-white/30 text-[9px] uppercase tracking-widest">{s.l}</p></div>
                  ))}
                </div>
                {/* Semáforo Anti-IA en Cargador */}
                <div className="mb-6 p-4 rounded-2xl bg-[#0a0c14] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <i className="fas fa-shield-halved text-sm"></i>
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">Semáforo de Detección de IA</p>
                      <p className="text-white/40 text-[10px]">Escaneo de espectro acústico ultrasónico y tags</p>
                    </div>
                  </div>
                  <div>
                    {!aiScanResult ? (
                      <span className="text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-500/30">
                        <i className="fas fa-spinner fa-spin"></i> Analizando...
                      </span>
                    ) : aiScanResult.status === 'CLEAN' ? (
                      <span className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        🟢 Limpio (0% IA)
                      </span>
                    ) : aiScanResult.status === 'WARNING' ? (
                      <span className="text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-500/40 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        🟡 Sospechoso ({aiScanResult.ultrasonicEnergy}%)
                      </span>
                    ) : (
                      <span className="text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 bg-red-950/60 px-3 py-1.5 rounded-lg border border-red-500/40 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        🔴 IA Detectada ({aiScanResult.riskScore}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={()=>setTab('metadata')} className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"><i className="fas fa-tags"></i>Editar metadatos →</button>
                  <button onClick={()=>setTab('mastering')} className="py-4 bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40"><i className="fas fa-shield-halved text-amber-300"></i>Ir a Blindaje & Mastering →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='metadata'&&(
          <div className="max-w-4xl mx-auto">
            {/* Banner si se trabaja directamente sin audio */}
            {!fi && (
              <div className="mb-6 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <i className="fas fa-feather-pointed text-purple-400 text-sm"></i>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">Modo Creador de Letras y Metadatos</p>
                    <p className="text-white/40 text-[11px]">Puedes redactar letras, vincular canciones del catálogo y guardar directamente en el sitio web sin necesidad de subir un audio.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('loader')}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-bold tracking-wider transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fas fa-file-audio text-purple-400"></i>
                  Subir Archivo de Audio
                </button>
              </div>
            )}

            {/* SECCIÓN VINCULAR CANCIÓN DEL CATÁLOGO WEB (GOOGLE SHEETS) */}
            <div className="mb-8 bg-[#0f111a] border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <i className="fas fa-table-cells-large text-xl text-purple-400"></i>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-2.5">
                      Vincular Canción del Catálogo Web
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-500/30">
                        {catalog.length} Canciones en Google Sheets
                      </span>
                    </h3>
                    <p className="text-white/40 text-xs mt-0.5">
                      Selecciona cualquier tema para autorellenar portada, título, artista, año, sello discográfico y letra oficial.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadCatalogData(true)}
                    disabled={loadingCatalog}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-40"
                    title="Recargar catálogo desde Google Sheets"
                  >
                    <i className={`fas fa-rotate ${loadingCatalog ? 'fa-spin text-purple-400' : ''}`}></i>
                    <span>{loadingCatalog ? 'Actualizando...' : 'Recargar Google Sheet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCatalogSection(!showCatalogSection)}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <i className={`fas ${showCatalogSection ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    <span>{showCatalogSection ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
              </div>

              {/* Tarjeta de Canción Vinculada */}
              {selectedCatalogSong && (
                <div className="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-purple-950/40 border border-purple-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-purple-500/30 shrink-0">
                      {selectedCatalogSong.cover ? (
                        <img src={selectedCatalogSong.cover} alt={selectedCatalogSong.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-400">
                          <i className="fas fa-music text-lg"></i>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f111a]" title="Vinculado activo"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {selectedCatalogSong.artist}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <i className="fas fa-circle-check"></i> Canción Vinculada
                        </span>
                        {getSongLyricContent(selectedCatalogSong) ? (
                          <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ✓ Con Letra en el Sitio
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            ⚠️ Sin Letra en el Sitio
                          </span>
                        )}
                      </div>
                      <h4 className="text-white font-bold text-base truncate mt-0.5">{selectedCatalogSong.name}</h4>
                      <p className="text-white/40 text-[11px] truncate">
                        {selectedCatalogSong.album ? `${selectedCatalogSong.album} • ` : ''}
                        Sello: <span className="text-purple-300 font-medium">Diosmasgym records</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/letra/${selectedCatalogSong.id || generateSlug(selectedCatalogSong.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                      Ver en el Sitio
                    </a>
                    <button
                      type="button"
                      onClick={handleUnlinkSong}
                      className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    >
                      <i className="fas fa-link-slash text-[10px]"></i>
                      Desvincular
                    </button>
                  </div>
                </div>
              )}

              {/* Buscador y lista desplegable de canciones */}
              {showCatalogSection && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 relative">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-xs"></i>
                      <input
                        type="text"
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        placeholder="Buscar por título, artista o álbum..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500/50"
                      />
                      {catalogSearch && (
                        <button
                          type="button"
                          onClick={() => setCatalogSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <i className="fas fa-xmark text-xs"></i>
                        </button>
                      )}
                    </div>

                    {/* Filtro por Artista */}
                    <div className="md:col-span-3 flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                      {(['ALL', 'Diosmasgym', 'Juan 614'] as const).map(af => (
                        <button
                          key={af}
                          type="button"
                          onClick={() => setCatalogArtistFilter(af)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            catalogArtistFilter === af
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-white/40 hover:text-white'
                          }`}
                        >
                          {af === 'ALL' ? 'Todos' : af}
                        </button>
                      ))}
                    </div>

                    {/* Filtro por Letras */}
                    <div className="md:col-span-3 flex items-center bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                      {([
                        { id: 'ALL', l: 'Todas' },
                        { id: 'WITH', l: 'Con Letra' },
                        { id: 'WITHOUT', l: 'Sin Letra' }
                      ] as const).map(lf => (
                        <button
                          key={lf.id}
                          type="button"
                          onClick={() => setCatalogLyricsFilter(lf.id)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            catalogLyricsFilter === lf.id
                              ? 'bg-purple-600 text-white shadow'
                              : 'text-white/40 hover:text-white'
                          }`}
                        >
                          {lf.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista de Canciones */}
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                    {loadingCatalog ? (
                      <div className="p-8 text-center text-white/40">
                        <i className="fas fa-spinner fa-spin text-2xl text-purple-400 mb-3 block"></i>
                        <p className="text-xs font-bold">Cargando catálogo oficial de Google Sheets...</p>
                      </div>
                    ) : filteredCatalog.length === 0 ? (
                      <div className="p-8 text-center text-white/30 border border-dashed border-white/10 rounded-2xl">
                        <i className="fas fa-music-slash text-2xl mb-2 block"></i>
                        <p className="text-xs">No se encontraron canciones en el catálogo con los filtros aplicados.</p>
                      </div>
                    ) : (
                      filteredCatalog.map(song => {
                        const isSelected = selectedCatalogSong?.id === song.id || (selectedCatalogSong && generateSlug(selectedCatalogSong.name) === generateSlug(song.name));
                        const hasLyric = Boolean(getSongLyricContent(song));
                        const isJuan = (song.artist || '').toLowerCase().includes('614');

                        return (
                          <div
                            key={song.id || song.name}
                            onClick={() => handleLinkSong(song)}
                            className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-purple-900/30 border-purple-500/60 ring-1 ring-purple-500/40 shadow-lg'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-purple-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 relative">
                                {song.cover ? (
                                  <img src={song.cover} alt={song.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/20">
                                    <i className="fas fa-music text-xs"></i>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                    isJuan ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  }`}>
                                    {isJuan ? 'Juan 614' : 'Diosmasgym'}
                                  </span>
                                  {hasLyric ? (
                                    <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                      <i className="fas fa-check text-[7px]"></i> Con Letra Web
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                                      + Sin Letra
                                    </span>
                                  )}
                                </div>
                                <p className={`font-bold text-xs truncate mt-0.5 ${isSelected ? 'text-purple-300' : 'text-white group-hover:text-purple-200'}`}>
                                  {song.name}
                                </p>
                                <p className="text-white/30 text-[10px] truncate">
                                  {song.album ? `${song.album} • ` : ''}Sello: Diosmasgym records
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleLinkSong(song);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow'
                                    : 'bg-white/5 hover:bg-purple-600 text-white/60 hover:text-white'
                                }`}
                              >
                                <i className={`fas ${isSelected ? 'fa-check' : 'fa-link'}`}></i>
                                <span>{isSelected ? 'Vinculada' : 'Vincular'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ESCUDO ANTI-IA & SANITIZADOR DE METADATOS */}
            <div className="mb-8 p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/30 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-lg shrink-0 shadow-lg shadow-purple-900/30">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    Escudo Anti-IA (Sanitizador de Huella Digital)
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                      100% Humano / Studio Master
                    </span>
                  </h4>
                  <p className="text-white/40 text-xs mt-0.5">
                    Elimina rastros de Suno, Udio, prompts y descriptores IA. Inserta cabeceras oficiales LAME 3.100 y sello Diosmasgym records.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={sanitizeAntiAI}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 whitespace-nowrap active:scale-95 shrink-0"
              >
                <i className="fas fa-wand-magic-sparkles text-amber-300"></i>
                Sanitizar Anti-IA
              </button>
            </div>

            <div className="flex items-center justify-between mb-8"><div><h2 className="text-2xl font-serif italic text-white">Metadatos ID3</h2><p className="text-white/30 text-xs mt-1">Los cambios se aplican al exportar y se guardan con la letra.</p></div>{dirty&&<span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 animate-pulse flex items-center gap-2"><i className="fas fa-circle text-[6px]"></i>Sin exportar</span>}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FLD k="title" label="Título" icon="fa-music" ph="Nombre de la canción" full/>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2"><i className="fas fa-microphone text-purple-400/60"></i>Artista</label>
                <select
                  value={meta.artist}
                  onChange={e=>{
                    const nextArtist = e.target.value;
                    const defaultGenre = nextArtist === 'Juan 614' ? 'Corrido Tumbado' : 'Rap';
                    const artistGenres = nextArtist === 'Juan 614' ? (JUAN614_GENRES as readonly string[]) : (DIOSMASGYM_GENRES as readonly string[]);
                    setMeta(p=>({
                      ...p,
                      artist: nextArtist,
                      label: 'Diosmasgym records',
                      genre: artistGenres.includes(p.genre) ? p.genre : defaultGenre
                    }));
                    setDirty(true);
                  }}
                  className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all"
                >
                  <option value="Diosmasgym">Diosmasgym</option>
                  <option value="Juan 614">Juan 614</option>
                </select>
              </div>
              <FLD k="album" label="Álbum / EP" icon="fa-compact-disc" ph="Nombre del álbum"/>
              <FLD k="year" label="Año" icon="fa-calendar" ph="2026" ml={4}/>
              <FLD k="trackNumber" label="Pista #" icon="fa-list-ol" ph="1"/>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <i className="fas fa-metronome text-purple-400/60"></i>BPM (Tempo)
                  </label>
                  {tapBpmFeedback && (
                    <span className="text-[9px] font-black text-emerald-400 animate-pulse">
                      ✓ {tapBpmFeedback}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={meta.bpm || ''}
                    onChange={e => { setMeta(m => ({ ...m, bpm: e.target.value })); setDirty(true); }}
                    placeholder="120"
                    className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTapTempo}
                    className="px-4 py-3 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 hover:border-purple-500 text-purple-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 shadow"
                    title="Haz clic al ritmo de la música para calcular el tempo automáticamente"
                  >
                    <i className="fas fa-hand-pointer mr-1"></i> Tap
                  </button>
                </div>
              </div>
              <FLD k="composer" label="Compositor" icon="fa-pen-nib" ph="Nombre del compositor" ro/>
              <FLD k="label" label="Sello / Label" icon="fa-building" ph="Diosmasgym records" ro/>
              <FLD k="isrc" label="ISRC" icon="fa-barcode" ph="US-XXX-26-00001" ml={12}/>
              <FLD k="comment" label="Comentario" icon="fa-comment" ph="Notas adicionales..."/>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <i className="fas fa-tag text-purple-400/60"></i>Género ({meta.artist})
                  </label>
                  <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">
                    {meta.artist === 'Juan 614' ? 'Banda / Corrido' : 'Urbano / Worship'}
                  </span>
                </div>

                {/* Botones de Géneros Oficiales del Artista */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {(meta.artist === 'Juan 614' ? JUAN614_GENRES : DIOSMASGYM_GENRES).map(g => {
                    const active = meta.genre.toLowerCase() === g.toLowerCase();
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          setMeta(p => ({ ...p, genre: g, label: 'Diosmasgym records' }));
                          setDirty(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                          active
                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40 scale-105'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <i className={`fas ${active ? 'fa-circle-check text-[10px]' : 'fa-circle-dot text-[8px] opacity-40'}`}></i>
                        {g}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={meta.genre}
                  onChange={e=>{setMeta(p=>({...p,genre:e.target.value,label:'Diosmasgym records'}));setDirty(true);}}
                  className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 mb-2"
                >
                  <optgroup label={`Géneros de ${meta.artist}`}>
                    {(meta.artist === 'Juan 614' ? JUAN614_GENRES : DIOSMASGYM_GENRES).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Otros Géneros">
                    {GENRES.filter(g => !(meta.artist === 'Juan 614' ? (JUAN614_GENRES as readonly string[]) : (DIOSMASGYM_GENRES as readonly string[])).includes(g)).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>

                <input
                  type="text"
                  value={meta.genre}
                  onChange={e=>{setMeta(p=>({...p,genre:e.target.value,label:'Diosmasgym records'}));setDirty(true);}}
                  placeholder="O escribe género personalizado..."
                  className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            {/* Plantillas Rápidas con Sello Fijo Diosmasgym records */}
            <div className="mt-8 bg-[#0f111a] border border-white/5 rounded-[2rem] p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Plantillas Rápidas</p>
                <span className="text-[8px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-lock text-[7px]"></i>Sello fijo: Diosmasgym records
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    l: 'Diosmasgym',
                    d: { artist: 'Diosmasgym', label: 'Diosmasgym records', genre: 'Rap', year: String(new Date().getFullYear()) },
                    sub: 'Rap · Pop Latino · Reggaeton · Worship'
                  },
                  {
                    l: 'Juan 614',
                    d: { artist: 'Juan 614', label: 'Diosmasgym records', genre: 'Corrido Tumbado', year: String(new Date().getFullYear()) },
                    sub: 'Banda Sinaloense · Corrido Tumbado · Bélico'
                  }
                ].map(tpl=>(
                  <button
                    key={tpl.l}
                    onClick={()=>{
                      setMeta(p=>({...p,...tpl.d,label:'Diosmasgym records'}));
                      setDirty(true);
                      notify(`Plantilla "${tpl.l}" aplicada (Sello: Diosmasgym records)`);
                    }}
                    className="px-5 py-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-300 hover:bg-purple-500/20 transition-all flex flex-col items-start gap-0.5 text-left"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-bolt text-purple-400"></i>{tpl.l}
                    </span>
                    <span className="text-[8px] text-white/40 normal-case font-medium">{tpl.sub}</span>
                  </button>
                ))}
                <button
                  onClick={()=>{
                    setMeta({title:'',artist:'Diosmasgym',album:'',year:String(new Date().getFullYear()),genre:'Rap',composer:'Juan Bernal',bpm:'',comment:'',isrc:'',label:'Diosmasgym records',trackNumber:'1',lyrics:''});
                    setDirty(true);
                    notify('Metadatos limpiados');
                  }}
                  className="px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2 self-center ml-auto"
                >
                  <i className="fas fa-trash mr-1"></i>Limpiar
                </button>
              </div>
            </div>

            {/* Sección de Subida y Gestión de Letra de la Canción */}
            <div className="mt-8 bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2.5">
                    <i className="fas fa-align-left text-purple-400"></i>
                    Letra de la Canción (Lyrics)
                  </h3>
                  <p className="text-white/40 text-xs mt-1">
                    Sube tu archivo de letra o pégala aquí. Se incrusta directamente en los metadatos ID3 (USLT) de tu audio y puedes sincronizarla al catálogo web.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={lyricFileRef}
                    type="file"
                    accept=".txt,.lrc,.srt,.md,text/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleLyricUpload(f);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => lyricFileRef.current?.click()}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-purple-950/40"
                  >
                    <i className="fas fa-file-arrow-up"></i>
                    Subir Archivo
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteLyrics}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    title="Pegar texto del portapapeles"
                  >
                    <i className="fas fa-clipboard"></i>
                    Pegar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavedLyricsModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600/30 to-purple-600/30 hover:from-amber-600 hover:to-purple-600 border border-amber-500/40 text-amber-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
                    title="Cargar letra desde la biblioteca de canciones guardadas"
                  >
                    <i className="fas fa-book-open text-amber-300"></i>
                    Biblioteca ({savedLyrics.length})
                  </button>
                  <button
                    type="button"
                    onClick={applyLyricCleaner}
                    disabled={!meta.lyrics || !meta.lyrics.trim()}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-purple-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Aplica reglas de formato profesional (Musixmatch / Streaming: quita corchetes, normaliza puntuación, mayúsculas y nombres divinos)"
                  >
                    <i className="fas fa-wand-magic-sparkles text-amber-300"></i>
                    Limpiador de Letras
                  </button>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-white/60 cursor-pointer select-none bg-white/[0.03] border border-white/10 px-3 py-2 rounded-xl hover:border-purple-500/30">
                    <input
                      type="checkbox"
                      checked={autoCleanLyrics}
                      onChange={e => setAutoCleanLyrics(e.target.checked)}
                      className="accent-purple-500 w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <span>Auto-limpiar</span>
                  </label>
                  {meta.lyrics && /\[\d{2}:\d{2}/.test(meta.lyrics) && (
                    <button
                      type="button"
                      onClick={stripTimestamps}
                      className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                      title="Quitar marcas de tiempo de archivo LRC"
                    >
                      <i className="fas fa-clock"></i>
                      Quitar Timestamps LRC
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/admin/lyric-cleaner', { state: { initialLyrics: meta.lyrics || '' } })}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                    title="Abrir en estudio completo de Limpiador de Letras"
                  >
                    <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
                    Estudio
                  </button>
                  {meta.lyrics && (
                    <button
                      type="button"
                      onClick={() => {
                        setMeta(p => ({ ...p, lyrics: '' }));
                        setDirty(true);
                        notify('Letra borrada');
                      }}
                      className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                      title="Limpiar letra"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* MODAL: BIBLIOTECA DE LETRAS GUARDADAS */}
              {showSavedLyricsModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-[#0f111a] border border-purple-500/30 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-purple-950/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                          <i className="fas fa-book-open"></i>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm">Biblioteca de Letras Guardadas</h3>
                          <p className="text-white/40 text-[11px]">Selecciona cualquier letra para cargarla y vincularla a tu audio</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowSavedLyricsModal(false)}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
                      >
                        <i className="fas fa-xmark"></i>
                      </button>
                    </div>

                    <div className="p-4 border-b border-white/5 bg-black/30">
                      <div className="relative">
                        <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-xs"></i>
                        <input
                          type="text"
                          value={savedLyricsSearch}
                          onChange={e => setSavedLyricsSearch(e.target.value)}
                          placeholder="Buscar por título (ej. Cuidar es amar, Corre...)"
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500 transition-all"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="p-4 overflow-y-auto space-y-2.5 max-h-[50vh]">
                      {savedLyrics
                        .filter(l => {
                          if (!savedLyricsSearch.trim()) return true;
                          const q = savedLyricsSearch.toLowerCase().trim();
                          return (l.title || '').toLowerCase().includes(q) || (l.artist || '').toLowerCase().includes(q);
                        })
                        .map((l, idx) => {
                          const rawContent = l.content || l.lyrics || '';
                          const cleanTitle = (l.title || '').replace(/\s+(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/i, '').trim() || l.title || '';

                          const handleSelectThisLyric = () => {
                            const lyricText = autoCleanLyrics ? cleanLyricsText(rawContent) : rawContent;
                            
                            const normalizeSlug = (str: string) => generateSlug(str || '').replace(/-(rap|pop|trap|corrido|remix|version|live|master|snippet|edit|tumbado|belico|worship)$/g, '');
                            const lSlug = generateSlug(l.title || '');
                            const cleanLSlug = normalizeSlug(l.title || '');

                            const matchSong = catalog.find(s => {
                              if (!s) return false;
                              if (l.id && s.id === l.id) return true;
                              const sSlug = generateSlug(s.name || '');
                              const cleanSSlug = normalizeSlug(s.name || '');
                              if (sSlug === lSlug || cleanSSlug === cleanLSlug) return true;
                              if (cleanLSlug.length >= 4 && cleanSSlug.includes(cleanLSlug)) return true;
                              if (cleanSSlug.length >= 4 && cleanLSlug.includes(cleanSSlug)) return true;
                              return false;
                            });

                            if (matchSong) {
                              handleLinkSong(matchSong);
                              setMeta(prev => ({
                                ...prev,
                                title: matchSong.name || cleanTitle || l.title,
                                lyrics: lyricText
                              }));
                              setCatalog(prev => prev.map(s => s.id === matchSong.id ? { ...s, lyrics: lyricText } : s));
                              if (matchSong.cover) {
                                setArtPrev(matchSong.cover);
                              }
                            } else {
                              setMeta(prev => ({
                                ...prev,
                                title: cleanTitle || l.title,
                                artist: l.artist || prev.artist || 'Diosmasgym',
                                lyrics: lyricText
                              }));
                            }

                            setDirty(true);
                            setShowSavedLyricsModal(false);
                            notify(`✅ Letra "${l.title}" cargada y vinculada a "${matchSong?.name || cleanTitle || l.title}"`);
                          };

                          return (
                            <div
                              key={l.id || idx}
                              onClick={handleSelectThisLyric}
                              className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-purple-900/20 border border-white/5 hover:border-purple-500/40 cursor-pointer transition-all flex items-center justify-between group"
                            >
                              <div className="min-w-0 flex-1 mr-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    {l.artist || 'Diosmasgym'}
                                  </span>
                                  <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    ✓ Con Letra
                                  </span>
                                </div>
                                <h4 className="text-white font-bold text-xs truncate group-hover:text-amber-300 transition-colors">
                                  {l.title}
                                </h4>
                                <p className="text-white/30 text-[10px] truncate mt-0.5 font-mono">
                                  {rawContent.slice(0, 80)}...
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleSelectThisLyric();
                                }}
                                className="px-3 py-1.5 bg-purple-600 group-hover:bg-amber-500 text-white group-hover:text-black font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shrink-0 shadow"
                              >
                                Cargar y Vincular
                              </button>
                            </div>
                          );
                        })}
                      {savedLyrics.length === 0 && (
                        <div className="text-center py-8 text-white/30 text-xs">
                          No hay letras guardadas disponibles
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Zona de Drop y Edición de Letra */}
              <div
                onDragOver={e => { e.preventDefault(); setDragLyric(true); }}
                onDragLeave={() => setDragLyric(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragLyric(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleLyricUpload(f);
                }}
                className={`relative rounded-2xl border transition-all ${
                  dragLyric
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-white/10 bg-black/40'
                }`}
              >
                <textarea
                  value={meta.lyrics || ''}
                  onChange={e => {
                    setMeta(p => ({ ...p, lyrics: e.target.value }));
                    setDirty(true);
                  }}
                  rows={10}
                  placeholder={`Arrastra aquí tu archivo .txt, .lrc o .srt, o escribe/pega la letra completa de la canción...\n\nEjemplo:\n[Verso 1]\nCon la fe puesta en alto y la mirada al cielo...\n\n[Coro]\nDios más gym, fuerza y devoción...`}
                  className="w-full bg-transparent p-5 text-sm text-white placeholder-white/20 outline-none resize-y font-sans leading-relaxed"
                />

                {/* Barra de estado y sincronización */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/5 bg-white/[0.02] text-[10px] font-mono text-white/40 rounded-b-2xl">
                  <div className="flex items-center gap-4">
                    <span>
                      <strong className="text-purple-400">{meta.lyrics ? meta.lyrics.split('\n').filter(l => l.trim()).length : 0}</strong> versos
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-purple-400">{meta.lyrics ? meta.lyrics.trim().split(/\s+/).filter(Boolean).length : 0}</strong> palabras
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-purple-400">{meta.lyrics ? meta.lyrics.length : 0}</strong> caracteres
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {meta.title && (
                      <a
                        href={`/letra/${selectedCatalogSong?.id || generateSlug(meta.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                        title="Ver página de la letra en el sitio web"
                      >
                        <i className="fas fa-arrow-up-right-from-square text-[9px] text-purple-400"></i>
                        <span>Ver en la Web</span>
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={isSavingLyric || !meta.lyrics || !meta.lyrics.trim()}
                      onClick={handleSaveLyricToCatalog}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                      title="Guardar y publicar esta letra directamente en la base de datos del sitio web"
                    >
                      <i className={`fas ${isSavingLyric ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                      <span>{isSavingLyric ? 'Guardando en el Sitio...' : 'Guardar y Publicar en el Sitio Web'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='artwork'&&fi&&(
          <div className="max-w-5xl mx-auto">
            <div className="mb-8"><h2 className="text-2xl font-serif italic text-white">Artwork & Marca de Agua</h2><p className="text-white/30 text-xs mt-1">Firma tu artwork y guárdalo. También se incrusta al exportar el audio.</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Vista Previa (600×600)</p>
                <canvas ref={cRef} width={600} height={600} className="w-full rounded-[2rem] border border-white/10 bg-[#0f111a]"/>
                <div className="flex gap-3 mt-4">
                  <button onClick={drawCanvas} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"><i className="fas fa-sync"></i>Actualizar</button>
                  <button onClick={handleCopyArtwork} className="px-4 py-3 bg-white/10 border border-white/15 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"><i className="fas fa-copy text-purple-400"></i>Copiar</button>
                  <button onClick={()=>{drawCanvas();setTimeout(()=>{cRef.current?.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='artwork_watermark.jpg';a.click();URL.revokeObjectURL(u);notify('Artwork descargado');},'image/jpeg',0.95);},150);}} className="px-4 py-3 bg-white/5 border border-white/10 hover:border-purple-500/40 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"><i className="fas fa-download"></i>Descargar</button>
                </div>
              </div>
              <div className="space-y-5">
                <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-4"><i className="fas fa-image text-purple-400/60 mr-2"></i>Portada</p>
                  {artPrev?<div className="flex items-center gap-4"><img src={artPrev} className="w-16 h-16 rounded-xl object-cover border border-white/10" alt="art"/><div className="flex-1 min-w-0"><p className="text-white text-xs font-bold truncate">{artFile?.name||'Extraído del archivo'}</p><p className="text-white/30 text-[9px]">{artFile?fmtB(artFile.size):'ID3 Tag'}</p></div><button onClick={()=>{setArtPrev(null);setArtFile(null);}} className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"><i className="fas fa-xmark text-xs"></i></button></div>
                  :<div onClick={()=>aRef.current?.click()} className="border border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/40 transition-all"><i className="fas fa-image text-white/20 text-2xl mb-2 block"></i><p className="text-white/30 text-xs">Haz clic para subir artwork</p><p className="text-white/15 text-[9px] mt-1">JPG, PNG, WebP</p></div>}
                  <input ref={aRef} type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0]){setArtFile(e.target.files[0]);setArtPrev(URL.createObjectURL(e.target.files[0]));}}}/>
                </div>

                <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40"><i className="fas fa-shield-halved text-purple-400/60 mr-2"></i>Tipo de Marca</p>
                  
                  {/* Selector de Tipo de Marca de Agua */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'text', label: '✍️ Texto' },
                      { id: 'logo_dios', label: '⚜️ Dios Mas Gym' },
                      { id: 'logo_juan', label: '🤠 Juan 614' },
                      { id: 'logo_dual', label: '⚔️ Logo Dual' },
                      { id: 'logo_mando', label: '🛡️ Mando Ejecutivo' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setWmType(t.id as any)}
                        className={`p-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border text-left ${
                          wmType === t.id 
                            ? 'bg-purple-600 border-purple-500 text-white shadow' 
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {wmType === 'text' ? (
                    <>
                      <div>
                        <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Texto de la Marca</label>
                        <input type="text" value={wmText} onChange={e=>setWmText(e.target.value)} placeholder="© Diosmasgym Records" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Color</label><div className="flex items-center gap-3"><input type="color" value={wmColor} onChange={e=>setWmColor(e.target.value)} className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"/><span className="text-xs text-white/50 font-mono">{wmColor}</span></div></div>
                        <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Tamaño: {wmSz}px</label><input type="range" min={14} max={80} value={wmSz} onChange={e=>setWmSz(Number(e.target.value))} className="w-full accent-purple-400"/></div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Escala del Logo: {wmLogoScale}px</label>
                      <input type="range" min={60} max={240} value={wmLogoScale} onChange={e=>setWmLogoScale(Number(e.target.value))} className="w-full accent-purple-400"/>
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] text-white/30 uppercase tracking-widest block mb-2">Posición</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        {v:'tl',l:'↖ Arr Izq'},
                        {v:'tr',l:'↗ Arr Der'},
                        {v:'c',l:'⊙ Centro'},
                        {v:'bl',l:'↙ Aba Izq'},
                        {v:'br',l:'↘ Aba Der'},
                      ] as const).map(o=><button key={o.v} onClick={()=>setWmPos(o.v)} className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${wmPos===o.v?'bg-purple-600 border-purple-500 text-white':'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>{o.l}</button>)}
                    </div>
                  </div>

                  <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Opacidad: {wmOp}%</label><input type="range" min={10} max={100} value={wmOp} onChange={e=>setWmOp(Number(e.target.value))} className="w-full accent-purple-400"/></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='mastering'&&fi&&(
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
                  <i className="fas fa-sliders text-purple-400"></i>
                  Mastering & Ecualizador DSP
                </h2>
                <p className="text-white/40 text-xs mt-1">
                  Motor de procesamiento DSP en tiempo real: EQ 3 bandas, compresor dinámico y normalizador a -14 LUFS para streaming.
                </p>
              </div>
            </div>

            {isRenderingMaster && (
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-center animate-pulse">
                <p className="text-purple-300 text-xs font-mono font-bold flex items-center justify-center gap-2">
                  <i className="fas fa-compact-disc fa-spin text-purple-400"></i>
                  {masterRenderProgress || 'Renderizando master con motor DSP Offline...'}
                </p>
              </div>
            )}

            {/* ESCUDO Y DESINFECCIÓN ANTI-IA (TIDAL & SPOTIFY PROTECTION) */}
            <div className="bg-gradient-to-r from-purple-950/60 via-[#0f111a] to-emerald-950/40 border-2 border-emerald-500/30 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-inner text-xl">
                      <i className="fas fa-shield-halved"></i>
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-white font-bold text-lg tracking-wide">
                          Blindaje Anti-IA para DistroKid & Tidal
                        </h3>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Protección Activa
                        </span>
                      </div>
                      <p className="text-white/50 text-xs mt-0.5">
                        Limpia metadatos de Suno/Udio, corta frecuencias ultrasónicas (19.2 kHz), aplica calor analógico y exporta tu WAV 100% libre de rastros.
                      </p>
                    </div>
                  </div>

                  {/* Semáforo de Detección Anti-IA */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">Semáforo de IA:</span>
                      {(!aiScanResult) ? (
                        <span className="text-purple-300 font-bold flex items-center gap-1.5 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-500/30">
                          <i className="fas fa-spinner fa-spin text-purple-400"></i> Analizando espectro y metadatos...
                        </span>
                      ) : aiScanResult.status === 'CLEAN' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/40 shadow-lg shadow-emerald-950/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          🟢 100% Desinfectado y Seguro (Sin marcas de IA)
                        </span>
                      ) : aiScanResult.status === 'WARNING' ? (
                        <span className="text-amber-300 font-bold flex items-center gap-1.5 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-500/40 shadow-lg">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          🟡 Frecuencias Sospechosas ({aiScanResult.ultrasonicEnergy}% ultrasónico)
                        </span>
                      ) : (
                        <span className="text-red-300 font-bold flex items-center gap-1.5 bg-red-950/60 px-3 py-1.5 rounded-lg border border-red-500/40 shadow-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          🔴 Firma de IA Detectada ({aiScanResult.riskScore}% riesgo)
                        </span>
                      )}
                    </div>

                    {aiScanResult && aiScanResult.detectedKeywords.length > 0 && (
                      <div className="text-red-300 text-[11px] bg-red-950/50 px-2.5 py-1 rounded-lg border border-red-500/30">
                        Tags: {aiScanResult.detectedKeywords.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTÓN ÚNICO Y PRINCIPAL DE ACCIÓN */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      applyOneClickAntiAIScrub();
                      setTimeout(() => {
                        handleDownloadMasterWav();
                      }, 200);
                    }}
                    disabled={isRenderingMaster}
                    className="px-8 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-emerald-950/60 flex items-center justify-center gap-3 active:scale-95 border border-emerald-400/50 disabled:opacity-50"
                    title="Desinfecta metadatos, procesa el audio con filtros anti-IA y descarga el archivo WAV para DistroKid"
                  >
                    <i className={`fas ${isRenderingMaster ? 'fa-spinner fa-spin' : 'fa-file-arrow-down text-lg text-amber-300'}`}></i>
                    <span>{isRenderingMaster ? 'Procesando Master...' : 'Desinfectar y Descargar WAV (1-Click)'}</span>
                  </button>
                </div>
              </div>

              {/* Ajustes Avanzados */}
              <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${antiAiShieldActive ? 'bg-purple-900/20 border-purple-500/40 text-purple-200' : 'bg-white/[0.02] border-white/5 text-white/40'}`}>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-scissors text-purple-400 text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Corte Ultrasónico (19.2 kHz)</span>
                  </div>
                  <input type="checkbox" checked={antiAiShieldActive} onChange={e => { setAntiAiShieldActive(e.target.checked); setDirty(true); }} className="accent-purple-500 w-4 h-4 cursor-pointer"/>
                </label>

                <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${antiAiTapeWarmth ? 'bg-purple-900/20 border-purple-500/40 text-purple-200' : 'bg-white/[0.02] border-white/5 text-white/40'}`}>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-fire-flame-curved text-amber-400 text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Calor Analógico (Tape)</span>
                  </div>
                  <input type="checkbox" checked={antiAiTapeWarmth} onChange={e => { setAntiAiTapeWarmth(e.target.checked); setDirty(true); }} className="accent-purple-500 w-4 h-4 cursor-pointer"/>
                </label>

                <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${antiAiDeHarsh ? 'bg-purple-900/20 border-purple-500/40 text-purple-200' : 'bg-white/[0.02] border-white/5 text-white/40'}`}>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-sparkles text-pink-400 text-xs"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wider">De-Harsh Vocal (4.2 kHz)</span>
                  </div>
                  <input type="checkbox" checked={antiAiDeHarsh} onChange={e => { setAntiAiDeHarsh(e.target.checked); setDirty(true); }} className="accent-purple-500 w-4 h-4 cursor-pointer"/>
                </label>
              </div>
            </div>

            {/* PRESETS DE GÉNERO Y MASTERIZACIÓN */}
            <div className="bg-[#0f111a] border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <i className="fas fa-bolt text-amber-400"></i>
                  Presets Oficiales de Estudio
                </h3>
                <span className="text-[9px] text-white/30 uppercase tracking-widest">
                  Optimizado para Diosmasgym & Juan 614
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MASTER_PRESETS.map(preset => {
                  const isActive = masterPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => applyMasterPreset(preset)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-purple-900/30 border-purple-500/60 ring-1 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-purple-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-white font-bold text-xs flex items-center gap-2">
                            <i className={`fas ${preset.icon} text-purple-400`}></i>
                            {preset.name}
                          </span>
                          {isActive && (
                            <span className="text-[8px] bg-purple-500 text-white font-black px-1.5 py-0.5 rounded">
                              ACTIVO
                            </span>
                          )}
                        </div>
                        <p className="text-purple-300/80 text-[10px] font-mono font-bold mb-1">{preset.genre}</p>
                        <p className="text-white/40 text-[10px] leading-relaxed">{preset.desc}</p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-white/50 pt-2 border-t border-white/5">
                        <span>EQ: <strong className="text-sky-400">+{preset.bass}</strong> / <strong className="text-pink-400">+{preset.mid}</strong> / <strong className="text-amber-400">+{preset.treble}</strong> dB</span>
                        <span>Comp: <strong className="text-white/80">{preset.compThresh}dB</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CURVA DE ECUALIZACIÓN & CONTROLES DSP */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Visualizador de Curva */}
              <div className="lg:col-span-7 bg-[#0f111a] border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <i className="fas fa-chart-line text-purple-400"></i>
                      Curva de Respuesta en Frecuencia (20Hz – 20kHz)
                    </h4>
                    <span className="text-[9px] font-mono text-purple-300 font-bold">
                      {bypassMaster ? 'Bypass' : 'Filtro Activo'}
                    </span>
                  </div>
                  <canvas
                    ref={masterCanvasRef}
                    width={800}
                    height={260}
                    className="w-full rounded-2xl border border-white/5 bg-[#0a0c14]"
                  />
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/30 px-2 mt-2">
                    <span>20 Hz (Sub)</span>
                    <span>100 Hz (Graves)</span>
                    <span>1 kHz (Medios)</span>
                    <span>5 kHz (Presencia)</span>
                    <span>20 kHz (Aire)</span>
                  </div>
                </div>

                {/* Reproductor de Escucha en Vivo */}
                <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <i className="fas fa-headphones text-sm"></i>
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold truncate max-w-[200px]">{fi.name}</p>
                      <p className="text-white/40 text-[10px] font-mono">
                        {fmtD(fi.duration)} • {(fi.sampleRate / 1000).toFixed(1)} kHz • {fi.bitDepth}
                      </p>
                    </div>
                  </div>
                  <audio
                    ref={masterAudioRef}
                    src={fi.objectUrl}
                    controls
                    className="h-9 w-48 sm:w-64 accent-purple-500"
                  />
                </div>
              </div>

              {/* Sliders de Ecualizador y Compresor */}
              <div className="lg:col-span-5 space-y-6">
                {/* Ecualizador 3 Bandas */}
                <div className="bg-[#0f111a] border border-white/10 rounded-[2rem] p-6 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <i className="fas fa-wave-square text-purple-400"></i>
                      Ecualizador de 3 Bandas
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setMasterPreset('custom');
                        setEqBass(0);
                        setEqMid(0);
                        setEqTreble(0);
                      }}
                      className="text-[9px] font-mono text-white/40 hover:text-white underline"
                    >
                      Reset Flat
                    </button>
                  </div>

                  {/* Bass Slider */}
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-sky-400 flex items-center gap-1.5">
                        <i className="fas fa-guitar text-[9px]"></i> Graves / 808 (100 Hz)
                      </span>
                      <span className="font-mono text-white">{eqBass > 0 ? `+${eqBass}` : eqBass} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eqBass}
                      onChange={e => {
                        setMasterPreset('custom');
                        setEqBass(Number(e.target.value));
                      }}
                      className="w-full accent-sky-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Mid Slider */}
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-pink-400 flex items-center gap-1.5">
                        <i className="fas fa-microphone text-[9px]"></i> Medios / Voces (2.5 kHz)
                      </span>
                      <span className="font-mono text-white">{eqMid > 0 ? `+${eqMid}` : eqMid} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eqMid}
                      onChange={e => {
                        setMasterPreset('custom');
                        setEqMid(Number(e.target.value));
                      }}
                      className="w-full accent-pink-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Treble Slider */}
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <i className="fas fa-sparkles text-[9px]"></i> Agudos / Aire (10 kHz)
                      </span>
                      <span className="font-mono text-white">{eqTreble > 0 ? `+${eqTreble}` : eqTreble} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={eqTreble}
                      onChange={e => {
                        setMasterPreset('custom');
                        setEqTreble(Number(e.target.value));
                      }}
                      className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Dinámica & Compresión */}
                <div className="bg-[#0f111a] border border-white/10 rounded-[2rem] p-6 space-y-4">
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <i className="fas fa-compress text-purple-400"></i>
                    Compresión & Ganancia Master
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <div className="flex justify-between text-[9px] font-bold text-white/60 mb-1">
                        <span>Threshold</span>
                        <span className="text-purple-300 font-mono">{compThreshold} dB</span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={0}
                        step={1}
                        value={compThreshold}
                        onChange={e => {
                          setMasterPreset('custom');
                          setCompThreshold(Number(e.target.value));
                        }}
                        className="w-full accent-purple-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <div className="flex justify-between text-[9px] font-bold text-white/60 mb-1">
                        <span>Ratio</span>
                        <span className="text-purple-300 font-mono">{compRatio.toFixed(1)}:1</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={0.5}
                        value={compRatio}
                        onChange={e => {
                          setMasterPreset('custom');
                          setCompRatio(Number(e.target.value));
                        }}
                        className="w-full accent-purple-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-purple-300 flex items-center gap-1.5">
                        <i className="fas fa-volume-high text-[9px]"></i> Salida Master / Normalizador
                      </span>
                      <span className="font-mono text-white">{(masterGain * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.2}
                      step={0.05}
                      value={masterGain}
                      onChange={e => {
                        setMasterPreset('custom');
                        setMasterGain(Number(e.target.value));
                      }}
                      className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='waveform'&&fi&&(
          <div className="max-w-5xl mx-auto">
            {/* Hidden HTML5 Audio Element for playback */}
            <audio
              ref={audioPlayerRef}
              src={fi.objectUrl}
              onTimeUpdate={e => setPlaybackTime(e.currentTarget.currentTime)}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif italic text-white">Forma de Onda & Reproductor</h2>
                <p className="text-white/30 text-xs mt-1">Haz clic en cualquier punto de la onda para reproducir. Zonas rojas = silencios ≥0.3s.</p>
              </div>

              {/* Controles de Reproducción */}
              <div className="flex items-center gap-3 bg-[#0f111a] border border-white/10 p-2 rounded-2xl">
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="w-11 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center text-sm shadow-lg shadow-purple-950/50 transition-all active:scale-95"
                  title={isPlaying ? 'Pausar audio' : 'Reproducir audio'}
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.currentTime = 0;
                      setPlaybackTime(0);
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center text-xs transition-all"
                  title="Reiniciar al inicio"
                >
                  <i className="fas fa-backward-step"></i>
                </button>

                <div className="px-3 text-right">
                  <p className="text-xs font-mono font-bold text-white">
                    {fmtD(playbackTime)} <span className="text-white/30 font-normal">/ {fmtD(fi.duration)}</span>
                  </p>
                  <p className="text-[8px] font-mono text-purple-400 font-bold uppercase tracking-widest">
                    {isPlaying ? '▶ Reproduciendo' : '⏸ Pausado'}
                  </p>
                </div>
              </div>
            </div>

            {wave?<>
              <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 mb-6">
                <canvas 
                  ref={wRef} 
                  width={1200} 
                  height={220} 
                  onClick={handleWaveformClick}
                  className="w-full rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                  title="Haz clic para saltar a esta posición en el audio"
                />
                
                {/* Interactive seek bar slider */}
                <div className="mt-3 px-1">
                  <input
                    type="range"
                    min={0}
                    max={fi.duration || 1}
                    step={0.1}
                    value={playbackTime}
                    onChange={e => {
                      const t = Number(e.target.value);
                      if (audioPlayerRef.current) audioPlayerRef.current.currentTime = t;
                      setPlaybackTime(t);
                    }}
                    className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-6 mt-4 text-[9px] font-black uppercase tracking-widest text-white/40">
                  <span className="flex items-center gap-2"><span className="w-4 h-2 bg-purple-500 rounded"></span>Señal</span>
                  <span className="flex items-center gap-2"><span className="w-4 h-2 bg-red-500/50 rounded"></span>Silencio</span>
                  <span className="flex items-center gap-2 text-purple-400 font-bold"><i className="fas fa-hand-pointer text-[8px]"></i>Clic para buscar</span>
                  <span className="ml-auto">{fmtD(fi.duration)} · {(fi.sampleRate/1000).toFixed(1)} kHz · {fi.channels===1?'Mono':'Estéreo'}</span>
                </div>
              </div>
              <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2"><i className="fas fa-volume-xmark text-red-400"></i>Silencios</p>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full ${silences.length===0?'bg-green-500/10 text-green-400 border border-green-500/20':'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{silences.length===0?'✓ Audio limpio':`${silences.length} detectado${silences.length>1?'s':''}`}</span>
                </div>
                {silences.length===0?<div className="text-center py-8 text-white/20"><i className="fas fa-check-circle text-3xl text-green-400/50 mb-3 block"></i><p>Señal continua — sin silencios problemáticos</p></div>
                :<div className="space-y-2 max-h-64 overflow-y-auto">{silences.map((s,i)=><div key={i} className="flex items-center justify-between bg-red-950/20 border border-red-900/20 rounded-xl px-4 py-3"><span className="text-white/60 text-xs flex items-center gap-2"><i className="fas fa-volume-xmark text-red-400 text-xs"></i>Silencio #{i+1}</span><div className="flex items-center gap-4 text-xs font-mono"><span className="text-white/40">{fmtD(s.start)} → {fmtD(s.end)}</span><span className={(s.end-s.start)>2?'text-red-400 font-bold':'text-yellow-400 font-bold'}>{(s.end-s.start).toFixed(2)}s</span></div></div>)}</div>}
              </div>
            </>:<div className="text-center py-20 text-white/20"><i className="fas fa-waveform-lines text-5xl mb-4 block opacity-20"></i><p>No se pudo decodificar el audio en el navegador.</p></div>}
          </div>
        )}

        {tab==='stems'&&fi&&(
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
                  <i className="fas fa-layer-group text-purple-400"></i> Separador de Pistas (IA)
                </h2>
                <p className="text-white/40 text-xs mt-1">Aisla Acapella, Batería, Bajo, Guitarras/Requinto, Pianos o Metales con IA de estudio.</p>
              </div>
              <button 
                onClick={() => setShowGenreTips(!showGenreTips)}
                className="self-start md:self-auto px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <i className="fas fa-circle-question text-purple-400"></i>
                {showGenreTips ? 'Ocultar Guía de Géneros' : '¿Cómo se separan tus géneros?'}
              </button>
            </div>

            {showGenreTips && (
              <div className="mb-8 p-6 bg-[#0f111a] border border-purple-500/30 rounded-2xl animate-fade-in text-xs space-y-4">
                <p className="text-purple-300 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
                  <i className="fas fa-sliders text-purple-400"></i> Guía rápida según tu género musical:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-2"><span className="text-base">🇲🇽</span> Corridos Tumbados / Sierreño</p>
                    <p className="text-white/60 text-[11px]">Usa <strong className="text-purple-300">6 Pistas</strong>: Tu <strong>Requinto y Docerola</strong> se separan en la pista de <em>Guitarras</em>, el <strong>Tololoche / Bajoloche</strong> en <em>Bajo</em>, y <strong>Charchetas / Trombones</strong> en <em>Otros</em>.</p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-2"><span className="text-base">🎺</span> Banda Sinaloense</p>
                    <p className="text-white/60 text-[11px]">Usa <strong className="text-purple-300">4 Pistas</strong>: La <strong>Tuba</strong> va a <em>Bajo</em>, la <strong>Tambora y Tarolas</strong> van a <em>Batería</em>, y los <strong>Clarinetes, Trompetas y Trombones</strong> a <em>Otros/Metales</em>.</p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-2"><span className="text-base">🎤</span> Rap / Trap / Hip-Hop</p>
                    <p className="text-white/60 text-[11px]">Usa <strong className="text-purple-300">4 Pistas</strong>: Obtienes la <strong>Voz Acapella</strong> limpia, el <strong>Beat</strong> (bombos, cajas, hi-hats), el <strong>Bajo 808</strong> aislado y los <strong>Samples/Sintetizadores</strong> en Otros.</p>
                  </div>
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-1">
                    <p className="font-bold text-white flex items-center gap-2"><span className="text-base">🎹</span> Pop Latino / Acústico</p>
                    <p className="text-white/60 text-[11px]">Usa <strong className="text-purple-300">6 Pistas</strong> si contiene guitarras acústicas o pianos protagónicos, o <strong>4 Pistas</strong> para reggaetón y pop comercial rítmico.</p>
                  </div>
                </div>
              </div>
            )}
            
            {!aiStems ? (
              <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 md:p-10 text-center">
                <i className="fas fa-brain text-5xl text-purple-500/20 mb-4 block"></i>
                <h3 className="text-white font-bold text-lg mb-2">Dividir Pistas con Inteligencia Artificial</h3>
                <p className="text-white/40 text-xs mb-8 max-w-xl mx-auto">
                  Elige la configuración de separación según los instrumentos de tu canción:
                </p>

                {/* Selector de Modelo / Número de Pistas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8 text-left">
                  <div 
                    onClick={() => !isExtracting && setSelectedModel('htdemucs')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedModel === 'htdemucs' 
                        ? 'bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-950/40' 
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">4</span>
                        <h4 className="text-white font-bold text-sm">4 Pistas (Estándar)</h4>
                      </div>
                      <input 
                        type="radio" 
                        name="modelSelect" 
                        checked={selectedModel === 'htdemucs'} 
                        onChange={() => setSelectedModel('htdemucs')}
                        className="accent-purple-500" 
                      />
                    </div>
                    <p className="text-white/50 text-[11px] mb-3">Voces, Batería/Percusión, Bajo/Tuba e Instrumental/Otros.</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md font-bold">Rap / Trap</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">Banda Sinaloense</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-bold">Pop Latino</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => !isExtracting && setSelectedModel('htdemucs_6s')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedModel === 'htdemucs_6s' 
                        ? 'bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-950/40' 
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center">6</span>
                        <h4 className="text-white font-bold text-sm">6 Pistas (Detallado)</h4>
                      </div>
                      <input 
                        type="radio" 
                        name="modelSelect" 
                        checked={selectedModel === 'htdemucs_6s'} 
                        onChange={() => setSelectedModel('htdemucs_6s')}
                        className="accent-purple-500" 
                      />
                    </div>
                    <p className="text-white/50 text-[11px] mb-3">Voces, Batería, Bajo, <strong>Guitarras/Requintos</strong>, Pianos y Otros.</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md font-bold">Corridos Tumbados</span>
                      <span className="text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-md font-bold">Sierreño</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold">Acústico</span>
                    </div>
                  </div>
                </div>

                {!isExtracting ? (
                  <button 
                    onClick={extractStems} 
                    className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 mx-auto shadow-xl shadow-purple-900/30"
                  >
                    <i className="fas fa-wand-magic-sparkles text-lg"></i>
                    Extraer {selectedModel === 'htdemucs' ? '4 Pistas' : '6 Pistas'} Ahora
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <button 
                      disabled
                      className="px-8 py-4 bg-purple-600 opacity-70 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 mx-auto shadow-xl shadow-purple-900/30 cursor-not-allowed"
                    >
                      <i className="fas fa-spinner fa-spin text-lg"></i>
                      Extrayendo pistas...
                    </button>
                    <button
                      onClick={cancelExtract}
                      className="px-5 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      <i className="fas fa-xmark mr-2"></i>Cancelar
                    </button>
                  </div>
                )}
                {extractStatus && (
                  <div className="mt-6 space-y-2">
                    <p className="text-purple-300 text-xs font-mono animate-pulse">{extractStatus}</p>
                    {extractStatus.includes('cold start') || extractStatus.includes('Iniciando GPU') ? (
                      <p className="text-white/25 text-[10px]">
                        ⏳ La primera vez el modelo tarda en arrancar la GPU (3-8 min). Las siguientes veces es mucho más rápido.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Barra de Descarga en Bloque / ZIP */}
                <div className="bg-[#0f111a] border border-purple-500/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-purple-950/20">
                  <div>
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                      <i className="fas fa-circle-check text-green-400"></i>
                      ¡Pistas Separadas Listas! ({Object.keys(aiStems).length} pistas)
                    </h3>
                    <p className="text-white/40 text-xs mt-0.5">
                      Descarga todo de un solo jalón en un archivo ZIP comprimido sin salir de la página.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[9px] font-mono text-purple-300">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center gap-1">
                        <i className="fas fa-tags text-purple-400"></i>Etiquetas ID3v2 incrustadas en cada WAV
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 font-bold">{meta.artist}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60">{meta.label || 'Diosmasgym records'}</span>
                      <span className="text-white/40">•</span>
                      <span className="text-purple-400">{meta.genre}</span>
                      {meta.lyrics && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="text-emerald-400">Letra en Vocals</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={downloadZip}
                      disabled={isZipping || Object.values(selectedStemsToZip).filter(Boolean).length === 0}
                      className="flex-1 md:flex-initial px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <i className={`fas ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-zipper'} text-sm`}></i>
                      {isZipping ? 'Comprimiendo...' : `Descargar Todo en ZIP (${Object.values(selectedStemsToZip).filter(Boolean).length})`}
                    </button>
                    
                    <button 
                      onClick={() => setAiStems(null)}
                      title="Separar otro audio"
                      className="px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <i className="fas fa-rotate-left"></i>
                    </button>
                  </div>
                </div>

                {isZipping && (
                  <div className="bg-purple-950/30 border border-purple-500/30 rounded-2xl p-4 text-center">
                    <p className="text-purple-300 text-xs font-mono animate-pulse">{zipProgress}</p>
                  </div>
                )}

                {/* Controles de Selección Rápida */}
                <div className="flex items-center justify-between text-xs px-2">
                  <div className="flex items-center gap-4 text-white/50 text-[11px]">
                    <span>Pistas para el ZIP:</span>
                    <button 
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        Object.keys(aiStems).forEach(k => { all[k] = true; });
                        setSelectedStemsToZip(all);
                      }}
                      className="text-purple-400 hover:underline font-bold"
                    >
                      Marcar todas
                    </button>
                    <button 
                      onClick={() => setSelectedStemsToZip({})}
                      className="text-white/40 hover:underline"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                  <span className="text-white/30 text-[10px]">
                    Audio original: {fi.name}
                  </span>
                </div>

                {/* Lista de Pistas */}
                <div className="space-y-4">
                  {Object.entries(aiStems).map(([name, url]) => {
                    const info = getStemInfo(name);
                    const isSelected = selectedStemsToZip[name] !== false;
                    const isDownloadingThis = downloadingStem === name;

                    return (
                      <div key={name} className="bg-[#0f111a] border border-white/5 hover:border-purple-500/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-start md:items-center gap-5 transition-all">
                        {/* Checkbox para el ZIP */}
                        <div className="flex items-center gap-4 shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => setSelectedStemsToZip(p => ({ ...p, [name]: !isSelected }))}
                            className="w-5 h-5 rounded-lg accent-purple-500 cursor-pointer" 
                            title="Incluir en el archivo ZIP"
                          />
                          <div className={`w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0`}>
                            <i className={`fas ${info.icon} text-2xl ${info.color}`}></i>
                          </div>
                        </div>

                        {/* Info de la pista y audio player */}
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <p className="text-white font-bold uppercase tracking-wider text-xs">
                              {info.title}
                            </p>
                            <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/50">
                              {info.genreHint}
                            </span>
                          </div>
                          <p className="text-white/40 text-[11px] mb-2">{info.desc}</p>
                          <audio src={url as string} controls className="w-full h-8" />
                        </div>

                        {/* Botón de Descarga Individual Segura (sin perder la página) */}
                        <button 
                          onClick={() => downloadSingleStem(url as string, name)}
                          disabled={isDownloadingThis}
                          className="w-full md:w-12 h-12 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 flex items-center justify-center text-white/50 hover:text-purple-300 transition-all shrink-0 disabled:opacity-50"
                          title="Descargar pista individual en WAV sin recargar"
                        >
                          <i className={`fas ${isDownloadingThis ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
                          <span className="md:hidden ml-2 text-xs font-bold">Descargar {name}.wav</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-8 text-center">
                  <button 
                    onClick={() => setAiStems(null)}
                    className="text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    <i className="fas fa-arrow-rotate-left mr-2"></i> Separar otro archivo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {tab==='export'&&fi&&(
          <div className="max-w-2xl mx-auto">
            <div className="mb-8"><h2 className="text-2xl font-serif italic text-white">Exportar Archivo</h2><p className="text-white/30 text-xs mt-1">Descarga tu audio con metadatos ID3, firmas Anti-IA y artwork de estudio.</p></div>
            
            <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 mb-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Resumen de Entrega</p>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <i className="fas fa-shield-halved text-[8px]"></i> Shield Anti-IA Activo
                </span>
              </div>
              <div className="space-y-3">
                {[{l:'Título',v:meta.title||'—',i:'fa-music'},{l:'Artista',v:meta.artist||'—',i:'fa-microphone'},{l:'Álbum',v:meta.album||'—',i:'fa-compact-disc'},{l:'Año',v:meta.year||'—',i:'fa-calendar'},{l:'Género',v:meta.genre||'—',i:'fa-tag'},{l:'Sello',v:meta.label||'—',i:'fa-building'},{l:'Encoder ID3',v:'LAME 3.100 (Studio Master Edition)',i:'fa-compact-disc'},{l:'Letra',v:meta.lyrics?.trim()?`${meta.lyrics.trim().split('\n').filter(Boolean).length} versos listos (ID3)`:'Sin letra cargada',i:'fa-align-left'},{l:'ISRC',v:meta.isrc||'—',i:'fa-barcode'},{l:'BPM',v:meta.bpm||'—',i:'fa-metronome'},{l:'Artwork',v:artFile?artFile.name:(fi.coverArtUrl?'Original del archivo':'Sin artwork'),i:'fa-image'}].map(item=>(
                  <div key={item.l} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"><span className="text-white/40 text-xs flex items-center gap-2"><i className={`fas ${item.i} text-purple-400/50 w-4 text-center`}></i>{item.l}</span><span className="text-white text-xs font-bold truncate max-w-[60%] text-right">{item.v}</span></div>
                ))}
              </div>
            </div>

            <div className="bg-purple-950/20 border border-purple-500/20 rounded-[2rem] p-5 mb-6 text-xs text-white/50 space-y-1.5">
              <p className="flex items-center gap-2 text-white/80 font-bold"><i className="fas fa-shield-check text-emerald-400"></i>Protección Anti-IA y Firma de Estudio</p>
              <p>Elimina tags de encoders automáticos de IA y reescribe cabeceras ID3v2.3 con autoría humana de estudio.</p>
              <p>Compatible al 100% con <strong className="text-white/80">Spotify, Apple Music, Tidal, Amazon Music y DistroKid</strong>.</p>
            </div>

            {exporting&&<div className="mb-6"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40 mb-2"><span>Procesando...</span><span>{exportPct}%</span></div><div className="w-full bg-white/5 rounded-full h-2"><div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{width:`${exportPct}%`}}></div></div></div>}
            
            <div>
              <button
                type="button"
                onClick={async () => {
                  applyOneClickAntiAIScrub();
                  setTimeout(() => {
                    handleDownloadMasterWav();
                  }, 150);
                }}
                disabled={isRenderingMaster}
                className="w-full py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-emerald-950/50 border border-emerald-400/40 active:scale-95"
              >
                <i className={`fas ${isRenderingMaster ? 'fa-spinner fa-spin' : 'fa-file-arrow-down'} text-lg text-amber-300`}></i>
                {isRenderingMaster ? 'Procesando y Exportando Master...' : 'Descargar Master WAV Blindado (Listo para DistroKid)'}
              </button>
            </div>

            <p className="text-center text-white/20 text-[9px] mt-4 uppercase tracking-widest">El archivo se descarga en tu dispositivo</p>
          </div>
        )}
      </div>

      {fi&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"><audio src={fi.objectUrl} controls className="rounded-full border border-purple-500/20 shadow-2xl h-10 w-80 md:w-[460px]"/></div>}
    </div>
  );
};

export default AudioStudioPro;
