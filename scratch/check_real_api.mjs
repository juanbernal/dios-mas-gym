
async function check() {
    const artists = ['diosmasgym', 'juan614'];
    for (const artist of artists) {
        console.log(`\n--- Artist: ${artist} ---`);
        const url = `https://app.diosmasgym.com/api/music?artist=${artist}&refresh=true`;
        const res = await fetch(url);
        const csv = await res.text();
        const lines = csv.split('\n');
        console.log(`Total lines: ${lines.length}`);
        
        console.log("Last 10 items in CSV (Real API):");
        lines.slice(-10).forEach(l => console.log(l.trim()));
    }
}
check();
