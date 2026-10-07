export interface Oracion {
  id: string;
  name: string;
  text: string;
  createdAt: number;
  count: number;
  status?: 'pendiente' | 'aprobada';
}

const PRAYED_KEY = 'dg_orando_por';

// Ids por los que esta persona ya oro (para no contar dos veces desde el mismo telefono)
export const getPrayed = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(PRAYED_KEY) || '[]')); } catch { return new Set(); }
};
const savePrayed = (s: Set<string>) => {
  try { localStorage.setItem(PRAYED_KEY, JSON.stringify([...s].slice(-300))); } catch { /* sin almacenamiento */ }
};

export async function fetchOraciones(): Promise<Oracion[]> {
  try {
    const res = await fetch('/api/oraciones');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function sendOracion(form: { name: string; text: string; website: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/oraciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'nueva', ...form }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error || 'No pudimos enviar tu petición. Intenta de nuevo.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
  }
}

export async function prayFor(id: string): Promise<number | null> {
  const prayed = getPrayed();
  if (prayed.has(id)) return null;
  prayed.add(id);
  savePrayed(prayed);
  try {
    const res = await fetch('/api/oraciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'orar', id }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.count === 'number' ? data.count : null;
  } catch {
    return null;
  }
}

export const timeAgo = (ts: number): string => {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
};
