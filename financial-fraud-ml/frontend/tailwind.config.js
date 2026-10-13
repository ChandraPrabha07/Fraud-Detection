/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark financial-security surfaces & ink (see src/components/charts/chartTheme.ts)
        page: "#0d0d0d",
        surface: { DEFAULT: "#1a1a19", raised: "#222220", hover: "#2a2a27" },
        line: { DEFAULT: "#2c2c2a", strong: "#383835" },
        ink: { DEFAULT: "#ffffff", secondary: "#c3c2b7", muted: "#898781" },
        accent: { DEFAULT: "#3987e5", soft: "rgba(57,135,229,0.14)" },
        status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
