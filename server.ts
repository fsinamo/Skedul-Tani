import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure body parser for large data payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Proxy Google Sheets GET
  app.get("/api/sync", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ status: "error", message: "URL parameter is required" });
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Apps Script returned status ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error in server GET proxy:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API Route: Proxy Google Sheets POST
  app.post("/api/sync", async (req, res) => {
    const { url, payload } = req.body;
    if (!url) {
      return res.status(400).json({ status: "error", message: "URL parameter is required" });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script returned status ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error in server POST proxy:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Integrate Vite as Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
