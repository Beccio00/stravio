/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./apps/mobile/app/**/*.{ts,tsx}", "./apps/mobile/src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0f0f1a",
        surface: "#1a1a2e",
        "surface-light": "#25253d",
        primary: "#6c63ff",
        "primary-light": "#8b83ff",
        accent: "#00d4aa",
        danger: "#ff4757",
        "text-primary": "#ffffff",
        "text-secondary": "#a0a0b0",
        "text-muted": "#6b6b7b",
        border: "#2a2a3e",
      },
    },
  },
  plugins: [],
};
