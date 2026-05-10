import express from "express";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { ZipArchive } from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PICTURES_DIR = path.join(__dirname, "pictures");
const ID_REGEX = /^M([1-9]|[1-9][0-9]|10[0-9]|110)$/;
const FILE_REGEX = /^(M\d{1,3})\.(jpg|jpeg|png|webp)$/i;

const ALLOWED_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error("INVALID_MIME"));
    }
    cb(null, true);
  },
});

await fsp.mkdir(PICTURES_DIR, { recursive: true });

async function removeExistingForId(id) {
  const entries = await fsp.readdir(PICTURES_DIR);
  for (const name of entries) {
    const m = name.match(FILE_REGEX);
    if (m && m[1].toUpperCase() === id) {
      await fsp.unlink(path.join(PICTURES_DIR, name));
    }
  }
}

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

app.post("/api/photos/:id", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 10 MB)"
                : err.message === "INVALID_MIME" ? "Invalid file type (jpg/png/webp only)"
                : "Upload error";
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: msg });
    }
    const id = req.params.id;
    if (!ID_REGEX.test(id)) {
      return res.status(400).json({ error: "Invalid id (M1–M110)" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Missing file field" });
    }
    const ext = ALLOWED_MIME[req.file.mimetype];
    try {
      await removeExistingForId(id);
      const filename = `${id}.${ext}`;
      await fsp.writeFile(path.join(PICTURES_DIR, filename), req.file.buffer);
      res.json({ id, url: `/pictures/${filename}` });
    } catch (e) {
      console.error("POST /api/photos failed:", e);
      res.status(500).json({ error: "Write failed" });
    }
  });
});

app.delete("/api/photos/:id", async (req, res) => {
  const id = req.params.id;
  if (!ID_REGEX.test(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  try {
    const entries = await fsp.readdir(PICTURES_DIR);
    let removed = false;
    for (const name of entries) {
      const m = name.match(FILE_REGEX);
      if (m && m[1].toUpperCase() === id) {
        await fsp.unlink(path.join(PICTURES_DIR, name));
        removed = true;
      }
    }
    if (!removed) return res.status(404).end();
    res.status(204).end();
  } catch (e) {
    console.error("DELETE /api/photos failed:", e);
    res.status(500).json({ error: "Delete failed" });
  }
});

app.get("/api/export", async (_req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="messier-pictures.zip"');

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err) => {
    console.error("Export archive error:", err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  archive.pipe(res);

  try {
    const entries = await fsp.readdir(PICTURES_DIR);
    for (const name of entries) {
      if (!FILE_REGEX.test(name)) continue;
      archive.file(path.join(PICTURES_DIR, name), { name });
    }
    archive.finalize();
  } catch (e) {
    console.error("Export failed:", e);
    archive.abort();
  }
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] pictures dir: ${PICTURES_DIR}`);
});
