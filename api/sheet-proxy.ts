import type { VercelRequest, VercelResponse } from '@vercel/node';

const SCRIPTS = {
    main: 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec',
    lyrics: 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { script = 'main' } = req.query;
        let url = SCRIPTS[script as keyof typeof SCRIPTS] || SCRIPTS.main;
        
        // Build the URL for GET requests
        if (req.method === 'GET') {
            const queryParams = { ...req.query };
            delete queryParams.script; // Remove internal param
            const queryString = new URLSearchParams(queryParams as any).toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        const fetchOptions: RequestInit = {
            method: req.method,
            headers: {
                'Content-Type': 'text/plain',
            }
        };

        if (req.method === 'POST') {
            // Google Apps Script requires text/plain (not application/json)
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);
        
        // No cache for sheet data (always fresh)
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Handle responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return res.status(200).json(data);
        } else {
            const text = await response.text();
            return res.status(200).send(text);
        }

    } catch (err: any) {
        console.error('[sheet-proxy] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
