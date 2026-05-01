import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ID3Writer } from 'browser-id3-writer';
import { WaveFile } from 'wavefile';

const MetadataTagger: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [coverBuffer, setCoverBuffer] = useState<ArrayBuffer | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const VERSION = "v1.0.0 ID3-Editor";

    const [metadata, setMetadata] = useState({
        title: '',
        artist: 'Diosmasgym',
        album: '',
        year: new Date().getFullYear().toString(),
        isrc: '',
        genre: 'Urbano / Regional'
    });

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            setSuccessMessage('');
            // Intentar adivinar título del nombre de archivo
            let name = file.name.replace(/\.[^/.]+$/, "");
            name = name.replace(/[-_]/g, ' ');
            setMetadata(prev => ({ ...prev, title: name }));
        }
    };

    const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    setCoverBuffer(reader.result as ArrayBuffer);
                    
                    // Crear preview
                    const blob = new Blob([reader.result as ArrayBuffer], { type: file.type });
                    setCoverPreview(URL.createObjectURL(blob));
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleProcess = async () => {
        if (!audioFile) return;
        setIsProcessing(true);
        setSuccessMessage('');

        try {
            const arrayBuffer = await audioFile.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const isWav = audioFile.name.toLowerCase().endsWith('.wav');
            
            let finalBuffer: ArrayBuffer | Uint8Array;
            let extension = isWav ? 'wav' : 'mp3';

            if (isWav) {
                // Procesar WAV usando wavefile
                const wav = new WaveFile(uint8Array);
                
                // Inyectar etiquetas RIFF INFO estándar
                wav.setTag('INAM', metadata.title); // Song Title
                wav.setTag('IART', metadata.artist); // Artist
                wav.setTag('IPRD', metadata.album || metadata.title); // Album
                wav.setTag('ICRD', metadata.year); // Creation Date
                wav.setTag('IGNR', metadata.genre); // Genre
                
                if (metadata.isrc) {
                    wav.setTag('ISRC', metadata.isrc); // ISRC
                }

                finalBuffer = wav.toBuffer();
            } else {
                // Procesar MP3 usando ID3Writer
                const writer = new ID3Writer(arrayBuffer);
                writer.setFrame('TIT2', metadata.title || 'Sin Título')
                      .setFrame('TPE1', [metadata.artist])
                      .setFrame('TALB', metadata.album || metadata.title)
                      .setFrame('TYER', metadata.year)
                      .setFrame('TCON', [metadata.genre]);
                
                if (metadata.isrc) {
                    writer.setFrame('TSRC', metadata.isrc);
                }

                if (coverBuffer) {
                    writer.setFrame('APIC', {
                        type: 3,
                        data: coverBuffer,
                        description: 'Cover'
                    });
                }

                writer.addTag();
                finalBuffer = writer.arrayBuffer;
            }

            // Generar descarga
            const blob = new Blob([finalBuffer], { type: isWav ? 'audio/wav' : 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${metadata.artist} - ${metadata.title} (Master).${extension}`;
            link.click();
            
            setSuccessMessage(`¡Metadatos inyectados en ${extension.toUpperCase()} y archivo descargado!`);
        } catch (error) {
            console.error('Error inyectando metadatos:', error);
            alert('Hubo un error procesando el audio. Asegúrate de que sea un archivo válido.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-8 font-['Poppins']">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <div className="flex justify-between items-start">
                        <div>
                            <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                                <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                            </button>
                            <h1 className="font-serif italic text-5xl md:text-7xl text-white mb-4">Metadatos <span className="text-[#c5a059]">ID3</span></h1>
                        </div>
                        <span className="text-[9px] font-black px-4 py-2 bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20 rounded-full">{VERSION}</span>
                    </div>
                </div>

                <div className="bg-[#0f111a] border border-white/5 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                        {/* Audio Upload */}
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] mb-4">1. Pista Original (.mp3 o .wav)</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed ${audioFile ? 'border-[#10b981] bg-[#10b981]/5' : 'border-white/20 hover:border-[#c5a059]'} rounded-2xl p-8 text-center cursor-pointer transition-all`}
                            >
                                <input type="file" accept="audio/mpeg, audio/mp3, audio/wav, audio/x-wav" className="hidden" ref={fileInputRef} onChange={handleAudioSelect} />
                                <i className={`fas ${audioFile ? 'fa-check-circle text-[#10b981]' : 'fa-music text-white/40'} text-4xl mb-4`}></i>
                                <p className="text-sm font-bold text-white/80">{audioFile ? audioFile.name : 'Click para subir canción'}</p>
                            </div>
                        </div>

                        {/* Metadatos Textuales */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-2">Título de la Canción</label>
                                <input type="text" value={metadata.title} onChange={e => setMetadata({...metadata, title: e.target.value})} className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#c5a059]" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-2">Artista Principal</label>
                                <select value={metadata.artist} onChange={e => setMetadata({...metadata, artist: e.target.value})} className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#c5a059]">
                                    <option>Diosmasgym</option>
                                    <option>Juan 614</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-2">Año</label>
                                    <input type="text" value={metadata.year} onChange={e => setMetadata({...metadata, year: e.target.value})} className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#c5a059]" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-2">ISRC (Opcional)</label>
                                    <input type="text" value={metadata.isrc} onChange={e => setMetadata({...metadata, isrc: e.target.value})} placeholder="MX-..." className="w-full bg-[#05070a] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#c5a059]" />
                                </div>
                            </div>
                        </div>

                        {/* Portada Upload */}
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-2">Portada Oficial (Cuadrada)</label>
                            <div 
                                onClick={() => coverInputRef.current?.click()}
                                className="border border-white/10 rounded-xl bg-[#05070a] h-[220px] flex items-center justify-center cursor-pointer relative overflow-hidden group hover:border-[#c5a059] transition-all"
                            >
                                <input type="file" accept="image/jpeg, image/png" className="hidden" ref={coverInputRef} onChange={handleCoverSelect} />
                                {coverPreview ? (
                                    <img src={coverPreview} className="absolute inset-0 w-full h-full object-cover" alt="Cover Preview" />
                                ) : (
                                    <div className="text-center text-white/40 group-hover:text-[#c5a059] transition-colors">
                                        <i className="fas fa-image text-4xl mb-2"></i>
                                        <p className="text-[10px] uppercase tracking-widest">Sube la Imagen (.jpg)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {successMessage && (
                        <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-3">
                            <i className="fas fa-check-circle text-lg"></i> {successMessage}
                        </div>
                    )}

                    <button 
                        onClick={handleProcess} disabled={isProcessing || !audioFile || !metadata.title}
                        className="w-full py-6 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white transition-all transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-xl"
                    >
                        {isProcessing ? 'INCRUSTANDO METADATOS...' : 'DESCARGAR MASTER FINAL'}
                    </button>
                    
                    <p className="text-center text-white/30 text-[9px] mt-6 leading-relaxed">
                        El archivo nunca sube a ningún servidor. Todo el proceso de inyección de metadatos se realiza localmente en tu navegador para garantizar máxima seguridad y velocidad.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MetadataTagger;
