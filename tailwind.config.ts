import type { Config } from "tailwindcss";

/**
 * Design direction (spec Part 7 + ui-ux-pro-max "Micro-interactions" system):
 * dark-first, high-contrast, gym-legible. Layered near-black surfaces, a single
 * hardwood-amber accent, an electric-blue used ONLY for the comparison series,
 * and a bold condensed display face for the archetype-reveal moment.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        court: {
          950: "#08080a",
          900: "#0e0e11",
          850: "#141418",
          800: "#1a1a20",
          700: "#26262e",
          600: "#34343e",
          500: "#4a4a56",
          400: "#6b6b78",
        },
        amber: {
          DEFAULT: "#f5a524",
          300: "#ffc55c",
          400: "#ffb43a",
          500: "#f5a524",
          600: "#d4881a",
          700: "#a86610",
        },
        electric: {
          DEFAULT: "#4c9ffe",
          400: "#5aa8ff",
          500: "#4c9ffe",
        },
        readiness: {
          green: "#34d399",
          yellow: "#fbbf24",
          red: "#f87171",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Anton", "Inter", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.7)",
        glow: "0 0 60px -12px rgba(245,165,36,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "60%": { opacity: "1", transform: "scale(1.015)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "ring-draw": {
          "0%": { strokeDashoffset: "var(--circumference)" },
          "100%": { strokeDashoffset: "var(--dashoffset)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        // springy, slightly-overshooting entrances for a livelier feel
        "fade-up": "fade-up 0.55s cubic-bezier(0.34, 1.28, 0.64, 1) both",
        "scale-in": "scale-in 0.6s cubic-bezier(0.34, 1.4, 0.5, 1) both",
        "ring-draw": "ring-draw 1.3s cubic-bezier(0.34, 1.1, 0.5, 1) 0.25s both",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
