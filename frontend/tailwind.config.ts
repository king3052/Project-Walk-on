import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          bg: "#0B0D10",
          panel: "#15181C",
          panelLight: "#1D2126",
          line: "#2A2F36",
        },
        hardwood: {
          DEFAULT: "#C77B3F",
          light: "#E0A467",
        },
        scoreboard: {
          red: "#E4572E",
          green: "#4CA771",
        },
        chalk: {
          DEFAULT: "#F2F0EA",
          muted: "#9096A0",
          dim: "#5B616B",
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
