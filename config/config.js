// Central config — tune these to trade off speed vs. thoroughness.
module.exports = {
  addon: {
    port: 7000,
    id: "org.nuvioplus.addon",
    name: "Nuvio+",
    version: "0.1.0",
  },

  proxyServer: {
    port: 7788, // local companion server (addon talks to this)
  },

  resolver: {
    // Max time (ms) to wait for ALL resolver plugins before returning
    // whatever has come back so far. Keeps Stremio's UI from hanging
    // on one slow/dead source.
    globalTimeoutMs: 6000,
    // Per-plugin timeout — a single slow plugin gets cut off individually
    perPluginTimeoutMs: 4000,
  },

  cache: {
    // Resolved stream URLs (direct links expire, keep TTL short-ish)
    streamTtlMs: 1000 * 60 * 20, // 20 min
    metadataTtlMs: 1000 * 60 * 60 * 6, // 6 hr
    maxEntries: 500,
  },

  healthCheck: {
    intervalMs: 1000 * 60 * 5, // re-score sources every 5 min
    pingTimeoutMs: 3000,
  },

  prefetch: {
    enabled: true,
    // when playback starts on episode N, resolve N+1 in background
    nextEpisodeLookahead: 1,
  },

  debrid: {
    // Fill in with your own account credentials via env vars.
    // Debrid services convert magnet/torrent links into direct,
    // range-request-friendly HTTP URLs — this is usually the single
    // biggest smoothness win.
    provider: process.env.DEBRID_PROVIDER || null, // 'realdebrid' | 'alldebrid' | 'premiumize'
    apiKey: process.env.DEBRID_API_KEY || null,
  },
};
