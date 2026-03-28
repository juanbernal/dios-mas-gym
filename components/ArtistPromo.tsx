import React from 'react';

interface ArtistPromoProps {
  artist: 'diosmasgym' | 'juan614';
}

const ArtistPromo: React.FC<ArtistPromoProps> = ({ artist }) => {
  const isDios = artist === 'diosmasgym';
  const name = isDios ? 'Diosmasgym' : 'Juan 614';
  const url = isDios ? 'https://musica.diosmasgym.com/' : 'https://juan614.diosmasgym.com/';
  const slogan = isDios ? 'La Frecuencia del Guerrero' : 'Misión Táctica y Fe';
  
  return (
    <div className="my-24 p-8 md:p-16 bg-[#0a0c14] border border-[#c5a059]/10 rounded-xl relative overflow-hidden group">
      {/* Background Effect */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none transition-transform duration-1000 group-hover:scale-110">
        <i className={`fas ${isDios ? 'fa-dumbbell' : 'fa-cross'} text-[180px] font-black -rotate-12`}></i>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
        <div className="text-center md:text-left flex-1">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-4 inline-block">Promoción Táctica</span>
          <h3 className="font-serif italic text-4xl md:text-6xl text-white mb-6">Escucha más de <br /> <span className="text-[#c5a059]">{name}</span></h3>
          <p className="text-[#94a3b8] font-bold uppercase tracking-[0.3em] text-[10px] leading-relaxed mb-10 max-w-sm mx-auto md:mx-0">
             {slogan}. Descubre el arsenal musical completo para el fortalecimiento del espíritu valiente.
          </p>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block px-12 py-5 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.4em] hover:bg-white transition-all transform hover:scale-105 shadow-[0_20px_40px_rgba(197,160,89,0.2)] rounded-full"
          >
            Ir al Portal Oficial
          </a>
        </div>
        
        {/* Placeholder-like decoration instead of actual image if not available */}
        <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-to-br from-[#c5a059]/20 to-transparent border border-[#c5a059]/10 rounded-full flex items-center justify-center relative">
           <div className="absolute inset-4 border border-white/5 rounded-full animate-spin-slow"></div>
           <i className={`fas ${isDios ? 'fa-headphones' : 'fa-music'} text-5xl text-[#c5a059]`}></i>
        </div>
      </div>
    </div>
  );
};

export default ArtistPromo;
