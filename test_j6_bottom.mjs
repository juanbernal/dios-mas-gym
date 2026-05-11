import fs from 'fs';
async function run() { 
  const j6_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv&t=' + Date.now()).then(r => r.text()); 
  const lines = j6_csv.split('\n'); 
  console.log('J6 Bottom 10:'); 
  for(let i=lines.length-10; i<lines.length; i++) {
    if (lines[i]) console.log(lines[i]);
  }
} 
run();
