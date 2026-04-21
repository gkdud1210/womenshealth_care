import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ─── Brand Tokens ──────────────────────────────────── */
        pearl: {
          50:  '#fdfcfb',
          100: '#faf7f4',
          200: '#f5ede6',
          300: '#edddd2',
        },
        rose: {
          50:  '#fff1f5',
          100: '#ffe0ea',
          200: '#ffc2d4',
          300: '#ff96b2',
          400: '#ff5c8a',
          500: '#f43f75',   /* primary */
          600: '#e11d5a',
          700: '#be1248',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0520',
        },
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#d4af37',   /* accent */
          500: '#b8962e',
          600: '#9a7d26',
          700: '#7c641e',
        },
        mauve: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e879f9',
          400: '#c026d3',
          500: '#7e1d7e',
          600: '#5b1260',
          700: '#3d0b40',
        },

        /* ─── Semantic (CSS var-backed) ─────────────────────── */
        background:  'hsl(var(--bg))',
        foreground:  'hsl(var(--fg))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-fg))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-fg))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-fg))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-fg))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-fg))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-fg))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-fg))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',

        /* alias so bg-background / text-foreground still resolve */
        /* (Next.js generated bg-background references --background) */

        /* ─── Cycle Phase ───────────────────────────────────── */
        phase: {
          menstrual:  '#f43f75',
          follicular: '#fb923c',
          ovulation:  '#22c55e',
          luteal:     '#a855f7',
        },

        /* ─── Status ────────────────────────────────────────── */
        status: {
          ok:       '#22c55e',
          warn:     '#f59e0b',
          critical: '#ef4444',
          info:     '#3b82f6',
          cold:     '#60a5fa',
        },
      },

      /* ─── Typography ──────────────────────────────────────── */
      fontFamily: {
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem',  { lineHeight: '1.125rem' }],
        sm:    ['0.875rem', { lineHeight: '1.375rem' }],
        base:  ['1rem',     { lineHeight: '1.625rem' }],
        lg:    ['1.125rem', { lineHeight: '1.75rem' }],
        xl:    ['1.25rem',  { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.25rem',  { lineHeight: '2.75rem' }],
        '5xl': ['3rem',     { lineHeight: '1.2' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.02em',
        tight:    '-0.01em',
        normal:   '0em',
        wide:     '0.02em',
        wider:    '0.06em',
        widest:   '0.12em',
        caps:     '0.08em',
      },

      /* ─── Spacing extras ──────────────────────────────────── */
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
      },

      /* ─── Border radius ───────────────────────────────────── */
      borderRadius: {
        none: '0',
        sm:   '0.375rem',
        md:   '0.5rem',
        DEFAULT: '0.625rem',
        lg:   '0.75rem',
        xl:   '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        pill: '9999px',
      },

      /* ─── Shadows ─────────────────────────────────────────── */
      boxShadow: {
        'xs':     '0 1px 3px 0 rgba(244, 63, 117, 0.05)',
        'soft':   '0 2px 16px 0 rgba(244, 63, 117, 0.08), 0 1px 4px 0 rgba(244, 63, 117, 0.04)',
        'card':   '0 4px 32px 0 rgba(158, 18, 57, 0.07), 0 1px 8px 0 rgba(158, 18, 57, 0.04)',
        'card-lg':'0 8px 48px 0 rgba(158, 18, 57, 0.10), 0 2px 12px 0 rgba(158, 18, 57, 0.05)',
        'gold':   '0 2px 12px 0 rgba(212, 175, 55, 0.25)',
        'gold-lg':'0 4px 24px 0 rgba(212, 175, 55, 0.30)',
        'glow':   '0 0 20px 4px rgba(244, 63, 117, 0.15)',
        'glow-lg':'0 0 40px 8px rgba(244, 63, 117, 0.18)',
        'inner-soft': 'inset 0 2px 8px 0 rgba(244, 63, 117, 0.06)',
        'modal':  '0 24px 80px 0 rgba(60, 10, 30, 0.18), 0 4px 20px 0 rgba(60, 10, 30, 0.08)',
      },

      /* ─── Background images ───────────────────────────────── */
      backgroundImage: {
        'gradient-pearl':    'linear-gradient(135deg, #fdfcfb 0%, #faf0f4 50%, #fdf8f2 100%)',
        'gradient-rose':     'linear-gradient(135deg, #ffc2d4 0%, #ff5c8a 100%)',
        'gradient-rose-soft':'linear-gradient(135deg, #fff1f5 0%, #ffe0ea 100%)',
        'gradient-gold':     'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        'gradient-gold-rich':'linear-gradient(135deg, #fde68a 0%, #d4af37 100%)',
        'gradient-mauve':    'linear-gradient(135deg, #fae8ff 0%, #e879f9 100%)',
        'gradient-diagonal': 'linear-gradient(145deg, #fff1f5 0%, #fdfcfb 40%, #fffbeb 100%)',
        'dot-pattern':       'radial-gradient(circle, rgba(244,63,117,0.08) 1px, transparent 1px)',
        'shimmer':           'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
      },

      /* ─── Background size ─────────────────────────────────── */
      backgroundSize: {
        'dot-sm': '20px 20px',
        'dot-md': '32px 32px',
        'dot-lg': '48px 48px',
      },

      /* ─── Animations ──────────────────────────────────────── */
      animation: {
        /* entrances */
        'fade-in':       'fadeIn 0.35s ease-out both',
        'fade-in-fast':  'fadeIn 0.18s ease-out both',
        'slide-up':      'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down':    'slideDown 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right':   'slideRight 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':      'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'blur-in':       'blurIn 0.4s ease-out both',
        /* continuous */
        'pulse-soft':    'pulseSoft 2.4s ease-in-out infinite',
        'pulse-ring':    'pulseRing 2s ease-out infinite',
        'float':         'float 3.5s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'spin-slow':     'spin 3s linear infinite',
        /* radix accordion */
        'accordion-down': 'accordionDown 0.22s ease-out',
        'accordion-up':   'accordionUp 0.22s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        blurIn: {
          from: { opacity: '0', filter: 'blur(8px)' },
          to:   { opacity: '1', filter: 'blur(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.55' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.9)', opacity: '0.7' },
          '70%':  { transform: 'scale(1.15)', opacity: '0' },
          '100%': { transform: 'scale(1.15)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to:   { backgroundPosition: '200% center' },
        },
        accordionDown: {
          from: { height: '0', opacity: '0' },
          to:   { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to:   { height: '0', opacity: '0' },
        },
      },

      /* ─── Transitions ─────────────────────────────────────── */
      transitionTimingFunction: {
        'spring':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-in':'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },

      /* ─── Z-index ─────────────────────────────────────────── */
      zIndex: {
        '1': '1',
        '2': '2',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
