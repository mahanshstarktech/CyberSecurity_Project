/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071e3',
          'blue-vibrant': '#0077ED',
          'blue-light': '#2997ff',
          bg: '#000000',
          'card-dark': 'rgba(28, 28, 30, 0.65)',
          'card-glass': 'rgba(255, 255, 255, 0.08)',
          'card-border': 'rgba(255, 255, 255, 0.12)',
          subtext: '#86868b',
          text: '#f5f5f7',
          red: '#ff453a',
          green: '#30d158',
          yellow: '#ffd60a',
          purple: '#bf5af2',
          orange: '#ff9f0a'
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      backdropBlur: {
        '3xl': '32px',
        '4xl': '48px',
      },
      boxShadow: {
        'apple-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'apple-glow': '0 0 25px -5px rgba(0, 113, 227, 0.4)',
        'apple-red-glow': '0 0 30px -5px rgba(255, 69, 58, 0.5)',
        'apple-green-glow': '0 0 30px -5px rgba(48, 209, 88, 0.5)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-spin': 'spin 4s linear infinite',
      }
    },
  },
  plugins: [],
};
