/**
 * Template resolver plugin. Copy this file to add a new source.
 *
 * This one is intentionally a no-op stub — wire `resolve()` up to
 * whatever legal source you control (your own media server, a
 * licensed catalog API, a self-hosted Jellyfin/Plex library exposed
 * over HTTP, etc). The registry doesn't care what's behind it as
 * long as it returns direct, range-request-capable URLs.
 */
module.exports = {
  id: "example",
  enabled: false, // flip on once resolve() is implemented

  async resolve({ imdbId, type, season, episode }) {
    // Example shape of a real implementation:
    //
    // const res = await fetch(`https://your-media-server/api/lookup?imdb=${imdbId}`);
    // const data = await res.json();
    // return data.items.map(item => ({
    //   url: item.directUrl,
    //   quality: item.quality,        // '1080p', '4K', etc
    //   sizeBytes: item.size,
    // }));

    return [];
  },
};
