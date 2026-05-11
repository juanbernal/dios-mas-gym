async function run() {
  const j6_csv = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv&t=' + Date.now()).then(r => r.text());
  const lines = j6_csv.split(/\r?\n/);
  console.log("J6 Header:", JSON.stringify(lines[0]));
  console.log("J6 Line 2:", JSON.stringify(lines[1]));
  console.log("J6 Line 3:", JSON.stringify(lines[2]));
  console.log("---");
  console.log("J6 Last line:", JSON.stringify(lines[lines.length - 2]));
  
  // Check where 'Nombre,Artista' appears
  const idx = lines.findIndex(l => l.includes('Nombre') && l.includes('Artista'));
  console.log("'Nombre,Artista' found at index:", idx);
  console.log("Line at that index:", JSON.stringify(lines[idx]));
}
run();
