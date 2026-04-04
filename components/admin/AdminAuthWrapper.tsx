import React, { useState, useEffect } from "react";

const AdminAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(false);

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("admin_session", "true");
        setIsAuthenticated(true);
      } else {
        setError(true);
        setPassword("");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#05070a] flex items-center justify-center p-6 font-['Poppins']">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-[#c5a264]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(197,162,100,0.2)] border border-[#c5a264]/30">
              <i className={`fas ${isVerifying ? 'fa-spinner fa-spin' : 'fa-lock'} text-[#c5a264] text-3xl`}></i>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-2 italic">
              Modo <span className="text-[#c5a264]">Operador</span>
            </h1>
            <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-8">Acceso Restringido</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduzca la clave maestra..."
                className={`w-full bg-black/40 border ${error ? 'border-red-500/50' : 'border-white/10'} p-4 rounded-xl text-center outline-none focus:border-[#c5a264]/50 transition-all text-sm font-bold tracking-widest`}
                autoFocus
                disabled={isVerifying}
              />
              {error && <p className="text-red-500 text-[10px] uppercase font-black animate-bounce">Clave Incorrecta</p>}
              <button 
                type="submit"
                disabled={isVerifying}
                className="w-full bg-[#c5a264] text-black font-black uppercase py-4 rounded-xl text-xs tracking-widest hover:bg-white transition-all shadow-lg shadow-[#c5a264]/10 disabled:opacity-50"
              >
                {isVerifying ? 'Verificando...' : 'Desbloquear Consola'}
              </button>
            </form>
          </div>
          <p className="mt-8 text-center text-[10px] text-white/20 uppercase font-black tracking-[0.3em]">
            Dios Mas Gym Records © 2024
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminAuthWrapper;
