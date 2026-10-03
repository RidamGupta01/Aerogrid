/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--background-secondary)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
        },
        panel: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
        },
        ocean: {
          DEFAULT: 'var(--ocean)',
          light: 'var(--ocean-light)',
        },
        sky: {
          DEFAULT: 'var(--sky)',
        },
        cyan: {
          DEFAULT: 'var(--cyan)',
        },
        text: {
          DEFAULT: 'var(--text-primary)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          white: 'var(--text-white)',
        },
        subtext: 'var(--text-secondary)',
        safe: {
          DEFAULT: 'var(--safe)',
          light: 'var(--safe-light)',
        },
        watch: {
          DEFAULT: 'var(--watch)',
          light: 'var(--watch-light)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          dark: 'var(--danger-dark)',
          light: 'var(--danger-light)',
        },
        critical: 'var(--critical)',
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },
        accent: 'var(--primary)',
        accentText: 'var(--text-white)',
        track: 'var(--warning)',
        sev: {
          low: 'var(--safe)',
          mod: 'var(--watch)',
          high: 'var(--warning)',
          crit: 'var(--danger)',
        }
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glass': '0 8px 32px 0 rgba(15, 80, 120, 0.08)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
