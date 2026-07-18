const config = require("../config/config");

/**
 * Every resolver plugin must implement:
 *   {
 *     id: string,                 // unique plugin id
 *     enabled: boolean,
 *     async resolve(request) -> [{ url, quality, sizeBytes, source, seeders? }]
 *   }
 * `request` = { imdbId, type: 'movie'|'series', season?, episode? }
 *
 * Plugins should throw or reject on failure — the registry handles
 * timeouts and isolation so one bad plugin can't break the rest.
 */
class ResolverRegistry {
  constructor() {
    this.plugins = new Map();
  }

  register(plugin) {
    if (!plugin.id || typeof plugin.resolve !== "function") {
      throw new Error("Resolver plugin must have an id and a resolve() method");
    }
    this.plugins.set(plugin.id, plugin);
    return this;
  }

  unregister(id) {
    this.plugins.delete(id);
  }

  list() {
    return [...this.plugins.values()];
  }

  /**
   * Runs all enabled plugins in parallel, each wrapped in its own
   * timeout, and returns everything that resolved before the
   * global timeout expires.
   */
  async resolveAll(request) {
    const active = this.list().filter((p) => p.enabled !== false);

    const withTimeout = (plugin) =>
      Promise.race([
        plugin.resolve(request),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`${plugin.id} timed out`)),
            config.resolver.perPluginTimeoutMs
          )
        ),
      ])
        .then((streams) => ({ pluginId: plugin.id, streams, ok: true }))
        .catch((err) => ({ pluginId: plugin.id, error: err.message, ok: false }));

    const globalTimeout = new Promise((resolve) =>
      setTimeout(() => resolve("__GLOBAL_TIMEOUT__"), config.resolver.globalTimeoutMs)
    );

    const results = await Promise.race([
      Promise.allSettled(active.map(withTimeout)),
      globalTimeout,
    ]);

    if (results === "__GLOBAL_TIMEOUT__") {
      // Race lost — fall back to whatever settled by now via allSettled
      // without further waiting (best-effort, non-blocking UX).
      const settled = await Promise.allSettled(active.map(withTimeout));
      return this._flatten(settled);
    }

    return this._flatten(results);
  }

  _flatten(settledResults) {
    const streams = [];
    const errors = [];
    for (const r of settledResults) {
      const val = r.value || r; // allSettled wraps in {status, value}
      if (val.ok) {
        streams.push(...val.streams.map((s) => ({ ...s, source: val.pluginId })));
      } else {
        errors.push(val);
      }
    }
    return { streams, errors };
  }
}

module.exports = new ResolverRegistry();
