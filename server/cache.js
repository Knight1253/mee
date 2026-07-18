const { LRUCache } = require("lru-cache");
const config = require("../config/config");

const streamCache = new LRUCache({
  max: config.cache.maxEntries,
  ttl: config.cache.streamTtlMs,
});

const metaCache = new LRUCache({
  max: config.cache.maxEntries,
  ttl: config.cache.metadataTtlMs,
});

function streamKey({ imdbId, season, episode }) {
  return `${imdbId}:${season ?? ""}:${episode ?? ""}`;
}

module.exports = {
  getStreams(req) {
    return streamCache.get(streamKey(req));
  },
  setStreams(req, streams) {
    streamCache.set(streamKey(req), streams);
  },
  getMeta(key) {
    return metaCache.get(key);
  },
  setMeta(key, value) {
    metaCache.set(key, value);
  },
  stats() {
    return {
      streams: { size: streamCache.size, max: streamCache.max },
      meta: { size: metaCache.size, max: metaCache.max },
    };
  },
};
