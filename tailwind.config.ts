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
          DEFAULT: "#e8edda", // primary text + button fill
          soft: "#d7dcc8",
          dim: "#a9ae9c",
        },
        ink: "#020202", // text on bright buttons / dark text
        // Accent kept subtle for highlights only
        accent: {
          lime: "#c8f169",
          green: "#7bd88f",
        },
        // Back-compat aliases mapped onto the brand palette so legacy
        // utility classes keep rendering on-brand (monochrome cream + lime).
        neon: {
          blue: "#e8edda",
          cyan: "#c8f169",
          purple: "#7bd88f",
          violet: "#7bd88f",
          pink: "#c8f169",
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
        btn: "0 6px 20px -6px rgba(232,237,218,0.35)",
        card: "0 1px 0 0 rgba(232,237,218,0.06) inset, 0 20px 50px -25px rgba(0,0,0,0.8)",
        // legacy aliases
        neon: "0 6px 20px -6px rgba(232,237,218,0.35)",
        "neon-cyan": "0 6px 22px -6px rgba(200,241,105,0.4)",
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
