import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ubuntu: {
          orange: '#E95420',
          aubergine: '#772953',
          'warm-grey': '#AEA79F',
          'cool-grey': '#333333',
        },
        midnight: {
          950: '#0f172a',
          900: '#162032',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
        },
        /* Semantic theme colors point to CSS custom properties */
        tx: {
          primary: 'var(--tx-primary)',
          secondary: 'var(--tx-secondary)',
          muted: 'var(--tx-muted)',
          dim: 'var(--tx-dim)',
          faint: 'var(--tx-faint)',
        },
        surface: {
          page: 'var(--surface-page)',
          sidebar: 'var(--surface-sidebar)',
          card: 'var(--surface-card)',
          'card-hover': 'var(--surface-card-hover)',
          input: 'var(--surface-input)',
          'table-header': 'var(--surface-table-header)',
          'table-row': 'var(--surface-table-row)',
          'table-row-hover': 'var(--surface-table-row-hover)',
          overlay: 'var(--surface-overlay)',
          progress: 'var(--surface-progress)',
        },
      },
      borderColor: {
        theme: 'var(--border-theme)',
        'theme-light': 'var(--border-light)',
      },
      fontFamily: {
        sans: ['Ubuntu', 'Pyidaungsu', 'Padauk', 'Noto Sans Myanmar', 'system-ui', 'sans-serif'],
        mono: ['Ubuntu Mono', 'monospace'],
        myanmar: ['Pyidaungsu', 'Padauk', 'Noto Sans Myanmar', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
