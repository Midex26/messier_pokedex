# Upload des photos vers un dossier `pictures/` sur disque

**Date** : 2026-05-10
**Statut** : Design approuvé, prêt pour plan d'implémentation

## Contexte

L'app Messier est actuellement une SPA Vite/React 100% frontend. Les photos uploadées sont stockées en base64 (data URL) dans `window.storage`, une API key-value côté client. Limites :

- Quota du KV store atteint rapidement (110 objets × photos pleine résolution).
- Les images vivent dans le navigateur, impossibles à manipuler hors de l'app (backup, partage, post-traitement).
- L'expansion base64 (~33%) gonfle le stockage.

## Objectif

Stocker les photos comme des fichiers image réels dans un dossier `pictures/` à la racine du projet, persisté en dev local et en prod Docker.

## Architecture

Ajout d'un backend Node/Express minimal qui sert l'API d'upload et les fichiers statiques. Le frontend remplace les appels `window.storage` par des appels `fetch` vers cette API.

```
┌──────────────────┐         ┌────────────────────────────┐
│  React (Vite)    │ fetch   │  Express (server.js)       │
│  index.jsx       ├────────►│                            │
│                  │         │  GET    /api/photos        │
│  <img src=       │         │  POST   /api/photos/:id    │
│   "/pictures/    │         │  DELETE /api/photos/:id    │
│    M31.jpg">     │         │  GET    /api/export  (zip) │
│                  │◄────────┤  POST   /api/import  (zip) │
└──────────────────┘  static │  GET    /pictures/*        │
                             └─────────────┬──────────────┘
                                           │ fs read/write
                                   ┌───────▼─────────┐
                                   │  pictures/      │
                                   │   M31.jpg       │
                                   │   M42.png       │
                                   │   ...           │
                                   └─────────────────┘
```

### Composants

#### 1. `server.js` (nouveau, ~120 lignes)

Express app, port 3001 en dev, 80 en prod.

**Endpoints :**

| Méthode | Route                | Body                | Réponse                                         |
|---------|----------------------|---------------------|-------------------------------------------------|
| GET     | `/api/photos`        | —                   | `{ M31: "/pictures/M31.jpg", ... }`             |
| POST    | `/api/photos/:id`    | multipart `file`    | `{ id, url }` ou 4xx                            |
| DELETE  | `/api/photos/:id`    | —                   | `204` ou `404`                                  |
| GET     | `/api/export`        | —                   | stream `application/zip`, filename `messier-pictures.zip` |
| POST    | `/api/import`        | multipart `file` (zip) | `{ imported: [...ids], photos: {...} }`     |
| GET     | `/pictures/*`        | —                   | fichier statique                                |
| GET     | `/*` (prod uniquement) | —                 | `dist/index.html` (fallback SPA)                |

**Logique upload (`POST /api/photos/:id`) :**
1. Valider `id` contre `^M([1-9]|[1-9][0-9]|10[0-9]|110)$` (M1–M110).
2. Valider MIME du fichier dans `["image/jpeg", "image/png", "image/webp"]`.
3. Limite taille : 10 MB (configuré dans multer).
4. Déterminer extension cible : `jpg|png|webp` selon le MIME.
5. Avant écriture, supprimer toute version existante `pictures/<id>.{jpg,jpeg,png,webp}` (gère le changement d'extension).
6. Écrire `pictures/<id>.<ext>`.
7. Retourner `{ id, url: "/pictures/<id>.<ext>" }`.

**Logique listing (`GET /api/photos`) :**
- `fs.readdir("pictures/")`.
- Filtrer fichiers matchant `^(M\d{1,3})\.(jpg|jpeg|png|webp)$`.
- Construire map `{ id: "/pictures/<filename>" }`.

**Logique export (`GET /api/export`) :**
- Utilise `archiver` (zip stream).
- Pipe vers la réponse avec headers appropriés.

**Logique import (`POST /api/import`) :**
- Reçoit un .zip via multer (en mémoire ou tmp).
- Utilise `unzipper.Open.buffer(...)`.
- Pour chaque entrée :
  - Prendre le `basename` uniquement (pas de chemin) pour éviter path traversal.
  - Filtrer contre `^M\d{1,3}\.(jpg|jpeg|png|webp)$`.
  - Valider que l'ID est dans la plage M1–M110.
  - Écrire dans `pictures/`, écraser si existe.
- Retourner la liste des IDs importés et le nouveau map photos.

#### 2. `index.jsx` (modifié)

**Suppressions :**
- Boucle `window.storage.list/get` au load.
- `window.storage.set` dans `handleUpload`.
- `window.storage.set` dans `handleImport`.
- Construction des data URL via `FileReader`.

**Ajouts :**
- `useEffect` initial : `fetch('/api/photos').then(r => r.json()).then(setPhotos)`.
- `handleUpload` : envoie `FormData` avec champ `file`, méthode POST. Sur succès, `setPhotos(p => ({ ...p, [id]: url + "?t=" + Date.now() }))` (cache-bust pour réupload).
- `handleExport` : `window.location.href = '/api/export'` (download direct).
- `handleImport` : envoie le zip en `FormData` à `/api/import`, met à jour `photos` depuis la réponse.
- `<img>` : `src={photos[id]}` (URL relative `/pictures/...`).

#### 3. `vite.config.js` (modifié)

Ajouter dans `server` :
```js
proxy: {
  '/api': 'http://localhost:3001',
  '/pictures': 'http://localhost:3001'
}
```

#### 4. `package.json` (modifié)

**Nouvelles deps :**
- `express`
- `multer` (upload multipart)
- `archiver` (zip out)
- `unzipper` (zip in)

**Nouvelle devDep :**
- `concurrently`

**Scripts mis à jour :**
```json
{
  "dev:server": "node server.js",
  "dev:web": "vite --host 0.0.0.0",
  "dev": "concurrently -n server,web -c blue,green \"npm:dev:server\" \"npm:dev:web\"",
  "build": "vite build",
  "start": "NODE_ENV=production node server.js"
}
```

#### 5. `Dockerfile` (modifié)

Le stage `prod` change radicalement : plus de nginx, c'est Node qui sert tout.

```dockerfile
FROM node:${NODE_VERSION} AS prod
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server.js package.json ./
ENV NODE_ENV=production
ENV PORT=80
EXPOSE 80
CMD ["node", "server.js"]
```

Le stage `build` reste identique. Le stage `dev` reste identique (mais `npm run dev` lance maintenant les deux process via concurrently).

#### 6. `docker-compose.yml` (modifié)

Service `prod` : ajout d'un volume pour persister `pictures/` :
```yaml
prod:
  volumes:
    - ./pictures:/app/pictures
```

Service `dev` : déjà couvert par le bind mount existant `.:/app` (le dossier `pictures/` du host est donc automatiquement synchronisé). Aucun ajout requis.

#### 7. `.gitignore` (nouveau ou modifié)

```
pictures/*
!pictures/.gitkeep
```

Le dossier existe en repo (via `.gitkeep`) mais son contenu n'est pas tracké.

#### 8. `.dockerignore` (modifié)

Vérifier que `pictures/` n'est pas exclu (pour Docker dev qui copie tout). Pour le stage `prod`, on ne `COPY` que ce qui est nécessaire (dist, server.js, deps), donc pictures vient uniquement du volume.

## Flux de données

### Upload
```
User select file
  → handleUpload(file)
  → FormData { file }
  → POST /api/photos/M31
  → multer parse → server validates id+mime
  → fs.unlink old extensions
  → fs.writeFile pictures/M31.jpg
  → response { id: "M31", url: "/pictures/M31.jpg" }
  → setPhotos updates state with cache-busted url
  → <img> re-renders
```

### Load au démarrage
```
App mount
  → fetch /api/photos
  → server fs.readdir pictures/
  → filtre regex
  → response { M1: "/pictures/M1.png", M31: "/pictures/M31.jpg", ... }
  → setPhotos
```

### Export
```
User clicks Export
  → window.location = /api/export
  → server creates archiver zip stream
  → pipes pictures/* into zip
  → response Content-Disposition: attachment; filename="messier-pictures.zip"
  → browser downloads
```

### Import
```
User selects .zip
  → handleImport
  → FormData { file: zip }
  → POST /api/import
  → server multer (memory)
  → unzipper.Open.buffer
  → for each entry: validate basename, write to pictures/
  → response { imported: [...], photos: {...} }
  → setPhotos with new map
```

## Gestion d'erreurs

| Cas                                  | Réponse serveur                | Comportement frontend                       |
|--------------------------------------|--------------------------------|---------------------------------------------|
| ID invalide (pas M1–M110)            | 400 `{ error: "Invalid id" }`  | `alert("ID invalide")`, garde état précédent |
| MIME non-image / extension non whitelistée | 400 `{ error: "Invalid file type" }` | `alert("Format non supporté (jpg/png/webp)")` |
| Fichier > 10 MB                      | 413                            | `alert("Fichier trop gros (max 10 MB)")`    |
| Erreur disque                        | 500                            | `alert("Erreur serveur")` + console.error   |
| ZIP malformé                         | 400                            | `alert("ZIP invalide")`                     |
| `pictures/` inexistant au boot       | server crée le dossier         | n/a                                         |

## Sécurité

- Whitelist stricte des IDs (regex M1–M110) côté serveur.
- Whitelist stricte des extensions/MIME.
- Limite taille upload (10 MB).
- Import ZIP : `path.basename()` sur chaque entry pour empêcher `../../etc/passwd`.
- CORS : non requis (même origine via proxy en dev, même origine native en prod).
- Pas d'auth : single-user app locale, pas de surface d'attaque réseau prévue.

## Tests

Pas de framework de test actuellement. Validation manuelle via :

1. Dev local : `npm run dev`, upload une photo sur M31, vérifier `pictures/M31.jpg` apparaît sur disque.
2. Re-upload sur M31 avec un PNG : vérifier que `M31.jpg` est supprimé et `M31.png` créé.
3. Reload navigateur : la photo réapparaît (chargée depuis `/api/photos`).
4. Export ZIP : télécharge un zip contenant les photos.
5. Import ZIP : un nouveau zip peuple `pictures/` et l'UI se met à jour.
6. Docker prod : `docker compose up`, mêmes tests, vérifier persistance après `docker compose restart`.

## Hors scope

- Migration des photos existantes dans `window.storage`. L'utilisateur repart à zéro.
- Auth/multi-utilisateur.
- Compression côté serveur, génération de thumbnails.
- Tests automatisés (à introduire dans une itération future).
