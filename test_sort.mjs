import fs from 'fs';
async function run() { 
  const dM_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv&t=' + Date.now()).then(r => r.text()); 
  const lines = dM_csv.split('\n'); 
  console.log('Top 5:'); 
  for(let i=0; i<5; i++) console.log(lines[i]); 
  console.log('---'); 
  console.log('Bottom 5:'); 
  for(let i=lines.length-5; i<lines.length; i++) console.log(lines[i]); 
}
run();
