/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Themeable tokens — resolved via CSS variables
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-light": "var(--color-surface-light)",
        "surface-muted": "var(--color-surface-muted)",

        // Action roles — fixed across themes
        "action-primary": "#3b82f6",
        "action-primary-press": "#2563eb",
        "action-secondary": "var(--color-action-secondary)",
        "action-secondary-press": "var(--color-action-secondary-press)",
        emphasis: "#22c55e",
        danger: "#ef4444",

        // Legacy aliases kept for incremental migration
        primary: "#3b82f6",
        "primary-light": "#60a5fa",
        accent: "#22c55e",

        // Typography and chrome — themeable
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        border: "var(--color-border)",
        "tab-active": "#3b82f6",
        "tab-inactive": "#7c8aa5",
      },
    },
  },
  plugins: [],
};
