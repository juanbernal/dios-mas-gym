import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="relative overflow-hidden pt-24 pb-12" style={{ background: 'linear-gradient(180deg, #020d1a 0%, #000a15 100%)' }}>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }}></div>

      {/* BG watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="text-[18vw] font-bold text-white/[0.015] leading-none" style={{ fontFamily: 'var(--font-gothic)', whiteSpace: 'nowrap' }}>
          DIOS MAS GYM
        </span>
      </div>

      {/* BG Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,168,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}>
      </div>

      <div className="section-container relative z-10">

        {/* Top: Logo + tagline */}
        <div className="flex flex-col items-center text-center mb-16">
          <img src="/logo-diosmasgym.png" alt="Diosmasgym" loading="lazy" className="w-20 h-20 object-cover mb-6" style={{ borderRadius: '4px', border: '1px solid rgba(37,99,168,0.3)' }} />
          <h2 className="text-white mb-4" style={{ fontFamily: 'var(--font-gothic)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 0.9 }}>
            Dios Más Gym
          </h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-10 h-px" style={{ background: 'rgba(37,99,168,0.4)' }}></div>
            <span className="label-tag" style={{ color: 'rgba(74,144,217,0.6)', fontSize: '0.6rem', letterSpacing: '0.4em' }}>
              ✝ Fe · Músculo · Corrido ✝
            </span>
            <div className="w-10 h-px" style={{ background: 'rgba(37,99,168,0.4)' }}></div>
          </div>
        </div>

        {/* Social Networks */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          {[
            { label: 'Instagram', icon: 'fa-instagram', href: 'https://www.instagram.com/diosmasgym', color: '#e1306c', bg: 'rgba(225,48,108,0.08)' },
            { label: 'TikTok', icon: 'fa-tiktok', href: 'https://www.tiktok.com/@diosmasgym', color: '#ffffff', bg: 'rgba(255,255,255,0.05)' },
            { label: 'YouTube', icon: 'fa-youtube', href: 'https://www.youtube.com/@diosmasgym', color: '#ff0000', bg: 'rgba(255,0,0,0.08)' },
            { label: 'Spotify', icon: 'fa-spotify', href: 'https://open.spotify.com/artist/diosmasgym', color: '#1db954', bg: 'rgba(29,185,84,0.08)' },
            { label: 'Facebook', icon: 'fa-facebook-f', href: 'https://www.facebook.com/diosmasgym', color: '#1877f2', bg: 'rgba(24,119,242,0.08)' },
          ].map(social => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 hover:-translate-y-1"
              style={{
                background: social.bg,
                borderColor: `${social.color}20`,
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${social.color}60`;
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 30px ${social.color}22`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = `${social.color}20`;
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
              }}
            >
              <i className={`fab ${social.icon} text-lg`} style={{ color: social.color }} />
              <span className="label-tag" style={{ color: 'rgba(200,205,212,0.55)', fontSize: '0.55rem' }}>
                {social.label}
              </span>
            </a>
          ))}
        </div>

        {/* Middle: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16 py-12"
          style={{ borderTop: '1px solid rgba(37,99,168,0.1)', borderBottom: '1px solid rgba(37,99,168,0.1)' }}>

          {/* Misión */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-px" style={{ background: '#2563a8' }}></div>
              <span className="label-tag" style={{ color: '#4a90d9', fontSize: '0.55rem' }}>Misión</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(200,205,212,0.35)' }}>
              Fortaleciendo el cuerpo y el espíritu a través de la fe y la disciplina diaria.
            </p>
          </div>

          {/* Música */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-px" style={{ background: '#2563a8' }}></div>
              <span className="label-tag" style={{ color: '#4a90d9', fontSize: '0.55rem' }}>Música</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Diosmasgym', href: 'https://musica.diosmasgym.com' },
                { label: 'Juan 614', href: 'https://juan614.diosmasgym.com' }
              ].map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer"
                  className="label-tag group flex items-center gap-2 transition-all"
                  style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.6rem', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#7eb8f7')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,205,212,0.35)')}>
                  <span className="w-1 h-1 rounded-full" style={{ background: '#2563a8', flexShrink: 0 }}></span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Link Bio */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-px" style={{ background: '#2563a8' }}></div>
              <span className="label-tag" style={{ color: '#4a90d9', fontSize: '0.55rem' }}>Link Bio</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Diosmasgym', href: '/bio/diosmasgym' },
                { label: 'Juan 614', href: '/bio/juan614' }
              ].map(link => (
                <a key={link.href} href={link.href}
                  className="label-tag flex items-center gap-2 transition-all"
                  style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.6rem', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#7eb8f7')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,205,212,0.35)')}>
                  <span className="w-1 h-1 rounded-full" style={{ background: '#2563a8', flexShrink: 0 }}></span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="label-tag" style={{ color: 'rgba(200,205,212,0.2)', fontSize: '0.5rem' }}>
            © {new Date().getFullYear()} Dios Más Gym — Todos los derechos reservados
          </p>
          <p className="label-tag" style={{ color: 'rgba(37,99,168,0.4)', fontSize: '0.5rem', letterSpacing: '0.3em' }}>
            Puro Señor Jesucristo compa
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
