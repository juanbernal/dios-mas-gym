
async function test() {
    const urls = [
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
    ];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\nFetching ${url}...`);
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split('\n').filter(l => l.trim());
        console.log(`Total lines: ${lines.length}`);
        console.log(`Last ${i === 0 ? 20 : 5} lines:`);
        lines.slice(i === 0 ? -20 : -5).forEach(l => console.log(l));
    }
}

test();
