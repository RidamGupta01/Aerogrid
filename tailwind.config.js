/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1015',
        panel: '#151C23',
        border: '#273440',
        text: '#E5EFF2',
        subtext: '#93A9B1',
        sea: '#0A131B',
        land: '#152427',
        coast: '#32505C',
        grid: 'rgba(229, 239, 242, 0.05)',
        halo: '#0A131B',
        accent: '#38BDF8', // A nice vibrant cyan
        accentText: '#021017',
        track: '#F43F5E', // Rose 500
        sev: {
          low: '#10B981',    // Emerald 500
          mod: '#FBBF24',    // Amber 400
          high: '#F97316',   // Orange 500
          crit: '#EF4444',   // Red 500
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
