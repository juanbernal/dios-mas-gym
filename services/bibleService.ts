// Biblia en español (Reina Valera 1909, dominio público) desde getBible.
// bible-api.deno.dev (la API anterior) ya no existe, por eso se cambió.
const BASE = 'https://api.getbible.net/v2/valera';

// Número de libro (1-66) de cada libro de la Biblia
export const BOOK_NR: Record<string, number> = {
  genesis: 1, exodo: 2, levitico: 3, numeros: 4, deuteronomio: 5, josue: 6, jueces: 7,
  rut: 8, '1-samuel': 9, '2-samuel': 10, '1-reyes': 11, '2-reyes': 12, '1-cronicas': 13,
  '2-cronicas': 14, esdras: 15, nehemias: 16, ester: 17, job: 18, salmos: 19,
  proverbios: 20, eclesiastes: 21, cantares: 22, isaias: 23, jeremias: 24,
  lamentaciones: 25, ezequiel: 26, daniel: 27, oseas: 28, joel: 29, amos: 30, abdias: 31,
  jonas: 32, miqueas: 33, nahum: 34, habacuc: 35, sofonias: 36, hageo: 37, zacarias: 38,
  malaquias: 39, mateo: 40, marcos: 41, lucas: 42, juan: 43, hechos: 44, romanos: 45,
  '1-corintios': 46, '2-corintios': 47, galatas: 48, efesios: 49, filipenses: 50,
  colosenses: 51, '1-tesalonicenses': 52, '2-tesalonicenses': 53, '1-timoteo': 54,
  '2-timoteo': 55, tito: 56, filemon: 57, hebreos: 58, santiago: 59, '1-pedro': 60,
  '2-pedro': 61, '1-juan': 62, '2-juan': 63, '3-juan': 64, judas: 65, apocalipsis: 66,
};

const BOOK_ALIASES: Record<string, string> = {
  salmo: 'salmos', proverbio: 'proverbios', 'cantar-de-los-cantares': 'cantares',
};

// "1 Corintios", "Josué", "salmo" -> número de libro (o undefined si no existe)
export function bookNumber(name: string): number | undefined {
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
  return BOOK_NR[BOOK_ALIASES[key] || key];
}

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
