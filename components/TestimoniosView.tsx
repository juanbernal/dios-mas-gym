import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Testimony, fetchTestimonios, sendTestimonio } from '../services/testimonioService';

const TestimoniosView: React.FC = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', text: '', website: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonios().then(list => { setItems(list); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    const result = await sendTestimonio(form);
    setSending(false);
    if (!result.ok) {
      setError(result.error || 'No pudimos enviar tu testimonio.');
      return;
    }
    setSubmitted(true);
    setShowForm(false);
    setForm({ name: '', location: '', text: '', website: '' });
    setTimeout(() => setSubmitted(false), 8000);
  };

  return (
    <section
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(160deg, #020d1a 0%, #071325 50%, #0b1929 100%)' }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563a8 30%, #4a90d9 50%, #2563a8 70%, transparent)' }} />

      {/* BG Glow */}
      <div className="absolute pointer-events-none"
        style={{
          top: '-5%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37,99,168,0.1) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="section-container relative z-10 py-20">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="label-tag mb-10 flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: 'rgba(200,205,212,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <i className="fas fa-arrow-left" />
          Volver
        </button>

        {/* Header */}
        <div className="mb-16 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-[2px]" style={{ background: '#2563a8' }} />
            <span className="label-tag" style={{ color: '#4a90d9' }}>✝ Comunidad ✝</span>
          </div>
          <h1 className="h2-display text-white" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', marginBottom: '1rem' }}>
            Testimonios
          </h1>
          <p style={{ color: 'rgba(200,205,212,0.5)', lineHeight: 1.8, fontSize: '0.95rem' }}>
            Historias de personas cuya vida fue tocada por la música. Fe, músculo y propósito en movimiento.
          </p>
        </div>

        {/* Success message */}
        {submitted && (
          <div
            className="mb-8 p-5 animate-fade-in-up"
            style={{
              background: 'rgba(22,101,52,0.15)',
              border: '1px solid rgba(22,101,52,0.4)',
              borderLeft: '3px solid #16a34a',
              borderRadius: '2px',
            }}
          >
            <div className="flex items-center gap-3">
              <i className="fas fa-check-circle text-green-400" />
              <div>
                <p className="label-tag" style={{ color: '#4ade80' }}>¡Gracias por compartir!</p>
                <p style={{ color: 'rgba(200,205,212,0.5)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Tu testimonio fue enviado. Lo revisaremos y, si todo está bien, lo publicaremos aquí.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="mb-16 p-8 text-center" style={{ border: '1px dashed rgba(37,99,168,0.3)', borderRadius: '3px' }}>
            <i className="fas fa-quote-left text-2xl mb-3" style={{ color: 'rgba(37,99,168,0.5)' }} />
            <p style={{ color: 'rgba(200,205,212,0.55)', fontSize: '0.95rem' }}>
              Aún no hay testimonios publicados. Sé el primero en compartir cómo la música impactó tu vida.
            </p>
          </div>
        )}

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-16">
          {items.map((t, idx) => (
            <div
              key={t.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div
                className="card-street h-full flex flex-col p-6"
                style={{
                  borderRadius: '3px',
                  borderLeft: '3px solid #2563a8',
                  background: 'rgba(8,24,48,0.7)',
                }}
              >
                {/* Quote icon */}
                <div className="mb-4">
                  <i className="fas fa-quote-left text-2xl" style={{ color: 'rgba(37,99,168,0.4)' }} />
                </div>

                {/* Testimony text */}
                <p
                  className="flex-1 mb-6"
                  style={{ color: 'rgba(241,245,249,0.75)', lineHeight: 1.8, fontSize: '0.9rem' }}
                >
                  {t.text}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(37,99,168,0.15)',
                      border: '1px solid rgba(37,99,168,0.3)',
                      borderRadius: '2px',
                      fontFamily: 'var(--font-gothic)',
                      color: '#4a90d9',
                      fontSize: '1.1rem',
                    }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="label-tag" style={{ color: 'rgba(241,245,249,0.7)', fontSize: '0.55rem' }}>
                      {t.name}
                    </p>
                    <p className="label-tag" style={{ color: 'rgba(200,205,212,0.3)', fontSize: '0.45rem', marginTop: '2px' }}>
                      <i className="fas fa-map-marker-alt mr-1" />
                      {t.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA to submit testimony */}
        <div
          className="p-8 text-center"
          style={{
            background: 'rgba(8,24,48,0.6)',
            border: '1px solid rgba(37,99,168,0.2)',
            borderTop: '3px solid #2563a8',
            borderRadius: '3px',
            backdropFilter: 'blur(16px)',
          }}
        >
          {!showForm ? (
            <>
              <div className="label-tag mb-4" style={{ color: '#4a90d9' }}>
                <i className="fas fa-cross mr-2" />
                ¿Tu vida fue impactada?
              </div>
              <h2
                className="text-white font-bold mb-3"
                style={{ fontFamily: 'var(--font-gothic)', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}
              >
                Comparte tu testimonio
              </h2>
              <p className="mb-8" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                Tu historia puede inspirar a otros. Cuéntanos cómo la música y la fe han transformado tu vida.
              </p>
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <i className="fas fa-pen mr-2" />
                Escribir Testimonio
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto text-left">
              <div className="label-tag mb-6 text-center" style={{ color: '#4a90d9' }}>
                Comparte tu historia
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label-tag block mb-2" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.45rem' }}>
                    Tu nombre *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Tu nombre o solo tu nombre y inicial"
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      background: 'rgba(2,13,26,0.8)', border: '1px solid rgba(37,99,168,0.25)',
                      borderRadius: '2px', color: '#f1f5f9', fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label className="label-tag block mb-2" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.45rem' }}>
                    Ciudad / Estado
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="Tu ciudad o estado"
                    style={{
                      width: '100%', padding: '0.75rem 1rem',
                      background: 'rgba(2,13,26,0.8)', border: '1px solid rgba(37,99,168,0.25)',
                      borderRadius: '2px', color: '#f1f5f9', fontFamily: 'var(--font-body)',
                      fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="label-tag block mb-2" style={{ color: 'rgba(200,205,212,0.4)', fontSize: '0.45rem' }}>
                  Tu testimonio * (mínimo 50 caracteres, sin enlaces)
                </label>
                <textarea
                  required
                  minLength={50}
                  maxLength={800}
                  rows={5}
                  value={form.text}
                  onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                  placeholder="Cuéntanos cómo la música y la fe han impactado tu vida..."
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    background: 'rgba(2,13,26,0.8)', border: '1px solid rgba(37,99,168,0.25)',
                    borderRadius: '2px', color: '#f1f5f9', fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem', outline: 'none', resize: 'vertical', lineHeight: 1.7,
                  }}
                />
                <p className="label-tag mt-1" style={{ color: 'rgba(200,205,212,0.25)', fontSize: '0.4rem' }}>
                  {form.text.length} caracteres
                </p>
              </div>

              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />

              {error && (
                <p role="alert" className="mb-4" style={{ color: '#f87171', fontSize: '0.85rem' }}>{error}</p>
              )}

              <div className="flex gap-3">
                <button type="submit" disabled={sending} className="btn-primary flex-1"
                  style={{ clipPath: 'none', borderRadius: '2px' }}>
                  <i className="fas fa-paper-plane mr-2" />
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                  style={{ clipPath: 'none', borderRadius: '2px' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimoniosView;
