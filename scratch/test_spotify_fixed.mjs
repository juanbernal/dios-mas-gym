import fetch from 'node-fetch';

async function test() {
  const original = 'https://image-cdn-ak.spotifycdn.com/image/ab67616100005174ad3895d1abba8e7a7929bca1';
  
  // Buggy regex in existing code:
  const broken = original.replace(/ab6761610000[0-9a-fA-F]+/g, 'ab6761610000f68d');
  
  // Fixed regex matching exactly 4 characters after 0000:
  const fixed = original.replace(/ab6761610000[0-9a-fA-F]{4}/g, 'ab6761610000f68d');
  
  console.log("Original: ", original);
  console.log("Broken (truncates hash): ", broken);
  console.log("Fixed (keeps hash):    ", fixed);
  
  try {
    const res = await fetch(fixed);
    console.log("Fixed URL fetch status:", res.status);
    console.log("Fixed URL content-type:", res.headers.get('content-type'));
    console.log("Fixed URL content-length:", res.headers.get('content-length'));
  } catch (e) {
    console.error("Fixed fetch failed", e);
  }
}

test();
