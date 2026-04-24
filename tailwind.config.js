/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./App.jsx"],
  theme: {
    extend: {
      colors: {
        fag: {
          primary: '#10b981', // Emerald 500
          secondary: '#3b82f6', // Blue 500
          accent: '#f59e0b', // Amber 500 (Gold)
          dark: '#020617', // Slate 950
          surface: '#0f172a', // Slate 900
          border: 'rgba(255, 255, 255, 0.1)',
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

