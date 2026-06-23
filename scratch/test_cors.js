async function check(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'Origin': 'https://juanbernal.github.io',
        'Referer': 'https://juanbernal.github.io/'
      }
    });
    console.log(`[${url}] Status:`, res.status);
    console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    const text = await res.text();
    console.log('Preview:', text.slice(0, 150));
  } catch (e) {
    console.error(`[${url}] Failed:`, e.message);
  }
}

async function run() {
  await check('https://app.diosmasgym.com/api/arsenal?maxResults=1');
  await check('https://app.diosmasgym.com/api/music?artist=diosmasgym');
}

run();
