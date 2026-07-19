import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0A0A0A",
          panel: "#141414",
          panelHover: "#1A1A1A",
          border: "#242424",
        },
        accent: {
          DEFAULT: "#4ADE80",
          dim: "#22C55E",
          deep: "#052E16",
        },
        warn: {
          DEFAULT: "#F87171",
          deep: "#450A0A",
        },
        fg: {
          DEFAULT: "#F4F4F5",
          muted: "#A1A1AA",
          dim: "#6B6B70",
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
