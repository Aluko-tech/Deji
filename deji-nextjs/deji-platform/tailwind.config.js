/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        heading: ["Syne", "sans-serif"],
      },
      colors: {
        ink: "#0a0a0f",
        surface: "#13131a",
        card: "#1c1c26",
        accent: { DEFAULT: "#f97316", dark: "#ea6c0a", light: "#fb923c" },
        accent2: { DEFAULT: "#6366f1" },
        muted: "#6b6b80",
      },
      borderRadius: { lg: "0.75rem", md: "0.5rem", sm: "0.25rem" },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease both",
        shimmer: "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
