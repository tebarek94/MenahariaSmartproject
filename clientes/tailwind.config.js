/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Main brand: trust blue */
        primary: {
          50: "#eef5fc",
          100: "#d9e9f8",
          200: "#b7d5f2",
          300: "#8dbce9",
          400: "#669fdf",
          500: "#4A90E2",
          600: "#3c7dc8",
          700: "#3169a7",
          800: "#2b5987",
          900: "#254a6e",
          950: "#172f47",
        },
        /** CTA / energy orange */
        secondary: {
          50: "#fff7eb",
          100: "#feebc8",
          200: "#fdd99a",
          300: "#fbc170",
          400: "#f8ae49",
          500: "#F5A623",
          600: "#de951f",
          700: "#bc7b1a",
          800: "#966117",
          900: "#784f15",
          950: "#4c320e",
        },
        success: "#7ED321",
        appbg: "#F2F2F2",
        apptext: "#333333",
      },
      backgroundImage: {
        "app-radial":
          "radial-gradient(ellipse 120% 80% at 50% -28%, rgb(74 144 226 / 0.30), transparent)",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
