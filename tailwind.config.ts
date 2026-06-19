import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette (matches itsblobbie.com / Framer reference)
        bg: {
          DEFAULT: "#1c1d22", // page background
          soft: "#202127",
          card: "#26272e",
          elevated: "#2c2d35",
        },
        cream: {
          DEFAULT: "#e8edda", // primary body text on dark
          soft: "#d7dcc8",
          dim: "#a9ae9c",
        },
        // Sticker UI surfaces (match itsblobbie / Framer reference)
        paper: "#f8ffe8", // cream header bar / light surfaces
        butter: "#fcd535", // primary button fill (BNB gold)
        gold: "#fcd535", // brand yellow
        forest: {
          DEFAULT: "#0f2c23", // deep green sections
          soft: "#143a2e",
        },
        ink: "#0b0b0b", // text/border on light surfaces
        accent: {
          lime: "#e2fea5", // accent / primary CTA fill
          green: "#79cc9e",
        },
        // Back-compat aliases mapped onto the brand palette so legacy
        // utility classes keep rendering on-brand (cream + lime).
        neon: {
          blue: "#e8edda",
          cyan: "#e2fea5",
          purple: "#79cc9e",
          violet: "#79cc9e",
          pink: "#e2fea5",
        },
      },
      fontFamily: {
        // Bricolage Grotesque (bold italic) for normal/body text
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Dela Gothic One for bold/heading text
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(0,0,0,0.6)",
        // Hard "sticker" drop shadow used by buttons and the header bar
        sticker: "3px 4px 0 0 rgba(11,11,11,0.9)",
        "sticker-sm": "2px 3px 0 0 rgba(11,11,11,0.9)",
        card: "0 1px 0 0 rgba(232,237,218,0.06) inset, 0 20px 50px -25px rgba(0,0,0,0.8)",
        // legacy aliases
        btn: "3px 4px 0 0 rgba(11,11,11,0.9)",
        neon: "3px 4px 0 0 rgba(11,11,11,0.9)",
        "neon-cyan": "3px 4px 0 0 rgba(11,11,11,0.9)",
        glow: "0 20px 60px -20px rgba(0,0,0,0.8)",
      },
      borderRadius: {
        pill: "999px",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 50% -10%, rgba(232,237,218,0.06), transparent 55%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
