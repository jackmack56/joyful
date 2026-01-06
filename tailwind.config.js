/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#ec4141",
          dark: "#c20c0c",
          muted: "#fbecec",
        },
        surface: {
          DEFAULT: "#fdf6f6",
          dark: "#0b0d11",
        },
        "surface-muted": {
          DEFAULT: "#f1dede",
          dark: "#1c1f29",
        },
        accent: "#ffb347",
      },
      boxShadow: {
        soft: "0 25px 60px rgba(20, 16, 30, 0.18)",
        glow: "0 0 35px rgba(236, 65, 65, 0.45)",
      },
      backgroundImage: {
        "netease-grid":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)",
      },
      fontFamily: {
        display: ["'Noto Sans SC'", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "slow-spin": "slow-spin 20s linear infinite",
      },
      keyframes: {
        "slow-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
