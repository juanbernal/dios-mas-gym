import React, { useState } from 'react';

const ArmaduraPromo: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send the email to your backend/newsletter service
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="py-24 bg-[#030406] border-y border-[#c5a059]/10 relative overflow-hidden">
      {/* Background styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(197,160,89,0.05),transparent_70%)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[linear-gradient(45deg,#c5a059_1px,transparent_1px),linear-gradient(-45deg,#c5a059_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="section-container relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">
          
          {/* Text Content */}
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-[#c5a059]/20 bg-[#c5a059]/5 rounded-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] shadow-[0_0_10px_#c5a059] animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#c5a059]">Próximamente</span>
            </div>
            
            <h2 className="font-serif text-5xl md:text-7xl leading-none mb-6 text-white drop-shadow-lg">
              La <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] to-[#8B5A2B]">Armadura</span>
            </h2>
            
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-md font-medium">
              Equipamiento oficial diseñado para los verdaderos Guerreros de Luz. Ropa y accesorios para templar el cuerpo y el espíritu. Únete a la lista de espera para tener acceso anticipado.
            </p>

            {subscribed ? (
              <div className="bg-[#c5a059]/10 border border-[#c5a059]/30 p-6 rounded-sm w-full max-w-md">
                <p className="text-[#c5a059] text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <i className="fas fa-check-circle"></i> ¡Reclutamiento Exitoso!
                </p>
                <p className="text-white/60 text-xs font-medium">Serás el primero en enterarte cuando la armadura esté disponible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="TU CORREO ELECTRÓNICO..." 
                  required
                  className="flex-1 bg-black/40 border border-white/10 p-4 text-[10px] font-black tracking-[0.2em] outline-none focus:border-[#c5a059] transition-all rounded-sm uppercase text-white"
                />
                <button 
                  type="submit"
                  className="px-8 py-4 bg-[#c5a059] text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:scale-105 transition-all shadow-[0_10px_30px_rgba(197,160,89,0.2)] rounded-sm whitespace-nowrap"
                >
                  Avisarme
                </button>
              </form>
            )}
          </div>

          {/* Visual Showcase (Silhouette/Mockup) */}
          <div className="w-full md:w-1/2 relative flex justify-center items-center group perspective-1000">
            {/* Decorative glow */}
            <div className="absolute w-[300px] h-[300px] bg-[#c5a059]/10 rounded-full blur-[100px] group-hover:bg-[#c5a059]/20 transition-all duration-700"></div>
            
            {/* The Silhouette Mockup */}
            <div className="relative w-72 h-80 bg-gradient-to-br from-white/5 to-black border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden transform transition-all duration-700 group-hover:rotate-y-12 group-hover:scale-105">
              
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shine_5s_linear_infinite]"></div>

              <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                <i className="fas fa-tshirt text-7xl text-white/20 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-6"></i>
                <img src="/logo-diosmasgym.png" alt="Logo" className="w-12 h-12 object-contain opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 brightness-0 invert" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">Top Secret</span>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute top-10 -right-4 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-white/70 rounded-sm shadow-xl transform translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-100">
              Edición Limitada
            </div>
            <div className="absolute bottom-12 -left-4 bg-black/60 backdrop-blur-md border border-[#c5a059]/30 px-4 py-2 text-[8px] font-black uppercase tracking-[0.3em] text-[#c5a059] rounded-sm shadow-xl transform -translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-200">
              Calidad Premium
            </div>
          </div>
          
        </div>
      </div>
      
      <style>{`
        @keyframes shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .rotate-y-12 {
          transform: rotateY(12deg);
        }
      `}</style>
    </section>
  );
};

export default ArmaduraPromo;
