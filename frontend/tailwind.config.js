/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b1220",
          800: "#121a2b",
          700: "#1a2438",
          200: "#e7ebf3",
          100: "#f4f6fb"
        },
        sand: {
          100: "#f6f2ec",
          200: "#ece4d9",
          300: "#dbcab8"
        },
        brand: {
          600: "#2563eb",
          700: "#1d4ed8"
        }
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "Arial", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        lift: "0 6px 16px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};
