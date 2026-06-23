async function check(url) {
  try {
    const res = await fetch(url);
    console.log(`[${url}] Status:`, res.status, 'Type:', res.headers.get('content-type'));
    const text = await res.text();
    console.log('Preview:', text.slice(0, 150));
  } catch (e) {
    console.error(`[${url}] Failed:`, e.message);
  }
}

async function run() {
  await check('http://localhost:3099/api/arsenal?maxResults=1');
  await check('http://localhost:3099/api/music?artist=diosmasgym');
}

run();
