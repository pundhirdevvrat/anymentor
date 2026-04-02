/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1a3c6e', light: '#2a5499', dark: '#0f2545' },
        gold: { DEFAULT: '#d4a017', light: '#e8b82a', dark: '#b8891a' },
        maroon: { DEFAULT: '#800020', light: '#a0002a', dark: '#600018' },
        cream: { DEFAULT: '#f5f0e8', light: '#faf7f2', dark: '#ede5d5' },
        // Semantic
        primary: { DEFAULT: '#1a3c6e', foreground: '#f5f0e8' },
        accent: { DEFAULT: '#d4a017', foreground: '#1a3c6e' },
        danger: { DEFAULT: '#800020', foreground: '#f5f0e8' },
        background: '#f5f0e8',
        surface: '#ffffff',
        muted: '#6b7280',
        border: '#e0d8cc',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['Rajdhani', 'system-ui', 'sans-serif'],
        sans: ['Rajdhani', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'hero': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #1a3c6e 0%, #800020 100%)',
        'gradient-gold': 'linear-gradient(135deg, #d4a017 0%, #b8891a 100%)',
        'gradient-premium': 'linear-gradient(135deg, #1a3c6e 0%, #2a5499 50%, #800020 100%)',
        'gradient-cream': 'linear-gradient(180deg, #faf7f2 0%, #f5f0e8 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 160, 23, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(212, 160, 23, 0)' },
        },
      },
      boxShadow: {
        'premium': '0 4px 24px rgba(26, 60, 110, 0.12)',
        'premium-lg': '0 8px 48px rgba(26, 60, 110, 0.16)',
        'gold': '0 4px 16px rgba(212, 160, 23, 0.3)',
        'maroon': '0 4px 16px rgba(128, 0, 32, 0.25)',
      },
      borderRadius: { 'xl2': '1rem', 'xl3': '1.5rem' },
      spacing: { '18': '4.5rem', '22': '5.5rem', '88': '22rem', '100': '25rem', '112': '28rem', '128': '32rem' },
    },
  },
  plugins: [],
};
