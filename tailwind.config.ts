import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Bitscy palette — warm, earth-toned, dignified
        primary: {
          DEFAULT: '#B85C38', // warm terracotta
          50: '#FBEDE6',
          100: '#F5D8C8',
          500: '#B85C38',
          600: '#9E4D2E',
          700: '#7A3B24',
        },
        secondary: {
          DEFAULT: '#5C3D2E', // deep brown
          500: '#5C3D2E',
          600: '#4A3023',
        },
        accent: {
          DEFAULT: '#E0B14A', // muted gold
          500: '#E0B14A',
          600: '#C99935',
        },
        background: {
          DEFAULT: '#FFFAF1', // warm cream
        },
        surface: {
          DEFAULT: '#FFFFFF',
        },
        text: {
          DEFAULT: '#2C1810', // very dark brown
          muted: '#8C7B6F',
        },
        success: '#4A7C59',
        error: '#C04A3D',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Mobile-first: body never below 16px
        base: ['1rem', { lineHeight: '1.5' }],
      },
      spacing: {
        // Touch target minimum
        'touch': '2.75rem', // 44px
      },
    },
  },
  plugins: [],
};

export default config;
