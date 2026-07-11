import React from 'react';

interface MaintenanceViewProps {
  videoUrl: string;
}

const MaintenanceView: React.FC<MaintenanceViewProps> = ({ videoUrl }) => {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#05070a] z-[9999] flex flex-col items-center justify-between p-6 select-none font-['Poppins']">
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-35 scale-105"
        />
        {/* Dark radial glow and gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/75 to-[#05070a]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#05070a_80%)]" />
      </div>

      {/* Top Section - Brand Identity */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex justify-center items-center pt-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <img 
            src="/logo-diosmasgym.png" 
            className="w-12 h-12 grayscale opacity-70 drop-shadow-[0_0_15px_rgba(37,99,168,0.3)] animate-pulse" 
            alt="Logo Dios Más Gym" 
          />
          <div>
            <p className="text-white text-xs font-black uppercase tracking-[0.2em]">Dios Más Gym</p>
            <p className="text-[#4a90d9] text-[8px] font-black uppercase tracking-widest">El Arsenal de Fe</p>
          </div>
        </div>
      </div>

      {/* Middle Section - Core Content (Cinematic Presentation) */}
      <div className="relative z-10 text-center max-w-3xl px-4 my-auto flex flex-col items-center justify-center animate-scale-up">
        {/* Decorative Glowing Shield/Dumbbell Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#4a90d9] to-[#1e4a7a] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,168,0.3)] rotate-3 mb-8 animate-bounce" style={{ animationDuration: '3s' }}>
          <i className="fas fa-dumbbell text-black text-3xl"></i>
        </div>

        {/* Tagline */}
        <h1 className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] text-[#4a90d9] mb-4 flex items-center gap-4">
          <span className="w-8 h-px bg-[#4a90d9]/30"></span> Mantenimiento del Templo <span className="w-8 h-px bg-[#4a90d9]/30"></span>
        </h1>

        {/* Headings */}
        <h2 className="font-serif italic text-4xl md:text-7xl text-white leading-tight mb-6">
          Esculpiendo una <br />
          <span className="text-[#4a90d9] drop-shadow-[0_0_30px_rgba(37,99,168,0.25)]">Mejor Versión</span>
        </h2>

        {/* Narrative Description */}
        <p className="text-white/60 text-xs md:text-sm leading-relaxed max-w-xl mb-10 font-light">
          Estamos afinando la maquinaria y puliendo el arsenal digital. En Dios Más Gym creemos que la disciplina mental y espiritual requiere renovación constante. Volvemos muy pronto con más poder, reflexiones y motivación.
        </p>

        {/* Glowing Loading Pulse indicator */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-6 py-3 rounded-full backdrop-blur-md mb-8">
          <div className="w-2 h-2 rounded-full bg-[#4a90d9] animate-ping"></div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50">Forjando el Templo en Silencio...</span>
        </div>

        {/* Social Networks & Music Channels */}
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[#4a90d9] mb-1">Únete a Nuestra Comunidad • Escucha la Música</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a 
              href="https://open.spotify.com/artist/2vP29zO3zP1Mv1T3w2y5B1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/60 hover:text-[#1DB954] hover:bg-[#1DB954]/10 hover:border-[#1DB954]/30 active:scale-95 transition-all duration-300 group shadow-lg"
              title="Spotify"
            >
              <i className="fab fa-spotify text-lg group-hover:scale-110 transition-transform"></i>
            </a>
            <a 
              href="https://www.youtube.com/@diosmasgym" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/60 hover:text-[#FF0000] hover:bg-[#FF0000]/10 hover:border-[#FF0000]/30 active:scale-95 transition-all duration-300 group shadow-lg"
              title="YouTube"
            >
              <i className="fab fa-youtube text-lg group-hover:scale-110 transition-transform"></i>
            </a>
            <a 
              href="https://www.instagram.com/diosmasgym" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/60 hover:text-[#E1306C] hover:bg-[#E1306C]/10 hover:border-[#E1306C]/30 active:scale-95 transition-all duration-300 group shadow-lg"
              title="Instagram"
            >
              <i className="fab fa-instagram text-lg group-hover:scale-110 transition-transform"></i>
            </a>
            <a 
              href="https://www.tiktok.com/@diosmasgym" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/60 hover:text-[#00f2fe] hover:bg-black/30 hover:border-[#fe2c55]/50 active:scale-95 transition-all duration-300 group shadow-lg"
              title="TikTok"
            >
              <i className="fab fa-tiktok text-lg group-hover:scale-110 transition-transform"></i>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Section - Footer & Scripture */}
      <div className="relative z-10 w-full max-w-4xl text-center pb-6 opacity-60 hover:opacity-100 transition-opacity animate-fade-in">
        <p className="font-serif italic text-xs md:text-sm text-white/70 mb-2">
          "Todo lo puedo en Cristo que me fortalece."
        </p>
        <p className="text-[8px] font-black uppercase tracking-widest text-[#4a90d9]">
          Filipenses 4:13 • © {new Date().getFullYear()} Dios Más Gym
        </p>
      </div>
    </div>
  );
};

export default MaintenanceView;
