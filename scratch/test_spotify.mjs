import fetch from 'node-fetch';

async function test() {
  const original = 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174ad3895d1abba8e7a7929bca1';
  const upgraded = original.replace(/ab6761610000[0-9a-fA-F]+/g, 'ab6761610000f68d');
  
  console.log("Original URL:", original);
  console.log("Upgraded URL:", upgraded);
  
  try {
    const res = await fetch(upgraded);
    console.log("Upgraded response status:", res.status);
    console.log("Upgraded content-type:", res.headers.get('content-type'));
    console.log("Upgraded content-length:", res.headers.get('content-length'));
  } catch (e) {
    console.error("Fetch failed", e);
  }
}

test();
