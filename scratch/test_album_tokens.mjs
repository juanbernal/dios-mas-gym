import fetch from 'node-fetch';

async function test() {
  const original = 'https://i.scdn.co/image/ab67616d00001e025f16e9112930263f3ff1293c'; // arbitrary album cover
  const tokens = ['b273', 'e5eb', 'f68d', '5174'];
  
  for (const t of tokens) {
    const url = original.replace(/ab67616d0000[0-9a-fA-F]{4}/g, `ab67616d0000${t}`);
    console.log(`Replaced URL for ${t}: ${url}`);
    try {
      const res = await fetch(url);
      console.log(`Token: ${t} -> Status: ${res.status}`);
    } catch (e) {
      console.log(`Token: ${t} -> Error: ${e.message}`);
    }
  }
}

test();
