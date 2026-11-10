/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cyber: {
          900: "#0b0f19",
          850: "#101626",
          800: "#161f36",
          700: "#1e2b4d",
          accent: "#00f0ff",
          danger: "#ff3b5c",
          warning: "#ffb800",
          success: "#00e676",
        }
      }
    },
  },
  plugins: [],
};
