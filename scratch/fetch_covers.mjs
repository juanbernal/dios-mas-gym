import fetch from 'node-fetch';

async function run() {
  try {
    const urls = [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv',
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv'
    ];

    const nonYt = [];
    const domains = new Set();

    for (const url of urls) {
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split('\n');
      
      lines.forEach(line => {
        const parts = line.split(',');
        parts.forEach(part => {
          const cleanPart = part.trim().replace(/^"|"$/g, '');
          if (cleanPart.startsWith('http')) {
            try {
              const d = new URL(cleanPart).hostname;
              domains.add(d);
              if (!d.includes('ytimg') && !d.includes('youtube')) {
                nonYt.push(cleanPart);
              }
            } catch (e) {}
          }
        });
      });
    }

    console.log("Domains found:", Array.from(domains));
    console.log(`Found ${nonYt.length} non-YouTube URLs. Examples:`);
    nonYt.slice(0, 30).forEach(u => console.log(` - ${u}`));
  } catch (err) {
    console.error(err);
  }
}

run();
