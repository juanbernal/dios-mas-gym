
async function test() {
    const url = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec?read=true';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Total releases: ${data.length}`);
    if (data.length > 0) {
        console.log('Keys in the response:', Object.keys(data[0]));
    }
    console.log('Last 10 releases:');
    data.slice(-10).forEach(r => console.log(`${r.Artista} - ${r.name} (${r.releaseDate})`));
}

test();
