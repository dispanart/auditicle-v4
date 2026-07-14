(() => {
  const storageKey = "auditicle-theme-mode";
  const legacyKey = "auditicle-theme";
  const root = document.documentElement;
  const media = window.matchMedia?.("(prefers-color-scheme: light)");

  const validModes = ["system", "dark", "light"];
  const controlSelector = "button[data-theme-mode]";

  // Membersihkan atribut yang mungkin pernah salah diterapkan ke <html>.
  root.removeAttribute("aria-pressed");
  root.classList.remove("is-active");

  const readStored = () => {
    try {
      const stored = localStorage.getItem(storageKey);

      if (validModes.includes(stored || "")) {
        return stored;
      }

      const legacy = localStorage.getItem(legacyKey);

      if (legacy === "dark" || legacy === "light") {
        return legacy;
      }
    } catch {
      // Storage dapat tidak tersedia pada mode privasi tertentu.
    }

    return "system";
  };

  const writeStored = (value) => {
    try {
      localStorage.setItem(storageKey, value);
      localStorage.removeItem(legacyKey);
    } catch {
      // Penyimpanan preferensi tema bersifat opsional.
    }
  };

  const resolvedTheme = (mode) => {
    if (mode !== "system") {
      return mode;
    }

    return media?.matches ? "light" : "dark";
  };

  const syncControls = (mode) => {
    document.querySelectorAll(controlSelector).forEach((button) => {
      const active = button.dataset.themeMode === mode;

      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
  };

  const apply = (mode, persist = true) => {
    const safeMode = validModes.includes(mode) ? mode : "system";
    const theme = resolvedTheme(safeMode);

    root.dataset.themeMode = safeMode;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    if (persist) {
      writeStored(safeMode);
    }

    const themeColor = theme === "light" ? "#f4f7fb" : "#07111f";
    const meta = document.querySelector('meta[name="theme-color"]');

    meta?.setAttribute("content", themeColor);

    syncControls(safeMode);

    window.dispatchEvent(
      new CustomEvent("auditicle-theme-change", {
        detail: {
          mode: safeMode,
          theme
        }
      })
    );
  };

  const initialMode = readStored();

  apply(initialMode, false);

  const onSystemChange = () => {
    if ((root.dataset.themeMode || "system") === "system") {
      apply("system", false);
    }
  };

  media?.addEventListener?.("change", onSystemChange);

  window.auditicleTheme = {
    setMode(mode) {
      apply(mode);
    },

    getMode() {
      return root.dataset.themeMode || "system";
    },

    getTheme() {
      return root.dataset.theme || resolvedTheme("system");
    }
  };

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest(controlSelector);

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const mode = button.dataset.themeMode;

    if (mode && validModes.includes(mode)) {
      apply(mode);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    syncControls(root.dataset.themeMode || initialMode);
  });
})();
