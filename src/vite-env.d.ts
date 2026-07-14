/// <reference types="vite/client" />

interface Window {
  auditicleTheme?: {
    setMode: (mode: "system" | "dark" | "light") => void;
    getMode: () => string;
    getTheme: () => string;
  };
  turnstile?: {
    render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId: string) => void;
  };
}
