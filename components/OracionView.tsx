import React, { useEffect, useState } from 'react';
import { Oracion, fetchOraciones, sendOracion, prayFor, getPrayed, timeAgo } from '../services/oracionService';

// Tarjeta de una peticion con su boton "Estoy orando por ti"
export const OracionCard: React.FC<{ o: Oracion; compact?: boolean }> = ({ o, compact }) => {
  const [count, setCount] = useState(o.count || 0);
  const [prayed, setPrayed] = useState(() => getPrayed().has(o.id));
  const [pop, setPop] = useState(false);

  const onPray = async () => {
    if (prayed) return;
    setPrayed(true);
    setCount(c => c + 1);
    setPop(true);
    setTimeout(() => setPop(false), 700);
    const n = await prayFor(o.id);
    if (typeof n === 'number') setCount(Math.max(n, count + 1));
  };

  return (
    <figure className="relative flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-5 md:p-6 break-inside-avoid mb-4">
      <i className="fas fa-hands-praying absolute top-5 right-5 text-2xl text-[#4a90d9]/15" aria-hidden="true"></i>
      <blockquote className={`text-white/85 leading-relaxed pr-6 ${compact ? 'text-sm line-clamp-4' : 'text-[15px]'}`}>{o.text}</blockquote>
      <figcaption className="mt-4 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-bold text-white truncate">{o.name}</span>
          <span className="block text-[10px] text-white/35">{timeAgo(o.createdAt)}</span>
        </span>
        <button
          onClick={onPray}
          disabled={prayed}
          aria-pressed={prayed}
          className={`relative flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${prayed ? 'bg-[#4a90d9]/20 text-[#9cc8f5] border border-[#4a90d9]/40' : 'bg-white text-black hover:bg-[#4a90d9]'}`}
        >
          <span className={pop ? 'animate-bounce' : ''}>🙏</span>
          {prayed ? 'Orando' : 'Oraré por ti'}
          <span className="tabular-nums">{count > 0 ? `· ${count}` : ''}</span>
        </button>
      </figcaption>
    </figure>
  );
};

// Formulario para dejar una peticion
export const OracionForm: React.FC<{ onSent?: () => void }> = ({ onSent }) => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('sending');
    const r = await sendOracion({ name: anon ? 'Anónimo' : name, text, website });
    if (r.ok) { setState('sent'); setText(''); onSent?.(); }
    else { setState('idle'); setError(r.error || 'Error'); }
  };

  if (state === 'sent') {
    return (
      <div className="rounded-3xl p-6 border border-emerald-400/40 bg-emerald-500/10 text-center">
        <p className="text-3xl mb-2">🙏</p>
        <p className="font-serif italic text-2xl text-white">Recibimos tu petición</p>
        <p className="text-sm text-white/60 mt-2">La revisamos y en cuanto se publique, la comunidad orará por ti. No estás solo.</p>
        <button onClick={() => setState('idle')} className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#7eb8f7]">Enviar otra</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl p-5 md:p-6 border border-[#4a90d9]/30 bg-gradient-to-br from-[#4a90d9]/[0.12] to-transparent">
      <p className="font-serif italic text-2xl text-white mb-1">Deja tu petición</p>
      <p className="text-xs text-white/50 mb-4">Cuéntanos por qué quieres que oremos. Se publica después de revisarla.</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        required
        minLength={15}
        maxLength={500}
        rows={4}
        placeholder="Oren por mi familia, por mi salud, por mi trabajo…"
        aria-label="Tu petición de oración"
        className="w-full rounded-2xl bg-black/30 border border-white/10 focus:border-[#4a90d9] outline-none p-4 text-sm text-white placeholder:text-white/30 resize-none"
      />
      <div className="text-right text-[10px] text-white/30 mt-1">{text.length}/500</div>
      {!anon && (
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
          placeholder="Tu nombre (o solo tu inicial)"
          aria-label="Tu nombre"
          className="w-full mt-2 rounded-xl bg-black/30 border border-white/10 focus:border-[#4a90d9] outline-none px-4 py-3 text-sm text-white placeholder:text-white/30"
        />
      )}
      {/* Campo trampa para bots */}
      <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" />
      <label className="flex items-center gap-2 mt-3 text-xs text-white/60 cursor-pointer select-none">
        <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} className="accent-[#4a90d9] w-4 h-4" />
        Publicar como anónimo
      </label>
      {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-4 w-full py-3.5 rounded-xl bg-[#4a90d9] text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-60"
      >
        {state === 'sending' ? <><i className="fas fa-spinner fa-spin mr-2"></i>Enviando…</> : <><i className="fas fa-paper-plane mr-2"></i>Enviar petición</>}
      </button>
    </form>
  );
};

const OracionView: React.FC = () => {
  const [items, setItems] = useState<Oracion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Muro de oración | Diosmasgym';
    fetchOraciones().then(list => { setItems(list); setLoading(false); });
  }, []);

  const totalOrando = items.reduce((a, o) => a + (o.count || 0), 0);

  return (
    <div className="min-h-screen bg-[#05070a]">
      <header className="relative overflow-hidden pt-10 pb-8 md:pt-16 md:pb-12" style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 55%, #0b1929 100%)' }}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-40 w-[700px] h-[700px] rounded-full bg-[#4a90d9]/10 blur-3xl pointer-events-none"></div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7eb8f7] mb-3"><i className="fas fa-hands-praying mr-2"></i>Comunidad</p>
          <h1 className="font-serif italic text-5xl md:text-8xl text-white leading-none">
            Muro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4a90d9] via-[#9cc8f5] to-white">Oración</span>
          </h1>
          <p className="text-sm md:text-base text-white/55 mt-4 max-w-xl mx-auto">
            "Orad unos por otros." — Santiago 5:16. Deja tu petición y levanta en oración a tu hermano.
          </p>
          {totalOrando > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
              🙏 <span className="font-black text-white tabular-nums">{totalOrando.toLocaleString('es-MX')}</span> oraciones hechas por la comunidad
            </p>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 grid lg:grid-cols-[360px_1fr] gap-6 md:gap-8 items-start">
        <div className="lg:sticky lg:top-32">
          <OracionForm />
        </div>
        <section>
          {loading ? (
            <div className="columns-1 md:columns-2 gap-4">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-40 mb-4 rounded-3xl bg-white/[0.04] animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-white/10 p-10 text-center">
              <p className="text-4xl mb-3">🙏</p>
              <p className="font-serif italic text-2xl text-white">Sé el primero</p>
              <p className="text-sm text-white/50 mt-2">Aún no hay peticiones publicadas. Deja la tuya y la comunidad orará por ti.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-4">
              {items.map(o => <OracionCard key={o.id} o={o} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default OracionView;
