import React, { useState } from 'react';
import { fetchMusicCatalog } from '../../services/musicService';

// Normalizes a string: lowercase, remove accents, strip non-alphanumeric
const normalize = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9\s]/g, '')
     .replace(/\s+/g, ' ')
     .trim();

// Returns true if two song names are too similar (likely the same song)
const areSimilar = (a: string, b: string): boolean => {
    const na = normalize(a);
    const nb = normalize(b);
    if (na === nb) return true;
    // One fully contains the other
    if (na.length > 4 && nb.includes(na)) return true;
    if (nb.length > 4 && na.includes(nb)) return true;
    // Check word overlap: if 70%+ of words match, consider duplicate
    const wordsA = na.split(' ').filter(w => w.length > 2);
    const wordsB = new Set(nb.split(' ').filter(w => w.length > 2));
    if (wordsA.length === 0) return false;
    const overlap = wordsA.filter(w => wordsB.has(w)).length;
    return overlap / wordsA.length >= 0.7;
};

export default function AppleMusicImporter() {
    const [results, setResults] = useState<any[]>([]);
    const [skipped, setSkipped] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [csvOutput, setCsvOutput] = useState('');
    const [selectedArtist, setSelectedArtist] = useState<string>('');

    const searchAppleMusic = async (artist: string) => {
        setLoading(true);
        setSelectedArtist(artist);
        setResults([]);
        setCsvOutput('');
        setSkipped(0);
        
        try {
            // Fetch current catalog to prevent duplicates
            const currentCatalog = await fetchMusicCatalog(artist === 'Diosmasgym' ? 'diosmasgym' : 'juan614');
            const existingNames = currentCatalog.map(item => item.name);

            // Using iTunes Search API for Apple Music tracks
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=200`);
            const data = await response.json();
            
            let skippedCount = 0;

            // Filter: must match artist AND not be a duplicate in existing catalog
            const tracks = (data.results || []).filter((track: any) => {
                const isCorrectArtist =
                    track.artistName.toLowerCase().includes(artist.toLowerCase()) ||
                    artist.toLowerCase().includes(track.artistName.toLowerCase());
                
                if (!isCorrectArtist) return false;

                const isDuplicate = existingNames.some(name => areSimilar(name, track.trackName));
                if (isDuplicate) {
                    skippedCount++;
                    return false;
                }
                return true;
            });
            
            // Sort by release date descending (newest first)
            tracks.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            
            // Remove duplicates within results (same normalized track name)
            const seen = new Set<string>();
            const uniqueTracks = tracks.filter((t: any) => {
                const key = normalize(t.trackName);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            setSkipped(skippedCount);
            setResults(uniqueTracks);
            generateCsv(uniqueTracks, artist);
        } catch (error) {
            console.error("Error fetching from Apple Music:", error);
            alert("Hubo un error al conectar con Apple Music.");
        } finally {
            setLoading(false);
        }
    };

    const generateCsv = (tracks: any[], targetArtist: string) => {
        if (tracks.length === 0) return;
        
        let csv = "";
        
        tracks.forEach(track => {
            const nombre = track.trackName.replace(/"/g, "'").replace(/,/g, '');
            const artista = targetArtist === 'Diosmasgym' ? 'Diosmasgym' : 'Juan 614';
            const url = track.trackViewUrl;
            const portada = (track.artworkUrl100 || '').replace('100x100bb', '600x600bb');
            const isSingle = track.trackCount === 1 || track.collectionName?.toLowerCase().includes('- single');
            const tipo = isSingle ? 'Sencillo' : 'Álbum';
            const fecha = track.releaseDate ? track.releaseDate.substring(0, 10) : '';
            
            csv += `"${nombre}","${artista}","${url}","${portada}","${tipo}","${fecha}"\n`;
        });
        
        setCsvOutput(csv.trim());
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(csvOutput);
        alert("¡CSV copiado al portapapeles! Pégalo en tu Google Sheet.");
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-4 mb-8">
                <i className="fab fa-apple text-4xl text-[#c5a059]"></i>
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest">Importador Apple Music</h2>
                    <p className="text-[#c5a059] uppercase tracking-[0.2em] text-sm mt-1">Solo canciones que te faltan</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md">
                <p className="text-white/60 text-sm mb-6">
                    Selecciona tu perfil. La herramienta compara contra tu catálogo actual y{' '}
                    <strong className="text-white">solo muestra canciones que no tienes todavía</strong>.{' '}
                    Las que ya existen quedan excluidas automáticamente.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <button 
                        onClick={() => searchAppleMusic('Diosmasgym')}
                        disabled={loading}
                        className={`flex-1 py-4 px-6 rounded-xl border flex items-center justify-center gap-3 transition-all ${
                            selectedArtist === 'Diosmasgym' 
                            ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#c5a059]' 
                            : 'bg-black/40 border-white/10 text-white hover:bg-white/5'
                        }`}
                    >
                        <i className="fas fa-music text-xl"></i>
                        <span className="font-bold uppercase tracking-widest">Buscar en Diosmasgym</span>
                    </button>

                    <button 
                        onClick={() => searchAppleMusic('Juan 614')}
                        disabled={loading}
                        className={`flex-1 py-4 px-6 rounded-xl border flex items-center justify-center gap-3 transition-all ${
                            selectedArtist === 'Juan 614' 
                            ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#c5a059]' 
                            : 'bg-black/40 border-white/10 text-white hover:bg-white/5'
                        }`}
                    >
                        <i className="fas fa-guitar text-xl"></i>
                        <span className="font-bold uppercase tracking-widest">Buscar en Juan 614</span>
                    </button>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-[#c5a059]">
                        <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
                        <p className="tracking-widest uppercase font-bold text-sm">Comparando con tu catálogo actual...</p>
                    </div>
                )}

                {!loading && results.length === 0 && selectedArtist && (
                    <div className="flex flex-col items-center py-12 text-white/40">
                        <i className="fas fa-check-circle text-4xl mb-4 text-green-400"></i>
                        <p className="font-bold uppercase tracking-widest text-sm text-green-400">¡Tu catálogo está completo!</p>
                        <p className="text-xs mt-2">No se encontraron canciones nuevas en Apple Music para {selectedArtist}.</p>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="animate-fade-in">
                        {/* Stats bar */}
                        <div className="flex items-center gap-4 mb-4 mt-6 flex-wrap">
                            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                <i className="fas fa-plus mr-1"></i>{results.length} nuevas
                            </span>
                            {skipped > 0 && (
                                <span className="bg-white/5 text-white/40 border border-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                    <i className="fas fa-ban mr-1"></i>{skipped} ya existentes (filtradas)
                                </span>
                            )}
                            <div className="flex-1" />
                            <button 
                                onClick={copyToClipboard}
                                className="bg-[#c5a059] text-black px-6 py-2 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)]"
                            >
                                <i className="fas fa-copy mr-2"></i> Copiar CSV
                            </button>
                        </div>

                        <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-6">
                            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2 font-bold">Vista previa del CSV — pégalo en tu Google Sheet</p>
                            <textarea 
                                readOnly
                                value={csvOutput}
                                className="w-full h-48 bg-transparent text-[#00ffcc] font-mono text-xs outline-none resize-y"
                            />
                        </div>

                        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                            {results.map((track, i) => (
                                <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-green-500/20 relative overflow-hidden">
                                    {/* NEW badge */}
                                    <span className="absolute top-2 right-2 bg-green-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        NUEVA
                                    </span>
                                    <img 
                                        src={track.artworkUrl100} 
                                        alt={track.trackName} 
                                        className="w-12 h-12 rounded-md shadow-lg flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0 mr-12">
                                        <h4 className="text-white font-bold truncate">{track.trackName}</h4>
                                        <p className="text-[#c5a059] text-xs truncate uppercase tracking-wider">{track.collectionName}</p>
                                    </div>
                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-white/40 text-xs font-mono">{track.releaseDate ? track.releaseDate.substring(0, 10) : ''}</p>
                                        <a href={track.trackViewUrl} target="_blank" rel="noreferrer" className="text-xs text-[#00ffcc] hover:underline">
                                            Ver en Apple
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
