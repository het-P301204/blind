import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#111110',
        graphite: '#191917',
        'warm-surface': '#22211E',
        'raised-panel': '#292722',
        ivory: '#F0EBDD',
        muted: '#B8B1A2',
        copper: '#C47D50',
        'burnt-red': '#A95445',
        sage: '#84937A',
        amber: '#D4A65A',
        border: '#333330',
        'border-subtle': '#252523',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        panel: '20px',
        'panel-lg': '24px',
        card: '14px',
        'card-lg': '18px',
        input: '10px',
        'input-lg': '12px',
      },
    },
  },
  plugins: [],
}

export default config
