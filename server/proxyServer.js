const express = require("express");
const fetch = require("node-fetch");
const config = require("../config/config");
const cache = require("./cache");
const health = require("./healthCheck");

const app = express();

/**
 * /relay?url=<encoded upstream url>
 *
 * Sits between Stremio's player and the actual upstream stream URL.
 * Forwards Range headers so seeking works, retries on dropped
 * connections instead of surfacing the error straight to the player,
 * and records latency/success into the health tracker so future
 * stream ranking improves automatically.
 */
app.get("/relay", async (req, res) => {
  const upstreamUrl = req.query.url;
  const sourceId = req.query.source || "unknown";
  if (!upstreamUrl) return res.status(400).send("Missing url param");

  const MAX_RETRIES = 3;
  let lastErr;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const start = Date.now();
    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: req.headers.range ? { Range: req.headers.range } : {},
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        throw new Error(`Upstream returned ${upstreamRes.status}`);
      }

      health.record(sourceId, { ok: true, latencyMs: Date.now() - start });

      // Mirror status + relevant headers so the player's seek/range logic works.
      res.status(upstreamRes.status);
      for (const h of ["content-range", "content-length", "content-type", "accept-ranges"]) {
        const v = upstreamRes.headers.get(h);
        if (v) res.setHeader(h, v);
      }

      upstreamRes.body.pipe(res);
      return; // success — stop retry loop
    } catch (err) {
      lastErr = err;
      health.record(sourceId, { ok: false, latencyMs: Date.now() - start });
      // brief backoff before retrying
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }

  res.status(502).send(`Relay failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
});

/** Basic visibility into cache health for debugging. */
app.get("/status", (req, res) => {
  res.json({ cache: cache.stats(), uptime: process.uptime() });
});

app.listen(config.proxyServer.port, () => {
  console.log(`Nuvio+ companion server running on http://localhost:${config.proxyServer.port}`);
});
