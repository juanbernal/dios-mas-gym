export interface Testimony {
  id: number;
  name: string;
  location: string;
  text: string;
}

// Solo devuelve testimonios aprobados (los revisa el dueño en la hoja antes de publicarse)
export async function fetchTestimonios(): Promise<Testimony[]> {
  try {
    const res = await fetch('/api/testimonios');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function sendTestimonio(form: { name: string; location: string; text: string; website: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/testimonios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error || 'No pudimos enviar tu testimonio. Intenta de nuevo.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
  }
}
