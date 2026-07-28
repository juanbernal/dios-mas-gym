import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface Post {
  id: string;
  title: string;
  content: string;
  labels: string[];
  scheduledDate: string;
  isDraft: boolean;
}

export default function PostScheduler() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [labelsText, setLabelsText] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isDraft, setIsDraft] = useState(true);
  
  const [showPreview, setShowPreview] = useState(false);
  
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  const [queue, setQueue] = useState<Post[]>([]);

  const adminPassword = localStorage.getItem('admin_password') || '';

  const loadQueue = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/common?action=list-drafts', {
        headers: {
          'x-admin-password': adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.drafts || []);
      } else {
        throw new Error('API not ready');
      }
    } catch (e) {
      // Fallback to local storage
      const local = localStorage.getItem('admin_scheduled_posts');
      if (local) {
        try {
          setQueue(JSON.parse(local));
        } catch (err) {}
      }
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    const labels = labelsText.split(',').map(l => l.trim()).filter(l => l);

    const postPayload = {
      id: Date.now().toString(),
      title,
      content,
      labels,
      scheduledDate,
      isDraft
    };

    try {
      const res = await fetch('/api/common?action=schedule-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify(postPayload)
      });

      if (!res.ok) {
        throw new Error('Backend not configured');
      }
      
      setStatus({ type: 'success', message: '¡Publicación programada exitosamente!' });
      
      setTitle('');
      setContent('');
      setLabelsText('');
      setScheduledDate('');
      setIsDraft(true);
      setShowPreview(false);
      
      loadQueue();
    } catch (error) {
      // Fallback
      setStatus({ type: 'success', message: 'Módulo en configuración — el post fue guardado localmente como borrador.' });
      
      const local = localStorage.getItem('admin_scheduled_posts');
      let localQueue: Post[] = [];
      if (local) {
        try {
          localQueue = JSON.parse(local);
        } catch (err) {}
      }
      localQueue.push(postPayload);
      localStorage.setItem('admin_scheduled_posts', JSON.stringify(localQueue));
      setQueue(localQueue);
      
      setTitle('');
      setContent('');
      setLabelsText('');
      setScheduledDate('');
      setIsDraft(true);
      setShowPreview(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLabels = labelsText.split(',').map(l => l.trim()).filter(l => l);

  const handlePublishNow = (post: Post) => {
    // Stub
    setStatus({ type: 'success', message: `Publicando "${post.title}"...` });
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-6 md:p-12 font-poppins selection:bg-[#c5a059]/30">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <button
              onClick={() => navigate('/admin')}
              className="text-[#c5a059] hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Volver al Panel
            </button>
            <h1 className="text-4xl md:text-6xl font-light tracking-tight">
              Post <span className="text-[#c5a059] font-serif italic">Scheduler</span>
            </h1>
            <p className="text-white/40 tracking-wide text-sm">
              Escribe y programa publicaciones para Blogger.
            </p>
          </div>
        </div>

        {status.type && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
            status.type === 'success' 
              ? 'bg-[#c5a059]/10 text-[#c5a059] border-[#c5a059]/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <i className={`fa-solid ${status.type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}`}></i>
            {status.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel — Editor */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Title */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                    Título de la Publicación
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Escribe un título llamativo..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 text-xl font-medium"
                  />
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                      Contenido (Markdown soportado)
                    </label>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                      {content.length} chars
                    </span>
                  </div>
                  
                  {showPreview ? (
                    <div className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 min-h-[200px] prose prose-invert prose-p:text-white/80 prose-headings:text-white"
                         dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.replace(/\n/g, '<br>')) }}
                    />
                  ) : (
                    <textarea
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Escribe tu contenido aquí..."
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50 min-h-[200px] font-mono text-sm resize-y"
                    />
                  )}
                </div>

                {/* Labels */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                    Etiquetas (separadas por comas)
                  </label>
                  <input
                    type="text"
                    value={labelsText}
                    onChange={(e) => setLabelsText(e.target.value)}
                    placeholder="gym, motivación, fe..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-[#c5a059]/50"
                  />
                  {currentLabels.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {currentLabels.map((lbl, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Draft */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                      Publicar el:
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white outline-none focus:border-[#c5a059]/50"
                    />
                  </div>

                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                        isDraft ? 'bg-[#c5a059] border-[#c5a059]' : 'border-white/20 bg-black/30 group-hover:border-white/40'
                      }`}>
                        {isDraft && <i className="fa-solid fa-check text-black text-xs"></i>}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isDraft}
                        onChange={(e) => setIsDraft(e.target.checked)}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white/90 transition-colors">
                        Guardar como borrador (no publicar aún)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white hover:bg-white/5 transition-all text-[9px] font-black uppercase tracking-widest"
                  >
                    {showPreview ? 'Volver a Edición' : 'Vista Previa'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-r from-[#c5a059] to-[#b38e4a] text-black hover:opacity-90 transition-opacity text-[9px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(197,160,89,0.3)]"
                  >
                    {isSubmitting ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-paper-plane"></i>
                    )}
                    {isSubmitting ? 'Programando...' : 'Programar Publicación'}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Right panel — Scheduled Queue */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-wide">
                Cola de Publicaciones
              </h2>
              <button 
                onClick={loadQueue}
                disabled={isFetching}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <i className={`fa-solid fa-rotate-right text-[#c5a059] ${isFetching ? 'fa-spin' : ''}`}></i>
              </button>
            </div>

            <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 shadow-2xl min-h-[400px] flex flex-col gap-4">
              
              {queue.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <i className="fa-regular fa-folder-open text-2xl text-white/20"></i>
                  </div>
                  <p className="text-white/40 text-sm">No hay borradores pendientes.</p>
                </div>
              ) : (
                queue.map((post, idx) => (
                  <div key={post.id || idx} className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-medium text-white/90 line-clamp-2 leading-tight">
                        {post.title}
                      </h3>
                      {post.isDraft && (
                        <span className="px-2 py-1 rounded bg-[#c5a059]/20 text-[#c5a059] text-[9px] font-black uppercase tracking-wider shrink-0">
                          Borrador
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <i className="fa-regular fa-calendar"></i>
                      <span>{new Date(post.scheduledDate).toLocaleString()}</span>
                    </div>

                    {post.labels && post.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.labels.slice(0, 3).map((lbl, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                            #{lbl}
                          </span>
                        ))}
                        {post.labels.length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                            +{post.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => handlePublishNow(post)}
                      className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-[9px] font-black uppercase tracking-widest mt-2"
                    >
                      Publicar Ahora
                    </button>
                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
