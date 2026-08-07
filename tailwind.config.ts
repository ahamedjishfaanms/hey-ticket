import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14151A",
        paper: "#FBF7EF",
        stub: {
          50: "#FFF7E8",
          100: "#FFE9BE",
          400: "#F6A614",
          500: "#EF8B0C",
          600: "#C96A05",
        },
        cord: "#3B6E5C",
        rose: "#D64550",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        perforate:
          "radial-gradient(circle, transparent 6px, currentColor 6.5px)",
      },
    },
  },
  plugins: [],
};
export default config;
