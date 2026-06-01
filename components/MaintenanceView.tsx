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
            className="w-12 h-12 grayscale opacity-70 drop-shadow-[0_0_15px_rgba(197,160,89,0.3)] animate-pulse" 
            alt="Logo Dios Más Gym" 
          />
          <div>
            <p className="text-white text-xs font-black uppercase tracking-[0.2em]">Dios Más Gym</p>
            <p className="text-[#c5a059] text-[8px] font-black uppercase tracking-widest">El Arsenal de Fe</p>
          </div>
        </div>
      </div>

      {/* Middle Section - Core Content (Cinematic Presentation) */}
      <div className="relative z-10 text-center max-w-3xl px-4 my-auto flex flex-col items-center justify-center animate-scale-up">
        {/* Decorative Glowing Shield/Dumbbell Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#c5a059] to-[#8B5A2B] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(197,160,89,0.3)] rotate-3 mb-8 animate-bounce" style={{ animationDuration: '3s' }}>
          <i className="fas fa-dumbbell text-black text-3xl"></i>
        </div>

        {/* Tagline */}
        <h1 className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-4 flex items-center gap-4">
          <span className="w-8 h-px bg-[#c5a059]/30"></span> Mantenimiento del Templo <span className="w-8 h-px bg-[#c5a059]/30"></span>
        </h1>

        {/* Headings */}
        <h2 className="font-serif italic text-4xl md:text-7xl text-white leading-tight mb-6">
          Esculpiendo una <br />
          <span className="text-[#c5a059] drop-shadow-[0_0_30px_rgba(197,160,89,0.25)]">Mejor Versión</span>
        </h2>

        {/* Narrative Description */}
        <p className="text-white/60 text-xs md:text-sm leading-relaxed max-w-xl mb-10 font-light">
          Estamos afinando la maquinaria y puliendo el arsenal digital. En Dios Más Gym creemos que la disciplina mental y espiritual requiere renovación constante. Volvemos muy pronto con más poder, reflexiones y motivación.
        </p>

        {/* Glowing Loading Pulse indicator */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-6 py-3 rounded-full backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-[#c5a059] animate-ping"></div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50">Forjando el Templo en Silencio...</span>
        </div>
      </div>

      {/* Bottom Section - Footer & Scripture */}
      <div className="relative z-10 w-full max-w-4xl text-center pb-6 opacity-40 hover:opacity-80 transition-opacity animate-fade-in">
        <p className="font-serif italic text-sm md:text-md text-white/80 mb-2">
          "Todo lo puedo en Cristo que me fortalece."
        </p>
        <p className="text-[8px] font-black uppercase tracking-widest text-[#c5a059]">
          Filipenses 4:13 • © {new Date().getFullYear()} Dios Más Gym
        </p>
      </div>
    </div>
  );
};

export default MaintenanceView;
