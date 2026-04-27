/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./App.jsx"],
  theme: {
    extend: {
      colors: {
        fag: {
          primary: '#34d399', // Emerald 400
          secondary: '#facc15', // Yellow 400
          accent: '#fbbf24', // Amber 400 (Brighter)
          dark: '#064e3b', // Lighter Deep Green (was #022c22)
          surface: '#065f46', // Lighter Emerald Surface (was #042f2e)
          border: '#10b981', // Emerald 500 (was #064e3b)
        }
      },
      backgroundImage: {
        'gradient-premium': 'linear-gradient(135deg, #022c22 0%, #042f2e 100%)',
        'gradient-accent': 'linear-gradient(135deg, #10b981 0%, #facc15 100%)',
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

