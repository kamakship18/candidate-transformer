import type { Config } from 'tailwindcss';

export default {
  content: ['./front/index.html', './front/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0B',
        surface: '#111113',
        'surface-2': '#1A1A1F',
        'surface-3': '#22222A',
        border: '#2A2A32',
        'border-hover': '#3A3A45',
        primary: {
          DEFAULT: '#6366F1',
          hover: '#818CF8',
          muted: 'rgba(99,102,241,0.12)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        'text-primary': '#F8F8FA',
        'text-secondary': '#9999AA',
        'text-muted': '#55556A',
        source: {
          csv: '#10B981',
          ats: '#6366F1',
          github: '#F59E0B',
          linkedin: '#3B82F6',
          resume: '#14B8A6',
          notes: '#EC4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-surface': 'linear-gradient(145deg, rgba(26,26,31,0.95) 0%, rgba(17,17,19,0.98) 50%, rgba(10,10,11,1) 100%)',
        'gradient-header': 'linear-gradient(180deg, rgba(17,17,19,0.98) 0%, rgba(10,10,11,0.92) 100%)',
        'gradient-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent)',
        'gradient-card': 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(17,17,19,0.6) 40%, rgba(10,10,11,0.9) 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.2s ease-out both',
        'pulse-ring': 'pulse-ring 1.5s ease-in-out infinite',
        'bounce-scale': 'bounce-scale 0.3s ease-in-out',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
          '70%': { boxShadow: '0 0 0 6px rgba(99, 102, 241, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
        },
        'bounce-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
