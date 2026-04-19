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
