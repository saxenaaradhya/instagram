import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#12202F", fog: "#EEF2F5", line: "#D5DDE4", brand: "#0E7C7B", brandDark: "#0A5F5E" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
