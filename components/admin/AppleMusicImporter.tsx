import React, { useState } from 'react';

export default function AppleMusicImporter() {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [csvOutput, setCsvOutput] = useState('');
    const [selectedArtist, setSelectedArtist] = useState<string>('');

    const searchAppleMusic = async (artist: string) => {
        setLoading(true);
        setSelectedArtist(artist);
        setResults([]);
        setCsvOutput('');
        
        try {
            // Using iTunes Search API for Apple Music tracks
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=100`);
            const data = await response.json();
            
            // Filter precisely to match artist name loosely
            const tracks = (data.results || []).filter((track: any) => 
                track.artistName.toLowerCase().includes(artist.toLowerCase()) || 
                artist.toLowerCase().includes(track.artistName.toLowerCase())
            );
            
            // Sort by release date descending
            tracks.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            
            setResults(tracks);
            generateCsv(tracks, artist);
        } catch (error) {
            console.error("Error fetching from Apple Music:", error);
            alert("Hubo un error al conectar con Apple Music.");
        } finally {
            setLoading(false);
        }
    };

    const generateCsv = (tracks: any[], targetArtist: string) => {
        if (tracks.length === 0) return;
        
        // Headers (although the user pastes below existing headers, we generate just the rows or both)
        let csv = "";
        
        tracks.forEach(track => {
            const nombre = track.trackName.replace(/,/g, ''); // Remove commas to avoid CSV breaks
            const artista = targetArtist === 'Diosmasgym' ? 'Diosmasgym' : 'Juan 614';
            const url = track.trackViewUrl;
            // Get high res artwork
            const portada = (track.artworkUrl100 || '').replace('100x100bb', '600x600bb');
            // Determine type
            const isSingle = track.trackCount === 1 || track.collectionName?.toLowerCase().includes('- single');
            const tipo = isSingle ? 'Sencillo' : 'Álbum';
            const fecha = track.releaseDate ? track.releaseDate.substring(0, 10) : '';
            
            csv += `"${nombre}","${artista}","${url}","${portada}","${tipo}","${fecha}"\n`;
        });
        
        setCsvOutput(csv.trim());
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(csvOutput);
        alert("¡CSV copiado al portapapeles! Ya puedes pegarlo en tu Google Sheet.");
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-4 mb-8">
                <i className="fab fa-apple text-4xl text-[#c5a059]"></i>
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest">Importador Apple Music</h2>
                    <p className="text-[#c5a059] uppercase tracking-[0.2em] text-sm mt-1">Encuentra tus canciones sin YouTube</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-md">
                <p className="text-white/60 text-sm mb-6">
                    Selecciona tu perfil para buscar todo tu catálogo en Apple Music. La herramienta generará el código CSV listo para pegar en tu base de datos de Google Sheets.
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
                        <p className="tracking-widest uppercase font-bold text-sm">Buscando en Apple Music...</p>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-4 mt-8">
                            <h3 className="text-xl font-bold text-white">Resultados Encontrados ({results.length})</h3>
                            <button 
                                onClick={copyToClipboard}
                                className="bg-[#c5a059] text-black px-6 py-2 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)]"
                            >
                                <i className="fas fa-copy mr-2"></i> Copiar CSV
                            </button>
                        </div>

                        <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-6">
                            <textarea 
                                readOnly
                                value={csvOutput}
                                className="w-full h-48 bg-transparent text-[#00ffcc] font-mono text-xs outline-none resize-y"
                            />
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {results.map((track, i) => (
                                <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                    <img 
                                        src={track.artworkUrl100} 
                                        alt={track.trackName} 
                                        className="w-12 h-12 rounded-md shadow-lg"
                                    />
                                    <div className="flex-1 min-w-0">
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
