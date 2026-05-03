import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { artist } = req.query;

  if (!artist || typeof artist !== 'string') {
    return res.status(400).json({ error: 'Artist parameter is required' });
  }

  let csvUrl = '';
  if (artist.toLowerCase() === 'diosmasgym') {
    csvUrl = process.env.CSV_URL_DIOSMASGYM || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMXE3y3pJ4CSxpzSC-BGZBfy2tQQ8aY2wNetwNRxqOJc262rXjOIXcRkh3ZnAkJod0WRccUmxm59iv/pub?output=csv';
  } else if (artist.toLowerCase() === 'juan614') {
    csvUrl = process.env.CSV_URL_JUAN614 || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5kDxneZsHJTMUhcSkKeZM842GrmN1LJLfoqxMC-NY_fcVrB3MokMvy6E385Hemt2KM5evC6_gCAQL/pub?output=csv';
  } else {
    return res.status(404).json({ error: 'Artist not found' });
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvData = await response.text();
    
    // Set cache headers
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'text/csv');
    
    return res.status(200).send(csvData);
  } catch (error) {
    console.error(`Error fetching music for ${artist}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
