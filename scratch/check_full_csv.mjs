
async function check() {
    const urls = [
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
    ];
    for (const url of urls) {
        console.log(`\n--- URL: ${url} ---`);
        const res = await fetch(url);
        const csv = await res.text();
        const lines = csv.split('\n');
        
        const matches = lines.filter(l => l.toLowerCase().includes('antes no sentia') || l.toLowerCase().includes('quita la x'));
        if (matches.length > 0) {
            matches.forEach(m => console.log(`MATCH: ${m.trim()}`));
        } else {
            console.log("No matches found for these songs.");
        }
        
        console.log(`Latest date in CSV: ${lines.slice(-10).map(l => l.split(',').pop()).filter(d => d && d.includes('2026'))[0]}`);
    }
}
check();
