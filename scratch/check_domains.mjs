async function checkHtml(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[${url}] Status:`, res.status);
    const scripts = [];
    const scriptRegex = /<script\b[^>]*src="([^"]*)"/gi;
    let match;
    while ((match = scriptRegex.exec(text)) !== null) {
      scripts.push(match[1]);
    }
    console.log('Scripts found:', scripts);
  } catch (e) {
    console.error(`[${url}] Failed:`, e.message);
  }
}

async function run() {
  await checkHtml('https://juanbernal.github.io/dios-mas-gym/');
}

run();
