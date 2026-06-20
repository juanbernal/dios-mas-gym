import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import https from "https";
import http from "http";
import arsenalHandler from "./api/arsenal.ts";
import commonHandler from "./api/common.ts";

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

  // Proxy to Vercel API Handlers for local development compatibility
  app.all("/api/arsenal", (req, res) => {
    arsenalHandler(req as any, res as any);
  });

  app.all("/api/common", (req, res) => {
    commonHandler(req as any, res as any);
  });

  app.get("/api/music", (req, res) => {
    req.query.action = 'music';
    commonHandler(req as any, res as any);
  });

  app.all("/api/links", (req, res) => {
    req.query.action = 'links';
    commonHandler(req as any, res as any);
  });

  app.post("/api/verify-password", (req, res) => {
    req.query.action = 'verify-password';
    commonHandler(req as any, res as any);
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

  // Local Image Proxy (for bypassing CORS during development)
  app.get("/api/image-proxy", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      // Native fetch follows redirects internally server-side on Node 18+
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.status(200).send(buffer);
    } catch (error: any) {
      console.error('[image-proxy] Fetch error:', error);
      return res.status(500).json({ error: 'Failed to proxy image', details: error.message });
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
