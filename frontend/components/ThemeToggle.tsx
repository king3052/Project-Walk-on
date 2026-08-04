"use client";

import { useEffect, useState } from "react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  function onToggle(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onToggle("dark")}
        className={`text-sm px-4 py-2 rounded-md border transition-colors ${
          theme === "dark"
            ? "border-accent text-accent bg-accent/10"
            : "border-surface-border text-fg-dim hover:text-fg-muted"
        }`}
      >
        Dark
      </button>
      <button
        onClick={() => onToggle("light")}
        className={`text-sm px-4 py-2 rounded-md border transition-colors ${
          theme === "light"
            ? "border-accent text-accent bg-accent/10"
            : "border-surface-border text-fg-dim hover:text-fg-muted"
        }`}
      >
        Light
      </button>
    </div>
  );
}
