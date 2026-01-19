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
        primary: '#FF9933',
        'primary-dark': '#E67E22',
        'primary-content': '#0F0F0F',
        'background-light': '#fdf8f5',
        'background-dark': '#000000',
        'surface-light': '#ffffff',
        'surface-dark': '#18181b',
        'surface-dark-light': '#27272a',
        'surface-card': '#18181b',
        'card-dark': '#18181b',
        'border-dark': '#27272a',
        'secondary-text': '#90cba8',
        'text-muted': '#90cba8',
        recovery: {
          rested: '#3b82f6',
          recovering: '#FF9933',
          fatigued: '#FF6B6B',
          fresh: '#8b5cf6',
          sore: '#FF6B6B',
          overworked: '#FF6B6B',
          inactive: '#6b7280',
        },
        'recovery-rested': '#3b82f6',
        'recovery-fatigued': '#FF6B6B',
        'recovery-recovering': '#FF9933',
        success: '#3b82f6',
        error: '#ef4444',
        warning: '#ff4d4d',
        caution: '#ffb700',
      },
      fontFamily: {
        sans: ['Lexend', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(255, 153, 51, 0.4)',
        'glow-sm': '0 0 10px -2px rgba(255, 153, 51, 0.3)',
        'glow-saffron': '0 0 20px rgba(255, 153, 51, 0.4)',
        'glow-saffron-lg': '0 0 30px rgba(255, 153, 51, 0.6)',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'celebration': 'celebration 0.6s ease-in-out',
        'saffron-glow': 'saffron-glow 2s ease-in-out infinite',
      },
      keyframes: {
        celebration: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'saffron-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 153, 51, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 153, 51, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}

