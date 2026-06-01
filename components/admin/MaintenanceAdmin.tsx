import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMaintenanceStatus, updateMaintenanceStatus, MaintenanceStatus } from '../../services/maintenanceService';

const MaintenanceAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MaintenanceStatus>({
    enabled: false,
    videoUrl: '/outros/Robot_performing_dumbbell_curls_202605312331.mp4'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load current global status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const currentStatus = await fetchMaintenanceStatus();
        setStatus(currentStatus);
      } catch (e) {
        console.error('Failed to load maintenance status', e);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, []);

  const handleToggleChange = () => {
    setStatus(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(prev => ({ ...prev, videoUrl: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const savedPassword = localStorage.getItem("admin_password") || "";
    if (!savedPassword) {
      setMessage({ type: 'error', text: 'Error de autenticación: Por favor, vuelve a iniciar sesión en el panel.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await updateMaintenanceStatus(status.enabled, status.videoUrl, savedPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Modo de mantenimiento actualizado con éxito.' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Error al actualizar el modo de mantenimiento.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error de comunicación con el servidor.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center text-[#c5a059] font-serif italic text-4xl animate-pulse">
        Cargando Panel de Mantenimiento...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins']">
      <div className="max-w-4xl mx-auto">
        {/* Header navigation */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="text-left">
            <h1 
              onClick={() => navigate('/admin')}
              className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3 cursor-pointer hover:text-[#c5a059] transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i> Volver al Mando Ejecutivo
            </h1>
            <h2 className="font-serif italic text-3xl md:text-5xl text-white leading-tight">
              Control de <span className="text-[#c5a059]">Mantenimiento</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status.enabled ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]'}`}></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
              {status.enabled ? 'PÁGINA EN MANTENIMIENTO' : 'PÁGINA PÚBLICA ACTIVA'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Controls Card */}
          <div className="lg:col-span-7 bg-[#0f111a] border border-[#c5a059]/20 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <form onSubmit={handleSave} className="relative z-10 flex flex-col gap-8">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div>
                  <h3 className="text-white text-md font-bold mb-1">Estado de la Plataforma</h3>
                  <p className="text-white/40 text-[10px] max-w-[250px]">
                    Activa para desviar visitas públicas a la pantalla de mantenimiento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleChange}
                  className={`w-16 h-8 rounded-full p-1 transition-all duration-300 relative ${
                    status.enabled ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white transition-all transform shadow-md flex items-center justify-center ${
                    status.enabled ? 'translate-x-8' : 'translate-x-0'
                  }`}>
                    <i className={`fas ${status.enabled ? 'fa-lock text-red-600' : 'fa-unlock text-white/40'} text-[10px]`}></i>
                  </div>
                </button>
              </div>

              {/* Video URL Input */}
              <div className="flex flex-col gap-2">
                <label className="text-white/50 text-[9px] font-black uppercase tracking-wider">Ruta del Video de Animación</label>
                <div className="relative">
                  <i className="fas fa-video absolute left-5 top-1/2 -translate-y-1/2 text-white/20 text-xs"></i>
                  <input
                    type="text"
                    value={status.videoUrl}
                    onChange={handleVideoUrlChange}
                    className="w-full bg-[#05070a] border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-xs text-white outline-none focus:border-[#c5a059]/40 transition-colors"
                    placeholder="/outros/video.mp4"
                    required
                  />
                </div>
                <p className="text-white/30 text-[8px] italic">
                  Por defecto: /outros/Robot_performing_dumbbell_curls_202605312331.mp4
                </p>
              </div>
              {/* Notification Message */}
              {message && (
                <div className={`p-5 rounded-2xl border text-xs ${
                  message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <div className="flex gap-3 items-center">
                    <i className={`fas ${message.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                    <p className="font-medium">{message.text}</p>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={saving}
                className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                  status.enabled 
                    ? 'bg-red-600 text-white hover:bg-red-500' 
                    : 'bg-[#c5a059] text-black hover:bg-white'
                } disabled:opacity-40`}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Guardando Cambios...
                  </>
                ) : (
                  <>
                    <i className="fas fa-shield-halved"></i> Aplicar Configuración
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#0f111a] border border-white/5 rounded-[2.5rem] p-8 flex-1 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div>
                <h3 className="text-white text-md font-bold mb-1 flex items-center gap-3">
                  <i className="fas fa-clapperboard text-[#c5a059]"></i> Vista Previa en Vivo
                </h3>
                <p className="text-white/40 text-[10px] mb-6">
                  Esta es la animación interactiva de fondo configurada para la pantalla de mantenimiento.
                </p>
              </div>

              {/* Video preview display box */}
              <div className="w-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-[#05070a] relative group shadow-inner">
                {status.videoUrl ? (
                  <video
                    src={status.videoUrl}
                    key={status.videoUrl} // Force reload video if URL changes
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 p-6 text-center">
                    <i className="fas fa-video-slash text-3xl mb-4"></i>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Sin URL de video activa</p>
                  </div>
                )}
                
                {/* Floating overlay simulator tags */}
                <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-ping"></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Simulador PWA</span>
                </div>
                
                <div className="absolute inset-x-4 bottom-4 z-10 p-4 rounded-2xl bg-black/75 border border-white/5 backdrop-blur-md text-center">
                  <p className="font-serif italic text-xs text-white">Dios Más Gym</p>
                  <p className="text-[7px] font-black uppercase tracking-wider text-[#c5a059] mt-0.5">Volvemos pronto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceAdmin;
