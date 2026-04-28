/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D9488",
          light: "#14B8A6",
          dark: "#0F766E",
        },
        secondary: "#6366f1",
        cta: "#F97316",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        background: {
          DEFAULT: "#F0FDFA",
          dark: "#0f172a",
        },
        text: {
          DEFAULT: "#134E4A",
          muted: "#5EEAD4",
          dark: "#f8fafc",
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(13, 148, 136, 0.12)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};