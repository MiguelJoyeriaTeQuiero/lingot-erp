import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          soft: "var(--color-primary-soft)",
          deep: "var(--color-primary-deep)",
        },
        gold: {
          DEFAULT: "var(--color-gold)",
          soft: "var(--color-gold-soft)",
          deep: "var(--color-gold-deep)",
        },
        ink: "var(--color-ink)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-sunken": "var(--color-surface-sunken)",
        elevated: "var(--color-elevated)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-dim": "var(--color-text-dim)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        hairline: "var(--color-hairline)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        editorial: [
          "var(--font-display)",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "var(--font-display)",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
      },
      boxShadow: {
        editorial:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 32px -16px rgba(10,37,48,0.18)",
        vault:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 30px 60px -30px rgba(10,37,48,0.25), 0 0 0 1px rgba(184,138,61,0.12)",
        glow: "0 0 0 1px rgba(184,138,61,0.4), 0 12px 30px -12px rgba(184,138,61,0.3)",
        paper:
          "0 1px 2px rgba(10,37,48,0.04), 0 4px 12px -4px rgba(10,37,48,0.06)",
      },
      letterSpacing: {
        editorial: "-0.02em",
        wider: "0.04em",
        widest: "0.18em",
        ultra: "0.28em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
