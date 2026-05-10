import express from "express";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PICTURES_DIR = path.join(__dirname, "pictures");
const ID_REGEX = /^M([1-9]|[1-9][0-9]|10[0-9]|110)$/;
const FILE_REGEX = /^(M\d{1,3})\.(jpg|jpeg|png|webp)$/i;

await fsp.mkdir(PICTURES_DIR, { recursive: true });

const app = express();

// Serve static photos
app.use("/pictures", express.static(PICTURES_DIR, {
  setHeaders: (res) => res.setHeader("Cache-Control", "no-cache"),
}));

// List all photos as { id: "/pictures/<file>" }
app.get("/api/photos", async (_req, res) => {
  try {
    const entries = await fsp.readdir(PICTURES_DIR);
    const photos = {};
    for (const name of entries) {
      const m = name.match(FILE_REGEX);
      if (!m) continue;
      const id = m[1].toUpperCase();
      if (!ID_REGEX.test(id)) continue;
      photos[id] = `/pictures/${name}`;
    }
    res.json(photos);
  } catch (err) {
    console.error("GET /api/photos failed:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] pictures dir: ${PICTURES_DIR}`);
});
