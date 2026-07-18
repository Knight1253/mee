# Nuvio+

A performance-focused Stremio addon plus a local companion server, built to make
stream startup and playback smoother rather than to add new sources.

**Important:** this scaffold ships with no scrapers or piracy-source plugins.
`resolvers/exampleResolver.js` and `resolvers/debridResolver.js` are stubs —
you wire them up to sources you actually have rights to use (a self-hosted
media server, a licensed catalog API, or your own debrid account).

## Why this makes streams smoother

The three biggest causes of choppy Stremio playback, and how this addresses them:

| Problem | Fix here |
|---|---|
| Slow/dead sources block the whole stream list | `resolvers/registry.js` runs all plugins in parallel with per-plugin + global timeouts |
| Buffering / dropped connections mid-playback | `server/proxyServer.js` relays the stream, retries failed reads, and forwards `Range` headers so seeking still works |
| Same title resolved from scratch every time | `server/cache.js` LRU-caches resolved URLs (TTL'd, since direct links expire) |
| No way to know which source is actually fast | `server/healthCheck.js` scores sources by rolling latency/success rate and ranks streams accordingly |
| Waiting on next episode to resolve | Optional background prefetch in `addon/index.js` |

## Setup

```bash
npm install
npm run server   # starts the local relay/proxy on :7788
npm start         # starts the addon on :7000
```

Then add `http://localhost:7000/manifest.json` in Stremio's addon search bar.

## Adding a source

1. Copy `resolvers/exampleResolver.js` to a new file.
2. Implement `resolve({ imdbId, type, season, episode })` to return
   `[{ url, quality, sizeBytes }]`.
3. Register it in `addon/index.js`:
   ```js
   registry.register(require("../resolvers/yourResolver"));
   ```

## Debrid setup (recommended for smoothness)

Debrid services turn magnet/hash links into direct HTTP URLs with proper
range-request support — this is usually the single biggest win for playback
smoothness on torrent-based content.

```bash
export DEBRID_PROVIDER=realdebrid
export DEBRID_API_KEY=your_key_here
```

Then implement `getCandidateHashes()` in `resolvers/debridResolver.js` to
point at whatever index/catalog you already trust for hashes.

## Tuning

All timeouts, cache TTLs, and health-check intervals live in `config/config.js`.

## Pushing this to GitHub

From inside the extracted `nuvio-plus/` folder:

```bash
git init
git add .
git commit -m "Initial commit: Nuvio+ addon scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/` and `.env`, so your debrid API
key won't get committed. Copy `.env.example` to `.env` locally and fill in
your real key — GitHub only ever sees the example file.

## Running it from a GitHub clone

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env   # then edit .env with your real DEBRID_API_KEY
npm run server          # companion relay on :7788
npm start                # addon on :7000
```

### Deploying so Stremio can reach it remotely

Running locally only works while your machine is on and Stremio is on the
same network. To use this addon from anywhere:

- Host `addon/index.js` on a small VPS or a platform like Render/Railway/Fly.io
  (Node.js apps deploy directly from a GitHub repo on all three).
- The companion server (`server/proxyServer.js`) should run on the **same**
  host as the addon, since the addon hardcodes `localhost:7788` for the relay
  URL — update `config/config.js` to point at the deployed relay's public
  URL/port if you split them onto different hosts.
- Add `http://<your-deployed-domain>/manifest.json` in Stremio instead of
  `localhost`.

