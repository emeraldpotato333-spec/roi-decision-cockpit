import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#171615",
        paper: "#f4f5f1",
        bone: "#e7ebe3",
        moss: "#4f6f52",
        fern: "#77966d",
        saffron: "#d7a84f",
        clay: "#b86f52",
        dusk: "#2f3030"
      },
      boxShadow: {
        cockpit: "0 24px 80px rgba(23, 22, 21, 0.12)",
        soft: "0 14px 48px rgba(23, 22, 21, 0.10)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
