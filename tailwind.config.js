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
        primary: '#0df269',
        'background-light': '#f5f8f7',
        'background-dark': '#102217',
        'surface-light': '#ffffff',
        'surface-dark': '#183423',
        'surface-dark-light': '#224932',
        'surface-card': '#1c3a2a',
        'card-dark': '#183423',
        'border-dark': '#316847',
        'secondary-text': '#90cba8',
        'text-muted': '#90cba8',
        recovery: {
          fresh: '#10b981',
          recovering: '#f59e0b',
          sore: '#f97316',
          overworked: '#ef4444',
          inactive: '#6b7280',
        },
        success: '#22c55e',
        error: '#ef4444',
        warning: '#ff4d4d',
        caution: '#ffb700',
      },
      fontFamily: {
        display: ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'celebration': 'celebration 0.6s ease-in-out',
      },
      keyframes: {
        celebration: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}

