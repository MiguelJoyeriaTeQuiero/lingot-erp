/**
 * Sistema de marca Lingot — valores canónicos.
 * Cualquier cambio debe reflejarse también en globals.css y tailwind.config.ts.
 */
export const theme = {
  colors: {
    primary: "#0a3746",
    gold: "#c8a164",
    surface: "#0a3746",
    surfaceRaised: "#0d4252",
    light: "#e8edf0",
    textMuted: "#9db1bb",
    border: "#1a4f60",
    danger: "#c0534a",
    success: "#5a9f7a",
    warning: "#d4a84a",
  },
  fonts: {
    display: "Helvetica Neue, Helvetica, Arial, sans-serif",
    sans: "Open Sauce Sans",
  },
} as const;

export type Theme = typeof theme;
