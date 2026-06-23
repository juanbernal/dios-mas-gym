import fetch from 'node-fetch';

async function test() {
  const original = 'https://i.scdn.co/image/ab67616d00001e025f16e9112930263f3ff1293c';
  const res = await fetch(original);
  console.log("Original Status:", res.status);
}

test();
