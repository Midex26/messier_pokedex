# Pictures Folder Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `window.storage` (base64 KV store) with a Node/Express backend that writes uploaded photos as real files into a `pictures/` folder on disk, persisted in dev and Docker prod.

**Architecture:** Add a small Express server (`server.js`) that exposes `/api/photos`, `/api/export`, `/api/import` and serves `/pictures/*` statically. In dev, Vite proxies these routes to Express on port 3001. In prod (Docker), Express also serves the built `dist/` and acts as SPA fallback — replacing nginx. The `pictures/` folder is bind-mounted in Docker so uploads persist across rebuilds.

**Tech Stack:** Node 20, Express 4, multer (multipart upload), archiver (zip out), unzipper (zip in), concurrently (parallel dev servers), Vite 5, React 18.

**Spec:** `docs/superpowers/specs/2026-05-10-pictures-folder-upload-design.md`

**Note on testing:** No automated test framework in this project. Each backend task is verified by `curl` commands with expected responses. Frontend tasks are verified by manual browser checks. TDD discipline still applies: define the expected behavior first (write the curl call and expected output), then implement, then run.

**Note on git:** The project is currently not a git repo. Task 0 initializes it. If you prefer no git, skip the `git add`/`git commit` steps throughout.

---

### Task 0: Project bootstrap (git init, deps, dirs)

**Files:**
- Create: `.gitignore`, `pictures/.gitkeep`
- Modify: `package.json`, `.dockerignore`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/matthis/Documents/Messier
git init
git add -A
git commit -m "chore: snapshot existing project before backend refactor"
```

- [ ] **Step 2: Create `.gitignore`**

Create `/Users/matthis/Documents/Messier/.gitignore` with:

```
node_modules
dist
.DS_Store
npm-debug.log
*.log

# Photos uploaded at runtime — keep folder, ignore contents
pictures/*
!pictures/.gitkeep
```

- [ ] **Step 3: Create `pictures/` directory and `.gitkeep`**

```bash
mkdir -p /Users/matthis/Documents/Messier/pictures
touch /Users/matthis/Documents/Messier/pictures/.gitkeep
```

- [ ] **Step 4: Update `.dockerignore`**

Replace the file `/Users/matthis/Documents/Messier/.dockerignore` with:

```
node_modules
dist
.git
.gitignore
.dockerignore
Dockerfile
docker-compose.yml
npm-debug.log
.DS_Store
docs
pictures
```

(Adding `docs` and `pictures` — both are not needed inside the image; pictures is bind-mounted at runtime.)

- [ ] **Step 5: Install backend dependencies**

```bash
cd /Users/matthis/Documents/Messier
npm install express multer archiver unzipper
npm install --save-dev concurrently
```

Expected: `package.json` now lists these in `dependencies` and `devDependencies`. A `package-lock.json` is created.

- [ ] **Step 6: Verify**

```bash
ls /Users/matthis/Documents/Messier/pictures/
# Expected: .gitkeep
node -e "console.log(require('./package.json').dependencies)"
# Expected: object including express, multer, archiver, unzipper
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: bootstrap pictures folder and backend deps"
```

---

### Task 1: `server.js` skeleton + `GET /api/photos`

**Files:**
- Create: `server.js`

- [ ] **Step 1: Define expected behavior (the manual test)**

After implementation, this curl should return `{}` because `pictures/` is empty (only `.gitkeep`):

```bash
curl -s http://localhost:3001/api/photos
# Expected: {}
```

After dropping a fake file, it should appear in the listing:

```bash
echo "fake" > pictures/M31.jpg
curl -s http://localhost:3001/api/photos
# Expected: {"M31":"/pictures/M31.jpg"}
rm pictures/M31.jpg
```

- [ ] **Step 2: Create `server.js`**

Create `/Users/matthis/Documents/Messier/server.js`:

```js
import express from "express";
import fs from "node:fs";
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
```

- [ ] **Step 3: Add `"type": "module"` confirmation**

Verify `package.json` already contains `"type": "module"` (it does — confirmed). No change needed. If missing, add it.

- [ ] **Step 4: Run the server**

```bash
cd /Users/matthis/Documents/Messier
node server.js &
SERVER_PID=$!
sleep 1
```

Expected log: `[server] listening on http://localhost:3001`.

- [ ] **Step 5: Run the manual tests from Step 1**

```bash
curl -s http://localhost:3001/api/photos
# Expected: {}

echo "fake" > pictures/M31.jpg
curl -s http://localhost:3001/api/photos
# Expected: {"M31":"/pictures/M31.jpg"}

curl -s http://localhost:3001/pictures/M31.jpg
# Expected: fake

rm pictures/M31.jpg
```

- [ ] **Step 6: Stop the server**

```bash
kill $SERVER_PID
```

- [ ] **Step 7: Commit**

```bash
git add server.js package.json package-lock.json
git commit -m "feat: add Express server with GET /api/photos and static pictures serving"
```

---

### Task 2: `POST /api/photos/:id` (upload)

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Define expected behavior**

Upload a fake JPEG, expect 200 with the URL; upload to invalid id, expect 400; upload non-image, expect 400.

```bash
# Create a 1x1 valid JPEG (smallest possible) for tests
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0a\x0c\x14\x0d\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\x09\x0a\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd0\xff\xd9' > /tmp/tiny.jpg

# Valid upload
curl -s -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/M31
# Expected: {"id":"M31","url":"/pictures/M31.jpg"}

# Invalid id
curl -s -o /dev/null -w "%{http_code}\n" -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/M999
# Expected: 400

# Invalid id (not Mxxx)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/foo
# Expected: 400

# Non-image MIME
echo "not an image" > /tmp/notimg.txt
curl -s -o /dev/null -w "%{http_code}\n" -X POST -F "file=@/tmp/notimg.txt;type=text/plain" http://localhost:3001/api/photos/M31
# Expected: 400
```

- [ ] **Step 2: Add multer import and upload handler**

Edit `/Users/matthis/Documents/Messier/server.js`. After the existing imports, add:

```js
import multer from "multer";
```

After the `FILE_REGEX` constant, add:

```js
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

async function removeExistingForId(id) {
  const entries = await fsp.readdir(PICTURES_DIR);
  for (const name of entries) {
    const m = name.match(FILE_REGEX);
    if (m && m[1].toUpperCase() === id) {
      await fsp.unlink(path.join(PICTURES_DIR, name));
    }
  }
}
```

Then, after the `GET /api/photos` route, add:

```js
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
```

- [ ] **Step 3: Run the server**

```bash
node server.js &
SERVER_PID=$!
sleep 1
```

- [ ] **Step 4: Run the curl tests from Step 1**

Expected outputs as documented above.

- [ ] **Step 5: Verify the file was written**

```bash
ls -la pictures/
# Expected: M31.jpg present (and .gitkeep)

curl -s http://localhost:3001/api/photos
# Expected: {"M31":"/pictures/M31.jpg"}
```

- [ ] **Step 6: Verify extension change overwrites**

```bash
# Upload a PNG to M31 (use a tiny valid PNG)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/tiny.png

curl -s -X POST -F "file=@/tmp/tiny.png" http://localhost:3001/api/photos/M31
# Expected: {"id":"M31","url":"/pictures/M31.png"}

ls pictures/
# Expected: M31.png .gitkeep  (M31.jpg should be gone)
```

- [ ] **Step 7: Cleanup and stop server**

```bash
rm -f pictures/M31.* /tmp/tiny.jpg /tmp/tiny.png /tmp/notimg.txt
kill $SERVER_PID
```

- [ ] **Step 8: Commit**

```bash
git add server.js
git commit -m "feat: add POST /api/photos/:id with validation and atomic extension swap"
```

---

### Task 3: `DELETE /api/photos/:id`

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Define expected behavior**

```bash
# Setup: upload then delete
curl -s -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/M42
# Then:
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3001/api/photos/M42
# Expected: 204

# After delete, listing no longer contains M42
curl -s http://localhost:3001/api/photos
# Expected: {} (or without M42)

# Deleting non-existent returns 404
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3001/api/photos/M42
# Expected: 404

# Invalid id
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3001/api/photos/foo
# Expected: 400
```

- [ ] **Step 2: Add delete handler**

In `server.js`, after the POST handler, add:

```js
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
```

- [ ] **Step 3: Run server and tests**

```bash
node server.js &
SERVER_PID=$!
sleep 1

# Recreate tiny.jpg if needed (see Task 2 Step 1)
# Then run the test sequence from Step 1 above.
```

Verify all expected outputs match.

- [ ] **Step 4: Stop server and commit**

```bash
kill $SERVER_PID
git add server.js
git commit -m "feat: add DELETE /api/photos/:id"
```

---

### Task 4: `GET /api/export` (zip stream)

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Define expected behavior**

```bash
# With at least one photo present
curl -s -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/M1
curl -s -o /tmp/export.zip http://localhost:3001/api/export

unzip -l /tmp/export.zip
# Expected: lists M1.jpg
```

- [ ] **Step 2: Add archiver import and export handler**

At top of `server.js`, add:

```js
import archiver from "archiver";
```

After the DELETE handler, add:

```js
app.get("/api/export", async (_req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="messier-pictures.zip"');

  const archive = archiver("zip", { zlib: { level: 6 } });
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
```

- [ ] **Step 3: Run server and test**

```bash
node server.js &
SERVER_PID=$!
sleep 1

# Run Step 1 sequence
```

Verify the zip contains `M1.jpg`.

- [ ] **Step 4: Stop server and commit**

```bash
kill $SERVER_PID
git add server.js
git commit -m "feat: add GET /api/export zip stream"
```

---

### Task 5: `POST /api/import` (zip extract)

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Define expected behavior**

```bash
# Build a zip with M5.jpg and a malicious entry that should be ignored
mkdir -p /tmp/ziptest && cd /tmp/ziptest
cp /tmp/tiny.jpg M5.jpg
cp /tmp/tiny.jpg evil.txt    # wrong extension — should be ignored
zip /tmp/test-import.zip M5.jpg evil.txt
cd -

# Empty pictures/ first
rm -f pictures/M*.jpg pictures/M*.png pictures/M*.webp pictures/M*.jpeg

curl -s -X POST -F "file=@/tmp/test-import.zip" http://localhost:3001/api/import
# Expected: {"imported":["M5"],"photos":{"M5":"/pictures/M5.jpg"}}

ls pictures/
# Expected: M5.jpg .gitkeep  (no evil.txt)
```

- [ ] **Step 2: Add unzipper import and handler**

At top of `server.js`, add:

```js
import unzipper from "unzipper";
```

Add a separate multer instance for zip uploads (different size limit, different MIME), before the routes:

```js
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB for full export
});
```

After the `/api/export` handler, add:

```js
app.post("/api/import", (req, res) => {
  uploadZip.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400)
        .json({ error: "Upload error" });
    }
    if (!req.file) return res.status(400).json({ error: "Missing file" });

    const imported = [];
    try {
      const dir = await unzipper.Open.buffer(req.file.buffer);
      for (const entry of dir.files) {
        if (entry.type !== "File") continue;
        const base = path.basename(entry.path);
        const m = base.match(FILE_REGEX);
        if (!m) continue;
        const id = m[1].toUpperCase();
        if (!ID_REGEX.test(id)) continue;
        const ext = m[2].toLowerCase() === "jpeg" ? "jpg" : m[2].toLowerCase();
        const targetName = `${id}.${ext}`;
        // Remove any pre-existing file for this id (different ext)
        await removeExistingForId(id);
        const buf = await entry.buffer();
        await fsp.writeFile(path.join(PICTURES_DIR, targetName), buf);
        imported.push(id);
      }
    } catch (e) {
      console.error("Import failed:", e);
      return res.status(400).json({ error: "Invalid zip" });
    }

    // Build refreshed photos map
    const entries = await fsp.readdir(PICTURES_DIR);
    const photos = {};
    for (const name of entries) {
      const m = name.match(FILE_REGEX);
      if (!m) continue;
      const id = m[1].toUpperCase();
      if (!ID_REGEX.test(id)) continue;
      photos[id] = `/pictures/${name}`;
    }
    res.json({ imported, photos });
  });
});
```

- [ ] **Step 3: Run server and test**

```bash
node server.js &
SERVER_PID=$!
sleep 1

# Run Step 1 sequence
```

Verify expected outputs and that `evil.txt` did NOT land in `pictures/`.

- [ ] **Step 4: Cleanup, stop server, commit**

```bash
rm -rf /tmp/ziptest /tmp/test-import.zip /tmp/export.zip
kill $SERVER_PID

git add server.js
git commit -m "feat: add POST /api/import for zip extraction with whitelist"
```

---

### Task 6: Production static serving (dist + SPA fallback)

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Define expected behavior**

When `NODE_ENV=production`, the server also serves `dist/` and falls back to `dist/index.html` for any non-API, non-/pictures route.

```bash
# After `npm run build` produces dist/, then:
NODE_ENV=production node server.js &
sleep 1

curl -s http://localhost:3001/ | head -1
# Expected: starts with <!DOCTYPE or <!doctype (the SPA index)

curl -s http://localhost:3001/some/spa/route | head -1
# Expected: same SPA index (fallback)

curl -s http://localhost:3001/api/photos
# Expected: {} (API still works)
```

- [ ] **Step 2: Add prod serving block**

In `server.js`, just before the `app.listen(...)` call, add:

```js
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "dist");
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/pictures/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}
```

- [ ] **Step 3: Build and test**

```bash
cd /Users/matthis/Documents/Messier
npm run build
# Expected: dist/ directory created with index.html

NODE_ENV=production node server.js &
SERVER_PID=$!
sleep 1

curl -s http://localhost:3001/ | head -c 200
# Expected: HTML starting with <!doctype html>

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/anything
# Expected: 200

curl -s http://localhost:3001/api/photos
# Expected: {}

kill $SERVER_PID
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: serve dist and SPA fallback in production mode"
```

---

### Task 7: Vite proxy + dev scripts (`concurrently`)

**Files:**
- Modify: `vite.config.js`, `package.json`

- [ ] **Step 1: Update `vite.config.js`**

Replace the file `/Users/matthis/Documents/Messier/vite.config.js` with:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      "/api": "http://localhost:3001",
      "/pictures": "http://localhost:3001",
    },
  },
});
```

- [ ] **Step 2: Update `package.json` scripts**

Edit `/Users/matthis/Documents/Messier/package.json`. Replace the `scripts` block with:

```json
"scripts": {
  "dev:server": "node server.js",
  "dev:web": "vite --host 0.0.0.0",
  "dev": "concurrently -n server,web -c blue,green \"npm:dev:server\" \"npm:dev:web\"",
  "build": "vite build",
  "preview": "vite preview --host 0.0.0.0",
  "start": "NODE_ENV=production node server.js"
}
```

- [ ] **Step 3: Sanity check both run together**

```bash
cd /Users/matthis/Documents/Messier
npm run dev &
DEV_PID=$!
sleep 4

# Vite proxies /api to backend
curl -s http://localhost:5173/api/photos
# Expected: {}

# Direct backend access works too
curl -s http://localhost:3001/api/photos
# Expected: {}

kill $DEV_PID
# concurrently may leave child processes — make sure both die
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.js package.json
git commit -m "feat: add Vite proxy and concurrent dev scripts"
```

---

### Task 8: Frontend — load photos from `/api/photos`

**Files:**
- Modify: `index.jsx:335-350`

- [ ] **Step 1: Replace the load `useEffect`**

In `/Users/matthis/Documents/Messier/index.jsx`, replace the block from line 335 to line 350 (the `useEffect` that reads from `window.storage`) with:

```jsx
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/photos");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ph = await r.json();
        setPhotos(ph);
      } catch(e) { console.warn("Load photos:", e); }
      setLoading(false);
    })();
  }, []);
```

- [ ] **Step 2: Manual test**

```bash
cd /Users/matthis/Documents/Messier
# Pre-populate a photo via curl so we can verify the load
node server.js &
sleep 1
curl -s -X POST -F "file=@/tmp/tiny.jpg" http://localhost:3001/api/photos/M1
pkill -f "node server.js"

npm run dev &
DEV_PID=$!
sleep 4
```

Open `http://localhost:5173` in a browser:
- Expected: M1 appears as "captured" (image visible if you click on M1).
- Expected: No console errors related to `window.storage`.

```bash
kill $DEV_PID
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add index.jsx
git commit -m "refactor: load photos from /api/photos instead of window.storage"
```

---

### Task 9: Frontend — upload via fetch

**Files:**
- Modify: `index.jsx:352-366`

- [ ] **Step 1: Replace `handleUpload`**

In `index.jsx`, replace the block from line 352 to line 366 (the `handleUpload` callback) with:

```jsx
  const handleUpload = useCallback(async (file) => {
    if (!selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/photos/${selected.id}`, { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const { url } = await r.json();
      setPhotos(p => ({ ...p, [selected.id]: `${url}?t=${Date.now()}` }));
    } catch(e) {
      console.error("Upload error:", e);
      alert(`Upload échoué : ${e.message}`);
    }
    setUploading(false);
  }, [selected]);
```

- [ ] **Step 2: Manual test**

```bash
cd /Users/matthis/Documents/Messier
npm run dev &
DEV_PID=$!
sleep 4
```

In the browser at `http://localhost:5173`:
- Click on M42, upload a JPG. Expect the photo to appear immediately.
- Verify on disk: `ls /Users/matthis/Documents/Messier/pictures/` should show `M42.jpg`.
- Reload the page. M42 should still display.
- Re-upload a PNG to M42. Expect `M42.png` on disk and `M42.jpg` removed.
- Try uploading a `.txt` (rename a text file as `.jpg` won't help — change input to accept anything for the test, or use DevTools): expect alert with error message.

```bash
ls /Users/matthis/Documents/Messier/pictures/
# Expected at end: M42.png .gitkeep (or M42.jpg depending on last upload)

kill $DEV_PID
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
```

- [ ] **Step 3: Commit**

```bash
git add index.jsx
git commit -m "refactor: upload photos via /api/photos/:id POST"
```

---

### Task 10: Frontend — export/import via API (zip)

**Files:**
- Modify: `index.jsx:385-406`

- [ ] **Step 1: Replace `handleExport`**

In `index.jsx`, replace the `handleExport` function (originally lines 385-392) with:

```jsx
  const handleExport = () => {
    window.location.href = "/api/export";
  };
```

- [ ] **Step 2: Replace `handleImport`**

Replace the `handleImport` function (originally lines 394-406) with:

```jsx
  const handleImport = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/import", { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const { photos: newPhotos, imported } = await r.json();
      const busted = {};
      for (const [k, v] of Object.entries(newPhotos)) busted[k] = `${v}?t=${Date.now()}`;
      setPhotos(busted);
      alert(`${imported.length} photo(s) importée(s).`);
    } catch(err) {
      alert(`Import échoué : ${err.message}`);
    }
    e.target.value = "";
  };
```

- [ ] **Step 3: Update the import file input `accept` attribute (if present)**

Search `index.jsx` for `importRef` and the corresponding `<input type="file">`. If it has `accept="application/json"` or similar, change to `accept=".zip,application/zip"`. If no `accept` attribute, no change needed.

```bash
grep -n "importRef\|accept=" /Users/matthis/Documents/Messier/index.jsx
```

If a JSON-specific accept exists, edit it. Also update any user-facing label like "Importer JSON" to "Importer ZIP".

- [ ] **Step 4: Update the export filename label if present**

Look for any UI label mentioning "JSON" near the export button and update to "ZIP".

```bash
grep -n "JSON\|json" /Users/matthis/Documents/Messier/index.jsx
```

If found in a button label, edit accordingly.

- [ ] **Step 5: Manual test**

```bash
cd /Users/matthis/Documents/Messier
npm run dev &
DEV_PID=$!
sleep 4
```

In browser:
- Upload photos to M1 and M2.
- Click Export. Expect `messier-pictures.zip` to download containing both files.
- Delete the photos via DevTools or by removing from disk:
  ```bash
  rm pictures/M1.* pictures/M2.*
  ```
  Reload the page; both should show as not captured.
- Click Import, select the downloaded zip. Expect alert "2 photo(s) importée(s)" and both photos reappear.

```bash
kill $DEV_PID
pkill -f "node server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
```

- [ ] **Step 6: Commit**

```bash
git add index.jsx
git commit -m "refactor: export/import photos via zip API endpoints"
```

---

### Task 11: Dockerfile — prod stage runs Node

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Replace the Dockerfile**

Replace `/Users/matthis/Documents/Messier/Dockerfile` entirely with:

```dockerfile
ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:${NODE_VERSION} AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server.js package.json ./
RUN mkdir -p /app/pictures
EXPOSE 80
CMD ["node", "server.js"]
```

- [ ] **Step 2: Build dev image and test**

```bash
cd /Users/matthis/Documents/Messier
docker build --target dev -t messier:dev .
# Expected: builds without error
```

- [ ] **Step 3: Build prod image and test**

```bash
docker build --target prod -t messier:prod .
# Expected: builds without error

# Smoke test the prod container (no volume yet)
docker run --rm -d --name messier-test -p 8080:80 messier:prod
sleep 2

curl -s http://localhost:8080/api/photos
# Expected: {}

curl -s http://localhost:8080/ | head -c 100
# Expected: HTML

docker stop messier-test
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "feat: replace nginx prod stage with Node/Express server"
```

---

### Task 12: docker-compose volume + final E2E test

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update `docker-compose.yml`**

Replace `/Users/matthis/Documents/Messier/docker-compose.yml` with:

```yaml
services:
  dev:
    profiles: ["dev"]
    build:
      context: .
      target: dev
    ports:
      - "5173:5173"
      - "3001:3001"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true

  prod:
    profiles: ["prod"]
    build:
      context: .
      target: prod
    ports:
      - "8080:80"
    volumes:
      - ./pictures:/app/pictures
    restart: unless-stopped
```

- [ ] **Step 2: Test dev profile**

```bash
cd /Users/matthis/Documents/Messier
docker compose --profile dev up -d --build
sleep 8

curl -s http://localhost:5173/api/photos
# Expected: {}

curl -s http://localhost:3001/api/photos
# Expected: {}

docker compose --profile dev down
```

- [ ] **Step 3: Test prod profile with persistence**

```bash
# Make sure pictures/ is empty (just .gitkeep)
ls pictures/
# Expected: .gitkeep

docker compose --profile prod up -d --build
sleep 4

# Upload a photo
curl -s -X POST -F "file=@/tmp/tiny.jpg" http://localhost:8080/api/photos/M77
# Expected: {"id":"M77","url":"/pictures/M77.jpg"}

# File should appear on host
ls pictures/
# Expected: M77.jpg .gitkeep

# Restart container, verify persistence
docker compose --profile prod restart
sleep 4

curl -s http://localhost:8080/api/photos
# Expected: {"M77":"/pictures/M77.jpg"}

# Cleanup
curl -s -X DELETE http://localhost:8080/api/photos/M77
docker compose --profile prod down
```

- [ ] **Step 4: Final commit**

```bash
git add docker-compose.yml
git commit -m "feat: bind-mount pictures folder for persistence in prod"
```

- [ ] **Step 5: Verify final state**

```bash
git log --oneline
# Expected: ~13 commits showing each step's progress

ls pictures/
# Expected: .gitkeep (uploads are gitignored)

cat .gitignore | grep pictures
# Expected: pictures/* and !pictures/.gitkeep
```

---

## Self-review notes

**Spec coverage check:**
- Backend endpoints (GET/POST/DELETE /api/photos, GET /api/export, POST /api/import, /pictures/*) → Tasks 1, 2, 3, 4, 5
- Validation (id whitelist M1–M110, MIME whitelist, 10MB limit, ZIP path traversal protection) → Tasks 1 (regex), 2 (mime+limit), 5 (path.basename)
- Frontend rewrite (load, upload, export, import) → Tasks 8, 9, 10
- Dev setup (proxy + concurrently) → Task 7
- Prod Docker (Node serves all + volume) → Tasks 6, 11, 12
- `pictures/` exists in repo via `.gitkeep`, content gitignored → Task 0

**Type/name consistency:**
- `removeExistingForId` defined in Task 2, reused in Task 5 — same signature.
- `FILE_REGEX`, `ID_REGEX`, `ALLOWED_MIME` defined in Tasks 1–2, reused throughout.
- API URL shapes (`/pictures/<file>`) consistent in backend responses and frontend `<img>` rendering.

**No placeholders remain.**
