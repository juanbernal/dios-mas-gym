async function test() {
  const dM = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=' + Date.now()).then(r => r.text());
  console.log("DM Catalog length:", dM.split('\n').length);
  
  const scriptUrl = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec?read=true';
  const existing = await fetch(scriptUrl).then(r => r.json());
  console.log("Existing in Script:", existing.length);
  
  if (existing.length > 0) {
    console.log("Last existing:");
    console.dir(existing[existing.length - 1]);
  }
}
test();
