import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AudioMetadata { title:string; artist:string; album:string; year:string; genre:string; composer:string; bpm:string; comment:string; isrc:string; label:string; trackNumber:string; }
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
const GENRES=['Gospel','Worship','Christian Rap','Christian Rock','Contemporary Christian','Pop','Hip-Hop','R&B','Rock','Reggae','Latin','Salsa','Merengue','Cumbia','Urbano','Trap','Soul','Blues','Jazz','Electronic','Dance','Alternative','Folk','Country','Metal'];
const fmtB=(b:number)=>b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(2)} MB`;
const fmtD=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

const AudioStudioPro:React.FC=()=>{
  const navigate=useNavigate();
  const [tab,setTab]=useState<TabId>('loader');
  const [fi,setFi]=useState<AudioFileInfo|null>(null);
  const [meta,setMeta]=useState<AudioMetadata>({title:'',artist:'Diosmasgym',album:'',year:'',genre:'Gospel',composer:'Juan Bernal',bpm:'',comment:'',isrc:'',label:'Diosmasgym Records',trackNumber:'1'});
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
  const [notif,setNotif]=useState<{m:string;t:'ok'|'err'}|null>(null);
  const fRef=useRef<HTMLInputElement>(null);
  const aRef=useRef<HTMLInputElement>(null);
  const wRef=useRef<HTMLCanvasElement>(null);
  const cRef=useRef<HTMLCanvasElement>(null);

  const notify=(m:string,t:'ok'|'err'='ok')=>{setNotif({m,t});setTimeout(()=>setNotif(null),3500);};

  const loadFile=useCallback(async(file:File)=>{
    if(!file.type.includes('audio')&&!file.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a)$/i)){notify('Formato no soportado. Usa WAV, MP3, FLAC, AIFF o M4A.','err');return;}
    setAnalyzing(true);setWave(null);setSilences([]);
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
      setMeta({title:tags.title||guess,artist:tags.artist||'Diosmasgym',album:tags.album||'',year:tags.year||String(new Date().getFullYear()),genre:tags.genre||'Gospel',composer:'Juan Bernal',bpm:tags.bpm||'',comment:tags.comment||'',isrc:tags.isrc||'',label:'Diosmasgym Records',trackNumber:tags.trackNumber||'1'});
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
      setTab('metadata');
    }catch(e:any){notify(`Error: ${e.message}`,'err');}
    finally{setAnalyzing(false);}
  },[]);

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

  const extractStems = async () => {
    if (!fi) return;
    setIsExtracting(true);
    setExtractStatus('Subiendo audio a servidor temporal...');
    try {
      const blob = new Blob([fi.arrayBuffer], { type: fi.type });
      const formData = new FormData();
      formData.append('file', blob, fi.name);
      
      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadData?.data?.url) throw new Error('Error subiendo archivo');
      const directUrl = uploadData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

      setExtractStatus('Iniciando Inteligencia Artificial...');
      const repRes = await fetch('/api/separate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: directUrl })
      });
      const repData = await repRes.json();
      if (repData.error) throw new Error(repData.error);
      
      let predictionId = repData.id;
      let result = repData;
      
      while (result.status !== 'succeeded' && result.status !== 'failed') {
        setExtractStatus(`Procesando (${result.status})... esto puede tomar 1 o 2 minutos`);
        await new Promise(r => setTimeout(r, 4000));
        const checkRes = await fetch(`/api/separate-audio?id=${predictionId}`);
        result = await checkRes.json();
      }
      
      if (result.status === 'failed') throw new Error('Falló la separación IA');
      
      setAiStems(result.output);
      notify('¡Pistas separadas con éxito!');
    } catch (e: any) {
      notify(`Error: ${e.message}`, 'err');
    } finally {
      setIsExtracting(false);
      setExtractStatus('');
    }
  };

  const tabs2:{id:TabId;l:string;i:string;dis?:boolean}[]=[
    {id:'loader',l:'Cargador',i:'fa-upload'},
    {id:'metadata',l:'Metadatos',i:'fa-tags',dis:!fi},
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
              <h1 className="text-white font-bold text-lg flex items-center gap-2"><i className="fas fa-waveform-lines text-purple-400"></i>Audio Studio Pro</h1>
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

        {tab==='metadata'&&fi&&(
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8"><div><h2 className="text-2xl font-serif italic text-white">Metadatos ID3</h2><p className="text-white/30 text-xs mt-1">Los cambios se aplican al exportar.</p></div>{dirty&&<span className="text-[9px] font-black uppercase tracking-widest text-yellow-400 animate-pulse flex items-center gap-2"><i className="fas fa-circle text-[6px]"></i>Sin exportar</span>}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FLD k="title" label="Título" icon="fa-music" ph="Nombre de la canción" full/>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2"><i className="fas fa-microphone text-purple-400/60"></i>Artista</label>
                <select value={meta.artist} onChange={e=>{setMeta(p=>({...p,artist:e.target.value}));setDirty(true);}} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all">
                  <option value="Diosmasgym">Diosmasgym</option>
                  <option value="Juan 614">Juan 614</option>
                </select>
              </div>
              <FLD k="album" label="Álbum / EP" icon="fa-compact-disc" ph="Nombre del álbum"/>
              <FLD k="year" label="Año" icon="fa-calendar" ph="2026" ml={4}/>
              <FLD k="trackNumber" label="Pista #" icon="fa-list-ol" ph="1"/>
              <FLD k="bpm" label="BPM" icon="fa-metronome" ph="120"/>
              <FLD k="composer" label="Compositor" icon="fa-pen-nib" ph="Nombre del compositor" ro/>
              <FLD k="label" label="Sello / Label" icon="fa-building" ph="Mando Ejecutivo Records" ro/>
              <FLD k="isrc" label="ISRC" icon="fa-barcode" ph="US-XXX-26-00001" ml={12}/>
              <FLD k="comment" label="Comentario" icon="fa-comment" ph="Notas adicionales..."/>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-2"><i className="fas fa-tag text-purple-400/60"></i>Género</label>
                <select value={meta.genre} onChange={e=>{setMeta(p=>({...p,genre:e.target.value}));setDirty(true);}} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 mb-2">
                  {GENRES.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
                <input type="text" value={meta.genre} onChange={e=>{setMeta(p=>({...p,genre:e.target.value}));setDirty(true);}} placeholder="O escribe género personalizado..."
                  className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-purple-500/50"/>
              </div>
            </div>
            <div className="mt-8 bg-[#0f111a] border border-white/5 rounded-[2rem] p-6">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Plantillas Rápidas</p>
              <div className="flex flex-wrap gap-3">
                {[{l:'Diosmasgym',d:{artist:'Diosmasgym',label:'Mando Ejecutivo Records',genre:'Gospel',year:String(new Date().getFullYear())}},{l:'Juan 614',d:{artist:'Juan 614',label:'Mando Ejecutivo Records',genre:'Christian Rap',year:String(new Date().getFullYear())}}].map(tpl=>(
                  <button key={tpl.l} onClick={()=>{setMeta(p=>({...p,...tpl.d}));setDirty(true);notify(`Plantilla "${tpl.l}" aplicada`);}} className="px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all"><i className="fas fa-bolt mr-2"></i>{tpl.l}</button>
                ))}
                <button onClick={()=>{setMeta({title:'',artist:'',album:'',year:'',genre:'Gospel',composer:'',bpm:'',comment:'',isrc:'',label:'',trackNumber:'1'});setDirty(true);notify('Metadatos limpiados');}} className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"><i className="fas fa-trash mr-2"></i>Limpiar</button>
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
            <div className="mb-8">
              <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
                <i className="fas fa-layer-group text-purple-400"></i> Separador de Pistas (IA)
              </h2>
              <p className="text-white/30 text-xs mt-1">Extrae voces, batería, bajo y melodía usando Inteligencia Artificial.</p>
            </div>
            
            {!aiStems ? (
              <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-10 text-center">
                <i className="fas fa-brain text-5xl text-purple-500/20 mb-6 block"></i>
                <h3 className="text-white font-bold text-lg mb-2">Dividir con Inteligencia Artificial</h3>
                <p className="text-white/40 text-sm mb-8 max-w-lg mx-auto">
                  Usamos el modelo avanzado <strong>Demucs</strong> para aislar las pistas. Tu audio será procesado en servidores de alto rendimiento.
                </p>
                <button 
                  onClick={extractStems} 
                  disabled={isExtracting}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 mx-auto shadow-xl shadow-purple-900/30"
                >
                  <i className={`fas ${isExtracting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-lg`}></i>
                  {isExtracting ? 'Extrayendo pistas...' : 'Extraer Stems Ahora'}
                </button>
                {extractStatus && (
                  <p className="mt-6 text-purple-300 text-xs font-mono animate-pulse">{extractStatus}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(aiStems).map(([name, url]) => (
                  <div key={name} className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <i className={`fas ${
                        name==='vocals' ? 'fa-microphone' :
                        name==='drums' ? 'fa-drum' :
                        name==='bass' ? 'fa-guitar' : 'fa-music'
                      } text-2xl text-purple-400`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold uppercase tracking-widest text-[10px] mb-2">
                        {name==='vocals' ? 'Voces (Acapella)' :
                         name==='drums' ? 'Batería (Drums)' :
                         name==='bass' ? 'Bajo (Bass)' : 'Otros (Melodía)'}
                      </p>
                      <audio src={url as string} controls className="w-full h-8" />
                    </div>
                    <a 
                      href={url as string} 
                      download={`${fi.name.replace(/\.[^.]+$/, '')}_${name}.mp3`}
                      className="w-12 h-12 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/50 flex items-center justify-center text-white/50 hover:text-purple-300 transition-all shrink-0"
                    >
                      <i className="fas fa-download"></i>
                    </a>
                  </div>
                ))}
                
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
                {[{l:'Título',v:meta.title||'—',i:'fa-music'},{l:'Artista',v:meta.artist||'—',i:'fa-microphone'},{l:'Álbum',v:meta.album||'—',i:'fa-compact-disc'},{l:'Año',v:meta.year||'—',i:'fa-calendar'},{l:'Género',v:meta.genre||'—',i:'fa-tag'},{l:'Sello',v:meta.label||'—',i:'fa-building'},{l:'ISRC',v:meta.isrc||'—',i:'fa-barcode'},{l:'BPM',v:meta.bpm||'—',i:'fa-metronome'},{l:'Artwork',v:artFile?artFile.name:(fi.coverArtUrl?'Original del archivo':'Sin artwork'),i:'fa-image'}].map(item=>(
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
