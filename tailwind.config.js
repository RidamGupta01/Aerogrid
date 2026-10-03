/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#202124',
        panel: '#202124',
        panelHover: '#303134',
        border: '#3C4043',
        text: '#E8EAED',
        subtext: '#9AA0A6',
        sea: '#202124',
        land: '#303134',
        coast: '#5F6368',
        grid: 'rgba(255, 255, 255, 0.05)',
        halo: '#202124',
        accent: '#8AB4F8', // Google Dark Mode Blue
        accentText: '#202124',
        track: '#F28B82', // Google Dark Mode Red
        sev: {
          low: '#81C995',    // Google Dark Mode Green
          mod: '#FDE293',    // Google Dark Mode Yellow
          high: '#FCAD70',   // Google Dark Mode Orange
          crit: '#F28B82',   // Google Dark Mode Red
        }
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
