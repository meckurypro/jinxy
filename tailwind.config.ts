import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          DEFAULT: '#FF2D6B',
          soft: '#FF6B9D',
          glow: 'rgba(255, 45, 107, 0.15)',
        },
        purple: {
          DEFAULT: '#6B21A8',
          soft: '#9333EA',
          glow: 'rgba(107, 33, 168, 0.15)',
        },
        bg: {
          base: '#0A0A0F',
          surface: '#111118',
          elevated: '#1A1A24',
          overlay: '#22222F',
          input: '#1E1E2A',
        },
        jinx: {
          green: '#00D97E',
          yellow: '#FFB800',
          red: '#FF4D6A',
          orange: '#FF8A00',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '14px',
        'lg': '20px',
        'xl': '28px',
      },
      animation: {
        'fade-in': 'fade-in 250ms ease both',
        'slide-up': 'slide-up 400ms ease both',
        'radar-pulse': 'radar-pulse 2.5s ease-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'heartbeat': 'heartbeat 2s ease-in-out infinite',
        'glow': 'glow-pulse 2s ease-in-out infinite',
        'spin-ring': 'spin-ring 4s linear infinite',
        'skeleton': 'skeleton-shimmer 1.5s ease-in-out infinite',
        'pulse-green': 'pulse-green 2s infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'radar-pulse': {
          '0%': { transform: 'scale(0.5)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.08)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 45, 107, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 45, 107, 0.3)' },
        },
        'spin-ring': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 6px #00D97E' },
          '50%': { boxShadow: '0 0 12px #00D97E, 0 0 20px rgba(0, 217, 126, 0.3)' },
        },
      },
      boxShadow: {
        'pink': '0 0 40px rgba(255, 45, 107, 0.2)',
        'purple': '0 0 40px rgba(107, 33, 168, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.6)',
        'btn-pink': '0 4px 20px rgba(255, 45, 107, 0.35)',
      },
      screens: {
        'xs': '390px',
        'sm': '480px',
      },
      maxWidth: {
        'app': '480px',
      }
    },
  },
  plugins: [],
}

export default config
