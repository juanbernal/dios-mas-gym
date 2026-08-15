import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Crash capturado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 60%, #0b1929 100%)' }}
        >
          {/* Background glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px', height: '600px',
              background: 'radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />

          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #991b1b 30%, #dc2626 50%, #991b1b 70%, transparent)' }} />

          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
            {/* Icon */}
            <div className="mb-8 w-20 h-20 flex items-center justify-center"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '4px' }}>
              <i className="fas fa-triangle-exclamation text-3xl" style={{ color: '#dc2626' }} />
            </div>

            {/* Label */}
            <div className="label-tag mb-4" style={{ color: '#dc2626' }}>
              ✝ Error del Sistema ✝
            </div>

            {/* Title */}
            <h1 className="h2-display text-white mb-4" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}>
              Algo falló
            </h1>

            <p className="mb-6" style={{ color: 'rgba(200,205,212,0.5)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>

            {/* Error detail */}
            {this.state.error && (
              <div className="w-full mb-8 p-4 text-left"
                style={{
                  background: 'rgba(220,38,38,0.06)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  color: 'rgba(200,205,212,0.4)',
                  wordBreak: 'break-word',
                }}>
                {this.state.error.message}
              </div>
            )}

            {/* Verse */}
            <blockquote className="mb-8 italic"
              style={{ color: 'rgba(200,205,212,0.35)', fontSize: '0.8rem', borderLeft: '2px solid rgba(37,99,168,0.4)', paddingLeft: '1rem', textAlign: 'left' }}>
              "Todo lo puedo en Cristo que me fortalece."
              <br />
              <span style={{ color: '#4a90d9' }}>— Filipenses 4:13</span>
            </blockquote>

            {/* Buttons */}
            <div className="flex gap-4 flex-wrap justify-center">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                <i className="fas fa-rotate-right mr-2" />
                Recargar
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="btn-secondary"
              >
                <i className="fas fa-house mr-2" />
                Inicio
              </button>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,168,0.3), transparent)' }} />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
