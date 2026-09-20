// Biblia en español (Reina Valera 1909, dominio público) desde getBible.
// bible-api.deno.dev (la API anterior) ya no existe, por eso se cambió.
const BASE = 'https://api.getbible.net/v2/valera';

// Número de libro (1-66) para cada libro usado en el sitio
export const BOOK_NR: Record<string, number> = {
  genesis: 1, deuteronomio: 5, josue: 6, salmos: 19, proverbios: 20, isaias: 23,
  mateo: 40, juan: 43, romanos: 45, '1-corintios': 46, '2-corintios': 47, galatas: 48,
  efesios: 49, filipenses: 50, colosenses: 51, '1-timoteo': 54, '2-timoteo': 55,
  santiago: 59, hebreos: 58, '1-pedro': 60, '2-pedro': 61, '1-juan': 62, apocalipsis: 66,
};

export interface BibleVerse {
  number: number;
  text: string;
}

// La RV 1909 usa "é" donde hoy se escribe "e", y muchos versículos terminan en , o ;
function tidy(text: string): string {
  return text
    .trim()
    .replace(/(^|\s)é(?=\s)/g, '$1e')
    .replace(/[,;:]$/, '.');
}

const chapterCache = new Map<string, Promise<BibleVerse[]>>();

export function fetchChapter(bookNr: number, chapter: number): Promise<BibleVerse[]> {
  const key = `${bookNr}:${chapter}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;

  const request = (async () => {
    const res = await fetch(`${BASE}/${bookNr}/${chapter}.json`);
    if (!res.ok) throw new Error(`getBible ${res.status}`);
    const data = await res.json();
    const verses = Array.isArray(data?.verses) ? data.verses : [];
    return verses
      .map((v: any) => ({ number: Number(v.verse), text: tidy(String(v.text || '')) }))
      .filter((v: BibleVerse) => v.number > 0 && v.text);
  })();

  // Si falla no dejamos la promesa rota en caché
  request.catch(() => chapterCache.delete(key));
  chapterCache.set(key, request);
  return request;
}

export async function fetchVerse(bookNr: number, chapter: number, verse: number): Promise<string | null> {
  const verses = await fetchChapter(bookNr, chapter);
  return verses.find(v => v.number === verse)?.text ?? null;
}
