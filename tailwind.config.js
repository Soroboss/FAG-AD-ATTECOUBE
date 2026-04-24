/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "./App.jsx"],
  theme: {
    extend: {
      colors: {
        fag: {
          primary: '#34d399', // Emerald 400 (Brighter for dark mode)
          secondary: '#facc15', // Yellow 400 (Divine Light)
          accent: '#d97706', // Amber 600 (Harvest)
          dark: '#022c22', // Deep Green (Garden Night)
          surface: '#042f2e', // Emerald Surface
          border: '#064e3b', // Emerald Border
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

