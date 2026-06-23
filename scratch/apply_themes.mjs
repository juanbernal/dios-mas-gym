import fs from 'fs';

const filePath = 'components/SmartLinkView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the boundaries
const idxDgmStart = content.indexOf('// === TEMA DIOSMASGYM (Urbano / Oscuro / Dorado) ===');

if (idxDgmStart === -1) {
    console.error('Boundaries not found');
    process.exit(1);
}

const beforeDgm = content.substring(0, idxDgmStart);

const themesTxt = fs.readFileSync('scratch/themes.txt', 'utf8');

const finalContent = beforeDgm + themesTxt;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully replaced layout!');
