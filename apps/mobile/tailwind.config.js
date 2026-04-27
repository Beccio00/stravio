/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark athletic baseline
        background: "#0b1220",
        surface: "#121b2e",
        "surface-light": "#1a2740",
        "surface-muted": "#0f1728",

        // Action roles
        "action-primary": "#3b82f6",
        "action-primary-press": "#2563eb",
        "action-secondary": "#1f2b44",
        "action-secondary-press": "#2a3b5f",
        emphasis: "#22c55e",
        danger: "#ef4444",

        // Legacy aliases kept for incremental migration
        primary: "#3b82f6",
        "primary-light": "#60a5fa",
        accent: "#22c55e",

        // Typography and chrome
        "text-primary": "#f8fafc",
        "text-secondary": "#c0c9d8",
        "text-muted": "#7c8aa5",
        border: "#24324a",
        "tab-active": "#3b82f6",
        "tab-inactive": "#7c8aa5",
      },
    },
  },
  plugins: [],
};
