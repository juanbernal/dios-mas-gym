import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface SEOCheck {
  label: string;
  status: 'ok' | 'warn' | 'error' | 'loading';
  detail: string;
  icon: string;
}

interface WebVital {
  name: string;
  value: string;
  rating: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  description: string;
}

const DOMAIN = 'https://app.diosmasgym.com';

const SEODashboard: React.FC = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<SEOCheck[]>([]);
  const [webVitals, setWebVitals] = useState<WebVital[]>([]);
  const [robotsTxt, setRobotsTxt] = useState('');
  const [sitemapPreview, setSitemapPreview] = useState('');
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'robots' | 'sitemap'>('overview');
  const [metaStatus, setMetaStatus] = useState<{ noindex: boolean; canonical: string; title: string; description: string } | null>(null);

  // Analyze current page META tags
  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    const title = document.querySelector('title');
    const description = document.querySelector('meta[name="description"]') as HTMLMetaElement;

    setMetaStatus({
      noindex: robots ? robots.getAttribute('content')?.includes('noindex') ?? false : false,
      canonical: canonical?.href || '(no encontrado)',
      title: title?.textContent || '(sin título)',
      description: description?.content || '(sin descripción)',
    });
  }, []);

  // Measure Web Vitals using PerformanceObserver
  useEffect(() => {
    const vitals: WebVital[] = [];

    // LCP
    try {
      const lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        const val = Math.round(last.startTime);
        const rating = val < 2500 ? 'good' : val < 4000 ? 'needs-improvement' : 'poor';
        setWebVitals(prev => [...prev.filter(v => v.name !== 'LCP'), {
          name: 'LCP',
          value: `${(val / 1000).toFixed(2)}s`,
          rating,
          description: 'Largest Contentful Paint — cuánto tarda el elemento más grande en aparecer',
        }]);
      });
      lcp.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // FID / INP
    try {
      const fid = new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        if (entries.length > 0) {
          const val = Math.round(entries[0].processingStart - entries[0].startTime);
          const rating = val < 100 ? 'good' : val < 300 ? 'needs-improvement' : 'poor';
          setWebVitals(prev => [...prev.filter(v => v.name !== 'FID'), {
            name: 'FID',
            value: `${val}ms`,
            rating,
            description: 'First Input Delay — tiempo de respuesta al primer clic',
          }]);
        }
      });
      fid.observe({ type: 'first-input', buffered: true });
    } catch (e) {}

    // CLS
    try {
      let clsValue = 0;
      const cls = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) clsValue += entry.value;
        });
        const rating = clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor';
        setWebVitals(prev => [...prev.filter(v => v.name !== 'CLS'), {
          name: 'CLS',
          value: clsValue.toFixed(3),
          rating,
          description: 'Cumulative Layout Shift — estabilidad visual del contenido',
        }]);
      });
      cls.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    // TTFB
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) {
        const ttfb = Math.round(nav.responseStart - nav.requestStart);
        const rating = ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor';
        setWebVitals(prev => [...prev.filter(v => v.name !== 'TTFB'), {
          name: 'TTFB',
          value: `${ttfb}ms`,
          rating,
          description: 'Time to First Byte — velocidad de respuesta del servidor',
        }]);
      }
    } catch (e) {}

    // FCP
    try {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0] as any;
      if (fcp) {
        const val = Math.round(fcp.startTime);
        const rating = val < 1800 ? 'good' : val < 3000 ? 'needs-improvement' : 'poor';
        setWebVitals(prev => [...prev.filter(v => v.name !== 'FCP'), {
          name: 'FCP',
          value: `${(val / 1000).toFixed(2)}s`,
          rating,
          description: 'First Contentful Paint — primer contenido visible en pantalla',
        }]);
      }
    } catch (e) {}
  }, []);

  const runChecks = useCallback(async () => {
    setIsLoadingChecks(true);

    const results: SEOCheck[] = [];

    // 1. Meta noindex check
    const robotsMeta = document.querySelector('meta[name="robots"]');
    const robotsContent = robotsMeta?.getAttribute('content') || '';
    results.push({
      label: 'Meta Robots (noindex)',
      icon: 'fa-robot',
      status: robotsContent.includes('noindex') ? 'error' : 'ok',
      detail: robotsContent.includes('noindex')
        ? '❌ Activo: noindex,nofollow — Google NO puede indexar la página'
        : '✅ Correcto: La página puede ser indexada por Google',
    });

    // 2. Canonical
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    results.push({
      label: 'Canonical Tag',
      icon: 'fa-link',
      status: canonical?.href ? 'ok' : 'warn',
      detail: canonical?.href
        ? `✅ Canonical: ${canonical.href}`
        : '⚠️ No se encontró canonical tag en esta página',
    });

    // 3. Title tag
    const titleEl = document.querySelector('title');
    const titleLen = titleEl?.textContent?.length || 0;
    results.push({
      label: 'Título SEO',
      icon: 'fa-heading',
      status: titleLen >= 30 && titleLen <= 65 ? 'ok' : titleLen > 0 ? 'warn' : 'error',
      detail: titleLen > 0
        ? `"${titleEl?.textContent}" (${titleLen} caracteres — ideal: 30-65)`
        : '❌ Sin título',
    });

    // 4. Meta description
    const descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    const descLen = descEl?.content?.length || 0;
    results.push({
      label: 'Meta Description',
      icon: 'fa-align-left',
      status: descLen >= 120 && descLen <= 160 ? 'ok' : descLen > 0 ? 'warn' : 'error',
      detail: descLen > 0
        ? `"${descEl.content.slice(0, 80)}..." (${descLen} caracteres — ideal: 120-160)`
        : '❌ Sin meta description',
    });

    // 5. OG Image
    const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
    results.push({
      label: 'Open Graph Image',
      icon: 'fa-image',
      status: ogImage?.content ? 'ok' : 'warn',
      detail: ogImage?.content
        ? `✅ OG Image configurada`
        : '⚠️ Sin og:image — el enlace compartido no tendrá imagen',
    });

    // 6. robots.txt fetch
    try {
      const r = await fetch('/robots.txt');
      const txt = await r.text();
      setRobotsTxt(txt);
      const hasNoindex = txt.includes('noindex');
      const hasDisallowAll = txt.includes('Disallow: /\n') || txt.includes('Disallow: /*\n');
      results.push({
        label: 'robots.txt',
        icon: 'fa-shield-halved',
        status: hasDisallowAll ? 'error' : 'ok',
        detail: hasDisallowAll
          ? '❌ Bloquea todo el sitio a crawlers'
          : `✅ robots.txt accesible y configurado (${txt.split('\n').length} líneas)`,
      });
    } catch {
      results.push({
        label: 'robots.txt',
        icon: 'fa-shield-halved',
        status: 'error',
        detail: '❌ No se pudo acceder a /robots.txt',
      });
    }

    // 7. sitemap.xml
    try {
      const r = await fetch('/sitemap.xml');
      const xml = await r.text();
      setSitemapPreview(xml.slice(0, 2000));
      const urlCount = (xml.match(/<loc>/g) || []).length;
      results.push({
        label: 'sitemap.xml',
        icon: 'fa-map',
        status: urlCount > 0 ? 'ok' : 'warn',
        detail: urlCount > 0
          ? `✅ Sitemap con ${urlCount} URLs registradas`
          : '⚠️ Sitemap vacío o sin URLs <loc>',
      });
    } catch {
      results.push({
        label: 'sitemap.xml',
        icon: 'fa-map',
        status: 'error',
        detail: '❌ No se pudo acceder a /sitemap.xml',
      });
    }

    // 8. HTTPS
    results.push({
      label: 'HTTPS / SSL',
      icon: 'fa-lock',
      status: location.protocol === 'https:' ? 'ok' : 'error',
      detail: location.protocol === 'https:'
        ? `✅ Conexión segura en ${location.hostname}`
        : '❌ Sin HTTPS — Google penaliza sitios sin SSL',
    });

    // 9. h1 count
    const h1s = document.querySelectorAll('h1');
    results.push({
      label: 'Estructura H1',
      icon: 'fa-text-height',
      status: h1s.length === 1 ? 'ok' : h1s.length === 0 ? 'error' : 'warn',
      detail: h1s.length === 1
        ? `✅ Un solo H1 en la página (correcto)`
        : h1s.length === 0
        ? '❌ No hay H1 en la página'
        : `⚠️ ${h1s.length} H1 encontrados — debe haber solo uno`,
    });

    setChecks(results);
    setIsLoadingChecks(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const statusColor = (status: SEOCheck['status']) => {
    if (status === 'ok') return '#10b981';
    if (status === 'warn') return '#f59e0b';
    if (status === 'error') return '#ef4444';
    return '#4a90d9';
  };

  const ratingColor = (r: WebVital['rating']) => {
    if (r === 'good') return '#10b981';
    if (r === 'needs-improvement') return '#f59e0b';
    if (r === 'poor') return '#ef4444';
    return '#4a90d9';
  };

  const score = checks.length > 0
    ? Math.round((checks.filter(c => c.status === 'ok').length / checks.length) * 100)
    : 0;

  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-[#05070a] pt-28 pb-40 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate('/admin')}
            className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#4a90d9] flex items-center gap-3 group"
          >
            <div className="w-8 h-px bg-[#4a90d9] group-hover:w-16 transition-all" />
            Panel Admin
          </button>
          <div className="flex items-end gap-8 flex-wrap">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#4a90d9] mb-3">Mando Ejecutivo</p>
              <h1 className="text-5xl md:text-7xl font-serif italic text-white leading-tight">
                Dashboard <span className="text-[#4a90d9]">SEO</span>
              </h1>
            </div>
            {/* Score Ring */}
            <div className="flex flex-col items-center ml-auto">
              <div
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                  boxShadow: `0 0 40px ${scoreColor}33`,
                }}
              >
                <div className="w-20 h-20 rounded-full bg-[#05070a] flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{score}</span>
                  <span className="text-[8px] text-white/40 uppercase tracking-widest">SEO Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-white/5 pb-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'Análisis', icon: 'fa-magnifying-glass-chart' },
            { id: 'vitals', label: 'Web Vitals', icon: 'fa-gauge-high' },
            { id: 'robots', label: 'robots.txt', icon: 'fa-robot' },
            { id: 'sitemap', label: 'Sitemap', icon: 'fa-map' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#4a90d9] text-[#4a90d9]'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              <i className={`fas ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== TAB: OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                {checks.filter(c => c.status === 'ok').length}/{checks.length} checks pasados
              </p>
              <button
                onClick={runChecks}
                disabled={isLoadingChecks}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#4a90d9] text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all disabled:opacity-50"
              >
                <i className={`fas fa-rotate ${isLoadingChecks ? 'animate-spin' : ''}`} />
                Re-analizar
              </button>
            </div>

            {isLoadingChecks ? (
              <div className="py-20 text-center">
                <i className="fas fa-spinner animate-spin text-[#4a90d9] text-3xl mb-4 block" />
                <p className="text-white/30 text-sm">Analizando SEO del sitio...</p>
              </div>
            ) : (
              checks.map((check, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 p-5 rounded-2xl border transition-all hover:border-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: `${statusColor(check.status)}22`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${statusColor(check.status)}18`, color: statusColor(check.status) }}
                  >
                    <i className={`fas ${check.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">{check.label}</p>
                    <p className="text-sm text-white/80 leading-relaxed break-words">{check.detail}</p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: statusColor(check.status), boxShadow: `0 0 8px ${statusColor(check.status)}` }}
                  />
                </div>
              ))
            )}

            {/* Meta Tags snapshot */}
            {metaStatus && (
              <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#4a90d9] mb-5">
                  <i className="fas fa-code mr-2" />
                  Meta Tags — Página Actual
                </p>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex gap-3">
                    <span className="text-white/25 w-32 shrink-0">&lt;robots&gt;</span>
                    <span className={metaStatus.noindex ? 'text-red-400' : 'text-green-400'}>
                      {metaStatus.noindex ? 'noindex, nofollow ⚠️' : 'index, follow ✅'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white/25 w-32 shrink-0">&lt;canonical&gt;</span>
                    <span className="text-blue-300 break-all">{metaStatus.canonical}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white/25 w-32 shrink-0">&lt;title&gt;</span>
                    <span className="text-white/70">{metaStatus.title}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-white/25 w-32 shrink-0">&lt;description&gt;</span>
                    <span className="text-white/70 break-all">{metaStatus.description.slice(0, 120)}...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Google Search Console', url: 'https://search.google.com/search-console', icon: 'fa-google', color: '#4285f4' },
                { label: 'PageSpeed Insights', url: `https://pagespeed.web.dev/report?url=${encodeURIComponent(DOMAIN)}`, icon: 'fa-gauge-high', color: '#10b981' },
                { label: 'Schema Markup Validator', url: 'https://validator.schema.org/', icon: 'fa-code', color: '#a855f7' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/5 hover:border-white/15 transition-all group"
                  style={{ background: `${link.color}0a` }}
                >
                  <i className={`fab ${link.icon} text-lg`} style={{ color: link.color }} />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/60 group-hover:text-white/90 transition-all">
                    {link.label}
                  </span>
                  <i className="fas fa-arrow-up-right-from-square text-[9px] text-white/20 ml-auto group-hover:text-white/50 transition-all" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ===== TAB: WEB VITALS ===== */}
        {activeTab === 'vitals' && (
          <div>
            <p className="text-white/30 text-sm mb-8 leading-relaxed">
              Las métricas se miden en tiempo real durante tu sesión. LCP, FCP y TTFB se calculan automáticamente. FID y CLS requieren interacción con la página.
            </p>
            {webVitals.length === 0 ? (
              <div className="py-20 text-center">
                <i className="fas fa-gauge-high text-[#4a90d9] text-4xl mb-4 block animate-pulse" />
                <p className="text-white/30 text-sm">Midiendo métricas de rendimiento...</p>
                <p className="text-white/15 text-xs mt-2">Navega por la página para generar datos de FID y CLS</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {webVitals.map((vital) => (
                  <div
                    key={vital.name}
                    className="p-6 rounded-2xl border transition-all"
                    style={{
                      background: `${ratingColor(vital.rating)}08`,
                      borderColor: `${ratingColor(vital.rating)}22`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">{vital.name}</p>
                        <p
                          className="text-4xl font-black"
                          style={{ color: ratingColor(vital.rating) }}
                        >
                          {vital.value}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest"
                        style={{
                          background: `${ratingColor(vital.rating)}20`,
                          color: ratingColor(vital.rating),
                        }}
                      >
                        {vital.rating === 'good' ? 'Bueno' : vital.rating === 'needs-improvement' ? 'Mejorable' : 'Lento'}
                      </span>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed">{vital.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Thresholds reference */}
            <div className="mt-10 p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#4a90d9] mb-5">
                <i className="fas fa-table mr-2" />Umbrales de Google Core Web Vitals
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-white/30 font-black uppercase tracking-widest pb-3 pr-6">Métrica</th>
                      <th className="text-center text-green-400 font-black uppercase tracking-widest pb-3 pr-6">Bueno</th>
                      <th className="text-center text-amber-400 font-black uppercase tracking-widest pb-3 pr-6">Mejorable</th>
                      <th className="text-center text-red-400 font-black uppercase tracking-widest pb-3">Lento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { m: 'LCP', g: '< 2.5s', n: '2.5s – 4s', p: '> 4s' },
                      { m: 'FID', g: '< 100ms', n: '100 – 300ms', p: '> 300ms' },
                      { m: 'CLS', g: '< 0.1', n: '0.1 – 0.25', p: '> 0.25' },
                      { m: 'TTFB', g: '< 800ms', n: '800ms – 1.8s', p: '> 1.8s' },
                      { m: 'FCP', g: '< 1.8s', n: '1.8s – 3s', p: '> 3s' },
                    ].map(row => (
                      <tr key={row.m}>
                        <td className="py-3 pr-6 font-black text-white/60">{row.m}</td>
                        <td className="py-3 pr-6 text-center text-green-400">{row.g}</td>
                        <td className="py-3 pr-6 text-center text-amber-400">{row.n}</td>
                        <td className="py-3 text-center text-red-400">{row.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: ROBOTS.TXT ===== */}
        {activeTab === 'robots' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-white/30 text-sm">Contenido actual de <code className="text-[#4a90d9]">/robots.txt</code></p>
              <a
                href={`${DOMAIN}/robots.txt`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a90d9] flex items-center gap-2 hover:text-white transition-all"
              >
                <i className="fas fa-external-link-alt" />
                Ver en vivo
              </a>
            </div>
            <pre className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-white/60 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {robotsTxt || 'Cargando robots.txt...'}
            </pre>

            {/* Warnings */}
            <div className="mt-6 space-y-3">
              {robotsTxt.includes('Disallow: /*?*') && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <p className="text-amber-400 text-sm font-bold">⚠️ <code>Disallow: /*?*</code></p>
                  <p className="text-white/40 text-xs mt-1">Esta regla bloquea todas las URLs con parámetros. Puede impedir el rastreo de páginas dinámicas.</p>
                </div>
              )}
              {robotsTxt.includes('Sitemap:') && (
                <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                  <p className="text-green-400 text-sm font-bold">✅ Sitemap declarado en robots.txt</p>
                  <p className="text-white/40 text-xs mt-1">Google puede encontrar automáticamente el sitemap.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB: SITEMAP ===== */}
        {activeTab === 'sitemap' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-white/30 text-sm">Vista previa de <code className="text-[#4a90d9]">/sitemap.xml</code></p>
              <a
                href={`${DOMAIN}/sitemap.xml`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a90d9] flex items-center gap-2 hover:text-white transition-all"
              >
                <i className="fas fa-external-link-alt" />
                Ver en vivo
              </a>
            </div>
            <pre className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-white/60 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {sitemapPreview
                ? sitemapPreview
                : 'Cargando sitemap.xml...'}
            </pre>
            <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <p className="text-blue-300 text-sm font-bold">
                <i className="fas fa-info-circle mr-2" />
                Mostrando los primeros 2000 caracteres del sitemap
              </p>
              <p className="text-white/40 text-xs mt-1">
                El sitemap completo está disponible en{' '}
                <a href={`${DOMAIN}/sitemap.xml`} target="_blank" rel="noreferrer" className="text-[#4a90d9] underline">
                  {DOMAIN}/sitemap.xml
                </a>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SEODashboard;
