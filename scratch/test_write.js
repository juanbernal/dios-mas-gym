import fs from 'fs';
import path from 'path';

try {
  const filePath = path.join(process.cwd(), 'data', 'maintenance.json');
  console.log('Attempting to write to:', filePath);
  
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(filePath, JSON.stringify({ enabled: true, videoUrl: 'test' }, null, 2));
  console.log('Successfully wrote to file!');
  
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log('File contents:', content);
} catch (e) {
  console.error('Failed to write to file:', e);
}
