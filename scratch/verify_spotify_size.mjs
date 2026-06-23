import fetch from 'node-fetch';

async function test() {
  const original = 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174ad3895d1abba8e7a7929bca1';
  
  const low = original.replace(/ab6761610000[0-9a-fA-F]{4}/g, 'ab67616100005174');
  const high = original.replace(/ab6761610000[0-9a-fA-F]{4}/g, 'ab6761610000e5eb');
  
  const resLow = await fetch(low);
  const resHigh = await fetch(high);
  
  console.log("5174 (Low) Length:", resLow.headers.get('content-length'));
  console.log("e5eb (High) Length:", resHigh.headers.get('content-length'));
}

test();
