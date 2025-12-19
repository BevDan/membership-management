module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Unbounded', 'sans-serif'],
        'mono': ['Ubuntu Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif']
      },
      colors: {
        zinc: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46'
        },
        primary: {
          DEFAULT: '#f97316',
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: '#eab308',
          foreground: '#09090b'
        },
        accent: {
          DEFAULT: '#00f0ff',
          foreground: '#09090b'
        },
        border: '#3f3f46',
        input: '#18181b',
        ring: '#f97316',
        background: '#09090b',
        foreground: '#e4e4e7',
        card: {
          DEFAULT: '#18181b',
          foreground: '#e4e4e7'
        },
        popover: {
          DEFAULT: '#18181b',
          foreground: '#e4e4e7'
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa'
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
