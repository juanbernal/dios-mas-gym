import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      
      let url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?key=${apiKey}&maxResults=${maxResults}&fetchImages=true`;
      if (pageToken) url += `&pageToken=${pageToken}`;

      console.log(`Blogger API Request: maxResults=${maxResults}, pageToken=${pageToken || 'none'}`);

      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        console.error("Blogger API Error Details:", JSON.stringify(errData, null, 2));
        throw new Error(errData.error?.message || `Blogger API responded with ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Blogger API Success: Found ${data.items?.length || 0} posts.`);
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching arsenal:", error);
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
