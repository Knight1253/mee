const fetch = require("node-fetch");
const config = require("../config/config");

// Minimal Real-Debrid style wrapper. Swap base URL / endpoints if using
// AllDebrid or Premiumize instead — the shape of unrestrictLink/isCached
// is what the rest of the app depends on, so keep those signatures.
const BASE_URL = "https://api.real-debrid.com/rest/1.0";

async function isCached(hash) {
  if (!config.debrid.apiKey) return false;
  try {
    const res = await fetch(
      `${BASE_URL}/torrents/instantAvailability/${hash}`,
      { headers: { Authorization: `Bearer ${config.debrid.apiKey}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const entry = data[hash];
    return !!(entry && Object.keys(entry).length > 0);
  } catch {
    return false;
  }
}

async function unrestrictLink(hashOrLink) {
  if (!config.debrid.apiKey) return null;
  try {
    // Real flow: add magnet -> select files -> poll status -> unrestrict.
    // Collapsed here for brevity; implement the multi-step flow against
    // your provider's actual docs.
    const res = await fetch(`${BASE_URL}/unrestrict/link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.debrid.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `link=${encodeURIComponent(hashOrLink)}`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.download || null;
  } catch {
    return null;
  }
}

module.exports = { isCached, unrestrictLink };
