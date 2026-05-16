
// Mock data
const catalogDM = [
    { name: "¿Por Qué? Dios (feat. Juan 614)", artist: "Diosmasgym", date: "2026-05-15T16:39:30Z", cover: "c1" },
    { name: "Carta Para Ti (Mujer Valiosa) (feat. Juan 614)", artist: "Diosmasgym", date: "2026-05-15T16:39:30Z", cover: "c2" },
    { name: "La Casa (El Reflejo) (feat. Juan 614)", artist: "Diosmasgym", date: "2026-05-15T16:39:30Z", cover: "c3" },
    { name: "Como Cuando Te Fuiste (feat. Juan 614)", artist: "Diosmasgym", date: "2026-05-15T16:39:30Z", cover: "c4" },
    { name: "El calor infernal", artist: "Diosmasgym", date: "2026-05-08T20:50:36Z", cover: "c5" }
];

const existing = [
    { Artista: "Diosmasgym", name: "El calor infernal (caso roxana) (feat. Juan 614)", releaseDate: "2026-05-08" }
];

const normalize = (s) => s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(feat\..*?\)/g, '')
    .replace(/\(ft\..*?\)/g, '')
    .replace(/^album/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

const groupIntoAlbums = (songs) => {
    const groupMap = new Map();
    songs.forEach(song => {
        const key = song.date ? `date-${song.date}` : (song.cover && song.cover.trim() ? song.cover.trim() : `single-${song.id}`);
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(song);
    });
    const result = [];
    groupMap.forEach((group) => {
        if (group.length === 1) {
            result.push(group[0]);
        } else {
            const sorted = [...group].sort((a, b) => a.name.length - b.name.length);
            const rep = { ...sorted[0] };
            rep.name = rep.name.replace(/\s*\(feat\..*?\)/gi, '').trim();
            if (group.length >= 3) {
                rep.name = `Álbum: ${rep.name}`;
            }
            result.push(rep);
        }
    });
    return result;
};

const latestCatalog = groupIntoAlbums(catalogDM);
console.log('Grouped Catalog:', latestCatalog.map(c => c.name));

const missing = latestCatalog.filter((cat) => {
    const normCatName = normalize(cat.name);
    console.log(`Checking catalog item: ${cat.name} (norm: ${normCatName})`);
    
    const isFound = existing.some(ex => {
        const normExName = normalize(ex.name || '');
        console.log(`  Comparing with existing: ${ex.name} (norm: ${normExName})`);
        return normExName === normCatName;
    });
    
    return !isFound;
});

console.log('\nMissing items identified:', missing.map(m => m.name));
