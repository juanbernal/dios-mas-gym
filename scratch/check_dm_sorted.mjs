
async function check() {
    const artist = 'diosmasgym';
    console.log(`\n--- Artist: ${artist} ---`);
    const url = `https://app.diosmasgym.com/api/music?artist=${artist}&refresh=true`;
    const res = await fetch(url);
    const csv = await res.text();
    const lines = csv.split('\n');
    console.log(`Total lines: ${lines.length}`);
    
    // Sort lines by the date in column F (last column)
    const dataLines = lines.slice(1).filter(l => l.trim());
    const sorted = dataLines.sort((a, b) => {
        const dateA = a.split(',').pop();
        const dateB = b.split(',').pop();
        return dateB.localeCompare(dateA); // Newest first
    });

    console.log("Top 10 newest items in CSV (Sorted by Date):");
    sorted.slice(0, 10).forEach(l => console.log(l.trim()));
}
check();
