const config = require("../config/config");
const { unrestrictLink, isCached } = require("../server/debrid");

/**
 * Debrid-backed resolver. This does NOT search for torrents itself —
 * it takes hashes/magnets from an upstream index you already trust
 * (e.g. a catalog you maintain, or another addon's stream list you're
 * re-processing) and converts them into fast direct-download URLs
 * via your debrid account. That conversion is what actually fixes
 * buffering/slow-start, since debrid links support proper HTTP range
 * requests and are served from the provider's own high-bandwidth CDN.
 *
 * Plug your magnet/hash source into `getCandidateHashes()`.
 */
module.exports = {
  id: "debrid",
  enabled: !!config.debrid.apiKey,

  async getCandidateHashes({ imdbId, type, season, episode }) {
    // Replace with your own index/catalog lookup returning
    // an array of { hash, title, quality, sizeBytes }.
    return [];
  },

  async resolve(request) {
    if (!config.debrid.apiKey) return [];

    const candidates = await this.getCandidateHashes(request);
    if (!candidates.length) return [];

    // Only bother unrestricting links that are already cached on the
    // debrid provider's servers — those start playing near-instantly.
    // Uncached ones would need to be queued for download first.
    const cached = [];
    for (const c of candidates) {
      if (await isCached(c.hash)) cached.push(c);
    }

    const resolved = await Promise.all(
      cached.map(async (c) => {
        const directUrl = await unrestrictLink(c.hash);
        if (!directUrl) return null;
        return {
          url: directUrl,
          quality: c.quality || "unknown",
          sizeBytes: c.sizeBytes,
        };
      })
    );

    return resolved.filter(Boolean);
  },
};
