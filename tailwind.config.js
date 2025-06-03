// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            // Bleu foncé
            DEFAULT: '#0B4E87', // 100%
            900: '#0B4E87', // 100%
            800: '#2D698F', // 90%
            700: '#4F84A8', // 80%
            600: '#719FC1', // 60%
            500: '#93BAD9', // 30%
            400: '#B5D5F2', // 10%
          },
          secondary: {
            // Turquoise
            DEFAULT: '#09C4B8', // 100%
            900: '#09C4B8', // 100%
            800: '#2ED0C6', // 90%
            700: '#53DCD4', // 80%
            600: '#78E8E2', // 60%
            500: '#9DF4F0', // 30%
            400: '#C2FFFD', // 10%
          },
          accent1: {
            DEFAULT: '#C55A57', // Rouge corail
            light: '#F29B8D', // Version plus claire
          },
          accent2: {
            DEFAULT: '#A9C255', // Vert lime
            light: '#D3E48F', // Version plus claire
          },
          accent3: {
            DEFAULT: '#7E64A8', // Violet
            light: '#C4B1E0', // Version plus claire
          },
          accent4: {
            DEFAULT: '#4AACC5', // Bleu ciel
            light: '#A6DFF2', // Version plus claire
          },
          success: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
          },
          danger: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
            950: '#450a0a',
          },
          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
            950: '#451a03',
          },
        },
        fontFamily: {
          sans: ['Ubuntu', 'sans-serif'],
        },
        boxShadow: {
          card: '0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1)',
          'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
      },
    },
    plugins: [],
  }