import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3099;

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API route to proxy the Blogger API v3 (Secure)
  app.get("/api/arsenal", async (req, res) => {
    try {
      const blogId = "5031959192789589903";
      const apiKey = process.env.BLOGGER_API_KEY;
      
      if (!apiKey) {
        console.error("CRITICAL: BLOGGER_API_KEY is not defined in environment variables.");
        return res.status(500).json({ error: "BLOGGER_API_KEY not configured on server" });
      }

      const maxResults = req.query.maxResults || "50";
      const pageToken = req.query.pageToken;
      const q = req.query.q;
      
      let endpoint = q ? 'posts/search' : 'posts';
      let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/${endpoint}?key=${apiKey}&maxResults=${maxResults}&fetchImages=true`;
      
      if (q) url += `&q=${encodeURIComponent(q as string)}`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      console.log(`Blogger API Request: endpoint=${endpoint}, q=${q || 'none'}, pageToken=${pageToken || 'none'}`);
      
      const response = await fetch(url, {
        headers: {
          'Referer': 'https://app.diosmasgym.com',
          'Origin': 'https://app.diosmasgym.com',
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Blogger API Error Details:", JSON.stringify(errData, null, 2));
        return res.status(response.status).json({ 
          error: errData.error?.message || `Blogger API responded with ${response.status}`,
          details: errData.error || null
        });
      }
      
      const data = await response.json();
      console.log(`Blogger API Success: Found ${data.items?.length || 0} posts.`);
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching arsenal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/verify-password", (req, res) => {
    const { password } = req.body;
    const MASTER_KEY = process.env.ADMIN_PASSWORD;
    
    if (password && password === MASTER_KEY) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // Link-in-Bio API
  const LINKS_FILE = path.join(process.cwd(), "data", "links.json");

  app.get("/api/links", (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      console.log(`Reading links from: ${LINKS_FILE}`);
      if (!fs.existsSync(LINKS_FILE)) {
        console.warn("Links file not found, returning default data.");
        return res.json({ links: [], profile: { name: "Dios Mas Gym", bio: "El Arsenal de Fe | Música, Disciplina y Transformación", avatar: "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600" } });
      }
      const data = fs.readFileSync(LINKS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      console.error("Error reading links file:", error);
      res.status(500).json({ error: "Failed to load links" });
    }
  });

  app.post("/api/links", (req, res) => {
    try {
      const data = req.body;
      const dir = path.dirname(LINKS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LINKS_FILE, JSON.stringify(data, null, 2));
      console.log(`Links saved to: ${LINKS_FILE}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving links file:", error);
      res.status(500).json({ error: "Failed to save links" });
    }
  });

  // Sheet proxy (Google Apps Script)
  const GS_MAIN_URL = 'https://script.google.com/macros/s/AKfycbwg6vqZAc7VYmj3pRu85wnS7fsBWw1801ymY_XdcMBn3uShOK0k9T0rZC7SfbYxgr8R4g/exec';
  const GS_LYRICS_URL = 'https://script.google.com/macros/s/AKfycbz6lGyxzBH1rW_1E48LUf35EAKobx5mQ7mY-CgbwHAqVxYUt3J2X6B1drql4MamRhMqkw/exec';
  const GS_ANALYTICS_URL = 'https://script.google.com/macros/s/AKfycbwNX-T5wawLrYaTnJ0PcN_xA8sp0LIXThDA3jqkDhR3IdjSlnqRif8rUEx_e9e1xSsd3Q/exec';

  app.all("/api/sheet-proxy", async (req, res) => {
    try {
      const script = (req.query.script as string) || 'main';
      let url = GS_MAIN_URL;
      if (script === 'lyrics') {
        url = GS_LYRICS_URL;
      } else if (script === 'analytics') {
        url = GS_ANALYTICS_URL;
      }

      if (req.method === 'GET') {
        const q = { ...req.query } as Record<string, string>;
        delete q.script;
        const qs = new URLSearchParams(q).toString();
        if (qs) url += `?${qs}`;
      }

      const opts: RequestInit = {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (req.method === 'POST') opts.body = JSON.stringify(req.body);

      const resp = await fetch(url, opts);
      const ct = resp.headers.get('content-type');
      if (ct?.includes('application/json')) {
        res.json(await resp.json());
      } else {
        res.send(await resp.text());
      }
    } catch (err: any) {
      console.error('[sheet-proxy] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API and internal
      if (url.startsWith('/api/') || url.includes('@vite') || url.includes('node_modules')) {
        return next();
      }

      try {
        const indexPath = path.join(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
