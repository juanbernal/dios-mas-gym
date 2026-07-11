import React, { useState } from 'react';

const ArmaduraPromo: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="relative overflow-hidden py-24" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}>

      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#2563a8,transparent)' }}></div>

      {/* BG glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.12) 0%, transparent 70%)' }}></div>

      <div className="section-container relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* LEFT: Text */}
          <div className="w-full lg:w-1/2">
            {/* Label */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-6 h-px" style={{ background: '#2563a8' }}></div>
              <span className="label-tag" style={{ color: '#4a90d9' }}>Próximamente</span>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2563a8', boxShadow: '0 0 12px #2563a8' }}></span>
            </div>

            <h2 className="h2-display mb-6 text-white">
              La <span className="text-blue-gradient">Armadura</span>
            </h2>

            <p className="mb-10 leading-relaxed" style={{ color: 'rgba(200,205,212,0.55)', maxWidth: '440px', fontSize: '0.9rem' }}>
              Puro Señor Jesucristo compa. Ropa y accesorios para templar el cuerpo y el espíritu. Únete a la lista de espera para tener acceso anticipado.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mb-10">
              {['Edición Limitada', 'Calidad Premium', 'Streetwear de Fe'].map(tag => (
                <span key={tag} className="label-tag px-4 py-2" style={{
                  border: '1px solid rgba(37,99,168,0.3)',
                  color: 'rgba(200,205,212,0.6)',
                  borderRadius: '2px',
                  background: 'rgba(37,99,168,0.06)'
                }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Signup form */}
            {subscribed ? (
              <div className="p-6" style={{ background: 'rgba(37,99,168,0.08)', border: '1px solid rgba(37,99,168,0.25)', borderRadius: '2px' }}>
                <p className="label-tag mb-2" style={{ color: '#4a90d9' }}>
                  <i className="fas fa-check-circle mr-2"></i>¡Reclutamiento Exitoso!
                </p>
                <p className="text-xs" style={{ color: 'rgba(200,205,212,0.5)' }}>Serás el primero en enterarte cuando la armadura esté disponible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="TU CORREO..."
                  required
                  className="flex-1 label-tag px-5 py-4 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(37,99,168,0.25)',
                    color: '#fff',
                    borderRadius: '2px',
                    fontSize: '0.6rem'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563a8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(37,99,168,0.25)'}
                />
                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  Avisarme
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Visual mockup */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative group" style={{ perspective: '1000px' }}>

              {/* Main mockup box */}
              <div
                className="relative w-72 h-80 flex items-center justify-center transition-transform duration-700 group-hover:rotate-y-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,58,95,0.6) 0%, rgba(8,24,48,0.9) 100%)',
                  border: '1px solid rgba(37,99,168,0.4)',
                  borderRadius: '4px',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(74,144,217,0.15)',
                }}
              >
                {/* Diagonal stripe */}
                <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '4px' }}>
                  <div className="absolute top-0 right-0 w-px h-full opacity-20" style={{ background: 'linear-gradient(to bottom, #4a90d9, transparent)' }}></div>
                  <div className="absolute top-0 left-0 w-full h-px opacity-20" style={{ background: 'linear-gradient(to right, #4a90d9, transparent)' }}></div>
                </div>

                {/* Content */}
                <div className="flex flex-col items-center gap-4 z-10">
                  <i className="fas fa-tshirt text-6xl" style={{ color: 'rgba(74,144,217,0.3)' }}></i>
                  <img src="/logo-diosmasgym.png" alt="Logo" className="w-16 h-16 object-contain absolute" style={{ opacity: 0.25, filter: 'brightness(0) invert(1)' }} />
                  <span className="label-tag mt-16" style={{ color: 'rgba(74,144,217,0.6)', letterSpacing: '0.4em' }}>TOP SECRET</span>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)', borderRadius: '4px' }}></div>
              </div>

              {/* Floating badges */}
              <div
                className="absolute -top-4 -right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 label-tag px-4 py-2"
                style={{ background: 'rgba(8,24,48,0.95)', border: '1px solid rgba(37,99,168,0.4)', color: 'rgba(200,205,212,0.7)', borderRadius: '2px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', transform: 'translateX(8px)', transitionDelay: '100ms' }}
              >
                Edición Limitada
              </div>
              <div
                className="absolute -bottom-4 -left-8 opacity-0 group-hover:opacity-100 transition-all duration-500 label-tag px-4 py-2"
                style={{ background: 'rgba(8,24,48,0.95)', border: '1px solid rgba(37,99,168,0.4)', color: '#4a90d9', borderRadius: '2px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', transitionDelay: '200ms' }}
              >
                Calidad Premium
              </div>

              {/* Glow */}
              <div className="absolute inset-0 -z-10 blur-[60px] opacity-30 group-hover:opacity-50 transition-opacity duration-700" style={{ background: 'radial-gradient(circle, rgba(37,99,168,0.5) 0%, transparent 70%)' }}></div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ArmaduraPromo;
