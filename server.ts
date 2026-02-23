import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to proxy the Blogger feed
  app.get("/api/feed", async (req, res) => {
    try {
      // We use the ID from constants or just hardcode the known working URL for this specific blog
      // Based on previous turns, the blog ID is 5031959192789589903
      const blogId = "5031959192789589903";
      const feedUrl = `https://www.blogger.com/feeds/${blogId}/posts/default?alt=json&max-results=50`;
      
      console.log(`Fetching feed from: ${feedUrl}`);
      
      const response = await fetch(feedUrl);
      if (!response.ok) {
        throw new Error(`Blogger responded with ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error proxying feed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
