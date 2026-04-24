/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./App.jsx"],
  theme: {
    extend: {
      colors: {
        fag: {
          primary: '#2563eb', // Blue 600
          secondary: '#10b981', // Emerald 500
          accent: '#f59e0b', // Amber 500
          dark: '#0f172a', // Slate 900
          surface: '#ffffff', // White
          border: '#e2e8f0', // Slate 200
        }
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      },
      animation: {
        'slow-spin': 'spin 12s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
}

