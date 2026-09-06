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
type TabId = 'loader'|'metadata'|'artwork'|'waveform'|'stems'|'export';

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
  const [wmText,setWmText]=useState('© Diosmasgym');
  const [wmPos,setWmPos]=useState<'br'|'bl'|'tr'|'c'>('br');
  const [wmColor,setWmColor]=useState('#ffffff');
  const [wmOp,setWmOp]=useState(70);
  const [wmSz,setWmSz]=useState(28);
  const [exportPct,setExportPct]=useState(0);
  const [exporting,setExporting]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [aiStems,setAiStems]=useState<Record<string,string>|null>(null);
  const [isExtracting,setIsExtracting]=useState(false);
  const [extractStatus,setExtractStatus]=useState('');
  const [selectedModel,setSelectedModel]=useState<'htdemucs'|'htdemucs_6s'>('htdemucs');
  const [isSplittingVocals,setIsSplittingVocals]=useState(false);
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
  const fRef=useRef<HTMLInputElement>(null);
  const aRef=useRef<HTMLInputElement>(null);
  const lyricFileRef=useRef<HTMLInputElement>(null);
  const wRef=useRef<HTMLCanvasElement>(null);
  const cRef=useRef<HTMLCanvasElement>(null);
  const abortControllerRef=useRef<AbortController|null>(null);

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
    const songSlug = generateSlug(song.name);
    const saved = savedLyrics.find(l => 
      l.id === song.id || 
      generateSlug(l.title || '') === songSlug ||
      (l.artist && generateSlug(`${l.artist}-${l.title}`) === generateSlug(`${song.artist}-${song.name}`))
    );
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
      const songTitle = meta.title || selectedCatalogSong?.name || fi?.name.replace(/\.[^.]+$/, '') || 'Sin título';
      const songId = selectedCatalogSong?.id || generateSlug(songTitle);
      const adminPass = localStorage.getItem('admin_password') || sessionStorage.getItem('admin_password') || '';

      const res = await saveLyricToWeb({
        id: songId,
        title: songTitle,
        artist: meta.artist,
        content: meta.lyrics.trim(),
        status: 'LIVE'
      }, adminPass);

      if (res.success) {
        notify('✅ Letra guardada y publicada directamente en el sitio web');
        const updatedItem = {
          id: songId,
          title: songTitle,
          artist: meta.artist,
          content: meta.lyrics.trim(),
          date: new Date().toISOString(),
          status: 'LIVE'
        };
        setSavedLyrics(prev => {
          const idx = prev.findIndex(l => l.id === songId || generateSlug(l.title || '') === generateSlug(songTitle));
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...updatedItem };
            return copy;
          }
          return [updatedItem, ...prev];
        });
        if (selectedCatalogSong) {
          setSelectedCatalogSong(prev => prev ? { ...prev, lyrics: meta.lyrics } : null);
          setCatalog(prev => prev.map(s => (s.id === selectedCatalogSong.id || generateSlug(s.name) === generateSlug(songTitle)) ? { ...s, lyrics: meta.lyrics } : s));
        }

        // 2. Sincronización directa con Google Sheets (Nube) para persistencia total
        try {
          const queryString = new URLSearchParams({
            action: 'save',
            secret: 'DMG_SYNC_2026',
            title: songTitle,
            artist: meta.artist
          }).toString();

          await fetch(`/api/sheet-proxy?script=lyrics&${queryString}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save',
              secret: 'DMG_SYNC_2026',
              title: songTitle,
              artist: meta.artist,
              content: meta.lyrics.trim(),
              date: new Date().toISOString()
            })
          });
        } catch (sheetErr) {
          console.warn('Google Sheets cloud sync error:', sheetErr);
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
    setAnalyzing(true);setWave(null);setSilences([]);setAiStems(null);setSelectedStemsToZip({});
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
  },[wave,silences,fi]);

  const drawCanvas=useCallback(()=>{
    if(!cRef.current)return;const cv=cRef.current;const ctx=cv.getContext('2d')!;ctx.clearRect(0,0,600,600);
    const dw=(img?:HTMLImageElement)=>{
      if(img){ctx.drawImage(img,0,0,600,600);}
      else{const g=ctx.createLinearGradient(0,0,600,600);g.addColorStop(0,'#1a1035');g.addColorStop(1,'#05070a');ctx.fillStyle=g;ctx.fillRect(0,0,600,600);ctx.fillStyle='rgba(168,85,247,0.15)';ctx.beginPath();ctx.arc(300,300,200,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('Sin artwork',300,300);}
      if(!wmText.trim())return;
      ctx.globalAlpha=wmOp/100;ctx.fillStyle=wmColor;ctx.font=`bold ${wmSz}px Arial,sans-serif`;
      const p=24;let tx=600-p,ty=600-p;ctx.textAlign='right';
      if(wmPos==='bl'){ctx.textAlign='left';tx=p;ty=600-p;}
      else if(wmPos==='tr'){tx=600-p;ty=wmSz+p;}
      else if(wmPos==='c'){ctx.textAlign='center';tx=300;ty=300;}
      ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=8;ctx.shadowOffsetX=2;ctx.shadowOffsetY=2;
      ctx.fillText(wmText,tx,ty);ctx.globalAlpha=1;ctx.shadowColor='transparent';ctx.shadowBlur=0;
    };
    if(artPrev){const img=new Image();img.crossOrigin='anonymous';img.onload=()=>dw(img);img.src=artPrev;}else dw();
  },[artPrev,wmText,wmPos,wmColor,wmOp,wmSz]);

  useEffect(()=>{if(tab==='artwork')drawCanvas();},[tab,drawCanvas]);

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
      if(meta.label)frames.push(mktf('TPUB',meta.label));
      if(meta.trackNumber)frames.push(mktf('TRCK',meta.trackNumber));
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
      setExportPct(100);notify(`✅ "${sn}.${ext}" exportado con éxito`);setTimeout(()=>setExportPct(0),2000);
    }catch(e:any){notify(`Error: ${e.message}`,'err');}
    finally{setExporting(false);}
  };

  const getStemInfo = (name: string) => {
    switch (name) {
      case 'lead_vocals':
        return {
          title: 'Voz Principal (Lead Vocal)',
          desc: 'Voz solista frontal centrada en la mezcla',
          icon: 'fa-user-tie',
          color: 'text-violet-300',
          genreHint: 'Voz solista aislada del centro de la mezcla'
        };
      case 'backing_vocals':
        return {
          title: 'Coros y Segundas (Backing Vocals)',
          desc: 'Armonías, segundas voces y adornos estéreo',
          icon: 'fa-users',
          color: 'text-fuchsia-400',
          genreHint: 'Coros, armonías vocales y ad-libs laterales'
        };
      case 'vocals':
        return {
          title: 'Voces (Acapella Completa)',
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

  const audioBufferToWav = (buffer: AudioBuffer): Uint8Array => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numSamples = buffer.length;
    const dataByteLength = numSamples * blockAlign;
    const headerByteLength = 44;
    const totalLength = headerByteLength + dataByteLength;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
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
    view.setUint32(40, dataByteLength, true);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Uint8Array(arrayBuffer);
  };

  const splitVocalStem = async (vocalUrl: string) => {
    setIsSplittingVocals(true);
    try {
      notify('Descargando pista vocal para análisis estéreo...', 'ok');
      let rawBuf: ArrayBuffer | null = null;
      try {
        const res = await fetch(vocalUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rawBuf = await res.arrayBuffer();
      } catch {
        if (!vocalUrl.startsWith('blob:')) {
          const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(vocalUrl)}`);
          if (proxyRes.ok) rawBuf = await proxyRes.arrayBuffer();
        }
      }

      if (!rawBuf || rawBuf.byteLength === 0) {
        throw new Error('No se pudo descargar la pista vocal para separar.');
      }

      const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await ac.decodeAudioData(rawBuf);

      if (audioBuffer.numberOfChannels < 2) {
        notify('Esta pista vocal es Mono. Para separar coros en pistas mono se requiere UVR5 con red neuronal en PC.', 'err');
        ac.close();
        return;
      }

      notify('Procesando separación Mid/Side (Voz Central vs Coros Estéreo)...', 'ok');
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);

      // 1. Lead Vocals (Centro / Mid): (L + R) * 0.5
      const leadBuffer = ac.createBuffer(2, length, sampleRate);
      const leadL = leadBuffer.getChannelData(0);
      const leadR = leadBuffer.getChannelData(1);

      // 2. Backing Vocals (Lados / Side): (L - R) * 0.5
      const backingBuffer = ac.createBuffer(2, length, sampleRate);
      const backL = backingBuffer.getChannelData(0);
      const backR = backingBuffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        const mid = (left[i] + right[i]) * 0.5;
        const side = (left[i] - right[i]) * 0.5;

        leadL[i] = mid;
        leadR[i] = mid;

        backL[i] = side;
        backR[i] = -side;
      }

      ac.close();

      const leadWav = audioBufferToWav(leadBuffer);
      const backWav = audioBufferToWav(backingBuffer);

      const leadBlob = new Blob([leadWav], { type: 'audio/wav' });
      const backBlob = new Blob([backWav], { type: 'audio/wav' });

      const leadUrl = URL.createObjectURL(leadBlob);
      const backUrl = URL.createObjectURL(backBlob);

      setAiStems(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lead_vocals: leadUrl,
          backing_vocals: backUrl,
        };
      });

      setSelectedStemsToZip(prev => ({
        ...prev,
        lead_vocals: true,
        backing_vocals: true,
      }));

      notify('✨ ¡Voz Principal y Coros (Backing Vocals) divididos con éxito!');
    } catch (err: any) {
      console.error('Error al dividir pista vocal:', err);
      notify(`Error al dividir voces: ${err.message}`, 'err');
    } finally {
      setIsSplittingVocals(false);
    }
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
      if (!url.startsWith('blob:')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
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
      url && typeof url === 'string' && (url.trim().startsWith('http') || url.trim().startsWith('blob:')) && selectedStemsToZip[name] !== false
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
          if ((url as string).startsWith('blob:')) {
            console.warn(`[ZIP] Falló lectura de blob para ${name}:`, fetchErr);
            continue;
          }
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
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-500/30">v1.1</span>
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
                <button onClick={()=>setTab('metadata')} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"><i className="fas fa-tags"></i>Editar metadatos →</button>
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
              <FLD k="bpm" label="BPM" icon="fa-metronome" ph="120"/>
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
                  <button onClick={()=>{drawCanvas();setTimeout(()=>{cRef.current?.toBlob(b=>{if(!b)return;const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='artwork_watermark.jpg';a.click();URL.revokeObjectURL(u);notify('Artwork descargado');},'image/jpeg',0.95);},150);}} className="px-5 py-3 bg-white/5 border border-white/10 hover:border-purple-500/40 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"><i className="fas fa-download"></i>Descargar</button>
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
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40"><i className="fas fa-copyright text-purple-400/60 mr-2"></i>Marca de Agua</p>
                  <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Texto</label><input type="text" value={wmText} onChange={e=>setWmText(e.target.value)} placeholder="© Diosmasgym" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50"/></div>
                  <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-2">Posición</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([{v:'br',l:'↘ Abajo Derecha'},{v:'bl',l:'↙ Abajo Izquierda'},{v:'tr',l:'↗ Arriba Derecha'},{v:'c',l:'⊙ Centro'}] as const).map(o=><button key={o.v} onClick={()=>setWmPos(o.v)} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${wmPos===o.v?'bg-purple-600 border-purple-500 text-white':'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>{o.l}</button>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Color</label><div className="flex items-center gap-3"><input type="color" value={wmColor} onChange={e=>setWmColor(e.target.value)} className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer"/><span className="text-xs text-white/50 font-mono">{wmColor}</span></div></div>
                    <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Tamaño: {wmSz}px</label><input type="range" min={14} max={80} value={wmSz} onChange={e=>setWmSz(Number(e.target.value))} className="w-full accent-purple-400"/></div>
                  </div>
                  <div><label className="text-[9px] text-white/30 uppercase tracking-widest block mb-1">Opacidad: {wmOp}%</label><input type="range" min={10} max={100} value={wmOp} onChange={e=>setWmOp(Number(e.target.value))} className="w-full accent-purple-400"/></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='waveform'&&fi&&(
          <div className="max-w-5xl mx-auto">
            <div className="mb-8"><h2 className="text-2xl font-serif italic text-white">Forma de Onda</h2><p className="text-white/30 text-xs mt-1">Visualización completa. Zonas rojas = silencios ≥0.3s.</p></div>
            {wave?<>
              <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 mb-6">
                <canvas ref={wRef} width={1200} height={220} className="w-full rounded-xl"/>
                <div className="flex items-center gap-6 mt-4 text-[9px] font-black uppercase tracking-widest text-white/40">
                  <span className="flex items-center gap-2"><span className="w-4 h-2 bg-purple-500 rounded"></span>Señal</span>
                  <span className="flex items-center gap-2"><span className="w-4 h-2 bg-red-500/50 rounded"></span>Silencio</span>
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

                {/* Nota informativa sobre voces y backing vocals */}
                <div className="max-w-2xl mx-auto mb-6 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-left flex items-start gap-3">
                  <i className="fas fa-circle-info text-purple-400 mt-0.5 text-xs shrink-0"></i>
                  <div className="text-[11px] text-white/70 leading-relaxed">
                    <strong className="text-white">¿Por qué las voces vienen juntas?</strong> Demucs agrupa la voz principal y las segundas voces/coros en una sola pista de <strong>Voces (Vocals)</strong>. La opción de 6 pistas añade <em>Guitarras</em> y <em>Pianos</em> (no coros). Para separar coros de la voz solista se requiere un modelo especializado en UVR / Karaoke.
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

                          {/* Si es la pista de Voces original, ofrecer la separación Mid/Side para sacar Lead y Backing vocals */}
                          {name === 'vocals' && (
                            <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-[11px] text-white/50">
                                <span className="text-purple-300 font-bold flex items-center gap-1.5">
                                  <i className="fas fa-layer-group text-xs"></i>
                                  ¿Quieres separar la voz principal de los coros?
                                </span>
                                <span className="text-white/40 text-[10px] block">
                                  Aísla la voz solista frontal y los coros/segundas voces estéreo con algoritmo Mid/Side al instante.
                                </span>
                              </div>
                              <button
                                onClick={() => splitVocalStem(url as string)}
                                disabled={isSplittingVocals}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-purple-950/40"
                              >
                                <i className={`fas ${isSplittingVocals ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                                {isSplittingVocals ? 'Dividiendo voces...' : 'Dividir Voz Solista y Coros (Mid/Side)'}
                              </button>
                            </div>
                          )}
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
            <div className="mb-8"><h2 className="text-2xl font-serif italic text-white">Exportar Archivo</h2><p className="text-white/30 text-xs mt-1">Descarga tu audio con metadatos ID3 y artwork actualizados.</p></div>
            <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 mb-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-5">Resumen</p>
              <div className="space-y-3">
                {[{l:'Título',v:meta.title||'—',i:'fa-music'},{l:'Artista',v:meta.artist||'—',i:'fa-microphone'},{l:'Álbum',v:meta.album||'—',i:'fa-compact-disc'},{l:'Año',v:meta.year||'—',i:'fa-calendar'},{l:'Género',v:meta.genre||'—',i:'fa-tag'},{l:'Sello',v:meta.label||'—',i:'fa-building'},{l:'Letra',v:meta.lyrics?.trim()?`${meta.lyrics.trim().split('\n').filter(Boolean).length} versos listos (ID3)`:'Sin letra cargada',i:'fa-align-left'},{l:'ISRC',v:meta.isrc||'—',i:'fa-barcode'},{l:'BPM',v:meta.bpm||'—',i:'fa-metronome'},{l:'Artwork',v:artFile?artFile.name:(fi.coverArtUrl?'Original del archivo':'Sin artwork'),i:'fa-image'}].map(item=>(
                  <div key={item.l} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"><span className="text-white/40 text-xs flex items-center gap-2"><i className={`fas ${item.i} text-purple-400/50 w-4 text-center`}></i>{item.l}</span><span className="text-white text-xs font-bold truncate max-w-[60%] text-right">{item.v}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-[2rem] p-5 mb-6 text-xs text-white/50 space-y-1">
              <p><i className="fas fa-info-circle text-purple-400 mr-2"></i>Formato original mantenido (.{fi.name.split('.').pop()?.toUpperCase()}).</p>
              <p>Metadatos escritos como <strong className="text-white/80">ID3v2.3</strong> — compatible con Spotify, Apple Music, etc.</p>
              <p>El audio <strong className="text-white/80">no se modifica</strong> — solo metadatos y artwork.</p>
            </div>
            {exporting&&<div className="mb-6"><div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40 mb-2"><span>Procesando...</span><span>{exportPct}%</span></div><div className="w-full bg-white/5 rounded-full h-2"><div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{width:`${exportPct}%`}}></div></div></div>}
            <button onClick={doExport} disabled={exporting} className="w-full py-5 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-purple-900/30">
              <i className={`fas ${exporting?'fa-spinner fa-spin':'fa-file-arrow-down'} text-lg`}></i>{exporting?'Exportando...':`Descargar .${fi.name.split('.').pop()?.toUpperCase()} con metadatos`}
            </button>
            <p className="text-center text-white/20 text-[9px] mt-4 uppercase tracking-widest">El archivo se descarga en tu dispositivo</p>
          </div>
        )}
      </div>

      {fi&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"><audio src={fi.objectUrl} controls className="rounded-full border border-purple-500/20 shadow-2xl h-10 w-80 md:w-[460px]"/></div>}
    </div>
  );
};

export default AudioStudioPro;
