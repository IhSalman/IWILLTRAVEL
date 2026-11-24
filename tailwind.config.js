/** @type {import('tailwindcss').Config} */

/*
 * NIGHT FLIGHT palette.
 * The site historically used many Tailwind hues (sky, amber, indigo, violet, cyan…).
 * For a minimal look, every decorative hue is remapped to ONE warm "sunrise" accent,
 * greens map to a muted sage (success) and reds to a muted clay (errors).
 * Slate/gray become a warm neutral aligned with the ink background.
 */
const sunrise = {
  50: '#fef6ee',
  100: '#fcebd8',
  200: '#f8d4ae',
  300: '#f3b87f',
  400: '#ee9d57',
  500: '#e8853a',
  600: '#d06b27',
  700: '#ad5321',
  800: '#8a4321',
  900: '#70391f',
  950: '#3d1b0e',
};

const sage = {
  50: '#f3f8f4',
  100: '#e2eee4',
  200: '#c6ddca',
  300: '#a3c6a9',
  400: '#80ad88',
  500: '#62926b',
  600: '#4c7655',
  700: '#3e5f46',
  800: '#344d3a',
  900: '#2c4031',
  950: '#16231a',
};

const clay = {
  50: '#fdf4f2',
  100: '#fbe6e2',
  200: '#f6cdc5',
  300: '#eea99c',
  400: '#e37f6d',
  500: '#d45f4b',
  600: '#bc4838',
  700: '#9d3b2f',
  800: '#82342b',
  900: '#6d3028',
  950: '#3b1612',
};

const neutral = {
  50: '#f6f5f2',
  100: '#edeae3',
  200: '#d9d5cc',
  300: '#bdb8ad',
  400: '#959087',
  500: '#716d66',
  600: '#57544e',
  700: '#3a3936',
  800: '#222328',
  900: '#15161a',
  950: '#0b0c0f',
};

module.exports = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        // ── Palette remap (see header comment) ──
        sunrise,
        sage,
        clay,
        ink: neutral,
        slate: neutral,
        gray: neutral,
        zinc: neutral,
        stone: neutral,
        sky: { ...sunrise, DEFAULT: 'hsl(var(--sky))', foreground: 'hsl(var(--background))' },
        blue: sunrise,
        cyan: sunrise,
        teal: sunrise,
        indigo: sunrise,
        violet: sunrise,
        purple: sunrise,
        fuchsia: sunrise,
        pink: clay,
        amber: sunrise,
        orange: sunrise,
        yellow: sunrise,
        emerald: sage,
        green: sage,
        lime: sage,
        rose: clay,
        red: clay,

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        tropical: {
          DEFAULT: 'hsl(var(--tropical))',
          foreground: 'hsl(var(--background))'
        },
        sunset: {
          DEFAULT: 'hsl(var(--sunset))',
          foreground: 'hsl(var(--background))'
        },
        ocean: {
          DEFAULT: 'hsl(var(--ocean))',
          foreground: 'hsl(var(--background))'
        },
        mountain: {
          DEFAULT: 'hsl(var(--mountain))',
          foreground: 'hsl(var(--background))'
        },
        desert: {
          DEFAULT: 'hsl(var(--desert))',
          foreground: 'hsl(var(--background))'
        },
        coral: {
          DEFAULT: 'hsl(var(--coral))',
          foreground: 'hsl(var(--background))'
        },
        stat: {
          cost: 'hsl(var(--stat-cost))',
          safety: 'hsl(var(--stat-safety))',
          temp: 'hsl(var(--stat-temp))',
          internet: 'hsl(var(--stat-internet))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        heading: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
