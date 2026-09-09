import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // GridSense neon renewable-energy theme
        'neon-emerald': '#00ff88',
        'neon-cyan': '#00e5ff',
        'neon-lime': '#aaff00',
        'neon-purple': '#9d4edd',
        'solar-amber': '#ffb300',
        'dark-bg': '#050b14',
        'dark-card': '#0d1526',
        'dark-input': '#101b30',
        'dark-border': '#1e3050',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Space Grotesk', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow': '0 0 30px rgba(0, 255, 136, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(0, 255, 136, 0.2)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.glassmorphism': {
          '@apply bg-dark-card/40 backdrop-blur-xl border border-dark-border rounded-2xl':
            {},
        },
        '.btn-primary': {
          '@apply px-6 py-3 bg-gradient-to-r from-neon-emerald to-neon-cyan text-dark-bg font-semibold rounded-lg hover:shadow-neon transition-all duration-300':
            {},
        },
        '.btn-secondary': {
          '@apply px-6 py-3 border-2 border-neon-emerald text-neon-emerald hover:bg-neon-emerald/10 rounded-lg transition-all duration-300':
            {},
        },
        '.card-glow': {
          '@apply p-6 glassmorphism hover:border-neon-emerald/50 transition-colors duration-300':
            {},
        },
      })
    },
  ],
}

export default config
