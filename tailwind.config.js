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
        industrial: {
          950: '#070a12',
          900: '#0b1120',
          850: '#10172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          accent: '#10b981', // Emerald green
          warning: '#f59e0b', // Amber
          danger: '#ef4444', // Red
          simulation: '#a855f7', // Purple
          cyan: '#06b6d4',
          blue: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.2))' },
        }
      }
    },
  },
  plugins: [],
}
