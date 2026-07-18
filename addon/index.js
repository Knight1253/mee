const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const config = require("../config/config");
const registry = require("../resolvers/registry");
const cache = require("../server/cache");
const health = require("../server/healthCheck");

// Register your resolver plugins here.
registry.register(require("../resolvers/exampleResolver"));
registry.register(require("../resolvers/debridResolver"));

const manifest = {
  id: config.addon.id,
  version: config.addon.version,
  name: config.addon.name,
  description:
    "Performance-focused Stremio addon: parallel source resolution, health-scored ranking, and a local relay for smoother playback.",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"], // IMDb ids
  catalogs: [],
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  const [imdbId, season, episode] = id.split(":");
  const request = {
    imdbId,
    type,
    season: season ? Number(season) : undefined,
    episode: episode ? Number(episode) : undefined,
  };

  // 1. Serve from cache if we resolved this recently.
  const cached = cache.getStreams(request);
  if (cached) {
    return { streams: toStremioStreams(cached) };
  }

  // 2. Otherwise run all resolver plugins in parallel with timeouts.
  const { streams } = await registry.resolveAll(request);

  // 3. Rank by known source reliability/speed, not just plugin order.
  const ranked = health.rank(streams);

  cache.setStreams(request, ranked);

  // 4. Optionally kick off prefetch for the next episode (fire-and-forget).
  if (config.prefetch.enabled && type === "series" && request.episode) {
    const nextReq = { ...request, episode: request.episode + config.prefetch.nextEpisodeLookahead };
    if (!cache.getStreams(nextReq)) {
      registry.resolveAll(nextReq).then((r) => cache.setStreams(nextReq, health.rank(r.streams)));
    }
  }

  return { streams: toStremioStreams(ranked) };
});

/** Wraps each resolved stream so it plays through the local relay
 *  (buffering/retry protection) instead of hitting upstream directly. */
function toStremioStreams(streams) {
  return streams.map((s) => ({
    name: `Nuvio+ ${s.quality || ""}`.trim(),
    title: `${s.source} • ${s.quality || "unknown"}${s.sizeBytes ? ` • ${(s.sizeBytes / 1e9).toFixed(1)}GB` : ""}`,
    url: `http://localhost:${config.proxyServer.port}/relay?source=${encodeURIComponent(
      s.source
    )}&url=${encodeURIComponent(s.url)}`,
  }));
}

serveHTTP(builder.getInterface(), { port: config.addon.port });
console.log(`Nuvio+ addon running on http://localhost:${config.addon.port}/manifest.json`);
