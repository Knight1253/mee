const fetch = require("node-fetch");
const config = require("../config/config");

/**
 * Tracks a rolling score per source (resolver plugin id or host) so
 * the addon can rank streams by "known to actually work fast" rather
 * than just trusting whatever order resolvers returned them in.
 */
class HealthTracker {
  constructor() {
    this.scores = new Map(); // sourceId -> { latencyMs, successRate, samples }
  }

  record(sourceId, { ok, latencyMs }) {
    const prev = this.scores.get(sourceId) || {
      latencyMs: latencyMs ?? 1000,
      successRate: 1,
      samples: 0,
    };

    const samples = prev.samples + 1;
    // Exponential moving average — recent pings matter more than old ones.
    const alpha = 0.3;
    const successRate = prev.successRate * (1 - alpha) + (ok ? 1 : 0) * alpha;
    const newLatency = ok
      ? prev.latencyMs * (1 - alpha) + latencyMs * alpha
      : prev.latencyMs; // don't let a timeout blow up the latency average

    this.scores.set(sourceId, { latencyMs: newLatency, successRate, samples });
  }

  score(sourceId) {
    const s = this.scores.get(sourceId);
    if (!s) return 0.5; // unknown source = neutral prior
    // Higher is better: reward reliability, penalize latency.
    return s.successRate * 1000 - s.latencyMs;
  }

  /** Sort a list of streams (each with a `.source` field) best-first. */
  rank(streams) {
    return [...streams].sort((a, b) => this.score(b.source) - this.score(a.source));
  }

  async pingUrl(url) {
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: "HEAD",
        timeout: config.healthCheck.pingTimeoutMs,
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: config.healthCheck.pingTimeoutMs };
    }
  }
}

module.exports = new HealthTracker();
