
async function check() {
    const artists = ['diosmasgym', 'juan614'];
    for (const artist of artists) {
        console.log(`\n--- Artist: ${artist} ---`);
        const url = `https://app.diosmasgym.com/api/music?artist=${artist}`;
        const res = await fetch(url);
        const csv = await res.text();
        const lines = csv.split('\n');
        console.log(`Total lines: ${lines.length}`);
        
        // Find specific songs
        const searchSongs = ["Quita la X", "Antes No Sentía", "¿Por Qué? Dios", "El calor infernal"];
        lines.forEach(line => {
            searchSongs.forEach(song => {
                if (line.includes(song)) {
                    console.log(`FOUND: ${line.trim()}`);
                }
            });
        });
        
        console.log("Last 5 items in CSV:");
        lines.slice(-6).forEach(l => console.log(l.trim()));
    }
}
check();
