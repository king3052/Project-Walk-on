import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          panel: "rgb(var(--color-surface-panel) / <alpha-value>)",
          panelHover: "rgb(var(--color-surface-panel-hover) / <alpha-value>)",
          border: "rgb(var(--color-surface-border) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          dim: "rgb(var(--color-accent-dim) / <alpha-value>)",
          deep: "rgb(var(--color-accent-deep) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--color-warn) / <alpha-value>)",
          deep: "rgb(var(--color-warn-deep) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--color-fg) / <alpha-value>)",
          muted: "rgb(var(--color-fg-muted) / <alpha-value>)",
          dim: "rgb(var(--color-fg-dim) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
