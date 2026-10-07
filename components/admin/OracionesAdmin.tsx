import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncFetch } from '../../services/adminSync';
import { Oracion, timeAgo } from '../../services/oracionService';

// Moderacion del muro de oracion: las peticiones llegan pendientes y se publican al aprobarlas
const OracionesAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Oracion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await syncFetch(`/api/oraciones?all=1&t=${Date.now()}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Respuesta inesperada');
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, op: 'aprobar' | 'borrar') => {
    if (op === 'borrar' && !confirm('¿Borrar esta petición?')) return;
    setBusy(id);
    try {
      const res = await syncFetch('/api/oraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Error ${res.status}`);
      setItems(prev => op === 'borrar' ? prev.filter(o => o.id !== id) : prev.map(o => o.id === id ? { ...o, status: 'aprobada' } : o));
    } catch (e: any) {
      alert(e?.message || 'No se pudo');
    } finally {
      setBusy(null);
    }
  };

  const pendientes = items.filter(o => o.status === 'pendiente');
  const aprobadas = items.filter(o => o.status !== 'pendiente');

  const Row = ({ o }: { o: Oracion }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm text-white/85 whitespace-pre-wrap">{o.text}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-white/50"><b className="text-white">{o.name}</b> · {timeAgo(o.createdAt)}{o.status !== 'pendiente' && <> · 🙏 {o.count || 0}</>}</span>
        <div className="flex gap-2">
          {o.status === 'pendiente' && (
            <button disabled={busy === o.id} onClick={() => act(o.id, 'aprobar')} className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-xs font-black disabled:opacity-50">
              <i className="fas fa-check mr-1.5"></i>Publicar
            </button>
          )}
          <button disabled={busy === o.id} onClick={() => act(o.id, 'borrar')} className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/40 text-xs font-black disabled:opacity-50">
            <i className="fas fa-trash mr-1.5"></i>Borrar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-5 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/admin')} className="text-xs text-white/50 hover:text-white mb-6"><i className="fas fa-arrow-left mr-2"></i>Panel</button>
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-black"><i className="fas fa-hands-praying text-[#4a90d9] mr-3"></i>Muro de oración</h1>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-white/10 text-xs font-bold"><i className={`fas fa-rotate mr-2 ${loading ? 'fa-spin' : ''}`}></i>Actualizar</button>
        </div>
        {error && <p className="mb-6 text-sm text-red-400">{error}</p>}

        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-amber-400 mb-3">Pendientes ({pendientes.length})</h2>
        <div className="flex flex-col gap-3 mb-10">
          {pendientes.length === 0 ? <p className="text-sm text-white/40">No hay peticiones por revisar.</p> : pendientes.map(o => <Row key={o.id} o={o} />)}
        </div>

        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 mb-3">Publicadas ({aprobadas.length})</h2>
        <div className="flex flex-col gap-3">
          {aprobadas.length === 0 ? <p className="text-sm text-white/40">Todavía no hay peticiones publicadas.</p> : aprobadas.map(o => <Row key={o.id} o={o} />)}
        </div>
      </div>
    </div>
  );
};

export default OracionesAdmin;
