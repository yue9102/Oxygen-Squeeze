import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:      '#F9F7F3',
        'paper-2':  '#F3F0EB',
        'paper-edge': '#E8E2D8',
        ink:        '#1E1A14',
        'ink-2':    '#7A6A52',
        'ink-3':    '#B8A888',
        'ink-faint':'#DDD0BC',
        accent:     '#9B4A1A',
        'accent-dim':'rgba(155,74,26,0.12)',
        'bg-dark':  '#0D0B08',
        'bg-dark-2':'#181410',
      },
      fontFamily: {
        serif:  ['"Noto Serif SC"', 'Noto Serif', 'serif'],
        stamp:  ['"Special Elite"', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(80,50,20,0.10), 0 8px 28px rgba(60,30,10,0.09), inset 0 0 0 0.5px rgba(180,160,130,0.18)',
        'card-dark': '0 4px 20px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
} satisfies Config
