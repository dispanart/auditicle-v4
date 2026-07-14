(() => {
  const target = document.getElementById("system-status");
  if (!target) return;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  Promise.all([
    fetch("/api/health", { headers: { Accept: "application/json" } }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Health HTTP ${response.status}`))),
    fetch("/api/public-config", { headers: { Accept: "application/json" } }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Config HTTP ${response.status}`)))
  ]).then(([health, config]) => {
    const providers = Array.isArray(config.aiProviders) && config.aiProviders.length ? config.aiProviders.join(", ") : "No external provider configured; deterministic report fallback remains available";
    target.innerHTML = `<div class="status-line"><span class="status-dot ok"></span><div><strong>Worker operational</strong><small>Health endpoint responded successfully.</small></div></div>
      <dl class="status-grid">
        <div><dt>Version</dt><dd>${escapeHtml(health.version)}</dd></div>
        <div><dt>Architecture</dt><dd>${escapeHtml(health.architecture)}</dd></div>
        <div><dt>Rendered browser</dt><dd>${health.renderedBrowser ? "Enabled" : "Disabled"}</dd></div>
        <div><dt>PageSpeed integration</dt><dd>${config.pageSpeedEnabled ? "Available" : "Disabled"}</dd></div>
        <div><dt>External AI providers</dt><dd>${escapeHtml(providers)}</dd></div>
        <div><dt>Deterministic narrative fallback</dt><dd>${config.deterministicNarrativeAvailable ? "Available" : "Unavailable"}</dd></div>
        <div><dt>Turnstile</dt><dd>${config.turnstileRequired ? "Required" : "Optional / disabled"}</dd></div>
        <div><dt>Daily audit limit</dt><dd>${escapeHtml(config.dailyAuditLimit)}</dd></div>
        <div><dt>Link validation limit</dt><dd>${escapeHtml(config.maxLinks)} selected links</dd></div>
      </dl>`;
  }).catch((error) => {
    target.innerHTML = `<div class="status-line"><span class="status-dot error"></span><div><strong>Deployment check unavailable</strong><small>${escapeHtml(error.message || "The status endpoints did not respond.")}</small></div></div>`;
  });
})();
