(() => {
  const storageKey = "auditicle-theme-mode";
  const legacyKey = "auditicle-theme";
  const root = document.documentElement;
  const media = window.matchMedia?.("(prefers-color-scheme: light)");

  const readStored = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (["system", "dark", "light"].includes(stored || "")) return stored;
      const legacy = localStorage.getItem(legacyKey);
      if (legacy === "dark" || legacy === "light") return legacy;
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    return "system";
  };

  const writeStored = (value) => {
    try {
      localStorage.setItem(storageKey, value);
      localStorage.removeItem(legacyKey);
    } catch {
      // Theme persistence is optional.
    }
  };

  const resolvedTheme = (mode) => mode === "system" ? (media?.matches ? "light" : "dark") : mode;

  const syncControls = (mode) => {
    document.querySelectorAll("[data-theme-mode]").forEach((button) => {
      const active = button.getAttribute("data-theme-mode") === mode;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("is-active", active);
    });
  };

  const apply = (mode, persist = true) => {
    const safeMode = ["system", "dark", "light"].includes(mode) ? mode : "system";
    const theme = resolvedTheme(safeMode);
    root.dataset.themeMode = safeMode;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (persist) writeStored(safeMode);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "light" ? "#f4f7fb" : "#07111f");
    syncControls(safeMode);
    window.dispatchEvent(new CustomEvent("auditicle-theme-change", { detail: { mode: safeMode, theme } }));
  };

  const initialMode = readStored();
  apply(initialMode, false);

  const onSystemChange = () => {
    if ((root.dataset.themeMode || "system") === "system") apply("system", false);
  };
  media?.addEventListener?.("change", onSystemChange);

  window.auditicleTheme = {
    setMode(mode) { apply(mode); },
    getMode() { return root.dataset.themeMode || "system"; },
    getTheme() { return root.dataset.theme || resolvedTheme("system"); }
  };

  document.addEventListener("click", (event) => {
    const node = event.target;
    const button = node instanceof Element ? node.closest("[data-theme-mode]") : null;
    if (!button) return;
    const mode = button.getAttribute("data-theme-mode");
    if (mode) apply(mode);
  });

  document.addEventListener("DOMContentLoaded", () => syncControls(root.dataset.themeMode || initialMode));
})();
