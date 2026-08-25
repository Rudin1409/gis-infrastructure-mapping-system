import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        gov: {
          navy: "#0f172a",
          blue: "#1e3a8a",
          gold: "#d97706",
          emerald: "#059669",
        },
        gis: {
          good: "#10b981",       // Hijau
          repair: "#f59e0b",     // Kuning/Amber
          damaged: "#ef4444",    // Merah
          unknown: "#6b7280",    // Abu-abu
          surveyor: "#3b82f6",   // Blue dot
        }
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
        sheet: "0 -4px 20px -2px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
