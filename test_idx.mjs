import fs from 'fs';
async function run() {
  const j6_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv&t=' + Date.now()).then(r => r.text());
  const dM_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=' + Date.now()).then(r => r.text());
  console.log('dM line index of Escuchamos:', dM_csv.split('\n').findIndex(l => l.includes('Escúchamos')));
  console.log('j6 line index of Pega:', j6_csv.split('\n').findIndex(l => l.includes('Pega')));
  console.log('dM total lines:', dM_csv.split('\n').length);
  console.log('j6 total lines:', j6_csv.split('\n').length);
}
run();
