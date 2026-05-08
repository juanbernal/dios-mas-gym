import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const LINKS_FILE = path.join(process.cwd(), 'data', 'links.json');

  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(LINKS_FILE)) {
        return res.json({ 
          links: [], 
          profile: { 
            name: "Dios Mas Gym", 
            bio: "El Arsenal de Fe | Música, Disciplina y Transformación", 
            avatar: "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" 
          } 
        });
      }
      const data = fs.readFileSync(LINKS_FILE, 'utf-8');
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(JSON.parse(data));
    } catch (error) {
      return res.status(500).json({ error: 'Error reading links' });
    }
  }

  if (req.method === 'POST') {
    // Note: This will only work in local development. 
    // On Vercel production, this will fail or be ephemeral.
    try {
      const data = req.body;
      const dir = path.dirname(LINKS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2));
      return res.status(200).json({ success: true, message: "Saved locally (Note: production requires DB)" });
    } catch (error) {
      return res.status(500).json({ error: 'Error saving links' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
