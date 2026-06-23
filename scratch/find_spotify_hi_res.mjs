import fetch from 'node-fetch';

async function test() {
  const original = 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174ad3895d1abba8e7a7929bca1';
  const tokens = ['b273', 'f68d', 'e5eb', '1e02', '4851', '5174'];
  
  for (const t of tokens) {
    const url = original.replace(/ab6761610000[0-9a-fA-F]{4}/g, `ab6761610000${t}`);
    const res = await fetch(url);
    console.log(`Token: ${t} -> Status: ${res.status}`);
  }
}

test();
