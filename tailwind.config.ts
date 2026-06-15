import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#05060f",
          soft: "#0a0c1c",
          card: "#0d1126",
          elevated: "#11162e",
        },
        neon: {
          blue: "#3b82f6",
          cyan: "#22d3ee",
          purple: "#a855f7",
          violet: "#8b5cf6",
          pink: "#ec4899",
        },
        brand: {
          DEFAULT: "#6d5efc",
          accent: "#22d3ee",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 25px -5px rgba(99,102,241,0.55)",
        "neon-cyan": "0 0 25px -5px rgba(34,211,238,0.55)",
        glow: "0 0 60px -15px rgba(139,92,246,0.45)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(34,211,238,0.14), transparent 35%), radial-gradient(circle at 50% 100%, rgba(168,85,247,0.16), transparent 45%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
